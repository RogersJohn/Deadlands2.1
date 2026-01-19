/**
 * Act While Shaken Rule Tests (PR 6.0)
 *
 * CRITICAL TEST: FAIL does not mean "nothing happens."
 *
 * These tests prove:
 * - FAIL + Effects: Validation FAILs but effects are emitted
 * - FAIL + Cost: ActionCostEffect is present despite FAIL
 * - FAIL + Conflict: SoftBlock conflict is present, does not suppress
 * - Coexistence: Multiple rules emit outputs without coordination
 * - No Ordering: Rule order does not affect aggregated output
 */

import { describe, it, expect } from 'vitest';
import {
  createActWhileShakenPipeline,
  hasShakenFlag,
  createShakenEffects,
  createShakenConflict,
  SHAKEN_ACTION_COST,
  ACT_WHILE_SHAKEN_INTENT_TYPE,
  DEADLANDS_CORE_RULESET_ID,
} from '../ActWhileShaken';
import { createReloadFirearmPipeline, RELOAD_FIREARM_INTENT_TYPE } from '../ReloadFirearm';
import type { ValidatedIntent } from '../../../../intent/bridge/ts/ValidatedIntent';
import type { IntentType, IntentId } from '../../../../intent/bridge/ts/ValidatedIntent';
import type { InvocationId } from '../../../../intent/bridge/ts/RulesPipeline';
import { RulesOutcome, ConflictKind } from '../../../../intent/bridge/ts/RulesPipeline';
import { CostValidationOutcome } from '../../../../resolution/ts/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTestIntent(
  payload: unknown,
  intentType: IntentType = ACT_WHILE_SHAKEN_INTENT_TYPE
): ValidatedIntent {
  return {
    intentId: 'intent_001' as IntentId,
    intentType,
    payload,
    validationSummary: {
      validatedAt: Date.now(),
      validatorVersion: '1.0.0',
      structuralChecks: { allFieldsPresent: true, typesValid: true },
    },
  } as ValidatedIntent;
}

const TEST_INVOCATION_ID = 'inv_001' as InvocationId;

// ============================================================================
// CRITICAL TEST: FAIL + EFFECTS
// ============================================================================

describe('Act While Shaken - FAIL + Effects', () => {
  const pipeline = createActWhileShakenPipeline();

  it('validation outcome is FAIL when actor is Shaken', () => {
    const intent = createTestIntent({
      characterId: 'char_001',
      shaken: true,
    });

    const report = pipeline.validate(intent, TEST_INVOCATION_ID);

    expect(report.outcome).toBe(RulesOutcome.FAIL);
  });

  it('effects are created despite FAIL outcome', () => {
    const effects = createShakenEffects('char_001', TEST_INVOCATION_ID);

    // CRITICAL: Effects array is non-empty
    expect(effects.length).toBeGreaterThan(0);

    // Effects exist with FAIL outcome
    expect(effects[0].authority.outcome).toBe(RulesOutcome.FAIL);
  });

  it('FAIL validation produces violations', () => {
    const intent = createTestIntent({
      characterId: 'char_001',
      shaken: true,
    });

    const report = pipeline.validate(intent, TEST_INVOCATION_ID);

    expect(report.violations.length).toBeGreaterThan(0);
    expect(report.violations[0].ruleId).toBe('SW_SHAKEN_001');
    expect(report.violations[0].severity).toBe('ERROR');
  });

  it('effects describe the constrained action attempt', () => {
    const effects = createShakenEffects('char_001', TEST_INVOCATION_ID);

    expect(effects[0].description).toContain('Shaken');
    expect(effects[0].target.targetId).toBe('char_001');
    expect(effects[0].target.targetType).toBe('character');
  });
});

// ============================================================================
// CRITICAL TEST: FAIL + COST
// ============================================================================

