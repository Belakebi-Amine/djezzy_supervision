from django.urls import path
from . import views

urlpatterns = [
    path('', views.carte_sites, name='carte-sites'),
]