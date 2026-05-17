from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from sites_reseau.models import SiteReseau

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def carte_sites(request):
    """
    Ma vue pour la carte : je récupère tous les sites qui ont des coordonnées valides
    pour les envoyer directement à mon frontend (Leaflet / React).
    """
    # Je filtre pour exclure les valeurs nulles ou vides pour ne pas faire bugger la carte
    sites_valides = SiteReseau.objects.exclude(
        latitude=None
    ).exclude(
        longitude=None
    ).exclude(
        latitude=""
    ).exclude(
        longitude=""
    )

    # J'extrais directement les dictionnaires, c'est super rapide et optimisé en SQL
    data = list(sites_valides.values(
        'id', 
        'code_site', 
        'nom_site', 
        'wilaya', 
        'statut', 
        'technologie', 
        'latitude', 
        'longitude'
    ))

    # Je renvoie la réponse au format JSON
    return Response(data)