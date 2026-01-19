/**
 * Wiki Index Implementation (PR 5.1)
 *
 * CRITICAL INVARIANT: Reference ≠ authority.
 *
 * This is a read-only, in-memory index for wiki entries.
 * It provides lookup functionality only - NO logic, NO inference.
 *
 * KILL CRITERIA (any violation fails PR 5.1):
 * - Index modifies entries after creation
 * - Index performs semantic analysis on content
 * - Index influences validation or resolution
 * - Index has side effects beyond returning data
 *
 * The index is a phone book, not a decision maker.
 */

import type { WikiEntry, WikiEntryId, WikiCategory, WikiIndex } from './types';
import { createWikiEntryId } from './types';

// ============================================================================
// WIKI INDEX IMPLEMENTATION (IMMUTABLE, READ-ONLY)
// ============================================================================

/**
 * Create a WikiIndex from a collection of entries
 *
 * CRITICAL: The index is IMMUTABLE after creation.
 * - Entries are stored as-is (no transformation)
 * - All lookups are read-only
 * - No mutations are possible after construction
 *
 * @param entries - The wiki entries to index
 * @returns A read-only WikiIndex
 */
export function createWikiIndex(entries: readonly WikiEntry[]): WikiIndex {
  // Create lookup maps (frozen after construction)
  const byId = new Map<string, WikiEntry>();
  const byCategory = new Map<WikiCategory, WikiEntry[]>();
  const byTag = new Map<string, WikiEntry[]>();

  // Deep-copy helper to ensure immutability
  function deepCopyEntry(entry: WikiEntry): WikiEntry {
    return JSON.parse(JSON.stringify(entry)) as WikiEntry;
  }

  // Index all entries (one-time operation)
  for (const entry of entries) {
    // Deep copy to prevent external mutation
    const frozenEntry = Object.freeze(deepCopyEntry(entry));

    // By ID
    byId.set(frozenEntry.id, frozenEntry);

    // By category
    const categoryList = byCategory.get(frozenEntry.category) ?? [];
    categoryList.push(frozenEntry);
    byCategory.set(frozenEntry.category, categoryList);

    // By tags
    if (frozenEntry.tags) {
      for (const tag of frozenEntry.tags) {
        const tagList = byTag.get(tag) ?? [];
        tagList.push(frozenEntry);
        byTag.set(tag, tagList);
      }
    }
  }

  // Return frozen, read-only interface
  return {
    getEntry: (id: WikiEntryId): WikiEntry | undefined => {
      return byId.get(id);
    },

    search: (query: string): readonly WikiEntry[] => {
      // Simple text search (case-insensitive)
      // CRITICAL: This is for navigation, not rule matching
      const lowerQuery = query.toLowerCase();
      const results: WikiEntry[] = [];

      for (const entry of byId.values()) {
        if (
          entry.title.toLowerCase().includes(lowerQuery) ||
          entry.body.toLowerCase().includes(lowerQuery)
        ) {
          results.push(entry);
        }
      }

      return results;
    },

    getByCategory: (category: WikiCategory): readonly WikiEntry[] => {
      return byCategory.get(category) ?? [];
    },

    getByTag: (tag: string): readonly WikiEntry[] => {
      return byTag.get(tag) ?? [];
    },

    getAllIds: (): readonly WikiEntryId[] => {
      return Array.from(byId.keys()).map(id => createWikiEntryId(id));
    },
  };
}

// ============================================================================
// EMPTY INDEX (FOR TESTING AND DEFAULT STATE)
// ============================================================================

/**
 * An empty WikiIndex
 *
 * CRITICAL: System behavior is IDENTICAL with or without wiki.
 * An empty index is perfectly valid.
 */
export const EMPTY_WIKI_INDEX: WikiIndex = createWikiIndex([]);

// ============================================================================
// VALIDATION HELPERS (ENSURE INDEX STAYS READ-ONLY)
// ============================================================================

/**
 * Validate that a WikiIndex implementation is truly read-only
 *
 * This is used by tests to verify the index has no authority.
 */
export function validateIndexIsReadOnly(index: WikiIndex): boolean {
  // Index should only have the allowed read-only methods
  const allowedMethods = ['getEntry', 'search', 'getByCategory', 'getByTag', 'getAllIds'];

  for (const key of Object.keys(index)) {
    if (!allowedMethods.includes(key)) {
      return false;
    }
  }

  // Index should have no state-modifying methods
  const forbiddenMethods = ['add', 'remove', 'update', 'delete', 'set', 'clear', 'modify'];
  for (const method of forbiddenMethods) {
    if (method in index) {
      return false;
    }
  }

  return true;
}

/**
 * Validate that an entry has no executable content
 *
 * Wiki entries are prose, not code.
 */
export function validateEntryIsInert(entry: WikiEntry): boolean {
  // Entry should have no function fields
  for (const value of Object.values(entry)) {
    if (typeof value === 'function') {
      return false;
    }
  }

  // Entry should have no prototype methods beyond Object
  const proto = Object.getPrototypeOf(entry);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }

  return true;
}
