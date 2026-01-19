/**
 * Reload Firearm Rule Tests (PR 4.0, updated PR 4.1)
 *
 * End-to-end tests proving:
 * - The rule is selected correctly by intent
 * - PASS produces expected ValidationReport
 * - FAIL produces violations
 * - AMBIGUOUS produces ambiguity reasons
 * - GM override can override FAIL or AMBIGUOUS
 * - Resolution produces effects only on PASS or override
 *
 * PR 4.1 ADDITIONS - Declarative Cost Validation:
 * - costValidation field is populated with ActionCostEffect + outcome
 * - No arithmetic, no state mutation, no inference
 * - AMBIGUOUS cost when action availability is unknown
 * - GM can override cost ambiguity (separate from rule outcome ambiguity)
 *
 * These tests assert end-to-end behavior, not isolated units.
 *
 * EXPLICITLY OUT OF SCOPE (intentional deferral, not TODOs):
 * - Dice rolling (reload legality does not involve dice)
 * - Reload success/failure mechanics beyond legality check
 * - Weapon-specific reload times (all reloads cost 1 action here)
 * - Ammo quantity tracking (only availability: available/unavailable/unknown)
 * - Derived stat changes (this is legality, not execution)
 */

import { describe, it, expect } from 'vitest';

// Intent layer imports
import { createValidatedIntent } from '../../../../intent/bridge/ts/ValidatedIntent';
import type { IntentType, ValidatedIntent } from '../../../../intent/bridge/ts/ValidatedIntent';
import { IntentRulesAdapter } from '../../../../intent/bridge/ts/IntentRulesAdapter';
import type { ValidationReport } from '../../../../intent/bridge/ts/RulesPipeline';
import { RulesOutcome } from '../../../../intent/bridge/ts/RulesPipeline';

// Override layer imports
import type { EffectiveValidation, GmOverride, GmId, LogicalTime } from '../../../../overrides/ts/types';
import { createGmOverride, getEffectiveValidation } from '../../../../overrides/ts/GmOverride';

// Resolution layer imports
import { resolve, createEffectProducerRegistry } from '../../../../resolution/ts/Resolution';
import { createAuthoritativeDecision, EffectType, CostValidationOutcome } from '../../../../resolution/ts/types';

// Deadlands rule imports
import {
  createDeadlandsPipelineRegistry,
  RELOAD_FIREARM_INTENT_TYPE,
  produceReloadFirearmEffects,
  ReloadFirearmPayload,
  RELOAD_ACTION_COST,
} from '../index';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a validated intent for reload firearm
 */
function createReloadIntent(payload: ReloadFirearmPayload): ValidatedIntent {
  const result = createValidatedIntent({
    kind: 'valid',
    intent: {
      intentId: `intent_reload_${payload.characterId}_${payload.weaponId}`,
      intentType: RELOAD_FIREARM_INTENT_TYPE as string,
      payload,
    },
    summary: {
      validatedAt: Date.now(),
      validatorVersion: '1.0.0',
      structuralChecks: ['intentId_present', 'intentType_present', 'payload_present'],
    },
  });

  if (result === null) {
    throw new Error('Failed to create validated intent');
  }

  return result;
}

/**
 * Create the full pipeline with adapter
 */
function createPipeline() {
  const registry = createDeadlandsPipelineRegistry();
  return new IntentRulesAdapter(registry);
}

/**
 * Create effect producer registry for resolution
 */
function createEffectRegistry() {
  return createEffectProducerRegistry(
    new Map([[RELOAD_FIREARM_INTENT_TYPE as string, produceReloadFirearmEffects]])
  );
}

// ============================================================================
// RULE SELECTION TESTS
// ============================================================================

describe('Rule Selection', () => {
  it('selects the Deadlands reload rule for RELOAD_FIREARM intent', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'char_001',
      weaponId: 'colt_peacemaker_001',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      expect(result.report.rulesetId).toBe('deadlands_core');
      expect(result.report.intentType).toBe(RELOAD_FIREARM_INTENT_TYPE);
    }
  });

  it('returns NO_PIPELINE_CLAIMS_AUTHORITY for unknown intent types', () => {
    const adapter = createPipeline();
    const intent = createValidatedIntent({
      kind: 'valid',
      intent: {
        intentId: 'intent_unknown_001',
        intentType: 'UNKNOWN_INTENT',
        payload: {},
      },
      summary: {
        validatedAt: Date.now(),
        validatorVersion: '1.0.0',
        structuralChecks: ['intentId_present', 'intentType_present', 'payload_present'],
      },
    });

    if (intent === null) {
      throw new Error('Failed to create validated intent');
    }

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.failure.code).toBe('NO_PIPELINE_CLAIMS_AUTHORITY');
    }
  });
});

// ============================================================================
// PASS OUTCOME TESTS
// ============================================================================

