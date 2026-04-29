from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    # Ce que je vois dans la liste
    list_display = ['username', 'email', 'role', 'is_active']
    list_filter = ['role', 'is_active']

    # 🟢 AJOUTE CECI : Pour voir et modifier le rôle dans la fiche
    fieldsets = UserAdmin.fieldsets + (
        ('Informations Djezzy', {'fields': ('role',)}),
    )
    
    # Pour le formulaire de création d'un nouvel utilisateur
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informations Djezzy', {'fields': ('role',)}),
    )