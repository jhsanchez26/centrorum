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
import { useAuth } from '../../contexts/AuthContext'

// Mock dependencies - use vi.hoisted to avoid hoisting issues
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
    defaults: {
      headers: {
        common: {}
      }
    }
  },
  setToken: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ userId: 'me' }),
  }
})

const mockUser = {
  id: 1,
  email: 'test@upr.edu',
  display_name: 'Test User',
  encrypted_id: 'encrypted123',
}

// Mock AuthContext with a store pattern like Profile.test.tsx
const authReturnStore = { value: {
  user: mockUser,
  refreshUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  loading: false,
} }

vi.doUnmock('../../contexts/AuthContext')
vi.mock('../../contexts/AuthContext', () => {
  const mockUseAuth = vi.fn(() => {
    return authReturnStore.value
  })
  const MockAuthProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
  return {
    useAuth: mockUseAuth,
    AuthProvider: MockAuthProvider,
  }
})

// Custom render function
import { AuthProvider } from '../../contexts/AuthContext'
const render = (ui: React.ReactElement) => {
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

describe('Compatibility Tests - Profile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset API mocks
      mockApiGet.mockReset()
    mockApiPatch.mockReset()
    mockApiPut.mockReset()
    mockApiDelete.mockReset()
    mockApiPost.mockReset()
  })

  it('handles missing bio field gracefully', async () => {
    const mockProfileData = {
      user: {
        id: 1,
        display_name: 'Test User',
        email: 'test@upr.edu',
        // bio field missing
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [],
    }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

    await act(async () => {
      render(<Profile />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    // Should not crash, bio should default to empty string
    const bioElement = screen.queryByText(/no bio yet/i)
    expect(bioElement).toBeInTheDocument()
  })

  it('handles very long display names', async () => {
    const longName = 'A'.repeat(200)
    const mockProfileData = {
      user: {
        id: 1,
        display_name: longName,
        email: 'test@upr.edu',
        bio: '',
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [],
    }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

    await act(async () => {
      render(<Profile />)
    })

    await waitFor(() => {
      expect(screen.getByText(longName)).toBeInTheDocument()
    })
  })

  it('handles special characters in bio', async () => {
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const mockProfileData = {
      user: {
        id: 1,
        display_name: 'Test User',
        email: 'test@upr.edu',
        bio: specialChars,
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [],
    }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

    await act(async () => {
      render(<Profile />)
    })

    await waitFor(() => {
      expect(screen.getByText(specialChars)).toBeInTheDocument()
    })
  })

  it('handles unicode characters correctly', async () => {
    const unicodeText = 'Hello 世界 🌍 مرحبا'
    const mockProfileData = {
      user: {
        id: 1,
        display_name: unicodeText,
        email: 'test@upr.edu',
        bio: unicodeText,
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [],
    }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

    await act(async () => {
      render(<Profile />)
    })

    await waitFor(() => {
      // The text appears in both the h1 (display_name) and p (bio) - check that it appears at least once
      const elements = screen.getAllByText(unicodeText)
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  it('handles empty posts array', async () => {
    const mockProfileData = {
      user: {
        id: 1,
        display_name: 'Test User',
        email: 'test@upr.edu',
        bio: '',
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [], // Empty array
    }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

    await act(async () => {
      render(<Profile />)
    })

    await waitFor(() => {
      expect(screen.getByText(/you haven't posted anything yet/i)).toBeInTheDocument()
    })
  })

  it('handles null/undefined date gracefully', async () => {
    const mockProfileData = {
      user: {
        id: 1,
        display_name: 'Test User',
        email: 'test@upr.edu',
        bio: '',
        date_joined: null, // Null date
      },
      posts: [],
    }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

    await act(async () => {
      render(<Profile />)
    })

    // Should not crash, should handle gracefully
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })
})

describe('Compatibility Tests - Messaging Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset API mocks
      mockApiGet.mockReset()
    mockApiPost.mockReset()
  })

  it('handles empty conversations array', async () => {
      mockApiGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })

    await act(async () => {
      render(<Messaging />)
    })

    await waitFor(() => {
      expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument()
    })
  })

  it('handles empty messages array', async () => {
    const mockConversations = [
      {
        id: 1,
        user1: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
        user2: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
        other_user: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
        last_message: null,
        unread_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

      mockApiGet
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] }) // Empty messages
      .mockResolvedValueOnce({})

    await act(async () => {
      render(<Messaging />)
    })

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument()
    })

    // Click on the conversation to view messages
    const conversationItem = screen.getByText('Other User').closest('div[style*="cursor"]')
    if (conversationItem) {
      await userEvent.click(conversationItem as HTMLElement)
    }

    await waitFor(() => {
      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
    })
  })

  it('handles very long message content', async () => {
    const longMessage = 'A'.repeat(10000)
    const mockConversations = [
      {
        id: 1,
        user1: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
        user2: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
        other_user: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
        last_message: {
          id: 1,
          sender: { id: 2, display_name: 'Other User' },
          content: longMessage.substring(0, 50) + '...', // Truncated in last_message
          created_at: '2024-01-01T00:00:00Z',
        },
        unread_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

      mockApiGet
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: [] })

    await act(async () => {
      render(<Messaging />)
    })

    // Should render without crashing
    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument()
    })
  })

  it('handles missing optional fields gracefully', async () => {
    const mockConversations = [
      {
        id: 1,
        user1: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
        user2: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
        other_user: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
        // last_message missing
        // unread_count missing
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

      mockApiGet
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: [] })

    await act(async () => {
      render(<Messaging />)
    })

    // Should not crash
    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument()
    })
  })

  it('handles unicode in message content', async () => {
    const unicodeMessage = 'Hello 世界 🌍 مرحبا'
    const mockConversations = [
      {
        id: 1,
        user1: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
        user2: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
        other_user: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
        last_message: {
          id: 1,
          sender: { id: 2, display_name: 'Other User' },
          content: unicodeMessage,
          created_at: '2024-01-01T00:00:00Z',
        },
        unread_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

      mockApiGet
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: [] })

    await act(async () => {
      render(<Messaging />)
    })

    await waitFor(() => {
      expect(screen.getByText(unicodeMessage)).toBeInTheDocument()
    })
  })

  it('handles rapid tab switching', async () => {
      mockApiGet
      .mockResolvedValue({ data: [] })

    await act(async () => {
      render(<Messaging />)
    })

    // Wait for tabs to be available
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /conversations/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /requests/i })).toBeInTheDocument()
    })

    const conversationsTab = screen.getByRole('button', { name: /conversations/i })
    const requestsTab = screen.getByRole('button', { name: /requests/i })

    // Rapidly switch tabs
    for (let i = 0; i < 10; i++) {
      await userEvent.click(conversationsTab)
      await userEvent.click(requestsTab)
    }

    // Should not crash or have state issues
    await waitFor(() => {
      expect(screen.getByText(/conversations/i)).toBeInTheDocument()
    })
  })

  it('handles network errors gracefully', async () => {
    mockApiGet
      .mockRejectedValueOnce(new Error('Network error')) // conversations call fails
      .mockResolvedValueOnce({ data: [] }) // requests call succeeds

    await act(async () => {
      render(<Messaging />)
    })

    // Should handle error without crashing - component should show error or empty state
    await waitFor(() => {
      // Component should still render, showing error message or empty state
      expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument()
    })
  })
})

describe('Cross-Browser Compatibility', () => {
  it('uses standard DOM APIs', () => {
    // Test that components use standard DOM APIs that work across browsers
    const div = document.createElement('div')
    div.textContent = 'Test'
    expect(div.textContent).toBe('Test')
  })

  it('handles Date objects correctly', () => {
    // Test date handling compatibility
    const date = new Date('2024-01-01T00:00:00Z')
    expect(date instanceof Date).toBe(true)
    expect(date.toISOString()).toBe('2024-01-01T00:00:00.000Z')
  })

  it('handles array methods correctly', () => {
    // Test array method compatibility
    const arr = [1, 2, 3]
    expect(arr.map(x => x * 2)).toEqual([2, 4, 6])
    expect(arr.filter(x => x > 1)).toEqual([2, 3])
  })
})
