/**
 * SuggestedRoll Component (PR #2 - Frontend Assistant Mode)
 *
 * Displays the suggested roll (trait and target number).
 * Uses ONLY neutral styling - no semantic colors.
 * No "you should" language - just displays what the assistant suggested.
 */

import type { ReactElement } from 'react';
import { colors, spacing, typography, borderRadius, componentStyles } from '../shared/styles';

export type SuggestedRollProps = {
  readonly trait: string;
  readonly targetNumber: number;
  readonly netModifier: number;
};

export function SuggestedRoll({
  trait,
  targetNumber,
  netModifier,
}: SuggestedRollProps): ReactElement {
  return (
    <div style={styles.container}>
      <h3 style={componentStyles.panelHeading}>Suggested Roll</h3>
      <div style={styles.content}>
        <div style={componentStyles.row}>
          <span style={componentStyles.fieldLabel}>Trait:</span>
          <span style={componentStyles.fieldValue}>{trait}</span>
        </div>
        <div style={componentStyles.row}>
          <span style={componentStyles.fieldLabel}>Target Number:</span>
          <span style={componentStyles.fieldValue}>{targetNumber}</span>
        </div>
        <div style={componentStyles.row}>
          <span style={componentStyles.fieldLabel}>Net Modifier:</span>
          <span style={componentStyles.fieldValue}>
            {netModifier >= 0 ? `+${netModifier}` : netModifier}
          </span>
        </div>
      </div>
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
  content: {
    fontSize: typography.fontSize.base,
  },
};
