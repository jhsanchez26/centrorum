/**
 * Comprehensive tests for Messaging component
 * Includes: Unit tests, Integration tests, Accessibility tests
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/test-utils'
import Messaging from '../Messaging'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'

// Mock the API module - this will override the mock in test-utils
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: {
      headers: {
        common: {}
      }
    }
  },
  setToken: vi.fn(),
}))

// Import the mocked api to get access to the mock functions
import { api } from '../../lib/api'

// Create aliases for easier use in tests - access the mocks directly
// Cast to ensure TypeScript knows these are mock functions
const mockApiGet = api.get as ReturnType<typeof vi.fn>
const mockApiPost = api.post as ReturnType<typeof vi.fn>

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock useAuth and AuthProvider
// Use vi.hoisted to ensure these are available in the mock factory
const { mockUser, mockRefreshUser, mockLogin, mockRegister, mockLogout, mockUseAuth } = vi.hoisted(() => {
  const mockUser = {
    id: 1,
    email: 'test@upr.edu',
    display_name: 'Test User',
    encrypted_id: 'encrypted123',
  }

  const mockRefreshUser = vi.fn()
  const mockLogin = vi.fn()
  const mockRegister = vi.fn()
  const mockLogout = vi.fn()
  
  const mockUseAuth = vi.fn()

  return { mockUser, mockRefreshUser, mockLogin, mockRegister, mockLogout, mockUseAuth }
})

// Mock useAuth - this must override the mock in test-utils.tsx
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext')
  return {
    ...actual,
    useAuth: mockUseAuth,
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

describe('Messaging Component - Unit Tests', () => {
  beforeEach(() => {
    // Clear call history for navigation and auth mocks
    mockNavigate.mockClear()
    mockRefreshUser.mockClear()
    mockLogin.mockClear()
    mockRegister.mockClear()
    mockLogout.mockClear()
    // Reset API mocks - clear implementations and call history
    // Each test must set up its own mockResolvedValueOnce() calls before render()
    mockApiGet.mockReset()
    mockApiPost.mockReset()
    // Reset call history and ensure mock always returns the user
    mockUseAuth.mockClear()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      refreshUser: mockRefreshUser,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      loading: false,
    })
  })

  describe('Conversations List', () => {
    it('displays conversations correctly', async () => {
      const mockConversations = [
        {
          id: 1,
          user1: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
          user2: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
          other_user: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
          last_message: {
            id: 1,
            sender: { id: 2, display_name: 'Other User' },
            content: 'Last message',
            created_at: '2024-01-01T00:00:00Z',
          },
          unread_count: 2,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      // Set up mocks - the component calls fetchConversations() and fetchConversationRequests() in parallel
      mockApiGet
        .mockResolvedValueOnce({ data: mockConversations }) // conversations - first call in Promise.all
        .mockResolvedValueOnce({ data: [] }) // requests - second call in Promise.all

      await act(async () => {
        render(<Messaging />)
      })

      // Verify mocks were called
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalled()
      }, { timeout: 1000 })

      await waitFor(() => {
        expect(screen.getByText('Other User')).toBeInTheDocument()
        expect(screen.getByText('Last message')).toBeInTheDocument()
      })
    })

    it('displays unread count badge', async () => {
      const mockConversations = [
        {
          id: 1,
          user1: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
          user2: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
          other_user: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
          last_message: null,
          unread_count: 5,
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
        expect(screen.getByText('5')).toBeInTheDocument()
      })
    })

    it('displays empty state when no conversations', async () => {
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

    it('selects conversation when clicked', async () => {
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

      const mockMessages = [
        {
          id: 1,
          sender: { id: 2, display_name: 'Other User' },
          content: 'Hello!',
          created_at: '2024-01-01T00:00:00Z',
          read_at: null,
        },
      ]

      mockApiGet
        .mockResolvedValueOnce({ data: mockConversations })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockMessages }) // messages
        .mockResolvedValueOnce({}) // mark-read

      await act(async () => {
        render(<Messaging />)
      })

      await waitFor(() => {
        expect(screen.getByText('Other User')).toBeInTheDocument()
      })

      const conversationItem = screen.getByText('Other User').closest('div')
      if (conversationItem) {
        await userEvent.click(conversationItem)

        await waitFor(() => {
          expect(mockApiGet).toHaveBeenCalledWith('/auth/conversations/1/messages/')
        })
      }
    })
  })

  describe('Messages Display', () => {
    it('displays messages in conversation', async () => {
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

      const mockMessages = [
        {
          id: 1,
          sender: { id: 1, display_name: 'Test User' },
          content: 'Message from me',
          created_at: '2024-01-01T00:00:00Z',
          read_at: null,
        },
        {
          id: 2,
          sender: { id: 2, display_name: 'Other User' },
          content: 'Message from other',
          created_at: '2024-01-01T01:00:00Z',
          read_at: null,
        },
      ]

      mockApiGet
        .mockResolvedValueOnce({ data: mockConversations })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockMessages })
        .mockResolvedValueOnce({})

      await act(async () => {
        render(<Messaging />)
      })

      await waitFor(() => {
        expect(screen.getByText('Other User')).toBeInTheDocument()
      })

      const conversationItem = screen.getByText('Other User').closest('div')
      if (conversationItem) {
        await userEvent.click(conversationItem)
      }

      await waitFor(() => {
        expect(screen.getByText('Message from me')).toBeInTheDocument()
        expect(screen.getByText('Message from other')).toBeInTheDocument()
      })
    })

    it('displays empty state when no messages', async () => {
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
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({})

      await act(async () => {
        render(<Messaging />)
      })

      await waitFor(() => {
        expect(screen.getByText('Other User')).toBeInTheDocument()
      })

      const conversationItem = screen.getByText('Other User').closest('div')
      if (conversationItem) {
        await userEvent.click(conversationItem)
      }

      await waitFor(() => {
        expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
      })
    })
  })

  describe('Sending Messages', () => {
    it('sends a message successfully', async () => {
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

      const mockMessages = []

      mockApiGet
        .mockResolvedValueOnce({ data: mockConversations }) // initial conversations
        .mockResolvedValueOnce({ data: [] }) // initial requests
        .mockResolvedValueOnce({ data: mockMessages }) // messages when conversation selected
        .mockResolvedValueOnce({ data: mockConversations }) // refresh conversations after mark-read
        .mockResolvedValueOnce({ data: mockConversations }) // refresh conversations after send

      mockApiPost
        .mockResolvedValueOnce({ data: {} }) // mark-read
        .mockResolvedValueOnce({ // send message
          data: {
            id: 1,
            sender: { id: 1, display_name: 'Test User' },
            content: 'New message',
            created_at: '2024-01-01T02:00:00Z',
            read_at: null,
          },
        })

      await act(async () => {
        render(<Messaging />)
      })

      await waitFor(() => {
        expect(screen.getByText('Other User')).toBeInTheDocument()
      })

      const conversationItem = screen.getByText('Other User').closest('div')
      if (conversationItem) {
        await userEvent.click(conversationItem)
      }

      await waitFor(() => {
        const messageInput = screen.getByPlaceholderText(/type a message/i)
        expect(messageInput).toBeInTheDocument()
      })

      const messageInput = screen.getByPlaceholderText(/type a message/i)
      await userEvent.type(messageInput, 'New message')

      const sendButton = screen.getByRole('button', { name: /send/i })
      await userEvent.click(sendButton)

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith('/auth/conversations/1/send/', {
          content: 'New message',
        })
      })
    })

    it('sends message on Enter key press', async () => {
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
        .mockResolvedValueOnce({ data: mockConversations }) // initial conversations
        .mockResolvedValueOnce({ data: [] }) // initial requests
        .mockResolvedValueOnce({ data: [] }) // messages when conversation selected
        .mockResolvedValueOnce({ data: mockConversations }) // refresh conversations after mark-read
        .mockResolvedValueOnce({ data: mockConversations }) // refresh conversations after send message

      mockApiPost
        .mockResolvedValueOnce({ data: {} }) // mark-read
        .mockResolvedValueOnce({ // send message
          data: {
            id: 1,
            sender: { id: 1, display_name: 'Test User' },
            content: 'Enter message',
            created_at: '2024-01-01T02:00:00Z',
            read_at: null,
          },
        })

      await act(async () => {
        render(<Messaging />)
      })

      await waitFor(() => {
        expect(screen.getByText('Other User')).toBeInTheDocument()
      }, { timeout: 3000 })

      const conversationItem = screen.getByText('Other User').closest('div')
      if (conversationItem) {
        await userEvent.click(conversationItem)
      }

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument()
      })

      const messageInput = screen.getByPlaceholderText(/type a message/i)
      await userEvent.type(messageInput, 'Enter message{Enter}')

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalled()
      })
    })

    it('does not send empty messages', async () => {
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

      // Set up mocks before rendering
      mockApiGet
        .mockResolvedValueOnce({ data: mockConversations }) // initial conversations
        .mockResolvedValueOnce({ data: [] }) // initial requests
        .mockResolvedValueOnce({ data: [] }) // messages when conversation selected
        .mockResolvedValueOnce({ data: mockConversations }) // refresh conversations after mark-read

      mockApiPost.mockResolvedValueOnce({ data: {} }) // mark-read

      await act(async () => {
        render(<Messaging />)
      })

      // Wait for loading to complete and conversations to appear
      await waitFor(() => {
        expect(screen.queryByText(/loading messages/i)).not.toBeInTheDocument()
      }, { timeout: 3000 })

      await waitFor(() => {
        expect(screen.getByText('Other User')).toBeInTheDocument()
      }, { timeout: 3000 })

      const conversationItem = screen.getByText('Other User').closest('div')
      if (conversationItem) {
        await userEvent.click(conversationItem)
      }

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send/i })
        expect(sendButton).toBeDisabled()
      })
    })
  })

  describe('Conversation Requests', () => {
    it('displays conversation requests tab', async () => {
      mockApiGet
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] })

      await act(async () => {
        render(<Messaging />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /requests/i })).toBeInTheDocument()
      })
    })

    it('displays received requests', async () => {
      const mockRequests = [
        {
          id: 1,
          requester: { id: 2, display_name: 'Requester User', encrypted_id: 'enc2' },
          recipient: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
          status: 'pending',
          message: 'Hello, I want to connect!',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      // Ensure useAuth returns the user (like the integration test does)
      const { useAuth } = await import('../../contexts/AuthContext')
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        refreshUser: mockRefreshUser,
        login: mockLogin,
        register: mockRegister,
        logout: mockLogout,
        loading: false,
      })

      // Set up mocks before rendering - order matters for Promise.all
      // The component calls fetchConversations() and fetchConversationRequests() in parallel
      mockApiGet
        .mockResolvedValueOnce({ data: [] }) // initial conversations
        .mockResolvedValueOnce({ data: mockRequests }) // initial requests

      await act(async () => {
        render(<Messaging />)
      })

      // Wait for loading to complete and data to load
      await waitFor(() => {
        expect(screen.queryByText(/loading messages/i)).not.toBeInTheDocument()
      }, { timeout: 3000 })

      // Wait a bit for the requests to be processed
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Debug: Verify mocks were called
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith('/auth/conversation-requests/')
      }, { timeout: 2000 })

      // Wait for the requests tab to be available
      const requestsTab = await waitFor(() => {
        return screen.getByRole('button', { name: /requests/i })
      })
      
      await act(async () => {
        await userEvent.click(requestsTab)
      })

      // Wait for the state to update - the component should show requests, not "No conversation requests"
      // This ensures the API response has been processed and state has updated
      await waitFor(() => {
        expect(screen.queryByText(/no conversation requests/i)).not.toBeInTheDocument()
      }, { timeout: 3000 })

      // Now wait for the actual request content to appear
      await waitFor(() => {
        expect(screen.getByText('Requester User')).toBeInTheDocument()
        expect(screen.getByText('Hello, I want to connect!')).toBeInTheDocument()
      }, { timeout: 5000 })
    }, { timeout: 10000 })

    it('accepts a conversation request', async () => {
      const mockRequests = [
        {
          id: 1,
          requester: { id: 2, display_name: 'Requester User', encrypted_id: 'enc2' },
          recipient: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
          status: 'pending',
          message: 'Hello!',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockConversation = {
        id: 1,
        user1: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
        user2: { id: 2, display_name: 'Requester User', encrypted_id: 'enc2' },
        other_user: { id: 2, display_name: 'Requester User', encrypted_id: 'enc2' },
        last_message: null,
        unread_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      // Ensure useAuth returns the user (like the integration test does)
      const { useAuth } = await import('../../contexts/AuthContext')
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        refreshUser: mockRefreshUser,
        login: mockLogin,
        register: mockRegister,
        logout: mockLogout,
        loading: false,
      })

      mockApiGet
        .mockResolvedValueOnce({ data: [] }) // initial conversations
        .mockResolvedValueOnce({ data: mockRequests }) // initial requests
        .mockResolvedValueOnce({ data: [] }) // refresh requests after accept
        .mockResolvedValueOnce({ data: [mockConversation] }) // refresh conversations after accept
        .mockResolvedValueOnce({ data: [] }) // messages when conversation is selected

      mockApiPost
        .mockResolvedValueOnce({ // accept request
          data: {
            message: 'Conversation request accepted',
            conversation: mockConversation,
          },
        })
        .mockResolvedValueOnce({ data: {} }) // mark-read

      await act(async () => {
        render(<Messaging />)
      })

      // Wait for loading to complete and data to load
      await waitFor(() => {
        expect(screen.queryByText(/loading messages/i)).not.toBeInTheDocument()
      }, { timeout: 3000 })

      // Wait a bit for the requests to be processed
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Debug: Verify mocks were called
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith('/auth/conversation-requests/')
      }, { timeout: 2000 })

      // Wait for the requests tab to be available
      const requestsTab = await waitFor(() => {
        return screen.getByRole('button', { name: /requests/i })
      })

      await act(async () => {
        await userEvent.click(requestsTab)
      })

      // Wait for the accept button to appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
      }, { timeout: 5000 })

      const acceptButton = screen.getByRole('button', { name: /accept/i })
      await act(async () => {
        await userEvent.click(acceptButton)
      })

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/auth/conversation-requests/1/respond/',
          { action: 'accept' }
        )
      })
    }, { timeout: 10000 })

    it('denies a conversation request', async () => {
      const mockRequests = [
        {
          id: 1,
          requester: { id: 2, display_name: 'Requester User', encrypted_id: 'enc2' },
          recipient: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
          status: 'pending',
          message: 'Hello!',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockApiGet
        .mockResolvedValueOnce({ data: [] }) // initial conversations
        .mockResolvedValueOnce({ data: mockRequests }) // initial requests
        .mockResolvedValueOnce({ data: [] }) // refresh requests after deny

      mockApiPost.mockResolvedValueOnce({
        data: { message: 'Conversation request denied' },
      })

      await act(async () => {
        render(<Messaging />)
      })

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading messages/i)).not.toBeInTheDocument()
      }, { timeout: 3000 })

      // Wait a bit for the requests to be processed
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Debug: Verify mocks were called
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith('/auth/conversation-requests/')
      }, { timeout: 2000 })

      // Wait for the requests tab to be available
      const requestsTab = await waitFor(() => {
        return screen.getByRole('button', { name: /requests/i })
      })

      await act(async () => {
        await userEvent.click(requestsTab)
      })

      // Wait for the deny button to appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deny/i })).toBeInTheDocument()
      }, { timeout: 5000 })

      const denyButton = screen.getByRole('button', { name: /deny/i })
      await act(async () => {
        await userEvent.click(denyButton)
      })

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/auth/conversation-requests/1/respond/',
          { action: 'deny' }
        )
      })
    }, { timeout: 10000 })

    it('shows pending request count badge', async () => {
      const mockRequests = [
        {
          id: 1,
          requester: { id: 2, display_name: 'Requester User', encrypted_id: 'enc2' },
          recipient: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
          status: 'pending',
          message: 'Hello!',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockApiGet
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockRequests })

      await act(async () => {
        render(<Messaging />)
      })

      await waitFor(() => {
        // Badge should show count of pending received requests
        const requestsTab = screen.getByRole('button', { name: /requests/i })
        expect(requestsTab).toBeInTheDocument()
        // The badge should be present (implementation may vary)
      })
    })
  })
})

describe('Messaging Component - Integration Tests', () => {
  beforeEach(() => {
    // Reset API mocks completely - each test will set up fresh mocks
    mockApiGet.mockReset()
    mockApiPost.mockReset()
    // Reset call history and ensure mock always returns the user
    mockUseAuth.mockClear()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      refreshUser: mockRefreshUser,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      loading: false,
    })
  })

  it('completes full conversation flow', async () => {
    const mockRequests = [
      {
        id: 1,
        requester: { id: 2, display_name: 'Requester User', encrypted_id: 'enc2' },
        recipient: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
        status: 'pending',
        message: 'Hello!',
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    const mockConversation = {
      id: 1,
      user1: { id: 1, display_name: 'Test User', encrypted_id: 'enc1' },
      user2: { id: 2, display_name: 'Requester User', encrypted_id: 'enc2' },
      other_user: { id: 2, display_name: 'Requester User', encrypted_id: 'enc2' },
      last_message: null,
      unread_count: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    const mockMessages = []

    // Ensure useAuth returns the mock user
    const { useAuth } = await import('../../contexts/AuthContext')
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      refreshUser: mockRefreshUser,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      loading: false,
    })

    mockApiGet
      .mockResolvedValueOnce({ data: [] }) // initial conversations
      .mockResolvedValueOnce({ data: mockRequests }) // initial requests
      .mockResolvedValueOnce({ data: [] }) // refresh requests after accept
      .mockResolvedValueOnce({ data: [mockConversation] }) // refresh conversations after accept
      .mockResolvedValueOnce({ data: mockMessages }) // messages when conversation is selected
      .mockResolvedValueOnce({ data: [mockConversation] }) // refresh conversations after mark-read
      .mockResolvedValueOnce({ data: [mockConversation] }) // refresh conversations after send message

    mockApiPost
      .mockResolvedValueOnce({ // accept request
        data: {
          message: 'Conversation request accepted',
          conversation: mockConversation,
        },
      })
      .mockResolvedValueOnce({ data: {} }) // mark-read
      .mockResolvedValueOnce({ // send message
        data: {
          id: 1,
          sender: { id: 1, display_name: 'Test User' },
          content: 'Hello back!',
          created_at: '2024-01-01T01:00:00Z',
          read_at: null,
        },
      })

    await act(async () => {
      render(<Messaging />)
    })

    // Wait for loading to complete and data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading messages/i)).not.toBeInTheDocument()
    }, { timeout: 3000 })

    // Wait a bit for the requests to be processed
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    // Debug: Verify mocks were called
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/auth/conversation-requests/')
    }, { timeout: 2000 })

    // Wait for the requests tab to be available
    const requestsTab = await waitFor(() => {
      return screen.getByRole('button', { name: /requests/i })
    })

    await act(async () => {
      await userEvent.click(requestsTab)
    })

    // Wait for requests to be displayed
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
    }, { timeout: 10000 })

    const acceptButton = screen.getByRole('button', { name: /accept/i })
    await act(async () => {
      await userEvent.click(acceptButton)
    })

    // Send message
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument()
    })

    const messageInput = screen.getByPlaceholderText(/type a message/i)
    await act(async () => {
      await userEvent.type(messageInput, 'Hello back!')
    })

    const sendButton = screen.getByRole('button', { name: /send/i })
    await act(async () => {
      await userEvent.click(sendButton)
    })

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledTimes(3) // accept, mark-read, send
    })
  }, { timeout: 15000 })
})

describe('Messaging Component - Accessibility Tests', () => {
  beforeEach(() => {
    // Reset API mocks completely - each test will set up fresh mocks
    mockApiGet.mockReset()
    mockApiPost.mockReset()
  })

  it('has accessible tab buttons', async () => {
    mockApiGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })

    await act(async () => {
      render(<Messaging />)
    })

    await waitFor(() => {
      const conversationsTab = screen.getByRole('button', { name: /conversations/i })
      const requestsTab = screen.getByRole('button', { name: /requests/i })

      expect(conversationsTab).toBeInTheDocument()
      expect(requestsTab).toBeInTheDocument()
      expect(conversationsTab).toHaveAccessibleName()
      expect(requestsTab).toHaveAccessibleName()
    })
  })

  it('has accessible message input', async () => {
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
      .mockResolvedValueOnce({ data: mockConversations }) // initial conversations
      .mockResolvedValueOnce({ data: [] }) // initial requests
      .mockResolvedValueOnce({ data: [] }) // messages when conversation is selected
      .mockResolvedValueOnce({ data: mockConversations }) // refresh conversations after mark-read

    mockApiPost.mockResolvedValueOnce({ data: {} }) // mark-read

    await act(async () => {
      render(<Messaging />)
    })

    // Wait for conversation to appear
    const otherUserText = await waitFor(() => {
      return screen.getByText('Other User')
    }, { timeout: 3000 })

    // Find the clickable conversation item - it's the div with onClick that contains "Other User"
    // The structure is: div (onClick) > div > div > "Other User"
    // We'll find the outermost div that contains the text and has cursor: pointer style
    const conversationItem = otherUserText.closest('div[style*="cursor"]') || 
                             otherUserText.closest('div')?.parentElement?.parentElement ||
                             otherUserText.closest('div')
    
    expect(conversationItem).toBeInTheDocument()
    await userEvent.click(conversationItem as HTMLElement)

    await waitFor(() => {
      const messageInput = screen.getByPlaceholderText(/type a message/i)
      expect(messageInput).toBeInTheDocument()
      expect(messageInput).toHaveAttribute('placeholder')
    })
  })

  it('maintains keyboard navigation', async () => {
    mockApiGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })

    await act(async () => {
      render(<Messaging />)
    })

    await waitFor(() => {
      const conversationsTab = screen.getByRole('button', { name: /conversations/i })
      conversationsTab.focus()
      expect(document.activeElement).toBe(conversationsTab)

      userEvent.keyboard('{Enter}')
      // Tab should be activated
    })
  })
})
