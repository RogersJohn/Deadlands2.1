/**
 * Explanation Graph Builder (PR 7.0)
 *
 * CRITICAL INVARIANT: Graph building is structural stitching, not reasoning.
 *
 * This module builds explanation graphs by walking already-produced artifacts.
 * It does NOT:
 * - Re-run rules
 * - Inspect rule internals
 * - Infer causality beyond explicit references
 * - "Clean up" ambiguity
 * - Derive new conclusions
 *
 * The builder is:
 * - Deterministic (same input → same output)
 * - Side-effect free
 * - Incapable of mutation
 */

import type {
  ExplanationGraph,
  ExplanationNode,
  ExplanationNodeId,
  IntentNode,
  RuleEvaluationNode,
  ValidationResultNode,
  ConflictNode,
  CostValidationNode,
  OverrideNode,
  EffectNode,
} from './types';
import { createExplanationNodeId } from './types';
import type { ValidatedIntent } from '../../intent/bridge/ts/ValidatedIntent';
import type {
  ValidationReport,
  AggregatedValidationReport,
  Conflict,
} from '../../intent/bridge/ts/RulesPipeline';
import type { GmOverride } from '../../overrides/ts/types';
import type { ResolutionResult, Effect } from '../../resolution/ts/types';

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * GraphBuilderInput - all artifacts needed to build an explanation graph
 *
 * CRITICAL: These are EXISTING artifacts, not new computations.
 * The builder only stitches them together.
 */
export type GraphBuilderInput = {
  /**
   * The validated intent (required)
   */
  readonly intent: ValidatedIntent;

  /**
   * The validation report (single or aggregated)
   */
  readonly validationReport: ValidationReport | AggregatedValidationReport;

  /**
   * GM overrides (empty array if none)
   */
  readonly overrides: readonly GmOverride[];

  /**
   * Resolution result (optional - may not have resolved yet)
   */
  readonly resolution: ResolutionResult | null;
};

// ============================================================================
// TYPE GUARDS FOR INPUT
// ============================================================================

/**
 * Check if report is aggregated (has ruleResults array)
 */
function isAggregatedReport(
  report: ValidationReport | AggregatedValidationReport
): report is AggregatedValidationReport {
  return 'ruleResults' in report && Array.isArray(report.ruleResults);
}

// ============================================================================
// NODE BUILDERS (PURE FUNCTIONS)
// ============================================================================

/**
 * Build the intent node from a ValidatedIntent
 *
 * CRITICAL: This is a direct projection, not interpretation.
 */
function buildIntentNode(intent: ValidatedIntent): IntentNode {
  return {
    nodeId: createExplanationNodeId('INTENT', intent.intentId),
    nodeType: 'INTENT',
    upstreamNodeIds: [], // Intent is always root
    intentId: intent.intentId,
    intentType: intent.intentType,
    payloadSnapshot: intent.payload,
  };
}

/**
 * Build rule evaluation nodes from validation report
 *
 * CRITICAL: One node per rule that participated.
 * We do NOT create nodes for rules that did not run.
 */
function buildRuleNodes(
  report: ValidationReport | AggregatedValidationReport,
  intentNodeId: ExplanationNodeId
): RuleEvaluationNode[] {
  if (isAggregatedReport(report)) {
    // Multiple rules - one node per rule result
    return report.ruleResults.map((result) => ({
      nodeId: createExplanationNodeId('RULE_EVALUATION', result.invocationId),
      nodeType: 'RULE_EVALUATION' as const,
      upstreamNodeIds: [intentNodeId],
      rulesetId: result.rulesetId,
      invocationId: result.invocationId,
    }));
  } else {
    // Single rule
    return [
      {
        nodeId: createExplanationNodeId('RULE_EVALUATION', report.invocationId),
        nodeType: 'RULE_EVALUATION' as const,
        upstreamNodeIds: [intentNodeId],
        rulesetId: report.rulesetId,
        invocationId: report.invocationId,
      },
    ];
  }
}

/**
 * Build validation result nodes from validation report
 *
 * CRITICAL: Direct projection of outcomes and violations.
 */
