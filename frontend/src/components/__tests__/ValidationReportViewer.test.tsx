/**
 * ValidationReportViewer Tests (FE-PR 0.3)
 *
 * CRITICAL: These tests prove NON-INTERPRETATION.
 * - Multiple outcomes coexist (PASS, FAIL, AMBIGUOUS)
 * - FAIL does not suppress effects
 * - No summary computed
 * - No "overall" text present
 * - No color semantics tested
 *
 * Forbidden assertions:
 * - expect(screen.getByText('Illegal')).toBeInTheDocument()
 * - expect(screen.getByText('Overall')).toBeInTheDocument()
 * - expect(screen.queryByText('FAIL')).toBeNull() when FAIL exists
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ValidationReportViewer,
  RuleResultsPanel,
  CostsPanel,
  ConflictsPanel,
  EffectsPanel,
} from '../ValidationReportViewer';
import type {
  ValidationReport,
  RuleViolation,
  Conflict,
  CostValidationResult,
  Effect,
} from '../../contracts';

/**
 * Factory for creating test ValidationReport
 */
function createTestReport(
  overrides: Partial<ValidationReport> = {}
): ValidationReport {
  return {
    invocationId: 'inv-001',
    sourceIntentId: 'intent-001',
    intentType: 'ATTACK',
    rulesetId: 'ruleset-001',
    outcome: 'PASS',
    violations: [],
    ambiguity: null,
    payload: {},
    conflicts: [],
    ...overrides,
  };
}

/**
 * Factory for creating test Effect
 */
function createTestEffect(overrides: Partial<Effect> = {}): Effect {
  return {
    effectId: 'effect-001',
    effectType: 'DEAL_DAMAGE',
    target: { targetId: 'target-001', targetType: 'character' },
    authority: { invocationId: 'inv-001', source: 'RULES', outcome: 'PASS' },
    parameters: {},
    description: 'Test effect description',
    ...overrides,
  };
}

describe('ValidationReportViewer', () => {
  describe('Non-Interpretation Guarantees', () => {
    it('renders multiple outcomes coexisting - PASS and FAIL both visible', () => {
      const violations: RuleViolation[] = [
        { ruleId: 'rule-001', message: 'Rule one failed', severity: 'ERROR' },
        { ruleId: 'rule-002', message: 'Rule two passed', severity: 'WARNING' },
      ];

      const report = createTestReport({
        outcome: 'FAIL',
        violations,
      });

      render(<ValidationReportViewer report={report} />);

      // Both FAIL outcome and all violations render
      expect(screen.getByText('FAIL')).toBeInTheDocument();
      expect(screen.getByText('rule-001')).toBeInTheDocument();
      expect(screen.getByText('rule-002')).toBeInTheDocument();
      expect(screen.getByText('Rule one failed')).toBeInTheDocument();
      expect(screen.getByText('Rule two passed')).toBeInTheDocument();
    });

    it('renders AMBIGUOUS outcome with reason', () => {
      const report = createTestReport({
        outcome: 'AMBIGUOUS',
        ambiguity: {
          reason: 'Multiple interpretations possible',
          possibleInterpretations: [
            { code: 'INT-1', resultingOutcome: 'PASS', description: 'Option A' },
            { code: 'INT-2', resultingOutcome: 'FAIL', description: 'Option B' },
          ],
        },
      });

      render(<ValidationReportViewer report={report} />);

      expect(screen.getByText('AMBIGUOUS')).toBeInTheDocument();
      expect(screen.getByText('Multiple interpretations possible')).toBeInTheDocument();
    });

    it('FAIL does not suppress effects - effects render regardless', () => {
      const report = createTestReport({
        outcome: 'FAIL',
        violations: [
          { ruleId: 'rule-001', message: 'Action blocked', severity: 'ERROR' },
        ],
      });

      const effects: Effect[] = [
        createTestEffect({ effectId: 'effect-001', description: 'Damage dealt' }),
        createTestEffect({ effectId: 'effect-002', description: 'Condition applied' }),
      ];

      render(<ValidationReportViewer report={report} effects={effects} />);

      // FAIL is shown
      expect(screen.getByText('FAIL')).toBeInTheDocument();
      expect(screen.getByText('Action blocked')).toBeInTheDocument();

      // Effects are NOT suppressed
      expect(screen.getByText('effect-001')).toBeInTheDocument();
      expect(screen.getByText('effect-002')).toBeInTheDocument();
      expect(screen.getByText('Damage dealt')).toBeInTheDocument();
      expect(screen.getByText('Condition applied')).toBeInTheDocument();
    });

    it('no summary computed - no "overall" or "illegal" text present', () => {
      const report = createTestReport({
        outcome: 'FAIL',
        violations: [
          { ruleId: 'rule-001', message: 'Not allowed', severity: 'ERROR' },
        ],
      });

      render(<ValidationReportViewer report={report} />);

      // These interpretation words must NOT appear
      expect(screen.queryByText(/overall/i)).toBeNull();
      expect(screen.queryByText(/illegal/i)).toBeNull();
      expect(screen.queryByText(/legal/i)).toBeNull();
      expect(screen.queryByText(/proceed/i)).toBeNull();
      expect(screen.queryByText(/cancel/i)).toBeNull();
      expect(screen.queryByText(/next steps/i)).toBeNull();
      expect(screen.queryByText(/recommendation/i)).toBeNull();
    });

    it('renders empty sections explicitly as "(none)"', () => {
      const report = createTestReport({
        violations: [],
        conflicts: [],
        costValidation: undefined,
      });

      render(<ValidationReportViewer report={report} />);

      // Empty states are shown, not hidden
      const noneElements = screen.getAllByText('(none)');
      expect(noneElements.length).toBeGreaterThanOrEqual(3);
    });

    it('preserves backend ordering - violations render in original order', () => {
      const violations: RuleViolation[] = [
        { ruleId: 'rule-C', message: 'Third rule', severity: 'ERROR' },
        { ruleId: 'rule-A', message: 'First rule', severity: 'WARNING' },
        { ruleId: 'rule-B', message: 'Second rule', severity: 'ERROR' },
      ];

      const report = createTestReport({ violations });

      render(<ValidationReportViewer report={report} />);

      const ruleTexts = screen.getAllByText(/rule-[ABC]/);
      expect(ruleTexts[0]).toHaveTextContent('rule-C');
      expect(ruleTexts[1]).toHaveTextContent('rule-A');
      expect(ruleTexts[2]).toHaveTextContent('rule-B');
    });
  });

  describe('Metadata Rendering', () => {
    it('renders all metadata fields verbatim', () => {
      const report = createTestReport({
        invocationId: 'inv-123',
        sourceIntentId: 'intent-456',
        intentType: 'MOVE_ACTION',
        rulesetId: 'deadlands-core-v1',
      });

      render(<ValidationReportViewer report={report} />);

      expect(screen.getByText('inv-123')).toBeInTheDocument();
      expect(screen.getByText('intent-456')).toBeInTheDocument();
      expect(screen.getByText('MOVE_ACTION')).toBeInTheDocument();
      expect(screen.getByText('deadlands-core-v1')).toBeInTheDocument();
    });
  });
});

