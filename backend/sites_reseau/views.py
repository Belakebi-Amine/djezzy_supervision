# sites_reseau/views.py
# ─────────────────────────────────────────────────────────────
# API views for network site management. Provides CRUD operations
# with role-based access control. Supports filtering by status
# and soft-deletion (archive) for operational sites.
# ─────────────────────────────────────────────────────────────
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import SiteReseau
from .serializers import SiteReseauSerializer
from accounts.models import Role


@api_view(['GET'])
@permission_classes([AllowAny])
def liste_sites(request):
    """
    Lists all non-archived network sites. Supports query params:
    - ?statut=DOWN to filter by status (used for critical alerts)
    - ?archive=true to include archived sites (admin only)
    Used by: engineer dashboard, cartography, ticket assignment.
    """
    sites_queryset = SiteReseau.objects.all()

    # Support three modes:
    # ?archived_only=true  → only archived sites (for admin archives tab)
    # ?archive=true        → ALL sites including archived (for engineer inline view)
    # (default)            → only non-archived sites
    archived_only = request.query_params.get('archived_only', 'false').lower() == 'true'
    show_all = request.query_params.get('archive', 'false').lower() == 'true'

    if archived_only:
        sites_queryset = sites_queryset.filter(archive=True)
    elif not show_all:
        sites_queryset = sites_queryset.filter(archive=False)

    # Optional status filter
    statut_filtre = request.query_params.get('statut', None)
    if statut_filtre is not None:
        sites_queryset = sites_queryset.filter(statut__iexact=statut_filtre)

    serializer = SiteReseauSerializer(sites_queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_site(request):
    """Creates a new network site. Only admins and engineers allowed."""
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
    """
    GET: Returns full site details (used in map popups, detail views).
    PUT: Updates site info (status changes, coordinates, etc.).
    DELETE: Permanently removes the site (admin/engineers only).
    """
    try:
        site = SiteReseau.objects.get(pk=pk)
    except SiteReseau.DoesNotExist:
        return Response({'error': 'Site introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = SiteReseauSerializer(site)
        return Response(serializer.data)

    # Write operations require elevated permissions
    if request.user.role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX, Role.SUPERVISEUR]:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT':
        serializer = SiteReseauSerializer(site, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        if request.user.role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX]:
            return Response({'error': 'Seuls les admins et ingénieurs peuvent supprimer'}, status=status.HTTP_403_FORBIDDEN)
        site.delete()
        return Response({'message': 'Site supprimé avec succès'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def archiver_site(request, pk):
    """
    Soft-deletes a site by setting archive=True.
    Preferred over hard delete for data preservation.
    """
    try:
        site = SiteReseau.objects.get(pk=pk)
    except SiteReseau.DoesNotExist:
        return Response({'error': 'Site introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.user.role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX, Role.SUPERVISEUR]:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

    site.archiverSite()
    serializer = SiteReseauSerializer(site)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def desarchiver_site(request, pk):
    """
    Restores an archived site by setting archive=False.
    Only admins and engineers allowed.
    """
    try:
        site = SiteReseau.objects.get(pk=pk)
    except SiteReseau.DoesNotExist:
        return Response({'error': 'Site introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if request.user.role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX]:
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)

    site.desarchiverSite()
    serializer = SiteReseauSerializer(site)
    return Response(serializer.data, status=status.HTTP_200_OK)
