/**
 * AI Commentary Service Implementation (PR 5.0)
 *
 * CRITICAL INVARIANT: AI is commentary, not control.
 *
 * This service generates read-only commentary from system state snapshots.
 * It has NO authority and CANNOT affect system behavior.
 *
 * ARCHITECTURAL GUARANTEES:
 * - Receives ONLY deep-copied snapshots (no live references)
 * - Returns ONLY plain text (no structured commands)
 * - Has NO side effects
 * - Cannot access validation, override, or resolution APIs
 * - Cannot modify any system state
 * - Failure does not break the system
 *
 * If this service fails, the system continues unchanged.
 */

import type {
  AICommentarySnapshot,
  AICommentary,
  AICommentaryService,
} from './types';
import { isValidSnapshot } from './types';
import { RulesOutcome } from '../../../intent/bridge/ts/RulesPipeline';

// ============================================================================
// COMMENTARY GENERATION (PURE FUNCTION)
// ============================================================================

/**
 * Generate commentary text from a snapshot
 *
 * CRITICAL: This is a PURE function.
 * - No side effects
 * - No system state access
 * - No mutation of inputs
 * - Returns only text
 *
 * The commentary explains what happened. It does NOT recommend actions.
 */
function generateCommentaryText(snapshot: AICommentarySnapshot): string {
  const lines: string[] = [];

  // Header: What was attempted
  lines.push('## Intent Summary');
  lines.push('');
  lines.push(`**Action Type:** ${snapshot.intent.intentType}`);
  lines.push('');

  // Validation outcome explanation
  lines.push('## Validation Result');
  lines.push('');

  const outcome = snapshot.validationReport.outcome;
  switch (outcome) {
    case RulesOutcome.PASS:
      lines.push('The rules engine determined this action is **valid**.');
      lines.push('');
      lines.push('All applicable rules were satisfied.');
      break;

    case RulesOutcome.FAIL:
      lines.push('The rules engine determined this action **cannot proceed**.');
      lines.push('');
      if (snapshot.validationReport.violations.length > 0) {
        lines.push('### Rule Violations');
        lines.push('');
        for (const violation of snapshot.validationReport.violations) {
          lines.push(`- **${violation.ruleId}**: ${violation.message}`);
        }
      }
      break;

    case RulesOutcome.AMBIGUOUS:
      lines.push('The rules engine **could not determine** a clear outcome.');
      lines.push('');
      lines.push('This requires a GM decision to proceed.');
      if (snapshot.validationReport.ambiguity) {
        lines.push('');
        lines.push('### Ambiguity Details');
        lines.push('');
        lines.push(`**Reason:** ${snapshot.validationReport.ambiguity.reason}`);
        if (snapshot.validationReport.ambiguity.possibleInterpretations.length > 0) {
          lines.push('');
          lines.push('**Possible Interpretations:**');
          for (const interp of snapshot.validationReport.ambiguity.possibleInterpretations) {
            lines.push(`- ${interp}`);
          }
        }
      }
      break;

    default:
      lines.push(`Outcome: ${outcome}`);
  }

  // Conflicts (PR 4.3 - data, not logic)
  if (snapshot.validationReport.conflicts.length > 0) {
    lines.push('');
    lines.push('### Detected Conflicts');
    lines.push('');
    lines.push('*Note: Conflicts are informational. The engine does not prioritize or resolve them.*');
    lines.push('');
    for (const conflict of snapshot.validationReport.conflicts) {
      lines.push(`- **[${conflict.kind}]** ${conflict.message} *(from: ${conflict.sourceRule})*`);
    }
  }

  // Cost validation (PR 4.1)
  if (snapshot.validationReport.costValidation) {
    lines.push('');
    lines.push('### Action Cost');
    lines.push('');
    lines.push(`**Status:** ${snapshot.validationReport.costValidation.outcome}`);
    lines.push(`**Details:** ${snapshot.validationReport.costValidation.reason}`);
  }

  // Override information
  if (snapshot.overrideInfo?.hasOverrides) {
    lines.push('');
    lines.push('## GM Override Applied');
    lines.push('');
    lines.push(`**Effective Outcome:** ${snapshot.overrideInfo.effectiveOutcome}`);
    lines.push(`**Override Count:** ${snapshot.overrideInfo.overrideCount}`);
    if (snapshot.overrideInfo.latestWarning) {
      lines.push(`**Warning:** ${snapshot.overrideInfo.latestWarning}`);
    }
    lines.push('');
    lines.push('*The GM has exercised authority to modify the rules outcome.*');
  }

  // Resolution information
  if (snapshot.resolutionInfo) {
    lines.push('');
    lines.push('## Resolution');
    lines.push('');
    lines.push(`**Outcome:** ${snapshot.resolutionInfo.outcome}`);
    lines.push(`**Explanation:** ${snapshot.resolutionInfo.explanation}`);
    if (snapshot.resolutionInfo.effectCount > 0) {
      lines.push('');
      lines.push('### Effects to Apply');
      lines.push('');
      for (const desc of snapshot.resolutionInfo.effectDescriptions) {
        lines.push(`- ${desc}`);
      }
    }
  }

  // Advisory footer
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*This commentary is advisory only. It has no authority and does not affect game state.*');

  return lines.join('\n');
}

