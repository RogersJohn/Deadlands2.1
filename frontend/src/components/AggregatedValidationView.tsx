/**
 * AggregatedValidationView Component (FE-PR 0.1)
 *
 * CRITICAL: This is a RAW DTO renderer.
 * - Renders AggregatedValidationReport as-is
 * - No derived fields
 * - No interpretation
 * - No summarization
 *
 * Shows exactly what the backend sent.
 */

import { type ReactElement } from 'react';
import type { AggregatedValidationReport } from '../contracts';
import { JsonDump } from './JsonDump';

export type AggregatedValidationViewProps = {
  readonly report: AggregatedValidationReport;
};

/**
 * Render an AggregatedValidationReport as raw JSON
 */
export function AggregatedValidationView({
  report,
}: AggregatedValidationViewProps): ReactElement {
  return (
    <div>
      <h2>AggregatedValidationReport</h2>
      <JsonDump label="sourceIntentId" data={report.sourceIntentId} />
      <JsonDump label="intentType" data={report.intentType} />
      <JsonDump label="payload" data={report.payload} />
      <JsonDump label="validatorCount" data={report.validatorCount} />
      <JsonDump label="ruleResults" data={report.ruleResults} />
      <JsonDump label="costResults" data={report.costResults} />
      <JsonDump label="allConflicts" data={report.allConflicts} />
    </div>
  );
}
