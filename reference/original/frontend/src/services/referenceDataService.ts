import api from './api'

export interface SkillReference {
  id: number
  name: string
  description: string
  attribute: string
  defaultValue: string
  isCoreSkill: boolean
}

export interface EdgeReference {
  id: number
  name: string
  description: string
  requirements: string
  type: string
  rankRequired: string
}

export interface HindranceReference {
  id: number
  name: string
  description: string
  severity: string
  gameEffect: string
}

export interface EquipmentReference {
  id: number
  name: string
  description: string
  type: string
  damage?: string
  range?: string
  rateOfFire?: number
  shots?: number
  armorPiercing?: number
  weight?: number
  cost?: number
  notes?: string
  armorValue?: number
  covers?: string
}

export interface ArcanePowerReference {
  id: number
  name: string
  description: string
  powerPoints?: number
  range?: string
  duration?: string
  traitRoll?: string
  effect?: string
  arcaneBackgrounds?: string
  isTrapping: boolean
}

const referenceDataService = {
  // Skills
  getAllSkills: async (): Promise<SkillReference[]> => {
    const response = await api.get('/reference/skills')
    return response.data
  },

  getSkillById: async (id: number): Promise<SkillReference> => {
    const response = await api.get(`/reference/skills/${id}`)
    return response.data
  },

  // Edges
  getAllEdges: async (): Promise<EdgeReference[]> => {
    const response = await api.get('/reference/edges')
    return response.data
  },

  getEdgeById: async (id: number): Promise<EdgeReference> => {
    const response = await api.get(`/reference/edges/${id}`)
    return response.data
  },

  // Hindrances
  getAllHindrances: async (): Promise<HindranceReference[]> => {
    const response = await api.get('/reference/hindrances')
    return response.data
  },

  getHindranceById: async (id: number): Promise<HindranceReference> => {
    const response = await api.get(`/reference/hindrances/${id}`)
    return response.data
  },

  // Equipment
  getAllEquipment: async (): Promise<EquipmentReference[]> => {
    const response = await api.get('/reference/equipment')
    return response.data
  },

  getEquipmentById: async (id: number): Promise<EquipmentReference> => {
    const response = await api.get(`/reference/equipment/${id}`)
    return response.data
  },

  // Arcane Powers
  getAllPowers: async (): Promise<ArcanePowerReference[]> => {
    const response = await api.get('/reference/powers')
    return response.data
  },

  getPowerById: async (id: number): Promise<ArcanePowerReference> => {
    const response = await api.get(`/reference/powers/${id}`)
    return response.data
  },
}

export default referenceDataService
