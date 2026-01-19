/**
 * App Component (FE-PR 0.2)
 *
 * CRITICAL: This app is a DECLARATION console.
 * - Collects explicit user input
 * - Submits verbatim to backend
 * - Displays raw response without interpretation
 *
 * If the GM submits nonsense, the system accepts it.
 */

import { type ReactElement, useState } from 'react';
import { IntentCaptureForm } from './components/IntentCaptureForm';
import { JsonDump } from './components/JsonDump';
import type { RawIntent } from './contracts';
import { createApiClient, type ApiResponse } from './api';

/**
 * API client - configured for local dev
 * TODO: Make configurable via environment
 */
const apiClient = createApiClient({ baseUrl: 'http://localhost:8080' });

/**
 * Submission state
 */
type SubmissionState =
  | { readonly status: 'idle' }
  | { readonly status: 'submitting'; readonly intent: RawIntent }
  | { readonly status: 'complete'; readonly intent: RawIntent; readonly response: ApiResponse<unknown> };

export function App(): ReactElement {
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' });

  /**
   * Handle intent submission
   * NO TRANSFORMATION - submit exactly as received
   */
  async function handleSubmit(intent: RawIntent): Promise<void> {
    setSubmission({ status: 'submitting', intent });

    const response = await apiClient.submitIntent(intent);

    setSubmission({ status: 'complete', intent, response });
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>Deadlands 2.1 - Intent Declaration Console</h1>
        <p style={styles.subtitle}>
          Explicit input. No interpretation. No validation.
        </p>
      </header>

      <main style={styles.main}>
        <section style={styles.formSection}>
          <IntentCaptureForm onSubmit={handleSubmit} />
        </section>

        <section style={styles.responseSection}>
          <h2 style={styles.sectionHeading}>Submission Result</h2>

          {submission.status === 'idle' && (
            <p style={styles.idleText}>No submission yet.</p>
          )}

          {submission.status === 'submitting' && (
            <div>
              <p style={styles.submittingText}>Submitting...</p>
              <JsonDump label="Submitted Intent" data={submission.intent} />
            </div>
          )}

          {submission.status === 'complete' && (
            <div>
              <JsonDump label="Submitted Intent" data={submission.intent} />
              <JsonDump label="Backend Response (Raw)" data={submission.response} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/**
 * Inline styles
 */
const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#1a1a1a',
    color: '#e0e0e0',
    fontFamily: 'monospace',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #333',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
  },
  subtitle: {
    margin: 0,
    color: '#888',
    fontSize: '14px',
  },
  main: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '40px',
    padding: '20px',
  },
  formSection: {
    flex: '1 1 400px',
    minWidth: '300px',
  },
  responseSection: {
    flex: '1 1 400px',
    minWidth: '300px',
  },
  sectionHeading: {
    margin: '0 0 16px 0',
    fontSize: '18px',
  },
  idleText: {
    color: '#666',
    fontStyle: 'italic',
  },
  submittingText: {
    color: '#888',
    marginBottom: '16px',
  },
};
