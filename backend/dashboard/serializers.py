from rest_framework import serializers
from .models import RapportIA
from accounts.serializers import UserSerializer


class RapportIASerializer(serializers.ModelSerializer):
    cree_par = UserSerializer(read_only=True)
    cree_par_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = RapportIA
        fields = [
            'id', 'titre', 'prompt', 'contenu',
            'date_debut', 'date_fin',
            'cree_par', 'cree_par_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
