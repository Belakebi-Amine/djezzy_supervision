from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Modèle utilisateur personnalisé.
    Rôles : Call Center | Ingénieur Réseau | Administrateur | Reporting
    """

    ROLE_CHOICES = [
        ('admin',       'Administrateur'),
        ('call_center', 'Agent Call Center'),
        ('ingenieur',   'Ingénieur Réseau'),
        ('reporting',   'Reporting'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='call_center',
        verbose_name='Rôle',
    )

    # Champs supplémentaires utiles
    phone = models.CharField(max_length=20, blank=True, verbose_name='Téléphone')
    department = models.CharField(max_length=100, blank=True, verbose_name='Département')

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    # ── Propriétés pratiques ──────────────────────────────────
    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_call_center(self):
        return self.role == 'call_center'

    @property
    def is_ingenieur(self):
        return self.role == 'ingenieur'

    @property
    def is_reporting(self):
        return self.role == 'reporting'
