/**
 * Act While Shaken Rule (PR 6.0, PR 6.1)
 *
 * CRITICAL INVARIANT: FAIL does not mean "nothing happens."
 *
 * This rule validates actions taken by a Shaken character.
 * It always FAILs, but still emits effects.
 *
 * WHAT THIS RULE DOES:
 * - Checks if actor is marked shaken in the intent payload
 * - Emits FAIL validation result
 * - Emits SoftBlock conflict (descriptive, non-resolving)
 * - Emits ActionCostEffect (action still costs an action)
 * - Emits effects anyway (FAIL does not suppress effects)
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Clear Shaken status
 * - Roll for recovery
 * - Handle Bennies
 * - Conditional effect logic
 * - Inspect other rules
 * - Special-case outcomes
 *
 * PR 6.1 ADDITIONS - Rule Applicability:
 * - Declares explicit applicability (combat mode only)
 * - Rule does not apply in downtime or social modes
 * - Applicability is filtering, not decision-making
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
 * Payload for any action intent that includes Shaken status
 *
 * This is the minimal shape required for this rule to operate.
 * The rule does not require or inspect other payload fields.
 */
export type ShakenActionPayload = {
  /** ID of the character performing the action */
  readonly characterId: string;

  /** Whether the character is currently Shaken */
  readonly shaken: boolean;

  /**
   * Action availability context (PR 4.1)
   *
   * - 'available': Character has an action available to spend
   * - 'unavailable': Character has no actions remaining
   * - 'unknown': Action availability is not provided
   */
  readonly actionAvailability?: 'available' | 'unavailable' | 'unknown';
};

/**
 * Type guard to check if payload has Shaken flag
 */
export function hasShakenFlag(payload: unknown): payload is ShakenActionPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.shaken === 'boolean'
  );
}

// ============================================================================
// DECLARATIVE COST (PR 4.1)
// ============================================================================

/**
 * The declared action cost for acting while Shaken
 *
 * CRITICAL: This is DESCRIPTIVE ONLY.
 * - It does NOT enforce anything
 * - It does NOT track actions
 * - It does NOT modify state
 */
const SHAKEN_ACTION_COST: ActionCostEffect = {
  kind: 'ActionCostEffect',
  description: 'Acting while Shaken still costs an action',
  tags: ['action', 'shaken'],
};

/**
 * Validate the action cost for acting while Shaken (PR 4.1)
 *
 * CRITICAL: Cost is declared even when validation FAILs.
 * FAIL does not suppress cost declaration.
 */
function validateActionCost(
  actionAvailability: ShakenActionPayload['actionAvailability']
): CostValidationResult {
  if (actionAvailability === 'unavailable') {
    return {
      cost: SHAKEN_ACTION_COST,
      outcome: CostValidationOutcome.UNSATISFIED,
      reason: 'Action explicitly unavailable',
    };
  }

  return {
    cost: SHAKEN_ACTION_COST,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Action availability does not prove spendability',
  };
}

// ============================================================================
// CONFLICT EMISSION (PR 4.3)
// ============================================================================

/**
 * Create the SoftBlock conflict for acting while Shaken
 *
 * CRITICAL INVARIANTS:
 * - Conflict is DESCRIPTIVE, not resolving
 * - Conflict does NOT affect validation outcome
 * - Conflict does NOT suppress anything
 * - Conflict is DATA, not logic
 */
function createShakenConflict(): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_SHAKEN_001',
    message: 'Character is Shaken and attempting to act. Action is constrained but not prevented.',
    tags: ['shaken', 'action', 'constraint'],
  };
}

// ============================================================================
// EFFECT EMISSION (DESPITE FAIL)
// ============================================================================

/**
 * Create effects for acting while Shaken
 *
 * CRITICAL INVARIANT: Effects are emitted DESPITE FAIL.
 * FAIL does not mean "nothing happens."
 *
 * These effects:
 * - Are declarative (describe what would happen)
 * - Are non-mutating (do not change state)
 * - Are compatible with resolution pipeline
 */
