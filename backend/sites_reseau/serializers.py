# sites_reseau/serializers.py
# ─────────────────────────────────────────────────────────────
# Serializer for the SiteReseau model. Exposes all site fields
# including coordinates, status, technology, and coverage info.
# ─────────────────────────────────────────────────────────────
from rest_framework import serializers
from .models import SiteReseau


class SiteReseauSerializer(serializers.ModelSerializer):
    """
    Flat serializer for network sites. Used for both list views
    (table, map markers) and detail/edit forms.
    """
    class Meta:
        model = SiteReseau
        fields = [
            'id',
            'codeSite',
            'nom',
            'wilaya',
            'commune',
            'coordX',
            'coordY',
            'adresse',
            'statut',
            'technologie',
            'archive',
            'rayon_couverture',
            'derniere_maj',
            'created_at'
        ]
        read_only_fields = ['codeSite', 'derniere_maj', 'created_at']
