/**
 * Input Suggestions Tests (Phase 1)
 *
 * Tests that verify:
 * 1. Clicking any chip APPENDS text (not overwrites)
 * 2. Dropdown selection APPENDS text
 * 3. No backend call occurs on chip/dropdown interaction
 * 4. Free-text remains editable after insertion
 * 5. Assistant submission behavior is unchanged
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssistantInput } from '../AssistantInput';

describe('Input Suggestions - Text Insertion Only', () => {
  describe('CommonActions chips', () => {
    it('clicking "Shoot" chip inserts text into textarea', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const shootChip = screen.getByRole('button', { name: 'Shoot' });
      fireEvent.click(shootChip);

      const textarea = screen.getByLabelText('Describe the action');
      expect(textarea).toHaveValue('Alice shoots at Bob');
    });

    it('clicking "Fight" chip inserts text into textarea', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const fightChip = screen.getByRole('button', { name: 'Fight' });
      fireEvent.click(fightChip);

      const textarea = screen.getByLabelText('Describe the action');
      expect(textarea).toHaveValue('Alice attacks Bob');
    });

    it('clicking chip does NOT auto-submit', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const shootChip = screen.getByRole('button', { name: 'Shoot' });
      fireEvent.click(shootChip);

      // No backend call should have occurred
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('clicking chip APPENDS to existing text, does not overwrite', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const textarea = screen.getByLabelText('Describe the action');

      // Type some text first
      fireEvent.change(textarea, { target: { value: 'Bob is standing' } });

      // Click a chip
      const shootChip = screen.getByRole('button', { name: 'Shoot' });
      fireEvent.click(shootChip);

      // Should append, not overwrite
      expect(textarea).toHaveValue('Bob is standing Alice shoots at Bob');
    });

    it('all 8 action chips are present', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      expect(screen.getByRole('button', { name: 'Shoot' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fight' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cast a spell' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Use a power' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Chase' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Test of Will' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Intimidate' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Grapple' })).toBeInTheDocument();
    });
  });

  describe('CommonSituations chips', () => {
    it('clicking "At long range" chip appends text fragment', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      // First add some text
      const textarea = screen.getByLabelText('Describe the action');
      fireEvent.change(textarea, { target: { value: 'Alice shoots at Bob' } });

      // Click situation chip
      const rangeChip = screen.getByRole('button', { name: 'At long range' });
      fireEvent.click(rangeChip);

      expect(textarea).toHaveValue('Alice shoots at Bob at long range');
    });

    it('clicking "While mounted" chip appends text fragment', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const textarea = screen.getByLabelText('Describe the action');
      fireEvent.change(textarea, { target: { value: 'Alice shoots' } });

      const mountedChip = screen.getByRole('button', { name: 'While mounted' });
      fireEvent.click(mountedChip);

      expect(textarea).toHaveValue('Alice shoots while mounted');
    });

    it('clicking situation chip does NOT auto-submit', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const rangeChip = screen.getByRole('button', { name: 'At long range' });
      fireEvent.click(rangeChip);

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('all 8 situation chips are present', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      expect(screen.getByRole('button', { name: 'At long range' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'In low light' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'While running' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'While mounted' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Target in cover' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Under fire' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'In melee' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'From prone position' })).toBeInTheDocument();
    });
  });

  describe('DistanceHelper dropdown', () => {
    it('selecting "Short range" appends text', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const textarea = screen.getByLabelText('Describe the action');
      fireEvent.change(textarea, { target: { value: 'Alice shoots at Bob' } });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Short range' } });

      expect(textarea).toHaveValue('Alice shoots at Bob at short range');
    });

    it('selecting "Long range" appends text', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const textarea = screen.getByLabelText('Describe the action');
      fireEvent.change(textarea, { target: { value: 'Alice shoots' } });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Long range' } });

      expect(textarea).toHaveValue('Alice shoots at long range');
    });

    it('selecting distance does NOT auto-submit', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Short range' } });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('selecting "Custom…" shows inline text input', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Custom…' } });

      // Should show custom input
      expect(screen.getByPlaceholderText(/Enter distance/)).toBeInTheDocument();
      expect(screen.getByText('yards away')).toBeInTheDocument();
    });

    it('custom distance input appends correct text on confirm', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const textarea = screen.getByLabelText('Describe the action');
      fireEvent.change(textarea, { target: { value: 'Alice shoots at Bob' } });

      // Open custom input
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Custom…' } });

      // Enter custom value
      const customInput = screen.getByPlaceholderText(/Enter distance/);
      fireEvent.change(customInput, { target: { value: '100' } });

      // Click Add button
      const addButton = screen.getByRole('button', { name: 'Add' });
      fireEvent.click(addButton);

      expect(textarea).toHaveValue('Alice shoots at Bob Bob is 100 yards away');
    });
  });

  describe('Free-text remains editable', () => {
    it('textarea is still editable after clicking chips', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      // Click a chip
      const shootChip = screen.getByRole('button', { name: 'Shoot' });
      fireEvent.click(shootChip);

      // Textarea should be editable
      const textarea = screen.getByLabelText('Describe the action');
      fireEvent.change(textarea, { target: { value: 'Custom text I typed' } });

      expect(textarea).toHaveValue('Custom text I typed');
    });

    it('chips can be clicked multiple times to append', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const rangeChip = screen.getByRole('button', { name: 'At long range' });
      const coverChip = screen.getByRole('button', { name: 'Target in cover' });

      fireEvent.click(rangeChip);
      fireEvent.click(coverChip);

      const textarea = screen.getByLabelText('Describe the action');
      expect(textarea).toHaveValue('at long range target in cover');
    });
  });

  describe('Assistant submission behavior unchanged', () => {
    it('clicking "Get Suggested Roll" still submits the text', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      // Use chips to build query
      const shootChip = screen.getByRole('button', { name: 'Shoot' });
      fireEvent.click(shootChip);

      const rangeChip = screen.getByRole('button', { name: 'At long range' });
      fireEvent.click(rangeChip);

      // Click submit
      const submitButton = screen.getByRole('button', { name: 'Get Suggested Roll' });
      fireEvent.click(submitButton);

      // Should submit the composed text
      expect(mockSubmit).toHaveBeenCalledWith('Alice shoots at Bob at long range');
    });

    it('manual typing still submits correctly', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const textarea = screen.getByLabelText('Describe the action');
      fireEvent.change(textarea, { target: { value: 'Completely custom text' } });

      const submitButton = screen.getByRole('button', { name: 'Get Suggested Roll' });
      fireEvent.click(submitButton);

      expect(mockSubmit).toHaveBeenCalledWith('Completely custom text');
    });
  });

  describe('No hidden state', () => {
    it('chips have no selected/active state after clicking', () => {
      const mockSubmit = vi.fn();
      render(<AssistantInput onSubmit={mockSubmit} />);

      const shootChip = screen.getByRole('button', { name: 'Shoot' });
      fireEvent.click(shootChip);

      // Chip should not have aria-pressed or similar selected state
      expect(shootChip).not.toHaveAttribute('aria-pressed');
      expect(shootChip).not.toHaveAttribute('aria-selected');
    });
  });
});

describe('Input Suggestions - Headings', () => {
  it('displays "Common Actions" heading', () => {
    const mockSubmit = vi.fn();
    render(<AssistantInput onSubmit={mockSubmit} />);

    expect(screen.getByText('Common Actions')).toBeInTheDocument();
  });

  it('displays "Common Situations" heading', () => {
    const mockSubmit = vi.fn();
    render(<AssistantInput onSubmit={mockSubmit} />);

    expect(screen.getByText('Common Situations')).toBeInTheDocument();
  });

  it('displays "Distance" heading', () => {
    const mockSubmit = vi.fn();
    render(<AssistantInput onSubmit={mockSubmit} />);

    expect(screen.getByText('Distance')).toBeInTheDocument();
  });
});
