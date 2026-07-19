# reclamations/views.py
# ─────────────────────────────────────────────────────────────
# API views for complaint ticket management. Handles listing,
# creation, updates, archiving, and comments on reclamation tickets.
# Also handles GroupeTicket operations: listing, detail, updates,
# resolution, and assignment with cascade to child reclamations.
# ─────────────────────────────────────────────────────────────
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from django.utils import timezone as tz
from .models import Reclamation, GroupeTicket
from .serializers import (
    ReclamationSerializer, CommentaireSerializer,
    GroupeTicketSerializer,
)
from .services import trouver_ou_creer_groupe
from accounts.models import Role
from accounts.permissions import IsAgentOrAdmin, IsAdminEngineerOrSupervisor
from keywords_config import get_all_keywords, calculer_score
from audit_log.models import ActivityLog


def _get_ip(request):
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
    return ip or request.META.get('REMOTE_ADDR', '')

STATUTS_VALIDES = {'ouvert', 'resolu', 'ferme'}
ALIAS_NON_TRAITE = {'non-traité', 'non-traite', 'non-traites', 'nouveau'}
ALIAS_TRAITE = {'traité', 'traite', 'traites', 'résolu', 'resolu', 'fermé', 'ferme'}


def _statuts_depuis_param(statut_filter):
    tokens = [t.strip().lower() for t in statut_filter.split(',') if t.strip()]
    statuts = set()
    for token in tokens:
        if token in STATUTS_VALIDES:
            statuts.add(token)
        elif token in ALIAS_NON_TRAITE:
            statuts.update({'ouvert'})
        elif token in ALIAS_TRAITE:
            statuts.update({'resolu', 'ferme'})
    return statuts


# ── Reclamation endpoints ───────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_reclamations(request):
    statut_filter = request.query_params.get('statut')
    archived_filter = request.query_params.get('archived', '').lower()
    priorite_filter = request.query_params.get('priorite')
    client_filter = request.query_params.get('client')
    mots_cles_filter = request.query_params.get('mots_cles')
    site_filter = request.query_params.get('site_id')
    date_debut = request.query_params.get('date_debut')
    date_fin = request.query_params.get('date_fin')

    reclamations = Reclamation.objects.select_related('site', 'cree_par', 'assigne_a', 'groupe', 'client').all()

    if archived_filter == 'true':
        reclamations = reclamations.filter(is_archived=True)
    elif archived_filter != 'all':
        reclamations = reclamations.filter(is_archived=False)

    if statut_filter:
        statuts = _statuts_depuis_param(statut_filter)
        if statuts:
            reclamations = reclamations.filter(statut__in=statuts)
        else:
            reclamations = reclamations.filter(statut__iexact=statut_filter.strip().lower())

    if priorite_filter:
        reclamations = reclamations.filter(priorite__iexact=priorite_filter.strip().lower())

    if client_filter:
        reclamations = reclamations.filter(
            Q(nom_client__icontains=client_filter) |
            Q(telephone_client__icontains=client_filter) |
            Q(client__nom__icontains=client_filter) |
            Q(client__prenom__icontains=client_filter) |
            Q(client__numero__icontains=client_filter)
        )

    if mots_cles_filter:
        reclamations = reclamations.filter(mots_cles_ia__icontains=mots_cles_filter)

    if site_filter:
        reclamations = reclamations.filter(site_id=site_filter)

    if date_debut:
        reclamations = reclamations.filter(created_at__date__gte=date_debut)
    if date_fin:
        reclamations = reclamations.filter(created_at__date__lte=date_fin)

    serializer = ReclamationSerializer(reclamations, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAgentOrAdmin])
