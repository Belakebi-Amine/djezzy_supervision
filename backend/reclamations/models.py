from django.db import models
from django.conf import settings
from django.utils import timezone
from sites_reseau.models import SiteReseau


class Reclamation(models.Model):
    """
    Modèle principal pour représenter un ticket de réclamation.
    """

    STATUT_CHOICES = [
        ('ouvert',    'Ouvert'),
        ('resolu',    'Résolu'),
        ('ferme',     'Fermé'),
    ]

    PRIORITE_CHOICES = [
        ('basse',   'Basse'),
        ('normale', 'Normale'),
        ('haute',   'Haute'),
        ('critique','Critique'),
    ]

    TYPE_CLIENT_CHOICES = [
        ('particulier', 'Particulier'),
        ('entreprise',  'Entreprise'),
    ]

    # --- IDENTIFICATION UNIQUE ---
    numero_ticket = models.CharField(max_length=20, unique=True, editable=False)

    # --- DONNÉES DU CLIENT ---
    nom_client = models.CharField(max_length=200, verbose_name='Nom du client')
    telephone_client = models.CharField(max_length=20, verbose_name='Téléphone client')
    email_client = models.EmailField(verbose_name='Email client', blank=True, default='')
    type_client = models.CharField(
        max_length=12, choices=TYPE_CLIENT_CHOICES, default='particulier',
        verbose_name='Type de client',
    )

    # --- LIEN AVEC L'INFRASTRUCTURE DJEZZY ---
    site = models.ForeignKey(
        SiteReseau,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reclamations',
        verbose_name='Site concerné',
    )

    # --- BRIQUE D'INTÉGRATION IA ---
    mots_cles_ia = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Mots-clés pour l'IA",
    )

    # --- DÉTAILS ET ÉTATS DU TICKET ---
    description = models.TextField(verbose_name="Description de l'incident", blank=True, null=True)
    priorite = models.CharField(max_length=10, choices=PRIORITE_CHOICES, default='normale')
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='ferme')

    # --- ACTEURS ---
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

    # --- TIMESTAMPS ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolu_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Réclamation'
        verbose_name_plural = 'Réclamations'
        ordering = ['-created_at']

    def __str__(self):
        return f"Ticket {self.numero_ticket} — {self.get_statut_display()}"

    @property
    def nom_complet_client(self):
        return self.nom_client

    def save(self, *args, **kwargs):
        # 1. DÉCLENCHEMENT AUTOMATIQUE DE L'IA
        if self.mots_cles_ia and not self.description:
            from .services import generer_description_incident_ia
            self.description = generer_description_incident_ia(
                nom_client=self.nom_client,
                telephone_client=self.telephone_client,
                mots_cles=self.mots_cles_ia,
            )

        # 2. GÉNÉRATION DU NUMÉRO DE TICKET
        if not self.numero_ticket:
            import re
            existing = Reclamation.objects.filter(numero_ticket__regex=r'^TK\d+$').values_list('numero_ticket', flat=True)
            max_num = 0
            for code in existing:
                try:
                    num = int(re.sub(r'\D', '', code))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    continue
            self.numero_ticket = f'TK{str(max_num + 1).zfill(3)}'

        # 3. SUIVI DU MOMENT DE RÉSOLUTION
        if self.statut == 'resolu' and not self.resolu_le:
            self.resolu_le = timezone.now()
        elif self.statut != 'resolu':
            self.resolu_le = None

        super().save(*args, **kwargs)


class CommentaireTicket(models.Model):
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
