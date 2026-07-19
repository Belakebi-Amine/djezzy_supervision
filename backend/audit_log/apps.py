"""Configuration de l'application 'audit_log' (journal d'audit)."""

from django.apps import AppConfig


class AuditLogConfig(AppConfig):
    """Configuration pour l'app de journal d'audit."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'audit_log'
    verbose_name = 'Journal d\'audit'

    def ready(self):
        """Charge les signaux d'audit au démarrage de l'application."""
        try:
            import audit_log.signals  # noqa: F401
        except ImportError:
            pass
