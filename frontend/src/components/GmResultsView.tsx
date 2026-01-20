/**
 * GmResultsView (GM Results View PR)
 *
 * CRITICAL: This is a PRESENTATION-ONLY component.
 * - NO backend logic changes
 * - NO inference, summaries, verdicts, rankings, or recommendations
 * - NO collapsing of ambiguity or conflicts
 * - NO "overall result", "legality", or "success/failure"
 * - NO auto-selection, auto-fill, or implied correctness
 * - NO hidden failed or unresolved rules
 * - NO AI interpretation or advice
 *
 * This component reframes existing engine outputs into plain-language sections
 * while preserving every rule result exactly as emitted.
 *
 * The UI should feel clear, calm, and deliberately undecided.
 * If the UI answers "What should I do?", this component has failed.
 */

import type { CSSProperties } from 'react';
import type {
  RuleValidationResult,
  CostResult,
  ConflictResult,
  AggregatedValidationReport,
  Effect,
  GmOverride,
} from '../contracts';
import { colors, spacing, typography, borderRadius } from './shared/styles';

// ============================================================================
// Types
// ============================================================================

/**
 * EvaluationContext - the inputs as provided, no assumptions added
 */
export type EvaluationContext = {
  readonly action: string;
  readonly actor: string;
  readonly target: string;
  readonly environment: string;
  readonly declaredIntent: string; // verbatim free text
};

/**
 * GmResultsViewProps - all data needed for the results view
 */
export type GmResultsViewProps = {
  readonly context: EvaluationContext;
  readonly report: AggregatedValidationReport;
  readonly effects: readonly Effect[];
  readonly overrides: readonly GmOverride[];
};

// ============================================================================
// Styles (no color semantics that imply "good" or "bad")
// ============================================================================

const sectionStyles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xl,
    fontFamily: typography.fontFamily.base,
    color: colors.textPrimary,
    background: colors.bgDarkest,
    padding: spacing.lg,
  },
  section: {
    background: colors.bgDarker,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.borderMedium}`,
    padding: spacing.lg,
  },
  heading: {
    margin: `0 0 ${spacing.sm} 0`,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    borderBottom: `1px solid ${colors.borderMedium}`,
    paddingBottom: spacing.sm,
  },
  microcopy: {
    margin: `0 0 ${spacing.md} 0`,
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  fieldRow: {
    display: 'flex',
    marginBottom: spacing.xs,
    lineHeight: typography.lineHeight.normal,
  },
  fieldLabel: {
    minWidth: '140px',
    color: colors.textMuted,
    fontSize: typography.fontSize.base,
  },
  fieldValue: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    wordBreak: 'break-word',
    fontFamily: typography.fontFamily.mono,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  listItem: {
    padding: spacing.md,
    background: colors.bgMedium,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.borderMedium}`,
  },
  emptyState: {
    color: colors.textDisabled,
    fontStyle: 'italic',
    fontSize: typography.fontSize.base,
  },
  // UNRESOLVED is visually distinct but not explained away
  unresolvedBadge: {
    display: 'inline-block',
    padding: `${spacing.xs} ${spacing.sm}`,
    background: colors.bgLight,
    border: `1px dashed ${colors.borderLight}`,
    borderRadius: borderRadius.sm,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.mono,
  },
  // Result badge - neutral, no color semantics
  resultBadge: {
    display: 'inline-block',
    padding: `${spacing.xs} ${spacing.sm}`,
    background: colors.bgMedium,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: borderRadius.sm,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.mono,
  },
};

// ============================================================================
// Section 1: Evaluation Context
// ============================================================================

export type EvaluationContextSectionProps = {
  readonly context: EvaluationContext;
};

/**
 * EvaluationContextSection
 *
 * Heading: Evaluation Context
 * Microcopy: Inputs as provided. No assumptions added.
 *
 * Fields (read-only, verbatim):
 * - Action
 * - Actor
 * - Target
 * - Environment
 * - Declared Intent (verbatim free text)
 *
 * Do not paraphrase or normalize text.
 */
