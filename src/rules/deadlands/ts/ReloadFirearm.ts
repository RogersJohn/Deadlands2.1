/**
 * Reload Firearm Rule (PR 4.0, updated PR 4.1, PR 6.1)
 *
 * First real Deadlands/Savage Worlds rule implementation.
 *
 * PR 6.1 ADDITIONS - Rule Applicability:
 * - Declares explicit applicability (combat mode only)
 * - Rule does not apply in downtime or social modes
 * - Applicability is filtering, not decision-making
 *
 * This rule answers: "Is this reload action legal under the rules?"
 *
 * It does NOT answer:
 * - How much ammo is consumed (that's an effect)
 * - Whether the reload succeeds (no dice)
 * - What happens mechanically
 *
 * Savage Worlds context:
 * - Firearms have a "Shots" capacity (how many rounds before empty)
 * - Reloading typically takes an action (or more for some weapons)
 * - Reloading requires ammunition of the correct type
 * - Some weapons cannot be reloaded (thrown weapons, etc.)
 *
 * This rule checks:
 * - PASS: Weapon is reloadable AND ammo context is provided AND ammo is available
 * - FAIL: Weapon is not a reloadable firearm
 * - AMBIGUOUS: Weapon is reloadable BUT ammo availability is unknown
 *
 * PR 4.1 ADDITIONS - Declarative Cost Validation:
 * - Emits ActionCostEffect describing the action cost requirement
 * - Emits CostValidationResult with SATISFIED/UNSATISFIED/AMBIGUOUS
 * - Cost validation is DECLARATIVE ONLY - it does NOT enforce
 * - NO arithmetic, NO state mutation, NO inference, NO auto-satisfaction
 *
 * EXPLICITLY OUT OF SCOPE (intentional deferral, not TODOs):
 * - Dice rolling: Reload legality does not involve dice in Savage Worlds
 * - Reload success/failure mechanics: Beyond legality check
 * - Weapon-specific reload times: All reloads cost 1 action here
 * - Ammo quantity tracking: Only availability (available/unavailable/unknown)
 * - Derived stat changes: This is legality, not execution
 * - Speed Load edge: Not implemented
 * - Quick Draw edge: Not implemented
 * - Malfunction/jamming: Not implemented
 */

import type { ValidatedIntent } from '../../../intent/bridge/ts/ValidatedIntent';
import type { IntentType } from '../../../intent/bridge/ts/ValidatedIntent';
import type {
  InvocationId,
  RulesAmbiguity,
  RulesPipeline,
  RulesetId,
  RuleViolation,
  ValidationReport,
} from '../../../intent/bridge/ts/RulesPipeline';
import { RulesOutcome } from '../../../intent/bridge/ts/RulesPipeline';
import type { CostValidationResult, ActionCostEffect } from '../../../resolution/ts/types';
import { CostValidationOutcome } from '../../../resolution/ts/types';
import type { RuleApplicability } from '../../applicability/ts/types';
import { createRuleApplicability } from '../../applicability/ts/types';

// ============================================================================
// INTENT PAYLOAD TYPES (what the UI submits)
// ============================================================================

/**
 * Payload for RELOAD_FIREARM intent
 *
 * The UI collects this information explicitly.
 * No inference. No auto-fill.
 */
