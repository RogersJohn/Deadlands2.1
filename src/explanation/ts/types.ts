/**
 * Explanation Graph Types (PR 7.0)
 *
 * CRITICAL INVARIANT: Explanation is structural trace, not reasoning.
 *
 * This module defines the data model for explanation graphs that
 * link existing artifacts into a traceable authority chain.
 *
 * KILL CRITERIA (any violation fails PR 7.0):
 * - Re-evaluating rules to explain outcomes
 * - Deriving new conclusions during explanation
 * - Collapsing results into summaries
 * - Introducing precedence or ordering semantics
 * - Explaining what should have happened
 * - Persuading or justifying outcomes
 * - AI involvement in explanation generation
 * - Missing links in the chain
 *
 * Explanation must be purely referential.
 * The graph shows, it does not argue.
 */

// ============================================================================
// NODE IDENTIFIER TYPES
// ============================================================================

/**
 * Opaque identifier for explanation nodes - branded to prevent interchange
 */
declare const EXPLANATION_NODE_ID_BRAND: unique symbol;
export type ExplanationNodeId = string & { readonly [EXPLANATION_NODE_ID_BRAND]: never };

/**
 * Node type discriminator
 *
 * Each node type represents a stage in the authority chain.
 * Types are LABELS, not logic drivers.
 */
export type ExplanationNodeType =
  | 'INTENT'
  | 'RULE_EVALUATION'
  | 'VALIDATION_RESULT'
  | 'CONFLICT'
  | 'COST_VALIDATION'
  | 'OVERRIDE'
  | 'EFFECT';

// ============================================================================
// BASE NODE STRUCTURE
// ============================================================================

/**
 * Base node structure - all nodes share this shape
 *
 * CRITICAL: Nodes contain REFERENCES to existing artifacts.
 * Nodes do NOT contain derived meaning or interpretation.
 */
export type ExplanationNodeBase = {
  /**
   * Stable, unique identifier for this node
   */
  readonly nodeId: ExplanationNodeId;

  /**
   * Node type discriminator
   */
  readonly nodeType: ExplanationNodeType;

  /**
   * References to upstream nodes (parent causes)
   *
   * Empty array means this is a root node.
   * Multiple entries mean multiple upstream causes.
   */
  readonly upstreamNodeIds: readonly ExplanationNodeId[];
};

// ============================================================================
// INTENT NODE
// ============================================================================

/**
 * IntentNode - represents the validated intent that started the chain
 *
 * This is always the root of the explanation graph.
 * There is exactly one intent node per graph.
 */
export type IntentNode = ExplanationNodeBase & {
  readonly nodeType: 'INTENT';

  /**
   * Reference to the source intent ID
   *
   * This is the ID from ValidatedIntent, not a copy.
   */
  readonly intentId: string;

  /**
   * Intent type (opaque string)
   */
  readonly intentType: string;

  /**
   * Snapshot of the intent payload
   *
   * This is a reference to existing data, not a transformation.
   */
  readonly payloadSnapshot: unknown;
};

// ============================================================================
// RULE EVALUATION NODE
// ============================================================================

/**
 * RuleEvaluationNode - represents a rule that was evaluated
 *
 * One node per rule that participated in validation.
 * Does NOT represent rules that were not applicable.
 */
export type RuleEvaluationNode = ExplanationNodeBase & {
  readonly nodeType: 'RULE_EVALUATION';

  /**
   * Ruleset ID that produced this evaluation
   */
  readonly rulesetId: string;

  /**
   * Invocation ID for this specific evaluation
   */
  readonly invocationId: string;
};

// ============================================================================
// VALIDATION RESULT NODE
// ============================================================================

/**
 * ValidationResultNode - represents the outcome of rule validation
 *
 * One node per validation result (may be multiple if aggregated).
 */
export type ValidationResultNode = ExplanationNodeBase & {
  readonly nodeType: 'VALIDATION_RESULT';

  /**
   * Invocation ID this result belongs to
   */
  readonly invocationId: string;

  /**
   * The outcome from this validation
   *
   * This is a direct reference, not interpretation.
   */
  readonly outcome: 'PASS' | 'FAIL' | 'AMBIGUOUS';

  /**
   * Reference to violations by rule ID
   *
   * This is a list of rule IDs, not the violations themselves.
   * The violations can be looked up from the original report.
   */
  readonly violationRuleIds: readonly string[];

  /**
   * Whether ambiguity was present
   */
  readonly hasAmbiguity: boolean;
};

