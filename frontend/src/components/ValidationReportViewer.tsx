/**
 * ValidationReportViewer Component (FE-PR 0.3)
 *
 * CRITICAL: This is a MIRROR, not a judge.
 * - Renders ValidationReport verbatim
 * - No sorting
 * - No grouping
 * - No filtering
 * - No color semantics (red = bad, green = good)
 * - No summary computation
 * - No interpretation
 *
 * All outcomes (PASS, FAIL, AMBIGUOUS) coexist.
 * Disagreement is first-class UI data.
 */

import { type ReactElement } from 'react';
import type {
  ValidationReport,
  RuleViolation,
  Conflict,
  CostValidationResult,
  Effect,
} from '../contracts';

/**
 * Props for ValidationReportViewer
 */
export type ValidationReportViewerProps = {
  readonly report: ValidationReport;
  readonly effects?: readonly Effect[];
};

/**
 * Props for RuleResultsPanel
 */
export type RuleResultsPanelProps = {
  readonly violations: readonly RuleViolation[];
  readonly outcome: string;
  readonly ambiguityReason: string | null;
};

/**
 * Props for CostsPanel
 */
export type CostsPanelProps = {
  readonly costValidation: CostValidationResult | undefined;
};

/**
 * Props for ConflictsPanel
 */
export type ConflictsPanelProps = {
  readonly conflicts: readonly Conflict[];
};

/**
 * Props for EffectsPanel
 */
export type EffectsPanelProps = {
  readonly effects: readonly Effect[];
};

/**
 * RuleResultsPanel - renders all rule violations flat, in backend order
 * NO sorting, NO grouping, NO filtering
 */
