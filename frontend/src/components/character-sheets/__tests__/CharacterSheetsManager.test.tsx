/**
 * CharacterSheetsManager Tests (Phase 2.5a)
 *
 * Tests for the character sheet management UI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CharacterSheetsManager } from '../CharacterSheetsManager';
import { characterSheetService } from '../../../services/characterSheetService';
import type { CharacterSheet } from '../../../types/CharacterSheet';

const mockCharacters: CharacterSheet[] = [
  {
    id: 'char-1',
    name: 'Alice',
    role: 'PC',
    description: 'A gunslinger',
    skills: ['Shooting d8'],
    equipment: ['rifle'],
  },
  {
    id: 'char-2',
    name: 'Bob',
    role: 'NPC',
    description: 'A bartender',
  },
];

describe('CharacterSheetsManager', () => {
  beforeEach(() => {
    characterSheetService.clear();
  });

  describe('Empty state', () => {
    it('shows empty state message when no characters exist', () => {
      render(<CharacterSheetsManager />);

      expect(screen.getByText(/No character sheets yet/)).toBeInTheDocument();
    });

    it('shows New Character button', () => {
      render(<CharacterSheetsManager />);

      expect(screen.getByRole('button', { name: /New Character/i })).toBeInTheDocument();
    });
  });

  describe('List view', () => {
    it('displays all characters', () => {
      characterSheetService.loadInitialData(mockCharacters);
      render(<CharacterSheetsManager />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('displays character details', () => {
      characterSheetService.loadInitialData(mockCharacters);
      render(<CharacterSheetsManager />);

      expect(screen.getByText('PC')).toBeInTheDocument();
      expect(screen.getByText('NPC')).toBeInTheDocument();
      expect(screen.getByText('A gunslinger')).toBeInTheDocument();
      expect(screen.getByText('Shooting d8')).toBeInTheDocument();
    });

    it('shows Edit and Delete buttons for each character', () => {
      characterSheetService.loadInitialData(mockCharacters);
      render(<CharacterSheetsManager />);

      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });

      expect(editButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('Create character', () => {
    it('switches to create form when New Character is clicked', () => {
      render(<CharacterSheetsManager />);

      fireEvent.click(screen.getByRole('button', { name: /New Character/i }));

      expect(screen.getByText('New Character Sheet')).toBeInTheDocument();
      expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    });

    it('creates a character when form is submitted', async () => {
      render(<CharacterSheetsManager />);

      fireEvent.click(screen.getByRole('button', { name: /New Character/i }));

      fireEvent.change(screen.getByLabelText('Name *'), {
        target: { value: 'Charlie' },
      });
      fireEvent.change(screen.getByLabelText('Description'), {
        target: { value: 'A deputy' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create Character' }));

      await waitFor(() => {
        expect(screen.getByText('Charlie')).toBeInTheDocument();
      });
    });

    it('returns to list view after creating', async () => {
      render(<CharacterSheetsManager />);

      fireEvent.click(screen.getByRole('button', { name: /New Character/i }));
      fireEvent.change(screen.getByLabelText('Name *'), {
        target: { value: 'Charlie' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create Character' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /New Character/i })).toBeInTheDocument();
      });
    });

    it('returns to list view when Cancel is clicked', () => {
      render(<CharacterSheetsManager />);

      fireEvent.click(screen.getByRole('button', { name: /New Character/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByRole('button', { name: /New Character/i })).toBeInTheDocument();
    });
  });

  describe('Edit character', () => {
    it('switches to edit form when Edit is clicked', () => {
      characterSheetService.loadInitialData(mockCharacters);
      render(<CharacterSheetsManager />);

      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Edit Character Sheet')).toBeInTheDocument();
      expect(screen.getByLabelText('Name *')).toHaveValue('Alice');
    });

    it('updates character when form is submitted', async () => {
      characterSheetService.loadInitialData(mockCharacters);
      render(<CharacterSheetsManager />);

      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      fireEvent.click(editButtons[0]);

      fireEvent.change(screen.getByLabelText('Description'), {
        target: { value: 'Updated description' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(screen.getByText('Updated description')).toBeInTheDocument();
      });
    });
  });

  describe('Delete character', () => {
    it('removes character when Delete is clicked', async () => {
      characterSheetService.loadInitialData(mockCharacters);
      render(<CharacterSheetsManager />);

      expect(screen.getByText('Alice')).toBeInTheDocument();

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });
});
