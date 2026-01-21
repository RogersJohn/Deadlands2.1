/**
 * CharacterContext Tests (Phase 2.5b)
 *
 * Tests for the character context panel with actor/target selectors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterContext } from '../CharacterContext';
import { characterSheetService } from '../../../services/characterSheetService';
import type { CharacterSheet } from '../../../types/CharacterSheet';

const mockCharacters: CharacterSheet[] = [
  {
    id: 'char-1',
    name: 'Alice',
    role: 'PC',
    description: 'a seasoned gunslinger',
    skills: ['Shooting d8', 'Fighting d6'],
    equipment: ['rifle'],
  },
  {
    id: 'char-2',
    name: 'Bob',
    role: 'NPC',
    description: 'a local bartender',
    equipment: ['shotgun'],
  },
];

describe('CharacterContext', () => {
  beforeEach(() => {
    characterSheetService.clear();
  });

  it('shows empty state when no characters exist', () => {
    render(<CharacterContext onInjectText={vi.fn()} />);

    expect(screen.getByText(/No character sheets available/)).toBeInTheDocument();
    expect(screen.getByText('Create some')).toHaveAttribute('href', '#characters');
  });

  it('shows both selectors when characters exist', () => {
    characterSheetService.loadInitialData(mockCharacters);
    render(<CharacterContext onInjectText={vi.fn()} />);

    expect(screen.getByText('Acting Character')).toBeInTheDocument();
    expect(screen.getByText('Target Character')).toBeInTheDocument();
  });

  it('calls onInjectText when actor is selected', () => {
    characterSheetService.loadInitialData(mockCharacters);
    const onInjectText = vi.fn();
    render(<CharacterContext onInjectText={onInjectText} />);

    const actorSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(actorSelect, { target: { value: 'char-1' } });

    expect(onInjectText).toHaveBeenCalledTimes(1);
    expect(onInjectText).toHaveBeenCalledWith(
      expect.stringContaining('Alice is described as: a seasoned gunslinger.')
    );
  });

  it('calls onInjectText when target is selected', () => {
    characterSheetService.loadInitialData(mockCharacters);
    const onInjectText = vi.fn();
    render(<CharacterContext onInjectText={onInjectText} />);

    const targetSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(targetSelect, { target: { value: 'char-2' } });

    expect(onInjectText).toHaveBeenCalledTimes(1);
    expect(onInjectText).toHaveBeenCalledWith(
      expect.stringContaining('Bob is described as: a local bartender.')
    );
  });

  it('does not call onInjectText when selection is cleared', () => {
    characterSheetService.loadInitialData(mockCharacters);
    const onInjectText = vi.fn();
    render(<CharacterContext onInjectText={onInjectText} />);

    const actorSelect = screen.getAllByRole('combobox')[0];

    // First select
    fireEvent.change(actorSelect, { target: { value: 'char-1' } });
    onInjectText.mockClear();

    // Then clear
    fireEvent.change(actorSelect, { target: { value: '' } });

    expect(onInjectText).not.toHaveBeenCalled();
  });

  it('disables selectors when disabled prop is true', () => {
    characterSheetService.loadInitialData(mockCharacters);
    render(<CharacterContext onInjectText={vi.fn()} disabled={true} />);

    const selects = screen.getAllByRole('combobox');
    expect(selects[0]).toBeDisabled();
    expect(selects[1]).toBeDisabled();
  });

  it('allows selecting different characters for actor and target', () => {
    characterSheetService.loadInitialData(mockCharacters);
    const onInjectText = vi.fn();
    render(<CharacterContext onInjectText={onInjectText} />);

    const [actorSelect, targetSelect] = screen.getAllByRole('combobox');

    fireEvent.change(actorSelect, { target: { value: 'char-1' } });
    fireEvent.change(targetSelect, { target: { value: 'char-2' } });

    expect(onInjectText).toHaveBeenCalledTimes(2);
    expect(onInjectText).toHaveBeenNthCalledWith(1, expect.stringContaining('Alice'));
    expect(onInjectText).toHaveBeenNthCalledWith(2, expect.stringContaining('Bob'));
  });
});
