# 🛰️ Djezzy Supervision Réseau

Plateforme web centralisée de supervision opérationnelle développée dans le cadre d'un projet de fin d'études (PFE), inspirée des besoins réels d'un opérateur télécom algérien.

---

## 🎯 Objectif

Remplacer les outils fragmentés de gestion des incidents réseau par une solution unifiée permettant :
- La gestion des réclamations clients sous forme de tickets
- La supervision en temps réel des sites réseau (BTS)
- La visualisation cartographique des sites
- L'analyse des performances via des tableaux de bord KPI

---

## 🏗️ Architecture
```
React (Frontend) ←→ Django REST API (Backend) ←→ PostgreSQL
```

---

## 👥 Rôles utilisateurs

| Rôle | Accès |
|---|---|
| 🔴 Administrateur | Accès total |
| 🔵 Ingénieur Réseau | Gestion des sites + traitement des tickets |
| 🟡 Agent Call Center | Création et suivi des tickets |
| 🟢 Reporting | Consultation KPI et cartographie |

---

## 📡 APIs disponibles

| Module | Endpoint |
|---|---|
| Authentification | `/api/accounts/` |
| Sites Réseau | `/api/sites/` |
| Réclamations | `/api/reclamations/` |
| Dashboard KPI | `/api/dashboard/` |
| Cartographie | `/api/carte/` |

---

## 🛠️ Technologies utilisées

**Backend**
- Python / Django 4.2
- Django REST Framework
- PostgreSQL
- django-cors-headers

**Frontend**
- React.js

---

## 🚀 Installation

### Prérequis
- Python 3.10+
- PostgreSQL
- Node.js (pour React)

### Backend
```bash
# Cloner le projet
git clone https://github.com/Belakebi-Amine/djezzy_supervision.git
cd djezzy_supervision

# Créer et activer l'environnement virtuel
python -m venv venv
venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env
# Remplir le fichier .env avec tes infos

# Appliquer les migrations
python manage.py migrate

# Lancer le serveur
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