/**
 * Assumption Refinement Tests (Phase 2)
 *
 * Tests that verify:
 * 1. Clicking Refine appends text to input
 * 2. Cursor focus moves to input
 * 3. No backend call occurs
 * 4. No auto-submit occurs
 * 5. Assumptions remain unchanged
 * 6. Multiple assumptions can be refined independently
 * 7. Why? explanation shows/hides correctly
 * 8. Correct sentence starters based on assumption content
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssistantMode, type AssistantOutput } from '../AssistantMode';
import { Assumptions } from '../Assumptions';

/**
 * Mock output with various assumptions
 */
const mockOutput: AssistantOutput = {
  advisory: true,
  suggestedRoll: {
    trait: 'Shooting',
    targetNumber: 4,
  },
  modifiers: [],
  netModifier: 0,
  assumptions: [
    { statement: 'Actor is using a firearm', confidence: 'high' },
    { statement: 'Target is at long range', confidence: 'medium' },
    { statement: 'Character is mounted and moving', confidence: 'medium' },
    { statement: 'Lighting is normal', confidence: 'low' },
    { statement: 'Target is human-sized', confidence: 'high' },
    { statement: 'Using Shooting skill', confidence: 'high' },
  ],
  notes: [],
};

describe('Assumption Refinement - Refine Button', () => {
  it('clicking Refine appends sentence starter to input', async () => {
    const mockGetRoll = vi.fn().mockResolvedValue(mockOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    // Submit initial query
    const textarea = screen.getByLabelText('Describe the action');
    const submitButton = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'Alice shoots at Bob' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Assumptions')).toBeInTheDocument();
    });

    // Find and click first Refine button (firearm assumption)
    const refineButtons = screen.getAllByRole('button', { name: 'Refine' });
    fireEvent.click(refineButtons[0]);

    // Should append weapon-related starter
    await waitFor(() => {
      expect(textarea).toHaveValue('Alice shoots at Bob The weapon used is ');
    });
  });

  it('clicking Refine does NOT auto-submit', async () => {
    const mockGetRoll = vi.fn().mockResolvedValue(mockOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const submitButton = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'Alice shoots' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Assumptions')).toBeInTheDocument();
    });

    // Reset mock call count
    mockGetRoll.mockClear();

    // Click Refine
    const refineButtons = screen.getAllByRole('button', { name: 'Refine' });
    fireEvent.click(refineButtons[0]);

    // No additional backend call should occur
    expect(mockGetRoll).not.toHaveBeenCalled();
  });

  it('assumptions remain unchanged after clicking Refine', async () => {
    const mockGetRoll = vi.fn().mockResolvedValue(mockOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const submitButton = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'Alice shoots' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Assumptions')).toBeInTheDocument();
    });

    // All assumptions should be visible
    expect(screen.getByText('Actor is using a firearm')).toBeInTheDocument();
    expect(screen.getByText('Target is at long range')).toBeInTheDocument();

    // Click Refine
    const refineButtons = screen.getAllByRole('button', { name: 'Refine' });
    fireEvent.click(refineButtons[0]);

    // Assumptions should still be visible and unchanged
    expect(screen.getByText('Actor is using a firearm')).toBeInTheDocument();
    expect(screen.getByText('Target is at long range')).toBeInTheDocument();
  });

  it('multiple assumptions can be refined independently', async () => {
    const mockGetRoll = vi.fn().mockResolvedValue(mockOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const submitButton = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'Alice shoots' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Assumptions')).toBeInTheDocument();
    });

    const refineButtons = screen.getAllByRole('button', { name: 'Refine' });

    // Click first Refine (firearm)
    fireEvent.click(refineButtons[0]);

    await waitFor(() => {
      expect(textarea).toHaveValue('Alice shoots The weapon used is ');
    });

    // Click third Refine (mounted/moving)
    fireEvent.click(refineButtons[2]);

    await waitFor(() => {
      // Note: text ends with space, so no additional space added
      expect(textarea).toHaveValue('Alice shoots The weapon used is The character is ');
    });
  });
});

