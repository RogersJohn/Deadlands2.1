/**
 * EffectView Component (FE-PR 0.1)
 *
 * CRITICAL: This is a RAW DTO renderer.
 * - Renders Effect as-is
 * - No derived fields
 * - No interpretation
 * - No summarization
 *
 * Shows exactly what the backend sent.
 */

import { type ReactElement } from 'react';
import type { Effect } from '../contracts';
import { JsonDump } from './JsonDump';

export type EffectViewProps = {
  readonly effect: Effect;
};

/**
 * Render an Effect as raw JSON
 */
export function EffectView({ effect }: EffectViewProps): ReactElement {
  return (
    <div>
      <h3>Effect: {effect.effectId}</h3>
      <JsonDump label="effectType" data={effect.effectType} />
      <JsonDump label="target" data={effect.target} />
      <JsonDump label="authority" data={effect.authority} />
      <JsonDump label="parameters" data={effect.parameters} />
      <JsonDump label="description" data={effect.description} />
    </div>
  );
}

export type EffectListViewProps = {
  readonly effects: readonly Effect[];
};

/**
 * Render a list of Effects as raw JSON
 */
export function EffectListView({ effects }: EffectListViewProps): ReactElement {
  return (
    <div>
      <h2>Effects ({effects.length})</h2>
      {effects.map((effect) => (
        <EffectView key={effect.effectId} effect={effect} />
      ))}
    </div>
  );
}
