from django.db import models
from django.conf import settings


class RapportIA(models.Model):
    titre = models.CharField(max_length=255)
    prompt = models.TextField(help_text="La demande saisie par l'utilisateur")
    contenu = models.TextField(help_text="Contenu HTML généré par l'IA")
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rapports_ia'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Rapport IA"
        verbose_name_plural = "Rapports IA"

    def __str__(self):
        return self.titre
