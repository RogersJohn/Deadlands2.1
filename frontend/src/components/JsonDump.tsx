/**
 * JsonDump Component (FE-PR 0.1)
 *
 * CRITICAL: This is a RAW JSON renderer.
 * - No formatting beyond indentation
 * - No syntax highlighting
 * - No collapsing
 * - No interpretation
 *
 * "Ugly is OK" - we are proving data fidelity, not UX.
 */

import { type ReactElement } from 'react';

export type JsonDumpProps = {
  readonly label: string;
  readonly data: unknown;
};

/**
 * Render any value as indented JSON
 */
export function JsonDump({ label, data }: JsonDumpProps): ReactElement {
  return (
    <div>
      <h3>{label}</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
