# Djezzy Supervision Reseau

Plateforme web de supervision reseau developpee dans le cadre de notre PFE. L'idee de base : Djezzy gere des centaines de sites BTS a travers l'Algerie, et les outils actuels sont soit trop fragmentes, soit pas adaptes aux besoins terrain. On a voulu construire quelque chose de plus coherent.

---

## Ce qu'on essaie de resoudre

En gros, quand un client appelle pour signaler un probleme reseau, l'agent du call center cree un ticket. Ce ticket doit ensuite atterrir chez le bon ingenieur, qui lui doit pouvoir voir l'etat du site concerne sur une carte, suivre les KPIs, etc. Aujourd'hui tout ca se fait sur des outils separees. Notre plateforme centralise tout ca en un seul endroit :

- Gestion des reclamations clients (tickets)
- Regroupement intelligent des tickets par similarite Jaccard
- Supervision en temps reel des sites BTS
- Carte interactive des sites reseau
- Tableaux de bord KPI pour le reporting
- Generation de rapports IA (Mistral AI)
- Journal d'activite (audit trail)

---

## Architecture

React + Django REST API + PostgreSQL :

```
React (Frontend) <--> Django REST API (Backend) <--> PostgreSQL
```

### Structure du projet

```
djezzy_supervision/
├── manage.py                 # Point d'entree Django
├── requirements.txt          # Dependances Python (a la racine)
├── test_results.json         # Resultats pytest (91 tests)
├── backend/                  # API Django REST
│   ├── config/               # Settings Django, URLs, middleware
│   ├── accounts/             # Auth JWT & gestion utilisateurs
│   ├── sites_reseau/         # Registre des sites BTS
│   ├── reclamations/         # Tickets + regroupement IA Jaccard
│   ├── dashboard/            # KPI & rapports IA Mistral
│   ├── cartographie/         # Donnees carte Leaflet
│   ├── audit_log/            # Journal d'activite
│   ├── tests/                # Suite de tests (91 tests)
│   ├── conftest.py           # Fixtures pytest centrales
│   └── keywords_config.py    # Systeme de scoring mots-cles
├── frontend/                 # SPA React
│   └── src/
│       ├── api/              # Clients API JWT (tickets.js, dashboard.js)
│       ├── pages/            # 6 pages (Login, Dashboards, Profile)
│       ├── components/       # Modal, Carte, PrivateRoute
│       ├── context/          # NotificationContext (toasts)
│       ├── hooks/            # useAnimations (particules, count-up, ripple)
│       ├── styles/           # themes.css (dark/light)
│       └── assets/           # Djezzy_Logo.png
├── Conception/               # Diagrammes UML (draw.io)
├── Memoire/                  # Memoire de PFE
└── media/                    # Icons + PDFs techniques
```

---

## Qui peut faire quoi

On a 5 profils utilisateurs, chacun voit uniquement ce dont il a besoin :

| Role | Acces |
|---|---|
| Administrateur | Acces total -- gestion des comptes, config globale, audit trail, KPIs |
| Ingenieur Reseau | Gere les sites BTS + traite les tickets techniques, verrouillage groupes |
| Agent Call Center | Cree et suit les reclamations clients |
| Superviseur | KPIs, cartographie, generation de rapports IA |
| Responsable Reporting | Rapports et statistiques (module reporting) |

---

## Endpoints principaux

| Module | Endpoint | Description |
|---|---|---|
| Authentification | `/api/accounts/` | JWT login/logout, gestion users (15 endpoints) |
| Sites Reseau | `/api/sites/` | CRUD sites BTS (5 endpoints) |
| Reclamations | `/api/reclamations/` | Tickets + groupes + verrouillage + re-regroupement (~20 endpoints) |
| Dashboard KPI | `/api/dashboard/` | Statistiques, rapports IA, performance (10 endpoints) |
| Cartographie | `/api/carte/` | Donnees carte Leaflet (1 endpoint) |
| Audit Trail | `/api/audit/` | Sante systeme, logs, statistiques (4 endpoints) |

---

## Stack technique

### Backend
- Python 3.10+
- Django 6.0.6
- Django REST Framework 3.17.1
- PostgreSQL (psycopg2-binary 2.9.11)
- JWT Authentication (djangorestframework-simplejwt 5.5.1)
  - Access token : 1 heure
  - Refresh token : 7 jours (rotation + blacklist active)
  - Claims custom : `role`, `code_user`