def creer_reclamation(request):
    serializer = ReclamationSerializer(data=request.data)
    if serializer.is_valid():
        reclamation = serializer.save(cree_par=request.user)
        try:
            trouver_ou_creer_groupe(reclamation)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Erreur regroupement: %s", e)
        reclamation.refresh_from_db()
        ActivityLog.log('create_ticket', user=request.user, details={'numero': reclamation.numero_ticket or f'R{reclamation.pk}', 'client': reclamation.nom_client or ''}, ip=_get_ip(request))
        return Response(ReclamationSerializer(reclamation).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def detail_reclamation(request, pk):
    try:
        reclamation = Reclamation.objects.select_related('groupe', 'client').get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ReclamationSerializer(reclamation)
        return Response(serializer.data)

    if request.method == 'PUT':
        if request.user.role not in [Role.ADMIN, Role.AGENT_CALL_CENTER, Role.INGENIEUR_RESEAUX, Role.SUPERVISEUR]:
            return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

        old_statut = reclamation.statut
        serializer = ReclamationSerializer(reclamation, data=request.data, partial=True)
        if serializer.is_valid():
            reclamation = serializer.save()

            if reclamation.statut == 'ferme' and reclamation.assigne_a:
                reclamation.assigne_a = None
                reclamation.save()

            if (old_statut == 'ferme' and reclamation.statut == 'ouvert'
                    and not reclamation.assigne_a):
                reclamation.assigne_a = request.user
                reclamation.save()

            ActivityLog.log('update_ticket', user=request.user, details={'numero': reclamation.numero_ticket or f'R{reclamation.pk}', 'champs': list(request.data.keys())}, ip=_get_ip(request))
            return Response(ReclamationSerializer(reclamation).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminEngineerOrSupervisor])
def ajouter_commentaire(request, pk):
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CommentaireSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(reclamation=reclamation, auteur=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def archiver_reclamation(request, pk):
    if request.user.role != Role.ADMIN:
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)
    reclamation.is_archived = True
    reclamation.archived_at = timezone.now()
    reclamation.archived_by = request.user
    reclamation.save()
    ActivityLog.log('archive_ticket', user=request.user, details={'numero': reclamation.numero_ticket or f'R{reclamation.pk}'}, ip=_get_ip(request))
    return Response({'message': 'Ticket archivé', 'id': pk})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def desarchiver_reclamation(request, pk):
    if request.user.role != Role.ADMIN:
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)
    reclamation.is_archived = False
    reclamation.archived_at = None
    reclamation.archived_by = None
    reclamation.save()
    ActivityLog.log('restore_ticket', user=request.user, details={'numero': reclamation.numero_ticket or f'R{reclamation.pk}'}, ip=_get_ip(request))
    return Response({'message': 'Ticket désarchivé', 'id': pk})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_keywords(request):
    return Response(get_all_keywords())


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preview_priorite(request):
    mots_cles = request.data.get('mots_cles', '')
    score = calculer_score(mots_cles)
    from keywords_config import calculer_priorite
    priorite = calculer_priorite(mots_cles)
    return Response({'score': score, 'priorite': priorite})


