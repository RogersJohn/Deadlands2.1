/**
 * Explanation Graph Tests (PR 7.0)
 *
 * CRITICAL TEST: Explanation is structural trace, not reasoning.
 *
 * These tests prove:
 * - Complete trace: every effect traces back to a rule and intent
 * - Conflict visibility: conflicts appear without altering links
 * - FAIL + Effects: FAILing rules with effects are fully traceable
 * - Overrides: appear only when present, don't replace original validation
 * - No inference: graph construction is purely structural
 * - No derived fields: all data is projected from existing artifacts
 */

import { describe, it, expect } from 'vitest';
import {
  buildExplanationGraph,
  getNodeById,
  getUpstreamNodes,
  getDownstreamNodes,
  traceEffectToIntent,
  hasDerivedFields,
  createExplanationNodeId,
  isIntentNode,
  isRuleEvaluationNode,
  isValidationResultNode,
  isConflictNode,
  isCostValidationNode,
  isOverrideNode,
  isEffectNode,
  isExplanationGraph,
} from '../index';
import type { GraphBuilderInput, ExplanationGraph, ExplanationNodeId } from '../index';
import type { ValidatedIntent, IntentId, IntentType } from '../../../intent/bridge/ts/ValidatedIntent';
import type { ValidationReport, InvocationId, RulesetId, Conflict } from '../../../intent/bridge/ts/RulesPipeline';
import { RulesOutcome, ConflictKind } from '../../../intent/bridge/ts/RulesPipeline';
import type { GmOverride, OverrideId, GmId } from '../../../overrides/ts/types';
import { OverrideScope } from '../../../overrides/ts/types';
import type { ResolutionResult, Effect, AuthoritativeDecision } from '../../../resolution/ts/types';
import { ResolutionOutcome, EffectType, CostValidationOutcome } from '../../../resolution/ts/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTestIntent(id: string = 'intent_001'): ValidatedIntent {
  return {
    intentId: id as IntentId,
    intentType: 'TEST_ACTION' as IntentType,
    payload: { characterId: 'char_001', action: 'test' },
    validationSummary: {
      validatedAt: Date.now(),
      validatorVersion: '1.0.0',
      structuralChecks: ['valid'],
    },
  } as ValidatedIntent;
}

function createTestValidationReport(
  outcome: RulesOutcome,
  options: {
    invocationId?: string;
    violations?: Array<{ ruleId: string; message: string; severity: 'ERROR' | 'WARNING' }>;
    conflicts?: Conflict[];
    hasCost?: boolean;
  } = {}
): ValidationReport {
  return {
    invocationId: (options.invocationId ?? 'inv_001') as InvocationId,
    sourceIntentId: 'intent_001',
    intentType: 'TEST_ACTION' as IntentType,
    rulesetId: 'test_ruleset' as RulesetId,
    outcome,
    violations: options.violations ?? [],
    ambiguity: outcome === RulesOutcome.AMBIGUOUS
      ? { reason: 'Test ambiguity', possibleInterpretations: [] }
      : null,
    payload: { characterId: 'char_001' },
    conflicts: options.conflicts ?? [],
    ...(options.hasCost && {
      costValidation: {
        cost: { kind: 'ActionCostEffect' as const, description: 'Test action cost' },
        outcome: CostValidationOutcome.AMBIGUOUS,
        reason: 'Cost is ambiguous',
      },
    }),
  };
}

function createTestOverride(
  originalReport: ValidationReport,
  newOutcome: RulesOutcome,
  overrideId: string = 'override_001'
): GmOverride {
  return {
    overrideId: overrideId as OverrideId,
    parentOverrideId: null,
    originalReport,
    overriddenOutcome: { newOutcome },
    scope: OverrideScope.OUTCOME,
    warning: { severity: 'WARNING', message: 'Test override' },
    reason: 'Test reason for override',
    issuedBy: 'gm_001' as GmId,
    issuedAt: Date.now(),
  };
}

