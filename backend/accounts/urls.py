# accounts/urls.py
# ─────────────────────────────────────────────────────────────
# URL routing for the accounts module. Maps endpoints to views
# for authentication, profile management, and admin user CRUD.
# All routes are prefixed with /api/accounts/ (set in config/urls.py)
# ─────────────────────────────────────────────────────────────
from django.urls import path
from .views import (
    CustomTokenObtainPairView,
    logout_view,
    me_view,
    change_password_view,
    update_profile_view,
    user_stats_view,
    list_users_view,
    register_view,
    archive_user_view,
    toggle_active_view,
    update_user_view,
    restore_user_view,
    delete_user_view,
    liste_agents_cc,
    liste_ingenieurs,
    reinitialiser_mot_de_passe_view,
    forgot_password_view,
)

urlpatterns = [
    # ── Auth ──
    path('logout/', logout_view, name='logout'),
    path('forgot-password/', forgot_password_view, name='forgot_password'),

    # ── Profile ──
    path('me/', me_view, name='me'),
    path('change-password/', change_password_view, name='change_password'),
    path('update-profile/', update_profile_view, name='update_profile'),

    # ── Dropdown lists (used in ticket forms and assignment) ──
    path('agents-cc/', liste_agents_cc, name='liste-agents-cc'),
    path('ingenieurs/', liste_ingenieurs, name='liste-ingenieurs'),

    # ── Admin: user management ──
    path('users/stats/', user_stats_view, name='user_stats'),
    path('users/', list_users_view, name='list_users'),
    path('users/register/', register_view, name='register_user'),
    path('users/<str:code_user>/', update_user_view, name='update_user'),
    path('users/<str:code_user>/archive/', archive_user_view, name='archive_user'),
    path('users/<str:code_user>/toggle-active/', toggle_active_view, name='toggle_active'),
    path('users/<str:code_user>/restore/', restore_user_view, name='restore_user'),
    path('users/<str:code_user>/delete/', delete_user_view, name='delete_user'),
    path('reset-password/', reinitialiser_mot_de_passe_view, name='reset_password'),
]
