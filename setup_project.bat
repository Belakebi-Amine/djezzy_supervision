@echo off
REM ============================================================
REM   DJEZZY - Supervision Réseau
REM   Script de création de la structure Django complète
REM   À exécuter dans le dossier où tu veux créer le projet
REM ============================================================

echo ================================================
echo  CRÉATION DU PROJET DJANGO - DJEZZY SUPERVISION
echo ================================================

REM --- 1. Créer et activer l'environnement virtuel ---
python -m venv venv
call venv\Scripts\activate

REM --- 2. Installer les dépendances ---
pip install django
pip install psycopg2-binary
pip install djangorestframework
pip install pillow
pip install python-decouple
pip install django-crispy-forms
pip install crispy-bootstrap5

REM --- 3. Créer le projet Django ---
django-admin startproject config .

REM --- 4. Créer les applications ---
python manage.py startapp accounts
python manage.py startapp reclamations
python manage.py startapp sites_reseau
python manage.py startapp cartographie
python manage.py startapp dashboard

REM --- 5. Créer les dossiers nécessaires ---
mkdir templates
mkdir templates\base
mkdir templates\accounts
mkdir templates\reclamations
mkdir templates\sites_reseau
mkdir templates\cartographie
mkdir templates\dashboard
mkdir static
mkdir static\css
mkdir static\js
mkdir static\images
mkdir media

echo.
echo ================================================
echo  Structure créée avec succès !
echo  Maintenant configure le fichier .env et settings.py
echo ================================================
pause
