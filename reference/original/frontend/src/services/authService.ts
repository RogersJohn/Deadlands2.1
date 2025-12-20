import api from './api'

interface LoginRequest {
  username: string
  password: string
}

interface RegisterRequest {
  username: string
  email: string
  password: string
}

interface LoginResponse {
  token: string
  userId: number
  username: string
  role: string
}

const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  register: async (data: RegisterRequest): Promise<void> => {
    await api.post('/auth/register', data)
  },
}

export default authService