export type ReloadFirearmPayload = {
  /** ID of the character performing the reload */
  readonly characterId: string;

  /** ID of the weapon being reloaded */
  readonly weaponId: string;

  /** Type of weapon (must match Savage Worlds categories) */
  readonly weaponType: 'firearm' | 'thrown' | 'melee' | 'bow' | 'crossbow';

  /** Whether the weapon has Shots capacity (can it be reloaded at all?) */
  readonly hasShotsCapacity: boolean;

  /**
   * Ammo availability context
   *
   * This comes from game state, provided by the UI/backend.
   * - 'available': Character has ammo of the correct type
   * - 'unavailable': Character has no ammo of the correct type
   * - 'unknown': Ammo status is not provided (triggers AMBIGUOUS)
   */
  readonly ammoAvailability: 'available' | 'unavailable' | 'unknown';

  /**
   * Current weapon ammo state
   * - 'empty': Weapon has 0 shots remaining
   * - 'partial': Weapon has some shots but not full
   * - 'full': Weapon is already fully loaded
   */
  readonly currentAmmoState: 'empty' | 'partial' | 'full';

  /**
   * Action availability context (PR 4.1)
   *
   * This comes from game state, provided by the UI/backend.
   * - 'available': Character has an action available to spend
   * - 'unavailable': Character has no actions remaining
   * - 'unknown': Action availability is not provided (triggers AMBIGUOUS cost)
   *
   * IMPORTANT: Rules do NOT track or infer action counts.
   * This value must be explicitly provided.
   */
  readonly actionAvailability?: 'available' | 'unavailable' | 'unknown';
};

// ============================================================================
// VALIDATION LOGIC (deterministic, side-effect free)
// ============================================================================

/**
 * Check if the weapon type is reloadable
 *
 * Savage Worlds rule: Only firearms (and similar) can be reloaded.
 * Thrown weapons, melee weapons cannot be "reloaded".
 */
function isReloadableWeaponType(weaponType: ReloadFirearmPayload['weaponType']): boolean {
  switch (weaponType) {
    case 'firearm':
    case 'bow':
    case 'crossbow':
      return true;
    case 'thrown':
    case 'melee':
      return false;
  }
}

// ============================================================================
// DECLARATIVE COST VALIDATION (PR 4.1)
// ============================================================================

/**
 * The declared action cost for reloading a firearm
 *
 * CRITICAL: This is DESCRIPTIVE ONLY.
 * - It does NOT enforce anything
 * - It does NOT track actions
 * - It does NOT modify state
 * - The persistence layer decides what to do with this data
 */
const RELOAD_ACTION_COST: ActionCostEffect = {
  kind: 'ActionCostEffect',
  description: 'Reload requires an action',
  tags: ['action', 'reload'],
};

/**
 * Validate the action cost for reload (PR 4.1)
 *
 * CRITICAL INVARIANTS:
 * - SATISFIED is unreachable without GM override
 * - 'available' does NOT prove spendability
 * - Only 'unavailable' produces UNSATISFIED
 * - Everything else → AMBIGUOUS
 */
function validateActionCost(
  actionAvailability: ReloadFirearmPayload['actionAvailability']
): CostValidationResult {
  if (actionAvailability === 'unavailable') {
    return {
      cost: RELOAD_ACTION_COST,
      outcome: CostValidationOutcome.UNSATISFIED,
      reason: 'Action explicitly unavailable',
    };
  }

  return {
    cost: RELOAD_ACTION_COST,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Action availability does not prove spendability',
  };
}

/**
 * Validate the reload firearm intent
 *
 * Pure function. Deterministic. No side effects.
 */
