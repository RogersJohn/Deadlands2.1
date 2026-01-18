/**
 * ValidatedIntent - Branded Opaque Type
 *
 * ValidatedIntent is an unforgeable proof token that proves an intent
 * has passed through structural validation.
 *
 * This module uses TypeScript branded types to make ValidatedIntent
 * as unforgeable as the type system allows:
 *
 * 1. The brand symbol is not exported
 * 2. Only createValidatedIntent() can produce a ValidatedIntent
 * 3. Raw Intent objects cannot be cast to ValidatedIntent
 * 4. The validation proof is embedded in the type itself
 *
 * Limitations (TypeScript, not runtime):
 * - Runtime forgery is technically possible via type assertions
 * - This is a compile-time guarantee, not a cryptographic proof
 * - The brand prevents accidental misuse, not malicious bypass
 */

// Internal brand symbol - not exported
declare const VALIDATED_INTENT_BRAND: unique symbol;

/**
 * Opaque identifier types - branded to prevent accidental interchange
 */
declare const INTENT_ID_BRAND: unique symbol;
declare const INTENT_TYPE_BRAND: unique symbol;

export type IntentId = string & { readonly [INTENT_ID_BRAND]: never };
export type IntentType = string & { readonly [INTENT_TYPE_BRAND]: never };

/**
 * Raw Intent - NOT validated
 * This type is explicitly separate from ValidatedIntent
 */
export type RawIntent = {
  readonly intentId: string;
  readonly intentType: string;
  readonly payload: unknown;
};

/**
 * Validation summary from the intent validation layer
 * Passed through opaquely - never inspected by the bridge
 */
export type ValidationSummary = {
  readonly validatedAt: number;
  readonly validatorVersion: string;
  readonly structuralChecks: readonly string[];
};

/**
 * ValidatedIntent - Branded proof token
 *
 * The brand ensures:
 * - Cannot be created directly via object literal
 * - Cannot be assigned from RawIntent
 * - Can only be obtained via createValidatedIntent()
 */
export type ValidatedIntent<TPayload = unknown> = {
  readonly intentId: IntentId;
  readonly intentType: IntentType;
  readonly payload: TPayload;
  readonly validationSummary: ValidationSummary;
  readonly [VALIDATED_INTENT_BRAND]: never;
};

/**
 * Validation result from intent validation layer
 */
export type IntentValidationResult =
  | { readonly kind: 'valid'; readonly intent: RawIntent; readonly summary: ValidationSummary }
  | { readonly kind: 'invalid'; readonly errors: readonly string[] };

/**
 * Create a ValidatedIntent from a validation result
 *
 * This is the ONLY way to obtain a ValidatedIntent.
 * The function only accepts successful validation results.
 *
 * Guarantees:
 * - Only valid intents can produce ValidatedIntent
 * - The validation summary is preserved
 * - The brand is applied
 */
export function createValidatedIntent<TPayload = unknown>(
  validationResult: IntentValidationResult
): ValidatedIntent<TPayload> | null {
  if (validationResult.kind !== 'valid') {
    return null;
  }

  // Apply brands to identifiers
  const intentId = validationResult.intent.intentId as IntentId;
  const intentType = validationResult.intent.intentType as IntentType;

  // Construct with brand (cast is internal and controlled)
  return {
    intentId,
    intentType,
    payload: validationResult.intent.payload as TPayload,
    validationSummary: validationResult.summary,
  } as ValidatedIntent<TPayload>;
}

/**
 * Type guard to check if something claims to be a ValidatedIntent
 *
 * Note: This checks structure only. The brand is a compile-time guarantee.
 * Runtime forgery is technically possible but violates the contract.
 */
export function isValidatedIntentStructure(value: unknown): value is ValidatedIntent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['intentId'] === 'string' &&
    typeof obj['intentType'] === 'string' &&
    'payload' in obj &&
    typeof obj['validationSummary'] === 'object' &&
    obj['validationSummary'] !== null
  );
}
