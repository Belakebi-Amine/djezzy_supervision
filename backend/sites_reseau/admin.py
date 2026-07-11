# sites_reseau/admin.py
# ─────────────────────────────────────────────────────────────
# Django admin configuration for network sites. Provides search,
# filtering, and a clean list display for site management.
# ─────────────────────────────────────────────────────────────
from django.contrib import admin
from .models import SiteReseau


@admin.register(SiteReseau)
class SiteReseauAdmin(admin.ModelAdmin):
    """Admin panel for managing Djezzy's network sites."""

    list_display = ['codeSite', 'nom', 'wilaya', 'commune', 'statut']
    list_filter = ['statut', 'wilaya']
    search_fields = ['codeSite', 'nom']
