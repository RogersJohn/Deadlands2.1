/**
 * GmResultsView Tests (GM Results View PR)
 *
 * CRITICAL: These tests prove NO authority creep.
 * - No overall verdict exists
 * - No summaries exist
 * - No ranking or prioritization exists
 * - No recommendation language exists
 * - All engine disagreements are visible
 * - GM authority is untouched
 *
 * Forbidden patterns (UI must NOT contain):
 * - "overall", "total", "net", "final"
 * - "recommend", "suggest", "should", "advised"
 * - "legal", "illegal", "allowed", "denied"
 * - "success", "failure" (as judgments, not data)
 * - Icons/colors implying good/bad
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  GmResultsView,
  EvaluationContextSection,
  RuleResultsSection,
  CostsSection,
  EffectsSection,
  type EvaluationContext,
  type GmResultsViewProps,
} from '../GmResultsView';
import type {
  RuleValidationResult,
  CostResult,
  ConflictResult,
  AggregatedValidationReport,
  Effect,
  GmOverride,
} from '../../contracts';

// ============================================================================
// Test Factories
// ============================================================================

function createTestContext(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  return {
    action: 'Attack',
    actor: 'Player Character',
    target: 'Enemy NPC',
    environment: 'Dusty Saloon',
    declaredIntent: 'I want to shoot the villain before he draws',
    ...overrides,
  };
}

function createTestRuleResult(
  overrides: Partial<RuleValidationResult> = {}
): RuleValidationResult {
  return {
    validatorId: 'range-validator',
    rulesetId: 'combat-rules-v1',
    invocationId: 'inv-001',
    outcome: 'PASS',
    violations: [],
    ambiguity: null,
    conflicts: [],
    ...overrides,
  };
}

function createTestCostResult(overrides: Partial<CostResult> = {}): CostResult {
  return {
    validatorId: 'ammo-cost-validator',
    rulesetId: 'resource-rules-v1',
    costValidation: {
      cost: {
        kind: 'ActionCostEffect',
        description: 'Spend 1 bullet',
      },
      outcome: 'SATISFIED',
      reason: 'Actor has sufficient ammunition',
    },
    ...overrides,
  };
}

function createTestConflictResult(
  overrides: Partial<ConflictResult> = {}
): ConflictResult {
  return {
    validatorId: 'conflict-detector',
    rulesetId: 'conflict-rules-v1',
    conflict: {
      kind: 'HardBlock',
      sourceRule: 'cover-rule',
      message: 'Target behind full cover blocks line of sight',
    },
    ...overrides,
  };
}

function createTestReport(
  overrides: Partial<AggregatedValidationReport> = {}
): AggregatedValidationReport {
  return {
    sourceIntentId: 'intent-001',
    intentType: 'ATTACK',
    payload: {},
    ruleResults: [],
    costResults: [],
    allConflicts: [],
    validatorCount: 0,
    ...overrides,
  };
}

function createTestEffect(overrides: Partial<Effect> = {}): Effect {
  return {
    effectId: 'effect-001',
    effectType: 'DEAL_DAMAGE',
    target: { targetId: 'target-001', targetType: 'character' },
    authority: { invocationId: 'inv-001', source: 'RULES', outcome: 'PASS' },
    parameters: { amount: 5 },
    description: 'Deal 5 damage to target',
    ...overrides,
  };
}

function createTestOverride(overrides: Partial<GmOverride> = {}): GmOverride {
  return {
    overrideId: 'override-001',
    parentOverrideId: null,
    originalReport: {
      invocationId: 'inv-001',
      sourceIntentId: 'intent-001',
      intentType: 'ATTACK',
      rulesetId: 'combat-rules-v1',
      outcome: 'FAIL',
      violations: [{ ruleId: 'range-rule', message: 'Out of range', severity: 'ERROR' }],
      ambiguity: null,
      payload: {},
      conflicts: [],
    },
    overriddenOutcome: { newOutcome: 'PASS' },
    scope: 'OUTCOME',
    warning: { severity: 'WARNING', message: 'Override applied by GM' },
    reason: 'GM ruling: dramatic moment',
    issuedBy: 'gm-001',
    issuedAt: Date.now(),
    ...overrides,
  };
}

function createFullTestProps(): GmResultsViewProps {
  return {
    context: createTestContext(),
    report: createTestReport({
      ruleResults: [
        createTestRuleResult({ validatorId: 'rule-a', outcome: 'PASS' }),
        createTestRuleResult({ validatorId: 'rule-b', outcome: 'FAIL' }),
        createTestRuleResult({ validatorId: 'rule-c', outcome: 'AMBIGUOUS' }),
      ],
      costResults: [createTestCostResult()],
      allConflicts: [createTestConflictResult()],
      validatorCount: 3,
    }),
    effects: [createTestEffect()],
    overrides: [createTestOverride()],
  };
}

// ============================================================================
// Tests: Required Section Structure
// ============================================================================

describe('GmResultsView', () => {
  describe('Required Section Structure', () => {
    it('renders all 6 sections in correct order', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      // All sections must exist
      expect(screen.getByText('Evaluation Context')).toBeInTheDocument();
      expect(screen.getByText('Rule Results')).toBeInTheDocument();
      expect(screen.getByText('Conflicts Detected')).toBeInTheDocument();
      expect(screen.getByText('Costs (If Applied)')).toBeInTheDocument();
      expect(screen.getByText('Effects (If Applied)')).toBeInTheDocument();
      expect(screen.getByText('Overrides in Effect')).toBeInTheDocument();
    });

    it('does not collapse any sections by default', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      // All sections visible without interaction
      expect(screen.getByText('Inputs as provided. No assumptions added.')).toBeInTheDocument();
      expect(
        screen.getByText('Each rule was evaluated independently. No rule overrides another here.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('These rules disagree or block each other. The engine does not resolve this.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('These costs were produced by rules that passed. They are not enforced here.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Effects describe outcomes produced by individual rules. No aggregation applied.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Overrides change rule evaluation. They do not remove rules.')
      ).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Tests: No Authority Creep - Overall/Total/Net/Final
  // ============================================================================

  describe('No Authority Creep - No Overall Verdict', () => {
    it('does not contain "overall" text', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/overall/i)).toBeNull();
    });

    it('does not contain "total" text (as judgment)', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      // Note: "total" might appear in user data, but UI must not add it
      expect(screen.queryByText(/total result/i)).toBeNull();
      expect(screen.queryByText(/total outcome/i)).toBeNull();
    });

    it('does not contain "net" text (as judgment)', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/net result/i)).toBeNull();
      expect(screen.queryByText(/net outcome/i)).toBeNull();
    });

    it('does not contain "final result" text', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/final result/i)).toBeNull();
    });
  });

  // ============================================================================
  // Tests: No Authority Creep - No Recommendations
  // ============================================================================

  describe('No Authority Creep - No Recommendations', () => {
    it('does not contain "recommend" language', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/recommend/i)).toBeNull();
    });

    it('does not contain "suggest" language', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/suggest/i)).toBeNull();
    });

    it('does not contain "should" language', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/you should/i)).toBeNull();
      expect(screen.queryByText(/GM should/i)).toBeNull();
    });

    it('does not contain "advised" language', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/advised/i)).toBeNull();
    });
  });

  // ============================================================================
  // Tests: No Authority Creep - No Legal/Illegal Judgments
  // ============================================================================

  describe('No Authority Creep - No Legal/Illegal Judgments', () => {
    it('does not contain "legal" judgment text', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/this is legal/i)).toBeNull();
      expect(screen.queryByText(/action is legal/i)).toBeNull();
    });

    it('does not contain "illegal" judgment text', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/illegal/i)).toBeNull();
    });

    it('does not contain "denied" judgment text', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/action denied/i)).toBeNull();
    });
  });

  // ============================================================================
  // Tests: No Authority Creep - No Success/Failure Judgments
  // ============================================================================

  describe('No Authority Creep - No Success/Failure Labels', () => {
    it('does not add "success" as UI label', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      // Note: "success" should not appear as UI-added label
      expect(screen.queryByText(/^success$/i)).toBeNull();
    });

    it('does not add "failure" as UI label', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      // Note: "failure" should not appear as UI-added label
      expect(screen.queryByText(/^failure$/i)).toBeNull();
    });
  });

  // ============================================================================
  // Tests: Rule Results Section
  // ============================================================================

  describe('Rule Results Section', () => {
    it('shows all rules including FAIL and UNRESOLVED', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      expect(screen.getByText('rule-a')).toBeInTheDocument();
      expect(screen.getByText('rule-b')).toBeInTheDocument();
      expect(screen.getByText('rule-c')).toBeInTheDocument();
    });

    it('maps AMBIGUOUS to UNRESOLVED for display', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      expect(screen.getByText('UNRESOLVED')).toBeInTheDocument();
    });

    it('shows PASS and FAIL verbatim', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      // PASS may appear multiple times (rule results + override new outcome)
      expect(screen.getAllByText('PASS').length).toBeGreaterThanOrEqual(1);
      // FAIL may appear multiple times (rule results + override original outcome)
      expect(screen.getAllByText('FAIL').length).toBeGreaterThanOrEqual(1);
    });

    it('does not hide failed rules', () => {
      const props: GmResultsViewProps = {
        ...createFullTestProps(),
        report: createTestReport({
          ruleResults: [
            createTestRuleResult({
              validatorId: 'failed-rule',
              outcome: 'FAIL',
              violations: [
                { ruleId: 'failed-rule', message: 'Rule check did not pass', severity: 'ERROR' },
              ],
            }),
          ],
        }),
      };
      render(<GmResultsView {...props} />);

      expect(screen.getByText('failed-rule')).toBeInTheDocument();
      expect(screen.getByText('Rule check did not pass')).toBeInTheDocument();
    });

    it('shows engine-provided reason text unchanged', () => {
      const props: GmResultsViewProps = {
        ...createFullTestProps(),
        report: createTestReport({
          ruleResults: [
            createTestRuleResult({
              validatorId: 'test-rule',
              outcome: 'FAIL',
              violations: [
                { ruleId: 'test-rule', message: 'Exact engine message here', severity: 'ERROR' },
              ],
            }),
          ],
        }),
      };
      render(<GmResultsView {...props} />);

      expect(screen.getByText('Exact engine message here')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Tests: Conflicts Section
  // ============================================================================

  describe('Conflicts Section', () => {
    it('shows "No direct conflicts detected." when empty', () => {
      const props: GmResultsViewProps = {
        ...createFullTestProps(),
        report: createTestReport({ allConflicts: [] }),
      };
      render(<GmResultsView {...props} />);

      expect(screen.getByText('No direct conflicts detected.')).toBeInTheDocument();
    });

    it('shows conflicts with "Unresolved by design." status', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      expect(screen.getByText('Target behind full cover blocks line of sight')).toBeInTheDocument();
      expect(screen.getByText('Unresolved by design.')).toBeInTheDocument();
    });

    it('does not suggest resolution for conflicts', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      // Check for GM-directed suggestion language (not microcopy explaining engine behavior)
      expect(screen.queryByText(/you should resolve/i)).toBeNull();
      expect(screen.queryByText(/try to resolve/i)).toBeNull();
      expect(screen.queryByText(/consider resolving/i)).toBeNull();
      expect(screen.queryByText(/click to resolve/i)).toBeNull();
    });
  });

  // ============================================================================
  // Tests: Costs Section
  // ============================================================================

  describe('Costs Section', () => {
    it('shows costs without "required" or "must pay" language', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      expect(screen.getByText('Spend 1 bullet')).toBeInTheDocument();
      expect(screen.queryByText(/required/i)).toBeNull();
      expect(screen.queryByText(/must pay/i)).toBeNull();
    });

    it('does not total costs', () => {
      const props: GmResultsViewProps = {
        ...createFullTestProps(),
        report: createTestReport({
          costResults: [
            createTestCostResult({
              costValidation: {
                cost: { kind: 'ActionCostEffect', description: 'Spend 1 bullet' },
                outcome: 'SATISFIED',
                reason: '',
              },
            }),
            createTestCostResult({
              validatorId: 'other-cost',
              costValidation: {
                cost: { kind: 'ActionCostEffect', description: 'Spend 1 action point' },
                outcome: 'SATISFIED',
                reason: '',
              },
            }),
          ],
        }),
      };
      render(<GmResultsView {...props} />);

      // Both costs shown separately, no total
      expect(screen.getByText('Spend 1 bullet')).toBeInTheDocument();
      expect(screen.getByText('Spend 1 action point')).toBeInTheDocument();
      expect(screen.queryByText(/total/i)).toBeNull();
    });
  });

  // ============================================================================
  // Tests: Effects Section
  // ============================================================================

  describe('Effects Section', () => {
    it('groups effects by source rule', () => {
      const props: GmResultsViewProps = {
        ...createFullTestProps(),
        effects: [
          createTestEffect({ effectId: 'e1', authority: { invocationId: 'inv-A', source: 'RULES', outcome: 'PASS' } }),
          createTestEffect({ effectId: 'e2', authority: { invocationId: 'inv-B', source: 'RULES', outcome: 'PASS' } }),
        ],
      };
      render(<GmResultsView {...props} />);

      expect(screen.getByText('Source: inv-A')).toBeInTheDocument();
      expect(screen.getByText('Source: inv-B')).toBeInTheDocument();
    });

    it('does not collapse into net outcome', () => {
      const props: GmResultsViewProps = {
        ...createFullTestProps(),
        effects: [
          createTestEffect({
            effectId: 'damage-effect',
            effectType: 'DEAL_DAMAGE',
            description: 'Deal 5 damage',
          }),
          createTestEffect({
            effectId: 'heal-effect',
            effectType: 'GRANT_RESOURCE',
            description: 'Heal 3 damage',
          }),
        ],
      };
      render(<GmResultsView {...props} />);

      // Both effects shown, no "net 2 damage" calculation
      expect(screen.getByText('Deal 5 damage')).toBeInTheDocument();
      expect(screen.getByText('Heal 3 damage')).toBeInTheDocument();
      expect(screen.queryByText(/net/i)).toBeNull();
    });
  });

  // ============================================================================
  // Tests: Overrides Section
  // ============================================================================

  describe('Overrides Section', () => {
    it('shows "No overrides applied." when empty', () => {
      const props: GmResultsViewProps = {
        ...createFullTestProps(),
        overrides: [],
      };
      render(<GmResultsView {...props} />);

      expect(screen.getByText('No overrides applied.')).toBeInTheDocument();
    });

    it('shows original outcome when override exists', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      // Original failure must remain visible
      expect(screen.getByText('Original Outcome:')).toBeInTheDocument();
    });

    it('shows new outcome from override', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      expect(screen.getByText('New Outcome:')).toBeInTheDocument();
    });

    it('shows override reason', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      expect(screen.getByText('GM ruling: dramatic moment')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Tests: Evaluation Context Section
  // ============================================================================

  describe('Evaluation Context Section', () => {
    it('shows all context fields verbatim', () => {
      render(<GmResultsView {...createFullTestProps()} />);

      expect(screen.getByText('Attack')).toBeInTheDocument();
      expect(screen.getByText('Player Character')).toBeInTheDocument();
      expect(screen.getByText('Enemy NPC')).toBeInTheDocument();
      expect(screen.getByText('Dusty Saloon')).toBeInTheDocument();
      expect(screen.getByText('I want to shoot the villain before he draws')).toBeInTheDocument();
    });

    it('does not paraphrase declared intent', () => {
      const context = createTestContext({
        declaredIntent: 'Player wants to do an UNUSUAL thing! #123',
      });
      render(<EvaluationContextSection context={context} />);

      // Text should appear verbatim, including special characters
      expect(screen.getByText('Player wants to do an UNUSUAL thing! #123')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Tests: Empty States
  // ============================================================================

  describe('Empty States', () => {
    it('shows "(no rules evaluated)" when no rules', () => {
      render(<RuleResultsSection ruleResults={[]} />);
      expect(screen.getByText('(no rules evaluated)')).toBeInTheDocument();
    });

    it('shows "(no costs produced)" when no costs', () => {
      render(<CostsSection costs={[]} />);
      expect(screen.getByText('(no costs produced)')).toBeInTheDocument();
    });

    it('shows "(no effects produced)" when no effects', () => {
      render(<EffectsSection effects={[]} />);
      expect(screen.getByText('(no effects produced)')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Tests: FINAL SELF-CHECK from spec
  // ============================================================================

  describe('FINAL SELF-CHECK (Mandatory per spec)', () => {
    it('NO overall verdict exists', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/overall verdict/i)).toBeNull();
      expect(screen.queryByText(/final verdict/i)).toBeNull();
    });

    it('NO summaries exist', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/summary/i)).toBeNull();
    });

    it('NO ranking or prioritization exists', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/priority/i)).toBeNull();
      expect(screen.queryByText(/most important/i)).toBeNull();
      expect(screen.queryByText(/primary/i)).toBeNull();
    });

    it('NO recommendation language exists', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      expect(screen.queryByText(/recommend/i)).toBeNull();
      expect(screen.queryByText(/you should/i)).toBeNull();
    });

    it('ALL engine disagreements are visible', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      // Conflict is visible
      expect(screen.getByText('Target behind full cover blocks line of sight')).toBeInTheDocument();
      // UNRESOLVED rule is visible
      expect(screen.getByText('UNRESOLVED')).toBeInTheDocument();
    });

    it('GM authority is untouched (no action buttons in results)', () => {
      render(<GmResultsView {...createFullTestProps()} />);
      // Results view should not have action buttons
      expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /deny/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /accept/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();
    });
  });
});
