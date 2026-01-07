/**
 * Intent → Rules Bridge Implementation
 *
 * Pure structural adapter: ValidatedIntent → RulesInvocationRequest
 * No interpretation, no enrichment, no authority decisions.
 */

import {
  BridgeViolation,
  BridgeViolationCode,
  IntentId,
  IntentToRulesBridge,
  IntentType,
  InvocationId,
  RuleAuthorityClaim,
  RulesInvocationRequest,
  RulesInvocationResult,
  ValidatedIntent,
} from './types';

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
 * Payload canonicalization:
 *   - JSON.stringify with keys sorted alphabetically
 *   - Ensures identical payloads produce identical strings
 *
 * Hash computation:
 *   - djb2: hash = ((hash << 5) + hash) + charCode
 *   - Seed: 5381
 *   - Output: unsigned 32-bit integer
 *
 * Final format: "inv_" + 8-character zero-padded hex
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

function generateInvocationId(
  intentId: IntentId,
  intentType: IntentType,
  payload: unknown
): InvocationId {
  const canonicalPayload = JSON.stringify(payload, Object.keys(payload as object).sort());
  const hashInput = `${intentId}:${intentType}:${canonicalPayload}`;
  const hash = djb2(hashInput);
  return `inv_${hash.toString(16).padStart(8, '0')}`;
}

function findMatchingClaims(
  intentType: IntentType,
  claims: RuleAuthorityClaim[]
): RuleAuthorityClaim[] {
  return claims.filter((c) => c.intentType === intentType);
}

function violation(
  code: BridgeViolationCode,
  intentId: IntentId,
  details?: string
): RulesInvocationResult {
  const v: BridgeViolation = { code, intentId };
  if (details !== undefined) v.details = details;
  return { kind: 'violation', violation: v };
}

function invocation(request: RulesInvocationRequest): RulesInvocationResult {
  return { kind: 'invocation', request };
}

class IntentToRulesBridgeImpl implements IntentToRulesBridge {
  toRulesInvocation(
    intent: ValidatedIntent,
    authorityClaims: RuleAuthorityClaim[]
  ): RulesInvocationResult {
    const matching = findMatchingClaims(intent.intentType, authorityClaims);

    if (matching.length === 0) {
      return violation(
        BridgeViolationCode.NO_RULESET_CLAIMS_AUTHORITY,
        intent.intentId,
        `No ruleset claims authority for: ${intent.intentType}`
      );
    }

    if (matching.length > 1) {
      return violation(
        BridgeViolationCode.MULTIPLE_RULESETS_CLAIM_AUTHORITY,
        intent.intentId,
        `Multiple rulesets claim: ${matching.map((c) => c.rulesetId).join(', ')}`
      );
    }

    const claim = matching[0];

    const request: RulesInvocationRequest = {
      invocationId: generateInvocationId(intent.intentId, intent.intentType, intent.payload),
      sourceIntentId: intent.intentId,
      intentType: intent.intentType,
      payload: intent.payload,
      rulesetId: claim.rulesetId,
    };

    return invocation(request);
  }
}

export function createIntentToRulesBridge(): IntentToRulesBridge {
  return new IntentToRulesBridgeImpl();
}