export function EvaluationContextSection({
  context,
}: EvaluationContextSectionProps): JSX.Element {
  return (
    <section style={sectionStyles.section} aria-labelledby="evaluation-context-heading">
      <h2 id="evaluation-context-heading" style={sectionStyles.heading}>
        Evaluation Context
      </h2>
      <p style={sectionStyles.microcopy}>
        Inputs as provided. No assumptions added.
      </p>
      <div>
        <div style={sectionStyles.fieldRow}>
          <span style={sectionStyles.fieldLabel}>Action:</span>
          <span style={sectionStyles.fieldValue}>{context.action}</span>
        </div>
        <div style={sectionStyles.fieldRow}>
          <span style={sectionStyles.fieldLabel}>Actor:</span>
          <span style={sectionStyles.fieldValue}>{context.actor}</span>
        </div>
        <div style={sectionStyles.fieldRow}>
          <span style={sectionStyles.fieldLabel}>Target:</span>
          <span style={sectionStyles.fieldValue}>{context.target}</span>
        </div>
        <div style={sectionStyles.fieldRow}>
          <span style={sectionStyles.fieldLabel}>Environment:</span>
          <span style={sectionStyles.fieldValue}>{context.environment}</span>
        </div>
        <div style={sectionStyles.fieldRow}>
          <span style={sectionStyles.fieldLabel}>Declared Intent:</span>
          {/* Verbatim free text - do not paraphrase or normalize */}
          <span style={sectionStyles.fieldValue}>{context.declaredIntent}</span>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Section 2: Rule Results
// ============================================================================

export type RuleResultsSectionProps = {
  readonly ruleResults: readonly RuleValidationResult[];
};

/**
 * RuleResultsSection
 *
 * Heading: Rule Results
 * Microcopy: Each rule was evaluated independently. No rule overrides another here.
 *
 * Display:
 * - Flat list of all evaluated rules
 * - Each entry shows: Rule name, Result (PASS/FAIL/UNRESOLVED), Engine-provided reason text
 *
 * Rules:
 * - No icons that imply value judgment
 * - No color semantics that imply "good" or "bad"
 * - UNRESOLVED must be visually distinct but not explained away
 */
export function RuleResultsSection({
  ruleResults,
}: RuleResultsSectionProps): JSX.Element {
  // Map outcome to display text - AMBIGUOUS maps to UNRESOLVED per spec
  const getResultText = (outcome: string): string => {
    if (outcome === 'AMBIGUOUS') return 'UNRESOLVED';
    return outcome;
  };

  return (
    <section style={sectionStyles.section} aria-labelledby="rule-results-heading">
      <h2 id="rule-results-heading" style={sectionStyles.heading}>
        Rule Results
      </h2>
      <p style={sectionStyles.microcopy}>
        Each rule was evaluated independently. No rule overrides another here.
      </p>
      {ruleResults.length === 0 ? (
        <p style={sectionStyles.emptyState}>(no rules evaluated)</p>
      ) : (
        <ul style={sectionStyles.list}>
          {ruleResults.map((result, index) => (
            <li key={`${result.validatorId}-${index}`} style={sectionStyles.listItem}>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Rule:</span>
                <span style={sectionStyles.fieldValue}>{result.validatorId}</span>
              </div>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Result:</span>
                <span
                  style={
                    result.outcome === 'AMBIGUOUS'
                      ? sectionStyles.unresolvedBadge
                      : sectionStyles.resultBadge
                  }
                >
                  {getResultText(result.outcome)}
                </span>
              </div>
              {/* Engine-provided reason text - unchanged */}
              {result.violations.length > 0 && (
                <div style={{ marginTop: spacing.sm }}>
                  {result.violations.map((v, vi) => (
                    <div key={`${v.ruleId}-${vi}`} style={sectionStyles.fieldRow}>
                      <span style={sectionStyles.fieldLabel}>Engine-reported:</span>
                      <span style={sectionStyles.fieldValue}>{v.message}</span>
                    </div>
                  ))}
                </div>
              )}
              {result.ambiguity && (
                <div style={{ marginTop: spacing.sm }}>
                  <div style={sectionStyles.fieldRow}>
                    <span style={sectionStyles.fieldLabel}>Ambiguity:</span>
                    <span style={sectionStyles.fieldValue}>{result.ambiguity.reason}</span>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ============================================================================
// Section 3: Conflicts Detected
// ============================================================================

export type ConflictsDetectedSectionProps = {
  readonly conflicts: readonly ConflictResult[];
};

/**
 * ConflictsDetectedSection
 *
 * Heading: Conflicts Detected
 * Microcopy: These rules disagree or block each other. The engine does not resolve this.
 *
 * If no conflicts: "No direct conflicts detected."
 * If conflicts exist:
 * - Show each conflict explicitly
 * - Engine-provided explanation
 * - Status line: "Unresolved by design."
 *
 * Do not suggest resolution or GM action.
 */
export function ConflictsDetectedSection({
  conflicts,
}: ConflictsDetectedSectionProps): JSX.Element {
  return (
    <section style={sectionStyles.section} aria-labelledby="conflicts-heading">
      <h2 id="conflicts-heading" style={sectionStyles.heading}>
        Conflicts Detected
      </h2>
      <p style={sectionStyles.microcopy}>
        These rules disagree or block each other. The engine does not resolve this.
      </p>
      {conflicts.length === 0 ? (
        <p style={sectionStyles.emptyState}>No direct conflicts detected.</p>
      ) : (
        <ul style={sectionStyles.list}>
          {conflicts.map((c, index) => (
            <li key={`${c.validatorId}-${index}`} style={sectionStyles.listItem}>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Source Rule:</span>
                <span style={sectionStyles.fieldValue}>{c.conflict.sourceRule}</span>
              </div>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Kind:</span>
                <span style={sectionStyles.fieldValue}>{c.conflict.kind}</span>
              </div>
              {/* Engine-reported conflict text - no explanatory framing */}
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Engine-reported conflict:</span>
                <span style={sectionStyles.fieldValue}>{c.conflict.message}</span>
              </div>
              {/* Status line - do not suggest resolution or GM action */}
              <div style={{ marginTop: spacing.sm, ...sectionStyles.fieldRow }}>
                <span style={sectionStyles.fieldLabel}>Status:</span>
                <span style={sectionStyles.unresolvedBadge}>Unresolved by design.</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ============================================================================
// Section 4: Costs (If Applied)
// ============================================================================

export type CostsSectionProps = {
  readonly costs: readonly CostResult[];
};

/**
 * CostsSection
 *
 * Heading: Costs (If Applied)
 * Microcopy: These costs were produced by rules that passed. They are not enforced here.
 *
 * Rules:
 * - Show all costs emitted
 * - Do not total
 * - Do not say "required" or "must pay"
 * - Do not hide costs because other rules failed
 */
export function CostsSection({ costs }: CostsSectionProps): JSX.Element {
  return (
    <section style={sectionStyles.section} aria-labelledby="costs-heading">
      <h2 id="costs-heading" style={sectionStyles.heading}>
        Costs (If Applied)
      </h2>
      <p style={sectionStyles.microcopy}>
        These costs were produced by rules that passed. They are not enforced here.
      </p>
      {costs.length === 0 ? (
        <p style={sectionStyles.emptyState}>(no costs produced)</p>
      ) : (
        <ul style={sectionStyles.list}>
          {costs.map((c, index) => (
            <li key={`${c.validatorId}-${index}`} style={sectionStyles.listItem}>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Source Rule:</span>
                <span style={sectionStyles.fieldValue}>{c.validatorId}</span>
              </div>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Cost:</span>
                <span style={sectionStyles.fieldValue}>
                  {c.costValidation.cost.description}
                </span>
              </div>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Status:</span>
                <span style={sectionStyles.fieldValue}>{c.costValidation.outcome}</span>
              </div>
              {c.costValidation.reason && (
                <div style={sectionStyles.fieldRow}>
                  <span style={sectionStyles.fieldLabel}>Engine-reported:</span>
                  <span style={sectionStyles.fieldValue}>{c.costValidation.reason}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ============================================================================
// Section 5: Effects (If Applied)
// ============================================================================

export type EffectsSectionProps = {
  readonly effects: readonly Effect[];
};

/**
 * EffectsSection
 *
 * Heading: Effects (If Applied)
 * Microcopy: Effects describe outcomes produced by individual rules, not a final result.
 *
 * Rules:
 * - Group effects by source rule
 * - Conflicting effects must be shown side-by-side
 * - Do not collapse into a net outcome
 */
export function EffectsSection({ effects }: EffectsSectionProps): JSX.Element {
  // Group effects by source (invocationId)
  const groupedEffects = effects.reduce<Record<string, Effect[]>>((acc, effect) => {
    const source = effect.authority.invocationId;
    if (!acc[source]) {
      acc[source] = [];
    }
    acc[source].push(effect);
    return acc;
  }, {});

  const sources = Object.keys(groupedEffects);

  return (
    <section style={sectionStyles.section} aria-labelledby="effects-heading">
      <h2 id="effects-heading" style={sectionStyles.heading}>
        Effects (If Applied)
      </h2>
      {/* Microcopy intentionally avoids "final result" - see spec constraints */}
      <p style={sectionStyles.microcopy}>
        Effects describe outcomes produced by individual rules. No aggregation applied.
      </p>
      {effects.length === 0 ? (
        <p style={sectionStyles.emptyState}>(no effects produced)</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {sources.map((source) => (
            <div key={source}>
              <div
                style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.textMuted,
                  marginBottom: spacing.xs,
                }}
              >
                Source: {source}
              </div>
              <ul style={sectionStyles.list}>
                {(groupedEffects[source] ?? []).map((effect, index) => (
                  <li key={`${effect.effectId}-${index}`} style={sectionStyles.listItem}>
                    <div style={sectionStyles.fieldRow}>
                      <span style={sectionStyles.fieldLabel}>Effect ID:</span>
                      <span style={sectionStyles.fieldValue}>{effect.effectId}</span>
                    </div>
                    <div style={sectionStyles.fieldRow}>
                      <span style={sectionStyles.fieldLabel}>Type:</span>
                      <span style={sectionStyles.fieldValue}>{effect.effectType}</span>
                    </div>
                    <div style={sectionStyles.fieldRow}>
                      <span style={sectionStyles.fieldLabel}>Target:</span>
                      <span style={sectionStyles.fieldValue}>
                        {effect.target.targetId} ({effect.target.targetType})
                      </span>
                    </div>
                    <div style={sectionStyles.fieldRow}>
                      <span style={sectionStyles.fieldLabel}>Description:</span>
                      <span style={sectionStyles.fieldValue}>{effect.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Section 6: Overrides in Effect
// ============================================================================

export type OverridesInEffectSectionProps = {
  readonly overrides: readonly GmOverride[];
};

/**
 * OverridesInEffectSection
 *
 * Heading: Overrides in Effect
 * Microcopy: Overrides change rule evaluation. They do not remove rules.
 *
 * If none: "No overrides applied."
 * If present:
 * - Name the override
 * - Show affected rule(s)
 * - Show resulting evaluation change
 * - Original failures must remain visible
 */
export function OverridesInEffectSection({
  overrides,
}: OverridesInEffectSectionProps): JSX.Element {
  return (
    <section style={sectionStyles.section} aria-labelledby="overrides-heading">
      <h2 id="overrides-heading" style={sectionStyles.heading}>
        Overrides in Effect
      </h2>
      <p style={sectionStyles.microcopy}>
        Overrides change rule evaluation. They do not remove rules.
      </p>
      {overrides.length === 0 ? (
        <p style={sectionStyles.emptyState}>No overrides applied.</p>
      ) : (
        <ul style={sectionStyles.list}>
          {overrides.map((override, index) => (
            <li key={`${override.overrideId}-${index}`} style={sectionStyles.listItem}>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Override ID:</span>
                <span style={sectionStyles.fieldValue}>{override.overrideId}</span>
              </div>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Scope:</span>
                <span style={sectionStyles.fieldValue}>{override.scope}</span>
              </div>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Affected Report:</span>
                <span style={sectionStyles.fieldValue}>
                  {override.originalReport.invocationId}
                </span>
              </div>
              {/* Original failure remains visible */}
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Original Outcome:</span>
                <span style={sectionStyles.fieldValue}>
                  {override.originalReport.outcome}
                </span>
              </div>
              {/* Resulting evaluation change */}
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>New Outcome:</span>
                <span style={sectionStyles.fieldValue}>
                  {override.overriddenOutcome.newOutcome}
                </span>
              </div>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Engine-reported:</span>
                <span style={sectionStyles.fieldValue}>{override.reason}</span>
              </div>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Issued By:</span>
                <span style={sectionStyles.fieldValue}>{override.issuedBy}</span>
              </div>
              <div style={sectionStyles.fieldRow}>
                <span style={sectionStyles.fieldLabel}>Issued At:</span>
                <span style={sectionStyles.fieldValue}>
                  {new Date(override.issuedAt).toISOString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ============================================================================
// Main Component: GmResultsView
// ============================================================================

/**
 * GmResultsView
 *
 * Replaces raw JSON / flat rule output with a GM-facing "Results View" UI that:
 * - Reframes existing engine outputs into plain-language sections
 * - Preserves every rule result exactly as emitted
 * - Makes no attempt to decide, summarize, or recommend
 * - Is optimized for fast scanning under pressure
 *
 * REQUIRED UI STRUCTURE (EXACT ORDER, NO DEFAULT COLLAPSING):
 * 1. Evaluation Context
 * 2. Rule Results
 * 3. Conflicts Detected
 * 4. Costs (If Applied)
 * 5. Effects (If Applied)
 * 6. Overrides in Effect
 */
export function GmResultsView({
  context,
  report,
  effects,
  overrides,
}: GmResultsViewProps): JSX.Element {
  return (
    <div style={sectionStyles.container} role="region" aria-label="GM Results View">
      {/* Section 1: Evaluation Context */}
      <EvaluationContextSection context={context} />

      {/* Section 2: Rule Results */}
      <RuleResultsSection ruleResults={report.ruleResults} />

      {/* Section 3: Conflicts Detected */}
      <ConflictsDetectedSection conflicts={report.allConflicts} />

      {/* Section 4: Costs (If Applied) */}
      <CostsSection costs={report.costResults} />

      {/* Section 5: Effects (If Applied) */}
      <EffectsSection effects={effects} />

      {/* Section 6: Overrides in Effect */}
      <OverridesInEffectSection overrides={overrides} />
    </div>
  );
}
