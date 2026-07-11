# reclamations/admin.py
# ─────────────────────────────────────────────────────────────
# Django admin configuration for reclamation tickets and comments.
# Provides organized fieldsets for viewing ticket data in the admin panel.
# ─────────────────────────────────────────────────────────────
from django.contrib import admin
from .models import Reclamation, CommentaireTicket


@admin.register(Reclamation)
class ReclamationAdmin(admin.ModelAdmin):
    """Admin panel configuration for complaint tickets."""

    list_display = ['numero_ticket', 'nom_client', 'type_client', 'site', 'statut', 'priorite', 'cree_par']
    list_filter = ['statut', 'priorite', 'type_client']
    search_fields = ['numero_ticket', 'nom_client', 'telephone_client']
    readonly_fields = ['numero_ticket', 'created_at', 'updated_at', 'resolu_le', 'cree_par']

    # Organized fieldsets for the edit form
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
        """Auto-sets the creator when creating a ticket from admin."""
        if not change:
            obj.cree_par = request.user
        super().save_model(request, obj, form, change)


@admin.register(CommentaireTicket)
class CommentaireAdmin(admin.ModelAdmin):
    """Admin panel for ticket comments."""
    list_display = ['reclamation', 'auteur', 'created_at']
