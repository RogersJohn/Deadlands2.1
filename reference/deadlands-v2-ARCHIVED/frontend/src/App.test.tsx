import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { useAuthStore } from './stores/authStore'

// Clear localStorage and reset store before each test
beforeEach(() => {
  localStorage.clear()
  // Reset the auth store
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  })
})

describe('App - Unauthenticated', () => {
  it('redirects to login page when not authenticated', () => {
    render(<App />)
    // Should show login page since we're not authenticated
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByText('Sign in to continue to Deadlands')).toBeInTheDocument()
  })

  it('renders login form elements', () => {
    render(<App />)
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows link to register page in auth switch text', () => {
    render(<App />)
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
    // Use getAllBy since there are two Sign up links
    const signUpLinks = screen.getAllByRole('link', { name: /sign up/i })
    expect(signUpLinks.length).toBeGreaterThan(0)
  })

  it('renders navbar brand', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: /deadlands/i })).toBeInTheDocument()
  })
})

describe('App - Authenticated', () => {
  beforeEach(() => {
    // Set up authenticated state directly in the Zustand store
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'PLAYER' as const,
    }

    useAuthStore.setState({
      user: mockUser,
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    })
  })

  it('shows home page when authenticated', () => {
    render(<App />)
    expect(screen.getByText(/welcome, testuser/i)).toBeInTheDocument()
  })

  it('shows dashboard cards', () => {
    render(<App />)
    // Characters and Wiki appear in both navbar and dashboard cards
    expect(screen.getAllByText('Characters').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Wiki').length).toBeGreaterThan(0)
    expect(screen.getByText('Game Session')).toBeInTheDocument()
  })

  it('shows logout button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })
})
