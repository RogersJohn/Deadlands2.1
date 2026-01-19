/**
 * IntentCaptureForm Tests (FE-PR 0.2)
 *
 * CRITICAL: These tests prove NON-INTERPRETATION.
 * - Empty or partial intent can be submitted
 * - Submitted Intent equals user input (no transformation)
 * - No client-side blocking
 *
 * Forbidden assertions:
 * - expect(form.isValid).toBe(true)
 * - expect(submitButton).toBeDisabled()
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntentCaptureForm } from '../IntentCaptureForm';
import type { RawIntent } from '../../contracts';

describe('IntentCaptureForm', () => {
  describe('Non-Interpretation Guarantees', () => {
    it('submits empty intent without blocking', () => {
      const onSubmit = vi.fn();
      render(<IntentCaptureForm onSubmit={onSubmit} />);

      // Submit with all fields empty
      fireEvent.click(screen.getByText('Submit Intent'));

      // MUST be called - no blocking
      expect(onSubmit).toHaveBeenCalledTimes(1);

      // Submitted intent should have empty values
      const submittedIntent: RawIntent = onSubmit.mock.calls[0]?.[0] as RawIntent;
      expect(submittedIntent.intentType).toBe('');
      expect(submittedIntent.payload).toEqual({
        actor: '',
        mode: '',
        declaredActions: [],
        declaredConditions: [],
      });
    });

    it('submits partial intent without blocking', () => {
      const onSubmit = vi.fn();
      render(<IntentCaptureForm onSubmit={onSubmit} />);

      // Fill only some fields
      fireEvent.change(screen.getByLabelText('Actor'), {
        target: { value: 'char_001' },
      });

      // Submit with partial data
      fireEvent.click(screen.getByText('Submit Intent'));

      // MUST be called - no blocking
      expect(onSubmit).toHaveBeenCalledTimes(1);

      // Check partial data
      const submittedIntent: RawIntent = onSubmit.mock.calls[0]?.[0] as RawIntent;
      expect(submittedIntent.intentType).toBe(''); // Not filled
      expect(submittedIntent.payload).toEqual({
        actor: 'char_001', // Filled
        mode: '', // Not filled
        declaredActions: [],
        declaredConditions: [],
      });
    });

    it('submitted intent equals user input exactly - no transformation', () => {
      const onSubmit = vi.fn();
      render(<IntentCaptureForm onSubmit={onSubmit} />);

      // Fill all fields with specific values
      fireEvent.change(screen.getByLabelText('Intent Type'), {
        target: { value: 'NONSENSE_TYPE' },
      });
      fireEvent.change(screen.getByLabelText('Actor'), {
        target: { value: '   spaced   ' }, // Keep whitespace
      });
      fireEvent.change(screen.getByLabelText('Mode'), {
        target: { value: 'combat' },
      });

      fireEvent.click(screen.getByText('Submit Intent'));

      const submittedIntent: RawIntent = onSubmit.mock.calls[0]?.[0] as RawIntent;

      // Values must be EXACTLY as entered - no trimming, no normalization
      expect(submittedIntent.intentType).toBe('NONSENSE_TYPE');
      expect((submittedIntent.payload as Record<string, unknown>).actor).toBe('   spaced   ');
      expect((submittedIntent.payload as Record<string, unknown>).mode).toBe('combat');
    });

    it('allows adding empty actions', () => {
      const onSubmit = vi.fn();
      render(<IntentCaptureForm onSubmit={onSubmit} />);

      // Add an empty action
      fireEvent.click(screen.getByText('Add Action'));

      fireEvent.click(screen.getByText('Submit Intent'));

      const submittedIntent: RawIntent = onSubmit.mock.calls[0]?.[0] as RawIntent;
      const payload = submittedIntent.payload as Record<string, unknown>;

      // Empty string should be in the array - not filtered
      expect(payload.declaredActions).toEqual(['']);
    });

    it('allows adding empty conditions', () => {
      const onSubmit = vi.fn();
      render(<IntentCaptureForm onSubmit={onSubmit} />);

      // Add an empty condition
      fireEvent.click(screen.getByText('Add Condition'));

      fireEvent.click(screen.getByText('Submit Intent'));

      const submittedIntent: RawIntent = onSubmit.mock.calls[0]?.[0] as RawIntent;
      const payload = submittedIntent.payload as Record<string, unknown>;

      // Empty string should be in the array - not filtered
      expect(payload.declaredConditions).toEqual(['']);
    });

    it('preserves action values exactly as entered', () => {
      const onSubmit = vi.fn();
      render(<IntentCaptureForm onSubmit={onSubmit} />);

      // Get the action input by label
      const actionInput = screen.getByLabelText('Declared Actions');

      // Add actions with various values
      fireEvent.change(actionInput, { target: { value: 'attack' } });
      fireEvent.click(screen.getByText('Add Action'));

      fireEvent.change(actionInput, { target: { value: '  WEIRD spacing  ' } });
      fireEvent.click(screen.getByText('Add Action'));

      fireEvent.change(actionInput, { target: { value: '123' } });
      fireEvent.click(screen.getByText('Add Action'));

      fireEvent.click(screen.getByText('Submit Intent'));

      const submittedIntent: RawIntent = onSubmit.mock.calls[0]?.[0] as RawIntent;
      const payload = submittedIntent.payload as Record<string, unknown>;

      // Values must be EXACTLY as entered
      expect(payload.declaredActions).toEqual([
        'attack',
        '  WEIRD spacing  ',
        '123',
      ]);
    });

    it('submit button is never disabled', () => {
      render(<IntentCaptureForm onSubmit={vi.fn()} />);

      const submitButton = screen.getByText('Submit Intent');

      // Button must NEVER be disabled - regardless of form state
      expect(submitButton).not.toBeDisabled();
    });

    it('does not show validation errors', () => {
      render(<IntentCaptureForm onSubmit={vi.fn()} />);

      // Submit empty form
      fireEvent.click(screen.getByText('Submit Intent'));

      // No error messages should appear
      expect(screen.queryByText(/error/i)).toBeNull();
      expect(screen.queryByText(/required/i)).toBeNull();
      expect(screen.queryByText(/invalid/i)).toBeNull();
    });

    it('does not prevent submission with nonsense values', () => {
      const onSubmit = vi.fn();
      render(<IntentCaptureForm onSubmit={onSubmit} />);

      // Enter nonsense values
      fireEvent.change(screen.getByLabelText('Intent Type'), {
        target: { value: '!@#$%^&*()' },
      });
      fireEvent.change(screen.getByLabelText('Actor'), {
        target: { value: 'not-a-real-character-id' },
      });

      fireEvent.click(screen.getByText('Submit Intent'));

      // Must submit - no blocking
      expect(onSubmit).toHaveBeenCalledTimes(1);

      const submittedIntent: RawIntent = onSubmit.mock.calls[0]?.[0] as RawIntent;
      expect(submittedIntent.intentType).toBe('!@#$%^&*()');
    });
  });

  describe('Form Structure', () => {
    it('renders all required fields', () => {
      render(<IntentCaptureForm onSubmit={vi.fn()} />);

      expect(screen.getByLabelText('Intent Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Actor')).toBeInTheDocument();
      expect(screen.getByLabelText('Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Declared Actions')).toBeInTheDocument();
      expect(screen.getByLabelText('Declared Conditions')).toBeInTheDocument();
      expect(screen.getByText('Submit Intent')).toBeInTheDocument();
    });

    it('shows intent preview as raw JSON', () => {
      render(<IntentCaptureForm onSubmit={vi.fn()} />);

      expect(screen.getByText('Intent Preview (Raw)')).toBeInTheDocument();
      // Should show JSON structure
      expect(screen.getByText(/"intentType"/)).toBeInTheDocument();
    });
  });

  describe('Action Management', () => {
    it('can add multiple actions', () => {
      const onSubmit = vi.fn();
      render(<IntentCaptureForm onSubmit={onSubmit} />);

      const actionInput = screen.getByLabelText('Declared Actions');

      fireEvent.change(actionInput, { target: { value: 'action1' } });
      fireEvent.click(screen.getByText('Add Action'));

      fireEvent.change(actionInput, { target: { value: 'action2' } });
      fireEvent.click(screen.getByText('Add Action'));

      fireEvent.click(screen.getByText('Submit Intent'));

      const payload = (onSubmit.mock.calls[0]?.[0] as RawIntent).payload as Record<string, unknown>;
      expect(payload.declaredActions).toEqual(['action1', 'action2']);
    });

    it('can remove actions', () => {
      const onSubmit = vi.fn();
      render(<IntentCaptureForm onSubmit={onSubmit} />);

      const actionInput = screen.getByLabelText('Declared Actions');

      fireEvent.change(actionInput, { target: { value: 'action1' } });
      fireEvent.click(screen.getByText('Add Action'));

      fireEvent.change(actionInput, { target: { value: 'action2' } });
      fireEvent.click(screen.getByText('Add Action'));

      // Remove the first action
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0] as HTMLElement);

      fireEvent.click(screen.getByText('Submit Intent'));

      const payload = (onSubmit.mock.calls[0]?.[0] as RawIntent).payload as Record<string, unknown>;
      expect(payload.declaredActions).toEqual(['action2']);
    });
  });

  describe('Condition Management', () => {
    it('can add multiple conditions', () => {
      const onSubmit = vi.fn();
      render(<IntentCaptureForm onSubmit={onSubmit} />);

      const conditionInput = screen.getByLabelText('Declared Conditions');

      fireEvent.change(conditionInput, { target: { value: 'shaken' } });
      fireEvent.click(screen.getByText('Add Condition'));

      fireEvent.change(conditionInput, { target: { value: 'wounded' } });
      fireEvent.click(screen.getByText('Add Condition'));

      fireEvent.click(screen.getByText('Submit Intent'));

      const payload = (onSubmit.mock.calls[0]?.[0] as RawIntent).payload as Record<string, unknown>;
      expect(payload.declaredConditions).toEqual(['shaken', 'wounded']);
    });
  });
});
