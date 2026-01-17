/**
 * Rules Layer - Semantic Validation
 *
 * <h2>Responsibility</h2>
 * <p>This layer is responsible for semantic validation:</p>
 * <ul>
 *   <li>Permissions (can this actor do this?)</li>
 *   <li>Game rules (is this action allowed in this phase?)</li>
 *   <li>Domain logic (does this make sense?)</li>
 *   <li>Derived stat calculations</li>
 * </ul>
 *
 * <h2>Key Properties</h2>
 * <ul>
 *   <li>Deterministic - same input always produces same output</li>
 *   <li>Side-effect free - no database writes, no external calls</li>
 *   <li>Violations as data - returns violation objects, never throws exceptions for rule violations</li>
 * </ul>
 *
 * <h2>Prohibitions</h2>
 * <p>This layer must NEVER contain:</p>
 * <ul>
 *   <li>Database operations</li>
 *   <li>External API calls</li>
 *   <li>Structural validation (that belongs in Intent layer)</li>
 * </ul>
 *
 * <h2>Boundary Test</h2>
 * <p>No side effects during rule evaluation. Violations returned as data.</p>
 *
 * @see com.deadlands.intent Intent Layer (structural validation)
 * @see com.deadlands.override Override Layer (GM exceptions)
 */
package com.deadlands.rules;
