/**
 * ExplanationGraphViewer Component (FE-PR 1.0 - Part 3)
 *
 * CRITICAL: Post-hoc traceability, NOT persuasion.
 * - Read-only
 * - No summarization
 * - No "root cause" highlighting
 * - No AI narration
 * - No collapsing steps by default
 * - No natural language explanation
 * - No highlighting "important" paths
 *
 * Deterministic layout, click-to-expand nodes.
 */

import { type ReactElement, useState } from 'react';
import type { ExplanationGraph, ExplanationNode, ExplanationEdge } from '../contracts';

/**
 * Props for ExplanationGraphViewer
 */
export type ExplanationGraphViewerProps = {
  readonly graph: ExplanationGraph;
};

/**
 * Props for ExplanationNodeView
 */
export type ExplanationNodeViewProps = {
  readonly node: ExplanationNode;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
};

/**
 * Get node ID from ExplanationNode
 */
function getNodeId(node: ExplanationNode): string {
  switch (node.kind) {
    case 'intent':
      return node.intentId;
    case 'validation':
      return node.invocationId;
    case 'override':
      return node.overrideId;
    case 'resolution':
      return `resolution-${node.outcome}`;
  }
}

/**
 * ExplanationNodeView - renders a single node with click-to-expand
 * NO highlighting, NO importance indicators
 */
