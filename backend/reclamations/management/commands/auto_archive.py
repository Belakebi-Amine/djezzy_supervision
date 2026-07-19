"""
Auto-archive management command.

Rules:
- Reclamations: archived 1 month after resolution (resolu_le)
- GroupeTickets: archived 1 month after resolution (resolu_le)
- Rapports IA: archived 3 months after creation (created_at)

Usage:
    python manage.py auto_archive
    python manage.py auto_archive --dry-run
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Archive automatiquement les reclamations (>1 mois) et rapports IA (>3 mois)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche ce qui serait archive sans rien modifier',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()
        archived_count = {'reclamations': 0, 'groupes': 0, 'rapports': 0}

        # -- 1. Reclamations: archive if resolved > 1 month ago --
        from reclamations.models import Reclamation, GroupeTicket
        one_month_ago = now - timedelta(days=30)
        old_resolved = Reclamation.objects.filter(
            is_archived=False,
            statut__in=['resolu', 'ferme'],
            resolu_le__isnull=False,
            resolu_le__lte=one_month_ago,
        )
        count_r = old_resolved.count()
        if not dry_run and count_r > 0:
            old_resolved.update(
                is_archived=True,
                archived_at=timezone.now(),
            )
        archived_count['reclamations'] = count_r

        # -- 2. GroupeTickets: archive if resolved/closed > 1 month ago --
        old_groupes = GroupeTicket.objects.filter(
            is_archived=False,
            statut__in=['resolu', 'ferme'],
            resolu_le__isnull=False,
            resolu_le__lte=one_month_ago,
        )
        count_g = old_groupes.count()
        if not dry_run and count_g > 0:
            old_groupes.update(
                is_archived=True,
                archived_at=timezone.now(),
            )
        archived_count['groupes'] = count_g

        # -- 3. Rapports IA: archive if created > 3 months ago --
        from dashboard.models import RapportIA
        three_months_ago = now - timedelta(days=90)
        old_reports = RapportIA.objects.filter(
            is_archived=False,
            created_at__lte=three_months_ago,
        )
        count_p = old_reports.count()
        if not dry_run and count_p > 0:
            old_reports.update(
                is_archived=True,
                archived_at=timezone.now(),
            )
        archived_count['rapports'] = count_p

        # -- Output --
        mode = 'DRY-RUN' if dry_run else 'EXECUTE'
        self.stdout.write(self.style.WARNING(f'\n[{mode}] Archivage automatique'))
        self.stdout.write(f'  Reclamations archivees (>1 mois apres resolution) : {archived_count["reclamations"]}')
        self.stdout.write(f'  GroupeTickets archives (>1 mois apres resolution)  : {archived_count["groupes"]}')
        self.stdout.write(f'  Rapports IA archives (>3 mois apres creation)      : {archived_count["rapports"]}')
        total = sum(archived_count.values())
        self.stdout.write(self.style.SUCCESS(f'  Total : {total}\n'))