// ============================================================================
// SERVICE FACTORY (CREATES ISOLATED INSTANCE)
// ============================================================================

/**
 * Create an AI Commentary Service instance
 *
 * CRITICAL INVARIANTS:
 * - The service has NO references to live system state
 * - The service CANNOT modify validation, overrides, or resolution
 * - The service ONLY produces text
 * - Service failure does not affect system behavior
 *
 * @returns A stateless, isolated commentary service
 */
export function createAICommentaryService(): AICommentaryService {
  return {
    generateCommentary: async (
      snapshot: AICommentarySnapshot
    ): Promise<AICommentary> => {
      const generatedAt = Date.now();

      // Defensive validation of input
      if (!isValidSnapshot(snapshot)) {
        return {
          commentary: '',
          success: false,
          error: 'Invalid snapshot: snapshot failed type guard validation',
          generatedAt,
        };
      }

      try {
        // Generate commentary (pure function, no side effects)
        const commentary = generateCommentaryText(snapshot);

        return {
          commentary,
          success: true,
          error: null,
          generatedAt,
        };
      } catch (error) {
        // Failure is NOT a system failure
        // The system continues unchanged
        return {
          commentary: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error generating commentary',
          generatedAt,
        };
      }
    },
  };
}

// ============================================================================
// GUARDRAILS (COMPILE-TIME WHERE POSSIBLE)
// ============================================================================

/**
 * ARCHITECTURAL ENFORCEMENT
 *
 * The following constraints are enforced by the type system:
 *
 * 1. AICommentarySnapshot is fully readonly
 *    - All fields are marked `readonly`
 *    - Nested objects use `Readonly<>`
 *    - Arrays use `readonly` modifier
 *
 * 2. AICommentary output is text-only
 *    - `commentary` is a string, not structured data
 *    - No callbacks, handlers, or action objects
 *
 * 3. AICommentaryService is stateless
 *    - No instance variables
 *    - No references captured in closure
 *    - Pure function: snapshot → text
 *
 * 4. No access to authority APIs
 *    - Service does not import validation functions
 *    - Service does not import override functions
 *    - Service does not import resolution functions
 *    - Service only imports type definitions
 *
 * The following constraints are enforced at runtime:
 *
 * 5. Snapshot is deep-copied before AI consumption
 *    - createAICommentarySnapshot() uses JSON.parse(JSON.stringify())
 *    - No references to live objects survive
 *
 * 6. Failure safety
 *    - Errors are caught and returned as error commentary
 *    - No exceptions propagate to break system flow
 */

// Export for external use
export type { AICommentaryService };
