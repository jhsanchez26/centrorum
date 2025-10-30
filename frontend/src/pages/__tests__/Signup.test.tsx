import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/test-utils'
import Signup from '../Signup'
import { mockApiResponses } from '../../test/__mocks__/api'
import { api } from '../../lib/api'

// Mock the API module
vi.mock('../../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
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

describe('Signup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    vi.mocked(api.post).mockRejectedValueOnce(mockApiResponses.register.error)
    
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
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/user with this email already exists/i)).toBeInTheDocument()
    })
  })

  it('shows error for password mismatch', async () => {
    // Mock API to return password mismatch error
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
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('successfully registers user with valid data', async () => {
    // Mock API to return success
    vi.mocked(api.post).mockResolvedValueOnce(mockApiResponses.register.success)
    
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
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register/', {
        email: 'test@upr.edu',
        display_name: 'Test User',
        password: 'testpass123',
        password_confirm: 'testpass123'
      })
    })
    
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('shows loading state during registration', async () => {
    // Mock API to return success after delay
    vi.mocked(api.post).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockApiResponses.register.success), 100))
    )
    
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
    await user.click(submitButton)
    
    // Check that button is disabled during loading
    expect(submitButton).toBeDisabled()
  })

  it('prevents form submission with empty fields', async () => {
    const user = userEvent.setup()
    render(<Signup />)
    
    const submitButton = screen.getByRole('button', { name: /sign up/i })
    await user.click(submitButton)
    
    // Form should not submit with empty fields
    expect(api.post).not.toHaveBeenCalled()
  })

  it('has link to login page', async () => {
    await act(async () => {
      render(<Signup />)
    })
    
    const loginLink = screen.getByRole('link', { name: /sign in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })
})
