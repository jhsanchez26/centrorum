import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from factory import Faker, SubFactory
from factory.django import DjangoModelFactory

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = Faker('email')
    display_name = Faker('name')
    is_active = True


class UserModelTest(TestCase):
    def test_create_user_with_valid_data(self):
        """Test creating a user with valid data"""
        user = User.objects.create_user(
            email='test@upr.edu',
            display_name='Test User',
            password='testpass123'
        )
        self.assertEqual(user.email, 'test@upr.edu')
        self.assertEqual(user.display_name, 'Test User')
        self.assertTrue(user.check_password('testpass123'))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_superuser(self):
        """Test creating a superuser"""
        user = User.objects.create_superuser(
            email='admin@upr.edu',
            display_name='Admin User',
            password='adminpass123'
        )
        self.assertEqual(user.email, 'admin@upr.edu')
        self.assertEqual(user.display_name, 'Admin User')
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)

    def test_user_str_representation(self):
        """Test user string representation"""
        user = UserFactory(display_name='John Doe')
        self.assertEqual(str(user), 'John Doe')

    def test_user_email_validation(self):
        """Test that email validation works"""
        with self.assertRaises(ValidationError):
            user = User(email='invalid-email')
            user.full_clean()

    def test_user_requires_email(self):
        """Test that user requires email"""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email='',
                display_name='Test User',
                password='testpass123'
            )

    def test_user_requires_display_name(self):
        """Test that user requires display name"""
        with self.assertRaises(TypeError):
            User.objects.create_user(
                email='test@upr.edu',
                password='testpass123'
            )
