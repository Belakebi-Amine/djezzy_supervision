"""Tests de gestion des groupes de tickets (CRUD, résolution, assignation)."""

import pytest
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from reclamations.models import GroupeTicket, Reclamation
from sites_reseau.models import SiteReseau

User = get_user_model()


class TestListGroupes(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.site = SiteReseau.objects.create(
            nom='Site Test', wilaya='Alger', commune='Bab Ezzouar', statut='UP', technologie='5G',
        )
        self.gt = GroupeTicket.objects.create(
            site=self.site, titre='Panne réseau', statut='ouvert',
            priorite='haute', cree_par=self.admin,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_list_groupes(self):
        resp = self.client.get('/api/reclamations/groupes/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.json()), 1)

    def test_filter_priorite(self):
        resp = self.client.get('/api/reclamations/groupes/?priorite=haute', **self._auth())
        self.assertEqual(resp.status_code, 200)

    def test_detail_groupe(self):
        resp = self.client.get(f'/api/reclamations/groupes/{self.gt.pk}/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['titre'], 'Panne réseau')

    def test_detail_not_found(self):
        resp = self.client.get('/api/reclamations/groupes/9999/', **self._auth())
        self.assertEqual(resp.status_code, 404)


class TestModifierGroupe(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.gt = GroupeTicket.objects.create(
            titre='Test', statut='ouvert', priorite='basse', cree_par=self.admin,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_modifier_titre(self):
        resp = self.client.put(f'/api/reclamations/groupes/{self.gt.pk}/modifier/',
                               {'titre': 'Titre modifié', 'statut': 'ouvert'},
                               content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.gt.refresh_from_db()
        self.assertEqual(self.gt.titre, 'Titre modifié')


class TestResoudreGroupe(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.gt = GroupeTicket.objects.create(
            titre='Test', statut='ouvert', priorite='haute', cree_par=self.admin,
        )
        self.r = Reclamation.objects.create(
            nom_client='Test', telephone_client='0550001122',
            statut='ouvert', groupe=self.gt, cree_par=self.admin,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_resoudre(self):
        resp = self.client.post(f'/api/reclamations/groupes/{self.gt.pk}/resoudre/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.gt.refresh_from_db()
        self.assertEqual(self.gt.statut, 'resolu')
        self.r.refresh_from_db()
        self.assertEqual(self.r.statut, 'resolu')


class TestAssignerGroupe(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.gt = GroupeTicket.objects.create(
            titre='Test', statut='ouvert', priorite='normale', cree_par=self.admin,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_assigner(self):
        resp = self.client.post(f'/api/reclamations/groupes/{self.gt.pk}/assigner/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.gt.refresh_from_db()
        self.assertEqual(self.gt.assigne_a, self.admin)


class TestArchiverGroupe(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.gt = GroupeTicket.objects.create(
            titre='Test', statut='ouvert', priorite='normale', cree_par=self.admin,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_archiver(self):
        resp = self.client.post(f'/api/reclamations/groupes/{self.gt.pk}/archiver/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.gt.refresh_from_db()
        self.assertTrue(self.gt.is_archived)


class TestStatsGroupes(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_stats(self):
        resp = self.client.get('/api/reclamations/groupes/stats/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertIn('tickets_ouverts', resp.json())
        self.assertIn('tickets_total', resp.json())
