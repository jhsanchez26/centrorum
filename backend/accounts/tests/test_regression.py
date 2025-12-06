"""
Regression tests to ensure previously fixed bugs don't reoccur
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
from accounts.models import Conversation, Message, ConversationRequest

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = Faker('email')
    display_name = Faker('name')
    is_active = True


class ProfileRegressionTest(APITestCase):
    """Regression tests for profile functionality"""
    
    def setUp(self):
        self.user = UserFactory(email='test@upr.edu', display_name='Test User')
        self.user.set_password('pass123')
        self.user.save()
        refresh = RefreshToken.for_user(self.user)
        self.token = refresh
        self.profile_url = reverse('profile')

    def test_bio_null_handling(self):
        """Regression: Bio should never be null, always return as empty string"""
        # Set bio to None (if possible) - use update to bypass model save if needed
        # But our save() method should handle it
        self.user.bio = None
        self.user.save()
        
        # Refresh token after user modification to ensure it's still valid
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.profile_url)
        
        # Bio should be empty string, not null
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data['bio'], str)
        self.assertEqual(response.data['bio'], '')

    def test_profile_update_partial(self):
        """Regression: Partial profile updates should work correctly"""
        self.client.force_authenticate(user=self.user)
        
        # Update only display_name
        response = self.client.patch(self.profile_url, {
            'display_name': 'New Name'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['display_name'], 'New Name')
        
        # Bio should remain unchanged
        self.user.refresh_from_db()
        original_bio = self.user.bio
        
        # Update only bio
        response = self.client.patch(self.profile_url, {
            'bio': 'New bio'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bio'], 'New bio')
        
        # Display name should remain unchanged
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, 'New Name')

    def test_encrypted_id_consistency(self):
        """Regression: Encrypted ID should be consistent across requests"""
        self.client.force_authenticate(user=self.user)
        
        response1 = self.client.get(self.profile_url)
        response2 = self.client.get(self.profile_url)
        
        # Encrypted ID should be the same in both responses
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response1.data['encrypted_id'],
            response2.data['encrypted_id']
        )


class MessagingRegressionTest(APITestCase):
    """Regression tests for messaging functionality"""
    
    def setUp(self):
        self.user1 = UserFactory(email='user1@upr.edu', display_name='User One')
        self.user1.set_password('pass123')
        self.user1.save()
        self.user2 = UserFactory(email='user2@upr.edu', display_name='User Two')
        self.user2.set_password('pass123')
        self.user2.save()
        
        self.token1 = RefreshToken.for_user(self.user1)
        self.token2 = RefreshToken.for_user(self.user2)
        
        self.create_request_url = reverse('create-conversation-request')
        self.respond_request_url = lambda req_id: reverse('respond-conversation-request', args=[req_id])
        self.send_message_url = lambda conv_id: reverse('send-message', args=[conv_id])
        self.messages_url = lambda conv_id: reverse('get-conversation-messages', args=[conv_id])

    def test_conversation_request_duplicate_prevention(self):
        """Regression: Duplicate conversation requests should be prevented"""
        self.client.force_authenticate(user=self.user1)
        
        # Create first request
        response1 = self.client.post(self.create_request_url, {
            'recipient_id': str(self.user2.id),
            'message': 'First request'
        })
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Try to create duplicate immediately
        response2 = self.client.post(self.create_request_url, {
            'recipient_id': str(self.user2.id),
            'message': 'Duplicate request'
        })
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Accept the first request
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(self.respond_request_url(response1.data['id']), {
            'action': 'accept'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Try to create new request after conversation exists
        self.client.force_authenticate(user=self.user1)
        response3 = self.client.post(self.create_request_url, {
            'recipient_id': str(self.user2.id),
            'message': 'Request after conversation'
        })
        self.assertEqual(response3.status_code, status.HTTP_400_BAD_REQUEST)

    def test_message_ordering(self):
        """Regression: Messages should be returned in chronological order"""
        import time
        conversation = Conversation.objects.create(user1=self.user1, user2=self.user2)
        
        # Create messages with small delays to ensure different timestamps
        msg1 = Message.objects.create(
            conversation=conversation,
            sender=self.user1,
            content='Message 1'
        )
        time.sleep(0.01)  # Small delay to ensure different timestamp
        
        msg2 = Message.objects.create(
            conversation=conversation,
            sender=self.user2,
            content='Message 2'
        )
        time.sleep(0.01)  # Small delay to ensure different timestamp
        
        msg3 = Message.objects.create(
            conversation=conversation,
            sender=self.user1,
            content='Message 3'
        )
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.messages_url(conversation.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Messages should be in chronological order (by created_at, then id)
        self.assertEqual(response.data[0]['content'], 'Message 1')
        self.assertEqual(response.data[1]['content'], 'Message 2')
        self.assertEqual(response.data[2]['content'], 'Message 3')

    def test_unread_count_accuracy(self):
        """Regression: Unread count should be accurate"""
        conversation = Conversation.objects.create(user1=self.user1, user2=self.user2)
        
        # User2 sends 5 messages
        for i in range(5):
            Message.objects.create(
                conversation=conversation,
                sender=self.user2,
                content=f'Message {i}'
            )
        
        # User1 should see 5 unread
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(reverse('list-conversations'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['unread_count'], 5)
        
        # Mark as read
        response = self.client.post(reverse('mark-messages-read', args=[conversation.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Unread count should be 0
        response = self.client.get(reverse('list-conversations'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['unread_count'], 0)

    def test_denied_request_blocking(self):
        """Regression: Denied requests should block future requests"""
        # Create and deny request
        request = ConversationRequest.objects.create(
            requester=self.user1,
            recipient=self.user2,
            message='Hello!'
        )
        
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(self.respond_request_url(request.id), {
            'action': 'deny'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # User1 should not be able to create new request
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.create_request_url, {
            'recipient_id': str(self.user2.id),
            'message': 'New request'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('denied', response.data['error'].lower())

    def test_conversation_other_user_calculation(self):
        """Regression: other_user should always be the other participant"""
        conversation = Conversation.objects.create(user1=self.user1, user2=self.user2)
        
        # From user1's perspective
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(reverse('list-conversations'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['other_user']['id'], self.user2.id)
        
        # From user2's perspective
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(reverse('list-conversations'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['other_user']['id'], self.user1.id)

    def test_empty_message_rejection(self):
        """Regression: Empty or whitespace-only messages should be rejected"""
        conversation = Conversation.objects.create(user1=self.user1, user2=self.user2)
        
        self.client.force_authenticate(user=self.user1)
        
        # Empty message
        response = self.client.post(self.send_message_url(conversation.id), {
            'content': ''
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Whitespace-only message
        response = self.client.post(self.send_message_url(conversation.id), {
            'content': '   \n\t  '
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
