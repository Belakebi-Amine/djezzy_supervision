# accounts/views.py
# ─────────────────────────────────────────────────────────────
# API views for user management: authentication (JWT), profile,
# password changes, and admin CRUD operations on users.
# ─────────────────────────────────────────────────────────────
import secrets
import string
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import logout
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser, Role
from .permissions import IsAdmin
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
    """Blacklists the refresh token so it can no longer be used."""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass
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
@permission_classes([IsAuthenticated, IsAdmin])
def list_users_view(request):
    """Returns filtered users. Admin-only endpoint for user management panel.
    Query params: ?role=, ?search=, ?is_active=, ?archived="""
    users = CustomUser.objects.all().order_by('id')

    role_filter = request.query_params.get('role')
    if role_filter:
        users = users.filter(role=role_filter)

    search = request.query_params.get('search', '').strip()
    if search:
        users = users.filter(
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(code_user__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search)
        )

    is_active = request.query_params.get('is_active')
    if is_active is not None:
        users = users.filter(is_active=is_active.lower() == 'true')

    archived = request.query_params.get('archived')
    if archived is not None:
        users = users.filter(is_archived=archived.lower() == 'true')

    return Response(UserSerializer(users, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def register_view(request):
    """Creates a new user account. Admin-only."""
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
@permission_classes([IsAuthenticated])
def liste_agents_cc(request):
    """Returns all active Call Center agents. Used in ticket creation forms."""
    agents = CustomUser.objects.filter(role=Role.AGENT_CALL_CENTER).order_by('id')
    return Response(UserSerializer(agents, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liste_ingenieurs(request):
    """Returns all network engineers. Used for ticket assignment dropdowns."""
    ingenieurs = CustomUser.objects.filter(role=Role.INGENIEUR_RESEAUX).order_by('id')
    return Response(UserSerializer(ingenieurs, many=True).data)


# ── Admin: Archive / Restore / Delete Users ────────────────

def _desassigner_tickets_non_resolus(user):
    """
    When a user's role changes or they are archived, unresolved tickets
    assigned to them are unassigned so other users can work on them.
    Only affects tickets with statut='ouvert'.
    Resolved tickets keep the assignment (historical record).
    """
    from reclamations.models import Reclamation, GroupeTicket

    Reclamation.objects.filter(assigne_a=user, statut='ouvert').update(assigne_a=None)
    GroupeTicket.objects.filter(assigne_a=user, statut='ouvert').update(assigne_a=None)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def archive_user_view(request, code_user):
    """
    Archives a user: sets is_archived=True AND is_active=False.
    Archive = deactivate + hide from list.
    Also desassigns unresolved tickets if user is an engineer.
    """
    try:
        user = CustomUser.objects.get(code_user=code_user)
        user.is_archived = True
        user.is_active = False
        user.save(update_fields=['is_archived', 'is_active'])
        _desassigner_tickets_non_resolus(user)
        return Response({'message': f'Utilisateur {user.code_user} archivé'})
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def toggle_active_view(request, code_user):
    """
    Toggles a user's is_active status.
    Inactive users stay visible in the list but can't log in.
    """
    try:
        user = CustomUser.objects.get(code_user=code_user)
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        status_text = 'activé' if user.is_active else 'désactivé'
        return Response({
            'message': f'Utilisateur {user.code_user} {status_text}',
            'is_active': user.is_active,
            'user': UserSerializer(user).data,
        })
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_user_view(request, code_user):
    """
    Admin endpoint to modify another user's info (name, email, role).
    When role changes, unresolved tickets are desassigned.
    """
    try:
        user = CustomUser.objects.get(code_user=code_user)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)

    old_role = user.role
    serializer = UpdateUserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        new_role = serializer.instance.role
        if old_role != new_role:
            _desassigner_tickets_non_resolus(user)
        return Response({
            'message': f'Utilisateur {code_user} mis à jour',
            'user': UserSerializer(user).data,
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def restore_user_view(request, code_user):
    """Restores an archived user: sets is_archived=False AND is_active=True."""
    try:
        user = CustomUser.objects.get(code_user=code_user)
        user.is_archived = False
        user.is_active = True
        user.save(update_fields=['is_archived', 'is_active'])
        return Response({
            'message': f'Utilisateur {user.code_user} restauré',
            'user': UserSerializer(user).data,
        })
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def delete_user_view(request, code_user):
    """
    Permanently deletes a user from the database.
    Prevents self-deletion for safety.
    """
    try:
        user = CustomUser.objects.get(code_user=code_user)
        if user == request.user:
            return Response({'error': 'Vous ne pouvez pas vous supprimer vous-même'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({'message': f'Utilisateur {code_user} supprimé définitivement'})
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)


# ── Admin: Reset Password ──────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def reinitialiser_mot_de_passe_view(request):
    """
    Admin resets a user's password by email.
    Generates a random temporary password and returns it.
    """
    email = request.data.get('email', '').strip()
    if not email:
        return Response({'error': 'Email requis'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = CustomUser.objects.get(email=email)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Aucun utilisateur trouvé avec cet email'}, status=status.HTTP_404_NOT_FOUND)

    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    user.set_password(temp_password)
    user.save(update_fields=['password'])

    return Response({
        'message': f'Mot de passe réinitialisé pour {user.code_user}',
        'nouveau_mot_de_passe': temp_password,
    })
