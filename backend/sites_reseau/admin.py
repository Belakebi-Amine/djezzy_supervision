# sites_reseau/admin.py
from django.contrib import admin
from .models import SiteReseau

@admin.register(SiteReseau)
class SiteReseauAdmin(admin.ModelAdmin):
    """
    Ici, je mets à jour mon interface d'administration.
    J'utilise les nouveaux noms de champs que j'ai définis 
    pour correspondre à mon diagramme de classes.
    """
    
    # J'affiche les colonnes avec les nouveaux noms : codeSite et nom
    list_display = ['codeSite', 'nom', 'wilaya', 'commune', 'statut']
    
    # Je garde mes filtres pour faciliter la gestion par l'Ingénieur Réseaux
    list_filter = ['statut', 'wilaya']
    
    # Je rajoute une barre de recherche pour trouver un site rapidement par son code
    search_fields = ['codeSite', 'nom']
