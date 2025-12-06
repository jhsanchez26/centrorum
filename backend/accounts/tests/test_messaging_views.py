"""
Comprehensive unit and integration tests for Messaging System views
"""
import pytest
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
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


class MessagingViewsUnitTest(APITestCase):
    """Unit tests for messaging view endpoints"""
    
    def setUp(self):
        self.user1 = UserFactory(email='user1@upr.edu', display_name='User One')
        self.user1.set_password('pass123')
        self.user1.save()
        self.user2 = UserFactory(email='user2@upr.edu', display_name='User Two')
        self.user2.set_password('pass123')
        self.user2.save()
        self.user3 = UserFactory(email='user3@upr.edu', display_name='User Three')
        self.user3.set_password('pass123')
        self.user3.save()
        
        self.conversations_url = reverse('list-conversations')
        self.requests_url = reverse('list-conversation-requests')
        self.create_request_url = reverse('create-conversation-request')
        self.respond_request_url = lambda req_id: reverse('respond-conversation-request', args=[req_id])
        self.messages_url = lambda conv_id: reverse('get-conversation-messages', args=[conv_id])
        self.send_message_url = lambda conv_id: reverse('send-message', args=[conv_id])
        self.mark_read_url = lambda conv_id: reverse('mark-messages-read', args=[conv_id])

    def test_create_conversation_request(self):
        """Test creating a conversation request"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.post(self.create_request_url, {
            'recipient_id': str(self.user2.id),
            'message': 'Hello, I want to connect!'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['requester']['id'], self.user1.id)
        self.assertEqual(response.data['recipient']['id'], self.user2.id)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['message'], 'Hello, I want to connect!')
        
        # Verify in database
        request = ConversationRequest.objects.get(id=response.data['id'])
        self.assertEqual(request.requester, self.user1)
        self.assertEqual(request.recipient, self.user2)

    def test_create_conversation_request_with_encrypted_id(self):
        """Test creating conversation request with encrypted recipient ID"""
        self.client.force_authenticate(user=self.user1)
        encrypted_id = self.user2.get_encrypted_id()
        
        response = self.client.post(self.create_request_url, {
            'recipient_id': encrypted_id,
            'message': 'Hello!'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['recipient']['id'], self.user2.id)

    def test_create_conversation_request_to_self(self):
        """Test that users cannot create conversation request to themselves"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.post(self.create_request_url, {
            'recipient_id': str(self.user1.id),
            'message': 'Hello!'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('yourself', response.data['error'].lower())

    def test_create_duplicate_conversation_request(self):
        """Test that duplicate conversation requests are prevented"""
        self.client.force_authenticate(user=self.user1)
        
        # Create first request
        response1 = self.client.post(self.create_request_url, {
            'recipient_id': str(self.user2.id),
            'message': 'First request'
        })
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Try to create duplicate
        response2 = self.client.post(self.create_request_url, {
            'recipient_id': str(self.user2.id),
            'message': 'Second request'
        })
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_request_when_conversation_exists(self):
        """Test that request cannot be created if conversation already exists"""
        # Create conversation
        conversation = Conversation.objects.create(user1=self.user1, user2=self.user2)
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.create_request_url, {
            'recipient_id': str(self.user2.id),
            'message': 'Hello!'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already have an active conversation', response.data['error'])

    def test_list_conversation_requests(self):
        """Test listing conversation requests"""
        # Create requests
        ConversationRequest.objects.create(
            requester=self.user1,
            recipient=self.user2,
            message='Request 1'
        )
        ConversationRequest.objects.create(
            requester=self.user3,
            recipient=self.user1,
            message='Request 2'
        )
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.requests_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        # Should include received pending request
        received = [r for r in response.data if r['recipient']['id'] == self.user1.id]
        self.assertEqual(len(received), 1)
        
        # Should include sent pending request
        sent = [r for r in response.data if r['requester']['id'] == self.user1.id]
        self.assertEqual(len(sent), 1)

    def test_accept_conversation_request(self):
        """Test accepting a conversation request"""
        request = ConversationRequest.objects.create(
            requester=self.user1,
            recipient=self.user2,
            message='Hello!'
        )
        
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(self.respond_request_url(request.id), {
            'action': 'accept'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('conversation', response.data)
        
        # Verify conversation was created
        conversation = Conversation.objects.filter(
            user1__in=[self.user1, self.user2],
            user2__in=[self.user1, self.user2]
        ).first()
        self.assertIsNotNone(conversation)
        
        # Verify request status updated
        request.refresh_from_db()
        self.assertEqual(request.status, 'accepted')
        
        # Verify initial message was created if request had message
        messages = conversation.messages.all()
        self.assertEqual(messages.count(), 1)
        self.assertEqual(messages.first().content, 'Hello!')

    def test_deny_conversation_request(self):
        """Test denying a conversation request"""
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
        
        # Verify request status updated
        request.refresh_from_db()
        self.assertEqual(request.status, 'denied')
        
        # Verify no conversation was created
        conversation = Conversation.objects.filter(
            user1__in=[self.user1, self.user2],
            user2__in=[self.user1, self.user2]
        ).first()
        self.assertIsNone(conversation)

    def test_cannot_accept_own_request(self):
        """Test that users cannot accept their own requests"""
        request = ConversationRequest.objects.create(
            requester=self.user1,
            recipient=self.user2,
            message='Hello!'
        )
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.respond_request_url(request.id), {
            'action': 'accept'
        })
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_conversations(self):
        """Test listing conversations"""
        # Create conversations
        conv1 = Conversation.objects.create(user1=self.user1, user2=self.user2)
        conv2 = Conversation.objects.create(user1=self.user1, user2=self.user3)
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.conversations_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        # Verify other_user is correctly set
        for conv_data in response.data:
            other_user_id = conv_data['other_user']['id']
            self.assertIn(other_user_id, [self.user2.id, self.user3.id])
            self.assertNotEqual(other_user_id, self.user1.id)

    def test_get_conversation_messages(self):
        """Test retrieving messages from a conversation"""
        conversation = Conversation.objects.create(user1=self.user1, user2=self.user2)
        
        # Create messages
        Message.objects.create(
            conversation=conversation,
            sender=self.user1,
            content='Message 1'
        )
        Message.objects.create(
            conversation=conversation,
            sender=self.user2,
            content='Message 2'
        )
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.messages_url(conversation.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['content'], 'Message 1')
        self.assertEqual(response.data[1]['content'], 'Message 2')

    def test_send_message(self):
        """Test sending a message"""
        conversation = Conversation.objects.create(user1=self.user1, user2=self.user2)
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.send_message_url(conversation.id), {
            'content': 'Hello, this is a test message!'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['content'], 'Hello, this is a test message!')
        self.assertEqual(response.data['sender']['id'], self.user1.id)
        
        # Verify message was saved
        message = Message.objects.get(id=response.data['id'])
        self.assertEqual(message.content, 'Hello, this is a test message!')
        self.assertEqual(message.sender, self.user1)

    def test_send_empty_message(self):
        """Test that empty messages are rejected"""
        conversation = Conversation.objects.create(user1=self.user1, user2=self.user2)
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.send_message_url(conversation.id), {
            'content': '   '  # Only whitespace
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mark_messages_as_read(self):
        """Test marking messages as read"""
        conversation = Conversation.objects.create(user1=self.user1, user2=self.user2)
        
        # Create unread messages from user2
        Message.objects.create(
            conversation=conversation,
            sender=self.user2,
            content='Unread message 1'
        )
        Message.objects.create(
            conversation=conversation,
            sender=self.user2,
            content='Unread message 2'
        )
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.mark_read_url(conversation.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify messages are marked as read
        messages = Message.objects.filter(conversation=conversation, sender=self.user2)
        for message in messages:
            self.assertIsNotNone(message.read_at)


class MessagingIntegrationTest(APITestCase):
    """Integration tests for messaging functionality"""
    
    def setUp(self):
        self.user1 = UserFactory(email='user1@upr.edu', display_name='User One')
        self.user1.set_password('pass123')
        self.user1.save()
        self.user2 = UserFactory(email='user2@upr.edu', display_name='User Two')
        self.user2.set_password('pass123')
        self.user2.save()
        
        
        self.create_request_url = reverse('create-conversation-request')
        self.requests_url = reverse('list-conversation-requests')
        self.respond_request_url = lambda req_id: reverse('respond-conversation-request', args=[req_id])
        self.conversations_url = reverse('list-conversations')
        self.requests_url = reverse('list-conversation-requests')
        self.create_request_url = reverse('create-conversation-request')
        self.respond_request_url = lambda req_id: reverse('respond-conversation-request', args=[req_id])
        self.messages_url = lambda conv_id: reverse('get-conversation-messages', args=[conv_id])
        self.send_message_url = lambda conv_id: reverse('send-message', args=[conv_id])
        self.mark_read_url = lambda conv_id: reverse('mark-messages-read', args=[conv_id])

    def test_full_conversation_flow(self):
        """Test complete conversation flow: request -> accept -> send messages"""
        # 1. User1 creates request
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.create_request_url, {
            'recipient_id': str(self.user2.id),
            'message': 'Hi, I want to connect!'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        request_id = response.data['id']
        
        # 2. User2 sees the request
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.requests_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        received_requests = [r for r in response.data if r['recipient']['id'] == self.user2.id]
        self.assertEqual(len(received_requests), 1)
        
        # 3. User2 accepts request
        response = self.client.post(self.respond_request_url(request_id), {
            'action': 'accept'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        conversation_id = response.data['conversation']['id']
        
        # 4. Both users can see the conversation
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.conversations_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.conversations_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # 5. Users can send messages
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.send_message_url(conversation_id), {
            'content': 'Hello!'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(self.send_message_url(conversation_id), {
            'content': 'Hi there!'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 6. Users can retrieve messages
        response = self.client.get(self.messages_url(conversation_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)  # Initial + 2 new messages
        
        # 7. User2 marks messages as read
        response = self.client.post(self.mark_read_url(conversation_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify unread count is updated
        response = self.client.get(self.conversations_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['unread_count'], 0)


class MessagingSecurityTest(APITestCase):
    """Security tests for messaging endpoints"""
    
    def setUp(self):
        self.user1 = UserFactory(email='user1@upr.edu', display_name='User One')
        self.user1.set_password('pass123')
        self.user1.save()
        self.user2 = UserFactory(email='user2@upr.edu', display_name='User Two')
        self.user2.set_password('pass123')
        self.user2.save()
        self.user3 = UserFactory(email='user3@upr.edu', display_name='User Three')
        self.user3.set_password('pass123')
        self.user3.save()
        
        self.conversations_url = reverse('list-conversations')
        self.requests_url = reverse('list-conversation-requests')
        self.create_request_url = reverse('create-conversation-request')
        self.respond_request_url = lambda req_id: reverse('respond-conversation-request', args=[req_id])
        self.messages_url = lambda conv_id: reverse('get-conversation-messages', args=[conv_id])
        self.send_message_url = lambda conv_id: reverse('send-message', args=[conv_id])
        self.mark_read_url = lambda conv_id: reverse('mark-messages-read', args=[conv_id])

    def test_cannot_access_other_users_conversation(self):
        """Test that users cannot access conversations they're not part of"""
        conversation = Conversation.objects.create(user1=self.user2, user2=self.user3)
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.messages_url(conversation.id))
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_send_message_to_other_conversation(self):
        """Test that users cannot send messages to conversations they're not part of"""
        conversation = Conversation.objects.create(user1=self.user2, user2=self.user3)
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.send_message_url(conversation.id), {
            'content': 'Unauthorized message'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_respond_to_other_users_request(self):
        """Test that users cannot respond to requests not meant for them"""
        request = ConversationRequest.objects.create(
            requester=self.user1,
            recipient=self.user2,
            message='Hello!'
        )
        
        self.client.force_authenticate(user=self.user3)
        response = self.client.post(self.respond_request_url(request.id), {
            'action': 'accept'
        })
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_message_content_sanitization(self):
        """Test that message content is handled safely"""
        conversation = Conversation.objects.create(user1=self.user1, user2=self.user2)
        
        malicious_content = "<script>alert('XSS')</script>"
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.send_message_url(conversation.id), {
            'content': malicious_content
        })
        
        # Should accept (sanitization happens on frontend)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify content is stored as-is
        message = Message.objects.get(id=response.data['id'])
        self.assertEqual(message.content, malicious_content)

    def test_denied_request_cannot_be_resent(self):
        """Test that denied requests prevent future requests"""
        # Create and deny a request
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
        
        # Try to create new request
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.create_request_url, {
            'recipient_id': str(self.user2.id),
            'message': 'New request'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('denied', response.data['error'].lower())

    def test_conversation_isolation(self):
        """Test that conversations are properly isolated between users"""
        conv1 = Conversation.objects.create(user1=self.user1, user2=self.user2)
        conv2 = Conversation.objects.create(user1=self.user2, user2=self.user3)
        
        # User1 should only see conv1
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.conversations_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], conv1.id)
        
        # User2 should see both conversations
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.conversations_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        # User3 should only see conv2
        self.client.force_authenticate(user=self.user3)
        response = self.client.get(self.conversations_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], conv2.id)
