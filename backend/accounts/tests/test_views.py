import pytest
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from factory import Faker
from factory.django import DjangoModelFactory

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = Faker('email')
    display_name = Faker('name')
    is_active = True


class AuthenticationViewsTest(APITestCase):
    def setUp(self):
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.profile_url = reverse('profile')
        self.user_data = {
            'email': 'test@upr.edu',
            'display_name': 'Test User',
            'password': 'testpass123',
            'password_confirm': 'testpass123'
        }

    def test_user_registration_success(self):
        """Test successful user registration"""
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        
        user = User.objects.first()
        self.assertEqual(user.email, 'test@upr.edu')
        self.assertEqual(user.display_name, 'Test User')
        self.assertTrue(user.check_password('testpass123'))

    def test_user_registration_invalid_email(self):
        """Test registration with invalid email"""
        invalid_data = self.user_data.copy()
        invalid_data['email'] = 'invalid-email'
        
        response = self.client.post(self.register_url, invalid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_password_mismatch(self):
        """Test registration with password mismatch"""
        invalid_data = self.user_data.copy()
        invalid_data['password_confirm'] = 'differentpass'
        
        response = self.client.post(self.register_url, invalid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_duplicate_email(self):
        """Test registration with duplicate email"""
        # Create first user
        UserFactory(email='test@upr.edu')
        
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login_success(self):
        """Test successful user login"""
        # Create user first
        user = UserFactory(email='test@upr.edu')
        user.set_password('testpass123')
        user.save()
        
        login_data = {
            'email': 'test@upr.edu',
            'password': 'testpass123'
        }
        
        response = self.client.post(self.login_url, login_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_user_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        login_data = {
            'email': 'test@upr.edu',
            'password': 'wrongpassword'
        }
        
        response = self.client.post(self.login_url, login_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_profile_retrieval(self):
        """Test retrieving user profile"""
        user = UserFactory(email='test@upr.edu')
        self.client.force_authenticate(user=user)
        
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@upr.edu')
        self.assertEqual(response.data['display_name'], user.display_name)

    def test_user_profile_update(self):
        """Test updating user profile"""
        user = UserFactory(email='test@upr.edu')
        self.client.force_authenticate(user=user)
        
        update_data = {
            'display_name': 'Updated Name'
        }
        
        response = self.client.patch(self.profile_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        user.refresh_from_db()
        self.assertEqual(user.display_name, 'Updated Name')

    def test_unauthenticated_profile_access(self):
        """Test that unauthenticated users cannot access profile"""
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
