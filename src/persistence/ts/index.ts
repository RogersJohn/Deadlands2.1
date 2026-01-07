/**
 * NOTE: These exports are provisional and internal to the
 * TypeScript implementation of Override Persistence.
 * The authoritative design is defined in PR 3.0.
 */

export type {
  PersistedInvocation,
  PersistedOverride,
  PersistenceViolation,
  Tombstone,
} from './types';

export { PersistenceViolationCode } from './types';

export type {
  InvocationStore,
  OverrideStore,
  TombstoneStore,
} from './stores';

export {
  persistInvocation,
  persistOverride,
  resolveEffectiveInvocationFromPersistence,
} from './persistence';
