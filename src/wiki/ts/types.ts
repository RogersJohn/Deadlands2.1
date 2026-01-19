/**
 * Wiki / Reference Types (PR 5.1)
 *
 * CRITICAL INVARIANT: Reference ≠ authority.
 *
 * This module defines types for read-only reference material.
 * Wiki content is a book on the table, not a judge.
 *
 * KILL CRITERIA (any violation fails PR 5.1):
 * - Wiki content influences validation results
 * - Wiki content is parsed or interpreted
 * - Wiki content generates derived conclusions
 * - Wiki content is used to auto-resolve ambiguity
 * - Wiki content feeds into rules logic
 * - Wiki content becomes executable
 * - Wiki content gains precedence over GM judgment
 *
 * Wiki data must remain read-only, inert, and optional.
 */

// ============================================================================
// WIKI ENTRY TYPES (STATIC DATA ONLY)
// ============================================================================

/**
 * WikiEntryId - opaque identifier for wiki entries
 *
 * Branded to prevent interchange with other IDs.
 */
declare const WIKI_ENTRY_ID_BRAND: unique symbol;
export type WikiEntryId = string & { readonly [WIKI_ENTRY_ID_BRAND]: never };

/**
 * WikiCategory - broad categorization of wiki content
 *
 * These are descriptive labels, not logic drivers.
 * The system does NOT behave differently based on category.
 */
export type WikiCategory =
  | 'RULES'           // Game mechanics text
  | 'LORE'            // Setting background
  | 'CHARACTER'       // Character creation/options
  | 'EQUIPMENT'       // Items, weapons, gear
  | 'SETTING'         // World information
  | 'GLOSSARY';       // Term definitions

/**
 * WikiEntry - a single reference entry
 *
 * CRITICAL: This is STATIC DATA only.
 * - No logic
 * - No computed fields
 * - No semantic interpretation
 * - No executable content
 *
 * The entry is read-only reference material.
 * It describes rules; it does not enforce them.
 */
export type WikiEntry = {
  /** Stable, unique identifier */
  readonly id: WikiEntryId;

  /** Human-readable title */
  readonly title: string;

  /**
   * Body content (raw text or markdown)
   *
   * CRITICAL: This is prose, not code.
   * - No parsing into logic
   * - No extraction of rules
   * - No semantic analysis
   *
   * The body is displayed as-is.
   */
  readonly body: string;

  /** Broad category (descriptive only) */
  readonly category: WikiCategory;

  /**
   * Optional tags for search/filtering
   *
   * Tags are for human navigation, not rule matching.
   */
  readonly tags?: readonly string[];

  /**
   * Optional citations to other entries
   *
   * Cross-references are navigational, not logical.
   */
  readonly relatedEntries?: readonly WikiEntryId[];

  /**
   * Optional source attribution
   *
   * Where this content came from (book, page, etc.)
   */
  readonly source?: string;
};

// ============================================================================
// WIKI CITATION TYPES (METADATA ONLY)
// ============================================================================

/**
 * WikiCitation - a reference from validation to wiki
 *
 * CRITICAL INVARIANTS:
 * - Citations are DESCRIPTIVE, not prescriptive
 * - Citations do NOT affect outcomes
 * - Absence of citations is valid
 * - Removing citations does not change behavior
 *
 * A citation says "see also", not "because of".
 */
export type WikiCitation = {
  /** The wiki entry being referenced */
  readonly entryId: WikiEntryId;

  /**
   * Human-readable reason for citation
   *
   * This explains WHY this entry is relevant for reading.
   * It does NOT explain WHY the outcome is what it is.
   *
   * Good: "See reloading rules in the core rulebook"
   * Bad: "This rule caused the validation to fail"
   */
  readonly reason: string;

  /**
   * Optional specific section within the entry
   *
   * For navigation convenience, not logic targeting.
   */
  readonly section?: string;
};

// ============================================================================
// WIKI INDEX TYPES (READ-ONLY LOOKUP)
// ============================================================================

/**
 * WikiIndex - read-only index of all wiki entries
 *
 * CRITICAL: This is a LOOKUP structure only.
 * - No logic
 * - No rule evaluation
 * - No inference
 *
 * The index enables reading, not deciding.
 */
export type WikiIndex = {
  /**
   * Get an entry by ID
   *
   * Returns undefined if not found.
   * Does NOT throw, does NOT affect system behavior.
   */
  readonly getEntry: (id: WikiEntryId) => WikiEntry | undefined;

  /**
   * Search entries by text
   *
   * Returns matching entries for display.
   * Does NOT affect validation or resolution.
   */
  readonly search: (query: string) => readonly WikiEntry[];

  /**
   * Get entries by category
   *
   * For browsing, not for rule selection.
   */
  readonly getByCategory: (category: WikiCategory) => readonly WikiEntry[];

  /**
   * Get entries by tag
   *
   * For filtering, not for logic.
   */
  readonly getByTag: (tag: string) => readonly WikiEntry[];

  /**
   * Get all entry IDs
   *
   * For enumeration, not for processing.
   */
  readonly getAllIds: () => readonly WikiEntryId[];
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a WikiEntryId from a string
 *
 * Convention: wiki entries have stable, human-readable IDs.
 */
export function createWikiEntryId(id: string): WikiEntryId {
  return id as WikiEntryId;
}

/**
 * Create a WikiCitation
 *
 * CRITICAL: Citations are descriptive metadata.
 * They do NOT affect system behavior.
 */
export function createWikiCitation(
  entryId: WikiEntryId,
  reason: string,
  section?: string
): WikiCitation {
  return {
    entryId,
    reason,
    ...(section !== undefined && { section }),
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for WikiEntry
 */
export function isWikiEntry(obj: unknown): obj is WikiEntry {
  if (typeof obj !== 'object' || obj === null) return false;
  const entry = obj as WikiEntry;

  return (
    typeof entry.id === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.body === 'string' &&
    typeof entry.category === 'string'
  );
}

/**
 * Type guard for WikiCitation
 */
export function isWikiCitation(obj: unknown): obj is WikiCitation {
  if (typeof obj !== 'object' || obj === null) return false;
  const citation = obj as WikiCitation;

  return (
    typeof citation.entryId === 'string' &&
    typeof citation.reason === 'string'
  );
}
