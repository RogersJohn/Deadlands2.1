import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'

interface HealthResponse {
  status: string
  timestamp: string
  service: string
}

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('/health')
  if (!response.ok) {
    throw new Error('Health check failed')
  }
  return response.json() as Promise<HealthResponse>
}

export function HomePage(): JSX.Element {
  const { user } = useAuthStore()
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: false,
  })

  return (
    <div className="home-page">
      <header className="page-header">
        <h1>Welcome, {user?.username}</h1>
        <p className="subtitle">
          {user?.role === 'GAME_MASTER' ? 'Game Master Dashboard' : 'Player Dashboard'}
        </p>
      </header>

      <main className="main-content">
        <section className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Characters</h2>
            <p>View and manage your characters</p>
            <span className="coming-soon">Coming Soon</span>
          </div>

          <div className="dashboard-card">
            <h2>Wiki</h2>
            <p>Campaign lore and information</p>
            <span className="coming-soon">Coming Soon</span>
          </div>

          <div className="dashboard-card">
            <h2>Game Session</h2>
            <p>Join or manage game sessions</p>
            <span className="coming-soon">Coming Soon</span>
          </div>

          {user?.role === 'GAME_MASTER' && (
            <div className="dashboard-card gm-card">
              <h2>GM Tools</h2>
              <p>Game Master controls and NPCs</p>
              <span className="coming-soon">Coming Soon</span>
            </div>
          )}
        </section>

        <section className="status-section">
          <h2>System Status</h2>
          {isLoading && <p className="loading">Checking backend...</p>}
          {error && <p className="error">Backend unavailable</p>}
          {health && (
            <div className="health-info">
              <span className="status-badge status-up">{health.status}</span>
              <span className="service-name">{health.service}</span>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default HomePage
