from rest_framework import viewsets, filters, permissions, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend
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
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'modality']
    search_fields = ["title","description","department","course_code","modality","type","created_by__display_name"]
    ordering_fields = ['created_at', 'rsvp_count', 'title']
    ordering = ['-created_at']
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer): serializer.save(created_by=self.request.user)

class RSVPViewSet(viewsets.ModelViewSet):
    queryset = RSVP.objects.all()
    serializer_class = RSVPSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['listing', 'user']
    
    def create(self, request, *args, **kwargs):
        # Check if RSVP already exists for this user and listing
        listing_id = request.data.get('listing')
        user = request.user
        
        if listing_id:
            existing_rsvp = RSVP.objects.filter(user=user, listing_id=listing_id).first()
            if existing_rsvp:
                # Update existing RSVP instead of creating new one
                serializer = self.get_serializer(existing_rsvp, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data, status=status.HTTP_200_OK)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Create new RSVP
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get_queryset(self):
        # For listing-based queries, return all RSVPs for that listing
        # For user-based queries, return only user's RSVPs
        listing_id = self.request.query_params.get('listing')
        if listing_id:
            return RSVP.objects.filter(listing_id=listing_id)
        return RSVP.objects.filter(user=self.request.user)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_post(request):
    """Create a new post (which is a listing of type 'post')"""
    # Create a default organization for posts if it doesn't exist
    default_org, created = Organization.objects.get_or_create(
        name="Community Posts",
        defaults={
            'description': 'Community posts and discussions',
            'owner': request.user
        }
    )
    
    # Create the listing as a post
    listing = Listing.objects.create(
        org=default_org,
        type=request.data.get('type', 'post'),
        title=request.data.get('title', 'Post'),
        description=request.data.get('content', ''),
        modality=request.data.get('modality', 'in-person'),
        created_by=request.user
    )
    
    serializer = ListingSerializer(listing)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_rsvp(request):
    """Create or update RSVP for a listing"""
    listing_id = request.data.get('listing')
    rsvp_status = request.data.get('status')
    
    if not listing_id or not rsvp_status:
        return Response({'error': 'listing and status are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        listing = Listing.objects.get(id=listing_id)
    except Listing.DoesNotExist:
        return Response({'error': 'Listing not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get or create RSVP
    rsvp, created = RSVP.objects.get_or_create(
        user=request.user,
        listing=listing,
        defaults={'status': rsvp_status}
    )
    
    if not created:
        # Update existing RSVP
        rsvp.status = rsvp_status
        rsvp.save()
    
    # Return updated listing data
    serializer = ListingSerializer(listing, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)
