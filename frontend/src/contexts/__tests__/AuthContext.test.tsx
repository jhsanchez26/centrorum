import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../AuthContext'
import { mockApiResponses } from '../../test/__mocks__/api'
import { api } from '../../lib/api'

// Mock the API module
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  setToken: vi.fn(),
}))

// Test component that uses the auth context
function TestComponent() {
  const { user, login, register, logout, loading } = useAuth()
  
  const handleLogin = async () => {
    try {
      await login('test@upr.edu', 'password')
    } catch (error) {
      // Expected error, ignore
    }
  }
  
  const handleRegister = async () => {
    try {
      await register('test@upr.edu', 'Test User', 'password', 'password')
    } catch (error) {
      // Expected error, ignore
    }
  }
  
  return (
    <div>
      {loading && <div>Loading...</div>}
      {user ? (
        <div>
          <div>Welcome, {user.display_name}!</div>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleRegister}>Register</button>
        </div>
      )}
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage
    localStorage.clear()
  })

  it('provides initial state correctly', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('handles successful login', async () => {
    // Mock API responses
    vi.mocked(api.post).mockResolvedValueOnce(mockApiResponses.login.success)
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 1,
        email: 'test@upr.edu',
        display_name: 'Test User'
      }
    })
    
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    const loginButton = screen.getByText('Login')
    await user.click(loginButton)
    
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument()
    })
    
    expect(api.post).toHaveBeenCalledWith('/auth/login/', {
      email: 'test@upr.edu',
      password: 'password'
    })
  })

  it('handles login error', async () => {
    // Mock API to return error
    vi.mocked(api.post).mockRejectedValueOnce(mockApiResponses.login.error)
    
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    const loginButton = screen.getByText('Login')
    
    // Wrap the click in act to handle the async state update
    await act(async () => {
      await user.click(loginButton)
    })
    
    // Should still show login/register buttons on error
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })

  it('handles successful registration', async () => {
    // Mock API responses
    vi.mocked(api.post).mockResolvedValueOnce(mockApiResponses.register.success)
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 1,
        email: 'test@upr.edu',
        display_name: 'Test User'
      }
    })
    
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    const registerButton = screen.getByText('Register')
    await user.click(registerButton)
    
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument()
    })
    
    expect(api.post).toHaveBeenCalledWith('/auth/register/', {
      email: 'test@upr.edu',
      display_name: 'Test User',
      password: 'password',
      password_confirm: 'password'
    })
  })

  it('handles registration error', async () => {
    // Mock API to return error
    vi.mocked(api.post).mockRejectedValueOnce(mockApiResponses.register.error)
    
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    const registerButton = screen.getByText('Register')
    
    // Wrap the click in act to handle the async state update
    await act(async () => {
      await user.click(registerButton)
    })
    
    // Should still show login/register buttons on error
    await waitFor(() => {
      expect(screen.getByText('Register')).toBeInTheDocument()
    })
  })

  it('handles logout', async () => {
    // Mock initial login
    vi.mocked(api.post).mockResolvedValueOnce(mockApiResponses.login.success)
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 1,
        email: 'test@upr.edu',
        display_name: 'Test User'
      }
    })
    
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    // Login first
    const loginButton = screen.getByText('Login')
    await user.click(loginButton)
    
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument()
    })
    
    // Then logout
    const logoutButton = screen.getByText('Logout')
    await user.click(logoutButton)
    
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })

  it('restores user from token on mount', async () => {
    // Mock token in localStorage
    const mockToken = 'mock-access-token'
    localStorage.setItem('token', mockToken)
    
    // Mock API to return user data
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 1,
        email: 'test@upr.edu',
        display_name: 'Test User'
      }
    })
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument()
    })
    
    expect(api.get).toHaveBeenCalledWith('/auth/profile/')
  })

  it('handles token restoration error', async () => {
    // Mock token in localStorage
    localStorage.setItem('token', 'invalid-token')
    
    // Mock API to return error
    vi.mocked(api.get).mockRejectedValueOnce({
      response: { status: 401 }
    })
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    // Should show login/register buttons when token is invalid
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })

  it('shows loading state during authentication', async () => {
    // Mock API with delay
    vi.mocked(api.post).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockApiResponses.login.success), 100))
    )
    
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    const loginButton = screen.getByText('Login')
    await user.click(loginButton)
    
    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
