# reclamations/views.py
# ─────────────────────────────────────────────────────────────
# API views for complaint ticket management. Handles listing,
# creation, updates, archiving, and comments on reclamation tickets.
# Supports flexible status filtering with aliases for the frontend.
# ─────────────────────────────────────────────────────────────
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .models import Reclamation
from .serializers import ReclamationSerializer, CommentaireSerializer
from accounts.models import Role

# Valid status values that match the database choices
STATUTS_VALIDES = {'ouvert', 'resolu', 'ferme'}

# Friendly aliases so the frontend can filter by concept, not exact value
ALIAS_NON_TRAITE = {'non-traité', 'non-traite', 'non-traites', 'nouveau', 'en_cours', 'en cours'}
ALIAS_TRAITE = {'traité', 'traite', 'traites', 'résolu', 'resolu', 'fermé', 'ferme'}


def _statuts_depuis_param(statut_filter):
    """
    Parses status filter string from query params.
    Handles both exact values ('ouvert,resolu') and aliases
    ('non-traites' -> 'ouvert', 'traites' -> 'resolu,ferme').
    """
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


@api_view(['GET'])
@permission_classes([AllowAny])
def liste_reclamations(request):
    """
    Lists all reclamation tickets with optional status filtering.
    Excludes archived tickets by default. Use ?archived=true to see only archived.
    """
    statut_filter = request.query_params.get('statut')
    archived_filter = request.query_params.get('archived', '').lower()

    reclamations = Reclamation.objects.select_related('site', 'cree_par', 'assigne_a').all()

    # Filter by archive status
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

    serializer = ReclamationSerializer(reclamations, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def creer_reclamation(request):
    """
    Creates a new complaint ticket. Only admin and call center agents
    can create tickets. The AI description is auto-generated on save.
    """
    if request.user and request.user.is_authenticated:
        role = request.user.role.upper() if request.user.role else ''
        if role not in [Role.ADMIN, Role.AGENT_CALL_CENTER]:
            return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = ReclamationSerializer(data=request.data)
    if serializer.is_valid():
        if request.user and request.user.is_authenticated:
            serializer.save(cree_par=request.user)
        else:
            serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([AllowAny])
def detail_reclamation(request, pk):
    """
    GET: Returns full ticket details including comments and site info.
    PUT: Updates ticket (status, assignment, priority, etc.).
    Includes auto-assign logic when a closed ticket is reopened.
    """
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ReclamationSerializer(reclamation)
        return Response(serializer.data)

    if request.method == 'PUT':
        # Permission check for update
        if request.user and request.user.is_authenticated:
            role = request.user.role.upper() if request.user.role else ''
            if role not in [Role.ADMIN, Role.AGENT_CALL_CENTER, Role.INGENIEUR_RESEAUX, Role.SUPERVISEUR]:
                return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

        old_statut = reclamation.statut
        serializer = ReclamationSerializer(reclamation, data=request.data, partial=True)
        if serializer.is_valid():
            reclamation = serializer.save()

            # When a ticket is closed, clear any assignment
            if reclamation.statut == 'ferme' and reclamation.assigne_a:
                reclamation.assigne_a = None
                reclamation.save()

            # Auto-assign: the user who reopens becomes the assignee
            if (old_statut == 'ferme' and reclamation.statut == 'ouvert'
                    and request.user and request.user.is_authenticated
                    and not reclamation.assigne_a):
                reclamation.assigne_a = request.user
                reclamation.save()

            return Response(ReclamationSerializer(reclamation).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def ajouter_commentaire(request, pk):
    """
    Adds a comment to a ticket. Only engineers and admins can comment
    (call center agents use keywords instead for AI description).
    """
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.user and request.user.is_authenticated:
        role = (request.user.role or '').upper()
        if role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX, Role.SUPERVISEUR]:
            return Response({'error': 'Seuls les ingénieurs peuvent ajouter des commentaires.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = CommentaireSerializer(data=request.data)
    if serializer.is_valid():
        if request.user and request.user.is_authenticated:
            serializer.save(reclamation=reclamation, auteur=request.user)
        else:
            serializer.save(reclamation=reclamation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def archiver_reclamation(request, pk):
    """Archive a reclamation (admin only). Sets is_archived=True."""
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
    return Response({'message': 'Ticket archivé', 'id': pk})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def desarchiver_reclamation(request, pk):
    """Unarchive a reclamation (admin only). Sets is_archived=False."""
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
    return Response({'message': 'Ticket désarchivé', 'id': pk})
