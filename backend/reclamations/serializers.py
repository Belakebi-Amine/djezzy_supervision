from rest_framework import serializers
from .models import Reclamation, CommentaireTicket
from accounts.serializers import UserSerializer
from sites_reseau.serializers import SiteReseauSerializer
from sites_reseau.models import SiteReseau
from django.contrib.auth import get_user_model

User = get_user_model()

class CommentaireSerializer(serializers.ModelSerializer):
    auteur = UserSerializer(read_only=True)

    class Meta:
        model = CommentaireTicket
        fields = ['id', 'auteur', 'contenu', 'created_at']
        read_only_fields = ['created_at']


class ReclamationSerializer(serializers.ModelSerializer):
    cree_par = UserSerializer(read_only=True)
    assigne_a = UserSerializer(read_only=True)
    site = SiteReseauSerializer(read_only=True)
    commentaires = CommentaireSerializer(many=True, read_only=True)
    
    # Champs d'écriture pour recevoir les IDs numériques depuis React
    site_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    assigne_a_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    # Champs de lecture plats pour l'affichage dans le tableau React
    site_display = serializers.CharField(source='site.nom', read_only=True, default='Non spécifié')
    assigne_a_display = serializers.SerializerMethodField()

    class Meta:
        model = Reclamation
        fields = [
            'id', 'numero_ticket', 'nom_client', 'telephone_client', 
            'site', 'site_id', 'site_display', 'description', 'priorite', 
            'statut', 'cree_par', 'assigne_a', 'assigne_a_id', 'assigne_a_display', 
            'commentaires', 'created_at', 'updated_at', 'resolu_le',
        ]
        read_only_fields = ['numero_ticket', 'cree_par', 'created_at', 'updated_at', 'resolu_le']

    def get_assigne_a_display(self, obj):
        if obj.assigne_a:
            if obj.assigne_a.first_name or obj.assigne_a.last_name:
                return f"{obj.assigne_a.first_name} {obj.assigne_a.last_name}".strip()
            return obj.assigne_a.username
        return "En attente"

    def create(self, validated_data):
        site_id = validated_data.pop('site_id', None)
        assigne_a_id = validated_data.pop('assigne_a_id', None)

        reclamation = Reclamation.objects.create(**validated_data)

        if site_id:
            try:
                reclamation.site = SiteReseau.objects.get(id=site_id)
            except SiteReseau.DoesNotExist:
                pass

        if assigne_a_id:
            try:
                reclamation.assigne_a = User.objects.get(id=assigne_a_id)
            except User.DoesNotExist:
                pass

        reclamation.save()
        return reclamation