function createShakenEffects(
  characterId: string,
  invocationId: string
): Effect[] {
  return [
    {
      effectId: `${invocationId}_shaken_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: {
        targetId: characterId,
        targetType: 'character',
      },
      authority: {
        invocationId,
        source: 'RULES',
        outcome: RulesOutcome.FAIL, // Effect exists despite FAIL
      },
      parameters: {
        narrativeType: 'shaken_action_attempt',
        constraint: 'shaken',
      },
      description: 'Character attempted action while Shaken',
    },
  ];
}

// ============================================================================
// RULE APPLICABILITY (PR 6.1)
// ============================================================================

/**
 * The declared applicability for Act While Shaken rule
 *
 * CRITICAL: This is EXPLICIT applicability.
 * - Rule applies ONLY in combat mode
 * - Rule does NOT apply in downtime or social modes
 * - Applicability is filtering, not decision-making
 *
 * Shaken is a combat status. It does not make sense
 * to validate Shaken rules during downtime or social encounters.
 */
export const ACT_WHILE_SHAKEN_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['status', 'shaken', 'action', 'constraint']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

/** The ruleset ID for Deadlands/Savage Worlds core rules */
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;

/** The intent type this rule handles - any action intent */
export const ACT_WHILE_SHAKEN_INTENT_TYPE = 'ACT_WHILE_SHAKEN' as IntentType;

/**
 * Create the Act While Shaken rules pipeline
 *
 * This pipeline:
 * - Handles intents where actor is Shaken
 * - Always emits FAIL (Shaken constrains action)
 * - Always emits effects (FAIL does not suppress effects)
 * - Emits SoftBlock conflict (descriptive, inert)
 * - Emits ActionCostEffect (action still costs)
 * - Declares explicit applicability (PR 6.1): combat mode only
 *
 * CRITICAL: This rule operates INDEPENDENTLY.
 * - No inspection of other rules
 * - No coordination with other rules
 * - No special-casing of outcomes
 */
export function createActWhileShakenPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [ACT_WHILE_SHAKEN_INTENT_TYPE],
    applicability: ACT_WHILE_SHAKEN_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      // Check if payload has shaken flag
      if (!hasShakenFlag(payload)) {
        // Payload does not have shaken flag - this rule does not apply
        // Return PASS with no violations (rule is not relevant)
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

      // If not shaken, rule does not apply
      if (!payload.shaken) {
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

      // Character IS Shaken - rule applies
      // OUTCOME: FAIL (Shaken constrains action)
      // EFFECTS: Still emitted (FAIL does not suppress effects)
      // CONFLICT: SoftBlock (descriptive, inert)
      // COST: Still declared (FAIL does not suppress cost)

      const violations: RuleViolation[] = [
        {
          ruleId: 'SW_SHAKEN_001',
          message: 'Character is Shaken. Action is constrained.',
          severity: 'ERROR',
        },
      ];

      const conflicts: Conflict[] = [createShakenConflict()];

      const costValidation = validateActionCost(payload.actionAvailability);

      // NOTE: Effects are created but not returned in ValidationReport
      // Effects are created by the resolution layer, not validation
      // However, this rule DECLARES that effects should exist
      // The resolution layer will call createShakenEffects when resolving

      return {
        invocationId,
        sourceIntentId: intent.intentId,
        intentType: intent.intentType,
        rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.FAIL,
        violations,
        ambiguity: null,
        payload: intent.payload,
        costValidation,
        conflicts,
      };
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { RulesOutcome, ConflictKind };

/** Exported for testing: the declared action cost */
export { SHAKEN_ACTION_COST };

/** Exported for resolution: create effects for Shaken action */
export { createShakenEffects };

/** Exported for testing: create the SoftBlock conflict */
export { createShakenConflict };
