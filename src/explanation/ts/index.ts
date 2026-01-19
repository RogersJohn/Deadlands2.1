/**
 * Explanation Graph Module Exports (PR 7.0)
 *
 * CRITICAL INVARIANT: Explanation is structural trace, not reasoning.
 *
 * This module exports types and functions for building explanation graphs
 * that trace the authority chain from intent to effects.
 */

// Types
export type {
  ExplanationNodeId,
  ExplanationNodeType,
  ExplanationNodeBase,
  IntentNode,
  RuleEvaluationNode,
  ValidationResultNode,
  ConflictNode,
  CostValidationNode,
  OverrideNode,
  EffectNode,
  ExplanationNode,
  ExplanationGraph,
} from './types';

// Type factory
export { createExplanationNodeId } from './types';

// Type guards
export {
  isIntentNode,
  isRuleEvaluationNode,
  isValidationResultNode,
  isConflictNode,
  isCostValidationNode,
  isOverrideNode,
  isEffectNode,
  isExplanationGraph,
} from './types';

// Builder input type
export type { GraphBuilderInput } from './GraphBuilder';

// Graph builder
export { buildExplanationGraph } from './GraphBuilder';

// Graph query functions
export {
  getNodeById,
  getUpstreamNodes,
  getDownstreamNodes,
  traceEffectToIntent,
  hasDerivedFields,
} from './GraphBuilder';
