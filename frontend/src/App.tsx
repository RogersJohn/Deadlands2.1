/**
 * App Component (FE-PR 0.1)
 *
 * CRITICAL: This is a SKELETON app.
 * - No routing
 * - No state management
 * - No forms
 * - No buttons
 *
 * Shows sample DTOs rendered as raw JSON to prove data fidelity.
 */

import { type ReactElement } from 'react';
import { ValidationReportView } from './components/ValidationReportView';
import { ResolutionView } from './components/ResolutionView';
import { OverrideListView } from './components/OverrideView';
import type { ValidationReport, ResolutionResult, GmOverride } from './contracts';

/**
 * Sample ValidationReport for display
 */
const sampleValidationReport: ValidationReport = {
  invocationId: 'inv_001',
  sourceIntentId: 'int_001',
  intentType: 'ATTACK',
  rulesetId: 'deadlands_core',
  outcome: 'AMBIGUOUS',
  violations: [],
  ambiguity: {
    reason: 'Attack while shaken. System does not resolve impact.',
    possibleInterpretations: [
      {
        code: 'ATTACK_SUCCEEDS',
        resultingOutcome: 'PASS',
        description: 'Attack succeeds despite shaken (GM decision)',
      },
      {
        code: 'ATTACK_FAILS',
        resultingOutcome: 'FAIL',
        description: 'Shaken undermines attack (GM decision)',
      },
    ],
  },
  payload: {
    attackerId: 'char_001',
    targetId: 'char_002',
    weaponId: 'weapon_001',
  },
  costValidation: {
    cost: {
      kind: 'ActionCostEffect',
      description: 'Attack action',
      tags: ['action', 'attack'],
    },
    outcome: 'AMBIGUOUS',
    reason: 'Action cost not explicitly tracked',
  },
  conflicts: [
    {
      kind: 'SoftBlock',
      sourceRule: 'SW_CONDITION_001',
      message: 'Attacker is shaken. Shaken condition affects combat actions.',
      tags: ['condition', 'shaken', 'combat'],
    },
  ],
  wikiCitations: [
    {
      wikiId: 'wiki_shaken',
      title: 'Shaken Condition',
      relevance: 'Describes shaken effects on actions',
    },
  ],
};

/**
 * Sample ResolutionResult for display
 */
const sampleResolution: ResolutionResult = {
  outcome: 'NO_EFFECTS_AMBIGUOUS',
  effects: [],
  explanation: 'No effects produced - validation outcome was AMBIGUOUS',
};

/**
 * Sample GmOverride for display
 */
const sampleOverrides: readonly GmOverride[] = [];

export function App(): ReactElement {
  return (
    <div>
      <h1>Deadlands 2.1 - Frontend Skeleton (FE-PR 0.1)</h1>
      <p>
        This is a read-only DTO viewer. No forms. No buttons. No interpretation.
      </p>
      <hr />
      <ValidationReportView report={sampleValidationReport} />
      <hr />
      <ResolutionView resolution={sampleResolution} />
      <hr />
      <OverrideListView overrides={sampleOverrides} />
    </div>
  );
}
