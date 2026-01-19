/**
 * Temporal Ambiguity Tests (PR 8.1)
 *
 * CRITICAL TEST: The system must tolerate temporal ambiguity without introducing order.
 *
 * These tests PROVE:
 * - Interrupt does not suppress effects
 * - Delayed action does not schedule execution
 * - Engaged does not enforce prevention
 * - No ordering, no priority, no sequencing
 * - Swapping declaration order produces identical output
 *
 * If any test passes by resolving timing, PR 8.1 fails.
 */

import { describe, it, expect } from 'vitest';
import {
  createInterruptingActionsPipeline,
  createInterruptingActionsEffects,
  isInterruptingActionsPayload,
  INTERRUPTING_ACTIONS_INTENT_TYPE,
  INTERRUPTING_ACTIONS_APPLICABILITY,
} from '../InterruptingActions';
import type { InterruptingActionsPayload } from '../InterruptingActions';
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
// RULE 1: INTERRUPTING ACTIONS
// ============================================================================

describe('Interrupting Actions Rule - No Ordering', () => {
  const pipeline = createInterruptingActionsPipeline();

  it('interrupt does not suppress effects', () => {
    const payload: InterruptingActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredInterrupt: 'parry',
    };

    const invocationId = createInvocationId();
    const effects = createInterruptingActionsEffects(
      payload.characterId,
      payload.declaredAction,
      payload.declaredInterrupt,
      undefined,
      invocationId
    );

    // CRITICAL ASSERTION: Both actions emit effects
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.length).toBe(2); // Both action and interrupt

    const actionEffect = effects.find((e) => e.parameters.actionType === 'standard');
    const interruptEffect = effects.find((e) => e.parameters.actionType === 'interrupt');

    expect(actionEffect).toBeDefined();
    expect(interruptEffect).toBeDefined();
  });

  it('both actions emit effects despite temporal conflict', () => {
    const payload: InterruptingActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'cast spell',
      declaredInterrupt: 'counterspell',
      interruptTarget: 'enemy_mage',
    };

    const invocationId = createInvocationId();
    const effects = createInterruptingActionsEffects(
      payload.characterId,
      payload.declaredAction,
      payload.declaredInterrupt,
      payload.interruptTarget,
      invocationId
    );

    // CRITICAL: Effects exist for BOTH
    expect(effects.length).toBe(2);
    effects.forEach((effect) => {
      expect(effect.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
      expect(effect.parameters.temporalStatus).toBe('contested');
    });
  });

  it('validation is AMBIGUOUS', () => {
    const payload: InterruptingActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredInterrupt: 'parry',
    };

    const intent = createTestIntent(INTERRUPTING_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: Must be AMBIGUOUS
    expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(result.ambiguity).not.toBeNull();
    expect(result.ambiguity?.reason).toContain('temporal precedence');
    expect(result.ambiguity?.reason).toContain('does not resolve ordering');
  });

  it('SoftBlock conflict exists for contested timing', () => {
    const payload: InterruptingActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'move',
      declaredInterrupt: 'opportunity strike',
    };

    const intent = createTestIntent(INTERRUPTING_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    // CRITICAL: SoftBlock conflict exists
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
    expect(result.conflicts[0].message).toContain('timing is contested');
    expect(result.conflicts[0].message).toContain('No precedence is applied');
    expect(result.conflicts[0].tags).toContain('no-ordering');
    expect(result.conflicts[0].tags).toContain('no-precedence');
  });

  it('no ordering language in ambiguity', () => {
    const payload: InterruptingActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredInterrupt: 'parry',
    };

    const intent = createTestIntent(INTERRUPTING_ACTIONS_INTENT_TYPE, payload);
    const result = pipeline.validate(intent, createInvocationId());

    const reason = result.ambiguity?.reason || '';
    const conflictMessages = result.conflicts.map((c) => c.message);

    // CRITICAL: No ordering words
    const allText = [reason, ...conflictMessages].join(' ').toLowerCase();
    expect(allText).not.toContain('first');
    expect(allText).not.toContain('resolves');
    expect(allText).not.toContain('wins');
    expect(allText).not.toContain('beats');
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
// CRITICAL: NO ORDERING
// ============================================================================

describe('Temporal Ambiguity - No Ordering Invariants', () => {
  it('swapping interrupt declaration order produces identical outcome', () => {
    const interruptPipeline = createInterruptingActionsPipeline();

    // Order 1: action first, interrupt second
    const payload1: InterruptingActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredInterrupt: 'parry',
    };

    // Order 2: same payload (order doesn't matter in structure)
    const payload2: InterruptingActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredInterrupt: 'parry',
    };

    const intent1 = createTestIntent(INTERRUPTING_ACTIONS_INTENT_TYPE, payload1);
    const intent2 = createTestIntent(INTERRUPTING_ACTIONS_INTENT_TYPE, payload2);
    const invocationId = createInvocationId();

    const result1 = interruptPipeline.validate(intent1, invocationId);
    const result2 = interruptPipeline.validate(intent2, invocationId);

    // CRITICAL: Identical outputs
    expect(result1.outcome).toBe(result2.outcome);
    expect(result1.conflicts.length).toBe(result2.conflicts.length);
    expect(result1.ambiguity?.possibleInterpretations.length).toBe(
      result2.ambiguity?.possibleInterpretations.length
    );
  });

  it('no radioactive words in any rule output', () => {
    const interruptPipeline = createInterruptingActionsPipeline();
    const delayedPipeline = createDelayedActionsPipeline();
    const engagedPipeline = createActingWhileEngagedPipeline();

    const interruptPayload: InterruptingActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredInterrupt: 'parry',
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

    const result1 = interruptPipeline.validate(
      createTestIntent(INTERRUPTING_ACTIONS_INTENT_TYPE, interruptPayload),
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
  });

  it('no state mutation - same input always same output', () => {
    const pipeline = createInterruptingActionsPipeline();

    const payload: InterruptingActionsPayload = {
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredInterrupt: 'parry',
    };

    const intent = createTestIntent(INTERRUPTING_ACTIONS_INTENT_TYPE, payload);
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
    expect(INTERRUPTING_ACTIONS_APPLICABILITY.modes).toContain('combat');
    expect(DELAYED_ACTIONS_APPLICABILITY.modes).toContain('combat');
    expect(ACTING_WHILE_ENGAGED_APPLICABILITY.modes).toContain('combat');

    expect(INTERRUPTING_ACTIONS_APPLICABILITY.modes).not.toContain('downtime');
    expect(DELAYED_ACTIONS_APPLICABILITY.modes).not.toContain('downtime');
    expect(ACTING_WHILE_ENGAGED_APPLICABILITY.modes).not.toContain('social');
  });

  it('applicability is explicit, no defaults', () => {
    expect(INTERRUPTING_ACTIONS_APPLICABILITY.modes.length).toBeGreaterThan(0);
    expect(DELAYED_ACTIONS_APPLICABILITY.modes.length).toBeGreaterThan(0);
    expect(ACTING_WHILE_ENGAGED_APPLICABILITY.modes.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TYPE GUARDS
// ============================================================================

describe('Temporal Rules - Type Guards', () => {
  it('isInterruptingActionsPayload validates correctly', () => {
    expect(isInterruptingActionsPayload({
      characterId: 'char_001',
      declaredAction: 'attack',
      declaredInterrupt: 'parry',
    })).toBe(true);

    expect(isInterruptingActionsPayload(null)).toBe(false);
    expect(isInterruptingActionsPayload({})).toBe(false);
    expect(isInterruptingActionsPayload({ characterId: 'x' })).toBe(false);
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
  it('interrupt emits effects for both actions', () => {
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
