import { Box, Paper, Typography } from '@mui/material';
import { DiceRollEvent } from '../types/GameTypes';
import { useEffect, useState } from 'react';

interface DiceLogProps {
  diceRolls: DiceRollEvent[];
}

// Visual die component with CSS animation
function Die({ dieType, roll, exploded }: { dieType: string; roll: number; exploded: boolean }) {
  const getDieShape = () => {
    if (dieType.includes('d4')) return '▲'; // Triangle for d4
    if (dieType.includes('d6')) return '⬛'; // Cube for d6
    if (dieType.includes('d8')) return '⬟'; // Octagon for d8
    if (dieType.includes('d10')) return '⬠'; // Decagon for d10
    if (dieType.includes('d12')) return '⬢'; // Dodecagon for d12
    if (dieType.includes('d20')) return '⭗'; // Icosahedron for d20
    return '🎲';
  };

  const getDieColor = () => {
    if (exploded) return '#ffaa00'; // Orange for exploding dice
    if (dieType.includes('d4')) return '#ff6b6b';
    if (dieType.includes('d6')) return '#4ecdc4';
    if (dieType.includes('d8')) return '#45b7d1';
    if (dieType.includes('d10')) return '#96ceb4';
    if (dieType.includes('d12')) return '#ffeaa7';
    if (dieType.includes('d20')) return '#a29bfe';
    return '#f5e6d3';
  };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 50,
        height: 50,
        margin: 0.5,
        backgroundColor: getDieColor(),
        border: '2px solid #000',
        borderRadius: 1,
        position: 'relative',
        animation: 'diceRoll 0.5s ease-out',
        '@keyframes diceRoll': {
          '0%': {
            transform: 'rotate(0deg) scale(0.5)',
            opacity: 0,
          },
          '50%': {
            transform: 'rotate(180deg) scale(1.2)',
          },
          '100%': {
            transform: 'rotate(360deg) scale(1)',
            opacity: 1,
          },
        },
      }}
    >
      <Typography sx={{ fontSize: '20px', color: '#000', fontWeight: 'bold' }}>
        {getDieShape()}
      </Typography>
      <Typography sx={{ fontSize: '14px', color: '#000', fontWeight: 'bold', mt: -0.5 }}>
        {roll}
      </Typography>
      {exploded && (
        <Box
          sx={{
            position: 'absolute',
            top: -5,
            right: -5,
            fontSize: '16px',
          }}
        >
          💥
        </Box>
      )}
    </Box>
  );
}

export function DiceLog({ diceRolls }: DiceLogProps) {
  const [visibleRolls, setVisibleRolls] = useState<DiceRollEvent[]>([]);

  useEffect(() => {
    // Keep only the last 5 rolls
    setVisibleRolls(diceRolls.slice(-5));
  }, [diceRolls]);

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 16,
        top: 80,
        width: 280,
        pointerEvents: 'none',
      }}
    >
      <Paper
        sx={{
          p: 2,
          backgroundColor: '#2d1b0e',
          border: '2px solid #8b4513',
          maxHeight: 400,
          overflow: 'hidden',
          pointerEvents: 'auto',
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
          🎲 Dice Rolls
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibleRolls.map((rollEvent) => (
            <Box
              key={rollEvent.id}
              sx={{
                backgroundColor: '#1a0f08',
                border: '1px solid #4a3425',
                borderRadius: 1,
                p: 1,
                animation: 'slideIn 0.3s ease-out',
                '@keyframes slideIn': {
                  '0%': {
                    transform: 'translateX(-100%)',
                    opacity: 0,
                  },
                  '100%': {
                    transform: 'translateX(0)',
                    opacity: 1,
                  },
                },
              }}
            >
              <Typography sx={{ fontSize: '11px', color: '#d4b896', mb: 0.5 }}>
                <strong>{rollEvent.roller}</strong> - {rollEvent.purpose}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: '10px', color: '#8b7355', mr: 0.5 }}>
                  {rollEvent.dieType}:
                </Typography>
                {rollEvent.rolls.map((roll, index) => (
                  <Die
                    key={`${rollEvent.id}-${index}`}
                    dieType={rollEvent.dieType}
                    roll={roll}
                    exploded={rollEvent.exploded && index > 0}
                  />
                ))}
              </Box>
              <Typography sx={{ fontSize: '12px', color: '#44ff44', mt: 0.5, fontWeight: 'bold' }}>
                Total: {rollEvent.total}
              </Typography>
            </Box>
          ))}
          {visibleRolls.length === 0 && (
            <Typography sx={{ fontSize: '11px', color: '#8b7355', textAlign: 'center', py: 2 }}>
              No rolls yet...
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
