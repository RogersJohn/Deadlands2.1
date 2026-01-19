/**
 * Pipeline Applicability Integration Tests (PR 6.1)
 *
 * CRITICAL TEST: Rules declare explicit applicability.
 *
 * These tests prove:
 * - Reload Firearm has explicit combat applicability
 * - Act While Shaken has explicit combat applicability
 * - Applicability filtering works with pipelines
 * - Non-applicable rules emit nothing
 */

import { describe, it, expect } from 'vitest';
import {
  createReloadFirearmPipeline,
  RELOAD_FIREARM_APPLICABILITY,
} from '../../../deadlands/ts/ReloadFirearm';
import {
  createActWhileShakenPipeline,
  ACT_WHILE_SHAKEN_APPLICABILITY,
} from '../../../deadlands/ts/ActWhileShaken';
import {
  isRuleApplicable,
  createIntentContext,
} from '../types';
import type { IntentContext } from '../types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const COMBAT_CONTEXT: IntentContext = createIntentContext('combat');
const DOWNTIME_CONTEXT: IntentContext = createIntentContext('downtime');
const SOCIAL_CONTEXT: IntentContext = createIntentContext('social');

// ============================================================================
// RELOAD FIREARM APPLICABILITY TESTS
// ============================================================================

describe('Reload Firearm - Explicit Applicability', () => {
  const pipeline = createReloadFirearmPipeline();

  it('declares explicit applicability', () => {
    expect(pipeline.applicability).toBeDefined();
    expect(pipeline.applicability).toBe(RELOAD_FIREARM_APPLICABILITY);
  });

  it('applicability includes combat mode', () => {
    expect(pipeline.applicability.modes).toContain('combat');
  });

  it('applicability does NOT include downtime mode', () => {
    expect(pipeline.applicability.modes).not.toContain('downtime');
  });

  it('applicability does NOT include social mode', () => {
    expect(pipeline.applicability.modes).not.toContain('social');
  });

  it('is applicable in combat context', () => {
    expect(isRuleApplicable(pipeline.applicability, COMBAT_CONTEXT)).toBe(true);
  });

  it('is NOT applicable in downtime context', () => {
    expect(isRuleApplicable(pipeline.applicability, DOWNTIME_CONTEXT)).toBe(false);
  });

  it('is NOT applicable in social context', () => {
    expect(isRuleApplicable(pipeline.applicability, SOCIAL_CONTEXT)).toBe(false);
  });

  it('is NOT applicable without context', () => {
    expect(isRuleApplicable(pipeline.applicability, undefined)).toBe(false);
  });
});

// ============================================================================
// ACT WHILE SHAKEN APPLICABILITY TESTS
// ============================================================================

describe('Act While Shaken - Explicit Applicability', () => {
  const pipeline = createActWhileShakenPipeline();

  it('declares explicit applicability', () => {
    expect(pipeline.applicability).toBeDefined();
    expect(pipeline.applicability).toBe(ACT_WHILE_SHAKEN_APPLICABILITY);
  });

  it('applicability includes combat mode', () => {
    expect(pipeline.applicability.modes).toContain('combat');
  });

  it('applicability does NOT include downtime mode', () => {
    expect(pipeline.applicability.modes).not.toContain('downtime');
  });

  it('applicability does NOT include social mode', () => {
    expect(pipeline.applicability.modes).not.toContain('social');
  });

  it('is applicable in combat context', () => {
    expect(isRuleApplicable(pipeline.applicability, COMBAT_CONTEXT)).toBe(true);
  });

  it('is NOT applicable in downtime context', () => {
    expect(isRuleApplicable(pipeline.applicability, DOWNTIME_CONTEXT)).toBe(false);
  });

  it('is NOT applicable in social context', () => {
    expect(isRuleApplicable(pipeline.applicability, SOCIAL_CONTEXT)).toBe(false);
  });

  it('is NOT applicable without context', () => {
    expect(isRuleApplicable(pipeline.applicability, undefined)).toBe(false);
  });
});

// ============================================================================
// MIXED APPLICABILITY TESTS
// ============================================================================

describe('Mixed Applicability - Multiple Rules', () => {
  const reloadPipeline = createReloadFirearmPipeline();
  const shakenPipeline = createActWhileShakenPipeline();

  it('both rules are applicable in combat context', () => {
    expect(isRuleApplicable(reloadPipeline.applicability, COMBAT_CONTEXT)).toBe(true);
    expect(isRuleApplicable(shakenPipeline.applicability, COMBAT_CONTEXT)).toBe(true);
  });

  it('neither rule is applicable in downtime context', () => {
    expect(isRuleApplicable(reloadPipeline.applicability, DOWNTIME_CONTEXT)).toBe(false);
    expect(isRuleApplicable(shakenPipeline.applicability, DOWNTIME_CONTEXT)).toBe(false);
  });

  it('neither rule is applicable in social context', () => {
    expect(isRuleApplicable(reloadPipeline.applicability, SOCIAL_CONTEXT)).toBe(false);
    expect(isRuleApplicable(shakenPipeline.applicability, SOCIAL_CONTEXT)).toBe(false);
  });

  it('filtering produces empty set when context matches no rules', () => {
    const pipelines = [reloadPipeline, shakenPipeline];
    const applicablePipelines = pipelines.filter(p =>
      isRuleApplicable(p.applicability, DOWNTIME_CONTEXT)
    );

    expect(applicablePipelines.length).toBe(0);
  });

  it('filtering produces all rules when context matches', () => {
    const pipelines = [reloadPipeline, shakenPipeline];
    const applicablePipelines = pipelines.filter(p =>
      isRuleApplicable(p.applicability, COMBAT_CONTEXT)
    );

    expect(applicablePipelines.length).toBe(2);
  });
});

// ============================================================================
// CRITICAL ASSERTION: NO IMPLICIT APPLICABILITY
// ============================================================================

describe('No Implicit Applicability', () => {
  it('Reload Firearm has non-empty applicability modes', () => {
    const pipeline = createReloadFirearmPipeline();
    expect(pipeline.applicability.modes.length).toBeGreaterThan(0);
  });

  it('Act While Shaken has non-empty applicability modes', () => {
    const pipeline = createActWhileShakenPipeline();
    expect(pipeline.applicability.modes.length).toBeGreaterThan(0);
  });

  it('applicability is declared, not inferred', () => {
    const reloadPipeline = createReloadFirearmPipeline();
    const shakenPipeline = createActWhileShakenPipeline();

    // Both have explicit applicability objects
    expect(typeof reloadPipeline.applicability).toBe('object');
    expect(typeof shakenPipeline.applicability).toBe('object');

    // Both have explicit modes arrays
    expect(Array.isArray(reloadPipeline.applicability.modes)).toBe(true);
    expect(Array.isArray(shakenPipeline.applicability.modes)).toBe(true);
  });
});

// ============================================================================
// CRITICAL ASSERTION: APPLICABILITY HAS NO PRIORITY
// ============================================================================

describe('Applicability Has No Priority', () => {
  it('Reload Firearm applicability has no priority field', () => {
    const pipeline = createReloadFirearmPipeline();

    expect('priority' in pipeline.applicability).toBe(false);
    expect('order' in pipeline.applicability).toBe(false);
    expect('precedence' in pipeline.applicability).toBe(false);
  });

  it('Act While Shaken applicability has no priority field', () => {
    const pipeline = createActWhileShakenPipeline();

    expect('priority' in pipeline.applicability).toBe(false);
    expect('order' in pipeline.applicability).toBe(false);
    expect('precedence' in pipeline.applicability).toBe(false);
  });
});
