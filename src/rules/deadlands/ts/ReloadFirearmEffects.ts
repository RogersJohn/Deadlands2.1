/**
 * Reload Firearm Effects (PR 4.0)
 *
 * Produces declarative effects when reload is authorized.
 *
 * EFFECTS DISCIPLINE:
 * Effects are DECLARATIVE ONLY - they describe what SHOULD happen,
 * not what HAS happened. Effects are pure data structures with no
 * side effects, no state mutation, no dice rolling.
 *
 * The persistence layer (not this module) is responsible for:
 * - Actually consuming actions
 * - Actually updating ammo counts
 * - Actually logging to game history
 *
 * WHEN EFFECTS ARE PRODUCED:
 * - ONLY on effectiveOutcome = PASS
 * - NEVER on FAIL or AMBIGUOUS
 * - When GM overrides to PASS, effects are produced with OVERRIDE authority
 *
 * Effects produced on PASS:
 * - CONSUME_RESOURCE: Consume 1 action (reload takes an action)
 * - TRIGGER_NARRATIVE: Log the reload for narrative purposes
 *
 * EXPLICITLY OUT OF SCOPE (intentional, not TODO):
 * - Ammo quantity effects (we only check legality, not track counts)
 * - Weapon state effects (we don't track loaded/unloaded state)
 * - Variable action costs (all reloads cost 1 action in this implementation)
 */

import type {
  AuthoritativeDecision,
  Effect,
} from '../../../resolution/ts/types';
import { EffectType } from '../../../resolution/ts/types';
import {
  createEffectAuthority,
  generateEffectId,
} from '../../../resolution/ts/Resolution';
import type { ReloadFirearmPayload } from './ReloadFirearm';

/**
 * Produce effects for a successful reload
 *
 * This function is registered with the EffectProducerRegistry.
 * It is ONLY called when effectiveOutcome is PASS.
 *
 * Effects:
 * 1. Consume 1 action (standard reload action cost in Savage Worlds)
 * 2. Mark weapon as reloading (narrative effect)
 */
export function produceReloadFirearmEffects(
  decision: AuthoritativeDecision
): readonly Effect[] {
  const payload = decision.originalReport.payload as ReloadFirearmPayload;
  const authority = createEffectAuthority(decision);
  const invocationId = decision.originalReport.invocationId;

  const effects: Effect[] = [];

  // Effect 1: Consume action (Savage Worlds reload costs 1 action by default)
  effects.push({
    effectId: generateEffectId(invocationId, EffectType.CONSUME_RESOURCE, payload.characterId, 0),
    effectType: EffectType.CONSUME_RESOURCE,
    target: {
      targetId: payload.characterId,
      targetType: 'character',
    },
    authority,
    parameters: {
      resourceName: 'action',
      amount: 1,
      reason: 'Reload firearm',
    },
    description: `${payload.characterId} spends 1 action to reload ${payload.weaponId}`,
  });

  // Effect 2: Narrative log of the reload
  effects.push({
    effectId: generateEffectId(invocationId, EffectType.TRIGGER_NARRATIVE, payload.weaponId, 1),
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId: payload.weaponId,
      targetType: 'weapon',
    },
    authority,
    parameters: {
      narrativeDescriptor: `Reload: ${payload.characterId} reloads their ${payload.weaponId}`,
      category: 'combat_action',
    },
    description: `Reload action logged for narrative purposes`,
  });

  return effects;
}
