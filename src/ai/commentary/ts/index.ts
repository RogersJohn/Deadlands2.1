/**
 * AI Commentary Module (PR 5.0)
 *
 * CRITICAL INVARIANT: AI is commentary, not control.
 *
 * This module provides read-only AI commentary on validation results.
 * The AI has NO authority and CANNOT affect system behavior.
 *
 * WHAT THIS MODULE DOES:
 * - Receives immutable snapshots of system state
 * - Produces plain text explanations
 * - Explains what happened and why
 *
 * WHAT THIS MODULE DOES NOT DO:
 * - Modify intents, validation, overrides, or resolution
 * - Produce structured commands or recommendations
 * - Affect system behavior in any way
 * - Persist any authoritative state
 *
 * If this module is removed, system behavior is UNCHANGED.
 */

// Types
export type {
  AICommentarySnapshot,
  AICommentary,
  AICommentaryService,
} from './types';

// Factory functions
export { createAICommentarySnapshot, isValidSnapshot, isValidCommentary } from './types';

// Service
export { createAICommentaryService } from './AICommentaryService';
