import { Box, Typography, Paper } from '@mui/material';
import { CombatLogEntry } from '../types/GameTypes';
import { useEffect, useRef } from 'react';

interface CombatLogProps {
  logs: CombatLogEntry[];
  maxEntries?: number;
}

export function CombatLog({ logs, maxEntries = 100 }: CombatLogProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Get color based on log type
  const getLogColor = (type: CombatLogEntry['type']): string => {
    switch (type) {
      case 'success':
        return '#44ff44';
      case 'damage':
        return '#ff4444';
      case 'miss':
        return '#ff8800';
      case 'info':
      default:
        return '#d4b896';
    }
  };

  // Get icon based on log type
  const getLogIcon = (type: CombatLogEntry['type']): string => {
    switch (type) {
      case 'success':
        return '✓';
      case 'damage':
        return '⚔';
      case 'miss':
        return '✗';
      case 'info':
      default:
        return '•';
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Limit logs to maxEntries (show most recent)
  const displayLogs = logs.slice(-maxEntries);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#2d1b0e',
        border: '2px solid #8b4513',
        borderRadius: 1,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Typography
        sx={{
          fontFamily: 'Rye, serif',
          color: '#f5e6d3',
          fontSize: '18px',
          fontWeight: 'bold',
          mb: 2,
          textAlign: 'center',
          borderBottom: '2px solid #8b4513',
          pb: 1,
        }}
      >
        COMBAT LOG
      </Typography>

      {/* Log Entries */}
      <Box
        ref={logContainerRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#1a0f08',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#8b4513',
            borderRadius: '4px',
          },
        }}
      >
        {displayLogs.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
              color: '#8b7355',
              fontSize: '12px',
              fontStyle: 'italic',
            }}
          >
            No combat actions yet...
          </Box>
        ) : (
          displayLogs.map((log) => (
            <Paper
              key={log.id}
              elevation={1}
              sx={{
                p: 1,
                backgroundColor: '#1a0f08',
                border: `1px solid ${getLogColor(log.type)}`,
                borderRadius: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: '#2a1f18',
                  transform: 'translateX(-2px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                {/* Icon */}
                <Typography
                  sx={{
                    fontSize: '16px',
                    color: getLogColor(log.type),
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  {getLogIcon(log.type)}
                </Typography>

                {/* Message */}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    sx={{
                      fontSize: '11px',
                      color: getLogColor(log.type),
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                  >
                    {log.message}
                  </Typography>

                  {/* Timestamp */}
                  <Typography
                    sx={{
                      fontSize: '9px',
                      color: '#8b7355',
                      mt: 0.5,
                      lineHeight: 1,
                    }}
                  >
                    {formatTime(log.timestamp)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          ))
        )}
      </Box>

      {/* Stats Footer */}
      <Box
        sx={{
          mt: 2,
          pt: 1,
          borderTop: '1px solid #8b4513',
        }}
      >
        <Typography
          sx={{
            fontSize: '10px',
            color: '#8b7355',
            textAlign: 'center',
          }}
        >
          {displayLogs.length} {displayLogs.length === 1 ? 'entry' : 'entries'}
        </Typography>
      </Box>
    </Box>
  );
}
