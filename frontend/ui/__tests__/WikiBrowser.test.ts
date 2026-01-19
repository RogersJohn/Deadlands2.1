/**
 * Wiki Browser Tests (PR 5.1)
 *
 * These tests verify the wiki browser UI has NO authority and is
 * purely for reference browsing.
 *
 * KILL CRITERIA TO VERIFY:
 * - Browser is hidden by default
 * - Browser contains no interactive elements that affect game state
 * - Browser is clearly labeled as reference
 * - Browser has no authority indicators
 */

import { describe, it, expect } from 'vitest';
import {
  INITIAL_WIKI_BROWSER_STATE,
  BROWSER_HEADER,
  BROWSER_DISCLAIMER,
  openBrowser,
  closeBrowser,
  toggleBrowser,
  setSearchQuery,
  setCategoryFilter,
  selectEntry,
  setSearchResults,
  clearSearch,
  renderBrowserHTML,
  validateNoAuthority,
} from '../components/WikiBrowser';
import type { WikiBrowserState } from '../components/WikiBrowser';
import { createWikiIndex, EMPTY_WIKI_INDEX } from '../../../src/wiki/ts/WikiIndex';
import { createWikiEntryId } from '../../../src/wiki/ts/types';
import type { WikiEntry, WikiCategory } from '../../../src/wiki/ts/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTestEntry(id: string, category: WikiCategory = 'RULES'): WikiEntry {
  return {
    id: createWikiEntryId(id),
    title: `Test Entry: ${id}`,
    body: `This is the body content for ${id}. It is prose, not code.`,
    category,
    tags: ['test', 'fixture'],
    source: 'Test Suite',
  };
}

const sampleEntries: WikiEntry[] = [
  createTestEntry('reload-rules', 'RULES'),
  createTestEntry('ammo-types', 'EQUIPMENT'),
  createTestEntry('setting-overview', 'SETTING'),
];

const testIndex = createWikiIndex(sampleEntries);

// ============================================================================
// CRITICAL TEST: HIDDEN BY DEFAULT
// ============================================================================

describe('Wiki Browser - Hidden By Default', () => {
  it('initial state has isVisible = false', () => {
    expect(INITIAL_WIKI_BROWSER_STATE.isVisible).toBe(false);
  });

  it('hidden browser renders nothing', () => {
    const html = renderBrowserHTML(INITIAL_WIKI_BROWSER_STATE, testIndex);
    expect(html).toBe('');
  });

  it('browser only becomes visible after explicit user action', () => {
    let state = INITIAL_WIKI_BROWSER_STATE;
    expect(state.isVisible).toBe(false);

    state = openBrowser(state);
    expect(state.isVisible).toBe(true);
  });
});

// ============================================================================
// CRITICAL TEST: NO STATE-AFFECTING INTERACTIVE ELEMENTS
// ============================================================================

describe('Wiki Browser - No State-Affecting Elements', () => {
  const visibleState = openBrowser(INITIAL_WIKI_BROWSER_STATE);

  it('rendered HTML contains no onclick handlers that modify game state', () => {
    const html = renderBrowserHTML(visibleState, testIndex);

    // No onclick handlers at all
    expect(html.toLowerCase()).not.toContain('onclick');
    expect(html.toLowerCase()).not.toContain('onsubmit');
    expect(html.toLowerCase()).not.toContain('onchange');
  });

  it('rendered HTML contains no forms that submit data', () => {
    const html = renderBrowserHTML(visibleState, testIndex);

    expect(html.toLowerCase()).not.toContain('<form');
    expect(html.toLowerCase()).not.toContain('method="post"');
    expect(html.toLowerCase()).not.toContain('method="put"');
  });

  it('rendered HTML contains no action buttons', () => {
    const html = renderBrowserHTML(visibleState, testIndex);

    expect(html.toLowerCase()).not.toContain('type="submit"');
    expect(html.toLowerCase()).not.toContain('apply');
    expect(html.toLowerCase()).not.toContain('override');
  });

  it('rendered HTML contains no javascript: links', () => {
    const html = renderBrowserHTML(visibleState, testIndex);

    expect(html.toLowerCase()).not.toContain('javascript:');
  });
});

