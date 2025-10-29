import pytest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from factory import Faker, SubFactory
from factory.django import DjangoModelFactory
from listings.models import Organization, Listing, RSVP, Follow, Report

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = Faker('email')
    display_name = Faker('name')
    is_active = True


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = Organization

    name = Faker('company')
    description = Faker('text', max_nb_chars=200)
    owner = SubFactory(UserFactory)


class ListingFactory(DjangoModelFactory):
    class Meta:
        model = Listing

    org = SubFactory(OrganizationFactory)
    type = 'event'
    title = Faker('sentence', nb_words=4)
    description = Faker('text', max_nb_chars=500)
    modality = 'in-person'
    created_by = SubFactory(UserFactory)


class RSVPFactory(DjangoModelFactory):
    class Meta:
        model = RSVP

    user = SubFactory(UserFactory)
    listing = SubFactory(ListingFactory)
    status = 'going'


class FollowFactory(DjangoModelFactory):
    class Meta:
        model = Follow

    user = SubFactory(UserFactory)
    org = SubFactory(OrganizationFactory)


class ReportFactory(DjangoModelFactory):
    class Meta:
        model = Report

    user = SubFactory(UserFactory)
    listing = SubFactory(ListingFactory)
    reason = 'Inappropriate content'
    details = 'This listing contains inappropriate content'


class OrganizationModelTest(TestCase):
    def test_create_organization(self):
        """Test creating an organization"""
        user = UserFactory()
        org = Organization.objects.create(
            name='Test Organization',
            description='A test organization',
            owner=user
        )
        self.assertEqual(org.name, 'Test Organization')
        self.assertEqual(org.description, 'A test organization')
        self.assertEqual(org.owner, user)

    def test_organization_str_representation(self):
        """Test organization string representation"""
        org = OrganizationFactory(name='Test Org')
        self.assertEqual(str(org), 'Test Org')

    def test_organization_unique_name(self):
        """Test that organization names must be unique"""
        user = UserFactory()
        Organization.objects.create(name='Test Org', owner=user)
        
        with self.assertRaises(Exception):  # IntegrityError
            Organization.objects.create(name='Test Org', owner=user)


class ListingModelTest(TestCase):
    def test_create_listing(self):
        """Test creating a listing"""
        user = UserFactory()
        org = OrganizationFactory(owner=user)
        
        listing = Listing.objects.create(
            org=org,
            type='event',
            title='Test Event',
            description='A test event',
            modality='in-person',
            created_by=user
        )
        
        self.assertEqual(listing.title, 'Test Event')
        self.assertEqual(listing.type, 'event')
        self.assertEqual(listing.modality, 'in-person')
        self.assertEqual(listing.org, org)
        self.assertEqual(listing.created_by, user)

    def test_listing_str_representation(self):
        """Test listing string representation"""
        listing = ListingFactory(title='Test Event')
        self.assertEqual(str(listing), 'Test Event')

    def test_listing_type_choices(self):
        """Test listing type choices"""
        user = UserFactory()
        org = OrganizationFactory(owner=user)
        
        valid_types = ['event', 'tutor', 'job', 'resource', 'post']
        for listing_type in valid_types:
            listing = Listing.objects.create(
                org=org,
                type=listing_type,
                title=f'Test {listing_type}',
                description='Test description',
                created_by=user
            )
            self.assertEqual(listing.type, listing_type)

    def test_listing_modality_choices(self):
        """Test listing modality choices"""
        user = UserFactory()
        org = OrganizationFactory(owner=user)
        
        modalities = ['in-person', 'online', 'hybrid']
        for modality in modalities:
            listing = Listing.objects.create(
                org=org,
                type='event',
                title='Test Event',
                description='Test description',
                modality=modality,
                created_by=user
            )
            self.assertEqual(listing.modality, modality)


class RSVPModelTest(TestCase):
    def test_create_rsvp(self):
        """Test creating an RSVP"""
        user = UserFactory()
        listing = ListingFactory()
        
        rsvp = RSVP.objects.create(
            user=user,
            listing=listing,
            status='going'
        )
        
        self.assertEqual(rsvp.user, user)
        self.assertEqual(rsvp.listing, listing)
        self.assertEqual(rsvp.status, 'going')

    def test_rsvp_status_choices(self):
        """Test RSVP status choices"""
        user = UserFactory()
        listing = ListingFactory()
        
        valid_statuses = ['going', 'interested', 'not_going']
        for status in valid_statuses:
            rsvp = RSVP.objects.create(
                user=user,
                listing=listing,
                status=status
            )
            self.assertEqual(rsvp.status, status)

    def test_rsvp_str_representation(self):
        """Test RSVP string representation"""
        rsvp = RSVPFactory()
        expected = f"{rsvp.user.display_name} - {rsvp.listing.title} ({rsvp.status})"
        self.assertEqual(str(rsvp), expected)


class FollowModelTest(TestCase):
    def test_create_follow(self):
        """Test creating a follow relationship"""
        user = UserFactory()
        org = OrganizationFactory()
        
        follow = Follow.objects.create(
            user=user,
            org=org
        )
        
        self.assertEqual(follow.user, user)
        self.assertEqual(follow.org, org)

    def test_follow_str_representation(self):
        """Test follow string representation"""
        follow = FollowFactory()
        expected = f"{follow.user.display_name} follows {follow.org.name}"
        self.assertEqual(str(follow), expected)


class ReportModelTest(TestCase):
    def test_create_report(self):
        """Test creating a report"""
        user = UserFactory()
        listing = ListingFactory()
        
        report = Report.objects.create(
            user=user,
            listing=listing,
            reason='Inappropriate content',
            details='This listing contains inappropriate content'
        )
        
        self.assertEqual(report.user, user)
        self.assertEqual(report.listing, listing)
        self.assertEqual(report.reason, 'Inappropriate content')
        self.assertEqual(report.details, 'This listing contains inappropriate content')

    def test_report_str_representation(self):
        """Test report string representation"""
        report = ReportFactory()
        expected = f"Report by {report.user.display_name} for {report.listing.title}"
        self.assertEqual(str(report), expected)
