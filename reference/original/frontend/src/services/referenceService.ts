import api from './api'

export interface SkillReference {
  id: number
  name: string
  description: string
  attribute: 'AGILITY' | 'SMARTS' | 'SPIRIT' | 'STRENGTH' | 'VIGOR'
  defaultValue: string
  isCoreSkill: boolean
}

export interface EdgeReference {
  id: number
  name: string
  description: string
  requirements: string
  type: 'BACKGROUND' | 'COMBAT' | 'LEADERSHIP' | 'PROFESSIONAL' | 'SOCIAL' | 'WEIRD' | 'POWER' | 'LEGENDARY'
  rankRequired: string
}

export interface HindranceReference {
  id: number
  name: string
  description: string
  severity: 'MINOR' | 'MAJOR' | 'EITHER'
  gameEffect: string
}

export interface EquipmentReference {
  id: number
  name: string
  description: string
  type: 'WEAPON_MELEE' | 'WEAPON_RANGED' | 'WEAPON_THROWN' | 'ARMOR' | 'AMMUNITION' | 'GEAR' | 'INFERNAL_DEVICE' | 'CONSUMABLE' | 'VEHICLE' | 'TREASURE'
  damage?: string
  range?: string
  rateOfFire?: number
  shots?: number
  ap?: number
  armorValue?: number
  covers?: string
  weight?: number
  cost?: number
  notes?: string
}

export interface ArcanePowerReference {
  id: number
  name: string
  description: string
  powerPoints: number
  range: string
  duration: string
  trapping: string
}

export interface Skill {
  id?: number
  name: string
  dieValue: string
  skillReferenceId?: number
  notes?: string
}

export interface Edge {
  id?: number
  name: string
  type: string
  description?: string
  edgeReferenceId?: number
  notes?: string
}

export interface Hindrance {
  id?: number
  name: string
  severity: string
  description?: string
  hindranceReferenceId?: number
  notes?: string
}

export interface Equipment {
  id?: number
  name: string
  type: string
  quantity: number
  isEquipped: boolean
  equipmentReferenceId?: number
  description?: string
  notes?: string
}

export interface ArcanePower {
  id?: number
  name: string
  powerPoints: number
  arcanePowerReferenceId?: number
  description?: string
  notes?: string
}

const referenceService = {
  // Skill References
  getSkills: async (): Promise<SkillReference[]> => {
    const response = await api.get('/reference/skills')
    return response.data
  },

  getSkillsByAttribute: async (attribute: string): Promise<SkillReference[]> => {
    const response = await api.get(`/reference/skills/by-attribute/${attribute}`)
    return response.data
  },

  // Edge References
  getEdges: async (): Promise<EdgeReference[]> => {
    const response = await api.get('/reference/edges')
    return response.data
  },

  getEdgesByType: async (type: string): Promise<EdgeReference[]> => {
    const response = await api.get(`/reference/edges/by-type/${type}`)
    return response.data
  },

  // Hindrance References
  getHindrances: async (): Promise<HindranceReference[]> => {
    const response = await api.get('/reference/hindrances')
    return response.data
  },

  getHindrancesBySeverity: async (severity: string): Promise<HindranceReference[]> => {
    const response = await api.get(`/reference/hindrances/by-severity/${severity}`)
    return response.data
  },

  // Equipment References
  getEquipment: async (): Promise<EquipmentReference[]> => {
    const response = await api.get('/reference/equipment')
    return response.data
  },

  getEquipmentByType: async (type: string): Promise<EquipmentReference[]> => {
    const response = await api.get(`/reference/equipment/by-type/${type}`)
    return response.data
  },

  // Arcane Power References
  getArcanePowers: async (): Promise<ArcanePowerReference[]> => {
    const response = await api.get('/reference/powers')
    return response.data
  },
}

export default referenceService
