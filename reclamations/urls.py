from django.urls import path
from . import views

urlpatterns = [
    path('', views.liste_reclamations, name='liste-reclamations'),
    path('creer/', views.creer_reclamation, name='creer-reclamation'),
    path('<int:pk>/', views.detail_reclamation, name='detail-reclamation'),
    path('<int:pk>/commentaire/', views.ajouter_commentaire, name='ajouter-commentaire'),
]