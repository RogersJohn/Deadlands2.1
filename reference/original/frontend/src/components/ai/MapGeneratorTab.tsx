import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Chip,
  Stack,
} from '@mui/material';
import {
  Map as MapIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import aiService from '../../services/aiService';
import mapService from '../../services/mapService';
import { GeneratedMap } from '../../types/map';

interface MapGeneratorTabProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onMapLoaded?: () => void;
}

export default function MapGeneratorTab({ isLoading, setIsLoading, onMapLoaded }: MapGeneratorTabProps) {
  const [locationType, setLocationType] = useState('town');
  const [size, setSize] = useState('medium');
  const [theme, setTheme] = useState('combat');
  const [generateImage, setGenerateImage] = useState(true);
  const [description, setDescription] = useState('');
  const [generatedMap, setGeneratedMap] = useState<GeneratedMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedMap(null);

    try {
      const mapData = await aiService.generateMap({
        locationType,
        size,
        theme,
        features: ['water', 'buildings', 'cover'],
        description,
        generateImage,
      });

      setGeneratedMap(mapData);
    } catch (err: any) {
      console.error('Map generation error:', err);
      setError(err.response?.data?.message || 'Failed to generate map. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!generatedMap) return;

    const dataStr = JSON.stringify(generatedMap, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generatedMap.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadImage = () => {
    if (!generatedMap?.imageUrl) return;

    const link = document.createElement('a');
    link.href = generatedMap.imageUrl;
    link.download = `${generatedMap.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadInGame = () => {
    if (!generatedMap) return;

    // Dispatch event to load the map in Phaser
    window.dispatchEvent(new CustomEvent('loadGeneratedMap', {
      detail: generatedMap
    }));

    console.log('Map load event dispatched:', generatedMap.name);

    // Close the AI Assistant drawer to reveal the map
    if (onMapLoaded) {
      onMapLoaded();
    }
  };

  const handleSaveMap = async () => {
    if (!generatedMap) return;

    setIsLoading(true);
    setError(null);
    setSaveSuccess(null);

    try {
      // Extract walls from buildings
      const walls = generatedMap.buildings.map(building => ({
        x: building.position.x,
        y: building.position.y,
        width: building.size.width,
        height: building.size.height
      }));

      const saveRequest = {
        name: generatedMap.name,
        description: generatedMap.description,
        widthTiles: generatedMap.size.width,
        heightTiles: generatedMap.size.height,
        imageData: generatedMap.imageUrl,
        mapData: JSON.stringify(generatedMap),
        wallsData: JSON.stringify(walls),
        coverData: JSON.stringify(generatedMap.cover),
        visibility: 'PRIVATE' as const,
        type: locationType.toUpperCase().replace('-', '_') as any,
        theme: theme.toUpperCase() as any,
        tags: `${locationType},${theme},${size}`
      };

      const saved = await mapService.saveMap(saveRequest);
      setSaveSuccess(`Map "${saved.name}" saved to your library!`);
      console.log('Map saved successfully:', saved.id);
    } catch (err: any) {
      console.error('Error saving map:', err);
      setError(err.response?.data?.message || 'Failed to save map');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      {/* Form */}
      <Box sx={{ flex: '0 0 auto', mb: 2 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: '#f5deb3' }}>Location Type</InputLabel>
          <Select
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            label="Location Type"
            sx={{
              color: '#f5deb3',
              '.MuiOutlinedInput-notchedOutline': { borderColor: '#8B4513' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CD853F' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FFD700' },
            }}
          >
            <MenuItem value="wilderness">Wilderness</MenuItem>
            <MenuItem value="town">Town Street</MenuItem>
            <MenuItem value="interior">Building Interior</MenuItem>
            <MenuItem value="mine">Mine / Cave</MenuItem>
            <MenuItem value="fort">Fort / Compound</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: '#f5deb3' }}>Map Size</InputLabel>
          <Select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            label="Map Size"
            sx={{
              color: '#f5deb3',
              '.MuiOutlinedInput-notchedOutline': { borderColor: '#8B4513' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CD853F' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FFD700' },
            }}
          >
            <MenuItem value="small">Small (15x10 tiles)</MenuItem>
            <MenuItem value="medium">Medium (30x20 tiles)</MenuItem>
            <MenuItem value="large">Large (50x30 tiles)</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: '#f5deb3' }}>Battle Theme</InputLabel>
          <Select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            label="Battle Theme"
            sx={{
              color: '#f5deb3',
              '.MuiOutlinedInput-notchedOutline': { borderColor: '#8B4513' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CD853F' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FFD700' },
            }}
          >
            <MenuItem value="combat">Combat (lots of cover)</MenuItem>
            <MenuItem value="chase">Chase (open spaces)</MenuItem>
            <MenuItem value="ambush">Ambush (asymmetric)</MenuItem>
            <MenuItem value="siege">Siege (defensible)</MenuItem>
            <MenuItem value="exploration">Exploration</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          multiline
          rows={2}
          label="Additional Details (optional)"
          placeholder="E.g., 'Include a creek running through the middle' or 'Add a burned-out building'"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiInputLabel-root': { color: '#f5deb3' },
            '& .MuiInputBase-input': { color: '#f5deb3' },
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#8B4513' },
              '&:hover fieldset': { borderColor: '#CD853F' },
              '&.Mui-focused fieldset': { borderColor: '#FFD700' },
            },
          }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={generateImage}
              onChange={(e) => setGenerateImage(e.target.checked)}
              sx={{ color: '#f5deb3', '&.Mui-checked': { color: '#FFD700' } }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: '#f5deb3' }}>
              Generate background artwork (+10-30 sec, costs ~$0.01)
            </Typography>
          }
          sx={{ mb: 2 }}
        />

        <Button
          fullWidth
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} /> : <MapIcon />}
          onClick={handleGenerate}
          disabled={isLoading}
          sx={{
            bgcolor: '#8B4513',
            color: '#f5deb3',
            '&:hover': { bgcolor: '#A0522D' },
            '&:disabled': { bgcolor: '#3c2415', color: '#8B7355' },
          }}
        >
          {isLoading ? 'Generating Map...' : 'Generate Map'}
        </Button>

        {isLoading && (
          <Typography variant="caption" sx={{ color: '#f5deb3', mt: 1, display: 'block', textAlign: 'center' }}>
            {generateImage
              ? 'This may take 20-40 seconds (generating AI artwork)...'
              : 'Generating map data...'}
          </Typography>
        )}
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Save Success */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {saveSuccess}
        </Alert>
      )}

      {/* Generated Map Display */}
      {generatedMap && (
        <Box sx={{ flex: '1 1 auto', overflow: 'auto' }}>
          <Paper
            sx={{
              p: 2,
              bgcolor: '#3c2415',
              border: '2px solid #8B4513',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ color: '#FFD700', mb: 1, fontFamily: 'Rye, serif' }}>
              {generatedMap.name}
            </Typography>

            <Typography variant="body2" sx={{ color: '#f5deb3', mb: 2 }}>
              {generatedMap.description}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                label={`${generatedMap.size.width}x${generatedMap.size.height} tiles`}
                size="small"
                sx={{ bgcolor: '#2c1810', color: '#f5deb3' }}
              />
              <Chip
                label={`${generatedMap.buildings.length} buildings`}
                size="small"
                sx={{ bgcolor: '#2c1810', color: '#f5deb3' }}
              />
              <Chip
                label={`${generatedMap.cover.length} cover objects`}
                size="small"
                sx={{ bgcolor: '#2c1810', color: '#f5deb3' }}
              />
              {generatedMap.npcs.length > 0 && (
                <Chip
                  label={`${generatedMap.npcs.length} NPCs`}
                  size="small"
                  sx={{ bgcolor: '#2c1810', color: '#f5deb3' }}
                />
              )}
            </Stack>

            {/* Background Image Preview */}
            {generatedMap.imageUrl && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#FFD700', mb: 1 }}>
                  Background Artwork:
                </Typography>
                <img
                  src={generatedMap.imageUrl}
                  alt={generatedMap.name}
                  style={{
                    width: '100%',
                    maxHeight: '300px',
                    objectFit: 'contain',
                    border: '2px solid #8B4513',
                    borderRadius: '4px',
                  }}
                />
              </Box>
            )}

            {/* Action Buttons */}
            <Stack spacing={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<MapIcon />}
                onClick={handleLoadInGame}
                sx={{
                  color: '#FFD700',
                  borderColor: '#FFD700',
                  '&:hover': { borderColor: '#FFA500', bgcolor: '#3c2415' },
                }}
              >
                Load in Game
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveMap}
                disabled={isLoading}
                sx={{
                  color: '#00ff00',
                  borderColor: '#00ff00',
                  '&:hover': { borderColor: '#00cc00', bgcolor: '#3c2415' },
                  '&:disabled': { color: '#8B7355', borderColor: '#8B7355' },
                }}
              >
                Save to Library
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadJSON}
                sx={{
                  color: '#f5deb3',
                  borderColor: '#8B4513',
                  '&:hover': { borderColor: '#CD853F', bgcolor: '#3c2415' },
                }}
              >
                Download JSON
              </Button>

              {generatedMap.imageUrl && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  onClick={handleDownloadImage}
                  sx={{
                    color: '#f5deb3',
                    borderColor: '#8B4513',
                    '&:hover': { borderColor: '#CD853F', bgcolor: '#3c2415' },
                  }}
                >
                  Download Image
                </Button>
              )}
            </Stack>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
