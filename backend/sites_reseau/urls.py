from django.urls import path
from . import views

urlpatterns = [
    # 1. Je l'utilise pour récupérer TOUS mes sites pour le tableau ou pour ma carte.
    # Si je veux filtrer pour la cartographie, j'ajoute le paramètre dans mon fetch :
    # Exemple : /api/sites_reseau/?statut=DOWN
    path('', views.liste_sites, name='liste-sites'),
    
    # 2. Je l'utilise pour ajouter un nouveau site (méthode ajouterSite)
    path('creer/', views.creer_site, name='creer-site'),
    
    # 3. Je l'utilise pour le clic sur la carte (GET), modifier (PUT) ou supprimer (DELETE)
    # Exemple au clic sur le marqueur ID 12 : /api/sites_reseau/12/
    path('<int:pk>/', views.detail_site, name='detail-site'),

    # 4. Archive un site (DOWN) au lieu de le supprimer
    path('<int:pk>/archiver/', views.archiver_site, name='archiver-site'),
]