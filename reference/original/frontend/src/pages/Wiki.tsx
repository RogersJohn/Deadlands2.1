import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  InputAdornment,
  Alert,
} from '@mui/material'
import {
  Search as SearchIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import wikiService, { WikiCategory, WikiEntry, WikiVisibility } from '../services/wikiService'
import ReactMarkdown from 'react-markdown'

const CATEGORY_LABELS: Record<WikiCategory, string> = {
  [WikiCategory.CHARACTER_BIO]: 'Character Bios',
  [WikiCategory.CAMPAIGN_LORE]: 'Campaign Lore',
  [WikiCategory.LOCATION]: 'Locations',
  [WikiCategory.SESSION_NOTE]: 'Session Notes',
  [WikiCategory.OTHER]: 'Other',
}

const Wiki = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<WikiCategory | 'ALL'>('ALL')
  const [selectedEntry, setSelectedEntry] = useState<WikiEntry | null>(null)

  const { data: wikiEntries = [], isLoading } = useQuery({
    queryKey: ['wikiEntries'],
    queryFn: wikiService.getAll,
  })

  // Filter entries by search and category
  const filteredEntries = wikiEntries.filter((entry) => {
    const matchesSearch =
      searchQuery === '' ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === 'ALL' || entry.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Group entries by category
  const entriesByCategory = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = []
    }
    acc[entry.category].push(entry)
    return acc
  }, {} as Record<WikiCategory, WikiEntry[]>)

  const getVisibilityIcon = (visibility: WikiVisibility) => {
    switch (visibility) {
      case WikiVisibility.PUBLIC:
        return <PublicIcon fontSize="small" color="success" titleAccess="Public" />
      case WikiVisibility.CHARACTER_SPECIFIC:
        return <PersonIcon fontSize="small" color="info" titleAccess="Character-specific" />
      case WikiVisibility.PRIVATE:
        return <LockIcon fontSize="small" color="warning" titleAccess="Private" />
    }
  }

  const getVisibilityChip = (visibility: WikiVisibility) => {
    switch (visibility) {
      case WikiVisibility.PUBLIC:
        return <Chip label="Public" size="small" color="success" icon={<PublicIcon />} />
      case WikiVisibility.CHARACTER_SPECIFIC:
        return <Chip label="Character Secret" size="small" color="info" icon={<PersonIcon />} />
      case WikiVisibility.PRIVATE:
        return <Chip label="Private" size="small" color="warning" icon={<LockIcon />} />
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  // If viewing a specific entry
  if (selectedEntry) {
    return (
      <Box>
        <Button variant="outlined" onClick={() => setSelectedEntry(null)} sx={{ mb: 2 }}>
          ← Back to Wiki
        </Button>

        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Typography variant="h3" component="h1" sx={{ flexGrow: 1 }}>
              {selectedEntry.title}
            </Typography>
            {getVisibilityChip(selectedEntry.visibility)}
          </Box>

          {selectedEntry.relatedCharacterName && (
            <Alert severity="info" sx={{ mb: 3 }}>
              About: <strong>{selectedEntry.relatedCharacterName}</strong>
            </Alert>
          )}

          <Box
            sx={{
              '& h1': { fontSize: '2rem', mt: 3, mb: 2 },
              '& h2': { fontSize: '1.5rem', mt: 2.5, mb: 1.5 },
              '& h3': { fontSize: '1.25rem', mt: 2, mb: 1 },
              '& p': { mb: 2 },
              '& ul, & ol': { mb: 2, pl: 3 },
              '& blockquote': {
                borderLeft: '4px solid #ccc',
                pl: 2,
                fontStyle: 'italic',
                color: 'text.secondary',
              },
            }}
          >
            <ReactMarkdown>{selectedEntry.content}</ReactMarkdown>
          </Box>
        </Paper>
      </Box>
    )
  }

  // Wiki list view
  return (
    <Box>
      {/* Search bar */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search wiki entries..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {/* Category tabs */}
      <Tabs
        value={selectedCategory}
        onChange={(_, newValue) => setSelectedCategory(newValue)}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="All" value="ALL" />
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <Tab key={key} label={label} value={key} />
        ))}
      </Tabs>

      {/* No results message */}
      {filteredEntries.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No wiki entries found.
          </Typography>
        </Paper>
      )}

      {/* Display entries grouped by category */}
      {selectedCategory === 'ALL'
        ? Object.entries(entriesByCategory).map(([category, entries]) => (
            <Box key={category} sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                {CATEGORY_LABELS[category as WikiCategory]}
              </Typography>
              <Grid container spacing={2}>
                {entries.map((entry) => (
                  <Grid item xs={12} sm={6} md={4} key={entry.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {getVisibilityIcon(entry.visibility)}
                          <Typography variant="h6" component="h2">
                            {entry.title}
                          </Typography>
                        </Box>
                        {entry.relatedCharacterName && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            About: {entry.relatedCharacterName}
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button size="small" onClick={() => setSelectedEntry(entry)}>
                          Read
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))
        : // Show only selected category
          filteredEntries.length > 0 && (
            <Grid container spacing={2}>
              {filteredEntries.map((entry) => (
                <Grid item xs={12} sm={6} md={4} key={entry.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getVisibilityIcon(entry.visibility)}
                        <Typography variant="h6" component="h2">
                          {entry.title}
                        </Typography>
                      </Box>
                      {entry.relatedCharacterName && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          About: {entry.relatedCharacterName}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => setSelectedEntry(entry)}>
                        Read
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
    </Box>
  )
}

export default Wiki
