/**
 * Comprehensive tests for Profile component
 * Includes: Unit tests, Integration tests, Accessibility tests
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render as rtlRender } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Profile from '../Profile'
import { useAuth } from '../../contexts/AuthContext'

// Mock the API module - use vi.fn() directly in the mock factory
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

// Get references to the mocked functions
import { api } from '../../lib/api'
const mockApiGet = vi.mocked(api.get)
const mockApiPost = vi.mocked(api.post)
const mockApiPatch = vi.mocked(api.patch)
const mockApiPut = vi.mocked(api.put)
const mockApiDelete = vi.mocked(api.delete)

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ userId: 'me' }),
  }
})

// Mock user and functions
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

// Create a mock function that can be controlled
// Default return value
const defaultAuthReturn = {
  user: mockUser,
  refreshUser: mockRefreshUser,
  login: mockLogin,
  register: mockRegister,
  logout: mockLogout,
  loading: false,
}

// Create a mock that can be controlled
// Store the return value in a way that works with hoisting
const authReturnStore = {
  value: {
    user: mockUser,
    refreshUser: mockRefreshUser,
    login: mockLogin,
    register: mockRegister,
    logout: mockLogout,
    loading: false,
  } as {
    user: typeof mockUser | { id: number; display_name: string; encrypted_id: string } | null;
    refreshUser: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    loading: boolean;
  }
}

// Override the test-utils mock with our own mock
// This must be done before any imports that use AuthContext
// The key is to ensure the mock is set up before the component uses it
// Initialize authReturnStore.value with user by default
authReturnStore.value = {
  user: mockUser,
  refreshUser: mockRefreshUser,
  login: mockLogin,
  register: mockRegister,
  logout: mockLogout,
  loading: false,
}

vi.doUnmock('../../contexts/AuthContext')
vi.mock('../../contexts/AuthContext', () => {
  const mockUseAuth = vi.fn(() => {
    // Return the value from the store (reads current value at call time)
    // This ensures we always get the latest value
    const result = authReturnStore.value
    console.log('[Profile.test] useAuth called, returning:', { user: result.user?.display_name || null, loading: result.loading })
    return result
  })
  const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
    console.log('[Profile.test] Mock AuthProvider rendering')
    return <>{children}</>
  }
  return {
    useAuth: mockUseAuth,
    AuthProvider: MockAuthProvider,
  }
})

// Custom render function that uses our mocked AuthProvider
// Import the mocked AuthProvider directly
import { AuthProvider } from '../../contexts/AuthContext'
const render = (ui: React.ReactElement) => {
  console.log('[Profile.test] Custom render using MockAuthProvider:', typeof AuthProvider)
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

describe('Profile Component - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    // Reset API mocks
    mockApiGet.mockReset()
    mockApiPatch.mockReset()
    mockApiPut.mockReset()
    mockApiDelete.mockReset()
    mockApiPost.mockReset()
    // Reset useAuth to return user by default
    authReturnStore.value = {
      user: mockUser,
      refreshUser: mockRefreshUser,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      loading: false,
    }
  })

  describe('Profile Display', () => {
    it('renders profile information correctly', async () => {
      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
          email: 'test@upr.edu',
          bio: 'Test bio',
          date_joined: '2024-01-01T00:00:00Z',
        },
        posts: [],
      }

      // When userId is "me", it uses encrypted_id to fetch profile
      // The API call will be to /auth/users/encrypted123/
      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

      render(<Profile />)

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
        expect(screen.getByText('Test bio')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('displays loading state initially', async () => {
      mockApiGet.mockImplementation(() => new Promise(() => {})) // Never resolves

      await act(async () => {
        render(<Profile />)
      })

      expect(screen.getByText(/loading profile/i)).toBeInTheDocument()
    })

    it('displays error message when profile fails to load', async () => {
      mockApiGet.mockRejectedValueOnce(new Error('Failed to load'))

      await act(async () => {
        render(<Profile />)
      })

      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument()
      })
    })

    it('displays posts count correctly', async () => {
      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
          email: 'test@upr.edu',
          bio: '',
          date_joined: '2024-01-01T00:00:00Z',
        },
        posts: [
          { id: 1, title: 'Post 1', description: 'Desc 1', type: 'post', created_at: '2024-01-01T00:00:00Z' },
          { id: 2, title: 'Post 2', description: 'Desc 2', type: 'event', created_at: '2024-01-02T00:00:00Z' },
        ],
      }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

      await act(async () => {
        render(<Profile />)
      })

      await waitFor(() => {
        expect(screen.getByText(/posts \(2\)/i)).toBeInTheDocument()
      })
    })

    it('displays empty state when user has no posts', async () => {
      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
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
        expect(screen.getByText(/you haven't posted anything yet/i)).toBeInTheDocument()
      })
    })
  })

  describe('Profile Editing', () => {
    it('enters edit mode when Edit Profile button is clicked', async () => {
      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
          email: 'test@upr.edu',
          bio: 'Original bio',
          date_joined: '2024-01-01T00:00:00Z',
        },
        posts: [],
      }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

      render(<Profile />)

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      await userEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/bio/i)).toBeInTheDocument()
      })
    })

    it('saves profile changes successfully', async () => {
      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
          email: 'test@upr.edu',
          bio: 'Original bio',
          date_joined: '2024-01-01T00:00:00Z',
        },
        posts: [],
      }

      // When userId is "me", it uses encrypted_id to fetch profile
      // The API call will be to /auth/users/encrypted123/
      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })
      mockApiPatch.mockResolvedValueOnce({
        data: {
          display_name: 'Updated Name',
          bio: 'Updated bio',
        },
      })

      render(<Profile />)

      // Wait for the profile to load (the API call happens in useEffect)
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      }, { timeout: 3000 })

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      await userEvent.click(editButton)

      const displayNameInput = screen.getByLabelText(/display name/i)
      const bioInput = screen.getByLabelText(/bio/i)

      await userEvent.clear(displayNameInput)
      await userEvent.type(displayNameInput, 'Updated Name')
      await userEvent.clear(bioInput)
      await userEvent.type(bioInput, 'Updated bio')

      const saveButton = screen.getByRole('button', { name: /save/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockApiPatch).toHaveBeenCalledWith('/auth/profile/', {
          display_name: 'Updated Name',
          bio: 'Updated bio',
        })
      })
    })

    it('cancels profile editing', async () => {
      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
          email: 'test@upr.edu',
          bio: 'Original bio',
          date_joined: '2024-01-01T00:00:00Z',
        },
        posts: [],
      }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

      render(<Profile />)

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      await userEvent.click(editButton)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument()
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })
    })

    it('validates display name is required', async () => {
      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
          email: 'test@upr.edu',
          bio: '',
          date_joined: '2024-01-01T00:00:00Z',
        },
        posts: [],
      }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

      render(<Profile />)

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      await userEvent.click(editButton)

      const displayNameInput = screen.getByLabelText(/display name/i)
      await userEvent.clear(displayNameInput)

      const saveButton = screen.getByRole('button', { name: /save/i })
      expect(saveButton).toBeDisabled()
    })

    it('shows bio character count', async () => {
      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
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
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      await userEvent.click(editButton)

      const bioInput = screen.getByLabelText(/bio/i)
      await userEvent.type(bioInput, 'Test bio')

      expect(screen.getByText(/8\/500/i)).toBeInTheDocument()
    })
  })

  describe('Post Management', () => {
    it('displays posts with correct information', async () => {
      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
          email: 'test@upr.edu',
          bio: '',
          date_joined: '2024-01-01T00:00:00Z',
        },
        posts: [
          {
            id: 1,
            title: 'Test Post',
            description: 'Test Description',
            type: 'post',
            modality: 'in-person',
            org_name: 'Test Org',
            created_at: '2024-01-01T00:00:00Z',
            created_by: { id: 1, display_name: 'Test User' },
          },
        ],
      }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

      await act(async () => {
        render(<Profile />)
      })

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument()
        expect(screen.getByText('Test Description')).toBeInTheDocument()
      })
    })

    it('edits a post successfully', async () => {
      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
          email: 'test@upr.edu',
          bio: '',
          date_joined: '2024-01-01T00:00:00Z',
        },
        posts: [
          {
            id: 1,
            title: 'Original Title',
            description: 'Original Description',
            type: 'post',
            modality: 'in-person',
            org: 1,
            org_name: 'Test Org',
            created_at: '2024-01-01T00:00:00Z',
            created_by: { id: 1, display_name: 'Test User' },
          },
        ],
      }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })
      mockApiPut.mockResolvedValueOnce({
        data: {
          id: 1,
          title: 'Updated Title',
          description: 'Updated Description',
          type: 'post',
          modality: 'in-person',
        },
      })

      await act(async () => {
        render(<Profile />)
      })

      await waitFor(() => {
        expect(screen.getByText('Original Title')).toBeInTheDocument()
      })

      // Find the Edit button within the post card (not the Edit Profile button)
      // Get all Edit buttons and find the one that's not "Edit Profile"
      const allEditButtons = screen.getAllByRole('button', { name: /edit/i })
      const postEditButton = allEditButtons.find(btn => btn.textContent?.trim().toLowerCase() === 'edit')
      expect(postEditButton).toBeDefined()
      await userEvent.click(postEditButton!)

      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.clear(titleInput)
      await userEvent.type(titleInput, 'Updated Title')

      const saveButton = screen.getByRole('button', { name: /save/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockApiPut).toHaveBeenCalled()
      })
    })

    it('deletes a post with confirmation', async () => {
      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
          email: 'test@upr.edu',
          bio: '',
          date_joined: '2024-01-01T00:00:00Z',
        },
        posts: [
          {
            id: 1,
            title: 'Test Post',
            description: 'Test Description',
            type: 'post',
            modality: 'in-person',
            org_name: 'Test Org',
            created_at: '2024-01-01T00:00:00Z',
            created_by: { id: 1, display_name: 'Test User' },
          },
        ],
      }

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })
      mockApiDelete.mockResolvedValueOnce({})

      await act(async () => {
        render(<Profile />)
      })

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument()
      })

      const deleteButton = screen.getByRole('button', { name: /delete/i })
      await userEvent.click(deleteButton)

      expect(confirmSpy).toHaveBeenCalled()
        expect(mockApiDelete).toHaveBeenCalledWith('/listings/1/')

      confirmSpy.mockRestore()
    })
  })

  describe('Conversation Request', () => {
    it('shows message button for other users profiles', async () => {
      // Override for this test - user2 viewing user1's profile
      authReturnStore.value = {
        user: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
        refreshUser: mockRefreshUser,
        login: mockLogin,
        register: mockRegister,
        logout: mockLogout,
        loading: false,
      }

      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
          email: 'test@upr.edu',
          bio: '',
          date_joined: '2024-01-01T00:00:00Z',
        },
        posts: [],
      }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })
      mockApiGet.mockResolvedValueOnce({ data: [] }) // conversations
      mockApiGet.mockResolvedValueOnce({ data: [] }) // requests

      render(<Profile />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /message/i })).toBeInTheDocument()
      })
    })

    it('opens message dialog when message button is clicked', async () => {
      // Override for this test - user2 viewing user1's profile
      authReturnStore.value = {
        user: { id: 2, display_name: 'Other User', encrypted_id: 'enc2' },
        refreshUser: mockRefreshUser,
        login: mockLogin,
        register: mockRegister,
        logout: mockLogout,
        loading: false,
      }

      const mockProfileData = {
        user: {
          id: 1,
          display_name: 'Test User',
          email: 'test@upr.edu',
          bio: '',
          date_joined: '2024-01-01T00:00:00Z',
        },
        posts: [],
      }

      mockApiGet.mockResolvedValueOnce({ data: mockProfileData })
      mockApiGet.mockResolvedValueOnce({ data: [] }) // conversations
      mockApiGet.mockResolvedValueOnce({ data: [] }) // requests

      render(<Profile />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /message/i })).toBeInTheDocument()
      })

      const messageButton = screen.getByRole('button', { name: /message/i })
      await userEvent.click(messageButton)

      await waitFor(() => {
        expect(screen.getByText(/send conversation request/i)).toBeInTheDocument()
      })
    })
  })
})

describe('Profile Component - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset API mocks
    mockApiGet.mockReset()
    mockApiPatch.mockReset()
    mockApiPut.mockReset()
    mockApiDelete.mockReset()
    mockApiPost.mockReset()
  })

  it('completes full profile update flow', async () => {
    // Ensure user is set in auth store BEFORE rendering
    authReturnStore.value = {
      user: mockUser,
      refreshUser: mockRefreshUser,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      loading: false,
    }

    const mockProfileData = {
      user: {
        id: 1,
        display_name: 'Test User',
        email: 'test@upr.edu',
        bio: '',
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [],
    }

    mockApiGet.mockResolvedValue({ data: mockProfileData })
    mockApiPatch.mockResolvedValue({
      data: {
        display_name: 'Updated User',
        bio: 'Updated bio',
      },
    })

    await act(async () => {
      render(<Profile />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Edit profile
    const editButton = screen.getByRole('button', { name: /edit profile/i })
    await userEvent.click(editButton)

    // Update fields
    const displayNameInput = screen.getByLabelText(/display name/i)
    const bioInput = screen.getByLabelText(/bio/i)

    await userEvent.clear(displayNameInput)
    await userEvent.type(displayNameInput, 'Updated User')
    await userEvent.clear(bioInput)
    await userEvent.type(bioInput, 'Updated bio')

    // Save
    const saveButton = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalled()
      expect(mockRefreshUser).toHaveBeenCalled()
    })
  })
})

describe('Profile Component - Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset API mocks
    mockApiGet.mockReset()
    mockApiPatch.mockReset()
    mockApiPut.mockReset()
    mockApiDelete.mockReset()
    mockApiPost.mockReset()
    // Reset useAuth to return user by default
    authReturnStore.value = {
      user: mockUser,
      refreshUser: mockRefreshUser,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      loading: false,
    }
  })

  it('has proper heading structure', async () => {
    // Ensure user is set in auth store BEFORE rendering
    authReturnStore.value = {
      user: mockUser,
      refreshUser: mockRefreshUser,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      loading: false,
    }

    const mockProfileData = {
      user: {
        id: 1,
        display_name: 'Test User',
        email: 'test@upr.edu',
        bio: '',
        date_joined: '2024-01-01T00:00:00Z',
      },
      posts: [],
    }

    // Mock the API call that will be made with encrypted_id (from mockUser.encrypted_id)
    mockApiGet.mockResolvedValueOnce({ data: mockProfileData })

    await act(async () => {
      render(<Profile />)
    })

    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: 'Test User' })
      expect(heading).toBeInTheDocument()
      expect(heading.tagName).toBe('H1')
    }, { timeout: 3000 })
  })

  it('has accessible form labels', async () => {
    // Ensure user is set in auth store
    authReturnStore.value = {
      user: mockUser,
      refreshUser: mockRefreshUser,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      loading: false,
    }

    const mockProfileData = {
      user: {
        id: 1,
        display_name: 'Test User',
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
      expect(screen.getByText('Test User')).toBeInTheDocument()
    }, { timeout: 3000 })

    const editButton = screen.getByRole('button', { name: /edit profile/i })
    await userEvent.click(editButton)

    const displayNameLabel = screen.getByLabelText(/display name/i)
    const bioLabel = screen.getByLabelText(/bio/i)

    expect(displayNameLabel).toBeInTheDocument()
    expect(bioLabel).toBeInTheDocument()
  })

  it('has accessible buttons with proper names', async () => {
    // Ensure user is set in auth store
    authReturnStore.value = {
      user: mockUser,
      refreshUser: mockRefreshUser,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      loading: false,
    }

    const mockProfileData = {
      user: {
        id: 1,
        display_name: 'Test User',
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
      const editButton = screen.getByRole('button', { name: /edit profile/i })
      expect(editButton).toBeInTheDocument()
      expect(editButton).toHaveAccessibleName()
    }, { timeout: 3000 })
  })

  it('maintains keyboard navigation', async () => {
    // Ensure user is set in auth store
    authReturnStore.value = {
      user: mockUser,
      refreshUser: mockRefreshUser,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      loading: false,
    }

    const mockProfileData = {
      user: {
        id: 1,
        display_name: 'Test User',
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
      expect(screen.getByText('Test User')).toBeInTheDocument()
    }, { timeout: 3000 })

    const editButton = screen.getByRole('button', { name: /edit profile/i })
    editButton.focus()
    expect(document.activeElement).toBe(editButton)

    await userEvent.keyboard('{Enter}')
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    })
  })
})
