"""
Load and stress tests for User Profiles and Messaging System
"""
import pytest
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from factory import Faker
from factory.django import DjangoModelFactory
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from accounts.models import Conversation, Message, ConversationRequest

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = Faker('email')
    display_name = Faker('name')
    is_active = True


class ProfileLoadTest(TransactionTestCase):
    """Load tests for profile endpoints"""
    
    def setUp(self):
        # Create multiple users for load testing
        self.users = []
        for i in range(10):
            user = UserFactory(email=f'user{i}@upr.edu', display_name=f'User {i}')
            user.set_password('pass123')
            user.save()
            self.users.append(user)
        
        self.tokens = [RefreshToken.for_user(user) for user in self.users]
        self.profile_url = reverse('profile')
        self.user_profile_url = lambda user_id: reverse('user-profile', args=[user_id])

    def test_concurrent_profile_updates(self):
        """Test concurrent profile updates from multiple users"""
        profile_url = reverse('profile')
        
        def update_profile(user_index):
            user = self.users[user_index]
            client = APIClient()
            client.force_authenticate(user=user)
            
            response = client.patch(profile_url, {
                'display_name': f'Updated User {user_index}',
                'bio': f'Bio for user {user_index}'
            })
            return response.status_code == status.HTTP_200_OK
        
        # Run 10 concurrent updates
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(update_profile, i) for i in range(10)]
            results = [f.result() for f in as_completed(futures)]
        
        # All updates should succeed
        self.assertTrue(all(results))
        
        # Verify all profiles were updated correctly
        for i, user in enumerate(self.users):
            user.refresh_from_db()
            self.assertEqual(user.display_name, f'Updated User {i}')

    def test_rapid_profile_requests(self):
        """Test rapid sequential profile requests"""
        client = APIClient()
        client.force_authenticate(user=self.users[0])
        profile_url = reverse('profile')
        
        start_time = time.time()
        success_count = 0
        
        # Make 100 rapid requests
        for _ in range(100):
            response = client.get(profile_url)
            if response.status_code == status.HTTP_200_OK:
                success_count += 1
        
        elapsed_time = time.time() - start_time
        
        # All requests should succeed
        self.assertEqual(success_count, 100)
        # Should complete in reasonable time (< 5 seconds)
        self.assertLess(elapsed_time, 5.0)

    def test_multiple_users_viewing_same_profile(self):
        """Test multiple users viewing the same profile simultaneously"""
        target_user = self.users[0]
        encrypted_id = target_user.get_encrypted_id()
        user_profile_url = reverse('user-profile', args=[encrypted_id])
        
        def view_profile(user_index):
            client = APIClient()
            client.force_authenticate(user=self.users[user_index])
            
            response = client.get(user_profile_url)
            return response.status_code == status.HTTP_200_OK
        
        # 9 users viewing the same profile concurrently
        with ThreadPoolExecutor(max_workers=9) as executor:
            futures = [executor.submit(view_profile, i+1) for i in range(9)]
            results = [f.result() for f in as_completed(futures)]
        
        # All should succeed
        self.assertTrue(all(results))