describe('PASS Outcome', () => {
  /**
   * PASS requirements:
   * - Weapon type is reloadable (firearm, bow, crossbow)
   * - Weapon has Shots capacity
   * - Ammo availability = 'available'
   * - Current ammo state = 'empty' or 'partial'
   */

  it('PASSes when firearm with ammo is reloaded (empty state)', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'wild_bill',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      expect(result.report.outcome).toBe(RulesOutcome.PASS);
      expect(result.report.violations).toHaveLength(0);
      expect(result.report.ambiguity).toBeNull();
    }
  });

  it('PASSes when firearm with ammo is reloaded (partial state)', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'wild_bill',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'partial', // Partial - can still reload
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      expect(result.report.outcome).toBe(RulesOutcome.PASS);
      expect(result.report.violations).toHaveLength(0);
      expect(result.report.ambiguity).toBeNull();
    }
  });

  it('PASSes for bow reload (ranged weapon with ammo)', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'archer_001',
      weaponId: 'longbow_001',
      weaponType: 'bow',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      expect(result.report.outcome).toBe(RulesOutcome.PASS);
      expect(result.report.violations).toHaveLength(0);
      expect(result.report.ambiguity).toBeNull();
    }
  });

  it('PASSes for crossbow reload', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'crossbowman_001',
      weaponId: 'crossbow_001',
      weaponType: 'crossbow',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      expect(result.report.outcome).toBe(RulesOutcome.PASS);
      expect(result.report.violations).toHaveLength(0);
      expect(result.report.ambiguity).toBeNull();
    }
  });

  /**
   * PASS WITH WARNING:
   * - All PASS conditions met
   * - BUT currentAmmoState = 'full'
   * - Outcome = PASS (not FAIL)
   * - Warning violation is present (severity = WARNING)
   * - No ambiguity
   */
  it('PASSes with WARNING when weapon is already full', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'wild_bill',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'full', // Already full - triggers warning
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      // Outcome is PASS (not FAIL)
      expect(result.report.outcome).toBe(RulesOutcome.PASS);

      // Warning violation is present
      expect(result.report.violations).toHaveLength(1);
      expect(result.report.violations[0]?.severity).toBe('WARNING');
      expect(result.report.violations[0]?.ruleId).toBe('SW_RELOAD_003');
      expect(result.report.violations[0]?.message).toContain('already fully loaded');

      // No ambiguity
      expect(result.report.ambiguity).toBeNull();
    }
  });
});

// ============================================================================
// FAIL OUTCOME TESTS
// ============================================================================

describe('FAIL Outcome', () => {
  /**
   * FAIL requirements:
   * - Outcome = FAIL
   * - At least one structured violation with ERROR severity
   * - No ambiguity (null)
   * - Resolution produces NO effects
   */

  it('FAILs when weapon is melee (not reloadable)', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'fighter_001',
      weaponId: 'bowie_knife',
      weaponType: 'melee',
      hasShotsCapacity: false,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      // Outcome is FAIL
      expect(result.report.outcome).toBe(RulesOutcome.FAIL);

      // Structured violation present
      expect(result.report.violations).toHaveLength(1);
      expect(result.report.violations[0]?.ruleId).toBe('SW_RELOAD_001');
      expect(result.report.violations[0]?.severity).toBe('ERROR');
      expect(result.report.violations[0]?.message).toContain('melee');

      // No ambiguity
      expect(result.report.ambiguity).toBeNull();
    }
  });

  it('FAILs when weapon is thrown (not reloadable)', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'thrower_001',
      weaponId: 'throwing_knife',
      weaponType: 'thrown',
      hasShotsCapacity: false,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      // Outcome is FAIL
      expect(result.report.outcome).toBe(RulesOutcome.FAIL);

      // Structured violation present
      expect(result.report.violations).toHaveLength(1);
      expect(result.report.violations[0]?.ruleId).toBe('SW_RELOAD_001');
      expect(result.report.violations[0]?.severity).toBe('ERROR');
      expect(result.report.violations[0]?.message).toContain('thrown');

      // No ambiguity
      expect(result.report.ambiguity).toBeNull();
    }
  });

  it('FAILs when firearm has no Shots capacity', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'wild_bill',
      weaponId: 'strange_gun',
      weaponType: 'firearm',
      hasShotsCapacity: false, // No shots capacity
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      // Outcome is FAIL
      expect(result.report.outcome).toBe(RulesOutcome.FAIL);

      // Structured violation present
      expect(result.report.violations).toHaveLength(1);
      expect(result.report.violations[0]?.ruleId).toBe('SW_RELOAD_002');
      expect(result.report.violations[0]?.severity).toBe('ERROR');
      expect(result.report.violations[0]?.message).toContain('no Shots capacity');

      // No ambiguity
      expect(result.report.ambiguity).toBeNull();
    }
  });

  it('FAILs when ammo is unavailable', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'out_of_ammo_joe',
      weaponId: 'empty_six_shooter',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unavailable', // No ammo
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      // Outcome is FAIL
      expect(result.report.outcome).toBe(RulesOutcome.FAIL);

      // Structured violation present
      expect(result.report.violations).toHaveLength(1);
      expect(result.report.violations[0]?.ruleId).toBe('SW_RELOAD_004');
      expect(result.report.violations[0]?.severity).toBe('ERROR');
      expect(result.report.violations[0]?.message).toContain('no ammunition');

      // No ambiguity
      expect(result.report.ambiguity).toBeNull();
    }
  });
});

