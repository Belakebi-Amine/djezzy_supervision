"""URLs de l'API pour le journal d'audit et la santé du système."""

from django.urls import path
from .views import system_health, audit_logs, audit_stats, server_load, seed_audit_data

urlpatterns = [
    path('health/', system_health, name='system-health'),
    path('logs/', audit_logs, name='audit-logs'),
    path('stats/', audit_stats, name='audit-stats'),
    path('server-load/', server_load, name='server-load'),
    path('seed/', seed_audit_data, name='seed-audit-data'),
]
