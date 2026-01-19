/**
 * Policy Explanation Graph Tests (PR 7.1)
 *
 * CRITICAL TEST: Policy-based overrides appear in explanation graphs.
 *
 * These tests PROVE:
 * - Policy-based overrides create override nodes in explanation graph
 * - Override nodes include policyId when policy was used
 * - Manual overrides have no policyId
 * - Policy usage is traceable
 */

import { describe, it, expect } from 'vitest';
import { buildExplanationGraph } from '../../../../explanation/ts/GraphBuilder';
import type { GraphBuilderInput } from '../../../../explanation/ts/GraphBuilder';
import type { ValidatedIntent } from '../../../../intent/bridge/ts/ValidatedIntent';
import type { ValidationReport } from '../../../../intent/bridge/ts/RulesPipeline';
import { RulesOutcome } from '../../../../intent/bridge/ts/RulesPipeline';
import type { GmOverride, GmId, OverrideId } from '../../types';
import { OverrideScope } from '../../types';
import { createOverridePolicy, createOverridePolicyId } from '../types';
import { applyPolicy } from '../application';
import type { PolicyApplicationRequest, GmOverrideWithPolicyMetadata } from '../application';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const GM_ID = 'gm_test_user' as GmId;

function createTestOverrideId(): OverrideId {
  return `override_${Date.now()}_${Math.random()}` as OverrideId;
}

const TEST_INTENT: ValidatedIntent = {
  intentId: 'intent_test_001',
  intentType: 'TEST_ACTION',
  payload: { test: true },
  submittedBy: 'player_001',
  submittedAt: Date.now(),
};

const FAIL_VALIDATION_REPORT: ValidationReport = {
  invocationId: 'inv_001',
  sourceIntentId: TEST_INTENT.intentId,
  intentType: TEST_INTENT.intentType,
  rulesetId: 'test_rules',
  outcome: RulesOutcome.FAIL,
  violations: [
    { ruleId: 'TEST_001', message: 'Test violation', severity: 'ERROR' },
  ],
  ambiguity: null,
  payload: TEST_INTENT.payload,
  conflicts: [],
};

function createTestPolicy() {
  return createOverridePolicy({
    id: 'policy_graph_test_001',
    label: 'GM Convenience Preset: Test Policy',
    description: 'Test policy for graph verification',
    appliesTo: { validationOutcome: 'FAIL' },
    decision: {
      newOutcome: 'PASS',
      warning: { severity: 'INFO', message: 'Policy applied' },
      defaultReason: 'Test policy application',
    },
    createdBy: GM_ID,
  });
}

function createManualOverride(): GmOverride {
  return {
    overrideId: createTestOverrideId(),
    parentOverrideId: null,
    originalReport: FAIL_VALIDATION_REPORT,
    overriddenOutcome: { newOutcome: RulesOutcome.PASS },
    scope: OverrideScope.OUTCOME,
    warning: { severity: 'INFO', message: 'Manual override' },
    reason: 'Manual GM decision',
    issuedBy: GM_ID,
    issuedAt: Date.now(),
  };
}

// ============================================================================
// CRITICAL TEST: OVERRIDE NODES IN EXPLANATION GRAPH
// ============================================================================