// ============================================================================
// CONFLICT NODE
// ============================================================================

/**
 * ConflictNode - represents a conflict detected during validation
 *
 * One node per conflict. Conflicts are preserved as-is.
 */
export type ConflictNode = ExplanationNodeBase & {
  readonly nodeType: 'CONFLICT';

  /**
   * Conflict kind (opaque label)
   *
   * This is a direct reference, not interpretation.
   */
  readonly conflictKind: 'HardBlock' | 'SoftBlock' | 'Informational';

  /**
   * Source rule that detected this conflict
   */
  readonly sourceRule: string;

  /**
   * Conflict message (preserved as-is)
   */
  readonly message: string;
};

// ============================================================================
// COST VALIDATION NODE
// ============================================================================

/**
 * CostValidationNode - represents cost validation result
 *
 * One node per cost validation. Optional (not all rules declare costs).
 */
export type CostValidationNode = ExplanationNodeBase & {
  readonly nodeType: 'COST_VALIDATION';

  /**
   * Cost description (preserved as-is)
   */
  readonly costDescription: string;

  /**
   * Cost validation outcome
   */
  readonly costOutcome: 'SATISFIED' | 'UNSATISFIED' | 'AMBIGUOUS';

  /**
   * Reason for the outcome (preserved as-is)
   */
  readonly reason: string;
};

// ============================================================================
// OVERRIDE NODE
// ============================================================================

/**
 * OverrideNode - represents a GM override decision
 *
 * One node per override in the chain. Only present if overrides exist.
 *
 * PR 7.1 ADDITION: policyId field for policy-based overrides.
 * This field appears ONLY when the override was created via a policy.
 * Policy-based overrides are otherwise identical to manual overrides.
 */
export type OverrideNode = ExplanationNodeBase & {
  readonly nodeType: 'OVERRIDE';

  /**
   * Override ID
   */
  readonly overrideId: string;

  /**
   * Parent override ID (null if first in chain)
   */
  readonly parentOverrideId: string | null;

  /**
   * Original outcome before override
   */
  readonly originalOutcome: 'PASS' | 'FAIL' | 'AMBIGUOUS';

  /**
   * New outcome after override
   */
  readonly newOutcome: 'PASS' | 'FAIL' | 'AMBIGUOUS';

  /**
   * Warning severity
   */
  readonly warningSeverity: 'INFO' | 'WARNING' | 'CRITICAL';

  /**
   * Override reason (preserved as-is)
   */
  readonly reason: string;

  /**
   * Who issued the override
   */
  readonly issuedBy: string;

  /**
   * Policy ID if this override was created via a policy (PR 7.1)
   *
   * CRITICAL: This field is ONLY present for policy-based overrides.
   * - undefined means manual override (no policy involved)
   * - A value means the override was explicitly invoked via this policy
   *
   * The presence of this field does NOT change behavior.
   * It exists only for traceability.
   */
  readonly policyId?: string;
};

// ============================================================================
// EFFECT NODE
// ============================================================================

/**
 * EffectNode - represents an effect produced by resolution
 *
 * One node per effect. Effects trace back to their producing rules.
 */
export type EffectNode = ExplanationNodeBase & {
  readonly nodeType: 'EFFECT';

  /**
   * Effect ID
   */
  readonly effectId: string;

  /**
   * Effect type
   */
  readonly effectType: string;

  /**
   * Target of the effect
   */
  readonly targetId: string;

  /**
   * Authority source ('RULES' or 'OVERRIDE')
   */
  readonly authoritySource: 'RULES' | 'OVERRIDE';

  /**
   * Effect description (preserved as-is)
   */
  readonly description: string;
};

// ============================================================================
// UNION TYPE FOR ALL NODES
// ============================================================================

/**
 * ExplanationNode - discriminated union of all node types
 */
export type ExplanationNode =
  | IntentNode
  | RuleEvaluationNode
  | ValidationResultNode
  | ConflictNode
  | CostValidationNode
  | OverrideNode
  | EffectNode;

// ============================================================================
// EXPLANATION GRAPH
// ============================================================================

