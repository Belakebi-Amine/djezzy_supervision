# dashboard/urls.py
# ─────────────────────────────────────────────────────────────
# URL routing for the dashboard module. All routes are prefixed
# with /api/dashboard/ (set in config/urls.py).
# ─────────────────────────────────────────────────────────────
from django.urls import path
from .views import (
    statistiques, stats_reporting, liste_sites_carto,
    generer_rapport_ia, liste_rapports_ia, detail_rapport_ia,
    liste_rapports_archives, consulter_archive, consulter_performance,
)

urlpatterns = [
    path('stats/', statistiques, name='stats_dashboard'),
    path('reporting/', stats_reporting, name='stats_reporting'),
    path('carte-sites/', liste_sites_carto, name='liste_sites_carto'),
    path('rapport-ia/generer/', generer_rapport_ia, name='generer-rapport-ia'),
    path('rapport-ia/', liste_rapports_ia, name='liste-rapports-ia'),
    path('rapport-ia/<int:pk>/', detail_rapport_ia, name='detail-rapport-ia'),
    path('rapport-ia/archives/', liste_rapports_archives, name='liste-rapports-archives'),
    path('archives/', consulter_archive, name='consulter-archive'),
    path('performance/<str:code_user>/', consulter_performance, name='consulter-performance'),
]
