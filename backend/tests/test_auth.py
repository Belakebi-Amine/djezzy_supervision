"""Tests de l'authentification JWT (connexion, rafraîchissement, déconnexion)."""

import pytest
from django.test import TestCase, Client
from django.urls import reverse


class TestLoginJWT(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            username='test@login.com', email='test@login.com', password='TestPass123!',
            first_name='Test', last_name='User', role='ADMIN',
            is_staff=True, is_superuser=True,
        )
        self.client = Client()

    def test_login_success(self):
        resp = self.client.post('/api/token/', {
            'email': 'test@login.com', 'password': 'TestPass123!'
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.json())
        self.assertIn('refresh', resp.json())
        self.assertIn('user', resp.json())

    def test_login_wrong_password(self):
        resp = self.client.post('/api/token/', {
            'email': 'test@login.com', 'password': 'wrong'
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 401)

    def test_login_nonexistent_user(self):
        resp = self.client.post('/api/token/', {
            'email': 'nobody@test.com', 'password': 'TestPass123!'
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 401)


class TestTokenRefresh(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            username='test@refresh.com', email='test@refresh.com', password='TestPass123!',
            first_name='Test', role='ADMIN', is_staff=True, is_superuser=True,
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        self.refresh = str(RefreshToken.for_user(self.user))
        self.client = Client()

    def test_refresh_token(self):
        resp = self.client.post('/api/token/refresh/', {
            'refresh': self.refresh
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.json())


class TestLogout(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            username='test@logout.com', email='test@logout.com', password='TestPass123!',
            first_name='Test', role='AGENT_CALL_CENTER',
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        self.refresh = str(RefreshToken.for_user(self.user))
        from rest_framework_simplejwt.tokens import AccessToken
        self.access = str(AccessToken.for_user(self.user))
        self.client = Client()

    def test_logout_success(self):
        resp = self.client.post('/api/accounts/logout/', {
            'refresh': self.refresh
        }, content_type='application/json',
           HTTP_AUTHORIZATION=f'Bearer {self.access}')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('Déconnexion', resp.json()['message'])


class TestMeView(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            username='test@me.com', email='test@me.com', password='TestPass123!',
            first_name='Amine', last_name='Belakebi', role='ADMIN',
            is_staff=True, is_superuser=True,
        )
        from rest_framework_simplejwt.tokens import AccessToken
        self.access = str(AccessToken.for_user(self.user))
        self.client = Client()

    def test_me_authenticated(self):
        resp = self.client.get('/api/accounts/me/',
                               HTTP_AUTHORIZATION=f'Bearer {self.access}')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['email'], 'test@me.com')

    def test_me_unauthenticated(self):
        resp = self.client.get('/api/accounts/me/')
        self.assertEqual(resp.status_code, 401)
