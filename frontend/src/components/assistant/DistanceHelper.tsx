/**
 * DistanceHelper Component (Phase 1 - Input Suggestions)
 *
 * Soft phrase dropdown that INSERTS TEXT into the textarea.
 * No validation, no units enforcement.
 * Selecting an option appends text - does NOT overwrite, does NOT auto-submit.
 */

import { type ReactElement, useState, type ChangeEvent } from 'react';
import { colors, spacing, typography, borderRadius } from '../shared/styles';

/**
 * Distance options
 * Each maps to a phrase that gets appended to the textarea
 */
const DISTANCE_OPTIONS: readonly { readonly label: string; readonly phrase: string }[] = [
  { label: 'Adjacent', phrase: 'adjacent' },
  { label: 'Short range', phrase: 'at short range' },
  { label: 'Medium range', phrase: 'at medium range' },
  { label: 'Long range', phrase: 'at long range' },
  { label: 'Extreme range', phrase: 'at extreme range' },
];

const CUSTOM_OPTION = 'Custom…';

export type DistanceHelperProps = {
  readonly onInsertText: (text: string) => void;
  readonly disabled?: boolean;
};

export function DistanceHelper({
  onInsertText,
  disabled = false,
}: DistanceHelperProps): ReactElement {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  function handleSelectChange(e: ChangeEvent<HTMLSelectElement>): void {
    const value = e.target.value;

    if (value === '') {
      return; // Placeholder selected, do nothing
    }

    if (value === CUSTOM_OPTION) {
      setShowCustomInput(true);
      return;
    }

    // Find the phrase for the selected option and insert it
    const option = DISTANCE_OPTIONS.find((opt) => opt.label === value);
    if (option) {
      onInsertText(option.phrase);
    }

    // Reset select to placeholder
    e.target.value = '';
  }

  function handleCustomChange(e: ChangeEvent<HTMLInputElement>): void {
    setCustomValue(e.target.value);
  }

  function handleCustomConfirm(): void {
    if (customValue.trim()) {
      onInsertText(`Bob is ${customValue.trim()} yards away`);
    }
    setCustomValue('');
    setShowCustomInput(false);
  }

  function handleCustomCancel(): void {
    setCustomValue('');
    setShowCustomInput(false);
  }

  return (
    <div style={styles.container}>
      <h4 style={styles.heading}>Distance</h4>
      {!showCustomInput ? (
        <select
          onChange={handleSelectChange}
          disabled={disabled}
          style={disabled ? styles.selectDisabled : styles.select}
          defaultValue=""
        >
          <option value="" disabled>
            Select distance...
          </option>
          {DISTANCE_OPTIONS.map(({ label }) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
          <option value={CUSTOM_OPTION}>{CUSTOM_OPTION}</option>
        </select>
      ) : (
        <div style={styles.customContainer}>
          <input
            type="text"
            value={customValue}
            onChange={handleCustomChange}
            placeholder="Enter distance (e.g., 100)"
            style={styles.customInput}
            autoFocus
          />
          <span style={styles.customLabel}>yards away</span>
          <button
            type="button"
            onClick={handleCustomConfirm}
            style={styles.customButton}
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleCustomCancel}
            style={styles.customButtonCancel}
          >
            Cancel
          </button>
        </div>
      )}
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
  select: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: borderRadius.md,
    background: colors.bgMedium,
    color: colors.textPrimary,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
    minWidth: '150px',
  },
  selectDisabled: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.borderDark}`,
    borderRadius: borderRadius.md,
    background: colors.bgDark,
    color: colors.textDisabled,
    cursor: 'not-allowed',
    fontFamily: typography.fontFamily.base,
    minWidth: '150px',
  },
  customContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  customInput: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: borderRadius.md,
    background: colors.bgMedium,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.base,
    width: '100px',
  },
  customLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  customButton: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: borderRadius.md,
    background: colors.bgLight,
    color: colors.textPrimary,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
  },
  customButtonCancel: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: borderRadius.md,
    background: colors.bgMedium,
    color: colors.textMuted,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
  },
};
