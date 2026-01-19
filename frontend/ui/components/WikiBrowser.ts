/**
 * Wiki Browser Component (PR 5.1)
 *
 * CRITICAL INVARIANT: Reference ≠ authority.
 *
 * This component displays read-only wiki content for reference.
 * It has NO authority and CANNOT affect system behavior.
 *
 * KILL CRITERIA (any violation fails PR 5.1):
 * - Wiki content influences validation results
 * - Wiki content is parsed or interpreted for logic
 * - Wiki content generates derived conclusions
 * - Wiki content is used to auto-resolve ambiguity
 * - Wiki content feeds into rules logic
 * - Wiki content becomes executable
 * - Wiki content gains precedence over GM judgment
 *
 * The wiki is a book on the table, not a judge.
 */

import type {
  WikiEntry,
  WikiEntryId,
  WikiCategory,
  WikiIndex,
} from '../../../src/wiki/ts/types';

// ============================================================================
// BROWSER STATE (UI-ONLY, NON-AUTHORITATIVE)
// ============================================================================

/**
 * WikiBrowserState - state of the wiki browser panel
 *
 * This state is UI-ONLY. It has no authority and is not persisted.
 * The browser being open or closed does not affect system behavior.
 */
export type WikiBrowserState = {
  /** Is the browser visible? (Default: false - users opt-in) */
  readonly isVisible: boolean;

  /** Current search query (empty = browse mode) */
  readonly searchQuery: string;

  /** Currently selected category filter (null = all) */
  readonly categoryFilter: WikiCategory | null;

  /** Currently selected entry (for detail view) */
  readonly selectedEntryId: WikiEntryId | null;

  /** Search results (empty if not searching) */
  readonly searchResults: readonly WikiEntry[];

  /** Is search in progress? */
  readonly isSearching: boolean;
};

/**
 * Initial state - browser is HIDDEN by default
 *
 * CRITICAL: The default state MUST be hidden.
 * Wiki browsing is opt-in only.
 */
export const INITIAL_WIKI_BROWSER_STATE: WikiBrowserState = {
  isVisible: false,
  searchQuery: '',
  categoryFilter: null,
  selectedEntryId: null,
  searchResults: [],
  isSearching: false,
};

// ============================================================================
// STATE TRANSITIONS (PURE FUNCTIONS, NO SIDE EFFECTS)
// ============================================================================

/**
 * Open the wiki browser
 */
export function openBrowser(state: WikiBrowserState): WikiBrowserState {
  return {
    ...state,
    isVisible: true,
  };
}

/**
 * Close the wiki browser
 */
export function closeBrowser(state: WikiBrowserState): WikiBrowserState {
  return {
    ...state,
    isVisible: false,
  };
}

/**
 * Toggle the wiki browser visibility
 */
export function toggleBrowser(state: WikiBrowserState): WikiBrowserState {
  return {
    ...state,
    isVisible: !state.isVisible,
  };
}

/**
 * Set search query
 */
export function setSearchQuery(
  state: WikiBrowserState,
  query: string
): WikiBrowserState {
  return {
    ...state,
    searchQuery: query,
    isSearching: query.length > 0,
  };
}

/**
 * Set category filter
 */
export function setCategoryFilter(
  state: WikiBrowserState,
  category: WikiCategory | null
): WikiBrowserState {
  return {
    ...state,
    categoryFilter: category,
  };
}

/**
 * Select an entry for detail view
 */
export function selectEntry(
  state: WikiBrowserState,
  entryId: WikiEntryId | null
): WikiBrowserState {
  return {
    ...state,
    selectedEntryId: entryId,
  };
}

/**
 * Set search results
 */
export function setSearchResults(
  state: WikiBrowserState,
  results: readonly WikiEntry[]
): WikiBrowserState {
  return {
    ...state,
    searchResults: results,
    isSearching: false,
  };
}

/**
 * Clear search
 */
