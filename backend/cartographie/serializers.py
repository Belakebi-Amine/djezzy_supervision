# cartographie/serializers.py
# ─────────────────────────────────────────────────────────────
# Serializer for map-specific site data. Adds computed fields
# like active complaint count and alert status for each site.
# ─────────────────────────────────────────────────────────────
from rest_framework import serializers
from sites_reseau.models import SiteReseau


class CartographieSiteSerializer(serializers.ModelSerializer):
    """
    Extended site serializer for the cartography view.
    Includes active complaint count and computed alert status
    to help with decision-making on the map interface.
    """
    total_reclamations_actives = serializers.IntegerField(read_only=True)
    statut_site = serializers.SerializerMethodField()

    class Meta:
        model = SiteReseau
        fields = ['id', 'nom', 'latitude', 'longitude', 'total_reclamations_actives', 'statut_site']

    def get_statut_site(self, obj):
        """Marks a site as 'En Alerte' if it has active complaints."""
        if getattr(obj, 'total_reclamations_actives', 0) > 0:
            return "En Alerte"
        return "Opérationnel"
