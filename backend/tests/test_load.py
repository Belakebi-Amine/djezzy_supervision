"""Tests de charge pour mesurer les performances des endpoints API."""

import time
import statistics
from django.test import TransactionTestCase, Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from reclamations.models import Reclamation

User = get_user_model()


class LoadTestLoginBurst(TransactionTestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com',
            password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )

    def test_login_burst(self):
        durations = []
        successes = 0
        total = 20

        for _ in range(total):
            c = Client()
            start = time.time()
            resp = c.post('/api/token/', {
                'email': 'admin@test.com', 'password': 'TestPass123!'
            }, content_type='application/json')
            dur = (time.time() - start) * 1000
            durations.append(dur)
            if resp.status_code == 200:
                successes += 1

        self._result = {
            'name': 'Login Burst (20 requetes sequentielles)',
            'total': total,
            'success': successes,
            'success_rate': f"{(successes / total * 100):.1f}%",
            'avg_ms': round(statistics.mean(durations), 1),
            'p50_ms': round(statistics.median(durations), 1),
            'p95_ms': round(sorted(durations)[int(len(durations) * 0.95)], 1),
            'max_ms': round(max(durations), 1),
        }
        self.assertGreater(successes, 0)


class LoadTestReadTickets(TransactionTestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com',
            password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        for i in range(20):
            Reclamation.objects.create(
                nom_client=f'Client {i}',
                telephone_client=f'055{i:07d}',
                statut='ouvert', priorite='normale', cree_par=self.admin,
            )

    def test_read_tickets(self):
        token = str(AccessToken.for_user(self.admin))
        durations = []
        successes = 0
        total = 30

        for _ in range(total):
            c = Client()
            start = time.time()
            resp = c.get('/api/reclamations/',
                         HTTP_AUTHORIZATION=f'Bearer {token}')
            dur = (time.time() - start) * 1000
            durations.append(dur)
            if resp.status_code == 200:
                successes += 1

        self._result = {
            'name': 'Lecture Tickets (30 requetes, 20 tickets en base)',
            'total': total,
            'success': successes,
            'success_rate': f"{(successes / total * 100):.1f}%",
            'avg_ms': round(statistics.mean(durations), 1),
            'p50_ms': round(statistics.median(durations), 1),
            'p95_ms': round(sorted(durations)[int(len(durations) * 0.95)], 1),
            'max_ms': round(max(durations), 1),
        }
        self.assertGreater(successes, 0)


class LoadTestWriteReclamations(TransactionTestCase):
    def setUp(self):
        self.agent = User.objects.create_user(
            username='agent@test.com', email='agent@test.com',
            password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )

    def test_write_reclamations(self):
        token = str(AccessToken.for_user(self.agent))
        durations = []
        successes = 0
        total = 20

        for i in range(total):
            c = Client()
            start = time.time()
            resp = c.post('/api/reclamations/creer/', {
                'nom_client': f'Load Client {i}',
                'telephone_client': f'055{i:07d}',
                'type_client': 'particulier',
            }, content_type='application/json',
                HTTP_AUTHORIZATION=f'Bearer {token}')
            dur = (time.time() - start) * 1000
            durations.append(dur)
            if resp.status_code in (200, 201):
                successes += 1

        self._result = {
            'name': 'Ecriture Reclamations (20 requetes sequentielles)',
            'total': total,
            'success': successes,
            'success_rate': f"{(successes / total * 100):.1f}%",
            'avg_ms': round(statistics.mean(durations), 1),
            'p50_ms': round(statistics.median(durations), 1),
            'p95_ms': round(sorted(durations)[int(len(durations) * 0.95)], 1) if len(durations) > 1 else 0,
            'max_ms': round(max(durations), 1),
        }
        self.assertGreater(successes, 0)


class LoadTestDashboard(TransactionTestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com',
            password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )

    def test_dashboard_stats(self):
        token = str(AccessToken.for_user(self.admin))
        durations = []
        successes = 0
        total = 20

        for _ in range(total):
            c = Client()
            start = time.time()
            resp = c.get('/api/dashboard/stats/',
                         HTTP_AUTHORIZATION=f'Bearer {token}')
            dur = (time.time() - start) * 1000
            durations.append(dur)
            if resp.status_code == 200:
                successes += 1

        self._result = {
            'name': 'Dashboard KPIs (20 requetes, endpoint lourd)',
            'total': total,
            'success': successes,
            'success_rate': f"{(successes / total * 100):.1f}%",
            'avg_ms': round(statistics.mean(durations), 1),
            'p50_ms': round(statistics.median(durations), 1),
            'p95_ms': round(sorted(durations)[int(len(durations) * 0.95)], 1),
            'max_ms': round(max(durations), 1),
        }
        self.assertGreater(successes, 0)


class LoadTestMixedScenario(TransactionTestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com',
            password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.agent = User.objects.create_user(
            username='agent@test.com', email='agent@test.com',
            password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        self.admin_token = str(AccessToken.for_user(self.admin))
        self.agent_token = str(AccessToken.for_user(self.agent))

    def test_mixed_scenario(self):
        durations = []
        successes = 0
        total = 50

        urls = [
            ('/api/dashboard/stats/', self.admin_token),
            ('/api/reclamations/', self.agent_token),
            ('/api/accounts/users/', self.admin_token),
            ('/api/dashboard/reporting/', self.admin_token),
            ('/api/accounts/agents-cc/', self.agent_token),
        ]

        for i in range(total):
            url, token = urls[i % len(urls)]
            c = Client()
            start = time.time()
            resp = c.get(url, HTTP_AUTHORIZATION=f'Bearer {token}')
            dur = (time.time() - start) * 1000
            durations.append(dur)
            if resp.status_code == 200:
                successes += 1

        self._result = {
            'name': 'Scenario Mixte (50 requetes, 5 endpoints)',
            'total': total,
            'success': successes,
            'success_rate': f"{(successes / total * 100):.1f}%",
            'avg_ms': round(statistics.mean(durations), 1),
            'p50_ms': round(statistics.median(durations), 1),
            'p95_ms': round(sorted(durations)[int(len(durations) * 0.95)], 1),
            'max_ms': round(max(durations), 1),
        }
        self.assertGreater(successes, 0)
