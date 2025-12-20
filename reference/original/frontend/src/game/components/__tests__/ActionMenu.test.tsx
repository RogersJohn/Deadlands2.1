/**
 * ActionMenu Component Tests
 * Tests for combat action dropdown with tooltips
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionMenu } from '../ActionMenu';

describe('ActionMenu Component', () => {
  const mockOnSelectAction = vi.fn();

  const mockCharacter = {
    id: 1,
    name: 'Test Character',
    agilityDie: '1d8',
    smartsDie: '1d6',
    spiritDie: '1d6',
    strengthDie: '1d8',
    vigorDie: '1d8',
    parry: 5,
    toughness: 6,
    pace: 6,
    skills: [
      { id: 1, name: 'Fighting', dieValue: '1d8' },
      { id: 2, name: 'Shooting', dieValue: '1d6' }
    ],
    edges: []
  };

  describe('Rendering', () => {
    it('should render combat actions dropdown', () => {
      render(
        <ActionMenu
          onSelectAction={mockOnSelectAction}
          disabled={false}
          remainingActions={1}
          character={mockCharacter}
        />
      );

      expect(screen.getByText('Combat Actions')).toBeInTheDocument();
    });

    it('should show remaining actions count', () => {
      render(
        <ActionMenu
          onSelectAction={mockOnSelectAction}
          disabled={false}
          remainingActions={2}
          character={mockCharacter}
        />
      );

      expect(screen.getByText('2 left')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <ActionMenu
          onSelectAction={mockOnSelectAction}
          disabled={true}
          remainingActions={1}
          character={mockCharacter}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Tooltips', () => {
    it('should show tooltip after hover delay', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ActionMenu
          onSelectAction={mockOnSelectAction}
          disabled={false}
          remainingActions={1}
          character={mockCharacter}
        />
      );

      // Open dropdown
      const select = screen.getByRole('combobox');
      await user.click(select);

      // Find an action item (e.g., "Wild Attack")
      const wildAttackItem = await screen.findByText(/Wild Attack/i);

      // Hover over it
      await user.hover(wildAttackItem);

      // Wait for tooltip (1000ms delay)
      await waitFor(
        () => {
          expect(screen.getByText(/Aggressive all-out attack/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should show modifier in tooltip when present', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ActionMenu
          onSelectAction={mockOnSelectAction}
          disabled={false}
          remainingActions={1}
          character={mockCharacter}
        />
      );

      const select = screen.getByRole('combobox');
      await user.click(select);

      const aimItem = await screen.findByText(/^Aim$/);
      await user.hover(aimItem);

      await waitFor(
        () => {
          expect(screen.getByText(/\+2 to next attack/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Arcane Powers', () => {
    it('should not show arcane powers dropdown without Arcane Background', () => {
      render(
        <ActionMenu
          onSelectAction={mockOnSelectAction}
          disabled={false}
          remainingActions={1}
          character={mockCharacter}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();

      // Should only be one dropdown (actions, not powers)
      const dropdowns = screen.getAllByRole('combobox');
      expect(dropdowns).toHaveLength(1);
    });

    it('should show arcane powers option when character has Arcane Background', async () => {
      const arcaneCharacter = {
        ...mockCharacter,
        edges: [
          { id: 1, name: 'Arcane Background (Magic)', description: 'Bolt, Blast, Barrier' }
        ]
      };

      render(
        <ActionMenu
          onSelectAction={mockOnSelectAction}
          disabled={false}
          remainingActions={1}
          character={arcaneCharacter}
        />
      );

      const select = screen.getByRole('combobox');
      const user = userEvent.setup({ delay: null });
      await user.click(select);

      // "Use Arcane Power" option should be available
      const usePowerOption = await screen.findByText(/Use Arcane Power/i);
      expect(usePowerOption).toBeInTheDocument();
    });
  });

  describe('Multi-Action Warning', () => {
    it('should show multi-action penalty warning when remaining actions > 1', () => {
      render(
        <ActionMenu
          onSelectAction={mockOnSelectAction}
          disabled={false}
          remainingActions={2}
          character={mockCharacter}
        />
      );

      expect(screen.getByText(/Multi-Action: -2 penalty per extra action/i)).toBeInTheDocument();
    });

    it('should not show multi-action warning when remaining actions = 1', () => {
      render(
        <ActionMenu
          onSelectAction={mockOnSelectAction}
          disabled={false}
          remainingActions={1}
          character={mockCharacter}
        />
      );

      expect(screen.queryByText(/Multi-Action: -2 penalty per extra action/i)).not.toBeInTheDocument();
    });
  });
});
