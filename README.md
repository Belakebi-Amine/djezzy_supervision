# Djezzy Supervision Reseau

Plateforme web de supervision reseau developpee dans le cadre de notre PFE. L'idee de base : Djezzy gere des centaines de sites BTS a travers l'Algerie, et les outils actuels sont soit trop fragmentes, soit pas adaptes aux besoins terrain. On a voulu construire quelque chose de plus coherent.

---

## Ce qu'on essaie de resoudre

En gros, quand un client appelle pour signaler un probleme reseau, l'agent du call center cree un ticket. Ce ticket doit ensuite atterrir chez le bon ingenieur, qui lui doit pouvoir voir l'etat du site concerne sur une carte, suivre les KPIs, etc. Aujourd'hui tout ca se fait sur des outils separees. Notre plateforme centralise tout ca en un seul endroit :

- Gestion des reclamations clients (tickets)
- Supervision en temps reel des sites BTS
- Carte interactive des sites reseau
- Tableaux de bord KPI pour le reporting
- Generation de rapports IA (Mistral/OpenAI)
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
├── backend/                  # API Django REST
│   ├── config/               # Settings Django
│   ├── accounts/             # Auth & gestion utilisateurs
│   ├── audit_log/            # Journal d'activite
│   ├── cartographie/         # Carte des sites
│   ├── dashboard/            # KPI & rapports IA
│   ├── reclamations/         # Gestion des tickets
│   ├── sites_reseau/         # Registre des sites BTS
│   └── tests/                # Suite de tests (91 tests)
├── frontend/                 # SPA React
│   └── src/
│       ├── pages/            # 6 pages (Login, Dashboards, Profile)
│       ├── components/       # Modal, Carte, PrivateRoute
│       ├── api/              # Clients API (axios)
│       ├── context/          # NotificationContext
│       ├── hooks/            # useAnimations (particules, count-up)
│       └── styles/           # themes.css (dark/light)
├── Conception/               # Documents de conception (draw.io)
├── Memoire/                  # Memoire de PFE
└── media/                    # Presentations PDF
```

---

## Qui peut faire quoi

On a 4 profils utilisateurs, chacun voit uniquement ce dont il a besoin :

| Role | Acces |
|---|---|
| Administrateur | Accès total -- gestion des comptes, config globale, audit trail |
| Ingenieur Reseau | Gere les sites BTS + traite les tickets techniques |
| Agent Call Center | Cree et suit les reclamations clients |
| Superviseur | KPIs, cartographie, generation de rapports IA |

---

## Endpoints principaux

| Module | Endpoint |
|---|---|
| Authentification | `/api/accounts/` |
| Sites Reseau | `/api/sites/` |
| Reclamations | `/api/reclamations/` |
| Dashboard KPI | `/api/dashboard/` |
| Cartographie | `/api/carte/` |
| Audit Trail | `/api/audit/` |

---

## Stack technique

### Backend
- Python 3.10+
- Django 6.0.3
- Django REST Framework 3.17.1
- PostgreSQL (psycopg2-binary 2.9.11)
- JWT Authentication (djangorestframework-simplejwt 5.5.1)
- django-cors-headers 4.9.0
- OpenAI SDK >= 1.50.0 (pour les rapports IA)
- Pillow 12.1.1 (gestion d'images)
- python-decouple 3.8 (variables d'environnement)

### Frontend
- React 19.2.4
- React Router 7.14.0
- Axios 1.14.0 (requetes HTTP)
- Leaflet + React-Leaflet (carte interactive)
- Recharts 3.8.1 (graphiques)
- JWT-decode 4.0.0 (authentification)
- DOMPurify 3.4.11 (protection XSS)
- html2pdf.js 0.14.0 (export PDF)

---

## Fonctionnalites

### Admin Dashboard
- KPIs temps reel (sites UP/DOWN, tickets ouverts, taux resolution)
- Gestion complete des tickets (creation, transition de statut, archivage)
- Gestion des utilisateurs (CRUD, activation/desactivation, archivage)
- Gestion des sites BTS (CRUD, toggle actif/inactif, archivage)
- Journal d'activite (audit trail) avec filtres
- Graphiques de performance (ingenieurs + agents CC)

### Ingenieur Reseau
- Vue tickets groupees avec stats
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
- Generateur de rapports IA (Mistral/OpenAI)
- Export PDF des rapports
- Performance equipe (ingenieurs + agents CC)
- Vue archives

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
#   OPENAI_API_KEY=... (optionnel, pour les rapports IA)

# Appliquer les migrations
python manage.py migrate

# Creer un superutilisateur
python manage.py createsuperuser

# Lancer le serveur
python manage.py runserver
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
