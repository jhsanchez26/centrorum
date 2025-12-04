from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, display_name, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)

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