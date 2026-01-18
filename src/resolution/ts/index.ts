/**
 * Resolution / Effects Module (PR 2.1)
 *
 * Core principle: Resolution describes consequences; it does not execute them.
 *
 * This module translates authoritative decisions into declarative effects.
 * Effects describe what WOULD happen, not what DOES happen.
 *
 * Invariants:
 * - No state mutation
 * - No dice rolling
 * - No Savage Worlds math
 * - No execution logic
 * - Effects are produced, never applied
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  AuthoritativeDecision,
  Effect,
  EffectAuthority,
  EffectTarget,
  ResolutionResult,
  ResolutionViolation,
} from './types';

export {
  EffectType,
  ResolutionOutcome,
  ResolutionViolationCode,
  RulesOutcome,
  createAuthoritativeDecision,
} from './types';

// ============================================================================
// RESOLUTION
// ============================================================================

export {
  resolve,
  createEffectProducerRegistry,
  createEffectAuthority,
  generateEffectId,
  type EffectProducer,
  type EffectProducerRegistry,
} from './Resolution';

// ============================================================================
// EFFECT FACTORIES
// ============================================================================

export {
  createApplyConditionEffect,
  createConsumeResourceEffect,
  createDealDamageEffect,
  createChangePositionEffect,
  createTriggerNarrativeEffect,
  createGrantResourceEffect,
  createRemoveConditionEffect,
} from './effects';

export type {
  ApplyConditionParameters,
  ConsumeResourceParameters,
  DealDamageParameters,
  ChangePositionParameters,
  TriggerNarrativeParameters,
  GrantResourceParameters,
  RemoveConditionParameters,
} from './effects';
