/**
 * Acting While Engaged Rule (PR 8.1)
 *
 * CRITICAL INVARIANT: The system does NOT determine prevention or interruption.
 *
 * This rule validates intents where an action is declared while the actor
 * is marked as engaged or threatened. It produces AMBIGUOUS because
 * engagement creates contested timing/pressure and the system does not
 * determine whether interference occurs.
 *
 * CRITICAL: NO PREVENTION, NO INTERRUPTION, NO OPPORTUNITY ATTACKS.
 * - The system does NOT decide if engagement prevents action
 * - The system does NOT trigger opportunity attacks
 * - The system does NOT resolve contested timing
 * - The system does NOT model threat zones
 *
 * WHAT THIS RULE DOES:
 * - Detects when action is declared while engaged/threatened
 * - Emits AMBIGUOUS (engagement creates contested timing)
 * - Emits ActionCostEffect (no penalty math, no suppression)
 * - Emits SoftBlock conflict (exposure to interference, no enforced resolution)
 * - Emits action effects normally
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Prevent actions
 * - Trigger opportunity attacks
 * - Apply penalties
 * - Resolve threat
 * - Model engagement mechanics
 * - Perform arithmetic
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
 * Payload for acting while engaged intent
 *
 * CRITICAL: The payload declares that the actor is engaged/threatened.
 * It does NOT imply prevention. It does NOT trigger consequences.
 */
export type ActingWhileEngagedPayload = {
  /** ID of the character performing the action */
  readonly characterId: string;

  /**
   * The declared action being performed
   */
  readonly declaredAction: string;

  /**
   * Engagement status
   *
   * - 'engaged': Character is in melee engagement
   * - 'threatened': Character is threatened but not directly engaged
   *
   * CRITICAL: This is CONTEXT, not enforcement.
   * The system does NOT enforce engagement consequences.
   */
  readonly engagementStatus: 'engaged' | 'threatened';

  /**
   * Who/what the character is engaged by (optional - descriptive only)
   */
  readonly engagedBy?: string;

  /**
   * Action availability context
   */
  readonly actionAvailability?: 'available' | 'unavailable' | 'unknown';
};

/**
 * Type guard for ActingWhileEngagedPayload
 */
export function isActingWhileEngagedPayload(
  payload: unknown
): payload is ActingWhileEngagedPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.declaredAction === 'string' &&
    (p.engagementStatus === 'engaged' || p.engagementStatus === 'threatened')
  );
}

// ============================================================================
// COST DECLARATIONS (DESCRIPTIVE, NOT ENFORCED)
// ============================================================================

/**
 * Create cost validation for action while engaged
 *
 * CRITICAL: No penalty math. No suppression.
 * Cost is descriptive only.
 */
function createCostValidation(
  declaredAction: string,
  engagementStatus: 'engaged' | 'threatened',
  actionAvailability?: 'available' | 'unavailable' | 'unknown'
): CostValidationResult {
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Action while ${engagementStatus}: ${declaredAction}`,
    tags: ['action', engagementStatus, 'contested-timing'],
  };

  if (actionAvailability === 'unavailable') {
    return {
      cost,
      outcome: CostValidationOutcome.UNSATISFIED,
      reason: 'Action capacity explicitly unavailable',
    };
  }

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: `Engagement creates contested timing - system does not determine interference`,
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for action while engaged
 *
 * CRITICAL: This conflict describes exposure to interference.
 * It does NOT enforce prevention. It does NOT trigger opportunity attacks.
 */
function createEngagedActionConflict(
  action: string,
  engagementStatus: 'engaged' | 'threatened',
  engagedBy: string | undefined
): Conflict {
  const engagerSuffix = engagedBy ? ` by ${engagedBy}` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_TEMPORAL_003',
    message: `Action while ${engagementStatus}${engagerSuffix}: attempting (${action}). ` +
      'Engagement creates exposure to interference. ' +
      'The system does not determine interruption or prevention. ' +
      'No enforced resolution.',
    tags: ['temporal', engagementStatus, 'exposure', 'no-prevention', 'no-opportunity-attack'],
  };
}

// ============================================================================
// EFFECT EMISSION (ACTION EFFECTS NORMALLY)
// ============================================================================

/**
 * Create effects for action while engaged
 *
 * CRITICAL INVARIANT: Action effects are emitted normally.
 * Engagement does NOT suppress effects.
 * The system does NOT prevent action.
 */
export function createActingWhileEngagedEffects(
  characterId: string,
  declaredAction: string,
  engagementStatus: 'engaged' | 'threatened',
  engagedBy: string | undefined,
  invocationId: string
): Effect[] {
  return [
    {
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
        actionType: 'standard',
        narrativeType: 'action_attempt',
        engagementStatus,
        engagedBy: engagedBy || 'unspecified',
        temporalStatus: 'contested',
      },
      description: `Character attempts action while ${engagementStatus}: ${declaredAction}`,
    },
  ];
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate acting while engaged intent
 *
 * CRITICAL: This function is DETERMINISTIC and SIDE-EFFECT FREE.
 * It does NOT prevent actions.
 * It does NOT trigger opportunity attacks.
 * It does NOT apply penalties.
 */
function validateActingWhileEngaged(
  payload: ActingWhileEngagedPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { declaredAction, engagementStatus, engagedBy, actionAvailability } = payload;

  // CRITICAL: Always AMBIGUOUS when acting while engaged
  // Engagement creates contested timing - system does not determine interference
  const ambiguity: RulesAmbiguity = {
    reason: `Engagement creates contested timing and pressure. ` +
      `Character is ${engagementStatus} and attempting action (${declaredAction}). ` +
      'The system does not determine interruption or prevention.',
    possibleInterpretations: [
      {
        code: 'ACTION_PROCEEDS',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Action proceeds without interference (GM decision)',
      },
      {
        code: 'ACTION_CONTESTED',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Action proceeds but may be contested (GM decision)',
      },
      {
        code: 'ACTION_PREVENTED',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Action is prevented by engagement (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createEngagedActionConflict(declaredAction, engagementStatus, engagedBy),
  ];

  const costValidation = createCostValidation(
    declaredAction,
    engagementStatus,
    actionAvailability
  );

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
 * Applicability for Acting While Engaged rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const ACTING_WHILE_ENGAGED_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['temporal', 'engaged', 'threatened']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const ACTING_WHILE_ENGAGED_INTENT_TYPE = 'ACTING_WHILE_ENGAGED' as IntentType;

/**
 * Create the Acting While Engaged rules pipeline
 *
 * CRITICAL: This pipeline describes engagement context, it does NOT enforce prevention.
 * No prevention. No opportunity attacks. No penalty math.
 */
export function createActingWhileEngagedPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [ACTING_WHILE_ENGAGED_INTENT_TYPE],
    applicability: ACTING_WHILE_ENGAGED_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isActingWhileEngagedPayload(payload)) {
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

      const result = validateActingWhileEngaged(payload, invocationId);

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
