import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { Send as SendIcon, Clear as ClearIcon } from '@mui/icons-material';
import { ChatMessage } from '../../types/ai';
import aiService from '../../services/aiService';
import ChatArea from './ChatArea';

interface RulesLookupTabProps {
  messages: ChatMessage[];
  onAddMessage: (content: string, role: 'user' | 'assistant') => void;
  onClear: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const QUICK_QUESTIONS = [
  'How does the aim action work?',
  'How does gang up work?',
  'How do exploding dice work?',
  'What are the rules for called shots?',
  'How does cover work?',
];

export default function RulesLookupTab({
  messages,
  onAddMessage,
  onClear,
  isLoading,
  setIsLoading,
}: RulesLookupTabProps) {
  const [ruleQuestion, setRuleQuestion] = useState('');

  const handleSubmit = async (question?: string) => {
    const questionToAsk = question || ruleQuestion;
    if (!questionToAsk) {
      return;
    }

    onAddMessage(questionToAsk, 'user');

    setIsLoading(true);
    try {
      const response = await aiService.lookupRule({
        ruleQuestion: questionToAsk,
      });

      onAddMessage(response.content, 'assistant');
      if (!question) {
        setRuleQuestion(''); // Only clear if not from quick question
      }
    } catch (error: any) {
      onAddMessage(
        `Error: ${error.response?.data?.message || 'Failed to lookup rule'}`,
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
          Ask about Savage Worlds or Deadlands rules
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {QUICK_QUESTIONS.map((question) => (
            <Chip
              key={question}
              label={question}
              size="small"
              onClick={() => handleSubmit(question)}
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
            label="Rule Question"
            value={ruleQuestion}
            onChange={(e) => setRuleQuestion(e.target.value)}
            fullWidth
            size="small"
            placeholder="How does the wild die work?"
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            sx={{
              '& .MuiInputBase-root': { bgcolor: '#1a0f08', color: '#f5deb3' },
              '& .MuiInputLabel-root': { color: '#f5deb3' },
            }}
          />
          <Button
            variant="contained"
            onClick={() => handleSubmit()}
            disabled={!ruleQuestion || isLoading}
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
