import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from reclamations.models import Reclamation, GroupeTicket, Client
from sites_reseau.models import SiteReseau

User = get_user_model()


@pytest.fixture
def admin_user(db):
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
    refresh = RefreshToken.for_user(admin_user)
    return str(refresh.access_token)


@pytest.fixture
def token_engineer(engineer_user):
    refresh = RefreshToken.for_user(engineer_user)
    return str(refresh.access_token)


@pytest.fixture
def token_agent(agent_cc_user):
    refresh = RefreshToken.for_user(agent_cc_user)
    return str(refresh.access_token)


@pytest.fixture
def token_supervisor(supervisor_user):
    refresh = RefreshToken.for_user(supervisor_user)
    return str(refresh.access_token)


@pytest.fixture
def auth_admin(token_admin):
    return {'HTTP_AUTHORIZATION': f'Bearer {token_admin}'}


@pytest.fixture
def auth_engineer(token_engineer):
    return {'HTTP_AUTHORIZATION': f'Bearer {token_engineer}'}


@pytest.fixture
def auth_agent(token_agent):
    return {'HTTP_AUTHORIZATION': f'Bearer {token_agent}'}


@pytest.fixture
def auth_supervisor(token_supervisor):
    return {'HTTP_AUTHORIZATION': f'Bearer {token_supervisor}'}


@pytest.fixture
def site1(db):
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
    return Client.objects.create(
        numero='0550001122',
        prenom='Ahmed',
        nom='Benali',
        type_client='particulier',
    )


@pytest.fixture
def client2(db):
    return Client.objects.create(
        numero='0660003344',
        prenom='Société',
        nom='Djezzy',
        type_client='entreprise',
    )


@pytest.fixture
def reclamation1(db, agent_cc_user, site1, client1):
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
