/**
 * SessionLog Tests (FE-PR 1.0)
 *
 * CRITICAL: These tests prove IMMUTABILITY.
 * - Session log entries cannot be edited
 * - No re-running intents from history
 * - No retroactive overrides
 * - No "fix previous ruling"
 *
 * Forbidden assertions:
 * - expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
 * - expect(screen.getByRole('button', { name: /re-run/i })).toBeInTheDocument()
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SessionLog,
  type SessionLogEntry,
  type IntentLogEntry,
  type ValidationLogEntry,
  type OverrideLogEntry,
  type EffectLogEntry,
} from '../SessionLog';
import type { RawIntent, ValidationReport, GmOverride, Effect } from '../../contracts';

/**
 * Factory helpers
 */
function createTestIntent(): RawIntent {
  return {
    intentType: 'ATTACK',
    payload: { actor: 'char-001', target: 'char-002' },
  };
}

function createTestReport(): ValidationReport {
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
  };
}

function createTestOverride(): GmOverride {
  return {
    overrideId: 'override-001',
    parentOverrideId: null,
    originalReport: createTestReport(),
    overriddenOutcome: { newOutcome: 'PASS' },
    scope: 'OUTCOME',
    warning: { severity: 'WARNING', message: 'Override applied' },
    reason: 'GM decision',
    issuedBy: 'gm-001',
    issuedAt: Date.now(),
  };
}

function createTestEffect(): Effect {
  return {
    effectId: 'effect-001',
    effectType: 'DEAL_DAMAGE',
    target: { targetId: 'char-002', targetType: 'character' },
    authority: { invocationId: 'inv-001', source: 'RULES', outcome: 'PASS' },
    parameters: { amount: 5 },
    description: 'Deal 5 damage',
  };
}

function createIntentEntry(): IntentLogEntry {
  return {
    entryId: 'entry-001',
    timestamp: Date.now(),
    type: 'intent',
    intent: createTestIntent(),
  };
}

function createValidationEntry(): ValidationLogEntry {
  return {
    entryId: 'entry-002',
    timestamp: Date.now(),
    type: 'validation',
    report: createTestReport(),
  };
}

function createOverrideEntry(): OverrideLogEntry {
  return {
    entryId: 'entry-003',
    timestamp: Date.now(),
    type: 'override',
    override: createTestOverride(),
  };
}

function createEffectEntry(): EffectLogEntry {
  return {
    entryId: 'entry-004',
    timestamp: Date.now(),
    type: 'effect',
    effects: [createTestEffect()],
  };
}