describe('Policy - Explanation Graph Integration', () => {
  it('policy-based override appears in explanation graph', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);
    expect(result.kind).toBe('override');

    if (result.kind === 'override') {
      const input: GraphBuilderInput = {
        intent: TEST_INTENT,
        validationReport: FAIL_VALIDATION_REPORT,
        overrides: [result.override],
        resolution: null,
      };

      const graph = buildExplanationGraph(input);

      // CRITICAL: Override node exists
      expect(graph.overrideNodes.length).toBe(1);
    }
  });

  it('override node includes policyId for policy-based override', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);
    expect(result.kind).toBe('override');

    if (result.kind === 'override') {
      const input: GraphBuilderInput = {
        intent: TEST_INTENT,
        validationReport: FAIL_VALIDATION_REPORT,
        overrides: [result.override],
        resolution: null,
      };

      const graph = buildExplanationGraph(input);

      // CRITICAL ASSERTION: policyId is present
      expect(graph.overrideNodes[0].policyId).toBe(policy.id);
    }
  });

  it('manual override has no policyId in explanation graph', () => {
    const manualOverride = createManualOverride();

    const input: GraphBuilderInput = {
      intent: TEST_INTENT,
      validationReport: FAIL_VALIDATION_REPORT,
      overrides: [manualOverride],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);

    // CRITICAL: Manual override has undefined policyId
    expect(graph.overrideNodes.length).toBe(1);
    expect(graph.overrideNodes[0].policyId).toBeUndefined();
  });

  it('policy-based and manual overrides are distinguishable in graph', () => {
    const policy = createTestPolicy();

    const policyRequest: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const policyResult = applyPolicy(policyRequest, createTestOverrideId);
    expect(policyResult.kind).toBe('override');

    const manualOverride = createManualOverride();

    if (policyResult.kind === 'override') {
      // Chain overrides: manual first, then policy
      const policyOverrideWithParent: GmOverrideWithPolicyMetadata = {
        ...policyResult.override,
        parentOverrideId: manualOverride.overrideId,
      };

      const input: GraphBuilderInput = {
        intent: TEST_INTENT,
        validationReport: FAIL_VALIDATION_REPORT,
        overrides: [manualOverride, policyOverrideWithParent],
        resolution: null,
      };

      const graph = buildExplanationGraph(input);

      expect(graph.overrideNodes.length).toBe(2);

      // First override is manual (no policyId)
      expect(graph.overrideNodes[0].policyId).toBeUndefined();

      // Second override is policy-based (has policyId)
      expect(graph.overrideNodes[1].policyId).toBe(policy.id);
    }
  });

  it('override node preserves all core fields', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);
    expect(result.kind).toBe('override');

    if (result.kind === 'override') {
      const input: GraphBuilderInput = {
        intent: TEST_INTENT,
        validationReport: FAIL_VALIDATION_REPORT,
        overrides: [result.override],
        resolution: null,
      };

      const graph = buildExplanationGraph(input);
      const overrideNode = graph.overrideNodes[0];

      // All standard override fields are present
      expect(overrideNode.nodeType).toBe('OVERRIDE');
      expect(overrideNode.overrideId).toBe(result.override.overrideId);
      expect(overrideNode.originalOutcome).toBe('FAIL');
      expect(overrideNode.newOutcome).toBe('PASS');
      expect(overrideNode.warningSeverity).toBe('INFO');
      expect(overrideNode.reason).toBe(policy.decision.defaultReason);
      expect(overrideNode.issuedBy).toBe(GM_ID);

      // Plus policyId for traceability
      expect(overrideNode.policyId).toBe(policy.id);
    }
  });

  it('graph without overrides has empty overrideNodes', () => {
    const input: GraphBuilderInput = {
      intent: TEST_INTENT,
      validationReport: FAIL_VALIDATION_REPORT,
      overrides: [],
      resolution: null,
    };

    const graph = buildExplanationGraph(input);

    expect(graph.overrideNodes.length).toBe(0);
  });

  it('override node links to validation node', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);
    expect(result.kind).toBe('override');

    if (result.kind === 'override') {
      const input: GraphBuilderInput = {
        intent: TEST_INTENT,
        validationReport: FAIL_VALIDATION_REPORT,
        overrides: [result.override],
        resolution: null,
      };

      const graph = buildExplanationGraph(input);

      // Override node links upstream to validation
      expect(graph.overrideNodes[0].upstreamNodeIds.length).toBe(1);

      // The upstream is the validation node
      const upstreamId = graph.overrideNodes[0].upstreamNodeIds[0];
      const upstreamNode = graph.nodeIndex.get(upstreamId);
      expect(upstreamNode?.nodeType).toBe('VALIDATION_RESULT');
    }
  });
});
