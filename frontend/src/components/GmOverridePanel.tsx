/**
 * GmOverridePanel Component (FE-PR 1.0 - Part 2)
 *
 * CRITICAL: Overrides are explicit, heavy, and auditable.
 * - No one-click overrides
 * - Reason field cannot be skipped
 * - No defaults
 * - No "quick fix" affordances
 * - No auto-override
 * - No suggested overrides
 *
 * The GM must consciously decide and document.
 */

import { type ReactElement, useState, type ChangeEvent } from 'react';
import type {
  ValidationReport,
  RulesOutcome,
  GmOverride,
} from '../contracts';

/**
 * Override creation step
 */
type OverrideStep = 'closed' | 'select-target' | 'select-action' | 'enter-reason' | 'confirm';

/**
 * Override target types
 */
type OverrideTarget = 'validation-result' | 'cost' | 'conflict';

/**
 * Override action - what the GM wants to do
 */
type OverrideAction = 'change-outcome-to-pass' | 'change-outcome-to-fail' | 'change-outcome-to-ambiguous';

/**
 * Props for GmOverridePanel
 */
export type GmOverridePanelProps = {
  readonly report: ValidationReport;
  readonly existingOverrides: readonly GmOverride[];
  readonly onCreateOverride: (override: {
    readonly newOutcome: RulesOutcome;
    readonly reason: string;
    readonly warningMessage: string;
  }) => void;
};

/**
 * Props for OverrideDisplay
 */
export type OverrideDisplayProps = {
  readonly override: GmOverride;
};

/**
 * OverrideDisplay - renders a single GM override inline
 * Clearly labeled with reason always visible
 */
export function OverrideDisplay({ override }: OverrideDisplayProps): ReactElement {
  return (
    <div style={styles.overrideDisplay}>
      <div style={styles.overrideLabel}>GM Override Applied</div>
      <div style={styles.overrideRow}>
        <span style={styles.overrideFieldLabel}>Override ID:</span>
        <span style={styles.overrideFieldValue}>{override.overrideId}</span>
      </div>
      <div style={styles.overrideRow}>
        <span style={styles.overrideFieldLabel}>Original Outcome:</span>
        <span style={styles.overrideFieldValue}>{override.originalReport.outcome}</span>
      </div>
      <div style={styles.overrideRow}>
        <span style={styles.overrideFieldLabel}>New Outcome:</span>
        <span style={styles.overrideFieldValue}>{override.overriddenOutcome.newOutcome}</span>
      </div>
      <div style={styles.overrideRow}>
        <span style={styles.overrideFieldLabel}>Reason:</span>
        <span style={styles.overrideFieldValue}>{override.reason}</span>
      </div>
      <div style={styles.overrideRow}>
        <span style={styles.overrideFieldLabel}>Warning:</span>
        <span style={styles.overrideFieldValue}>
          [{override.warning.severity}] {override.warning.message}
        </span>
      </div>
      <div style={styles.overrideRow}>
        <span style={styles.overrideFieldLabel}>Issued By:</span>
        <span style={styles.overrideFieldValue}>{override.issuedBy}</span>
      </div>
      <div style={styles.overrideRow}>
        <span style={styles.overrideFieldLabel}>Issued At:</span>
        <span style={styles.overrideFieldValue}>
          {new Date(override.issuedAt).toISOString()}
        </span>
      </div>
    </div>
  );
}

/**
 * OverrideListDisplay - renders all existing overrides
 */
export function OverrideListDisplay({
  overrides,
}: {
  readonly overrides: readonly GmOverride[];
}): ReactElement {
  if (overrides.length === 0) {
    return <div style={styles.emptyState}>(no overrides)</div>;
  }

  return (
    <div style={styles.overrideList}>
      {overrides.map((override) => (
        <OverrideDisplay key={override.overrideId} override={override} />
      ))}
    </div>
  );
}

/**
 * GmOverridePanel - multi-step override creation
 * NO one-click, NO defaults, NO skipping reason
 */
