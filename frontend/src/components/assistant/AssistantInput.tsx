/**
 * AssistantInput Component (PR #2 - Frontend Assistant Mode)
 *
 * A multiline text area for natural language input.
 * No validation, no character limits, no interpretation.
 * The user types whatever they want and submits.
 */

import { type ReactElement, useState, type ChangeEvent } from 'react';
import { colors, spacing, typography, borderRadius } from '../shared/styles';

export type AssistantInputProps = {
  readonly onSubmit: (text: string) => void;
  readonly disabled?: boolean;
};

export function AssistantInput({
  onSubmit,
  disabled = false,
}: AssistantInputProps): ReactElement {
  const [inputText, setInputText] = useState('');

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    setInputText(e.target.value);
  }

  function handleSubmit(): void {
    onSubmit(inputText);
  }

  return (
    <div style={styles.container}>
      <label htmlFor="assistant-input" style={styles.label}>
        Describe the action
      </label>
      <p style={styles.description}>
        Describe what the character is doing in plain language.
      </p>
      <textarea
        id="assistant-input"
        value={inputText}
        onChange={handleChange}
        disabled={disabled}
        style={disabled ? styles.textareaDisabled : styles.textarea}
        rows={4}
        placeholder="e.g., Alice shoots at Bob while galloping on a horse, Bob is 100 yards away"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled}
        style={disabled ? styles.buttonDisabled : styles.button}
      >
        Get Suggested Roll
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: spacing.xxl,
  },
  label: {
    display: 'block',
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
    fontSize: typography.fontSize.lg,
    color: colors.textPrimary,
  },
  description: {
    margin: `0 0 ${spacing.sm} 0`,
    color: colors.textMuted,
    fontSize: typography.fontSize.base,
  },
  textarea: {
    width: '100%',
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: borderRadius.md,
    background: colors.bgMedium,
    color: colors.textPrimary,
    boxSizing: 'border-box',
    fontFamily: typography.fontFamily.base,
    resize: 'vertical',
    minHeight: '100px',
  },
  textareaDisabled: {
    width: '100%',
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.borderDark}`,
    borderRadius: borderRadius.md,
    background: colors.bgDark,
    color: colors.textDisabled,
    boxSizing: 'border-box',
    fontFamily: typography.fontFamily.base,
    resize: 'vertical',
    minHeight: '100px',
    cursor: 'not-allowed',
  },
  button: {
    marginTop: spacing.md,
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: borderRadius.md,
    background: colors.bgLight,
    color: colors.textPrimary,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
  },
  buttonDisabled: {
    marginTop: spacing.md,
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    border: `1px solid ${colors.borderDark}`,
    borderRadius: borderRadius.md,
    background: colors.bgDark,
    color: colors.textDisabled,
    cursor: 'not-allowed',
    fontFamily: typography.fontFamily.base,
  },
};