// ============================================================================
// AMBIGUOUS OUTCOME TESTS
// ============================================================================

describe('AMBIGUOUS Outcome', () => {
  /**
   * AMBIGUOUS requirements:
   * - Outcome = AMBIGUOUS
   * - ambiguity field is populated with reason and STRUCTURED interpretations
   * - Each interpretation has: code, resultingOutcome, description
   * - No ERROR violations (may have warnings)
   * - Resolution produces NO effects (requires GM decision)
   *
   * GM Override handling for AMBIGUOUS:
   * - GM MUST select an interpretation code
   * - System deterministically produces the interpretation's declared outcome
   * - GM can resolve to PASS → effects produced
   * - GM can resolve to FAIL → no effects produced
   * See GM Override tests for explicit coverage.
   */

  it('is AMBIGUOUS when ammo availability is unknown', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'uncertain_pete',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unknown', // Unknown ammo state
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      // Outcome is AMBIGUOUS
      expect(result.report.outcome).toBe(RulesOutcome.AMBIGUOUS);

      // Ambiguity field populated
      expect(result.report.ambiguity).not.toBeNull();
      expect(result.report.ambiguity?.reason).toContain('Ammunition availability');
      expect(result.report.ambiguity?.possibleInterpretations).toHaveLength(2);

      // No ERROR violations (no terminal failure)
      const errorViolations = result.report.violations.filter(v => v.severity === 'ERROR');
      expect(errorViolations).toHaveLength(0);
    }
  });

  it('provides STRUCTURED ambiguity interpretations with explicit outcomes', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'uncertain_pete',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);

    expect(result.kind).toBe('report');
    if (result.kind === 'report') {
      const interpretations = result.report.ambiguity?.possibleInterpretations ?? [];

      // Each interpretation must be structured with code, resultingOutcome, description
      expect(interpretations).toHaveLength(2);

      // AMMO_AVAILABLE interpretation → PASS
      const ammoAvailable = interpretations.find(i => i.code === 'AMMO_AVAILABLE');
      expect(ammoAvailable).toBeDefined();
      expect(ammoAvailable?.resultingOutcome).toBe(RulesOutcome.PASS);
      expect(ammoAvailable?.description).toContain('ammunition available');

      // NO_AMMO interpretation → FAIL
      const noAmmo = interpretations.find(i => i.code === 'NO_AMMO');
      expect(noAmmo).toBeDefined();
      expect(noAmmo?.resultingOutcome).toBe(RulesOutcome.FAIL);
      expect(noAmmo?.description).toContain('no ammunition');
    }
  });
});

// ============================================================================
// GM OVERRIDE TESTS
// ============================================================================

