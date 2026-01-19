/**
 * Action Economy Tests (PR 8.0)
 *
 * CRITICAL TEST: Rules describe requirements without enforcing them.
 *
 * These tests PROVE:
 * - Multiple actions produce ambiguity (not enforcement)
 * - Free actions do not suppress regular actions
 * - Movement + action is ambiguous (not decided)
 * - No enforcement, no counting, no tracking
 * - Effects are still emitted despite ambiguity
 * - Repeating the same intent produces identical output (no state changes)
 *
 * If any test passes by enforcement or counting, PR 8.0 fails.
 */

import { describe, it, expect } from 'vitest';
import {
  createMultipleActionsPipeline,
  createMultipleActionsEffects,
  isMultipleActionsPayload,
  MULTIPLE_ACTIONS_INTENT_TYPE,
  MULTIPLE_ACTIONS_APPLICABILITY,
} from '../MultipleActions';
import type { MultipleActionsPayload } from '../MultipleActions';
import {
  createFreeActionsVsActionsPipeline,
  createFreeActionsVsActionsEffects,
  isFreeActionsVsActionsPayload,
  FREE_ACTIONS_VS_ACTIONS_INTENT_TYPE,
  FREE_ACTIONS_VS_ACTIONS_APPLICABILITY,
} from '../FreeActionsVsActions';
import type { FreeActionsVsActionsPayload } from '../FreeActionsVsActions';
import {
  createMovementPlusActionPipeline,
  createMovementPlusActionEffects,
  isMovementPlusActionPayload,
  MOVEMENT_PLUS_ACTION_INTENT_TYPE,
  MOVEMENT_PLUS_ACTION_APPLICABILITY,
} from '../MovementPlusAction';
import type { MovementPlusActionPayload } from '../MovementPlusAction';
import type { ValidatedIntent } from '../../../../intent/bridge/ts/ValidatedIntent';
import type { InvocationId } from '../../../../intent/bridge/ts/RulesPipeline';
import { RulesOutcome, ConflictKind } from '../../../../intent/bridge/ts/RulesPipeline';
import { CostValidationOutcome } from '../../../../resolution/ts/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTestIntent<T>(
  intentType: string,
  payload: T,
  intentId: string = 'intent_test_001'
): ValidatedIntent {
  return {
    intentId,
    intentType,
    payload,
    submittedBy: 'player_001',
    submittedAt: Date.now(),
  };
}

function createInvocationId(): InvocationId {
  return `inv_${Date.now()}` as InvocationId;
}

// ============================================================================
// RULE 1: MULTIPLE ACTIONS IN A TURN
// ============================================================================

