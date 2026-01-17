/**
 * Persistence Layer - Storage Operations
 *
 * <h2>Responsibility</h2>
 * <p>This layer is responsible for all storage operations:</p>
 * <ul>
 *   <li>Entity definitions (JPA entities)</li>
 *   <li>Repository interfaces</li>
 *   <li>Database migrations (Flyway)</li>
 * </ul>
 *
 * <h2>Prohibitions</h2>
 * <p>This layer must NEVER contain:</p>
 * <ul>
 *   <li>Business logic</li>
 *   <li>Validation rules</li>
 *   <li>Permission checks</li>
 * </ul>
 *
 * @see com.deadlands.rules Rules Layer (business logic)
 */
package com.deadlands.persistence;
