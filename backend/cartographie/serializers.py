from rest_framework import serializers
from sites_reseau.models import SiteReseau  # J'importe ton modèle de site

class CartographieSiteSerializer(serializers.ModelSerializer):
    # Je crée des champs personnalisés qui ne sont pas dans la table d'origine
    # pour envoyer des infos d'aide à la décision au frontend
    total_reclamations_actives = serializers.IntegerField(read_only=True)
    statut_site = serializers.SerializerMethodField()

    class Meta:
        model = SiteReseau
        # Adapte ces noms de champs selon ton modèle SiteReseau (ex: nom, latitude, longitude)
        fields = ['id', 'nom', 'latitude', 'longitude', 'total_reclamations_actives', 'statut_site']

    def get_statut_site(self, obj):
        # Petite logique perso : si le site a des réclamations actives, je le signale en alerte
        if getattr(obj, 'total_reclamations_actives', 0) > 0:
            return "En Alerte"
        return "Opérationnel"