import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D4C5A9', // Tan/Cream - High contrast on dark backgrounds
      light: '#E8DCC4',
      dark: '#B8A888',
      contrastText: '#1a1410',
    },
    secondary: {
      main: '#FFD700', // Bright Gold - Western accent
      light: '#FFE55C',
      dark: '#FFC107',
      contrastText: '#1a1410',
    },
    background: {
      default: '#1a1410', // Very dark brown
      paper: '#2d2419', // Dark brown paper
    },
    text: {
      primary: '#E8DCC4', // Cream text for high contrast
      secondary: '#B8A888', // Muted tan for secondary text
    },
    error: {
      main: '#DC3545', // Brighter red for visibility
    },
    success: {
      main: '#5C8A3A', // Muted green
    },
    warning: {
      main: '#FFA726', // Orange warning
    },
    info: {
      main: '#5A9BD5', // Dusty blue
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Rye", "Special Elite", serif',
      fontWeight: 400,
      letterSpacing: '0.05em',
      color: '#FFD700', // Gold for main headers
    },
    h2: {
      fontFamily: '"Rye", "Special Elite", serif',
      fontWeight: 400,
      letterSpacing: '0.05em',
      color: '#FFD700',
    },
    h3: {
      fontFamily: '"Rye", "Special Elite", serif',
      fontWeight: 400,
      letterSpacing: '0.03em',
      color: '#E8DCC4',
    },
    h4: {
      fontFamily: '"Special Elite", "Rye", serif',
      fontWeight: 400,
      letterSpacing: '0.02em',
      color: '#E8DCC4',
    },
    h5: {
      fontFamily: '"Special Elite", serif',
      fontWeight: 600,
      letterSpacing: '0.01em',
      color: '#D4C5A9',
    },
    h6: {
      fontFamily: '"Special Elite", serif',
      fontWeight: 600,
      color: '#D4C5A9',
    },
    button: {
      fontFamily: '"Special Elite", "Roboto", sans-serif',
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'uppercase',
          borderRadius: 8,
          fontWeight: 700,
        },
        contained: {
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 8px rgba(0, 0, 0, 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
          border: '1px solid rgba(212, 197, 169, 0.12)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
        filled: {
          backgroundColor: '#3d342a',
          color: '#E8DCC4',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(212, 197, 169, 0.12)',
        },
      },
    },
  },
})

export default theme
