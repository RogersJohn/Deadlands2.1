/**
 * API Layer - REST Controllers
 *
 * <h2>Responsibility</h2>
 * <p>This layer is responsible for HTTP interface:</p>
 * <ul>
 *   <li>REST controllers</li>
 *   <li>Request/response DTOs</li>
 *   <li>Exception handling (@ControllerAdvice)</li>
 *   <li>API documentation</li>
 * </ul>
 *
 * <h2>Prohibitions</h2>
 * <p>This layer must NEVER contain:</p>
 * <ul>
 *   <li>Business logic (delegate to Rules layer)</li>
 *   <li>Direct database access (delegate to Persistence layer)</li>
 *   <li>Entity objects in responses (use DTOs)</li>
 * </ul>
 *
 * <h2>Pattern</h2>
 * <p>Controllers follow this flow:</p>
 * <ol>
 *   <li>Receive request</li>
 *   <li>Pass to Intent layer for structural validation</li>
 *   <li>Pass to Rules layer for semantic validation</li>
 *   <li>Pass to Override layer if GM override needed</li>
 *   <li>Pass to Persistence layer to store</li>
 *   <li>Return DTO response</li>
 * </ol>
 */
package com.deadlands.api;
