import pytest
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from factory import Faker, SubFactory
from factory.django import DjangoModelFactory
from listings.models import Organization, Listing, RSVP

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


class ListingViewsTest(APITestCase):
    def setUp(self):
        self.user = UserFactory()
        self.org = OrganizationFactory(owner=self.user)
        self.listing_data = {
            'org': self.org.id,
            'type': 'event',
            'title': 'Test Event',
            'description': 'A test event description',
            'modality': 'in-person',
            'location': 'Test Location'
        }
        self.listings_url = reverse('listing-list')
        self.client.force_authenticate(user=self.user)

    def test_create_listing_success(self):
        """Test successful listing creation"""
        response = self.client.post(self.listings_url, self.listing_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Listing.objects.count(), 1)
        
        listing = Listing.objects.first()
        self.assertEqual(listing.title, 'Test Event')
        self.assertEqual(listing.type, 'event')
        self.assertEqual(listing.created_by, self.user)

    def test_create_listing_unauthorized(self):
        """Test that unauthenticated users cannot create listings"""
        self.client.force_authenticate(user=None)
        response = self.client.post(self.listings_url, self.listing_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_listings(self):
        """Test listing all listings"""
        # Create some test listings
        ListingFactory.create_batch(3, org=self.org)
        
        response = self.client.get(self.listings_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)

    def test_list_listings_with_filtering(self):
        """Test filtering listings by type"""
        # Create listings of different types
        ListingFactory(type='event', org=self.org)
        ListingFactory(type='job', org=self.org)
        ListingFactory(type='event', org=self.org)
        
        response = self.client.get(self.listings_url, {'type': 'event'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Verify all returned listings are events
        for listing in response.data['results']:
            self.assertEqual(listing['type'], 'event')

    def test_list_listings_with_search(self):
        """Test searching listings by title"""
        # Create listings with different titles
        ListingFactory(title='Python Workshop', org=self.org)
        ListingFactory(title='JavaScript Course', org=self.org)
        ListingFactory(title='Python Basics', org=self.org)
        
        response = self.client.get(self.listings_url, {'search': 'Python'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Verify all returned listings contain 'Python'
        for listing in response.data['results']:
            self.assertIn('Python', listing['title'])

    def test_list_listings_with_modality_filter(self):
        """Test filtering listings by modality"""
        # Create listings with different modalities
        ListingFactory(modality='in-person', org=self.org)
        ListingFactory(modality='online', org=self.org)
        ListingFactory(modality='in-person', org=self.org)
        
        response = self.client.get(self.listings_url, {'modality': 'in-person'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Verify all returned listings are in-person
        for listing in response.data['results']:
            self.assertEqual(listing['modality'], 'in-person')

    def test_retrieve_listing(self):
        """Test retrieving a specific listing"""
        listing = ListingFactory(org=self.org, created_by=self.user)
        url = reverse('listing-detail', kwargs={'pk': listing.pk})
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], listing.title)

    def test_update_listing(self):
        """Test updating a listing"""
        listing = ListingFactory(org=self.org, created_by=self.user)
        url = reverse('listing-detail', kwargs={'pk': listing.pk})
        
        update_data = {
            'title': 'Updated Event Title',
            'description': 'Updated description'
        }
        
        response = self.client.patch(url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        listing.refresh_from_db()
        self.assertEqual(listing.title, 'Updated Event Title')

    def test_delete_listing(self):
        """Test deleting a listing"""
        listing = ListingFactory(org=self.org, created_by=self.user)
        url = reverse('listing-detail', kwargs={'pk': listing.pk})
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Listing.objects.count(), 0)


class RSVPViewsTest(APITestCase):
    def setUp(self):
        self.user = UserFactory()
        self.listing = ListingFactory()
        self.rsvp_url = reverse('rsvp-list')
        self.client.force_authenticate(user=self.user)

    def test_create_rsvp_success(self):
        """Test successful RSVP creation"""
        rsvp_data = {
            'listing': self.listing.id,
            'status': 'going'
        }
        
        response = self.client.post(self.rsvp_url, rsvp_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RSVP.objects.count(), 1)
        
        rsvp = RSVP.objects.first()
        self.assertEqual(rsvp.user, self.user)
        self.assertEqual(rsvp.listing, self.listing)
        self.assertEqual(rsvp.status, 'going')

    def test_create_rsvp_duplicate(self):
        """Test creating duplicate RSVP"""
        # Create first RSVP
        RSVPFactory(user=self.user, listing=self.listing)
        
        rsvp_data = {
            'listing': self.listing.id,
            'status': 'interested'
        }
        
        response = self.client.post(self.rsvp_url, rsvp_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(RSVP.objects.count(), 1)

    def test_update_rsvp_status(self):
        """Test updating RSVP status"""
        rsvp = RSVPFactory(user=self.user, listing=self.listing, status='going')
        url = reverse('rsvp-detail', kwargs={'pk': rsvp.pk})
        
        update_data = {'status': 'not_going'}
        response = self.client.patch(url, update_data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rsvp.refresh_from_db()
        self.assertEqual(rsvp.status, 'not_going')

    def test_delete_rsvp(self):
        """Test deleting RSVP"""
        rsvp = RSVPFactory(user=self.user, listing=self.listing)
        url = reverse('rsvp-detail', kwargs={'pk': rsvp.pk})
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(RSVP.objects.count(), 0)

    def test_list_user_rsvps(self):
        """Test listing user's RSVPs"""
        # Create RSVPs for different users
        RSVPFactory(user=self.user, listing=self.listing)
        other_user = UserFactory()
        RSVPFactory(user=other_user, listing=self.listing)
        
        response = self.client.get(self.rsvp_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['user'], self.user.id)

    def test_rsvp_unauthorized(self):
        """Test that unauthenticated users cannot create RSVPs"""
        self.client.force_authenticate(user=None)
        
        rsvp_data = {
            'listing': self.listing.id,
            'status': 'going'
        }
        
        response = self.client.post(self.rsvp_url, rsvp_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