- django-cors-headers 4.9.0
- OpenAI SDK 2.45.0 (pour Mistral AI via compatible API)
- Pillow 12.1.0 (gestion d'images)
- python-decouple 3.8 (variables d'environnement)
- pytest-django 4.12.0 (tests)

### Frontend
- React 19.2.4
- React Router 7.14.0
- Axios 1.14.0 (requetes HTTP avec gestion JWT automatique)
- Leaflet + React-Leaflet (carte interactive)
- Recharts 3.8.1 (graphiques)
- JWT-decode 4.0.0 (authentification)
- DOMPurify 3.4.11 (protection XSS)
- html2pdf.js 0.14.0 (export PDF)

### Outils
- VS Code (IDE)
- GitHub (versioning)
- Postman (tests API)
- draw.io (diagrammes UML)
- LaTeX (memoire PFE)

---

## Fonctionnalites

### Authentification & Securite
- JWT avec access/refresh tokens
- Rotation automatique des refresh tokens
- Blacklist apres rotation (deconnexion securisee)
- Controle d'acces base sur les roles (RBAC)
- Restriction IP pour l'admin (/admin/)
- Throttling (30/min anonyme, 100/min connecte)

### Admin Dashboard
- KPIs temps reel (sites UP/DOWN, tickets ouverts, taux resolution)
- Gestion complete des tickets (creation, transition de statut, archivage)
- Gestion des utilisateurs (CRUD, activation/desactivation, archivage)
- Gestion des sites BTS (CRUD, toggle actif/inactif, archivage)
- Journal d'activite (audit trail) avec filtres
- Graphiques de performance (ingenieurs + agents CC)

### Ingenieur Reseau
- Vue tickets groupees avec stats
- Verrouillage des groupes de tickets (concurrence)
- Re-regroupement intelligent des tickets (similarite Jaccard)
- Gestion des sites (creation, statut, archivage)
- Cartographie interactive des sites
- Vue archives (sites + tickets)

### Agent Call Center
- Creation de reclamations avec mots-cles IA
- Priorite auto-calculee par score de mots-cles
- Filtres avances (date, site, priorite, type client)
- Vue detaillee des reclamations

### Superviseur
- Dashboard KPI avec graphiques (evolution, priorites, communes)
- Cartographie des sites 5G
- Generateur de rapports IA (Mistral AI)
- Export PDF des rapports
- Performance equipe (ingenieurs + agents CC)
- Vue archives

### Regroupement IA
- Algorithme de similarite Jaccard (seuil 80%)
- Fenetre temporelle de 3 jours
- Filtrage par statut (ouvert + ferme uniquement)
- Inheritance de statut lors du groupement
- Creation de nouveau groupe ferme si pas de correspondance
- Re-regroupement automatique (compare les groupes existants)
- Verrouillage de concurrence (5 min, release automatique)

---

## Lancer le projet en local

### Ce qu'il faut avoir installe
- Python 3.10+
- PostgreSQL (et avoir cree une base vide avant de lancer les migrations)
- Node.js 18+ (pour le front React)

### Backend
```bash
# Cloner le repo
git clone https://github.com/Belakebi-Amine/djezzy_supervision.git
cd djezzy_supervision

# Creer l'environnement virtuel
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# Installer les dependances Python
pip install -r requirements.txt

# Configurer l'environnement
# Creer backend/.env avec les variables :
#   SECRET_KEY=...
#   DB_NAME=...
#   DB_USER=...
#   DB_PASSWORD=...
#   MISTRAL_API_KEY=... (optionnel, pour les rapports IA)

# Appliquer les migrations
python manage.py migrate

# Creer un superutilisateur
python manage.py createsuperuser

# Lancer le serveur
python manage.py runserver
```

### Peupler la base de donnees (optionnel)
```bash
# Generer les donnees de test (80 clients, 400 reclamations, ~50 groupes)
python manage.py seed_all_data

# Ou generer juste 100 tickets
python manage.py seed_reclamations

# Archiver automatiquement les tickets > 1 mois
python manage.py auto_archive --dry-run
python manage.py auto_archive

# Repartir les dates sur les 90 derniers jours
python manage.py spread_ticket_dates --days 90
```

### Frontend
```bash
cd frontend

# Installer les dependances Node
npm install

# Configurer l'API backend
# Creer frontend/.env avec :
#   REACT_APP_API_URL=http://localhost:8000/api

# Lancer le serveur de developpement
npm start
```

### Tests
```bash
cd backend
pytest
# 91 tests -- tous passing
```

---

## Equipe

| Role | Nom |
|---|---|
| Backend (Django) | Belakebi Amine |
| Frontend (React) | Bouachach Amel |

---

## Licence

Projet academique -- PFE 2025/2026
