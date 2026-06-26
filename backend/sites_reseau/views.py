from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SiteReseau
from .serializers import SiteReseauSerializer
from accounts.models import Role 

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_sites(request):
    """
    Je récupère tous les sites pour mon tableau ou ma cartographie.
    J'ai ajouté un système de filtre par statut pour que mon frontend puisse 
    demander uniquement les sites en panne (ex: ?statut=DOWN).
    Par defaut, les sites archivés sont cachés ; ajouter ?archive=true pour les voir.
    """
    # Je commence par charger l'ensemble de mes sites réseau
    sites_queryset = SiteReseau.objects.all()
    
    # Je cache les sites archivés sauf si le frontend demande explicitement à les voir
    afficher_archives = request.query_params.get('archive', 'false').lower() == 'true'
    if not afficher_archives:
        sites_queryset = sites_queryset.filter(archive=False)
    
    # Je récupère le paramètre 'statut' depuis l'URL si mon frontend l'envoie
    statut_filtre = request.query_params.get('statut', None)
    
    # Si mon frontend a demandé un filtre, je l'applique sur ma requête
    if statut_filtre is not None:
        # '__iexact' me permet de filtrer sans me soucier des majuscules/minuscules
        sites_queryset = sites_queryset.filter(statut__iexact=statut_filtre)
        
    # J'utilise mon serializer personnalisé sur mon QuerySet filtré
    serializer = SiteReseauSerializer(sites_queryset, many=True)
    
    # Je retourne ma liste finale de sites au format JSON
    return Response(serializer.data, status=status.HTTP_200_OK)

# --- Je garde mes fonctions creer_site et detail_site exactement telles quelles ---
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_site(request):
    """Correspond à la méthode ajouterSite() de mon diagramme."""
    if request.user.role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX]:
        return Response({'error': 'Accès réservé aux ingénieurs réseau'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = SiteReseauSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def detail_site(request, pk):
    """Gère la lecture, la modification (modifierSite) et la suppression."""
    try:
        site = SiteReseau.objects.get(pk=pk)
    except SiteReseau.DoesNotExist:
        return Response({'error': 'Site introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = SiteReseauSerializer(site)
        return Response(serializer.data)

    if request.user.role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX]:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT':
        serializer = SiteReseauSerializer(site, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        site.delete()
        return Response({'message': 'Site supprimé avec succès'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def archiver_site(request, pk):
    """Archive un site (archive=True) au lieu de le supprimer definitivement."""
    try:
        site = SiteReseau.objects.get(pk=pk)
    except SiteReseau.DoesNotExist:
        return Response({'error': 'Site introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.user.role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX]:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

    site.archiverSite()
    serializer = SiteReseauSerializer(site)
    return Response(serializer.data, status=status.HTTP_200_OK)