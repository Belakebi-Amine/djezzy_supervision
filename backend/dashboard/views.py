# dashboard/views.py
# ─────────────────────────────────────────────────────────────
# Core dashboard views providing analytics, KPIs, and reporting
# endpoints. These views aggregate data from reclamation tickets
# and network sites to power all the charts and stats on the
# admin, call center, and supervisor dashboards.
# ─────────────────────────────────────────────────────────────
import platform
import sys
import os
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import connection
from django.db.models import Count, Q, Avg, F
from django.db.models.functions import TruncDay, ExtractWeekDay
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from reclamations.models import Reclamation, GroupeTicket
from sites_reseau.models import SiteReseau
from accounts.models import CustomUser, Role
from accounts.serializers import UserSerializer
from .models import RapportIA
from audit_log.models import ActivityLog


def _get_ip(request):
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
    return ip or request.META.get('REMOTE_ADDR', '')

# French day names for the weekly ticket distribution chart
JOURS_SEMAINE = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']


def _format_duree(duree):
    """Formats a timedelta into a human-readable 'Xh Ym' string."""
    if not duree:
        return "N/A"
    total_seconds = int(duree.total_seconds())
    if total_seconds < 0:
        return "N/A"
    heures = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    return f"{heures}h {minutes}m"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. GENERAL DASHBOARD STATS (Admin / Call Center / Supervisor)
