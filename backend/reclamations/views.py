from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Reclamation
from .serializers import ReclamationSerializer, CommentaireSerializer
from accounts.models import Role

STATUTS_VALIDES = {'ouvert', 'resolu', 'ferme'}

ALIAS_NON_TRAITE = {'non-traité', 'non-traite', 'non-traites', 'nouveau', 'en_cours', 'en cours'}
ALIAS_TRAITE = {'traité', 'traite', 'traites', 'résolu', 'resolu', 'fermé', 'ferme'}


def _statuts_depuis_param(statut_filter):
    """
    Accepte aussi bien '?statut=ouvert,en_cours' (ce que React envoie)
    que des alias pratiques comme '?statut=non-traites'.
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
    statut_filter = request.query_params.get('statut')
    reclamations = Reclamation.objects.select_related('site', 'cree_par', 'assigne_a').all()

    if statut_filter:
        statuts = _statuts_depuis_param(statut_filter)
        if statuts:
            reclamations = reclamations.filter(statut__in=statuts)
        else:
            # Valeur inconnue : on filtre quand même de façon littérale, par sécurité.
            reclamations = reclamations.filter(statut__iexact=statut_filter.strip().lower())

    serializer = ReclamationSerializer(reclamations, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def creer_reclamation(request):
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
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ReclamationSerializer(reclamation)
        return Response(serializer.data)

    if request.method == 'PUT':
        if request.user and request.user.is_authenticated:
            role = request.user.role.upper() if request.user.role else ''
            if role not in [Role.ADMIN, Role.AGENT_CALL_CENTER, Role.INGENIEUR_RESEAUX, Role.SUPERVISEUR]:
                return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

        old_statut = reclamation.statut
        serializer = ReclamationSerializer(reclamation, data=request.data, partial=True)
        if serializer.is_valid():
            reclamation = serializer.save()

            # Force : un ticket fermé n'a jamais d'assigné
            if reclamation.statut == 'ferme' and reclamation.assigne_a:
                reclamation.assigne_a = None
                reclamation.save()

            # Auto-assign : l'ingénieur qui ouvre le ticket (ferme -> ouvert) devient l'assigné
            if (old_statut == 'ferme' and reclamation.statut == 'ouvert'
                    and request.user and request.user.is_authenticated
                    and (request.user.role or '').upper() == Role.INGENIEUR_RESEAUX
                    and not reclamation.assigne_a):
                reclamation.assigne_a = request.user
                reclamation.save()

            return Response(ReclamationSerializer(reclamation).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def ajouter_commentaire(request, pk):
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    # Seuls les ingénieurs peuvent commenter (les mots-clés suffisent pour le CC)
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
