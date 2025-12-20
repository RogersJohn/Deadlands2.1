import api from './api'

export enum WikiCategory {
  CHARACTER_BIO = 'CHARACTER_BIO',
  CAMPAIGN_LORE = 'CAMPAIGN_LORE',
  LOCATION = 'LOCATION',
  SESSION_NOTE = 'SESSION_NOTE',
  OTHER = 'OTHER',
}

export enum WikiVisibility {
  PUBLIC = 'PUBLIC',
  CHARACTER_SPECIFIC = 'CHARACTER_SPECIFIC',
  PRIVATE = 'PRIVATE',
}

export interface WikiEntry {
  id: number
  title: string
  slug: string
  content: string
  category: WikiCategory
  visibility: WikiVisibility
  sortOrder: number
  relatedCharacterId?: number
  relatedCharacterName?: string
  createdAt: string
  updatedAt: string
}

export interface WikiAccess {
  id: number
  wikiEntryId: number
  userId: number
  grantedByUserId: number
  grantReason?: string
  grantedAt: string
}

export interface GrantAccessRequest {
  reason?: string
}

const wikiService = {
  // Get all wiki entries visible to current user
  getAll: async (): Promise<WikiEntry[]> => {
    const response = await api.get('/wiki')
    return response.data
  },

  // Get a specific wiki entry by slug
  getBySlug: async (slug: string): Promise<WikiEntry> => {
    const response = await api.get(`/wiki/slug/${slug}`)
    return response.data
  },

  // Get wiki entries by category
  getByCategory: async (category: WikiCategory): Promise<WikiEntry[]> => {
    const response = await api.get(`/wiki/category/${category}`)
    return response.data
  },

  // GM only: Grant access to a wiki entry
  grantAccess: async (
    entryId: number,
    userId: number,
    reason?: string
  ): Promise<WikiAccess> => {
    const response = await api.post(`/wiki/${entryId}/grant-access/${userId}`, {
      reason,
    })
    return response.data
  },

  // GM only: Revoke access to a wiki entry
  revokeAccess: async (entryId: number, userId: number): Promise<void> => {
    await api.delete(`/wiki/${entryId}/revoke-access/${userId}`)
  },

  // GM only: Get all access grants for an entry
  getAccessGrants: async (entryId: number): Promise<WikiAccess[]> => {
    const response = await api.get(`/wiki/${entryId}/access-grants`)
    return response.data
  },
}

export default wikiService
