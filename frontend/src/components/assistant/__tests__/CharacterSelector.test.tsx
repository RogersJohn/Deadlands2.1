/**
 * CharacterSelector Tests (Phase 2.5b)
 *
 * Tests for character selection dropdown and text generation.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterSelector, generateCharacterText } from '../CharacterSelector';
import type { CharacterSheet } from '../../../types/CharacterSheet';

const mockCharacters: CharacterSheet[] = [
  {
    id: 'char-1',
    name: 'Alice',
    role: 'PC',
    description: 'a seasoned gunslinger',
    skills: ['Shooting d8', 'Fighting d6'],
    equipment: ['rifle', 'revolver'],
  },
  {
    id: 'char-2',
    name: 'Bob',
    role: 'NPC',
    description: 'a local bartender',
    equipment: ['shotgun'],
  },
  {
    id: 'char-3',
    name: 'Charlie',
    role: 'NPC',
    description: '',
    skills: ['Notice d6'],
  },
];

describe('CharacterSelector', () => {
  it('renders with label', () => {
    render(
      <CharacterSelector
        label="Acting Character"
        characters={mockCharacters}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Acting Character')).toBeInTheDocument();
  });

  it('shows "-- None --" as default option', () => {
    render(
      <CharacterSelector
        label="Actor"
        characters={mockCharacters}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getByText('-- None --')).toBeInTheDocument();
  });

  it('lists all characters with name and role', () => {
    render(
      <CharacterSelector
        label="Actor"
        characters={mockCharacters}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Alice (PC)')).toBeInTheDocument();
    expect(screen.getByText('Bob (NPC)')).toBeInTheDocument();
    expect(screen.getByText('Charlie (NPC)')).toBeInTheDocument();
  });

  it('calls onSelect with character when selected', () => {
    const onSelect = vi.fn();
    render(
      <CharacterSelector
        label="Actor"
        characters={mockCharacters}
        selectedId={null}
        onSelect={onSelect}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'char-1' } });

    expect(onSelect).toHaveBeenCalledWith(mockCharacters[0]);
  });

  it('calls onSelect with null when cleared', () => {
    const onSelect = vi.fn();
    render(
      <CharacterSelector
        label="Actor"
        characters={mockCharacters}
        selectedId="char-1"
        onSelect={onSelect}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '' } });

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('shows selected character', () => {
    render(
      <CharacterSelector
        label="Actor"
        characters={mockCharacters}
        selectedId="char-2"
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toHaveValue('char-2');
  });

  it('disables select when disabled prop is true', () => {
    render(
      <CharacterSelector
        label="Actor"
        characters={mockCharacters}
        selectedId={null}
        onSelect={vi.fn()}
        disabled={true}
      />
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});

describe('generateCharacterText', () => {
  it('generates text with description', () => {
    const character: CharacterSheet = {
      id: 'test',
      name: 'Alice',
      role: 'PC',
      description: 'a seasoned gunslinger',
    };

    const result = generateCharacterText(character, 'actor');

    expect(result).toBe('Alice is described as: a seasoned gunslinger.');
  });

  it('generates text with skills and equipment', () => {
    const character: CharacterSheet = {
      id: 'test',
      name: 'Alice',
      role: 'PC',
      description: 'a gunslinger',
      skills: ['Shooting d8', 'Fighting d6'],
      equipment: ['rifle'],
    };

    const result = generateCharacterText(character, 'actor');

    expect(result).toContain('Alice is described as: a gunslinger.');
    expect(result).toContain('Alice has Shooting d8, Fighting d6');
    expect(result).toContain('and carries rifle');
  });

  it('generates text with only skills', () => {
    const character: CharacterSheet = {
      id: 'test',
      name: 'Bob',
      role: 'NPC',
      description: 'a bartender',
      skills: ['Notice d6'],
    };

    const result = generateCharacterText(character, 'actor');

    expect(result).toContain('Bob is described as: a bartender.');
    expect(result).toContain('Bob has Notice d6.');
    expect(result).not.toContain('carries');
  });

  it('generates text with only equipment', () => {
    const character: CharacterSheet = {
      id: 'test',
      name: 'Charlie',
      role: 'NPC',
      description: 'a deputy',
      equipment: ['badge', 'revolver'],
    };

    const result = generateCharacterText(character, 'actor');

    expect(result).toContain('Charlie is described as: a deputy.');
    expect(result).toContain('Charlie carries badge, revolver.');
    expect(result).not.toContain('has');
  });

  it('returns empty string when no description, skills, or equipment', () => {
    const character: CharacterSheet = {
      id: 'test',
      name: 'Empty',
      role: 'NPC',
      description: '',
    };

    const result = generateCharacterText(character, 'actor');

    expect(result).toBe('');
  });

  it('handles empty skills and equipment arrays', () => {
    const character: CharacterSheet = {
      id: 'test',
      name: 'Minimal',
      role: 'PC',
      description: 'a wanderer',
      skills: [],
      equipment: [],
    };

    const result = generateCharacterText(character, 'actor');

    expect(result).toBe('Minimal is described as: a wanderer.');
  });
});
