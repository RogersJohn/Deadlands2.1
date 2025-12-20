import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Send as SendIcon, Clear as ClearIcon } from '@mui/icons-material';
import { ChatMessage } from '../../types/ai';
import aiService from '../../services/aiService';
import ChatArea from './ChatArea';

interface NPCDialogueTabProps {
  messages: ChatMessage[];
  onAddMessage: (content: string, role: 'user' | 'assistant') => void;
  onClear: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function NPCDialogueTab({
  messages,
  onAddMessage,
  onClear,
  isLoading,
  setIsLoading,
}: NPCDialogueTabProps) {
  const [npcName, setNpcName] = useState('');
  const [npcPersonality, setNpcPersonality] = useState('');
  const [context, setContext] = useState('');
  const [playerQuestion, setPlayerQuestion] = useState('');

  const handleSubmit = async () => {
    if (!npcName || !playerQuestion) {
      return;
    }

    const userMessage = `[${npcName}] Player: "${playerQuestion}"`;
    onAddMessage(userMessage, 'user');

    setIsLoading(true);
    try {
      const response = await aiService.generateNPCDialogue({
        npcName,
        npcPersonality: npcPersonality || undefined,
        context: context || undefined,
        playerQuestion,
      });

      onAddMessage(`${npcName}: ${response.content}`, 'assistant');
      setPlayerQuestion(''); // Clear question after submission
    } catch (error: any) {
      onAddMessage(
        `Error: ${error.response?.data?.message || 'Failed to generate dialogue'}`,
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
          Have the AI roleplay as an NPC in your Deadlands campaign
        </Typography>

        <TextField
          label="NPC Name"
          value={npcName}
          onChange={(e) => setNpcName(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          placeholder="Sheriff Daniels"
          sx={{
            '& .MuiInputBase-root': { bgcolor: '#1a0f08', color: '#f5deb3' },
            '& .MuiInputLabel-root': { color: '#f5deb3' },
          }}
        />

        <TextField
          label="Personality (optional)"
          value={npcPersonality}
          onChange={(e) => setNpcPersonality(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          placeholder="Gruff lawman, suspicious of outsiders"
          sx={{
            '& .MuiInputBase-root': { bgcolor: '#1a0f08', color: '#f5deb3' },
            '& .MuiInputLabel-root': { color: '#f5deb3' },
          }}
        />

        <TextField
          label="Context (optional)"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          multiline
          rows={2}
          placeholder="The party arrives in town asking about recent disappearances"
          sx={{
            '& .MuiInputBase-root': { bgcolor: '#1a0f08', color: '#f5deb3' },
            '& .MuiInputLabel-root': { color: '#f5deb3' },
          }}
        />

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <TextField
            label="Player Question/Statement"
            value={playerQuestion}
            onChange={(e) => setPlayerQuestion(e.target.value)}
            fullWidth
            size="small"
            placeholder="What can you tell us about the missing miners?"
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            sx={{
              '& .MuiInputBase-root': { bgcolor: '#1a0f08', color: '#f5deb3' },
              '& .MuiInputLabel-root': { color: '#f5deb3' },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!npcName || !playerQuestion || isLoading}
            sx={{ minWidth: '100px' }}
          >
            <SendIcon />
          </Button>
          <Tooltip title="Clear conversation">
            <IconButton onClick={onClear} size="small" sx={{ color: '#f5deb3' }}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
