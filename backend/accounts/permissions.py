# accounts/permissions.py
# ─────────────────────────────────────────────────────────────
# Custom DRF permission classes for role-based access control.
# Replaces fragile manual role checks in views.
# ─────────────────────────────────────────────────────────────
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to users with ADMIN role."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ADMIN'
        )


class IsAgentOrAdmin(BasePermission):
    """Allow access to call center agents and admins."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('ADMIN', 'AGENT_CALL_CENTER')


class IsEngineerOrAdmin(BasePermission):
    """Allow access to network engineers and admins."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('ADMIN', 'INGENIEUR_RESEAUX')


class IsAdminEngineerOrSupervisor(BasePermission):
    """Allow access to admins, engineers, and supervisors."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('ADMIN', 'INGENIEUR_RESEAUX', 'SUPERVISEUR')
