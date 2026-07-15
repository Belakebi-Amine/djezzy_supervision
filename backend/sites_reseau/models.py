# sites_reseau/models.py
# ─────────────────────────────────────────────────────────────
# Network site model representing Djezzy's BTS (Base Transceiver
# Station) sites across Algeria. Each site has geographic coordinates,
# a status (UP/DOWN), technology type (4G/5G), and coverage radius
# for the interactive map display.
# ─────────────────────────────────────────────────────────────
from django.db import models


class SiteReseau(models.Model):
    """
    Represents a single network site (BTS) in Djezzy's infrastructure.
    Key features:
    - Auto-generated site codes (S001, S002...)
    - Status tracking (UP/DOWN) for real-time monitoring
    - Geographic coordinates for map visualization
    - Soft-delete via archive flag instead of actual deletion
    """

    STATUT_CHOICES = [
        ('UP',   'Opérationnel'),
        ('DOWN', 'Hors service'),
    ]

    TECHNOLOGIE_CHOICES = [
        ('4G', '4G'),
        ('5G', '5G'),
    ]

    # ── Identification ──
    codeSite = models.CharField(max_length=50, verbose_name="Code du Site")
    nom = models.CharField(max_length=200)

    # ── Geographic location ──
    wilaya = models.CharField(max_length=100)
    commune = models.CharField(max_length=100)
    coordX = models.DecimalField(max_digits=12, decimal_places=9, null=True, blank=True, verbose_name="Longitude (X)")
    coordY = models.DecimalField(max_digits=12, decimal_places=9, null=True, blank=True, verbose_name="Latitude (Y)")
    adresse = models.TextField(blank=True)

    # ── Operational status ──
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='UP')
    technologie = models.CharField(max_length=2, choices=TECHNOLOGIE_CHOICES, default='5G', verbose_name="Technologie")

    # ── Soft delete & coverage ──
    archive = models.BooleanField(default=False)
    rayon_couverture = models.IntegerField(default=800, verbose_name="Rayon de couverture (m)")

    # ── Timestamps ──
    derniere_maj = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Site Réseau'
        verbose_name_plural = 'Sites Réseau'
        ordering = ['wilaya', 'nom']

    def __str__(self):
        return f"{self.codeSite} - {self.nom} ({self.wilaya})"

    def save(self, *args, **kwargs):
        """Auto-generates site code (S001, S002...) on first save."""
        if not self.codeSite:
            import re
            existing = SiteReseau.objects.filter(codeSite__regex=r'^S\d+$').values_list('codeSite', flat=True)
            max_num = -1
            for code in existing:
                try:
                    num = int(re.sub(r'\D', '', code))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    continue
            self.codeSite = f'S{str(max_num + 1).zfill(6)}'
        super().save(*args, **kwargs)

    def ajouterSite(self):
        """Persists a new site to the database."""
        self.save()

    def modifierSite(self, data):
        """Updates site attributes from a dict and saves."""
        for key, value in data.items():
            setattr(self, key, value)
        self.save()

    def archiverSite(self):
        """
        Soft-deletes the site by setting archive=True.
        The site remains in the DB but is hidden from normal queries.
        """
        self.archive = True
        self.save()

    def desarchiverSite(self):
        """
        Restores an archived site by setting archive=False.
        The site reappears in normal queries.
        """
        self.archive = False
        self.save()
