# cartographie/urls.py
# ─────────────────────────────────────────────────────────────
# URL routing for the cartography module. All routes are
# prefixed with /api/carte/ (set in config/urls.py).
# ─────────────────────────────────────────────────────────────
from django.urls import path
from .views import carte_sites

urlpatterns = [
    # Returns all sites with valid coordinates for map rendering
    path('sites/', carte_sites, name='api-carte-sites'),
]