describe('GM Override', () => {
  it('allows GM to override FAIL to PASS', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'out_of_ammo_joe',
      weaponId: 'empty_six_shooter',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unavailable',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    // Original is FAIL
    expect(result.report.outcome).toBe(RulesOutcome.FAIL);

    // GM overrides to PASS
    const overrideResult = createGmOverride({
      originalReport: result.report,
      newOutcome: RulesOutcome.PASS,
      reason: 'Joe found a spare bullet in his pocket',
      warning: { severity: 'INFO', message: 'GM allowed reload despite no tracked ammo' },
      issuedBy: 'gm_marshal' as GmId,
      issuedAt: 1000 as LogicalTime,
    });

    expect(overrideResult.kind).toBe('override');
    if (overrideResult.kind !== 'override') return;

    // Get effective validation
    const effective = getEffectiveValidation(result.report, [overrideResult.override]);

    expect(effective.effectiveOutcome).toBe(RulesOutcome.PASS);
    expect(effective.hasOverrides).toBe(true);
  });

  it('allows GM to override AMBIGUOUS to PASS by selecting interpretation', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'uncertain_pete',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    // Original is AMBIGUOUS
    expect(result.report.outcome).toBe(RulesOutcome.AMBIGUOUS);

    // GM resolves ambiguity to PASS by selecting AMMO_AVAILABLE interpretation
    const overrideResult = createGmOverride({
      originalReport: result.report,
      newOutcome: RulesOutcome.PASS,
      selectedInterpretationCode: 'AMMO_AVAILABLE', // Must select interpretation
      reason: 'Pete has ammo in his saddlebag (not tracked in system)',
      warning: { severity: 'INFO', message: 'GM confirmed ammo availability' },
      issuedBy: 'gm_marshal' as GmId,
      issuedAt: 1000 as LogicalTime,
    });

    expect(overrideResult.kind).toBe('override');
    if (overrideResult.kind !== 'override') return;

    // Override records the selected interpretation
    expect(overrideResult.override.overriddenOutcome.selectedInterpretationCode).toBe('AMMO_AVAILABLE');

    const effective = getEffectiveValidation(result.report, [overrideResult.override]);

    expect(effective.effectiveOutcome).toBe(RulesOutcome.PASS);
  });

  it('preserves original outcome after override', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'out_of_ammo_joe',
      weaponId: 'empty_six_shooter',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unavailable',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    const overrideResult = createGmOverride({
      originalReport: result.report,
      newOutcome: RulesOutcome.PASS,
      reason: 'Found spare ammo',
      warning: { severity: 'WARNING', message: 'Override without tracked ammo' },
      issuedBy: 'gm_marshal' as GmId,
      issuedAt: 1000 as LogicalTime,
    });

    expect(overrideResult.kind).toBe('override');
    if (overrideResult.kind !== 'override') return;

    const effective = getEffectiveValidation(result.report, [overrideResult.override]);

    // Original is still FAIL
    expect(effective.originalReport.outcome).toBe(RulesOutcome.FAIL);
    // Effective is now PASS
    expect(effective.effectiveOutcome).toBe(RulesOutcome.PASS);
  });

  /**
   * DETERMINISM ENFORCEMENT TESTS
   *
   * These tests prove that the override system enforces deterministic
   * resolution of AMBIGUOUS outcomes via interpretation selection.
   */
  it('REJECTS override of AMBIGUOUS without interpretation code', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'uncertain_pete',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    // Attempt override WITHOUT selectedInterpretationCode
    const overrideResult = createGmOverride({
      originalReport: result.report,
      newOutcome: RulesOutcome.PASS,
      // selectedInterpretationCode: MISSING!
      reason: 'I just decided',
      warning: { severity: 'INFO', message: 'Override' },
      issuedBy: 'gm_marshal' as GmId,
      issuedAt: 1000 as LogicalTime,
    });

    // Must be rejected
    expect(overrideResult.kind).toBe('violation');
    if (overrideResult.kind === 'violation') {
      expect(overrideResult.violation.code).toBe('MISSING_INTERPRETATION_CODE');
    }
  });

  it('REJECTS override with invalid interpretation code', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'uncertain_pete',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    // Attempt override with invalid code
    const overrideResult = createGmOverride({
      originalReport: result.report,
      newOutcome: RulesOutcome.PASS,
      selectedInterpretationCode: 'INVALID_CODE', // Not a valid interpretation
      reason: 'Made up interpretation',
      warning: { severity: 'INFO', message: 'Override' },
      issuedBy: 'gm_marshal' as GmId,
      issuedAt: 1000 as LogicalTime,
    });

    // Must be rejected
    expect(overrideResult.kind).toBe('violation');
    if (overrideResult.kind === 'violation') {
      expect(overrideResult.violation.code).toBe('INVALID_INTERPRETATION_CODE');
    }
  });

  it('REJECTS override when outcome does not match interpretation', () => {
    const adapter = createPipeline();
    const intent = createReloadIntent({
      characterId: 'uncertain_pete',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    // AMMO_AVAILABLE interpretation declares resultingOutcome: PASS
    // Attempting to use it with FAIL outcome is invalid
    const overrideResult = createGmOverride({
      originalReport: result.report,
      newOutcome: RulesOutcome.FAIL, // WRONG - AMMO_AVAILABLE should be PASS
      selectedInterpretationCode: 'AMMO_AVAILABLE',
      reason: 'Contradictory override attempt',
      warning: { severity: 'INFO', message: 'Override' },
      issuedBy: 'gm_marshal' as GmId,
      issuedAt: 1000 as LogicalTime,
    });

    // Must be rejected
    expect(overrideResult.kind).toBe('violation');
    if (overrideResult.kind === 'violation') {
      expect(overrideResult.violation.code).toBe('OUTCOME_MISMATCH');
    }
  });

  /**
   * GM Override AMBIGUOUS → FAIL
   *
   * When AMBIGUOUS outcome occurs, GM can resolve to FAIL by selecting
   * the NO_AMMO interpretation. This produces NO effects.
   * The system deterministically maps interpretation → outcome.
   */
  it('allows GM to override AMBIGUOUS to FAIL by selecting interpretation (no effects produced)', () => {
    const adapter = createPipeline();
    const effectRegistry = createEffectRegistry();
    const intent = createReloadIntent({
      characterId: 'uncertain_pete',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unknown', // Triggers AMBIGUOUS
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    // Original is AMBIGUOUS
    expect(result.report.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(result.report.ambiguity).not.toBeNull();

    // GM resolves ambiguity to FAIL by selecting NO_AMMO interpretation
    const overrideResult = createGmOverride({
      originalReport: result.report,
      newOutcome: RulesOutcome.FAIL,
      selectedInterpretationCode: 'NO_AMMO', // Must select interpretation
      reason: 'Pete checked his saddlebag - no ammo of the correct caliber',
      warning: { severity: 'WARNING', message: 'GM confirmed no ammunition available' },
      issuedBy: 'gm_marshal' as GmId,
      issuedAt: 1000 as LogicalTime,
    });

    expect(overrideResult.kind).toBe('override');
    if (overrideResult.kind !== 'override') return;

    const effective = getEffectiveValidation(result.report, [overrideResult.override]);

    // Effective outcome is now FAIL
    expect(effective.effectiveOutcome).toBe(RulesOutcome.FAIL);
    expect(effective.hasOverrides).toBe(true);

    // Original AMBIGUOUS is preserved
    expect(effective.originalReport.outcome).toBe(RulesOutcome.AMBIGUOUS);

    // Resolution: NO effects produced (FAIL)
    const decision = createAuthoritativeDecision(effective, [overrideResult.override]);
    const resolution = resolve(decision, effectRegistry);

    expect(resolution.outcome).toBe('NO_EFFECTS_FAIL');
    expect(resolution.effects).toHaveLength(0);
  });
});

// ============================================================================
// RESOLUTION TESTS
// ============================================================================

describe('Resolution', () => {
  it('produces effects on PASS', () => {
    const adapter = createPipeline();
    const effectRegistry = createEffectRegistry();
    const intent = createReloadIntent({
      characterId: 'wild_bill',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    const decision = createAuthoritativeDecision(
      {
        originalReport: result.report,
        effectiveOutcome: result.report.outcome,
        hasOverrides: false,
        latestWarning: null,
        overrideCount: 0,
      },
      []
    );

    const resolution = resolve(decision, effectRegistry);

    expect(resolution.outcome).toBe('EFFECTS_PRODUCED');
    expect(resolution.effects.length).toBeGreaterThan(0);
  });

  it('produces CONSUME_RESOURCE effect for action cost', () => {
    const adapter = createPipeline();
    const effectRegistry = createEffectRegistry();
    const intent = createReloadIntent({
      characterId: 'wild_bill',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    const decision = createAuthoritativeDecision(
      {
        originalReport: result.report,
        effectiveOutcome: result.report.outcome,
        hasOverrides: false,
        latestWarning: null,
        overrideCount: 0,
      },
      []
    );

    const resolution = resolve(decision, effectRegistry);

    const consumeEffect = resolution.effects.find(
      e => e.effectType === EffectType.CONSUME_RESOURCE
    );
    expect(consumeEffect).toBeDefined();
    expect(consumeEffect?.parameters['resourceName']).toBe('action');
    expect(consumeEffect?.parameters['amount']).toBe(1);
  });

  it('produces TRIGGER_NARRATIVE effect for reload log', () => {
    const adapter = createPipeline();
    const effectRegistry = createEffectRegistry();
    const intent = createReloadIntent({
      characterId: 'wild_bill',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    const decision = createAuthoritativeDecision(
      {
        originalReport: result.report,
        effectiveOutcome: result.report.outcome,
        hasOverrides: false,
        latestWarning: null,
        overrideCount: 0,
      },
      []
    );

    const resolution = resolve(decision, effectRegistry);

    const narrativeEffect = resolution.effects.find(
      e => e.effectType === EffectType.TRIGGER_NARRATIVE
    );
    expect(narrativeEffect).toBeDefined();
    expect(narrativeEffect?.parameters['category']).toBe('combat_action');
  });

  it('produces NO effects on FAIL', () => {
    const adapter = createPipeline();
    const effectRegistry = createEffectRegistry();
    const intent = createReloadIntent({
      characterId: 'fighter_001',
      weaponId: 'bowie_knife',
      weaponType: 'melee',
      hasShotsCapacity: false,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    expect(result.report.outcome).toBe(RulesOutcome.FAIL);

    const decision = createAuthoritativeDecision(
      {
        originalReport: result.report,
        effectiveOutcome: result.report.outcome,
        hasOverrides: false,
        latestWarning: null,
        overrideCount: 0,
      },
      []
    );

    const resolution = resolve(decision, effectRegistry);

    expect(resolution.outcome).toBe('NO_EFFECTS_FAIL');
    expect(resolution.effects).toHaveLength(0);
  });

  it('produces NO effects on AMBIGUOUS', () => {
    const adapter = createPipeline();
    const effectRegistry = createEffectRegistry();
    const intent = createReloadIntent({
      characterId: 'uncertain_pete',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    expect(result.report.outcome).toBe(RulesOutcome.AMBIGUOUS);

    const decision = createAuthoritativeDecision(
      {
        originalReport: result.report,
        effectiveOutcome: result.report.outcome,
        hasOverrides: false,
        latestWarning: null,
        overrideCount: 0,
      },
      []
    );

    const resolution = resolve(decision, effectRegistry);

    expect(resolution.outcome).toBe('NO_EFFECTS_AMBIGUOUS');
    expect(resolution.effects).toHaveLength(0);
  });

  it('produces effects when GM overrides FAIL to PASS', () => {
    const adapter = createPipeline();
    const effectRegistry = createEffectRegistry();
    const intent = createReloadIntent({
      characterId: 'out_of_ammo_joe',
      weaponId: 'empty_six_shooter',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unavailable',
      currentAmmoState: 'empty',
    });

    const result = adapter.processIntent(intent);
    expect(result.kind).toBe('report');
    if (result.kind !== 'report') return;

    // GM overrides
    const overrideResult = createGmOverride({
      originalReport: result.report,
      newOutcome: RulesOutcome.PASS,
      reason: 'Found spare ammo',
      warning: { severity: 'INFO', message: 'Override allowed' },
      issuedBy: 'gm_marshal' as GmId,
      issuedAt: 1000 as LogicalTime,
    });

    expect(overrideResult.kind).toBe('override');
    if (overrideResult.kind !== 'override') return;

    const effective = getEffectiveValidation(result.report, [overrideResult.override]);

    const decision = createAuthoritativeDecision(effective, [overrideResult.override]);
    const resolution = resolve(decision, effectRegistry);

    expect(resolution.outcome).toBe('EFFECTS_PRODUCED');
    expect(resolution.effects.length).toBeGreaterThan(0);
    // Authority traces to OVERRIDE
    expect(resolution.effects[0]?.authority.source).toBe('OVERRIDE');
  });
});

// ============================================================================
// END-TO-END PIPELINE TESTS
// ============================================================================

describe('End-to-End Pipeline', () => {
  it('complete flow: PASS → effects', () => {
    // 1. Create intent
    const intent = createReloadIntent({
      characterId: 'wild_bill',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
    });

    // 2. Process through adapter
    const adapter = createPipeline();
    const adapterResult = adapter.processIntent(intent);
    expect(adapterResult.kind).toBe('report');
    if (adapterResult.kind !== 'report') return;

    // 3. Verify validation report
    const report = adapterResult.report;
    expect(report.outcome).toBe(RulesOutcome.PASS);
    expect(report.rulesetId).toBe('deadlands_core');

    // 4. Create authoritative decision (no overrides)
    const decision = createAuthoritativeDecision(
      {
        originalReport: report,
        effectiveOutcome: report.outcome,
        hasOverrides: false,
        latestWarning: null,
        overrideCount: 0,
      },
      []
    );

    // 5. Resolve to effects
    const effectRegistry = createEffectRegistry();
    const resolution = resolve(decision, effectRegistry);

    // 6. Verify effects
    expect(resolution.outcome).toBe('EFFECTS_PRODUCED');
    expect(resolution.effects).toHaveLength(2);
  });

  it('complete flow: FAIL → no effects', () => {
    const intent = createReloadIntent({
      characterId: 'fighter_001',
      weaponId: 'bowie_knife',
      weaponType: 'melee',
      hasShotsCapacity: false,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const adapter = createPipeline();
    const adapterResult = adapter.processIntent(intent);
    expect(adapterResult.kind).toBe('report');
    if (adapterResult.kind !== 'report') return;

    expect(adapterResult.report.outcome).toBe(RulesOutcome.FAIL);

    const decision = createAuthoritativeDecision(
      {
        originalReport: adapterResult.report,
        effectiveOutcome: adapterResult.report.outcome,
        hasOverrides: false,
        latestWarning: null,
        overrideCount: 0,
      },
      []
    );

    const effectRegistry = createEffectRegistry();
    const resolution = resolve(decision, effectRegistry);

    expect(resolution.outcome).toBe('NO_EFFECTS_FAIL');
    expect(resolution.effects).toHaveLength(0);
  });

  it('complete flow: AMBIGUOUS → GM selects interpretation → effects', () => {
    // 1. Create intent with unknown ammo
    const intent = createReloadIntent({
      characterId: 'uncertain_pete',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    // 2. Process through adapter
    const adapter = createPipeline();
    const adapterResult = adapter.processIntent(intent);
    expect(adapterResult.kind).toBe('report');
    if (adapterResult.kind !== 'report') return;

    // 3. Verify AMBIGUOUS with structured interpretations
    expect(adapterResult.report.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(adapterResult.report.ambiguity).not.toBeNull();
    expect(adapterResult.report.ambiguity?.possibleInterpretations).toHaveLength(2);

    // 4. GM selects AMMO_AVAILABLE interpretation → deterministic PASS
    const overrideResult = createGmOverride({
      originalReport: adapterResult.report,
      newOutcome: RulesOutcome.PASS,
      selectedInterpretationCode: 'AMMO_AVAILABLE', // Explicit selection
      reason: 'Pete confirmed he has ammo in his saddlebag',
      warning: { severity: 'INFO', message: 'GM confirmed ammo availability' },
      issuedBy: 'gm_marshal' as GmId,
      issuedAt: 1000 as LogicalTime,
    });

    expect(overrideResult.kind).toBe('override');
    if (overrideResult.kind !== 'override') return;

    // 5. Override records the selected interpretation
    expect(overrideResult.override.overriddenOutcome.selectedInterpretationCode).toBe('AMMO_AVAILABLE');

    const effective = getEffectiveValidation(adapterResult.report, [overrideResult.override]);

    // 6. Create authoritative decision with override
    const decision = createAuthoritativeDecision(effective, [overrideResult.override]);

    // 7. Resolve to effects
    const effectRegistry = createEffectRegistry();
    const resolution = resolve(decision, effectRegistry);

    // 8. Verify effects produced via override
    expect(resolution.outcome).toBe('EFFECTS_PRODUCED');
    expect(resolution.effects.length).toBeGreaterThan(0);
    expect(resolution.effects[0]?.authority.source).toBe('OVERRIDE');

    // 9. Original AMBIGUOUS is preserved
    expect(decision.originalReport.outcome).toBe(RulesOutcome.AMBIGUOUS);
  });
});

// ============================================================================
// PR 4.1 - DECLARATIVE COST VALIDATION TESTS
// ============================================================================

describe('Declarative Cost Validation (PR 4.1)', () => {
  /**
   * PR 4.1 INVARIANTS:
   * - Cost validation is DECLARATIVE ONLY - it does NOT enforce anything
   * - NO arithmetic
   * - NO state mutation
   * - NO inference of costs
   * - NO auto-satisfaction
   * - If satisfaction cannot be EXPLICITLY proven → AMBIGUOUS
   */

  describe('Cost Declaration', () => {
    it('emits ActionCostEffect with kind and description', () => {
      const adapter = createPipeline();
      const intent = createReloadIntent({
        characterId: 'wild_bill',
        weaponId: 'colt_peacemaker',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
      });

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        // costValidation field is populated
        expect(result.report.costValidation).toBeDefined();
        expect(result.report.costValidation?.cost).toBeDefined();

        // Cost has correct structure
        expect(result.report.costValidation?.cost.kind).toBe('ActionCostEffect');
        expect(result.report.costValidation?.cost.description).toBe('Reload requires an action');
        expect(result.report.costValidation?.cost.tags).toContain('action');
        expect(result.report.costValidation?.cost.tags).toContain('reload');
      }
    });

    it('RELOAD_ACTION_COST is the declared cost constant', () => {
      expect(RELOAD_ACTION_COST).toBeDefined();
      expect(RELOAD_ACTION_COST.kind).toBe('ActionCostEffect');
      expect(RELOAD_ACTION_COST.description).toBe('Reload requires an action');
    });
  });

  describe('Cost Validation Outcomes', () => {
    it('treats available action as AMBIGUOUS cost, not satisfied', () => {
      const adapter = createPipeline();
      const intent = createReloadIntent({
        characterId: 'wild_bill',
        weaponId: 'colt_peacemaker',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
        actionAvailability: 'available',
      });

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        expect(result.report.costValidation?.outcome).toBe(CostValidationOutcome.AMBIGUOUS);
      }
    });

    it('UNSATISFIED when actionAvailability is unavailable', () => {
      const adapter = createPipeline();
      const intent = createReloadIntent({
        characterId: 'wild_bill',
        weaponId: 'colt_peacemaker',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
        actionAvailability: 'unavailable',
      });

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        expect(result.report.costValidation?.outcome).toBe(CostValidationOutcome.UNSATISFIED);
        expect(result.report.costValidation?.reason).toContain('unavailable');
      }
    });

    it('AMBIGUOUS when actionAvailability is unknown', () => {
      const adapter = createPipeline();
      const intent = createReloadIntent({
        characterId: 'wild_bill',
        weaponId: 'colt_peacemaker',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
        actionAvailability: 'unknown',
      });

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        expect(result.report.costValidation?.outcome).toBe(CostValidationOutcome.AMBIGUOUS);
      }
    });

    it('AMBIGUOUS when actionAvailability is not provided (undefined)', () => {
      const adapter = createPipeline();
      const intent = createReloadIntent({
        characterId: 'wild_bill',
        weaponId: 'colt_peacemaker',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
      });

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        expect(result.report.costValidation?.outcome).toBe(CostValidationOutcome.AMBIGUOUS);
      }
    });

    it('SATISFIED is unreachable without GM override', () => {
      const adapter = createPipeline();

      const availableIntent = createReloadIntent({
        characterId: 'test',
        weaponId: 'test',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
        actionAvailability: 'available',
      });

      const unknownIntent = createReloadIntent({
        characterId: 'test',
        weaponId: 'test',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
        actionAvailability: 'unknown',
      });

      const undefinedIntent = createReloadIntent({
        characterId: 'test',
        weaponId: 'test',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
      });

      const result1 = adapter.processIntent(availableIntent);
      const result2 = adapter.processIntent(unknownIntent);
      const result3 = adapter.processIntent(undefinedIntent);

      if (result1.kind === 'report') {
        expect(result1.report.costValidation?.outcome).not.toBe(CostValidationOutcome.SATISFIED);
      }
      if (result2.kind === 'report') {
        expect(result2.report.costValidation?.outcome).not.toBe(CostValidationOutcome.SATISFIED);
      }
      if (result3.kind === 'report') {
        expect(result3.report.costValidation?.outcome).not.toBe(CostValidationOutcome.SATISFIED);
      }
    });
  });

  describe('Declarative-Only Invariants', () => {
    /**
     * These tests prove the cost system is DECLARATIVE ONLY.
     * It describes requirements; it does NOT enforce them.
     */

    it('cost validation does NOT affect rule outcome (PASS with UNSATISFIED cost)', () => {
      const adapter = createPipeline();
      const intent = createReloadIntent({
        characterId: 'wild_bill',
        weaponId: 'colt_peacemaker',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
        actionAvailability: 'unavailable', // Cost UNSATISFIED
      });

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        // Rule outcome is PASS (ammo is available, weapon is valid)
        expect(result.report.outcome).toBe(RulesOutcome.PASS);

        // Cost is UNSATISFIED (no actions)
        expect(result.report.costValidation?.outcome).toBe(CostValidationOutcome.UNSATISFIED);

        // Cost does NOT block the rule outcome
        // The persistence layer decides what to do with this declarative data
      }
    });

    it('cost validation does NOT affect rule outcome (FAIL with AMBIGUOUS cost)', () => {
      const adapter = createPipeline();
      const intent = createReloadIntent({
        characterId: 'wild_bill',
        weaponId: 'bowie_knife',
        weaponType: 'melee', // Will cause FAIL
        hasShotsCapacity: false,
        ammoAvailability: 'unknown',
        currentAmmoState: 'empty',
        actionAvailability: 'available', // Cost AMBIGUOUS (available does not prove spendability)
      });

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        // Rule outcome is FAIL (melee can't be reloaded)
        expect(result.report.outcome).toBe(RulesOutcome.FAIL);

        // Cost is AMBIGUOUS (available does not prove spendability)
        expect(result.report.costValidation?.outcome).toBe(CostValidationOutcome.AMBIGUOUS);
      }
    });

    it('cost validation is orthogonal to rule ambiguity', () => {
      const adapter = createPipeline();
      const intent = createReloadIntent({
        characterId: 'wild_bill',
        weaponId: 'colt_peacemaker',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'unknown', // Rule AMBIGUOUS
        currentAmmoState: 'empty',
        actionAvailability: 'available', // Cost AMBIGUOUS
      });

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        // Rule outcome is AMBIGUOUS (ammo unknown)
        expect(result.report.outcome).toBe(RulesOutcome.AMBIGUOUS);

        // Cost is AMBIGUOUS (available does not prove spendability)
        expect(result.report.costValidation?.outcome).toBe(CostValidationOutcome.AMBIGUOUS);
      }
    });

    it('cost validation is orthogonal to rule ambiguity (both AMBIGUOUS)', () => {
      const adapter = createPipeline();
      const intent = createReloadIntent({
        characterId: 'wild_bill',
        weaponId: 'colt_peacemaker',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'unknown', // Rule AMBIGUOUS
        currentAmmoState: 'empty',
        actionAvailability: 'unknown', // Cost AMBIGUOUS
      });

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        // Rule outcome is AMBIGUOUS (ammo unknown)
        expect(result.report.outcome).toBe(RulesOutcome.AMBIGUOUS);

        // Cost is AMBIGUOUS (action unknown)
        expect(result.report.costValidation?.outcome).toBe(CostValidationOutcome.AMBIGUOUS);

        // Both need GM decisions independently
      }
    });
  });

  describe('No Arithmetic / No State Mutation', () => {
    /**
     * These tests prove there is NO arithmetic and NO state mutation.
     * The cost system never computes or changes anything.
     */

    it('cost description is static text, not computed', () => {
      // Test that the cost description is always the same
      // regardless of any payload values
      const adapter = createPipeline();

      const intent1 = createReloadIntent({
        characterId: 'char_1',
        weaponId: 'weapon_1',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
        actionAvailability: 'available',
      });

      const intent2 = createReloadIntent({
        characterId: 'char_2',
        weaponId: 'weapon_2',
        weaponType: 'crossbow',
        hasShotsCapacity: true,
        ammoAvailability: 'unavailable',
        currentAmmoState: 'partial',
        actionAvailability: 'unavailable',
      });

      const result1 = adapter.processIntent(intent1);
      const result2 = adapter.processIntent(intent2);

      // Both have the SAME cost declaration - no arithmetic
      if (result1.kind === 'report' && result2.kind === 'report') {
        expect(result1.report.costValidation?.cost).toEqual(result2.report.costValidation?.cost);
        expect(result1.report.costValidation?.cost.description).toBe('Reload requires an action');
        expect(result2.report.costValidation?.cost.description).toBe('Reload requires an action');
      }
    });

    it('cost tags are declarative categorization, not computed', () => {
      const adapter = createPipeline();
      const intent = createReloadIntent({
        characterId: 'wild_bill',
        weaponId: 'colt_peacemaker',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
      });

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        // Tags are static categorization
        const tags = result.report.costValidation?.cost.tags ?? [];
        expect(tags).toEqual(['action', 'reload']);

        // Tags do NOT change based on any state
        // They are DESCRIPTIVE ONLY
      }
    });
  });
});
