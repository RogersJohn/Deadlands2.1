/**
 * ErrorPanel Component (PR #2 - Frontend Assistant Mode)
 *
 * CRITICAL: Hard-fail display for invalid assistant responses.
 * No fallback, no coercion - just displays the error.
 */

import type { ReactElement, ReactNode } from 'react';
import { colors, spacing, typography, borderRadius } from '../shared/styles';

export type ErrorPanelProps = {
  readonly children: ReactNode;
};

export function ErrorPanel({ children }: ErrorPanelProps): ReactElement {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    background: colors.bgMedium,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.borderMedium}`,
  },
  content: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
  },
};