export function GmOverridePanel({
  report,
  existingOverrides,
  onCreateOverride,
}: GmOverridePanelProps): ReactElement {
  const [step, setStep] = useState<OverrideStep>('closed');
  const [selectedTarget, setSelectedTarget] = useState<OverrideTarget | null>(null);
  const [selectedAction, setSelectedAction] = useState<OverrideAction | null>(null);
  const [reason, setReason] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  /**
   * Reset all state
   */
  function resetState(): void {
    setStep('closed');
    setSelectedTarget(null);
    setSelectedAction(null);
    setReason('');
    setWarningMessage('');
  }

  /**
   * Handle opening the override flow
   */
  function handleStartOverride(): void {
    setStep('select-target');
  }

  /**
   * Handle target selection
   */
  function handleSelectTarget(target: OverrideTarget): void {
    setSelectedTarget(target);
    setStep('select-action');
  }

  /**
   * Handle action selection
   */
  function handleSelectAction(action: OverrideAction): void {
    setSelectedAction(action);
    setStep('enter-reason');
  }

  /**
   * Handle reason input
   */
  function handleReasonChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    setReason(e.target.value);
  }

  /**
   * Handle warning message input
   */
  function handleWarningChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    setWarningMessage(e.target.value);
  }

  /**
   * Handle proceeding to confirm
   */
  function handleProceedToConfirm(): void {
    // Reason is mandatory - cannot proceed without it
    if (reason.trim() === '') {
      return;
    }
    if (warningMessage.trim() === '') {
      return;
    }
    setStep('confirm');
  }

  /**
   * Handle final submission
   */
  function handleSubmitOverride(): void {
    if (selectedAction === null) {
      return;
    }

    let newOutcome: RulesOutcome;
    switch (selectedAction) {
      case 'change-outcome-to-pass':
        newOutcome = 'PASS';
        break;
      case 'change-outcome-to-fail':
        newOutcome = 'FAIL';
        break;
      case 'change-outcome-to-ambiguous':
        newOutcome = 'AMBIGUOUS';
        break;
    }

    onCreateOverride({
      newOutcome,
      reason: reason.trim(),
      warningMessage: warningMessage.trim(),
    });

    resetState();
  }

  /**
   * Handle cancel at any step
   */
  function handleCancel(): void {
    resetState();
  }

  /**
   * Check if reason is valid (non-empty after trim)
   */
  const isReasonValid = reason.trim().length > 0;
  const isWarningValid = warningMessage.trim().length > 0;
  const canProceedToConfirm = isReasonValid && isWarningValid;

  return (
    <div style={styles.panel}>
      <h3 style={styles.panelHeading}>GM Overrides</h3>

      {/* Show existing overrides */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Existing Overrides:</div>
        <OverrideListDisplay overrides={existingOverrides} />
      </div>

      {/* Override creation flow */}
      {step === 'closed' && (
        <div style={styles.actionSection}>
          <button
            type="button"
            onClick={handleStartOverride}
            style={styles.createButton}
            aria-label="Create GM Override"
          >
            Create GM Override
          </button>
        </div>
      )}

      {step === 'select-target' && (
        <div style={styles.stepPanel}>
          <div style={styles.stepHeading}>Step 1: Select Override Target</div>
          <div style={styles.stepDescription}>
            Choose what you want to override. This action is explicit and auditable.
          </div>
          <div style={styles.optionList}>
            <button
              type="button"
              onClick={() => handleSelectTarget('validation-result')}
              style={styles.optionButton}
            >
              Validation Result
            </button>
            <button
              type="button"
              onClick={() => handleSelectTarget('cost')}
              style={styles.optionButton}
            >
              Cost
            </button>
            <button
              type="button"
              onClick={() => handleSelectTarget('conflict')}
              style={styles.optionButton}
            >
              Conflict
            </button>
          </div>
          <div style={styles.currentInfo}>
            <div style={styles.currentInfoLabel}>Current Outcome:</div>
            <div style={styles.currentInfoValue}>{report.outcome}</div>
          </div>
          <button type="button" onClick={handleCancel} style={styles.cancelButton}>
            Cancel
          </button>
        </div>
      )}

      {step === 'select-action' && (
        <div style={styles.stepPanel}>
          <div style={styles.stepHeading}>Step 2: Select Override Action</div>
          <div style={styles.stepDescription}>
            Target: {selectedTarget}. Choose the new outcome.
          </div>
          <div style={styles.optionList}>
            <button
              type="button"
              onClick={() => handleSelectAction('change-outcome-to-pass')}
              style={styles.optionButton}
            >
              Change Outcome to PASS
            </button>
            <button
              type="button"
              onClick={() => handleSelectAction('change-outcome-to-fail')}
              style={styles.optionButton}
            >
              Change Outcome to FAIL
            </button>
            <button
              type="button"
              onClick={() => handleSelectAction('change-outcome-to-ambiguous')}
              style={styles.optionButton}
            >
              Change Outcome to AMBIGUOUS
            </button>
          </div>
          <button type="button" onClick={handleCancel} style={styles.cancelButton}>
            Cancel
          </button>
        </div>
      )}

      {step === 'enter-reason' && (
        <div style={styles.stepPanel}>
          <div style={styles.stepHeading}>Step 3: Enter Reason (Mandatory)</div>
          <div style={styles.stepDescription}>
            You must provide a reason for this override. This will be recorded in the audit log.
          </div>
          <div style={styles.inputGroup}>
            <label htmlFor="override-reason" style={styles.inputLabel}>
              Reason (required):
            </label>
            <textarea
              id="override-reason"
              value={reason}
              onChange={handleReasonChange}
              style={styles.textarea}
              placeholder="Enter your reason for this override..."
              rows={3}
            />
            {!isReasonValid && reason.length > 0 && (
              <div style={styles.validationNote}>Reason cannot be empty or whitespace only</div>
            )}
          </div>
          <div style={styles.inputGroup}>
            <label htmlFor="override-warning" style={styles.inputLabel}>
              Warning Message (required):
            </label>
            <textarea
              id="override-warning"
              value={warningMessage}
              onChange={handleWarningChange}
              style={styles.textarea}
              placeholder="Enter a warning message to attach to this override..."
              rows={2}
            />
            {!isWarningValid && warningMessage.length > 0 && (
              <div style={styles.validationNote}>Warning message cannot be empty</div>
            )}
          </div>
          <div style={styles.buttonRow}>
            <button type="button" onClick={handleCancel} style={styles.cancelButton}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceedToConfirm}
              style={canProceedToConfirm ? styles.proceedButton : styles.proceedButtonDisabled}
              disabled={!canProceedToConfirm}
            >
              Proceed to Confirm
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div style={styles.stepPanel}>
          <div style={styles.stepHeading}>Step 4: Confirm Override</div>
          <div style={styles.stepDescription}>
            Review and confirm this override. This action will be recorded.
          </div>
          <div style={styles.confirmSummary}>
            <div style={styles.confirmRow}>
              <span style={styles.confirmLabel}>Target:</span>
              <span style={styles.confirmValue}>{selectedTarget}</span>
            </div>
            <div style={styles.confirmRow}>
              <span style={styles.confirmLabel}>Action:</span>
              <span style={styles.confirmValue}>{selectedAction}</span>
            </div>
            <div style={styles.confirmRow}>
              <span style={styles.confirmLabel}>Reason:</span>
              <span style={styles.confirmValue}>{reason}</span>
            </div>
            <div style={styles.confirmRow}>
              <span style={styles.confirmLabel}>Warning:</span>
              <span style={styles.confirmValue}>{warningMessage}</span>
            </div>
            <div style={styles.confirmRow}>
              <span style={styles.confirmLabel}>Original Outcome:</span>
              <span style={styles.confirmValue}>{report.outcome}</span>
            </div>
          </div>
          <div style={styles.buttonRow}>
            <button type="button" onClick={handleCancel} style={styles.cancelButton}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitOverride}
              style={styles.submitButton}
            >
              Submit Override
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Styles - clear, explicit, no shortcuts
 */
const styles: Record<string, React.CSSProperties> = {
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
  section: {
    marginBottom: '16px',
  },
  sectionLabel: {
    color: '#888',
    fontSize: '13px',
    marginBottom: '8px',
  },
  overrideList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  overrideDisplay: {
    padding: '12px',
    background: '#2a2a2a',
    borderRadius: '4px',
    border: '1px solid #555',
  },
  overrideLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#e0e0e0',
  },
  overrideRow: {
    display: 'flex',
    marginBottom: '4px',
    lineHeight: '1.4',
  },
  overrideFieldLabel: {
    minWidth: '140px',
    color: '#888',
    fontSize: '12px',
  },
  overrideFieldValue: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: '12px',
    wordBreak: 'break-word',
  },
  emptyState: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: '13px',
  },
  actionSection: {
    marginTop: '16px',
  },
  createButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: '1px solid #666',
    borderRadius: '4px',
    background: '#333',
    color: '#e0e0e0',
    cursor: 'pointer',
  },
  stepPanel: {
    marginTop: '16px',
    padding: '16px',
    background: '#2a2a2a',
    borderRadius: '4px',
    border: '1px solid #555',
  },
  stepHeading: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#e0e0e0',
  },
  stepDescription: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '16px',
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  optionButton: {
    padding: '10px 16px',
    fontSize: '13px',
    border: '1px solid #555',
    borderRadius: '4px',
    background: '#333',
    color: '#e0e0e0',
    cursor: 'pointer',
    textAlign: 'left',
  },
  currentInfo: {
    marginBottom: '16px',
    padding: '8px',
    background: '#333',
    borderRadius: '4px',
  },
  currentInfoLabel: {
    fontSize: '12px',
    color: '#888',
  },
  currentInfoValue: {
    fontSize: '14px',
    color: '#e0e0e0',
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '13px',
    border: '1px solid #555',
    borderRadius: '4px',
    background: '#333',
    color: '#888',
    cursor: 'pointer',
  },
  inputGroup: {
    marginBottom: '16px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#888',
    marginBottom: '4px',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid #555',
    borderRadius: '4px',
    background: '#333',
    color: '#e0e0e0',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  validationNote: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#999',
    fontStyle: 'italic',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  proceedButton: {
    padding: '8px 16px',
    fontSize: '13px',
    border: '1px solid #666',
    borderRadius: '4px',
    background: '#444',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  proceedButtonDisabled: {
    padding: '8px 16px',
    fontSize: '13px',
    border: '1px solid #444',
    borderRadius: '4px',
    background: '#2a2a2a',
    color: '#666',
    cursor: 'not-allowed',
    fontWeight: 'bold',
  },
  submitButton: {
    padding: '8px 16px',
    fontSize: '13px',
    border: '1px solid #666',
    borderRadius: '4px',
    background: '#444',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  confirmSummary: {
    marginBottom: '16px',
    padding: '12px',
    background: '#333',
    borderRadius: '4px',
  },
  confirmRow: {
    display: 'flex',
    marginBottom: '4px',
    lineHeight: '1.4',
  },
  confirmLabel: {
    minWidth: '140px',
    color: '#888',
    fontSize: '13px',
  },
  confirmValue: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: '13px',
    wordBreak: 'break-word',
  },
};
