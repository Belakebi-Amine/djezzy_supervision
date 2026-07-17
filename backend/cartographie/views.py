# cartographie/views.py
# ─────────────────────────────────────────────────────────────
# Map data endpoint for the Leaflet-based cartography view.
# Returns site locations with coordinates for rendering markers
# on the interactive map.
# ─────────────────────────────────────────────────────────────
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from sites_reseau.models import SiteReseau


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def carte_sites(request):
    """
    Returns all network sites that have valid geographic coordinates.
    Used by the frontend Leaflet map component to place markers.
    Filters out sites without coordinates to avoid map errors.
    """
    sites_valides = SiteReseau.objects.exclude(
        coordY=None
    ).exclude(
        coordX=None
    ).exclude(
        coordY=""
    ).exclude(
        coordX=""
    )

    # Extract only the fields needed for map rendering (lightweight query)
    data = list(sites_valides.values(
        'id',
        'codeSite',
        'nom',
        'wilaya',
        'statut',
        'technologie',
        'coordX',
        'coordY'
    ))

    return Response(data)
