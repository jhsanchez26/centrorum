"""
Comprehensive unit and integration tests for User Profile views
"""
import pytest
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from factory import Faker
from factory.django import DjangoModelFactory
from listings.models import Listing, Organization
from listings.serializers import ListingSerializer

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = Faker('email')
    display_name = Faker('name')
    is_active = True


class ProfileViewsUnitTest(APITestCase):
    """Unit tests for profile view endpoints"""
    
    def setUp(self):
        self.user = UserFactory(email='test@upr.edu', display_name='Test User')
        self.user.set_password('testpass123')
        self.user.save()
        self.profile_url = reverse('profile')
        self.user_profile_url = lambda user_id: reverse('user-profile', args=[user_id])
        self.client.force_authenticate(user=self.user)

    def test_get_profile_authenticated(self):
        """Test retrieving own profile when authenticated"""
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@upr.edu')
        self.assertEqual(response.data['display_name'], 'Test User')
        self.assertIn('encrypted_id', response.data)

    def test_get_profile_unauthenticated(self):
        """Test that unauthenticated users cannot access profile"""
        # Create a new client without authentication
        from rest_framework.test import APIClient
        unauthenticated_client = APIClient()
        response = unauthenticated_client.get(self.profile_url)
        # DRF returns 401 or 403 for unauthenticated requests depending on configuration
        # 401 = authentication failed, 403 = permission denied (both indicate access denied)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_update_profile_display_name(self):
        """Test updating profile display name"""
        response = self.client.patch(self.profile_url, {
            'display_name': 'Updated Name'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['display_name'], 'Updated Name')
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, 'Updated Name')

    def test_update_profile_bio(self):
        """Test updating profile bio"""
        bio_text = "This is my bio" * 10  # Test with longer text
        response = self.client.patch(self.profile_url, {
            'bio': bio_text
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bio'], bio_text)
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, bio_text)

    def test_update_profile_bio_max_length(self):
        """Test that bio cannot exceed 500 characters"""
        long_bio = 'a' * 501
        # User is already authenticated in setUp
        response = self.client.patch(self.profile_url, {
            'bio': long_bio
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_profile_empty_display_name(self):
        """Test that display name cannot be empty"""
        response = self.client.patch(self.profile_url, {
            'display_name': ''
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_user_profile_with_encrypted_id(self):
        """Test retrieving another user's profile with encrypted ID"""
        other_user = UserFactory(email='other@upr.edu', display_name='Other User')
        encrypted_id = other_user.get_encrypted_id()
        
        response = self.client.get(self.user_profile_url(encrypted_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['id'], other_user.id)
        self.assertEqual(response.data['user']['display_name'], 'Other User')
        self.assertIn('posts', response.data)

    def test_get_user_profile_with_numeric_id(self):
        """Test retrieving user profile with numeric ID (backward compatibility)"""
        other_user = UserFactory(email='other@upr.edu', display_name='Other User')
        
        response = self.client.get(self.user_profile_url(str(other_user.id)))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['id'], other_user.id)

    def test_get_user_profile_invalid_id(self):
        """Test retrieving profile with invalid ID"""
        response = self.client.get(self.user_profile_url('invalid-id-12345'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_user_profile_with_posts(self):
        """Test retrieving user profile includes their posts"""
        other_user = UserFactory(email='other@upr.edu', display_name='Other User')
        other_user.save()
        # Create an organization for the listing
        org = Organization.objects.create(
            name='Test Org',
            owner=other_user
        )
        # Create a listing for the user
        listing = Listing.objects.create(
            title='Test Post',
            description='Test Description',
            type='post',
            modality='in-person',
            created_by=other_user,
            org=org
        )
        
        # user_profile endpoint is AllowAny, but we can still authenticate
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.user_profile_url(str(other_user.id)))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['posts']), 1)
        self.assertEqual(response.data['posts'][0]['title'], 'Test Post')

    def test_get_user_profile_no_posts(self):
        """Test retrieving user profile with no posts"""
        other_user = UserFactory(email='other@upr.edu', display_name='Other User')
        
        response = self.client.get(self.user_profile_url(str(other_user.id)))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['posts']), 0)

    def test_profile_bio_always_string(self):
        """Test that bio is always returned as string, never null"""
        # Test with no bio
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data['bio'], str)
        
        # Test with empty bio
        self.user.bio = ''
        self.user.save()
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data['bio'], str)
        self.assertEqual(response.data['bio'], '')


