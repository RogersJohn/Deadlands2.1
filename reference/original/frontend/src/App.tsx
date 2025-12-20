import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CharacterSheet from './pages/CharacterSheet'
import CharacterCreate from './pages/CharacterCreate'
import CharacterEdit from './pages/CharacterEdit'
import CharacterSelect from './pages/CharacterSelect'
import ChangePassword from './pages/ChangePassword'
import Wiki from './pages/Wiki'
import AIAssistantWindow from './pages/AIAssistantWindow'
import Layout from './components/Layout'
import { GameArena } from './game/GameArena'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />

        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="character/new" element={<CharacterCreate />} />
          <Route path="character/:id" element={<CharacterSheet />} />
          <Route path="character/:id/edit" element={<CharacterEdit />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="wiki" element={<Wiki />} />
          <Route path="wiki/:slug" element={<Wiki />} />
          <Route path="character-select" element={<CharacterSelect />} />
          <Route path="arena" element={<GameArena />} />
        </Route>

        {/* AI Assistant Window - Opens in popup, no layout */}
        <Route path="/ai-assistant" element={isAuthenticated ? <AIAssistantWindow /> : <Navigate to="/login" />} />

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Box>
  )
}

export default App
