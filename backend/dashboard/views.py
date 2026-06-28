from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q, Avg, F, Value, CharField
from django.db.models.functions import TruncDay, ExtractWeekDay
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from reclamations.models import Reclamation
from sites_reseau.models import SiteReseau
from accounts.models import CustomUser, Role
from .models import RapportIA

JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

def _format_duree(duree):
    if not duree:
        return "N/A"
    total_seconds = int(duree.total_seconds())
    heures = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    return f"{heures}h {minutes}m"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. VUE TABLEAU DE BORD GÉNÉRAL (ADMIN / CALL CENTER / SUPERVISEUR)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['GET'])
def statistiques(request):
    jours_param = request.query_params.get('jours', '30')
    try:
        nb_jours = int(jours_param)
    except ValueError:
        nb_jours = 30

    date_limite = timezone.now() - timedelta(days=nb_jours)

    # ── Stats Sites ──
    stats_sites = SiteReseau.objects.aggregate(
        total=Count('id'),
        up=Count('id', filter=Q(statut='UP')),
        down=Count('id', filter=Q(statut='DOWN')),
        degrade=Count('id', filter=Q(statut='DEGRADE')),
        perturbe=Count('id', filter=Q(statut='PERTURBE')),
    )
    total_s = stats_sites['total']
    sites_up = stats_sites['up']
    disponibilite = round((sites_up / total_s) * 100, 1) if total_s > 0 else 100.0

    # ── Stats Tickets (période filtrée) ──
    stats_tickets = Reclamation.objects.filter(created_at__gte=date_limite).aggregate(
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
    taux_resolution = round((resolus_t / total_t) * 100, 1) if total_t > 0 else 0.0

    # ── Délai moyen de résolution ──
    delai_stats = Reclamation.objects.filter(
        created_at__gte=date_limite, statut='resolu', resolu_le__isnull=False
    ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))
    delai_moyen_str = _format_duree(delai_stats['duree__avg'])

    # ── Délai moyen par priorité ──
    delai_par_prio = {}
    for prio in ['critique', 'haute', 'normale', 'basse']:
        d = Reclamation.objects.filter(
            created_at__gte=date_limite, statut='resolu', resolu_le__isnull=False,
            priorite__iexact=prio,
        ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))
        delai_par_prio[prio] = _format_duree(d['duree__avg'])

    # ── Tickets par jour de la semaine ──
    tickets_par_jour = (
        Reclamation.objects.filter(created_at__gte=date_limite)
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

    # ── Répartition par type de client ──
    tickets_par_type = [
        {'type': 'Particulier', 'total': stats_tickets['type_particulier']},
        {'type': 'Entreprise', 'total': stats_tickets['type_entreprise']},
    ]

    # ── Top sites impactés ──
    top_sites_impactes = (
        SiteReseau.objects.annotate(
            num_reclamations=Count('reclamations', filter=Q(reclamations__created_at__gte=date_limite))
        )
        .order_by('-num_reclamations')[:7]
        .values('id', 'codeSite', 'nom', 'num_reclamations')
    )

    # ── Évolution temporelle ──
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

    # Résolutions par jour
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

    # ── Stats par employé (ingénieurs) ──
    stats_employes = []
    ingenieurs = CustomUser.objects.filter(role=Role.INGENIEUR_RESEAUX, is_active=True)
    for ing in ingenieurs:
        total_assignes = Reclamation.objects.filter(assigne_a=ing, created_at__gte=date_limite).count()
        resolus = Reclamation.objects.filter(assigne_a=ing, statut='resolu', created_at__gte=date_limite).count()
        ouverts = Reclamation.objects.filter(assigne_a=ing, statut='ouvert', created_at__gte=date_limite).count()
        delai_ing = Reclamation.objects.filter(
            assigne_a=ing, statut='resolu', resolu_le__isnull=False, created_at__gte=date_limite
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

        # ── Stats par agent Call Center ──
        'stats_agents_cc': [{
            'code': a.code_user,
            'nom': a.get_full_name().strip() or a.code_user,
            'email': a.email,
            'tickets_crees': Reclamation.objects.filter(cree_par=a, created_at__gte=date_limite).count(),
            'ouverts': Reclamation.objects.filter(cree_par=a, statut='ouvert', created_at__gte=date_limite).count(),
            'resolus': Reclamation.objects.filter(cree_par=a, statut='resolu', created_at__gte=date_limite).count(),
            'fermes': Reclamation.objects.filter(cree_par=a, statut='ferme', created_at__gte=date_limite).count(),
        } for a in CustomUser.objects.filter(role=Role.AGENT_CALL_CENTER, is_active=True).order_by('code_user')],
    })


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. VUE REPORTING ANALYTIQUE (WILAYAS + COMMUNES)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['GET'])
def stats_reporting(request):
    jours_param = request.query_params.get('jours', '30')
    try:
        nb_jours = int(jours_param)
    except ValueError:
        nb_jours = 30
    date_limite = timezone.now() - timedelta(days=nb_jours)

    # ── KPIs Globaux ──
    stats_globales = Reclamation.objects.filter(created_at__gte=date_limite).aggregate(
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
        created_at__gte=date_limite, statut='resolu', resolu_le__isnull=False
    ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))
    delai_moyen_str = _format_duree(delai_stats['duree__avg'])

    total_sites_down = SiteReseau.objects.filter(statut='DOWN').count()

    # ── Stats par Wilaya ──
    brutes_wilayas = SiteReseau.objects.values_list('wilaya', flat=True)
    wilayas_distinctes = set(w.strip().upper() for w in brutes_wilayas if w)

    tableau_wilayas = []
    for wilaya_nom in sorted(wilayas_distinctes):
        sites_wilaya = SiteReseau.objects.filter(wilaya__iexact=wilaya_nom)
        total_sites = sites_wilaya.count()
        sites_down = sites_wilaya.filter(statut='DOWN').count()
        sites_up = sites_wilaya.filter(statut='UP').count()
        taux_dispo = round((sites_up / total_sites) * 100, 1) if total_sites > 0 else 100.0
        tickets_ouverts_wilaya = Reclamation.objects.filter(
            created_at__gte=date_limite, site__wilaya__iexact=wilaya_nom, statut__iexact='ouvert'
        ).count()

        delai_w_stats = Reclamation.objects.filter(
            created_at__gte=date_limite, site__wilaya__iexact=wilaya_nom,
            statut='resolu', resolu_le__isnull=False
        ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))
        delai_w_str = _format_duree(delai_w_stats['duree__avg'])

        tendance = "Stable"
        if taux_dispo < 95.0:
            tendance = "En baisse"
        elif taux_dispo >= 98.0:
            tendance = "En hausse"

        tableau_wilayas.append({
            'wilaya': wilaya_nom,
            'total_sites': total_sites,
            'sites_down': sites_down,
            'tickets_ouverts': tickets_ouverts_wilaya,
            'delai_moyen_resolution': delai_w_str,
            'taux_disponibilite': f"{taux_dispo}%",
            'tendance': tendance,
            'taux_dispo_num': taux_dispo,
        })
    tableau_wilayas.sort(key=lambda x: x['taux_dispo_num'])

    # ── Stats par Commune (top 15) ──
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
            created_at__gte=date_limite, site__commune__iexact=commune_nom, statut__iexact='ouvert'
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

    # ── Évolution 6 semaines ──
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
# 3. VUE CARTOGRAPHIE LÉGÈRE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['GET'])
def liste_sites_carto(request):
    sites_queryset = SiteReseau.objects.values(
        'id', 'codeSite', 'nom', 'wilaya', 'commune', 'coordX', 'coordY', 'statut'
    )
    liste_finales = []
    for site in sites_queryset:
        tickets_comptage = Reclamation.objects.filter(
            site_id=site['id'], statut__iexact='ouvert'
        ).count()
        site['tickets_ouverts'] = tickets_comptage
        liste_finales.append(site)
    return Response(liste_finales)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. VUES RAPPORT IA (Superviseur)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generer_rapport_ia(request):
    """Génère un rapport via Gemini avec les données actuelles du réseau."""
    from .rapport_services import generer_rapport_ia as gemini_generate

    prompt = request.data.get('prompt', '').strip()
    if not prompt:
        return Response({'error': 'Le prompt est requis.'}, status=status.HTTP_400_BAD_REQUEST)

    date_debut = request.data.get('date_debut')
    date_fin = request.data.get('date_fin')

    from datetime import datetime
    if date_debut:
        date_debut = datetime.strptime(date_debut, '%Y-%m-%d').date()
    if date_fin:
        date_fin = datetime.strptime(date_fin, '%Y-%m-%d').date()

    try:
        contenu = gemini_generate(prompt, date_debut, date_fin)
        return Response({'contenu': contenu, 'prompt': prompt})
    except Exception as e:
        return Response(
            {'error': f'Erreur de génération : {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def liste_rapports_ia(request):
    """GET : liste des rapports sauvegardés. POST : sauvegarde un rapport."""
    from .serializers import RapportIASerializer

    if request.method == 'GET':
        if request.user.role == 'ADMIN':
            rapports = RapportIA.objects.all()
        else:
            rapports = RapportIA.objects.filter(cree_par=request.user)
        serializer = RapportIASerializer(rapports, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = RapportIASerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(cree_par=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def detail_rapport_ia(request, pk):
    """GET/PUT/DELETE d'un rapport spécifique."""
    from .serializers import RapportIASerializer

    try:
        if request.user.role == 'ADMIN':
            rapport = RapportIA.objects.get(pk=pk)
        else:
            rapport = RapportIA.objects.get(pk=pk, cree_par=request.user)
    except RapportIA.DoesNotExist:
        return Response({'error': 'Rapport introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = RapportIASerializer(rapport)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = RapportIASerializer(rapport, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        rapport.delete()
        return Response({'message': 'Rapport supprimé'}, status=status.HTTP_204_NO_CONTENT)
