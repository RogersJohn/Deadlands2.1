/**
 * NoAuthorityCreep Integration Tests (FE-PR 1.0)
 *
 * CRITICAL: These tests prove NO authority creep across ALL components.
 * - No "overall result" text anywhere
 * - No "recommended" language anywhere
 * - No "illegal" or "legal" judgments
 * - Effects render even when FAIL exists
 *
 * These are cross-cutting concerns that must be enforced globally.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ValidationReportViewer,
  GmOverridePanel,
  ExplanationGraphViewer,
  AiCommentaryPanel,
  SessionLog,
} from '../index';
import type {
  ValidationReport,
  Effect,
  ExplanationGraph,
} from '../../contracts';
import type { SessionLogEntry } from '../SessionLog';
import type { AiCommentary } from '../AiCommentaryPanel';

/**
 * Factories
 */
function createFailReport(): ValidationReport {
  return {
    invocationId: 'inv-001',
    sourceIntentId: 'intent-001',
    intentType: 'ATTACK',
    rulesetId: 'ruleset-001',
    outcome: 'FAIL',
    violations: [
      { ruleId: 'rule-001', message: 'Action blocked by rule', severity: 'ERROR' },
    ],
    ambiguity: null,
    payload: {},
    conflicts: [
      { kind: 'HardBlock', sourceRule: 'rule-001', message: 'Blocked' },
    ],
  };
}

function createTestEffects(): Effect[] {
  return [
    {
      effectId: 'effect-001',
      effectType: 'DEAL_DAMAGE',
      target: { targetId: 'char-002', targetType: 'character' },
      authority: { invocationId: 'inv-001', source: 'RULES', outcome: 'FAIL' },
      parameters: { amount: 5 },
      description: 'Damage effect',
    },
  ];
}

function createTestGraph(): ExplanationGraph {
  return {
    rootIntentId: 'intent-001',
    nodes: [
      {
        kind: 'intent',
        intentId: 'intent-001',
        intentType: 'ATTACK',
        timestamp: Date.now(),
      },
      {
        kind: 'validation',
        invocationId: 'inv-001',
        rulesetId: 'ruleset-001',
        outcome: 'FAIL',
      },
    ],
    edges: [{ from: 'intent-001', to: 'inv-001', label: 'validated by' }],
    finalOutcome: 'FAIL',
    hasOverrides: false,
  };
}

function createTestCommentary(): AiCommentary[] {
  return [
    {
      commentaryId: 'ai-001',
      timestamp: Date.now(),
      text: 'AI analysis of the situation',
    },
  ];
}

function createTestSessionEntries(): SessionLogEntry[] {
  return [
    {
      entryId: 'entry-001',
      timestamp: Date.now(),
      type: 'intent',
      intent: { intentType: 'ATTACK', payload: {} },
    },
    {
      entryId: 'entry-002',
      timestamp: Date.now(),
      type: 'validation',
      report: createFailReport(),
    },
  ];
}