export function clearSearch(state: WikiBrowserState): WikiBrowserState {
  return {
    ...state,
    searchQuery: '',
    searchResults: [],
    isSearching: false,
  };
}

// ============================================================================
// RENDER HELPERS (PURE FUNCTIONS, TEXT OUTPUT ONLY)
// ============================================================================

/**
 * Browser header text - clearly labeled as reference
 */
export const BROWSER_HEADER = 'Wiki / Reference (Read-Only)';

/**
 * Browser disclaimer - emphasizes non-authority
 */
export const BROWSER_DISCLAIMER =
  'This is reference material only. Wiki content has NO authority over game state. ' +
  'The GM and rules engine are the sole authorities.';

/**
 * Escape HTML to prevent XSS
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render the wiki browser to HTML string (for display)
 *
 * CRITICAL: This is READ-ONLY HTML.
 * - No interactive elements that affect game state
 * - Search/filter are navigation only
 * - Pure text display only
 *
 * @param state - Current browser state
 * @param wikiIndex - The wiki index for lookups
 * @returns HTML string for display (read-only)
 */
export function renderBrowserHTML(
  state: WikiBrowserState,
  wikiIndex: WikiIndex
): string {
  if (!state.isVisible) {
    return ''; // Hidden browser renders nothing
  }

  const lines: string[] = [];

  // Panel container with reference styling
  lines.push('<aside class="wiki-browser" aria-label="Wiki Reference"');
  lines.push('  role="complementary"');
  lines.push('  data-authority="none"');
  lines.push('  style="opacity: 0.9; border-left: 3px solid #666; padding-left: 1em;">');

  // Header with clear reference label
  lines.push('  <header style="font-size: 1em; color: #444;">');
  lines.push(`    <strong>${escapeHTML(BROWSER_HEADER)}</strong>`);
  lines.push('  </header>');

  // Disclaimer
  lines.push('  <p style="font-size: 0.75em; color: #888; font-style: italic;">');
  lines.push(`    ${escapeHTML(BROWSER_DISCLAIMER)}`);
  lines.push('  </p>');

  // Search display (read-only, shows current query)
  if (state.searchQuery) {
    lines.push('  <div class="wiki-search-status" style="margin: 1em 0;">');
    lines.push(`    <span style="color: #666;">Searching for: "${escapeHTML(state.searchQuery)}"</span>`);
    lines.push('  </div>');
  }

  // Category filter display (read-only)
  if (state.categoryFilter) {
    lines.push('  <div class="wiki-filter-status" style="margin: 0.5em 0;">');
    lines.push(`    <span style="color: #666;">Filtered by: ${escapeHTML(state.categoryFilter)}</span>`);
    lines.push('  </div>');
  }

  // Content area
  lines.push('  <div class="wiki-content">');

  // If an entry is selected, show detail view
  if (state.selectedEntryId) {
    const entry = wikiIndex.getEntry(state.selectedEntryId);
    if (entry) {
      lines.push(renderEntryDetail(entry));
    } else {
      lines.push('    <p style="color: #888;">Entry not found.</p>');
    }
  }
  // If searching, show results
  else if (state.searchResults.length > 0) {
    lines.push('    <div class="wiki-search-results">');
    lines.push(`      <p style="color: #666;">${state.searchResults.length} result(s) found:</p>`);
    lines.push('      <ul style="list-style: none; padding: 0;">');
    for (const entry of state.searchResults) {
      lines.push(renderEntryListItem(entry));
    }
    lines.push('      </ul>');
    lines.push('    </div>');
  }
  // Otherwise, show category browse
  else if (state.categoryFilter) {
    const entries = wikiIndex.getByCategory(state.categoryFilter);
    if (entries.length > 0) {
      lines.push('    <ul style="list-style: none; padding: 0;">');
      for (const entry of entries) {
        lines.push(renderEntryListItem(entry));
      }
      lines.push('    </ul>');
    } else {
      lines.push('    <p style="color: #888;">No entries in this category.</p>');
    }
  }
  // Default: show all categories
  else {
    lines.push('    <p style="color: #666;">Select a category or search to browse.</p>');
    lines.push('    <div class="wiki-categories" style="margin-top: 1em;">');
    const categories: WikiCategory[] = [
      'RULES',
      'LORE',
      'CHARACTER',
      'EQUIPMENT',
      'SETTING',
      'GLOSSARY',
    ];
    for (const cat of categories) {
      const count = wikiIndex.getByCategory(cat).length;
      lines.push(`      <div style="margin: 0.5em 0; color: #444;">${escapeHTML(cat)} (${count})</div>`);
    }
    lines.push('    </div>');
  }

  lines.push('  </div>');

  // Footer
  lines.push('  <footer style="font-size: 0.7em; color: #aaa; margin-top: 1em;">');
  lines.push('    Reference material only. Does not affect gameplay.');
  lines.push('  </footer>');

  lines.push('</aside>');

  return lines.join('\n');
}

