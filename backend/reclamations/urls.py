# reclamations/urls.py
# ─────────────────────────────────────────────────────────────
# URL routing for reclamation tickets. All routes are prefixed
# with /api/reclamations/ (set in config/urls.py).
# ─────────────────────────────────────────────────────────────
from django.urls import path
from . import views

urlpatterns = [
    # List all tickets (supports ?statut= filtering)
    path('', views.liste_reclamations, name='liste-reclamations'),
    # Create a new complaint ticket
    path('creer/', views.creer_reclamation, name='creer-reclamation'),
    # Get or update a specific ticket by ID
    path('<int:pk>/', views.detail_reclamation, name='detail-reclamation'),
    # Add a comment to a ticket (engineers only)
    path('<int:pk>/commentaire/', views.ajouter_commentaire, name='ajouter-commentaire'),
]
