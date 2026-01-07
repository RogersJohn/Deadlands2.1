/**
 * QueryAdapter Interface
 *
 * Defines the contract for querying backend views.
 * No retries. No defaults. No transformation.
 */

import {
  InvocationSummaryView,
  InvocationHistoryView,
  EffectiveInvocationView,
  QueryViolation,
} from '../types/backend';

export interface QueryAdapter {
  getInvocationSummaries(): Promise<InvocationSummaryView[]>;

  getInvocationHistory(
    invocationId: string
  ): Promise<
    | { kind: 'view'; view: InvocationHistoryView }
    | { kind: 'violation'; violation: QueryViolation }
  >;

  getEffectiveInvocation(
    invocationId: string
  ): Promise<
    | { kind: 'view'; view: EffectiveInvocationView }
    | { kind: 'violation'; violation: QueryViolation }
  >;
}
