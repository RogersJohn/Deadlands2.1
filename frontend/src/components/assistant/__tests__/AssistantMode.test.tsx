/**
 * AssistantMode Tests (PR #2 - Frontend Assistant Mode)
 *
 * Tests that verify:
 * 1. Assistant mode is visually separate from Audit mode
 * 2. Advisory flag is verified before rendering
 * 3. Assumptions are always visible
 * 4. Authority disclaimer is always visible when output shown
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssistantMode, type AssistantOutput } from '../AssistantMode';

/**
 * Valid mock output - meets all requirements
 */
const validOutput: AssistantOutput = {
  advisory: true,
  suggestedRoll: {
    trait: 'Shooting',
    targetNumber: 4,
  },
  modifiers: [
    { label: 'Range (Long)', value: -2, source: 'Distance: 100 yards' },
    { label: 'Mounted (Moving)', value: -2, source: 'Shooting while galloping' },
  ],
  netModifier: -4,
  assumptions: [
    { statement: 'Actor is using a firearm', confidence: 'high' },
    { statement: 'Target is at long range (100 yards)', confidence: 'high' },
    { statement: 'Actor is mounted and moving', confidence: 'medium' },
  ],
  notes: ['This is a ranged attack action'],
};

describe('AssistantMode', () => {
  it('renders input form on initial load', () => {
    const mockGetRoll = vi.fn().mockResolvedValue(validOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    expect(screen.getByText('Assistant Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Describe the action')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Suggested Roll' })).toBeInTheDocument();
  });

  it('displays all output sections after successful submission', async () => {
    const mockGetRoll = vi.fn().mockResolvedValue(validOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const button = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'Alice shoots at Bob' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Suggested Roll')).toBeInTheDocument();
    });

    // Verify all sections are present
    expect(screen.getByText('Suggested Roll')).toBeInTheDocument();
    expect(screen.getByText('Modifiers')).toBeInTheDocument();
    expect(screen.getByText('Assumptions')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('always displays authority disclaimer when output is shown', async () => {
    const mockGetRoll = vi.fn().mockResolvedValue(validOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const button = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'Alice shoots at Bob' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/advisory suggestion only/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/GM is the final authority/i)).toBeInTheDocument();
  });

  it('displays all assumptions - never hidden', async () => {
    const mockGetRoll = vi.fn().mockResolvedValue(validOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const button = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'Alice shoots at Bob' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Assumptions')).toBeInTheDocument();
    });

    // All assumptions should be visible
    expect(screen.getByText('Actor is using a firearm')).toBeInTheDocument();
    expect(screen.getByText('Target is at long range (100 yards)')).toBeInTheDocument();
    expect(screen.getByText('Actor is mounted and moving')).toBeInTheDocument();
  });

  it('rejects output if advisory flag is not true', async () => {
    const invalidOutput = { ...validOutput, advisory: false as const };
    const mockGetRoll = vi.fn().mockResolvedValue(invalidOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const button = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/not marked as advisory/i)).toBeInTheDocument();
    });

    // Output sections should NOT be visible
    expect(screen.queryByText('Suggested Roll')).not.toBeInTheDocument();
  });

  it('displays modifiers with correct formatting', async () => {
    const mockGetRoll = vi.fn().mockResolvedValue(validOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const button = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Modifiers')).toBeInTheDocument();
    });

    // Check modifiers are displayed with values
    expect(screen.getByText('Range (Long)')).toBeInTheDocument();
    // Both modifiers have -2, so use getAllByText
    const minusTwos = screen.getAllByText('-2');
    expect(minusTwos).toHaveLength(2);
    expect(screen.getByText('Mounted (Moving)')).toBeInTheDocument();
  });

  it('displays net modifier in suggested roll section', async () => {
    const mockGetRoll = vi.fn().mockResolvedValue(validOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const button = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Shooting')).toBeInTheDocument();
    });

    // Net modifier should be shown
    expect(screen.getByText('-4')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    const mockGetRoll = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const button = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('disables input while processing', async () => {
    // Make the promise never resolve during the test
    const mockGetRoll = vi.fn().mockImplementation(() => new Promise(() => {}));
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const button = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    expect(textarea).toBeDisabled();
    expect(button).toBeDisabled();
  });
});

describe('AssistantMode - Separation from Audit Mode', () => {
  it('does not use IntentCaptureForm', () => {
    const mockGetRoll = vi.fn().mockResolvedValue(validOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    // IntentCaptureForm specific elements should NOT be present
    expect(screen.queryByText('Intent Declaration')).not.toBeInTheDocument();
    expect(screen.queryByText('Intent Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Declared Actions')).not.toBeInTheDocument();
  });

  it('uses natural language input, not structured form', () => {
    const mockGetRoll = vi.fn().mockResolvedValue(validOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    // Should have a simple textarea, not multiple form fields
    const textareas = screen.getAllByRole('textbox');
    expect(textareas).toHaveLength(1);

    // Should have descriptive label
    expect(screen.getByLabelText('Describe the action')).toBeInTheDocument();
  });
});