function validateReloadFirearm(
  payload: ReloadFirearmPayload,
  invocationId: InvocationId,
  sourceIntentId: string
): { outcome: RulesOutcome; violations: RuleViolation[]; ambiguity: RulesAmbiguity | null } {
  const violations: RuleViolation[] = [];
  let ambiguity: RulesAmbiguity | null = null;

  // Rule 1: Weapon type must be reloadable
  if (!isReloadableWeaponType(payload.weaponType)) {
    violations.push({
      ruleId: 'SW_RELOAD_001',
      message: `Cannot reload a ${payload.weaponType} weapon. Only firearms, bows, and crossbows can be reloaded.`,
      severity: 'ERROR',
    });
    return { outcome: RulesOutcome.FAIL, violations, ambiguity };
  }

  // Rule 2: Weapon must have Shots capacity
  if (!payload.hasShotsCapacity) {
    violations.push({
      ruleId: 'SW_RELOAD_002',
      message: 'This weapon has no Shots capacity and cannot be reloaded.',
      severity: 'ERROR',
    });
    return { outcome: RulesOutcome.FAIL, violations, ambiguity };
  }

  // Rule 3: Weapon must not already be full
  if (payload.currentAmmoState === 'full') {
    violations.push({
      ruleId: 'SW_RELOAD_003',
      message: 'Weapon is already fully loaded. Reload is not necessary.',
      severity: 'WARNING',
    });
    // This is a WARNING, not an ERROR - reload is technically allowed but wasteful
    // We still PASS but with a warning
  }

  // Rule 4: Ammo availability check
  if (payload.ammoAvailability === 'unknown') {
    // AMBIGUOUS: Rules cannot determine outcome without ammo info
    // Structured interpretations with explicit outcome mapping for deterministic GM override
    ambiguity = {
      reason: 'Ammunition availability is not specified in the game state.',
      possibleInterpretations: [
        {
          code: 'AMMO_AVAILABLE',
          resultingOutcome: RulesOutcome.PASS,
          description: 'Character has ammunition available - reload is legal',
        },
        {
          code: 'NO_AMMO',
          resultingOutcome: RulesOutcome.FAIL,
          description: 'Character has no ammunition available - reload is illegal',
        },
      ],
    };
    return { outcome: RulesOutcome.AMBIGUOUS, violations, ambiguity };
  }

  if (payload.ammoAvailability === 'unavailable') {
    violations.push({
      ruleId: 'SW_RELOAD_004',
      message: 'Character has no ammunition of the correct type for this weapon.',
      severity: 'ERROR',
    });
    return { outcome: RulesOutcome.FAIL, violations, ambiguity };
  }

  // All checks passed
  return { outcome: RulesOutcome.PASS, violations, ambiguity };
}

// ============================================================================
// RULE APPLICABILITY (PR 6.1)
// ============================================================================

/**
 * The declared applicability for Reload Firearm rule
 *
 * CRITICAL: This is EXPLICIT applicability.
 * - Rule applies ONLY in combat mode
 * - Rule does NOT apply in downtime or social modes
 * - Applicability is filtering, not decision-making
 *
 * Reloading is a combat action. It does not make sense
 * to validate reload rules during downtime or social encounters.
 */
export const RELOAD_FIREARM_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['action', 'weapon', 'reload']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

/** The ruleset ID for Deadlands/Savage Worlds core rules */
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;

/** The intent type this rule handles */
export const RELOAD_FIREARM_INTENT_TYPE = 'RELOAD_FIREARM' as IntentType;

/**
 * Create the Reload Firearm rules pipeline
 *
 * This pipeline:
 * - Handles RELOAD_FIREARM intents only
 * - Validates against Savage Worlds reload rules
 * - Produces ValidationReport with PASS/FAIL/AMBIGUOUS
 * - Emits declarative cost validation (PR 4.1)
 * - Declares explicit applicability (PR 6.1): combat mode only
 */
export function createReloadFirearmPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [RELOAD_FIREARM_INTENT_TYPE],
    applicability: RELOAD_FIREARM_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      // Type guard: payload must be ReloadFirearmPayload
      // In a real system, this would be more rigorous
      const payload = intent.payload as ReloadFirearmPayload;

      const { outcome, violations, ambiguity } = validateReloadFirearm(
        payload,
        invocationId,
        intent.intentId
      );

      // PR 4.1: Declarative cost validation
      // This describes the cost requirement; it does NOT enforce it
      const costValidation = validateActionCost(payload.actionAvailability);

      return {
        invocationId,
        sourceIntentId: intent.intentId,
        intentType: intent.intentType,
        rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome,
        violations,
        ambiguity,
        payload: intent.payload,
        costValidation,
        // PR 4.3: Conflicts are data, not logic
        // ReloadFirearm currently emits no conflicts
        // Future rules may emit HardBlock/SoftBlock/Informational conflicts
        conflicts: [],
      };
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { RulesOutcome };

/** Exported for testing: the declared action cost for reload */
export { RELOAD_ACTION_COST };
