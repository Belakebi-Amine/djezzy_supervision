from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from sites_reseau.models import SiteReseau


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def carte_sites(request):
    sites = SiteReseau.objects.exclude(
        latitude=None
    ).exclude(
        longitude=None
    )

    data = []
    for site in sites:
        data.append({
            'id':          site.id,
            'code_site':   site.code_site,
            'nom_site':    site.nom_site,
            'wilaya':      site.wilaya,
            'statut':      site.statut,
            'technologie': site.technologie,
            'latitude':    float(site.latitude),
            'longitude':   float(site.longitude),
        })

    return Response(data)
