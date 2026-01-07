/**
 * Canonical Backend Types
 *
 * These types are copied from backend query models.
 * They must be treated as opaque truth.
 * Payloads are unknown - the frontend MUST NOT interpret them.
 */

export type InvocationSummaryView = {
  invocationId: string;
  intentType: string;
  rulesetId: string;
  hasOverrides: boolean;
  latestOverrideSeverity?: 'INFO' | 'WARNING' | 'CRITICAL';
};

export type InvocationHistoryView = {
  invocation: unknown;
  overrides: unknown[];
  tombstones: unknown[];
};

export type EffectiveInvocationView = {
  effectiveInvocation: unknown;
  hasOverrides: boolean;
  latestWarning?: {
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
  };
};

export enum QueryViolationCode {
  INVOCATION_NOT_FOUND,
  INVALID_OVERRIDE_CHAIN,
}

export type QueryViolation = {
  code: QueryViolationCode;
  details?: string;
};
