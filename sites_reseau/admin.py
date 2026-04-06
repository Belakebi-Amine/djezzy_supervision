from django.contrib import admin
from .models import SiteReseau

@admin.register(SiteReseau)
class SiteReseauAdmin(admin.ModelAdmin):
    list_display = ['code_site', 'name', 'wilaya', 'commune', 'statut']
    list_filter  = ['statut', 'wilaya']

# Register your models here.
