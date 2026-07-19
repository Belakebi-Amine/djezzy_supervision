"""Commande de seeding pour générer des journaux d'audit réalistes.

Crée des entrées d'audit sur 30 jours, basées sur les rôles
des utilisateurs actifs avec des actions pondérées.
"""
import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


ROLE_ACTIONS = {
    'ADMIN': [
        ('login', 5), ('logout', 5),
        ('create_user', 3), ('update_user', 3),
        ('archive_user', 1), ('toggle_user', 2), ('restore_user', 1), ('reset_password', 1),
        ('create_site', 1), ('update_site', 1), ('delete_user', 1),
    ],
    'SUPERVISEUR': [
        ('login', 5), ('logout', 5),
        ('assign_ticket', 3), ('generate_rapport', 2), ('save_rapport', 2),
        ('update_ticket', 2), ('resolve_ticket', 1), ('delete_rapport', 1), ('restore_rapport', 1),
    ],
    'INGENIEUR_RESEAUX': [
        ('login', 5), ('logout', 5),
        ('resolve_ticket', 4), ('update_ticket', 3), ('update_site', 2), ('toggle_site', 1),
    ],
    'AGENT_CALL_CENTER': [
        ('login', 5), ('logout', 5),
        ('create_ticket', 5), ('update_ticket', 3),
    ],
}

SYSTEM_ACTIONS = [
    ('archive_ticket', 4),
    ('toggle_site', 2),
    ('update_ticket', 1),
]


def _weighted_choice(pool):
    """Choisit un élément au hasard selon des poids donnés."""
    total = sum(w for _, w in pool)
    r = random.uniform(0, total)
    acc = 0
    for item, w in pool:
        acc += w
        if r <= acc:
            return item
    return pool[-1][0]


class Command(BaseCommand):
    """Commande de seeding : crée des journaux d'audit réalistes sur 30 jours."""
    help = 'Seed realistic audit log data based on user roles'

    def handle(self, *args, **options):
        from audit_log.models import ActivityLog
        from accounts.models import CustomUser

        users = list(CustomUser.objects.filter(is_active=True))
        if not users:
            self.stderr.write('No active users found.')
            return

        ActivityLog.objects.all().delete()

        role_users = {}
        for u in users:
            role_users.setdefault(u.role, []).append(u)

        now = timezone.now()
        logs = []

        for day_offset in range(30, -1, -1):
            day = now - timedelta(days=day_offset)
            is_weekend = day.weekday() >= 5

            for role, pool in ROLE_ACTIONS.items():
                role_user_list = role_users.get(role, [])
                if not role_user_list:
                    continue
                num_actions = random.randint(1, 6) if is_weekend else random.randint(3, 10)
                for _ in range(num_actions):
                    user = random.choice(role_user_list)
                    action = _weighted_choice(pool)
                    hour = random.randint(8, 17) if is_weekend else random.randint(7, 19)
                    minute = random.randint(0, 59)
                    ts = day.replace(hour=hour, minute=minute, second=random.randint(0, 59), microsecond=0)
                    logs.append(ActivityLog(
                        user=user,
                        user_code=user.code_user,
                        user_name=user.nom_user or user.get_full_name(),
                        user_role=user.role,
                        action=action,
                        details=_action_detail(action, user),
                        ip_address=f'192.168.1.{random.randint(1, 254)}',
                        created_at=ts,
                    ))

            num_system = random.randint(1, 3) if is_weekend else random.randint(1, 5)
            for _ in range(num_system):
                action = _weighted_choice(SYSTEM_ACTIONS)
                hour = random.randint(0, 23)
                minute = random.randint(0, 59)
                ts = day.replace(hour=hour, minute=minute, second=random.randint(0, 59), microsecond=0)
                logs.append(ActivityLog(
                    user=None,
                    user_code='SYS',
                    user_name='Système',
                    user_role='SYSTEM',
                    action=action,
                    details=_action_detail(action, None),
                    ip_address='127.0.0.1',
                    created_at=ts,
                ))

        ActivityLog.objects.bulk_create(logs, batch_size=500)
        self.stdout.write(self.style.SUCCESS(f'{len(logs)} realistic audit logs created.'))


def _action_detail(action, user):
    """Génère les détails JSON d'une action d'audit spécifique."""
    code = getattr(user, 'code_user', 'SYS') if user else 'SYS'
    name = getattr(user, 'nom_user', '') if user else 'Système'
    details_map = {
        'login': {'method': 'JWT', 'utilisateur': name},
        'logout': {'utilisateur': name},
        'login_failed': {'email': f'{code.lower()}@djezzy.dz'},
        'create_ticket': {'numero': f'R{random.randint(1000, 9999)}', 'client': f'Client-{random.randint(1, 200)}'},
        'update_ticket': {'numero': f'R{random.randint(1000, 9999)}', 'champ': random.choice(['statut', 'priorite', 'description'])},
        'archive_ticket': {'numero': f'R{random.randint(1000, 9999)}', 'raison': 'Automatique (>30j résolu)'},
        'restore_ticket': {'numero': f'R{random.randint(1000, 9999)}'},
        'resolve_ticket': {'numero': f'R{random.randint(1000, 9999)}', 'duree_min': random.randint(15, 480)},
        'assign_ticket': {'numero': f'R{random.randint(1000, 9999)}', 'a': f'U{random.randint(100, 999)}'},
        'create_user': {'code': f'U{random.randint(100, 999)}', 'role': random.choice(['AGENT_CALL_CENTER', 'INGENIEUR_RESEAUX', 'SUPERVISEUR'])},
        'update_user': {'code': f'U{random.randint(100, 999)}', 'champ': random.choice(['email', 'role', 'nom'])},
        'archive_user': {'code': f'U{random.randint(100, 999)}'},
        'toggle_user': {'code': f'U{random.randint(100, 999)}', 'action': random.choice(['activation', 'désactivation'])},
        'restore_user': {'code': f'U{random.randint(100, 999)}'},
        'delete_user': {'code': f'U{random.randint(100, 999)}'},
        'reset_password': {'code': f'U{random.randint(100, 999)}'},
        'create_site': {'code': f'S{random.randint(1000, 9999)}', 'nom': f'Site-{random.randint(1, 50)}'},
        'update_site': {'code': f'S{random.randint(1000, 9999)}'},
        'archive_site': {'code': f'S{random.randint(1000, 9999)}'},
        'restore_site': {'code': f'S{random.randint(1000, 9999)}'},
        'delete_site': {'code': f'S{random.randint(1000, 9999)}'},
        'toggle_site': {'code': f'S{random.randint(1000, 9999)}', 'de': random.choice(['UP', 'DOWN']), 'vers': random.choice(['DOWN', 'UP'])},
        'generate_rapport': {'titre': f'Rapport-{random.randint(1, 30)}'},
        'save_rapport': {'titre': f'Rapport-{random.randint(1, 30)}'},
        'delete_rapport': {'titre': f'Rapport-{random.randint(1, 30)}'},
        'restore_rapport': {'titre': f'Rapport-{random.randint(1, 30)}'},
    }
    return details_map.get(action, {})
