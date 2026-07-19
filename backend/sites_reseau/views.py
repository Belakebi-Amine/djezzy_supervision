# sites_reseau/views.py
# ─────────────────────────────────────────────────────────────
# API views for network site management. Provides CRUD operations
# with role-based access control. Supports filtering by status
# and soft-deletion (archive) for operational sites.
# ─────────────────────────────────────────────────────────────
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from .models import SiteReseau
from .serializers import SiteReseauSerializer
from accounts.models import Role
from accounts.permissions import IsEngineerOrAdmin, IsAdminEngineerOrSupervisor
from audit_log.models import ActivityLog


def _get_ip(request):
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
    return ip or request.META.get('REMOTE_ADDR', '')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_sites(request):
    """
    Lists network sites. Supports query params:
    - ?statut=DOWN to filter by status
    - ?archive=true to include archived sites
    - ?archived_only=true for only archived sites
    - ?wilaya=, ?commune=, ?technologie=, ?search=
    """
    sites_queryset = SiteReseau.objects.all()

    archived_only = request.query_params.get('archived_only', 'false').lower() == 'true'
    show_all = request.query_params.get('archive', 'false').lower() == 'true'

    if archived_only:
        sites_queryset = sites_queryset.filter(archive=True)
    elif not show_all:
        sites_queryset = sites_queryset.filter(archive=False)

    statut_filtre = request.query_params.get('statut', None)
    if statut_filtre is not None:
        sites_queryset = sites_queryset.filter(statut__iexact=statut_filtre)

    wilaya_filter = request.query_params.get('wilaya')
    if wilaya_filter:
        sites_queryset = sites_queryset.filter(wilaya__icontains=wilaya_filter)

    commune_filter = request.query_params.get('commune')
    if commune_filter:
        sites_queryset = sites_queryset.filter(commune__icontains=commune_filter)

    technologie_filter = request.query_params.get('technologie')
    if technologie_filter:
        sites_queryset = sites_queryset.filter(technologie__iexact=technologie_filter)

    search = request.query_params.get('search', '').strip()
    if search:
        sites_queryset = sites_queryset.filter(
            Q(nom__icontains=search) |
            Q(codeSite__icontains=search) |
            Q(wilaya__icontains=search) |
            Q(commune__icontains=search) |
            Q(adresse__icontains=search)
        )

    serializer = SiteReseauSerializer(sites_queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsEngineerOrAdmin])
def creer_site(request):
    """Creates a new network site. Only admins and engineers allowed."""
    serializer = SiteReseauSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        site_data = serializer.data
        ActivityLog.log('create_site', user=request.user, details={'code': site_data.get('codeSite', ''), 'nom': site_data.get('nom', '')}, ip=_get_ip(request))
        return Response(site_data, status=status.HTTP_201_CREATED)
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
            ActivityLog.log('update_site', user=request.user, details={'code': site.codeSite, 'champs': list(request.data.keys())}, ip=_get_ip(request))
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        if request.user.role not in [Role.ADMIN, Role.INGENIEUR_RESEAUX]:
            return Response({'error': 'Seuls les admins et ingénieurs peuvent supprimer'}, status=status.HTTP_403_FORBIDDEN)
        site_code = site.codeSite
        site.delete()
        ActivityLog.log('delete_site', user=request.user, details={'code': site_code}, ip=_get_ip(request))
        return Response({'message': 'Site supprimé avec succès'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdminEngineerOrSupervisor])
def archiver_site(request, pk):
    """
    Soft-deletes a site by setting archive=True.
    Preferred over hard delete for data preservation.
    """
    try:
        site = SiteReseau.objects.get(pk=pk)
    except SiteReseau.DoesNotExist:
        return Response({'error': 'Site introuvable'}, status=status.HTTP_404_NOT_FOUND)

    site.archiverSite()
    serializer = SiteReseauSerializer(site)
    ActivityLog.log('archive_site', user=request.user, details={'code': site.codeSite, 'nom': site.nom}, ip=_get_ip(request))
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsEngineerOrAdmin])
def desarchiver_site(request, pk):
    """
    Restores an archived site by setting archive=False.
    Only admins and engineers allowed.
    """
    try:
        site = SiteReseau.objects.get(pk=pk)
    except SiteReseau.DoesNotExist:
        return Response({'error': 'Site introuvable'}, status=status.HTTP_404_NOT_FOUND)

    site.desarchiverSite()
    serializer = SiteReseauSerializer(site)
    ActivityLog.log('restore_site', user=request.user, details={'code': site.codeSite, 'nom': site.nom}, ip=_get_ip(request))
    return Response(serializer.data, status=status.HTTP_200_OK)
