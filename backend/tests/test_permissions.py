"""Tests des permissions et restrictions d'accès par rôle utilisateur."""

import pytest
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


class TestPermissionsAdminEndpoints(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.agent = User.objects.create_user(
            username='agent@test.com', email='agent@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        self.eng = User.objects.create_user(
            username='eng@test.com', email='eng@test.com', password='TestPass123!',
            role='INGENIEUR_RESEAUX',
        )
        self.supervisor = User.objects.create_user(
            username='sup@test.com', email='sup@test.com', password='TestPass123!',
            role='SUPERVISEUR',
        )
        self.reporter = User.objects.create_user(
            username='reporter@test.com', email='reporter@test.com', password='TestPass123!',
            role='RESPONSABLE_REPORTING',
        )
        self.client = Client()

    def _token(self, user):
        return str(AccessToken.for_user(user))

    def _auth(self, user):
        return {'HTTP_AUTHORIZATION': f'Bearer {self._token(user)}'}

    # ── list_users (admin only) ──
    def test_list_users_admin(self):
        resp = self.client.get('/api/accounts/users/', **self._auth(self.admin))
        self.assertEqual(resp.status_code, 200)

    def test_list_users_agent_forbidden(self):
        resp = self.client.get('/api/accounts/users/', **self._auth(self.agent))
        self.assertEqual(resp.status_code, 403)

    def test_list_users_engineer_forbidden(self):
        resp = self.client.get('/api/accounts/users/', **self._auth(self.eng))
        self.assertEqual(resp.status_code, 403)

    # ── register (admin only) ──
    def test_register_admin(self):
        resp = self.client.post('/api/accounts/users/register/', {
            'first_name': 'Test', 'last_name': 'User', 'email': 'new@test.com',
            'role': 'AGENT_CALL_CENTER', 'password': 'SecurePass123!', 'password2': 'SecurePass123!',
        }, content_type='application/json', **self._auth(self.admin))
        self.assertEqual(resp.status_code, 201)

    def test_register_agent_forbidden(self):
        resp = self.client.post('/api/accounts/users/register/', {
            'first_name': 'Test', 'last_name': 'User', 'email': 'new@test.com',
            'role': 'AGENT_CALL_CENTER', 'password': 'SecurePass123!', 'password2': 'SecurePass123!',
        }, content_type='application/json', **self._auth(self.agent))
        self.assertEqual(resp.status_code, 403)

    # ── reset-password (admin only) ──
    def test_reset_password_admin(self):
        resp = self.client.post('/api/accounts/reset-password/', {
            'email': 'agent@test.com'
        }, content_type='application/json', **self._auth(self.admin))
        self.assertEqual(resp.status_code, 200)

    def test_reset_password_agent_forbidden(self):
        resp = self.client.post('/api/accounts/reset-password/', {
            'email': 'admin@test.com'
        }, content_type='application/json', **self._auth(self.agent))
        self.assertEqual(resp.status_code, 403)

    # ── archives (admin only) ──
    def test_archives_admin(self):
        resp = self.client.get('/api/dashboard/archives/', **self._auth(self.admin))
        self.assertEqual(resp.status_code, 200)

    def test_archives_supervisor_forbidden(self):
        resp = self.client.get('/api/dashboard/archives/', **self._auth(self.supervisor))
        self.assertEqual(resp.status_code, 403)

    # ── performance (admin/supervisor) ──
    def test_performance_admin(self):
        resp = self.client.get(
            f'/api/dashboard/performance/{self.eng.code_user}/', **self._auth(self.admin))
        self.assertEqual(resp.status_code, 200)

    def test_performance_supervisor(self):
        resp = self.client.get(
            f'/api/dashboard/performance/{self.eng.code_user}/', **self._auth(self.supervisor))
        self.assertEqual(resp.status_code, 200)

    def test_performance_agent_forbidden(self):
        resp = self.client.get(
            f'/api/dashboard/performance/{self.eng.code_user}/', **self._auth(self.agent))
        self.assertEqual(resp.status_code, 403)

    def test_performance_reporter_forbidden(self):
        resp = self.client.get(
            f'/api/dashboard/performance/{self.eng.code_user}/', **self._auth(self.reporter))
        self.assertEqual(resp.status_code, 403)


class TestPermissionsSiteEndpoints(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.agent = User.objects.create_user(
            username='agent@test.com', email='agent@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        self.client = Client()

    def _auth(self, user):
        return {'HTTP_AUTHORIZATION': f'Bearer {str(AccessToken.for_user(user))}'}

    def test_creer_site_agent_forbidden(self):
        resp = self.client.post('/api/sites/creer/', {
            'nom': 'Test', 'wilaya': 'Alger', 'commune': 'Bab Ezzouar',
        }, content_type='application/json', **self._auth(self.agent))
        self.assertEqual(resp.status_code, 403)


class TestPermissionsReclamationEndpoints(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.eng = User.objects.create_user(
            username='eng@test.com', email='eng@test.com', password='TestPass123!',
            role='INGENIEUR_RESEAUX',
        )
        self.client = Client()

    def _auth(self, user):
        return {'HTTP_AUTHORIZATION': f'Bearer {str(AccessToken.for_user(user))}'}

    def test_archiver_reclamation_admin(self):
        from reclamations.models import Reclamation
        r = Reclamation.objects.create(
            nom_client='Test', telephone_client='0550001122',
            statut='ouvert', cree_par=self.admin,
        )
        resp = self.client.post(f'/api/reclamations/{r.pk}/archiver/', **self._auth(self.admin))
        self.assertEqual(resp.status_code, 200)

    def test_archiver_reclamation_engineer_forbidden(self):
        from reclamations.models import Reclamation
        r = Reclamation.objects.create(
            nom_client='Test', telephone_client='0550001122',
            statut='ouvert', cree_par=self.admin,
        )
        resp = self.client.post(f'/api/reclamations/{r.pk}/archiver/', **self._auth(self.eng))
        self.assertEqual(resp.status_code, 403)
