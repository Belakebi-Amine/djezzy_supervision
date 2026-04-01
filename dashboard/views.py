from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from reclamations.models import Reclamation
from sites_reseau.models import SiteReseau


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statistiques(request):
    # ── Stats des sites ──────────────────────────────────────
    total_sites      = SiteReseau.objects.count()
    sites_up         = SiteReseau.objects.filter(statut='UP').count()
    sites_down       = SiteReseau.objects.filter(statut='DOWN').count()
    sites_degrade    = SiteReseau.objects.filter(statut='DEGRADE').count()
    sites_perturbe   = SiteReseau.objects.filter(statut='PERTURBE').count()

    # ── Stats des tickets ────────────────────────────────────
    total_tickets    = Reclamation.objects.count()
    tickets_ouverts  = Reclamation.objects.filter(statut='ouvert').count()
    tickets_en_cours = Reclamation.objects.filter(statut='en_cours').count()
    tickets_resolus  = Reclamation.objects.filter(statut='resolu').count()

    return Response({
        'sites': {
            'total':    total_sites,
            'up':       sites_up,
            'down':     sites_down,
            'degrade':  sites_degrade,
            'perturbe': sites_perturbe,
        },
        'tickets': {
            'total':    total_tickets,
            'ouverts':  tickets_ouverts,
            'en_cours': tickets_en_cours,
            'resolus':  tickets_resolus,
        }
    })
