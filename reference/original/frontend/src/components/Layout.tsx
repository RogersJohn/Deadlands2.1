import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  MenuBook as WikiIcon,
  Logout as LogoutIcon,
  Lock as LockIcon,
  SportsEsports as GameIcon,
  Group as GroupIcon,
} from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'

const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Determine page title based on current route
  const pageTitle = useMemo(() => {
    const path = location.pathname
    if (path === '/dashboard') return 'My Characters'
    if (path === '/arena') return 'Combat Arena'
    if (path.startsWith('/wiki')) return 'Campaign Wiki'
    if (path.startsWith('/character/new')) return 'Create Character'
    if (path.includes('/edit')) return 'Edit Character'
    if (path.startsWith('/character/')) return 'Character Sheet'
    if (path === '/change-password') return 'Change Password'
    return null
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { text: 'My Characters', icon: <PersonIcon />, path: '/dashboard' },
    { text: 'Game Arena', icon: <GameIcon />, path: '/arena' },
    { text: 'Wiki', icon: <WikiIcon />, path: '/wiki' },
    { text: 'Change Password', icon: <LockIcon />, path: '/change-password' },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Deadlands Campaign Manager
            {pageTitle && (
              <Typography
                component="span"
                variant="h6"
                sx={{
                  ml: 2,
                  color: '#d4af37', // Gold color for page title
                  fontWeight: 400,
                }}
              >
                | {pageTitle}
              </Typography>
            )}
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username} ({user?.role})
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 250 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path)
                    setDrawerOpen(false)
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Container
        component="main"
        sx={{
          flex: 1,
          py: location.pathname === '/arena' ? 0 : 4,
          px: location.pathname === '/arena' ? 0 : 3,
          maxWidth: location.pathname === '/arena' ? '100%' : undefined,
        }}
        maxWidth={location.pathname === '/arena' ? false : 'lg'}
      >
        <Outlet />
      </Container>

      <Box component="footer" sx={{ bgcolor: 'background.paper', py: 3, mt: 'auto' }}>
        <Container>
          <Typography variant="body2" color="text.secondary" align="center">
            Deadlands Campaign Manager © 2024
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}

export default Layout