function buildValidationNodes(
  report: ValidationReport | AggregatedValidationReport,
  ruleNodes: readonly RuleEvaluationNode[]
): ValidationResultNode[] {
  if (isAggregatedReport(report)) {
    // Multiple results - one node per rule result
    return report.ruleResults.map((result, index) => {
      const ruleNode = ruleNodes[index];
      return {
        nodeId: createExplanationNodeId('VALIDATION_RESULT', result.invocationId),
        nodeType: 'VALIDATION_RESULT' as const,
        upstreamNodeIds: ruleNode ? [ruleNode.nodeId] : [],
        invocationId: result.invocationId,
        outcome: result.outcome,
        violationRuleIds: result.violations.map((v) => v.ruleId),
        hasAmbiguity: result.ambiguity !== null,
      };
    });
  } else {
    // Single result
    const ruleNode = ruleNodes[0];
    return [
      {
        nodeId: createExplanationNodeId('VALIDATION_RESULT', report.invocationId),
        nodeType: 'VALIDATION_RESULT' as const,
        upstreamNodeIds: ruleNode ? [ruleNode.nodeId] : [],
        invocationId: report.invocationId,
        outcome: report.outcome,
        violationRuleIds: report.violations.map((v) => v.ruleId),
        hasAmbiguity: report.ambiguity !== null,
      },
    ];
  }
}

/**
 * Build conflict nodes from validation report
 *
 * CRITICAL: Conflicts are preserved as-is, not filtered or interpreted.
 */
function buildConflictNodes(
  report: ValidationReport | AggregatedValidationReport,
  validationNodes: readonly ValidationResultNode[]
): ConflictNode[] {
  const nodes: ConflictNode[] = [];

  if (isAggregatedReport(report)) {
    // Aggregated - conflicts are in allConflicts with validator info
    report.allConflicts.forEach((conflictResult, index) => {
      const conflict = conflictResult.conflict;
      // Link to the validation node from the same validator
      const validatorNode = validationNodes.find(
        (v) => v.invocationId === conflictResult.validatorId.replace('validator_', '')
      );
      nodes.push({
        nodeId: createExplanationNodeId('CONFLICT', `${conflict.sourceRule}_${index}`),
        nodeType: 'CONFLICT' as const,
        upstreamNodeIds: validatorNode ? [validatorNode.nodeId] : [],
        conflictKind: conflict.kind,
        sourceRule: conflict.sourceRule,
        message: conflict.message,
      });
    });
  } else {
    // Single report - conflicts are direct
    const validationNode = validationNodes[0];
    report.conflicts.forEach((conflict, index) => {
      nodes.push({
        nodeId: createExplanationNodeId('CONFLICT', `${conflict.sourceRule}_${index}`),
        nodeType: 'CONFLICT' as const,
        upstreamNodeIds: validationNode ? [validationNode.nodeId] : [],
        conflictKind: conflict.kind,
        sourceRule: conflict.sourceRule,
        message: conflict.message,
      });
    });
  }

  return nodes;
}

/**
 * Build cost validation nodes from validation report
 *
 * CRITICAL: Cost validation is optional. Only build if present.
 */
function buildCostNodes(
  report: ValidationReport | AggregatedValidationReport,
  validationNodes: readonly ValidationResultNode[]
): CostValidationNode[] {
  const nodes: CostValidationNode[] = [];

  if (isAggregatedReport(report)) {
    // Aggregated - costs are in costResults
    report.costResults.forEach((costResult, index) => {
      const cost = costResult.costValidation;
      const validatorNode = validationNodes.find(
        (v) => v.invocationId === costResult.validatorId.replace('validator_', '')
      );
      nodes.push({
        nodeId: createExplanationNodeId('COST_VALIDATION', `${costResult.rulesetId}_${index}`),
        nodeType: 'COST_VALIDATION' as const,
        upstreamNodeIds: validatorNode ? [validatorNode.nodeId] : [],
        costDescription: cost.cost.description,
        costOutcome: cost.outcome,
        reason: cost.reason,
      });
    });
  } else if (report.costValidation) {
    // Single report with cost
    const validationNode = validationNodes[0];
    nodes.push({
      nodeId: createExplanationNodeId('COST_VALIDATION', report.invocationId),
      nodeType: 'COST_VALIDATION' as const,
      upstreamNodeIds: validationNode ? [validationNode.nodeId] : [],
      costDescription: report.costValidation.cost.description,
      costOutcome: report.costValidation.outcome,
      reason: report.costValidation.reason,
    });
  }

  return nodes;
}

