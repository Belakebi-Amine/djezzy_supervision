from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import CustomTokenObtainPairView

urlpatterns = [
    # ── Administration Django ─────────────────────────────────────────────
    path('admin/', admin.site.urls),
    
    # ── Endpoints de l'API Métier (Authentification et Gestion) ───────────
    path('api/accounts/', include('accounts.urls')),
    path('api/sites/', include('sites_reseau.urls')),
    path('api/reclamations/', include('reclamations.urls')),
    
    # ── Endpoints de l'API Visuelle (Cartographie et Dashboard) ───────────
    path('api/carte/', include('cartographie.urls')),
    path('api/dashboard/', include('dashboard.urls')),

    # ── Authentification JWT (Simple JWT) ─────────────────────────────────
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)