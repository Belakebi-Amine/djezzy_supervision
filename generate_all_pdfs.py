#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de generation de 6 PDFs de documentation pour le projet Djezzy Supervision.
Utilise fpdf2 pour generer des documents professionnels avec support Unicode.
"""

import os
import sys
from fpdf import FPDF

MEDIA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

FONT_PATH = r"C:\Windows\Fonts\arial.ttf"
FONT_PATH_BOLD = r"C:\Windows\Fonts\arialbd.ttf"


class DocPDF(FPDF):
    """Classe PDF personnisee avec en-tete et pied de page professionnels."""

    def __init__(self, title="Documentation", subtitle=""):
        super().__init__()
        self.doc_title = title
        self.doc_subtitle = subtitle
        self.set_auto_page_break(auto=True, margin=25)
        self.add_font("Arial", "", FONT_PATH)
        self.add_font("Arial", "B", FONT_PATH_BOLD)
        self.add_font("Arial", "I", FONT_PATH)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Arial", "B", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, self.doc_title, align="L")
        self.cell(0, 8, f"Djezzy Supervision", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(0, 123, 255)
        self.set_line_width(0.3)
        self.line(10, 14, 200, 14)
        self.ln(6)

    def footer(self):
        self.set_y(-20)
        self.set_font("Arial", "", 8)
        self.set_text_color(150, 150, 150)
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(2)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def cover_page(self, title, subtitle="", extra=""):
        self.add_page()
        self.ln(40)
        self.set_fill_color(0, 102, 204)
        self.rect(0, 0, 210, 8, "F")
        self.set_fill_color(0, 82, 164)
        self.rect(0, 8, 210, 4, "F")

        self.set_font("Arial", "B", 28)
        self.set_text_color(0, 70, 140)
        self.cell(0, 15, title, align="C", new_x="LMARGIN", new_y="NEXT")
        if subtitle:
            self.set_font("Arial", "", 14)
            self.set_text_color(100, 100, 100)
            self.cell(0, 10, subtitle, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)
        self.set_draw_color(0, 102, 204)
        self.set_line_width(1)
        self.line(60, self.get_y(), 150, self.get_y())
        self.ln(15)

        self.set_font("Arial", "", 11)
        self.set_text_color(80, 80, 80)
        self.cell(0, 8, "Projet : Djezzy Supervision - Dashboard Telecom", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 8, "Djezzy (Djezzy SPA) - Algerie", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 8, "Stack : Django 6.0.3 + React 19 + PostgreSQL", align="C", new_x="LMARGIN", new_y="NEXT")
        if extra:
            self.ln(5)
            self.set_font("Arial", "I", 10)
            self.set_text_color(120, 120, 120)
            self.cell(0, 8, extra, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(20)
        self.set_fill_color(0, 102, 204)
        self.rect(0, 289, 210, 8, "F")

    def section_title(self, num, title):
        self.ln(4)
        self.set_font("Arial", "B", 16)
        self.set_text_color(0, 80, 160)
        self.cell(0, 10, f"{num}. {title}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(0, 102, 204)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 120, self.get_y())
        self.ln(4)

    def sub_title(self, title):
        self.ln(2)
        self.set_font("Arial", "B", 12)
        self.set_text_color(0, 60, 120)
        self.set_x(self.l_margin)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def sub_sub_title(self, title):
        self.ln(1)
        self.set_font("Arial", "BI", 10)
        self.set_text_color(60, 60, 60)
        self.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font("Arial", "", 10)
        self.set_text_color(40, 40, 40)
        self.set_x(self.l_margin)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text, indent=15):
        self.set_font("Arial", "", 10)
        self.set_text_color(40, 40, 40)
        self.set_x(self.l_margin)
        self.cell(indent, 5.5, chr(8226))
        self.multi_cell(0, 5.5, text)
        self.ln(0.5)

    def bullet_bold_label(self, label, text, indent=15):
        self.set_font("Arial", "", 10)
        self.set_text_color(40, 40, 40)
        self.set_x(self.l_margin)
        self.cell(indent, 5.5, chr(8226))
        x = self.get_x()
        self.set_font("Arial", "B", 10)
        w = self.get_string_width(label + " ") + 2
        self.cell(w, 5.5, label + " ")
        self.set_font("Arial", "", 10)
        self.multi_cell(0, 5.5, text)
        self.ln(0.5)

    def code_block(self, text):
        self.set_fill_color(240, 240, 240)
        self.set_font("Courier", "", 9)
        self.set_text_color(40, 40, 40)
        self.set_x(self.l_margin)
        self.multi_cell(0, 5, text, fill=True)
        self.ln(2)

    def table_row(self, cells, widths, header=False):
        h = 7
        style = "B" if header else ""
        if header:
            self.set_fill_color(0, 102, 204)
            self.set_text_color(255, 255, 255)
        else:
            self.set_fill_color(248, 248, 248)
            self.set_text_color(40, 40, 40)
        self.set_font("Arial", style, 9)
        for i, (cell, w) in enumerate(zip(cells, widths)):
            self.cell(w, h, str(cell), border=1, fill=True, align="C" if header else "L")
        self.ln()

    def add_endpoint_table(self, endpoints):
        """endpoints: list of (method, path, desc, perm)"""
        widths = [20, 70, 60, 40]
        self.table_row(["Methode", "Endpoint", "Description", "Permission"], widths, header=True)
        for ep in endpoints:
            method, path, desc, perm = ep
            if self.get_y() > 260:
                self.add_page()
                self.table_row(["Methode", "Endpoint", "Description", "Permission"], widths, header=True)
            self.set_font("Courier", "B", 8)
            self.set_text_color(40, 40, 40)
            self.set_fill_color(255, 255, 255)
            self.cell(widths[0], 6, method, border=1, fill=True)
            self.set_font("Courier", "", 7)
            self.cell(widths[1], 6, path[:42], border=1, fill=True)
            self.set_font("Arial", "", 8)
            self.cell(widths[2], 6, desc[:35], border=1, fill=True)
            self.set_font("Arial", "", 8)
            self.cell(widths[3], 6, perm[:24], border=1, fill=True)
            self.ln()

    def qa_block(self, question, answer):
        self.set_font("Arial", "B", 10)
        self.set_text_color(0, 80, 160)
        self.set_x(self.l_margin)
        self.multi_cell(0, 5.5, f"Q: {question}")
        self.set_font("Arial", "", 10)
        self.set_text_color(40, 40, 40)
        self.set_x(self.l_margin)
        self.multi_cell(0, 5.5, f"R: {answer}")
        self.ln(2)


# ============================================================
# PDF 1 : Backend et Base de Donnees
# ============================================================
def generate_pdf1():
    pdf = DocPDF("Backend Django & Base de Donnees PostgreSQL", "Documentation Technique Complète")
    pdf.alias_nb_pages()
    pdf.cover_page("Backend Django &\nBase de Donnees PostgreSQL",
                   "Documentation Technique Complete",
                   "Django 6.0.3 | DRF | PostgreSQL | JWT | Mistral AI")

    # --- Sommaire ---
    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.set_text_color(0, 80, 160)
    pdf.cell(0, 10, "Sommaire", new_x="LMARGIN", new_y="NEXT")
    toc = [
        "1. Architecture Backend",
        "2. Les 6 Applications Django",
        "3. Base de Donnees PostgreSQL - Modeles",
        "4. Relations entre Modeles",
        "5. Systeme d'Authentification JWT",
        "6. Signaux Django",
        "7. Configuration psycopg2 et Connection Pooling",
    ]
    for item in toc:
        pdf.set_font("Arial", "", 11)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 7, item, new_x="LMARGIN", new_y="NEXT")

    # --- Section 1 ---
    pdf.add_page()
    pdf.section_title(1, "Architecture Backend")
    pdf.body_text(
        "Le backend du projet Djezzy Supervision est bati sur Django 6.0.3 avec Django REST Framework (DRF). "
        "L'architecture suit le pattern MVT (Model-View-Template) adapte pour une API REST separée du frontend."
    )
    pdf.sub_title("1.1 Configuration Django (settings.py)")
    pdf.body_text(
        "Le fichier settings.py configure l'ensemble du framework : INSTALLED_APPS inclut les 6 applications "
        "personnalisees (accounts, sites_reseau, reclamations, dashboard, cartographie, audit_log) ainsi que "
        "rest_framework, rest_framework_simplejwt, et rest_framework_simplejwt.token_blacklist."
    )
    pdf.bullet("SECRET_KEY chargee depuis le fichier .env via python-dotenv")
    pdf.bullet("DEBUG = True en developpement, False en production")
    pdf.bullet("ALLOWED_HOSTS = ['localhost', '127.0.0.1']")
    pdf.bullet("CORS_ALLOW_ALL_ORIGINS = True en dev, whitelist en prod")
    pdf.bullet("DATABASES : PostgreSQL via psycopg2")

    pdf.sub_title("1.2 WSGI / ASGI")
    pdf.body_text(
        "Le projet utilise wsgi.py comme point d'entree principal. Le serveur de developpement Django est "
        "utilise en local (python manage.py runserver). En production, Gunicorn sert l'application via WSGI."
    )

    pdf.sub_title("1.3 Middleware Chain")
    pdf.bullet("SecurityMiddleware : securite HTTP headers")
    pdf.bullet("SessionMiddleware : gestion des sessions")
    pdf.bullet("CorsMiddleware : gestion CORS (django-cors-headers)")
    pdf.bullet("CommonMiddleware : URLs avec slash, content length")
    pdf.bullet("CsrfViewMiddleware : protection CSRF")
    pdf.bullet("AuthenticationMiddleware : authentification utilisateur")
    pdf.bullet("MessageMiddleware : messages flash")
    pdf.bullet("XFrameOptionsMiddleware : protection clickjacking")
    pdf.bullet("AdminIPRestrictionMiddleware : restreint l'acces /admin/ aux IPs autorisees")

    pdf.sub_title("1.4 Structure des URLs")
    pdf.body_text("Les URLs sont distribuees sous /api/ selon l'application :")
    pdf.bullet("/api/accounts/ -> authentification et gestion utilisateurs")
    pdf.bullet("/api/sites/ -> gestion des sites reseau")
    pdf.bullet("/api/reclamations/ -> tickets et groupes")
    pdf.bullet("/api/dashboard/ -> KPIs, rapports IA, statistiques")
    pdf.bullet("/api/audit/ -> journal d'audit")
    pdf.bullet("/api/carte/ -> donnees cartographiques")

    # --- Section 2 ---
    pdf.add_page()
    pdf.section_title(2, "Les 6 Applications Django")

    apps_info = [
        ("accounts", "Gestion de l'authentification et des utilisateurs",
         "CustomUser model etendu avec role (ADMIN, SUPERVISEUR, INGENIEUR_RESEAUX, AGENT_CALL_CENTER, RESPONSABLE_REPORTING), "
         "code_user unique (ING001, AG001...), systeme d'archivage logique (is_archived). "
         "Endpoints : login JWT, logout, register, update, archive/restore, toggle-active. "
         "Endpoints specifiques : agents-cc, ingenieurs. Statistiques utilisateurs."),
        ("sites_reseau", "Gestion des sites reseau telecom",
         "Modele SiteReseau avec codeSite auto-genere (S001-S035), coordonnees GPS (coordX, coordY), "
         "statuts (UP, DOWN, DEGRADE, PERTURBE, MAINTENANCE), technologies (5G), rayon de couverture. "
         "35 sites dans 19 communes de la wilaya d'Alger. CRUD complet + archivage + modification statut."),
        ("reclamations", "Gestion des tickets et groupes de tickets",
         "Modeles Reclamation, GroupeTicket, CommentaireTicket. "
         "Systeme de mots-cles IA pour classification automatique (53 mots-cles, 9 categories). "
         "Groupement automatique par site/famille (creneau 3 jours). "
         "Cascade de statut du GroupeTicket vers ses Reclamations. "
         "400 reclamations, 50 groupes en base de test."),
        ("dashboard", "Tableaux de bord et rapports IA",
         "KPIs en temps reel (uptime, latence, tickets ouverts, taux resolution). "
         "Statistiques pour graphiques Recharts. "
         "Integration Mistral AI pour generation de rapports. "
         "Archivage automatique des rapports >3 mois. "
         "Performance par role, information systeme."),
        ("cartographie", "Affichage cartographique des sites",
         "API REST pour les donnees de carte. "
         "Sites avec coordonnees GPS, statuts, rayons de couverture. "
         "Integration Leaflet.js côté frontend avec cercles colores (vert=UP, rouge=DOWN)."),
        ("audit_log", "Journal d'audit et suivi des actions",
         "Modele ActivityLog enregistrant chaque action : type (login, create_ticket, archive_user...), "
         "detail, adresse IP, timestamp. 27 types d'actions trackes. "
         "1226 logs sur 120 jours. Accessible uniquement par l'admin."),
    ]
    for name, desc, details in apps_info:
        if pdf.get_y() > 200:
            pdf.add_page()
        pdf.sub_title(f"2.{apps_info.index((name, desc, details))+1} {name}")
        pdf.set_font("Arial", "B", 10)
        pdf.set_text_color(0, 60, 120)
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 5.5, desc)
        pdf.set_font("Arial", "", 10)
        pdf.set_text_color(40, 40, 40)
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 5.5, details)
        pdf.ln(3)

    # --- Section 3 ---
    pdf.add_page()
    pdf.section_title(3, "Base de Donnees PostgreSQL - Modeles")
    pdf.body_text(
        "La base de donnees PostgreSQL contient environ 15 tables reparties sur les 6 applications. "
        "Voici le detail complet de chaque modele avec ses champs :"
    )

    models_data = [
        ("CustomUser (accounts)", [
            ("id", "AutoField", "Cle primaire auto-incremente"),
            ("username", "CharField", "Nom d'utilisateur unique"),
            ("email", "EmailField", "Adresse email (identifiant de login)"),
            ("first_name", "CharField", "Prenom"),
            ("last_name", "CharField", "Nom de famille"),
            ("code_user", "CharField", "Code unique (ING001, AG001, ADM001)"),
            ("role", "CharField", "ADMIN | SUPERVISEUR | INGENIEUR_RESEAUX | AGENT_CALL_CENTER"),
            ("is_active", "BooleanField", "Compte actif ou desactive"),
            ("is_archived", "BooleanField", "Archive logiquement"),
            ("last_login", "DateTimeField", "Derniere connexion"),
            ("password", "CharField", "Hash PBKDF2 du mot de passe"),
        ]),
        ("SiteReseau (sites_reseau)", [
            ("id", "AutoField", "Cle primaire"),
            ("codeSite", "CharField", "Code unique auto-genere (S001-S035)"),
            ("nom", "CharField", "Nom du site"),
            ("wilaya", "CharField", "Wilaya (Alger)"),
            ("commune", "CharField", "Commune"),
            ("coordX", "FloatField", "Longitude GPS"),
            ("coordY", "FloatField", "Latitude GPS"),
            ("statut", "CharField", "UP | DOWN | DEGRADE | PERTURBE | MAINTENANCE"),
            ("technologie", "CharField", "Technologie (5G)"),
            ("rayon_couverture", "FloatField", "Rayon en metres"),
            ("archive", "BooleanField", "Site archive"),
        ]),
        ("Client (reclamations)", [
            ("id", "AutoField", "Cle primaire"),
            ("numero", "CharField", "Numero client"),
            ("nom", "CharField", "Nom du client"),
            ("prenom", "CharField", "Prenom du client"),
            ("email", "EmailField", "Email du client"),
            ("telephone", "CharField", "Telephone"),
            ("adresse", "CharField", "Adresse postale"),
        ]),
        ("Reclamation (reclamations)", [
            ("id", "AutoField", "Cle primaire"),
            ("numero_ticket", "CharField", "Numero unique du ticket"),
            ("nom_client", "CharField", "Nom du client"),
            ("telephone_client", "CharField", "Telephone"),
            ("email_client", "EmailField", "Email"),
            ("type_client", "CharField", "Type de client"),
            ("priorite", "CharField", "critique | haute | normale | basse"),
            ("statut", "CharField", "ouvert | resolu | ferme"),
            ("mots_cles_ia", "JSONField", "Mots-cles IA extraits"),
            ("site", "FK -> SiteReseau", "Site associe"),
            ("client", "FK -> Client", "Client concerne"),
            ("groupe", "FK -> GroupeTicket", "Groupe de tickets"),
            ("assigne_a", "FK -> CustomUser", "Ingénieur assigne"),
            ("cree_par", "FK -> CustomUser", "Agent qui a cree"),
            ("created_at", "DateTimeField", "Date de creation"),
            ("updated_at", "DateTimeField", "Derniere modification"),
            ("resolu_le", "DateTimeField", "Date de resolution"),
            ("is_archived", "BooleanField", "Archive logiquement"),
            ("archived_at", "DateTimeField", "Date d'archivage"),
            ("archived_by", "FK -> CustomUser", "Qui a archive"),
        ]),
        ("GroupeTicket (reclamations)", [
            ("id", "AutoField", "Cle primaire"),
            ("numero_ticket", "CharField", "Numero du groupe"),
            ("titre", "CharField", "Titre descriptif"),
            ("description", "TextField", "Description detaillee"),
            ("mots_cles", "JSONField", "Mots-cles du groupe"),
            ("priorite", "CharField", "critique | haute | normale | basse"),
            ("statut", "CharField", "ouvert | resolu | ferme"),
            ("site", "FK -> SiteReseau", "Site concerne"),
            ("assigne_a", "FK -> CustomUser", "Responsable"),
            ("cree_par", "FK -> CustomUser", "Createur"),
            ("nombre_reclamations", "IntegerField", "Nombre de tickets lies"),
            ("premier_signalement", "DateTimeField", "Date du 1er signalement"),
            ("created_at", "DateTimeField", "Date de creation"),
            ("resolu_le", "DateTimeField", "Date de resolution"),
            ("is_archived", "BooleanField", "Archive"),
            ("archived_at", "DateTimeField", "Date d'archivage"),
        ]),
        ("CommentaireTicket (reclamations)", [
            ("id", "AutoField", "Cle primaire"),
            ("reclamation", "FK -> Reclamation", "Ticket commente"),
            ("auteur", "FK -> CustomUser", "Auteur du commentaire"),
            ("contenu", "TextField", "Texte du commentaire"),
            ("created_at", "DateTimeField", "Date de creation"),
        ]),
        ("RapportIA (dashboard)", [
            ("id", "AutoField", "Cle primaire"),
            ("titre", "CharField", "Titre du rapport"),
            ("prompt", "TextField", "Prompt initial"),
            ("contenu", "TextField", "Contenu HTML genere"),
            ("date_debut", "DateField", "Date debut periode"),
            ("date_fin", "DateField", "Date fin periode"),
            ("cree_par", "FK -> CustomUser", "Superviseur createur"),
            ("created_at", "DateTimeField", "Date de creation"),
            ("updated_at", "DateTimeField", "Derniere modification"),
            ("is_archived", "BooleanField", "Archive (>3 mois auto)"),
            ("archived_at", "DateTimeField", "Date d'archivage"),
            ("archived_by", "FK -> CustomUser", "Qui a archive"),
        ]),
        ("ActivityLog (audit_log)", [
            ("id", "AutoField", "Cle primaire"),
            ("user", "FK -> CustomUser", "Utilisateur concerne"),
            ("action", "CharField", "Type d'action (27 types)"),
            ("detail", "TextField", "Description detaillee"),
            ("ip_address", "GenericIPAddressField", "IP de l'origine"),
            ("created_at", "DateTimeField", "Timestamp"),
        ]),
    ]

    for model_name, fields in models_data:
        if pdf.get_y() > 200:
            pdf.add_page()
        pdf.sub_title(model_name)
        widths = [42, 38, 110]
        pdf.table_row(["Champ", "Type", "Description"], widths, header=True)
        for f in fields:
            if pdf.get_y() > 265:
                pdf.add_page()
                pdf.table_row(["Champ", "Type", "Description"], widths, header=True)
            pdf.set_font("Courier", "", 8)
            pdf.set_text_color(40, 40, 40)
            pdf.set_fill_color(255, 255, 255)
            pdf.cell(widths[0], 5.5, f[0][:25], border=1, fill=True)
            self_set = "B" if "FK" in f[1] else ""
            pdf.set_font("Courier", self_set, 8)
            pdf.cell(widths[1], 5.5, f[1][:22], border=1, fill=True)
            pdf.set_font("Arial", "", 8)
            pdf.cell(widths[2], 5.5, f[2][:60], border=1, fill=True)
            pdf.ln()
        pdf.ln(3)

    # --- Section 4 ---
    pdf.add_page()
    pdf.section_title(4, "Relations entre Modeles")
    pdf.body_text("Diagramme textuel des relations de cle etrangere :")
    relations = [
        "CustomUser <--- SiteReseau (pas de FK direct, relation via Reclamation/GroupeTicket)",
        "SiteReseau <--- Reclamation  (site FK -> SiteReseau.id)",
        "SiteReseau <--- GroupeTicket  (site FK -> SiteReseau.id)",
        "Client <--- Reclamation  (client FK -> Client.id)",
        "CustomUser <--- Reclamation  (assigne_a FK -> User.id, cree_par FK, archived_by FK)",
        "CustomUser <--- GroupeTicket  (assigne_a FK -> User.id, cree_par FK)",
        "CustomUser <--- CommentaireTicket  (auteur FK -> User.id)",
        "Reclamation <--- CommentaireTicket  (reclamation FK -> Reclamation.id)",
        "CustomUser <--- RapportIA  (cree_par FK -> User.id, archived_by FK)",
        "CustomUser <--- ActivityLog  (user FK -> User.id)",
        "GroupeTicket <--- Reclamation  (groupe FK -> GroupeTicket.id)",
    ]
    for r in relations:
        pdf.bullet(r)
    pdf.ln(3)
    pdf.body_text(
        "Les relations sont de type Many-to-One (ForeignKey). Un SiteReseau peut avoir plusieurs Reclamations "
        "et GroupeTickets. Un GroupeTicket contient plusieurs Reclamations. Un CustomUser peut etre assigne "
        "a plusieurs reclamations ou groupes."
    )

    # --- Section 5 ---
    pdf.section_title(5, "Systeme d'Authentification JWT")
    pdf.body_text(
        "L'authentification utilise SimpleJWT (Django REST Framework Simple JWT). "
        "Le flux est le suivant :"
    )
    pdf.bullet("L'utilisateur envoie POST /api/accounts/login/ avec {email, password}")
    pdf.bullet("Le backend verifie les identifiants et genere deux tokens :")
    pdf.bullet("  - access token (duree : 30 minutes) pour les requetes authentifiees")
    pdf.bullet("  - refresh token (duree : 24 heures) pour renouveler l'access token")
    pdf.bullet("Le payload du JWT contient : user_id, role, code_user, email, exp, iat")
    pdf.bullet("Le frontend stocke les tokens dans localStorage")
    pdf.bullet("Chaque requete API inclut : Authorization: Bearer <access_token>")
    pdf.bullet("Lors du refresh : POST /api/accounts/token/refresh/ avec {refresh}")
    pdf.bullet("Logout : POST /api/accounts/logout/ avec le refresh token (blacklist)")
    pdf.ln(2)
    pdf.sub_title("Payload JWT personnalise")
    pdf.code_block('{\n  "token_type": "access",\n  "exp": 1234567890,\n  "iat": 1234567200,\n  "jti": "uuid-string",\n  "user_id": 1,\n  "email": "admin@djezzy.dz",\n  "role": "ADMIN",\n  "code_user": "ADM001"\n}')

    # --- Section 6 ---
    pdf.add_page()
    pdf.section_title(6, "Signaux Django")
    pdf.body_text(
        "Le projet utilise les signaux Django pour executer des taches au demarrage du serveur. "
        "Un thread d'auto-archivage est lance au signal post_migrate :"
    )
    pdf.bullet("Le signal post_migrate declenche le lancement d'un thread en arriere-plan")
    pdf.bullet("Ce thread execute la fonction auto_archive() avec une boucle infinie (toutes les 24h)")
    pdf.bullet("auto_archive() archive les reclamations resolues depuis plus d'1 mois")
    pdf.bullet("auto_archive() archive les rapports IA crees depuis plus de 3 mois")
    pdf.bullet("L'archivage est logique : is_archived=True, archived_at=date courante")
    pdf.bullet("Thread demarrage unique : verifie si un thread tourne deja (daemon thread)")

    # --- Section 7 ---
    pdf.section_title(7, "Configuration psycopg2 et Connection Pooling")
    pdf.body_text(
        "La connexion a PostgreSQL est geree par psycopg2-binary (adaptateur Python pour PostgreSQL). "
        "La configuration se trouve dans settings.py :"
    )
    pdf.code_block(
        'DATABASES = {\n'
        '    "default": {\n'
        '        "ENGINE": "django.db.backends.postgresql",\n'
        '        "NAME": os.getenv("DB_NAME", "djezzy_supervision"),\n'
        '        "USER": os.getenv("DB_USER", "postgres"),\n'
        '        "PASSWORD": os.getenv("DB_PASSWORD", ""),\n'
        '        "HOST": os.getenv("DB_HOST", "localhost"),\n'
        '        "PORT": os.getenv("DB_PORT", "5432"),\n'
        '    }\n'
        '}'
    )
    pdf.body_text(
        "Django gere nativement le connection pooling via ses connexions de base de donnees. "
        "En production, un outil comme PgBouncer peut etre ajoute pour le pooling avance. "
        "La base contient environ 15 tables, 400 reclamations, 50 groupes, 35 sites, "
        "1226 logs d'audit, 12 rapports IA et 17 utilisateurs."
    )
    pdf.output(os.path.join(MEDIA_DIR, "01_Backend_et_Base_de_Donnees.pdf"))
    print("  [OK] 01_Backend_et_Base_de_Donnees.pdf")


# ============================================================
# PDF 2 : Requetes API
# ============================================================
def generate_pdf2():
    pdf = DocPDF("Documentation des Requetes API REST", "Endpoints, Permissions & Formats")
    pdf.alias_nb_pages()
    pdf.cover_page("Documentation des\nRequetes API REST",
                   "Endpoints, Permissions et Formats de Reponse",
                   "Base URL : http://127.0.0.1:8000/api/")

    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.set_text_color(0, 80, 160)
    pdf.cell(0, 10, "Sommaire", new_x="LMARGIN", new_y="NEXT")
    for sec in ["1. AUTH - Authentification", "2. USERS - Gestion Utilisateurs",
                "3. SITES - Gestion Sites Reseau", "4. RECLAMATIONS - Tickets",
                "5. GROUPES - Groupes de Tickets", "6. DASHBOARD - Tableaux de Bord",
                "7. AUDIT - Journal d'Audit", "8. CARTOGRAPHIE - Carte"]:
        pdf.set_font("Arial", "", 11)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 7, sec, new_x="LMARGIN", new_y="NEXT")

    # AUTH
    pdf.add_page()
    pdf.section_title(1, "AUTH - Authentification")
    pdf.body_text("Base : /api/accounts/")
    pdf.add_endpoint_table([
        ("POST", "/api/accounts/login/", "Connexion (email, password)", "Public"),
        ("POST", "/api/accounts/logout/", "Deconnexion (refresh token)", "Authentifie"),
        ("GET", "/api/accounts/me/", "Profil utilisateur connecte", "Authentifie"),
        ("PUT", "/api/accounts/profile/update/", "Modifier profil", "Authentifie"),
        ("POST", "/api/accounts/password/change/", "Changer mot de passe", "Authentifie"),
    ])
    pdf.ln(3)
    pdf.sub_title("Details - Login")
    pdf.code_block(
        "POST /api/accounts/login/\n"
        "Content-Type: application/json\n\n"
        '{\n  "email": "admin@djezzy.dz",\n  "password": "password123"\n}\n\n'
        "Reponse 200:\n"
        '{\n  "access": "eyJhbGci...",\n  "refresh": "eyJhbGci...",\n'
        '  "user": {\n    "id": 1, "email": "admin@djezzy.dz",\n'
        '    "role": "ADMIN", "code_user": "ADM001",\n'
        '    "first_name": "Admin", "last_name": "Principal"\n  }\n}'
    )
    pdf.sub_title("Details - Password Change")
    pdf.code_block(
        "POST /api/accounts/password/change/\n"
        "Authorization: Bearer <token>\n"
        '{\n  "old_password": "...",\n  "new_password": "..."\n}'
    )

    # USERS
    pdf.add_page()
    pdf.section_title(2, "USERS - Gestion Utilisateurs")
    pdf.body_text("Base : /api/accounts/users/")
    pdf.add_endpoint_table([
        ("GET", "/api/accounts/users/", "Liste (filtres: role, search, active, archived)", "ADMIN"),
        ("GET", "/api/accounts/users/stats/", "Statistiques utilisateurs", "ADMIN"),
        ("POST", "/api/accounts/users/register/", "Creer utilisateur", "ADMIN"),
        ("PUT", "/api/accounts/users/<code>/update/", "Modifier utilisateur", "ADMIN"),
        ("POST", "/api/accounts/users/<code>/archive/", "Archiver", "ADMIN"),
        ("POST", "/api/accounts/users/<code>/restore/", "Restaurer", "ADMIN"),
        ("POST", "/api/accounts/users/<code>/toggle-active/", "Activer/Desactiver", "ADMIN"),
        ("GET", "/api/accounts/agents-cc/", "Liste agents call center", "ADMIN/SUP"),
        ("GET", "/api/accounts/ingenieurs/", "Liste ingenieurs", "ADMIN/SUP"),
    ])
    pdf.ln(3)
    pdf.sub_title("Details - Filtres GET /users/")
    pdf.bullet("?role=ADMIN | SUPERVISEUR | INGENIEUR_RESEAUX | AGENT_CALL_CENTER")
    pdf.bullet("?search=terme (cherche dans username, email, nom, code_user)")
    pdf.bullet("?is_active=true | false")
    pdf.bullet("?archived=true | false")
    pdf.sub_title("Details - Register")
    pdf.code_block(
        "POST /api/accounts/users/register/\n"
        '{\n  "username": "agent01", "email": "agent01@djezzy.dz",\n'
        '  "first_name": "Ali", "last_name": "Benmoussa",\n'
        '  "role": "AGENT_CALL_CENTER", "password": "pass123"\n}'
    )

    # SITES
    pdf.add_page()
    pdf.section_title(3, "SITES - Gestion Sites Reseau")
    pdf.body_text("Base : /api/sites/")
    pdf.add_endpoint_table([
        ("GET", "/api/sites/", "Liste sites (filtres: search, statut)", "Tous authentifies"),
        ("POST", "/api/sites/creer/", "Creer site (codeSite auto)", "ADMIN/ING"),
        ("GET", "/api/sites/<id>/", "Detail d'un site", "Tous authentifies"),
        ("PUT", "/api/sites/<id>/update/", "Modifier site", "ADMIN/ING"),
        ("POST", "/api/sites/<id>/archiver/", "Archiver site", "ADMIN"),
        ("POST", "/api/sites/<id>/restaurer/", "Restaurer site", "ADMIN"),
        ("PUT", "/api/sites/<id>/modifier-statut/", "Changer statut", "ADMIN/ING"),
    ])
    pdf.ln(3)
    pdf.sub_title("Details - Statuts possibles")
    pdf.bullet("UP : Site operationnel (vert sur la carte)")
    pdf.bullet("DOWN : Site hors service (rouge)")
    pdf.bullet("DEGRADE : Performance reduite (orange)")
    pdf.bullet("PERTURBE : Perturbation en cours (jaune)")
    pdf.bullet("MAINTENANCE : En maintenance planifiee (bleu)")

    # RECLAMATIONS
    pdf.add_page()
    pdf.section_title(4, "RECLAMATIONS - Tickets")
    pdf.body_text("Base : /api/reclamations/")
    pdf.add_endpoint_table([
        ("GET", "/api/reclamations/", "Liste (statut, archived, priorite, etc.)", "Tous auth."),
        ("POST", "/api/reclamations/creer/", "Creer reclamation (+auto groupement)", "AGENT_CC"),
        ("GET", "/api/reclamations/<id>/", "Detail reclamation", "Tous authentifies"),
        ("PUT", "/api/reclamations/<id>/", "Modifier reclamation", "Tous authentifies"),
        ("POST", "/api/reclamations/<id>/archiver/", "Archiver (soft delete)", "ING/ADMIN"),
        ("POST", "/api/reclamations/<id>/restaurer/", "Restaurer", "ADMIN"),
        ("POST", "/api/reclamations/<id>/commentaires/", "Ajouter commentaire", "Tous auth."),
        ("GET", "/api/reclamations/mots-cles/", "Mots-cles IA dispo", "Tous authentifies"),
        ("POST", "/api/reclamations/preview-priorite/", "Preview priorite IA", "AGENT_CC"),
    ])
    pdf.ln(3)
    pdf.sub_title("Details - Filtres GET /reclamations/")
    pdf.bullet("?statut=ouvert | resolu | ferme")
    pdf.bullet("?archived=true | false")
    pdf.bullet("?priorite=critique | haute | normale | basse")
    pdf.bullet("?client=numero_client")
    pdf.bullet("?site_id=id_du_site")
    pdf.bullet("?date_debut=YYYY-MM-DD & ?date_fin=YYYY-MM-DD")
    pdf.sub_title("Details - Creer reclamation")
    pdf.code_block(
        "POST /api/reclamations/creer/\n"
        '{\n  "nom_client": "Mohamed", "telephone_client": "0555123456",\n'
        '  "email_client": "mohamed@email.com", "type_client": "particulier",\n'
        '  "site_id": 1, "description": "Pas de signal 5G..."\n}\n\n'
        "Reponse: reclamation creee + groupe cree/trouve automatiquement\n"
        "La priorite est calculee par les mots-cles IA."
    )

    # GROUPES
    pdf.add_page()
    pdf.section_title(5, "GROUPES - Groupes de Tickets")
    pdf.body_text("Base : /api/reclamations/groupes/")
    pdf.add_endpoint_table([
        ("GET", "/api/reclamations/groupes/", "Liste groupes (statut, site, archived)", "Tous auth."),
        ("GET", "/api/reclamations/groupes/stats/", "Statistiques groupes", "Tous authentifies"),
        ("GET", "/api/reclamations/groupes/<id>/", "Detail groupe", "Tous authentifies"),
        ("PUT", "/api/reclamations/groupes/<id>/modifier/", "Modifier groupe", "ING/ADMIN"),
        ("POST", "/api/reclamations/groupes/<id>/resoudre/", "Resoudre groupe", "ING/ADMIN"),
        ("POST", "/api/reclamations/groupes/<id>/assigner/", "Assigner a un ingenieur", "SUP/ADMIN"),
    ])
    pdf.ln(3)
    pdf.sub_title("Cascade de statut")
    pdf.body_text(
        "Quand un GroupeTicket est marque comme 'resolu', toutes les Reclamations associees "
        "passent automatiquement au statut 'resolu' avec la date resolu_le. "
        "Meme mecanisme pour le statut 'ferme'."
    )

    # DASHBOARD
    pdf.add_page()
    pdf.section_title(6, "DASHBOARD - Tableaux de Bord et Rapports IA")
    pdf.body_text("Base : /api/dashboard/")
    pdf.add_endpoint_table([
        ("GET", "/api/dashboard/stats/?jours=30", "KPIs principaux", "ADMIN/SUP"),
        ("GET", "/api/dashboard/reporting/?jours=30", "Donnees graphiques", "ADMIN/SUP"),
        ("GET", "/api/dashboard/carto-sites/", "Sites pour carte", "Tous authentifies"),
        ("GET", "/api/dashboard/rapport-ia/", "Liste rapports IA", "SUP/ADMIN"),
        ("POST", "/api/dashboard/rapport-ia/generer/", "Generer rapport Mistral", "SUP"),
        ("POST", "/api/dashboard/rapport-ia/", "Sauvegarder rapport", "SUP"),
        ("GET", "/api/dashboard/rapport-ia/<id>/", "Voir rapport", "SUP/ADMIN"),
        ("PUT", "/api/dashboard/rapport-ia/<id>/", "Modifier rapport", "SUP"),
        ("DELETE", "/api/dashboard/rapport-ia/<id>/", "Supprimer rapport", "SUP/ADMIN"),
        ("GET", "/api/dashboard/rapport-ia/archives/", "Rapports archives", "SUP/ADMIN"),
        ("POST", "/api/dashboard/rapport-ia/archives/", "Restaurer rapport", "ADMIN"),
        ("GET", "/api/dashboard/performance/?role=ingenieurs", "Performance equipe", "SUP/ADMIN"),
        ("GET", "/api/dashboard/system-info/", "Info systeme", "ADMIN"),
    ])
    pdf.ln(3)
    pdf.sub_title("Details - Generer rapport IA")
    pdf.code_block(
        "POST /api/dashboard/rapport-ia/generer/\n"
        '{\n  "prompt": "Analyse des tickets du mois",\n'
        '  "date_debut": "2025-01-01",\n  "date_fin": "2025-01-31"\n}\n\n'
        "Le backend collecte les stats, envoie a Mistral, retourne le HTML genere."
    )

    # AUDIT
    pdf.add_page()
    pdf.section_title(7, "AUDIT - Journal d'Audit")
    pdf.body_text("Base : /api/audit/")
    pdf.add_endpoint_table([
        ("GET", "/api/audit/health/", "Sante du systeme d'audit", "ADMIN"),
        ("GET", "/api/audit/logs/?page=1&action=&search=", "Liste des logs", "ADMIN"),
        ("GET", "/api/audit/stats/", "Statistiques d'audit", "ADMIN"),
    ])
    pdf.ln(3)
    pdf.sub_title("Types d'actions enregistrees (27 types)")
    actions = [
        "login, logout, register, update_user, archive_user, restore_user,",
        "toggle_active_user, create_ticket, update_ticket, archive_ticket,",
        "restore_ticket, create_group, update_group, resolve_group,",
        "assign_group, add_comment, create_site, update_site,",
        "archive_site, restore_site, update_site_status,",
        "generate_report, save_report, update_report, delete_report,",
        "archive_report, restore_report"
    ]
    for a in actions:
        pdf.bullet(a)

    # CARTO
    pdf.section_title(8, "CARTOGRAPHIE - Carte Interactive")
    pdf.add_endpoint_table([
        ("GET", "/api/carte/sites/", "Sites avec GPS pour Leaflet", "Tous authentifies"),
    ])
    pdf.ln(2)
    pdf.sub_title("Reponse /carte/sites/")
    pdf.code_block(
        '[\n  {\n    "id": 1, "codeSite": "S001", "nom": "Site Bab Ezzouar",\n'
        '    "coordX": 3.1833, "coordY": 36.7333,\n'
        '    "statut": "UP", "technologie": "5G",\n'
        '    "rayon_couverture": 500\n  }, ...\n]'
    )

    pdf.output(os.path.join(MEDIA_DIR, "02_Requetes_API.pdf"))
    print("  [OK] 02_Requetes_API.pdf")


# ============================================================
# PDF 3 : Frontend React
# ============================================================
def generate_pdf3():
    pdf = DocPDF("Frontend React - Interface Utilisateur", "Composants, Pages et Architecture")
    pdf.alias_nb_pages()
    pdf.cover_page("Frontend React\nInterface Utilisateur",
                   "Composants, Pages et Architecture",
                   "React 19 | Recharts | Leaflet | html2pdf.js")

    # Sommaire
    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.set_text_color(0, 80, 160)
    pdf.cell(0, 10, "Sommaire", new_x="LMARGIN", new_y="NEXT")
    for s in ["1. Architecture React", "2. Les 6 Pages Detaillees",
              "3. Composants Reutilisables", "4. Couche API",
              "5. Contexte Notification", "6. Hooks Personnalises",
              "7. Theme et CSS Variables", "8. Bibliotheques Utilisees"]:
        pdf.set_font("Arial", "", 11)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 7, s, new_x="LMARGIN", new_y="NEXT")

    # Section 1
    pdf.add_page()
    pdf.section_title(1, "Architecture React")
    pdf.sub_title("1.1 Point d'entree - index.js / App.js")
    pdf.body_text(
        "Le frontend est cree avec Create React App (React 19.2.4). "
        "Le point d'entree est src/index.js qui charge App.js. "
        "App.js definit le routage global avec React Router v6."
    )
    pdf.sub_title("1.2 Routing et PrivateRoute")
    pdf.body_text(
        "Le routeur React Router v6 gere 6 routes principales. "
        "Un composant PrivateRoute protège les routes authentifiees : "
        "il verifie la presence du token JWT dans localStorage. "
        "Si le token est absent ou expire, l'utilisateur est redirige vers /login."
    )
    pdf.bullet("/ -> redirection vers /admin ou /ingenieur selon le role")
    pdf.bullet("/login -> page de connexion (Login.jsx)")
    pdf.bullet("/admin -> AdminDashboard.jsx (ADMIN, RESPONSABLE_REPORTING)")
    pdf.bullet("/ingenieur -> EngineerDashboard.jsx (INGENIEUR_RESEAUX)")
    pdf.bullet("/superviseur -> SupervisorDashboard.jsx (SUPERVISEUR)")
    pdf.bullet("/call-center -> CallCenter.jsx (AGENT_CALL_CENTER)")
    pdf.bullet("/profile -> Profile.jsx (tous les roles)")

    pdf.sub_title("1.3 Structure des dossiers src/")
    pdf.bullet("pages/ -> Login, AdminDashboard, EngineerDashboard, SupervisorDashboard, CallCenter, Profile")
    pdf.bullet("components/ -> Map.jsx, DetailModal.jsx, et composants de dashboard")
    pdf.bullet("api/ -> tickets.js, dashboard.js (couche d'appels API)")
    pdf.bullet("context/ -> NotificationContext.jsx")
    pdf.bullet("hooks/ -> useAnimations.js")
    pdf.bullet("styles/ -> themes.css, index.css")

    # Section 2 : Pages
    pdf.add_page()
    pdf.section_title(2, "Les 6 Pages Detaillees")

    pdf.sub_title("2.1 Login.jsx")
    pdf.body_text(
        "Page de connexion au systeme. Formulaire avec deux champs : email et mot de passe. "
        "Appelle POST /api/accounts/login/ avec les credentials. "
        "Stocke les tokens (access, refresh) et les infos utilisateur dans localStorage. "
        "Redirection automatique selon le role : ADMIN -> /admin, INGENIEUR -> /ingenieur, "
        "SUPERVISEUR -> /superviseur, AGENT_CALL_CENTER -> /call-center. "
        "Gestion des erreurs avec message d'erreur affiche. Design responsive avec logo Djezzy."
    )

    pdf.sub_title("2.2 AdminDashboard.jsx")
    pdf.body_text(
        "Tableau de bord complet pour l'administrateur. C'est la page la plus complete du systeme, "
        "regroupant toutes les fonctionnalites en une seule interface. "
        "Layout avec sidebar de navigation et zone principale dynamique."
    )
    pdf.bullet("KPIs en temps reel : Uptime, Latence API, Utilisateurs, Reseau (UP/DOWN), Tickets ouverts, Taux resolution")
    pdf.bullet("Graphiques Recharts : BarChart (tickets par statut), LineChart (evolution temporelle), PieChart (repartition)")
    pdf.bullet("Gestion CRUD complete : utilisateurs (register, update, archive, restore, toggle-active)")
    pdf.bullet("Gestion sites : creer, modifier, changer statut, archiver, restaurer")
    pdf.bullet("Gestion tickets : lister, modifier, assigner, archiver, restaurer, commenter")
    pdf.bullet("Cartographie Leaflet : affichage des 35 sites avec statuts colores")
    pdf.bullet("Rapports IA : generer, sauvegarder, modifier, supprimer, archiver, restaurer")
    pdf.bullet("Audit trail : consulter les 1226 logs d'action avec filtres")
    pdf.bullet("Performance equipe : graphiques de productite par role")

    pdf.add_page()
    pdf.sub_title("2.3 EngineerDashboard.jsx")
    pdf.body_text(
        "Dashboard specialise pour les ingenieurs reseaux. Concentre sur la gestion des tickets "
        "et des sites reseau."
    )
    pdf.bullet("Vue reclamations individuelles : liste complete avec filtres statut, priorite, date")
    pdf.bullet("Vue reclamations groupees : gestion des GroupeTickets, resolution par groupe")
    pdf.bullet("Gestion sites 5G : modification statut, modification details, cartographie")
    pdf.bullet("Cartographie interactive : Leaflet avec zoom, popups, cercles de couverture")
    pdf.bullet("Archives : consultation des reclamations et groupes archives")
    pdf.bullet("Statistiques personnelles : tickets traits, temps moyen de resolution")

    pdf.sub_title("2.4 SupervisorDashboard.jsx")
    pdf.body_text(
        "Dashboard pour les superviseurs avec accent sur l'analyse et les rapports IA."
    )
    pdf.bullet("KPIs synthetiques : vues d'ensemble sur les performances")
    pdf.bullet("Graphiques d'evolution : LineChart sur les 30 derniers jours")
    pdf.bullet("Graphiques par priorite : repartition critique/haute/normale/basse")
    pdf.bullet("Graphiques de disponibilite : suivi UP/DOWN des sites")
    pdf.bullet("Creation de rapports IA : envoi de prompts a Mistral AI, visualisation du HTML genere")
    pdf.bullet("Performance des agents : classement et metriques par agent call center")
    pdf.bullet("Export PDF : export des rapports en PDF via html2pdf.js")

    pdf.sub_title("2.5 CallCenter.jsx")
    pdf.body_text(
        "Interface dediee aux agents du call center pour la gestion des reclamations."
    )
    pdf.bullet("Liste reclamations non traitees : tickets en attente de traitement")
    pdf.bullet("Liste reclamations traitees : tickets resolus ou fermes")
    pdf.bullet("Formulaire de creation : saisie complete (client, site, description)")
    pdf.bullet("Modal de detail : vue detaillee d'une reclamation avec commentaires")
    pdf.bullet("Preview priorite IA : simulation du score avant creation")
    pdf.bullet("Filtres rapides : par statut, priorite, date")

    pdf.sub_title("2.6 Profile.jsx")
    pdf.body_text(
        "Page de profil utilisateur accessible a tous les roles."
    )
    pdf.bullet("Informations personnelles : nom, prenom, email, role, code_user")
    pdf.bullet("Changement de mot de passe : formulaire old_password + new_password")
    pdf.bullet("Historique de connexion : derniere date de login")

    # Section 3
    pdf.add_page()
    pdf.section_title(3, "Composants Reutilisables")
    pdf.sub_title("3.1 Map.jsx (Leaflet)")
    pdf.body_text(
        "Composant de carte interactive utilise dans AdminDashboard et EngineerDashboard. "
        "Integre react-leaflet avec :"
    )
    pdf.bullet("Fond de carte OpenStreetMap")
    pdf.bullet("Marqueurs pour chaque site avec popup (codeSite, nom, statut)")
    pdf.bullet("Cercles de couverture colorees selon le statut (vert=UP, rouge=DOWN, etc.)")
    pdf.bullet("Zoom dynamique centre sur Alger")
    pdf.bullet("Legende des statuts")

    pdf.sub_title("3.2 DetailModal.jsx")
    pdf.body_text(
        "Modal de detail pour les reclamations et les groupes de tickets. "
        "Affiche toutes les informations d'un ticket : client, site, dates, statut, "
        "priorite, commentaires, historique. Modal responsive avec fermeture par backdrop."
    )

    # Section 4
    pdf.section_title(4, "Couche API")
    pdf.sub_title("4.1 tickets.js")
    pdf.body_text(
        "Module contenant toutes les fonctions d'appel API liees aux tickets : "
        "fetchReclamations, createReclamation, updateReclamation, archiveReclamation, "
        "fetchGroupes, resolveGroupe, assignGroupe, etc."
    )
    pdf.bullet("Chaque fonction inclut le header Authorization: Bearer <token>")
    pdf.bullet("Gestion automatique du refresh token si 401 recu")
    pdf.bullet("Base URL depuis variable d'environnement REACT_APP_API_URL")

    pdf.sub_title("4.2 dashboard.js")
    pdf.body_text(
        "Module pour les appels dashboard : fetchStats, fetchReporting, "
        "generateRapport, saveRapport, fetchRapports, deleteRapport, "
        "fetchPerformance, fetchSystemInfo."
    )

    # Section 5
    pdf.add_page()
    pdf.section_title(5, "Contexte Notification (NotificationContext.jsx)")
    pdf.body_text(
        "Provider React Context pour la gestion des notifications globales. "
        "Permet d'afficher des alertes de succes, erreur, info ou warning "
        "depuis n'importe quel composant sans props drilling."
    )
    pdf.bullet("useNotification() hook pour acceder au contexte")
    pdf.bullet("showSuccess(message), showError(message), showInfo(message)")
    pdf.bullet("Notifications auto-dismiss apres 3 secondes")
    pdf.bullet("Stack de notifications avec animation d'entree/sortie")

    # Section 6
    pdf.section_title(6, "Hooks Personnalises (useAnimations.js)")
    pdf.body_text(
        "Hook personnalise pour gerer les animations CSS du dashboard. "
        "Fournit des classes CSS animees pour les KPIs, les cartes et les transitions de page."
    )
    pdf.bullet("Animation d'entree des KPIs (fade-in + slide-up)")
    pdf.bullet("Animation des graphiques (transition de valeurs)")
    pdf.bullet("Transition entre les sections du dashboard")
    pdf.bullet("useAnimations() retourne un objet de classes CSS")

    # Section 7
    pdf.section_title(7, "Theme et CSS Variables")
    pdf.sub_title("7.1 themes.css")
    pdf.body_text(
        "Fichier CSS definissant les variables de theme globales. "
        "Mode clair par defaut avec possibilite de passage en mode sombre. "
        "Cohesion visuelle avec la charte graphique Djezzy (bleu #0066CC)."
    )
    pdf.bullet("--primary-color: #0066CC (bleu Djezzy)")
    pdf.bullet("--secondary-color: #00A651 (vert success)")
    pdf.bullet("--danger-color: #DC3545 (rouge error)")
    pdf.bullet("--warning-color: #FFC107 (jaune warning)")
    pdf.bullet("--bg-color, --text-color, --card-bg, --sidebar-bg")
    pdf.sub_title("7.2 index.css")
    pdf.body_text(
        "Styles globaux : reset CSS, polices, body background, "
        "scrollbar personalisee, animations de base."
    )

    # Section 8
    pdf.add_page()
    pdf.section_title(8, "Bibliotheques Utilisees")
    libs = [
        ("React 19.2.4", "Framework UI principal, Create React App"),
        ("React Router v6", "Routage client-side avec PrivateRoute guard"),
        ("Recharts", "Graphiques (BarChart, LineChart, PieChart, AreaChart)"),
        ("Leaflet + react-leaflet", "Carte interactive avec OpenStreetMap"),
        ("html2pdf.js", "Export PDF cote client (html2canvas + jsPDF)"),
        ("DOMPurify", "Nettoyage du HTML genere par Mistral (XSS protection)"),
        ("jwt-decode", "Decodage du payload JWT pour extraire role et code_user"),
        ("axios ou fetch", "Appels HTTP vers l'API DRF"),
    ]
    widths = [55, 135]
    pdf.table_row(["Bibliotheque", "Utilisation"], widths, header=True)
    for lib, desc in libs:
        pdf.table_row([lib, desc], widths)

    pdf.output(os.path.join(MEDIA_DIR, "03_Frontend_React.pdf"))
    print("  [OK] 03_Frontend_React.pdf")


# ============================================================
# PDF 4 : Intelligence Artificielle Mistral
# ============================================================
def generate_pdf4():
    pdf = DocPDF("Intelligence Artificielle - Integration Mistral AI", "Rapports IA, Mots-cles et Scoring")
    pdf.alias_nb_pages()
    pdf.cover_page("Intelligence Artificielle\nIntegration Mistral AI",
                   "Rapports IA, Mots-cles et Scoring Automatique",
                   "Mistral AI | OpenAI-compatible API | NLP")

    # Sommaire
    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.set_text_color(0, 80, 160)
    pdf.cell(0, 10, "Sommaire", new_x="LMARGIN", new_y="NEXT")
    for s in ["1. Qu'est-ce que Mistral AI", "2. Configuration",
              "3. Generation de Rapports IA", "4. Groupement Automatique des Reclamations",
              "5. Systeme de Mots-cles et Scoring", "6. Securite"]:
        pdf.set_font("Arial", "", 11)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 7, s, new_x="LMARGIN", new_y="NEXT")

    # Section 1
    pdf.add_page()
    pdf.section_title(1, "Qu'est-ce que Mistral AI")
    pdf.body_text(
        "Mistral AI est un fournisseur europeen de modeles de langage (LLM). "
        "Leur API est compatible avec le format OpenAI, ce qui permet une integration "
        "simple via la librairie openai Python. Le modele utilise est Mistral Large "
        "ou Mistral Medium selon la complexite de la tache."
    )
    pdf.bullet("Modele de langage generatif (GPT-like)")
    pdf.bullet("API REST compatible OpenAI (meme format de requetes)")
    pdf.bullet("Support du francais et de l'anglais")
    pdf.bullet("Capacite de generation de HTML structure")
    pdf.bullet("Utilise pour la generation de rapports d'analyse")

    # Section 2
    pdf.section_title(2, "Configuration")
    pdf.body_text("La configuration de Mistral AI dans le projet :")
    pdf.sub_title("2.1 Variable d'environnement")
    pdf.code_block('# backend/.env\nMISTRAL_API_KEY="votre-cle-api-mistral"')
    pdf.sub_title("2.2 Client OpenAI pour Mistral")
    pdf.code_block(
        'from openai import OpenAI\n\n'
        'client = OpenAI(\n'
        '    api_key=os.getenv("MISTRAL_API_KEY"),\n'
        '    base_url="https://api.mistral.ai/v1"\n'
        ')\n\n'
        'response = client.chat.completions.create(\n'
        '    model="mistral-large-latest",\n'
        '    messages=[{"role": "user", "content": prompt}],\n'
        '    temperature=0.7,\n'
        '    max_tokens=4096\n'
        ')'
    )

    # Section 3
    pdf.add_page()
    pdf.section_title(3, "Generation de Rapports IA")
    pdf.body_text(
        "Le flux complet de generation d'un rapport IA :"
    )
    pdf.sub_title("3.1 Requete du superviseur")
    pdf.body_text(
        "Le superviseur saisit un prompt (ex: 'Analyse des tickets du mois de janvier') "
        "et selectionne une periode (date_debut, date_fin). La requete est envoyee via "
        "POST /api/dashboard/rapport-ia/generer/."
    )
    pdf.sub_title("3.2 Collecte de donnees")
    pdf.body_text("Le backend collecte automatiquement :")
    pdf.bullet("Statistiques des reclamations (nombre, statuts, priorites)")
    pdf.bullet("Donnees des sites reseau (UP, DOWN, DEGRADE)")
    pdf.bullet("Statistiques des groupes de tickets")
    pdf.bullet("Performance des ingenieurs et agents")
    pdf.bullet("Top mots-cles les plus frequents")
    pdf.bullet("Evolution temporelle des tickets")

    pdf.sub_title("3.3 Construction du prompt")
    pdf.body_text("Le contexte complet est construit sous forme de texte structure :")
    pdf.code_block(
        'prompt = f"""\n'
        'Contexte Djezzy Supervision:\n'
        '- Periode: 2025-01-01 au 2025-01-31\n'
        '- Total reclamations: 150\n'
        '- Ouvertes: 23, Resolues: 6\n'
        '- Sites UP: 30, DOWN: 5\n'
        '- Top mots-cles: signal, connexion, debit\n\n'
        'Demande du superviseur:\n'
        'Analyse des tickets du mois de janvier\n\n'
        'Genere un rapport HTML structure avec:\n'
        '- Resume executif\n- Statistiques detaillees\n'
        '- Analyse des tendances\n- Recommandations\n'
        '- Tableaux de donnees\n'
        '"""'
    )

    pdf.sub_title("3.4 Reponse de Mistral")
    pdf.body_text(
        "Mistral genere un rapport HTML structure avec des sections : resume executif, "
        "statistiques, analyse, recommandations et tableaux. Le HTML est nettoye via DOMPurify "
        "cote frontend pour prevenir les attaques XSS."
    )

    pdf.sub_title("3.5 Fallback local")
    pdf.body_text(
        "Si Mistral est indisponible (erreur reseau, rate limit, timeout), le systeme "
        "genere un rapport de base a partir de templates predefinis contenant les stats "
        "collectees sans analyse IA."
    )

    # Section 4
    pdf.add_page()
    pdf.section_title(4, "Groupement Automatique des Reclamations")
    pdf.body_text(
        "L'algorithme de groupement automatique est implemente dans services.py "
        "de l'application reclamations. Il associe les nouvelles reclamations "
        "a des groupes existants ou en cree de nouveaux."
    )
    pdf.sub_title("4.1 Algorithme de matching par mots-cles")
    pdf.body_text("Etapes du processus :")
    pdf.bullet("1. Extraction des mots-cles de la description de la reclamation")
    pdf.bullet("2. Comparaison avec les mots-cles des groupes existants (ouverts)")
    pdf.bullet("3. Calcul du score de similarite (nombre de mots-cles en commun)")
    pdf.bullet("4. Si score > seuil : ajout au groupe existant")
    pdf.bullet("5. Si aucun match : creation d'un nouveau GroupeTicket")
    pdf.bullet("6. Calcul automatique de la priorite du groupe")

    pdf.sub_title("4.2 Creation/recherche de groupes")
    pdf.body_text(
        "Le systeme recherche d'abord les GroupeTickets ouverts ayant le meme site. "
        "Pour chaque groupe candidat, il calcule l'overlap des mots-cles. "
        "Si le nombre de mots-cles communs depasse le seuil (typiquement 2), "
        "la reclamation est ajoutee au groupe. Sinon, un nouveau groupe est cree."
    )

    pdf.sub_title("4.3 Cascade statut")
    pdf.body_text(
        "Le statut du GroupeTicket se propage automatiquement a toutes ses reclamations :"
    )
    pdf.bullet("GroupeTicket passe a 'resolu' -> toutes ses Reclamations passent a 'resolu'")
    pdf.bullet("GroupeTicket passe a 'ferme' -> toutes ses Reclamations passent a 'ferme'")
    pdf.bullet("Le champ 'resolu_le' est mis a jour sur chaque reclamation")

    # Section 5
    pdf.add_page()
    pdf.section_title(5, "Systeme de Mots-cles et Scoring")
    pdf.body_text(
        "Le fichier keywords_config.py definit 53 mots-cles repartis en 9 categories. "
        "Chaque mot-cle a un score de severite de 5 a 80."
    )

    categories = [
        ("Signal", "perte signal, pas signal, aucun signal, sans signal, signal faible, pas de reseau",
         "60-80 (critique)"),
        ("Connexion", "connexion, connecte, deconnexion, deconnecte, ralentissement, lenteur",
         "40-60 (haute)"),
        ("Debit", "debit, debit bas, debit lent, vitesse, 4g, 5g, debit reduit",
         "40-60 (haute)"),
        ("Facturation", "facture, facturation, facture error, surcharge, debit, trop cher, paiement",
         "30-50 (normale)"),
        ("Equipement", "equipement, antenne, boitier, materiel, panne, capteur, alarme",
         "50-70 (haute/critique)"),
        ("Couverture", "couverture, zone, zone blanche, pas couverture, portee, rayon",
         "50-70 (haute/critique)"),
        ("Latence", "latence, ping, delai, temps reponse, timeout, attente",
         "40-60 (haute)"),
        ("Services", "internet, service, service indisponible, maintenance, coupure, panne service",
         "40-60 (haute)"),
        ("Divers", "autre, different, plusieurs, problemes, multiple",
         "5-20 (basse)"),
    ]
    widths = [28, 100, 62]
    pdf.table_row(["Categorie", "Mots-cles (exemple)", "Scores"], widths, header=True)
    for cat, kw, score in categories:
        if pdf.get_y() > 260:
            pdf.add_page()
            pdf.table_row(["Categorie", "Mots-cles (exemple)", "Scores"], widths, header=True)
        pdf.set_font("Arial", "B", 8)
        pdf.set_text_color(40, 40, 40)
        pdf.set_fill_color(255, 255, 255)
        pdf.cell(widths[0], 6, cat, border=1, fill=True)
        pdf.set_font("Arial", "", 8)
        pdf.cell(widths[1], 6, kw[:60], border=1, fill=True)
        pdf.cell(widths[2], 6, score, border=1, fill=True)
        pdf.ln()

    pdf.ln(3)
    pdf.sub_title("5.1 Calcul de la priorite")
    pdf.body_text("Le score de priorite est calcule ainsi :")
    pdf.code_block(
        "score_total = sum(scores des mots-cles trouves)\n"
        "nb_motscles = nombre de mots-cles trouves\n"
        "score_moyen = score_total / nb_motscles (si > 0)\n\n"
        "if score_moyen >= 60: priorite = 'critique'\n"
        "elif score_moyen >= 40: priorite = 'haute'\n"
        "elif score_moyen >= 20: priorite = 'normale'\n"
        "else: priorite = 'basse'"
    )

    # Section 6
    pdf.section_title(6, "Securite")
    pdf.bullet("La cle API Mistral est stockee dans backend/.env, jamais en dur dans le code")
    pdf.bullet("Le fichier .env n'est pas versionne (dans .gitignore)")
    pdf.bullet("Le frontend n'a jamais acces a la cle API Mistral")
    pdf.bullet("Les appels Mistral sont faits exclusivement cote backend (Django)")
    pdf.bullet("Le HTML genere est nettoye par DOMPurify avant affichage")
    pdf.bullet("Rate limiting possible sur les appels API Mistral")
    pdf.bullet("Fallback local en cas d'indisponibilite de l'API Mistral")

    pdf.output(os.path.join(MEDIA_DIR, "04_Intelligence_Artificielle_Mistral.pdf"))
    print("  [OK] 04_Intelligence_Artificielle_Mistral.pdf")


