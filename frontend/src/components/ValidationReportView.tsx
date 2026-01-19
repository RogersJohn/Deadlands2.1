/**
 * ValidationReportView Component (FE-PR 0.1)
 *
 * CRITICAL: This is a RAW DTO renderer.
 * - Renders ValidationReport as-is
 * - No derived fields
 * - No interpretation
 * - No summarization
 *
 * Shows exactly what the backend sent.
 */

import { type ReactElement } from 'react';
import type { ValidationReport } from '../contracts';
import { JsonDump } from './JsonDump';

export type ValidationReportViewProps = {
  readonly report: ValidationReport;
};

/**
 * Render a ValidationReport as raw JSON
 */
export function ValidationReportView({
  report,
}: ValidationReportViewProps): ReactElement {
  return (
    <div>
      <h2>ValidationReport</h2>
      <JsonDump label="invocationId" data={report.invocationId} />
      <JsonDump label="sourceIntentId" data={report.sourceIntentId} />
      <JsonDump label="intentType" data={report.intentType} />
      <JsonDump label="rulesetId" data={report.rulesetId} />
      <JsonDump label="outcome" data={report.outcome} />
      <JsonDump label="violations" data={report.violations} />
      <JsonDump label="ambiguity" data={report.ambiguity} />
      <JsonDump label="payload" data={report.payload} />
      <JsonDump label="costValidation" data={report.costValidation} />
      <JsonDump label="conflicts" data={report.conflicts} />
      <JsonDump label="wikiCitations" data={report.wikiCitations} />
    </div>
  );
}
