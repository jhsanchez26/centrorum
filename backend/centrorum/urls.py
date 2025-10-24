from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import health

urlpatterns = [
  path("admin/", admin.site.urls),
  path("api/health/", health),
  path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
  path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
  path("api/auth/", include("accounts.urls")),
  path("api/", include("listings.urls")),
]
