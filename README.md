# 🛰️ Djezzy Supervision Réseau

Plateforme web de supervision réseau développée dans le cadre de notre PFE. L'idée de base : Djezzy gère des centaines de sites BTS à travers l'Algérie, et les outils actuels sont soit trop fragmentés, soit pas adaptés aux besoins terrain. On a voulu construire quelque chose de plus cohérent.

---

## 🎯 Ce qu'on essaie de résoudre

En gros, quand un client appelle pour signaler un problème réseau, l'agent du call center crée un ticket. Ce ticket doit ensuite atterrir chez le bon ingénieur, qui lui doit pouvoir voir l'état du site concerné sur une carte, suivre les KPIs, etc. Aujourd'hui tout ça se fait sur des outils séparés. Notre plateforme centralise tout ça en un seul endroit :

- Gestion des réclamations clients (tickets)
- Supervision en temps réel des sites BTS
- Carte interactive des sites réseau
- Tableaux de bord KPI pour le reporting

---

## 🏗️ Architecture

Simple et classique — React côté front, Django pour l'API, PostgreSQL pour la base :

```
React (Frontend) ←→ Django REST API (Backend) ←→ PostgreSQL
```

---

## 👥 Qui peut faire quoi

On a 4 profils utilisateurs, chacun voit uniquement ce dont il a besoin :

| Rôle | Accès |
|---|---|
| 🔴 Administrateur | Accès total — gestion des comptes, config globale |
| 🔵 Ingénieur Réseau | Gère les sites BTS + traite les tickets techniques |
| 🟡 Agent Call Center | Crée et suit les réclamations clients |
| 🟢 Reporting | Lecture seule — KPIs et cartographie |

---

## 📡 Endpoints principaux

| Module | Endpoint |
|---|---|
| Authentification | `/api/accounts/` |
| Sites Réseau | `/api/sites/` |
| Réclamations | `/api/reclamations/` |
| Dashboard KPI | `/api/dashboard/` |
| Cartographie | `/api/carte/` |

---

## 🛠️ Stack technique

**Backend**
- Python / Django 4.2
- Django REST Framework
- PostgreSQL
- django-cors-headers (pour autoriser les requêtes depuis React)

**Frontend**
- React.js

---

## 🚀 Lancer le projet en local

### Ce qu'il faut avoir installé
- Python 3.10+
- PostgreSQL (et avoir créé une base vide avant de lancer les migrations)
- Node.js (pour le front React)

### Backend
```bash
# Cloner le repo
git clone https://github.com/Belakebi-Amine/djezzy_supervision.git
cd djezzy_supervision

# Créer l'environnement virtuel (on travaille sous Windows)
python -m venv venv
venv\Scripts\activate

# Installer les dépendances Python
pip install -r requirements.txt

# Copier le fichier d'env et le remplir avec tes infos locales
# (DB name, user, password, secret key Django, etc.)
cp .env.example .env

# Appliquer les migrations — s'assurer que PostgreSQL tourne avant ça
python manage.py migrate

# C'est parti
python manage.py runserver
```

---

## 👨‍💻 Équipe

| Rôle | Nom |
|---|---|
| Backend (Django) | Belakebi Amine |
| Frontend (React) | Bouachach Amel |

---

## 📄 Licence

Projet académique — PFE 2025/2026