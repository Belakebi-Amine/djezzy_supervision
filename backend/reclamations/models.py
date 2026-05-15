from django.db import models
from django.conf import settings
from django.utils import timezone
from sites_reseau.models import SiteReseau

class Reclamation(models.Model):
    """
    Modèle représentant un ticket de réclamation.
    Gère l'auto-génération du numéro et le suivi du cycle de vie.
    """

    STATUT_CHOICES = [
        ('ouvert',    'Ouvert'),
        ('en_cours',  'En cours'),
        ('resolu',    'Résolu'),
        ('ferme',     'Fermé'),
    ]

    PRIORITE_CHOICES = [
        ('basse',   'Basse'),
        ('normale', 'Normale'),
        ('haute',   'Haute'),
        ('critique','Critique'),
    ]

    # Identification
    numero_ticket = models.CharField(max_length=20, unique=True, editable=False)

    # Client
    nom_client = models.CharField(max_length=200, verbose_name='Nom du client')
    telephone_client = models.CharField(max_length=20, verbose_name='Téléphone client')

    # Lien avec le site
    site = models.ForeignKey(
        SiteReseau,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reclamations',
        verbose_name='Site concerné',
    )

    # Détails
    description = models.TextField(verbose_name='Description de l\'incident')
    priorite = models.CharField(max_length=10, choices=PRIORITE_CHOICES, default='normale')
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='ouvert')

    # Acteurs
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reclamations_creees',
        verbose_name='Créé par',
    )
    assigne_a = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reclamations_assignees',
        verbose_name='Assigné à',
    )

    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolu_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Réclamation'
        verbose_name_plural = 'Réclamations'
        ordering = ['-created_at']

    def __str__(self):
        return f"Ticket {self.numero_ticket} — {self.get_statut_display()}"

    def save(self, *args, **kwargs):
        # 1. Génération du numéro de ticket type TK202605150001
        if not self.numero_ticket:
            prefix = timezone.now().strftime('TK%Y%m%d')
            last_count = Reclamation.objects.filter(numero_ticket__startswith=prefix).count()
            self.numero_ticket = f"{prefix}{str(last_count + 1).zfill(4)}"
        
        # 2. Gestion de la date de résolution
        if self.statut == 'resolu' and not self.resolu_le:
            self.resolu_le = timezone.now()
        elif self.statut != 'resolu':
            self.resolu_le = None

        super().save(*args, **kwargs)


class CommentaireTicket(models.Model):
    """
    Commentaires pour le suivi d'avancement entre ingénieurs et techniciens.
    """
    reclamation = models.ForeignKey(
        Reclamation,
        on_delete=models.CASCADE,
        related_name='commentaires',
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    contenu = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Commentaire de {self.auteur} sur {self.reclamation}"