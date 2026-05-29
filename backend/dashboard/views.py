from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q, Avg, F
from django.db.models.functions import TruncDay
from django.utils import timezone
from datetime import timedelta

# Importation des modèles depuis tes applications métiers
from reclamations.models import Reclamation
from sites_reseau.models import SiteReseau


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. VUE TABLEAU DE BORD GÉNÉRAL (ADMIN / CALL CENTER)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
def statistiques(request):
    """
    Vue générale du Dashboard (KPIs globaux, courbe d'évolution et Donut 4 priorités).
    Optimisée à 100% avec des aggregations conditionnelles.
    """
    jours_param = request.query_params.get('jours', '30')
    try:
        nb_jours = int(jours_param)
    except ValueError:
        nb_jours = 30
        
    date_limite = timezone.now() - timedelta(days=nb_jours)

    # Passage SQL unique pour les sites
    stats_sites = SiteReseau.objects.aggregate(
        total=Count('id'),
        up=Count('id', filter=Q(statut='UP')),
        down=Count('id', filter=Q(statut='DOWN')),
        degrade=Count('id', filter=Q(statut='DEGRADE')),
        perturbe=Count('id', filter=Q(statut='PERTURBE'))
    )

    total_s = stats_sites['total']
    sites_up = stats_sites['up']
    disponibilite = round((sites_up / total_s) * 100, 1) if total_s > 0 else 100.0

    # Passage SQL unique pour les tickets (avec insensibilité à la casse)
    stats_tickets = Reclamation.objects.filter(created_at__gte=date_limite).aggregate(
        total=Count('id'),
        ouverts=Count('id', filter=Q(statut__iexact='ouvert')),
        en_cours=Count('id', filter=Q(statut__iexact='en_cours')),
        resolus=Count('id', filter=Q(statut__iexact='resolu')),
        ouverts_critiques=Count('id', filter=Q(statut__iexact='ouvert', priorite__iexact='critique')),
        p_critique=Count('id', filter=Q(priorite__iexact='critique')),
        p_haute=Count('id', filter=Q(priorite__iexact='haute')),
        p_normale=Count('id', filter=Q(priorite__iexact='normale')),
        p_basse=Count('id', filter=Q(priorite__iexact='basse'))
    )

    total_t = stats_tickets['total']
    resolus_t = stats_tickets['resolus']
    taux_resolution = round((resolus_t / total_t) * 100, 1) if total_t > 0 else 0.0

    # Délai moyen de résolution
    delai_stats = Reclamation.objects.filter(
        created_at__gte=date_limite, 
        statut='resolu', 
        resolu_le__isnull=False
    ).annotate(
        duree=F('resolu_le') - F('created_at')
    ).aggregate(duree_moyenne=Avg('duree'))

    duree_moy = delai_stats['duree_moyenne']
    delai_moyen_str = "N/A"
    if duree_moy:
        total_seconds = int(duree_moy.total_seconds())
        heures = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        delai_moyen_str = f"{heures}h {minutes}m"

    # Top 5 sites impactés
    top_sites_impactes = (
        SiteReseau.objects.annotate(
            num_reclamations=Count('reclamations', filter=Q(reclamations__created_at__gte=date_limite))
        ) 
        .order_by('-num_reclamations')[:5]
        .values('id', 'codeSite', 'nom', 'num_reclamations')
    )

    # Évolution temporelle
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

    return Response({
        'periode_filtree_en_jours': nb_jours,
        'reseau_global': {
            'total_sites': total_s,
            'sites_up': stats_sites['up'],
            'sites_down': stats_sites['down'],
            'sites_degrades': stats_sites['degrade'],
            'sites_perturbes': stats_sites['perturbe'],
            'disponibilite_globale': f"{disponibilite}%"
        },
        'tickets': {
            'total': total_t,
            'ouverts': stats_tickets['ouverts'],
            'en_cours': stats_tickets['en_cours'],
            'resolus': resolus_t,
            'ouverts_critiques': stats_tickets['ouverts_critiques'],
            'taux_resolution': f"{taux_resolution}%",
            'delai_moyen_resolution': delai_moyen_str
        },
        'graphiques': {
            'repartition_priorite_donut': {
                'critique': stats_tickets['p_critique'],
                'haute': stats_tickets['p_haute'],
                'normale': stats_tickets['p_normale'],
                'basse': stats_tickets['p_basse']
            },
            'top_sites_impactes': list(top_sites_impactes),
            'evolution_tickets': evolution_tickets
        }
    })


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. VUE SPÉCIFIQUE AU RÔLE RESPONSABLE REPORTING (WILAYAS & PERF)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
def stats_reporting(request):
    """
    Vue dédiée 100% au rôle Responsable Reporting.
    Génère l'analyse détaillée par Wilaya requise par les maquettes d'Amel.
    """
    jours_param = request.query_params.get('jours', '30')
    try:
        nb_jours = int(jours_param)
    except ValueError:
        nb_jours = 30
    date_limite = timezone.now() - timedelta(days=nb_jours)

    # KPIs Globaux du haut pour le Reporting
    stats_globales = Reclamation.objects.filter(created_at__gte=date_limite).aggregate(
        total_tickets=Count('id'),
        resolus=Count('id', filter=Q(statut__iexact='resolu')),
        p_critique=Count('id', filter=Q(priorite__iexact='critique')),
        p_haute=Count('id', filter=Q(priorite__iexact='haute')),
        p_normale=Count('id', filter=Q(priorite__iexact='normale')),
        p_basse=Count('id', filter=Q(priorite__iexact='basse'))
    )

    total_t = stats_globales['total_tickets']
    resolus_t = stats_globales['resolus']
    taux_resolution = round((resolus_t / total_t) * 100, 1) if total_t > 0 else 0.0

    delai_stats = Reclamation.objects.filter(
        created_at__gte=date_limite, 
        statut='resolu', 
        resolu_le__isnull=False
    ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))

    duree_moy = delai_stats['duree__avg']
    delai_moyen_str = "N/A"
    if duree_moy:
        total_seconds = int(duree_moy.total_seconds())
        heures = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        delai_moyen_str = f"{heures}h {minutes}m"

    total_sites_down = SiteReseau.objects.filter(statut='DOWN').count()

    # CALCUL PAR WILAYA AUTOMATIQUE (Version corrigée sans répétitions)
    brutes_wilayas = SiteReseau.objects.values_list('wilaya', flat=True)
    wilayas_distinctes = set(w.strip().upper() for w in brutes_wilayas if w)
    
    tableau_wilayas = []
    for wilaya_nom in wilayas_distinctes:
        sites_wilaya = SiteReseau.objects.filter(wilaya__iexact=wilaya_nom)
        total_sites = sites_wilaya.count()
        sites_down = sites_wilaya.filter(statut='DOWN').count()
        sites_up = sites_wilaya.filter(statut='UP').count()

        taux_dispo = round((sites_up / total_sites) * 100, 1) if total_sites > 0 else 100.0

        tickets_ouverts_wilaya = Reclamation.objects.filter(
            created_at__gte=date_limite,
            site__wilaya__iexact=wilaya_nom,
            statut__iexact='ouvert'
        ).count()

        delai_wilaya_stats = Reclamation.objects.filter(
            created_at__gte=date_limite,
            site__wilaya__iexact=wilaya_nom,
            statut='resolu',
            resolu_le__isnull=False
        ).annotate(duree=F('resolu_le') - F('created_at')).aggregate(Avg('duree'))

        duree_w = delai_wilaya_stats['duree__avg']
        delai_w_str = "0h 0m"
        if duree_w:
            sec_w = int(duree_w.total_seconds())
            delai_w_str = f"{sec_w // 3600}h {(sec_w % 3600) // 60}m"

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
            'taux_dispo_num': taux_dispo
        })

    # Tri : Wilayas en crise en premier (disponibilité la plus basse)
    tableau_wilayas = sorted(tableau_wilayas, key=lambda x: x['taux_dispo_num'])

    # Suivi sur 6 semaines glissantes
    evolution_6_semaines = []
    now = timezone.now()
    for i in range(5, -1, -1):
        debut_semaine = now - timedelta(weeks=i+1)
        fin_semaine = now - timedelta(weeks=i)
        tickets_semaine = Reclamation.objects.filter(created_at__gte=debut_semaine, created_at__lt=fin_semaine)
        evolution_6_semaines.append({
            'semaine': f"Semaine {6-i}",
            'ouverts': tickets_semaine.filter(statut__iexact='ouvert').count(),
            'resolus': tickets_semaine.filter(statut__iexact='resolu').count()
        })

    return Response({
        'periode_jours': nb_jours,
        'kpis': {
            'tickets_ce_mois': total_t,
            'taux_resolution': f"{taux_resolution}%",
            'sites_down_actuels': total_sites_down,
            'delai_moyen_global': delai_moyen_str
        },
        'priorites_donut': {
            'critique': stats_globales['p_critique'],
            'haute': stats_globales['p_haute'],
            'normale': stats_globales['p_normale'],
            'basse': stats_globales['p_basse']
        },
        'tableau_complet_wilayas': tableau_wilayas,
        'evolution_6_semaines': evolution_6_semaines
    })


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. VUE COMMUNE : ENDPOINT ALLÉGÉ POUR LA CARTOGRAPHIE (MINI ET GRANDE CARTE)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
def liste_sites_carto(request):
    """
    Endpoint ultra-léger pour la cartographie.
    Renvoie tous les sites avec leur position exacte (coordX, coordY), leur statut et le nombre de pannes en cours.
    """
    # Extraction en utilisant les vrais champs de ton modèle SiteReseau
    sites_queryset = SiteReseau.objects.values(
        'id', 'codeSite', 'nom', 'wilaya', 'coordX', 'coordY', 'statut'
    )
    
    liste_finales = []
    
    # Comptage des tickets ouverts par site calculé proprement
    for site in sites_queryset:
        tickets_comptage = Reclamation.objects.filter(
            site_id=site['id'], 
            statut__iexact='ouvert'
        ).count()
        
        # Injection du résultat dans le dictionnaire
        site['tickets_ouverts'] = tickets_comptage
        liste_finales.append(site)

    return Response(liste_finales)