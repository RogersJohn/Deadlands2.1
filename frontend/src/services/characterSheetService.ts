/**
 * Character Sheet Service (Phase 2.5a)
 *
 * In-memory storage for character sheets.
 * This is a temporary implementation until backend is available.
 *
 * CRITICAL: This is non-authoritative reference data.
 * Used only for text injection into assistant input.
 */

import type {
  CharacterSheet,
  CharacterSheetCreate,
  CharacterSheetUpdate,
} from '../types/CharacterSheet';

/**
 * Generate a unique ID for new character sheets
 */
function generateId(): string {
  return `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * In-memory storage
 */
let characterSheets: CharacterSheet[] = [];

/**
 * Character Sheet Service
 */
export const characterSheetService = {
  /**
   * Get all character sheets
   */
  getAll(): readonly CharacterSheet[] {
    return [...characterSheets];
  },

  /**
   * Get a character sheet by ID
   */
  getById(id: string): CharacterSheet | undefined {
    return characterSheets.find((sheet) => sheet.id === id);
  },

  /**
   * Create a new character sheet
   */
  create(data: CharacterSheetCreate): CharacterSheet {
    const newSheet: CharacterSheet = {
      id: generateId(),
      name: data.name,
      role: data.role,
      description: data.description,
      skills: data.skills ? [...data.skills] : undefined,
      equipment: data.equipment ? [...data.equipment] : undefined,
      notes: data.notes,
    };
    characterSheets = [...characterSheets, newSheet];
    return newSheet;
  },

  /**
   * Update an existing character sheet
   */
  update(id: string, data: CharacterSheetUpdate): CharacterSheet | undefined {
    const index = characterSheets.findIndex((sheet) => sheet.id === id);
    if (index === -1) {
      return undefined;
    }

    const existing = characterSheets[index];
    const updated: CharacterSheet = {
      ...existing,
      ...data,
      id: existing.id, // ID cannot be changed
    };

    characterSheets = [
      ...characterSheets.slice(0, index),
      updated,
      ...characterSheets.slice(index + 1),
    ];

    return updated;
  },

  /**
   * Delete a character sheet
   */
  delete(id: string): boolean {
    const index = characterSheets.findIndex((sheet) => sheet.id === id);
    if (index === -1) {
      return false;
    }

    characterSheets = [
      ...characterSheets.slice(0, index),
      ...characterSheets.slice(index + 1),
    ];

    return true;
  },

  /**
   * Clear all character sheets (for testing)
   */
  clear(): void {
    characterSheets = [];
  },

  /**
   * Load initial data (for testing/demo)
   */
  loadInitialData(sheets: CharacterSheet[]): void {
    characterSheets = [...sheets];
  },
};
