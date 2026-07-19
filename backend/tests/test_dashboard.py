import pytest
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from reclamations.models import Reclamation, GroupeTicket
from sites_reseau.models import SiteReseau
from dashboard.models import RapportIA

User = get_user_model()


class TestStatistiques(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.site = SiteReseau.objects.create(
            nom='Test', wilaya='Alger', commune='Bab Ezzouar',
            statut='UP', technologie='5G',
        )
        self.r = Reclamation.objects.create(
            nom_client='Test', telephone_client='0550001122',
            statut='ouvert', priorite='haute', site=self.site,
            cree_par=self.admin,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_stats(self):
        resp = self.client.get('/api/dashboard/stats/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('reseau_global', data)
        self.assertIn('tickets', data)
        self.assertIn('graphiques', data)
        self.assertIn('stats_employes', data)

    def test_stats_with_jours(self):
        resp = self.client.get('/api/dashboard/stats/?jours=7', **self._auth())
        self.assertEqual(resp.status_code, 200)


class TestReporting(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_reporting(self):
        resp = self.client.get('/api/dashboard/reporting/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('kpis', data)
        self.assertIn('tableau_complet_wilayas', data)


class TestCarteSites(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='test@test.com', email='test@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        self.site = SiteReseau.objects.create(
            nom='Test', wilaya='Alger', commune='Bab Ezzouar',
            statut='UP', technologie='5G',
        )
        self.token = str(AccessToken.for_user(self.user))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_carte_sites(self):
        resp = self.client.get('/api/dashboard/carte-sites/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.json()), 1)


class TestRapportsIA(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_list_rapports(self):
        resp = self.client.get('/api/dashboard/rapport-ia/', **self._auth())
        self.assertEqual(resp.status_code, 200)

    def test_creer_rapport(self):
        resp = self.client.post('/api/dashboard/rapport-ia/', {
            'titre': 'Test Rapport',
            'prompt': 'Analyse réseau',
            'contenu': '<p>Contenu test</p>',
        }, content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 201)

    def test_detail_rapport(self):
        rapport = RapportIA.objects.create(
            titre='Test', prompt='Test', contenu='<p>Test</p>',
            cree_par=self.admin,
        )
        resp = self.client.get(f'/api/dashboard/rapport-ia/{rapport.pk}/', **self._auth())
        self.assertEqual(resp.status_code, 200)

    def test_supprimer_rapport(self):
        rapport = RapportIA.objects.create(
            titre='Test', prompt='Test', contenu='<p>Test</p>',
            cree_par=self.admin,
        )
        resp = self.client.delete(f'/api/dashboard/rapport-ia/{rapport.pk}/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        rapport.refresh_from_db()
        self.assertTrue(rapport.is_archived)

    def test_list_archived(self):
        rapport = RapportIA.objects.create(
            titre='Archived', prompt='Test', contenu='<p>Test</p>',
            cree_par=self.admin, is_archived=True,
        )
        resp = self.client.get('/api/dashboard/rapport-ia/archives/', **self._auth())
        self.assertEqual(resp.status_code, 200)

    def test_restore_archived(self):
        rapport = RapportIA.objects.create(
            titre='Archived', prompt='Test', contenu='<p>Test</p>',
            cree_par=self.admin, is_archived=True,
        )
        resp = self.client.post('/api/dashboard/rapport-ia/archives/', {
            'id': rapport.pk
        }, content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 200)
        rapport.refresh_from_db()
        self.assertFalse(rapport.is_archived)


class TestConsulterArchive(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_consulter_archive(self):
        resp = self.client.get('/api/dashboard/archives/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('reclamations', data)
        self.assertIn('tickets', data)
        self.assertIn('rapports', data)

    def test_consulter_archive_forbidden(self):
        agent = User.objects.create_user(
            username='agent@test.com', email='agent@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        token = str(AccessToken.for_user(agent))
        resp = self.client.get('/api/dashboard/archives/',
                               HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(resp.status_code, 403)


class TestConsulterPerformance(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.eng = User.objects.create_user(
            username='eng@test.com', email='eng@test.com', password='TestPass123!',
            role='INGENIEUR_RESEAUX',
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_performance(self):
        resp = self.client.get(
            f'/api/dashboard/performance/{self.eng.code_user}/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertIn('utilisateur', resp.json())
        self.assertIn('reclamations', resp.json())

    def test_performance_not_found(self):
        resp = self.client.get('/api/dashboard/performance/U999/', **self._auth())
        self.assertEqual(resp.status_code, 404)

    def test_performance_forbidden(self):
        agent = User.objects.create_user(
            username='agent@test.com', email='agent@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        token = str(AccessToken.for_user(agent))
        resp = self.client.get(
            f'/api/dashboard/performance/{self.eng.code_user}/',
            HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(resp.status_code, 403)
