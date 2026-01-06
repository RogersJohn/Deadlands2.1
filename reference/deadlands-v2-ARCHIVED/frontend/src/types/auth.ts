export type Role = 'PLAYER' | 'GAME_MASTER'

export interface User {
  id: number
  username: string
  email: string | null
  role: Role
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  email?: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface AuthError {
  message: string
  status: number
  timestamp: string
}
