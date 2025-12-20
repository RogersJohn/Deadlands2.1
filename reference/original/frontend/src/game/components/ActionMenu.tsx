import { Box, Typography, Select, MenuItem, FormControl, Tooltip } from '@mui/material';
import { useState } from 'react';
import { CombatAction, GameCharacter } from '../types/GameTypes';

interface ActionMenuProps {
  onSelectAction: (action: CombatAction, power?: string) => void;
  disabled?: boolean;
  remainingActions?: number;
  character?: GameCharacter;
}

// Comprehensive list of Savage Worlds combat actions
const COMBAT_ACTIONS: CombatAction[] = [
  {
    type: 'attack_melee',
    name: 'Attack (Melee)',
    description: 'Make a Fighting roll to strike an adjacent foe with a melee weapon',
    icon: '⚔️',
    requiresTarget: true,
  },
  {
    type: 'attack_ranged',
    name: 'Attack (Ranged)',
    description: 'Make a Shooting or Throwing roll to strike a target at range',
    icon: '🎯',
    requiresTarget: true,
  },
  {
    type: 'aim',
    name: 'Aim',
    description: 'Take careful aim at a target for +2 to next Shooting or Throwing roll',
    icon: '🎯',
    modifier: '+2 to next attack',
    requiresTarget: true,
  },
  {
    type: 'defend',
    name: 'Full Defense',
    description: 'Focus entirely on defense, gaining +2 to Parry until next turn',
    icon: '🛡️',
    modifier: '+2 to Parry',
  },
  {
    type: 'run',
    name: 'Run',
    description: 'Move up to Pace + d6 inches. May not attack this turn',
    icon: '👟',
  },
  {
    type: 'wild_attack',
    name: 'Wild Attack',
    description: 'Aggressive all-out attack: +2 to Fighting and damage, -2 to Parry',
    icon: '💥',
    modifier: '+2 attack/damage, -2 Parry',
    requiresTarget: true,
  },
  {
    type: 'called_shot',
    name: 'Called Shot',
    description: 'Target a specific location for -2 to attack but additional effects on hit',
    icon: '🎯',
    modifier: '-2 to attack',
    requiresTarget: true,
  },
  {
    type: 'grapple',
    name: 'Grapple',
    description: 'Opposed Fighting roll to grab and restrain an opponent',
    icon: '🤼',
    modifier: '-2 if not prone',
    requiresTarget: true,
  },
  {
    type: 'disarm',
    name: 'Disarm',
    description: 'Attack at -2 to knock weapon from opponent\'s hand',
    icon: '🗡️',
    modifier: '-2 to attack',
    requiresTarget: true,
  },
  {
    type: 'trick',
    name: 'Trick',
    description: 'Use Athletics, Fighting, Taunt, or other skill to gain advantage',
    icon: '🃏',
    modifier: 'Varies',
    requiresTarget: true,
  },
  {
    type: 'test_of_wills',
    name: 'Test of Wills',
    description: 'Use Intimidation or Taunt in an opposed roll to Shake opponent',
    icon: '💬',
    requiresTarget: true,
  },
  {
    type: 'support',
    name: 'Support',
    description: 'Use a skill to provide +1 to an ally\'s next action',
    icon: '🤝',
    modifier: '+1 to ally',
  },
  {
    type: 'unshaken',
    name: 'Recover from Shaken',
    description: 'Make a Spirit roll to remove Shaken condition',
    icon: '💪',
  },
  {
    type: 'use_power',
    name: 'Use Arcane Power',
    description: 'Activate one of your arcane abilities or spells',
    icon: '✨',
    requiresArcane: true,
  },
  {
    type: 'reload',
    name: 'Reload',
    description: 'Reload your weapon (takes 1 action per shot for most weapons)',
    icon: '🔄',
  },
  {
    type: 'change_weapon',
    name: 'Change Weapon / Ready Item',
    description: 'Draw, holster, or ready a different weapon or item',
    icon: '🎒',
  },
  {
    type: 'use_item',
    name: 'Use Item',
    description: 'Use a consumable item like a potion or dynamite',
    icon: '⚗️',
  },
  {
    type: 'coup_de_grace',
    name: 'Coup de Grâce / Finishing Move',
    description: 'Automatically kill or incapacitate a helpless target',
    icon: '☠️',
    requiresTarget: true,
  },
  {
    type: 'evasion',
    name: 'Evasion',
    description: 'Make an Athletics roll at -2 to avoid area effect attacks',
    icon: '🏃',
    modifier: '-2 Athletics',
  },
  {
    type: 'withdraw',
    name: 'Withdraw',
    description: 'Leave melee combat safely without provoking free attacks',
    icon: '🚪',
  },
  {
    type: 'multi_action',
    name: 'Multi-Action',
    description: 'Take multiple actions in one turn with -2 penalty per action',
    icon: '⚡',
    modifier: '-2 per extra action',
  },
];

