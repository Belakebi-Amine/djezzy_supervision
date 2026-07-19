"""Fixtures pytest partagées pour les tests du backend.

Fournit des utilisateurs, tokens, sites, clients et réclamations
préconfigurés pour être réutilisés dans tous les fichiers de tests.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from reclamations.models import Reclamation, GroupeTicket, Client
from sites_reseau.models import SiteReseau

User = get_user_model()


@pytest.fixture
def admin_user(db):
    """Crée un utilisateur administrateur de test."""
    return User.objects.create_user(
        username='admin@test.com',
        email='admin@test.com',
        password='TestPass123!',
        first_name='Admin',
        last_name='Test',
        role='ADMIN',
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def engineer_user(db):
    """Crée un ingénieur réseau de test."""
    return User.objects.create_user(
        username='engineer@test.com',
        email='engineer@test.com',
        password='TestPass123!',
        first_name='Ingénieur',
        last_name='Test',
        role='INGENIEUR_RESEAUX',
    )


@pytest.fixture
def agent_cc_user(db):
    """Crée un agent call center de test."""
    return User.objects.create_user(
        username='agent@test.com',
        email='agent@test.com',
        password='TestPass123!',
        first_name='Agent',
        last_name='Test',
        role='AGENT_CALL_CENTER',
    )


@pytest.fixture
def reporter_user(db):
    """Crée un responsable reporting de test."""
    return User.objects.create_user(
        username='reporter@test.com',
        email='reporter@test.com',
        password='TestPass123!',
        first_name='Reporter',
        last_name='Test',
        role='RESPONSABLE_REPORTING',
    )


@pytest.fixture
def supervisor_user(db):
    """Crée un superviseur de test."""
    return User.objects.create_user(
        username='supervisor@test.com',
        email='supervisor@test.com',
        password='TestPass123!',
        first_name='Superviseur',
        last_name='Test',
        role='SUPERVISEUR',
    )


@pytest.fixture
def token_admin(admin_user):
    """Génère un token JWT pour l'administrateur."""
    refresh = RefreshToken.for_user(admin_user)
    return str(refresh.access_token)


@pytest.fixture
def token_engineer(engineer_user):
    """Génère un token JWT pour l'ingénieur."""
    refresh = RefreshToken.for_user(engineer_user)
    return str(refresh.access_token)


@pytest.fixture
def token_agent(agent_cc_user):
    """Génère un token JWT pour l'agent call center."""
    refresh = RefreshToken.for_user(agent_cc_user)
    return str(refresh.access_token)


@pytest.fixture
def token_supervisor(supervisor_user):
    """Génère un token JWT pour le superviseur."""
    refresh = RefreshToken.for_user(supervisor_user)
    return str(refresh.access_token)


@pytest.fixture
def auth_admin(token_admin):
    """En-tête d'authentification pour l'administrateur."""
    return {'HTTP_AUTHORIZATION': f'Bearer {token_admin}'}


@pytest.fixture
def auth_engineer(token_engineer):
    """En-tête d'authentification pour l'ingénieur."""
    return {'HTTP_AUTHORIZATION': f'Bearer {token_engineer}'}


@pytest.fixture
def auth_agent(token_agent):
    """En-tête d'authentification pour l'agent."""
    return {'HTTP_AUTHORIZATION': f'Bearer {token_agent}'}


@pytest.fixture
def auth_supervisor(token_supervisor):
    """En-tête d'authentification pour le superviseur."""
    return {'HTTP_AUTHORIZATION': f'Bearer {token_supervisor}'}


@pytest.fixture
def site1(db):
    """Crée un premier site réseau de test (Alger, UP, 5G)."""
    return SiteReseau.objects.create(
        codeSite='S000001',
        nom='Site Test Alger',
        wilaya='Alger',
        commune='Bab Ezzouar',
        statut='UP',
        technologie='5G',
    )


@pytest.fixture
def site2(db):
    """Crée un deuxième site réseau de test (Oran, DOWN, 4G)."""
    return SiteReseau.objects.create(
        codeSite='S000002',
        nom='Site Test Oran',
        wilaya='Oran',
        commune='Oran Centre',
        statut='DOWN',
        technologie='4G',
    )


@pytest.fixture
def client1(db):
    """Crée un client particulier de test."""
    return Client.objects.create(
        numero='0550001122',
        prenom='Ahmed',
        nom='Benali',
        type_client='particulier',
    )


@pytest.fixture
def client2(db):
    """Crée un client entreprise de test."""
    return Client.objects.create(
        numero='0660003344',
        prenom='Société',
        nom='Djezzy',
        type_client='entreprise',
    )


@pytest.fixture
def reclamation1(db, agent_cc_user, site1, client1):
    """Crée une réclamation ouverte de test."""
    return Reclamation.objects.create(
        nom_client='Ahmed Benali',
        telephone_client='0550001122',
        type_client='particulier',
        site=site1,
        client=client1,
        priorite='haute',
        statut='ouvert',
        cree_par=agent_cc_user,
    )


@pytest.fixture
def groupe_ticket1(db, site1, admin_user, engineer_user):
    """Crée un groupe de tickets de test avec assignation."""
    gt = GroupeTicket(
        site=site1,
        titre='Panne réseau Alger',
        description='Panne réseau',
        statut='ouvert',
        priorite='haute',
        cree_par=admin_user,
        assigne_a=engineer_user,
    )
    gt.save()
    return gt
