/**
 * ResolutionView Component (FE-PR 0.1)
 *
 * CRITICAL: This is a RAW DTO renderer.
 * - Renders ResolutionResult as-is
 * - No derived fields
 * - No interpretation
 * - No summarization
 *
 * Shows exactly what the backend sent.
 */

import { type ReactElement } from 'react';
import type { ResolutionResult } from '../contracts';
import { JsonDump } from './JsonDump';
import { EffectListView } from './EffectView';

export type ResolutionViewProps = {
  readonly resolution: ResolutionResult;
};

/**
 * Render a ResolutionResult as raw JSON
 */
export function ResolutionView({
  resolution,
}: ResolutionViewProps): ReactElement {
  return (
    <div>
      <h2>ResolutionResult</h2>
      <JsonDump label="outcome" data={resolution.outcome} />
      <JsonDump label="explanation" data={resolution.explanation} />
      <EffectListView effects={resolution.effects} />
    </div>
  );
}