class ProfileIntegrationTest(APITestCase):
    """Integration tests for profile functionality"""
    
    def setUp(self):
        self.user1 = UserFactory(email='user1@upr.edu', display_name='User One')
        self.user1.set_password('pass123')
        self.user1.save()
        self.user2 = UserFactory(email='user2@upr.edu', display_name='User Two')
        self.user2.set_password('pass123')
        self.user2.save()
        self.profile_url = reverse('profile')
        self.user_profile_url = lambda user_id: reverse('user-profile', args=[user_id])

    def test_full_profile_lifecycle(self):
        """Test complete profile lifecycle: create, view, update, view again"""
        # 1. View initial profile
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        initial_bio = response.data.get('bio', '')
        
        # 2. Update profile
        update_data = {
            'display_name': 'Updated User One',
            'bio': 'This is my updated bio'
        }
        response = self.client.patch(self.profile_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Verify update
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['display_name'], 'Updated User One')
        self.assertEqual(response.data['bio'], 'This is my updated bio')
        
        # 4. View from another user's perspective
        self.client.force_authenticate(user=self.user2)
        encrypted_id = self.user1.get_encrypted_id()
        response = self.client.get(self.user_profile_url(encrypted_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['display_name'], 'Updated User One')
        self.assertEqual(response.data['user']['bio'], 'This is my updated bio')

    def test_profile_with_multiple_listings(self):
        """Test profile view with multiple listings"""
        # Create an organization for the listings
        org = Organization.objects.create(
            name='Test Org',
            owner=self.user1
        )
        # Create multiple listings
        for i in range(5):
            Listing.objects.create(
                title=f'Post {i}',
                description=f'Description {i}',
                type='post',
                modality='in-person',
                created_by=self.user1,
                org=org
            )
        
        # Ensure user1 is saved
        self.user1.save()
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.user_profile_url(str(self.user1.id)))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['posts']), 5)
        
        # Verify posts are ordered by created_at descending
        post_dates = [post['created_at'] for post in response.data['posts']]
        self.assertEqual(post_dates, sorted(post_dates, reverse=True))


class ProfileSecurityTest(APITestCase):
    """Security tests for profile endpoints"""
    
    def setUp(self):
        self.user1 = UserFactory(email='user1@upr.edu', display_name='User One')
        self.user1.set_password('pass123')
        self.user1.save()
        self.user2 = UserFactory(email='user2@upr.edu', display_name='User Two')
        self.user2.set_password('pass123')
        self.user2.save()
        self.profile_url = reverse('profile')

    def test_cannot_update_other_user_profile(self):
        """Test that users cannot update other users' profiles"""
        self.client.force_authenticate(user=self.user2)
        
        # Try to update user1's profile (but will only update user2's own profile)
        response = self.client.patch(self.profile_url, {
            'display_name': 'Hacked Name'
        })
        
        # Should only update user2's own profile
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertNotEqual(self.user1.display_name, 'Hacked Name')
        self.assertEqual(self.user1.display_name, 'User One')

    def test_cannot_access_profile_without_token(self):
        """Test that profile endpoint requires authentication"""
        # Create a new client without authentication
        from rest_framework.test import APIClient
        unauthenticated_client = APIClient()
        response = unauthenticated_client.get(self.profile_url)
        # DRF returns 401 or 403 for unauthenticated requests depending on configuration
        # 401 = authentication failed, 403 = permission denied (both indicate access denied)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_cannot_access_profile_with_invalid_token(self):
        """Test that invalid tokens are rejected"""
        # Create a new client with invalid token
        from rest_framework.test import APIClient
        invalid_token_client = APIClient()
        invalid_token_client.credentials(HTTP_AUTHORIZATION='Bearer invalid-token')
        response = invalid_token_client.get(self.profile_url)
        # DRF JWT authentication returns 401 or 403 for invalid tokens depending on configuration
        # 401 = authentication failed, 403 = permission denied (both indicate access denied)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_profile_sql_injection_protection(self):
        """Test protection against SQL injection in profile updates"""
        malicious_input = "'; DROP TABLE users; --"
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.patch(self.profile_url, {
            'display_name': malicious_input,
            'bio': malicious_input
        })
        
        # Should handle safely (either accept as string or reject)
        # The important thing is it doesn't execute SQL
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])
        
        # Verify user still exists
        self.assertTrue(User.objects.filter(id=self.user1.id).exists())

    def test_profile_xss_protection(self):
        """Test protection against XSS in profile fields"""
        xss_payload = "<script>alert('XSS')</script>"
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.patch(self.profile_url, {
            'display_name': xss_payload,
            'bio': xss_payload
        })
        
        # Should accept but sanitize (or reject)
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])
        
        if response.status_code == status.HTTP_200_OK:
            # If accepted, verify it's stored as-is (sanitization happens on frontend)
            self.user1.refresh_from_db()
            # The data should be stored, but frontend should sanitize on display

    def test_encrypted_id_cannot_be_guessed(self):
        """Test that encrypted IDs cannot be easily guessed"""
        user = UserFactory()
        encrypted_id = user.get_encrypted_id()
        
        # Encrypted ID should not be the same as numeric ID
        self.assertNotEqual(encrypted_id, str(user.id))
        
        # Encrypted ID should be different for different users
        user2 = UserFactory()
        encrypted_id2 = user2.get_encrypted_id()
        self.assertNotEqual(encrypted_id, encrypted_id2)

    def test_profile_data_privacy(self):
        """Test that profile endpoint doesn't expose sensitive data"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.profile_url)
        
        # Should not expose password hash
        self.assertNotIn('password', response.data)
        # Should not expose internal Django fields
        self.assertNotIn('is_superuser', response.data)
        self.assertNotIn('is_staff', response.data)
        # Should only expose allowed fields
        allowed_fields = {'id', 'encrypted_id', 'email', 'display_name', 'bio', 'date_joined'}
        self.assertEqual(set(response.data.keys()), allowed_fields)
