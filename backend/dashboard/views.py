from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.db.models.functions import TruncDay
from django.utils import timezone
from datetime import timedelta
from reclamations.models import Reclamation
from sites_reseau.models import SiteReseau


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statistiques(request):
    """
    C'est ma vue finale et optimisée à 100%.
    Elle gère le filtrage par période et minimise les requêtes SQL.
    """

    # ── A. JE GÈRE LE FILTRAGE DYNAMIQUE PAR DATE ──────────────────────────
    # Je récupère le paramètre 'jours' depuis l'URL (ex: /api/dashboard/stats/?jours=7).
    # Par défaut, si le frontend ne donne rien, je pars sur 30 jours.
    jours_param = request.query_params.get('jours', '30')
    
    try:
        nb_jours = int(jours_param)
    except ValueError:
        nb_jours = 30 # Sécurité : si quelqu'un écrit du texte à la place d'un chiffre
        
    # Je calcule la date limite (Aujourd'hui MOINS le nombre de jours demandés)
    date_limite = timezone.now() - timedelta(days=nb_jours)


    # ── B. OPTIMISATION 1 : UN SEUL PASSAGE SQL POUR LES SITES ──────────────
    stats_sites = SiteReseau.objects.aggregate(
        total=Count('id'),
        up=Count('id', filter=Q(statut='UP')),
        down=Count('id', filter=Q(statut='DOWN')),
        degrade=Count('id', filter=Q(statut='DEGRADE')),
        perturbe=Count('id', filter=Q(statut='PERTURBE'))
    )


    # ── C. OPTIMISATION 2 : UN SEUL PASSAGE SQL POUR LES TICKETS ────────────
    # J'applique le filtre de date ICI pour mes KPIs de tickets !
    # Comme ça, si je demande les 7 derniers jours, mes compteurs s'adaptent.
    stats_tickets = Reclamation.objects.filter(created_at__gte=date_limite).aggregate(
        total=Count('id'),
        ouverts=Count('id', filter=Q(statut='ouvert')),
        en_cours=Count('id', filter=Q(statut='en_cours')),
        resolus=Count('id', filter=Q(statut='resolu'))
    )

    # Je récupère les valeurs calculées par mon aggregate pour mon taux de résolution
    total_t = stats_tickets['total']
    resolus_t = stats_tickets['resolus']
    taux_resolution = round((resolus_t / total_t) * 100, 2) if total_t > 0 else 0


    # ── D. GRAPH 1 : TOP 5 DES SITES LES PLUS IMPACTÉS (FILTRÉ) ────────────
    # Je ne veux voir que les réclamations créées dans la période choisie.
    top_sites_impactes = (
        SiteReseau.objects.annotate(
            num_reclamations=Count('reclamations', filter=Q(reclamations__created_at__gte=date_limite))
        ) 
        .order_by('-num_reclamations')[:5]
        .values('id', 'codeSite', 'nom', 'num_reclamations')
    )


    # ── E. GRAPH 2 : ÉVOLUTION TEMPORELLE (FILTRÉE) ────────────────────────
    try:
        evolution_tickets = list(
            Reclamation.objects.filter(created_at__gte=date_limite)
            .annotate(jour=TruncDay('created_at'))
            .values('jour')
            .annotate(total=Count('id'))
            .order_by('jour')
        )
    except Exception:
        evolution_tickets = []


    # ── F. RETOUR DU JSON STRUCTURÉ ET FILTRÉ ──────────────────────────────
    return Response({
        'periode_filtree_en_jours': nb_jours,
        'sites': stats_sites,  
        'tickets': {
            'total':          total_t,
            'ouverts':        stats_tickets['ouverts'],
            'en_cours':       stats_tickets['en_cours'],
            'resolus':        resolus_t,
            'taux_resolution': f"{taux_resolution}%",
        },
        'graphiques': {
            'top_sites_impactes': list(top_sites_impactes),
            'evolution_tickets': evolution_tickets
        }
    })