from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SiteReseau
from .serializers import SiteReseauSerializer
# On importe Role pour la vérification des permissions
from accounts.models import Role 

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_sites(request):
    """Récupère tous les sites pour la cartographie ou le tableau."""
    sites = SiteReseau.objects.all()
    serializer = SiteReseauSerializer(sites, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_site(request):
    """
    Correspond à la méthode ajouterSite() de mon diagramme.
    Seul l'Administrateur et l'Ingénieur Réseaux peuvent créer des sites.
    """
    if request.user.role not in [Role.ADMIN, Role.INGENIEUR]:
        return Response({'error': 'Accès réservé aux ingénieurs réseau'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = SiteReseauSerializer(data=request.data)
    if serializer.is_valid():
        # Ici, le serializer.save() appelle indirectement la logique d'ajout
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def detail_site(request, pk):
    """
    Gère la lecture, la modification (modifierSite) et la suppression.
    """
    try:
        site = SiteReseau.objects.get(pk=pk)
    except SiteReseau.DoesNotExist:
        return Response({'error': 'Site introuvable'}, status=status.HTTP_404_NOT_FOUND)

    # --- Lecture ---
    if request.method == 'GET':
        serializer = SiteReseauSerializer(site)
        return Response(serializer.data)

    # --- Vérification des droits pour Modification/Suppression ---
    if request.user.role not in [Role.ADMIN, Role.INGENIEUR]:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

    # --- Modification (modifierSite) ---
    if request.method == 'PUT':
        serializer = SiteReseauSerializer(site, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # --- Suppression ---
    if request.method == 'DELETE':
        site.delete()
        return Response({'message': 'Site supprimé avec succès'}, status=status.HTTP_204_NO_CONTENT)