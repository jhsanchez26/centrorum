from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Conversation, Message, ConversationRequest

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'display_name', 'password', 'password_confirm')

    def validate_email(self, value):
        """Normalize email to lowercase"""
        return value.lower().strip() if value else value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class UserSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(required=False, allow_blank=True, default='')
    encrypted_id = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'encrypted_id', 'email', 'display_name', 'bio', 'date_joined')
        read_only_fields = ('id', 'date_joined')
    
    def get_encrypted_id(self, obj):
        """Get the encrypted user ID"""
        return obj.get_encrypted_id()
    
    def to_representation(self, instance):
        """Ensure bio is always returned as a string, never null"""
        representation = super().to_representation(instance)
        representation['bio'] = representation.get('bio') or ''
        return representation


class MinimalUserSerializer(serializers.ModelSerializer):
    """Minimal user serializer for nested representations"""
    encrypted_id = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'encrypted_id', 'display_name')
    
    def get_encrypted_id(self, obj):
        return obj.get_encrypted_id()


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages"""
    sender = MinimalUserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = ('id', 'sender', 'content', 'created_at', 'read_at')
        read_only_fields = ('id', 'created_at', 'read_at')


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for conversations"""
    user1 = MinimalUserSerializer(read_only=True)
    user2 = MinimalUserSerializer(read_only=True)
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ('id', 'user1', 'user2', 'other_user', 'last_message', 'unread_count', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_other_user(self, obj):
        """Get the other user in the conversation (from request context)"""
        request = self.context.get('request')
        if request and request.user:
            other_user = obj.get_other_user(request.user)
            return MinimalUserSerializer(other_user).data
        return None
    
    def get_last_message(self, obj):
        """Get the last message in the conversation"""
        last_msg = obj.get_last_message()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None
    
    def get_unread_count(self, obj):
        """Get count of unread messages for the current user"""
        request = self.context.get('request')
        if request and request.user:
            other_user = obj.get_other_user(request.user)
            return obj.messages.filter(
                sender=other_user,
                read_at__isnull=True
            ).count()
        return 0


class ConversationRequestSerializer(serializers.ModelSerializer):
    """Serializer for conversation requests"""
    requester = MinimalUserSerializer(read_only=True)
    recipient = MinimalUserSerializer(read_only=True)
    
    class Meta:
        model = ConversationRequest
        fields = ('id', 'requester', 'recipient', 'status', 'message', 'created_at')
        read_only_fields = ('id', 'created_at')
