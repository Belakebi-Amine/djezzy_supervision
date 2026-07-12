# dashboard/urls.py
# ─────────────────────────────────────────────────────────────
# URL routing for the dashboard module. All routes are prefixed
# with /api/dashboard/ (set in config/urls.py).
# ─────────────────────────────────────────────────────────────
from django.urls import path
from .views import (
    statistiques, stats_reporting, liste_sites_carto,
    generer_rapport_ia, liste_rapports_ia, detail_rapport_ia,
    liste_rapports_archives,
)

urlpatterns = [
    # Main KPI dashboard stats
    path('stats/', statistiques, name='stats_dashboard'),
    # Geographic reporting (wilayas + communes)
    path('reporting/', stats_reporting, name='stats_reporting'),
    # Lightweight site data for the map component
    path('carte-sites/', liste_sites_carto, name='liste_sites_carto'),
    # AI report generation via Gemini
    path('rapport-ia/generer/', generer_rapport_ia, name='generer-rapport-ia'),
    # List all saved reports / save a new report
    path('rapport-ia/', liste_rapports_ia, name='liste-rapports-ia'),
    # View, update, or delete a specific report
    path('rapport-ia/<int:pk>/', detail_rapport_ia, name='detail-rapport-ia'),
    # Archived reports management (admin only)
    path('rapport-ia/archives/', liste_rapports_archives, name='liste-rapports-archives'),
]
