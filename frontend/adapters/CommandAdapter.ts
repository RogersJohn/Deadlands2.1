/**
 * CommandAdapter Interface
 *
 * Defines the contract for submitting intents and overrides.
 * No retries. No defaults. No transformation.
 */

export interface CommandAdapter {
  submitIntent(input: unknown): Promise<
    | { kind: 'ok' }
    | { kind: 'violation'; violation: unknown }
  >;

  submitOverride(input: unknown): Promise<
    | { kind: 'ok' }
    | { kind: 'violation'; violation: unknown }
  >;
}
