/**
 * Intent DTO Contracts (FE-PR 0.1)
 *
 * CRITICAL: These types mirror backend DTOs EXACTLY.
 * - No derived fields
 * - No convenience helpers
 * - No interpretation
 * - Frontend is CONSUMER ONLY
 */

/**
 * RawIntent - unvalidated intent from UI
 */
export type RawIntent = {
  readonly intentType: string;
  readonly payload: unknown;
};

/**
 * ValidatedIntent - structurally validated intent
 */
export type ValidatedIntent = {
  readonly intentId: string;
  readonly intentType: string;
  readonly payload: unknown;
  readonly timestamp: number;
};

/**
 * IntentValidationError - structural validation failure
 */
export type IntentValidationError = {
  readonly field: string;
  readonly message: string;
};

/**
 * IntentValidationResult - result of structural validation
 */
export type IntentValidationResult =
  | { readonly kind: 'valid'; readonly intent: ValidatedIntent }
  | { readonly kind: 'invalid'; readonly errors: readonly IntentValidationError[] };
