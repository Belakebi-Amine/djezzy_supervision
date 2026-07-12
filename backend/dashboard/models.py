# dashboard/models.py
# ─────────────────────────────────────────────────────────────
# Model for AI-generated reports. Stores the prompt, generated
# HTML content, and date range for each report created by
# supervisors using the Gemini AI integration.
# ─────────────────────────────────────────────────────────────
from django.db import models
from django.conf import settings


class RapportIA(models.Model):
    """
    Stores AI-generated network analysis reports.
    Each report captures the user's prompt, the AI-generated HTML,
    and the date range of data analyzed. Reports can be saved,
    edited, and downloaded as PDF by supervisors.
    """
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

    # ── Archive (soft-delete) ──
    is_archived = models.BooleanField(default=False, verbose_name='Archivé')
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='rapports_archives',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Rapport IA"
        verbose_name_plural = "Rapports IA"

    def __str__(self):
        return self.titre
