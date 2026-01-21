/**
 * CommonActions Component (Phase 1 - Input Suggestions)
 *
 * Phrase chips that INSERT TEXT into the textarea.
 * No form fields, no state persistence, no validation.
 * Clicking a chip appends text - does NOT overwrite, does NOT auto-submit.
 */

import type { ReactElement } from 'react';
import { colors, spacing, typography, borderRadius } from '../shared/styles';

/**
 * Action phrase definitions
 * Each maps to a phrase that gets inserted into the textarea
 */
const ACTION_PHRASES: readonly { readonly label: string; readonly phrase: string }[] = [
  { label: 'Shoot', phrase: 'Alice shoots at Bob' },
  { label: 'Fight', phrase: 'Alice attacks Bob' },
  { label: 'Cast a spell', phrase: 'Alice casts a spell' },
  { label: 'Use a power', phrase: 'Alice uses a power' },
  { label: 'Chase', phrase: 'Alice chases Bob' },
  { label: 'Test of Will', phrase: 'Alice tests will against Bob' },
  { label: 'Intimidate', phrase: 'Alice intimidates Bob' },
  { label: 'Grapple', phrase: 'Alice grapples Bob' },
];

export type CommonActionsProps = {
  readonly onInsertText: (text: string) => void;
  readonly disabled?: boolean;
};

export function CommonActions({
  onInsertText,
  disabled = false,
}: CommonActionsProps): ReactElement {
  return (
    <div style={styles.container}>
      <h4 style={styles.heading}>Common Actions</h4>
      <div style={styles.chipContainer}>
        {ACTION_PHRASES.map(({ label, phrase }) => (
          <button
            key={label}
            type="button"
            onClick={() => onInsertText(phrase)}
            disabled={disabled}
            style={disabled ? styles.chipDisabled : styles.chip}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: spacing.md,
  },
  heading: {
    margin: `0 0 ${spacing.xs} 0`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    color: colors.textMuted,
  },
  chipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: borderRadius.md,
    background: colors.bgMedium,
    color: colors.textSecondary,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
  },
  chipDisabled: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.borderDark}`,
    borderRadius: borderRadius.md,
    background: colors.bgDark,
    color: colors.textDisabled,
    cursor: 'not-allowed',
    fontFamily: typography.fontFamily.base,
  },
};
