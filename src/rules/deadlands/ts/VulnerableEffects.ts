/**
 * Vulnerable Effects Rule (PR 8.4)
 *
 * CRITICAL INVARIANT: Volume must not create precedence.
 *
 * This rule validates intents where an actor marked Vulnerable declares
 * any action. Vulnerability is noted but does NOT resolve into penalties,
 * enforcement, or state mutation.
 *
 * CRITICAL: Conditions are facts, not transitions.
 * - Vulnerability increases exposure
 * - The system does NOT adjudicate consequence
 * - The system does NOT enforce outcomes
 * - The system does NOT mutate state
 *
 * WHAT THIS RULE DOES:
 * - Detects when a Vulnerable actor declares an action
 * - Emits AMBIGUOUS (vulnerability increases exposure)
 * - Emits ActionCostEffect
 * - Emits SoftBlock conflict (exposure risk)
 * - Emits action effects AND vulnerability context effect
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Adjudicate consequence
 * - Apply penalties
 * - Enforce outcomes
 * - Mutate state
 * - Clear conditions
 *
 * This rule operates independently. It does not coordinate with other rules.
 */

import type { ValidatedIntent } from '../../../intent/bridge/ts/ValidatedIntent';
import type { IntentType } from '../../../intent/bridge/ts/ValidatedIntent';
import type {
  InvocationId,
  RulesPipeline,
  RulesetId,
  RuleViolation,
  ValidationReport,
  Conflict,
  RulesAmbiguity,
} from '../../../intent/bridge/ts/RulesPipeline';
import { RulesOutcome, ConflictKind } from '../../../intent/bridge/ts/RulesPipeline';
import type { CostValidationResult, ActionCostEffect, Effect } from '../../../resolution/ts/types';
import { CostValidationOutcome, EffectType } from '../../../resolution/ts/types';
import type { RuleApplicability } from '../../applicability/ts/types';
import { createRuleApplicability } from '../../applicability/ts/types';

// ============================================================================
// INTENT PAYLOAD TYPES
// ============================================================================

/**
 * Payload for vulnerable effects intent
 *
 * CRITICAL: The payload notes vulnerability as context.
 * Vulnerability is a FACT, not a transition.
 */
export type VulnerableEffectsPayload = {
  /** ID of the vulnerable character */
  readonly characterId: string;

  /**
   * The action being declared
   */
  readonly declaredAction: string;

  /**
   * Confirmation that actor is Vulnerable
   *
   * CRITICAL: This is CONTEXT, not enforcement.
   * The system does NOT adjudicate consequence.
   */
  readonly isVulnerable: true;

  /**
   * Optional description of vulnerability source
   */
  readonly vulnerabilitySource?: string;
};

/**
 * Type guard for VulnerableEffectsPayload
 */
export function isVulnerableEffectsPayload(
  payload: unknown
): payload is VulnerableEffectsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.declaredAction === 'string' &&
    p.isVulnerable === true
  );
}

// ============================================================================
// COST DECLARATIONS
// ============================================================================

/**
 * Create cost validation for action while vulnerable
 *
 * CRITICAL: Cost is emitted. No modification due to vulnerability.
 * The system does NOT adjudicate consequence.
 */