# ============================================================
# PDF 5 : Conception et Architecture
# ============================================================
def generate_pdf5():
    pdf = DocPDF("Conception & Architecture du Systeme", "Design, Flux de Donnees et Securite")
    pdf.alias_nb_pages()
    pdf.cover_page("Conception &\nArchitecture du Systeme",
                   "Design, Flux de Donnees et Securite",
                   "3-Tiers | JWT | RBAC | PostgreSQL")

    # Sommaire
    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.set_text_color(0, 80, 160)
    pdf.cell(0, 10, "Sommaire", new_x="LMARGIN", new_y="NEXT")
    for s in ["1. Architecture 3-Tiers", "2. Cas d'Utilisation",
              "3. Sequence - Authentification JWT", "4. Sequence - Creation Reclamation",
              "5. Diagramme de Classes", "6. Flux de Donnees",
              "7. Middleware et Securite", "8. Deploiement"]:
        pdf.set_font("Arial", "", 11)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 7, s, new_x="LMARGIN", new_y="NEXT")

    # Section 1
    pdf.add_page()
    pdf.section_title(1, "Architecture 3-Tiers")
    pdf.body_text("Le systeme suit une architecture 3-tiers separes :")
    pdf.ln(3)
    # Tier diagram
    pdf.set_fill_color(0, 102, 204)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Arial", "B", 12)
    pdf.cell(55, 12, "  Frontend React", border=1, fill=True, align="C")
    pdf.cell(20, 12, "  <->  ", border=0, align="C")
    pdf.cell(55, 12, "  API DRF (Backend)", border=1, fill=True, align="C")
    pdf.cell(20, 12, "  <->  ", border=0, align="C")
    pdf.cell(55, 12, "  PostgreSQL", border=1, fill=True, align="C")
    pdf.ln(15)

    pdf.set_text_color(40, 40, 40)
    pdf.sub_title("Tier 1 - Frontend (React 19)")
    pdf.bullet("Application SPA (Single Page Application)")
    pdf.bullet("Routage client-side avec React Router v6")
    pdf.bullet("State management via Context API (NotificationContext)")
    pdf.bullet("Appels HTTP vers l'API via fetch/axios avec JWT")
    pdf.bullet("Rendu des graphiques (Recharts) et cartes (Leaflet)")
    pdf.bullet("Build optimise avec Create React App")

    pdf.sub_title("Tier 2 - Backend (Django 6 + DRF)")
    pdf.bullet("API RESTful avec Django REST Framework")
    pdf.bullet("Authentification JWT (SimpleJWT)")
    pdf.bullet("Permissions basees sur les roles (RBAC)")
    pdf.bullet("6 applications Django modulaires")
    pdf.bullet("Integration Mistral AI pour IA")
    pdf.bullet("Signaux et threads pour taches automatiques")

    pdf.sub_title("Tier 3 - Base de donnees (PostgreSQL)")
    pdf.bullet("~15 tables relationnelles")
    pdf.bullet("Integrite referentielle (FK, contraintes)")
    pdf.bullet("Requetes optimisees (select_related, prefetch_related)")
    pdf.bullet("psycopg2 comme adaptateur")

    # Section 2
    pdf.add_page()
    pdf.section_title(2, "Diagramme de Cas d'Utilisation (Textuel)")
    pdf.body_text(
        "Chaque role a des permissions specifiques sur le systeme :"
    )
    pdf.sub_title("Admin")
    pdf.bullet("Gerer les utilisateurs (creer, modifier, archiver, restaurer, activer/desactiver)")
    pdf.bullet("Gerer les sites reseau (creer, modifier, changer statut, archiver)")
    pdf.bullet("Gerer les tickets (lister, assigner, archiver, restaurer)")
    pdf.bullet("Consulter et gerer les rapports IA")
    pdf.bullet("Consulter le journal d'audit (1226 logs)")
    pdf.bullet("Voir les performances de l'equipe")
    pdf.bullet("Voir les infos systeme")

    pdf.sub_title("Superviseur")
    pdf.bullet("Consulter les KPIs et graphiques d'evolution")
    pdf.bullet("Generer des rapports IA via Mistral")
    pdf.bullet("Sauvegarder, modifier, supprimer des rapports")
    pdf.bullet("Voir la performance des agents")
    pdf.bullet("Assigner des groupes de tickets a des ingenieurs")

    pdf.sub_title("Ingenieur Reseaux")
    pdf.bullet("Gerer les reclamations (individuelles et groupees)")
    pdf.bullet("Modifier le statut des sites 5G")
    pdf.bullet("Consulter la cartographie interactive")
    pdf.bullet("Archiver des tickets resolus")

    pdf.sub_title("Agent Call Center")
    pdf.bullet("Creer de nouvelles reclamations")
    pdf.bullet("Consulter ses reclamations")
    pdf.bullet("Voir le detail d'un ticket avec commentaires")
    pdf.bullet("Preview de la priorite IA avant creation")

    # Section 3
    pdf.add_page()
    pdf.section_title(3, "Diagramme de Sequence - Authentification JWT")
    pdf.body_text("Flux complet d'authentification :")
    pdf.code_block(
        "Utilisateur          Frontend React         API Django           PostgreSQL\n"
        "   |                      |                     |                     |\n"
        "   |-- saisit email/pass->|                     |                     |\n"
        "   |                      |-- POST /login/ ----->|                     |\n"
        "   |                      |                     |-- SELECT user ----->|\n"
        "   |                      |                     |<-- user data -------|\n"
        "   |                      |                     |-- verify password   |\n"
        "   |                      |<-- JWT tokens ------|                     |\n"
        "   |<-- redirection ------|                     |                     |\n"
        "   |                      |                     |                     |\n"
        "   |-- clique sur page -->|                     |                     |\n"
        "   |                      |-- GET /api/... ----->|                     |\n"
        "   |                      |   (Authorization:   |-- verify token      |\n"
        "   |                      |    Bearer <token>)  |-- check role ------->|\n"
        "   |                      |<-- data ------------|                     |\n"
        "   |<-- affiche page -----|                     |                     |"
    )

    pdf.sub_title("Details du flux")
    pdf.bullet("1. L'utilisateur saisit email et mot de passe dans Login.jsx")
    pdf.bullet("2. Le frontend envoie POST /api/accounts/login/ avec {email, password}")
    pdf.bullet("3. Le backend verifie les identifiants dans PostgreSQL")
    pdf.bullet("4. Si OK : genere access token (30min) + refresh token (24h)")
    pdf.bullet("5. Le frontend stocke les tokens dans localStorage")
    pdf.bullet("6. Le frontend redirige vers le dashboard du role")
    pdf.bullet("7. Chaque requete ulterieure inclut Authorization: Bearer <access_token>")
    pdf.bullet("8. Si token expire : refresh automatique via /token/refresh/")
    pdf.bullet("9. Logout : refresh token ajoute a la blacklist")

    # Section 4
    pdf.add_page()
    pdf.section_title(4, "Diagramme de Sequence - Creation Reclamation")
    pdf.body_text("Flux de creation d'une reclamation avec groupement IA :")
    pdf.code_block(
        "Agent CC            Frontend           API Reclam.          Services IA         PostgreSQL\n"
        "  |                    |                   |                     |                    |\n"
        "  |-- saisit ticket -->|                   |                     |                    |\n"
        "  |-- POST /creer/ --->|--- POST --------->|                     |                    |\n"
        "  |                    |                   |-- extract keywords ->|                    |\n"
        "  |                    |                   |-- score priority --->|                    |\n"
        "  |                    |                   |<-- keywords+score --|                    |\n"
        "  |                    |                   |-- search existing groups -------------->|\n"
        "  |                    |                   |<-- matching groups ---------------------|\n"
        "  |                    |                   |-- create/update GroupeTicket ----------->|\n"
        "  |                    |                   |-- create Reclamation ------------------>|\n"
        "  |                    |                   |-- cascade status                      |\n"
        "  |                    |<-- reponse -------|                     |                    |\n"
        "  |<-- confirmation ---|                   |                     |                    |"
    )

    # Section 5
    pdf.add_page()
    pdf.section_title(5, "Diagramme de Classes (Textuel)")
    pdf.body_text("Modele de classes principales du systeme :")
    pdf.code_block(
        "+------------------+       +-------------------+\n"
        "|   CustomUser     |       |    SiteReseau     |\n"
        "+------------------+       +-------------------+\n"
        "| id (PK)          |       | id (PK)           |\n"
        "| username         |       | codeSite          |\n"
        "| email            |       | nom               |\n"
        "| first_name       |       | wilaya            |\n"
        "| last_name        |       | commune           |\n"
        "| code_user        |       | coordX, coordY    |\n"
        "| role             |       | statut            |\n"
        "| is_active        |       | technologie       |\n"
        "| is_archived      |       | rayon_couverture  |\n"
        "| last_login       |       | archive           |\n"
        "+------------------+       +-------------------+\n"
        "      |  |  |                       |  |\n"
        "      |  |  |          +------------+  |\n"
        "      |  |  +----------|               |\n"
        "      |  |             |               |\n"
        "      |  |    +--------v---------+     |\n"
        "      |  |    |   Reclamation    |     |\n"
        "      |  |    +------------------+     |\n"
        "      |  |    | id (PK)          |     |\n"
        "      |  |    | numero_ticket    |     |\n"
        "      |  |    | nom_client       |     |\n"
        "      |  |    | priorite         |     |\n"
        "      |  |    | statut           |     |\n"
        "      |  |    | mots_cles_ia     |     |\n"
        "      |  |    | site (FK)  <-----+     |\n"
        "      |  |    | client (FK)      |     |\n"
        "      |  |    | groupe (FK)  <---+     |\n"
        "      |  |    | assigne_a (FK) <-+     |\n"
        "      |  |    | cree_par (FK) <--+     |\n"
        "      |  |    +------------------+     |\n"
        "      |  |             |               |\n"
        "      |  |    +--------v---------+     |\n"
        "      |  |    |  GroupeTicket    |     |\n"
        "      |  |    +------------------+     |\n"
        "      |  |    | id (PK)          |     |\n"
        "      |  |    | numero_ticket    |     |\n"
        "      |  |    | titre            |     |\n"
        "      |  |    | priorite         |     |\n"
        "      |  |    | statut           |     |\n"
        "      |  |    | site (FK)  <-----+     |\n"
        "      |  |    | assigne_a (FK) <-+     |\n"
        "      |  |    +------------------+     |\n"
        "      |  |                              \n"
        "      |  +----> ActivityLog        \n"
        "      |          +------------------+    \n"
        "      |          | id (PK)          |   \n"
        "      |          | user (FK)        |   \n"
        "      |          | action           |   \n"
        "      |          | detail           |   \n"
        "      |          | ip_address       |   \n"
        "      |          +------------------+   \n"
        "      |                                 \n"
        "      +----> RapportIA                  \n"
        "             +------------------+       \n"
        "             | id (PK)          |       \n"
        "             | titre            |       \n"
        "             | prompt           |       \n"
        "             | contenu          |       \n"
        "             | cree_par (FK)    |       \n"
        "             +------------------+       "
    )

    # Section 6
    pdf.add_page()
    pdf.section_title(6, "Flux de Donnees")
    pdf.sub_title("6.1 Flux de classification IA")
    pdf.body_text(
        "Nouvelle reclamation -> extraction mots-cles -> scoring automatique "
        "-> priorite calculee (critique/haute/normale/basse)"
    )
    pdf.code_block(
        "Reclamation 'Pas de signal 5G sur le site Bab Ezzouar'\n"
        "  -> Mots-cles trouves: ['pas signal' (70), '5g' (50)]\n"
        "  -> Score: (70 + 50) / 2 = 60\n"
        "  -> Priorite: CRITIQUE (>= 60)"
    )

    pdf.sub_title("6.2 Flux de cascade statut")
    pdf.body_text(
        "GroupeTicket change de statut -> toutes les Reclamations associees "
        "prennent automatiquement le meme statut + date resolu_le."
    )

    pdf.sub_title("6.3 Auto-archivage")
    pdf.body_text("Thread demarre au lancement du serveur :")
    pdf.bullet("Reclamations avec statut='resolu' et resolu_le > 1 mois -> is_archived=True")
    pdf.bullet("Rapports IA crees depuis > 3 mois -> is_archived=True")
    pdf.bullet("Execution toutes les 24h en arriere-plan (daemon thread)")

    # Section 7
    pdf.add_page()
    pdf.section_title(7, "Middleware et Securite")
    pdf.sub_title("7.1 JWT Authentication (SimpleJWT)")
    pdf.bullet("Access token : 30 minutes")
    pdf.bullet("Refresh token : 24 heures")
    pdf.bullet("Blacklist au logout")
    pdf.bullet("Payload custom avec role et code_user")

    pdf.sub_title("7.2 Permissions basees sur les roles (RBAC)")
    pdf.bullet("IsAdmin : ADMIN uniquement")
    pdf.bullet("IsAdminOrSuperviseur : ADMIN et SUPERVISEUR")
    pdf.bullet("IsAgentOrAdmin : AGENT_CALL_CENTER et ADMIN")
    pdf.bullet("IsIngenieurOrAdmin : INGENIEUR_RESEAUX et ADMIN")
    pdf.bullet("IsAuthenticated : tous les utilisateurs connectes")

    pdf.sub_title("7.3 AdminIPRestriction Middleware")
    pdf.body_text(
        "Middleware personnalise qui restreint l'acces a /admin/ "
        "aux adresses IP autorisees uniquement (listes dans settings)."
    )

    pdf.sub_title("7.4 CORS Configuration")
    pdf.bullet("django-cors-headers pour gerer les requetes cross-origin")
    pdf.bullet("CORS_ALLOW_ALL_ORIGINS = True en developpement")
    pdf.bullet("CORS_ALLOWED_ORIGINS whitelist en production")

    # Section 8
    pdf.section_title(8, "Deploiement")
    pdf.sub_title("8.1 Backend")
    pdf.bullet("Django 6.0.3 + Gunicorn (WSGI server)")
    pdf.bullet("PostgreSQL (psycopg2-binary)")
    pdf.bullet("Variables d'environnement dans backend/.env")
    pdf.bullet("python manage.py migrate pour les migrations")

    pdf.sub_title("8.2 Frontend")
    pdf.bullet("React 19 (Create React App)")
    pdf.bullet("Build : npm run build -> dossier build/")
    pdf.bullet("Nginx pour servir les fichiers statiques")
    pdf.bullet("REACT_APP_API_URL dans frontend/.env")

    pdf.sub_title("8.3 Variables d'environnement")
    pdf.code_block(
        "# backend/.env\n"
        "SECRET_KEY=django-insecure-key\n"
        "DEBUG=True\n"
        "DB_NAME=djezzy_supervision\n"
        "DB_USER=postgres\n"
        "DB_PASSWORD=password\n"
        "DB_HOST=localhost\n"
        "DB_PORT=5432\n"
        "MISTRAL_API_KEY=xxx\n\n"
        "# frontend/.env\n"
        "REACT_APP_API_URL=http://127.0.0.1:8000/api"
    )

    pdf.output(os.path.join(MEDIA_DIR, "05_Conception_et_Architecture.pdf"))
    print("  [OK] 05_Conception_et_Architecture.pdf")


