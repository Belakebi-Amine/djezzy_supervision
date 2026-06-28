# accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Ici, je configure l'interface d'administration pour qu'elle respecte 
    mon Use Case 'Gérer les Utilisateurs'.
    """

    # Je définis les colonnes visibles dans ma liste d'utilisateurs.
    # code_user est le principal identifiant, plus nom_user (car on utilise code_user)
    list_display = ['code_user', 'nom_user', 'email', 'role', 'is_active']
    
    # Je rajoute des filtres pour que l'Admin puisse trier par rôle 
    # (ex: voir uniquement les Agents Call Center).
    list_filter = ['role', 'is_active']
    
    # Je définis les champs sur lesquels l'Admin peut faire une recherche.
    search_fields = ['code_user', 'email', 'first_name', 'last_name']
    
    # L'ID (id_user) ne doit jamais être modifié manuellement, donc je le mets en lecture seule.
    readonly_fields = ['id']

    # --- CONFIGURATION DES FORMULAIRES ---

    # Ici, je modifie le formulaire d'édition (quand je clique sur un utilisateur).
    # Je retire tout ce qui n'est pas dans mon diagramme (comme le téléphone) 
    # et j'ajoute mon champ 'role'.
    fieldsets = UserAdmin.fieldsets + (
        ('Informations du Diagramme', {
            'fields': ('role',),
        }),
    )

    # Ici, je configure le formulaire de création (Ajouter un utilisateur).
    # Cela correspond à l'action 'créerUtilisateur(data)' de mon diagramme.
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informations du Diagramme', {
            'fields': ('role', 'first_name', 'last_name', 'email'),
        }),
    )

    # nom_user supprimé — on travaille maintenant avec code_user