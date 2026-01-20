/**
 * SessionLog Component (FE-PR 1.0 - Part 5)
 *
 * CRITICAL: Trust through memory, NOT revision.
 * - Chronological session timeline
 * - Past entries are IMMUTABLE
 * - Overrides are clearly highlighted
 * - Timestamps visible
 * - Click to inspect full details
 *
 * Forbidden:
 * - Editing past entries
 * - Re-running intents from history
 * - Retroactive overrides
 * - "Fix previous ruling"
 */

import { type ReactElement, useState } from 'react';
import type {
  RawIntent,
  ValidationReport,
  GmOverride,
  Effect,
} from '../contracts';

/**
 * Session log entry types
 */
export type SessionLogEntryType = 'intent' | 'validation' | 'override' | 'effect';

/**
 * Base session log entry
 */
type BaseSessionLogEntry = {
  readonly entryId: string;
  readonly timestamp: number;
};

/**
 * Intent session log entry
 */
export type IntentLogEntry = BaseSessionLogEntry & {
  readonly type: 'intent';
  readonly intent: RawIntent;
};

/**
 * Validation session log entry
 */
export type ValidationLogEntry = BaseSessionLogEntry & {
  readonly type: 'validation';
  readonly report: ValidationReport;
};

/**
 * Override session log entry
 */
export type OverrideLogEntry = BaseSessionLogEntry & {
  readonly type: 'override';
  readonly override: GmOverride;
};

/**
 * Effect session log entry
 */
export type EffectLogEntry = BaseSessionLogEntry & {
  readonly type: 'effect';
  readonly effects: readonly Effect[];
};

/**
 * Union type for all session log entries
 */
export type SessionLogEntry =
  | IntentLogEntry
  | ValidationLogEntry
  | OverrideLogEntry
  | EffectLogEntry;

/**
 * Props for SessionLog
 */
export type SessionLogProps = {
  readonly entries: readonly SessionLogEntry[];
};

/**
 * Props for SessionLogEntryView
 */
export type SessionLogEntryViewProps = {
  readonly entry: SessionLogEntry;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
};

/**
 * Get entry type label
 */
function getEntryTypeLabel(type: SessionLogEntryType): string {
  switch (type) {
    case 'intent':
      return 'Intent';
    case 'validation':
      return 'Validation';
    case 'override':
      return 'Override';
    case 'effect':
      return 'Effect';
  }
}

/**
 * SessionLogEntryView - renders a single entry with click-to-inspect
 * IMMUTABLE - no editing, no re-running
 */