export function ExplanationNodeView({
  node,
  isExpanded,
  onToggle,
}: ExplanationNodeViewProps): ReactElement {
  const nodeId = getNodeId(node);

  return (
    <div style={styles.node}>
      <button
        type="button"
        onClick={onToggle}
        style={styles.nodeHeader}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} node ${nodeId}`}
      >
        <span style={styles.nodeKind}>[{node.kind}]</span>
        <span style={styles.nodeId}>{nodeId}</span>
        <span style={styles.expandIndicator}>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div style={styles.nodeDetails}>
          {node.kind === 'intent' && (
            <>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Intent ID:</span>
                <span style={styles.detailValue}>{node.intentId}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Intent Type:</span>
                <span style={styles.detailValue}>{node.intentType}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Timestamp:</span>
                <span style={styles.detailValue}>
                  {new Date(node.timestamp).toISOString()}
                </span>
              </div>
            </>
          )}

          {node.kind === 'validation' && (
            <>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Invocation ID:</span>
                <span style={styles.detailValue}>{node.invocationId}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Ruleset ID:</span>
                <span style={styles.detailValue}>{node.rulesetId}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Outcome:</span>
                <span style={styles.detailValue}>{node.outcome}</span>
              </div>
            </>
          )}

          {node.kind === 'override' && (
            <>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Override ID:</span>
                <span style={styles.detailValue}>{node.overrideId}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Original Outcome:</span>
                <span style={styles.detailValue}>{node.originalOutcome}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>New Outcome:</span>
                <span style={styles.detailValue}>{node.newOutcome}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Reason:</span>
                <span style={styles.detailValue}>{node.reason}</span>
              </div>
            </>
          )}

          {node.kind === 'resolution' && (
            <>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Outcome:</span>
                <span style={styles.detailValue}>{node.outcome}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Effect Count:</span>
                <span style={styles.detailValue}>{node.effectCount}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ExplanationEdgeView - renders a single edge
 */
export function ExplanationEdgeView({
  edge,
}: {
  readonly edge: ExplanationEdge;
}): ReactElement {
  return (
    <div style={styles.edge}>
      <span style={styles.edgeFrom}>{edge.from}</span>
      <span style={styles.edgeArrow}>→</span>
      <span style={styles.edgeTo}>{edge.to}</span>
      <span style={styles.edgeLabel}>({edge.label})</span>
    </div>
  );
}

/**
 * ExplanationGraphViewer - main component
 * Deterministic layout, read-only, no summarization
 */
export function ExplanationGraphViewer({
  graph,
}: ExplanationGraphViewerProps): ReactElement {
  // Track which nodes are expanded - all collapsed by default
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  /**
   * Toggle node expansion
   */
  function handleToggleNode(nodeId: string): void {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Explanation Graph</h3>

      {/* Graph metadata - verbatim */}
      <div style={styles.metadata}>
        <div style={styles.metadataRow}>
          <span style={styles.metadataLabel}>Root Intent ID:</span>
          <span style={styles.metadataValue}>{graph.rootIntentId}</span>
        </div>
        <div style={styles.metadataRow}>
          <span style={styles.metadataLabel}>Final Outcome:</span>
          <span style={styles.metadataValue}>{graph.finalOutcome}</span>
        </div>
        <div style={styles.metadataRow}>
          <span style={styles.metadataLabel}>Has Overrides:</span>
          <span style={styles.metadataValue}>{graph.hasOverrides ? 'Yes' : 'No'}</span>
        </div>
      </div>

      {/* Nodes section */}
      <div style={styles.section}>
        <div style={styles.sectionHeading}>Nodes ({graph.nodes.length})</div>
        <div style={styles.nodeList}>
          {graph.nodes.length === 0 ? (
            <div style={styles.emptyState}>(none)</div>
          ) : (
            graph.nodes.map((node) => {
              const nodeId = getNodeId(node);
              return (
                <ExplanationNodeView
                  key={nodeId}
                  node={node}
                  isExpanded={expandedNodes.has(nodeId)}
                  onToggle={() => handleToggleNode(nodeId)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Edges section */}
      <div style={styles.section}>
        <div style={styles.sectionHeading}>Edges ({graph.edges.length})</div>
        <div style={styles.edgeList}>
          {graph.edges.length === 0 ? (
            <div style={styles.emptyState}>(none)</div>
          ) : (
            graph.edges.map((edge, index) => (
              <ExplanationEdgeView key={index} edge={edge} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Styles - clear, deterministic, no highlighting
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    background: '#222',
    borderRadius: '4px',
    border: '1px solid #444',
    marginBottom: '24px',
  },
  heading: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    borderBottom: '1px solid #444',
    paddingBottom: '8px',
  },
  metadata: {
    marginBottom: '16px',
    padding: '12px',
    background: '#2a2a2a',
    borderRadius: '4px',
  },
  metadataRow: {
    display: 'flex',
    marginBottom: '4px',
    lineHeight: '1.4',
  },
  metadataLabel: {
    minWidth: '140px',
    color: '#888',
    fontSize: '13px',
  },
  metadataValue: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: '13px',
  },
  section: {
    marginBottom: '16px',
  },
  sectionHeading: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#888',
    marginBottom: '8px',
  },
  nodeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  node: {
    background: '#2a2a2a',
    borderRadius: '4px',
    border: '1px solid #444',
    overflow: 'hidden',
  },
  nodeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  nodeKind: {
    color: '#888',
    fontFamily: 'monospace',
  },
  nodeId: {
    flex: 1,
    fontFamily: 'monospace',
  },
  expandIndicator: {
    color: '#666',
    fontSize: '10px',
  },
  nodeDetails: {
    padding: '12px',
    borderTop: '1px solid #444',
    background: '#333',
  },
  detailRow: {
    display: 'flex',
    marginBottom: '4px',
    lineHeight: '1.4',
  },
  detailLabel: {
    minWidth: '140px',
    color: '#888',
    fontSize: '12px',
  },
  detailValue: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: '12px',
    wordBreak: 'break-word',
  },
  edgeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  edge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#2a2a2a',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  edgeFrom: {
    color: '#e0e0e0',
  },
  edgeArrow: {
    color: '#666',
  },
  edgeTo: {
    color: '#e0e0e0',
  },
  edgeLabel: {
    color: '#888',
    marginLeft: 'auto',
  },
  emptyState: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: '13px',
  },
};
