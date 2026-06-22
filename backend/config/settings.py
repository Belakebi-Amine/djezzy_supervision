"""
Django Settings - Djezzy Supervision Réseau
"""

from pathlib import Path
from decouple import config
import os
from datetime import timedelta

# ─── Chemins ────────────────────────────────────────────────
# Comme settings.py est dans backend/config/, on remonte 3 fois pour la racine
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ─── Sécurité ────────────────────────────────────────────────
SECRET_KEY = config('SECRET_KEY', default='change-me-in-production')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='127.0.0.1,localhost').split(',')

# ─── Applications ────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Librairies tierces
    'corsheaders',
    'rest_framework',
    'crispy_forms',
    'crispy_bootstrap5',
    
    # Applications du projet (Chemin vers les Configs)
    'backend.accounts.apps.AccountsConfig',
    'backend.reclamations.apps.ReclamationsConfig',
    'backend.sites_reseau.apps.SitesReseauConfig',
    'backend.cartographie.apps.CartographieConfig',
    'backend.dashboard.apps.DashboardConfig',
]

# ─── Middleware ───────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Bien placé en premier pour le CORS
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.config.urls'

# ─── Configuration Templates (Requis pour l'Admin) ───────────
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [], # Vide car tu utilises React
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ─── Fichiers Statiques ──────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    # BASE_DIR / "static", 
]

WSGI_APPLICATION = 'backend.config.wsgi.application'

# ─── Base de données PostgreSQL ──────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='djezzy_supervision'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# ─── Modèle utilisateur personnalisé ────────────────────────
AUTH_USER_MODEL = 'accounts.CustomUser'

# ─── Validation des mots de passe ────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── Internationalisation ────────────────────────────────────
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Algiers'
USE_I18N = True
USE_TZ = True

# ─── Fichiers médias ────────────────────────────
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# ─── Clé primaire par défaut ─────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Login / Logout ─────────────────────────────────────────
LOGIN_URL = '/accounts/login/'
LOGIN_REDIRECT_URL = '/dashboard/'
LOGOUT_REDIRECT_URL = '/accounts/login/'

# ─── Django REST Framework (Corrigé pour le dev local) ───────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        # Changé en AllowAny temporairement pour s'assurer que React accède aux endpoints
        'rest_framework.permissions.AllowAny', 
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

# ─── CORS (Autorise ton application Vite/React) ──────────────
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # Port de ton serveur Vite (Frontend)
    "http://127.0.0.1:5173",  # IP locale du serveur Vite
]

# Optionnel : Sécurité supplémentaire pour le dev afin d'éviter tout blocage de requêtes locales
CORS_ALLOW_ALL_ORIGINS = True