/**
 * App Component (PR #2 - Frontend Assistant Mode)
 *
 * CRITICAL: Two distinct modes with explicit separation:
 * - Assistant Mode (/assistant or default): NL input → suggested roll
 * - Audit Mode (/audit): Intent Declaration Console
 *
 * Mode switching is explicit and manual. No automatic transitions.
 */

import { type ReactElement, useState, useEffect } from 'react';
import { IntentCaptureForm } from './components/IntentCaptureForm';
import { JsonDump } from './components/JsonDump';
import { AssistantMode, type AssistantOutput } from './components/assistant';
import type { RawIntent } from './contracts';
import { createApiClient, type ApiResponse } from './api';
import type { AppMode } from './types/AppMode';

/**
 * API client - configured for local dev
 */
const apiClient = createApiClient({ baseUrl: 'http://localhost:8080' });

/**
 * Submission state for Audit Mode
 */
type SubmissionState =
  | { readonly status: 'idle' }
  | { readonly status: 'submitting'; readonly intent: RawIntent }
  | { readonly status: 'complete'; readonly intent: RawIntent; readonly response: ApiResponse<unknown> };

/**
 * Get current mode from hash
 */
function getModeFromHash(): AppMode {
  const hash = window.location.hash.slice(1); // Remove #
  if (hash === 'audit' || hash === '/audit') {
    return 'audit';
  }
  return 'assistant'; // Default to assistant
}

/**
 * Mock assistant API - uses local AssistantEngine
 * In future this could call a backend endpoint
 */
async function mockGetSuggestedRoll(input: string): Promise<AssistantOutput> {
  // Dynamic import to avoid bundling backend code unnecessarily
  const { AssistantEngine } = await import('../../assistant/AssistantEngine');
  return AssistantEngine.suggestRoll(input);
}

export function App(): ReactElement {
  const [mode, setMode] = useState<AppMode>(getModeFromHash);
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' });

  // Listen for hash changes
  useEffect(() => {
    function handleHashChange(): void {
      setMode(getModeFromHash());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  /**
   * Switch mode explicitly
   */
  function switchMode(newMode: AppMode): void {
    window.location.hash = newMode === 'assistant' ? '' : 'audit';
  }

  /**
   * Handle intent submission (Audit Mode)
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
        <h1 style={styles.title}>Deadlands 2.1</h1>
        <nav style={styles.nav}>
          <button
            onClick={() => switchMode('assistant')}
            style={mode === 'assistant' ? styles.navButtonActive : styles.navButton}
          >
            Assistant
          </button>
          <button
            onClick={() => switchMode('audit')}
            style={mode === 'audit' ? styles.navButtonActive : styles.navButton}
          >
            Audit
          </button>
        </nav>
      </header>

      <main style={styles.main}>
        {mode === 'assistant' && (
          <AssistantMode getSuggestedRoll={mockGetSuggestedRoll} />
        )}

        {mode === 'audit' && (
          <>
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
          </>
        )}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
  },
  nav: {
    display: 'flex',
    gap: '8px',
  },
  navButton: {
    padding: '8px 16px',
    fontSize: '14px',
    border: '1px solid #444',
    borderRadius: '4px',
    background: '#2a2a2a',
    color: '#999',
    cursor: 'pointer',
  },
  navButtonActive: {
    padding: '8px 16px',
    fontSize: '14px',
    border: '1px solid #555',
    borderRadius: '4px',
    background: '#444',
    color: '#e0e0e0',
    cursor: 'pointer',
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
