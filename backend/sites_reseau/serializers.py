# sites_reseau/serializers.py
# ─────────────────────────────────────────────────────────────
# Serializer for the SiteReseau model. Exposes all site fields
# including coordinates, status, technology, and coverage info.
# ─────────────────────────────────────────────────────────────
from rest_framework import serializers
from .models import SiteReseau


ALGERIA_BOUNDS = {
    'lat_min': 18.9,
    'lat_max': 37.1,
    'lon_min': -8.7,
    'lon_max': 11.6,
}


class SiteReseauSerializer(serializers.ModelSerializer):
    """
    Flat serializer for network sites. Used for both list views
    (table, map markers) and detail/edit forms.
    """

    def validate_coordX(self, value):
        if value < ALGERIA_BOUNDS['lon_min'] or value > ALGERIA_BOUNDS['lon_max']:
            raise serializers.ValidationError(
                f"La longitude {value} est hors d'Algérie. Valeurs acceptées : {ALGERIA_BOUNDS['lon_min']} à {ALGERIA_BOUNDS['lon_max']}."
            )
        return value

    def validate_coordY(self, value):
        if value < ALGERIA_BOUNDS['lat_min'] or value > ALGERIA_BOUNDS['lat_max']:
            raise serializers.ValidationError(
                f"La latitude {value} est hors d'Algérie. Valeurs acceptées : {ALGERIA_BOUNDS['lat_min']} à {ALGERIA_BOUNDS['lat_max']}."
            )
        return value

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
