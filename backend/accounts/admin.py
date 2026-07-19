# accounts/admin.py
# ─────────────────────────────────────────────────────────────
# Django admin configuration for the CustomUser model.
# Customizes the admin panel to show role, code_user, and
# provides search/filter capabilities for user management.
# ─────────────────────────────────────────────────────────────
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Extends Django's built-in UserAdmin to include our custom fields
    (role, code_user) while keeping the standard user creation flow.
    """

    # Columns displayed in the user list view
    list_display = ['code_user', 'nom_user', 'email', 'role', 'is_active']

    # Sidebar filters for quick role/status filtering
    list_filter = ['role', 'is_active']

    # Search bar fields
    search_fields = ['code_user', 'email', 'first_name', 'last_name']

    # Prevent manual editing of the auto-generated ID
    readonly_fields = ['id']

    # Fields shown when editing an existing user
    fieldsets = UserAdmin.fieldsets + (
        ('Informations du Diagramme', {
            'fields': ('role',),
        }),
    )

    # Fields shown in the "Add User" form
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informations du Diagramme', {
            'fields': ('role', 'first_name', 'last_name', 'email'),
        }),
    )