function createCostValidation(
  declaredAction: string
): CostValidationResult {
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Action while vulnerable: ${declaredAction}`,
    tags: ['action', 'vulnerable', 'condition'],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Vulnerability increases exposure - system does not adjudicate consequence',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for vulnerable action
 *
 * CRITICAL: Conflict describes exposure risk.
 * It does NOT adjudicate consequence. It does NOT enforce outcomes.
 */
function createVulnerableConflict(
  declaredAction: string,
  vulnerabilitySource: string | undefined
): Conflict {
  const sourceSuffix = vulnerabilitySource ? ` (source: ${vulnerabilitySource})` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_CONDITION_002',
    message: `Action while Vulnerable: ${declaredAction}${sourceSuffix}. ` +
      'Vulnerability increases exposure. ' +
      'The system does not adjudicate consequence.',
    tags: ['condition', 'vulnerable', 'exposure-risk', 'no-adjudication'],
  };
}

// ============================================================================
// EFFECT EMISSION
// ============================================================================

/**
 * Create effects for action while vulnerable
 *
 * CRITICAL INVARIANT: Effects are emitted.
 * Action effects AND vulnerability context effect.
 */
export function createVulnerableEffectsEffects(
  characterId: string,
  declaredAction: string,
  vulnerabilitySource: string | undefined,
  invocationId: string
): Effect[] {
  const effects: Effect[] = [];

  // Effect for the action attempt
  effects.push({
    effectId: `${invocationId}_action`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId: characterId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome: RulesOutcome.AMBIGUOUS,
    },
    parameters: {
      actionLabel: declaredAction,
      narrativeType: 'action_attempt',
      attemptRecorded: true,
      conditionPresent: 'vulnerable',
    },
    description: `Character attempts action while vulnerable: ${declaredAction}`,
  });

  // Effect noting vulnerability context
  effects.push({
    effectId: `${invocationId}_vulnerability_context`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId: characterId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome: RulesOutcome.AMBIGUOUS,
    },
    parameters: {
      narrativeType: 'condition_context',
      condition: 'vulnerable',
      vulnerabilitySource: vulnerabilitySource || 'unspecified',
      consequenceAdjudicated: false,
      stateModified: false,
    },
    description: 'Vulnerability context noted - no consequence adjudicated',
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate vulnerable effects intent
 *
 * CRITICAL: Emits AMBIGUOUS. Does NOT adjudicate consequence.
 * Vulnerability is a fact, not a transition.
 */
function validateVulnerableEffects(
  payload: VulnerableEffectsPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { declaredAction, vulnerabilitySource } = payload;

  const ambiguity: RulesAmbiguity = {
    reason: 'Vulnerability increases exposure. ' +
      'The system does not adjudicate consequence.',
    possibleInterpretations: [
      {
        code: 'VULNERABILITY_IRRELEVANT',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Vulnerability does not affect this action (GM decision)',
      },
      {
        code: 'VULNERABILITY_EXPLOITED',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Vulnerability is exploited (GM decision)',
      },
      {
        code: 'VULNERABILITY_PARTIAL',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Vulnerability has partial effect (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createVulnerableConflict(declaredAction, vulnerabilitySource),
  ];

  const costValidation = createCostValidation(declaredAction);

  return {
    outcome: RulesOutcome.AMBIGUOUS,
    violations: [],
    ambiguity,
    conflicts,
    costValidation,
  };
}

// ============================================================================
// RULE APPLICABILITY (PR 6.1)
// ============================================================================

/**
 * Applicability for Vulnerable Effects rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const VULNERABLE_EFFECTS_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['condition', 'vulnerable', 'exposure']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const VULNERABLE_EFFECTS_INTENT_TYPE = 'VULNERABLE_EFFECTS' as IntentType;

/**
 * Create the Vulnerable Effects rules pipeline
 *
 * CRITICAL: Volume must not create precedence.
 * Conditions are facts, not transitions.
 */
export function createVulnerableEffectsPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [VULNERABLE_EFFECTS_INTENT_TYPE],
    applicability: VULNERABLE_EFFECTS_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isVulnerableEffectsPayload(payload)) {
        return {
          invocationId,
          sourceIntentId: intent.intentId,
          intentType: intent.intentType,
          rulesetId: DEADLANDS_CORE_RULESET_ID,
          outcome: RulesOutcome.PASS,
          violations: [],
          ambiguity: null,
          payload: intent.payload,
          conflicts: [],
        };
      }

      const result = validateVulnerableEffects(payload, invocationId);

      return {
        invocationId,
        sourceIntentId: intent.intentId,
        intentType: intent.intentType,
        rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: result.outcome,
        violations: result.violations,
        ambiguity: result.ambiguity,
        payload: intent.payload,
        costValidation: result.costValidation,
        conflicts: result.conflicts,
      };
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { RulesOutcome, ConflictKind };
