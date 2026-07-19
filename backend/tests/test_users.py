"""Tests de gestion des utilisateurs (CRUD, archivage, réinitialisation mot de passe)."""

import pytest
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


class TestListUsers(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.ing = User.objects.create_user(
            username='ing@test.com', email='ing@test.com', password='TestPass123!',
            role='INGENIEUR_RESEAUX',
        )
        self.agent = User.objects.create_user(
            username='agent@test.com', email='agent@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_list_users_ok(self):
        resp = self.client.get('/api/accounts/users/', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.json()), 3)

    def test_list_users_filter_role(self):
        resp = self.client.get('/api/accounts/users/?role=INGENIEUR_RESEAUX', **self._auth())
        self.assertEqual(resp.status_code, 200)
        for u in resp.json():
            self.assertEqual(u['role_user'], 'INGENIEUR_RESEAUX')

    def test_list_users_filter_search(self):
        resp = self.client.get('/api/accounts/users/?search=ing', **self._auth())
        self.assertEqual(resp.status_code, 200)
        emails = [u['email'] for u in resp.json()]
        self.assertIn('ing@test.com', emails)

    def test_list_users_forbidden_for_agent(self):
        token = str(AccessToken.for_user(self.agent))
        resp = self.client.get('/api/accounts/users/',
                               HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(resp.status_code, 403)


class TestRegisterUser(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_register_success(self):
        resp = self.client.post('/api/accounts/users/register/', {
            'first_name': 'Nouveau',
            'last_name': 'User',
            'email': 'new@test.com',
            'role': 'AGENT_CALL_CENTER',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!',
        }, content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()['user']['email'], 'new@test.com')

    def test_register_password_mismatch(self):
        resp = self.client.post('/api/accounts/users/register/', {
            'first_name': 'Test', 'last_name': 'User',
            'email': 'fail@test.com', 'role': 'AGENT_CALL_CENTER',
            'password': 'SecurePass123!', 'password2': 'DifferentPass!',
        }, content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 400)

    def test_register_duplicate_email(self):
        resp = self.client.post('/api/accounts/users/register/', {
            'first_name': 'Dup', 'last_name': 'User',
            'email': 'admin@test.com', 'role': 'AGENT_CALL_CENTER',
            'password': 'SecurePass123!', 'password2': 'SecurePass123!',
        }, content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 400)


class TestArchiveRestore(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.target = User.objects.create_user(
            username='target@test.com', email='target@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_archive_user(self):
        resp = self.client.delete(
            f'/api/accounts/users/{self.target.code_user}/archive/',
            **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)
        self.assertTrue(self.target.is_archived)

    def test_restore_user(self):
        self.target.is_active = False
        self.target.is_archived = True
        self.target.save()
        resp = self.client.post(
            f'/api/accounts/users/{self.target.code_user}/restore/',
            **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.target.refresh_from_db()
        self.assertTrue(self.target.is_active)
        self.assertFalse(self.target.is_archived)

    def test_toggle_active(self):
        resp = self.client.post(
            f'/api/accounts/users/{self.target.code_user}/toggle-active/',
            **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)

    def test_delete_user(self):
        resp = self.client.delete(
            f'/api/accounts/users/{self.target.code_user}/delete/',
            **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(User.objects.filter(pk=self.target.pk).exists())

    def test_delete_self_forbidden(self):
        resp = self.client.delete(
            f'/api/accounts/users/{self.admin.code_user}/delete/',
            **self._auth())
        self.assertEqual(resp.status_code, 400)


class TestResetPassword(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.target = User.objects.create_user(
            username='target@test.com', email='target@test.com', password='OldPass123!',
            role='AGENT_CALL_CENTER',
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_reset_password_success(self):
        resp = self.client.post('/api/accounts/reset-password/', {
            'email': 'target@test.com'
        }, content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.assertIn('nouveau_mot_de_passe', resp.json())

    def test_reset_password_not_found(self):
        resp = self.client.post('/api/accounts/reset-password/', {
            'email': 'nobody@test.com'
        }, content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 404)


class TestUpdateUser(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='TestPass123!',
            role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.target = User.objects.create_user(
            username='target@test.com', email='target@test.com', password='TestPass123!',
            role='AGENT_CALL_CENTER',
        )
        self.token = str(AccessToken.for_user(self.admin))
        self.client = Client()

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_update_user_role(self):
        resp = self.client.patch(
            f'/api/accounts/users/{self.target.code_user}/',
            {'role': 'INGENIEUR_RESEAUX'},
            content_type='application/json', **self._auth())
        self.assertEqual(resp.status_code, 200)
        self.target.refresh_from_db()
        self.assertEqual(self.target.role, 'INGENIEUR_RESEAUX')
