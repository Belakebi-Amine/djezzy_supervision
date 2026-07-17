# reclamations/serializers.py
# ─────────────────────────────────────────────────────────────
# Serializers for reclamation tickets, grouped tickets, and
# comments. Handles nested serialization of site and user data,
# plus write-only ID fields for creation and updates.
# ─────────────────────────────────────────────────────────────
from rest_framework import serializers
from .models import Reclamation, CommentaireTicket, GroupeTicket
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


class ReclamationLiteSerializer(serializers.ModelSerializer):
    nom_complet_client = serializers.CharField(read_only=True)

    class Meta:
        model = Reclamation
        fields = [
            'id', 'numero_ticket', 'nom_client', 'nom_complet_client',
            'telephone_client', 'email_client', 'type_client',
            'mots_cles_ia', 'priorite', 'statut',
            'created_at',
        ]


class GroupeTicketSerializer(serializers.ModelSerializer):
    reclamations = ReclamationLiteSerializer(many=True, read_only=True)
    reclamations_count = serializers.IntegerField(source='nombre_reclamations', read_only=True)

    site = SiteReseauSerializer(read_only=True)
    site_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    assigne_a = UserSerializer(read_only=True)
    assigne_a_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    cree_par = UserSerializer(read_only=True)

    site_display = serializers.CharField(source='site.nom', read_only=True, default='Non spécifié')
    assigne_a_display = serializers.SerializerMethodField()

    premier_signalement_display = serializers.SerializerMethodField()

    class Meta:
        model = GroupeTicket
        fields = [
            'id', 'numero_ticket', 'site', 'site_id', 'site_display',
            'titre', 'description', 'mots_cles', 'priorite', 'statut',
            'assigne_a', 'assigne_a_id', 'assigne_a_display',
            'cree_par', 'nombre_reclamations', 'reclamations_count',
            'reclamations',
            'premier_signalement', 'premier_signalement_display',
            'is_archived', 'created_at', 'updated_at', 'resolu_le',
        ]
        read_only_fields = [
            'numero_ticket', 'cree_par', 'nombre_reclamations',
            'created_at', 'updated_at', 'resolu_le',
        ]

    def get_assigne_a_display(self, obj):
        if obj.assigne_a:
            return obj.assigne_a.code_user
        return "-"

    def get_premier_signalement_display(self, obj):
        if obj.premier_signalement:
            return obj.premier_signalement.isoformat()
        return None


class GroupeTicketLiteSerializer(serializers.ModelSerializer):
    site_display = serializers.CharField(source='site.nom', read_only=True, default='Non spécifié')
    reclamations_count = serializers.IntegerField(source='nombre_reclamations', read_only=True)

    class Meta:
        model = GroupeTicket
        fields = [
            'id', 'numero_ticket', 'titre', 'priorite', 'statut',
            'site', 'site_display', 'reclamations_count',
            'created_at',
        ]


class ReclamationSerializer(serializers.ModelSerializer):
    cree_par = UserSerializer(read_only=True)
    assigne_a = UserSerializer(read_only=True)
    site = SiteReseauSerializer(read_only=True)
    commentaires = CommentaireSerializer(many=True, read_only=True)

    site_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    assigne_a_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    site_display = serializers.CharField(source='site.nom', read_only=True, default='Non spécifié')
    assigne_a_display = serializers.SerializerMethodField()
    nom_complet_client = serializers.CharField(read_only=True)

    groupe_info = GroupeTicketLiteSerializer(source='groupe', read_only=True)

    class Meta:
        model = Reclamation
        fields = [
            'id', 'numero_ticket', 'nom_client', 'nom_complet_client',
            'telephone_client', 'email_client', 'type_client',
            'site', 'site_id', 'site_display', 'mots_cles_ia', 'priorite',
            'groupe', 'groupe_info',
            'statut', 'cree_par', 'assigne_a', 'assigne_a_id', 'assigne_a_display',
            'commentaires', 'created_at', 'updated_at', 'resolu_le',
        ]
        read_only_fields = ['numero_ticket', 'cree_par', 'created_at', 'updated_at', 'resolu_le', 'priorite']

    def get_assigne_a_display(self, obj):
        if obj.assigne_a:
            return obj.assigne_a.code_user
        return "-"

    def create(self, validated_data):
        site_id = validated_data.pop('site_id', None)
        assigne_a_id = validated_data.pop('assigne_a_id', None)

        validated_data.setdefault('statut', 'ouvert')
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

    def update(self, instance, validated_data):
        site_id = validated_data.pop('site_id', None)
        assigne_a_id = validated_data.pop('assigne_a_id', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if site_id is not None:
            instance.site = SiteReseau.objects.filter(id=site_id).first()
        if assigne_a_id is not None:
            instance.assigne_a = User.objects.filter(id=assigne_a_id).first()

        instance.save()
        return instance
