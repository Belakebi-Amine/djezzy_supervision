# reclamations/admin.py
# ─────────────────────────────────────────────────────────────
# Django admin configuration for reclamation tickets, grouped
# tickets, and comments.
# ─────────────────────────────────────────────────────────────
from django.contrib import admin
from .models import Reclamation, CommentaireTicket, GroupeTicket


@admin.register(GroupeTicket)
class GroupeTicketAdmin(admin.ModelAdmin):
    list_display = ['numero_ticket', 'titre', 'site', 'statut', 'priorite', 'nombre_reclamations', 'assigne_a']
    list_filter = ['statut', 'priorite']
    search_fields = ['numero_ticket', 'titre', 'mots_cles', 'site__nom']
    readonly_fields = ['numero_ticket', 'nombre_reclamations', 'created_at', 'updated_at', 'resolu_le', 'premier_signalement']

    fieldsets = [
        ('Identification', {
            'fields': ['numero_ticket', 'titre', 'statut', 'priorite']
        }),
        ('Problème', {
            'fields': ['description', 'mots_cles']
        }),
        ('Site & Assignation', {
            'fields': ['site', 'cree_par', 'assigne_a']
        }),
        ('Statistiques', {
            'fields': ['nombre_reclamations', 'premier_signalement', 'created_at', 'updated_at', 'resolu_le']
        }),
    ]


@admin.register(Reclamation)
class ReclamationAdmin(admin.ModelAdmin):
    list_display = ['numero_ticket', 'nom_client', 'type_client', 'site', 'groupe', 'statut', 'priorite', 'cree_par']
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
        ('Liaison Réseau & Groupement', {
            'fields': ['site', 'groupe']
        }),
        ('Mots-clés IA', {
            'description': "Mots-clés de l'opérateur pour le regroupement automatique.",
            'fields': ['mots_cles_ia']
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
