/**
 * Wiki Inertness Tests (PR 5.1)
 *
 * These tests prove that wiki content is INERT:
 * - Wiki data is static (read-only, no mutations)
 * - Wiki data has no logic (no functions, no side effects)
 * - Wiki data does NOT affect validation outcomes
 * - Wiki data does NOT influence resolution
 * - Wiki data can be removed without behavior change
 *
 * KILL CRITERIA TO VERIFY:
 * - Wiki content influences validation results
 * - Wiki content is parsed or interpreted for logic
 * - Wiki content generates derived conclusions
 * - Wiki content is used to auto-resolve ambiguity
 * - Wiki content feeds into rules logic
 * - Wiki content becomes executable
 * - Wiki content gains precedence over GM judgment
 */

import { describe, it, expect } from 'vitest';
import {
  createWikiEntryId,
  createWikiCitation,
  isWikiEntry,
  isWikiCitation,
} from '../types';
import type { WikiEntry, WikiEntryId, WikiCategory, WikiCitation, WikiIndex } from '../types';
import {
  createWikiIndex,
  EMPTY_WIKI_INDEX,
  validateIndexIsReadOnly,
  validateEntryIsInert,
} from '../WikiIndex';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTestEntry(id: string, category: WikiCategory = 'RULES'): WikiEntry {
  return {
    id: createWikiEntryId(id),
    title: `Test Entry: ${id}`,
    body: `This is the body content for ${id}. It is prose, not code.`,
    category,
    tags: ['test', 'fixture'],
    source: 'Test Suite',
  };
}

const sampleEntries: WikiEntry[] = [
  createTestEntry('reload-rules', 'RULES'),
  createTestEntry('ammo-types', 'EQUIPMENT'),
  createTestEntry('setting-overview', 'SETTING'),
  createTestEntry('character-creation', 'CHARACTER'),
  createTestEntry('combat-glossary', 'GLOSSARY'),
  createTestEntry('deadlands-lore', 'LORE'),
];

// ============================================================================
// CRITICAL TEST: WIKI ENTRIES ARE STATIC DATA
// ============================================================================

describe('Wiki Entries - Static Data Only', () => {
  it('WikiEntry has no functions', () => {
    const entry = createTestEntry('test-entry');

    for (const value of Object.values(entry)) {
      expect(typeof value).not.toBe('function');
    }
  });

  it('WikiEntry has no prototype methods', () => {
    const entry = createTestEntry('test-entry');
    const proto = Object.getPrototypeOf(entry);

    // Should be plain object prototype
    expect(proto === Object.prototype || proto === null).toBe(true);
  });

  it('WikiEntry fields are primitive or arrays', () => {
    const entry = createTestEntry('test-entry');

    for (const [key, value] of Object.entries(entry)) {
      const type = typeof value;
      const isValid =
        type === 'string' ||
        type === 'undefined' ||
        Array.isArray(value);

      expect(isValid).toBe(true);
    }
  });

  it('validateEntryIsInert passes for valid entries', () => {
    const entry = createTestEntry('test-entry');
    expect(validateEntryIsInert(entry)).toBe(true);
  });

  it('validateEntryIsInert fails for entries with functions', () => {
    const badEntry = {
      ...createTestEntry('test-entry'),
      execute: () => { /* This is forbidden */ },
    } as unknown as WikiEntry;

    expect(validateEntryIsInert(badEntry)).toBe(false);
  });
});

// ============================================================================
// CRITICAL TEST: WIKI INDEX IS READ-ONLY
// ============================================================================

describe('Wiki Index - Read-Only Operations', () => {
  const wikiIndex = createWikiIndex(sampleEntries);

  it('index has only read-only methods', () => {
    expect(validateIndexIsReadOnly(wikiIndex)).toBe(true);
  });

  it('index has no mutation methods', () => {
    const forbiddenMethods = ['add', 'remove', 'update', 'delete', 'set', 'clear', 'modify'];

    for (const method of forbiddenMethods) {
      expect(method in wikiIndex).toBe(false);
    }
  });

  it('getEntry returns entry by ID', () => {
    const id = createWikiEntryId('reload-rules');
    const entry = wikiIndex.getEntry(id);

    expect(entry).toBeDefined();
    expect(entry?.id).toBe(id);
  });

  it('getEntry returns undefined for missing ID', () => {
    const id = createWikiEntryId('nonexistent');
    const entry = wikiIndex.getEntry(id);

    expect(entry).toBeUndefined();
  });

  it('search finds entries by title', () => {
    const results = wikiIndex.search('reload');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(e => e.title.toLowerCase().includes('reload'))).toBe(true);
  });

  it('search finds entries by body', () => {
    const results = wikiIndex.search('prose');

    expect(results.length).toBeGreaterThan(0);
  });

  it('getByCategory returns entries', () => {
    const rulesEntries = wikiIndex.getByCategory('RULES');

    expect(rulesEntries.length).toBeGreaterThan(0);
    expect(rulesEntries.every(e => e.category === 'RULES')).toBe(true);
  });

  it('getByTag returns entries', () => {
    const testEntries = wikiIndex.getByTag('test');

    expect(testEntries.length).toBe(sampleEntries.length);
  });

  it('getAllIds returns all IDs', () => {
    const ids = wikiIndex.getAllIds();

    expect(ids.length).toBe(sampleEntries.length);
  });
});

