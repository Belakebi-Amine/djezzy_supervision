"""Configuration de l'application 'accounts' (gestion des utilisateurs)."""

from django.apps import AppConfig

class AccountsConfig(AppConfig):
    """Configuration pour l'app de gestion des comptes utilisateurs."""
    default_auto_field = 'django.db.models.BigAutoField' 
    name = 'accounts'