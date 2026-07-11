# sites_reseau/urls.py
# ─────────────────────────────────────────────────────────────
# URL routing for network site management. All routes are
# prefixed with /api/sites/ (set in config/urls.py).
# ─────────────────────────────────────────────────────────────
from django.urls import path
from . import views

urlpatterns = [
    # List all sites (with optional ?statut= and ?archive= filters)
    path('', views.liste_sites, name='liste-sites'),
    # Create a new network site
    path('creer/', views.creer_site, name='creer-site'),
    # View, update, or delete a specific site by ID
    path('<int:pk>/', views.detail_site, name='detail-site'),
    # Soft-delete: archive a site instead of removing it
    path('<int:pk>/archiver/', views.archiver_site, name='archiver-site'),
]