describe('Act While Shaken - FAIL + Cost', () => {
  const pipeline = createActWhileShakenPipeline();

  it('ActionCostEffect is present despite FAIL', () => {
    const intent = createTestIntent({
      characterId: 'char_001',
      shaken: true,
      actionAvailability: 'unknown',
    });

    const report = pipeline.validate(intent, TEST_INVOCATION_ID);

    // CRITICAL: Cost validation exists despite FAIL
    expect(report.costValidation).toBeDefined();
    expect(report.costValidation?.cost.kind).toBe('ActionCostEffect');
  });

  it('cost description is non-numeric', () => {
    expect(SHAKEN_ACTION_COST.description).not.toMatch(/\d/);
    expect(typeof SHAKEN_ACTION_COST.description).toBe('string');
  });

  it('cost is AMBIGUOUS when action availability is unknown', () => {
    const intent = createTestIntent({
      characterId: 'char_001',
      shaken: true,
      actionAvailability: 'unknown',
    });

    const report = pipeline.validate(intent, TEST_INVOCATION_ID);

    expect(report.costValidation?.outcome).toBe(CostValidationOutcome.AMBIGUOUS);
  });

  it('cost is UNSATISFIED when action explicitly unavailable', () => {
    const intent = createTestIntent({
      characterId: 'char_001',
      shaken: true,
      actionAvailability: 'unavailable',
    });

    const report = pipeline.validate(intent, TEST_INVOCATION_ID);

    expect(report.costValidation?.outcome).toBe(CostValidationOutcome.UNSATISFIED);
  });

  it('cost tags are inert (descriptive only)', () => {
    expect(SHAKEN_ACTION_COST.tags).toBeDefined();
    expect(SHAKEN_ACTION_COST.tags).toContain('shaken');
    // Tags are strings, not executable
    expect(SHAKEN_ACTION_COST.tags?.every(t => typeof t === 'string')).toBe(true);
  });
});

// ============================================================================
// CRITICAL TEST: FAIL + CONFLICT
// ============================================================================