export function ActionMenu({ onSelectAction, disabled = false, remainingActions = 1, character }: ActionMenuProps) {
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedPower, setSelectedPower] = useState<string>('');

  // Filter actions based on character capabilities
  const availableActions = COMBAT_ACTIONS.filter(action => {
    if (action.requiresArcane) {
      // Check if character has arcane background
      return character?.edges?.some(edge =>
        edge.name.toLowerCase().includes('arcane background')
      ) || false;
    }
    return true;
  });

  // Get character's arcane powers if they have arcane background
  const arcanePowers = character?.edges
    ?.find(edge => edge.name.toLowerCase().includes('arcane background'))
    ?.description?.split(',').map(p => p.trim()) || [];

  const handleActionChange = (event: any) => {
    const actionType = event.target.value;
    setSelectedAction(actionType);
    setSelectedPower('');

    const action = COMBAT_ACTIONS.find(a => a.type === actionType);
    if (action && !action.requiresArcane) {
      onSelectAction(action);
    }
  };

  const handlePowerChange = (event: any) => {
    const power = event.target.value;
    setSelectedPower(power);

    const action = COMBAT_ACTIONS.find(a => a.type === 'use_power');
    if (action) {
      onSelectAction(action, power);
    }
  };

  const selectedActionData = COMBAT_ACTIONS.find(a => a.type === selectedAction);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#f5e6d3',
            fontFamily: 'Rye, serif',
          }}
        >
          Combat Actions
        </Typography>
        {remainingActions > 0 && (
          <Typography
            sx={{
              fontSize: '10px',
              color: remainingActions > 1 ? '#44ff44' : '#ffaa44',
              fontWeight: 'bold',
            }}
          >
            {remainingActions} left
          </Typography>
        )}
      </Box>

      {/* Main Action Dropdown */}
      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <Select
          value={selectedAction}
          onChange={handleActionChange}
          disabled={disabled || remainingActions <= 0}
          displayEmpty
          sx={{
            backgroundColor: '#1a0f08',
            color: '#f5e6d3',
            fontSize: '11px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#8b4513',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#a0522d',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#4169e1',
            },
            '& .MuiSelect-icon': {
              color: '#8b4513',
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: '#2d1b0e',
                border: '2px solid #8b4513',
                maxHeight: 400,
                '& .MuiMenuItem-root': {
                  fontSize: '11px',
                  color: '#f5e6d3',
                  '&:hover': {
                    backgroundColor: 'rgba(139, 69, 19, 0.2)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(65, 105, 225, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(65, 105, 225, 0.4)',
                    },
                  },
                },
              },
            },
          }}
        >
          <MenuItem value="" disabled>
            <em>Select an action...</em>
          </MenuItem>
          {availableActions.map((action) => (
            <Tooltip
              key={action.type}
              title={
                <Box>
                  <Typography sx={{ fontSize: '11px', mb: 0.5 }}>
                    {action.description}
                  </Typography>
                  {action.modifier && (
                    <Typography sx={{ fontSize: '10px', color: '#ffaa44', fontStyle: 'italic' }}>
                      {action.modifier}
                    </Typography>
                  )}
                </Box>
              }
              placement="right"
              enterDelay={1000}
              enterNextDelay={1000}
              arrow
              slotProps={{
                tooltip: {
                  sx: {
                    backgroundColor: '#2d1b0e',
                    border: '1px solid #8b4513',
                    maxWidth: 250,
                  },
                },
                arrow: {
                  sx: {
                    color: '#2d1b0e',
                    '&::before': {
                      border: '1px solid #8b4513',
                    },
                  },
                },
              }}
            >
              <MenuItem value={action.type}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '14px' }}>{action.icon}</Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    {action.name}
                  </Typography>
                </Box>
              </MenuItem>
            </Tooltip>
          ))}
        </Select>
      </FormControl>

      {/* Arcane Power Dropdown (shown when Use Power is selected) */}
      {selectedAction === 'use_power' && arcanePowers.length > 0 && (
        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <Select
            value={selectedPower}
            onChange={handlePowerChange}
            displayEmpty
            sx={{
              backgroundColor: '#1a0f08',
              color: '#f5e6d3',
              fontSize: '11px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#8b4513',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#a0522d',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4169e1',
              },
              '& .MuiSelect-icon': {
                color: '#8b4513',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#2d1b0e',
                  border: '2px solid #8b4513',
                  '& .MuiMenuItem-root': {
                    fontSize: '11px',
                    color: '#f5e6d3',
                    '&:hover': {
                      backgroundColor: 'rgba(139, 69, 19, 0.2)',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(65, 105, 225, 0.3)',
                      '&:hover': {
                        backgroundColor: 'rgba(65, 105, 225, 0.4)',
                      },
                    },
                  },
                },
              },
            }}
          >
            <MenuItem value="" disabled>
              <em>Select a power...</em>
            </MenuItem>
            {arcanePowers.map((power, index) => (
              <Tooltip
                key={index}
                title={power}
                placement="right"
                enterDelay={1000}
                enterNextDelay={1000}
                arrow
                slotProps={{
                  tooltip: {
                    sx: {
                      backgroundColor: '#2d1b0e',
                      border: '1px solid #8b4513',
                      fontSize: '11px',
                    },
                  },
                  arrow: {
                    sx: {
                      color: '#2d1b0e',
                      '&::before': {
                        border: '1px solid #8b4513',
                      },
                    },
                  },
                }}
              >
                <MenuItem value={power}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '14px' }}>✨</Typography>
                    <Typography sx={{ fontSize: '11px' }}>{power}</Typography>
                  </Box>
                </MenuItem>
              </Tooltip>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Action Description */}
      {selectedActionData && (
        <Box
          sx={{
            p: 1,
            backgroundColor: '#1a0f08',
            border: '1px solid #8b4513',
            borderRadius: 1,
            mb: 1,
          }}
        >
          <Typography sx={{ fontSize: '10px', color: '#d4b896', mb: 0.5 }}>
            {selectedActionData.description}
          </Typography>
          {selectedActionData.modifier && (
            <Typography sx={{ fontSize: '9px', color: '#ffaa44', fontStyle: 'italic' }}>
              Modifier: {selectedActionData.modifier}
            </Typography>
          )}
        </Box>
      )}

      {/* Multi-Action Warning */}
      {remainingActions > 1 && (
        <Box
          sx={{
            p: 1,
            backgroundColor: '#1a0f08',
            border: '1px solid #8b4513',
            borderRadius: 1,
          }}
        >
          <Typography sx={{ fontSize: '9px', color: '#ffaa44', textAlign: 'center' }}>
            Multi-Action: -2 penalty per extra action
          </Typography>
        </Box>
      )}
    </Box>
  );
}
