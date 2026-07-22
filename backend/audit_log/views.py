"""Vues de l'API pour le journal d'audit et la santé du système."""

import time
import platform
import sys
import os
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from accounts.models import CustomUser, Role
from reclamations.models import Reclamation, GroupeTicket
from sites_reseau.models import SiteReseau
from dashboard.models import RapportIA
from .models import ActivityLog


# Store server start time at module load
SERVER_START = timezone.now()


# ── Endpoint de santé du système ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_health(request):
    """Retourne les métriques de santé du serveur (latence DB, uptime, etc.)."""
    if request.user.role != 'ADMIN':
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    # DB response time
    t0 = time.time()
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    db_latency_ms = round((time.time() - t0) * 1000, 1)

    # DB size
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_size_pretty(pg_database_size(current_database()))")
        db_size = cursor.fetchone()[0]

    # Table count (project models only)
    from django.apps import apps
    PROJECT_APPS = ['accounts', 'reclamations', 'sites_reseau', 'audit_log', 'dashboard']
    table_count = sum(
        1 for model in apps.get_models()
        if model._meta.app_label in PROJECT_APPS and not model._meta.proxy
    )

    # Uptime
    now = timezone.now()
    uptime_delta = now - SERVER_START
    hours = int(uptime_delta.total_seconds() // 3600)
    minutes = int((uptime_delta.total_seconds() % 3600) // 60)
    uptime_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"

    # Active users (logged in within last 5 minutes)
    five_min_ago = now - timedelta(minutes=5)
    active_users = CustomUser.objects.filter(
        is_active=True, last_login__gte=five_min_ago
    ).count()

    # Total users and active (non-archived) users
    total_users = CustomUser.objects.count()
    active_users_count = CustomUser.objects.filter(is_archived=False, is_active=True).count()

    # Users online today (logged in today)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    online_today = CustomUser.objects.filter(
        is_active=True, last_login__gte=today_start
    ).count()

    # Today's actions
    today_actions = ActivityLog.objects.filter(created_at__gte=today_start).count()

    # Today's errors (failed logins)
    today_errors = ActivityLog.objects.filter(
        created_at__gte=today_start, action='login_failed'
    ).count()

    # Network status
    sites_stats = SiteReseau.objects.aggregate(
        total=Count('id'),
        up=Count('id', filter=Q(statut='UP')),
        down=Count('id', filter=Q(statut='DOWN')),
        degrade=Count('id', filter=Q(statut='DEGRADE')),
        perturbe=Count('id', filter=Q(statut='PERTURBE')),
    )

    # Ticket summary (GroupeTicket = consolidated tickets)
    ticket_stats = GroupeTicket.objects.aggregate(
        total=Count('id'),
        ouverts=Count('id', filter=Q(statut__iexact='ouvert')),
        resolus=Count('id', filter=Q(statut__iexact='resolu')),
        fermes=Count('id', filter=Q(statut__iexact='ferme')),
    )
    total_t = ticket_stats['total']
    resolus_t = ticket_stats['resolus']
    taux_resolution = round((resolus_t / total_t) * 100, 1) if total_t > 0 else 0.0

    # Unassigned open tickets (need attention)
    ouverts_non_assignes = GroupeTicket.objects.filter(
        statut__iexact='ouvert', assigne_a__isnull=True
    ).count()

    return Response({
        'uptime': uptime_str,
        'server_start': SERVER_START.isoformat(),
        'db_latency_ms': db_latency_ms,
        'db_size': db_size,
        'table_count': table_count,
        'active_users': active_users,
        'online_today': online_today,
        'total_users': total_users,
        'active_users_count': active_users_count,
        'today_actions': today_actions,
        'today_errors': today_errors,
        'reseau': {
            'total': sites_stats['total'],
            'up': sites_stats['up'],
            'down': sites_stats['down'],
            'degrade': sites_stats['degrade'],
            'perturbe': sites_stats['perturbe'],
        },
        'tickets': {
            'total': total_t,
            'ouverts': ticket_stats['ouverts'],
            'resolus': resolus_t,
            'fermes': ticket_stats['fermes'],
            'taux_resolution': f"{taux_resolution}%",
            'ouverts_non_assignes': ouverts_non_assignes,
        },
    })


# ── Endpoint des journaux d'audit ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_logs(request):
    """Liste les journaux d'audit avec filtres et pagination."""
    if request.user.role != 'ADMIN':
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    qs = ActivityLog.objects.select_related('user')

    # Filters
    action = request.query_params.get('action')
    if action:
        qs = qs.filter(action=action)

    user_code = request.query_params.get('user')
    if user_code:
        qs = qs.filter(user_code__icontains=user_code)

    user_role = request.query_params.get('user_role')
    if user_role:
        qs = qs.filter(user_role=user_role)

    date_from = request.query_params.get('date_from')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)

    date_to = request.query_params.get('date_to')
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(user_code__icontains=search) |
            Q(user_name__icontains=search) |
            Q(user_role__icontains=search) |
            Q(action__icontains=search) |
            Q(details__icontains=search)
        )

    # Pagination
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 50))
    total = qs.count()
    offset = (page - 1) * page_size
    logs = qs[offset:offset + page_size]

    return Response({
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size,
        'results': [
            {
                'id': log.id,
                'user_code': log.user_code,
                'user_name': log.user_name,
                'user_role': log.user_role,
                'action': log.action,
                'action_display': log.get_action_display(),
                'details': log.details,
                'ip_address': log.ip_address,
                'created_at': log.created_at.isoformat(),
            }
            for log in logs
        ],
    })