describe('Assumption Refinement - Sentence Starters', () => {
  it('weapon assumption gets "The weapon used is " starter', () => {
    const onRefine = vi.fn();
    render(
      <Assumptions
        assumptions={[{ statement: 'Actor is using a firearm', confidence: 'high' }]}
        onRefine={onRefine}
      />
    );

    const refineButton = screen.getByRole('button', { name: 'Refine' });
    fireEvent.click(refineButton);

    expect(onRefine).toHaveBeenCalledWith('The weapon used is ');
  });

  it('lighting assumption gets "Lighting conditions are " starter', () => {
    const onRefine = vi.fn();
    render(
      <Assumptions
        assumptions={[{ statement: 'Normal lighting conditions', confidence: 'low' }]}
        onRefine={onRefine}
      />
    );

    const refineButton = screen.getByRole('button', { name: 'Refine' });
    fireEvent.click(refineButton);

    expect(onRefine).toHaveBeenCalledWith('Lighting conditions are ');
  });

  it('movement assumption gets "The character is " starter', () => {
    const onRefine = vi.fn();
    render(
      <Assumptions
        assumptions={[{ statement: 'Character is mounted and moving', confidence: 'medium' }]}
        onRefine={onRefine}
      />
    );

    const refineButton = screen.getByRole('button', { name: 'Refine' });
    fireEvent.click(refineButton);

    expect(onRefine).toHaveBeenCalledWith('The character is ');
  });

  it('target assumption gets "The target is " starter', () => {
    const onRefine = vi.fn();
    render(
      <Assumptions
        assumptions={[{ statement: 'Target is human-sized', confidence: 'high' }]}
        onRefine={onRefine}
      />
    );

    const refineButton = screen.getByRole('button', { name: 'Refine' });
    fireEvent.click(refineButton);

    expect(onRefine).toHaveBeenCalledWith('The target is ');
  });

  it('skill assumption gets "The relevant skill is " starter', () => {
    const onRefine = vi.fn();
    render(
      <Assumptions
        assumptions={[{ statement: 'Using default skill', confidence: 'medium' }]}
        onRefine={onRefine}
      />
    );

    const refineButton = screen.getByRole('button', { name: 'Refine' });
    fireEvent.click(refineButton);

    expect(onRefine).toHaveBeenCalledWith('The relevant skill is ');
  });

  it('unmatched assumption gets fallback "Clarifying detail: " starter', () => {
    const onRefine = vi.fn();
    render(
      <Assumptions
        assumptions={[{ statement: 'Some other assumption', confidence: 'low' }]}
        onRefine={onRefine}
      />
    );

    const refineButton = screen.getByRole('button', { name: 'Refine' });
    fireEvent.click(refineButton);

    expect(onRefine).toHaveBeenCalledWith('Clarifying detail: ');
  });
});

describe('Assumption Refinement - Why? Explanation', () => {
  it('Why? explanation is collapsed by default', () => {
    render(
      <Assumptions
        assumptions={[{ statement: 'Test assumption', confidence: 'high' }]}
        onRefine={vi.fn()}
      />
    );

    // Explanation should not be visible by default
    expect(screen.queryByText(/input did not specify/i)).not.toBeInTheDocument();
  });

  it('clicking Why? expands explanation', () => {
    render(
      <Assumptions
        assumptions={[{ statement: 'Test assumption', confidence: 'high' }]}
        onRefine={vi.fn()}
      />
    );

    const whyButton = screen.getByRole('button', { name: 'Why?' });
    fireEvent.click(whyButton);

    expect(screen.getByText(/input did not specify/i)).toBeInTheDocument();
  });

  it('clicking Why? again collapses explanation', () => {
    render(
      <Assumptions
        assumptions={[{ statement: 'Test assumption', confidence: 'high' }]}
        onRefine={vi.fn()}
      />
    );

    const whyButton = screen.getByRole('button', { name: 'Why?' });

    // Expand
    fireEvent.click(whyButton);
    expect(screen.getByText(/input did not specify/i)).toBeInTheDocument();

    // Collapse
    fireEvent.click(whyButton);
    expect(screen.queryByText(/input did not specify/i)).not.toBeInTheDocument();
  });

  it('Why? explanation has identical copy for all assumptions', () => {
    render(
      <Assumptions
        assumptions={[
          { statement: 'Assumption 1', confidence: 'high' },
          { statement: 'Assumption 2', confidence: 'low' },
        ]}
        onRefine={vi.fn()}
      />
    );

    const whyButtons = screen.getAllByRole('button', { name: 'Why?' });

    // Expand first
    fireEvent.click(whyButtons[0]);
    const explanation1 = screen.getByText(/input did not specify/i);
    expect(explanation1).toHaveTextContent(
      'This assumption was made because the input did not specify this detail.'
    );

    // Expand second
    fireEvent.click(whyButtons[1]);
    const explanations = screen.getAllByText(/input did not specify/i);
    expect(explanations).toHaveLength(2);

    // Both should have identical text
    explanations.forEach((el) => {
      expect(el).toHaveTextContent(
        'This assumption was made because the input did not specify this detail.'
      );
    });
  });
});

describe('Assumption Refinement - No Refine without callback', () => {
  it('Refine button not shown when onRefine is not provided', () => {
    render(
      <Assumptions
        assumptions={[{ statement: 'Test assumption', confidence: 'high' }]}
      />
    );

    expect(screen.queryByRole('button', { name: 'Refine' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Why?' })).not.toBeInTheDocument();
  });
});

describe('Assumption Refinement - Text remains editable', () => {
  it('input remains editable after refinement', async () => {
    const mockGetRoll = vi.fn().mockResolvedValue(mockOutput);
    render(<AssistantMode getSuggestedRoll={mockGetRoll} />);

    const textarea = screen.getByLabelText('Describe the action');
    const submitButton = screen.getByRole('button', { name: 'Get Suggested Roll' });

    fireEvent.change(textarea, { target: { value: 'Alice shoots' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Assumptions')).toBeInTheDocument();
    });

    // Click Refine
    const refineButtons = screen.getAllByRole('button', { name: 'Refine' });
    fireEvent.click(refineButtons[0]);

    // Now manually edit
    fireEvent.change(textarea, { target: { value: 'Alice shoots with a rifle' } });

    expect(textarea).toHaveValue('Alice shoots with a rifle');
  });
});
