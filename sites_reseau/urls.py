from django.urls import path
from . import views

urlpatterns = [
    path('', views.liste_sites, name='liste-sites'),
    path('creer/', views.creer_site, name='creer-site'),
    path('<int:pk>/', views.detail_site, name='detail-site'),
]