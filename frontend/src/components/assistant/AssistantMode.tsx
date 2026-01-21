/**
 * AssistantMode View (PR #2 - Frontend Assistant Mode)
 *
 * Main view for the assistant mode. Combines all assistant components.
 * Displays: AssistantInput, then (if output exists) SuggestedRoll, Modifiers,
 * Assumptions, Notes, and always-visible AuthorityDisclaimer.
 *
 * CRITICAL: Before rendering output, verify advisory === true.
 * If advisory is not true, do not render the output.
 */

import { type ReactElement, useState } from 'react';
import { AssistantInput } from './AssistantInput';
import { SuggestedRoll } from './SuggestedRoll';
import { Modifiers } from './Modifiers';
import { Assumptions } from './Assumptions';
import { Notes } from './Notes';
import { AuthorityDisclaimer } from './AuthorityDisclaimer';
import { ErrorPanel } from './ErrorPanel';
import { colors, spacing, typography } from '../shared/styles';

/**
 * AssistantOutput type - mirrors the backend type
 */
export type AssistantOutput = {
  advisory: true;
  suggestedRoll: {
    trait: string;
    targetNumber: number;
  };
  modifiers: {
    label: string;
    value: number;
    source: string;
  }[];
  netModifier: number;
  assumptions: {
    statement: string;
    confidence: "high" | "medium" | "low";
  }[];
  notes: string[];
};

/**
 * Submission state
 */
type SubmissionState =
  | { readonly status: 'idle' }
  | { readonly status: 'processing'; readonly input: string }
  | { readonly status: 'complete'; readonly input: string; readonly output: AssistantOutput }
  | { readonly status: 'error'; readonly input: string; readonly error: string }
  | { readonly status: 'invalid_advisory'; readonly input: string };

export type AssistantModeProps = {
  /**
   * Function to call the assistant backend.
   * This is injected so the component doesn't directly depend on the backend.
   */
  readonly getSuggestedRoll: (input: string) => Promise<AssistantOutput>;
};

export function AssistantMode({ getSuggestedRoll }: AssistantModeProps): ReactElement {
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' });

  async function handleSubmit(text: string): Promise<void> {
    setSubmission({ status: 'processing', input: text });

    try {
      const output = await getSuggestedRoll(text);

      // CRITICAL: Runtime check - verify advisory flag before accepting output
      // This is a hard-fail, no fallback, no coercion
      if (output.advisory !== true) {
        setSubmission({
          status: 'invalid_advisory',
          input: text,
        });
        return;
      }

      setSubmission({ status: 'complete', input: text, output });
    } catch (err) {
      setSubmission({
        status: 'error',
        input: text,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
      });
    }
  }

  const isProcessing = submission.status === 'processing';
  const hasOutput = submission.status === 'complete';
  const hasError = submission.status === 'error';
  const hasInvalidAdvisory = submission.status === 'invalid_advisory';

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.heading}>Assistant Mode</h2>
        <p style={styles.subheading}>
          Describe an action in plain language. The assistant will suggest a roll.
        </p>
      </header>

      <section style={styles.inputSection}>
        <AssistantInput onSubmit={handleSubmit} disabled={isProcessing} />
      </section>

      {isProcessing && (
        <p style={styles.processingText}>Processing...</p>
      )}

      {hasInvalidAdvisory && (
        <ErrorPanel>
          Invalid assistant response.
          No advisory suggestion was provided.
        </ErrorPanel>
      )}

      {hasError && (
        <div style={styles.errorSection}>
          <p style={styles.errorText}>Error: {submission.error}</p>
        </div>
      )}

      {hasOutput && (
        <section style={styles.outputSection}>
          <SuggestedRoll
            trait={submission.output.suggestedRoll.trait}
            targetNumber={submission.output.suggestedRoll.targetNumber}
            netModifier={submission.output.netModifier}
          />

          <Modifiers modifiers={submission.output.modifiers} />

          <Assumptions assumptions={submission.output.assumptions} />

          <Notes notes={submission.output.notes} />

          <AuthorityDisclaimer />
        </section>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: spacing.xl,
    maxWidth: '800px',
  },
  header: {
    marginBottom: spacing.xxl,
  },
  heading: {
    margin: `0 0 ${spacing.sm} 0`,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  subheading: {
    margin: 0,
    color: colors.textMuted,
    fontSize: typography.fontSize.base,
  },
  inputSection: {
    marginBottom: spacing.xxl,
  },
  outputSection: {
    marginTop: spacing.xxl,
  },
  processingText: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  errorSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    background: colors.bgMedium,
    borderRadius: '4px',
  },
  errorText: {
    margin: 0,
    color: colors.textSecondary,
  },
};
