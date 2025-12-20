import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGameStore } from '../store/gameStore';
import { useCharacters } from '../hooks/useCharacters';
import { GameCharacter } from '../game/types/GameTypes';

export default function CharacterSelect() {
  const navigate = useNavigate();
  const { setSelectedCharacter } = useGameStore();
  const { data: characters, isLoading: loading, error } = useCharacters();

  const handleSelectCharacter = (character: GameCharacter) => {
    setSelectedCharacter(character);
    navigate('/arena');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper
        sx={{
          p: 4,
          backgroundColor: '#2d1b0e',
          border: '2px solid #8b4513',
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ color: '#d4b896', mb: 2 }}
          >
            Back to Dashboard
          </Button>

          <Typography
            variant="h4"
            sx={{
              color: '#f5e6d3',
              fontFamily: 'Rye, serif',
              textAlign: 'center',
              mb: 2,
            }}
          >
            Select Your Character
          </Typography>

          <Typography
            sx={{
              color: '#d4b896',
              textAlign: 'center',
              fontSize: '1.1rem',
            }}
          >
            Choose a character to enter the arena
          </Typography>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 300,
            }}
          >
            <CircularProgress sx={{ color: '#8b4513' }} />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to load characters. Please try again.
          </Alert>
        )}

        {/* No Characters State */}
        {!loading && !error && (!characters || characters.length === 0) && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              No characters found. Create a character first to play in the arena.
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate('/character/new')}
              sx={{
                backgroundColor: '#8b4513',
                '&:hover': { backgroundColor: '#a0522d' },
              }}
            >
              Create Character
            </Button>
          </Box>
        )}

        {/* Character Grid */}
        {!loading && !error && characters && characters.length > 0 && (
          <Grid container spacing={3}>
            {characters.map((character) => (
              <Grid item xs={12} sm={6} md={4} key={character.id}>
                <Card
                  sx={{
                    backgroundColor: '#1a0f08',
                    border: '2px solid #8b4513',
                    transition: 'all 0.2s',
                    '&:hover': {
                      border: '2px solid #d4af37',
                      transform: 'scale(1.03)',
                      boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)',
                    },
                  }}
                >
                  <CardActionArea onClick={() => handleSelectCharacter(character)}>
                    {/* Character Image */}
                    {character.characterImageUrl ? (
                      <CardMedia
                        component="img"
                        height="220"
                        image={character.characterImageUrl}
                        alt={character.name}
                        sx={{
                          objectFit: 'cover',
                          objectPosition: 'top',
                          backgroundColor: '#1a0f08',
                        }}
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 220,
                          backgroundColor: '#1a0f08',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '64px',
                        }}
                      >
                        🤠
                      </Box>
                    )}

                    {/* Character Info */}
                    <CardContent>
                      <Typography
                        variant="h5"
                        sx={{
                          color: '#f5e6d3',
                          fontFamily: 'Rye, serif',
                          mb: 1,
                          textAlign: 'center',
                        }}
                      >
                        {character.name}
                      </Typography>

                      {character.archetype && (
                        <Typography
                          sx={{
                            color: '#d4af37',
                            textAlign: 'center',
                            fontSize: '0.9rem',
                            mb: 2,
                          }}
                        >
                          {character.archetype}
                        </Typography>
                      )}

                      {/* Combat Stats */}
                      <Box
                        sx={{
                          color: '#d4b896',
                          fontSize: '0.875rem',
                          borderTop: '1px solid #8b4513',
                          pt: 1.5,
                        }}
                      >
                        <Typography sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                          <Tooltip title="Movement rate per round" arrow>
                            <Box component="span">
                              <strong>Pace:</strong> {character.pace}
                            </Box>
                          </Tooltip> |{' '}
                          <Tooltip title="Defense against melee attacks" arrow>
                            <Box component="span">
                              <strong>Parry:</strong> {character.parry}
                            </Box>
                          </Tooltip> |{' '}
                          <Tooltip title="Resistance to damage" arrow>
                            <Box component="span">
                              <strong>Tough:</strong> {character.toughness}
                            </Box>
                          </Tooltip>
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem' }}>
                          <Tooltip title="Strength - Physical power and melee damage" arrow>
                            <Box component="span">
                              <strong>Str:</strong> {character.strengthDie}
                            </Box>
                          </Tooltip> |{' '}
                          <Tooltip title="Agility - Coordination, dexterity, and reflexes" arrow>
                            <Box component="span">
                              <strong>Agi:</strong> {character.agilityDie}
                            </Box>
                          </Tooltip> |{' '}
                          <Tooltip title="Vigor - Endurance and resistance to harm" arrow>
                            <Box component="span">
                              <strong>Vig:</strong> {character.vigorDie}
                            </Box>
                          </Tooltip>
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Container>
  );
}
