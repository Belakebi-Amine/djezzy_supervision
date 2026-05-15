# accounts/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # --- MÉTHODES DE L'UTILISATEUR (Diagramme de Classes) ---
    
    # J'utilise directement le nom de ma fonction définie dans views.py
    path('login/', views.login_view, name='login'),
    
    path('logout/', views.logout_view, name='logout'),
    
    path('me/', views.me_view, name='me'),
    
    path('change-password/', views.change_password_view, name='change-password'),
    
    path('update-profile/', views.update_profile_view, name='update-profile'),

    # --- ACTIONS DE L'ADMIN (Use Case Admin) ---
    
    path('users/', views.list_users_view, name='list-users'),
    
    path('users/register/', views.register_view, name='register'),
    
    path('users/<int:pk>/archive/', views.archive_user_view, name='archive-user'),
]