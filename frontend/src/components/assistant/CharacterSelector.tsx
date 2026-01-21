/**
 * CharacterSelector Component (Phase 2.5b)
 *
 * Dropdown for selecting a character from character sheets.
 * When selected, injects descriptive text into input.
 *
 * CRITICAL: Text injection ONLY. No structured data.
 * The injected text is the complete interface with the assistant.
 */

import { type ReactElement, type ChangeEvent } from 'react';
import type { CharacterSheet } from '../../types/CharacterSheet';
import { colors, spacing, typography, borderRadius } from '../shared/styles';

export type CharacterSelectorProps = {
  readonly label: string;
  readonly characters: readonly CharacterSheet[];
  readonly selectedId: string | null;
  readonly onSelect: (character: CharacterSheet | null) => void;
  readonly disabled?: boolean;
};

export function CharacterSelector({
  label,
  characters,
  selectedId,
  onSelect,
  disabled = false,
}: CharacterSelectorProps): ReactElement {
  function handleChange(e: ChangeEvent<HTMLSelectElement>): void {
    const id = e.target.value;
    if (id === '') {
      onSelect(null);
    } else {
      const character = characters.find((c) => c.id === id);
      if (character) {
        onSelect(character);
      }
    }
  }

  return (
    <div style={styles.container}>
      <label style={styles.label}>{label}</label>
      <select
        value={selectedId ?? ''}
        onChange={handleChange}
        disabled={disabled}
        style={disabled ? styles.selectDisabled : styles.select}
      >
        <option value="">-- None --</option>
        {characters.map((character) => (
          <option key={character.id} value={character.id}>
            {character.name} ({character.role})
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Generate text description for a character to inject into input.
 * This is the ONLY interface with the assistant.
 */
export function generateCharacterText(
  character: CharacterSheet,
  role: 'actor' | 'target'
): string {
  const lines: string[] = [];

  // First line: description
  if (character.description) {
    lines.push(`${character.name} is described as: ${character.description}.`);
  }

  // Second line: skills and equipment
  const parts: string[] = [];

  if (character.skills && character.skills.length > 0) {
    parts.push(`${character.name} has ${character.skills.join(', ')}`);
  }

  if (character.equipment && character.equipment.length > 0) {
    const verb = parts.length > 0 ? 'and carries' : `${character.name} carries`;
    parts.push(`${verb} ${character.equipment.join(', ')}`);
  }

  if (parts.length > 0) {
    lines.push(parts.join(' ') + '.');
  }

  return lines.join(' ');
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  select: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: borderRadius.md,
    background: colors.bgMedium,
    color: colors.textPrimary,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
  },
  selectDisabled: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.borderDark}`,
    borderRadius: borderRadius.md,
    background: colors.bgDark,
    color: colors.textDisabled,
    cursor: 'not-allowed',
    fontFamily: typography.fontFamily.base,
  },
};