// ============================================================================
// CRITICAL TEST: REFERENCE LABELING
// ============================================================================

describe('Wiki Browser - Reference Labeling', () => {
  it('header includes "Reference" or "Read-Only" label', () => {
    const headerLower = BROWSER_HEADER.toLowerCase();
    expect(
      headerLower.includes('reference') || headerLower.includes('read-only')
    ).toBe(true);
  });

  it('disclaimer emphasizes no authority', () => {
    expect(BROWSER_DISCLAIMER.toLowerCase()).toContain('no authority');
  });

  it('disclaimer mentions reference nature', () => {
    expect(BROWSER_DISCLAIMER.toLowerCase()).toContain('reference');
  });

  it('rendered HTML includes reference label', () => {
    const state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    const html = renderBrowserHTML(state, testIndex);

    expect(html.toLowerCase()).toContain('reference');
  });

  it('rendered HTML has data-authority="none" attribute', () => {
    const state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    const html = renderBrowserHTML(state, testIndex);

    expect(html).toContain('data-authority="none"');
  });

  it('rendered HTML uses complementary role (subordinate)', () => {
    const state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    const html = renderBrowserHTML(state, testIndex);

    expect(html).toContain('role="complementary"');
  });
});

// ============================================================================
// CRITICAL TEST: NO AUTHORITY INDICATORS
// ============================================================================

describe('Wiki Browser - No Authority Indicators', () => {
  it('initial state passes no-authority validation', () => {
    expect(validateNoAuthority(INITIAL_WIKI_BROWSER_STATE)).toBe(true);
  });

  it('state after open passes no-authority validation', () => {
    const state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    expect(validateNoAuthority(state)).toBe(true);
  });

  it('state with search passes no-authority validation', () => {
    const state = setSearchQuery(INITIAL_WIKI_BROWSER_STATE, 'test query');
    expect(validateNoAuthority(state)).toBe(true);
  });

  it('state with category filter passes no-authority validation', () => {
    const state = setCategoryFilter(INITIAL_WIKI_BROWSER_STATE, 'RULES');
    expect(validateNoAuthority(state)).toBe(true);
  });

  it('state has no effectsToApply field', () => {
    expect('effectsToApply' in INITIAL_WIKI_BROWSER_STATE).toBe(false);
  });

  it('state has no overrideRequest field', () => {
    expect('overrideRequest' in INITIAL_WIKI_BROWSER_STATE).toBe(false);
  });

  it('state has no pendingAction field', () => {
    expect('pendingAction' in INITIAL_WIKI_BROWSER_STATE).toBe(false);
  });

  it('state has no ruleBinding field', () => {
    expect('ruleBinding' in INITIAL_WIKI_BROWSER_STATE).toBe(false);
  });
});

// ============================================================================
// STATE TRANSITIONS
// ============================================================================

describe('Wiki Browser - State Transitions', () => {
  it('openBrowser sets isVisible to true', () => {
    const state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    expect(state.isVisible).toBe(true);
  });

  it('closeBrowser sets isVisible to false', () => {
    const opened = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    const closed = closeBrowser(opened);
    expect(closed.isVisible).toBe(false);
  });

  it('toggleBrowser flips visibility', () => {
    let state = INITIAL_WIKI_BROWSER_STATE;
    expect(state.isVisible).toBe(false);

    state = toggleBrowser(state);
    expect(state.isVisible).toBe(true);

    state = toggleBrowser(state);
    expect(state.isVisible).toBe(false);
  });

  it('setSearchQuery updates query', () => {
    const state = setSearchQuery(INITIAL_WIKI_BROWSER_STATE, 'reload');
    expect(state.searchQuery).toBe('reload');
    expect(state.isSearching).toBe(true);
  });

  it('setCategoryFilter updates filter', () => {
    const state = setCategoryFilter(INITIAL_WIKI_BROWSER_STATE, 'EQUIPMENT');
    expect(state.categoryFilter).toBe('EQUIPMENT');
  });

  it('selectEntry updates selected entry', () => {
    const entryId = createWikiEntryId('reload-rules');
    const state = selectEntry(INITIAL_WIKI_BROWSER_STATE, entryId);
    expect(state.selectedEntryId).toBe(entryId);
  });

  it('setSearchResults updates results', () => {
    const results = sampleEntries.slice(0, 2);
    const state = setSearchResults(INITIAL_WIKI_BROWSER_STATE, results);
    expect(state.searchResults).toEqual(results);
    expect(state.isSearching).toBe(false);
  });

  it('clearSearch resets search state', () => {
    let state = setSearchQuery(INITIAL_WIKI_BROWSER_STATE, 'test');
    state = setSearchResults(state, sampleEntries);
    state = clearSearch(state);

    expect(state.searchQuery).toBe('');
    expect(state.searchResults.length).toBe(0);
    expect(state.isSearching).toBe(false);
  });
});

