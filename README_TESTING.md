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

### Frontend Tests (React + Vitest)
- **Sign up**: Form validation, API integration, error handling
- **Log in**: Authentication flow, credential validation
- **Posting**: Listing creation form, validation, submission
- **Filtering**: Filter UI interactions, API calls
- **Searching**: Search input, debounced search, results display
- **RSVP**: RSVP button interactions, status updates

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