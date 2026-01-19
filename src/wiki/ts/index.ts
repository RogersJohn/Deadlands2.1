/**
 * Wiki Module Exports (PR 5.1)
 *
 * CRITICAL INVARIANT: Reference ≠ authority.
 *
 * This module exports read-only reference material types and utilities.
 * Nothing exported here has authority over game state.
 */

// Types
export type {
  WikiEntryId,
  WikiCategory,
  WikiEntry,
  WikiCitation,
  WikiIndex,
} from './types';

// Factory functions
export {
  createWikiEntryId,
  createWikiCitation,
} from './types';

// Type guards
export {
  isWikiEntry,
  isWikiCitation,
} from './types';

// Index implementation
export {
  createWikiIndex,
  EMPTY_WIKI_INDEX,
  validateIndexIsReadOnly,
  validateEntryIsInert,
} from './WikiIndex';