/**
 * Render a single entry in list view
 */
function renderEntryListItem(entry: WikiEntry): string {
  const lines: string[] = [];
  lines.push(`        <li style="margin: 0.5em 0; padding: 0.5em; border-bottom: 1px solid #eee;">`);
  lines.push(`          <strong style="color: #333;">${escapeHTML(entry.title)}</strong>`);
  lines.push(`          <span style="color: #888; font-size: 0.8em;"> [${escapeHTML(entry.category)}]</span>`);
  if (entry.tags && entry.tags.length > 0) {
    lines.push(`          <div style="color: #aaa; font-size: 0.75em;">${entry.tags.map(t => escapeHTML(t)).join(', ')}</div>`);
  }
  lines.push('        </li>');
  return lines.join('\n');
}

/**
 * Render an entry in detail view
 */
function renderEntryDetail(entry: WikiEntry): string {
  const lines: string[] = [];
  lines.push('    <article class="wiki-entry-detail" style="padding: 1em;">');
  lines.push(`      <h2 style="color: #333; margin-bottom: 0.5em;">${escapeHTML(entry.title)}</h2>`);
  lines.push(`      <p style="color: #888; font-size: 0.8em;">Category: ${escapeHTML(entry.category)}</p>`);
  if (entry.source) {
    lines.push(`      <p style="color: #888; font-size: 0.8em;">Source: ${escapeHTML(entry.source)}</p>`);
  }
  if (entry.tags && entry.tags.length > 0) {
    lines.push(`      <p style="color: #aaa; font-size: 0.75em;">Tags: ${entry.tags.map(t => escapeHTML(t)).join(', ')}</p>`);
  }
  lines.push('      <hr style="border: none; border-top: 1px solid #ddd; margin: 1em 0;">');
  lines.push(`      <div class="wiki-entry-body" style="white-space: pre-wrap; color: #333;">`);
  lines.push(`        ${escapeHTML(entry.body)}`);
  lines.push('      </div>');
  lines.push('    </article>');
  return lines.join('\n');
}

// ============================================================================
// VALIDATION (ENSURES BROWSER STAYS READ-ONLY)
// ============================================================================

/**
 * Validate that browser state has no authority indicators
 *
 * This function can be used by tests to verify the browser
 * has not accidentally gained authority.
 */
export function validateNoAuthority(state: WikiBrowserState): boolean {
  // Browser state should have no fields that could indicate authority
  const stateKeys = Object.keys(state);
  const forbiddenKeys = [
    'effectsToApply',
    'overrideRequest',
    'validationOverride',
    'intentModification',
    'pendingAction',
    'actionQueue',
    'ruleBinding',
    'authorityLevel',
  ];

  for (const key of stateKeys) {
    if (forbiddenKeys.includes(key)) {
      return false;
    }
  }

  return true;
}