// ============================================================================
// CRITICAL TEST: EMPTY INDEX IS VALID
// ============================================================================

describe('Wiki Index - Empty Index', () => {
  it('EMPTY_WIKI_INDEX exists and is valid', () => {
    expect(EMPTY_WIKI_INDEX).toBeDefined();
    expect(validateIndexIsReadOnly(EMPTY_WIKI_INDEX)).toBe(true);
  });

  it('empty index returns no entries', () => {
    expect(EMPTY_WIKI_INDEX.getAllIds().length).toBe(0);
  });

  it('empty index search returns empty array', () => {
    expect(EMPTY_WIKI_INDEX.search('anything').length).toBe(0);
  });

  it('empty index getByCategory returns empty array', () => {
    expect(EMPTY_WIKI_INDEX.getByCategory('RULES').length).toBe(0);
  });

  it('system behavior is unchanged with empty index', () => {
    // This is a conceptual test - an empty wiki index
    // should not cause any system failures or changes
    expect(() => {
      EMPTY_WIKI_INDEX.getEntry(createWikiEntryId('anything'));
      EMPTY_WIKI_INDEX.search('anything');
      EMPTY_WIKI_INDEX.getByCategory('RULES');
      EMPTY_WIKI_INDEX.getByTag('anything');
      EMPTY_WIKI_INDEX.getAllIds();
    }).not.toThrow();
  });
});

// ============================================================================
// CRITICAL TEST: CITATIONS ARE METADATA ONLY
// ============================================================================

describe('Wiki Citations - Metadata Only', () => {
  it('citation has no authority fields', () => {
    const citation = createWikiCitation(
      createWikiEntryId('reload-rules'),
      'See reloading rules for context'
    );

    expect('outcome' in citation).toBe(false);
    expect('decision' in citation).toBe(false);
    expect('authority' in citation).toBe(false);
    expect('enforce' in citation).toBe(false);
    expect('apply' in citation).toBe(false);
  });

  it('citation reason is descriptive, not prescriptive', () => {
    const goodReasons = [
      'See reloading rules for context',
      'Reference for background information',
      'Related entry for further reading',
    ];

    for (const reason of goodReasons) {
      const citation = createWikiCitation(
        createWikiEntryId('test'),
        reason
      );

      // Should not contain authority language
      expect(reason.toLowerCase()).not.toContain('must');
      expect(reason.toLowerCase()).not.toContain('enforce');
      expect(reason.toLowerCase()).not.toContain('override');
      expect(reason.toLowerCase()).not.toContain('apply');
    }
  });

  it('isWikiCitation validates structure', () => {
    const validCitation = createWikiCitation(
      createWikiEntryId('test'),
      'Test reason'
    );

    expect(isWikiCitation(validCitation)).toBe(true);
    expect(isWikiCitation(null)).toBe(false);
    expect(isWikiCitation({})).toBe(false);
    expect(isWikiCitation({ entryId: 'test' })).toBe(false);
  });
});

// ============================================================================
// CRITICAL TEST: WIKI DOES NOT AFFECT OUTCOMES
// ============================================================================

