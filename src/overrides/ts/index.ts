/**
 * NOTE: These exports are provisional and internal to the
 * TypeScript implementation of the GM Override model.
 * The authoritative design is defined in ADR-0020.
 */

export type {
  GmId,
  InvocationId,
  LogicalTime,
  OverrideDecision,
  OverrideId,
  OverrideViolation,
  OverrideWarning,
  RulesInvocationRequest,
} from './types';

export { OverrideViolationCode } from './types';

export {
  createOverrideDecision,
  getEffectiveInvocation,
} from './OverrideDecision';
