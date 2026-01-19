/**
 * Temporal Ambiguity Tests (PR 8.1, PATCH)
 *
 * CRITICAL TEST: The system must tolerate temporal ambiguity without introducing order.
 *
 * These tests PROVE:
 * - Contested actions are treated symmetrically (no primary/secondary)
 * - Swapping action order produces identical output
 * - Delayed action does not schedule execution
 * - Engaged does not enforce prevention
 * - No ordering, no priority, no sequencing
 *
 * If any test passes by resolving timing, PR 8.1 fails.
 */

import { describe, it, expect } from 'vitest';
import {
  createContestedActionTimingPipeline,
  createContestedActionTimingEffects,
  createInterruptingActionsPipeline,
  createInterruptingActionsEffects,
  isContestedActionTimingPayload,
  isInterruptingActionsPayload,
  CONTESTED_ACTION_TIMING_INTENT_TYPE,
  INTERRUPTING_ACTIONS_INTENT_TYPE,
  CONTESTED_ACTION_TIMING_APPLICABILITY,
  INTERRUPTING_ACTIONS_APPLICABILITY,
} from '../ContestedActionTiming';
import type { ContestedActionTimingPayload, InterruptingActionsPayload } from '../ContestedActionTiming';
import {
  createDelayedActionsPipeline,
  createDelayedActionsEffects,
  isDelayedActionsPayload,
  DELAYED_ACTIONS_INTENT_TYPE,
  DELAYED_ACTIONS_APPLICABILITY,
} from '../DelayedActions';
import type { DelayedActionsPayload } from '../DelayedActions';
import {
  createActingWhileEngagedPipeline,
  createActingWhileEngagedEffects,
  isActingWhileEngagedPayload,
  ACTING_WHILE_ENGAGED_INTENT_TYPE,
  ACTING_WHILE_ENGAGED_APPLICABILITY,
} from '../ActingWhileEngaged';
import type { ActingWhileEngagedPayload } from '../ActingWhileEngaged';
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
// RULE 1: CONTESTED ACTION TIMING (SYMMETRIC)
// ============================================================================