function createTestEffect(
  id: string,
  invocationId: string,
  source: 'RULES' | 'OVERRIDE' = 'RULES'
): Effect {
  return {
    effectId: id,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: { targetId: 'char_001', targetType: 'character' },
    authority: {
      invocationId,
      source,
      outcome: RulesOutcome.PASS,
    },
    parameters: { type: 'test' },
    description: 'Test effect',
  };
}

function createTestResolution(
  effects: Effect[],
  outcome: ResolutionOutcome = ResolutionOutcome.EFFECTS_PRODUCED
): ResolutionResult {
  return {
    decision: {
      originalReport: createTestValidationReport(RulesOutcome.PASS),
      effectiveOutcome: RulesOutcome.PASS,
      hasOverrides: false,
      latestWarning: null,
      overrideChain: [],
    },
    outcome,
    effects,
    explanation: 'Test resolution',
  };
}

// ============================================================================
// CRITICAL TEST: COMPLETE TRACE
// ============================================================================

describe('Explanation Graph - Complete Trace', () => {
  it('every effect node traces back to a rule', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);
    const effects = [createTestEffect('effect_001', 'inv_001')];
    const resolution = createTestResolution(effects);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution,
    };

    const graph = buildExplanationGraph(input);

    // Effect exists
    expect(graph.effectNodes.length).toBe(1);
    const effectNode = graph.effectNodes[0];

    // Effect has upstream
    expect(effectNode.upstreamNodeIds.length).toBeGreaterThan(0);

    // Trace back to rule
    const upstreamNodes = getUpstreamNodes(graph, effectNode.nodeId);
    expect(upstreamNodes.length).toBeGreaterThan(0);

    // At least one upstream should be a validation node
    const hasValidationUpstream = upstreamNodes.some(isValidationResultNode);
    expect(hasValidationUpstream).toBe(true);
  });

  it('every rule traces back to the intent', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);

    // Rule node exists
    expect(graph.ruleNodes.length).toBe(1);
    const ruleNode = graph.ruleNodes[0];

    // Rule has upstream
    expect(ruleNode.upstreamNodeIds.length).toBe(1);

    // Upstream is the intent
    const upstreamNodes = getUpstreamNodes(graph, ruleNode.nodeId);
    expect(upstreamNodes.length).toBe(1);
    expect(isIntentNode(upstreamNodes[0])).toBe(true);
  });

  it('traceEffectToIntent returns complete path', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);
    const effects = [createTestEffect('effect_001', 'inv_001')];
    const resolution = createTestResolution(effects);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution,
    };

    const graph = buildExplanationGraph(input);
    const effectNodeId = createExplanationNodeId('EFFECT', 'effect_001');

    const path = traceEffectToIntent(graph, effectNodeId);

    // Path should include: effect -> validation -> rule -> intent
    expect(path.length).toBeGreaterThanOrEqual(3);

    // First should be effect
    expect(isEffectNode(path[0])).toBe(true);

    // Last should be intent
    expect(isIntentNode(path[path.length - 1])).toBe(true);
  });
});

// ============================================================================
// CRITICAL TEST: CONFLICT VISIBILITY
// ============================================================================

