import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Map as MapIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import mapService, { BattleMapDTO, BattleMapDetailDTO } from '../../services/mapService';
import { GeneratedMap } from '../../types/map';

interface MapLibraryTabProps {
  onMapLoaded?: () => void;
}

export default function MapLibraryTab({ onMapLoaded }: MapLibraryTabProps) {
  const [tabValue, setTabValue] = useState<'my-maps' | 'public'>('my-maps');
  const [myMaps, setMyMaps] = useState<BattleMapDTO[]>([]);
  const [publicMaps, setPublicMaps] = useState<BattleMapDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mapToDelete, setMapToDelete] = useState<BattleMapDTO | null>(null);

  // Load maps on mount and tab change
  useEffect(() => {
    loadMaps();
  }, [tabValue]);

  const loadMaps = async () => {
    setLoading(true);
    setError(null);

    try {
      if (tabValue === 'my-maps') {
        const maps = await mapService.getMyMaps();
        setMyMaps(maps);
      } else {
        const maps = await mapService.getPublicMaps();
        setPublicMaps(maps);
      }
    } catch (err: any) {
      console.error('Error loading maps:', err);
      setError(err.response?.data?.message || 'Failed to load maps');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMap = async (map: BattleMapDTO) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch full map data
      const fullMap: BattleMapDetailDTO = await mapService.getMap(map.id);

      // Parse mapData JSON back to GeneratedMap
      const generatedMap: GeneratedMap = JSON.parse(fullMap.mapData);

      // Dispatch event to load map in Phaser
      window.dispatchEvent(new CustomEvent('loadGeneratedMap', {
        detail: generatedMap
      }));

      console.log('Map loaded successfully:', generatedMap.name);

      // Close drawer
      if (onMapLoaded) {
        onMapLoaded();
      }
    } catch (err: any) {
      console.error('Error loading map:', err);
      setError(err.response?.data?.message || 'Failed to load map');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (map: BattleMapDTO) => {
    setMapToDelete(map);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!mapToDelete) return;

    try {
      setLoading(true);
      await mapService.deleteMap(mapToDelete.id);

      // Reload maps
      await loadMaps();

      setDeleteDialogOpen(false);
      setMapToDelete(null);
    } catch (err: any) {
      console.error('Error deleting map:', err);
      setError(err.response?.data?.message || 'Failed to delete map');
      setDeleteDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const currentMaps = tabValue === 'my-maps' ? myMaps : publicMaps;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: '#8B4513', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            '& .MuiTab-root': { color: '#f5deb3' },
            '& .Mui-selected': { color: '#FFD700' },
          }}
        >
          <Tab label="My Maps" value="my-maps" />
          <Tab label="Public Library" value="public" />
        </Tabs>
      </Box>

      {/* Refresh Button */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadMaps}
          disabled={loading}
          sx={{
            color: '#f5deb3',
            borderColor: '#8B4513',
            '&:hover': { borderColor: '#CD853F', bgcolor: '#3c2415' },
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#8B4513' }} />
        </Box>
      )}

      {/* Map Grid */}
      {!loading && currentMaps.length === 0 && (
        <Alert severity="info">
          {tabValue === 'my-maps'
            ? 'No saved maps yet. Generate and save a map to see it here.'
            : 'No public maps available yet.'}
        </Alert>
      )}

      {!loading && currentMaps.length > 0 && (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Grid container spacing={2}>
            {currentMaps.map((map) => (
              <Grid item xs={12} sm={6} key={map.id}>
                <Card
                  sx={{
                    bgcolor: '#3c2415',
                    border: '2px solid #8B4513',
                    '&:hover': { borderColor: '#CD853F' },
                  }}
                >
                  {/* Thumbnail */}
                  {map.thumbnailUrl ? (
                    <CardMedia
                      component="img"
                      height="140"
                      image={map.thumbnailUrl}
                      alt={map.name}
                      sx={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 140,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#2c1810',
                      }}
                    >
                      <MapIcon sx={{ fontSize: 64, color: '#8B4513' }} />
                    </Box>
                  )}

                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{ color: '#FFD700', fontFamily: 'Rye, serif', mb: 1 }}
                    >
                      {map.name}
                    </Typography>

                    {map.description && (
                      <Typography
                        variant="body2"
                        sx={{ color: '#f5deb3', mb: 1 }}
                        noWrap
                      >
                        {map.description}
                      </Typography>
                    )}

                    <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`${map.widthTiles}x${map.heightTiles}`}
                        size="small"
                        sx={{ bgcolor: '#2c1810', color: '#f5deb3' }}
                      />
                      {map.type && (
                        <Chip
                          label={map.type.replace('_', ' ')}
                          size="small"
                          sx={{ bgcolor: '#2c1810', color: '#f5deb3' }}
                        />
                      )}
                      {map.theme && (
                        <Chip
                          label={map.theme}
                          size="small"
                          sx={{ bgcolor: '#2c1810', color: '#f5deb3' }}
                        />
                      )}
                    </Stack>

                    {map.createdByUsername && (
                      <Typography
                        variant="caption"
                        sx={{ color: '#d4b896', display: 'block' }}
                      >
                        By {map.createdByUsername} • {new Date(map.createdAt).toLocaleDateString()}
                      </Typography>
                    )}
                  </CardContent>

                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<MapIcon />}
                      onClick={() => handleLoadMap(map)}
                      sx={{
                        color: '#FFD700',
                        '&:hover': { bgcolor: '#3c2415' },
                      }}
                    >
                      Load in Game
                    </Button>

                    {tabValue === 'my-maps' && (
                      <Button
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteClick(map)}
                        sx={{
                          color: '#ff4444',
                          '&:hover': { bgcolor: '#3c2415' },
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#2c1810',
            border: '2px solid #8B4513',
          },
        }}
      >
        <DialogTitle sx={{ color: '#f5deb3' }}>
          Delete Map?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#f5deb3' }}>
            Are you sure you want to delete "{mapToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ color: '#f5deb3' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            sx={{ color: '#ff4444' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
