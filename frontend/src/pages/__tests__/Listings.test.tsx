import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/test-utils'
import Listings from '../Listings'
import { mockApiResponses } from '../../test/__mocks__/api'
import { api } from '../../lib/api'

// Mock the API module
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('Listings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders listings page with search and filters', async () => {
    // Mock API to return empty results
    vi.mocked(api.get).mockResolvedValueOnce(mockApiResponses.listings.success)
    
    await act(async () => {
      render(<Listings />)
    })
    
    expect(screen.getByText('Listings')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search listings...')).toBeInTheDocument()
    expect(screen.getByText('All Types')).toBeInTheDocument()
    expect(screen.getByText('All Modalities')).toBeInTheDocument()
    expect(screen.getByText('Create a new post')).toBeInTheDocument()
  })

  it('displays listings after loading', async () => {
    // Mock API to return listings for ALL calls (not just once)
    vi.mocked(api.get).mockResolvedValue(mockApiResponses.listings.success)
    
    render(<Listings />)
    
    // Wait for the listings to appear
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
    })
    
    // Check that organization name is rendered (may be part of a larger text with bullet points)
    expect(screen.getByText(/Test Organization/i)).toBeInTheDocument()
    expect(screen.getByText(/event.*in-person.*RSVPs.*5/i)).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    // Mock API to return after delay
    vi.mocked(api.get).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockApiResponses.listings.success), 100))
    )
    
    render(<Listings />)
    
    expect(screen.getByText('Loading listings...')).toBeInTheDocument()
  })

  it('shows empty state when no listings', async () => {
    // Mock API to return empty results
    const emptyResponse = {
      data: []
    }
    vi.mocked(api.get).mockResolvedValueOnce(emptyResponse)
    
    render(<Listings />)
    
    await waitFor(() => {
      expect(screen.getByText('No listings yet. Be the first to share something!')).toBeInTheDocument()
    })
  })

  it('filters listings by type', async () => {
    // Mock API calls
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockApiResponses.listings.success) // Initial load
      .mockResolvedValueOnce(mockApiResponses.listings.success) // Filter by type
    
    const user = userEvent.setup()
    render(<Listings />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
    })
    
    // Select event type filter
    const typeFilter = screen.getByDisplayValue('All Types')
    await user.selectOptions(typeFilter, 'event')
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/listings/?type=event&ordering=-created_at')
    })
  })

  it('filters listings by modality', async () => {
    // Mock API calls
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockApiResponses.listings.success) // Initial load
      .mockResolvedValueOnce(mockApiResponses.listings.success) // Filter by modality
    
    const user = userEvent.setup()
    render(<Listings />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
    })
    
    // Select online modality filter
    const modalityFilter = screen.getByDisplayValue('All Modalities')
    await user.selectOptions(modalityFilter, 'online')
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/listings/?modality=online&ordering=-created_at')
    })
  })

  it('searches listings by query', async () => {
    // Mock API calls
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockApiResponses.listings.success) // Initial load
      .mockResolvedValueOnce(mockApiResponses.listings.success) // Search
    
    const user = userEvent.setup()
    render(<Listings />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
    })
    
    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search listings...')
    await user.type(searchInput, 'test event')
    
    // Wait for debounced search
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/listings/?search=test+event&ordering=-created_at')
    }, { timeout: 1000 })
  })

  it('creates new listing successfully', async () => {
    // Mock API calls
    vi.mocked(api.get).mockResolvedValueOnce(mockApiResponses.listings.success)
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        id: 2,
        title: 'New Event',
        description: 'A new event',
        type: 'event',
        modality: 'in-person'
      }
    })
    
    const user = userEvent.setup()
    render(<Listings />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
    })
    
    // Fill out new listing form
    const titleInput = screen.getByPlaceholderText('Post title...')
    const descriptionInput = screen.getByPlaceholderText('Post content...')
    const submitButton = screen.getByRole('button', { name: /post/i })
    
    await user.type(titleInput, 'New Event')
    await user.type(descriptionInput, 'A new event description')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/posts/', {
        title: 'New Event',
        content: 'A new event description',
        type: 'post',
        modality: 'in-person'
      })
    })
  })

  it('prevents submission of empty post', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockApiResponses.listings.success)
    
    const user = userEvent.setup()
    render(<Listings />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
    })
    
    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /post/i })
    expect(submitButton).toBeDisabled()
    
    await user.click(submitButton)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('handles API errors gracefully', async () => {
    // Mock API to return error
    vi.mocked(api.get).mockRejectedValueOnce(mockApiResponses.listings.error)
    
    render(<Listings />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load listings')).toBeInTheDocument()
    })
  })

  it('toggles RSVP status', async () => {
    // Mock API calls
    vi.mocked(api.get).mockResolvedValueOnce(mockApiResponses.listings.success)
    vi.mocked(api.post).mockResolvedValueOnce(mockApiResponses.rsvp.success)
    
    const user = userEvent.setup()
    render(<Listings />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
    })
    
    // Click RSVP button (Going button) - get the first one
    const rsvpButtons = screen.getAllByRole('button', { name: /going/i })
    await user.click(rsvpButtons[0])
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/rsvp/', {
        listing: 1,
        status: 'going'
      })
    })
  })

  it('clears filters when clear button is clicked', async () => {
    // Mock API calls
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockApiResponses.listings.success) // Initial load
      .mockResolvedValueOnce(mockApiResponses.listings.success) // Clear filters
    
    const user = userEvent.setup()
    render(<Listings />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
    })
    
    // Click clear filters button
    const clearButton = screen.getByRole('button', { name: /clear filters/i })
    await user.click(clearButton)
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/listings/?ordering=-created_at')
    })
  })
})
