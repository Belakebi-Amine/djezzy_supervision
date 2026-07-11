# dashboard/serializers.py
# ─────────────────────────────────────────────────────────────
# Serializer for AI-generated reports. Handles JSON conversion
# of report data with nested user info for the author field.
# ─────────────────────────────────────────────────────────────
from rest_framework import serializers
from .models import RapportIA
from accounts.serializers import UserSerializer


class RapportIASerializer(serializers.ModelSerializer):
    """
    Serializes AI report data. The 'cree_par' field returns
    full user info on read, while 'cree_par_id' accepts an
    integer ID on write (though it's auto-set by the view).
    """
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
