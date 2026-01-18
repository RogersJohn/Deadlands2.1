/**
 * Deadlands Rules Module (PR 4.0)
 *
 * First real Deadlands/Savage Worlds rules implementation.
 *
 * Currently implements:
 * - Reload Firearm rule (RELOAD_FIREARM intent type)
 *
 * This module exports:
 * - Pipeline registry for adapter integration
 * - Effect producers for resolution integration
 * - Types for UI intent construction
 */

// ============================================================================
// PIPELINE REGISTRY
// ============================================================================

export { createDeadlandsPipelineRegistry } from './DeadlandsPipelineRegistry';

// ============================================================================
// RELOAD FIREARM RULE
// ============================================================================

export type { ReloadFirearmPayload } from './ReloadFirearm';

export {
  DEADLANDS_CORE_RULESET_ID,
  RELOAD_FIREARM_INTENT_TYPE,
  createReloadFirearmPipeline,
  RulesOutcome,
  RELOAD_ACTION_COST,
} from './ReloadFirearm';

// ============================================================================
// EFFECT PRODUCERS
// ============================================================================

export { produceReloadFirearmEffects } from './ReloadFirearmEffects';
