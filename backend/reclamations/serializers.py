from rest_framework import serializers
from .models import Reclamation, CommentaireTicket
from accounts.serializers import UserSerializer
from sites_reseau.serializers import SiteReseauSerializer


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
    site_id = serializers.IntegerField(write_only=True, required=False)
    assigne_a_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Reclamation
        fields = [
            'id',
            'numero_ticket',
            'nom_client',
            'telephone_client',
            'site',
            'site_id',
            'description',
            'priorite',
            'statut',
            'cree_par',
            'assigne_a',
            'assigne_a_id',
            'commentaires',
            'created_at',
            'updated_at',
            'resolu_le',
        ]
        read_only_fields = ['numero_ticket', 'cree_par', 'created_at', 'updated_at']