export function SessionLogEntryView({
  entry,
  isExpanded,
  onToggle,
}: SessionLogEntryViewProps): ReactElement {
  const typeLabel = getEntryTypeLabel(entry.type);
  const isOverride = entry.type === 'override';

  return (
    <div style={isOverride ? styles.entryOverride : styles.entry}>
      <button
        type="button"
        onClick={onToggle}
        style={styles.entryHeader}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${typeLabel} entry ${entry.entryId}`}
      >
        <span style={styles.entryTimestamp}>
          {new Date(entry.timestamp).toISOString()}
        </span>
        <span style={isOverride ? styles.entryTypeOverride : styles.entryType}>
          [{typeLabel}]
        </span>
        <span style={styles.entryId}>{entry.entryId}</span>
        <span style={styles.expandIndicator}>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div style={styles.entryDetails}>
          {entry.type === 'intent' && (
            <>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Intent Type:</span>
                <span style={styles.detailValue}>{entry.intent.intentType}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Payload:</span>
                <pre style={styles.jsonBlock}>
                  {JSON.stringify(entry.intent.payload, null, 2)}
                </pre>
              </div>
            </>
          )}

          {entry.type === 'validation' && (
            <>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Invocation ID:</span>
                <span style={styles.detailValue}>{entry.report.invocationId}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Intent Type:</span>
                <span style={styles.detailValue}>{entry.report.intentType}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Outcome:</span>
                <span style={styles.detailValue}>{entry.report.outcome}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Violations:</span>
                <span style={styles.detailValue}>{entry.report.violations.length}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Conflicts:</span>
                <span style={styles.detailValue}>{entry.report.conflicts.length}</span>
              </div>
            </>
          )}

          {entry.type === 'override' && (
            <>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Override ID:</span>
                <span style={styles.detailValue}>{entry.override.overrideId}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Original Outcome:</span>
                <span style={styles.detailValue}>{entry.override.originalReport.outcome}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>New Outcome:</span>
                <span style={styles.detailValue}>{entry.override.overriddenOutcome.newOutcome}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Reason:</span>
                <span style={styles.detailValue}>{entry.override.reason}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Warning:</span>
                <span style={styles.detailValue}>
                  [{entry.override.warning.severity}] {entry.override.warning.message}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Issued By:</span>
                <span style={styles.detailValue}>{entry.override.issuedBy}</span>
              </div>
            </>
          )}

          {entry.type === 'effect' && (
            <>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Effect Count:</span>
                <span style={styles.detailValue}>{entry.effects.length}</span>
              </div>
              {entry.effects.map((effect, index) => (
                <div key={effect.effectId} style={styles.effectItem}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Effect {index + 1}:</span>
                    <span style={styles.detailValue}>{effect.effectId}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Type:</span>
                    <span style={styles.detailValue}>{effect.effectType}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Description:</span>
                    <span style={styles.detailValue}>{effect.description}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* NO edit button, NO re-run button, NO fix button */}
          <div style={styles.immutableNote}>
            This entry is immutable and cannot be modified.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SessionLog - chronological timeline
 * Filterable by entry type, immutable history
 */
export function SessionLog({ entries }: SessionLogProps): ReactElement {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<SessionLogEntryType | 'all'>('all');

  /**
   * Toggle entry expansion
   */
  function handleToggleEntry(entryId: string): void {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }

  /**
   * Filter entries by type
   */
  const filteredEntries =
    filter === 'all' ? entries : entries.filter((e) => e.type === filter);

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Session Log</h3>

      {/* Filter controls */}
      <div style={styles.filterRow}>
        <span style={styles.filterLabel}>Filter:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as SessionLogEntryType | 'all')}
          style={styles.filterSelect}
          aria-label="Filter session log entries"
        >
          <option value="all">All</option>
          <option value="intent">Intent</option>
          <option value="validation">Validation</option>
          <option value="override">Override</option>
          <option value="effect">Effect</option>
        </select>
        <span style={styles.entryCount}>
          {filteredEntries.length} entries
        </span>
      </div>

      {/* Entry list - chronological order */}
      <div style={styles.entryList}>
        {filteredEntries.length === 0 ? (
          <div style={styles.emptyState}>(no entries)</div>
        ) : (
          filteredEntries.map((entry) => (
            <SessionLogEntryView
              key={entry.entryId}
              entry={entry}
              isExpanded={expandedEntries.has(entry.entryId)}
              onToggle={() => handleToggleEntry(entry.entryId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Styles - clear, chronological, immutable appearance
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    background: '#222',
    borderRadius: '4px',
    border: '1px solid #444',
    marginBottom: '24px',
  },
  heading: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    borderBottom: '1px solid #444',
    paddingBottom: '8px',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  filterLabel: {
    fontSize: '13px',
    color: '#888',
  },
  filterSelect: {
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid #444',
    borderRadius: '4px',
    background: '#333',
    color: '#e0e0e0',
  },
  entryCount: {
    fontSize: '12px',
    color: '#666',
    marginLeft: 'auto',
  },
  entryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  entry: {
    background: '#2a2a2a',
    borderRadius: '4px',
    border: '1px solid #444',
    overflow: 'hidden',
  },
  entryOverride: {
    background: '#2a2a2a',
    borderRadius: '4px',
    border: '1px solid #555',
    overflow: 'hidden',
    // Slightly different border to highlight overrides
  },
  entryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'monospace',
  },
  entryTimestamp: {
    color: '#666',
    fontSize: '11px',
    minWidth: '200px',
  },
  entryType: {
    color: '#888',
    minWidth: '100px',
  },
  entryTypeOverride: {
    color: '#999',
    minWidth: '100px',
    fontWeight: 'bold',
  },
  entryId: {
    flex: 1,
    color: '#e0e0e0',
  },
  expandIndicator: {
    color: '#666',
    fontSize: '10px',
  },
  entryDetails: {
    padding: '12px',
    borderTop: '1px solid #444',
    background: '#333',
  },
  detailRow: {
    display: 'flex',
    marginBottom: '4px',
    lineHeight: '1.4',
  },
  detailLabel: {
    minWidth: '140px',
    color: '#888',
    fontSize: '12px',
  },
  detailValue: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: '12px',
    wordBreak: 'break-word',
  },
  jsonBlock: {
    margin: 0,
    padding: '8px',
    background: '#1a1a1a',
    borderRadius: '4px',
    fontSize: '11px',
    overflow: 'auto',
    maxHeight: '150px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    flex: 1,
  },
  effectItem: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px dashed #444',
  },
  immutableNote: {
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px dashed #444',
    fontSize: '10px',
    color: '#555',
    fontStyle: 'italic',
  },
  emptyState: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: '13px',
    padding: '12px',
  },
};
