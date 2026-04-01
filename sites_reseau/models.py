from django.db import models


class SiteReseau(models.Model):
    """
    Représente un site BTS (Base Transceiver Station) du réseau Djezzy.
    """

    STATUT_CHOICES = [
        ('UP',       'UP — Opérationnel'),
        ('DOWN',     'DOWN — Hors service'),
        ('DEGRADE',  'Dégradé'),
        ('PERTURBE', 'Perturbé'),
    ]

    TECHNOLOGIE_CHOICES = [
        ('2G', '2G'),
        ('3G', '3G'),
        ('4G', '4G'),
        ('5G', '5G'),
    ]

    # Identification
    code_site    = models.CharField(max_length=50, unique=True, verbose_name='Code site')
    nom_site     = models.CharField(max_length=200, verbose_name='Nom du site')
    technologie  = models.CharField(max_length=5, choices=TECHNOLOGIE_CHOICES, default='4G')
    wilaya       = models.CharField(max_length=100, verbose_name='Wilaya')
    adresse      = models.TextField(blank=True, verbose_name='Adresse')

    # Coordonnées GPS (pour la cartographie)
    latitude     = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude    = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)

    # État
    statut       = models.CharField(max_length=10, choices=STATUT_CHOICES, default='UP')
    derniere_maj = models.DateTimeField(auto_now=True)

    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Site Réseau'
        verbose_name_plural = 'Sites Réseau'
        ordering = ['wilaya', 'nom_site']

    def __str__(self):
        return f"[{self.code_site}] {self.nom_site} — {self.statut}"
