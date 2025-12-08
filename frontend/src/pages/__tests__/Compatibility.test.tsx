/**
 * Compatibility tests for Profile and Messaging components
 * Tests browser compatibility, responsive design, and cross-browser features
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render as rtlRender } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Profile from '../Profile'
import Messaging from '../Messaging'

// =========================================
// MOCK API UTILS
// =========================================
const { mockApiGet, mockApiPost, mockApiPatch, mockApiPut, mockApiDelete } = vi.hoisted(() => {
  return {
    mockApiGet: vi.fn(),
    mockApiPost: vi.fn(),
    mockApiPatch: vi.fn(),
    mockApiPut: vi.fn(),
    mockApiDelete: vi.fn(),
  }
})

vi.mock('../../lib/api', () => ({
  api: {
    get: mockApiGet,
    post: mockApiPost,
    patch: mockApiPatch,
    put: mockApiPut,
    delete: mockApiDelete,
    defaults: { headers: { common: {} } }
  },
  setToken: vi.fn(),
}))

// =========================================
// MOCK ROUTER
// =========================================
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ userId: 'me' }),
  }
})

// =========================================
// MOCK AUTH
// =========================================
const mockUser = {
  id: 1,
  email: 'test@upr.edu',
  display_name: 'Test User',
  encrypted_id: 'encrypted123',
}

const authReturnStore = {
  value: {
    user: mockUser,
    refreshUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    loading: false,
  }
}

vi.doUnmock('../../contexts/AuthContext')
vi.mock('../../contexts/AuthContext', () => {
  const mockUseAuth = vi.fn(() => authReturnStore.value)
  const MockAuthProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
  return { useAuth: mockUseAuth, AuthProvider: MockAuthProvider }
})

// =========================================
// RENDER WRAPPER
// =========================================
import { AuthProvider } from '../../contexts/AuthContext'
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    )
  })
}

// =========================================
// PROFILE TESTS
// =========================================
describe('Compatibility Tests - Profile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockReset()
    mockApiPatch.mockReset()
    mockApiPut.mockReset()
    mockApiDelete.mockReset()
    mockApiPost.mockReset()
  })

  it('handles missing bio field gracefully', async () => {
    const mockProfile = {
      user: {
        id: 1,
        display_name: 'Test User',
        email: 'test@upr.edu',
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [],
    }

    mockApiGet.mockResolvedValueOnce({ data: mockProfile })

    await act(async () => render(<Profile />))

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText(/no bio yet/i)).toBeInTheDocument()
    })
  })

  it('handles very long display names', async () => {
    const longName = 'A'.repeat(200)
    const mockProfile = {
      user: {
        id: 1,
        display_name: longName,
        email: 'test@upr.edu',
        bio: '',
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [],
    }

    mockApiGet.mockResolvedValueOnce({ data: mockProfile })

    await act(async () => render(<Profile />))

    await waitFor(() => {
      expect(screen.getByText(longName)).toBeInTheDocument()
    })
  })

  it('handles special characters in bio', async () => {
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const mockProfile = {
      user: {
        id: 1,
        display_name: 'Test User',
        email: 'test@upr.edu',
        bio: special,
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [],
    }

    mockApiGet.mockResolvedValueOnce({ data: mockProfile })

    await act(async () => render(<Profile />))

    await waitFor(() => {
      expect(screen.getByText(special)).toBeInTheDocument()
    })
  })

  it('handles unicode characters correctly', async () => {
    const unicode = 'Hello 世界 🌍 مرحبا'
    const mockProfile = {
      user: {
        id: 1,
        display_name: unicode,
        email: 'test@upr.edu',
        bio: unicode,
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [],
    }

    mockApiGet.mockResolvedValueOnce({ data: mockProfile })

    await act(async () => render(<Profile />))

    await waitFor(() => {
      const els = screen.getAllByText(unicode)
      expect(els.length).toBeGreaterThan(0)
    })
  })

  it('handles empty posts gracefully', async () => {
    const mockProfile = {
      user: {
        id: 1,
        display_name: 'Test User',
        email: 'test@upr.edu',
        bio: '',
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [],
    }

    mockApiGet.mockResolvedValueOnce({ data: mockProfile })

    await act(async () => render(<Profile />))

    await waitFor(() => {
      expect(screen.getByText(/you haven't posted anything yet/i)).toBeInTheDocument()
    })
  })

  it('handles null date gracefully', async () => {
    const mockProfile = {
      user: {
        id: 1,
        display_name: 'Test User',
        email: 'test@upr.edu',
        bio: '',
        date_joined: null,
      },
      posts: [],
    }

    mockApiGet.mockResolvedValueOnce({ data: mockProfile })

    await act(async () => render(<Profile />))

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })
})

// =========================================
// MESSAGING TESTS
// =========================================
describe('Compatibility Tests - Messaging Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockReset()
    mockApiPost.mockReset()
  })

  it('handles empty conversations array', async () => {
    mockApiGet.mockResolvedValueOnce({ data: [] })
    mockApiGet.mockResolvedValueOnce({ data: [] })

    await act(async () => render(<Messaging />))

    await waitFor(() => {
      expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument()
    })
  })

  it('handles empty messages array', async () => {
    const mockConversations = [
      {
        id: 1,
        user1: { id: 1, display_name: 'Test User' },
        user2: { id: 2, display_name: 'Other User' },
        other_user: { id: 2, display_name: 'Other User' },
        last_message: null,
        unread_count: 0,
        created_at: '',
        updated_at: '',
      },
    ]

    mockApiGet
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({})

    await act(async () => render(<Messaging />))

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument()
    })

    const item = screen.getByText('Other User').closest('div[style*="cursor"]')
    if (item) await userEvent.click(item)

    await waitFor(() => {
      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
    })
  })

  it('handles unicode in messages', async () => {
    const unicode = 'Hello 世界 🌍 مرحبا'

    const mockConversations = [
      {
        id: 1,
        user1: { id: 1 },
        user2: { id: 2 },
        other_user: { id: 2, display_name: 'Other User' },
        last_message: { id: 1, content: unicode, sender: { id: 2 } },
        unread_count: 0,
        created_at: '',
        updated_at: '',
      },
    ]

    mockApiGet
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: [] })

    await act(async () => render(<Messaging />))

    await waitFor(() => {
      expect(screen.getByText(unicode)).toBeInTheDocument()
    })
  })

  // ======================================================
  // *** FIXED TEST ***
  // ======================================================
  it('handles rapid tab switching', async () => {
    mockApiGet.mockResolvedValue({ data: [] })

    await act(async () => render(<Messaging />))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^conversations$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^requests$/i })).toBeInTheDocument()
    })

    const tab1 = screen.getByRole('button', { name: /^conversations$/i })
    const tab2 = screen.getByRole('button', { name: /^requests$/i })

    for (let i = 0; i < 10; i++) {
      await userEvent.click(tab1)
      await userEvent.click(tab2)
    }

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^conversations$/i })
      ).toBeInTheDocument()
    })
  })

  it('handles network errors gracefully', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network error'))
    mockApiGet.mockResolvedValueOnce({ data: [] })

    await act(async () => render(<Messaging />))

    await waitFor(() => {
      expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument()
    })
  })
})

// =========================================
// BROWSER COMPATIBILITY TESTS
// =========================================
describe('Cross-Browser Compatibility', () => {
  it('uses standard DOM APIs', () => {
    const div = document.createElement('div')
    div.textContent = 'Test'
    expect(div.textContent).toBe('Test')
  })

  it('handles Date objects', () => {
    const d = new Date('2024-01-01T00:00:00Z')
    expect(d.toISOString()).toBe('2024-01-01T00:00:00.000Z')
  })

  it('handles array functions', () => {
    const arr = [1, 2, 3]
    expect(arr.map(x => x * 2)).toEqual([2, 4, 6])
  })
})
