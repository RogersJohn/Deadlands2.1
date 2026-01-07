/**
 * GM Override Types (TypeScript implementation)
 *
 * Local placeholder types per ADR-0020.
 * Not global definitions.
 */

export type OverrideId = string;
export type InvocationId = string;
export type GmId = string;
export type LogicalTime = number;

export type RulesInvocationRequest = {
  invocationId: InvocationId;
  sourceIntentId: string;
  intentType: string;
  payload: unknown;
  rulesetId: string;
};

export type OverrideWarning = {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
};

export type OverrideDecision = {
  overrideId: OverrideId;
  parentOverrideId?: OverrideId;
  targetInvocationId: InvocationId;

  originalInvocation: RulesInvocationRequest;
  overriddenInvocation: RulesInvocationRequest;

  warning: OverrideWarning;
  reason: string;
  issuedBy: GmId;
  issuedAt: LogicalTime;
};

export enum OverrideViolationCode {
  EMPTY_REASON,
  EMPTY_WARNING_MESSAGE,
  INVALID_CHAIN,
  INVOCATION_ID_MISMATCH,
}

export type OverrideViolation = {
  code: OverrideViolationCode;
  details?: string;
};
