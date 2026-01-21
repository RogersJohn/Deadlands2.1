/**
 * AppMode Type (PR #2 - Frontend Assistant Mode)
 *
 * Defines the two operational modes for the application.
 * Mode switching is explicit and manual - no automatic transitions.
 */

/**
 * Application modes
 * - "assistant": Natural language input → suggested roll output
 * - "audit": Intent Declaration Console (existing mode)
 */
export type AppMode = "assistant" | "audit";
