/**
 * Pipeline Integration (PR 3.0, PR 3.1)
 *
 * Connects UI to the backend pipeline.
 * The UI submits raw intents and receives complete authority chain results.
 *
 * Core principle: The UI does not bypass validation or fabricate results.
 *
 * This module provides:
 * - PipelineClient interface for submitting intents
 * - OverrideClient interface for submitting overrides (PR 3.1)
 * - Mock implementation for testing
 * - No caching, no optimistic updates, no retries
 */

import type {
  OverrideRequest,
  OverrideSubmitResult,
  PipelineResult,
  RawIntentInput,
  RulesOutcome,
} from './types';

// ============================================================================
// PIPELINE CLIENT INTERFACE
// ============================================================================

/**
 * PipelineClient - interface for submitting intents to the backend
 *
 * The UI uses this to submit intents and receive results.
 * Implementation may be real backend or mock for testing.
 */
export interface PipelineClient {
  /**
   * Submit a raw intent through the full pipeline
   *
   * Returns the complete authority chain result.
   * Does not modify the intent in any way.
   */
  submitIntent(intent: RawIntentInput): Promise<PipelineResult>;
}

// ============================================================================
// OVERRIDE CLIENT INTERFACE (PR 3.1)
// ============================================================================

/**
 * OverrideClient - interface for submitting GM overrides
 *
 * The UI uses this to create overrides via the backend.
 * The UI does NOT fabricate overrides client-side.
 *
 * Core principle: Overrides must feel deliberate, heavy, and visible.
 */
export interface OverrideClient {
  /**
   * Submit a GM override through the backend
   *
   * All fields are required and explicit.
   * Returns the created override and updated resolution.
   */
  submitOverride(request: OverrideRequest): Promise<OverrideSubmitResult>;
}

// ============================================================================
// MOCK PIPELINE (for testing)
// ============================================================================

/**
 * MockPipelineConfig - configuration for mock responses
 */
export type MockPipelineConfig = {
  readonly defaultOutcome: 'PASS' | 'FAIL' | 'AMBIGUOUS';
  readonly includeOverride: boolean;
  readonly includeEffects: boolean;
  readonly simulateDelay: number; // milliseconds
};

/**
 * Default mock configuration
 */
export const DEFAULT_MOCK_CONFIG: MockPipelineConfig = {
  defaultOutcome: 'PASS',
  includeOverride: false,
  includeEffects: true,
  simulateDelay: 100,
};

/**
 * Create a mock pipeline client for testing
 *
 * The mock produces deterministic, predictable results.
 * It does NOT simulate game logic - only pipeline structure.
 */
export function createMockPipelineClient(
  config: Partial<MockPipelineConfig> = {}
): PipelineClient {
  const fullConfig: MockPipelineConfig = { ...DEFAULT_MOCK_CONFIG, ...config };

  return {
    async submitIntent(intent: RawIntentInput): Promise<PipelineResult> {
      // Simulate network delay
      if (fullConfig.simulateDelay > 0) {
        await delay(fullConfig.simulateDelay);
      }

      // Generate deterministic IDs
      const intentId = `intent_${hashString(JSON.stringify(intent))}`;
      const invocationId = `inv_${hashString(intentId)}`;

      // Build mock validation report
      const outcome = fullConfig.defaultOutcome;
      const violations = outcome === 'FAIL'
        ? [{ ruleId: 'mock_rule_001', message: 'Mock rule violation', severity: 'ERROR' as const }]
        : [];
      const ambiguity = outcome === 'AMBIGUOUS'
        ? { reason: 'Mock ambiguity', possibleInterpretations: ['Option A', 'Option B'] }
        : null;

      const validation = {
        invocationId,
        sourceIntentId: intentId,
        intentType: intent.intentType,
        rulesetId: 'mock_ruleset',
        outcome,
        violations,
        ambiguity,
        payload: intent.payload,
      };

      // Build mock override (if configured)
      const override = fullConfig.includeOverride
        ? {
            overrideId: `ovr_${hashString(invocationId)}`,
            parentOverrideId: null,
            overriddenOutcome: { newOutcome: 'PASS' as const },
            warning: { severity: 'INFO' as const, message: 'Mock override' },
            reason: 'Testing override display',
            issuedBy: 'mock_gm',
            issuedAt: Date.now(),
          }
        : null;

      // Determine effective outcome
      const effectiveOutcome = override ? override.overriddenOutcome.newOutcome : outcome;

      // Build mock resolution
      const effects = (fullConfig.includeEffects && effectiveOutcome === 'PASS')
        ? [{
            effectId: `eff_${hashString(invocationId + '_0')}`,
            effectType: 'TRIGGER_NARRATIVE',
            target: { targetId: 'mock_target', targetType: 'character' },
            authority: { invocationId, source: 'RULES' as const, outcome: effectiveOutcome },
            parameters: { narrativeDescriptor: 'Mock effect executed' },
            description: 'Mock narrative effect',
          }]
        : [];

      const resolution = {
        outcome: effectiveOutcome === 'PASS'
          ? 'EFFECTS_PRODUCED' as const
          : effectiveOutcome === 'FAIL'
            ? 'NO_EFFECTS_FAIL' as const
            : 'NO_EFFECTS_AMBIGUOUS' as const,
        effects,
        explanation: `Mock resolution: ${effects.length} effect(s)`,
      };

      return {
        kind: 'success',
        intentId,
        validation,
        override,
        effectiveOutcome,
        resolution,
      };
    },
  };
}