describe('RuleResultsPanel', () => {
  it('renders outcome text without color semantics', () => {
    render(
      <RuleResultsPanel
        violations={[]}
        outcome="PASS"
        ambiguityReason={null}
      />
    );

    expect(screen.getByText('PASS')).toBeInTheDocument();
  });

  it('renders FAIL and AMBIGUOUS outcomes the same way as PASS', () => {
    const { rerender } = render(
      <RuleResultsPanel
        violations={[]}
        outcome="FAIL"
        ambiguityReason={null}
      />
    );
    expect(screen.getByText('FAIL')).toBeInTheDocument();

    rerender(
      <RuleResultsPanel
        violations={[]}
        outcome="AMBIGUOUS"
        ambiguityReason="Unclear rules"
      />
    );
    expect(screen.getByText('AMBIGUOUS')).toBeInTheDocument();
    expect(screen.getByText('Unclear rules')).toBeInTheDocument();
  });

  it('renders all violation fields verbatim', () => {
    const violations: RuleViolation[] = [
      {
        ruleId: 'movement-check-001',
        message: 'Character is immobilized',
        severity: 'ERROR',
      },
    ];

    render(
      <RuleResultsPanel
        violations={violations}
        outcome="FAIL"
        ambiguityReason={null}
      />
    );

    expect(screen.getByText('movement-check-001')).toBeInTheDocument();
    expect(screen.getByText('Character is immobilized')).toBeInTheDocument();
    expect(screen.getByText('ERROR')).toBeInTheDocument();
  });

  it('renders WARNING and ERROR severity equally - no hierarchy', () => {
    const violations: RuleViolation[] = [
      { ruleId: 'rule-1', message: 'Error message', severity: 'ERROR' },
      { ruleId: 'rule-2', message: 'Warning message', severity: 'WARNING' },
    ];

    render(
      <RuleResultsPanel
        violations={violations}
        outcome="FAIL"
        ambiguityReason={null}
      />
    );

    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText('WARNING')).toBeInTheDocument();
  });
});

describe('CostsPanel', () => {
  it('renders "Declared Costs (Not Enforced)" label', () => {
    render(<CostsPanel costValidation={undefined} />);

    expect(screen.getByText('Declared Costs (Not Enforced)')).toBeInTheDocument();
  });

  it('renders cost description verbatim', () => {
    const costValidation: CostValidationResult = {
      cost: {
        kind: 'ActionCostEffect',
        description: 'Spend 2 Action Points',
        tags: ['combat', 'resource'],
      },
      outcome: 'SATISFIED',
      reason: 'Player has sufficient AP',
    };

    render(<CostsPanel costValidation={costValidation} />);

    expect(screen.getByText('Spend 2 Action Points')).toBeInTheDocument();
    expect(screen.getByText('combat, resource')).toBeInTheDocument();
    expect(screen.getByText('SATISFIED')).toBeInTheDocument();
    expect(screen.getByText('Player has sufficient AP')).toBeInTheDocument();
  });

  it('renders "(none)" when no costs', () => {
    render(<CostsPanel costValidation={undefined} />);

    expect(screen.getByText('(none)')).toBeInTheDocument();
  });
});