// ============================================================================
// RENDER OUTPUT
// ============================================================================

describe('Wiki Browser - Render Output', () => {
  it('renders category list when no filter', () => {
    const state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    const html = renderBrowserHTML(state, testIndex);

    expect(html).toContain('RULES');
    expect(html).toContain('EQUIPMENT');
    expect(html).toContain('SETTING');
  });

  it('renders entries when category filtered', () => {
    let state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    state = setCategoryFilter(state, 'RULES');
    const html = renderBrowserHTML(state, testIndex);

    expect(html).toContain('reload-rules');
  });

  it('renders search results', () => {
    let state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    state = setSearchQuery(state, 'ammo');
    state = setSearchResults(state, sampleEntries.filter(e => e.id.includes('ammo')));
    const html = renderBrowserHTML(state, testIndex);

    expect(html).toContain('ammo-types');
    expect(html).toContain('result(s) found');
  });

  it('renders entry detail when selected', () => {
    let state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    state = selectEntry(state, createWikiEntryId('reload-rules'));
    const html = renderBrowserHTML(state, testIndex);

    expect(html).toContain('Test Entry: reload-rules');
    expect(html).toContain('This is the body content');
  });

  it('escapes HTML in entry content', () => {
    const maliciousEntry: WikiEntry = {
      id: createWikiEntryId('malicious'),
      title: '<script>alert("XSS")</script>',
      body: '<img onerror="alert(1)">',
      category: 'RULES',
    };
    const indexWithMalicious = createWikiIndex([maliciousEntry]);

    let state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    state = selectEntry(state, createWikiEntryId('malicious'));
    const html = renderBrowserHTML(state, indexWithMalicious);

    // Script tags should be escaped, not executable
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');

    // The raw img tag should be escaped - the < should be &lt;
    // This prevents the onerror handler from being parsed as HTML
    expect(html).not.toContain('<img onerror');
    expect(html).toContain('&lt;img');
  });
});

// ============================================================================
// VISUAL SUBORDINATION
// ============================================================================

describe('Wiki Browser - Visual Subordination', () => {
  it('uses aside element (not main or primary)', () => {
    const state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    const html = renderBrowserHTML(state, testIndex);

    expect(html).toContain('<aside');
    expect(html).not.toContain('<main');
  });

  it('has reduced opacity styling', () => {
    const state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    const html = renderBrowserHTML(state, testIndex);

    expect(html).toContain('opacity: 0.9');
  });
});

// ============================================================================
// EMPTY INDEX HANDLING
// ============================================================================

describe('Wiki Browser - Empty Index', () => {
  it('renders with empty index', () => {
    const state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    const html = renderBrowserHTML(state, EMPTY_WIKI_INDEX);

    expect(html).toContain('wiki-browser');
    expect(html).toContain('(0)'); // Zero entries in each category
  });

  it('handles missing entry gracefully', () => {
    let state = openBrowser(INITIAL_WIKI_BROWSER_STATE);
    state = selectEntry(state, createWikiEntryId('nonexistent'));
    const html = renderBrowserHTML(state, EMPTY_WIKI_INDEX);

    expect(html).toContain('Entry not found');
  });
});
