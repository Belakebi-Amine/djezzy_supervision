"""Modèle du journal d'audit pour tracer toutes les actions effectuées."""

from django.db import models
from django.conf import settings


class ActivityLog(models.Model):
    """Enregistre une action effectuée par un utilisateur ou le système."""
    ACTION_CHOICES = [
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('login_failed', 'Connexion échouée'),
        ('create_ticket', 'Création réclamation'),
        ('update_ticket', 'Modification réclamation'),
        ('archive_ticket', 'Archivage réclamation'),
        ('restore_ticket', 'Restauration réclamation'),
        ('resolve_ticket', 'Résolution ticket'),
        ('assign_ticket', 'Assignation ticket'),
        ('create_user', 'Création utilisateur'),
        ('update_user', 'Modification utilisateur'),
        ('archive_user', 'Archivage utilisateur'),
        ('toggle_user', 'Activation/Désactivation'),
        ('restore_user', 'Restauration utilisateur'),
        ('delete_user', 'Suppression utilisateur'),
        ('reset_password', 'Réinitialisation mot de passe'),
        ('create_site', 'Création site'),
        ('update_site', 'Modification site'),
        ('archive_site', 'Archivage site'),
        ('restore_site', 'Restauration site'),
        ('delete_site', 'Suppression site'),
        ('toggle_site', 'Changement statut site'),
        ('generate_rapport', 'Génération rapport IA'),
        ('save_rapport', 'Sauvegarde rapport IA'),
        ('delete_rapport', 'Suppression rapport IA'),
        ('restore_rapport', 'Restauration rapport IA'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='activity_logs',
    )
    user_code = models.CharField(max_length=10, blank=True, default='')
    user_name = models.CharField(max_length=200, blank=True, default='')
    user_role = models.CharField(max_length=30, blank=True, default='')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES, db_index=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at', 'action']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        """Affichage lisible : date + code utilisateur + action."""
        return f"[{self.created_at:%d/%m %H:%M}] {self.user_code} — {self.get_action_display()}"

    @classmethod
    def log(cls, action, user=None, details=None, ip=None):
        """Crée un nouvel enregistrement de journal d'audit."""
        is_system = user is None
        return cls.objects.create(
            user=user,
            user_code=getattr(user, 'code_user', '') if not is_system else 'SYS',
            user_name=getattr(user, 'nom_user', '') or (user.get_full_name() if user else '') if not is_system else 'Système',
            user_role=getattr(user, 'role', '') if not is_system else 'SYSTEM',
            action=action,
            details=details or {},
            ip_address=ip,
        )
