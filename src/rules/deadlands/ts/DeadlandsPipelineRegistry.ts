/**
 * Deadlands Pipeline Registry (PR 4.0)
 *
 * Wires up Deadlands rules pipelines to the adapter.
 *
 * This registry:
 * - Registers the Reload Firearm pipeline
 * - Provides authority claims for intent routing
 * - Does NOT interpret intents or apply rules
 *
 * The adapter queries this registry to find pipelines.
 */

import type {
  PipelineRegistry,
  RuleAuthorityClaim,
  RulesetId,
  RulesPipeline,
} from '../../../intent/bridge/ts/RulesPipeline';
import {
  createReloadFirearmPipeline,
  DEADLANDS_CORE_RULESET_ID,
  RELOAD_FIREARM_INTENT_TYPE,
} from './ReloadFirearm';

/**
 * Create the Deadlands pipeline registry
 *
 * Currently registers:
 * - Reload Firearm (RELOAD_FIREARM intent type)
 *
 * Future PRs will add more rules without changing this structure.
 */
export function createDeadlandsPipelineRegistry(): PipelineRegistry {
  // Create the pipelines
  const reloadFirearmPipeline = createReloadFirearmPipeline();

  // Build the claims list
  const claims: RuleAuthorityClaim[] = [
    {
      rulesetId: DEADLANDS_CORE_RULESET_ID,
      intentType: RELOAD_FIREARM_INTENT_TYPE,
    },
  ];

  // Build the pipeline map
  const pipelines = new Map<RulesetId, RulesPipeline>();
  pipelines.set(DEADLANDS_CORE_RULESET_ID, reloadFirearmPipeline);

  return {
    getAuthorityClaims(): readonly RuleAuthorityClaim[] {
      return claims;
    },

    getPipeline(rulesetId: RulesetId): RulesPipeline | null {
      return pipelines.get(rulesetId) ?? null;
    },
  };
}
