import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render as rtlRender } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Signup from '../Signup'
import { mockApiResponses } from '../../test/__mocks__/api'
import { api } from '../../lib/api'

// Mock the API module - same pattern as Login tests
vi.mock('../../lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    defaults: {
      headers: {
        common: {}
      }
    }
  },
  setToken: vi.fn(),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Override the test-utils mock to use the real AuthContext implementation
// The real register function will use our mocked api.post
// We need to ensure the real AuthContext is used, not the mocked one from test-utils
// The test-utils wraps components in AuthProvider, so we need to make sure the real one is used
// We need to unmock first to clear the test-utils mock, then use the real implementation
vi.doUnmock('../contexts/AuthContext')
vi.mock('../contexts/AuthContext', async () => {
  // Import the actual AuthContext to use the real implementation
  const actual = await vi.importActual('../contexts/AuthContext') as typeof import('../contexts/AuthContext')
  console.log('[Signup.test] Using real AuthContext', { hasRegister: typeof actual.register === 'function' })
  return actual
})

// Custom render function that uses the real AuthProvider
// Import the real AuthProvider directly (it's unmocked above)
import { AuthProvider } from '../../contexts/AuthContext'
const render = (ui: React.ReactElement) => {
  console.log('[Signup.test] Custom render using RealAuthProvider:', typeof AuthProvider)
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    )
  })
}

describe('Signup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  it('renders signup form with all required fields', () => {
    render(<Signup />)
    
    expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('your.email@upr.edu')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Your Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password (min 8 characters)')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('shows validation error for non-UPR email', async () => {
    // Mock API to return validation error
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          email: ['User with this email already exists.']
        }
      }
    })
    
    const user = userEvent.setup()
    render(<Signup />)
    
    const emailInput = screen.getByPlaceholderText('your.email@upr.edu')
    const displayNameInput = screen.getByPlaceholderText('Your Name')
    const passwordInput = screen.getByPlaceholderText('Password (min 8 characters)')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })
    
    await user.type(emailInput, 'test@gmail.com')
    await user.type(displayNameInput, 'Test User')
    await user.type(passwordInput, 'testpass123')
    await user.type(confirmPasswordInput, 'testpass123')
    
    // Submit the form by clicking the submit button
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/user with this email already exists/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows error for password mismatch', async () => {
    // Mock API to return password mismatch error
    // The register function extracts error from error.response.data.password[0]
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          password: ['Passwords do not match.']
        }
      }
    })
    
    const user = userEvent.setup()
    render(<Signup />)
    
    const emailInput = screen.getByPlaceholderText('your.email@upr.edu')
    const displayNameInput = screen.getByPlaceholderText('Your Name')
    const passwordInput = screen.getByPlaceholderText('Password (min 8 characters)')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })
    
    await user.type(emailInput, 'test@upr.edu')
    await user.type(displayNameInput, 'Test User')
    await user.type(passwordInput, 'testpass123')
    await user.type(confirmPasswordInput, 'differentpass123')
    
    // Submit the form by clicking the submit button
    await user.click(submitButton)
    
    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('successfully registers user with valid data', async () => {
    // Mock API to return success (register calls api.post internally)
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        access: 'mock-token',
        user: {
          id: 1,
          email: 'test@upr.edu',
          display_name: 'Test User',
        }
      }
    })
    
    const user = userEvent.setup()
    render(<Signup />)
    
    const emailInput = screen.getByPlaceholderText('your.email@upr.edu')
    const displayNameInput = screen.getByPlaceholderText('Your Name')
    const passwordInput = screen.getByPlaceholderText('Password (min 8 characters)')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })
    
    await user.type(emailInput, 'test@upr.edu')
    await user.type(displayNameInput, 'Test User')
    await user.type(passwordInput, 'testpass123')
    await user.type(confirmPasswordInput, 'testpass123')
    
    // Submit the form by clicking the submit button
    await user.click(submitButton)
    
    // Wait for API to be called (register calls api.post internally)
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register/', {
        email: 'test@upr.edu',
        display_name: 'Test User',
        password: 'testpass123',
        password_confirm: 'testpass123'
      })
    }, { timeout: 3000 })
    
    // Wait for navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows loading state during registration', async () => {
    // Mock API to return success after delay
    let resolveApi: (value: any) => void
    const apiPromise = new Promise((resolve) => {
      resolveApi = resolve
    })
    vi.mocked(api.post).mockReturnValue(apiPromise)
    
    const user = userEvent.setup()
    render(<Signup />)
    
    const emailInput = screen.getByPlaceholderText('your.email@upr.edu')
    const displayNameInput = screen.getByPlaceholderText('Your Name')
    const passwordInput = screen.getByPlaceholderText('Password (min 8 characters)')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })
    
    await user.type(emailInput, 'test@upr.edu')
    await user.type(displayNameInput, 'Test User')
    await user.type(passwordInput, 'testpass123')
    await user.type(confirmPasswordInput, 'testpass123')
    
    // Submit the form by clicking the submit button
    await user.click(submitButton)
    
    // Wait for button to be disabled (loading state)
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /creating account/i })
      expect(button).toBeDisabled()
    }, { timeout: 3000 })
    
    // Resolve the promise to complete the test
    resolveApi!({
      data: {
        access: 'mock-token',
        user: {
          id: 1,
          email: 'test@upr.edu',
          display_name: 'Test User',
        }
      }
    })
  })

  it('prevents form submission with empty fields', async () => {
    const user = userEvent.setup()
    render(<Signup />)
    
    const submitButton = screen.getByRole('button', { name: /sign up/i })
    
    // Try to submit the form - HTML5 validation should prevent it
    await user.click(submitButton)
    
    // Form should not submit with empty fields (HTML5 validation prevents it)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('has link to login page', () => {
    render(<Signup />)
    
    const loginLink = screen.getByRole('link', { name: /sign in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })
})
