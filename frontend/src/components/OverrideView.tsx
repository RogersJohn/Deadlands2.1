/**
 * OverrideView Component (FE-PR 0.1)
 *
 * CRITICAL: This is a RAW DTO renderer.
 * - Renders GmOverride as-is
 * - No derived fields
 * - No interpretation
 * - No summarization
 *
 * Shows exactly what the backend sent.
 */

import { type ReactElement } from 'react';
import type { GmOverride } from '../contracts';
import { JsonDump } from './JsonDump';

export type OverrideViewProps = {
  readonly override: GmOverride;
};

/**
 * Render a GmOverride as raw JSON
 */
export function OverrideView({ override }: OverrideViewProps): ReactElement {
  return (
    <div>
      <h3>Override: {override.overrideId}</h3>
      <JsonDump label="parentOverrideId" data={override.parentOverrideId} />
      <JsonDump label="overriddenOutcome" data={override.overriddenOutcome} />
      <JsonDump label="scope" data={override.scope} />
      <JsonDump label="warning" data={override.warning} />
      <JsonDump label="reason" data={override.reason} />
      <JsonDump label="issuedBy" data={override.issuedBy} />
      <JsonDump label="issuedAt" data={override.issuedAt} />
      <JsonDump label="originalReport" data={override.originalReport} />
    </div>
  );
}

export type OverrideListViewProps = {
  readonly overrides: readonly GmOverride[];
};

/**
 * Render a list of GmOverrides as raw JSON
 */
export function OverrideListView({
  overrides,
}: OverrideListViewProps): ReactElement {
  return (
    <div>
      <h2>Overrides ({overrides.length})</h2>
      {overrides.map((override) => (
        <OverrideView key={override.overrideId} override={override} />
      ))}
    </div>
  );
}
