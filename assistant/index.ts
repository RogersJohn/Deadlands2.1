/**
 * Assistant Layer - Rules Assistant Logic Layer for Savage Worlds: Deadlands
 *
 * This module provides suggested rulings based on common
 * Savage Worlds: Deadlands interpretations.
 *
 * Output is advisory, not authoritative.
 * Assumptions are explicit and challengeable.
 *
 * ## Key Features
 * - Natural language → suggested roll
 * - Explicit assumption tracking
 * - Deterministic and testable
 * - No frontend dependencies
 * - No engine modifications required
 *
 * ## Usage
 * ```typescript
 * import { createAssistantEngine, createAssistantInput } from './assistant';
 *
 * const engine = createAssistantEngine();
 * const input = createAssistantInput("Alice shoots at Bob while galloping on a horse, Bob is 100 yards away");
 * const result = engine.process(input);
 *
 * console.log(result.suggestedRoll);  // { trait: "Shooting", targetNumber: 4 }
 * console.log(result.modifiers);       // [{ label: "Long Range", value: -4, ... }, { label: "Unstable Platform", value: -2, ... }]
 * console.log(result.netModifier);     // -6
 * console.log(result.assumptions);     // [{ statement: "...", confidence: "medium", ... }]
 * ```
 *
 * ## Architecture
 * - /types     - Input/output contracts
 * - /parsing   - Intent parsing and entity extraction
 * - /rules     - Savage Worlds and Deadlands heuristics
 * - /core      - Main engine and orchestration
 * - /__tests__ - Comprehensive test suite
 */

// Types
export type {
  GameSystem,
  AssistantInput,
  AssumptionConfidence,
  AssumptionCategory,
  Assumption,
  RollModifier,
  SuggestedRoll,
  AssistantOutput,
} from './types';

export { createAssistantInput, createAssumption, createAssistantOutput } from './types';

// Parsing
export type { ExtractedEntities, ActionType, ParsedIntent } from './parsing';
export { EntityExtractor, IntentParser } from './parsing';

// Rules
export type { RangeBand, CoverType, LightingCondition } from './rules';
export {
  TARGET_NUMBERS,
  RANGE_MODIFIERS,
  COVER_MODIFIERS,
  LIGHTING_MODIFIERS,
  MOVEMENT_MODIFIERS,
  SITUATIONAL_MODIFIERS,
  WEAPON_RANGES,
  getRangeBand,
  getRangeModifier,
  DEADLANDS_SKILLS,
  FEAR_MODIFIERS,
  DEADLANDS_ENVIRONMENTS,
  DEADLANDS_WEAPON_NOTES,
  getGritBonus,
  detectArcaneBackground,
  detectEnvironment,
} from './rules';

// Core
export type { AssistantContext, ModifierContext } from './core';
export {
  AssumptionTracker,
  AssistantContextBuilder,
  ModifierResolver,
  RollSuggester,
  AssistantEngine,
  createAssistantEngine,
} from './core';