# ── GroupeTicket endpoints ──────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_groupe_tickets(request):
    statut_filter = request.query_params.get('statut')
    site_filter = request.query_params.get('site_id')
    search = request.query_params.get('search', '').strip()
    archived_filter = request.query_params.get('archived', '').lower()
    priorite_filter = request.query_params.get('priorite')
    assigne_filter = request.query_params.get('assigne_a_id')
    date_debut = request.query_params.get('date_debut')
    date_fin = request.query_params.get('date_fin')

    groupes = GroupeTicket.objects.select_related('site', 'cree_par', 'assigne_a').prefetch_related('reclamations').all()

    if archived_filter == 'true':
        groupes = groupes.filter(is_archived=True)
    elif archived_filter != 'all':
        groupes = groupes.filter(is_archived=False)

    if statut_filter:
        tokens = [t.strip().lower() for t in statut_filter.split(',') if t.strip()]
        statuts = set()
        for token in tokens:
            if token in ('ouvert', 'resolu', 'ferme'):
                statuts.add(token)
            elif token in ALIAS_NON_TRAITE:
                statuts.update({'ouvert'})
            elif token in ALIAS_TRAITE:
                statuts.update({'resolu', 'ferme'})
        if statuts:
            groupes = groupes.filter(statut__in=statuts)

    if site_filter:
        groupes = groupes.filter(site_id=site_filter)

    if priorite_filter:
        groupes = groupes.filter(priorite__iexact=priorite_filter.strip().lower())

    if assigne_filter:
        groupes = groupes.filter(assigne_a_id=assigne_filter)

    if date_debut:
        groupes = groupes.filter(created_at__date__gte=date_debut)
    if date_fin:
        groupes = groupes.filter(created_at__date__lte=date_fin)

    if search:
        groupes = groupes.filter(
            Q(titre__icontains=search) |
            Q(numero_ticket__icontains=search) |
            Q(mots_cles__icontains=search) |
            Q(site__nom__icontains=search) |
            Q(site__codeSite__icontains=search)
        )

    serializer = GroupeTicketSerializer(groupes, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_groupe_tickets(request):
    now = timezone.now()
    ouverts = GroupeTicket.objects.filter(statut='ouvert', is_archived=False).count()
    total = GroupeTicket.objects.filter(is_archived=False).count()
    resolus = GroupeTicket.objects.filter(statut='resolu', is_archived=False).count()
    fermes = GroupeTicket.objects.filter(statut='ferme', is_archived=False).count()

    top_site = (
        GroupeTicket.objects.filter(is_archived=False)
        .values('site__nom', 'site__codeSite')
        .annotate(nb=Count('id'))
        .order_by('-nb')
        .first()
    )

    reclamations_total = Reclamation.objects.filter(is_archived=False).count()

    return Response({
        'tickets_ouverts': ouverts,
        'tickets_total': total,
        'tickets_resolus': resolus,
        'tickets_fermes': fermes,
        'reclamations_total': reclamations_total,
        'top_site': top_site,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detail_groupe_ticket(request, pk):
    try:
        groupe = GroupeTicket.objects.select_related('site', 'cree_par', 'assigne_a').prefetch_related('reclamations').get(pk=pk)
    except GroupeTicket.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    serializer = GroupeTicketSerializer(groupe)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def modifier_groupe_ticket(request, pk):
    try:
        groupe = GroupeTicket.objects.get(pk=pk)
    except GroupeTicket.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.user.role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX, Role.SUPERVISEUR]:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

    old_statut = groupe.statut
    serializer = GroupeTicketSerializer(groupe, data=request.data, partial=True)
    if serializer.is_valid():
        groupe = serializer.save()

        new_statut = groupe.statut
        if new_statut in ('resolu', 'ferme') and old_statut not in ('resolu', 'ferme'):
            Reclamation.objects.filter(groupe=groupe).update(statut=new_statut)
            if new_statut == 'ferme':
                groupe.assigne_a = None
                groupe.save()

        if old_statut == 'ferme' and new_statut == 'ouvert' and not groupe.assigne_a:
            groupe.assigne_a = request.user
            groupe.save()
            Reclamation.objects.filter(groupe=groupe).update(assigne_a=request.user)

        ActivityLog.log('update_ticket', user=request.user, details={'numero': groupe.numero_ticket, 'champs': list(request.data.keys())}, ip=_get_ip(request))
        return Response(GroupeTicketSerializer(groupe).data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resoudre_groupe_ticket(request, pk):
    try:
        groupe = GroupeTicket.objects.get(pk=pk)
    except GroupeTicket.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.user.role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX, Role.SUPERVISEUR]:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

    groupe.statut = 'resolu'
    groupe.resolu_le = timezone.now()
    groupe.save()

    Reclamation.objects.filter(groupe=groupe).update(statut='resolu')

    ActivityLog.log('resolve_ticket', user=request.user, details={'numero': groupe.numero_ticket}, ip=_get_ip(request))
    return Response(GroupeTicketSerializer(groupe).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assigner_groupe_ticket(request, pk):
    try:
        groupe = GroupeTicket.objects.get(pk=pk)
    except GroupeTicket.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.user.role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX, Role.SUPERVISEUR]:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

    was_closed = groupe.statut in ('ferme', 'resolu')

    groupe.assigne_a = request.user
    if was_closed:
        groupe.statut = 'ouvert'
        groupe.resolu_le = None
    groupe.save()

    rec_update = {'assigne_a': request.user}
    if was_closed:
        rec_update['statut'] = 'ouvert'
        rec_update['resolu_le'] = None
    Reclamation.objects.filter(groupe=groupe).update(**rec_update)

    ActivityLog.log('assign_ticket', user=request.user, details={'numero': groupe.numero_ticket, 'a': request.user.code_user}, ip=_get_ip(request))
    return Response(GroupeTicketSerializer(groupe).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def archiver_groupe_ticket(request, pk):
    if request.user.role != Role.ADMIN:
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        groupe = GroupeTicket.objects.get(pk=pk)
    except GroupeTicket.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    groupe.is_archived = True
    groupe.archived_at = timezone.now()
    groupe.archived_by = request.user
    groupe.save()

    now = timezone.now()
    Reclamation.objects.filter(groupe=groupe, is_archived=False).update(
        is_archived=True,
        archived_at=now,
    )

    ActivityLog.log('archive_ticket', user=request.user, details={'numero': groupe.numero_ticket, 'type': 'groupe'}, ip=_get_ip(request))
    return Response({'message': 'Ticket groupé archivé', 'id': pk})
