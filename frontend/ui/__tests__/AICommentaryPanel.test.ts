/**
 * AI Commentary Panel Tests (PR 5.0)
 *
 * These tests verify the UI panel has NO authority and is
 * subordinate to validation results and GM override controls.
 *
 * KILL CRITERIA TO VERIFY:
 * - Panel is hidden by default
 * - Panel contains no interactive elements that affect state
 * - Panel is clearly labeled as advisory
 * - Panel has no authority indicators
 */

import { describe, it, expect } from 'vitest';

import {
  INITIAL_AI_COMMENTARY_STATE,
  PANEL_HEADER,
  PANEL_DISCLAIMER,
  openPanel,
  closePanel,
  togglePanel,
  setLoading,
  setCommentary,
  setError,
  clearCommentary,
  renderPanelHTML,
  validateNoAuthority,
} from '../components/AICommentaryPanel';
import type { AICommentaryPanelState } from '../components/AICommentaryPanel';

// ============================================================================
// CRITICAL TEST: HIDDEN BY DEFAULT
// ============================================================================

describe('AI Commentary Panel - Hidden By Default', () => {
  /**
   * KILL CRITERION: AI output is visible by default
   *
   * The panel MUST be hidden by default.
   */
  it('initial state has isVisible = false', () => {
    expect(INITIAL_AI_COMMENTARY_STATE.isVisible).toBe(false);
  });

  it('hidden panel renders nothing', () => {
    const html = renderPanelHTML(INITIAL_AI_COMMENTARY_STATE);
    expect(html).toBe('');
  });

  it('panel only becomes visible after explicit user action', () => {
    // Start hidden
    let state = INITIAL_AI_COMMENTARY_STATE;
    expect(state.isVisible).toBe(false);

    // Explicit open action required
    state = openPanel(state);
    expect(state.isVisible).toBe(true);
  });
});

// ============================================================================
// CRITICAL TEST: NO INTERACTIVE ELEMENTS
// ============================================================================

describe('AI Commentary Panel - No Interactive Elements', () => {
  /**
   * KILL CRITERION: Panel contains buttons/links that apply changes
   *
   * The panel must be READ-ONLY. No forms, buttons, or action links.
   */
  it('rendered HTML contains no buttons', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test commentary'));
    const html = renderPanelHTML(state);

    expect(html.toLowerCase()).not.toContain('<button');
    expect(html.toLowerCase()).not.toContain('type="button"');
    expect(html.toLowerCase()).not.toContain('type="submit"');
  });

  it('rendered HTML contains no forms', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test commentary'));
    const html = renderPanelHTML(state);

    expect(html.toLowerCase()).not.toContain('<form');
    expect(html.toLowerCase()).not.toContain('</form>');
  });

  it('rendered HTML contains no input elements', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test commentary'));
    const html = renderPanelHTML(state);

    expect(html.toLowerCase()).not.toContain('<input');
    expect(html.toLowerCase()).not.toContain('<textarea');
    expect(html.toLowerCase()).not.toContain('<select');
  });

  it('rendered HTML contains no onclick handlers', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test commentary'));
    const html = renderPanelHTML(state);

    expect(html.toLowerCase()).not.toContain('onclick');
    expect(html.toLowerCase()).not.toContain('onsubmit');
    expect(html.toLowerCase()).not.toContain('onchange');
  });

  it('rendered HTML contains no action links', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test commentary'));
    const html = renderPanelHTML(state);

    // No javascript: links
    expect(html.toLowerCase()).not.toContain('javascript:');
    // No action URLs
    expect(html.toLowerCase()).not.toContain('href="/"');
    expect(html.toLowerCase()).not.toContain('href="/apply"');
    expect(html.toLowerCase()).not.toContain('href="/override"');
  });
});

// ============================================================================
// CRITICAL TEST: ADVISORY LABELING
// ============================================================================

describe('AI Commentary Panel - Advisory Labeling', () => {
  /**
   * The panel must be clearly labeled as non-authoritative.
   */
  it('header includes "Advisory" label', () => {
    expect(PANEL_HEADER.toLowerCase()).toContain('advisory');
  });

  it('disclaimer emphasizes no authority', () => {
    expect(PANEL_DISCLAIMER.toLowerCase()).toContain('no authority');
  });

  it('disclaimer mentions advisory nature', () => {
    expect(PANEL_DISCLAIMER.toLowerCase()).toContain('advisory');
  });

  it('rendered HTML includes advisory label', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test'));
    const html = renderPanelHTML(state);

    expect(html.toLowerCase()).toContain('advisory');
  });

  it('rendered HTML has data-authority="none" attribute', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test'));
    const html = renderPanelHTML(state);

    expect(html).toContain('data-authority="none"');
  });

  it('rendered HTML uses complementary role (subordinate)', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test'));
    const html = renderPanelHTML(state);

    expect(html).toContain('role="complementary"');
  });
});

// ============================================================================
// CRITICAL TEST: NO AUTHORITY INDICATORS
// ============================================================================

