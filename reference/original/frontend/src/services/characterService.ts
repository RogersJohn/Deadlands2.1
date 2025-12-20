import api from './api'
import { Skill, Edge, Hindrance, Equipment, ArcanePower } from './referenceService'

// Power interface for character powers (matches backend ArcanePowerDTO)
export interface Power {
  id: number
  name: string
  description: string
  powerPoints: number
  range: string
  duration: string
  effect: string
  traitRoll: string
  arcaneBackgrounds: string
}

export interface Character {
  id?: number
  name: string
  occupation: string
  pace: number
  size: number
  wind: number
  grit: number
  // Savage Worlds Attributes
  agilityDie: string
  smartsDie: string
  spiritDie: string
  strengthDie: string
  vigorDie: string
  // Derived Stats (Savage Worlds)
  parry: number
  toughness: number
  charisma: number
  // XP Tracking
  totalXp?: number
  spentXp?: number
  // Power Points and Fate Chips (Savage Worlds)
  currentPowerPoints?: number
  maxPowerPoints?: number
  fateChips?: number
  // Combat State (Savage Worlds)
  woundCount?: number
  isShaken?: boolean
  // Legacy Deadlands Classic Attributes (deprecated)
  cognitionDie?: string
  deftnessDie?: string
  nimblenessDie?: string
  quicknessDie?: string
  notes?: string
  characterImageUrl?: string
  isNpc: boolean
  // Nested entities
  skills?: Skill[]
  edges?: Edge[]
  hindrances?: Hindrance[]
  equipment?: Equipment[]
  arcanePowers?: ArcanePower[]
  powers?: Power[]  // Powers known by this character (from backend DTO)
}

const characterService = {
  getAll: async (): Promise<Character[]> => {
    const response = await api.get('/characters')
    return response.data
  },

  getById: async (id: number): Promise<Character> => {
    const response = await api.get(`/characters/${id}`)
    return response.data
  },

  create: async (character: Character): Promise<Character> => {
    const response = await api.post('/characters', character)
    return response.data
  },

  update: async (id: number, character: Partial<Character>): Promise<Character> => {
    const response = await api.put(`/characters/${id}`, character)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/characters/${id}`)
  },

  // Power Points management
  spendPowerPoints: async (id: number, amount: number): Promise<{currentPowerPoints: number, maxPowerPoints: number}> => {
    const response = await api.post(`/characters/${id}/power-points/spend`, { amount })
    return response.data
  },

  restorePowerPoints: async (id: number, amount: number): Promise<{currentPowerPoints: number, maxPowerPoints: number}> => {
    const response = await api.post(`/characters/${id}/power-points/restore`, { amount })
    return response.data
  },

  // Fate Chips management
  spendFateChip: async (id: number): Promise<{fateChips: number}> => {
    const response = await api.post(`/characters/${id}/fate-chips/spend`)
    return response.data
  },

  gainFateChip: async (id: number): Promise<{fateChips: number}> => {
    const response = await api.post(`/characters/${id}/fate-chips/gain`)
    return response.data
  },

  // Combat actions
  applyDamage: async (id: number, damage: number): Promise<{woundCount: number, isShaken: boolean, isIncapacitated: boolean}> => {
    const response = await api.post(`/characters/${id}/combat/damage`, { damage })
    return response.data
  },

  soakDamage: async (id: number, vigorRoll: number): Promise<{woundCount: number, woundsRemoved: number, fateChips: number, vigorRoll: number}> => {
    const response = await api.post(`/characters/${id}/combat/soak`, { vigorRoll })
    return response.data
  },

  recoverFromShaken: async (id: number, spiritRoll: number): Promise<{isShaken: boolean, recovered: boolean, spiritRoll: number}> => {
    const response = await api.post(`/characters/${id}/combat/recover`, { spiritRoll })
    return response.data
  },

  // Power casting
  castPower: async (
    id: number,
    powerReferenceId: number,
    targetId?: number,
    gridX?: number,
    gridY?: number
  ): Promise<{
    currentPowerPoints: number,
    maxPowerPoints: number,
    powerCast: string,
    powerEffect: string,
    powerCost: number,
    targetId: number
  }> => {
    const response = await api.post(`/characters/${id}/powers/cast`, {
      powerReferenceId,
      targetId,
      gridX,
      gridY
    })
    return response.data
  },
}

export default characterService
