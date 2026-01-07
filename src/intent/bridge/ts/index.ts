/**
 * NOTE: These exports are provisional and internal to the
 * TypeScript implementation of the Intent → Rules Bridge.
 * The authoritative boundary is defined in BRIDGE_SPECIFICATION.md.
 */

export type {
  BridgeViolation,
  IntentToRulesBridge,
  RuleAuthorityClaim,
  RulesInvocationRequest,
  RulesInvocationResult,
  ValidatedIntent,
} from './types';

export { BridgeViolationCode } from './types';

export { createIntentToRulesBridge } from './IntentToRulesBridge';
