/**
 * API Client (FE-PR 0.1)
 *
 * CRITICAL: This is a THIN pass-through client.
 * - No transformation of request or response
 * - No caching
 * - No retry logic
 * - No interpretation
 * - Returns raw backend JSON as typed DTOs
 *
 * The frontend receives backend data VERBATIM.
 */

import type {
  RawIntent,
  ValidationReport,
  AggregatedValidationReport,
  GmOverride,
  EffectiveValidation,
  ResolutionResult,
} from '../contracts';

/**
 * API configuration
 */
export type ApiConfig = {
  readonly baseUrl: string;
};

/**
 * API error - raw backend error
 */
export type ApiError = {
  readonly status: number;
  readonly message: string;
  readonly body: unknown;
};

/**
 * API response wrapper
 */
export type ApiResponse<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ApiError };

/**
 * Create API client with configuration
 */
export function createApiClient(config: ApiConfig) {
  const { baseUrl } = config;

  /**
   * Raw fetch with no transformation
   */
  async function fetchRaw<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const responseBody: unknown = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          error: {
            status: response.status,
            message: response.statusText,
            body: responseBody,
          },
        };
      }

      // Return raw response - NO TRANSFORMATION
      return {
        ok: true,
        data: responseBody as T,
      };
    } catch (err) {
      return {
        ok: false,
        error: {
          status: 0,
          message: err instanceof Error ? err.message : 'Unknown error',
          body: null,
        },
      };
    }
  }

  return {
    /**
     * Submit raw intent for validation
     */
    submitIntent(intent: RawIntent): Promise<ApiResponse<ValidationReport>> {
      return fetchRaw<ValidationReport>('POST', '/api/intents', intent);
    },

    /**
     * Get aggregated validation report for an intent
     */
    getAggregatedValidation(
      intentId: string
    ): Promise<ApiResponse<AggregatedValidationReport>> {
      return fetchRaw<AggregatedValidationReport>(
        'GET',
        `/api/intents/${intentId}/validation`
      );
    },

    /**
     * Get validation report by invocation ID
     */
    getValidationReport(
      invocationId: string
    ): Promise<ApiResponse<ValidationReport>> {
      return fetchRaw<ValidationReport>(
        'GET',
        `/api/validations/${invocationId}`
      );
    },

    /**
     * Get effective validation (after overrides)
     */
    getEffectiveValidation(
      invocationId: string
    ): Promise<ApiResponse<EffectiveValidation>> {
      return fetchRaw<EffectiveValidation>(
        'GET',
        `/api/validations/${invocationId}/effective`
      );
    },

    /**
     * Get all overrides for an invocation
     */
    getOverrides(invocationId: string): Promise<ApiResponse<readonly GmOverride[]>> {
      return fetchRaw<readonly GmOverride[]>(
        'GET',
        `/api/validations/${invocationId}/overrides`
      );
    },

    /**
     * Get resolution result for an invocation
     */
    getResolution(
      invocationId: string
    ): Promise<ApiResponse<ResolutionResult>> {
      return fetchRaw<ResolutionResult>(
        'GET',
        `/api/validations/${invocationId}/resolution`
      );
    },
  };
}

/**
 * Default API client type
 */
export type ApiClient = ReturnType<typeof createApiClient>;
