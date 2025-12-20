import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  RadioGroup,
  FormLabel,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { CalledShotTarget } from '../types/GameTypes';

// Deadlands Game Arena theme colors (distinct from main app theme)
const GAME_COLORS = {
  background: {
    dark: '#1a0f08',      // Darkest background
    paper: '#2d1b0e',     // Dialog/card background
  },
  border: {
    primary: '#8b4513',   // Saddle brown
    secondary: '#4a3425', // Dark brown
  },
  text: {
    primary: '#f5e6d3',   // Cream
    secondary: '#d4b896', // Tan
    muted: '#8b7355',     // Muted brown
  },
  accent: {
    selected: 'rgba(65, 105, 225, 0.2)', // Blue highlight
    hover: 'rgba(139, 69, 19, 0.2)',     // Brown hover
  },
  status: {
    positive: '#44ff44',  // Green
    negative: '#ff6666',  // Red
  },
} as const;

const DIALOG_SIZES = {
  minWidth: 400,
  titleFontSize: '20px',
  labelFontSize: '12px',
  optionFontSize: '13px',
  modifierFontSize: '11px',
  descFontSize: '10px',
} as const;

interface CalledShotDialogProps {
  open: boolean;
  onSelect: (target: CalledShotTarget) => void;
  onCancel: () => void;
}

const CALLED_SHOT_OPTIONS = [
  {
    value: 'head',
    label: 'Head Shot',
    penalty: -4,
    bonus: +4,
    description: 'Target the head for extra damage',
  },
  {
    value: 'vitals',
    label: 'Vital Shot',
    penalty: -4,
    bonus: +4,
    description: 'Target vital organs for extra damage',
  },
  {
    value: 'limb',
    label: 'Limb Shot',
    penalty: -2,
    bonus: 0,
    description: 'Target a limb to disarm or knock down',
  },
  {
    value: 'small',
    label: 'Small Target',
    penalty: -2,
    bonus: 0,
    description: 'Target a small object or weak point',
  },
  {
    value: 'tiny',
    label: 'Tiny Target',
    penalty: -4,
    bonus: 0,
    description: 'Target a very small object',
  },
];

export const CalledShotDialog: React.FC<CalledShotDialogProps> = ({
  open,
  onSelect,
  onCancel,
}) => {
  const [selectedTarget, setSelectedTarget] = React.useState<string>('head');

  const handleConfirm = () => {
    onSelect(selectedTarget as CalledShotTarget);
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        sx: {
          backgroundColor: GAME_COLORS.background.paper,
          border: `2px solid ${GAME_COLORS.border.primary}`,
          minWidth: DIALOG_SIZES.minWidth,
        },
      }}
    >
      <DialogTitle
        sx={{
          color: GAME_COLORS.text.primary,
          fontFamily: 'Rye, serif',
          fontSize: DIALOG_SIZES.titleFontSize,
          borderBottom: `1px solid ${GAME_COLORS.border.primary}`,
          pb: 1,
        }}
      >
        🎯 Called Shot
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <FormControl component="fieldset" fullWidth>
          <FormLabel
            component="legend"
            sx={{
              color: GAME_COLORS.text.secondary,
              fontSize: DIALOG_SIZES.labelFontSize,
              mb: 1,
            }}
          >
            Select target area:
          </FormLabel>
          <RadioGroup
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
          >
            {CALLED_SHOT_OPTIONS.map((option) => (
              <Box
                key={option.value}
                sx={{
                  mb: 1,
                  p: 1.5,
                  backgroundColor: selectedTarget === option.value
                    ? GAME_COLORS.accent.selected
                    : GAME_COLORS.background.dark,
                  border: `1px solid ${GAME_COLORS.border.secondary}`,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: GAME_COLORS.accent.hover,
                  },
                }}
                onClick={() => setSelectedTarget(option.value)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography
                    sx={{
                      color: GAME_COLORS.text.primary,
                      fontSize: DIALOG_SIZES.optionFontSize,
                      fontWeight: 'bold',
                    }}
                  >
                    {option.label}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography
                      sx={{
                        color: GAME_COLORS.status.negative,
                        fontSize: DIALOG_SIZES.modifierFontSize,
                        fontWeight: 'bold',
                      }}
                    >
                      {option.penalty} to hit
                    </Typography>
                    {option.bonus > 0 && (
                      <Typography
                        sx={{
                          color: GAME_COLORS.status.positive,
                          fontSize: DIALOG_SIZES.modifierFontSize,
                          fontWeight: 'bold',
                        }}
                      >
                        +{option.bonus} damage
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Typography
                  sx={{
                    color: GAME_COLORS.text.muted,
                    fontSize: DIALOG_SIZES.descFontSize,
                    mt: 0.5,
                  }}
                >
                  {option.description}
                </Typography>
              </Box>
            ))}
          </RadioGroup>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            fullWidth
            sx={{
              color: GAME_COLORS.text.secondary,
              borderColor: GAME_COLORS.border.primary,
              '&:hover': {
                borderColor: '#a0522d',
                backgroundColor: 'rgba(139, 69, 19, 0.1)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            fullWidth
            sx={{
              backgroundColor: GAME_COLORS.border.primary,
              color: GAME_COLORS.text.primary,
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#a0522d',
              },
            }}
          >
            Confirm
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
