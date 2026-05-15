from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Reclamation
from .serializers import ReclamationSerializer, CommentaireSerializer
from accounts.models import Role # Pour sécuriser les rôles

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_reclamations(request):
    """
    Récupère toutes les réclamations.
    Ajout d'un petit filtre optionnel par statut pour ton futur Dashboard.
    """
    statut_filter = request.query_params.get('statut')
    reclamations = Reclamation.objects.all()
    if statut_filter:
        reclamations = reclamations.filter(statut=statut_filter)
        
    serializer = ReclamationSerializer(reclamations, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_reclamation(request):
    """
    Seuls les Admins et les agents du Call Center peuvent ouvrir un ticket.
    """
    if request.user.role not in [Role.ADMIN, Role.CALL_CENTER]:
        return Response({'error': 'Permission refusée. Seul le Call Center peut créer un ticket.'}, status=status.HTTP_403_FORBIDDEN)
        
    serializer = ReclamationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(cree_par=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def detail_reclamation(request, pk):
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    # --- Lecture ---
    if request.method == 'GET':
        serializer = ReclamationSerializer(reclamation)
        return Response(serializer.data)

    # --- Modification (Mise à jour du statut, attribution, etc.) ---
    if request.method == 'PUT':
        # On protège la modification selon tes règles : Admin, Call Center ou l'Ingénieur Réseau
        if request.user.role not in [Role.ADMIN, Role.CALL_CENTER, Role.INGENIEUR]:
            return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = ReclamationSerializer(reclamation, data=request.data, partial=True)
        if serializer.is_valid():
            # Le calcul de la date 'resolu_le' se fait déjà dans models.py lors du save() !
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ajouter_commentaire(request, pk):
    """
    Permet d'ajouter une note de suivi (Ingénieur, Technicien, Call Center...).
    """
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CommentaireSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(reclamation=reclamation, auteur=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)