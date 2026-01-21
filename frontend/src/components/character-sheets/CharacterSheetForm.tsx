/**
 * CharacterSheetForm Component (Phase 2.5a)
 *
 * Form for creating and editing character sheets.
 * All fields are optional except name and role.
 */

import { type ReactElement, useState, type ChangeEvent, type FormEvent } from 'react';
import type { CharacterSheet, CharacterSheetCreate } from '../../types/CharacterSheet';
import { colors, spacing, typography, borderRadius, componentStyles } from '../shared/styles';

export type CharacterSheetFormProps = {
  readonly initialData?: CharacterSheet;
  readonly onSubmit: (data: CharacterSheetCreate) => void;
  readonly onCancel: () => void;
};

/**
 * Parse a comma-separated string into an array of trimmed strings
 */
function parseList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Format an array of strings into a comma-separated string
 */
function formatList(values: readonly string[] | undefined): string {
  return values ? values.join(', ') : '';
}

export function CharacterSheetForm({
  initialData,
  onSubmit,
  onCancel,
}: CharacterSheetFormProps): ReactElement {
  const [name, setName] = useState(initialData?.name ?? '');
  const [role, setRole] = useState<'PC' | 'NPC'>(initialData?.role ?? 'PC');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [skills, setSkills] = useState(formatList(initialData?.skills));
  const [equipment, setEquipment] = useState(formatList(initialData?.equipment));
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();

    const data: CharacterSheetCreate = {
      name: name.trim(),
      role,
      description: description.trim(),
      skills: skills.trim() ? parseList(skills) : undefined,
      equipment: equipment.trim() ? parseList(equipment) : undefined,
      notes: notes.trim() || undefined,
    };

    onSubmit(data);
  }

  const isValid = name.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={componentStyles.panelHeading}>
        {initialData ? 'Edit Character Sheet' : 'New Character Sheet'}
      </h3>

      <div style={styles.field}>
        <label htmlFor="cs-name" style={styles.label}>
          Name *
        </label>
        <input
          id="cs-name"
          type="text"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          style={componentStyles.input}
          placeholder="e.g., Alice"
        />
      </div>

      <div style={styles.field}>
        <label htmlFor="cs-role" style={styles.label}>
          Role *
        </label>
        <select
          id="cs-role"
          value={role}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setRole(e.target.value as 'PC' | 'NPC')
          }
          style={componentStyles.select}
        >
          <option value="PC">PC (Player Character)</option>
          <option value="NPC">NPC (Non-Player Character)</option>
        </select>
      </div>

      <div style={styles.field}>
        <label htmlFor="cs-description" style={styles.label}>
          Description
        </label>
        <textarea
          id="cs-description"
          value={description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setDescription(e.target.value)
          }
          style={styles.textarea}
          rows={3}
          placeholder="e.g., a seasoned gunslinger from Texas"
        />
      </div>

      <div style={styles.field}>
        <label htmlFor="cs-skills" style={styles.label}>
          Skills (comma-separated)
        </label>
        <input
          id="cs-skills"
          type="text"
          value={skills}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSkills(e.target.value)}
          style={componentStyles.input}
          placeholder="e.g., Shooting d8, Fighting d6, Notice d6"
        />
      </div>

      <div style={styles.field}>
        <label htmlFor="cs-equipment" style={styles.label}>
          Equipment (comma-separated)
        </label>
        <input
          id="cs-equipment"
          type="text"
          value={equipment}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setEquipment(e.target.value)
          }
          style={componentStyles.input}
          placeholder="e.g., rifle, revolver, horse"
        />
      </div>

      <div style={styles.field}>
        <label htmlFor="cs-notes" style={styles.label}>
          Notes
        </label>
        <textarea
          id="cs-notes"
          value={notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          style={styles.textarea}
          rows={2}
          placeholder="Any additional notes..."
        />
      </div>

      <div style={styles.actions}>
        <button
          type="submit"
          disabled={!isValid}
          style={isValid ? componentStyles.button : componentStyles.buttonDisabled}
        >
          {initialData ? 'Save Changes' : 'Create Character'}
        </button>
        <button type="button" onClick={onCancel} style={styles.cancelButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    padding: spacing.lg,
    background: colors.bgDarker,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.borderMedium}`,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    display: 'block',
    marginBottom: spacing.xs,
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
  },
  actions: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelButton: {
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.borderDark}`,
    borderRadius: borderRadius.md,
    background: 'transparent',
    color: colors.textMuted,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
  },
};