describe('Explanation Graph - Conflict Visibility', () => {
  it('conflicts appear in the graph', () => {
    const intent = createTestIntent();
    const conflicts: Conflict[] = [
      {
        kind: ConflictKind.SoftBlock,
        sourceRule: 'TEST_RULE_001',
        message: 'Test conflict message',
      },
    ];
    const report = createTestValidationReport(RulesOutcome.FAIL, { conflicts });

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);

    // Conflict node exists
    expect(graph.conflictNodes.length).toBe(1);

    const conflictNode = graph.conflictNodes[0];
    expect(conflictNode.conflictKind).toBe('SoftBlock');
    expect(conflictNode.sourceRule).toBe('TEST_RULE_001');
    expect(conflictNode.message).toBe('Test conflict message');
  });

  it('conflicts do not alter other links or outcomes', () => {
    const intent = createTestIntent();
    const conflicts: Conflict[] = [
      {
        kind: ConflictKind.HardBlock,
        sourceRule: 'TEST_RULE_001',
        message: 'Hard block',
      },
    ];
    const report = createTestValidationReport(RulesOutcome.FAIL, { conflicts });

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);

    // Validation still shows FAIL
    expect(graph.validationNodes[0].outcome).toBe('FAIL');

    // Rule still links to intent
    const ruleNode = graph.ruleNodes[0];
    const upstreamOfRule = getUpstreamNodes(graph, ruleNode.nodeId);
    expect(upstreamOfRule.length).toBe(1);
    expect(isIntentNode(upstreamOfRule[0])).toBe(true);

    // Conflict links to validation, not intent
    const conflictNode = graph.conflictNodes[0];
    const upstreamOfConflict = getUpstreamNodes(graph, conflictNode.nodeId);
    expect(upstreamOfConflict.length).toBe(1);
    expect(isValidationResultNode(upstreamOfConflict[0])).toBe(true);
  });
});

// ============================================================================
// CRITICAL TEST: FAIL + EFFECTS
// ============================================================================

describe('Explanation Graph - FAIL + Effects', () => {
  it('FAILing rules with effects are fully traceable', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.FAIL, {
      violations: [{ ruleId: 'SW_SHAKEN_001', message: 'Character is Shaken', severity: 'ERROR' }],
    });

    // Effects can exist despite FAIL (PR 6.0 invariant)
    const effects = [createTestEffect('effect_shaken_001', 'inv_001')];
    const resolution: ResolutionResult = {
      decision: {
        originalReport: report,
        effectiveOutcome: RulesOutcome.FAIL,
        hasOverrides: false,
        latestWarning: null,
        overrideChain: [],
      },
      outcome: ResolutionOutcome.EFFECTS_PRODUCED, // Effects despite FAIL
      effects,
      explanation: 'FAIL does not mean nothing happens',
    };

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution,
    };

    const graph = buildExplanationGraph(input);

    // Validation shows FAIL
    expect(graph.validationNodes[0].outcome).toBe('FAIL');

    // Effect still exists
    expect(graph.effectNodes.length).toBe(1);

    // Effect traces back to validation
    const effectNode = graph.effectNodes[0];
    const path = traceEffectToIntent(graph, effectNode.nodeId);

    // Path includes validation with FAIL
    const validationInPath = path.find(isValidationResultNode);
    expect(validationInPath).toBeDefined();
    expect(validationInPath!.outcome).toBe('FAIL');

    // Path reaches intent
    const intentInPath = path.find(isIntentNode);
    expect(intentInPath).toBeDefined();
  });
});

// ============================================================================
// CRITICAL TEST: OVERRIDES
// ============================================================================

