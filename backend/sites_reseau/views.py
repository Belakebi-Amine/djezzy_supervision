from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SiteReseau
from .serializers import SiteReseauSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_sites(request):
    sites = SiteReseau.objects.all()
    serializer = SiteReseauSerializer(sites, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_site(request):
    if not request.user.role in ['admin', 'ingenieur']:
        return Response({'error': 'Permission refusée'}, status=403)
    serializer = SiteReseauSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def detail_site(request, pk):
    try:
        site = SiteReseau.objects.get(pk=pk)
    except SiteReseau.DoesNotExist:
        return Response({'error': 'Site introuvable'}, status=404)

    if request.method == 'GET':
        serializer = SiteReseauSerializer(site)
        return Response(serializer.data)

    if not request.user.role in ['admin', 'ingenieur']:
        return Response({'error': 'Permission refusée'}, status=403)

    if request.method == 'PUT':
        serializer = SiteReseauSerializer(site, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        site.delete()
        return Response({'message': 'Site supprimé'}, status=204)
