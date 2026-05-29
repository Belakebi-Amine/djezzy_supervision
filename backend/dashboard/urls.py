from django.urls import path
# J'importe mes trois vues du module dashboard
from .views import statistiques, stats_reporting, liste_sites_carto

urlpatterns = [
    # Route 1 : Dashboard Général (Admin / Call Center)
    path('stats/', statistiques, name='stats_dashboard'),
    
    # Route 2 : Vue Reporting Analytique (Responsable Reporting / Wilayas)
    path('reporting/', stats_reporting, name='stats_reporting'),
    
    # Route 3 : Données Cartographiques (Mini-map et Page Dédiée)
    path('carte-sites/', liste_sites_carto, name='liste_sites_carto'),
]