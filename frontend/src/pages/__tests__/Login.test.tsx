import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen, waitFor, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Login from '../Login'
import { mockApiResponses } from '../../test/__mocks__/api'
import { api } from '../../lib/api'

// Mock the API module
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
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Usar la implementación real de AuthContext
vi.doUnmock('../../contexts/AuthContext')
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext')
  return actual
})

// Custom render function that uses the real AuthProvider
import { AuthProvider } from '../../contexts/AuthContext'

const render = (ui: ReactElement) => {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    )
  })
}

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with required fields', () => {
    render(<Login />)

    // Heading actual del UI
    expect(
      screen.getByRole('heading', { name: /sign in to your account/i })
    ).toBeInTheDocument()

    // Inputs usando los placeholders reales
    expect(
      screen.getByPlaceholderText('your.email@upr.edu')
    ).toBeInTheDocument()

    expect(
      screen.getByPlaceholderText('••••••••')
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: /sign in/i })
    ).toBeInTheDocument()
  })

  it('shows error for login failed', async () => {
    // Mock API to return authentication error
    vi.mocked(api.post).mockRejectedValueOnce(mockApiResponses.login.error)

    const user = userEvent.setup()
    render(<Login />)

    const emailInput = screen.getByPlaceholderText('your.email@upr.edu')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@upr.edu')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument()
    })
  })

  it('successfully logs in with valid credentials', async () => {
    // Mock API to return success
    vi.mocked(api.post).mockResolvedValueOnce(mockApiResponses.login.success)

    const user = userEvent.setup()
    render(<Login />)

    const emailInput = screen.getByPlaceholderText('your.email@upr.edu')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@upr.edu')
    await user.type(passwordInput, 'testpass123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login/', {
        email: 'test@upr.edu',
        password: 'testpass123',
      })
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    }, { timeout: 3000 })
  })

  it('shows loading state during login', async () => {
    // Mock API to return success after delay
    vi.mocked(api.post).mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockApiResponses.login.success), 100)
        )
    )

    const user = userEvent.setup()
    render(<Login />)

    const emailInput = screen.getByPlaceholderText('your.email@upr.edu')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@upr.edu')
    await user.type(passwordInput, 'testpass123')
    await user.click(submitButton)

    // Check that button is disabled during loading
    expect(submitButton).toBeDisabled()
  })

  it('prevents form submission with empty fields', async () => {
    const user = userEvent.setup()
    render(<Login />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // Form should not submit with empty fields
    expect(api.post).not.toHaveBeenCalled()
  })

  it('has link to signup page', async () => {
    await act(async () => {
      render(<Login />)
    })

    const signupLink = screen.getByRole('link', { name: /sign up/i })
    expect(signupLink).toBeInTheDocument()
    expect(signupLink).toHaveAttribute('href', '/signup')
  })

  it('clears error when form is resubmitted', async () => {
    // Mock API to return error first, then success
    vi.mocked(api.post)
      .mockRejectedValueOnce(mockApiResponses.login.error)
      .mockResolvedValueOnce(mockApiResponses.login.success)

    const user = userEvent.setup()
    render(<Login />)

    const emailInput = screen.getByPlaceholderText('your.email@upr.edu')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // First submission with wrong password
    await user.type(emailInput, 'test@upr.edu')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument()
    })

    // Clear password and type correct one
    await user.clear(passwordInput)
    await user.type(passwordInput, 'testpass123')
    await user.click(submitButton)

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument()
    })
  })
})
