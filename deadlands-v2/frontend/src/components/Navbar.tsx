import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function Navbar(): JSX.Element {
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Deadlands</Link>
      </div>

      <div className="navbar-menu">
        {isAuthenticated ? (
          <>
            <Link to="/" className="nav-link">
              Dashboard
            </Link>
            <Link to="/characters" className="nav-link">
              Characters
            </Link>
            <Link to="/wiki" className="nav-link">
              Wiki
            </Link>
            {user?.role === 'GAME_MASTER' && (
              <Link to="/gm" className="nav-link gm-link">
                GM Tools
              </Link>
            )}
            <div className="navbar-user">
              <span className="user-name">{user?.username}</span>
              <span className="user-role">{user?.role === 'GAME_MASTER' ? 'GM' : 'Player'}</span>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="navbar-auth">
            <Link to="/login" className="nav-link">
              Sign In
            </Link>
            <Link to="/register" className="nav-link register-link">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
