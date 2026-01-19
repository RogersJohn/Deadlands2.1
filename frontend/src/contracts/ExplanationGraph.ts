/**
 * ExplanationGraph DTO Contracts (FE-PR 0.1)
 *
 * CRITICAL: These types mirror backend DTOs EXACTLY.
 * - No derived fields
 * - No convenience helpers
 * - No interpretation
 * - Frontend is CONSUMER ONLY
 *
 * The explanation graph traces how a decision was reached.
 * This is for audit/debugging purposes.
 */

import type { RulesOutcome } from './ValidationReport';
import type { ResolutionOutcome } from './Effect';

/**
 * ExplanationNode - a node in the explanation graph
 */
export type ExplanationNode =
  | {
      readonly kind: 'intent';
      readonly intentId: string;
      readonly intentType: string;
      readonly timestamp: number;
    }
  | {
      readonly kind: 'validation';
      readonly invocationId: string;
      readonly rulesetId: string;
      readonly outcome: RulesOutcome;
    }
  | {
      readonly kind: 'override';
      readonly overrideId: string;
      readonly originalOutcome: RulesOutcome;
      readonly newOutcome: RulesOutcome;
      readonly reason: string;
    }
  | {
      readonly kind: 'resolution';
      readonly outcome: ResolutionOutcome;
      readonly effectCount: number;
    };

/**
 * ExplanationEdge - connection between nodes
 */
export type ExplanationEdge = {
  readonly from: string;
  readonly to: string;
  readonly label: string;
};

/**
 * ExplanationGraph - full trace of a decision
 */
export type ExplanationGraph = {
  readonly rootIntentId: string;
  readonly nodes: readonly ExplanationNode[];
  readonly edges: readonly ExplanationEdge[];
  readonly finalOutcome: RulesOutcome;
  readonly hasOverrides: boolean;
};