/**
 * Create a mock pipeline that returns validation errors
 */
export function createValidationErrorMock(
  errors: readonly string[]
): PipelineClient {
  return {
    async submitIntent(_intent: RawIntentInput): Promise<PipelineResult> {
      return {
        kind: 'validation_error',
        errors,
      };
    },
  };
}

/**
 * Create a mock pipeline that returns adapter failures
 */
export function createAdapterFailureMock(
  code: string,
  details: string
): PipelineClient {
  return {
    async submitIntent(_intent: RawIntentInput): Promise<PipelineResult> {
      return {
        kind: 'adapter_failure',
        code,
        details,
      };
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simple string hash (djb2)
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ============================================================================
// MOCK OVERRIDE CLIENT (PR 3.1)
// ============================================================================

/**
 * MockOverrideConfig - configuration for mock override responses
 */
export type MockOverrideConfig = {
  readonly simulateDelay: number;
  readonly forceViolation: boolean;
  readonly violationCode?: string;
  readonly violationDetails?: string;
};

/**
 * Default mock override configuration
 */
export const DEFAULT_MOCK_OVERRIDE_CONFIG: MockOverrideConfig = {
  simulateDelay: 100,
  forceViolation: false,
};

/**
 * Create a mock override client for testing
 *
 * The mock produces deterministic, predictable results.
 * It simulates the backend override creation flow.
 */
export function createMockOverrideClient(
  config: Partial<MockOverrideConfig> = {}
): OverrideClient {
  const fullConfig: MockOverrideConfig = { ...DEFAULT_MOCK_OVERRIDE_CONFIG, ...config };

  return {
    async submitOverride(request: OverrideRequest): Promise<OverrideSubmitResult> {
      // Simulate network delay
      if (fullConfig.simulateDelay > 0) {
        await delay(fullConfig.simulateDelay);
      }

      // Return violation if configured
      if (fullConfig.forceViolation) {
        return {
          kind: 'violation',
          code: fullConfig.violationCode ?? 'MOCK_VIOLATION',
          details: fullConfig.violationDetails ?? 'Mock violation for testing',
        };
      }

      // Validate required fields (mirroring backend behavior)
      if (request.reason.trim() === '') {
        return {
          kind: 'violation',
          code: 'EMPTY_REASON',
          details: 'reason must be non-empty',
        };
      }

      if (request.warningMessage.trim() === '') {
        return {
          kind: 'violation',
          code: 'EMPTY_WARNING_MESSAGE',
          details: 'warning.message must be non-empty',
        };
      }

      // Generate deterministic override ID
      const invocationId = request.validationReport.invocationId;
      const overrideId = `ovr_${hashString(invocationId + ':' + request.gmId + ':' + Date.now())}`;

      // Build the override
      const override = {
        overrideId,
        parentOverrideId: null,
        overriddenOutcome: { newOutcome: request.newOutcome },
        warning: {
          severity: request.warningSeverity,
          message: request.warningMessage,
        },
        reason: request.reason,
        issuedBy: request.gmId,
        issuedAt: Date.now(),
      };

      // Build resolution based on new effective outcome
      const effectiveOutcome = request.newOutcome;
      const effects = effectiveOutcome === 'PASS'
        ? [{
            effectId: `eff_${hashString(invocationId + '_override_0')}`,
            effectType: 'TRIGGER_NARRATIVE',
            target: { targetId: 'mock_target', targetType: 'character' },
            authority: { invocationId, source: 'OVERRIDE' as const, outcome: effectiveOutcome },
            parameters: { narrativeDescriptor: 'Effect via GM override' },
            description: 'Effect produced via GM override',
          }]
        : [];

      const resolution = {
        outcome: effectiveOutcome === 'PASS'
          ? 'EFFECTS_PRODUCED' as const
          : effectiveOutcome === 'FAIL'
            ? 'NO_EFFECTS_FAIL' as const
            : 'NO_EFFECTS_AMBIGUOUS' as const,
        effects,
        explanation: `Resolution via GM override: ${effects.length} effect(s)`,
      };

      return {
        kind: 'success',
        override,
        newEffectiveOutcome: effectiveOutcome,
        resolution,
      };
    },
  };
}

/**
 * Create a mock override client that always returns violations
 */
export function createOverrideViolationMock(
  code: string,
  details: string
): OverrideClient {
  return {
    async submitOverride(_request: OverrideRequest): Promise<OverrideSubmitResult> {
      return {
        kind: 'violation',
        code,
        details,
      };
    },
  };
}
