from django.urls import path
from .views import (
    CustomTokenObtainPairView,
    logout_view,
    me_view,
    change_password_view,
    update_profile_view,
    list_users_view,
    register_view,
    archive_user_view,
    liste_agents_cc,
    liste_ingenieurs,
)

urlpatterns = [
    # On utilise maintenant la nouvelle vue JWT à la place de login_view
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # Le reste de tes routes reste identique
    path('logout/', logout_view, name='logout'),
    path('me/', me_view, name='me'),
    path('change-password/', change_password_view, name='change_password'),
    path('update-profile/', update_profile_view, name='update_profile'),
    
    # Routes pour les listes
    path('agents-cc/', liste_agents_cc, name='liste-agents-cc'),
    path('ingenieurs/', liste_ingenieurs, name='liste-ingenieurs'),
    
    # Routes Admin
    path('users/', list_users_view, name='list_users'),
    path('users/register/', register_view, name='register_user'),
    path('users/<int:pk>/archive/', archive_user_view, name='archive_user'),
]