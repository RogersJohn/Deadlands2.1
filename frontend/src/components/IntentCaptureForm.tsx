/**
 * IntentCaptureForm Component (FE-PR 0.2)
 *
 * CRITICAL: This is a DECLARATION console, not a wizard.
 * - No validation
 * - No defaults
 * - No auto-fill
 * - No guidance
 * - No blocking submission
 * - No interpretation
 *
 * The form collects explicit user input and emits it verbatim.
 * If the GM submits nonsense, the system accepts it.
 */

import { type ReactElement, useState, type ChangeEvent } from 'react';
import type { RawIntent } from '../contracts';

/**
 * Form state - explicit fields only
 */
type IntentFormState = {
  actor: string;
  mode: string;
  intentType: string;
  declaredActions: string[];
  declaredConditions: string[];
};

/**
 * Props for the form
 */
export type IntentCaptureFormProps = {
  readonly onSubmit: (intent: RawIntent) => void;
};

/**
 * Create empty form state - NO DEFAULTS
 */
function createEmptyFormState(): IntentFormState {
  return {
    actor: '',
    mode: '',
    intentType: '',
    declaredActions: [],
    declaredConditions: [],
  };
}

/**
 * Convert form state to RawIntent DTO
 * NO TRANSFORMATION - fields sent exactly as entered
 */
function formStateToIntent(state: IntentFormState): RawIntent {
  return {
    intentType: state.intentType,
    payload: {
      actor: state.actor,
      mode: state.mode,
      declaredActions: state.declaredActions,
      declaredConditions: state.declaredConditions,
    },
  };
}

