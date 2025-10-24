from rest_framework import serializers
from .models import Organization, Listing, RSVP
from accounts.serializers import UserSerializer

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta: model = Organization; fields = "__all__"; read_only_fields=("owner","created_at")

class ListingSerializer(serializers.ModelSerializer):
    org_name = serializers.CharField(source="org.name", read_only=True)
    rsvp_count = serializers.IntegerField(source="rsvps.count", read_only=True)
    created_by = UserSerializer(read_only=True)
    
    class Meta: 
        model = Listing
        fields = "__all__"
        read_only_fields = ("created_at", "archived_at")

class RSVPSerializer(serializers.ModelSerializer):
    class Meta: model = RSVP; fields = "__all__"; read_only_fields=("created_at",)