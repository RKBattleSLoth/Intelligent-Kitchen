import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  dietaryPreference: string
  healthGoal: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  error: null,
  isAuthenticated: false,
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password })
      const { user, token } = response.data
      
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      return { user, token }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Login failed')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async ({ 
    email, 
    password, 
    firstName, 
    lastName, 
    dietaryPreference, 
    healthGoal 
  }: {
    email: string
    password: string
    firstName: string
    lastName: string
    dietaryPreference?: string
    healthGoal?: string
  }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/auth/register', {
        email,
        password,
        firstName,
        lastName,
        dietaryPreference,
        healthGoal,
      })
      const { user, token } = response.data
      
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      return { user, token }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Registration failed')
    }
  }
)

export const verifyToken = createAsyncThunk(
  'auth/verifyToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const response = await axios.get('/api/auth/verify')
      return response.data.user
    } catch (error: any) {
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      return rejectWithValue(error.response?.data?.error || 'Token verification failed')
    }
  }
)

export const autoLogin = createAsyncThunk(
  'auth/autoLogin',
  async (_, { rejectWithValue }) => {
    try {
      // Auto-authenticate with real user for testing
      const realUser: User = {
        id: '2d4969fe-fedb-4c37-89e2-75eaf6ad61a3',
        email: 'admin@intelligentkitchen.com',
        firstName: 'Admin',
        lastName: 'User',
        dietaryPreference: 'none',
        healthGoal: 'maintain'
      }
      
      const realToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZDQ5NjlmZS1mZWRiLTRjMzctODllMi03NWVhZjZhZDYxYTMiLCJpYXQiOjE3NTkxNzEzNDcsImV4cCI6MTc1OTc3NjE0N30.YlRCtvRCUGTRrW-e6LM_3ZXd-Tl_Y2LJDSmMS5-LE_8'
      
      localStorage.setItem('token', realToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${realToken}`
      
      return { user: realUser, token: realToken }
    } catch (error: any) {
      return rejectWithValue('Auto-login failed')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      // Verify token
      .addCase(verifyToken.pending, (state) => {
        state.isLoading = true
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(verifyToken.rejected, (state, action) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.error = action.payload as string
      })
      // Auto-login
      .addCase(autoLogin.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(autoLogin.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(autoLogin.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.error = null
      })
  },
})

export const { clearError, setUser } = authSlice.actions
export default authSlice.reducer