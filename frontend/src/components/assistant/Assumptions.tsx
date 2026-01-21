/**
 * Assumptions Component (Phase 2 - Assumption-Driven Refinement)
 *
 * CRITICAL: This section MUST always be visible.
 * Displays what the assistant assumed to produce its suggestion.
 * This is the authority-preserving mechanism - GM can see exactly
 * what the assistant inferred and clarify via natural language.
 *
 * No hiding, no collapsing, no "show more" - always fully visible.
 * No editing assumptions inline - refinement appends text to input.
 */

import { type ReactElement, useState } from 'react';
import { colors, spacing, typography, borderRadius, componentStyles } from '../shared/styles';

export type Assumption = {
  readonly statement: string;
  readonly confidence: "high" | "medium" | "low";
};

export type AssumptionsProps = {
  readonly assumptions: readonly Assumption[];
  readonly onRefine?: (sentenceStarter: string) => void;
};

/**
 * Get the appropriate sentence starter based on assumption content.
 * Uses first matching rule.
 */
function getSentenceStarter(statement: string): string {
  const lower = statement.toLowerCase();

  // A. Weapon / Equipment Assumptions
  if (/weapon|rifle|pistol|gun|blade|firearm/.test(lower)) {
    return 'The weapon used is ';
  }

  // B. Lighting / Visibility Assumptions
  if (/lighting|light|darkness|visibility/.test(lower)) {
    return 'Lighting conditions are ';
  }

  // C. Movement / Position Assumptions
  if (/mounted|running|prone|moving|stationary|galloping/.test(lower)) {
    return 'The character is ';
  }

  // D. Target / Scale Assumptions
  if (/target|size|creature|human-sized/.test(lower)) {
    return 'The target is ';
  }

  // E. Skill / Ability Assumptions
  if (/skill|trait|ability/.test(lower)) {
    return 'The relevant skill is ';
  }

  // F. Fallback (Always Required)
  return 'Clarifying detail: ';
}

/**
 * Single assumption row with Refine and Why? actions
 */
function AssumptionRow({
  assumption,
  onRefine,
}: {
  assumption: Assumption;
  onRefine?: (sentenceStarter: string) => void;
}): ReactElement {
  const [showWhy, setShowWhy] = useState(false);

  function handleRefineClick(): void {
    if (onRefine) {
      const starter = getSentenceStarter(assumption.statement);
      onRefine(starter);
    }
  }

  function handleWhyClick(): void {
    setShowWhy((prev) => !prev);
  }

  return (
    <div style={componentStyles.listItem}>
      <div style={componentStyles.row}>
        <span style={componentStyles.fieldLabel}>Statement:</span>
        <span style={componentStyles.fieldValue}>{assumption.statement}</span>
      </div>
      <div style={componentStyles.row}>
        <span style={componentStyles.fieldLabel}>Confidence:</span>
        <span style={componentStyles.fieldValue}>{assumption.confidence}</span>
      </div>

      {/* Refine and Why? actions */}
      {onRefine && (
        <div style={styles.actionsRow}>
          <button
            type="button"
            onClick={handleRefineClick}
            style={styles.refineButton}
          >
            Refine
          </button>
          <button
            type="button"
            onClick={handleWhyClick}
            style={styles.whyButton}
          >
            Why?
          </button>
        </div>
      )}

      {/* Why? explanation - collapsed by default */}
      {showWhy && (
        <p style={styles.whyExplanation}>
          This assumption was made because the input did not specify this detail.
        </p>
      )}
    </div>
  );
}

export function Assumptions({ assumptions, onRefine }: AssumptionsProps): ReactElement {
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
            <AssumptionRow
              key={index}
              assumption={assumption}
              onRefine={onRefine}
            />
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
  actionsRow: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  refineButton: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: borderRadius.sm,
    background: 'transparent',
    color: colors.textMuted,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
  },
  whyButton: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    border: 'none',
    borderRadius: borderRadius.sm,
    background: 'transparent',
    color: colors.textMuted,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
    textDecoration: 'underline',
  },
  whyExplanation: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    background: colors.bgMedium,
    borderRadius: borderRadius.sm,
  },
};
