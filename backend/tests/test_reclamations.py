import pytest
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from reclamations.models import Reclamation, GroupeTicket, Client as ClientModel
from sites_reseau.models import SiteReseau

User = get_user_model()


class TestListReclamations(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.site = SiteReseau.objects.create(
            nom='Site Test', wilaya='Alger', commune='Bab Ezzouar', statut='UP', technologie='5G',
        )
        self.client_obj = ClientModel.objects.create(
            numero='0550001122', prenom='Ahmed', nom='Benali',
        )
        self.r1 = Reclamation.objects.create(
            nom_client='Ahmed Benali', telephone_client='0550001122',
            type_client='particulier', site=self.site, client=self.client_obj,
            priorite='haute', statut='ouvert', cree_par=self.admin,
            mots_cles_ia='panne reseau',
        )
        self.r2 = Reclamation.objects.create(
            nom_client='Autre Client', telephone_client='0660003344',
            type_client='entreprise', priorite='critique', statut='resolu',
            cree_par=self.admin, mots_cles_ia='antenne BTS',
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_list_all(self):
        resp = self.client.get('/api/reclamations/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

    def test_filter_priorite(self):
        r = Reclamation.objects.create(
            nom_client='Prio Test', telephone_client='0770009988',
            priorite='basse', statut='ferme', cree_par=self.admin,
        )
        resp = self.client.get('/api/reclamations/?statut=ferme', **self._auth())
        self.assertEqual(resp.status_code, 200)
        codes = [item['numero_ticket'] for item in resp.json()]
        self.assertIn(r.numero_ticket, codes)

    def test_filter_client(self):
        resp = self.client.get('/api/reclamations/?client=Ahmed', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

    def test_filter_mots_cles(self):
        resp = self.client.get('/api/reclamations/?mots_cles=panne', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

    def test_filter_site(self):
        resp = self.client.get(f'/api/reclamations/?site_id={self.site.pk}', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)


class TestCreerReclamation(TestCase):
    def setUp(self):
        self.agent = User.objects.create_user(
            username='agent@test.com', email='agent@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        self.site = SiteReseau.objects.create(
            nom='Site Test', wilaya='Alger', commune='Bab Ezzouar', statut='UP', technologie='5G',
        )
        self.token = str(AccessToken.for_user(self.agent))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_creer_reclamation(self):
        resp = self.client.post('/api/reclamations/creer/', {
            'nom_client': 'Test Client',
            'telephone_client': '0550001122',
            'type_client': 'particulier',
            'site_id': self.site.pk,
        }, content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 201)
        self.assertIn('R', resp.json()['numero_ticket'])


class TestDetailReclamation(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.r = Reclamation.objects.create(
            nom_client='Test', telephone_client='0550001122',
            statut='ouvert', cree_par=self.admin,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_get_detail(self):
        resp = self.client.get(f'/api/reclamations/{self.r.pk}/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['numero_ticket'], self.r.numero_ticket)

    def test_not_found(self):
        resp = self.client.get('/api/reclamations/9999/', **self._auth())
        self.assertEqual(resp.status_code, 404)


class TestArchiverReclamation(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.r = Reclamation.objects.create(
            nom_client='Test', telephone_client='0550001122',
            statut='ouvert', cree_par=self.admin,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_archiver(self):
        resp = self.client.post(f'/api/reclamations/{self.r.pk}/archiver/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.r.refresh_from_db()
        self.assertTrue(self.r.is_archived)

    def test_desarchiver(self):
        self.r.is_archived = True
        self.r.save()
        resp = self.client.post(f'/api/reclamations/{self.r.pk}/desarchiver/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.r.refresh_from_db()
        self.assertFalse(self.r.is_archived)


class TestCommentaire(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.r = Reclamation.objects.create(
            nom_client='Test', telephone_client='0550001122',
            statut='ouvert', cree_par=self.admin,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_ajouter_commentaire(self):
        resp = self.client.post(f'/api/reclamations/{self.r.pk}/commentaire/', {
            'contenu': 'Test commentaire'
        }, content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 201)
