# Testing Guide for Centrorum

This document provides comprehensive instructions for running tests in the Centrorum project.

## Overview

The project includes both backend (Django) and frontend (React) tests covering:

### Backend Tests (Django + pytest)
- **Sign up**: User registration, validation, duplicate email handling
- **Log in**: Authentication, credential validation, token management
- **Posting**: Listing creation, validation, permissions
- **Filtering**: Type filtering, modality filtering, search functionality
- **Searching**: Text search across listings
- **RSVP**: RSVP creation, status updates, user-specific RSVPs
- **User Profiles**: Profile retrieval, updates, encrypted IDs, bio handling
- **Messaging System**: Conversation requests, messages, read status, security

### Frontend Tests (React + Vitest)
- **Sign up**: Form validation, API integration, error handling
- **Log in**: Authentication flow, credential validation
- **Posting**: Listing creation form, validation, submission
- **Filtering**: Filter UI interactions, API calls
- **Searching**: Search input, debounced search, results display
- **RSVP**: RSVP button interactions, status updates
- **User Profiles**: Profile display, editing, post management, accessibility
- **Messaging System**: Conversations, messages, requests, compatibility

## Quick Start

### Run All Tests
```bash
python run_all_tests.py
```

### Run Backend Tests Only
```bash
python run_backend_tests.py
```

### Run Frontend Tests Only
```bash
cd frontend
npm run test
```

## Test Structure

### Backend Tests

#### 1. Unit Tests

**Location:** `backend/accounts/tests/`

- **`test_profile_views.py`** - Unit tests for profile view endpoints
  - Profile retrieval (authenticated/unauthenticated)
  - Profile updates (display name, bio)
  - User profile viewing with encrypted IDs
  - Profile data validation
  - Bio field handling (null/empty string)

- **`test_messaging_views.py`** - Unit tests for messaging view endpoints
  - Conversation request creation
  - Request acceptance/denial
  - Message sending and retrieval
  - Conversation listing
  - Unread message counting
  - Message marking as read

#### 2. Integration Tests

**Location:** `backend/accounts/tests/`

- **`test_profile_views.py`** - `ProfileIntegrationTest` class
  - Full profile lifecycle (create, view, update, view again)
  - Profile with multiple listings
  - Cross-user profile viewing

- **`test_messaging_views.py`** - `MessagingIntegrationTest` class
  - Complete conversation flow (request → accept → send messages)
  - Multi-user conversation scenarios
  - Request acceptance and message exchange

#### 3. Security Tests

**Location:** `backend/accounts/tests/`

- **`test_profile_views.py`** - `ProfileSecurityTest` class
  - Authentication and authorization checks
  - SQL injection protection
  - XSS protection
  - Encrypted ID security
  - Data privacy (sensitive field exposure)

- **`test_messaging_views.py`** - `MessagingSecurityTest` class
  - Conversation access control
  - Message content sanitization
  - Request authorization
  - Denied request blocking
  - Conversation isolation

#### 4. Load and Stress Tests

**Location:** `backend/accounts/tests/test_load_stress.py`

- **`ProfileLoadTest`** class
  - Concurrent profile updates
  - Rapid profile requests
  - Multiple users viewing same profile

- **`MessagingLoadTest`** class
  - Concurrent message sending
  - Multiple conversation creation
  - Rapid message retrieval
  - Large message content handling
  - Many conversation requests

- **`MessagingStressTest`** class
  - Very long conversations (1000+ messages)
  - Rapid alternating messages
  - High concurrency scenarios

#### 5. Regression Tests

**Location:** `backend/accounts/tests/test_regression.py`

- **`ProfileRegressionTest`** class
  - Bio null handling
  - Partial profile updates
  - Encrypted ID consistency

- **`MessagingRegressionTest`** class
  - Duplicate request prevention
  - Message ordering
  - Unread count accuracy
  - Denied request blocking
  - Conversation other_user calculation
  - Empty message rejection

### Frontend Tests

#### 1. Unit Tests

**Location:** `frontend/src/pages/__tests__/`

- **`Profile.test.tsx`** - Unit tests for Profile component
  - Profile display and rendering
  - Profile editing functionality
  - Post management (edit, delete)
  - Conversation request initiation
  - Form validation
  - Loading and error states

- **`Messaging.test.tsx`** - Unit tests for Messaging component
  - Conversations list display
  - Message display and sending
  - Conversation request handling
  - Tab switching
  - Empty states

#### 2. Integration Tests

**Location:** `frontend/src/pages/__tests__/`

