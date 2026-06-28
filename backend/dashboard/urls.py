from django.urls import path
from .views import (
    statistiques, stats_reporting, liste_sites_carto,
    generer_rapport_ia, liste_rapports_ia, detail_rapport_ia,
)

urlpatterns = [
    path('stats/', statistiques, name='stats_dashboard'),
    path('reporting/', stats_reporting, name='stats_reporting'),
    path('carte-sites/', liste_sites_carto, name='liste_sites_carto'),
    path('rapport-ia/generer/', generer_rapport_ia, name='generer-rapport-ia'),
    path('rapport-ia/', liste_rapports_ia, name='liste-rapports-ia'),
    path('rapport-ia/<int:pk>/', detail_rapport_ia, name='detail-rapport-ia'),
]