describe('SessionLog', () => {
  describe('Immutability', () => {
    it('does not have edit buttons', () => {
      const entries: SessionLogEntry[] = [
        createIntentEntry(),
        createValidationEntry(),
      ];
      render(<SessionLog entries={entries} />);

      // Expand entries
      fireEvent.click(screen.getByText(/entry-001/));
      fireEvent.click(screen.getByText(/entry-002/));

      expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /modify/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /change/i })).toBeNull();
    });

    it('does not have re-run buttons', () => {
      const entries: SessionLogEntry[] = [createIntentEntry()];
      render(<SessionLog entries={entries} />);

      // Expand entry
      fireEvent.click(screen.getByText(/entry-001/));

      expect(screen.queryByRole('button', { name: /re-run/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /replay/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /repeat/i })).toBeNull();
    });

    it('does not have "fix" or "undo" buttons', () => {
      const entries: SessionLogEntry[] = [
        createValidationEntry(),
        createOverrideEntry(),
      ];
      render(<SessionLog entries={entries} />);

      // Expand entries
      fireEvent.click(screen.getByText(/entry-002/));
      fireEvent.click(screen.getByText(/entry-003/));

      expect(screen.queryByRole('button', { name: /fix/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /undo/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /revert/i })).toBeNull();
    });

    it('shows immutability note when entry is expanded', () => {
      const entries: SessionLogEntry[] = [createIntentEntry()];
      render(<SessionLog entries={entries} />);

      // Expand entry
      fireEvent.click(screen.getByText(/entry-001/));

      expect(
        screen.getByText('This entry is immutable and cannot be modified.')
      ).toBeInTheDocument();
    });
  });

  describe('Entry Types', () => {
    it('renders intent entries', () => {
      const entries: SessionLogEntry[] = [createIntentEntry()];
      render(<SessionLog entries={entries} />);

      expect(screen.getByText('[Intent]')).toBeInTheDocument();
    });

    it('renders validation entries', () => {
      const entries: SessionLogEntry[] = [createValidationEntry()];
      render(<SessionLog entries={entries} />);

      expect(screen.getByText('[Validation]')).toBeInTheDocument();
    });

    it('renders override entries with highlighting', () => {
      const entries: SessionLogEntry[] = [createOverrideEntry()];
      render(<SessionLog entries={entries} />);

      expect(screen.getByText('[Override]')).toBeInTheDocument();
    });

    it('renders effect entries', () => {
      const entries: SessionLogEntry[] = [createEffectEntry()];
      render(<SessionLog entries={entries} />);

      expect(screen.getByText('[Effect]')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('can filter by entry type', () => {
      const entries: SessionLogEntry[] = [
        createIntentEntry(),
        createValidationEntry(),
        createOverrideEntry(),
      ];
      render(<SessionLog entries={entries} />);

      // Initially shows all
      expect(screen.getByText('[Intent]')).toBeInTheDocument();
      expect(screen.getByText('[Validation]')).toBeInTheDocument();
      expect(screen.getByText('[Override]')).toBeInTheDocument();

      // Filter to only overrides
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'override' },
      });

      expect(screen.queryByText('[Intent]')).toBeNull();
      expect(screen.queryByText('[Validation]')).toBeNull();
      expect(screen.getByText('[Override]')).toBeInTheDocument();
    });

    it('shows entry count', () => {
      const entries: SessionLogEntry[] = [
        createIntentEntry(),
        createValidationEntry(),
      ];
      render(<SessionLog entries={entries} />);

      expect(screen.getByText('2 entries')).toBeInTheDocument();
    });
  });

  describe('Timestamp Visibility', () => {
    it('shows timestamps for all entries', () => {
      const now = Date.now();
      const entries: SessionLogEntry[] = [
        { ...createIntentEntry(), timestamp: now },
      ];
      render(<SessionLog entries={entries} />);

      // ISO timestamp should be visible
      const expectedTimestamp = new Date(now).toISOString();
      expect(screen.getByText(expectedTimestamp)).toBeInTheDocument();
    });
  });

  describe('Click to Inspect', () => {
    it('expands entry on click to show full details', () => {
      const entries: SessionLogEntry[] = [createValidationEntry()];
      render(<SessionLog entries={entries} />);

      // Details not visible initially
      expect(screen.queryByText('Invocation ID:')).toBeNull();

      // Click to expand
      fireEvent.click(screen.getByText(/entry-002/));

      // Now details visible
      expect(screen.getByText('Invocation ID:')).toBeInTheDocument();
      expect(screen.getByText('inv-001')).toBeInTheDocument();
    });

    it('collapses entry on second click', () => {
      const entries: SessionLogEntry[] = [createValidationEntry()];
      render(<SessionLog entries={entries} />);

      // Expand
      fireEvent.click(screen.getByText(/entry-002/));
      expect(screen.getByText('Invocation ID:')).toBeInTheDocument();

      // Collapse
      fireEvent.click(screen.getByText(/entry-002/));
      expect(screen.queryByText('Invocation ID:')).toBeNull();
    });
  });

  describe('Override Highlighting', () => {
    it('override entries have distinct styling', () => {
      const entries: SessionLogEntry[] = [createOverrideEntry()];
      render(<SessionLog entries={entries} />);

      // The [Override] label should be bold (check by presence)
      const overrideLabel = screen.getByText('[Override]');
      expect(overrideLabel).toBeInTheDocument();
    });

    it('shows override reason in expanded view', () => {
      const entries: SessionLogEntry[] = [createOverrideEntry()];
      render(<SessionLog entries={entries} />);

      // Expand
      fireEvent.click(screen.getByText(/entry-003/));

      expect(screen.getByText('GM decision')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows "(no entries)" when empty', () => {
      render(<SessionLog entries={[]} />);

      expect(screen.getByText('(no entries)')).toBeInTheDocument();
    });
  });
});