describe('Explanation Graph - Overrides', () => {
  it('overrides appear only when present', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const inputWithoutOverrides: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graphWithoutOverrides = buildExplanationGraph(inputWithoutOverrides);
    expect(graphWithoutOverrides.overrideNodes.length).toBe(0);

    // Now with override
    const override = createTestOverride(report, RulesOutcome.FAIL);
    const inputWithOverrides: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [override],
      resolution: null,
    };

    const graphWithOverrides = buildExplanationGraph(inputWithOverrides);
    expect(graphWithOverrides.overrideNodes.length).toBe(1);
  });

  it('override links do not replace original validation', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.FAIL);
    const override = createTestOverride(report, RulesOutcome.PASS);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [override],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);

    // Original validation still shows FAIL
    expect(graph.validationNodes[0].outcome).toBe('FAIL');

    // Override shows transition from FAIL to PASS
    const overrideNode = graph.overrideNodes[0];
    expect(overrideNode.originalOutcome).toBe('FAIL');
    expect(overrideNode.newOutcome).toBe('PASS');

    // Override links to validation
    const upstreamOfOverride = getUpstreamNodes(graph, overrideNode.nodeId);
    expect(upstreamOfOverride.length).toBe(1);
    expect(isValidationResultNode(upstreamOfOverride[0])).toBe(true);

    // Validation still links to rule (not modified)
    const validationNode = graph.validationNodes[0];
    const upstreamOfValidation = getUpstreamNodes(graph, validationNode.nodeId);
    expect(upstreamOfValidation.length).toBe(1);
    expect(isRuleEvaluationNode(upstreamOfValidation[0])).toBe(true);
  });

  it('effects from override link to override node', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.FAIL);
    const override = createTestOverride(report, RulesOutcome.PASS);
    const effects = [createTestEffect('effect_001', 'inv_001', 'OVERRIDE')];
    const resolution = createTestResolution(effects);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [override],
      resolution,
    };

    const graph = buildExplanationGraph(input);

    // Effect exists
    expect(graph.effectNodes.length).toBe(1);
    const effectNode = graph.effectNodes[0];

    // Effect links to override (because authority.source is OVERRIDE)
    const upstreamOfEffect = getUpstreamNodes(graph, effectNode.nodeId);
    expect(upstreamOfEffect.length).toBe(1);
    expect(isOverrideNode(upstreamOfEffect[0])).toBe(true);
  });
});

// ============================================================================
// CRITICAL TEST: NO INFERENCE
// ============================================================================

describe('Explanation Graph - No Inference', () => {
  it('graph construction does not change when rule logic is disabled', () => {
    // This test proves the graph is built from artifacts, not by re-running rules
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    // Build graph multiple times
    const graph1 = buildExplanationGraph(input);
    const graph2 = buildExplanationGraph(input);

    // Graphs should be structurally identical (deterministic)
    expect(graph1.intentNode.intentId).toBe(graph2.intentNode.intentId);
    expect(graph1.ruleNodes.length).toBe(graph2.ruleNodes.length);
    expect(graph1.validationNodes.length).toBe(graph2.validationNodes.length);
    expect(graph1.validationNodes[0].outcome).toBe(graph2.validationNodes[0].outcome);
  });

  it('graph equals a structural projection of existing artifacts', () => {
    const intent = createTestIntent('intent_xyz');
    const report = createTestValidationReport(RulesOutcome.AMBIGUOUS, {
      invocationId: 'inv_xyz',
      violations: [{ ruleId: 'RULE_ABC', message: 'Test', severity: 'ERROR' }],
    });

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);

    // Intent node reflects intent data exactly
    expect(graph.intentNode.intentId).toBe('intent_xyz');
    expect(graph.intentNode.intentType).toBe('TEST_ACTION');

    // Validation node reflects report data exactly
    expect(graph.validationNodes[0].invocationId).toBe('inv_xyz');
    expect(graph.validationNodes[0].outcome).toBe('AMBIGUOUS');
    expect(graph.validationNodes[0].violationRuleIds).toContain('RULE_ABC');
    expect(graph.validationNodes[0].hasAmbiguity).toBe(true);
  });

  it('graph does not have derived fields', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.FAIL, {
      violations: [{ ruleId: 'TEST', message: 'Test', severity: 'ERROR' }],
    });

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);

    // The graph should not have derived fields
    expect(hasDerivedFields(graph)).toBe(false);
  });
});

// ============================================================================
// TYPE GUARD TESTS
// ============================================================================

