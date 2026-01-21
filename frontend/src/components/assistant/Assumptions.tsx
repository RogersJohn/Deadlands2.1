/**
 * Assumptions Component (PR #2 - Frontend Assistant Mode)
 *
 * CRITICAL: This section MUST always be visible.
 * Displays what the assistant assumed to produce its suggestion.
 * This is the authority-preserving mechanism - GM can see exactly
 * what the assistant inferred and correct it if needed.
 *
 * No hiding, no collapsing, no "show more" - always fully visible.
 */

import type { ReactElement } from 'react';
import { colors, spacing, typography, borderRadius, componentStyles } from '../shared/styles';

export type Assumption = {
  readonly statement: string;
  readonly confidence: "high" | "medium" | "low";
};

export type AssumptionsProps = {
  readonly assumptions: readonly Assumption[];
};

export function Assumptions({ assumptions }: AssumptionsProps): ReactElement {
  return (
    <div style={styles.container}>
      <h3 style={componentStyles.panelHeading}>Assumptions</h3>
      <p style={styles.subtext}>
        The assistant made these interpretations. Review them carefully.
      </p>
      {assumptions.length === 0 ? (
        <p style={componentStyles.emptyState}>No assumptions recorded.</p>
      ) : (
        <div style={componentStyles.list}>
          {assumptions.map((assumption, index) => (
            <div key={index} style={componentStyles.listItem}>
              <div style={componentStyles.row}>
                <span style={componentStyles.fieldLabel}>Statement:</span>
                <span style={componentStyles.fieldValue}>{assumption.statement}</span>
              </div>
              <div style={componentStyles.row}>
                <span style={componentStyles.fieldLabel}>Confidence:</span>
                <span style={componentStyles.fieldValue}>{assumption.confidence}</span>
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
  subtext: {
    margin: `0 0 ${spacing.md} 0`,
    color: colors.textMuted,
    fontSize: typography.fontSize.sm,
  },
};