describe('ConflictsPanel', () => {
  it('renders all conflict kinds without hierarchy', () => {
    const conflicts: Conflict[] = [
      { kind: 'HardBlock', sourceRule: 'rule-1', message: 'Blocked hard' },
      { kind: 'SoftBlock', sourceRule: 'rule-2', message: 'Blocked soft' },
      { kind: 'Informational', sourceRule: 'rule-3', message: 'FYI' },
    ];

    render(<ConflictsPanel conflicts={conflicts} />);

    // All kinds rendered
    expect(screen.getByText('HardBlock')).toBeInTheDocument();
    expect(screen.getByText('SoftBlock')).toBeInTheDocument();
    expect(screen.getByText('Informational')).toBeInTheDocument();

    // All messages rendered
    expect(screen.getByText('Blocked hard')).toBeInTheDocument();
    expect(screen.getByText('Blocked soft')).toBeInTheDocument();
    expect(screen.getByText('FYI')).toBeInTheDocument();
  });

  it('preserves conflict ordering from backend', () => {
    const conflicts: Conflict[] = [
      { kind: 'Informational', sourceRule: 'rule-info', message: 'Info first' },
      { kind: 'HardBlock', sourceRule: 'rule-hard', message: 'Hard second' },
      { kind: 'SoftBlock', sourceRule: 'rule-soft', message: 'Soft third' },
    ];

    render(<ConflictsPanel conflicts={conflicts} />);

    const kindElements = screen.getAllByText(/HardBlock|SoftBlock|Informational/);
    expect(kindElements[0]).toHaveTextContent('Informational');
    expect(kindElements[1]).toHaveTextContent('HardBlock');
    expect(kindElements[2]).toHaveTextContent('SoftBlock');
  });

  it('renders "(none)" when no conflicts', () => {
    render(<ConflictsPanel conflicts={[]} />);

    expect(screen.getByText('(none)')).toBeInTheDocument();
  });

  it('does not highlight HardBlock as final', () => {
    const conflicts: Conflict[] = [
      { kind: 'HardBlock', sourceRule: 'rule-1', message: 'Blocked' },
    ];

    render(<ConflictsPanel conflicts={conflicts} />);

    // No "final" or "blocking" interpretation text
    expect(screen.queryByText(/final/i)).toBeNull();
    expect(screen.queryByText(/blocking/i)).toBeNull();
  });
});

describe('EffectsPanel', () => {
  it('renders "Declared Effects (Attempts Occurred)" label', () => {
    render(<EffectsPanel effects={[]} />);

    expect(screen.getByText('Declared Effects (Attempts Occurred)')).toBeInTheDocument();
  });

  it('renders all effect fields verbatim', () => {
    const effects: Effect[] = [
      {
        effectId: 'eff-damage-001',
        effectType: 'DEAL_DAMAGE',
        target: { targetId: 'char-002', targetType: 'character' },
        authority: { invocationId: 'inv-001', source: 'RULES', outcome: 'PASS' },
        parameters: { amount: 5 },
        description: 'Deal 5 damage to target',
      },
    ];

    render(<EffectsPanel effects={effects} />);

    expect(screen.getByText('eff-damage-001')).toBeInTheDocument();
    expect(screen.getByText('DEAL_DAMAGE')).toBeInTheDocument();
    expect(screen.getByText('Deal 5 damage to target')).toBeInTheDocument();
    expect(screen.getByText(/char-002/)).toBeInTheDocument();
  });

  it('renders effects even with FAIL authority outcome', () => {
    const effects: Effect[] = [
      {
        effectId: 'eff-001',
        effectType: 'APPLY_CONDITION',
        target: { targetId: 'target-001', targetType: 'character' },
        authority: { invocationId: 'inv-001', source: 'OVERRIDE', outcome: 'FAIL' },
        parameters: {},
        description: 'Condition applied via override despite FAIL',
      },
    ];

    render(<EffectsPanel effects={effects} />);

    expect(screen.getByText('eff-001')).toBeInTheDocument();
    expect(screen.getByText('Condition applied via override despite FAIL')).toBeInTheDocument();
    expect(screen.getByText(/OVERRIDE.*FAIL/)).toBeInTheDocument();
  });

  it('renders "(none)" when no effects', () => {
    render(<EffectsPanel effects={[]} />);

    expect(screen.getByText('(none)')).toBeInTheDocument();
  });
});
