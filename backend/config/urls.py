# config/urls.py
# ─────────────────────────────────────────────────────────────
# Root URL configuration. Routes API endpoints to each app's
# URL module and serves media files in development.
# ─────────────────────────────────────────────────────────────
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import CustomTokenObtainPairView

urlpatterns = [
    # ── Django Admin Panel ──
    path('admin/', admin.site.urls),

    # ── Business API endpoints ──
    path('api/accounts/', include('accounts.urls')),       # User management & auth
    path('api/sites/', include('sites_reseau.urls')),      # Network sites CRUD
    path('api/reclamations/', include('reclamations.urls')),# Complaint tickets

    # ── Visualization API endpoints ──
    path('api/carte/', include('cartographie.urls')),      # Map data
    path('api/dashboard/', include('dashboard.urls')),     # KPIs & analytics
    path('api/audit/', include('audit_log.urls')),          # Audit trail & system health

    # ── JWT Authentication ──
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
