from django.urls import path
from .views import carte_sites # J'importe la fonction qu'on a optimisée ensemble

urlpatterns = [
    # Cette route combinée avec ton config donne : /api/carte/sites/
    path('sites/', carte_sites, name='api-carte-sites'),
]