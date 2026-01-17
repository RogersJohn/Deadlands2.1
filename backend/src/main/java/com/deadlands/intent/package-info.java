/**
 * Intent Layer - Structural Validation
 *
 * <h2>Responsibility</h2>
 * <p>This layer is responsible for structural validation only:</p>
 * <ul>
 *   <li>Required fields are present</li>
 *   <li>Field formats are valid (length, format)</li>
 *   <li>Types are correct</li>
 * </ul>
 *
 * <h2>Prohibitions</h2>
 * <p>This layer must NEVER contain:</p>
 * <ul>
 *   <li>Permission checks (can this actor do this?)</li>
 *   <li>Game rules (is this action allowed in this phase?)</li>
 *   <li>Domain logic (does this make sense?)</li>
 *   <li>Convenience factory methods that encode meaning</li>
 *   <li>Predicate methods (isX(), hasX()) that interpret data</li>
 * </ul>
 *
 * <h2>Boundary Test</h2>
 * <p>Intent validation passes regardless of actor/phase combination.</p>
 *
 * @see com.deadlands.rules Rules Layer (semantic validation)
 */
package com.deadlands.intent;
