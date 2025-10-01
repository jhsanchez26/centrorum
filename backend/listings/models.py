from django.conf import settings
from django.db import models

class Organization(models.Model):
    name = models.CharField(max_length=160, unique=True)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orgs")
    created_at = models.DateTimeField(auto_now_add=True)

class Listing(models.Model):
    LISTING_TYPES = [("event","Event"),("tutor","Tutoring"),("job","Job"),("resource","Resource")]
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="listings")
    type = models.CharField(max_length=16, choices=LISTING_TYPES)
    title = models.CharField(max_length=160)
    description = models.TextField()
    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)
    department = models.CharField(max_length=64, blank=True)
    course_code = models.CharField(max_length=32, blank=True)
    is_paid = models.BooleanField(default=False)
    modality = models.CharField(max_length=16, default="in-person")  # or online/hybrid
    capacity = models.PositiveIntegerField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_listings")
    created_at = models.DateTimeField(auto_now_add=True)

class RSVP(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="rsvps")
    status = models.CharField(max_length=16, default="going")  # going/interested
    created_at = models.DateTimeField(auto_now_add=True)

class Follow(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    org = models.ForeignKey(Organization, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class Report(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="reports")
    reason = models.CharField(max_length=160)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
