from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, display_name, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        # Normalize email to lowercase for case-insensitive storage
        email = self.normalize_email(email.lower().strip())

        # enforce @upr.edu restriction on *registration*
        if not email.endswith("@upr.edu"):
            raise ValueError("Email must be a UPR address (@upr.edu).")

        user = self.model(email=email, display_name=display_name, **extra_fields)
        user.set_password(password)  # hashes the password
        user.save(using=self._db)
        return user

    def create_superuser(self, email, display_name, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, display_name, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    # core profile
    display_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    bio = models.TextField(blank=True, max_length=500)

    # Django admin / permissions plumbing
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["display_name"]

    def __str__(self):
        return self.display_name
    
    def get_encrypted_id(self):
        """Get an encrypted version of the user ID for use in URLs"""
        from .utils import encrypt_user_id
        return encrypt_user_id(self.id)


class ConversationRequest(models.Model):
    """Represents a request to start a conversation"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('denied', 'Denied'),
    ]
    
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_requests')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_requests')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True, help_text="Optional message from the requester")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [['requester', 'recipient']]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.requester.display_name} -> {self.recipient.display_name} ({self.status})"


class Conversation(models.Model):
    """Represents an active conversation between two users"""
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_user2')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['user1', 'user2']]
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.user1.display_name} <-> {self.user2.display_name}"
    
    def get_other_user(self, user):
        """Get the other user in the conversation"""
        return self.user2 if user == self.user1 else self.user1
    
    def get_last_message(self):
        """Get the last message in this conversation"""
        return self.messages.order_by('-created_at').first()


class Message(models.Model):
    """Represents a message within a conversation"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender.display_name}: {self.content[:50]}..."