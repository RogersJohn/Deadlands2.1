import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Paper,
  TextField,
  InputAdornment,
  Drawer,
} from '@mui/material'
import { Add as AddIcon, Person as PersonIcon, SportsEsports as GameIcon, Search as SearchIcon, Psychology as AIIcon } from '@mui/icons-material'
import characterService from '../services/characterService'
import { useAuthStore } from '../store/authStore'
import AIAssistantPanel from '../components/ai/AIAssistantPanel'

const Dashboard = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [searchQuery, setSearchQuery] = useState('')
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false)

  const { data: characters, isLoading } = useQuery({
    queryKey: ['characters'],
    queryFn: characterService.getAll,
  })

  // Filter characters based on search query
  const filteredCharacters = characters?.filter((character) =>
    character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    character.occupation?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.dark' }}>
        <Typography variant="h5" gutterBottom color="primary.contrastText">
          Welcome back, {user?.username}!
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            size="large"
            color="success"
            startIcon={<GameIcon />}
            onClick={() => navigate('/character-select')}
          >
            Play Game
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/character/new')}
            sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
          >
            New Character
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<AIIcon />}
            onClick={() => setAiAssistantOpen(true)}
            sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
          >
            AI Assistant
          </Button>
        </Box>
      </Paper>

      {/* AI Assistant Drawer */}
      <Drawer
        anchor="right"
        open={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        PaperProps={{
          sx: {
            width: 500,
            maxWidth: '90vw',
          },
        }}
      >
        <AIAssistantPanel onClose={() => setAiAssistantOpen(false)} />
      </Drawer>

      {/* Characters Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          Your Characters
        </Typography>
        <TextField
          size="small"
          placeholder="Search characters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {filteredCharacters?.map((character) => (
          <Grid item xs={12} sm={6} md={4} key={character.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">{character.name}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {character.occupation || 'Wanderer'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Grit: {character.grit}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  XP: {(character.totalXp || 0) - (character.spentXp || 0)} / {character.totalXp || 0}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => navigate(`/character/${character.id}`)}>
                  View
                </Button>
                <Button size="small" color="secondary" onClick={() => navigate(`/character/${character.id}/edit`)}>
                  Edit
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredCharacters?.length === 0 && searchQuery && (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No characters found matching "{searchQuery}"
          </Typography>
        </Box>
      )}

      {!characters?.length && (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No characters yet. Create your first character!
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default Dashboard
