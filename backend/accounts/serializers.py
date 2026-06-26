from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Personnalisation du token JWT pour y inclure les informations de rôle
    directement exploitables par le Front-end React.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # On ajoute les attributs nécessaires au payload du token
        token['code_user'] = user.code_user
        token['role'] = getattr(user, 'role', 'aucun')  # Récupère la valeur du rôle ou 'aucun' par défaut
        
        return token

    def validate(self, attrs):
        # On récupère les tokens standard (access et refresh)
        data = super().validate(attrs)
        
        # On ajoute également l'utilisateur sérialisé dans la réponse HTTP directe
        data['user'] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    """
    C'est mon sérialiseur de base. 
    Je l'utilise pour transformer mon objet Utilisateur en JSON pour mon API.
    """
    # Ici, je fais correspondre 'nom_user' de mon diagramme au nom complet de Django
    nom_user = serializers.SerializerMethodField()

    def get_nom_user(self, obj):
        full = obj.get_full_name().strip()
        return full if full else obj.code_user
    # Je renomme l'affichage pour coller au 'role_user' de mon schéma
    role_user = serializers.CharField(source='role', read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'code_user',
            'first_name',
            'last_name',
            'nom_user',
            'email',
            'role_user',
        ]
        read_only_fields = ['code_user', 'nom_user', 'role_user']


class RegisterSerializer(serializers.ModelSerializer):
    """
    Ce sérialiseur me permet d'implémenter la méthode 'creerUtilisateur(data)' 
    que j'ai attribuée à l'Admin dans mon diagramme.
    """
    password = serializers.CharField(
        write_only=True, 
        required=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = CustomUser
        # Je demande les informations nécessaires à la création d'un compte
        fields = ['first_name', 'last_name', 'email', 'role', 'password', 'password2']

    def validate(self, attrs):
        # Je vérifie que les deux mots de passe saisis sont identiques
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Les mots de passe ne correspondent pas.'})
        return attrs

    def create(self, validated_data):
        # Ici, je crée réellement l'utilisateur en utilisant la méthode de Django
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """
    Je traduis ici la méthode 'modifierMotDePasse(ancien, nouveau)' de mon diagramme.
    """
    ancien_mot_de_passe = serializers.CharField(required=True, write_only=True)
    nouveau_mot_de_passe = serializers.CharField(
        required=True, 
        write_only=True,
        validators=[validate_password]
    )

    def validate_ancien_mot_de_passe(self, value):
        # Je m'assure que l'utilisateur connaît son mot de passe actuel avant de changer
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Ancien mot de passe incorrect.')
        return value


class UpdateProfileSerializer(serializers.ModelSerializer):
    """
    C'est l'implémentation de ma méthode 'mettreAJourProfil(data)'.
    Je ne permets de modifier que le nom, le prénom et l'email.
    """
    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'email']