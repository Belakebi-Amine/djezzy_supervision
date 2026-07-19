"""Configuration de l'application 'sites_reseau' (sites du réseau mobile)."""

from django.apps import AppConfig

class SitesReseauConfig(AppConfig):
    """Configuration pour l'app de gestion des sites réseau."""
    default_auto_field = 'django.db.models.BigAutoField' 
    name = 'sites_reseau'