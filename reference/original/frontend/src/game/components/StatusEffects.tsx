import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';

interface StatusEffectsProps {
  wounds: number;
  maxWounds: number;
  isShaken: boolean;
  woundPenalty: number;
}

export function StatusEffects({ wounds, maxWounds = 3, isShaken, woundPenalty }: StatusEffectsProps) {
  const woundPercentage = (wounds / maxWounds) * 100;

  return (
    <Box>
      {/* Shaken Status */}
      {isShaken && (
        <Box
          sx={{
            mb: 1,
            p: 1,
            backgroundColor: '#ff6b6b',
            border: '2px solid #ff4444',
            borderRadius: 1,
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.7 },
            },
          }}
        >
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#fff',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            ⚠️ SHAKEN ⚠️
          </Typography>
          <Typography sx={{ fontSize: '9px', color: '#fff', textAlign: 'center', mt: 0.5 }}>
            Must recover before acting
          </Typography>
        </Box>
      )}

      {/* Wound Counter */}
      <Box
        sx={{
          p: 1.5,
          backgroundColor: '#2d1b0e',
          border: `2px solid ${wounds > 0 ? '#ff4444' : '#8b4513'}`,
          borderRadius: 1,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography sx={{ fontSize: '11px', fontWeight: 'bold', color: '#f5e6d3' }}>
            Wounds
          </Typography>
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: wounds >= maxWounds ? '#ff4444' : wounds > 0 ? '#ffaa44' : '#44ff44',
            }}
          >
            {wounds} / {maxWounds}
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={woundPercentage}
          sx={{
            height: 8,
            borderRadius: 1,
            backgroundColor: '#1a0f08',
            '& .MuiLinearProgress-bar': {
              backgroundColor:
                wounds >= maxWounds ? '#ff4444' : wounds >= 2 ? '#ff8844' : wounds >= 1 ? '#ffaa44' : '#44ff44',
            },
          }}
        />

        {/* Wound Penalty */}
        {woundPenalty < 0 && (
          <Tooltip
            title="Each wound applies a -1 penalty to all trait rolls"
            placement="bottom"
          >
            <Typography
              sx={{
                fontSize: '9px',
                color: '#ff8844',
                textAlign: 'center',
                mt: 0.5,
                fontWeight: 'bold',
              }}
            >
              {woundPenalty} penalty to all rolls
            </Typography>
          </Tooltip>
        )}

        {wounds >= maxWounds && (
          <Typography
            sx={{
              fontSize: '10px',
              color: '#ff4444',
              textAlign: 'center',
              mt: 0.5,
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}
          >
            💀 INCAPACITATED 💀
          </Typography>
        )}
      </Box>
    </Box>
  );
}
