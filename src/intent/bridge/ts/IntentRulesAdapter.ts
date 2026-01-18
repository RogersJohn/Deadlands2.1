/**
 * Intent → Rules Adapter (PR 1.5)
 *
 * Authoritative bridge between validated intents and rules pipelines.
 *
 * This adapter:
 * - Accepts ONLY ValidatedIntent (branded, unforgeable)
 * - Selects the appropriate rules pipeline
 * - Invokes the pipeline
 * - Produces a ValidationReport
 *
 * This adapter does NOT:
 * - Interpret or enrich intent data
 * - Resolve ambiguity
 * - Apply effects
 * - Mutate state
 * - Make authority decisions
 */

import { IntentType, ValidatedIntent } from './ValidatedIntent';
import {
  InvocationId,
  PipelineRegistry,
  RuleAuthorityClaim,
  RulesetId,
  RulesPipeline,
  ValidationReport,
} from './RulesPipeline';

/**
 * Adapter-level failure codes
 *
 * These are DISTINCT from rule violations.
 * They represent failures in the adapter layer, not the rules layer.
 */
export enum AdapterFailureCode {
  /** No pipeline claims authority for this intent type */
  NO_PIPELINE_CLAIMS_AUTHORITY = 'NO_PIPELINE_CLAIMS_AUTHORITY',

  /** Multiple pipelines claim authority - ambiguity at adapter level */
  MULTIPLE_PIPELINES_CLAIM_AUTHORITY = 'MULTIPLE_PIPELINES_CLAIM_AUTHORITY',

  /** Pipeline was selected but not found in registry */
  PIPELINE_NOT_FOUND = 'PIPELINE_NOT_FOUND',
}

/**
 * Adapter failure - explicit, structured
 *
 * NOT a RuleViolation. These are adapter-level errors.
 */
export type AdapterFailure = {
  readonly code: AdapterFailureCode;
  readonly intentId: string;
  readonly intentType: IntentType;
  readonly details: string;
  readonly claimingRulesets?: readonly RulesetId[];
};

/**
 * Adapter result - discriminated union
 *
 * Either:
 * - Success: ValidationReport from invoked pipeline
 * - Failure: AdapterFailure (distinct from rule violations)
 */
export type AdapterResult =
  | { readonly kind: 'report'; readonly report: ValidationReport }
  | { readonly kind: 'failure'; readonly failure: AdapterFailure };

/**
 * Deterministic Invocation ID Generation
 *
 * Algorithm: djb2 string hash
 *
 * Input fields (in order):
 *   1. intent.intentId
 *   2. intent.intentType
 *   3. intent.payload (JSON-canonicalized)
 *
 * Guarantees:
 *   - Deterministic (same inputs → same output)
 *   - No randomness
 *   - No timestamps
 *   - No UUID libraries
 */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash >>> 0;
}

function canonicalizePayload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    return 'null';
  }
  if (typeof payload !== 'object') {
    return JSON.stringify(payload);
  }
  // Sort keys for deterministic ordering
  const sortedKeys = Object.keys(payload as object).sort();
  const sorted: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sorted[key] = (payload as Record<string, unknown>)[key];
  }
  return JSON.stringify(sorted);
}

function generateInvocationId(intent: ValidatedIntent): InvocationId {
  const hashInput = `${intent.intentId}:${intent.intentType}:${canonicalizePayload(intent.payload)}`;
  const hash = djb2(hashInput);
  return `inv_${hash.toString(16).padStart(8, '0')}` as InvocationId;
}

/**
 * Find claims that match the intent type
 */
function findMatchingClaims(
  intentType: IntentType,
  claims: readonly RuleAuthorityClaim[]
): readonly RuleAuthorityClaim[] {
  return claims.filter((c) => c.intentType === intentType);
}

/**
 * IntentRulesAdapter
 *
 * The authoritative bridge between intent validation and rules validation.
 */
export class IntentRulesAdapter {
  private readonly registry: PipelineRegistry;

  constructor(registry: PipelineRegistry) {
    this.registry = registry;
  }

  /**
   * Process a validated intent through the rules pipeline
   *
   * This method:
   * 1. Generates a deterministic invocation ID
   * 2. Selects the appropriate pipeline (exactly one must claim authority)
   * 3. Invokes the pipeline
   * 4. Returns the ValidationReport
   *
   * Failure modes (all explicit):
   * - NO_PIPELINE_CLAIMS_AUTHORITY: No pipeline handles this intent type
   * - MULTIPLE_PIPELINES_CLAIM_AUTHORITY: Ambiguity - multiple pipelines claim
   * - PIPELINE_NOT_FOUND: Selected pipeline not in registry
   *
   * This method does NOT:
   * - Accept raw/unvalidated intents (type system prevents this)
   * - Resolve ambiguity
   * - Enrich or transform data
   * - Catch and swallow errors
   */
  processIntent(intent: ValidatedIntent): AdapterResult {
    const claims = this.registry.getAuthorityClaims();
    const matching = findMatchingClaims(intent.intentType, claims);

    // Failure: No pipeline claims authority
    if (matching.length === 0) {
      return {
        kind: 'failure',
        failure: {
          code: AdapterFailureCode.NO_PIPELINE_CLAIMS_AUTHORITY,
          intentId: intent.intentId,
          intentType: intent.intentType,
          details: `No pipeline claims authority for intent type: ${intent.intentType}`,
        },
      };
    }

    // Failure: Multiple pipelines claim authority (ambiguity)
    if (matching.length > 1) {
      return {
        kind: 'failure',
        failure: {
          code: AdapterFailureCode.MULTIPLE_PIPELINES_CLAIM_AUTHORITY,
          intentId: intent.intentId,
          intentType: intent.intentType,
          details: `Multiple pipelines claim authority for intent type: ${intent.intentType}`,
          claimingRulesets: matching.map((c) => c.rulesetId),
        },
      };
    }

    // Exactly one pipeline claims authority
    const claim = matching[0];
    if (claim === undefined) {
      // This should be unreachable given length check, but TypeScript requires it
      return {
        kind: 'failure',
        failure: {
          code: AdapterFailureCode.NO_PIPELINE_CLAIMS_AUTHORITY,
          intentId: intent.intentId,
          intentType: intent.intentType,
          details: 'Unexpected: matching array became empty',
        },
      };
    }

    // Get the pipeline from registry
    const pipeline = this.registry.getPipeline(claim.rulesetId);
    if (pipeline === null) {
      return {
        kind: 'failure',
        failure: {
          code: AdapterFailureCode.PIPELINE_NOT_FOUND,
          intentId: intent.intentId,
          intentType: intent.intentType,
          details: `Pipeline not found for ruleset: ${claim.rulesetId}`,
        },
      };
    }

    // Generate deterministic invocation ID
    const invocationId = generateInvocationId(intent);

    // Invoke the pipeline
    const report = pipeline.validate(intent, invocationId);

    return {
      kind: 'report',
      report,
    };
  }
}

/**
 * Create an IntentRulesAdapter
 *
 * Factory function for consistency with other modules.
 */
export function createIntentRulesAdapter(registry: PipelineRegistry): IntentRulesAdapter {
  return new IntentRulesAdapter(registry);
}
