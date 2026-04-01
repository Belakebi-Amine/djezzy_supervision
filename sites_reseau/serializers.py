from rest_framework import serializers
from .models import SiteReseau


class SiteReseauSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteReseau
        fields = [
            'id',
            'code_site',
            'nom_site',
            'technologie',
            'wilaya',
            'adresse',
            'latitude',
            'longitude',
            'statut',
            'derniere_maj',
            'created_at',
        ]
        read_only_fields = ['derniere_maj', 'created_at']