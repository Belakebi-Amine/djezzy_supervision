from rest_framework import serializers
from .models import SiteReseau

class SiteReseauSerializer(serializers.ModelSerializer):
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