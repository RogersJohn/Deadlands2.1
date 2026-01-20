/**
 * AssumptionTracker - Tracks all assumptions made during processing
 *
 * Every time information is inferred rather than explicitly stated,
 * an assumption MUST be recorded. This is mandatory behavior.
 */

import type { Assumption, AssumptionCategory, AssumptionConfidence } from '../types';
import { createAssumption } from '../types';

/**
 * Tracks assumptions during assistant processing
 */
export class AssumptionTracker {
  private readonly assumptions: Assumption[] = [];

  /**
   * Record an assumption
   */
  assume(
    statement: string,
    confidence: AssumptionConfidence,
    category: AssumptionCategory,
    reason: string
  ): void {
    this.assumptions.push(createAssumption(statement, confidence, category, reason));
  }

  /**
   * Record a high-confidence assumption (clear from context)
   */
  assumeHigh(statement: string, category: AssumptionCategory, reason: string): void {
    this.assume(statement, 'high', category, reason);
  }

  /**
   * Record a medium-confidence assumption (reasonable default)
   */
  assumeMedium(statement: string, category: AssumptionCategory, reason: string): void {
    this.assume(statement, 'medium', category, reason);
  }

  /**
   * Record a low-confidence assumption (could easily be wrong)
   */
  assumeLow(statement: string, category: AssumptionCategory, reason: string): void {
    this.assume(statement, 'low', category, reason);
  }

  /**
   * Get all recorded assumptions
   */
  getAssumptions(): readonly Assumption[] {
    return [...this.assumptions];
  }

  /**
   * Get assumptions by category
   */
  getByCategory(category: AssumptionCategory): readonly Assumption[] {
    return this.assumptions.filter((a) => a.category === category);
  }

  /**
   * Get assumptions by confidence level
   */
  getByConfidence(confidence: AssumptionConfidence): readonly Assumption[] {
    return this.assumptions.filter((a) => a.confidence === confidence);
  }

  /**
   * Check if any assumptions were made
   */
  hasAssumptions(): boolean {
    return this.assumptions.length > 0;
  }

  /**
   * Count of assumptions
   */
  count(): number {
    return this.assumptions.length;
  }

  /**
   * Clear all assumptions (for reuse)
   */
  clear(): void {
    this.assumptions.length = 0;
  }
}
