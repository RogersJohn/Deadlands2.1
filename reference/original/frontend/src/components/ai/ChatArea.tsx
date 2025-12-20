import { useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { ChatMessage } from '../../types/ai';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export default function ChatArea({ messages, isLoading }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        p: 2,
        bgcolor: '#1a0f08',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {messages.length === 0 && (
        <Typography variant="body2" sx={{ color: '#8B4513', textAlign: 'center', mt: 4 }}>
          No messages yet. Ask the AI Game Master for assistance!
        </Typography>
      )}

      {messages.map((message) => (
        <Paper
          key={message.id}
          sx={{
            p: 2,
            bgcolor: message.role === 'user' ? '#3c2415' : '#2c1810',
            border: `1px solid ${message.role === 'user' ? '#8B4513' : '#654321'}`,
            alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
          }}
        >
          <Typography variant="caption" sx={{ color: '#CD853F', display: 'block', mb: 0.5 }}>
            {message.role === 'user' ? 'You' : 'AI Game Master'}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#f5deb3',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message.content}
          </Typography>
          <Typography variant="caption" sx={{ color: '#8B4513', display: 'block', mt: 0.5 }}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </Typography>
        </Paper>
      ))}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} sx={{ color: '#CD853F' }} />
        </Box>
      )}

      <div ref={messagesEndRef} />
    </Box>
  );
}
