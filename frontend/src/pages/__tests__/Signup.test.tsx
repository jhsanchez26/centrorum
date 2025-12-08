import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import { render as rtlRender } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Signup from '../Signup'

// -----------------------------
// FIX: TOTAL MOCK OF AuthContext
// -----------------------------
const mockRegister = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister
  })
}))

// FIX: mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// custom render with router
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, {
    wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// -----------------------------
//         TESTS
// -----------------------------

describe('Signup Component', () => {

  it('successfully registers user with valid data', async () => {
    mockRegister.mockResolvedValueOnce({ success: true })

    const user = userEvent.setup()
    render(<Signup />)

    await user.type(screen.getByPlaceholderText(/your.email/), 'test@upr.edu')
    await user.type(screen.getByPlaceholderText(/your name/i), 'Test User')
    await user.type(screen.getByPlaceholderText(/min 8/), 'testpass123')
    await user.type(screen.getByPlaceholderText(/confirm password/i), 'testpass123')

    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows loading state during registration', async () => {
    // create a promise that we control manually for loading state
    let resolveFn: any
    const pendingPromise = new Promise(res => (resolveFn = res))

    mockRegister.mockReturnValueOnce(pendingPromise)

    const user = userEvent.setup()
    render(<Signup />)

    await user.type(screen.getByPlaceholderText('your.email@upr.edu'), 'test@upr.edu')
    await user.type(screen.getByPlaceholderText('Your Name'), 'Test User')
    await user.type(screen.getByPlaceholderText(/min 8/), 'testpass123')
    await user.type(screen.getByPlaceholderText(/confirm password/i), 'testpass123')

    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
    })

    // resolve promise so test ends
    resolveFn()
  })

  it('shows error for non-UPR email', async () => {
    mockRegister.mockRejectedValueOnce(new Error("User with this email already exists."))

    const user = userEvent.setup()
    render(<Signup />)

    await user.type(screen.getByPlaceholderText('your.email@upr.edu'), 'test@gmail.com')
    await user.type(screen.getByPlaceholderText('Your Name'), 'Test User')
    await user.type(screen.getByPlaceholderText(/min 8/), 'testpass123')
    await user.type(screen.getByPlaceholderText(/confirm password/i), 'testpass123')

    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument()
    })
  })

})
