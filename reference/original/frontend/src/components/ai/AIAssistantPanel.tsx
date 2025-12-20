import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Psychology as RulesIcon,
  Dangerous as EncounterIcon,
  Place as LocationIcon,
  Map as MapIcon,
  Folder as LibraryIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { AIMode, ChatMessage } from '../../types/ai';
import aiService from '../../services/aiService';
import NPCDialogueTab from './NPCDialogueTab';
import RulesLookupTab from './RulesLookupTab';
import EncounterGeneratorTab from './EncounterGeneratorTab';
import LocationGeneratorTab from './LocationGeneratorTab';
import MapGeneratorTab from './MapGeneratorTab';
import MapLibraryTab from './MapLibraryTab';

interface AIAssistantPanelProps {
  onClose?: () => void;
}

/**
 * AI Game Master Assistant Panel
 * Provides AI-powered assistance for NPCs, rules, encounters, and locations
 */
export default function AIAssistantPanel({ onClose }: AIAssistantPanelProps = {}) {
  const { user } = useAuthStore();
  const isGM = user?.role === 'GAME_MASTER';

  const [mode, setMode] = useState<'npc' | 'rules' | 'encounter' | 'location' | 'mapgen' | 'library'>('npc');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check AI service health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    const healthy = await aiService.healthCheck();
    setIsHealthy(healthy);
  };

  const addMessage = (content: string, role: 'user' | 'assistant') => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  if (isHealthy === false) {
    return (
      <Paper sx={{ height: '100%', p: 2 }}>
        <Alert severity="error">
          AI Assistant is not available. Please check your API configuration.
        </Alert>
      </Paper>
    );
  }

  if (isHealthy === null) {
    return (
      <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#2c1810',
        border: '2px solid #8B4513',
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: '#8B4513' }}>
        <Typography variant="h6" sx={{ p: 2, color: '#f5deb3', fontFamily: 'Rye, serif' }}>
          AI Game Master Assistant
        </Typography>

        <Tabs
          value={mode}
          onChange={(_, newValue) => setMode(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { color: '#f5deb3', minWidth: 'auto' },
            '& .Mui-selected': { color: '#FFD700' },
          }}
        >
          <Tab icon={<ChatIcon />} label="NPC" value="npc" />
          <Tab icon={<RulesIcon />} label="Rules" value="rules" />
          {isGM && <Tab icon={<EncounterIcon />} label="Encounter" value="encounter" />}
          {isGM && <Tab icon={<LocationIcon />} label="Location" value="location" />}
          {isGM && <Tab icon={<MapIcon />} label="Map Gen" value="mapgen" />}
          {isGM && <Tab icon={<LibraryIcon />} label="Library" value="library" />}
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {mode === 'npc' && (
          <NPCDialogueTab
            messages={messages}
            onAddMessage={addMessage}
            onClear={clearMessages}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
        {mode === 'rules' && (
          <RulesLookupTab
            messages={messages}
            onAddMessage={addMessage}
            onClear={clearMessages}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
        {mode === 'encounter' && isGM && (
          <EncounterGeneratorTab
            messages={messages}
            onAddMessage={addMessage}
            onClear={clearMessages}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
        {mode === 'location' && isGM && (
          <LocationGeneratorTab
            messages={messages}
            onAddMessage={addMessage}
            onClear={clearMessages}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
        {mode === 'mapgen' && isGM && (
          <MapGeneratorTab
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onMapLoaded={onClose}
          />
        )}
        {mode === 'library' && isGM && (
          <MapLibraryTab
            onMapLoaded={onClose}
          />
        )}
      </Box>
    </Paper>
  );
}
