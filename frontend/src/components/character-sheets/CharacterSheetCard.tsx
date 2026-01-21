/**
 * CharacterSheetCard Component (Phase 2.5a)
 *
 * Displays a single character sheet with edit/delete actions.
 */

import { type ReactElement } from 'react';
import type { CharacterSheet } from '../../types/CharacterSheet';
import { colors, spacing, typography, borderRadius, componentStyles } from '../shared/styles';

export type CharacterSheetCardProps = {
  readonly character: CharacterSheet;
  readonly onEdit: (id: string) => void;
  readonly onDelete: (id: string) => void;
};

export function CharacterSheetCard({
  character,
  onEdit,
  onDelete,
}: CharacterSheetCardProps): ReactElement {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h4 style={styles.name}>{character.name}</h4>
        <span style={styles.role}>{character.role}</span>
      </div>

      {character.description && (
        <p style={styles.description}>{character.description}</p>
      )}

      {character.skills && character.skills.length > 0 && (
        <div style={componentStyles.row}>
          <span style={componentStyles.fieldLabel}>Skills:</span>
          <span style={componentStyles.fieldValue}>
            {character.skills.join(', ')}
          </span>
        </div>
      )}

      {character.equipment && character.equipment.length > 0 && (
        <div style={componentStyles.row}>
          <span style={componentStyles.fieldLabel}>Equipment:</span>
          <span style={componentStyles.fieldValue}>
            {character.equipment.join(', ')}
          </span>
        </div>
      )}

      {character.notes && (
        <div style={componentStyles.row}>
          <span style={componentStyles.fieldLabel}>Notes:</span>
          <span style={componentStyles.fieldValue}>{character.notes}</span>
        </div>
      )}

      <div style={styles.actions}>
        <button
          type="button"
          onClick={() => onEdit(character.id)}
          style={styles.editButton}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(character.id)}
          style={styles.deleteButton}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: spacing.lg,
    background: colors.bgMedium,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.borderMedium}`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    margin: 0,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  role: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    padding: `${spacing.xs} ${spacing.sm}`,
    background: colors.bgDarker,
    borderRadius: borderRadius.sm,
  },
  description: {
    margin: `0 0 ${spacing.md} 0`,
    color: colors.textSecondary,
    fontSize: typography.fontSize.base,
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTop: `1px solid ${colors.borderDark}`,
  },
  editButton: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: borderRadius.sm,
    background: 'transparent',
    color: colors.textMuted,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
  },
  deleteButton: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.borderDark}`,
    borderRadius: borderRadius.sm,
    background: 'transparent',
    color: colors.textMuted,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
  },
};