describe('No Authority Creep - Global Assertions', () => {
  describe('No "Overall Result" Anywhere', () => {
    it('ValidationReportViewer does not show "overall" text', () => {
      render(
        <ValidationReportViewer
          report={createFailReport()}
          effects={createTestEffects()}
        />
      );

      expect(screen.queryByText(/overall/i)).toBeNull();
    });

    it('GmOverridePanel does not show "overall" text', () => {
      render(
        <GmOverridePanel
          report={createFailReport()}
          existingOverrides={[]}
          onCreateOverride={vi.fn()}
        />
      );

      // Open all steps
      fireEvent.click(screen.getByText('Create GM Override'));
      fireEvent.click(screen.getByText('Validation Result'));
      fireEvent.click(screen.getByText('Change Outcome to PASS'));

      expect(screen.queryByText(/overall/i)).toBeNull();
    });

    it('ExplanationGraphViewer does not show "overall" text', () => {
      render(<ExplanationGraphViewer graph={createTestGraph()} />);

      expect(screen.queryByText(/overall/i)).toBeNull();
    });

    it('SessionLog does not show "overall" text', () => {
      render(<SessionLog entries={createTestSessionEntries()} />);

      // Expand all entries
      fireEvent.click(screen.getByText(/entry-001/));
      fireEvent.click(screen.getByText(/entry-002/));

      expect(screen.queryByText(/overall/i)).toBeNull();
    });
  });

  describe('No "Recommended" Language Anywhere', () => {
    it('ValidationReportViewer does not use "recommended" language', () => {
      render(
        <ValidationReportViewer
          report={createFailReport()}
          effects={createTestEffects()}
        />
      );

      expect(screen.queryByText(/recommend/i)).toBeNull();
      expect(screen.queryByText(/suggest/i)).toBeNull();
      expect(screen.queryByText(/should/i)).toBeNull();
      expect(screen.queryByText(/advised/i)).toBeNull();
    });

    it('GmOverridePanel does not use "recommended" language', () => {
      render(
        <GmOverridePanel
          report={createFailReport()}
          existingOverrides={[]}
          onCreateOverride={vi.fn()}
        />
      );

      // Open all steps
      fireEvent.click(screen.getByText('Create GM Override'));
      fireEvent.click(screen.getByText('Validation Result'));
      fireEvent.click(screen.getByText('Change Outcome to PASS'));

      expect(screen.queryByText(/recommend/i)).toBeNull();
      expect(screen.queryByText(/suggest/i)).toBeNull();
    });
  });

  describe('No "Illegal/Legal" Judgments', () => {
    it('ValidationReportViewer does not add judgmental UI text', () => {
      render(
        <ValidationReportViewer
          report={createFailReport()}
          effects={createTestEffects()}
        />
      );

      // These are UI-level judgments the component should NOT add
      // (distinct from user data which may contain domain terms)
      expect(screen.queryByText(/this action is illegal/i)).toBeNull();
      expect(screen.queryByText(/this is not legal/i)).toBeNull();
      expect(screen.queryByText(/you cannot do this/i)).toBeNull();
      expect(screen.queryByText(/action denied/i)).toBeNull();
    });

    it('ExplanationGraphViewer does not add judgmental UI text', () => {
      render(<ExplanationGraphViewer graph={createTestGraph()} />);

      // Expand all nodes
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        if (btn.getAttribute('aria-expanded') === 'false') {
          fireEvent.click(btn);
        }
      });

      // No judgmental UI text added by the component
      expect(screen.queryByText(/this action is illegal/i)).toBeNull();
      expect(screen.queryByText(/this is not legal/i)).toBeNull();
    });
  });

  describe('Effects Render Even When FAIL Exists', () => {
    it('effects are visible even with FAIL validation outcome', () => {
      render(
        <ValidationReportViewer
          report={createFailReport()}
          effects={createTestEffects()}
        />
      );

      // FAIL is shown
      expect(screen.getByText('FAIL')).toBeInTheDocument();

      // Effects are NOT suppressed
      expect(screen.getByText('effect-001')).toBeInTheDocument();
      expect(screen.getByText('Damage effect')).toBeInTheDocument();
    });

    it('session log shows effects even when validation was FAIL', () => {
      const entries: SessionLogEntry[] = [
        {
          entryId: 'entry-001',
          timestamp: Date.now(),
          type: 'validation',
          report: createFailReport(),
        },
        {
          entryId: 'entry-002',
          timestamp: Date.now(),
          type: 'effect',
          effects: createTestEffects(),
        },
      ];

      render(<SessionLog entries={entries} />);

      // Both entries visible
      expect(screen.getByText('[Validation]')).toBeInTheDocument();
      expect(screen.getByText('[Effect]')).toBeInTheDocument();
    });
  });

  describe('AI Panel Hidden by Default', () => {
    it('AI commentary is not visible without explicit toggle', () => {
      render(<AiCommentaryPanel commentary={createTestCommentary()} />);

      // Commentary text should NOT be visible
      expect(screen.queryByText('AI analysis of the situation')).toBeNull();

      // Label should NOT be visible
      expect(screen.queryByText('Non-Authoritative Commentary')).toBeNull();
    });

    it('AI commentary becomes visible only after explicit toggle', () => {
      render(<AiCommentaryPanel commentary={createTestCommentary()} />);

      // Toggle to show
      fireEvent.click(screen.getByText('Show AI Commentary (Advisory Only)'));

      // Now visible
      expect(screen.getByText('AI analysis of the situation')).toBeInTheDocument();
      expect(screen.getByText('Non-Authoritative Commentary')).toBeInTheDocument();
    });
  });

  describe('No "Proceed/Cancel" Decision Prompts', () => {
    it('ValidationReportViewer does not prompt for proceed/cancel', () => {
      render(
        <ValidationReportViewer
          report={createFailReport()}
          effects={createTestEffects()}
        />
      );

      expect(screen.queryByText(/proceed/i)).toBeNull();
      expect(screen.queryByText(/continue/i)).toBeNull();
      // Note: 'cancel' might appear in override panel cancel button, so we check ValidationReportViewer specifically
    });

    it('ExplanationGraphViewer does not prompt for decisions', () => {
      render(<ExplanationGraphViewer graph={createTestGraph()} />);

      expect(screen.queryByText(/proceed/i)).toBeNull();
      expect(screen.queryByText(/what.*do/i)).toBeNull();
      expect(screen.queryByText(/next step/i)).toBeNull();
    });
  });

  describe('Session Log Entries Are Immutable', () => {
    it('no entry has an edit affordance', () => {
      render(<SessionLog entries={createTestSessionEntries()} />);

      // Expand all entries
      fireEvent.click(screen.getByText(/entry-001/));
      fireEvent.click(screen.getByText(/entry-002/));

      // No edit buttons
      expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /undo/i })).toBeNull();

      // Immutability note should be present
      const notes = screen.getAllByText('This entry is immutable and cannot be modified.');
      expect(notes.length).toBe(2); // One per expanded entry
    });
  });
});
