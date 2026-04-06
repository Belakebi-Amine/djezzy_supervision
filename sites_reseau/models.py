from django.db import models


class SiteReseau(models.Model):

    STATUT_CHOICES = [
        ('UP',       'UP — Opérationnel'),
        ('DOWN',     'DOWN — Hors service'),
        ('DEGRADE',  'Dégradé'),
        ('PERTURBE', 'Perturbé'),
    ]

    code_site    = models.CharField(max_length=50, unique=True)
    name         = models.CharField(max_length=200)
    wilaya       = models.CharField(max_length=100)
    commune      = models.CharField(max_length=100)
    longitude    = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    latitude     = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    adresse      = models.TextField(blank=True)
    statut       = models.CharField(max_length=10, choices=STATUT_CHOICES, default='UP')
    derniere_maj = models.DateTimeField(auto_now=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Site Réseau'
        verbose_name_plural = 'Sites Réseau'
        ordering = ['wilaya', 'name']

    def __str__(self):
        return f"[{self.code_site}] {self.name} — {self.statut}"