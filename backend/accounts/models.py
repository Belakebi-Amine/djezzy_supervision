# accounts/models.py
# ─────────────────────────────────────────────────────────────
# Custom user model for Djezzy Supervision.
# Replaces Django's default User to add role-based access control
# matching the project's UML class diagram.
# ─────────────────────────────────────────────────────────────
from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    """
    Enum for user roles. Each role maps to a specific dashboard
    and set of permissions within the application.
    """
    ADMIN                = 'ADMIN',                'Administrateur'
    INGENIEUR_RESEAUX    = 'INGENIEUR_RESEAUX',    'Ingénieur Réseaux'
    AGENT_CALL_CENTER    = 'AGENT_CALL_CENTER',    'Agent Call Center'
    RESPONSABLE_REPORTING = 'RESPONSABLE_REPORTING','Responsable Reporting'
    SUPERVISEUR          = 'SUPERVISEUR',          'Superviseur'


class CustomUser(AbstractUser):
    """
    Extended user model that replaces the default Django User.
    Key changes from AbstractUser:
    - Authentication via email instead of username
    - Auto-generated unique code (U001, U002...) as primary identifier
    - Role field for RBAC across the four dashboards
    """

    # Auto-incremented code like U001, U002... generated on first save
    code_user = models.CharField(
        max_length=10,
        unique=True,
        editable=False,
        verbose_name='Code utilisateur',
    )

    # Email becomes the login field instead of username
    email = models.EmailField(unique=True, blank=False)

    # Role determines which dashboard the user sees after login
    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.AGENT_CALL_CENTER,
        verbose_name='role_user'
    )

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    # Use email for authentication (login form sends email, not username)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    @property
    def nom_user(self):
        """Computed full name, falls back to code_user if no name is set."""
        return self.get_full_name() or self.code_user

    def save(self, *args, **kwargs):
        """
        Auto-generates a unique code (U001, U002...) on first save.
        Scans existing codes and increments from the highest number found.
        """
        if not self.code_user:
            import re
            existing = CustomUser.objects.filter(code_user__regex=r'^U\d+$').values_list('code_user', flat=True)
            max_num = -1
            for code in existing:
                try:
                    num = int(re.sub(r'\D', '', code))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    continue
            self.code_user = f'U{str(max_num + 1).zfill(3)}'
            self.username = self.code_user
        super().save(*args, **kwargs)

    def sAuthentifier(self) -> bool:
        """Checks if the account is active and can log in."""
        return self.is_active

    def deconnecter(self) -> None:
        """Placeholder for logout logic (handled at view level with JWT)."""
        pass

    def modifierMotDePasse(self, ancien: str, nouveau: str) -> bool:
        """
        Changes password after verifying the old one.
        Returns True on success, False if old password is wrong.
        """
        if self.check_password(ancien):
            self.set_password(nouveau)
            self.save()
            return True
        return False

    def mettreAJourProfil(self, data: dict) -> None:
        """
        Updates profile fields (first_name, last_name, email) from a dict.
        Only updates fields that actually exist on the model.
        """
        for champ, valeur in data.items():
            if hasattr(self, champ):
                setattr(self, champ, valeur)
        self.save()

    def __str__(self):
        return f"{self.code_user} - {self.nom_user} ({self.get_role_display()})"
