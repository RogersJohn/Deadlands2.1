import { Box, Paper, Typography } from '@mui/material';
import { CombatLogEntry } from '../types/GameTypes';

interface CombatHUDProps {
  turnNumber: number;
  phase: 'player' | 'enemy' | 'victory' | 'defeat';
  playerHealth: number;
  playerMaxHealth: number;
  combatLog: CombatLogEntry[];
}

export function CombatHUD({ turnNumber, phase, playerHealth, playerMaxHealth, combatLog }: CombatHUDProps) {
  // Get last 8 log entries
  const recentLogs = combatLog.slice(-8);

  const getPhaseColor = () => {
    switch (phase) {
      case 'player':
        return '#4169e1'; // Blue
      case 'enemy':
        return '#ff4444'; // Red
      case 'victory':
        return '#44ff44'; // Green
      case 'defeat':
        return '#888888'; // Gray
      default:
        return '#f5e6d3';
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'player':
        return 'YOUR TURN';
      case 'enemy':
        return 'ENEMY TURN';
      case 'victory':
        return 'VICTORY!';
      case 'defeat':
        return 'DEFEAT';
      default:
        return '';
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'info':
        return '#f5e6d3';
      case 'success':
        return '#44ff44';
      case 'damage':
        return '#ff8844';
      case 'miss':
        return '#888888';
      default:
        return '#f5e6d3';
    }
  };

  const healthPercentage = (playerHealth / playerMaxHealth) * 100;
  const healthColor = healthPercentage > 66 ? '#44ff44' : healthPercentage > 33 ? '#ffaa44' : '#ff4444';

  return (
    <Box
      sx={{
        position: 'absolute',
        right: 16,
        top: 80,
        width: 300,
        pointerEvents: 'none',
      }}
    >
      {/* Turn Indicator */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: '#2d1b0e',
          border: `3px solid ${getPhaseColor()}`,
          pointerEvents: 'auto',
        }}
      >
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: getPhaseColor(),
            textAlign: 'center',
            fontFamily: 'Rye, serif',
          }}
        >
          {getPhaseText()}
        </Typography>
        <Typography
          sx={{
            fontSize: '12px',
            color: '#d4b896',
            textAlign: 'center',
            mt: 0.5,
          }}
        >
          Turn {turnNumber}
        </Typography>
      </Paper>

      {/* Health Bar */}
      <Paper
        sx={{
          p: 1.5,
          mb: 2,
          backgroundColor: '#2d1b0e',
          border: '2px solid #8b4513',
          pointerEvents: 'auto',
        }}
      >
        <Typography sx={{ fontSize: '12px', color: '#f5e6d3', mb: 0.5 }}>
          Your Health: {playerHealth} / {playerMaxHealth}
        </Typography>
        <Box
          sx={{
            width: '100%',
            height: 20,
            backgroundColor: '#1a0f08',
            border: '1px solid #4a3425',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${healthPercentage}%`,
              height: '100%',
              backgroundColor: healthColor,
              transition: 'width 0.3s ease, background-color 0.3s ease',
            }}
          />
        </Box>
      </Paper>

      {/* Combat Log */}
      <Paper
        sx={{
          p: 2,
          backgroundColor: '#2d1b0e',
          border: '2px solid #8b4513',
          maxHeight: 250,
          overflow: 'auto',
          pointerEvents: 'auto',
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
        <Typography
          sx={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#f5e6d3',
            mb: 1,
            fontFamily: 'Rye, serif',
          }}
        >
          Combat Log
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {recentLogs.map((log) => (
            <Typography
              key={log.id}
              sx={{
                fontSize: '11px',
                color: getLogColor(log.type),
                fontFamily: 'monospace',
                lineHeight: 1.3,
              }}
            >
              {log.message}
            </Typography>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
