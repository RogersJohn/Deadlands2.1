/**
 * Persistence Types (TypeScript implementation)
 *
 * Storage-agnostic types for Override Persistence per PR 3.0.
 * Local placeholder types, not global definitions.
 */

export type PersistedInvocation = {
  invocationId: string;
  sourceIntentId: string;
  intentType: string;
  payload: unknown;
  rulesetId: string;
  createdAt: number;
};

export type PersistedOverride = {
  overrideId: string;
  targetInvocationId: string;
  parentOverrideId?: string;

  overriddenInvocation: {
    invocationId: string;
    sourceIntentId: string;
    intentType: string;
    payload: unknown;
    rulesetId: string;
  };

  warning: {
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
  };

  reason: string;
  issuedBy: string;
  issuedAt: number;
};

export type Tombstone = {
  targetType: 'INVOCATION' | 'OVERRIDE';
  targetId: string;
  reason: string;
  issuedBy: string;
  issuedAt: number;
};

export enum PersistenceViolationCode {
  DUPLICATE_INVOCATION,
  INVOCATION_NOT_FOUND,
  DUPLICATE_OVERRIDE,
  INVALID_OVERRIDE_CHAIN,
  MISSING_PARENT_OVERRIDE,
}

export type PersistenceViolation = {
  code: PersistenceViolationCode;
  details?: string;
};
