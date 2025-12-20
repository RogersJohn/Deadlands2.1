import { Box, Typography, Select, MenuItem, FormControl } from '@mui/material';
import { Equipment } from '../types/GameTypes';

interface WeaponSelectionProps {
  weapons: Equipment[];
  selectedWeapon?: Equipment;
  onSelectWeapon: (weapon: Equipment) => void;
}

// Create an improvised weapon option (using club stats)
const IMPROVISED_WEAPON: Equipment = {
  id: 'improvised',
  name: 'Improvised Weapon',
  type: 'WEAPON_MELEE',
  damage: 'Str+d4',
  description: 'Club, bottle, chair leg, or any nearby object used as a weapon',
};

export function WeaponSelection({ weapons, selectedWeapon, onSelectWeapon }: WeaponSelectionProps) {
  // Filter for actual weapons only
  const actualWeapons = weapons.filter(eq =>
    eq.type === 'WEAPON_MELEE' || eq.type === 'WEAPON_RANGED'
  );

  // Remove duplicates by weapon name (in case character has multiple of same weapon)
  const uniqueWeapons = actualWeapons.reduce((acc, weapon) => {
    if (!acc.find(w => w.name === weapon.name)) {
      acc.push(weapon);
    }
    return acc;
  }, [] as Equipment[]);

  // Add improvised weapon option
  const weaponOptions = [...uniqueWeapons, IMPROVISED_WEAPON];

  const handleChange = (event: any) => {
    const selectedId = event.target.value;
    console.log('Weapon dropdown changed to ID:', selectedId);

    const weapon = weaponOptions.find(w => w.id === selectedId);
    if (weapon) {
      console.log('Selected weapon:', weapon);
      onSelectWeapon(weapon);
    }
  };

  const getWeaponLabel = (weapon: Equipment) => {
    const type = weapon.type === 'WEAPON_RANGED' ? '🔫' :
                 weapon.type === 'WEAPON_MELEE' ? '⚔️' :
                 weapon.id === 'improvised' ? '🔨' : '📦';

    let label = `${type} ${weapon.name}`;
    if (weapon.damage) label += ` (${weapon.damage})`;
    if (weapon.range) label += ` [${weapon.range}]`;

    return label;
  };

  return (
    <FormControl fullWidth size="small">
      <Select
        value={selectedWeapon?.id || ''}
        onChange={handleChange}
        displayEmpty
        sx={{
          backgroundColor: '#1a0f08',
          color: '#f5e6d3',
          fontSize: '12px',
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
                fontSize: '12px',
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
          <em>Select a weapon...</em>
        </MenuItem>
        {weaponOptions.map((weapon) => (
          <MenuItem key={weapon.id} value={weapon.id}>
            {getWeaponLabel(weapon)}
          </MenuItem>
        ))}
      </Select>

      {/* Show details of selected weapon */}
      {selectedWeapon && (
        <Box sx={{ mt: 1, p: 1, backgroundColor: '#1a0f08', borderRadius: 1, fontSize: '10px', color: '#d4b896' }}>
          {selectedWeapon.description && (
            <Typography sx={{ fontSize: '10px', mb: 0.5 }}>
              {selectedWeapon.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            {selectedWeapon.damage && <span>• Damage: {selectedWeapon.damage}</span>}
            {selectedWeapon.range && <span>• Range: {selectedWeapon.range}</span>}
            {selectedWeapon.rof && <span>• ROF: {selectedWeapon.rof}</span>}
            {selectedWeapon.shots && <span>• Shots: {selectedWeapon.shots}</span>}
          </Box>
        </Box>
      )}
    </FormControl>
  );
}
