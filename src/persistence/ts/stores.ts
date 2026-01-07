/**
 * Storage-Agnostic Store Interfaces
 *
 * These interfaces define the persistence contract.
 * Implementations are provided externally (database, file, memory, etc.)
 */

import {
  PersistedInvocation,
  PersistedOverride,
  PersistenceViolation,
  Tombstone,
} from './types';

export interface InvocationStore {
  writeInvocation(invocation: PersistedInvocation):
    | { kind: 'ok' }
    | { kind: 'violation'; violation: PersistenceViolation };

  readInvocation(invocationId: string):
    | { kind: 'found'; invocation: PersistedInvocation }
    | { kind: 'not_found' };
}

export interface OverrideStore {
  writeOverride(override: PersistedOverride):
    | { kind: 'ok' }
    | { kind: 'violation'; violation: PersistenceViolation };

  readOverridesForInvocation(invocationId: string):
    PersistedOverride[];
}

export interface TombstoneStore {
  writeTombstone(tombstone: Tombstone):
    | { kind: 'ok' }
    | { kind: 'violation'; violation: PersistenceViolation };

  readTombstones(targetId: string):
    Tombstone[];
}
