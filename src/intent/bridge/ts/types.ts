/**
 * Local types for Intent → Rules Bridge (TypeScript implementation)
 *
 * These are LOCAL placeholder types, not global definitions.
 * A later PR will define authoritative global types.
 */

// Opaque identifier placeholders (local to this module)
export type IntentId = string;
export type IntentType = string;
export type RulesetId = string;
export type InvocationId = string;

// Input types
export type ValidatedIntent = {
  intentId: IntentId;
  intentType: IntentType;
  payload: unknown;
  validationSummary: unknown;
};

export type RuleAuthorityClaim = {
  rulesetId: RulesetId;
  intentType: IntentType;
};

// Output types
export type RulesInvocationRequest = {
  invocationId: InvocationId;
  sourceIntentId: IntentId;
  intentType: IntentType;
  payload: unknown;
  rulesetId: RulesetId;
};

export enum BridgeViolationCode {
  NO_RULESET_CLAIMS_AUTHORITY,
  MULTIPLE_RULESETS_CLAIM_AUTHORITY,
  INTENT_UNMAPPABLE_TO_RULES,
}

export type BridgeViolation = {
  code: BridgeViolationCode;
  intentId: IntentId;
  details?: string;
};

export type RulesInvocationResult =
  | { kind: 'invocation'; request: RulesInvocationRequest }
  | { kind: 'violation'; violation: BridgeViolation };

// Bridge interface
export interface IntentToRulesBridge {
  toRulesInvocation(
    intent: ValidatedIntent,
    authorityClaims: RuleAuthorityClaim[]
  ): RulesInvocationResult;
}
