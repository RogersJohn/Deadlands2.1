/**
 * Override Layer - GM Exceptions (per ADR-0020)
 *
 * <h2>Responsibility</h2>
 * <p>This layer handles Game Master overrides of rule violations:</p>
 * <ul>
 *   <li>Override decision objects</li>
 *   <li>Append-only audit chain</li>
 *   <li>Warning semantics (overrides don't hide violations)</li>
 * </ul>
 *
 * <h2>Key Properties</h2>
 * <ul>
 *   <li>Explicit - overrides must be explicitly requested</li>
 *   <li>Auditable - complete history of all overrides</li>
 *   <li>Append-only - past overrides cannot be modified</li>
 *   <li>Warning semantics - violations are preserved, not erased</li>
 * </ul>
 *
 * <h2>Prohibitions</h2>
 * <p>This layer must NEVER:</p>
 * <ul>
 *   <li>Allow players to create overrides</li>
 *   <li>Modify or delete past overrides</li>
 *   <li>Hide the original violation</li>
 * </ul>
 *
 * <h2>Boundary Test</h2>
 * <p>Override audit trail is complete and immutable.</p>
 *
 * @see com.deadlands.rules Rules Layer (what gets overridden)
 */
package com.deadlands.override;
