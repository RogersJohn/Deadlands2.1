import React from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tooltip,
  Chip
} from '@mui/material'
import { GameCharacter } from '../types/GameTypes'

interface PowersPanelProps {
  character: GameCharacter
  onCastPower: (powerId: number, powerName: string, powerCost: number, needsTarget: boolean) => void
  disabled?: boolean
}

export const PowersPanel: React.FC<PowersPanelProps> = ({
  character,
  onCastPower,
  disabled = false
}) => {
  const powers = character.powers || []
  const currentPP = character.currentPowerPoints || 0
  const maxPP = character.maxPowerPoints || 0

  // Determine if power needs a target (not self or touch range)
  const needsTarget = (power: typeof powers[0]): boolean => {
    const range = power.range.toLowerCase()
    return !range.includes('self') && !range.includes('touch')
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          ⚡ Powers
        </Typography>
        <Typography variant="body2" sx={{ color: currentPP < maxPP * 0.3 ? 'error.main' : 'text.secondary' }}>
          Power Points: {currentPP} / {maxPP}
        </Typography>
      </Box>

      {powers.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          This character knows no powers.
        </Typography>
      )}

      <Grid container spacing={2}>
        {powers.map(power => {
          const canAfford = currentPP >= power.powerPoints
          const isDisabled = disabled || !canAfford

          return (
            <Grid item xs={12} sm={6} md={4} key={power.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: canAfford ? 1 : 0.6,
                  border: !canAfford ? '1px solid' : 'none',
                  borderColor: 'error.main'
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {power.name}
                    </Typography>
                    <Chip
                      label={`${power.powerPoints} PP`}
                      size="small"
                      color={canAfford ? 'primary' : 'error'}
                      sx={{ fontSize: '0.75rem' }}
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Range: {power.range} | Duration: {power.duration}
                  </Typography>

                  <Tooltip title={power.description} arrow placement="top">
                    <Typography
                      variant="body2"
                      sx={{
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'help'
                      }}
                    >
                      {power.description}
                    </Typography>
                  </Tooltip>

                  {power.effect && (
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.875rem',
                        color: 'primary.main',
                        fontWeight: 500,
                        p: 1,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {power.effect}
                    </Typography>
                  )}

                  {power.traitRoll && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Roll: {power.traitRoll}
                    </Typography>
                  )}
                </CardContent>

                <CardActions>
                  <Tooltip
                    title={
                      !canAfford
                        ? `Insufficient power points (need ${power.powerPoints}, have ${currentPP})`
                        : needsTarget(power)
                        ? 'Click to select target'
                        : 'Cast on self'
                    }
                    arrow
                  >
                    <span style={{ width: '100%' }}>
                      <Button
                        size="small"
                        variant="contained"
                        fullWidth
                        onClick={() => onCastPower(power.id, power.name, power.powerPoints, needsTarget(power))}
                        disabled={isDisabled}
                        sx={{
                          bgcolor: canAfford ? 'primary.main' : 'grey.500',
                          '&:hover': {
                            bgcolor: canAfford ? 'primary.dark' : 'grey.600'
                          }
                        }}
                      >
                        Cast ({power.powerPoints} PP)
                      </Button>
                    </span>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {currentPP === 0 && maxPP > 0 && (
        <Typography
          variant="body2"
          color="error"
          sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
        >
          ⚠️ No power points remaining! Rest to recover power points.
        </Typography>
      )}
    </Box>
  )
}
