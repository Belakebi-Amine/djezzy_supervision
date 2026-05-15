from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout

from .models import CustomUser, Role
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    UpdateProfileSerializer,
)

# ── sAuthentifier() ───────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Ici, j'implémente ma méthode sAuthentifier(). 
    Je vérifie les accès et je connecte l'utilisateur à la session.
    """
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(request, username=username, password=password)

    if user is not None:
        login(request, user)
        return Response({
            'message': 'Connexion réussie',
            'user': UserSerializer(user).data
        })
    return Response(
        {'error': "Nom d'utilisateur ou mot de passe incorrect"},
        status=status.HTTP_400_BAD_REQUEST
    )

# ── deconnecter() ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Correspond à : deconnecter() dans mon diagramme de classes."""
    logout(request)
    return Response({'message': 'Déconnexion réussie'})

# ── Profil courant (me_view) ──────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    Cette vue me permet de retourner les infos de l'utilisateur connecté.
    C'est essentiel pour mon Front-end pour savoir qui est logué.
    """
    return Response(UserSerializer(request.user).data)

# ── modifierMotDePasse(ancien, nouveau) ───────────────────────

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    Je fais appel à la méthode modifierMotDePasse() que j'ai créée 
    dans mon modèle CustomUser.
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

# ── mettreAJourProfil(data) ───────────────────────────────────

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """
    J'utilise ici ma méthode mettreAJourProfil(data) pour mettre à jour 
    les informations de l'utilisateur connecté.
    """
    serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        request.user.mettreAJourProfil(serializer.validated_data)
        return Response({
            'message': 'Profil mis à jour',
            'user': UserSerializer(request.user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ── Admin : gestion des utilisateurs ─────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users_view(request):
    """
    Ici, j'implémente la liste des utilisateurs pour mon Admin.
    """
    if request.user.role != Role.ADMIN:
        return Response({'error': 'Accès réservé à l\'administrateur'}, status=status.HTTP_403_FORBIDDEN)
    
    users = CustomUser.objects.all().order_by('id')
    return Response(UserSerializer(users, many=True).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_view(request):
    """
    Ici, j'implémente 'creerUtilisateur(data)' de l'Admin.
    """
    if request.user.role != Role.ADMIN:
        return Response({'error': 'Accès réservé à l\'administrateur'}, status=status.HTTP_403_FORBIDDEN)

    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(
            {'message': 'Utilisateur créé', 'user': UserSerializer(user).data},
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def archive_user_view(request, pk):
    """
    Action 'archiverUtilisateur(id)' de mon Use Case Admin.
    """
    if request.user.role != Role.ADMIN:
        return Response({'error': 'Accès réservé à l\'administrateur'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = CustomUser.objects.get(pk=pk)
        user.is_active = False 
        user.save(update_fields=['is_active'])
        return Response({'message': f'Utilisateur {user.username} archivé'})
    except CustomUser.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)