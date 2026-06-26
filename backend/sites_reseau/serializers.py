from rest_framework import serializers
from .models import SiteReseau

class SiteReseauSerializer(serializers.ModelSerializer):
    """
    Ce Serializer transforme mes objets SiteReseau en JSON pour mon Front-end.
    J'utilise les noms exacts de mon diagramme de classes : 
    codeSite, nom, coordX, coordY.
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
            'archive',
            'derniere_maj', 
            'created_at'
        ]
        read_only_fields = ['derniere_maj', 'created_at']