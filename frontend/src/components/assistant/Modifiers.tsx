/**
 * Modifiers Component (PR #2 - Frontend Assistant Mode)
 *
 * Displays the list of modifiers (label, value, source).
 * No totaling, no semantic colors, no "fix this" language.
 * Just displays what the assistant extracted.
 */

import type { ReactElement } from 'react';
import { colors, spacing, typography, borderRadius, componentStyles } from '../shared/styles';

export type Modifier = {
  readonly label: string;
  readonly value: number;
  readonly source: string;
};

export type ModifiersProps = {
  readonly modifiers: readonly Modifier[];
};

export function Modifiers({ modifiers }: ModifiersProps): ReactElement {
  return (
    <div style={styles.container}>
      <h3 style={componentStyles.panelHeading}>Modifiers</h3>
      {modifiers.length === 0 ? (
        <p style={componentStyles.emptyState}>No modifiers identified.</p>
      ) : (
        <div style={componentStyles.list}>
          {modifiers.map((modifier, index) => (
            <div key={index} style={componentStyles.listItem}>
              <div style={componentStyles.row}>
                <span style={componentStyles.fieldLabel}>Modifier:</span>
                <span style={componentStyles.fieldValue}>{modifier.label}</span>
              </div>
              <div style={componentStyles.row}>
                <span style={componentStyles.fieldLabel}>Value:</span>
                <span style={componentStyles.fieldValue}>
                  {modifier.value >= 0 ? `+${modifier.value}` : modifier.value}
                </span>
              </div>
              <div style={componentStyles.row}>
                <span style={componentStyles.fieldLabel}>Source:</span>
                <span style={componentStyles.fieldValue}>{modifier.source}</span>
              </div>
            </div>
          ))}
        </div>
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
};
