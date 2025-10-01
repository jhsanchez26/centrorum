from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, ListingViewSet, RSVPViewSet

router = DefaultRouter()
router.register("organizations", OrganizationViewSet)
router.register("listings", ListingViewSet)
router.register("rsvps", RSVPViewSet)

urlpatterns = router.urls