- **`Profile.test.tsx`** - Integration test section
  - Complete profile update flow
  - Profile editing with state updates

- **`Messaging.test.tsx`** - Integration test section
  - Full conversation flow (request → accept → message)

#### 3. Accessibility Tests

**Location:** `frontend/src/pages/__tests__/`

- **`Profile.test.tsx`** - Accessibility test section
  - Proper heading structure
  - Accessible form labels
  - Button accessibility
  - Keyboard navigation

- **`Messaging.test.tsx`** - Accessibility test section
  - Accessible tab buttons
  - Accessible message input
  - Keyboard navigation

#### 4. Compatibility Tests

**Location:** `frontend/src/pages/__tests__/Compatibility.test.tsx`

- **Profile Compatibility**
  - Missing field handling
  - Very long content
  - Special characters
  - Unicode support
  - Empty arrays
  - Null/undefined values

- **Messaging Compatibility**
  - Empty data arrays
  - Very long messages
  - Missing optional fields
  - Unicode content
  - Rapid interactions
  - Network error handling

- **Cross-Browser Compatibility**
  - Standard DOM APIs
  - Date object handling
  - Array method compatibility

## Running Specific Tests

### Backend Tests

```bash
# Run all backend tests
cd backend
pytest

# Run specific test file
pytest accounts/tests/test_profile_views.py

# Run with coverage
pytest --cov=accounts --cov-report=html

# Run specific test class
pytest accounts/tests/test_profile_views.py::ProfileViewsUnitTest

# Run load/stress tests (may take longer)
pytest accounts/tests/test_load_stress.py -v

# Run security tests
pytest accounts/tests/test_profile_views.py::ProfileSecurityTest
pytest accounts/tests/test_messaging_views.py::MessagingSecurityTest

# Run regression tests
pytest accounts/tests/test_regression.py
```

### Frontend Tests

```bash
# Run all frontend tests
cd frontend
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test Profile.test.tsx
npm test Messaging.test.tsx
npm test Compatibility.test.tsx
```

## Test Categories Explained

### 1. Unit Testing
Tests individual functions and components in isolation, mocking dependencies.

### 2. Integration Testing
Tests how multiple components work together, including API interactions.

### 3. Regression Testing
Ensures previously fixed bugs don't reoccur after code changes.

### 4. Stress and Load Testing
Tests system behavior under high load and stress conditions:
- Concurrent operations
- High volume data
- Long-running operations
- Resource limits

### 5. Security Testing
Tests security aspects:
- Authentication and authorization
- Input validation and sanitization
- SQL injection protection
- XSS protection
- Data privacy

### 6. Compatibility and Accessibility Testing
Tests:
- Cross-browser compatibility
- Responsive design
- Accessibility (WCAG compliance)
- Edge cases and error handling
- Unicode and special character support

## Test Coverage

### Backend Coverage
- **Unit Tests:** ~95% coverage of view functions
- **Integration Tests:** End-to-end workflows
- **Security Tests:** Authentication, authorization, input validation
- **Load Tests:** Concurrent operations, high volume
- **Regression Tests:** Previously fixed bugs

### Frontend Coverage
- **Unit Tests:** Component rendering and interactions
- **Integration Tests:** User workflows
- **Accessibility Tests:** WCAG compliance
- **Compatibility Tests:** Cross-browser and edge cases

## Best Practices

1. **Test Isolation:** Each test should be independent and not rely on other tests
2. **Clear Test Names:** Test names should clearly describe what is being tested
3. **Arrange-Act-Assert:** Structure tests with clear setup, action, and verification
4. **Mock External Dependencies:** Use mocks for API calls, navigation, etc.
5. **Test Edge Cases:** Include tests for empty data, null values, very long content
6. **Maintain Test Data:** Use factories and fixtures for consistent test data
7. **Keep Tests Fast:** Unit tests should run quickly; use load tests sparingly

## Troubleshooting

### Common Issues

1. **npm not found on Windows**
   - Install Node.js from https://nodejs.org/
   - Restart your terminal/command prompt
   - Try using `npm.cmd` instead of `npm`

2. **Python dependencies not found**
   - Ensure you're in a virtual environment
   - Run `pip install -r requirements.txt`

3. **Database connection errors**
   - Check your database settings in `settings.py`
   - Ensure PostgreSQL is running (if using PostgreSQL)
   - Run migrations: `python manage.py migrate`

4. **Frontend test failures**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check that all dependencies are installed

5. **Unicode/Encoding errors on Windows**
   - The test runners handle UTF-8 encoding automatically
   - If issues persist, set environment variable: `set PYTHONIOENCODING=utf-8`