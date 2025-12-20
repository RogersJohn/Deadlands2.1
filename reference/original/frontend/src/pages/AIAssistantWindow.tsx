import { Box, Alert, AlertTitle } from '@mui/material';
import AIAssistantPanel from '../components/ai/AIAssistantPanel';
import { useAuthStore } from '../store/authStore';

/**
 * Standalone AI Assistant Window
 * Opens in a popup for better screen real estate
 * GM ONLY - Players cannot access this feature
 */
export default function AIAssistantWindow() {
  const { user } = useAuthStore();
  const isGameMaster = user?.role === 'GAME_MASTER';

  // GM-only guard: prevent players from accessing AI Assistant
  if (!isGameMaster) {
    return (
      <Box
        sx={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#1a1410',
        }}
      >
        <Alert
          severity="error"
          sx={{
            maxWidth: 600,
            m: 2,
            bgcolor: '#2c1810',
            border: '2px solid #8B0000',
            '& .MuiAlert-icon': { color: '#FF6B6B' },
            '& .MuiAlert-message': { color: '#f5deb3' }
          }}
        >
          <AlertTitle sx={{ color: '#FF6B6B', fontWeight: 'bold', fontFamily: 'Rye, serif' }}>
            🚫 Access Denied
          </AlertTitle>
          <strong>The AI Gamemaster Assistant is only available to Game Masters.</strong>
          <br /><br />
          This powerful tool provides AI-generated NPCs, encounters, locations, and rule lookups.
          Only the GM has access to ensure game balance and prevent meta-gaming.
          <br /><br />
          <em>If you believe you should have access, please contact your Game Master.</em>
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#1a1410',
        overflow: 'hidden',
      }}
    >
      {/* Human GM Authority Notice */}
      <Alert
        severity="info"
        sx={{
          m: 1,
          bgcolor: '#2c1810',
          border: '2px solid #FFD700',
          '& .MuiAlert-icon': { color: '#FFD700' },
          '& .MuiAlert-message': { color: '#f5deb3' }
        }}
      >
        <AlertTitle sx={{ color: '#FFD700', fontWeight: 'bold', fontFamily: 'Rye, serif' }}>
          ⚠️ HUMAN GAME MASTER HAS FINAL AUTHORITY ⚠️
        </AlertTitle>
        <strong>The HUMAN GM is the ultimate authority at this table.</strong>
        <br />
        The AI is a TOOL to assist gameplay - it provides suggestions based on Savage Worlds rules,
        but the HUMAN GM can overrule ANY suggestion, even if it contradicts official rules.
        <br />
        <strong>Your table, your rules. The AI serves YOU.</strong>
      </Alert>

      {/* AI Panel */}
      <Box sx={{ flex: 1, m: 1, overflow: 'hidden' }}>
        <AIAssistantPanel />
      </Box>
    </Box>
  );
}
