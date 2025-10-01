from rest_framework import viewsets, filters, permissions
from .models import Organization, Listing, RSVP
from .serializers import OrganizationSerializer, ListingSerializer, RSVPSerializer

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in ("GET","HEAD","OPTIONS"): return True
        owner = getattr(obj, "owner", getattr(obj, "created_by", None))
        return owner == request.user

class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all().order_by("name")
    serializer_class = OrganizationSerializer
    permission_classes = [IsOwnerOrReadOnly]
    def perform_create(self, serializer): serializer.save(owner=self.request.user)

class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all().order_by("-created_at")
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["title","description","department","course_code","modality","type"]
    def perform_create(self, serializer): serializer.save(created_by=self.request.user)

class RSVPViewSet(viewsets.ModelViewSet):
    queryset = RSVP.objects.all()
    serializer_class = RSVPSerializer
    permission_classes = [permissions.IsAuthenticated]
