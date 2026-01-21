/**
 * CommonSituations Component (Phase 1 - Input Suggestions)
 *
 * Phrase chips that INSERT TEXT fragments into the textarea.
 * No grammar enforcement, no deduplication, no validation.
 * Clicking a chip appends text - does NOT overwrite, does NOT auto-submit.
 */

import type { ReactElement } from 'react';
import { colors, spacing, typography, borderRadius } from '../shared/styles';

/**
 * Situation phrase definitions
 * Each maps to a fragment that gets appended to the textarea
 */
const SITUATION_PHRASES: readonly { readonly label: string; readonly phrase: string }[] = [
  { label: 'At long range', phrase: 'at long range' },
  { label: 'In low light', phrase: 'in low light' },
  { label: 'While running', phrase: 'while running' },
  { label: 'While mounted', phrase: 'while mounted' },
  { label: 'Target in cover', phrase: 'target in cover' },
  { label: 'Under fire', phrase: 'under fire' },
  { label: 'In melee', phrase: 'in melee' },
  { label: 'From prone position', phrase: 'from prone position' },
];

export type CommonSituationsProps = {
  readonly onInsertText: (text: string) => void;
  readonly disabled?: boolean;
};

export function CommonSituations({
  onInsertText,
  disabled = false,
}: CommonSituationsProps): ReactElement {
  return (
    <div style={styles.container}>
      <h4 style={styles.heading}>Common Situations</h4>
      <div style={styles.chipContainer}>
        {SITUATION_PHRASES.map(({ label, phrase }) => (
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