describe('Contested Action Timing Rule - Symmetric, No Ordering', () => {
  const pipeline = createContestedActionTimingPipeline();

  it('treats contested actions as symmetric temporal ambiguity', () => {
    // Order A: attack first, parry second
    const payloadA: ContestedActionTimingPayload = {
      characterId: 'char_001',
      actionA: 'attack',
      actionB: 'parry',
    };

    // Order B: parry first, attack second
    const payloadB: ContestedActionTimingPayload = {
      characterId: 'char_001',
      actionA: 'parry',
      actionB: 'attack',
    };

    const intentA = createTestIntent(CONTESTED_ACTION_TIMING_INTENT_TYPE, payloadA);
    const intentB = createTestIntent(CONTESTED_ACTION_TIMING_INTENT_TYPE, payloadB);
    const invocationId = createInvocationId();

    const resultA = pipeline.validate(intentA, invocationId);
    const resultB = pipeline.validate(intentB, invocationId);

    // CRITICAL: Swapping order produces identical outcome
    expect(resultA.outcome).toBe(resultB.outcome);
    expect(resultA.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(resultA.conflicts.length).toBe(resultB.conflicts.length);
    expect(resultA.ambiguity?.possibleInterpretations.length).toBe(
      resultB.ambiguity?.possibleInterpretations.length
    );
  });

  it('both actions emit effects without suppression', () => {
    const payload: ContestedActionTimingPayload = {
      characterId: 'char_001',
      actionA: 'attack',
      actionB: 'parry',
    };

    const invocationId = createInvocationId();
    const effects = createContestedActionTimingEffects(
      payload.characterId,
      payload.actionA,
      payload.actionB,
      invocationId
    );

    // CRITICAL ASSERTION: Both actions emit effects
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.length).toBe(2);

    // Both effects are symmetric - same actionType
    effects.forEach((effect) => {
      expect(effect.parameters.actionType).toBe('contested');
      expect(effect.parameters.temporalStatus).toBe('unresolved');
      expect(effect.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });
  });

  it('neither action is marked as primary', () => {
    const payload: ContestedActionTimingPayload = {
      characterId: 'char_001',
      actionA: 'cast spell',
      actionB: 'counterspell',
    };

    const invocationId = createInvocationId();
    const effects = createContestedActionTimingEffects(
      payload.characterId,
      payload.actionA,
      payload.actionB,
      invocationId
    );

    // CRITICAL: No effect is marked as primary or secondary
    effects.forEach((effect) => {
      expect(effect.parameters).not.toHaveProperty('primary');
      expect(effect.parameters).not.toHaveProperty('secondary');
      expect(effect.parameters).not.toHaveProperty('target');
      expect(effect.parameters.narrativeType).toBe('contested_action_attempt');
    });
  });

  it('validation is AMBIGUOUS', () => {
    const payload: ContestedActionTimingPayload = {
      characterId: 'char_001',
      actionA: 'attack',
      actionB: 'parry',
    };

    const intent = createTestIntent(CONTESTED_ACTION_TIMING_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Must be AMBIGUOUS
    expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(result.ambiguity).not.toBeNull();
    expect(result.ambiguity?.reason).toContain('temporal precedence');
    expect(result.ambiguity?.reason).toContain('Neither action is primary');
    expect(result.ambiguity?.reason).toContain('does not resolve ordering');
  });

  it('SoftBlock conflict exists with symmetric language', () => {
    const payload: ContestedActionTimingPayload = {
      characterId: 'char_001',
      actionA: 'move',
      actionB: 'opportunity strike',
    };

    const intent = createTestIntent(CONTESTED_ACTION_TIMING_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: SoftBlock conflict exists with symmetric language
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
    expect(result.conflicts[0].message).toContain('Contested action timing');
    expect(result.conflicts[0].message).toContain('Neither action is primary');
    expect(result.conflicts[0].tags).toContain('symmetric');
    expect(result.conflicts[0].tags).toContain('no-ordering');
    expect(result.conflicts[0].tags).toContain('no-precedence');
  });

  it('no directional language in any output', () => {
    const payload: ContestedActionTimingPayload = {
      characterId: 'char_001',
      actionA: 'attack',
      actionB: 'parry',
    };

    const intent = createTestIntent(CONTESTED_ACTION_TIMING_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    const reason = result.ambiguity?.reason || '';
    const conflictMessages = result.conflicts.map((c) => c.message);

    // CRITICAL: No directional words
    const allText = [reason, ...conflictMessages].join(' ').toLowerCase();
    expect(allText).not.toContain('interrupts');
    expect(allText).not.toContain('interrupted');
    expect(allText).not.toContain('target action');
    expect(allText).not.toContain('being interrupted');
    expect(allText).not.toContain('first');
    expect(allText).not.toContain('resolves');
    expect(allText).not.toContain('wins');
    expect(allText).not.toContain('beats');
  });

  it('legacy payload format works with symmetric treatment', () => {
    // Using old payload format (backward compatibility)
    const legacyPayload: InterruptingActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredInterrupt: 'parry',
    };

    const intent = createTestIntent(INTERRUPTING_ACTIONS_INTENT_TYPE, legacyPayload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Still AMBIGUOUS, still symmetric
    expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(result.conflicts[0].message).toContain('Neither action is primary');
  });
});

// ============================================================================
// RULE 2: DELAYED ACTIONS
// ============================================================================

describe('Delayed Actions Rule - No Scheduling', () => {
  const pipeline = createDelayedActionsPipeline();

  it('delayed action does not schedule execution', () => {
    const payload: DelayedActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack when opening appears',
      delayReason: 'waiting for opportunity',
    };

    const invocationId = createInvocationId();
    const effects = createDelayedActionsEffects(
      payload.characterId,
      payload.declaredAction,
      payload.delayReason,
      invocationId
    );

    // CRITICAL: Effect exists but is declarative only
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.length).toBe(1);

    const effect = effects[0];
    expect(effect.parameters.narrativeType).toBe('delayed_action_declaration');
    expect(effect.parameters.temporalStatus).toBe('undefined');

    // No scheduling fields
    expect(effect.parameters).not.toHaveProperty('scheduledTurn');
    expect(effect.parameters).not.toHaveProperty('trigger');
    expect(effect.parameters).not.toHaveProperty('executeAt');
  });

  it('no future state in effect', () => {
    const payload: DelayedActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'hold attack',
    };

    const invocationId = createInvocationId();
    const effects = createDelayedActionsEffects(
      payload.characterId,
      payload.declaredAction,
      undefined,
      invocationId
    );

    // CRITICAL: Effect is declarative, not scheduling
    const effect = effects[0];
    expect(effect.description).toContain('declares delayed action');
    expect(effect.description).toContain('timing undefined');
    expect(effect.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
  });

  it('effect is declarative only', () => {
    const payload: DelayedActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'ready action',
      delayReason: 'held until signal',
    };

    const intent = createTestIntent(DELAYED_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Validation is AMBIGUOUS
    expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(result.ambiguity?.reason).toContain('does not model future execution');
  });

  it('no follow-up behavior', () => {
    const payload: DelayedActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'held spell',
    };

    const intent = createTestIntent(DELAYED_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: SoftBlock conflict exists
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
    expect(result.conflicts[0].message).toContain('timing is undefined');
    expect(result.conflicts[0].message).toContain('No scheduling');
    expect(result.conflicts[0].tags).toContain('no-scheduling');
    expect(result.conflicts[0].tags).toContain('no-reservation');
  });

  it('cost does not imply reservation', () => {
    const payload: DelayedActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'delayed fireball',
    };

    const intent = createTestIntent(DELAYED_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Cost is AMBIGUOUS, not reserved
    expect(result.costValidation).toBeDefined();
    expect(result.costValidation?.outcome).toBe(CostValidationOutcome.AMBIGUOUS);
    expect(result.costValidation?.reason).toContain('does not model future execution');
    expect(result.costValidation?.cost.tags).toContain('temporal-undefined');
  });
});

// ============================================================================
// RULE 3: ACTING WHILE ENGAGED
// ============================================================================

describe('Acting While Engaged Rule - No Prevention', () => {
  const pipeline = createActingWhileEngagedPipeline();

  it('engaged does not enforce prevention', () => {
    const payload: ActingWhileEngagedPayload = {
      characterId: 'char_001',
      declaredAction: 'cast spell',
      engagementStatus: 'engaged',
      engagedBy: 'orc_warrior',
    };

    const invocationId = createInvocationId();
    const effects = createActingWhileEngagedEffects(
      payload.characterId,
      payload.declaredAction,
      payload.engagementStatus,
      payload.engagedBy,
      invocationId
    );

    // CRITICAL ASSERTION: Action effects still emitted
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.length).toBe(1);

    const effect = effects[0];
    expect(effect.parameters.actionLabel).toBe('cast spell');
    expect(effect.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
  });

  it('action effects still emitted while threatened', () => {
    const payload: ActingWhileEngagedPayload = {
      characterId: 'char_001',
      declaredAction: 'ranged attack',
      engagementStatus: 'threatened',
    };

    const invocationId = createInvocationId();
    const effects = createActingWhileEngagedEffects(
      payload.characterId,
      payload.declaredAction,
      payload.engagementStatus,
      undefined,
      invocationId
    );

    // CRITICAL: Effect exists
    expect(effects.length).toBe(1);
    expect(effects[0].description).toContain('attempts action while threatened');
  });

  it('ambiguity explicitly present', () => {
    const payload: ActingWhileEngagedPayload = {
      characterId: 'char_001',
      declaredAction: 'disengage',
      engagementStatus: 'engaged',
    };

    const intent = createTestIntent(ACTING_WHILE_ENGAGED_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Must be AMBIGUOUS
    expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(result.ambiguity).not.toBeNull();
    expect(result.ambiguity?.reason).toContain('contested timing');
    expect(result.ambiguity?.reason).toContain('does not determine interruption or prevention');
  });

  it('no opportunity attack triggered', () => {
    const payload: ActingWhileEngagedPayload = {
      characterId: 'char_001',
      declaredAction: 'move away',
      engagementStatus: 'engaged',
      engagedBy: 'guard',
    };

    const intent = createTestIntent(ACTING_WHILE_ENGAGED_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: No opportunity attack in conflicts
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
    expect(result.conflicts[0].tags).toContain('no-opportunity-attack');
    expect(result.conflicts[0].message).not.toContain('opportunity attack');
    expect(result.conflicts[0].message).not.toContain('triggers');
  });
});

// ============================================================================
// CRITICAL: NO ORDERING, SYMMETRIC TREATMENT
// ============================================================================

describe('Temporal Ambiguity - No Ordering Invariants', () => {
  it('swapping action order produces identical outcome (symmetry proof)', () => {
    const pipeline = createContestedActionTimingPipeline();

    // Order 1: attack, parry
    const payload1: ContestedActionTimingPayload = {
      characterId: 'char_001',
      actionA: 'attack',
      actionB: 'parry',
    };

    // Order 2: parry, attack (swapped)
    const payload2: ContestedActionTimingPayload = {
      characterId: 'char_001',
      actionA: 'parry',
      actionB: 'attack',
    };

    const invocationId = createInvocationId();

    const result1 = pipeline.validate(
      createTestIntent(CONTESTED_ACTION_TIMING_INTENT_TYPE, payload1),
      invocationId
    );
    const result2 = pipeline.validate(
      createTestIntent(CONTESTED_ACTION_TIMING_INTENT_TYPE, payload2),
      invocationId
    );

    // CRITICAL: Identical outcomes regardless of declaration order
    expect(result1.outcome).toBe(result2.outcome);
    expect(result1.violations.length).toBe(result2.violations.length);
    expect(result1.conflicts.length).toBe(result2.conflicts.length);
    expect(result1.ambiguity?.possibleInterpretations.length).toBe(
      result2.ambiguity?.possibleInterpretations.length
    );
  });

  it('no radioactive words in any rule output', () => {
    const contestedPipeline = createContestedActionTimingPipeline();
    const delayedPipeline = createDelayedActionsPipeline();
    const engagedPipeline = createActingWhileEngagedPipeline();

    const contestedPayload: ContestedActionTimingPayload = {
      characterId: 'char_001',
      actionA: 'attack',
      actionB: 'parry',
    };

    const delayedPayload: DelayedActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'hold',
    };

    const engagedPayload: ActingWhileEngagedPayload = {
      characterId: 'char_001',
      declaredAction: 'flee',
      engagementStatus: 'engaged',
    };

    const invocationId = createInvocationId();

    const result1 = contestedPipeline.validate(
      createTestIntent(CONTESTED_ACTION_TIMING_INTENT_TYPE, contestedPayload),
      invocationId
    );
    const result2 = delayedPipeline.validate(
      createTestIntent(DELAYED_ACTIONS_INTENT_TYPE, delayedPayload),
      invocationId
    );
    const result3 = engagedPipeline.validate(
      createTestIntent(ACTING_WHILE_ENGAGED_INTENT_TYPE, engagedPayload),
      invocationId
    );

    const allText = [
      result1.ambiguity?.reason || '',
      ...result1.conflicts.map((c) => c.message),
      result2.ambiguity?.reason || '',
      ...result2.conflicts.map((c) => c.message),
      result3.ambiguity?.reason || '',
      ...result3.conflicts.map((c) => c.message),
    ].join(' ').toLowerCase();

    // CRITICAL: No radioactive words
    expect(allText).not.toContain('resolves first');
    expect(allText).not.toContain('cancels');
    expect(allText).not.toContain('event queue');
    expect(allText).not.toContain('priority');
    expect(allText).not.toContain('timestamp');
    expect(allText).not.toContain('turn counter');
    expect(allText).not.toContain('interrupts');
    expect(allText).not.toContain('interrupted');
  });

  it('no state mutation - same input always same output', () => {
    const pipeline = createContestedActionTimingPipeline();

    const payload: ContestedActionTimingPayload = {
      characterId: 'char_001',
      actionA: 'attack',
      actionB: 'parry',
    };

    const intent = createTestIntent(CONTESTED_ACTION_TIMING_INTENT_TYPE, payload);
    const invocationId = createInvocationId();

    // Run 100 times
    const results: RulesOutcome[] = [];
    for (let i = 0; i < 100; i++) {
      const result = pipeline.validate(intent, invocationId);
      results.push(result.outcome);
    }

    // CRITICAL: All results identical - no state changes
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe(RulesOutcome.AMBIGUOUS);
  });
});

// ============================================================================
// APPLICABILITY
// ============================================================================

describe('Temporal Rules - Applicability', () => {
  it('all rules apply only in combat mode', () => {
    expect(CONTESTED_ACTION_TIMING_APPLICABILITY.modes).toContain('combat');
    expect(DELAYED_ACTIONS_APPLICABILITY.modes).toContain('combat');
    expect(ACTING_WHILE_ENGAGED_APPLICABILITY.modes).toContain('combat');

    expect(CONTESTED_ACTION_TIMING_APPLICABILITY.modes).not.toContain('downtime');
    expect(DELAYED_ACTIONS_APPLICABILITY.modes).not.toContain('downtime');
    expect(ACTING_WHILE_ENGAGED_APPLICABILITY.modes).not.toContain('social');
  });

  it('applicability is explicit, no defaults', () => {
    expect(CONTESTED_ACTION_TIMING_APPLICABILITY.modes.length).toBeGreaterThan(0);
    expect(DELAYED_ACTIONS_APPLICABILITY.modes.length).toBeGreaterThan(0);
    expect(ACTING_WHILE_ENGAGED_APPLICABILITY.modes.length).toBeGreaterThan(0);
  });

  it('backward compatibility applicability aliases work', () => {
    expect(INTERRUPTING_ACTIONS_APPLICABILITY).toBe(CONTESTED_ACTION_TIMING_APPLICABILITY);
  });
});

// ============================================================================
// TYPE GUARDS
// ============================================================================

describe('Temporal Rules - Type Guards', () => {
  it('isContestedActionTimingPayload validates correctly', () => {
    expect(isContestedActionTimingPayload({
      characterId: 'char_001',
      actionA: 'attack',
      actionB: 'parry',
    })).toBe(true);

    expect(isContestedActionTimingPayload(null)).toBe(false);
    expect(isContestedActionTimingPayload({})).toBe(false);
    expect(isContestedActionTimingPayload({ characterId: 'x' })).toBe(false);
  });

  it('isInterruptingActionsPayload (legacy) validates correctly', () => {
    expect(isInterruptingActionsPayload({
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredInterrupt: 'parry',
    })).toBe(true);

    expect(isInterruptingActionsPayload(null)).toBe(false);
    expect(isInterruptingActionsPayload({})).toBe(false);
  });

  it('isDelayedActionsPayload validates correctly', () => {
    expect(isDelayedActionsPayload({
      characterId: 'char_001',
      declaredAction: 'hold',
    })).toBe(true);

    expect(isDelayedActionsPayload(null)).toBe(false);
    expect(isDelayedActionsPayload({})).toBe(false);
  });

  it('isActingWhileEngagedPayload validates correctly', () => {
    expect(isActingWhileEngagedPayload({
      characterId: 'char_001',
      declaredAction: 'attack',
      engagementStatus: 'engaged',
    })).toBe(true);

    expect(isActingWhileEngagedPayload({
      characterId: 'char_001',
      declaredAction: 'attack',
      engagementStatus: 'threatened',
    })).toBe(true);

    expect(isActingWhileEngagedPayload(null)).toBe(false);
    expect(isActingWhileEngagedPayload({
      characterId: 'char_001',
      declaredAction: 'attack',
      engagementStatus: 'invalid',
    })).toBe(false);
  });
});

// ============================================================================
// EFFECTS DESPITE AMBIGUITY
// ============================================================================

describe('Temporal Rules - Effects Despite Ambiguity', () => {
  it('contested actions emit symmetric effects', () => {
    const effects = createContestedActionTimingEffects(
      'char_001',
      'attack',
      'parry',
      'inv_test'
    );

    expect(effects.length).toBe(2);
    effects.forEach((effect) => {
      expect(effect.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
      expect(effect.parameters.actionType).toBe('contested');
    });
  });

  it('legacy effect function produces symmetric effects', () => {
    const effects = createInterruptingActionsEffects(
      'char_001',
      'attack',
      'parry',
      'enemy',
      'inv_test'
    );

    expect(effects.length).toBe(2);
    effects.forEach((effect) => {
      expect(effect.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
      expect(effect.parameters.actionType).toBe('contested');
    });
  });

  it('delayed action emits declarative effect', () => {
    const effects = createDelayedActionsEffects(
      'char_001',
      'hold',
      'waiting',
      'inv_test'
    );

    expect(effects.length).toBe(1);
    expect(effects[0].authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(effects[0].parameters.actionType).toBe('delayed');
  });

  it('engaged action emits effect normally', () => {
    const effects = createActingWhileEngagedEffects(
      'char_001',
      'attack',
      'engaged',
      'enemy',
      'inv_test'
    );

    expect(effects.length).toBe(1);
    expect(effects[0].authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(effects[0].parameters.engagementStatus).toBe('engaged');
  });
});