# ── Statistiques d'audit ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_stats(request):
    """Retourne les statistiques d'audit : actions par jour, top utilisateurs, etc."""
    if request.user.role != 'ADMIN':
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    now = timezone.now()

    # Parse the day range parameter (default: 7 days)
    jours_param = request.query_params.get('jours', '7')
    try:
        nb_jours = int(jours_param)
    except ValueError:
        nb_jours = 7
    nb_jours = max(1, min(nb_jours, 3650))

    date_limite = now - timedelta(days=nb_jours)

    # Actions per day over selected period
    daily_counts_raw = (
        ActivityLog.objects.filter(created_at__gte=date_limite)
        .values('created_at__date')
        .annotate(count=Count('id'))
        .order_by('created_at__date')
    )
    daily_counts = {str(d['created_at__date']): d['count'] for d in daily_counts_raw}

    # Build complete series
    daily_series = []
    for i in range(nb_jours - 1, -1, -1):
        d = (now - timedelta(days=i)).date()
        daily_series.append({
            'date': str(d),
            'count': daily_counts.get(str(d), 0),
        })

    # Top 5 most active users (same period)
    top_users = (
        ActivityLog.objects.filter(created_at__gte=date_limite, user_code__gt='')
        .values('user_code', 'user_name', 'user_role')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )

    # Action type distribution (same period)
    action_dist = (
        ActivityLog.objects.filter(created_at__gte=date_limite)
        .values('action')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    return Response({
        'daily_actions': daily_series,
        'top_users': list(top_users),
        'action_distribution': list(action_dist),
    })


# ── Seed command to populate sample audit data ──
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def seed_audit_data(request):
    """Génère des journaux d'audit de démonstration (admin uniquement)."""
    if request.user.role != 'ADMIN':
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

    from backend.accounts.models import CustomUser
    users = list(CustomUser.objects.filter(is_active=True))
    if not users:
        return Response({'error': 'Aucun utilisateur trouvé.'}, status=status.HTTP_400_BAD_REQUEST)

    import random
    now = timezone.now()

    actions = [
        'login', 'logout', 'create_ticket', 'update_ticket',
        'archive_ticket', 'create_user', 'update_user', 'archive_user',
        'toggle_user', 'create_site', 'update_site', 'archive_site',
        'toggle_site', 'generate_rapport', 'save_rapport', 'resolve_ticket',
        'assign_ticket',
    ]

    action_details = {
        'login': lambda u: {'method': 'JWT'},
        'logout': lambda u: {},
        'create_ticket': lambda u: {'numero': f'R{random.randint(1000,9999)}', 'client': f'Client-{random.randint(1,200)}'},
        'update_ticket': lambda u: {'numero': f'R{random.randint(1000,9999)}', 'champ': random.choice(['statut', 'priorite', 'assigne_a'])},
        'archive_ticket': lambda u: {'numero': f'R{random.randint(1000,9999)}'},
        'create_user': lambda u: {'code': f'U{random.randint(100,999)}', 'role': random.choice(['AGENT_CALL_CENTER', 'INGENIEUR_RESEAUX', 'SUPERVISEUR'])},
        'update_user': lambda u: {'code': f'U{random.randint(100,999)}', 'champ': random.choice(['email', 'role', 'first_name'])},
        'archive_user': lambda u: {'code': f'U{random.randint(100,999)}'},
        'toggle_user': lambda u: {'code': f'U{random.randint(100,999)}', 'action': random.choice(['activation', 'désactivation'])},
        'create_site': lambda u: {'code': f'S{random.randint(1000,9999)}', 'nom': f'Site-{random.randint(1,50)}'},
        'update_site': lambda u: {'code': f'S{random.randint(1000,9999)}'},
        'archive_site': lambda u: {'code': f'S{random.randint(1000,9999)}'},
        'toggle_site': lambda u: {'code': f'S{random.randint(1000,9999)}', 'de': random.choice(['UP', 'DOWN']), 'vers': random.choice(['DOWN', 'UP'])},
        'generate_rapport': lambda u: {'titre': f'Rapport-{random.randint(1,30)}'},
        'save_rapport': lambda u: {'titre': f'Rapport-{random.randint(1,30)}'},
        'resolve_ticket': lambda u: {'numero': f'GT{random.randint(1000,9999)}'},
        'assign_ticket': lambda u: {'numero': f'GT{random.randint(1000,9999)}', 'a': f'U{random.randint(100,999)}'},
    }

    created = 0
    for day_offset in range(30, -1, -1):
        day = now - timedelta(days=day_offset)
        num_actions = random.randint(8, 25)
        for _ in range(num_actions):
            user = random.choice(users)
            action = random.choice(actions)
            hour = random.randint(7, 19)
            minute = random.randint(0, 59)
            ts = day.replace(hour=hour, minute=minute, second=random.randint(0, 59), microsecond=0)

            ActivityLog.objects.create(
                user=user,
                user_code=user.code_user,
                user_name=user.nom_user or user.get_full_name(),
                user_role=user.role,
                action=action,
                details=action_details.get(action, lambda u: {})(user),
                ip_address=f'192.168.1.{random.randint(1,254)}',
                created_at=ts,
            )
            created += 1

    return Response({'message': f'{created} journaux d\'audit créés.', 'count': created})
