from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Reclamation
from .serializers import ReclamationSerializer, CommentaireSerializer
from accounts.models import Role 

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_reclamations(request):
    """
    C'est ma vue pour lister les réclamations. 
    J'ai corrigé un énorme problème caché de performance !
    """
    statut_filter = request.query_params.get('statut')
    
    # ── ⚡ L'OPTIMISATION INDISPENSABLE : SELECT_RELATED ──────────────────
    # Au lieu de faire un simple 'objects.all()', j'utilise 'select_related'.
    # Pourquoi ? Parce que chaque ticket est lié à un 'SiteReseau' et à un 'User'.
    # Sans ça, Django ferait une requête SQL par ticket pour aller chercher le nom du site.
    # Avec 'select_related', je force SQL à faire une JOINTURE (JOIN) en une seule fois.
    reclamations = Reclamation.objects.select_related('site_reseau', 'cree_par').all()
    
    # Je garde mon filtrage optionnel s'il y a un paramètre dans l'URL (ex: ?statut=ouvert)
    if statut_filter:
        reclamations = reclamations.filter(statut=statut_filter)
        
    serializer = ReclamationSerializer(reclamations, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_reclamation(request):
    """
    C'est ma vue de création de ticket. Seuls les profils autorisés y ont accès.
    """
    # Je bloque l'accès si l'utilisateur qui fait la requête n'est pas Admin ou Call Center
    if request.user.role not in [Role.ADMIN, Role.CALL_CENTER]:
        return Response(
            {'error': 'Permission refusée. Seul le Call Center peut créer un ticket.'}, 
            status=status.HTTP_403_FORBIDDEN
        )
        
    serializer = ReclamationSerializer(data=request.data)
    if serializer.is_valid():
        # J'injecte automatiquement l'utilisateur connecté ('request.user') comme auteur du ticket
        serializer.save(cree_par=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def detail_reclamation(request, pk):
    """
    C'est ma vue pour consulter ou modifier un ticket spécifique grâce à son ID ('pk').
    """
    try:
        # J'essaie de récupérer le ticket avec son identifiant unique
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        # Si l'ID n'existe pas dans ma base PostgreSQL, je renvoie un code 404
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    # --- Lecture (GET) ---
    if request.method == 'GET':
        serializer = ReclamationSerializer(reclamation)
        return Response(serializer.data)

    # --- Modification (PUT) ---
    if request.method == 'PUT':
        # Je vérifie les droits : seuls l'Admin, le Call Center ou l'Ingénieur en charge peuvent modifier
        if request.user.role not in [Role.ADMIN, Role.CALL_CENTER, Role.INGENIEUR]:
            return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
            
        # J'utilise 'partial=True' pour permettre des mises à jour partielles (ex: modifier juste le statut)
        serializer = ReclamationSerializer(reclamation, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ajouter_commentaire(request, pk):
    """
    C'est ma vue pour ajouter un suivi technique sur un ticket existant.
    """
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CommentaireSerializer(data=request.data)
    if serializer.is_valid():
        # J'associe de force le commentaire au ticket récupéré et à l'utilisateur connecté
        serializer.save(reclamation=reclamation, auteur=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)