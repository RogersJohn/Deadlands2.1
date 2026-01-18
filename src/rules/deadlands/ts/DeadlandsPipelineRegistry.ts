/**
 * Deadlands Pipeline Registry (PR 4.0, updated PR 4.2)
 *
 * Wires up Deadlands rules pipelines to the adapter.
 *
 * This registry:
 * - Registers the Reload Firearm pipeline
 * - Provides authority claims for intent routing
 * - Supports multiple validators per intent type (PR 4.2)
 * - Does NOT interpret intents or apply rules
 *
 * The adapter queries this registry to find pipelines.
 */

import type {
  PipelineRegistry,
  RuleAuthorityClaim,
  RulesetId,
  RulesPipeline,
  IntentType,
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
 * PR 4.2: Now supports multiple validators per intent type.
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

  // Build intent-to-pipelines map for aggregation (PR 4.2)
  const intentToPipelines = new Map<IntentType, RulesPipeline[]>();
  for (const claim of claims) {
    const existing = intentToPipelines.get(claim.intentType) ?? [];
    const pipeline = pipelines.get(claim.rulesetId);
    if (pipeline) {
      existing.push(pipeline);
      intentToPipelines.set(claim.intentType, existing);
    }
  }

  return {
    getAuthorityClaims(): readonly RuleAuthorityClaim[] {
      return claims;
    },

    getPipeline(rulesetId: RulesetId): RulesPipeline | null {
      return pipelines.get(rulesetId) ?? null;
    },

    /**
     * Get all pipelines for an intent type (PR 4.2)
     *
     * Returns ALL pipelines that claim authority for this intent type.
     * Does NOT resolve conflicts. Does NOT short-circuit.
     */
    getPipelinesForIntent(intentType: IntentType): readonly RulesPipeline[] {
      return intentToPipelines.get(intentType) ?? [];
    },
  };
}
