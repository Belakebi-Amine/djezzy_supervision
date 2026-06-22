from django.contrib import admin
from .models import Reclamation, CommentaireTicket
from django.contrib.auth import get_user_model

User = get_user_model()

@admin.register(Reclamation)
class ReclamationAdmin(admin.ModelAdmin):
    list_display = ['numero_ticket', 'nom_client', 'site', 'statut', 'priorite', 'cree_par']
    list_filter  = ['statut', 'priorite']
    search_fields = ['numero_ticket', 'nom_client', 'telephone_client']
    readonly_fields = ['numero_ticket', 'created_at', 'updated_at', 'resolu_le']

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
            'description': "Zone réservée aux mots-clés de l'opérateur.",
            'fields': ['mots_cles_ia', 'description']
        }),
        ('Assignation & Suivi', {
            'fields': ['cree_par', 'assigne_a', 'created_at', 'updated_at', 'resolu_le']
        }),
    ]

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        # Filtrer le champ cree_par pour n'afficher que les membres du Call Center
        if db_field.name == "cree_par":
            # On cherche par chaîne de caractères insensible à la casse (__iexact) pour éviter les AttributeError
            kwargs["queryset"] = User.objects.filter(role__iexact="call_center")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(CommentaireTicket)
class CommentaireAdmin(admin.ModelAdmin):
    list_display = ['reclamation', 'auteur', 'created_at']