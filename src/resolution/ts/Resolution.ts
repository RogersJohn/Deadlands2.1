/**
 * Resolution Implementation (PR 2.1)
 *
 * Core principle: Resolution describes consequences; it does not execute them.
 *
 * This module translates authoritative decisions into declarative effects.
 * Effects describe what WOULD happen, not what DOES happen.
 *
 * Invariants:
 * - No state mutation
 * - No dice rolling
 * - No Savage Worlds math
 * - No execution logic
 * - Effects are produced, never applied
 */

import {
  AuthoritativeDecision,
  Effect,
  EffectAuthority,
  ResolutionOutcome,
  ResolutionResult,
  RulesOutcome,
} from './types';

/**
 * EffectProducer - produces effects for a specific intent type
 *
 * Effect producers are registered externally.
 * Resolution invokes them but does not define them.
 *
 * The producer receives the authoritative decision and returns effects.
 * It must NOT:
 * - Mutate state
 * - Roll dice
 * - Calculate game mechanics
 * - Execute effects
 *
 * It MUST:
 * - Return immutable Effect objects
 * - Trace effects back to authority
 * - Return empty array if no effects
 */
export type EffectProducer = (
  decision: AuthoritativeDecision
) => readonly Effect[];

/**
 * EffectProducerRegistry - maps intent types to effect producers
 *
 * This is a simple registry pattern.
 * Producers are registered externally and looked up by intent type.
 */
export type EffectProducerRegistry = {
  readonly getProducer: (intentType: string) => EffectProducer | undefined;
};

/**
 * Create a simple in-memory effect producer registry
 */
export function createEffectProducerRegistry(
  producers: ReadonlyMap<string, EffectProducer>
): EffectProducerRegistry {
  return {
    getProducer: (intentType: string) => producers.get(intentType),
  };
}

/**
 * Resolve an authoritative decision into effects
 *
 * This is the core resolution function.
 *
 * Rules:
 * - PASS → effects may be produced
 * - FAIL → effects must NOT be produced
 * - AMBIGUOUS → effects must NOT be produced (unless overridden to PASS)
 * - No registered producer → no effects (not an error)
 *
 * Invariants:
 * - The decision is preserved in the result
 * - Original rule outcome is always visible
 * - Effects trace back to authority
 * - No state mutation
 * - No exceptions for control flow
 */
export function resolve(
  decision: AuthoritativeDecision,
  registry: EffectProducerRegistry
): ResolutionResult {
  const intentType = decision.originalReport.intentType;

  // Check authority outcome
  // Only PASS allows effects
  if (decision.effectiveOutcome === RulesOutcome.FAIL) {
    return {
      decision,
      outcome: ResolutionOutcome.NO_EFFECTS_FAIL,
      effects: [],
      explanation: `No effects produced: authority outcome is FAIL${
        decision.hasOverrides ? ' (override did not change to PASS)' : ''
      }`,
    };
  }

  if (decision.effectiveOutcome === RulesOutcome.AMBIGUOUS) {
    return {
      decision,
      outcome: ResolutionOutcome.NO_EFFECTS_AMBIGUOUS,
      effects: [],
      explanation: `No effects produced: authority outcome is AMBIGUOUS${
        decision.hasOverrides ? ' (override did not resolve ambiguity to PASS)' : ''
      }. GM decision required.`,
    };
  }

  // effectiveOutcome is PASS - effects may be produced

  // Look up producer
  const producer = registry.getProducer(intentType);
  if (producer === undefined) {
    return {
      decision,
      outcome: ResolutionOutcome.NO_EFFECTS_NO_PRODUCER,
      effects: [],
      explanation: `No effects produced: no effect producer registered for intent type "${intentType}"`,
    };
  }

  // Invoke producer
  const effects = producer(decision);

  return {
    decision,
    outcome: ResolutionOutcome.EFFECTS_PRODUCED,
    effects,
    explanation: `${effects.length} effect(s) produced for intent type "${intentType}"${
      decision.hasOverrides ? ' (via GM override)' : ''
    }`,
  };
}

/**
 * Create an EffectAuthority from an AuthoritativeDecision
 *
 * Helper function for effect producers.
 */
export function createEffectAuthority(
  decision: AuthoritativeDecision
): EffectAuthority {
  return {
    invocationId: decision.originalReport.invocationId,
    source: decision.hasOverrides ? 'OVERRIDE' : 'RULES',
    outcome: decision.effectiveOutcome,
  };
}

/**
 * Deterministic effect ID generation
 *
 * Algorithm: djb2 string hash
 * Input: invocationId + effectType + targetId + index
 * Output: "eff_" + 8-char hex
 *
 * Guarantees:
 * - Deterministic (same inputs → same output)
 * - No randomness
 * - No UUID libraries
 */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash >>> 0;
}

/**
 * Generate a deterministic effect ID
 *
 * Helper function for effect producers.
 */
export function generateEffectId(
  invocationId: string,
  effectType: string,
  targetId: string,
  index: number
): string {
  const hashInput = `${invocationId}:${effectType}:${targetId}:${index}`;
  const hash = djb2(hashInput);
  return `eff_${hash.toString(16).padStart(8, '0')}`;
}