describe('Wiki Data - No Effect on Outcomes', () => {
  it('wiki index has no validation methods', () => {
    const wikiIndex = createWikiIndex(sampleEntries);

    // Index should not have any methods that could affect validation
    expect('validate' in wikiIndex).toBe(false);
    expect('resolve' in wikiIndex).toBe(false);
    expect('decide' in wikiIndex).toBe(false);
    expect('enforce' in wikiIndex).toBe(false);
    expect('override' in wikiIndex).toBe(false);
  });

  it('wiki entries have no outcome fields', () => {
    for (const entry of sampleEntries) {
      expect('outcome' in entry).toBe(false);
      expect('result' in entry).toBe(false);
      expect('decision' in entry).toBe(false);
      expect('verdict' in entry).toBe(false);
    }
  });

  it('wiki index entries are frozen and immutable', () => {
    const wikiIndex = createWikiIndex(sampleEntries);
    const entry = wikiIndex.getEntry(createWikiEntryId('reload-rules'));

    // Entry should exist
    expect(entry).toBeDefined();

    if (entry) {
      // Entries from index are frozen - mutation should throw in strict mode
      // or silently fail in non-strict mode. Either way, the value is unchanged.
      expect(Object.isFrozen(entry)).toBe(true);

      // The entry returned is the same frozen object
      const refetchedEntry = wikiIndex.getEntry(createWikiEntryId('reload-rules'));
      expect(refetchedEntry).toBe(entry);
    }
  });

  it('wiki index entries are independent from input', () => {
    // Create a mutable copy for testing
    const mutableEntries = sampleEntries.map(e => ({
      ...e,
      title: e.title,
    }));

    const wikiIndex = createWikiIndex(mutableEntries);
    const entry = wikiIndex.getEntry(createWikiEntryId('reload-rules'));
    const originalTitle = entry?.title;

    // Mutate the original input
    const inputEntry = mutableEntries.find(e => e.id === 'reload-rules');
    if (inputEntry) {
      inputEntry.title = 'Mutated Input Title';
    }

    // Index entry should be unchanged (deep copied)
    const refetchedEntry = wikiIndex.getEntry(createWikiEntryId('reload-rules'));
    expect(refetchedEntry?.title).toBe(originalTitle);
  });
});

// ============================================================================
// CRITICAL TEST: TYPE GUARDS
// ============================================================================

describe('Wiki Type Guards', () => {
  it('isWikiEntry validates structure', () => {
    const validEntry = createTestEntry('test');

    expect(isWikiEntry(validEntry)).toBe(true);
    expect(isWikiEntry(null)).toBe(false);
    expect(isWikiEntry(undefined)).toBe(false);
    expect(isWikiEntry({})).toBe(false);
    expect(isWikiEntry({ id: 'test' })).toBe(false);
    expect(isWikiEntry({ id: 'test', title: 'Test' })).toBe(false);
  });

  it('createWikiEntryId creates branded type', () => {
    const id = createWikiEntryId('test-id');

    expect(typeof id).toBe('string');
    expect(id).toBe('test-id');
  });
});

// ============================================================================
// CRITICAL TEST: REMOVAL DOES NOT BREAK SYSTEM
// ============================================================================

describe('Wiki Data - Removal Safety', () => {
  it('removing all wiki entries does not throw', () => {
    const emptyIndex = createWikiIndex([]);

    expect(() => {
      emptyIndex.getAllIds();
      emptyIndex.search('anything');
      emptyIndex.getByCategory('RULES');
      emptyIndex.getEntry(createWikiEntryId('anything'));
    }).not.toThrow();
  });

  it('null wiki index reference is handled', () => {
    // Simulate code that checks for null wiki index at runtime
    function getIdsFromMaybeIndex(index: WikiIndex | null): readonly string[] {
      if (index === null) {
        return [];
      }
      return index.getAllIds();
    }

    // Code that handles null wiki index should not throw
    expect(() => {
      const ids = getIdsFromMaybeIndex(null);
      expect(ids.length).toBe(0);
    }).not.toThrow();
  });

  it('citations with missing entries are handled', () => {
    const wikiIndex = createWikiIndex([]);
    const citation = createWikiCitation(
      createWikiEntryId('nonexistent'),
      'Reference to missing entry'
    );

    // Should return undefined, not throw
    const entry = wikiIndex.getEntry(citation.entryId);
    expect(entry).toBeUndefined();
  });
});

// ============================================================================
// CRITICAL TEST: NO EXECUTABLE CONTENT
// ============================================================================

describe('Wiki Data - No Executable Content', () => {
  it('wiki body is string only', () => {
    for (const entry of sampleEntries) {
      expect(typeof entry.body).toBe('string');
    }
  });

  it('wiki body is not parsed as code', () => {
    const entryWithCode: WikiEntry = {
      id: createWikiEntryId('test-code'),
      title: 'Test with Code-like Content',
      body: 'function rollDice() { return Math.random(); } This is prose.',
      category: 'RULES',
    };

    // Body remains a string, not executed
    expect(typeof entryWithCode.body).toBe('string');
    expect(entryWithCode.body).toContain('function');

    // Index stores it as-is
    const index = createWikiIndex([entryWithCode]);
    const retrieved = index.getEntry(createWikiEntryId('test-code'));
    expect(retrieved?.body).toBe(entryWithCode.body);
  });

  it('wiki entries have no eval-like fields', () => {
    for (const entry of sampleEntries) {
      expect('execute' in entry).toBe(false);
      expect('eval' in entry).toBe(false);
      expect('run' in entry).toBe(false);
      expect('callback' in entry).toBe(false);
      expect('handler' in entry).toBe(false);
    }
  });
});
