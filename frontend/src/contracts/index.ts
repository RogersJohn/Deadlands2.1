/**
 * Frontend DTO Contracts Index (FE-PR 0.1)
 *
 * CRITICAL: All exports are READ-ONLY backend DTO mirrors.
 * - No derived fields
 * - No convenience helpers
 * - No interpretation
 * - Frontend is CONSUMER ONLY
 *
 * These contracts define what the frontend RECEIVES from the backend.
 * The frontend renders these as-is without transformation.
 */

// Intent contracts
export type {
  RawIntent,
  ValidatedIntent,
  IntentValidationError,
  IntentValidationResult,
} from './Intent';

// ValidationReport contracts
export type {
  RulesOutcome,
  RuleViolation,
  AmbiguityInterpretation,
  RulesAmbiguity,
  ActionCostEffect,
  CostValidationOutcome,
  CostValidationResult,
  ConflictKind,
  Conflict,
  WikiCitation,
  ValidationReport,
} from './ValidationReport';

// RuleResult contracts (aggregated validation)
export type {
  RuleValidationResult,
  CostResult,
  ConflictResult,
  AggregatedValidationReport,
} from './RuleResult';

// Effect contracts
export type {
  EffectType,
  EffectTarget,
  EffectAuthority,
  Effect,
  ResolutionOutcome,
  ResolutionResult,
} from './Effect';

// Override contracts
export type {
  OverrideWarning,
  OverrideScope,
  OverriddenOutcome,
  GmOverride,
  EffectiveValidation,
  OverrideViolationCode,
  OverrideViolation,
  OverrideResult,
} from './Override';

// ExplanationGraph contracts
export type {
  ExplanationNode,
  ExplanationEdge,
  ExplanationGraph,
} from './ExplanationGraph';
