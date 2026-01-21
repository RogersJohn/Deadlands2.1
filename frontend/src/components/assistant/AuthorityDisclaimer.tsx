/**
 * AuthorityDisclaimer Component (PR #2 - Frontend Assistant Mode)
 *
 * CRITICAL: This must ALWAYS be visible when assistant output is shown.
 * Fixed footer that reminds users this is advisory, not authoritative.
 * The GM is always the final authority.
 */

import type { ReactElement } from 'react';
import { colors, spacing, typography, borderRadius } from '../shared/styles';

export function AuthorityDisclaimer(): ReactElement {
  return (
    <div style={styles.container}>
      <p style={styles.text}>
        This is an advisory suggestion only. The GM is the final authority on all
        rules interpretations and roll requirements.
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: spacing.md,
    background: colors.bgMedium,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.borderMedium}`,
    marginTop: spacing.lg,
  },
  text: {
    margin: 0,
    color: colors.textMuted,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
};
