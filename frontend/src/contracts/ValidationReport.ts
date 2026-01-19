/**
 * ValidationReport DTO Contracts (FE-PR 0.1)
 *
 * CRITICAL: These types mirror backend DTOs EXACTLY.
 * - No derived fields
 * - No convenience helpers
 * - No interpretation
 * - Frontend is CONSUMER ONLY
 */

/**
 * RulesOutcome - exhaustive enum of validation outcomes
 */
export type RulesOutcome = 'PASS' | 'FAIL' | 'AMBIGUOUS';

/**
 * RuleViolation - individual rule violation
 */
export type RuleViolation = {
  readonly ruleId: string;
  readonly message: string;
  readonly severity: 'ERROR' | 'WARNING';
};

/**
 * AmbiguityInterpretation - structured interpretation option
 */
export type AmbiguityInterpretation = {
  readonly code: string;
  readonly resultingOutcome: 'PASS' | 'FAIL';
  readonly description: string;
};

/**
 * RulesAmbiguity - why rules could not determine outcome
 */
export type RulesAmbiguity = {
  readonly reason: string;
  readonly possibleInterpretations: readonly AmbiguityInterpretation[];
};

/**
 * ActionCostEffect - declarative cost description
 */
export type ActionCostEffect = {
  readonly kind: 'ActionCostEffect';
  readonly description: string;
  readonly tags?: readonly string[];
};

/**
 * CostValidationOutcome - cost validation states
 */
export type CostValidationOutcome = 'SATISFIED' | 'UNSATISFIED' | 'AMBIGUOUS';

/**
 * CostValidationResult - result of cost validation
 */
export type CostValidationResult = {
  readonly cost: ActionCostEffect;
  readonly outcome: CostValidationOutcome;
  readonly reason: string;
};

/**
 * ConflictKind - conflict severity classification
 */
export type ConflictKind = 'HardBlock' | 'SoftBlock' | 'Informational';

/**
 * Conflict - explicit conflict marker
 */
export type Conflict = {
  readonly kind: ConflictKind;
  readonly sourceRule: string;
  readonly message: string;
  readonly tags?: readonly string[];
};

/**
 * WikiCitation - reference to wiki content
 */
export type WikiCitation = {
  readonly wikiId: string;
  readonly title: string;
  readonly relevance: string;
};

/**
 * ValidationReport - rules engine output
 */
export type ValidationReport = {
  readonly invocationId: string;
  readonly sourceIntentId: string;
  readonly intentType: string;
  readonly rulesetId: string;
  readonly outcome: RulesOutcome;
  readonly violations: readonly RuleViolation[];
  readonly ambiguity: RulesAmbiguity | null;
  readonly payload: unknown;
  readonly costValidation?: CostValidationResult;
  readonly conflicts: readonly Conflict[];
  readonly wikiCitations?: readonly WikiCitation[];
};
