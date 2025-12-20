import { Box, Typography, Paper, Chip } from '@mui/material';
import { InitiativeEntry } from '../../services/combatService';

// Savage Worlds card suits (for display)
const SUIT_SYMBOLS: Record<string, string> = {
  'SPADES': '♠',
  'HEARTS': '♥',
  'DIAMONDS': '♦',
  'CLUBS': '♣',
};

interface InitiativeTrackerProps {
  entries: InitiativeEntry[];
  roundNumber: number;
  combatActive: boolean;
  currentCharacterId?: number | null;
}

const InitiativeTracker: React.FC<InitiativeTrackerProps> = ({
  entries = [],
  roundNumber = 1,
  combatActive = false,
  currentCharacterId,
}) => {
  // Get color for card based on suit
  const getCardColor = (entry: InitiativeEntry): string => {
    if (entry.isJoker) {
      return entry.isRedJoker ? '#ff0000' : '#000000';
    }
    const suit = entry.cardSuit;
    return suit === 'HEARTS' || suit === 'DIAMONDS' ? '#d32f2f' : '#000000';
  };

  // Get background color for card
  const getCardBackground = (entry: InitiativeEntry): string => {
    if (entry.isJoker) {
      return entry.isRedJoker ? '#ffe0e0' : '#e0e0e0';
    }
    return '#f5e6d3';
  };

  // Get suit symbol
  const getSuitSymbol = (suit: string | null): string => {
    if (!suit) return '';
    return SUIT_SYMBOLS[suit] || suit;
  };

  // Check if this entry is the current character (for highlighting)
  const isCurrentCharacter = (entry: InitiativeEntry): boolean => {
    return entry.characterId === currentCharacterId;
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#2d1b0e',
        border: '2px solid #8b4513',
        borderRadius: 1,
        p: 2,
        overflowY: 'auto',
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
      {/* Header */}
      <Typography
        sx={{
          fontFamily: 'Rye, serif',
          color: '#f5e6d3',
          fontSize: '18px',
          fontWeight: 'bold',
          mb: 1,
          textAlign: 'center',
          borderBottom: '2px solid #8b4513',
          pb: 1,
        }}
      >
        INITIATIVE
      </Typography>

      {/* Combat Status */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        {combatActive ? (
          <Chip
            label={`Round ${roundNumber}`}
            color="error"
            size="small"
            sx={{
              fontFamily: 'Rye, serif',
              fontWeight: 'bold',
            }}
          />
        ) : (
          <Chip
            label="No Combat"
            color="default"
            size="small"
            sx={{
              fontFamily: 'Rye, serif',
            }}
          />
        )}
      </Box>

      {/* Initiative Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {!combatActive || entries.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 150,
              color: '#8b7355',
              fontSize: '12px',
              fontStyle: 'italic',
              textAlign: 'center',
              px: 2,
            }}
          >
            {combatActive
              ? 'Waiting for combatants...'
              : 'Combat not yet started.\nInitiative will be drawn when combat begins.'}
          </Box>
        ) : (
          entries.map((entry, index) => (
            <Paper
              key={`${entry.characterId || entry.characterName}-${index}`}
              elevation={entry.isActive ? 8 : 2}
              sx={{
                p: 1.5,
                backgroundColor: entry.isActive ? '#4a3520' : '#1a0f08',
                border: `2px solid ${
                  entry.isActive
                    ? '#d4af37'
                    : isCurrentCharacter(entry)
                    ? '#44ff44'
                    : entry.isPlayer
                    ? '#4169e1'
                    : '#8b4513'
                }`,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                opacity: entry.hasActed ? 0.5 : 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: '#4a3520',
                },
              }}
            >
              {/* Playing Card */}
              <Box
                sx={{
                  width: 45,
                  height: 65,
                  backgroundColor: getCardBackground(entry),
                  border: '2px solid #000',
                  borderRadius: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: entry.isJoker
                    ? '0 0 10px rgba(255, 215, 0, 0.5)'
                    : '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                {entry.isJoker ? (
                  <Typography
                    sx={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: getCardColor(entry),
                      textAlign: 'center',
                    }}
                  >
                    JOKER
                    <br />
                    {entry.isRedJoker ? '(+2)' : '(+2)'}
                  </Typography>
                ) : (
                  <>
                    <Typography
                      sx={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: getCardColor(entry),
                        lineHeight: 1,
                      }}
                    >
                      {entry.cardValue}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '18px',
                        color: getCardColor(entry),
                        lineHeight: 1,
                      }}
                    >
                      {getSuitSymbol(entry.cardSuit)}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Character Info */}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: 'Rye, serif',
                    color: entry.isPlayer ? '#4169e1' : '#ff6b6b',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.characterName}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '10px',
                    color: entry.hasActed ? '#666' : '#8b7355',
                  }}
                >
                  {entry.hasActed ? 'Acted' : entry.isPlayer ? 'Player' : 'NPC'}
                </Typography>
              </Box>

              {/* Active Indicator */}
              {entry.isActive && (
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#44ff44',
                    boxShadow: '0 0 8px #44ff44',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    },
                  }}
                />
              )}

              {/* Your Turn Indicator */}
              {isCurrentCharacter(entry) && entry.isActive && (
                <Chip
                  label="YOUR TURN"
                  size="small"
                  sx={{
                    backgroundColor: '#44ff44',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '9px',
                    height: '20px',
                  }}
                />
              )}
            </Paper>
          ))
        )}
      </Box>

      {/* Joker Info */}
      {combatActive && entries.some((e) => e.isJoker) && (
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
              color: '#d4af37',
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            Joker drawn! +2 to all Trait and damage rolls. Deck shuffles next round.
          </Typography>
        </Box>
      )}

      {/* Round Info */}
      <Box
        sx={{
          mt: 2,
          pt: 2,
          borderTop: '2px solid #8b4513',
        }}
      >
        <Typography
          sx={{
            fontSize: '10px',
            color: '#8b7355',
            textAlign: 'center',
          }}
        >
          {combatActive
            ? 'New cards dealt each round'
            : 'GM starts combat to deal cards'}
        </Typography>
      </Box>
    </Box>
  );
};

export default InitiativeTracker;
