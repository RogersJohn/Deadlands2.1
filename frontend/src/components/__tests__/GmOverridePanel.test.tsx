/**
 * GmOverridePanel Tests (FE-PR 1.0)
 *
 * CRITICAL: These tests prove NO authority creep.
 * - Overrides require a reason (cannot skip)
 * - No one-click overrides
 * - No auto-override
 * - No "fix this" shortcuts
 *
 * Forbidden assertions:
 * - expect(screen.getByText('Fix')).toBeInTheDocument()
 * - expect(screen.getByText('Quick Override')).toBeInTheDocument()
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GmOverridePanel, OverrideDisplay } from '../GmOverridePanel';
import type { ValidationReport, GmOverride } from '../../contracts';

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
    outcome: 'FAIL',
    violations: [],
    ambiguity: null,
    payload: {},
    conflicts: [],
    ...overrides,
  };
}

/**
 * Factory for creating test GmOverride
 */
function createTestOverride(
  overrides: Partial<GmOverride> = {}
): GmOverride {
  return {
    overrideId: 'override-001',
    parentOverrideId: null,
    originalReport: createTestReport(),
    overriddenOutcome: { newOutcome: 'PASS' },
    scope: 'OUTCOME',
    warning: { severity: 'WARNING', message: 'GM override applied' },
    reason: 'GM decided to allow this action',
    issuedBy: 'gm-001',
    issuedAt: Date.now(),
    ...overrides,
  };
}

