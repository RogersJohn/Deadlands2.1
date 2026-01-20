/**
 * ExplanationGraphViewer Tests (FE-PR 1.0)
 *
 * CRITICAL: These tests prove NO persuasion.
 * - Read-only (no editing)
 * - No summarization
 * - No "root cause" highlighting
 * - No AI narration
 * - No collapsing by default
 *
 * Forbidden assertions:
 * - expect(screen.getByText('Root Cause')).toBeInTheDocument()
 * - expect(screen.getByText('Summary')).toBeInTheDocument()
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExplanationGraphViewer } from '../ExplanationGraphViewer';
import type { ExplanationGraph, ExplanationNode, ExplanationEdge } from '../../contracts';

/**
 * Factory for creating test ExplanationGraph
 */
function createTestGraph(
  overrides: Partial<ExplanationGraph> = {}
): ExplanationGraph {
  return {
    rootIntentId: 'intent-001',
    nodes: [],
    edges: [],
    finalOutcome: 'PASS',
    hasOverrides: false,
    ...overrides,
  };
}

/**
 * Factory for creating test nodes
 */
function createIntentNode(id: string = 'intent-node-001'): ExplanationNode {
  return {
    kind: 'intent',
    intentId: id,
    intentType: 'ATTACK',
    timestamp: Date.now(),
  };
}

function createValidationNode(): ExplanationNode {
  return {
    kind: 'validation',
    invocationId: 'inv-001',
    rulesetId: 'ruleset-001',
    outcome: 'PASS',
  };
}

function createOverrideNode(): ExplanationNode {
  return {
    kind: 'override',
    overrideId: 'override-001',
    originalOutcome: 'FAIL',
    newOutcome: 'PASS',
    reason: 'GM decision',
  };
}

function createResolutionNode(): ExplanationNode {
  return {
    kind: 'resolution',
    outcome: 'EFFECTS_PRODUCED',
    effectCount: 3,
  };
}

/**
 * Factory for creating test edge
 */
function createTestEdge(): ExplanationEdge {
  return {
    from: 'edge-from-001',
    to: 'edge-to-001',
    label: 'validated by',
  };
}

describe('ExplanationGraphViewer', () => {
  describe('No Persuasion', () => {
    it('does not show "root cause" text', () => {
      const graph = createTestGraph({
        nodes: [createIntentNode(), createValidationNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.queryByText(/root cause/i)).toBeNull();
    });

    it('does not show "summary" text', () => {
      const graph = createTestGraph({
        nodes: [createIntentNode(), createValidationNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.queryByText(/summary/i)).toBeNull();
    });

    it('does not show AI narration or explanation', () => {
      const graph = createTestGraph({
        nodes: [createIntentNode(), createValidationNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.queryByText(/because/i)).toBeNull();
      expect(screen.queryByText(/therefore/i)).toBeNull();
      expect(screen.queryByText(/this means/i)).toBeNull();
    });

    it('does not highlight "important" paths', () => {
      const graph = createTestGraph({
        nodes: [createIntentNode(), createValidationNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.queryByText(/important/i)).toBeNull();
      expect(screen.queryByText(/critical/i)).toBeNull();
    });
  });

  describe('Read-Only', () => {
    it('does not have edit buttons', () => {
      const graph = createTestGraph({
        nodes: [createIntentNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /modify/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /change/i })).toBeNull();
    });

    it('does not have delete buttons', () => {
      const graph = createTestGraph({
        nodes: [createIntentNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
    });
  });

  describe('Nodes Collapsed by Default', () => {
    it('node details are hidden initially', () => {
      const graph = createTestGraph({
        nodes: [createValidationNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      // Node header should be visible
      expect(screen.getByText('[validation]')).toBeInTheDocument();
      expect(screen.getByText('inv-001')).toBeInTheDocument();

      // Details should NOT be visible (Ruleset ID is a detail)
      expect(screen.queryByText('Ruleset ID:')).toBeNull();
    });

    it('node details are shown after click', () => {
      const graph = createTestGraph({
        nodes: [createValidationNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      // Click to expand
      fireEvent.click(screen.getByText('inv-001'));

      // Now details visible
      expect(screen.getByText('Ruleset ID:')).toBeInTheDocument();
      expect(screen.getByText('ruleset-001')).toBeInTheDocument();
    });
  });

  describe('Node Types', () => {
    it('renders intent nodes', () => {
      const graph = createTestGraph({
        nodes: [createIntentNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.getByText('[intent]')).toBeInTheDocument();
      expect(screen.getByText('intent-node-001')).toBeInTheDocument();
    });

    it('renders validation nodes', () => {
      const graph = createTestGraph({
        nodes: [createValidationNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.getByText('[validation]')).toBeInTheDocument();
    });

    it('renders override nodes', () => {
      const graph = createTestGraph({
        nodes: [createOverrideNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.getByText('[override]')).toBeInTheDocument();
    });

    it('renders resolution nodes', () => {
      const graph = createTestGraph({
        nodes: [createResolutionNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.getByText('[resolution]')).toBeInTheDocument();
    });
  });

  describe('Node Details', () => {
    it('shows intent details when expanded', () => {
      const graph = createTestGraph({
        nodes: [createIntentNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      fireEvent.click(screen.getByText('intent-node-001'));

      expect(screen.getByText('Intent Type:')).toBeInTheDocument();
      expect(screen.getByText('ATTACK')).toBeInTheDocument();
    });

    it('shows override details including reason when expanded', () => {
      const graph = createTestGraph({
        nodes: [createOverrideNode()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      fireEvent.click(screen.getByText('override-001'));

      expect(screen.getByText('Original Outcome:')).toBeInTheDocument();
      expect(screen.getByText('FAIL')).toBeInTheDocument();
      expect(screen.getByText('New Outcome:')).toBeInTheDocument();
      // PASS appears in both metadata (Final Outcome) and node details (New Outcome)
      expect(screen.getAllByText('PASS').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Reason:')).toBeInTheDocument();
      expect(screen.getByText('GM decision')).toBeInTheDocument();
    });
  });

  describe('Edges', () => {
    it('renders edges with from/to/label', () => {
      const graph = createTestGraph({
        edges: [createTestEdge()],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.getByText('edge-from-001')).toBeInTheDocument();
      expect(screen.getByText('→')).toBeInTheDocument();
      expect(screen.getByText('edge-to-001')).toBeInTheDocument();
      expect(screen.getByText('(validated by)')).toBeInTheDocument();
    });

    it('shows "(none)" when no edges', () => {
      const graph = createTestGraph({
        nodes: [createIntentNode()],
        edges: [],
      });
      render(<ExplanationGraphViewer graph={graph} />);

      // Find the edges section empty state
      const noneElements = screen.getAllByText('(none)');
      expect(noneElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Metadata', () => {
    it('shows root intent ID', () => {
      const graph = createTestGraph({
        rootIntentId: 'root-intent-123',
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.getByText('root-intent-123')).toBeInTheDocument();
    });

    it('shows final outcome', () => {
      const graph = createTestGraph({
        finalOutcome: 'AMBIGUOUS',
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.getByText('AMBIGUOUS')).toBeInTheDocument();
    });

    it('shows has overrides flag', () => {
      const graph = createTestGraph({
        hasOverrides: true,
      });
      render(<ExplanationGraphViewer graph={graph} />);

      expect(screen.getByText('Yes')).toBeInTheDocument();
    });
  });
});