describe('AI Commentary Panel - No Authority Indicators', () => {
  /**
   * Panel state must have no fields that could indicate authority.
   */
  it('initial state passes no-authority validation', () => {
    expect(validateNoAuthority(INITIAL_AI_COMMENTARY_STATE)).toBe(true);
  });

  it('state after open passes no-authority validation', () => {
    const state = openPanel(INITIAL_AI_COMMENTARY_STATE);
    expect(validateNoAuthority(state)).toBe(true);
  });

  it('state with commentary passes no-authority validation', () => {
    const state = setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test commentary');
    expect(validateNoAuthority(state)).toBe(true);
  });

  it('state with error passes no-authority validation', () => {
    const state = setError(INITIAL_AI_COMMENTARY_STATE, 'Test error');
    expect(validateNoAuthority(state)).toBe(true);
  });

  it('state has no effectsToApply field', () => {
    expect('effectsToApply' in INITIAL_AI_COMMENTARY_STATE).toBe(false);
  });

  it('state has no overrideRequest field', () => {
    expect('overrideRequest' in INITIAL_AI_COMMENTARY_STATE).toBe(false);
  });

  it('state has no pendingAction field', () => {
    expect('pendingAction' in INITIAL_AI_COMMENTARY_STATE).toBe(false);
  });
});

// ============================================================================
// STATE TRANSITIONS
// ============================================================================

describe('AI Commentary Panel - State Transitions', () => {
  it('openPanel sets isVisible to true', () => {
    const state = openPanel(INITIAL_AI_COMMENTARY_STATE);
    expect(state.isVisible).toBe(true);
  });

  it('closePanel sets isVisible to false', () => {
    const opened = openPanel(INITIAL_AI_COMMENTARY_STATE);
    const closed = closePanel(opened);
    expect(closed.isVisible).toBe(false);
  });

  it('togglePanel flips visibility', () => {
    let state = INITIAL_AI_COMMENTARY_STATE;
    expect(state.isVisible).toBe(false);

    state = togglePanel(state);
    expect(state.isVisible).toBe(true);

    state = togglePanel(state);
    expect(state.isVisible).toBe(false);
  });

  it('setLoading sets isLoading to true', () => {
    const state = setLoading(INITIAL_AI_COMMENTARY_STATE);
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('setCommentary stores commentary and clears loading', () => {
    const loading = setLoading(INITIAL_AI_COMMENTARY_STATE);
    const withCommentary = setCommentary(loading, 'Test commentary');

    expect(withCommentary.isLoading).toBe(false);
    expect(withCommentary.commentary).toBe('Test commentary');
    expect(withCommentary.error).toBeNull();
    expect(withCommentary.lastFetchedAt).not.toBeNull();
  });

  it('setError stores error and clears loading', () => {
    const loading = setLoading(INITIAL_AI_COMMENTARY_STATE);
    const withError = setError(loading, 'Test error');

    expect(withError.isLoading).toBe(false);
    expect(withError.commentary).toBeNull();
    expect(withError.error).toBe('Test error');
    expect(withError.lastFetchedAt).not.toBeNull();
  });

  it('clearCommentary resets but preserves visibility', () => {
    let state = openPanel(INITIAL_AI_COMMENTARY_STATE);
    state = setCommentary(state, 'Test');
    state = clearCommentary(state);

    expect(state.isVisible).toBe(true); // Still visible
    expect(state.commentary).toBeNull();
    expect(state.error).toBeNull();
    expect(state.lastFetchedAt).toBeNull();
  });
});

// ============================================================================
// RENDER OUTPUT
// ============================================================================

describe('AI Commentary Panel - Render Output', () => {
  it('renders loading state', () => {
    const state = openPanel(setLoading(INITIAL_AI_COMMENTARY_STATE));
    const html = renderPanelHTML(state);

    expect(html).toContain('Loading commentary');
  });

  it('renders error state', () => {
    const state = openPanel(setError(INITIAL_AI_COMMENTARY_STATE, 'Test error message'));
    const html = renderPanelHTML(state);

    expect(html).toContain('Commentary unavailable');
    expect(html).toContain('Test error message');
    expect(html).toContain('System behavior is unchanged');
  });

  it('renders commentary text', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test commentary content'));
    const html = renderPanelHTML(state);

    expect(html).toContain('Test commentary content');
  });

  it('renders timestamp when commentary exists', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test'));
    const html = renderPanelHTML(state);

    expect(html).toContain('Generated at:');
    expect(html).toContain('advisory snapshot');
  });

  it('escapes HTML in commentary to prevent XSS', () => {
    const malicious = '<script>alert("XSS")</script>';
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, malicious));
    const html = renderPanelHTML(state);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ============================================================================
// VISUAL SUBORDINATION
// ============================================================================

describe('AI Commentary Panel - Visual Subordination', () => {
  /**
   * Panel must be visually subordinate to validation results and GM controls.
   */
  it('uses aside element (not main or primary)', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test'));
    const html = renderPanelHTML(state);

    expect(html).toContain('<aside');
    expect(html).not.toContain('<main');
  });

  it('has reduced opacity styling', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test'));
    const html = renderPanelHTML(state);

    expect(html).toContain('opacity: 0.8');
  });

  it('uses muted color scheme', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test'));
    const html = renderPanelHTML(state);

    expect(html).toContain('#666'); // Muted text
    expect(html).toContain('#888'); // Even more muted
  });

  it('uses smaller font size for meta info', () => {
    const state = openPanel(setCommentary(INITIAL_AI_COMMENTARY_STATE, 'Test'));
    const html = renderPanelHTML(state);

    expect(html).toContain('font-size: 0.8em');
    expect(html).toContain('font-size: 0.7em');
  });
});
