from django.contrib import admin
from .models import Reclamation, CommentaireTicket


@admin.register(Reclamation)
class ReclamationAdmin(admin.ModelAdmin):
    list_display = ['numero_ticket', 'nom_client', 'type_client', 'site', 'statut', 'priorite', 'cree_par']
    list_filter = ['statut', 'priorite', 'type_client']
    search_fields = ['numero_ticket', 'nom_client', 'telephone_client']
    readonly_fields = ['numero_ticket', 'created_at', 'updated_at', 'resolu_le', 'cree_par']

    fieldsets = [
        ('Identification & États', {
            'fields': ['numero_ticket', 'statut', 'priorite']
        }),
        ('Informations Client', {
            'fields': ['nom_client', 'telephone_client', 'email_client', 'type_client']
        }),
        ('Liaison Réseau Djezzy', {
            'fields': ['site']
        }),
        ('Zone de Test IA (Gemini)', {
            'description': "Zone réservée aux mots-clés de l'opérateur.",
            'fields': ['mots_cles_ia', 'description']
        }),
        ('Assignation & Suivi', {
            'fields': ['cree_par', 'assigne_a', 'created_at', 'updated_at', 'resolu_le']
        }),
    ]

    def save_model(self, request, obj, form, change):
        if not change:
            obj.cree_par = request.user
        super().save_model(request, obj, form, change)


@admin.register(CommentaireTicket)
class CommentaireAdmin(admin.ModelAdmin):
    list_display = ['reclamation', 'auteur', 'created_at']
