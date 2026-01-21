/**
 * AppMode Type (PR #2 - Frontend Assistant Mode, Phase 2.5a)
 *
 * Defines the operational modes for the application.
 * Mode switching is explicit and manual - no automatic transitions.
 */

/**
 * Application modes
 * - "assistant": Natural language input → suggested roll output
 * - "characters": Character sheet management
 * - "audit": Intent Declaration Console (existing mode)
 */
export type AppMode = "assistant" | "characters" | "audit";
