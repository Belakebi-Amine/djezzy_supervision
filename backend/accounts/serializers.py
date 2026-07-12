# accounts/serializers.py
# ─────────────────────────────────────────────────────────────
# DRF serializers for the accounts app. Handles JSON serialization
# of user data, JWT token customization, and input validation
# for registration, password changes, and profile updates.
# ─────────────────────────────────────────────────────────────
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT serializer to include user role and code
    in the token payload. The frontend reads the role from the token
    to route users to the correct dashboard without extra API calls.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims to the JWT payload
        token['code_user'] = user.code_user
        token['role'] = getattr(user, 'role', 'aucun')
        token['is_active'] = user.is_active
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Also include full user data in the response body for the frontend
        data['user'] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    """
    Main user serializer used across the app for reading user data.
    Returns a flat JSON representation with computed fields like nom_user.
    """
    nom_user = serializers.SerializerMethodField()

    def get_nom_user(self, obj):
        """Returns full name or falls back to code_user."""
        full = obj.get_full_name().strip()
        return full if full else obj.code_user

    # Alias 'role' as 'role_user' to match the UML diagram naming
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
            'is_active',
            'is_archived',
        ]
        read_only_fields = ['code_user', 'nom_user', 'role_user', 'is_active', 'is_archived']


class RegisterSerializer(serializers.ModelSerializer):
    """
    Handles new user creation with password confirmation.
    Validates that both password fields match before saving.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'email', 'role', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Les mots de passe ne correspondent pas.'})
        return attrs

    def create(self, validated_data):
        """Creates user with hashed password (password2 is removed before save)."""
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """
    Validates password change requests. Requires the current password
    and enforces Django's password validators on the new password.
    """
    ancien_mot_de_passe = serializers.CharField(required=True, write_only=True)
    nouveau_mot_de_passe = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password]
    )

    def validate_ancien_mot_de_passe(self, value):
        """Ensures the user knows their current password."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Ancien mot de passe incorrect.')
        return value


class UpdateProfileSerializer(serializers.ModelSerializer):
    """
    For self-service profile updates. Only allows changing
    name and email (role and code are read-only).
    """
    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'email']


class UpdateUserSerializer(serializers.ModelSerializer):
    """
    For admin to modify any user's details including their role.
    """
    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'email', 'role']
        read_only_fields = []
