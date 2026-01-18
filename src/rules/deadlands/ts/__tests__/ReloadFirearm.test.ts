/**
 * Reload Firearm Rule Tests (PR 4.0)
 *
 * End-to-end tests proving:
 * - The rule is selected correctly by intent
 * - PASS produces expected ValidationReport
 * - FAIL produces violations
 * - AMBIGUOUS produces ambiguity reasons
 * - GM override can override FAIL or AMBIGUOUS
 * - Resolution produces effects only on PASS or override
 *
 * These tests assert end-to-end behavior, not isolated units.
 *
 * EXPLICITLY OUT OF SCOPE FOR PR 4.0 (intentional deferral, not TODOs):
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
import { createAuthoritativeDecision, EffectType } from '../../../../resolution/ts/types';

// Deadlands rule imports
import {
  createDeadlandsPipelineRegistry,
  RELOAD_FIREARM_INTENT_TYPE,
  produceReloadFirearmEffects,
  ReloadFirearmPayload,
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
   * - ambiguity field is populated with reason and interpretations
   * - No ERROR violations (may have warnings)
   * - Resolution produces NO effects (requires GM decision)
   *
   * GM Override handling for AMBIGUOUS:
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

  it('provides meaningful ambiguity interpretations', () => {
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
      // Ambiguity presents both possible interpretations for GM
      const interpretations = result.report.ambiguity?.possibleInterpretations ?? [];
      expect(interpretations.some(i => i.includes('has ammunition'))).toBe(true);
      expect(interpretations.some(i => i.includes('no ammunition'))).toBe(true);
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

  it('allows GM to override AMBIGUOUS to PASS', () => {
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

    // GM resolves ambiguity to PASS
    const overrideResult = createGmOverride({
      originalReport: result.report,
      newOutcome: RulesOutcome.PASS,
      reason: 'Pete has ammo in his saddlebag (not tracked in system)',
      warning: { severity: 'INFO', message: 'GM confirmed ammo availability' },
      issuedBy: 'gm_marshal' as GmId,
      issuedAt: 1000 as LogicalTime,
    });

    expect(overrideResult.kind).toBe('override');
    if (overrideResult.kind !== 'override') return;

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
   * GM Override AMBIGUOUS → FAIL
   *
   * When AMBIGUOUS outcome occurs, GM can resolve to FAIL if they
   * determine the character does NOT have ammunition. This produces
   * NO effects (same as regular FAIL).
   */
  it('allows GM to override AMBIGUOUS to FAIL (no effects produced)', () => {
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

    // GM resolves ambiguity to FAIL (character has no ammo)
    const overrideResult = createGmOverride({
      originalReport: result.report,
      newOutcome: RulesOutcome.FAIL,
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
      },
      []
    );

    const effectRegistry = createEffectRegistry();
    const resolution = resolve(decision, effectRegistry);

    expect(resolution.outcome).toBe('NO_EFFECTS_FAIL');
    expect(resolution.effects).toHaveLength(0);
  });

  it('complete flow: AMBIGUOUS → GM override → effects', () => {
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

    // 3. Verify AMBIGUOUS
    expect(adapterResult.report.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(adapterResult.report.ambiguity).not.toBeNull();

    // 4. GM resolves ambiguity
    const overrideResult = createGmOverride({
      originalReport: adapterResult.report,
      newOutcome: RulesOutcome.PASS,
      reason: 'Pete confirmed he has ammo in his saddlebag',
      warning: { severity: 'INFO', message: 'GM confirmed ammo availability' },
      issuedBy: 'gm_marshal' as GmId,
      issuedAt: 1000 as LogicalTime,
    });

    expect(overrideResult.kind).toBe('override');
    if (overrideResult.kind !== 'override') return;

    const effective = getEffectiveValidation(adapterResult.report, [overrideResult.override]);

    // 5. Create authoritative decision with override
    const decision = createAuthoritativeDecision(effective, [overrideResult.override]);

    // 6. Resolve to effects
    const effectRegistry = createEffectRegistry();
    const resolution = resolve(decision, effectRegistry);

    // 7. Verify effects produced via override
    expect(resolution.outcome).toBe('EFFECTS_PRODUCED');
    expect(resolution.effects.length).toBeGreaterThan(0);
    expect(resolution.effects[0]?.authority.source).toBe('OVERRIDE');

    // 8. Original AMBIGUOUS is preserved
    expect(decision.originalReport.outcome).toBe(RulesOutcome.AMBIGUOUS);
  });
});
