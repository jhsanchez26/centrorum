from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from django.db.models import Case, When, Value, CharField
from .models import User, Conversation, Message, ConversationRequest
from .serializers import (
    UserRegistrationSerializer, UserSerializer,
    ConversationSerializer, MessageSerializer, ConversationRequestSerializer
)
from .utils import decrypt_user_id
from listings.serializers import ListingSerializer
from listings.models import Listing

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Get or update current user profile"""
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    elif request.method == 'PATCH':
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login with email and password"""
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response(
            {'error': 'Email and password are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Normalize email to lowercase for case-insensitive login
    email_normalized = email.lower().strip()
    
    # Find user with case-insensitive email lookup
    try:
        user = User.objects.get(email__iexact=email_normalized)
        # Authenticate using the actual email stored in database
        user = authenticate(request, username=user.email, password=password)
    except User.DoesNotExist:
        user = None
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        })
    else:
        return Response(
            {'error': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def user_profile(request, user_id):
    """Get user profile with all their posts"""
    # Try to decrypt the user_id (in case it's encrypted)
    # If decryption fails, try using it as a regular ID for backward compatibility
    decrypted_id = decrypt_user_id(user_id)
    if decrypted_id is not None:
        user = get_object_or_404(User, id=decrypted_id)
    else:
        # Try as regular ID for backward compatibility
        try:
            user = get_object_or_404(User, id=int(user_id))
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user ID'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    user_data = UserSerializer(user).data
    
    # Get all listings created by this user
    listings = Listing.objects.filter(created_by=user).order_by('-created_at')
    listings_data = ListingSerializer(listings, many=True, context={'request': request}).data
    
    return Response({
        'user': user_data,
        'posts': listings_data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_conversation_request(request):
    """Create a conversation request to another user"""
    recipient_id = request.data.get('recipient_id')
    
    if not recipient_id:
        return Response(
            {'error': 'recipient_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Decrypt recipient_id if needed
    decrypted_id = decrypt_user_id(recipient_id)
    if decrypted_id is not None:
        recipient = get_object_or_404(User, id=decrypted_id)
    else:
        try:
            recipient = get_object_or_404(User, id=int(recipient_id))
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid recipient_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if recipient == request.user:
        return Response(
            {'error': 'Cannot create conversation request with yourself'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if there's already an active conversation
    existing_conversation = Conversation.objects.filter(
        Q(user1=request.user, user2=recipient) |
        Q(user1=recipient, user2=request.user)
    ).first()
    
    if existing_conversation:
        return Response(
            {'error': 'You already have an active conversation with this user'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if there's already a conversation request
    existing_request = ConversationRequest.objects.filter(
        Q(requester=request.user, recipient=recipient) |
        Q(requester=recipient, recipient=request.user)
    ).first()
    
    if existing_request:
        if existing_request.status == 'pending':
            if existing_request.requester == request.user:
                return Response(
                    {'error': 'You already have a pending request with this user'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                return Response(
                    {'error': 'This user already sent you a request'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif existing_request.status == 'denied':
            # If recipient denied the request.user, request.user cannot contact them
            if existing_request.requester == request.user:
                return Response(
                    {'error': 'This user has previously denied your request. You cannot contact them again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # If request.user denied the recipient, recipient cannot contact them (shouldn't happen here)
            # but we'll prevent creating a new request
            elif existing_request.recipient == request.user:
                return Response(
                    {'error': 'You have previously denied this user. They cannot contact you again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
    
    # Create the conversation request
    message_text = request.data.get('message', '').strip()
    conversation_request = ConversationRequest.objects.create(
        requester=request.user,
        recipient=recipient,
        message=message_text
    )
    
    serializer = ConversationRequestSerializer(conversation_request)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_conversations(request):
    """List all conversations for the current user"""
    conversations = Conversation.objects.filter(
        Q(user1=request.user) | Q(user2=request.user)
    )
    
    serializer = ConversationSerializer(conversations, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_conversation_requests(request):
    """List all conversation requests for the current user
    
    Returns:
    - Pending requests where user is the recipient (to accept/deny)
    - Requests where user is the requester with status (pending or denied, but not accepted)
    """
    # Get pending requests where user is the recipient
    received_requests = ConversationRequest.objects.filter(
        recipient=request.user,
        status='pending'
    )
    
    # Get requests where user is the requester (to see status - pending or denied, not accepted)
    sent_requests = ConversationRequest.objects.filter(
        requester=request.user,
        status__in=['pending', 'denied']
    )
    
    # Combine and serialize (accepted requests are not included)
    all_requests = list(received_requests) + list(sent_requests)
    serializer = ConversationRequestSerializer(all_requests, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_conversation_request(request, request_id):
    """Accept or deny a conversation request"""
    conversation_request = get_object_or_404(
        ConversationRequest,
        id=request_id,
        recipient=request.user,
        status='pending'
    )
    
    action = request.data.get('action')  # 'accept' or 'deny'
    
    if action == 'accept':
        # Create a conversation
        user1, user2 = sorted([conversation_request.requester, conversation_request.recipient], key=lambda u: u.id)
        conversation, created = Conversation.objects.get_or_create(
            user1=user1,
            user2=user2
        )
        
        # Create the first message from the request message if it exists and conversation has no messages
        if conversation_request.message and conversation.messages.count() == 0:
            Message.objects.create(
                conversation=conversation,
                sender=conversation_request.requester,
                content=conversation_request.message
            )
        
        # Update request status
        conversation_request.status = 'accepted'
        conversation_request.save()
        
        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response({
            'message': 'Conversation request accepted',
            'conversation': serializer.data
        })
    
    elif action == 'deny':
        # Update request status to denied
        conversation_request.status = 'denied'
        conversation_request.save()
        
        return Response({
            'message': 'Conversation request denied'
        })
    
    else:
        return Response(
            {'error': 'action must be either "accept" or "deny"'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversation_messages(request, conversation_id):
    """Get all messages in a conversation"""
    conversation = get_object_or_404(Conversation, id=conversation_id)
    
    # Verify user is part of the conversation
    if conversation.user1 != request.user and conversation.user2 != request.user:
        return Response(
            {'error': 'You do not have permission to view this conversation'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    messages = conversation.messages.all()
    serializer = MessageSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request, conversation_id):
    """Send a message in a conversation"""
    conversation = get_object_or_404(Conversation, id=conversation_id)
    
    # Verify user is part of the conversation
    if conversation.user1 != request.user and conversation.user2 != request.user:
        return Response(
            {'error': 'You do not have permission to send messages in this conversation'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    content = request.data.get('content', '').strip()
    
    if not content:
        return Response(
            {'error': 'Message content is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    message = Message.objects.create(
        conversation=conversation,
        sender=request.user,
        content=content
    )
    
    # Update conversation's updated_at
    conversation.save()
    
    serializer = MessageSerializer(message)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_messages_as_read(request, conversation_id):
    """Mark all messages in a conversation as read"""
    conversation = get_object_or_404(Conversation, id=conversation_id)
    
    # Verify user is part of the conversation
    if conversation.user1 != request.user and conversation.user2 != request.user:
        return Response(
            {'error': 'You do not have permission to mark messages in this conversation'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Mark all unread messages from the other user as read
    other_user = conversation.get_other_user(request.user)
    Message.objects.filter(
        conversation=conversation,
        sender=other_user,
        read_at__isnull=True
    ).update(read_at=timezone.now())
    
    return Response({'message': 'Messages marked as read'})
