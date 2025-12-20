import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Casino as GenerateIcon, Clear as ClearIcon } from '@mui/icons-material';
import { ChatMessage } from '../../types/ai';
import aiService from '../../services/aiService';
import ChatArea from './ChatArea';

interface EncounterGeneratorTabProps {
  messages: ChatMessage[];
  onAddMessage: (content: string, role: 'user' | 'assistant') => void;
  onClear: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function EncounterGeneratorTab({
  messages,
  onAddMessage,
  onClear,
  isLoading,
  setIsLoading,
}: EncounterGeneratorTabProps) {
  const [location, setLocation] = useState('');
  const [partySize, setPartySize] = useState<number>(4);
  const [averageLevel, setAverageLevel] = useState<'Novice' | 'Seasoned' | 'Veteran' | 'Heroic' | 'Legendary'>('Seasoned');

  const handleGenerate = async () => {
    if (!location) {
      return;
    }

    onAddMessage(`Generate ${averageLevel} encounter for party of ${partySize} at: ${location}`, 'user');

    setIsLoading(true);
    try {
      const response = await aiService.generateEncounter({
        location,
        partySize,
        averageLevel,
      });

      onAddMessage(response.content, 'assistant');
    } catch (error: any) {
      onAddMessage(
        `Error: ${error.response?.data?.message || 'Failed to generate encounter'}`,
        'assistant'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ChatArea messages={messages} isLoading={isLoading} />

      <Box sx={{ p: 2, borderTop: '1px solid #8B4513' }}>
        <Typography variant="caption" sx={{ color: '#f5deb3', mb: 1, display: 'block' }}>
          Generate random Deadlands encounters
        </Typography>

        <TextField
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          placeholder="Abandoned mine, dusty saloon, ghost town..."
          sx={{
            '& .MuiInputBase-root': { bgcolor: '#1a0f08', color: '#f5deb3' },
            '& .MuiInputLabel-root': { color: '#f5deb3' },
          }}
        />

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <TextField
            label="Party Size"
            type="number"
            value={partySize}
            onChange={(e) => setPartySize(parseInt(e.target.value) || 4)}
            size="small"
            inputProps={{ min: 1, max: 10 }}
            sx={{
              flex: 1,
              '& .MuiInputBase-root': { bgcolor: '#1a0f08', color: '#f5deb3' },
              '& .MuiInputLabel-root': { color: '#f5deb3' },
            }}
          />

          <FormControl size="small" sx={{ flex: 2 }}>
            <InputLabel sx={{ color: '#f5deb3' }}>Rank</InputLabel>
            <Select
              value={averageLevel}
              label="Rank"
              onChange={(e) => setAverageLevel(e.target.value as any)}
              sx={{
                bgcolor: '#1a0f08',
                color: '#f5deb3',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#8B4513' },
              }}
            >
              <MenuItem value="Novice">Novice</MenuItem>
              <MenuItem value="Seasoned">Seasoned</MenuItem>
              <MenuItem value="Veteran">Veteran</MenuItem>
              <MenuItem value="Heroic">Heroic</MenuItem>
              <MenuItem value="Legendary">Legendary</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={!location || isLoading}
            fullWidth
            startIcon={<GenerateIcon />}
          >
            Generate Encounter
          </Button>
          <Tooltip title="Clear">
            <IconButton onClick={onClear} size="small" sx={{ color: '#f5deb3' }}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
