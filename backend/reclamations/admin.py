from django.contrib import admin
from .models import Reclamation, CommentaireTicket    # les 2 modèles

@admin.register(Reclamation)
class ReclamationAdmin(admin.ModelAdmin):
    list_display = ['numero_ticket', 'nom_client', 'site', 'statut', 'priorite', 'cree_par']
    list_filter  = ['statut', 'priorite']

@admin.register(CommentaireTicket)
class CommentaireAdmin(admin.ModelAdmin):
    list_display = ['reclamation', 'auteur', 'created_at']

# Register your models here.
