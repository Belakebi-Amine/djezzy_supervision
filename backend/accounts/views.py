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

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            from audit_log.models import ActivityLog
            user_data = response.data
            code = user_data.get('code_user', '')
            ActivityLog.log('login', user=self._get_user_from_token(code), ip=self._get_ip(request))
        else:
            from audit_log.models import ActivityLog
            ActivityLog.log('login_failed', details={'email': request.data.get('email', '')}, ip=self._get_ip(request))
        return response

    def _get_user_from_token(self, code):
        try:
            return CustomUser.objects.get(code_user=code)
        except CustomUser.DoesNotExist:
            return None

    @staticmethod
    def _get_ip(request):
        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
        return ip or request.META.get('REMOTE_ADDR', '')


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
    from audit_log.models import ActivityLog
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
    ActivityLog.log('logout', user=request.user, ip=ip)
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
        from audit_log.models import ActivityLog
        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
        ActivityLog.log('update_user', user=request.user, details={'code': request.user.code_user, 'champs': list(request.data.keys())}, ip=ip)
        return Response({
            'message': 'Profil mis à jour',
            'user': UserSerializer(request.user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Admin: User Management ─────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def user_stats_view(request):
    """
    Admin-only endpoint returning user management KPIs:
    - System health: active/inactive/dormant/never-connected users
    - Workload: tickets per engineer, resolution rates
    - Per-user breakdown with last login + active tickets
    """
    from django.utils import timezone
    from django.db.models import Count, Q, Max
    from datetime import timedelta
    from reclamations.models import GroupeTicket

    now = timezone.now()
    h24 = now - timedelta(hours=24)
    j30 = now - timedelta(days=30)

    all_users = CustomUser.objects.all()
    visible_users = all_users.filter(is_archived=False)

    # ── System health ──
    actifs = visible_users.filter(is_active=True).count()
    inactifs = visible_users.filter(is_active=False).count()
    archived = all_users.filter(is_archived=True).count()
    total = all_users.count()

    never_connected = all_users.filter(last_login__isnull=True, is_archived=False).count()
    connected_24h = all_users.filter(last_login__gte=h24).count()
    dormant_30j = all_users.filter(
        is_active=True, is_archived=False,
        last_login__lt=j30
    ).count()
    most_recent = all_users.filter(last_login__isnull=False).aggregate(Max('last_login'))['last_login__max']

    # ── Workload ──
    all_tickets_assignes = GroupeTicket.objects.filter(assigne_a__isnull=False).count()
    tickets_non_resolus = GroupeTicket.objects.filter(assigne_a__isnull=False, statut='ouvert').count()
    tickets_resolus = GroupeTicket.objects.filter(assigne_a__isnull=False, statut='resolu').count()
    tickets_total = tickets_resolus + tickets_non_resolus
    taux_resolution = round((tickets_resolus / tickets_total) * 100, 1) if tickets_total > 0 else 0.0

    # Per engineer workload
    ingenieurs = CustomUser.objects.filter(role='INGENIEUR_RESEAUX', is_active=True)
    charge_per_eng = []
    for ing in ingenieurs:
        n = GroupeTicket.objects.filter(assigne_a=ing).count()
        charge_per_eng.append(n)

    max_charge = max(charge_per_eng) if charge_per_eng else 0
    min_charge = min(charge_per_eng) if charge_per_eng else 0
    avg_charge = round(sum(charge_per_eng) / len(charge_per_eng), 1) if charge_per_eng else 0
    total_agents_cc = CustomUser.objects.filter(role='AGENT_CALL_CENTER', is_active=True).count()

    # ── Per user breakdown ──
    per_user = []
    for u in visible_users.filter(is_active=True).select_related().order_by('code_user'):
        tickets_actifs = 0
        tickets_total_u = 0
        taux_u = 0.0

        if u.role == 'INGENIEUR_RESEAUX':
            tickets_total_u = GroupeTicket.objects.filter(assigne_a=u).count()
            resolus_u = GroupeTicket.objects.filter(assigne_a=u, statut='resolu').count()
            tickets_actifs = GroupeTicket.objects.filter(assigne_a=u, statut='ouvert').count()
            taux_u = round((resolus_u / tickets_total_u) * 100, 1) if tickets_total_u > 0 else 0.0
        elif u.role == 'AGENT_CALL_CENTER':
            from reclamations.models import Reclamation
            tickets_total_u = Reclamation.objects.filter(cree_par=u).count()
            resolus_u = Reclamation.objects.filter(cree_par=u, statut='resolu').count()
            tickets_actifs = Reclamation.objects.filter(cree_par=u, statut='ouvert').count()
            taux_u = round((resolus_u / tickets_total_u) * 100, 1) if tickets_total_u > 0 else 0.0

        per_user.append({
            'code_user': u.code_user,
            'nom': u.get_full_name().strip() or u.code_user,
            'role': u.role,
            'tickets_actifs': tickets_actifs,
            'tickets_total': tickets_total_u,
            'taux_resolution': taux_u,
            'derniere_connexion': u.last_login,
            'jamais_connecte': u.last_login is None,
        })

    return Response({
        'utilisateurs': {
            'total': total,
            'actifs': actifs,
            'inactifs': inactifs,
            'archives': archived,
            'never_connected': never_connected,
            'connected_24h': connected_24h,
            'dormant_30j': dormant_30j,
            'most_recent_login': most_recent,
        },
        'workload': {
            'total_tickets_assignes': all_tickets_assignes,
            'tickets_non_resolus': tickets_non_resolus,
            'taux_resolution_global': taux_resolution,
            'max_charge_ingenieur': max_charge,
            'min_charge_ingenieur': min_charge,
            'charge_moyenne_ingenieur': avg_charge,
            'total_agents_cc': total_agents_cc,
        },
        'per_user': per_user,
    })


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
    """Creates a new user account. Admin-only. Admins cannot create other admins."""
    target_role = request.data.get('role', '')
    if target_role == 'ADMIN' and request.user.role == 'ADMIN':
        return Response(
            {'error': 'Les administrateurs ne peuvent pas créer d\'autres administrateurs.'},
            status=status.HTTP_403_FORBIDDEN
        )
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        from audit_log.models import ActivityLog
        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
        ActivityLog.log('create_user', user=request.user, details={'code': user.code_user, 'role': user.role}, ip=ip)
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
        from audit_log.models import ActivityLog
        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
        ActivityLog.log('archive_user', user=request.user, details={'code': code_user}, ip=ip)
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
        from audit_log.models import ActivityLog
        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
        ActivityLog.log('toggle_user', user=request.user, details={'code': code_user, 'action': status_text}, ip=ip)
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
        from audit_log.models import ActivityLog
        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
        ActivityLog.log('update_user', user=request.user, details={'code': code_user, 'champs': list(request.data.keys())}, ip=ip)
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
        from audit_log.models import ActivityLog
        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
        ActivityLog.log('restore_user', user=request.user, details={'code': code_user}, ip=ip)
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
        from audit_log.models import ActivityLog
        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
        user.delete()
        ActivityLog.log('delete_user', user=request.user, details={'code': code_user}, ip=ip)
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

    from audit_log.models import ActivityLog
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
    ActivityLog.log('reset_password', user=request.user, details={'code': user.code_user}, ip=ip)

    return Response({
        'message': f'Mot de passe réinitialisé pour {user.code_user}',
        'nouveau_mot_de_passe': temp_password,
    })


