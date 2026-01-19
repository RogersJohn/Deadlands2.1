/**
 * Contract Structural Tests (FE-PR 0.1)
 *
 * These tests verify that DTO contracts have the expected structure.
 * They do NOT test behavior - they test shape compliance.
 *
 * Purpose: Catch accidental field additions/removals/renames that would
 * break the contract with the backend.
 */

import { describe, it, expect } from 'vitest';
import type {
  ValidationReport,
  RulesOutcome,
  RuleViolation,
  AmbiguityInterpretation,
  Conflict,
  Effect,
  ResolutionResult,
  GmOverride,
  OverrideWarning,
  AggregatedValidationReport,
  RuleValidationResult,
} from '../index';

describe('Contract Structural Tests', () => {
  describe('ValidationReport', () => {
    it('has required fields', () => {
      const report: ValidationReport = {
        invocationId: 'inv_001',
        sourceIntentId: 'int_001',
        intentType: 'ATTACK',
        rulesetId: 'deadlands_core',
        outcome: 'PASS',
        violations: [],
        ambiguity: null,
        payload: {},
        conflicts: [],
      };

      expect(report.invocationId).toBe('inv_001');
      expect(report.sourceIntentId).toBe('int_001');
      expect(report.intentType).toBe('ATTACK');
      expect(report.rulesetId).toBe('deadlands_core');
      expect(report.outcome).toBe('PASS');
      expect(report.violations).toEqual([]);
      expect(report.ambiguity).toBeNull();
      expect(report.payload).toEqual({});
      expect(report.conflicts).toEqual([]);
    });

    it('accepts all outcome values', () => {
      const outcomes: RulesOutcome[] = ['PASS', 'FAIL', 'AMBIGUOUS'];
      outcomes.forEach((outcome) => {
        const report: ValidationReport = {
          invocationId: 'inv',
          sourceIntentId: 'int',
          intentType: 'TEST',
          rulesetId: 'test',
          outcome,
          violations: [],
          ambiguity: null,
          payload: {},
          conflicts: [],
        };
        expect(report.outcome).toBe(outcome);
      });
    });

    it('accepts optional fields', () => {
      const report: ValidationReport = {
        invocationId: 'inv_001',
        sourceIntentId: 'int_001',
        intentType: 'ATTACK',
        rulesetId: 'deadlands_core',
        outcome: 'AMBIGUOUS',
        violations: [],
        ambiguity: {
          reason: 'test reason',
          possibleInterpretations: [],
        },
        payload: {},
        conflicts: [],
        costValidation: {
          cost: { kind: 'ActionCostEffect', description: 'test' },
          outcome: 'AMBIGUOUS',
          reason: 'test reason',
        },
        wikiCitations: [
          { wikiId: 'wiki_001', title: 'Test', relevance: 'test' },
        ],
      };

      expect(report.costValidation).toBeDefined();
      expect(report.wikiCitations).toHaveLength(1);
    });
  });

  describe('RuleViolation', () => {
    it('has required fields', () => {
      const violation: RuleViolation = {
        ruleId: 'rule_001',
        message: 'Test violation',
        severity: 'ERROR',
      };

      expect(violation.ruleId).toBe('rule_001');
      expect(violation.message).toBe('Test violation');
      expect(violation.severity).toBe('ERROR');
    });

    it('accepts both severity values', () => {
      const error: RuleViolation = {
        ruleId: 'r',
        message: 'm',
        severity: 'ERROR',
      };
      const warning: RuleViolation = {
        ruleId: 'r',
        message: 'm',
        severity: 'WARNING',
      };

      expect(error.severity).toBe('ERROR');
      expect(warning.severity).toBe('WARNING');
    });
  });

  describe('AmbiguityInterpretation', () => {
    it('has required fields', () => {
      const interpretation: AmbiguityInterpretation = {
        code: 'TEST_CODE',
        resultingOutcome: 'PASS',
        description: 'Test description',
      };

      expect(interpretation.code).toBe('TEST_CODE');
      expect(interpretation.resultingOutcome).toBe('PASS');
      expect(interpretation.description).toBe('Test description');
    });

    it('only accepts PASS or FAIL for resultingOutcome', () => {
      const pass: AmbiguityInterpretation = {
        code: 'C',
        resultingOutcome: 'PASS',
        description: 'd',
      };
      const fail: AmbiguityInterpretation = {
        code: 'C',
        resultingOutcome: 'FAIL',
        description: 'd',
      };

      expect(pass.resultingOutcome).toBe('PASS');
      expect(fail.resultingOutcome).toBe('FAIL');
    });
  });

  describe('Conflict', () => {
    it('has required fields', () => {
      const conflict: Conflict = {
        kind: 'HardBlock',
        sourceRule: 'rule_001',
        message: 'Test conflict',
      };

      expect(conflict.kind).toBe('HardBlock');
      expect(conflict.sourceRule).toBe('rule_001');
      expect(conflict.message).toBe('Test conflict');
    });

    it('accepts all conflict kinds', () => {
      const kinds: Array<Conflict['kind']> = [
        'HardBlock',
        'SoftBlock',
        'Informational',
      ];
      kinds.forEach((kind) => {
        const conflict: Conflict = {
          kind,
          sourceRule: 'rule',
          message: 'msg',
        };
        expect(conflict.kind).toBe(kind);
      });
    });

    it('accepts optional tags', () => {
      const conflict: Conflict = {
        kind: 'SoftBlock',
        sourceRule: 'rule',
        message: 'msg',
        tags: ['tag1', 'tag2'],
      };

      expect(conflict.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('Effect', () => {
    it('has required fields', () => {
      const effect: Effect = {
        effectId: 'eff_001',
        effectType: 'APPLY_CONDITION',
        target: { targetId: 'char_001', targetType: 'character' },
        authority: { invocationId: 'inv_001', source: 'RULES', outcome: 'PASS' },
        parameters: {},
        description: 'Test effect',
      };

      expect(effect.effectId).toBe('eff_001');
      expect(effect.effectType).toBe('APPLY_CONDITION');
      expect(effect.target.targetId).toBe('char_001');
      expect(effect.authority.source).toBe('RULES');
      expect(effect.description).toBe('Test effect');
    });

    it('accepts all effect types', () => {
      const types: Array<Effect['effectType']> = [
        'APPLY_CONDITION',
        'CONSUME_RESOURCE',
        'DEAL_DAMAGE',
        'CHANGE_POSITION',
        'TRIGGER_NARRATIVE',
        'GRANT_RESOURCE',
        'REMOVE_CONDITION',
      ];

      types.forEach((effectType) => {
        const effect: Effect = {
          effectId: 'e',
          effectType,
          target: { targetId: 't', targetType: 'character' },
          authority: { invocationId: 'i', source: 'RULES', outcome: 'PASS' },
          parameters: {},
          description: 'd',
        };
        expect(effect.effectType).toBe(effectType);
      });
    });

    it('accepts both authority sources', () => {
      const rules: Effect = {
        effectId: 'e',
        effectType: 'APPLY_CONDITION',
        target: { targetId: 't', targetType: 'character' },
        authority: { invocationId: 'i', source: 'RULES', outcome: 'PASS' },
        parameters: {},
        description: 'd',
      };
      const override: Effect = {
        effectId: 'e',
        effectType: 'APPLY_CONDITION',
        target: { targetId: 't', targetType: 'character' },
        authority: { invocationId: 'i', source: 'OVERRIDE', outcome: 'PASS' },
        parameters: {},
        description: 'd',
      };

      expect(rules.authority.source).toBe('RULES');
      expect(override.authority.source).toBe('OVERRIDE');
    });
  });

  describe('GmOverride', () => {
    it('has required fields', () => {
      const override: GmOverride = {
        overrideId: 'ovr_001',
        parentOverrideId: null,
        originalReport: {
          invocationId: 'inv_001',
          sourceIntentId: 'int_001',
          intentType: 'ATTACK',
          rulesetId: 'deadlands_core',
          outcome: 'FAIL',
          violations: [],
          ambiguity: null,
          payload: {},
          conflicts: [],
        },
        overriddenOutcome: { newOutcome: 'PASS' },
        scope: 'OUTCOME',
        warning: { severity: 'WARNING', message: 'Test warning' },
        reason: 'Test reason',
        issuedBy: 'gm_001',
        issuedAt: 1234567890,
      };

      expect(override.overrideId).toBe('ovr_001');
      expect(override.parentOverrideId).toBeNull();
      expect(override.overriddenOutcome.newOutcome).toBe('PASS');
      expect(override.scope).toBe('OUTCOME');
      expect(override.warning.severity).toBe('WARNING');
      expect(override.reason).toBe('Test reason');
    });

    it('accepts all warning severities', () => {
      const severities: Array<OverrideWarning['severity']> = [
        'INFO',
        'WARNING',
        'CRITICAL',
      ];

      severities.forEach((severity) => {
        const warning: OverrideWarning = { severity, message: 'test' };
        expect(warning.severity).toBe(severity);
      });
    });

    it('accepts optional selectedInterpretationCode', () => {
      const override: GmOverride = {
        overrideId: 'ovr_001',
        parentOverrideId: null,
        originalReport: {
          invocationId: 'inv',
          sourceIntentId: 'int',
          intentType: 'ATTACK',
          rulesetId: 'deadlands_core',
          outcome: 'AMBIGUOUS',
          violations: [],
          ambiguity: {
            reason: 'test',
            possibleInterpretations: [
              { code: 'CODE_A', resultingOutcome: 'PASS', description: 'd' },
            ],
          },
          payload: {},
          conflicts: [],
        },
        overriddenOutcome: {
          newOutcome: 'PASS',
          selectedInterpretationCode: 'CODE_A',
        },
        scope: 'OUTCOME',
        warning: { severity: 'INFO', message: 'test' },
        reason: 'test',
        issuedBy: 'gm',
        issuedAt: 0,
      };

      expect(override.overriddenOutcome.selectedInterpretationCode).toBe(
        'CODE_A'
      );
    });
  });

  describe('ResolutionResult', () => {
    it('has required fields', () => {
      const result: ResolutionResult = {
        outcome: 'EFFECTS_PRODUCED',
        effects: [],
        explanation: 'Test explanation',
      };

      expect(result.outcome).toBe('EFFECTS_PRODUCED');
      expect(result.effects).toEqual([]);
      expect(result.explanation).toBe('Test explanation');
    });

    it('accepts all resolution outcomes', () => {
      const outcomes: Array<ResolutionResult['outcome']> = [
        'EFFECTS_PRODUCED',
        'NO_EFFECTS_FAIL',
        'NO_EFFECTS_AMBIGUOUS',
        'NO_EFFECTS_NO_PRODUCER',
      ];

      outcomes.forEach((outcome) => {
        const result: ResolutionResult = {
          outcome,
          effects: [],
          explanation: 'e',
        };
        expect(result.outcome).toBe(outcome);
      });
    });
  });

  describe('AggregatedValidationReport', () => {
    it('has required fields', () => {
      const report: AggregatedValidationReport = {
        sourceIntentId: 'int_001',
        intentType: 'ATTACK',
        payload: {},
        ruleResults: [],
        costResults: [],
        allConflicts: [],
        validatorCount: 0,
      };

      expect(report.sourceIntentId).toBe('int_001');
      expect(report.intentType).toBe('ATTACK');
      expect(report.payload).toEqual({});
      expect(report.ruleResults).toEqual([]);
      expect(report.costResults).toEqual([]);
      expect(report.allConflicts).toEqual([]);
      expect(report.validatorCount).toBe(0);
    });

    it('accepts multiple rule results', () => {
      const ruleResult: RuleValidationResult = {
        validatorId: 'val_001',
        rulesetId: 'deadlands_core',
        invocationId: 'inv_001',
        outcome: 'PASS',
        violations: [],
        ambiguity: null,
        conflicts: [],
      };

      const report: AggregatedValidationReport = {
        sourceIntentId: 'int',
        intentType: 'ATTACK',
        payload: {},
        ruleResults: [ruleResult, ruleResult],
        costResults: [],
        allConflicts: [],
        validatorCount: 2,
      };

      expect(report.ruleResults).toHaveLength(2);
    });
  });
});
