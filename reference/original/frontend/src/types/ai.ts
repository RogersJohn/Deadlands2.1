// AI Assistant types

export interface NPCDialogueRequest {
  npcName: string;
  npcPersonality?: string;
  context?: string;
  playerQuestion: string;
}

export interface EncounterRequest {
  location: string;
  partySize: number;
  averageLevel: 'Novice' | 'Seasoned' | 'Veteran' | 'Heroic' | 'Legendary';
}

export interface RuleLookupRequest {
  ruleQuestion: string;
}

export interface LocationRequest {
  locationType: string;
  size: 'Small' | 'Medium' | 'Large';
}

export interface AIResponse {
  content: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type AIMode = 'npc' | 'encounter' | 'rules' | 'location';
