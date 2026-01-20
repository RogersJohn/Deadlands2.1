/**
 * AiCommentaryPanel Tests (FE-PR 1.0)
 *
 * CRITICAL: These tests prove NO authority bleed.
 * - Panel is hidden by default
 * - Explicit toggle required
 * - AI is visually subordinate
 * - No action buttons inside AI output
 *
 * Forbidden assertions:
 * - expect(aiPanel).toBeVisible() when not toggled
 * - expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiCommentaryPanel, type AiCommentary } from '../AiCommentaryPanel';

/**
 * Factory for creating test commentary
 */
function createTestCommentary(
  overrides: Partial<AiCommentary> = {}
): AiCommentary {
  return {
    commentaryId: 'ai-001',
    timestamp: Date.now(),
    text: 'This is AI commentary text',
    ...overrides,
  };
}

describe('AiCommentaryPanel', () => {
  describe('Hidden by Default', () => {
    it('panel content is not visible initially', () => {
      const commentary = [createTestCommentary()];
      render(<AiCommentaryPanel commentary={commentary} />);

      // The commentary text should NOT be visible
      expect(screen.queryByText('This is AI commentary text')).toBeNull();
    });

    it('shows toggle button with "Advisory Only" label', () => {
      render(<AiCommentaryPanel commentary={[]} />);

      expect(screen.getByText('Show AI Commentary (Advisory Only)')).toBeInTheDocument();
    });

    it('does not show "Non-Authoritative" label until toggled', () => {
      render(<AiCommentaryPanel commentary={[]} />);

      expect(screen.queryByText('Non-Authoritative Commentary')).toBeNull();
    });
  });

  describe('Explicit Toggle Required', () => {
    it('shows panel content after explicit toggle', () => {
      const commentary = [createTestCommentary({ text: 'AI analysis here' })];
      render(<AiCommentaryPanel commentary={commentary} />);

      // Toggle to show
      fireEvent.click(screen.getByText('Show AI Commentary (Advisory Only)'));

      // Now visible
      expect(screen.getByText('AI analysis here')).toBeInTheDocument();
    });

    it('shows "Non-Authoritative Commentary" label when visible', () => {
      render(<AiCommentaryPanel commentary={[createTestCommentary()]} />);

      // Toggle to show
      fireEvent.click(screen.getByText('Show AI Commentary (Advisory Only)'));

      expect(screen.getByText('Non-Authoritative Commentary')).toBeInTheDocument();
    });

    it('hides panel content when toggled off', () => {
      const commentary = [createTestCommentary({ text: 'Hidden again' })];
      render(<AiCommentaryPanel commentary={commentary} />);

      // Toggle on
      fireEvent.click(screen.getByText('Show AI Commentary (Advisory Only)'));
      expect(screen.getByText('Hidden again')).toBeInTheDocument();

      // Toggle off
      fireEvent.click(screen.getByText('Hide AI Commentary'));
      expect(screen.queryByText('Hidden again')).toBeNull();
    });
  });

  describe('No Authority Bleed', () => {
    it('does not contain any action buttons', () => {
      const commentary = [createTestCommentary()];
      render(<AiCommentaryPanel commentary={commentary} />);

      // Toggle to show
      fireEvent.click(screen.getByText('Show AI Commentary (Advisory Only)'));

      // No action-oriented buttons
      expect(screen.queryByRole('button', { name: /apply/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /accept/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /use/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /execute/i })).toBeNull();
    });

    it('does not contain any links that trigger actions', () => {
      const commentary = [createTestCommentary()];
      render(<AiCommentaryPanel commentary={commentary} />);

      // Toggle to show
      fireEvent.click(screen.getByText('Show AI Commentary (Advisory Only)'));

      // No action links
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('shows reminder that commentary does not affect game state', () => {
      render(<AiCommentaryPanel commentary={[createTestCommentary()]} />);

      // Toggle to show
      fireEvent.click(screen.getByText('Show AI Commentary (Advisory Only)'));

      expect(
        screen.getByText('This commentary is advisory only. It does not affect game state.')
      ).toBeInTheDocument();
    });

    it('renders AI text verbatim without formatting', () => {
      const commentary = [
        createTestCommentary({
          text: 'Plain text with no special formatting applied',
        }),
      ];
      render(<AiCommentaryPanel commentary={commentary} />);

      // Toggle to show
      fireEvent.click(screen.getByText('Show AI Commentary (Advisory Only)'));

      const textElement = screen.getByText('Plain text with no special formatting applied');
      expect(textElement).toBeInTheDocument();
    });
  });

  describe('Commentary Rendering', () => {
    it('renders multiple commentary entries', () => {
      const commentary = [
        createTestCommentary({ commentaryId: 'ai-001', text: 'First comment' }),
        createTestCommentary({ commentaryId: 'ai-002', text: 'Second comment' }),
      ];
      render(<AiCommentaryPanel commentary={commentary} />);

      // Toggle to show
      fireEvent.click(screen.getByText('Show AI Commentary (Advisory Only)'));

      expect(screen.getByText('First comment')).toBeInTheDocument();
      expect(screen.getByText('Second comment')).toBeInTheDocument();
    });

    it('shows "(no commentary)" when empty', () => {
      render(<AiCommentaryPanel commentary={[]} />);

      // Toggle to show
      fireEvent.click(screen.getByText('Show AI Commentary (Advisory Only)'));

      expect(screen.getByText('(no commentary)')).toBeInTheDocument();
    });

    it('renders context if provided', () => {
      const commentary = [
        createTestCommentary({
          text: 'Analysis text',
          context: 'Regarding the attack action',
        }),
      ];
      render(<AiCommentaryPanel commentary={commentary} />);

      // Toggle to show
      fireEvent.click(screen.getByText('Show AI Commentary (Advisory Only)'));

      expect(screen.getByText('Context: Regarding the attack action')).toBeInTheDocument();
    });
  });
});
