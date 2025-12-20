import { Box, Typography, Paper } from '@mui/material';
import { DiceRollEvent } from '../types/GameTypes';
import { useState, useEffect } from 'react';

interface DiceRollPopupProps {
  roll: DiceRollEvent | null;
  onComplete?: () => void;
}

export function DiceRollPopup({ roll, onComplete }: DiceRollPopupProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (roll) {
      // Start animation sequence
      setVisible(true);
      setIsRolling(true);
      setShowResult(false);

      // Show rolling animation for 800ms
      const rollingTimer = setTimeout(() => {
        setIsRolling(false);
        setShowResult(true);
      }, 800);

      // Hide popup after 2.5 seconds total
      const hideTimer = setTimeout(() => {
        setVisible(false);
        if (onComplete) {
          onComplete();
        }
      }, 2500);

      return () => {
        clearTimeout(rollingTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [roll, onComplete]);

  if (!roll || !visible) {
    return null;
  }

  // Get die emoji based on die type
  const getDieEmoji = (dieType: string): string => {
    return '🎲'; // Unicode die emoji
  };

  // Get color based on result quality
  const getResultColor = (): string => {
    if (roll.exploded) return '#ffd700'; // Gold for exploding dice
    if (roll.total >= 8) return '#44ff44'; // Green for good rolls
    if (roll.total >= 4) return '#ffaa00'; // Orange for average
    return '#ff4444'; // Red for poor rolls
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        pointerEvents: 'none',
        animation: visible ? 'fadeInScale 0.3s ease-out' : 'fadeOut 0.3s ease-out',
        '@keyframes fadeInScale': {
          '0%': {
            opacity: 0,
            transform: 'translate(-50%, -50%) scale(0.5)',
          },
          '100%': {
            opacity: 1,
            transform: 'translate(-50%, -50%) scale(1)',
          },
        },
        '@keyframes fadeOut': {
          '0%': {
            opacity: 1,
          },
          '100%': {
            opacity: 0,
          },
        },
      }}
    >
      <Paper
        elevation={24}
        sx={{
          p: 3,
          backgroundColor: '#2d1b0e',
          border: `3px solid ${getResultColor()}`,
          borderRadius: 2,
          minWidth: 280,
          boxShadow: `0 0 20px ${getResultColor()}`,
        }}
      >
        {/* Roller Name */}
        <Typography
          sx={{
            fontFamily: 'Rye, serif',
            color: '#f5e6d3',
            fontSize: '14px',
            textAlign: 'center',
            mb: 1,
          }}
        >
          {roll.roller}
        </Typography>

        {/* Purpose */}
        <Typography
          sx={{
            color: '#d4b896',
            fontSize: '12px',
            textAlign: 'center',
            mb: 2,
          }}
        >
          {roll.purpose}
        </Typography>

        {/* Dice Display */}
        {isRolling ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
              py: 2,
            }}
          >
            {[...Array(roll.rolls.length)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  fontSize: '48px',
                  animation: 'spin 0.4s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              >
                {getDieEmoji(roll.dieType)}
              </Box>
            ))}
          </Box>
        ) : (
          showResult && (
            <Box>
              {/* Individual Roll Results */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 1,
                  mb: 2,
                  flexWrap: 'wrap',
                }}
              >
                {roll.rolls.map((value, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: '#1a0f08',
                      border: `2px solid ${getResultColor()}`,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'popIn 0.3s ease-out',
                      animationDelay: `${i * 0.1}s`,
                      animationFillMode: 'backwards',
                      '@keyframes popIn': {
                        '0%': {
                          transform: 'scale(0)',
                          opacity: 0,
                        },
                        '50%': {
                          transform: 'scale(1.2)',
                        },
                        '100%': {
                          transform: 'scale(1)',
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'Rye, serif',
                        color: getResultColor(),
                        fontSize: '18px',
                        fontWeight: 'bold',
                      }}
                    >
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Total */}
              <Box
                sx={{
                  textAlign: 'center',
                  pt: 2,
                  borderTop: `2px solid ${getResultColor()}`,
                }}
              >
                <Typography
                  sx={{
                    color: '#d4b896',
                    fontSize: '11px',
                    mb: 0.5,
                  }}
                >
                  {roll.dieType}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'Rye, serif',
                    color: getResultColor(),
                    fontSize: '32px',
                    fontWeight: 'bold',
                    lineHeight: 1,
                    textShadow: `0 0 10px ${getResultColor()}`,
                  }}
                >
                  {roll.total}
                </Typography>
                {roll.exploded && (
                  <Typography
                    sx={{
                      color: '#ffd700',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      mt: 1,
                      animation: 'pulse 1s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                      },
                    }}
                  >
                    ✨ EXPLODED! ✨
                  </Typography>
                )}
              </Box>
            </Box>
          )
        )}
      </Paper>
    </Box>
  );
}
