# sites_reseau/models.py
from django.db import models

class SiteReseau(models.Model):
    """
    Entité Site5G de mon diagramme de classes.
    J'ai adapté les noms pour qu'ils correspondent exactement à ma conception.
    """

    STATUT_CHOICES = [
        ('UP',       'Opérationnel'),
        ('DOWN',     'Hors service'),
        ('DEGRADE',  'Dégradé'),
        ('PERTURBE', 'Perturbé'),
    ]

    # --- ATTRIBUTS DU DIAGRAMME ---
    # codeSite dans mon diagramme
    codeSite = models.CharField(max_length=50, verbose_name="Code du Site")
    
    # nom dans mon diagramme
    nom = models.CharField(max_length=200)
    
    # wilaya et commune
    wilaya = models.CharField(max_length=100)
    commune = models.CharField(max_length=100)
    
    # coordX et coordY (longitude et latitude dans mon diagramme)
    coordX = models.DecimalField(max_digits=12, decimal_places=9, null=True, blank=True, verbose_name="Longitude (X)")
    coordY = models.DecimalField(max_digits=12, decimal_places=9, null=True, blank=True, verbose_name="Latitude (Y)")
    
    # adresse
    adresse = models.TextField(blank=True)
    
    # statut : j'ajoute ce champ pour la gestion opérationnelle
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='UP')

    # archive : true = site archivé (caché de l'interface mais conservé en BD)
    archive = models.BooleanField(default=False)

    # Dates de suivi technique
    derniere_maj = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Site Réseau'
        verbose_name_plural = 'Sites Réseau'
        ordering = ['wilaya', 'nom']

    def __str__(self):
        return f"{self.codeSite} - {self.nom} ({self.wilaya})"

    # --- MÉTHODES DU DIAGRAMME ---

    def ajouterSite(self):
        """
        Je sauvegarde mon nouveau site dans la base.
        """
        self.save()

    def modifierSite(self, data):
        """
        Je mets à jour les informations de mon site avec les données reçues.
        """
        for key, value in data.items():
            setattr(self, key, value)
        self.save()

    def archiverSite(self):
        """
        Au lieu de supprimer, je marque le site comme archivé (caché par défaut).
        """
        self.archive = True
        self.save()