/**
 * Conflict DTO Contracts (FE-PR 0.1)
 *
 * CRITICAL: These types mirror backend DTOs EXACTLY.
 * - No derived fields
 * - No convenience helpers
 * - No interpretation
 * - Frontend is CONSUMER ONLY
 *
 * Re-exports from ValidationReport for standalone use.
 */

export type { ConflictKind, Conflict } from './ValidationReport';