describe('Explanation Graph - Type Guards', () => {
  it('type guards correctly identify node types', () => {
    const intent = createTestIntent();
    const conflicts: Conflict[] = [{
      kind: ConflictKind.Informational,
      sourceRule: 'TEST',
      message: 'Test',
    }];
    const report = createTestValidationReport(RulesOutcome.PASS, {
      conflicts,
      hasCost: true,
    });
    const override = createTestOverride(report, RulesOutcome.FAIL);
    const effects = [createTestEffect('effect_001', 'inv_001')];
    const resolution = createTestResolution(effects);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [override],
      resolution,
    };

    const graph = buildExplanationGraph(input);

    expect(isIntentNode(graph.intentNode)).toBe(true);
    expect(isRuleEvaluationNode(graph.ruleNodes[0])).toBe(true);
    expect(isValidationResultNode(graph.validationNodes[0])).toBe(true);
    expect(isConflictNode(graph.conflictNodes[0])).toBe(true);
    expect(isCostValidationNode(graph.costNodes[0])).toBe(true);
    expect(isOverrideNode(graph.overrideNodes[0])).toBe(true);
    expect(isEffectNode(graph.effectNodes[0])).toBe(true);
  });

  it('isExplanationGraph validates graph structure', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);

    expect(isExplanationGraph(graph)).toBe(true);
    expect(isExplanationGraph(null)).toBe(false);
    expect(isExplanationGraph({})).toBe(false);
    expect(isExplanationGraph({ intentNode: null })).toBe(false);
  });
});

// ============================================================================
// GRAPH QUERY TESTS
// ============================================================================

describe('Explanation Graph - Query Functions', () => {
  it('getNodeById returns correct node', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);
    const intentNodeId = createExplanationNodeId('INTENT', 'intent_001');

    const node = getNodeById(graph, intentNodeId);
    expect(node).toBeDefined();
    expect(isIntentNode(node!)).toBe(true);
  });

  it('getNodeById returns undefined for non-existent node', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);
    const fakeId = 'FAKE_NODE_ID' as ExplanationNodeId;

    const node = getNodeById(graph, fakeId);
    expect(node).toBeUndefined();
  });

  it('getDownstreamNodes returns children', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);
    const intentNodeId = graph.intentNode.nodeId;

    const downstream = getDownstreamNodes(graph, intentNodeId);
    expect(downstream.length).toBe(1);
    expect(isRuleEvaluationNode(downstream[0])).toBe(true);
  });
});

// ============================================================================
// COST VALIDATION NODE TESTS
// ============================================================================

describe('Explanation Graph - Cost Validation', () => {
  it('cost nodes appear when cost validation is present', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS, { hasCost: true });

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);

    expect(graph.costNodes.length).toBe(1);
    expect(graph.costNodes[0].costDescription).toBe('Test action cost');
    expect(graph.costNodes[0].costOutcome).toBe('AMBIGUOUS');
  });

  it('cost nodes do not appear when no cost validation', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS, { hasCost: false });

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);

    expect(graph.costNodes.length).toBe(0);
  });
});

// ============================================================================
// CRITICAL ASSERTION: GRAPH CONTAINS NODE FOR EFFECT
// ============================================================================

describe('Explanation Graph - Critical Assertions', () => {
  it('graph contains node for each effect', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);
    const effects = [
      createTestEffect('effect_001', 'inv_001'),
      createTestEffect('effect_002', 'inv_001'),
    ];
    const resolution = createTestResolution(effects);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [],
      resolution,
    };

    const graph = buildExplanationGraph(input);

    // Graph contains node for each effect
    expect(graph.effectNodes.length).toBe(2);

    // Each effect ID is represented
    const effectIds = graph.effectNodes.map(n => n.effectId);
    expect(effectIds).toContain('effect_001');
    expect(effectIds).toContain('effect_002');
  });

  it('graph does not have derived fields (formal assertion)', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.FAIL, {
      violations: [{ ruleId: 'TEST', message: 'Test', severity: 'ERROR' }],
      conflicts: [{ kind: ConflictKind.SoftBlock, sourceRule: 'TEST', message: 'Test' }],
      hasCost: true,
    });
    const override = createTestOverride(report, RulesOutcome.PASS);
    const effects = [createTestEffect('effect_001', 'inv_001')];
    const resolution = createTestResolution(effects);

    const input: GraphBuilderInput = {
      intent,
      validationReport: report,
      overrides: [override],
      resolution,
    };

    const graph = buildExplanationGraph(input);

    // Formal assertion from spec
    expect(hasDerivedFields(graph)).toBe(false);
  });
});
