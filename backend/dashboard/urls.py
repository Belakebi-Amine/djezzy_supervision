from django.urls import path
from .views import statistiques # J'importe ta fonction enrichie avec les graphiques

urlpatterns = [
    # Cette route combinée avec ton config donne : /api/dashboard/stats/
    path('stats/', statistiques, name='api-dashboard-stats'),
]