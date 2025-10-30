from rest_framework import serializers
from .models import Organization, Listing, RSVP
from accounts.serializers import UserSerializer

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta: model = Organization; fields = "__all__"; read_only_fields=("owner","created_at")

class ListingSerializer(serializers.ModelSerializer):
    org_name = serializers.CharField(source="org.name", read_only=True)
    rsvp_count = serializers.IntegerField(source="rsvps.count", read_only=True)
    going_count = serializers.SerializerMethodField()
    interested_count = serializers.SerializerMethodField()
    not_going_count = serializers.SerializerMethodField()
    user_rsvp_status = serializers.SerializerMethodField()
    created_by = UserSerializer(read_only=True)
    
    def get_going_count(self, obj):
        return obj.rsvps.filter(status='going').count()
    
    def get_interested_count(self, obj):
        return obj.rsvps.filter(status='interested').count()
    
    def get_not_going_count(self, obj):
        return obj.rsvps.filter(status='not_going').count()
    
    def get_user_rsvp_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            rsvp = obj.rsvps.filter(user=request.user).first()
            return rsvp.status if rsvp else None
        return None
    
    class Meta: 
        model = Listing
        fields = "__all__"
        read_only_fields = ("created_at", "archived_at")

class RSVPSerializer(serializers.ModelSerializer):
    class Meta: 
        model = RSVP
        fields = "__all__"
        read_only_fields = ("created_at", "user")