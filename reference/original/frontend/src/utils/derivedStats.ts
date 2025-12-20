import { Character } from '../services/characterService'
import { Skill, Edge, Hindrance } from '../services/referenceService'

/**
 * Convert die notation (d4, d6, d8, d10, d12) to numeric value
 */
export const dieToNumber = (die: string): number => {
  if (die.includes('d4')) return 4
  if (die.includes('d6')) return 6
  if (die.includes('d8')) return 8
  if (die.includes('d10')) return 10
  if (die.includes('d12')) return 12
  return 4 // default
}

/**
 * Calculate Parry = 2 + (Fighting skill / 2)
 * Default is 2 if character has no Fighting skill
 */
export const calculateParry = (skills?: Skill[]): number => {
  if (!skills) return 2

  const fightingSkill = skills.find(
    (s) => s.name === 'Fighting' || s.name === "Fightin'"
  )

  if (!fightingSkill) return 2

  const skillDie = dieToNumber(fightingSkill.dieValue)
  return 2 + Math.floor(skillDie / 2)
}

/**
 * Calculate Toughness = 2 + (Vigor / 2) + Armor
 * Armor value comes from equipped armor (if any)
 */
export const calculateToughness = (vigorDie: string, equipment?: any[]): number => {
  const vigor = dieToNumber(vigorDie)
  const baseToughness = 2 + Math.floor(vigor / 2)

  // TODO: Add armor calculation when equipment has armor values
  // For now, just return base toughness
  return baseToughness
}

/**
 * Calculate Charisma from edges and hindrances
 * Charisma modifying edges/hindrances:
 * - Attractive: +2
 * - Very Attractive: +4
 * - Purty: +2
 * - Ugly: -2
 * - Mean: -2
 */
export const calculateCharisma = (edges?: Edge[], hindrances?: Hindrance[]): number => {
  let charisma = 0

  // Check edges
  if (edges) {
    edges.forEach((edge) => {
      if (edge.name === 'Attractive') charisma += 2
      if (edge.name === 'Very Attractive') charisma += 4
      if (edge.name === 'Purty') charisma += 2
    })
  }

  // Check hindrances
  if (hindrances) {
    hindrances.forEach((hindrance) => {
      if (hindrance.name === 'Ugly') charisma -= 2
      if (hindrance.name === 'Mean') charisma -= 2
    })
  }

  return charisma
}

/**
 * Calculate all derived stats for a character
 */
export const calculateAllDerivedStats = (
  character: Partial<Character>
): { parry: number; toughness: number; charisma: number } => {
  return {
    parry: calculateParry(character.skills),
    toughness: calculateToughness(character.vigorDie || 'd6', character.equipment),
    charisma: calculateCharisma(character.edges, character.hindrances),
  }
}
