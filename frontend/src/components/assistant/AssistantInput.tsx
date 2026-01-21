/**
 * AssistantInput Component (Phase 2 - Assumption-Driven Refinement)
 *
 * A multiline text area for natural language input WITH text insertion helpers.
 * No validation, no character limits, no interpretation.
 * The user types whatever they want and submits.
 *
 * CRITICAL: All helpers INSERT TEXT ONLY.
 * - No form fields, no hidden state
 * - No auto-submit on interaction
 * - Free-text input remains visually primary
 *
 * Phase 2: Exposes insertTextAndFocus for assumption refinement.
 */

import {
  type ReactElement,
  useState,
  type ChangeEvent,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { CommonActions } from './CommonActions';
import { CommonSituations } from './CommonSituations';
import { DistanceHelper } from './DistanceHelper';
import { colors, spacing, typography, borderRadius } from '../shared/styles';

export type AssistantInputProps = {
  readonly onSubmit: (text: string) => void;
  readonly disabled?: boolean;
};

/**
 * Handle exposed by AssistantInput for external text insertion
 */
export type AssistantInputHandle = {
  insertTextAndFocus: (text: string) => void;
};

export const AssistantInput = forwardRef<AssistantInputHandle, AssistantInputProps>(
  function AssistantInput({ onSubmit, disabled = false }, ref) {
    const [inputText, setInputText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    function handleChange(e: ChangeEvent<HTMLTextAreaElement>): void {
      setInputText(e.target.value);
    }

    function handleSubmit(): void {
      onSubmit(inputText);
    }

    /**
     * Insert text at end of textarea content.
     * Adds appropriate spacing if there's existing text.
     * Does NOT auto-submit, does NOT overwrite.
     */
    function insertText(text: string): void {
      setInputText((current) => {
        if (current.trim() === '') {
          return text;
        }
        // Add space or newline before appending if current text doesn't end with whitespace
        const endsWithWhitespace = /\s$/.test(current);
        const separator = endsWithWhitespace ? '' : ' ';
        return current + separator + text;
      });
    }

    /**
     * Insert text and focus the textarea with cursor at end.
     * Used by assumption refinement.
     */
    function insertTextAndFocus(text: string): void {
      insertText(text);
      // Focus textarea and move cursor to end after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const length = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(length, length);
        }
      }, 0);
    }

    // Expose insertTextAndFocus to parent via ref
    useImperativeHandle(ref, () => ({
      insertTextAndFocus,
    }));

    return (
      <div style={styles.container}>
        <label htmlFor="assistant-input" style={styles.label}>
          Describe the action
        </label>
        <p style={styles.description}>
          Describe what the character is doing in plain language.
        </p>

        {/* Text insertion helpers - ABOVE the textarea */}
        <div style={styles.helpersContainer}>
          <CommonActions onInsertText={insertText} disabled={disabled} />
          <CommonSituations onInsertText={insertText} disabled={disabled} />
          <DistanceHelper onInsertText={insertText} disabled={disabled} />
        </div>

        {/* Primary input - free-text textarea */}
        <textarea
          ref={textareaRef}
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
);

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
    margin: `0 0 ${spacing.md} 0`,
    color: colors.textMuted,
    fontSize: typography.fontSize.base,
  },
  helpersContainer: {
    marginBottom: spacing.md,
    padding: spacing.md,
    background: colors.bgDarker,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.borderDark}`,
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
