from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'display_name', 'password', 'password_confirm')

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