# ============================================================
# PDF 6 : Questions et Reponses
# ============================================================
def generate_pdf6():
    pdf = DocPDF("Questions & Reponses - Documentation Complete", "60+ Q&A sur tous les aspects du projet")
    pdf.alias_nb_pages()
    pdf.cover_page("Questions & Reponses\nDocumentation Complete",
                   "60+ Questions-Repenses sur Tous les Aspects",
                   "Auth | Reclamations | Sites | Dashboard | Audit | Technique")

    # --- AUTH & SECURITE ---
    pdf.add_page()
    pdf.section_title(1, "Authentification et Securite")

    qas = [
        ("Comment s'authentifier?",
         "POST /api/accounts/login/ avec {email, password}. Reponse : access token (30min) + refresh token (24h)."),
        ("Quelle est la duree de vie des tokens?",
         "Access token : 30 minutes. Refresh token : 24 heures."),
        ("Comment les roles sont-ils geres?",
         "5 roles dans CustomUser.role : ADMIN, SUPERVISEUR, INGENIEUR_RESEAUX, AGENT_CALL_CENTER, RESPONSABLE_REPORTING. Verifies par permissions DRF."),
        ("Qu'est-ce que le middleware AdminIPRestriction?",
         "Middleware personnalise qui bloque l'acces a /admin/ sauf pour les IPs autorisees dans la liste blanche."),
        ("Comment le mot de passe est-il stocke?",
         "Hash par Django utilisant PBKDF2 par defaut (avec SHA256). Jamais en clair dans la base."),
        ("Qu'est-ce que code_user?",
         "Identifiant unique auto-genere : ADM001 (admin), ING001 (ingenieur), AG001 (agent), SUP001 (superviseur)."),
        ("Comment un utilisateur est-il archive?",
         "is_archived passe a True. L'utilisateur n'est plus visible dans les listes mais reste en base de donnees."),
        ("Comment fonctionne le refresh token?",
         "POST /api/accounts/token/refresh/ avec {refresh}. Retourne un nouvel access token si le refresh est valide."),
        ("Que fait le logout?",
         "POST /api/accounts/logout/ avec le refresh token. Le refresh token est ajoute a la blacklist (SimpleJWT)."),
        ("Comment changer son mot de passe?",
         "POST /api/accounts/password/change/ avec {old_password, new_password}. Access token requis."),
        ("Qu'est-ce que le blacklisting JWT?",
         "Au logout, le refresh token est ajoute a la table blacklist de SimpleJWT. Il ne peut plus etre utilise."),
        ("Comment est verifie le role d'un utilisateur?",
         "Le payload JWT contient 'role'. Les permissions DRF (IsAdmin, IsAgentOrAdmin, etc.) verifient ce champ."),
    ]
    for q, a in qas:
        if pdf.get_y() > 255:
            pdf.add_page()
        pdf.qa_block(q, a)

    # --- RECLAMATIONS ---
    pdf.add_page()
    pdf.section_title(2, "Reclamations et Tickets")

    qas2 = [
        ("Comment creer une reclamation?",
         "Agent CC -> POST /api/reclamations/creer/ avec donnees client + site + description. Le systeme cree automatiquement le ticket et le groupe."),
        ("Comment la priorite est-elle calculee?",
         "Par mots-cles IA : 53 mots-cles dans 9 categories, scores de 5 a 80. Score moyen determine la priorite (critique >= 60, haute >= 40, normale >= 20, basse < 20)."),
        ("Qu'est-ce qu'un GroupeTicket?",
         "Regroupe plusieurs reclamations du meme site ou de la meme famille dans un creneau de 3 jours. Facilite le suivi et la resolution par lot."),
        ("Comment fonctionne la cascade statut?",
         "Quand un GroupeTicket passe a 'resolu' ou 'ferme', toutes ses Reclamations associees prennent automatiquement le meme statut."),
        ("Quels sont les statuts possibles?",
         "Ouvert -> Resolu -> Ferme. Pour les sites : UP, DOWN, DEGRADE, PERTURBE, MAINTENANCE."),
        ("Qu'est-ce que resolu_le?",
         "Date de resolution utilisee pour l'archivage automatique. Les reclamations resolues depuis plus d'1 mois sont archivees."),
        ("Comment archiver une reclamation?",
         "POST /api/reclamations/<id>/archiver/. C'est un soft delete : is_archived=True, archived_at=date, archived_by=user."),
        ("Qui peut voir les reclamations fermees?",
         "L'ingenieur voit les tickets ouverts + fermes. Les tickets 'resolu' ne sont visibles que par l'admin et le superviseur."),
        ("Combien de mots-cles utilises?",
         "53 mots-cles repartis en 9 categories : signal, connexion, debit, facturation, equipement, couverture, latence, services, divers."),
        ("Comment fonctionne le groupement auto?",
         "Extraction mots-cles de la description -> comparaison avec les groupes ouverts -> si overlap > seuil, ajout au groupe. Sinon nouveau groupe."),
        ("Qu'est-ce que le preview de priorite?",
         "POST /api/reclamations/preview-priorite/ : montre le score et la priorite avant la creation effective."),
        ("Combien de reclamations en test?",
         "400 reclamations : 23 ouvertes, 6 resolues, 371 fermees, 275 archivees."),
        ("Comment ajouter un commentaire?",
         "POST /api/reclamations/<id>/commentaires/ avec {contenu}. L'auteur est determine par le token JWT."),
        ("Qui peut creer une reclamation?",
         "Uniquement les agents du call center (AGENT_CALL_CENTER) via POST /api/reclamations/creer/."),
    ]
    for q, a in qas2:
        if pdf.get_y() > 255:
            pdf.add_page()
        pdf.qa_block(q, a)

    # --- SITES ---
    pdf.add_page()
    pdf.section_title(3, "Sites Reseau")

    qas3 = [
        ("Comment creer un site?",
         "POST /api/sites/creer/ avec nom, wilaya, commune, coordonnees GPS. Le codeSite est auto-genere (S001 a S035)."),
        ("Quels sont les statuts d'un site?",
         "UP (operationnel), DOWN (hors service), DEGRADE (performance reduite), PERTURBE (en perturbation), MAINTENANCE (maintenance planifiee)."),
        ("Comment la cartographie fonctionne?",
         "Leaflet.js avec coordonnees GPS (coordX, coordY), cercles de couverture colores selon le statut, popups avec infos."),
        ("Combien de sites en base?",
         "35 sites tous en technologie 5G, repartis dans 19 communes de la wilaya d'Alger."),
        ("Qui peut modifier le statut d'un site?",
         "ADMIN et INGENIEUR_RESEAUX via PUT /api/sites/<id>/modifier-statut/."),
        ("Comment archiver un site?",
         "POST /api/sites/<id>/archiver/ (ADMIN uniquement). Le site n'est plus visible mais reste en base."),
        ("Qu'est-ce que le rayon de couverture?",
         "Chaque site a un rayon en metres qui determine le cercle affiche sur la carte Leaflet."),
        ("Comment sont stockees les coordonnees GPS?",
         "coordX (longitude) et coordY (latitude) en FloatField dans le modele SiteReseau."),
        ("Quelle technologie utilisent les sites?",
         "Tous les 35 sites sont en technologie 5G (champ technologie du modele SiteReseau)."),
    ]
    for q, a in qas3:
        if pdf.get_y() > 255:
            pdf.add_page()
        pdf.qa_block(q, a)

    # --- DASHBOARD & RAPPORTS ---
    pdf.add_page()
    pdf.section_title(4, "Dashboard et Rapports IA")

    qas4 = [
        ("Quels KPIs sont affiches?",
         "Uptime reseau, Latence API, Utilisateurs actifs, Sites UP/DOWN, Tickets ouverts, Taux de resolution."),
        ("Comment les graphiques sont-ils generes?",
         "Recharts (React) a partir des donnees API /dashboard/stats/ et /dashboard/reporting/. BarChart, LineChart, PieChart."),
        ("Comment fonctionne le rapport IA?",
         "Le superviseur envoie un prompt + dates. Le backend collecte les stats et les envoie a Mistral. L'IA genere un rapport HTML."),
        ("Que contient le rapport?",
         "Resume executif, statistiques detaillees, analyse des tendances, recommandations, tableaux de donnees."),
        ("Comment sauvegarder un rapport?",
         "POST /api/dashboard/rapport-ia/ avec {titre, prompt, contenu}. Le rapport est lie au superviseur cree_par."),
        ("Qu'est-ce que l'archivage auto des rapports?",
         "Les rapports IA crees depuis plus de 3 mois sont automatiquement archives (is_archived=True)."),
        ("Combien de rapports IA en base?",
         "12 rapports au total, dont 5 archives (plus de 3 mois)."),
        ("Qu'est-ce que le fallback local?",
         "Si Mistral est indisponible, le backend genere un rapport basique a partir de templates avec les stats collectees."),
        ("Comment afficher un rapport?",
         "GET /api/dashboard/rapport-ia/<id>/ pour le detail. Le contenu HTML est nettoye via DOMPurify avant affichage."),
        ("Quelles donneees sont collectees pour le rapport?",
         "Stats reclamations (nombre, statuts, priorites), sites (UP/DOWN), groupes, performance, top mots-cles, evolution temporelle."),
        ("Comment fonctionne le system-info?",
         "GET /api/dashboard/system-info/ retourne les infos technique : version Django, uptime, taille DB, etc."),
    ]
    for q, a in qas4:
        if pdf.get_y() > 255:
            pdf.add_page()
        pdf.qa_block(q, a)

    # --- AUDIT ---
    pdf.add_page()
    pdf.section_title(5, "Journal d'Audit")

    qas5 = [
        ("Qu'est-ce que l'audit trail?",
         "Journal de toutes les actions effectuees dans le systeme : type d'action, detail, timestamp, adresse IP de l'utilisateur."),
        ("Combien d'actions sont enregistrees?",
         "27 types d'actions : login, logout, register, update_user, archive_user, create_ticket, generate_report, etc."),
        ("Qui peut voir l'audit?",
         "Uniquement l'ADMIN via GET /api/audit/logs/. Les autres roles n'ont pas acces."),
        ("Combien de logs en base?",
         "1226 entrees d'audit sur 120 jours environ."),
        ("Comment les stats d'audit sont-elles calculees?",
         "GET /api/audit/stats/ retourne le nombre d'actions par type, par jour, par utilisateur."),
        ("Qu'est-ce que le health check?",
         "GET /api/audit/health/ verifie que le systeme d'audit fonctionne correctement."),
        ("L'adresse IP est-elle enregistree?",
         "Oui, chaque log contient ip_address (GenericIPAddressField) pour tracer l'origine."),
        ("Comment filtrer les logs?",
         "GET /api/audit/logs/?page=1&action=login&search=terme pour filtrer par type et texte."),
    ]
    for q, a in qas5:
        if pdf.get_y() > 255:
            pdf.add_page()
        pdf.qa_block(q, a)

    # --- TECHNIQUE ---
    pdf.add_page()
    pdf.section_title(6, "Questions Techniques")

    qas6 = [
        ("Quel framework backend?",
         "Django 6.0.3 avec Django REST Framework (DRF) pour l'API REST."),
        ("Quelle base de donnees?",
         "PostgreSQL, acces via psycopg2-binary. environ 15 tables."),
        ("Quel frontend?",
         "React 19.2.4, cree avec Create React App. Routing via React Router v6."),
        ("Comment les routes sont-elles gerees?",
         "React Router v6 avec PrivateRoute guard qui verifie le JWT dans localStorage."),
        ("Quelles librairies de graphiques?",
         "Recharts : BarChart, LineChart, PieChart, AreaChart pour les visualisations."),
        ("Comment la carte est-elle rendue?",
         "Leaflet.js avec react-leaflet. OpenStreetMap comme fond de carte. Cercles colores par statut."),
        ("Comment les PDFs sont-ils exportes?",
         "html2pdf.js (combine html2canvas + jsPDF) cote client. Aussi fpdf2 pour la generation server-side."),
        ("Ou sont les variables d'environnement?",
         "backend/.env (SECRET_KEY, DB, MISTRAL_API_KEY) et frontend/.env (REACT_APP_API_URL)."),
        ("Comment gerer les CORS?",
         "django-cors-headers. CORS_ALLOW_ALL_ORIGINS en dev, whitelist en prod."),
        ("Quel serveur en production?",
         "Gunicorn pour le backend Django. Nginx pour servir le frontend React build."),
        ("Comment fonctionne le token refresh?",
         "POST /api/accounts/token/refresh/ avec le refresh token. Genere un nouveau access token."),
        ("Quelle est la structure des URLs?",
         "Toutes les API sont sous /api/ : /api/accounts/, /api/sites/, /api/reclamations/, etc."),
        ("Comment gerer les erreurs API?",
         "DRF gere automatiquement les erreurs HTTP avec les bons codes (400, 401, 403, 404, 500)."),
        ("Quel ORM est utilise?",
         "Django ORM natif avec select_related() et prefetch_related() pour optimiser les requetes."),
        ("Comment sont gerees les migrations?",
         "python manage.py makemigrations puis python manage.py migrate. PostgreSQL en prod."),
    ]
    for q, a in qas6:
        if pdf.get_y() > 255:
            pdf.add_page()
        pdf.qa_block(q, a)

    # --- DONNEES DE TEST ---
    pdf.add_page()
    pdf.section_title(7, "Donnees de Test")

    qas7 = [
        ("Combien de reclamations?",
         "400 : 23 ouvertes, 6 resolues, 371 fermees, 275 archivees."),
        ("Combien de groupes de tickets?",
         "50 groupes : 15 ouverts, 5 resolus, 30 fermes et archives."),
        ("Combien d'utilisateurs?",
         "17 total : 12 actifs, 3 archives, repartis sur les 4 roles principaux."),
        ("Combien de sites?",
         "35 sites tous en 5G dans la wilaya d'Alger, repartis sur 19 communes."),
        ("Combien de logs d'audit?",
         "1226 entrees sur environ 120 jours."),
        ("Combien de rapports IA?",
         "12 rapports au total, dont 5 archives (plus de 3 mois)."),
        ("Quels sont les mots-cles IA?",
         "53 mots-cles dans 9 categories (signal, connexion, debit, facturation, equipement, couverture, latence, services, divers)."),
        ("Comment les donnees de test ont-elles ete generees?",
         "Commandes Django management : seed_all_data, seed_reclamations, seed_audit, seed_rapports."),
        ("Quelle est la periode couverte par les logs?",
         "Environ 120 jours de donnees d'audit."),
        ("Les groupes sont-ils bien formes?",
         "Oui, les reclamations sont groupees par site/famille avec un creneau de 3 jours."),
    ]
    for q, a in qas7:
        if pdf.get_y() > 255:
            pdf.add_page()
        pdf.qa_block(q, a)

    # --- CONCEPTION ---
    pdf.add_page()
    pdf.section_title(8, "Conception et Architecture")

    qas8 = [
        ("Quelle est l'architecture?",
         "3-tiers : Frontend React (SPA), API DRF (backend), PostgreSQL (base de donnees)."),
        ("Comment la securite est-elle assuree?",
         "JWT (SimpleJWT) + RBAC (permissions par role) + CORS + Admin IP restriction + passwords hashes PBKDF2."),
        ("Qu'est-ce que le auto-archive thread?",
         "Thread daemon lance au demarrage du serveur (signal post_migrate). Execute auto_archive() toutes les 24h."),
        ("Qu'est-ce que code_user?",
         "Identifiant unique auto-genere : ADM001 (admin), ING001-ING010 (ingenieurs), AG001-AG005 (agents), SUP001 (superviseur)."),
        ("Comment le score de priorite est-il calcule?",
         "Somme des scores des mots-cles trouves / nombre de mots-cles. Seuils : >= 60 critique, >= 40 haute, >= 20 normale, sinon basse."),
        ("Qu'est-ce que le signal post_migrate?",
         "Signal Django execute apres chaque migration. Utilise pour demarrer le thread d'auto-archivage."),
        ("Combien d'applications Django?",
         "6 : accounts, sites_reseau, reclamations, dashboard, cartographie, audit_log."),
        ("Quel est le pattern d'architecture backend?",
         "MVT (Model-View-Template) adapte pour API REST avec DRF (ViewSets + Serializers)."),
        ("Comment les tests sont-ils geres?",
         "Commandes management pour les donnees de seed. Tests unitaires Django pour les endpoints critiques."),
    ]
    for q, a in qas8:
        if pdf.get_y() > 255:
            pdf.add_page()
        pdf.qa_block(q, a)

    pdf.output(os.path.join(MEDIA_DIR, "06_Questions_et_Reponses.pdf"))
    print("  [OK] 06_Questions_et_Reponses.pdf")


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  Generation des PDFs de documentation - Djezzy Supervision")
    print("=" * 60)
    print(f"  Dossier de sortie : {MEDIA_DIR}")
    print()

    generate_pdf1()
    generate_pdf2()
    generate_pdf3()
    generate_pdf4()
    generate_pdf5()
    generate_pdf6()

    print()
    print("=" * 60)
    "  Tailles des fichiers generes :"
    print("=" * 60)

    total_size = 0
    for fname in sorted(os.listdir(MEDIA_DIR)):
        if fname.endswith(".pdf"):
            fpath = os.path.join(MEDIA_DIR, fname)
            size = os.path.getsize(fpath)
            total_size += size
            print(f"  {fname:55s} {size:>10,} octets ({size/1024:.1f} Ko)")
    print(f"\n  TOTAL : {total_size:,} octets ({total_size/1024:.1f} Ko)")
    print(f"  {6} fichiers PDF generes avec succes !")
    print("=" * 60)