export function IntentCaptureForm({
  onSubmit,
}: IntentCaptureFormProps): ReactElement {
  const [formState, setFormState] = useState<IntentFormState>(
    createEmptyFormState
  );

  // Track new action/condition input values
  const [newAction, setNewAction] = useState('');
  const [newCondition, setNewCondition] = useState('');

  /**
   * Handle text field changes
   */
  function handleFieldChange(field: keyof IntentFormState) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormState((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };
  }

  /**
   * Add action to list - NO VALIDATION
   */
  function handleAddAction(): void {
    setFormState((prev) => ({
      ...prev,
      declaredActions: [...prev.declaredActions, newAction],
    }));
    setNewAction('');
  }

  /**
   * Remove action from list by index
   */
  function handleRemoveAction(index: number): void {
    setFormState((prev) => ({
      ...prev,
      declaredActions: prev.declaredActions.filter((_, i) => i !== index),
    }));
  }

  /**
   * Add condition to list - NO VALIDATION
   */
  function handleAddCondition(): void {
    setFormState((prev) => ({
      ...prev,
      declaredConditions: [...prev.declaredConditions, newCondition],
    }));
    setNewCondition('');
  }

  /**
   * Remove condition from list by index
   */
  function handleRemoveCondition(index: number): void {
    setFormState((prev) => ({
      ...prev,
      declaredConditions: prev.declaredConditions.filter((_, i) => i !== index),
    }));
  }

  /**
   * Handle form submission
   * NO BLOCKING - submit regardless of content
   */
  function handleSubmit(): void {
    const intent = formStateToIntent(formState);
    onSubmit(intent);
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Intent Declaration</h2>
      <p style={styles.description}>
        Declare an intent. All fields are explicit. No interpretation.
      </p>

      {/* Intent Type */}
      <div style={styles.fieldGroup}>
        <label htmlFor="intent-type" style={styles.label}>Intent Type</label>
        <p style={styles.fieldDescription}>
          The type identifier for this intent.
        </p>
        <input
          id="intent-type"
          type="text"
          value={formState.intentType}
          onChange={handleFieldChange('intentType')}
          style={styles.input}
        />
      </div>

      {/* Actor */}
      <div style={styles.fieldGroup}>
        <label htmlFor="actor" style={styles.label}>Actor</label>
        <p style={styles.fieldDescription}>
          The identifier of the actor declaring this intent.
        </p>
        <input
          id="actor"
          type="text"
          value={formState.actor}
          onChange={handleFieldChange('actor')}
          style={styles.input}
        />
      </div>

      {/* Mode */}
      <div style={styles.fieldGroup}>
        <label htmlFor="mode" style={styles.label}>Mode</label>
        <p style={styles.fieldDescription}>
          The operational mode for this intent.
        </p>
        <select
          id="mode"
          value={formState.mode}
          onChange={handleFieldChange('mode')}
          style={styles.select}
        >
          <option value="">-- Select --</option>
          <option value="combat">combat</option>
          <option value="exploration">exploration</option>
          <option value="social">social</option>
          <option value="downtime">downtime</option>
          <option value="other">other</option>
        </select>
      </div>

      {/* Declared Actions */}
      <div style={styles.fieldGroup}>
        <label htmlFor="new-action" style={styles.label}>Declared Actions</label>
        <p style={styles.fieldDescription}>
          Actions declared as part of this intent.
        </p>
        <div style={styles.repeatableList}>
          {formState.declaredActions.map((action, index) => (
            <div key={index} style={styles.repeatableItem}>
              <span style={styles.repeatableValue}>{action}</span>
              <button
                type="button"
                onClick={() => handleRemoveAction(index)}
                style={styles.removeButton}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div style={styles.addRow}>
          <input
            id="new-action"
            type="text"
            value={newAction}
            onChange={(e) => setNewAction(e.target.value)}
            style={styles.input}
          />
          <button
            type="button"
            onClick={handleAddAction}
            style={styles.addButton}
          >
            Add Action
          </button>
        </div>
      </div>

      {/* Declared Conditions */}
      <div style={styles.fieldGroup}>
        <label htmlFor="new-condition" style={styles.label}>Declared Conditions</label>
        <p style={styles.fieldDescription}>
          Conditions declared as present for this intent.
        </p>
        <div style={styles.repeatableList}>
          {formState.declaredConditions.map((condition, index) => (
            <div key={index} style={styles.repeatableItem}>
              <span style={styles.repeatableValue}>{condition}</span>
              <button
                type="button"
                onClick={() => handleRemoveCondition(index)}
                style={styles.removeButton}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div style={styles.addRow}>
          <input
            id="new-condition"
            type="text"
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            style={styles.input}
          />
          <button
            type="button"
            onClick={handleAddCondition}
            style={styles.addButton}
          >
            Add Condition
          </button>
        </div>
      </div>

      {/* Submit - ALWAYS ENABLED */}
      <div style={styles.submitRow}>
        <button type="button" onClick={handleSubmit} style={styles.submitButton}>
          Submit Intent
        </button>
      </div>

      {/* Preview - raw JSON of what will be sent */}
      <div style={styles.previewSection}>
        <h3 style={styles.previewHeading}>Intent Preview (Raw)</h3>
        <pre style={styles.preview}>
          {JSON.stringify(formStateToIntent(formState), null, 2)}
        </pre>
      </div>
    </div>
  );
}

/**
 * Inline styles - simple, clear, non-opinionated
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '600px',
  },
  heading: {
    margin: '0 0 8px 0',
    fontSize: '20px',
  },
  description: {
    margin: '0 0 24px 0',
    color: '#888',
    fontSize: '14px',
  },
  fieldGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: '4px',
    fontSize: '14px',
  },
  fieldDescription: {
    margin: '0 0 8px 0',
    color: '#888',
    fontSize: '12px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #444',
    borderRadius: '4px',
    background: '#2a2a2a',
    color: '#e0e0e0',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #444',
    borderRadius: '4px',
    background: '#2a2a2a',
    color: '#e0e0e0',
    boxSizing: 'border-box',
  },
  repeatableList: {
    marginBottom: '8px',
  },
  repeatableItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    marginBottom: '4px',
    background: '#333',
    borderRadius: '4px',
  },
  repeatableValue: {
    fontSize: '14px',
  },
  removeButton: {
    padding: '4px 8px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    background: '#555',
    color: '#e0e0e0',
    cursor: 'pointer',
  },
  addRow: {
    display: 'flex',
    gap: '8px',
  },
  addButton: {
    padding: '8px 16px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '4px',
    background: '#444',
    color: '#e0e0e0',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  submitRow: {
    marginTop: '32px',
    marginBottom: '24px',
  },
  submitButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    background: '#4a4a4a',
    color: '#e0e0e0',
    cursor: 'pointer',
  },
  previewSection: {
    marginTop: '24px',
    padding: '16px',
    background: '#222',
    borderRadius: '4px',
  },
  previewHeading: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#888',
  },
  preview: {
    margin: 0,
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
};