#
# Main KPI endpoint that powers the overview dashboard. Returns:
# - Network status (sites UP/DOWN, availability %)
# - Ticket stats (total, open, resolved, resolution rate)
# - Charts data (priority donut, evolution over time, weekly pattern)
# - Employee performance (engineer and agent stats)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statistiques(request):
    # Parse the day range parameter (default: last 30 days)
    annee_param = request.query_params.get('annee')
    if annee_param:
        try:
            annee = int(annee_param)
            date_limite = timezone.datetime(annee, 1, 1, tzinfo=timezone.get_current_timezone())
            date_fin = timezone.datetime(annee, 12, 31, 23, 59, 59, tzinfo=timezone.get_current_timezone())
        except (ValueError, OverflowError):
            annee = None
            nb_jours = 30
            date_limite = timezone.now() - timedelta(days=nb_jours)
            date_fin = None
    else:
        annee = None
        date_fin = None
        jours_param = request.query_params.get('jours', '30')
        try:
            nb_jours = int(jours_param)
        except ValueError:
            nb_jours = 30
        date_limite = timezone.now() - timedelta(days=nb_jours)

    # Build date filter dict for reuse across all queries
    base_date_filter = {'created_at__gte': date_limite}
    if date_fin:
        base_date_filter['created_at__lte'] = date_fin

    # ── Network site statistics ──
    stats_sites = SiteReseau.objects.aggregate(
        total=Count('id'),
        up=Count('id', filter=Q(statut='UP')),
        down=Count('id', filter=Q(statut='DOWN')),
        degrade=Count('id', filter=Q(statut='DEGRADE')),
        perturbe=Count('id', filter=Q(statut='PERTURBE')),
    )
    total_s = stats_sites['total']
    sites_up = stats_sites['up']
    # Global network availability = (UP sites / total sites) * 100
    disponibilite = round((sites_up / total_s) * 100, 1) if total_s > 0 else 100.0

    # ── Ticket statistics for the filtered period ──
    stats_tickets = Reclamation.objects.filter(**base_date_filter).aggregate(
        total=Count('id'),
        ouverts=Count('id', filter=Q(statut__iexact='ouvert')),
        resolus=Count('id', filter=Q(statut__iexact='resolu')),
        fermes=Count('id', filter=Q(statut__iexact='ferme')),
        ouverts_critiques=Count('id', filter=Q(statut__iexact='ouvert', priorite__iexact='critique')),
        p_critique=Count('id', filter=Q(priorite__iexact='critique')),
        p_haute=Count('id', filter=Q(priorite__iexact='haute')),
        p_normale=Count('id', filter=Q(priorite__iexact='normale')),
        p_basse=Count('id', filter=Q(priorite__iexact='basse')),
        type_particulier=Count('id', filter=Q(type_client__iexact='particulier')),
        type_entreprise=Count('id', filter=Q(type_client__iexact='entreprise')),
    )
    total_t = stats_tickets['total']
    resolus_t = stats_tickets['resolus']
    # Resolution rate = (resolved / total) * 100
    taux_resolution = round((resolus_t / total_t) * 100, 1) if total_t > 0 else 0.0

    # ── Average resolution delay ──
    # Calculates mean time between ticket creation and resolution
    delai_stats = Reclamation.objects.filter(
        **base_date_filter, statut__in=['resolu', 'ferme'],
        resolu_le__isnull=False, resolu_le__gt=F('created_at'),
    ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))
    delai_moyen_str = _format_duree(delai_stats['duree__avg'])

    # ── Average delay per priority level ──
    delai_par_prio = {}
    for prio in ['critique', 'haute', 'normale', 'basse']:
        d = Reclamation.objects.filter(
            **base_date_filter, statut__in=['resolu', 'ferme'],
            resolu_le__isnull=False, resolu_le__gt=F('created_at'),
            priorite__iexact=prio,
        ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))
        delai_par_prio[prio] = _format_duree(d['duree__avg'])

    # ── Ticket distribution by day of week ──
    # Helps identify peak days for staffing decisions
    tickets_par_jour = (
        Reclamation.objects.filter(**base_date_filter)
        .annotate(jour_semaine=ExtractWeekDay('created_at'))
        .values('jour_semaine')
        .annotate(total=Count('id'))
        .order_by('jour_semaine')
    )
    jour_map = {i: JOURS_SEMAINE[i - 1] for i in range(1, 8)}
    tickets_jour_semaine = [
        {'jour': jour_map.get(item['jour_semaine'], '?'), 'total': item['total']}
        for item in tickets_par_jour
    ]

    # ── Client type breakdown ──
    tickets_par_type = [
        {'type': 'Particulier', 'total': stats_tickets['type_particulier']},
        {'type': 'Entreprise', 'total': stats_tickets['type_entreprise']},
    ]

    # ── Top impacted sites (most tickets in the period) ──
    top_sites_impactes = (
        SiteReseau.objects.annotate(
            num_reclamations=Count('reclamations', filter=Q(**{f'reclamations__{k}': v for k, v in base_date_filter.items()}))
        )
        .order_by('-num_reclamations')[:7]
        .values('id', 'codeSite', 'nom', 'num_reclamations')
    )

    # ── Daily ticket creation evolution (for line chart) ──
    try:
        evolution_tickets = list(
            Reclamation.objects.filter(**base_date_filter)
            .annotate(jour=TruncDay('created_at'))
            .values('jour')
            .annotate(total=Count('id'))
            .order_by('jour')
        )
    except Exception:
        evolution_tickets = []

    # ── Daily resolution count ──
    try:
        resolutions_par_jour = list(
            Reclamation.objects.filter(resolu_le__gte=date_limite, resolu_le__isnull=False)
            .annotate(jour=TruncDay('resolu_le'))
            .values('jour')
            .annotate(resolus=Count('id'))
            .order_by('jour')
        )
    except Exception:
        resolutions_par_jour = []

    # ── Per-engineer performance stats (based on GroupeTickets) ──
    stats_employes = []
    ingenieurs = CustomUser.objects.filter(role=Role.INGENIEUR_RESEAUX, is_active=True)
    for ing in ingenieurs:
        total_assignes = GroupeTicket.objects.filter(assigne_a=ing, **base_date_filter).count()
        resolus = GroupeTicket.objects.filter(assigne_a=ing, statut='resolu', **base_date_filter).count()
        ouverts = GroupeTicket.objects.filter(assigne_a=ing, statut='ouvert', **base_date_filter).count()
        delai_ing = GroupeTicket.objects.filter(
            assigne_a=ing, statut__in=['resolu', 'ferme'], resolu_le__isnull=False,
            **base_date_filter, resolu_le__gt=F('created_at'),
        ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))
        stats_employes.append({
            'code': ing.code_user,
            'nom': ing.get_full_name().strip() or ing.code_user,
            'email': ing.email,
            'total_assignes': total_assignes,
            'resolus': resolus,
            'ouverts': ouverts,
            'taux_resolution': round((resolus / total_assignes) * 100, 1) if total_assignes > 0 else 0,
            'delai_moyen': _format_duree(delai_ing['duree__avg']),
        })

    return Response({
        'periode_filtree_en_jours': nb_jours,
        'reseau_global': {
            'total_sites': total_s,
            'sites_up': stats_sites['up'],
            'sites_down': stats_sites['down'],
            'sites_degrades': stats_sites['degrade'],
            'sites_perturbes': stats_sites['perturbe'],
            'disponibilite_globale': f"{disponibilite}%",
        },
        'tickets': {
            'total': total_t,
            'ouverts': stats_tickets['ouverts'],
            'resolus': resolus_t,
            'fermes': stats_tickets['fermes'],
            'ouverts_critiques': stats_tickets['ouverts_critiques'],
            'taux_resolution': f"{taux_resolution}%",
            'delai_moyen_resolution': delai_moyen_str,
        },
        'graphiques': {
            'repartition_priorite_donut': {
                'critique': stats_tickets['p_critique'],
                'haute': stats_tickets['p_haute'],
                'normale': stats_tickets['p_normale'],
                'basse': stats_tickets['p_basse'],
            },
            'top_sites_impactes': list(top_sites_impactes),
            'evolution_tickets': evolution_tickets,
            'resolutions_par_jour': resolutions_par_jour,
            'tickets_par_jour_semaine': tickets_jour_semaine,
            'tickets_par_type': tickets_par_type,
            'delai_moyen_par_priorite': delai_par_prio,
        },
        'stats_employes': stats_employes,

        # Per-agent call center performance
        'stats_agents_cc': [{
            'code': a.code_user,
            'nom': a.get_full_name().strip() or a.code_user,
            'email': a.email,
            'tickets_crees': Reclamation.objects.filter(cree_par=a, **base_date_filter).count(),
            'ouverts': Reclamation.objects.filter(cree_par=a, statut='ouvert', **base_date_filter).count(),
            'resolus': Reclamation.objects.filter(cree_par=a, statut='resolu', **base_date_filter).count(),
            'fermes': Reclamation.objects.filter(cree_par=a, statut='ferme', **base_date_filter).count(),
        } for a in CustomUser.objects.filter(role=Role.AGENT_CALL_CENTER, is_active=True).order_by('code_user')],
    })


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. ANALYTICAL REPORTING (Wilayas + Communes)
#
# Geographic breakdown of network performance. Provides per-wilaya
# and per-commune stats including availability rates, open tickets,
# and resolution delays. Used by the supervisor reporting view.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_reporting(request):
    annee_param = request.query_params.get('annee')
    if annee_param:
        try:
            annee = int(annee_param)
            date_limite = timezone.datetime(annee, 1, 1, tzinfo=timezone.get_current_timezone())
            date_fin = timezone.datetime(annee, 12, 31, 23, 59, 59, tzinfo=timezone.get_current_timezone())
        except (ValueError, OverflowError):
            nb_jours = 30
            date_limite = timezone.now() - timedelta(days=nb_jours)
            date_fin = None
    else:
        jours_param = request.query_params.get('jours', '30')
        try:
            nb_jours = int(jours_param)
        except ValueError:
            nb_jours = 30
        date_limite = timezone.now() - timedelta(days=nb_jours)
        date_fin = None

    base_date_filter = {'created_at__gte': date_limite}
    if date_fin:
        base_date_filter['created_at__lte'] = date_fin

    # ── Global KPIs for the period ──
    stats_globales = Reclamation.objects.filter(**base_date_filter).aggregate(
        total_tickets=Count('id'),
        resolus=Count('id', filter=Q(statut__iexact='resolu')),
        p_critique=Count('id', filter=Q(priorite__iexact='critique')),
        p_haute=Count('id', filter=Q(priorite__iexact='haute')),
        p_normale=Count('id', filter=Q(priorite__iexact='normale')),
        p_basse=Count('id', filter=Q(priorite__iexact='basse')),
    )
    total_t = stats_globales['total_tickets']
    resolus_t = stats_globales['resolus']
    taux_resolution = round((resolus_t / total_t) * 100, 1) if total_t > 0 else 0.0

    delai_stats = Reclamation.objects.filter(
        **base_date_filter, statut__in=['resolu', 'ferme'],
        resolu_le__isnull=False, resolu_le__gt=F('created_at'),
    ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))
    delai_moyen_str = _format_duree(delai_stats['duree__avg'])

    total_sites_down = SiteReseau.objects.filter(statut='DOWN').count()

    # ── Per-wilaya breakdown ──
    # Normalizes wilaya names to handle inconsistent casing
    brutes_wilayas = SiteReseau.objects.values_list('wilaya', flat=True)
    wilayas_distinctes = set(w.strip().upper() for w in brutes_wilayas if w)

    tableau_wilayas = []
    for wilaya_nom in sorted(wilayas_distinctes):
        sites_wilaya = SiteReseau.objects.filter(wilaya__iexact=wilaya_nom)
        total_sites = sites_wilaya.count()
        sites_down = sites_wilaya.filter(statut='DOWN').count()
        sites_up = sites_wilaya.filter(statut='UP').count()
        sites_degrades = sites_wilaya.filter(statut='DEGRADE').count()
        sites_perturbes = sites_wilaya.filter(statut='PERTURBE').count()
        taux_dispo = round((sites_up / total_sites) * 100, 1) if total_sites > 0 else 100.0

        tickets_wilaya = Reclamation.objects.filter(
            **base_date_filter, site__wilaya__iexact=wilaya_nom
        )
        total_tickets_w = tickets_wilaya.count()
        tickets_ouverts_w = tickets_wilaya.filter(statut__iexact='ouvert').count()
        tickets_resolus_w = tickets_wilaya.filter(statut__iexact='resolu').count()
        tickets_critiques_w = tickets_wilaya.filter(priorite__iexact='critique', statut__iexact='ouvert').count()
        taux_res_w = round((tickets_resolus_w / total_tickets_w) * 100, 1) if total_tickets_w > 0 else 0.0

        delai_w_stats = Reclamation.objects.filter(
            **base_date_filter, site__wilaya__iexact=wilaya_nom,
            statut__in=['resolu', 'ferme'], resolu_le__isnull=False,
            resolu_le__gt=F('created_at'),
        ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))
        delai_w_str = _format_duree(delai_w_stats['duree__avg'])

        # Trend indicator: compare first half vs second half of period
        milieu = timezone.now() - timedelta(days=nb_jours // 2)
        tickets_avant = Reclamation.objects.filter(
            **base_date_filter, created_at__lt=milieu, site__wilaya__iexact=wilaya_nom
        ).count()
        tickets_apres = Reclamation.objects.filter(
            created_at__gte=milieu, site__wilaya__iexact=wilaya_nom
        ).count()
        if tickets_apres > tickets_avant * 1.2:
            tendance = "En hausse"
        elif tickets_apres < tickets_avant * 0.8:
            tendance = "En baisse"
        else:
            tendance = "Stable"

        tableau_wilayas.append({
            'wilaya': wilaya_nom,
            'total_sites': total_sites,
            'sites_up': sites_up,
            'sites_down': sites_down,
            'sites_degrades': sites_degrades,
            'sites_perturbes': sites_perturbes,
            'total_tickets': total_tickets_w,
            'tickets_ouverts': tickets_ouverts_w,
            'tickets_resolus': tickets_resolus_w,
            'tickets_critiques': tickets_critiques_w,
            'taux_resolution': f"{taux_res_w}%",
            'delai_moyen_resolution': delai_w_str,
            'taux_disponibilite': f"{taux_dispo}%",
            'tendance': tendance,
            'taux_dispo_num': taux_dispo,
        })
    # Sort by availability (worst first for quick identification)
    tableau_wilayas.sort(key=lambda x: x['taux_dispo_num'])

    # ── Per-commune breakdown (top 15 lowest availability) ──
    brutes_communes = SiteReseau.objects.values_list('commune', flat=True)
    communes_distinctes = set(c.strip().upper() for c in brutes_communes if c)

    tableau_communes = []
    for commune_nom in communes_distinctes:
        sites_commune = SiteReseau.objects.filter(commune__iexact=commune_nom)
        total_sites = sites_commune.count()
        sites_down = sites_commune.filter(statut='DOWN').count()
        sites_up = sites_commune.filter(statut='UP').count()
        taux_dispo = round((sites_up / total_sites) * 100, 1) if total_sites > 0 else 100.0
        tickets_ouverts_c = Reclamation.objects.filter(
            **base_date_filter, site__commune__iexact=commune_nom, statut__iexact='ouvert'
        ).count()

        tableau_communes.append({
            'commune': commune_nom,
            'total_sites': total_sites,
            'sites_down': sites_down,
            'tickets_ouverts': tickets_ouverts_c,
            'taux_disponibilite': f"{taux_dispo}%",
            'taux_dispo_num': taux_dispo,
        })
    tableau_communes.sort(key=lambda x: x['taux_dispo_num'])

    # ── 6-week trend evolution ──
    # Shows open vs resolved tickets per week for trend analysis
    evolution_6_semaines = []
    now = timezone.now()
    for i in range(5, -1, -1):
        debut_semaine = now - timedelta(weeks=i + 1)
        fin_semaine = now - timedelta(weeks=i)
        tickets_semaine = Reclamation.objects.filter(created_at__gte=debut_semaine, created_at__lt=fin_semaine)
        evolution_6_semaines.append({
            'semaine': f"S{6 - i}",
            'ouverts': tickets_semaine.filter(statut__iexact='ouvert').count(),
            'resolus': tickets_semaine.filter(statut__iexact='resolu').count(),
        })

    return Response({
        'periode_jours': nb_jours,
        'kpis': {
            'tickets_ce_mois': total_t,
            'taux_resolution': f"{taux_resolution}%",
            'sites_down_actuels': total_sites_down,
            'delai_moyen_global': delai_moyen_str,
        },
        'priorites_donut': {
            'critique': stats_globales['p_critique'],
            'haute': stats_globales['p_haute'],
            'normale': stats_globales['p_normale'],
            'basse': stats_globales['p_basse'],
        },
        'tableau_complet_wilayas': tableau_wilayas,
        'tableau_communes': tableau_communes,
        'evolution_6_semaines': evolution_6_semaines,
    })


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. LIGHTWEIGHT CARTOGRAPHY ENDPOINT
#
# Returns site data optimized for the map component. Includes
# coordinates and open ticket count for each site marker.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_sites_carto(request):
    """
    Returns all sites with their coordinates and the count of
    open tickets. Used by the Leaflet map component to render
    markers with status-based coloring.
    """
    sites_queryset = SiteReseau.objects.values(
        'id', 'codeSite', 'nom', 'wilaya', 'commune', 'coordX', 'coordY', 'statut'
    )
    liste_finales = []
    for site in sites_queryset:
        # Count open tickets for each site (for badge display on map)
        tickets_comptage = Reclamation.objects.filter(
            site_id=site['id'], statut__iexact='ouvert'
        ).count()
        site['tickets_ouverts'] = tickets_comptage
        liste_finales.append(site)
    return Response(liste_finales)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. AI REPORT VIEWS (Supervisor only)
#
# CRUD operations for AI-generated network analysis reports.
# Reports are generated via Gemini AI with real-time network data.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generer_rapport_ia(request):
    """
    Generates an AI report by sending the user's prompt along with
    current network data to Gemini. Returns HTML content.
    """
    from .rapport_services import generer_rapport_ia as gemini_generate

    prompt = request.data.get('prompt', '').strip()
    if not prompt:
        return Response({'error': 'Le prompt est requis.'}, status=status.HTTP_400_BAD_REQUEST)

    # Optional date range for the report
    date_debut = request.data.get('date_debut')
    date_fin = request.data.get('date_fin')

    from datetime import datetime
    if date_debut:
        date_debut = datetime.strptime(date_debut, '%Y-%m-%d').date()
    if date_fin:
        date_fin = datetime.strptime(date_fin, '%Y-%m-%d').date()

    try:
        contenu = gemini_generate(prompt, date_debut, date_fin)
        # If the service returned an HTML error page, treat it as a generation failure
        if contenu.startswith('<div') and 'Erreur' in contenu and len(contenu) < 500:
            return Response(
                {'error': 'Échec de la génération. Vérifiez la clé API Gemini dans .env et réessayez.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        return Response({'contenu': contenu, 'prompt': prompt})
    except Exception as e:
        return Response(
            {'error': f'Erreur de génération : {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def liste_rapports_ia(request):
    """
    GET: Lists saved reports (admin sees all, others see their own).
    POST: Saves a new report to the database.
    """
    from .serializers import RapportIASerializer

    if request.method == 'GET':
        # Admin and supervisors can see all reports; other roles only see their own. Excludes archived.
        if request.user.role in ('ADMIN', 'SUPERVISEUR'):
            rapports = RapportIA.objects.filter(is_archived=False).select_related('cree_par')
        else:
            rapports = RapportIA.objects.filter(cree_par=request.user, is_archived=False).select_related('cree_par')
        serializer = RapportIASerializer(rapports, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = RapportIASerializer(data=request.data)
        if serializer.is_valid():
            rapport = serializer.save(cree_par=request.user)
            ActivityLog.log('save_rapport', user=request.user, details={'titre': rapport.titre}, ip=_get_ip(request))
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def detail_rapport_ia(request, pk):
    """
    GET: Returns a single report's full content.
    PUT: Updates report title/content (for editing before export).
    DELETE: Archives the report (soft-delete, admin only).
    """
    from .serializers import RapportIASerializer

    try:
        # Admin and supervisors can access any report, others only their own
        if request.user.role in ('ADMIN', 'SUPERVISEUR'):
            rapport = RapportIA.objects.select_related('cree_par').get(pk=pk)
        else:
            rapport = RapportIA.objects.select_related('cree_par').get(pk=pk, cree_par=request.user)
    except RapportIA.DoesNotExist:
        return Response({'error': 'Rapport introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = RapportIASerializer(rapport)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = RapportIASerializer(rapport, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            ActivityLog.log('save_rapport', user=request.user, details={'titre': rapport.titre, 'action': 'modification'}, ip=_get_ip(request))
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        if request.user.role not in ('ADMIN', 'SUPERVISEUR'):
            return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        rapport.is_archived = True
        rapport.archived_at = timezone.now()
        rapport.archived_by = request.user
        rapport.save()
        ActivityLog.log('delete_rapport', user=request.user, details={'titre': rapport.titre}, ip=_get_ip(request))
        return Response({'message': 'Rapport archivé'}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def liste_rapports_archives(request):
    """
    GET: List archived reports (admin only).
    POST: Restore an archived report (admin only).
    """
    from .serializers import RapportIASerializer

    if request.user.role != 'ADMIN':
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        rapports = RapportIA.objects.filter(is_archived=True)
        serializer = RapportIASerializer(rapports, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        rapport_id = request.data.get('id')
        if not rapport_id:
            return Response({'error': 'id requis'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rapport = RapportIA.objects.get(pk=rapport_id, is_archived=True)
        except RapportIA.DoesNotExist:
            return Response({'error': 'Rapport introuvable'}, status=status.HTTP_404_NOT_FOUND)
        rapport.is_archived = False
        rapport.archived_at = None
        rapport.archived_by = None
        rapport.save()
        ActivityLog.log('restore_rapport', user=request.user, details={'titre': rapport.titre}, ip=_get_ip(request))
        return Response({'message': 'Rapport restauré', 'id': rapport.id})


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. ADMIN ARCHIVE VIEW (unified)
#
# Returns archived reclamations, grouped tickets, and AI reports
# in a single endpoint for the admin archives tab.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def consulter_archive(request):
    """
    Unified archive view for admin. Returns all archived items:
    reclamations, grouped tickets, and AI reports.
    """
    if request.user.role != 'ADMIN':
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    reclamations_archived = Reclamation.objects.filter(is_archived=True).select_related('site', 'cree_par', 'client')
    from reclamations.models import GroupeTicket
    groupes_archived = GroupeTicket.objects.filter(is_archived=True).select_related('site', 'cree_par', 'assigne_a')
    rapports_archived = RapportIA.objects.filter(is_archived=True).select_related('cree_par')

    from reclamations.serializers import ReclamationSerializer, GroupeTicketSerializer
    from .serializers import RapportIASerializer

    return Response({
        'reclamations': ReclamationSerializer(reclamations_archived, many=True).data,
        'tickets': GroupeTicketSerializer(groupes_archived, many=True).data,
        'rapports': RapportIASerializer(rapports_archived, many=True).data,
    })


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. USER PERFORMANCE (supervisor)
#
# Returns detailed performance stats for a specific user.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def consulter_performance(request, code_user):
    """
    Returns detailed performance stats for a specific user.
    Available to supervisors and admins.
    """
    if request.user.role not in ('ADMIN', 'SUPERVISEUR'):
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = CustomUser.objects.get(code_user=code_user)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)

    jours_param = request.query_params.get('jours', '30')
    try:
        nb_jours = int(jours_param)
    except ValueError:
        nb_jours = 30
    date_limite = timezone.now() - timedelta(days=nb_jours)

    total_assignes = Reclamation.objects.filter(assigne_a=user, **base_date_filter).count()
    resolus = Reclamation.objects.filter(assigne_a=user, statut='resolu', **base_date_filter).count()
    ouverts = Reclamation.objects.filter(assigne_a=user, statut='ouvert', **base_date_filter).count()
    fermes = Reclamation.objects.filter(assigne_a=user, statut='ferme', **base_date_filter).count()

    delai_stats = Reclamation.objects.filter(
        assigne_a=user, statut__in=['resolu', 'ferme'],
        resolu_le__isnull=False, resolu_le__gt=F('created_at'),
        **base_date_filter,
    ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))

    creees = Reclamation.objects.filter(cree_par=user, **base_date_filter).count()

    from reclamations.models import GroupeTicket
    tickets_assignes = GroupeTicket.objects.filter(assigne_a=user, **base_date_filter).count()
    tickets_resolus = GroupeTicket.objects.filter(assigne_a=user, statut='resolu', **base_date_filter).count()

    return Response({
        'utilisateur': UserSerializer(user).data,
        'periode_jours': nb_jours,
        'reclamations': {
            'total_assignes': total_assignes,
            'resolus': resolus,
            'ouverts': ouverts,
            'fermes': fermes,
            'taux_resolution': round((resolus / total_assignes) * 100, 1) if total_assignes > 0 else 0,
            'delai_moyen': _format_duree(delai_stats['duree__avg']),
        },
        'tickets_groupes': {
            'total_assignes': tickets_assignes,
            'resolus': tickets_resolus,
            'taux_resolution': round((tickets_resolus / tickets_assignes) * 100, 1) if tickets_assignes > 0 else 0,
        },
        'creees': creees,
    })


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SYSTEM INFO (Admin-only)
#
# Returns server, database, and application info for the admin dashboard.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_info(request):
    if request.user.role != 'ADMIN':
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_database_size(current_database())")
        db_size_bytes = cursor.fetchone()[0]
        cursor.execute("SELECT pg_size_pretty(pg_database_size(current_database()))")
        db_size_pretty = cursor.fetchone()[0]

    tables = {}
    for model in [Reclamation, GroupeTicket, SiteReseau, CustomUser, RapportIA]:
        tables[model._meta.label_lower] = model.objects.count()

    return Response({
        'serveur': {
            'django_version': platform.python_version(),
            'python_version': sys.version.split()[0],
            'os': f"{os.name} / {platform.system()} {platform.release()}",
            'base_de_donnees': connection.vendor,
            'nom_db': connection.settings_dict.get('NAME', 'N/A'),
            'taille_db': db_size_pretty,
            'taille_db_bytes': db_size_bytes,
        },
        'enregistrements': tables,
    })
