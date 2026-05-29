from django.contrib import admin
from .models import Reclamation, CommentaireTicket    # Nos 2 modèles principaux

@admin.register(Reclamation)
class ReclamationAdmin(admin.ModelAdmin):
    # Je garde ta configuration pour l'affichage en liste, elle est parfaite !
    list_display = ['numero_ticket', 'nom_client', 'site', 'statut', 'priorite', 'cree_par']
    list_filter  = ['statut', 'priorite']
    
    # J'active la recherche pour qu'on puisse retrouver un ticket par son numéro ou le client
    search_fields = ['numero_ticket', 'nom_client', 'telephone_client']
    
    # Je bloque ces champs en lecture seule. Comme le numéro de ticket et les dates 
    # sont générés automatiquement par notre code, l'utilisateur ne doit pas les modifier à la main.
    readonly_fields = ['numero_ticket', 'created_at', 'updated_at', 'resolu_le']

    # C'est ici que j'organise la page de modification du ticket. J'ai créé des sections 
    # pour que notre test d'intégration de l'IA Gemini soit super clair à manipuler.
    fieldsets = [
        ('Identification & États', {
            'fields': ['numero_ticket', 'statut', 'priorite']
        }),
        ('Informations Client', {
            'fields': ['nom_client', 'telephone_client']
        }),
        ('Liaison Réseau Djezzy', {
            'fields': ['site']
        }),
        ('Zone de Test IA (Gemini)', {
            'description': "Pour tester notre IA : Écris des mots-clés et laisse la description vide avant de sauvegarder.",
            'fields': ['mots_cles_ia', 'description']
        }),
        ('Assignation & Suivi', {
            'fields': ['cree_par', 'assigne_a', 'created_at', 'updated_at', 'resolu_le']
        }),
    ]

@admin.register(CommentaireTicket)
class CommentaireAdmin(admin.ModelAdmin):
    # Je garde ta configuration pour les commentaires, c'est nickel.
    list_display = ['reclamation', 'auteur', 'created_at']