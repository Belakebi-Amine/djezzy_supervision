# reclamations/urls.py
# ─────────────────────────────────────────────────────────────
# URL routing for reclamation tickets and grouped tickets.
# All routes are prefixed with /api/reclamations/.
# ─────────────────────────────────────────────────────────────
from django.urls import path
from . import views

urlpatterns = [
    # ── Reclamation endpoints ──
    path('', views.liste_reclamations, name='liste-reclamations'),
    path('creer/', views.creer_reclamation, name='creer-reclamation'),
    path('<int:pk>/', views.detail_reclamation, name='detail-reclamation'),
    path('<int:pk>/commentaire/', views.ajouter_commentaire, name='ajouter-commentaire'),
    path('<int:pk>/archiver/', views.archiver_reclamation, name='archiver-reclamation'),
    path('<int:pk>/desarchiver/', views.desarchiver_reclamation, name='desarchiver-reclamation'),
    path('keywords/', views.liste_keywords, name='liste-keywords'),
    path('keywords/preview/', views.preview_priorite, name='preview-priorite'),

    # ── GroupeTicket endpoints ──
    path('groupes/', views.liste_groupe_tickets, name='liste-groupe-tickets'),
    path('groupes/stats/', views.stats_groupe_tickets, name='stats-groupe-tickets'),
    path('groupes/<int:pk>/', views.detail_groupe_ticket, name='detail-groupe-ticket'),
    path('groupes/<int:pk>/modifier/', views.modifier_groupe_ticket, name='modifier-groupe-ticket'),
    path('groupes/<int:pk>/resoudre/', views.resoudre_groupe_ticket, name='resoudre-groupe-ticket'),
    path('groupes/<int:pk>/assigner/', views.assigner_groupe_ticket, name='assigner-groupe-ticket'),
    path('groupes/<int:pk>/archiver/', views.archiver_groupe_ticket, name='archiver-groupe-ticket'),
]
