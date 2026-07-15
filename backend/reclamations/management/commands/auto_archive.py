"""
Auto-archive management command.

Rules:
- Réclamations: archived 1 month after resolution (resolu_le)
- Rapports IA: archived 6 months after creation (created_at)

Usage:
    python manage.py auto_archive
    python manage.py auto_archive --dry-run
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Archive automatiquement les réclamations (>1 mois après résolution) et rapports IA (>3 mois)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche ce qui serait archivé sans rien modifier',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()
        archived_count = {'reclamations': 0, 'rapports': 0}

        # ── 1. Réclamations: archive if resolved > 1 month ago ──
        from reclamations.models import Reclamation
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

        # ── 2. Rapports IA: archive if created > 6 months ago ──
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

        # ── Output ──
        mode = 'DRY-RUN' if dry_run else 'EXÉCUTÉ'
        self.stdout.write(self.style.WARNING(f'\n[{mode}] Archivage automatique'))
        self.stdout.write(f'  Réclamations archivées (>1 mois après résolution) : {archived_count["reclamations"]}')
        self.stdout.write(f'  Rapports IA archivés (>3 mois après création)   : {archived_count["rapports"]}')
        self.stdout.write(self.style.SUCCESS(f'  Total : {archived_count["reclamations"] + archived_count["rapports"]}\n'))