/**
 * ExplanationGraph - the complete traceable authority chain
 *
 * CRITICAL INVARIANTS:
 * - Graph is DATA ONLY - no logic, no inference
 * - Graph is STRUCTURAL - links existing artifacts
 * - Graph is COMPLETE - every stage is present or explicitly absent
 * - Graph is IMMUTABLE - never modified after construction
 *
 * The graph represents a faithful trace of what happened.
 * It does not explain WHY (in a reasoning sense).
 * It only shows WHAT was linked to WHAT.
 */
export type ExplanationGraph = {
  /**
   * The intent node (always present, always one)
   */
  readonly intentNode: IntentNode;

  /**
   * Rule evaluation nodes (may be empty if no applicable rules)
   */
  readonly ruleNodes: readonly RuleEvaluationNode[];

  /**
   * Validation result nodes (one per rule that ran)
   */
  readonly validationNodes: readonly ValidationResultNode[];

  /**
   * Conflict nodes (may be empty if no conflicts)
   */
  readonly conflictNodes: readonly ConflictNode[];

  /**
   * Cost validation nodes (may be empty if no costs declared)
   */
  readonly costNodes: readonly CostValidationNode[];

  /**
   * Override nodes (empty if no overrides applied)
   */
  readonly overrideNodes: readonly OverrideNode[];

  /**
   * Effect nodes (may be empty if no effects produced)
   */
  readonly effectNodes: readonly EffectNode[];

  /**
   * All nodes indexed by ID for lookup
   *
   * This is a convenience structure, not additional data.
   */
  readonly nodeIndex: ReadonlyMap<ExplanationNodeId, ExplanationNode>;

  /**
   * Timestamp when graph was constructed
   *
   * This proves the graph is a point-in-time snapshot.
   */
  readonly constructedAt: number;
};

// ============================================================================
// FACTORY FUNCTIONS FOR NODE IDS
// ============================================================================

/**
 * Create an ExplanationNodeId from a string
 *
 * Convention: nodeId = nodeType + "_" + sourceId
 */
export function createExplanationNodeId(
  nodeType: ExplanationNodeType,
  sourceId: string
): ExplanationNodeId {
  return `${nodeType}_${sourceId}` as ExplanationNodeId;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for IntentNode
 */
export function isIntentNode(node: ExplanationNode): node is IntentNode {
  return node.nodeType === 'INTENT';
}

/**
 * Type guard for RuleEvaluationNode
 */
export function isRuleEvaluationNode(node: ExplanationNode): node is RuleEvaluationNode {
  return node.nodeType === 'RULE_EVALUATION';
}

/**
 * Type guard for ValidationResultNode
 */
export function isValidationResultNode(node: ExplanationNode): node is ValidationResultNode {
  return node.nodeType === 'VALIDATION_RESULT';
}

/**
 * Type guard for ConflictNode
 */
export function isConflictNode(node: ExplanationNode): node is ConflictNode {
  return node.nodeType === 'CONFLICT';
}

/**
 * Type guard for CostValidationNode
 */
export function isCostValidationNode(node: ExplanationNode): node is CostValidationNode {
  return node.nodeType === 'COST_VALIDATION';
}

/**
 * Type guard for OverrideNode
 */
export function isOverrideNode(node: ExplanationNode): node is OverrideNode {
  return node.nodeType === 'OVERRIDE';
}

/**
 * Type guard for EffectNode
 */
export function isEffectNode(node: ExplanationNode): node is EffectNode {
  return node.nodeType === 'EFFECT';
}

/**
 * Type guard for ExplanationGraph
 */
export function isExplanationGraph(value: unknown): value is ExplanationGraph {
  if (typeof value !== 'object' || value === null) return false;
  const graph = value as ExplanationGraph;

  return (
    typeof graph.intentNode === 'object' &&
    graph.intentNode !== null &&
    graph.intentNode.nodeType === 'INTENT' &&
    Array.isArray(graph.ruleNodes) &&
    Array.isArray(graph.validationNodes) &&
    Array.isArray(graph.conflictNodes) &&
    Array.isArray(graph.costNodes) &&
    Array.isArray(graph.overrideNodes) &&
    Array.isArray(graph.effectNodes) &&
    typeof graph.constructedAt === 'number'
  );
}
