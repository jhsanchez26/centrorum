// Mock API responses for testing
export const mockApiResponses = {
  register: {
    success: {
      data: {
        user: {
          id: 1,
          email: 'test@upr.edu',
          display_name: 'Test User'
        },
        tokens: {
          access: 'mock-access-token',
          refresh: 'mock-refresh-token'
        }
      }
    },
    error: {
      response: {
        status: 400,
        data: {
          email: ['User with this email already exists.']
        }
      }
    }
  },
  login: {
    success: {
      data: {
        user: {
          id: 1,
          email: 'test@upr.edu',
          display_name: 'Test User'
        },
        tokens: {
          access: 'mock-access-token',
          refresh: 'mock-refresh-token'
        }
      }
    },
    error: {
      response: {
        status: 401,
        data: {
          detail: 'Invalid credentials.'
        }
      }
    }
  },
  listings: {
    success: {
      data: {
        results: [
          {
            id: 1,
            title: 'Test Event',
            description: 'A test event',
            type: 'event',
            modality: 'in-person',
            org_name: 'Test Organization',
            org: 1,
            rsvp_count: 5,
            going_count: 3,
            interested_count: 2,
            not_going_count: 0,
            created_at: '2024-01-01T00:00:00Z',
            created_by: {
              id: 1,
              display_name: 'Test User',
              email: 'test@upr.edu'
            },
            user_rsvp_status: null
          }
        ],
        count: 1
      }
    },
    error: {
      response: {
        status: 500,
        data: {
          detail: 'Internal server error.'
        }
      }
    }
  },
  rsvp: {
    success: {
      data: {
        id: 1,
        user: 1,
        listing: 1,
        status: 'going',
        created_at: '2024-01-01T00:00:00Z'
      }
    },
    error: {
      response: {
        status: 400,
        data: {
          detail: 'Invalid RSVP data.'
        }
      }
    }
  }
}
