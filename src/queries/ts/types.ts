/**
 * Query Types (TypeScript implementation)
 *
 * Read-only view types for UI-agnostic query APIs per PR 4.0.
 * Local types, not global definitions.
 */

// Reuse persisted types (copied for local reference)
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

// Query view types (exact per spec)
export type InvocationHistoryView = {
  invocation: PersistedInvocation;
  overrides: PersistedOverride[];
  tombstones: Tombstone[];
};

export type EffectiveInvocationView = {
  effectiveInvocation:
    | PersistedInvocation
    | PersistedOverride['overriddenInvocation'];

  hasOverrides: boolean;

  latestWarning?: {
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
  };
};

export type InvocationSummaryView = {
  invocationId: string;
  intentType: string;
  rulesetId: string;
  hasOverrides: boolean;
  latestOverrideSeverity?: 'INFO' | 'WARNING' | 'CRITICAL';
};

// Query violation model (closed)
export enum QueryViolationCode {
  INVOCATION_NOT_FOUND,
  INVALID_OVERRIDE_CHAIN,
}

export type QueryViolation = {
  code: QueryViolationCode;
  details?: string;
};
