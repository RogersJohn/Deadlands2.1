/**
 * Notes Component (PR #2 - Frontend Assistant Mode)
 *
 * Displays additional notes from the assistant as a plain bullet list.
 * No formatting beyond simple list rendering.
 */

import type { ReactElement } from 'react';
import { colors, spacing, typography, borderRadius, componentStyles } from '../shared/styles';

export type NotesProps = {
  readonly notes: readonly string[];
};

export function Notes({ notes }: NotesProps): ReactElement {
  return (
    <div style={styles.container}>
      <h3 style={componentStyles.panelHeading}>Notes</h3>
      {notes.length === 0 ? (
        <p style={componentStyles.emptyState}>No additional notes.</p>
      ) : (
        <ul style={styles.list}>
          {notes.map((note, index) => (
            <li key={index} style={styles.item}>
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    background: colors.bgDarker,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.borderMedium}`,
  },
  list: {
    margin: 0,
    paddingLeft: spacing.xl,
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
  },
  item: {
    marginBottom: spacing.xs,
  },
};