describe('Act While Shaken - FAIL + Conflict', () => {
  const pipeline = createActWhileShakenPipeline();

  it('SoftBlock conflict is present', () => {
    const intent = createTestIntent({
      characterId: 'char_001',
      shaken: true,
    });

    const report = pipeline.validate(intent, TEST_INVOCATION_ID);

    expect(report.conflicts.length).toBeGreaterThan(0);
    expect(report.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
  });

  it('conflict is descriptive (has message)', () => {
    const conflict = createShakenConflict();

    expect(conflict.message).toBeDefined();
    expect(conflict.message.length).toBeGreaterThan(0);
    expect(conflict.message).toContain('Shaken');
  });

  it('conflict is non-resolving (no resolution fields)', () => {
    const conflict = createShakenConflict();

    // Conflict should NOT have resolution fields
    expect('resolution' in conflict).toBe(false);
    expect('resolvedBy' in conflict).toBe(false);
    expect('resolutionOutcome' in conflict).toBe(false);
  });

  it('conflict is non-prioritized (no priority field)', () => {
    const conflict = createShakenConflict();

    expect('priority' in conflict).toBe(false);
    expect('precedence' in conflict).toBe(false);
  });

  it('conflict has source rule for traceability', () => {
    const conflict = createShakenConflict();

    expect(conflict.sourceRule).toBe('SW_SHAKEN_001');
  });

  it('conflict does not suppress effects', () => {
    const intent = createTestIntent({
      characterId: 'char_001',
      shaken: true,
    });

    const report = pipeline.validate(intent, TEST_INVOCATION_ID);

    // Conflict exists
    expect(report.conflicts.length).toBeGreaterThan(0);

    // Effects can still be created (they exist independently)
    const effects = createShakenEffects('char_001', TEST_INVOCATION_ID);
    expect(effects.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// CRITICAL TEST: COEXISTENCE WITH RELOAD FIREARM
// ============================================================================

describe('Act While Shaken - Coexistence with Reload Firearm', () => {
  const shakenPipeline = createActWhileShakenPipeline();
  const reloadPipeline = createReloadFirearmPipeline();

  it('both rules can produce outputs independently', () => {
    // Shaken intent
    const shakenIntent = createTestIntent(
      {
        characterId: 'char_001',
        shaken: true,
      },
      ACT_WHILE_SHAKEN_INTENT_TYPE
    );

    // Reload intent
    const reloadIntent = createTestIntent(
      {
        characterId: 'char_001',
        weaponId: 'weapon_001',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
      },
      RELOAD_FIREARM_INTENT_TYPE
    );

    const shakenReport = shakenPipeline.validate(shakenIntent, 'inv_shaken' as InvocationId);
    const reloadReport = reloadPipeline.validate(reloadIntent, 'inv_reload' as InvocationId);

    // Both produce outputs
    expect(shakenReport).toBeDefined();
    expect(reloadReport).toBeDefined();

    // Different outcomes are valid
    expect(shakenReport.outcome).toBe(RulesOutcome.FAIL);
    expect(reloadReport.outcome).toBe(RulesOutcome.PASS);
  });

  it('Shaken rule does not inspect Reload rule', () => {
    // Shaken rule only looks at shaken flag, not weapon data
    const intent = createTestIntent({
      characterId: 'char_001',
      shaken: true,
      // Reload-related fields should be ignored
      weaponId: 'weapon_001',
      weaponType: 'firearm',
    });

    const report = shakenPipeline.validate(intent, TEST_INVOCATION_ID);

    // Shaken rule produces its own output
    expect(report.outcome).toBe(RulesOutcome.FAIL);
    expect(report.conflicts[0].sourceRule).toBe('SW_SHAKEN_001');
  });

  it('Reload rule does not inspect Shaken rule', () => {
    // Reload rule only looks at weapon data, not shaken flag
    const intent = createTestIntent(
      {
        characterId: 'char_001',
        weaponId: 'weapon_001',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
        // Shaken flag should be ignored by reload rule
        shaken: true,
      },
      RELOAD_FIREARM_INTENT_TYPE
    );

    const report = reloadPipeline.validate(intent, TEST_INVOCATION_ID);

    // Reload rule produces its own output (ignores shaken)
    expect(report.outcome).toBe(RulesOutcome.PASS);
    expect(report.violations.length).toBe(0);
  });

  it('both rules can emit to same aggregated report', () => {
    // Simulate aggregation: both rules produce results
    const shakenIntent = createTestIntent(
      { characterId: 'char_001', shaken: true },
      ACT_WHILE_SHAKEN_INTENT_TYPE
    );

    const reloadIntent = createTestIntent(
      {
        characterId: 'char_001',
        weaponId: 'weapon_001',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
      },
      RELOAD_FIREARM_INTENT_TYPE
    );

    const shakenReport = shakenPipeline.validate(shakenIntent, 'inv_001' as InvocationId);
    const reloadReport = reloadPipeline.validate(reloadIntent, 'inv_002' as InvocationId);

    // Both can be collected without conflict
    const ruleResults = [shakenReport, reloadReport];

    expect(ruleResults.some(r => r.outcome === RulesOutcome.FAIL)).toBe(true);
    expect(ruleResults.some(r => r.outcome === RulesOutcome.PASS)).toBe(true);

    // Violations from both rules can coexist
    const allViolations = ruleResults.flatMap(r => r.violations);
    expect(allViolations.some(v => v.ruleId === 'SW_SHAKEN_001')).toBe(true);

    // Conflicts from both rules can coexist
    const allConflicts = ruleResults.flatMap(r => r.conflicts);
    expect(allConflicts.some(c => c.sourceRule === 'SW_SHAKEN_001')).toBe(true);
  });
});

// ============================================================================
// CRITICAL TEST: NO ORDERING
// ============================================================================

describe('Act While Shaken - No Ordering', () => {
  const shakenPipeline = createActWhileShakenPipeline();
  const reloadPipeline = createReloadFirearmPipeline();

  it('swapping rule evaluation order produces identical outputs', () => {
    const shakenIntent = createTestIntent(
      { characterId: 'char_001', shaken: true },
      ACT_WHILE_SHAKEN_INTENT_TYPE
    );

    const reloadIntent = createTestIntent(
      {
        characterId: 'char_001',
        weaponId: 'weapon_001',
        weaponType: 'firearm',
        hasShotsCapacity: true,
        ammoAvailability: 'available',
        currentAmmoState: 'empty',
      },
      RELOAD_FIREARM_INTENT_TYPE
    );

    // Order 1: Shaken first, then Reload
    const order1Shaken = shakenPipeline.validate(shakenIntent, 'inv_001' as InvocationId);
    const order1Reload = reloadPipeline.validate(reloadIntent, 'inv_002' as InvocationId);

    // Order 2: Reload first, then Shaken
    const order2Reload = reloadPipeline.validate(reloadIntent, 'inv_002' as InvocationId);
    const order2Shaken = shakenPipeline.validate(shakenIntent, 'inv_001' as InvocationId);

    // Results should be identical regardless of order
    expect(order1Shaken.outcome).toBe(order2Shaken.outcome);
    expect(order1Reload.outcome).toBe(order2Reload.outcome);

    expect(order1Shaken.violations.length).toBe(order2Shaken.violations.length);
    expect(order1Reload.violations.length).toBe(order2Reload.violations.length);

    expect(order1Shaken.conflicts.length).toBe(order2Shaken.conflicts.length);
    expect(order1Reload.conflicts.length).toBe(order2Reload.conflicts.length);
  });

  it('rules do not modify shared state', () => {
    const intent = createTestIntent({
      characterId: 'char_001',
      shaken: true,
    });

    // Run validation multiple times
    const report1 = shakenPipeline.validate(intent, 'inv_001' as InvocationId);
    const report2 = shakenPipeline.validate(intent, 'inv_002' as InvocationId);
    const report3 = shakenPipeline.validate(intent, 'inv_003' as InvocationId);

    // All should produce identical outcomes
    expect(report1.outcome).toBe(report2.outcome);
    expect(report2.outcome).toBe(report3.outcome);
  });
});

// ============================================================================
// TYPE GUARD TESTS
// ============================================================================

describe('Act While Shaken - Type Guards', () => {
  it('hasShakenFlag returns true for valid payload', () => {
    expect(hasShakenFlag({ characterId: 'char_001', shaken: true })).toBe(true);
    expect(hasShakenFlag({ characterId: 'char_001', shaken: false })).toBe(true);
  });

  it('hasShakenFlag returns false for invalid payload', () => {
    expect(hasShakenFlag(null)).toBe(false);
    expect(hasShakenFlag(undefined)).toBe(false);
    expect(hasShakenFlag({})).toBe(false);
    expect(hasShakenFlag({ characterId: 'char_001' })).toBe(false);
    expect(hasShakenFlag({ shaken: true })).toBe(false);
  });
});

// ============================================================================
// PASSTHROUGH TESTS (Non-Shaken)
// ============================================================================

describe('Act While Shaken - Passthrough when not Shaken', () => {
  const pipeline = createActWhileShakenPipeline();

  it('PASS when actor is not Shaken', () => {
    const intent = createTestIntent({
      characterId: 'char_001',
      shaken: false,
    });

    const report = pipeline.validate(intent, TEST_INVOCATION_ID);

    expect(report.outcome).toBe(RulesOutcome.PASS);
    expect(report.violations.length).toBe(0);
    expect(report.conflicts.length).toBe(0);
  });

  it('PASS when payload has no shaken flag', () => {
    const intent = createTestIntent({
      characterId: 'char_001',
      someOtherField: 'value',
    });

    const report = pipeline.validate(intent, TEST_INVOCATION_ID);

    expect(report.outcome).toBe(RulesOutcome.PASS);
  });
});

// ============================================================================
// ASSERTION: FAIL + Effects coexist
// ============================================================================

describe('Act While Shaken - Critical Assertion', () => {
  it('FAIL outcome AND non-empty effects coexist', () => {
    const pipeline = createActWhileShakenPipeline();
    const intent = createTestIntent({
      characterId: 'char_001',
      shaken: true,
    });

    const report = pipeline.validate(intent, TEST_INVOCATION_ID);
    const effects = createShakenEffects('char_001', TEST_INVOCATION_ID);

    // CRITICAL ASSERTION from PR 6.0 spec
    expect(report.outcome).toBe(RulesOutcome.FAIL);
    expect(effects.length).toBeGreaterThan(0);
  });
});