export function RuleResultsPanel({
  violations,
  outcome,
  ambiguityReason,
}: RuleResultsPanelProps): ReactElement {
  return (
    <div style={styles.panel}>
      <h3 style={styles.panelHeading}>Rule Results</h3>

      {/* Render outcome as text - no color semantics */}
      <div style={styles.row}>
        <span style={styles.fieldLabel}>Outcome:</span>
        <span style={styles.fieldValue}>{outcome}</span>
      </div>

      {/* Render ambiguity reason if present */}
      {ambiguityReason !== null && (
        <div style={styles.row}>
          <span style={styles.fieldLabel}>Ambiguity Reason:</span>
          <span style={styles.fieldValue}>{ambiguityReason}</span>
        </div>
      )}

      {/* Render violations flat, in backend order */}
      <div style={styles.listSection}>
        <span style={styles.listLabel}>Violations:</span>
        {violations.length === 0 ? (
          <div style={styles.emptyState}>(none)</div>
        ) : (
          <div style={styles.list}>
            {violations.map((violation, index) => (
              <div key={index} style={styles.listItem}>
                <div style={styles.row}>
                  <span style={styles.fieldLabel}>Rule ID:</span>
                  <span style={styles.fieldValue}>{violation.ruleId}</span>
                </div>
                <div style={styles.row}>
                  <span style={styles.fieldLabel}>Severity:</span>
                  <span style={styles.fieldValue}>{violation.severity}</span>
                </div>
                <div style={styles.row}>
                  <span style={styles.fieldLabel}>Message:</span>
                  <span style={styles.fieldValue}>{violation.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * CostsPanel - renders declared costs
 * Label: "Declared Costs (Not Enforced)"
 * NO indicators of satisfied/unsatisfied
 * NO aggregation
 */
export function CostsPanel({ costValidation }: CostsPanelProps): ReactElement {
  return (
    <div style={styles.panel}>
      <h3 style={styles.panelHeading}>Declared Costs (Not Enforced)</h3>

      {costValidation === undefined ? (
        <div style={styles.emptyState}>(none)</div>
      ) : (
        <div style={styles.list}>
          <div style={styles.listItem}>
            <div style={styles.row}>
              <span style={styles.fieldLabel}>Description:</span>
              <span style={styles.fieldValue}>{costValidation.cost.description}</span>
            </div>
            {costValidation.cost.tags && costValidation.cost.tags.length > 0 && (
              <div style={styles.row}>
                <span style={styles.fieldLabel}>Tags:</span>
                <span style={styles.fieldValue}>{costValidation.cost.tags.join(', ')}</span>
              </div>
            )}
            <div style={styles.row}>
              <span style={styles.fieldLabel}>Outcome:</span>
              <span style={styles.fieldValue}>{costValidation.outcome}</span>
            </div>
            <div style={styles.row}>
              <span style={styles.fieldLabel}>Reason:</span>
              <span style={styles.fieldValue}>{costValidation.reason}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ConflictsPanel - renders all conflicts, unprioritized
 * Shows conflict kind (HardBlock, SoftBlock, Informational)
 * NO highlighting HardBlock as final
 * NO suppressing lower-severity conflicts
 * NO implying resolution order
 */
export function ConflictsPanel({ conflicts }: ConflictsPanelProps): ReactElement {
  return (
    <div style={styles.panel}>
      <h3 style={styles.panelHeading}>Conflicts</h3>

      {conflicts.length === 0 ? (
        <div style={styles.emptyState}>(none)</div>
      ) : (
        <div style={styles.list}>
          {conflicts.map((conflict, index) => (
            <div key={index} style={styles.listItem}>
              <div style={styles.row}>
                <span style={styles.fieldLabel}>Kind:</span>
                <span style={styles.fieldValue}>{conflict.kind}</span>
              </div>
              <div style={styles.row}>
                <span style={styles.fieldLabel}>Source Rule:</span>
                <span style={styles.fieldValue}>{conflict.sourceRule}</span>
              </div>
              <div style={styles.row}>
                <span style={styles.fieldLabel}>Message:</span>
                <span style={styles.fieldValue}>{conflict.message}</span>
              </div>
              {conflict.tags && conflict.tags.length > 0 && (
                <div style={styles.row}>
                  <span style={styles.fieldLabel}>Tags:</span>
                  <span style={styles.fieldValue}>{conflict.tags.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * EffectsPanel - renders all effects regardless of validation outcome
 * NO suppression on FAIL
 * Label: "Declared Effects (Attempts Occurred)"
 */
export function EffectsPanel({ effects }: EffectsPanelProps): ReactElement {
  return (
    <div style={styles.panel}>
      <h3 style={styles.panelHeading}>Declared Effects (Attempts Occurred)</h3>

      {effects.length === 0 ? (
        <div style={styles.emptyState}>(none)</div>
      ) : (
        <div style={styles.list}>
          {effects.map((effect, index) => (
            <div key={index} style={styles.listItem}>
              <div style={styles.row}>
                <span style={styles.fieldLabel}>Effect ID:</span>
                <span style={styles.fieldValue}>{effect.effectId}</span>
              </div>
              <div style={styles.row}>
                <span style={styles.fieldLabel}>Type:</span>
                <span style={styles.fieldValue}>{effect.effectType}</span>
              </div>
              <div style={styles.row}>
                <span style={styles.fieldLabel}>Description:</span>
                <span style={styles.fieldValue}>{effect.description}</span>
              </div>
              <div style={styles.row}>
                <span style={styles.fieldLabel}>Target:</span>
                <span style={styles.fieldValue}>
                  {effect.target.targetType}: {effect.target.targetId}
                </span>
              </div>
              <div style={styles.row}>
                <span style={styles.fieldLabel}>Authority:</span>
                <span style={styles.fieldValue}>
                  {effect.authority.source} ({effect.authority.outcome})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ValidationReportViewer - main component
 * Renders all panels, showing data verbatim
 */
export function ValidationReportViewer({
  report,
  effects = [],
}: ValidationReportViewerProps): ReactElement {
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Validation Report</h2>

      {/* Metadata - verbatim */}
      <div style={styles.metadataSection}>
        <div style={styles.row}>
          <span style={styles.fieldLabel}>Invocation ID:</span>
          <span style={styles.fieldValue}>{report.invocationId}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.fieldLabel}>Source Intent ID:</span>
          <span style={styles.fieldValue}>{report.sourceIntentId}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.fieldLabel}>Intent Type:</span>
          <span style={styles.fieldValue}>{report.intentType}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.fieldLabel}>Ruleset ID:</span>
          <span style={styles.fieldValue}>{report.rulesetId}</span>
        </div>
      </div>

      {/* Rule Results Panel */}
      <RuleResultsPanel
        violations={report.violations}
        outcome={report.outcome}
        ambiguityReason={report.ambiguity?.reason ?? null}
      />

      {/* Costs Panel */}
      <CostsPanel costValidation={report.costValidation} />

      {/* Conflicts Panel */}
      <ConflictsPanel conflicts={report.conflicts} />

      {/* Effects Panel */}
      <EffectsPanel effects={[...effects]} />

      {/* Payload - raw JSON */}
      <div style={styles.panel}>
        <h3 style={styles.panelHeading}>Payload (Raw)</h3>
        <pre style={styles.jsonBlock}>
          {JSON.stringify(report.payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/**
 * Styles - clear, readable, modern, scrollable
 * NO color semantics (red = bad, green = good)
 * NO icons implying success/failure
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    fontFamily: 'monospace',
  },
  heading: {
    margin: '0 0 16px 0',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  metadataSection: {
    marginBottom: '24px',
    padding: '12px',
    background: '#2a2a2a',
    borderRadius: '4px',
  },
  panel: {
    marginBottom: '24px',
    padding: '16px',
    background: '#222',
    borderRadius: '4px',
    border: '1px solid #444',
  },
  panelHeading: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    borderBottom: '1px solid #444',
    paddingBottom: '8px',
  },
  row: {
    display: 'flex',
    marginBottom: '4px',
    lineHeight: '1.4',
  },
  fieldLabel: {
    minWidth: '140px',
    color: '#888',
    fontSize: '13px',
  },
  fieldValue: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: '13px',
    wordBreak: 'break-word',
  },
  listSection: {
    marginTop: '12px',
  },
  listLabel: {
    display: 'block',
    color: '#888',
    fontSize: '13px',
    marginBottom: '8px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  listItem: {
    padding: '12px',
    background: '#333',
    borderRadius: '4px',
    border: '1px solid #444',
  },
  emptyState: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: '13px',
  },
  jsonBlock: {
    margin: 0,
    padding: '12px',
    background: '#1a1a1a',
    borderRadius: '4px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '200px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
};
