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
  Chip,
} from '@mui/material';
import { Casino as GenerateIcon, Clear as ClearIcon } from '@mui/icons-material';
import { ChatMessage } from '../../types/ai';
import aiService from '../../services/aiService';
import ChatArea from './ChatArea';

interface LocationGeneratorTabProps {
  messages: ChatMessage[];
  onAddMessage: (content: string, role: 'user' | 'assistant') => void;
  onClear: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const LOCATION_TYPES = [
  'Town',
  'Mine',
  'Ranch',
  'Fort',
  'Saloon',
  'Church',
  'Ghost Town',
  'Indian Village',
  'Railroad Camp',
  'Battlefield',
];

export default function LocationGeneratorTab({
  messages,
  onAddMessage,
  onClear,
  isLoading,
  setIsLoading,
}: LocationGeneratorTabProps) {
  const [locationType, setLocationType] = useState('');
  const [size, setSize] = useState<'Small' | 'Medium' | 'Large'>('Medium');

  const handleGenerate = async (type?: string) => {
    const typeToUse = type || locationType;
    if (!typeToUse) {
      return;
    }

    onAddMessage(`Generate ${size} ${typeToUse}`, 'user');

    setIsLoading(true);
    try {
      const response = await aiService.generateLocation({
        locationType: typeToUse,
        size,
      });

      onAddMessage(response.content, 'assistant');
    } catch (error: any) {
      onAddMessage(
        `Error: ${error.response?.data?.message || 'Failed to generate location'}`,
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
          Generate Weird West locations with NPCs and plot hooks
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {LOCATION_TYPES.map((type) => (
            <Chip
              key={type}
              label={type}
              size="small"
              onClick={() => handleGenerate(type)}
              disabled={isLoading}
              sx={{
                bgcolor: '#3c2415',
                color: '#f5deb3',
                '&:hover': { bgcolor: '#4c3420' },
              }}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Location Type"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            size="small"
            placeholder="Custom location type..."
            sx={{
              flex: 2,
              '& .MuiInputBase-root': { bgcolor: '#1a0f08', color: '#f5deb3' },
              '& .MuiInputLabel-root': { color: '#f5deb3' },
            }}
          />

          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel sx={{ color: '#f5deb3' }}>Size</InputLabel>
            <Select
              value={size}
              label="Size"
              onChange={(e) => setSize(e.target.value as any)}
              sx={{
                bgcolor: '#1a0f08',
                color: '#f5deb3',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#8B4513' },
              }}
            >
              <MenuItem value="Small">Small</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Large">Large</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            variant="contained"
            onClick={() => handleGenerate()}
            disabled={!locationType || isLoading}
            fullWidth
            startIcon={<GenerateIcon />}
          >
            Generate Location
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