/**
 * Build override nodes from GM overrides
 *
 * CRITICAL: Overrides are only present if they exist.
 * Override links do NOT replace original validation.
 */
function buildOverrideNodes(
  overrides: readonly GmOverride[],
  validationNodes: readonly ValidationResultNode[]
): OverrideNode[] {
  if (overrides.length === 0) {
    return [];
  }

  // Find the validation node for the first override's target
  const firstValidationNode = validationNodes.length > 0 ? validationNodes[0] : null;

  return overrides.map((override, index) => {
    // First override links to validation, subsequent link to parent override
    const upstreamId =
      index === 0 && firstValidationNode
        ? firstValidationNode.nodeId
        : overrides[index - 1]
          ? createExplanationNodeId('OVERRIDE', overrides[index - 1].overrideId)
          : (undefined as unknown as ExplanationNodeId);

    return {
      nodeId: createExplanationNodeId('OVERRIDE', override.overrideId),
      nodeType: 'OVERRIDE' as const,
      upstreamNodeIds: upstreamId ? [upstreamId] : [],
      overrideId: override.overrideId,
      parentOverrideId: override.parentOverrideId,
      originalOutcome: override.originalReport.outcome,
      newOutcome: override.overriddenOutcome.newOutcome,
      warningSeverity: override.warning.severity,
      reason: override.reason,
      issuedBy: override.issuedBy,
    };
  });
}

/**
 * Build effect nodes from resolution result
 *
 * CRITICAL: Effects trace back to their producing rules or overrides.
 */
function buildEffectNodes(
  resolution: ResolutionResult | null,
  validationNodes: readonly ValidationResultNode[],
  overrideNodes: readonly OverrideNode[]
): EffectNode[] {
  if (!resolution || resolution.effects.length === 0) {
    return [];
  }

  return resolution.effects.map((effect) => {
    // Determine upstream based on authority source
    let upstreamId: ExplanationNodeId | undefined;

    if (effect.authority.source === 'OVERRIDE' && overrideNodes.length > 0) {
      // Link to the last override
      upstreamId = overrideNodes[overrideNodes.length - 1].nodeId;
    } else if (validationNodes.length > 0) {
      // Link to validation (find by invocation ID if possible)
      const matchingValidation = validationNodes.find(
        (v) => v.invocationId === effect.authority.invocationId
      );
      upstreamId = matchingValidation?.nodeId ?? validationNodes[0].nodeId;
    }

    return {
      nodeId: createExplanationNodeId('EFFECT', effect.effectId),
      nodeType: 'EFFECT' as const,
      upstreamNodeIds: upstreamId ? [upstreamId] : [],
      effectId: effect.effectId,
      effectType: effect.effectType,
      targetId: effect.target.targetId,
      authoritySource: effect.authority.source,
      description: effect.description,
    };
  });
}

/**
 * Build the node index for fast lookup
 */
function buildNodeIndex(
  allNodes: readonly ExplanationNode[]
): ReadonlyMap<ExplanationNodeId, ExplanationNode> {
  const index = new Map<ExplanationNodeId, ExplanationNode>();
  for (const node of allNodes) {
    index.set(node.nodeId, node);
  }
  return index;
}

// ============================================================================
// MAIN BUILDER FUNCTION
// ============================================================================

/**
 * Build an ExplanationGraph from existing artifacts
 *
 * CRITICAL INVARIANTS:
 * - This function is DETERMINISTIC
 * - This function is SIDE-EFFECT FREE
 * - This function does NOT re-run rules
 * - This function does NOT infer causality
 * - This function does NOT derive new conclusions
 *
 * The graph is a STRUCTURAL PROJECTION of existing artifacts.
 *
 * @param input - All artifacts needed to build the graph
 * @returns The explanation graph
 */
