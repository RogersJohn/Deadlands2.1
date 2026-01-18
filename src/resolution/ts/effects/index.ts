/**
 * Effect Factory Functions
 *
 * Each effect type has a dedicated factory function.
 * All factories are pure functions that produce immutable Effect objects.
 */

export { createApplyConditionEffect } from './ApplyCondition';
export type { ApplyConditionParameters } from './ApplyCondition';

export { createConsumeResourceEffect } from './ConsumeResource';
export type { ConsumeResourceParameters } from './ConsumeResource';

export { createDealDamageEffect } from './DealDamage';
export type { DealDamageParameters } from './DealDamage';

export { createChangePositionEffect } from './ChangePosition';
export type { ChangePositionParameters } from './ChangePosition';

export { createTriggerNarrativeEffect } from './TriggerNarrative';
export type { TriggerNarrativeParameters } from './TriggerNarrative';

export { createGrantResourceEffect } from './GrantResource';
export type { GrantResourceParameters } from './GrantResource';

export { createRemoveConditionEffect } from './RemoveCondition';
export type { RemoveConditionParameters } from './RemoveCondition';
