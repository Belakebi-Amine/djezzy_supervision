"""Configuration de l'application 'dashboard' (tableau de bord et rapports IA)."""

from django.apps import AppConfig

class DashboardConfig(AppConfig):
    """Configuration pour l'app du tableau de bord."""
    default_auto_field = 'django.db.models.BigAutoField' 
    name = 'dashboard'