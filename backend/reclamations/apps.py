"""Configuration de l'application 'reclamations' (gestion des tickets)."""

import threading
from django.apps import AppConfig

class ReclamationsConfig(AppConfig):
    """Configuration pour l'app de gestion des réclamations."""
    default_auto_field = 'django.db.models.BigAutoField' 
    name = 'reclamations'

    def ready(self):
        """Lance l'archivage automatique au démarrage du serveur."""
        # Run auto-archive once on server startup in a background thread
        def _auto_archive():
            """Archive automatiquement les réclamations et rapports anciens."""
            import logging
            logger = logging.getLogger(__name__)
            try:
                from django.utils import timezone
                from datetime import timedelta
                from reclamations.models import Reclamation
                from dashboard.models import RapportIA

                now = timezone.now()

                # Réclamations: archive if resolved > 1 month ago
                one_month_ago = now - timedelta(days=30)
                count_r = Reclamation.objects.filter(
                    is_archived=False,
                    statut__in=['resolu', 'ferme'],
                    resolu_le__isnull=False,
                    resolu_le__lte=one_month_ago,
                ).update(is_archived=True, archived_at=now)

                # Rapports IA: archive if created > 3 months ago
                three_months_ago = now - timedelta(days=90)
                count_p = RapportIA.objects.filter(
                    is_archived=False,
                    created_at__lte=three_months_ago,
                ).update(is_archived=True, archived_at=now)

                if count_r or count_p:
                    logger.info('Auto-archive: %d réclamations, %d rapports archivés', count_r, count_p)
            except Exception as e:
                logger.warning('Auto-archive failed: %s', e)

        threading.Thread(target=_auto_archive, daemon=True).start()