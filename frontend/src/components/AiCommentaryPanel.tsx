/**
 * AiCommentaryPanel Component (FE-PR 1.0 - Part 4)
 *
 * CRITICAL: AI exposed WITHOUT authority bleed.
 * - Panel is hidden by default
 * - Explicit toggle required to show
 * - Visual label: "Non-Authoritative Commentary"
 * - AI text rendered verbatim
 * - Visually subordinate to rule output
 * - No buttons inside AI output
 * - No links that trigger actions
 * - No highlighting of AI suggestions
 *
 * The AI is advisory only. It does not decide.
 */

import { type ReactElement, useState } from 'react';

/**
 * AI Commentary entry
 */
export type AiCommentary = {
  readonly commentaryId: string;
  readonly timestamp: number;
  readonly text: string;
  readonly context?: string;
};

/**
 * Props for AiCommentaryPanel
 */
export type AiCommentaryPanelProps = {
  readonly commentary: readonly AiCommentary[];
};

/**
 * AiCommentaryPanel - hidden by default, explicitly toggleable
 * NO authority bleed
 */
export function AiCommentaryPanel({
  commentary,
}: AiCommentaryPanelProps): ReactElement {
  const [isVisible, setIsVisible] = useState(false);

  /**
   * Toggle panel visibility
   */
  function handleToggle(): void {
    setIsVisible((prev) => !prev);
  }

  return (
    <div style={styles.container}>
      {/* Toggle button - explicit action required */}
      <button
        type="button"
        onClick={handleToggle}
        style={styles.toggleButton}
        aria-expanded={isVisible}
        aria-label={isVisible ? 'Hide AI Commentary' : 'Show AI Commentary (Advisory Only)'}
      >
        {isVisible ? 'Hide AI Commentary' : 'Show AI Commentary (Advisory Only)'}
      </button>

      {/* Panel content - only shown when explicitly toggled */}
      {isVisible && (
        <div style={styles.panel}>
          {/* Clear label indicating non-authoritative nature */}
          <div style={styles.warningLabel}>Non-Authoritative Commentary</div>

          <div style={styles.commentaryList}>
            {commentary.length === 0 ? (
              <div style={styles.emptyState}>(no commentary)</div>
            ) : (
              commentary.map((entry) => (
                <div key={entry.commentaryId} style={styles.commentaryEntry}>
                  <div style={styles.entryHeader}>
                    <span style={styles.entryId}>{entry.commentaryId}</span>
                    <span style={styles.entryTimestamp}>
                      {new Date(entry.timestamp).toISOString()}
                    </span>
                  </div>
                  {entry.context && (
                    <div style={styles.entryContext}>
                      Context: {entry.context}
                    </div>
                  )}
                  {/* AI text rendered verbatim - NO formatting, NO interpretation */}
                  <div style={styles.entryText}>{entry.text}</div>
                </div>
              ))
            )}
          </div>

          {/* Reminder at bottom */}
          <div style={styles.reminderLabel}>
            This commentary is advisory only. It does not affect game state.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Styles - visually subordinate, clearly labeled
 * NO emphasis, NO prominence
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '24px',
  },
  toggleButton: {
    padding: '8px 16px',
    fontSize: '12px',
    border: '1px solid #444',
    borderRadius: '4px',
    background: '#1a1a1a',
    color: '#888',
    cursor: 'pointer',
    fontStyle: 'italic',
  },
  panel: {
    marginTop: '8px',
    padding: '16px',
    background: '#1a1a1a',
    borderRadius: '4px',
    border: '1px dashed #444',
    // Visually subordinate - muted appearance
  },
  warningLabel: {
    fontSize: '11px',
    color: '#666',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px dashed #333',
  },
  commentaryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  commentaryEntry: {
    padding: '12px',
    background: '#222',
    borderRadius: '4px',
    border: '1px solid #333',
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  entryId: {
    fontSize: '11px',
    color: '#666',
    fontFamily: 'monospace',
  },
  entryTimestamp: {
    fontSize: '11px',
    color: '#555',
  },
  entryContext: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '8px',
    fontStyle: 'italic',
  },
  entryText: {
    fontSize: '13px',
    color: '#999',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    // Muted text - not prominent
  },
  reminderLabel: {
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px dashed #333',
    fontSize: '10px',
    color: '#555',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyState: {
    color: '#555',
    fontStyle: 'italic',
    fontSize: '12px',
  },
};