class MessagingLoadTest(TransactionTestCase):
    """Load tests for messaging endpoints"""
    
    def setUp(self):
        # Create users for load testing
        self.users = []
        for i in range(20):
            user = UserFactory(email=f'user{i}@upr.edu', display_name=f'User {i}')
            user.set_password('pass123')
            user.save()
            self.users.append(user)
        
        self.tokens = [RefreshToken.for_user(user) for user in self.users]
        self.create_request_url = reverse('create-conversation-request')
        self.send_message_url = lambda conv_id: reverse('send-message', args=[conv_id])
        self.messages_url = lambda conv_id: reverse('get-conversation-messages', args=[conv_id])

    def test_concurrent_message_sending(self):
        """Test sending many messages concurrently in the same conversation"""
        # Create a conversation
        conversation = Conversation.objects.create(user1=self.users[0], user2=self.users[1])
        
        send_message_url = reverse('send-message', args=[conversation.id])
        
        def send_message(message_num):
            client = APIClient()
            client.force_authenticate(user=self.users[0])
            
            response = client.post(send_message_url, {
                'content': f'Message {message_num}'
            })
            return response.status_code == status.HTTP_201_CREATED
        
        # Send 50 messages concurrently
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(send_message, i) for i in range(50)]
            results = [f.result() for f in as_completed(futures)]
        
        # All messages should be sent successfully
        self.assertTrue(all(results))
        
        # Verify all messages were saved
        message_count = Message.objects.filter(conversation=conversation).count()
        self.assertEqual(message_count, 50)

    def test_multiple_conversations_creation(self):
        """Test creating multiple conversations simultaneously"""
        def create_conversation_via_request(user1_idx, user2_idx):
            create_request_url = reverse('create-conversation-request')
            client = APIClient()
            client.force_authenticate(user=self.users[user1_idx])
            
            # Create request
            response = client.post(create_request_url, {
                'recipient_id': str(self.users[user2_idx].id),
                'message': f'Request from {user1_idx} to {user2_idx}'
            })
            
            if response.status_code != status.HTTP_201_CREATED:
                return False
            
            # Accept request (as user2)
            request_id = response.data['id']
            client.force_authenticate(user=self.users[user2_idx])
            
            response = client.post(
                reverse('respond-conversation-request', args=[request_id]),
                {'action': 'accept'}
            )
            return response.status_code == status.HTTP_200_OK
        
        # Create 10 conversations concurrently
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(create_conversation_via_request, i*2, i*2+1)
                for i in range(10)
            ]
            results = [f.result() for f in as_completed(futures)]
        
        # All should succeed
        self.assertTrue(all(results))
        
        # Verify conversations were created
        conversation_count = Conversation.objects.count()
        self.assertEqual(conversation_count, 10)

    def test_rapid_message_retrieval(self):
        """Test rapid message retrieval from multiple conversations"""
        # Create multiple conversations with messages
        conversations = []
        for i in range(5):
            conv = Conversation.objects.create(
                user1=self.users[i*2],
                user2=self.users[i*2+1]
            )
            # Add 10 messages to each
            for j in range(10):
                Message.objects.create(
                    conversation=conv,
                    sender=self.users[i*2] if j % 2 == 0 else self.users[i*2+1],
                    content=f'Message {j} in conversation {i}'
                )
            conversations.append(conv)
        
        def retrieve_messages(conv_id, user_idx):
            client = APIClient()
            client.force_authenticate(user=self.users[user_idx])
            messages_url = reverse('get-conversation-messages', args=[conv_id])
            
            response = client.get(messages_url)
            return response.status_code == status.HTTP_200_OK and len(response.data) == 10
        
        # Retrieve messages from all conversations concurrently
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for i, conv in enumerate(conversations):
                futures.append(executor.submit(retrieve_messages, conv.id, i*2))
                futures.append(executor.submit(retrieve_messages, conv.id, i*2+1))
            
            results = [f.result() for f in as_completed(futures)]
        
        # All should succeed
        self.assertTrue(all(results))

    def test_large_message_content(self):
        """Test sending messages with large content"""
        conversation = Conversation.objects.create(user1=self.users[0], user2=self.users[1])
        client = APIClient()
        client.force_authenticate(user=self.users[0])
        send_message_url = reverse('send-message', args=[conversation.id])
        
        # Create a large message (10KB)
        large_content = 'A' * 10000
        
        start_time = time.time()
        response = client.post(send_message_url, {
            'content': large_content
        })
        elapsed_time = time.time() - start_time
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Should complete in reasonable time
        self.assertLess(elapsed_time, 2.0)
        
        # Verify message was saved
        message = Message.objects.get(id=response.data['id'])
        self.assertEqual(len(message.content), 10000)

    def test_many_conversation_requests(self):
        """Test handling many conversation requests"""
        recipient = self.users[0]
        create_request_url = reverse('create-conversation-request')
        
        def create_request(sender_idx):
            client = APIClient()
            client.force_authenticate(user=self.users[sender_idx])
            
            response = client.post(create_request_url, {
                'recipient_id': str(recipient.id),
                'message': f'Request from user {sender_idx}'
            })
            return response.status_code == status.HTTP_201_CREATED
        
        # Create 19 requests concurrently (all other users request recipient)
        with ThreadPoolExecutor(max_workers=19) as executor:
            futures = [executor.submit(create_request, i+1) for i in range(19)]
            results = [f.result() for f in as_completed(futures)]
        
        # All should succeed
        self.assertTrue(all(results))
        
        # Verify all requests were created
        request_count = ConversationRequest.objects.filter(recipient=recipient).count()
        self.assertEqual(request_count, 19)


class MessagingStressTest(TransactionTestCase):
    """Stress tests for messaging system under extreme conditions"""
    
    def setUp(self):
        self.user1 = UserFactory(email='user1@upr.edu', display_name='User One')
        self.user1.set_password('pass123')
        self.user1.save()
        self.user2 = UserFactory(email='user2@upr.edu', display_name='User Two')
        self.user2.set_password('pass123')
        self.user2.save()
        
        self.token1 = RefreshToken.for_user(self.user1)
        self.token2 = RefreshToken.for_user(self.user2)
        
        self.conversation = Conversation.objects.create(user1=self.user1, user2=self.user2)
        self.send_message_url = lambda conv_id: reverse('send-message', args=[conv_id])
        self.messages_url = lambda conv_id: reverse('get-conversation-messages', args=[conv_id])

    def test_very_long_conversation(self):
        """Test conversation with very many messages"""
        # Create 1000 messages
        for i in range(1000):
            Message.objects.create(
                conversation=self.conversation,
                sender=self.user1 if i % 2 == 0 else self.user2,
                content=f'Message {i}'
            )
        
        # Retrieve all messages
        client = APIClient()
        client.force_authenticate(user=self.user1)
        messages_url = reverse('get-conversation-messages', args=[self.conversation.id])
        
        start_time = time.time()
        response = client.get(messages_url)
        elapsed_time = time.time() - start_time
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1000)
        # Should complete in reasonable time (< 3 seconds)
        self.assertLess(elapsed_time, 3.0)

    def test_rapid_alternating_messages(self):
        """Test rapid alternating messages between two users"""
        send_message_url = reverse('send-message', args=[self.conversation.id])
        
        def send_alternating_messages(user, start_num, count):
            client = APIClient()
            client.force_authenticate(user=user)
            
            for i in range(count):
                response = client.post(send_message_url, {
                    'content': f'Message {start_num + i}'
                })
                if response.status_code != status.HTTP_201_CREATED:
                    return False
            return True
        
        # Both users send 100 messages each, alternating
        with ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(send_alternating_messages, self.user1, 0, 100)
            future2 = executor.submit(send_alternating_messages, self.user2, 100, 100)
            
            result1 = future1.result()
            result2 = future2.result()
        
        self.assertTrue(result1)
        self.assertTrue(result2)
        
        # Verify all messages were saved
        message_count = Message.objects.filter(conversation=self.conversation).count()
        self.assertEqual(message_count, 200)
