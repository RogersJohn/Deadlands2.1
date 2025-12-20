import { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  WbSunny as SunIcon,
  WbTwilight as TwilightIcon,
  Brightness3 as MoonIcon,
  Brightness1 as DarkIcon,
} from '@mui/icons-material';
import { Illumination } from '../types/GameTypes';

interface SettingsMenuProps {
  cameraFollowEnabled: boolean;
  setCameraFollowEnabled: (enabled: boolean) => void;
  showWeaponRanges: boolean;
  setShowWeaponRanges: (show: boolean) => void;
  showMovementRanges: boolean;
  setShowMovementRanges: (show: boolean) => void;
  illumination: Illumination;
  setIllumination: (level: Illumination) => void;
  showMapGrid?: boolean;
  setShowMapGrid?: (show: boolean) => void;
  showMapWalls?: boolean;
  setShowMapWalls?: (show: boolean) => void;
  showMapCover?: boolean;
  setShowMapCover?: (show: boolean) => void;
}

export function SettingsMenu({
  cameraFollowEnabled,
  setCameraFollowEnabled,
  showWeaponRanges,
  setShowWeaponRanges,
  showMovementRanges,
  setShowMovementRanges,
  illumination,
  setIllumination,
  showMapGrid = true,
  setShowMapGrid,
  showMapWalls = true,
  setShowMapWalls,
  showMapCover = true,
  setShowMapCover,
}: SettingsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getIlluminationIcon = (level: Illumination) => {
    switch (level) {
      case Illumination.BRIGHT:
        return <SunIcon sx={{ fontSize: '16px', color: '#FFD700' }} />;
      case Illumination.DIM:
        return <TwilightIcon sx={{ fontSize: '16px', color: '#FF8C00' }} />;
      case Illumination.DARK:
        return <MoonIcon sx={{ fontSize: '16px', color: '#4169E1' }} />;
      case Illumination.PITCH_BLACK:
        return <DarkIcon sx={{ fontSize: '16px', color: '#696969' }} />;
    }
  };

  return (
    <>
      <Tooltip title="Game Settings">
        <IconButton
          onClick={handleClick}
          sx={{
            color: '#f5e6d3',
            backgroundColor: '#2d1b0e',
            border: '2px solid #8b4513',
            '&:hover': {
              backgroundColor: '#3d2b1e',
            },
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            backgroundColor: '#2d1b0e',
            border: '2px solid #8b4513',
            minWidth: 280,
          },
        }}
      >
        {/* Camera Settings */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: '12px', color: '#d4b896', fontWeight: 'bold', mb: 1 }}>
            Camera
          </Typography>
          <RadioGroup
            row
            value={cameraFollowEnabled ? 'follow' : 'manual'}
            onChange={(e) => setCameraFollowEnabled(e.target.value === 'follow')}
            sx={{ gap: 2 }}
          >
            <FormControlLabel
              value="follow"
              control={
                <Radio
                  size="small"
                  sx={{ color: '#8b4513', '&.Mui-checked': { color: '#4169e1' } }}
                />
              }
              label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Follow</Typography>}
            />
            <FormControlLabel
              value="manual"
              control={
                <Radio
                  size="small"
                  sx={{ color: '#8b4513', '&.Mui-checked': { color: '#4169e1' } }}
                />
              }
              label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Manual</Typography>}
            />
          </RadioGroup>
        </Box>

        <Divider sx={{ borderColor: '#8b4513' }} />

        {/* Weapon Ranges */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: '12px', color: '#d4b896', fontWeight: 'bold', mb: 1 }}>
            Weapon Ranges
          </Typography>
          <RadioGroup
            row
            value={showWeaponRanges ? 'show' : 'hide'}
            onChange={(e) => setShowWeaponRanges(e.target.value === 'show')}
            sx={{ gap: 2 }}
          >
            <FormControlLabel
              value="show"
              control={
                <Radio
                  size="small"
                  sx={{ color: '#8b4513', '&.Mui-checked': { color: '#44ff44' } }}
                />
              }
              label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Show</Typography>}
            />
            <FormControlLabel
              value="hide"
              control={
                <Radio
                  size="small"
                  sx={{ color: '#8b4513', '&.Mui-checked': { color: '#ff4444' } }}
                />
              }
              label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Hide</Typography>}
            />
          </RadioGroup>
        </Box>

        <Divider sx={{ borderColor: '#8b4513' }} />

        {/* Movement Ranges */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: '12px', color: '#d4b896', fontWeight: 'bold', mb: 1 }}>
            Movement Ranges
          </Typography>
          <RadioGroup
            row
            value={showMovementRanges ? 'show' : 'hide'}
            onChange={(e) => setShowMovementRanges(e.target.value === 'show')}
            sx={{ gap: 2 }}
          >
            <FormControlLabel
              value="show"
              control={
                <Radio
                  size="small"
                  sx={{ color: '#8b4513', '&.Mui-checked': { color: '#4169e1' } }}
                />
              }
              label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Show</Typography>}
            />
            <FormControlLabel
              value="hide"
              control={
                <Radio
                  size="small"
                  sx={{ color: '#8b4513', '&.Mui-checked': { color: '#ff4444' } }}
                />
              }
              label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Hide</Typography>}
            />
          </RadioGroup>
        </Box>

        <Divider sx={{ borderColor: '#8b4513' }} />

        {/* Illumination */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: '12px', color: '#d4b896', fontWeight: 'bold', mb: 1 }}>
            Illumination
          </Typography>
          <RadioGroup
            value={illumination}
            onChange={(e) => setIllumination(e.target.value as Illumination)}
          >
            <FormControlLabel
              value={Illumination.BRIGHT}
              control={
                <Radio
                  size="small"
                  sx={{ color: '#8b4513', '&.Mui-checked': { color: '#FFD700' } }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getIlluminationIcon(Illumination.BRIGHT)}
                  <Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>
                    Bright (No penalty)
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value={Illumination.DIM}
              control={
                <Radio
                  size="small"
                  sx={{ color: '#8b4513', '&.Mui-checked': { color: '#FF8C00' } }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getIlluminationIcon(Illumination.DIM)}
                  <Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Dim (-1)</Typography>
                </Box>
              }
            />
            <FormControlLabel
              value={Illumination.DARK}
              control={
                <Radio
                  size="small"
                  sx={{ color: '#8b4513', '&.Mui-checked': { color: '#4169E1' } }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getIlluminationIcon(Illumination.DARK)}
                  <Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Dark (-2)</Typography>
                </Box>
              }
            />
            <FormControlLabel
              value={Illumination.PITCH_BLACK}
              control={
                <Radio
                  size="small"
                  sx={{ color: '#8b4513', '&.Mui-checked': { color: '#696969' } }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getIlluminationIcon(Illumination.PITCH_BLACK)}
                  <Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>
                    Pitch Black (-4)
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </Box>

        <Divider sx={{ borderColor: '#8b4513' }} />

        {/* Map Overlays */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: '12px', color: '#d4b896', fontWeight: 'bold', mb: 1 }}>
            Map Overlays
          </Typography>

          {/* Tactical Grid */}
          {setShowMapGrid && (
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: '11px', color: '#f5e6d3', mb: 0.5 }}>Tactical Grid</Typography>
              <RadioGroup
                row
                value={showMapGrid ? 'show' : 'hide'}
                onChange={(e) => setShowMapGrid(e.target.value === 'show')}
                sx={{ gap: 2 }}
              >
                <FormControlLabel
                  value="show"
                  control={
                    <Radio
                      size="small"
                      sx={{ color: '#8b4513', '&.Mui-checked': { color: '#ffffff' } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Show</Typography>}
                />
                <FormControlLabel
                  value="hide"
                  control={
                    <Radio
                      size="small"
                      sx={{ color: '#8b4513', '&.Mui-checked': { color: '#ff4444' } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Hide</Typography>}
                />
              </RadioGroup>
            </Box>
          )}

          {/* Wall Highlights */}
          {setShowMapWalls && (
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: '11px', color: '#f5e6d3', mb: 0.5 }}>Wall Highlights</Typography>
              <RadioGroup
                row
                value={showMapWalls ? 'show' : 'hide'}
                onChange={(e) => setShowMapWalls(e.target.value === 'show')}
                sx={{ gap: 2 }}
              >
                <FormControlLabel
                  value="show"
                  control={
                    <Radio
                      size="small"
                      sx={{ color: '#8b4513', '&.Mui-checked': { color: '#ff0000' } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Show</Typography>}
                />
                <FormControlLabel
                  value="hide"
                  control={
                    <Radio
                      size="small"
                      sx={{ color: '#8b4513', '&.Mui-checked': { color: '#ff4444' } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Hide</Typography>}
                />
              </RadioGroup>
            </Box>
          )}

          {/* Cover Markers */}
          {setShowMapCover && (
            <Box sx={{ mb: 0 }}>
              <Typography sx={{ fontSize: '11px', color: '#f5e6d3', mb: 0.5 }}>Cover Markers</Typography>
              <RadioGroup
                row
                value={showMapCover ? 'show' : 'hide'}
                onChange={(e) => setShowMapCover(e.target.value === 'show')}
                sx={{ gap: 2 }}
              >
                <FormControlLabel
                  value="show"
                  control={
                    <Radio
                      size="small"
                      sx={{ color: '#8b4513', '&.Mui-checked': { color: '#00ff00' } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Show</Typography>}
                />
                <FormControlLabel
                  value="hide"
                  control={
                    <Radio
                      size="small"
                      sx={{ color: '#8b4513', '&.Mui-checked': { color: '#ff4444' } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '12px', color: '#f5e6d3' }}>Hide</Typography>}
                />
              </RadioGroup>
            </Box>
          )}
        </Box>
      </Menu>
    </>
  );
}
