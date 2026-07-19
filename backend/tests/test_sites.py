import pytest
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from sites_reseau.models import SiteReseau

User = get_user_model()


class TestListSites(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='test@test.com', email='test@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        self.s1 = SiteReseau.objects.create(
            nom='Site Alger', wilaya='Alger', commune='Bab Ezzouar',
            statut='UP', technologie='5G',
        )
        self.s2 = SiteReseau.objects.create(
            nom='Site Oran', wilaya='Oran', commune='Oran Centre',
            statut='DOWN', technologie='4G',
        )
        self.s3 = SiteReseau.objects.create(
            nom='Archived', wilaya='Alger', commune='Hydra',
            statut='UP', technologie='5G', archive=True,
        )
        self.token = str(AccessToken.for_user(self.user))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_list_sites(self):
        resp = self.client.get('/api/sites/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

    def test_filter_wilaya(self):
        resp = self.client.get('/api/sites/?wilaya=Alger', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

    def test_filter_commune(self):
        resp = self.client.get('/api/sites/?commune=Oran', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

    def test_filter_technologie(self):
        resp = self.client.get('/api/sites/?technologie=5G', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

    def test_filter_search(self):
        resp = self.client.get('/api/sites/?search=Alger', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

    def test_include_archived(self):
        resp = self.client.get('/api/sites/?archive=true', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 3)

    def test_archived_only(self):
        resp = self.client.get('/api/sites/?archived_only=true', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)


class TestCreerSite(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_creer_site(self):
        resp = self.client.post('/api/sites/creer/', {
            'nom': 'Nouveau Site',
            'wilaya': 'Blida',
            'commune': 'Blida Centre',
            'statut': 'UP',
            'technologie': '5G',
        }, content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 201)
        self.assertIn('S', resp.json()['codeSite'])

    def test_creer_site_forbidden_for_agent(self):
        agent = User.objects.create_user(
            username='agent@test.com', email='agent@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        token = str(AccessToken.for_user(agent))
        resp = self.client.post('/api/sites/creer/', {
            'nom': 'Test', 'wilaya': 'Blida', 'commune': 'Blida',
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(resp.status_code, 403)


class TestDetailSite(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='test@test.com', email='test@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        self.site = SiteReseau.objects.create(
            nom='Test Site', wilaya='Alger', commune='Bab Ezzouar',
            statut='UP', technologie='5G',
        )
        self.token = str(AccessToken.for_user(self.user))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_get_detail(self):
        resp = self.client.get(f'/api/sites/{self.site.pk}/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['nom'], 'Test Site')

    def test_not_found(self):
        resp = self.client.get('/api/sites/9999/', **self._auth())
        self.assertEqual(resp.status_code, 404)


class TestArchiverSite(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.site = SiteReseau.objects.create(
            nom='Test', wilaya='Alger', commune='Bab Ezzouar',
            statut='UP', technologie='5G',
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_archiver(self):
        resp = self.client.put(f'/api/sites/{self.site.pk}/archiver/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.site.refresh_from_db()
        self.assertTrue(self.site.archive)

    def test_desarchiver(self):
        self.site.archive = True
        self.site.save()
        resp = self.client.put(f'/api/sites/{self.site.pk}/desarchiver/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.site.refresh_from_db()
        self.assertFalse(self.site.archive)
