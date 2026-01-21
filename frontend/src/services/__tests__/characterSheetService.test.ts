/**
 * Character Sheet Service Tests (Phase 2.5a)
 *
 * Tests for CRUD operations on character sheets.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { characterSheetService } from '../characterSheetService';
import type { CharacterSheet, CharacterSheetCreate } from '../../types/CharacterSheet';

describe('characterSheetService', () => {
  beforeEach(() => {
    characterSheetService.clear();
  });

  describe('create', () => {
    it('creates a character sheet with required fields', () => {
      const data: CharacterSheetCreate = {
        name: 'Alice',
        role: 'PC',
        description: 'A gunslinger',
      };

      const result = characterSheetService.create(data);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Alice');
      expect(result.role).toBe('PC');
      expect(result.description).toBe('A gunslinger');
    });

    it('creates a character sheet with optional fields', () => {
      const data: CharacterSheetCreate = {
        name: 'Bob',
        role: 'NPC',
        description: 'A bartender',
        skills: ['Notice d6', 'Persuasion d8'],
        equipment: ['shotgun', 'apron'],
        notes: 'Runs the local saloon',
      };

      const result = characterSheetService.create(data);

      expect(result.skills).toEqual(['Notice d6', 'Persuasion d8']);
      expect(result.equipment).toEqual(['shotgun', 'apron']);
      expect(result.notes).toBe('Runs the local saloon');
    });

    it('generates unique IDs for each character', () => {
      const data1: CharacterSheetCreate = {
        name: 'Alice',
        role: 'PC',
        description: 'Test 1',
      };
      const data2: CharacterSheetCreate = {
        name: 'Bob',
        role: 'NPC',
        description: 'Test 2',
      };

      const result1 = characterSheetService.create(data1);
      const result2 = characterSheetService.create(data2);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('getAll', () => {
    it('returns empty array when no characters exist', () => {
      const result = characterSheetService.getAll();

      expect(result).toEqual([]);
    });

    it('returns all created characters', () => {
      characterSheetService.create({
        name: 'Alice',
        role: 'PC',
        description: 'Test 1',
      });
      characterSheetService.create({
        name: 'Bob',
        role: 'NPC',
        description: 'Test 2',
      });

      const result = characterSheetService.getAll();

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.name)).toEqual(['Alice', 'Bob']);
    });
  });

  describe('getById', () => {
    it('returns undefined for non-existent ID', () => {
      const result = characterSheetService.getById('nonexistent');

      expect(result).toBeUndefined();
    });

    it('returns the correct character', () => {
      const created = characterSheetService.create({
        name: 'Alice',
        role: 'PC',
        description: 'Test',
      });

      const result = characterSheetService.getById(created.id);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Alice');
    });
  });

  describe('update', () => {
    it('returns undefined for non-existent ID', () => {
      const result = characterSheetService.update('nonexistent', {
        name: 'New Name',
      });

      expect(result).toBeUndefined();
    });

    it('updates specified fields', () => {
      const created = characterSheetService.create({
        name: 'Alice',
        role: 'PC',
        description: 'Original description',
      });

      const result = characterSheetService.update(created.id, {
        description: 'Updated description',
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Alice'); // Unchanged
      expect(result?.description).toBe('Updated description');
    });

    it('does not change ID', () => {
      const created = characterSheetService.create({
        name: 'Alice',
        role: 'PC',
        description: 'Test',
      });
      const originalId = created.id;

      const result = characterSheetService.update(created.id, {
        name: 'New Name',
      });

      expect(result?.id).toBe(originalId);
    });
  });

  describe('delete', () => {
    it('returns false for non-existent ID', () => {
      const result = characterSheetService.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('removes the character', () => {
      const created = characterSheetService.create({
        name: 'Alice',
        role: 'PC',
        description: 'Test',
      });

      const deleteResult = characterSheetService.delete(created.id);
      const getResult = characterSheetService.getById(created.id);

      expect(deleteResult).toBe(true);
      expect(getResult).toBeUndefined();
    });

    it('does not affect other characters', () => {
      const alice = characterSheetService.create({
        name: 'Alice',
        role: 'PC',
        description: 'Test 1',
      });
      const bob = characterSheetService.create({
        name: 'Bob',
        role: 'NPC',
        description: 'Test 2',
      });

      characterSheetService.delete(alice.id);

      const remaining = characterSheetService.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe('Bob');
    });
  });

  describe('loadInitialData', () => {
    it('loads provided character sheets', () => {
      const initialData: CharacterSheet[] = [
        {
          id: 'preset-1',
          name: 'Preset Alice',
          role: 'PC',
          description: 'Preset description',
        },
        {
          id: 'preset-2',
          name: 'Preset Bob',
          role: 'NPC',
          description: 'Another preset',
        },
      ];

      characterSheetService.loadInitialData(initialData);
      const result = characterSheetService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('preset-1');
      expect(result[1].id).toBe('preset-2');
    });
  });
});