describe('Multiple Actions Rule - No Enforcement', () => {
  const pipeline = createMultipleActionsPipeline();

  it('multiple actions produce AMBIGUOUS validation', () => {
    const payload: MultipleActionsPayload = {
      characterId: 'char_001',
      declaredActions: ['attack', 'reload', 'aim'],
    };

    const intent = createTestIntent(MULTIPLE_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Multiple actions are AMBIGUOUS, not FAIL
    expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(result.ambiguity).not.toBeNull();
    expect(result.ambiguity?.reason).toContain('Multiple actions declared');
  });

  it('multiple cost effects exist', () => {
    const payload: MultipleActionsPayload = {
      characterId: 'char_001',
      declaredActions: ['attack', 'reload'],
    };

    const intent = createTestIntent(MULTIPLE_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Cost validation exists and mentions multiple actions
    expect(result.costValidation).toBeDefined();
    expect(result.costValidation?.cost.description).toContain('Multiple actions');
    expect(result.costValidation?.outcome).toBe(CostValidationOutcome.AMBIGUOUS);
  });

  it('effects are still emitted despite ambiguity', () => {
    const payload: MultipleActionsPayload = {
      characterId: 'char_001',
      declaredActions: ['attack', 'reload', 'aim'],
    };

    const invocationId = createInvocationId();
    const effects = createMultipleActionsEffects(
      payload.characterId,
      payload.declaredActions,
      invocationId
    );

    // CRITICAL ASSERTION: Effects exist despite ambiguity
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.length).toBe(3); // One per declared action
    effects.forEach((effect) => {
      expect(effect.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });
  });

  it('SoftBlock conflict exists for multiple actions', () => {
    const payload: MultipleActionsPayload = {
      characterId: 'char_001',
      declaredActions: ['attack', 'reload'],
    };

    const intent = createTestIntent(MULTIPLE_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Conflict describes pressure, does not enforce
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
    expect(result.conflicts[0].message).toContain('Action economy pressure');
    expect(result.conflicts[0].message).toContain('No enforcement performed');
  });

  it('single action produces PASS, not enforcement', () => {
    const payload: MultipleActionsPayload = {
      characterId: 'char_001',
      declaredActions: ['attack'],
    };

    const intent = createTestIntent(MULTIPLE_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // Single action is not a problem
    expect(result.outcome).toBe(RulesOutcome.PASS);
    expect(result.conflicts.length).toBe(0);
  });

  it('repeating same intent produces identical output (no state changes)', () => {
    const payload: MultipleActionsPayload = {
      characterId: 'char_001',
      declaredActions: ['attack', 'reload'],
    };

    const intent = createTestIntent(MULTIPLE_ACTIONS_INTENT_TYPE, payload);
    const invocationId = createInvocationId();

    // Run validation multiple times
    const result1 = pipeline.validate(intent, invocationId);
    const result2 = pipeline.validate(intent, invocationId);
    const result3 = pipeline.validate(intent, invocationId);

    // CRITICAL: All results are identical - no state mutation
    expect(result1.outcome).toBe(result2.outcome);
    expect(result2.outcome).toBe(result3.outcome);
    expect(result1.conflicts.length).toBe(result2.conflicts.length);
    expect(result1.ambiguity?.reason).toBe(result2.ambiguity?.reason);
  });
});

// ============================================================================
// RULE 2: FREE ACTIONS VS ACTIONS
// ============================================================================

describe('Free Actions vs Actions Rule - No Suppression', () => {
  const pipeline = createFreeActionsVsActionsPipeline();

  it('action + free action produces AMBIGUOUS (not PASS)', () => {
    const payload: FreeActionsVsActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredFreeAction: 'speak',
    };

    const intent = createTestIntent(FREE_ACTIONS_VS_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: AMBIGUOUS, not PASS
    // The system does NOT enforce "free action" convention
    // Absence of cost does NOT imply legality
    expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(result.ambiguity).not.toBeNull();
    expect(result.ambiguity?.reason).toContain('does not enforce');
    expect(result.violations.length).toBe(0); // No violations - ambiguity, not failure
  });

  it('action cost exists, free action has no cost', () => {
    const payload: FreeActionsVsActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredFreeAction: 'speak',
    };

    const intent = createTestIntent(FREE_ACTIONS_VS_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Cost exists for action
    expect(result.costValidation).toBeDefined();
    expect(result.costValidation?.cost.description).toContain('attack');

    // Free action is not in the cost (no cost for free actions)
    expect(result.costValidation?.cost.tags).not.toContain('free_action');
  });

  it('both effects occur (despite AMBIGUOUS)', () => {
    const payload: FreeActionsVsActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredFreeAction: 'speak',
    };

    const invocationId = createInvocationId();
    const effects = createFreeActionsVsActionsEffects(
      payload.characterId,
      payload.declaredAction,
      payload.declaredFreeAction,
      invocationId,
      RulesOutcome.AMBIGUOUS // CRITICAL: AMBIGUOUS, not PASS
    );

    // CRITICAL: Both action and free action produce effects despite AMBIGUOUS
    expect(effects.length).toBe(2);

    const actionEffect = effects.find((e) => e.parameters.actionType === 'standard');
    const freeEffect = effects.find((e) => e.parameters.actionType === 'free');

    expect(actionEffect).toBeDefined();
    expect(freeEffect).toBeDefined();
    expect(actionEffect?.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(freeEffect?.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
  });

  it('Informational conflict exists for action + free action', () => {
    const payload: FreeActionsVsActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredFreeAction: 'speak',
    };

    const intent = createTestIntent(FREE_ACTIONS_VS_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Informational conflict MUST exist when both are declared
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].kind).toBe(ConflictKind.Informational);
    expect(result.conflicts[0].message).toContain('does not enforce');
    expect(result.conflicts[0].tags).toContain('no-enforcement');
  });

  it('free action alone produces no cost', () => {
    const payload: FreeActionsVsActionsPayload = {
      characterId: 'char_001',
      declaredFreeAction: 'speak',
    };

    const intent = createTestIntent(FREE_ACTIONS_VS_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: No cost for free action alone
    expect(result.outcome).toBe(RulesOutcome.PASS);
    expect(result.costValidation).toBeUndefined();
  });

  it('never produces FAIL for action + free action', () => {
    const payload: FreeActionsVsActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredFreeAction: 'speak',
      actionAvailability: 'unavailable', // Even with unavailable, not FAIL
    };

    const intent = createTestIntent(FREE_ACTIONS_VS_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: AMBIGUOUS at worst, never FAIL
    expect(result.outcome).not.toBe(RulesOutcome.FAIL);
  });
});

// ============================================================================
// RULE 3: MOVEMENT + ACTION LEGALITY
// ============================================================================

describe('Movement + Action Rule - No Decision', () => {
  const pipeline = createMovementPlusActionPipeline();

  it('movement + action produces AMBIGUOUS validation', () => {
    const payload: MovementPlusActionPayload = {
      characterId: 'char_001',
      movementDeclared: true,
      movementDescription: 'advance toward enemy',
      declaredAction: 'attack',
    };

    const intent = createTestIntent(MOVEMENT_PLUS_ACTION_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: AMBIGUOUS - the system does not decide
    expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(result.ambiguity).not.toBeNull();
    expect(result.ambiguity?.reason).toContain('The system does not decide');
  });

  it('SoftBlock conflict exists emphasizing GM adjudication', () => {
    const payload: MovementPlusActionPayload = {
      characterId: 'char_001',
      movementDeclared: true,
      movementDescription: 'retreat',
      declaredAction: 'reload',
    };

    const intent = createTestIntent(MOVEMENT_PLUS_ACTION_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: SoftBlock exists for GM adjudication
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
    expect(result.conflicts[0].message).toContain('GM adjudication required');
  });

  it('both movement and action effects exist', () => {
    const payload: MovementPlusActionPayload = {
      characterId: 'char_001',
      movementDeclared: true,
      movementDescription: 'flank',
      declaredAction: 'attack',
    };

    const invocationId = createInvocationId();
    const effects = createMovementPlusActionEffects(
      payload.characterId,
      payload.movementDeclared,
      payload.movementDescription,
      payload.declaredAction,
      invocationId
    );

    // CRITICAL ASSERTION: Both effects exist
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.length).toBe(2);

    const movementEffect = effects.find((e) => e.effectType === 'CHANGE_POSITION');
    const actionEffect = effects.find((e) => e.effectType === 'TRIGGER_NARRATIVE');

    expect(movementEffect).toBeDefined();
    expect(actionEffect).toBeDefined();
  });

  it('movement cost is descriptive, not numeric', () => {
    const payload: MovementPlusActionPayload = {
      characterId: 'char_001',
      movementDeclared: true,
      movementDescription: 'advance',
      declaredAction: 'attack',
    };

    const intent = createTestIntent(MOVEMENT_PLUS_ACTION_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Cost is descriptive, contains no numbers
    expect(result.costValidation).toBeDefined();
    expect(result.costValidation?.cost.description).not.toMatch(/\d+/); // No numbers
    expect(result.costValidation?.cost.description).toContain('Movement');
    expect(result.costValidation?.cost.description).toContain('Action');
  });

  it('movement alone produces PASS (no action economy conflict)', () => {
    const payload: MovementPlusActionPayload = {
      characterId: 'char_001',
      movementDeclared: true,
      movementDescription: 'retreat to cover',
    };

    const intent = createTestIntent(MOVEMENT_PLUS_ACTION_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // Movement alone is not ambiguous
    expect(result.outcome).toBe(RulesOutcome.PASS);
    expect(result.conflicts.length).toBe(0);
  });
});

// ============================================================================
// CRITICAL: NO ENFORCEMENT
// ============================================================================

describe('Action Economy - No Enforcement Invariants', () => {
  it('no numeric limits in multiple actions', () => {
    const multiPipeline = createMultipleActionsPipeline();

    // Declare many actions - no limit enforcement
    const payload: MultipleActionsPayload = {
      characterId: 'char_001',
      declaredActions: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
    };

    const intent = createTestIntent(MULTIPLE_ACTIONS_INTENT_TYPE, payload);
    const result = multiPipeline.validate(intent, createInvocationId());

    // CRITICAL: Still AMBIGUOUS, not "limit exceeded" or "too many"
    expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(result.violations.length).toBe(0); // No violations for "too many"
  });

  it('no "already used" language in any rule', () => {
    const multiPipeline = createMultipleActionsPipeline();
    const freeActionsPipeline = createFreeActionsVsActionsPipeline();
    const movementPipeline = createMovementPlusActionPipeline();

    const multiPayload: MultipleActionsPayload = {
      characterId: 'char_001',
      declaredActions: ['attack', 'reload'],
    };

    const freePayload: FreeActionsVsActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredFreeAction: 'speak',
    };

    const movePayload: MovementPlusActionPayload = {
      characterId: 'char_001',
      movementDeclared: true,
      declaredAction: 'attack',
    };

    const multiResult = multiPipeline.validate(
      createTestIntent(MULTIPLE_ACTIONS_INTENT_TYPE, multiPayload),
      createInvocationId()
    );
    const freeResult = freeActionsPipeline.validate(
      createTestIntent(FREE_ACTIONS_VS_ACTIONS_INTENT_TYPE, freePayload),
      createInvocationId()
    );
    const moveResult = movementPipeline.validate(
      createTestIntent(MOVEMENT_PLUS_ACTION_INTENT_TYPE, movePayload),
      createInvocationId()
    );

    // CRITICAL: No "already used" language anywhere
    const allMessages = [
      multiResult.ambiguity?.reason || '',
      ...multiResult.conflicts.map((c) => c.message),
      ...freeResult.conflicts.map((c) => c.message),
      moveResult.ambiguity?.reason || '',
      ...moveResult.conflicts.map((c) => c.message),
    ];

    allMessages.forEach((msg) => {
      expect(msg.toLowerCase()).not.toContain('already used');
      expect(msg.toLowerCase()).not.toContain('already spent');
      expect(msg.toLowerCase()).not.toContain('no actions remaining');
    });
  });

  it('no state mutation - same input always same output', () => {
    const pipeline = createMovementPlusActionPipeline();

    const payload: MovementPlusActionPayload = {
      characterId: 'char_001',
      movementDeclared: true,
      declaredAction: 'attack',
    };

    const intent = createTestIntent(MOVEMENT_PLUS_ACTION_INTENT_TYPE, payload);
    const invocationId = createInvocationId();

    // Run 100 times
    const results: RulesOutcome[] = [];
    for (let i = 0; i < 100; i++) {
      const result = pipeline.validate(intent, invocationId);
      results.push(result.outcome);
    }

    // CRITICAL: All results identical - no state changes
    expect(new Set(results).size).toBe(1);
  });
});

// ============================================================================
// CRITICAL: APPLICABILITY
// ============================================================================

describe('Action Economy - Applicability', () => {
  it('all rules apply only in combat mode', () => {
    expect(MULTIPLE_ACTIONS_APPLICABILITY.modes).toContain('combat');
    expect(FREE_ACTIONS_VS_ACTIONS_APPLICABILITY.modes).toContain('combat');
    expect(MOVEMENT_PLUS_ACTION_APPLICABILITY.modes).toContain('combat');

    expect(MULTIPLE_ACTIONS_APPLICABILITY.modes).not.toContain('downtime');
    expect(FREE_ACTIONS_VS_ACTIONS_APPLICABILITY.modes).not.toContain('downtime');
    expect(MOVEMENT_PLUS_ACTION_APPLICABILITY.modes).not.toContain('social');
  });

  it('applicability is explicit, no defaults', () => {
    expect(MULTIPLE_ACTIONS_APPLICABILITY.modes.length).toBeGreaterThan(0);
    expect(FREE_ACTIONS_VS_ACTIONS_APPLICABILITY.modes.length).toBeGreaterThan(0);
    expect(MOVEMENT_PLUS_ACTION_APPLICABILITY.modes.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TYPE GUARDS
// ============================================================================

describe('Action Economy - Type Guards', () => {
  it('isMultipleActionsPayload validates correctly', () => {
    expect(isMultipleActionsPayload({
      characterId: 'char_001',
      declaredActions: ['attack', 'reload'],
    })).toBe(true);

    expect(isMultipleActionsPayload(null)).toBe(false);
    expect(isMultipleActionsPayload({})).toBe(false);
    expect(isMultipleActionsPayload({ characterId: 'x' })).toBe(false);
  });

  it('isFreeActionsVsActionsPayload validates correctly', () => {
    expect(isFreeActionsVsActionsPayload({
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredFreeAction: 'speak',
    })).toBe(true);

    expect(isFreeActionsVsActionsPayload(null)).toBe(false);
    expect(isFreeActionsVsActionsPayload({})).toBe(false);
  });

  it('isMovementPlusActionPayload validates correctly', () => {
    expect(isMovementPlusActionPayload({
      characterId: 'char_001',
      movementDeclared: true,
      declaredAction: 'attack',
    })).toBe(true);

    expect(isMovementPlusActionPayload(null)).toBe(false);
    expect(isMovementPlusActionPayload({ characterId: 'x' })).toBe(false);
  });
});

// ============================================================================
// CRITICAL: EFFECTS DESPITE AMBIGUITY
// ============================================================================

describe('Action Economy - Effects Despite Ambiguity', () => {
  it('multiple actions emit effects for each declared action', () => {
    const effects = createMultipleActionsEffects(
      'char_001',
      ['attack', 'reload', 'aim'],
      'inv_test'
    );

    expect(effects.length).toBe(3);
    effects.forEach((effect, index) => {
      expect(effect.parameters.actionIndex).toBe(index);
      expect(effect.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });
  });

  it('movement + action emit effects for both', () => {
    const effects = createMovementPlusActionEffects(
      'char_001',
      true,
      'advance',
      'attack',
      'inv_test'
    );

    expect(effects.length).toBe(2);

    const movementEffect = effects.find((e) => e.effectType === 'CHANGE_POSITION');
    const actionEffect = effects.find((e) => e.effectType === 'TRIGGER_NARRATIVE');

    expect(movementEffect?.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(actionEffect?.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
  });
});