describe('GmOverridePanel', () => {
  describe('Override Creation Requires Reason', () => {
    it('shows multi-step flow starting with "Create GM Override" button', () => {
      render(
        <GmOverridePanel
          report={createTestReport()}
          existingOverrides={[]}
          onCreateOverride={vi.fn()}
        />
      );

      expect(screen.getByText('Create GM Override')).toBeInTheDocument();
    });

    it('cannot proceed to confirm without entering reason', () => {
      render(
        <GmOverridePanel
          report={createTestReport()}
          existingOverrides={[]}
          onCreateOverride={vi.fn()}
        />
      );

      // Start the flow
      fireEvent.click(screen.getByText('Create GM Override'));

      // Select target
      fireEvent.click(screen.getByText('Validation Result'));

      // Select action
      fireEvent.click(screen.getByText('Change Outcome to PASS'));

      // Now on reason step - "Proceed to Confirm" should be disabled
      const proceedButton = screen.getByText('Proceed to Confirm');
      expect(proceedButton).toBeDisabled();
    });

    it('cannot proceed with whitespace-only reason', () => {
      render(
        <GmOverridePanel
          report={createTestReport()}
          existingOverrides={[]}
          onCreateOverride={vi.fn()}
        />
      );

      // Navigate to reason step
      fireEvent.click(screen.getByText('Create GM Override'));
      fireEvent.click(screen.getByText('Validation Result'));
      fireEvent.click(screen.getByText('Change Outcome to PASS'));

      // Enter whitespace-only reason
      const reasonInput = screen.getByLabelText('Reason (required):');
      fireEvent.change(reasonInput, { target: { value: '   ' } });

      // Enter warning
      const warningInput = screen.getByLabelText('Warning Message (required):');
      fireEvent.change(warningInput, { target: { value: 'Test warning' } });

      // Still disabled
      const proceedButton = screen.getByText('Proceed to Confirm');
      expect(proceedButton).toBeDisabled();
    });

    it('cannot proceed without warning message', () => {
      render(
        <GmOverridePanel
          report={createTestReport()}
          existingOverrides={[]}
          onCreateOverride={vi.fn()}
        />
      );

      // Navigate to reason step
      fireEvent.click(screen.getByText('Create GM Override'));
      fireEvent.click(screen.getByText('Validation Result'));
      fireEvent.click(screen.getByText('Change Outcome to PASS'));

      // Enter reason but no warning
      const reasonInput = screen.getByLabelText('Reason (required):');
      fireEvent.change(reasonInput, { target: { value: 'Valid reason' } });

      // Proceed button still disabled
      const proceedButton = screen.getByText('Proceed to Confirm');
      expect(proceedButton).toBeDisabled();
    });

    it('can proceed when both reason and warning are provided', () => {
      render(
        <GmOverridePanel
          report={createTestReport()}
          existingOverrides={[]}
          onCreateOverride={vi.fn()}
        />
      );

      // Navigate to reason step
      fireEvent.click(screen.getByText('Create GM Override'));
      fireEvent.click(screen.getByText('Validation Result'));
      fireEvent.click(screen.getByText('Change Outcome to PASS'));

      // Enter reason and warning
      const reasonInput = screen.getByLabelText('Reason (required):');
      fireEvent.change(reasonInput, { target: { value: 'Valid reason' } });

      const warningInput = screen.getByLabelText('Warning Message (required):');
      fireEvent.change(warningInput, { target: { value: 'Test warning' } });

      // Now enabled
      const proceedButton = screen.getByText('Proceed to Confirm');
      expect(proceedButton).not.toBeDisabled();
    });
  });

  describe('No One-Click Overrides', () => {
    it('requires at least 4 clicks to create an override', () => {
      const onCreateOverride = vi.fn();
      render(
        <GmOverridePanel
          report={createTestReport()}
          existingOverrides={[]}
          onCreateOverride={onCreateOverride}
        />
      );

      // Click 1: Start
      fireEvent.click(screen.getByText('Create GM Override'));
      expect(onCreateOverride).not.toHaveBeenCalled();

      // Click 2: Select target
      fireEvent.click(screen.getByText('Validation Result'));
      expect(onCreateOverride).not.toHaveBeenCalled();

      // Click 3: Select action
      fireEvent.click(screen.getByText('Change Outcome to PASS'));
      expect(onCreateOverride).not.toHaveBeenCalled();

      // Fill required fields
      fireEvent.change(screen.getByLabelText('Reason (required):'), {
        target: { value: 'Test reason' },
      });
      fireEvent.change(screen.getByLabelText('Warning Message (required):'), {
        target: { value: 'Test warning' },
      });

      // Click 4: Proceed to confirm
      fireEvent.click(screen.getByText('Proceed to Confirm'));
      expect(onCreateOverride).not.toHaveBeenCalled();

      // Click 5: Final submit
      fireEvent.click(screen.getByText('Submit Override'));
      expect(onCreateOverride).toHaveBeenCalledTimes(1);
    });

    it('does not have any "Fix" or "Quick" buttons', () => {
      render(
        <GmOverridePanel
          report={createTestReport()}
          existingOverrides={[]}
          onCreateOverride={vi.fn()}
        />
      );

      expect(screen.queryByText(/fix/i)).toBeNull();
      expect(screen.queryByText(/quick/i)).toBeNull();
      expect(screen.queryByText(/auto/i)).toBeNull();
    });
  });

  describe('Override Display', () => {
    it('shows "GM Override Applied" label', () => {
      render(<OverrideDisplay override={createTestOverride()} />);

      expect(screen.getByText('GM Override Applied')).toBeInTheDocument();
    });

    it('shows reason text always visible', () => {
      const override = createTestOverride({
        reason: 'Player made a compelling argument',
      });

      render(<OverrideDisplay override={override} />);

      expect(screen.getByText('Player made a compelling argument')).toBeInTheDocument();
    });

    it('shows warning with severity', () => {
      const override = createTestOverride({
        warning: { severity: 'CRITICAL', message: 'Rule was bypassed' },
      });

      render(<OverrideDisplay override={override} />);

      expect(screen.getByText('[CRITICAL] Rule was bypassed')).toBeInTheDocument();
    });
  });

  describe('No Authority Creep', () => {
    it('does not show "recommended" or "suggested" override options', () => {
      render(
        <GmOverridePanel
          report={createTestReport()}
          existingOverrides={[]}
          onCreateOverride={vi.fn()}
        />
      );

      // Open the flow
      fireEvent.click(screen.getByText('Create GM Override'));

      expect(screen.queryByText(/recommend/i)).toBeNull();
      expect(screen.queryByText(/suggest/i)).toBeNull();
      expect(screen.queryByText(/should/i)).toBeNull();
    });

    it('does not auto-select any default action', () => {
      render(
        <GmOverridePanel
          report={createTestReport()}
          existingOverrides={[]}
          onCreateOverride={vi.fn()}
        />
      );

      // Open the flow
      fireEvent.click(screen.getByText('Create GM Override'));
      fireEvent.click(screen.getByText('Validation Result'));

      // All action buttons should be equally styled (no "selected" state)
      const passButton = screen.getByText('Change Outcome to PASS');
      const failButton = screen.getByText('Change Outcome to FAIL');
      const ambiguousButton = screen.getByText('Change Outcome to AMBIGUOUS');

      // All should have the same aria-pressed state (false or undefined)
      expect(passButton.getAttribute('aria-pressed')).toBeNull();
      expect(failButton.getAttribute('aria-pressed')).toBeNull();
      expect(ambiguousButton.getAttribute('aria-pressed')).toBeNull();
    });
  });
});