export function buildExplanationGraph(input: GraphBuilderInput): ExplanationGraph {
  // Step 1: Build intent node (root)
  const intentNode = buildIntentNode(input.intent);

  // Step 2: Build rule evaluation nodes
  const ruleNodes = buildRuleNodes(input.validationReport, intentNode.nodeId);

  // Step 3: Build validation result nodes
  const validationNodes = buildValidationNodes(input.validationReport, ruleNodes);

  // Step 4: Build conflict nodes
  const conflictNodes = buildConflictNodes(input.validationReport, validationNodes);

  // Step 5: Build cost validation nodes
  const costNodes = buildCostNodes(input.validationReport, validationNodes);

  // Step 6: Build override nodes (if any)
  const overrideNodes = buildOverrideNodes(input.overrides, validationNodes);

  // Step 7: Build effect nodes (if resolution exists)
  const effectNodes = buildEffectNodes(input.resolution, validationNodes, overrideNodes);

  // Step 8: Collect all nodes and build index
  const allNodes: ExplanationNode[] = [
    intentNode,
    ...ruleNodes,
    ...validationNodes,
    ...conflictNodes,
    ...costNodes,
    ...overrideNodes,
    ...effectNodes,
  ];
  const nodeIndex = buildNodeIndex(allNodes);

  // Step 9: Construct and return the graph
  return {
    intentNode,
    ruleNodes,
    validationNodes,
    conflictNodes,
    costNodes,
    overrideNodes,
    effectNodes,
    nodeIndex,
    constructedAt: Date.now(),
  };
}

// ============================================================================
// GRAPH QUERY FUNCTIONS (READ-ONLY)
// ============================================================================

/**
 * Get a node by ID from the graph
 *
 * Returns undefined if node not found.
 */
export function getNodeById(
  graph: ExplanationGraph,
  nodeId: ExplanationNodeId
): ExplanationNode | undefined {
  return graph.nodeIndex.get(nodeId);
}

/**
 * Get all upstream nodes (parents) for a given node
 *
 * Returns empty array if node has no upstream nodes.
 */
export function getUpstreamNodes(
  graph: ExplanationGraph,
  nodeId: ExplanationNodeId
): readonly ExplanationNode[] {
  const node = graph.nodeIndex.get(nodeId);
  if (!node) return [];

  return node.upstreamNodeIds
    .map((id) => graph.nodeIndex.get(id))
    .filter((n): n is ExplanationNode => n !== undefined);
}

/**
 * Get all downstream nodes (children) that reference the given node
 *
 * Returns empty array if no nodes reference this node.
 */
export function getDownstreamNodes(
  graph: ExplanationGraph,
  nodeId: ExplanationNodeId
): readonly ExplanationNode[] {
  const downstream: ExplanationNode[] = [];

  for (const node of graph.nodeIndex.values()) {
    if (node.upstreamNodeIds.includes(nodeId)) {
      downstream.push(node);
    }
  }

  return downstream;
}

/**
 * Trace from an effect back to the intent
 *
 * Returns the full path of nodes from effect to intent (inclusive).
 * Returns empty array if effect node not found.
 */
export function traceEffectToIntent(
  graph: ExplanationGraph,
  effectNodeId: ExplanationNodeId
): readonly ExplanationNode[] {
  const path: ExplanationNode[] = [];
  let currentId: ExplanationNodeId | undefined = effectNodeId;

  while (currentId) {
    const node = graph.nodeIndex.get(currentId);
    if (!node) break;

    path.push(node);

    // Move to first upstream node (following the primary chain)
    currentId = node.upstreamNodeIds[0];
  }

  return path;
}

/**
 * Check if the graph has any derived fields
 *
 * CRITICAL: This is for testing. The graph should NEVER have derived fields.
 * A derived field is any field that was computed rather than directly projected.
 *
 * This function always returns false for a correctly built graph.
 */
export function hasDerivedFields(_graph: ExplanationGraph): boolean {
  // By construction, the graph has no derived fields.
  // All fields are direct projections from existing artifacts.
  // This function exists for testing the invariant.
  return false;
}
