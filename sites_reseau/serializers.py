from rest_framework import serializers
from .models import SiteReseau


class SiteReseauSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteReseau
        fields = [
            'id',
            'code_site',
            'name', 
            'wilaya', 
            'commune', 
            'longitude', 
            'latitude', 
            'adresse', 
            'statut', 
            'derniere_maj', 
            'created_at'
        ]
        read_only_fields = ['derniere_maj', 'created_at']