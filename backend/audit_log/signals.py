"""Signaux Django pour le journal d'audit.

Définit des signaux personnalisés pour les actions de connexion
et déconnexion, sans enregistrement automatique pour éviter les doublons.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import Signal

# Custom signals for actions not tied to model saves
user_logged_in = Signal()
user_logged_out = Signal()


def _get_user_from_kwargs(sender, **kwargs):
    return kwargs.get('instance')


# We use explicit handlers instead of auto-mapping to avoid
# double-logging from manual log_activity calls in views.
