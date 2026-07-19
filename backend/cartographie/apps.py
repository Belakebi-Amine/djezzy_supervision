"""Configuration de l'application 'cartographie' (affichage carte des sites)."""

from django.apps import AppConfig

class CartographieConfig(AppConfig):
    """Configuration pour l'app de cartographie des sites réseau."""
    default_auto_field = 'django.db.models.BigAutoField' 
    name = 'cartographie'