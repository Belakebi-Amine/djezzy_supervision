from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .models import Reclamation, CommentaireTicket
from .serializers import ReclamationSerializer, CommentaireSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_reclamations(request):
    reclamations = Reclamation.objects.all()
    serializer = ReclamationSerializer(reclamations, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_reclamation(request):
    if not request.user.role in ['admin', 'call_center']:
        return Response({'error': 'Permission refusée'}, status=403)
    serializer = ReclamationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(cree_par=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def detail_reclamation(request, pk):
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=404)

    if request.method == 'GET':
        serializer = ReclamationSerializer(reclamation)
        return Response(serializer.data)

    if request.method == 'PUT':
        if not request.user.role in ['admin', 'call_center', 'ingenieur']:
            return Response({'error': 'Permission refusée'}, status=403)
        serializer = ReclamationSerializer(reclamation, data=request.data, partial=True)
        if serializer.is_valid():
            if request.data.get('statut') == 'resolu':
                serializer.save(resolu_le=timezone.now())
            else:
                serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ajouter_commentaire(request, pk):
    try:
        reclamation = Reclamation.objects.get(pk=pk)
    except Reclamation.DoesNotExist:
        return Response({'error': 'Ticket introuvable'}, status=404)

    serializer = CommentaireSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(reclamation=reclamation, auteur=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)