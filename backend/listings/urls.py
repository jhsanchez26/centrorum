from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import OrganizationViewSet, ListingViewSet, RSVPViewSet, create_post, toggle_rsvp

router = DefaultRouter()
router.register("organizations", OrganizationViewSet)
router.register("listings", ListingViewSet)
router.register("rsvps", RSVPViewSet)

urlpatterns = [
    path("posts/", create_post, name="create-post"),
    path("rsvp/", toggle_rsvp, name="toggle-rsvp"),
] + router.urls
