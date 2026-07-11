# accounts/views.py
# ─────────────────────────────────────────────────────────────
# API views for user management: authentication (JWT), profile,
# password changes, and admin CRUD operations on users.
# ─────────────────────────────────────────────────────────────
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import logout
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CustomUser, Role
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    UpdateProfileSerializer,
    UpdateUserSerializer,
    CustomTokenObtainPairSerializer,
)


# ── Authentication (JWT) ───────────────────────────────────

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT login endpoint. Returns access + refresh tokens
    along with user data including the role for frontend routing.
    """
    serializer_class = CustomTokenObtainPairSerializer


# ── Logout ─────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Server-side logout. Client should also clear tokens from localStorage."""
    logout(request)
    return Response({'message': 'Déconnexion réussie'})


# ── Profile ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Returns the currently authenticated user's profile data."""
    return Response(UserSerializer(request.user).data)


# ── Password Change ────────────────────────────────────────

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    Changes the user's password. Requires the current password
    for verification before setting the new one.
    """
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        success = request.user.modifierMotDePasse(
            serializer.validated_data['ancien_mot_de_passe'],
            serializer.validated_data['nouveau_mot_de_passe']
        )
        if success:
            return Response({'message': 'Mot de passe modifié avec succès'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Profile Update ─────────────────────────────────────────

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """
    Updates the connected user's profile (name, email).
    Uses partial=True so either PUT or PATCH works.
    """
    serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        request.user.mettreAJourProfil(serializer.validated_data)
        return Response({
            'message': 'Profil mis à jour',
            'user': UserSerializer(request.user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Admin: User Management ─────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users_view(request):
    """Returns all users. Admin-only endpoint for user management panel."""
    if request.user.role != Role.ADMIN:
        return Response({'error': "Accès réservé à l'administrateur"}, status=status.HTTP_403_FORBIDDEN)

    users = CustomUser.objects.all().order_by('id')
    return Response(UserSerializer(users, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_view(request):
    """Creates a new user account. Admin-only."""
    if request.user.role != Role.ADMIN:
        return Response({'error': "Accès réservé à l'administrateur"}, status=status.HTTP_403_FORBIDDEN)

    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(
            {'message': 'Utilisateur créé', 'user': UserSerializer(user).data},
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Dropdown Lists (for ticket assignment, filtering) ──────

@api_view(['GET'])
@permission_classes([AllowAny])
def liste_agents_cc(request):
    """Returns all active Call Center agents. Used in ticket creation forms."""
    agents = CustomUser.objects.filter(role=Role.AGENT_CALL_CENTER).order_by('id')
    return Response(UserSerializer(agents, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def liste_ingenieurs(request):
    """Returns all network engineers. Used for ticket assignment dropdowns."""
    ingenieurs = CustomUser.objects.filter(role=Role.INGENIEUR_RESEAUX).order_by('id')
    return Response(UserSerializer(ingenieurs, many=True).data)


# ── Admin: Archive / Restore / Delete Users ────────────────

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def archive_user_view(request, code_user):
    """
    Soft-deletes a user by setting is_active=False.
    The user data stays in DB but can no longer log in.
    """
    if request.user.role != Role.ADMIN:
        return Response({'error': "Accès réservé à l'administrateur"}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = CustomUser.objects.get(code_user=code_user)
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response({'message': f'Utilisateur {user.code_user} archivé'})
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_user_view(request, code_user):
    """
    Admin endpoint to modify another user's info (name, email, role).
    """
    if request.user.role != Role.ADMIN:
        return Response({'error': "Accès réservé à l'administrateur"}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = CustomUser.objects.get(code_user=code_user)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)

    serializer = UpdateUserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': f'Utilisateur {code_user} mis à jour',
            'user': UserSerializer(user).data,
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def restore_user_view(request, code_user):
    """Restores an archived user by setting is_active=True."""
    if request.user.role != Role.ADMIN:
        return Response({'error': "Accès réservé à l'administrateur"}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = CustomUser.objects.get(code_user=code_user)
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response({
            'message': f'Utilisateur {user.code_user} restauré',
            'user': UserSerializer(user).data,
        })
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user_view(request, code_user):
    """
    Permanently deletes a user from the database.
    Prevents self-deletion for safety.
    """
    if request.user.role != Role.ADMIN:
        return Response({'error': "Accès réservé à l'administrateur"}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = CustomUser.objects.get(code_user=code_user)
        if user == request.user:
            return Response({'error': 'Vous ne pouvez pas vous supprimer vous-même'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({'message': f'Utilisateur {code_user} supprimé définitivement'})
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)
