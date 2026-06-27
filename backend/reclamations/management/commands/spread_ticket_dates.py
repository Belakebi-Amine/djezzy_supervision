"""
Management command to spread Reclamation tickets across the last 90 days
for realistic dashboard visualizations.

Usage:
    python manage.py spread_ticket_dates
    python manage.py spread_ticket_dates --days 180
    python manage.py spread_ticket_dates --dry-run
"""

import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from reclamations.models import Reclamation


class Command(BaseCommand):
    help = "Distribue les dates de création des tickets sur les N derniers jours"

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=90, help="Nombre de jours d'étalement (défaut: 90)")
        parser.add_argument('--dry-run', action='store_true', help="Affiche seulement ce qui serait modifié")

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        now = timezone.now()

        tickets = Reclamation.objects.all().order_by('id')
        total = tickets.count()

        if total == 0:
            self.stdout.write(self.style.WARNING("Aucun ticket à traiter."))
            return

        self.stdout.write(f"Étalement de {total} tickets sur {days} jours...")

        # Heures de pointe: plus de tickets entre 8h-12h et 14h-18h
        def random_hour():
            r = random.random()
            if r < 0.35:
                return random.randint(8, 12)
            elif r < 0.65:
                return random.randint(14, 18)
            elif r < 0.85:
                return random.randint(9, 17)
            else:
                return random.randint(0, 23)

        updated = 0
        for idx, ticket in enumerate(tickets):
            # Days ago: newer tickets get more recent dates
            days_ago = random.randint(0, max(1, days - 2))
            base_date = now - timedelta(days=days_ago)

            created_at = base_date.replace(
                hour=random_hour(),
                minute=random.randint(0, 59),
                second=random.randint(0, 59),
                microsecond=0,
            )

            resolu_le = None
            updated_at = created_at

            if ticket.statut and ticket.statut.lower() == 'resolu':
                # Resolution: 30min to 48h after creation
                delay_minutes = random.randint(30, 2880)
                resolu_le = created_at + timedelta(minutes=delay_minutes)
                updated_at = resolu_le
            elif ticket.statut and ticket.statut.lower() == 'ferme':
                # Ferme: resolved then closed a bit later
                delay_minutes = random.randint(30, 2880)
                resolu_le = created_at + timedelta(minutes=delay_minutes)
                updated_at = resolu_le

            if dry_run:
                self.stdout.write(f"  [{ticket.numero_ticket}] {ticket.created_at} -> {created_at}")
            else:
                ticket.created_at = created_at
                ticket.resolu_le = resolu_le
                ticket.updated_at = updated_at
                ticket.save(update_fields=['created_at', 'resolu_le', 'updated_at'])

            updated += 1

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"Dry-run: {updated} tickets seraient modifiés."))
        else:
            self.stdout.write(self.style.SUCCESS(f"{updated} tickets mis à jour avec succès."))
