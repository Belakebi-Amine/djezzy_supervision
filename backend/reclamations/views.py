from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Reclamation
from .serializers import ReclamationSerializer, CommentaireSerializer
from accounts.models import Role 

@api_view(['GET'])
@permission_classes([AllowAny]) 
def liste_reclamations(request):
    statut_filter = request.query_params.get('statut')
    reclamations = Reclamation.objects.select_related('site', 'cree_par', 'assigne_a').all()
    
    if statut_filter:
        statut_clean = statut_filter.strip().lower()
        if statut_clean in ['non-traité', 'non-traite', 'en cours', 'en_cours', 'nouveau', 'ouvert', 'non-traites']:
            reclamations = reclamations.filter(statut__in=['ouvert', 'en_cours'])
        elif statut_clean in ['traité', 'traite', 'traites', 'resolu', 'résolu', 'fermé', 'ferme']:
            reclamations = reclamations.filter(statut__in=['resolu', 'ferme'])
        else:
            reclamations = reclamations.filter(statut__iexact=statut_clean)
        
    serializer = ReclamationSerializer(reclamations, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([AllowAny]) 
def creer_reclamation(request):
    if request.user and request.user.is_authenticated:
        if request.user.role not in [Role.ADMIN, Role.CALL_CENTER]:
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
            if request.user.role not in [Role.ADMIN, Role.CALL_CENTER, Role.INGENIEUR]:
                return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = ReclamationSerializer(reclamation, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def ajouter_commentaire(request, pk):
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CommentaireSerializer(data=request.data)
    if serializer.is_valid():
        if request.user and request.user.is_authenticated:
            serializer.save(reclamation=reclamation, auteur=request.user)
        else:
            serializer.save(reclamation=reclamation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)