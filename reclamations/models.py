from django.db import models
from django.conf import settings
from sites_reseau.models import SiteReseau


class Reclamation(models.Model):
    """
    Ticket de réclamation client créé par un agent Call Center.
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

    # Identification du ticket
    numero_ticket   = models.CharField(max_length=20, unique=True, editable=False)

    # Client concerné (informations de base, pas d'entité Client complexe)
    nom_client      = models.CharField(max_length=200, verbose_name='Nom du client')
    telephone_client= models.CharField(max_length=20, verbose_name='Téléphone client')

    # Lien avec le site réseau concerné
    site            = models.ForeignKey(
                          SiteReseau,
                          on_delete=models.SET_NULL,
                          null=True, blank=True,
                          related_name='reclamations',
                          verbose_name='Site concerné',
                      )

    # Contenu
    description     = models.TextField(verbose_name='Description de l\'incident')
    priorite        = models.CharField(max_length=10, choices=PRIORITE_CHOICES, default='normale')
    statut          = models.CharField(max_length=10, choices=STATUT_CHOICES, default='ouvert')

    # Acteurs
    cree_par        = models.ForeignKey(
                          settings.AUTH_USER_MODEL,
                          on_delete=models.SET_NULL,
                          null=True,
                          related_name='reclamations_creees',
                          verbose_name='Créé par',
                      )
    assigne_a       = models.ForeignKey(
                          settings.AUTH_USER_MODEL,
                          on_delete=models.SET_NULL,
                          null=True, blank=True,
                          related_name='reclamations_assignees',
                          verbose_name='Assigné à',
                      )

    # Horodatage
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)
    resolu_le       = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Réclamation'
        verbose_name_plural = 'Réclamations'
        ordering = ['-created_at']

    def __str__(self):
        return f"Ticket {self.numero_ticket} — {self.get_statut_display()}"

    def save(self, *args, **kwargs):
        # Auto-génération du numéro de ticket
        if not self.numero_ticket:
            from django.utils import timezone
            prefix = timezone.now().strftime('TK%Y%m%d')
            last = Reclamation.objects.filter(
                numero_ticket__startswith=prefix
            ).count()
            self.numero_ticket = f"{prefix}{str(last + 1).zfill(4)}"
        super().save(*args, **kwargs)


class CommentaireTicket(models.Model):
    """
    Commentaires/suivi d'avancement sur un ticket.
    """
    reclamation = models.ForeignKey(
        Reclamation,
        on_delete=models.CASCADE,
        related_name='commentaires',
    )
    auteur      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    contenu     = models.TextField()
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Commentaire de {self.auteur} sur {self.reclamation}"
