"""
Technologies Utilisees - Djezzy Supervision Reseau
PDF detaille avec justifications pour chaque technologie.
"""
import os
from fpdf import FPDF

C = {
    "dark": (44, 62, 80),
    "dark2": (33, 47, 61),
    "blue": (41, 128, 185),
    "blue_l": (234, 242, 248),
    "green": (39, 174, 96),
    "green_l": (234, 247, 239),
    "purple": (142, 68, 173),
    "purple_l": (243, 237, 247),
    "orange": (230, 126, 34),
    "orange_l": (252, 243, 207),
    "red": (192, 57, 43),
    "red_l": (253, 235, 233),
    "teal": (22, 160, 133),
    "teal_l": (232, 246, 243),
    "gray": (127, 140, 141),
    "gray_l": (220, 225, 230),
    "gray_xl": (245, 246, 248),
    "white": (255, 255, 255),
    "bg": (248, 249, 252),
    "bg_d": (235, 237, 240),
}

PW, PH = 210, 297


class TechPDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=20)

    def header_bar(self, title, color=C["dark"]):
        self.set_fill_color(*color)
        self.rect(0, 0, PW, 14, style="F")
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*C["white"])
        self.set_xy(12, 2.5)
        self.cell(0, 8, title)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*C["gray_l"])
        self.set_xy(PW - 25, 4)
        self.cell(0, 5, f"P.{self.page_no()}")

    def footer_bar(self):
        self.set_fill_color(*C["bg_d"])
        self.rect(0, PH - 10, PW, 10, style="F")
        self.set_draw_color(*C["gray_l"])
        self.set_line_width(0.3)
        self.line(12, PH - 10, PW - 12, PH - 10)
        self.set_font("Helvetica", "", 6.5)
        self.set_text_color(*C["gray"])
        self.set_xy(12, PH - 8)
        self.cell(0, 5, "Djezzy Supervision Reseau  |  Technologies Utilisees  |  PFE 2025-2026  |  Belakebi Amine & Bouachach Amel")

    def section_title(self, y, title, color, subtitle=""):
        self.set_fill_color(*color)
        self.rect(12, y, PW - 24, 10, style="F")
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*C["white"])
        self.set_xy(16, y + 0.8)
        self.cell(0, 8, title)
        if subtitle:
            self.set_font("Helvetica", "", 8)
            self.set_xy(16, y + 5.5)
            self.cell(0, 4, subtitle)
        return y + 12

    def tech_block(self, y, name, version, justification, color, light, icon_text=""):
        block_h = self._calc_text_height(justification) + 18
        if y + block_h > PH - 22:
            self.add_page()
            y = 20

        # Card background
        self.set_fill_color(*C["white"])
        self.set_draw_color(*light)
        self.set_line_width(0.3)
        self.rounded_rect(14, y, PW - 28, block_h, 2, style="DF")

        # Color accent bar left
        self.set_fill_color(*color)
        self.rect(14, y, 3, block_h, style="F")

        # Name + version badge
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*color)
        self.set_xy(20, y + 2)
        self.cell(0, 6, name)

        if version:
            vw = self.get_string_width(version) + 6
            self.set_fill_color(*light)
            self.set_draw_color(*color)
            self.set_line_width(0.2)
            self.rounded_rect(20 + self.get_string_width(name) + 4, y + 2.5, vw, 5, 1, style="DF")
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*color)
            self.set_xy(20 + self.get_string_width(name) + 5, y + 3)
            self.cell(vw - 1, 4, version, align="C")

        # Justification
        self.set_font("Helvetica", "", 8.5)
        self.set_text_color(*C["dark"])
        self.set_xy(20, y + 10)
        self.multi_cell(PW - 38, 4.5, justification)

        return y + block_h + 3

    def _calc_text_height(self, text):
        self.set_font("Helvetica", "", 8.5)
        lines = len(text) // 72 + text.count("\n") + 1
        return lines * 4.5

    def rounded_rect(self, x, y, w, h, r, style=""):
        self.rect(x, y, w, h, style)


def generate():
    pdf = TechPDF()

    # ═══════════════════════════════════════════════════
    # PAGE DE COUVERTURE
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.set_fill_color(*C["dark"])
    pdf.rect(0, 0, PW, PH, style="F")

    # Decorative top bar
    pdf.set_fill_color(*C["blue"])
    pdf.rect(0, 0, PW, 4, style="F")

    # Title block
    pdf.set_fill_color(*C["dark2"])
    pdf.rect(30, 80, PW - 60, 100, style="F")
    pdf.set_draw_color(*C["blue"])
    pdf.set_line_width(1)
    pdf.rect(30, 80, PW - 60, 100, style="D")

    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(*C["white"])
    pdf.set_xy(35, 90)
    pdf.cell(PW - 70, 15, "Technologies Utilisees", align="C")

    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(*C["blue"])
    pdf.set_xy(35, 110)
    pdf.cell(PW - 70, 10, "Djezzy Supervision Reseau", align="C")

    pdf.set_draw_color(*C["blue"])
    pdf.set_line_width(0.5)
    pdf.line(60, 125, PW - 60, 125)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*C["gray_l"])
    pdf.set_xy(35, 132)
    pdf.cell(PW - 70, 6, "Systeme NOC de gestion des reclamations", align="C")
    pdf.set_xy(35, 140)
    pdf.cell(PW - 70, 6, "et supervision des sites BTS", align="C")

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*C["white"])
    pdf.set_xy(35, 155)
    pdf.cell(PW - 70, 6, "PFE 2025-2026", align="C")

    # Team info
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*C["gray_l"])
    pdf.set_xy(35, 165)
    pdf.cell(PW - 70, 6, "Equipe: Belakebi Amine & Bouachach Amel", align="C")

    # Bottom decoration
    pdf.set_fill_color(*C["blue"])
    pdf.rect(0, PH - 4, PW, 4, style="F")

    # Version info
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*C["gray"])
    pdf.set_xy(12, PH - 14)
    pdf.cell(0, 5, "Document detaille - Justifications des choix technologiques")

    # ═══════════════════════════════════════════════════
    # PAGE 2 : SOMMAIRE
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.header_bar("Sommaire")
    pdf.footer_bar()

    y = 20
    y = pdf.section_title(y, "SOMMAIRE", C["dark"])

    sommaire = [
        ("1", "Langages de programmation", "JavaScript, Python, CSS3, HTML5, SQL", C["blue"]),
        ("2", "Frameworks Frontend", "React, React Router, Recharts, Leaflet, Axios...", C["blue"]),
        ("3", "Frameworks Backend", "Django, DRF, SimpleJWT, OpenAI SDK...", C["green"]),
        ("4", "Base de donnees", "PostgreSQL, Django ORM, psycopg2, Pillow", C["purple"]),
        ("5", "Navigateur web", "Mozilla Firefox - outils de debug, compatibilite", C["orange"]),
        ("6", "Outils de developpement", "VS Code, Git/GitHub, npm, pip, CRA, draw.io", C["teal"]),
        ("7", "Technologies web & mapping", "PWA, OpenStreetMap, Leaflet, HTML5", C["blue"]),
        ("8", "Intelligence artificielle", "Mistral AI, algorithme Jaccard, fallback local", C["orange"]),
        ("9", "Securite", "JWT, HSTS, CORS, Rate Limiting, DOMPurify...", C["red"]),
    ]

    for num, title, desc, color in sommaire:
        pdf.set_fill_color(*C["white"])
        pdf.set_draw_color(*color)
        pdf.set_line_width(0.3)
        pdf.rect(16, y, PW - 32, 14, style="DF")

        pdf.set_fill_color(*color)
        pdf.rect(16, y, 12, 14, style="F")
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*C["white"])
        pdf.set_xy(16, y + 2.5)
        pdf.cell(12, 9, num, align="C")

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*color)
        pdf.set_xy(32, y + 1)
        pdf.cell(0, 6, title)

        pdf.set_font("Helvetica", "", 7.5)
        pdf.set_text_color(*C["gray"])
        pdf.set_xy(32, y + 7.5)
        pdf.cell(0, 5, desc)

        y += 16

    # ═══════════════════════════════════════════════════
    # SECTION 1 : LANGAGES DE PROGRAMMATION
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.header_bar("1 - Langages de programmation", C["blue"])
    pdf.footer_bar()

    y = 18
    y = pdf.section_title(y, "LANGAGES DE PROGRAMMATION", C["blue"],
                          "Les langages utilises pour developper le frontend, le backend et la base de donnees")

    y += 4
    y = pdf.tech_block(y, "JavaScript (ES6+)", "v2024+",
        "JavaScript est le langage principal du frontend. On l'a choisi car c'est le seul langage "
        "nativement supporte par tous les navigateurs web modernes. Les features ES6+ (arrow functions, "
        "async/await, destructuring, template literals, optional chaining) rendent le code plus lisible "
        "et maintenable. C'est aussi le langage le plus utilise au monde pour le developpement web, "
        "ce qui facilite la reutilisation de code et l'acces a une enorme communaute.",
        C["blue"], C["blue_l"])

    y = pdf.tech_block(y, "Python", "3.10+",
        "Python est le langage du backend, utilise avec Django. On l'a choisi pour sa simplicite de syntaxe, "
        "sa grande bibliotheque de modules (pillow, psycopg2, openai), et son excellente integration "
        "avec Django. Python est le langage standard pour les projets web avec Django/DRF, et il offre "
        "egalement de tres bonnes capacites pour l'intelligence artificielle (Mistral AI SDK). "
        "Sa courbe d'apprentissage douce facilite aussi la maintenance du code.",
        C["blue"], C["blue_l"])

    y = pdf.tech_block(y, "CSS3", "",
        "CSS3 est utilise pour le styling du frontend React. On a fait le choix d'utiliser du CSS "
        "natif (sans frameworks comme Tailwind ou SASS) avec des CSS Custom Properties (variables) "
        "pour creer un systeme de themes centralise. Les animations @keyframes et les transitions "
        "permettent d'ajouter du dynamisme a l'interface. C'est le choix le plus simple et le plus "
        "direct pour styler des composants React, sans dependance supplementaire.",
        C["blue"], C["blue_l"])

    y = pdf.tech_block(y, "HTML5", "",
        "HTML5 est le langage de structure utilise dans le fichier index.html d'entree React et "
        "egalement dans la generation de rapports IA (templates HTML dynamiques). Les elements "
        "semantiques HTML5 (section, header, nav) et les APIs modernes (Geolocation pour la carte, "
        "localStorage pour les tokens JWT) sont essentiels au bon fonctionnement de l'application. "
        "C'est le fondement de tout projet web moderne.",
        C["blue"], C["blue_l"])

    if y > PH - 60:
        pdf.add_page()
        pdf.header_bar("1 - Langages de programmation (suite)", C["blue"])
        pdf.footer_bar()
        y = 18

    y = pdf.tech_block(y, "SQL", "",
        "SQL est utilise indirectement via les migrations Django ORM et les requetes PostgreSQL. "
        "Django genere automatiquement les requetes SQL a partir des modeles Python, mais la "
        "comprehension de SQL reste necessaire pour optimiser les performances, creer des index, "
        "et diagnostiquer les problemes de requetes. Les 25 fichiers de migrations du projet "
        "reflettent le schema SQL genere pour les 6 tables de la base de donnees.",
        C["blue"], C["blue_l"])

    # ═══════════════════════════════════════════════════
    # SECTION 2 : FRAMEWORKS FRONTEND
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.header_bar("2 - Frameworks Frontend", C["blue"])
    pdf.footer_bar()

    y = 18
    y = pdf.section_title(y, "FRAMEWORKS FRONTEND", C["blue"],
                          "Les bibliotheques et frameworks utilises pour construire l'interface utilisateur")

    y += 4
    y = pdf.tech_block(y, "React", "19.2.4",
        "React est le framework UI principal du frontend. On l'a choisi pour sa popularite enorme, "
        "son ecosysteme riche, et son architecture en composants qui facilite la reutilisation du code. "
        "React 19 offre des performances optimisees et des hooks modernes (useState, useEffect, "
        "useContext). Le virtual DOM de React permet des mises a jour efficaces sans rechargement "
        "de page. C'est le framework le plus populaire au monde avec la plus grande communaute.",
        C["blue"], C["blue_l"])

    y = pdf.tech_block(y, "React Router DOM", "7.14.0",
        "React Router gere la navigation côté client (single page application). On l'a utilise pour "
        "creer des routes separees pour chaque page (Login, AdminDashboard, EngineerDashboard, "
        "SupervisorDashboard, CallCenter, Profile) avec protection par role via PrivateRoute. "
        "C'est le routing standard pour React, simple a configurer et bien documente.",
        C["blue"], C["blue_l"])

    y = pdf.tech_block(y, "Recharts", "3.8.1",
        "Recharts est une bibliotheque de graphiques React pour la visualisation de donnees. "
        "On l'a choisie pour les KPIs et tableaux de bord car elle est composee de composants "
        "React natifs (facile a integrer), supporte les graphiques en aires, barres, camemberts, "
        "et lignes, et offre un theme personnalisable. C'est la solution la plus simple pour "
        "ajouter des graphiques a un dashboard React.",
        C["blue"], C["blue_l"])

    y = pdf.tech_block(y, "Leaflet / React Leaflet", "1.9.4 / 5.0.0",
        "Leaflet est une bibliotheque JavaScript pour cartes interactives, utilisee ici pour "
        "afficher la position des sites BTS sur une carte OpenStreetMap. React Leaflet fournit "
        "les composants React (MapContainer, TileLayer, Marker, Popup, Circle) pour integrer "
        "Leaflet proprement. On l'a choisie car c'est open source, leger (< 42KB), et offre "
        "toutes les fonctionnalites necessaires (markers, popups, cercles, zoom). Leaflet est "
        "la lib de cartes web la plus populaire au monde.",
        C["blue"], C["blue_l"])

    if y > PH - 60:
        pdf.add_page()
        pdf.header_bar("2 - Frameworks Frontend (suite)", C["blue"])
        pdf.footer_bar()
        y = 18

    y = pdf.tech_block(y, "Axios", "1.14.0",
        "Axios est un client HTTP pour JavaScript. On l'a utilise dans la page Login pour les "
        "requetes d'authentification JWT, car il offre une gestion automatique des headers, "
        "le support des intercepteurs (utile pour le refresh automatique des tokens), et une "
        "API plus propre que le fetch natif. Les autres pages utilisent le fetch API natif "
        "pour rester leger, mais Axios est present pour les cas complexes.",
        C["blue"], C["blue_l"])

    y = pdf.tech_block(y, "DOMPurify", "3.4.11",
        "DOMPurify est un sanitiseur HTML/JS. On l'a integre pour securiser l'affichage de "
        "contenu HTML genere par Mistral AI (rapports IA). Sans DOMPurify, un contenu malveillant "
        "injecte dans les rapports pourrait executer du JavaScript (XSS). C'est la bibliotheque "
        "de reference pour la sanitisation HTML, utilisee par Mozilla, Google et GitHub.",
        C["blue"], C["blue_l"])

    y = pdf.tech_block(y, "html2pdf.js", "0.14.0",
        "html2pdf.js convertit du HTML en PDF directement côté client. On l'a utilise pour "
        "permettre aux utilisateurs de telecharger les rapports IA et les donnees en PDF "
        "depuis le navigateur. C'est une solution simple qui evite de passer par le backend "
        "pour la generation de PDF côté client.",
        C["blue"], C["blue_l"])

    # ═══════════════════════════════════════════════════
    # SECTION 3 : FRAMEWORKS BACKEND
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.header_bar("3 - Frameworks Backend", C["green"])
    pdf.footer_bar()

    y = 18
    y = pdf.section_title(y, "FRAMEWORKS BACKEND", C["green"],
                          "Les frameworks et bibliotheques Python utilises pour l'API REST et la logique metier")

    y += 4
    y = pdf.tech_block(y, "Django", "6.0.3",
        "Django est le framework web Python principal du backend. On l'a choisi pour son architecture "
        "MVT (Model-View-Template) robuste, son ORM puissant, son admin automatique, et sa securite "
        "integree (CSRF, XSS, SQL injection). Django est le framework Python le plus mature et le "
        "plus utilise pour les projets web professionnels. Sa convention 'batteries included' fournit "
        "tout ce dont on a besoin : authentification, migrations, formulaires, et routage.",
        C["green"], C["green_l"])

    y = pdf.tech_block(y, "Django REST Framework (DRF)", "3.17.1",
        "DRF est le framework standard pour creer des APIs REST avec Django. On l'a utilise pour "
        "construire les endpoints JSON (/api/accounts/, /api/sites/, /api/reclamations/, etc.). "
        "DRF fournit les serializeurs pour convertir les modeles Django en JSON, les vues "
        "generiques (ListCreateAPIView, RetrieveUpdateDestroyAPIView), le routage automatique, "
        "et le systeme de permissions et throttling. C'est l'outil de reference pour les APIs REST "
        "en Python/Django.",
        C["green"], C["green_l"])

    y = pdf.tech_block(y, "djangorestframework-simplejwt", "5.5.1",
        "SimpleJWT implemente l'authentification JWT (JSON Web Tokens) pour DRF. On l'a choisi "
        "car c'est la solution la plus complete pour JWT dans Django : tokens d'acces (1h) + "
        "refresh (7j), rotation des refresh tokens, blacklist pour la deconnexion securisee, "
        "et support des claims custom (on injecte le role et le code_user dans le token). "
        "JWT est standard pour les APIs REST modernes et separe bien le frontend du backend.",
        C["green"], C["green_l"])

    y = pdf.tech_block(y, "django-cors-headers", "4.9.0",
        "django-cors-headers gere les en-tetes CORS (Cross-Origin Resource Sharing) entre "
        "le frontend React (localhost:3000) et le backend Django (localhost:8000). Sans ce "
        "module, le navigateur bloquerait les requetes API du frontend a cause de la politique "
        "Same-Origin. On l'a configure avec une liste blanche restrictive (4 origines localhost) "
        "plutot que CORS_ALLOW_ALL_ORIGINS=True pour maintenir la securite.",
        C["green"], C["green_l"])

    if y > PH - 60:
        pdf.add_page()
        pdf.header_bar("3 - Frameworks Backend (suite)", C["green"])
        pdf.footer_bar()
        y = 18

    y = pdf.tech_block(y, "OpenAI SDK (compatible Mistral AI)", ">=1.50.0",
        "Le SDK OpenAI est utilise pour integrer Mistral AI (mistral-small-latest) via "
        "l'API compatible OpenAI d Mistral (api.mistral.ai/v1). On a choisi Mistral car c'est "
        "un LLM europeen performant, avec un excellent rapport qualite/prix. Il genere les titres "
        "et descriptions des groupes de tickets, et produit les rapports IA HTML. Le SDK OpenAI "
        "compatible evite d'ecrire du code d'appel API specifique a Mistral.",
        C["green"], C["green_l"])

    y = pdf.tech_block(y, "python-decouple", "3.8",
        "python-decouple gere les variables d'environnement depuis le fichier .env. On l'a utilise "
        "pour separer la configuration sensible (SECRET_KEY, DB_PASSWORD, API keys) du code source. "
        "C'est un standard de securite : ne jamais committer les secrets dans Git. Simples et "
        "leger, il fonctionne avec un fichier .env et des variables d'environnement systeme.",
        C["green"], C["green_l"])

    y = pdf.tech_block(y, "Pillow", "12.1.1",
        "Pillow est la bibliotheque Python de reference pour le traitement d'images. On l'a utilise "
        "pour gerer les fichiers media (avatars, images de sites) dans Django. C'est un prerequis "
        "de Django pour les ImageField et FileField, et la seule bibliotheque d'image mature pour Python.",
        C["green"], C["green_l"])

    # ═══════════════════════════════════════════════════
    # SECTION 4 : BASE DE DONNEES
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.header_bar("4 - Base de donnees", C["purple"])
    pdf.footer_bar()

    y = 18
    y = pdf.section_title(y, "BASE DE DONNEES", C["purple"],
                          "Le systeme de gestion de base de donnees et les outils associes")

    y += 4
    y = pdf.tech_block(y, "PostgreSQL", "15",
        "PostgreSQL est le SGBD (Systeme de Gestion de Base de Donnees) relationnel utilise. "
        "On l'a choisi pour sa fiabilite, ses performances avec de gros volumes de donnees, "
        "son support ACID complet, et sa conformite aux standards SQL. C'est la base de donnees "
        "open source la plus avancee au monde, recommandee par Django pour les projets "
        "professionnels. Elle gere les 6 tables du projet avec 25 migrations.",
        C["purple"], C["purple_l"])

    y = pdf.tech_block(y, "Django ORM", "",
        "Django ORM est l'outil de mappage objet-relationnel (ORM) integre a Django. Il permet "
        "d'ecrire des requetes en Python au lieu de SQL brut. On l'a utilise pour definir les "
        "6 modeles (CustomUser, Reclamation, GroupeTicket, SiteReseau, CommentaireTicket, RapportIA) "
        "avec leurs relations FK, valider les donnees, et generer automatiquement les migrations SQL. "
        "C'est l'ORM le plus simple et le plus productif pour Django.",
        C["purple"], C["purple_l"])

    y = pdf.tech_block(y, "psycopg2", "2.9.11",
        "psycopg2 est le connecteur PostgreSQL pour Python. C'est le driver recommande par Django "
        "pour se connecter a PostgreSQL. C'est un module C rapide et fiable qui gere toutes les "
        "operations SQL. Il est utilise en arriere-plan par Django ORM chaque fois qu'une requete "
        "est envoyee a la base de donnees.",
        C["purple"], C["purple_l"])

    # ═══════════════════════════════════════════════════
    # SECTION 5 : NAVIGATEUR WEB
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.header_bar("5 - Navigateur web", C["orange"])
    pdf.footer_bar()

    y = 18
    y = pdf.section_title(y, "NAVIGATEUR WEB", C["orange"],
                          "Le navigateur utilise pour le developpement et les tests")

    y += 4
    y = pdf.tech_block(y, "Mozilla Firefox", "128+",
        "Firefox est le navigateur principal utilise pendant le developpement et les tests de "
        "l'application. On l'a choisi pour plusieurs raisons :\n\n"
        "1. Outils de developpement integres : Les Firefox DevTools offrent un inspecteur DOM, "
        "un debogueur JavaScript, un onglet Reseau (Network), et un onglet Stockage (localStorage, "
        "cookies) tres performants pour debugger les appels API et le stockage JWT.\n\n"
        "2. Compatibilite W3C : Firefox est connu pour etre le navigateur le plus conforme aux "
        "standards W3C. Tester sur Firefox garantit que l'application respecte les normes web.\n\n"
        "3. Rendu CSS different : Firefox utilise son propre moteur de rendu (Gecko), different "
        "de Chromium (Blink). Tester sur Firefox permet de detecter les incompatibilites CSS "
        "qui passeraient inaperues sur Chrome.\n\n"
        "4. Respect de la vie privee : Firefox est developpe par Mozilla, une organisation "
        "sans but lucratif dediee a l'ouverture du web. C'est le navigateur le plus respectueux "
        "de la vie privee, sans telemetrie par defaut.\n\n"
        "5. Open source : Firefox est 100% open source, ce qui est coherent avec l'utilisation "
        "d'autres outils open source du projet (Django, PostgreSQL, Leaflet).",
        C["orange"], C["orange_l"])

    # ═══════════════════════════════════════════════════
    # SECTION 6 : OUTILS DE DEVELOPPEMENT
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.header_bar("6 - Outils de developpement", C["teal"])
    pdf.footer_bar()

    y = 18
    y = pdf.section_title(y, "OUTILS DE DEVELOPPEMENT", C["teal"],
                          "Les editeurs, systemes de gestion de version et outils de build utilises")

    y += 4
    y = pdf.tech_block(y, "Visual Studio Code", "",
        "VS Code est l'IDE (editeur de code) principal utilise pour developper le projet. "
        "On l'a choisi pour sa legerete, son support multi-langages (Python, JavaScript, CSS, HTML), "
        "ses extensions puissantes (Python, ESLint, Prettier, GitLens), et son terminal integre. "
        "Le fichier .vscode/settings.json configure l'interpreteur Python et les paths d'analyse. "
        "C'est l'IDE le plus populaire au monde selon les enquetes Stack Overflow.",
        C["teal"], C["teal_l"])

    y = pdf.tech_block(y, "Git / GitHub", "",
        "Git est le systeme de gestion de version utilise, avec GitHub comme depot distant "
        "(github.com/Belakebi-Amine/djezzy_supervision). On a choisi Git car c'est le standard "
        "absolu du developpement logiciel moderne, et GitHub offre l'hebergement, les pull "
        "requests, et la collaboration. Les branches permettent de travailler separement sur "
        "le frontend et le backend, et le .gitignore protege les fichiers sensibles (.env, "
        "venv/, node_modules/).",
        C["teal"], C["teal_l"])

    y = pdf.tech_block(y, "npm", "",
        "npm (Node Package Manager) gere les dependances JavaScript du frontend React. "
        "C'est le gestionnaire de paquets par defaut de Node.js, utilise pour installer "
        "et mettre a jour les 12 bibliotheques du frontend (react, recharts, leaflet, axios...). "
        "Le fichier package-lock.json garantit des installations reproductibles.",
        C["teal"], C["teal_l"])

    y = pdf.tech_block(y, "pip / Python venv", "",
        "pip est le gestionnaire de paquets Python pour installer les dependances backend "
        "(django, djangorestframework, psycopg2...). Python venv cree un environnement virtuel "
        "isole (dossier venv/) pour eviter les conflits de versions entre projets. C'est la "
        "pratique standard en developpement Python.",
        C["teal"], C["teal_l"])

    y = pdf.tech_block(y, "Create React App (CRA)", "react-scripts 5.0.1",
        "CRA est l'outil de build du frontend React. Il gere automatiquement Webpack, Babel, "
        "ESLint, et le hot-reloading pendant le developpement. On l'a utilise pour initialiser "
        "le projet React et beneficier d'une configuration optimisee sans avoir a configurer "
        "Webpack manuellement. C'est l'outil recommande par React pour demarrer un projet.",
        C["teal"], C["teal_l"])

    if y > PH - 60:
        pdf.add_page()
        pdf.header_bar("6 - Outils de developpement (suite)", C["teal"])
        pdf.footer_bar()
        y = 18

    y = pdf.tech_block(y, "draw.io (diagrams.net)", "",
        "draw.io est l'outil de diagrammation UML utilise pour la conception du projet. "
        "On l'a utilise pour creer 3 diagrammes dans le dossier Conception/ : diagramme de "
        "cas d'utilisation (USE_CASE.drawio), diagramme de sequence (diag_Seq.drawio), "
        "et diagramme de classes (diag_Classe.drawio). C'est un outil gratuit, open source, "
        "qui fonctionne dans le navigateur sans installation, et exporte en PNG/PDF.",
        C["teal"], C["teal_l"])

    y = pdf.tech_block(y, "ESLint", "",
        "ESLint est l'outil de linting JavaScript integre dans CRA. Il detecte automatiquement "
        "les erreurs de syntaxe, le code mort, et les problemes de style dans le code JavaScript. "
        "La configuration dans package.json utilise les presets react-app et react-app/jest. "
        "C'est l'outil standard pour maintenir la qualite du code JavaScript/React.",
        C["teal"], C["teal_l"])

    # ═══════════════════════════════════════════════════
    # SECTION 7 : TECHNOLOGIES WEB & MAPPING
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.header_bar("7 - Technologies web et mapping", C["blue"])
    pdf.footer_bar()

    y = 18
    y = pdf.section_title(y, "TECHNOLOGIES WEB ET MAPPING", C["blue"],
                          "Les technologies specifiques au web et a la cartographie interactive")

    y += 4
    y = pdf.tech_block(y, "Progressive Web App (PWA)", "",
        "L'application est configuree comme une PWA via le fichier manifest.json. Cela permet "
        "de l'installer comme une application native sur les appareils, de fonctionner en mode "
        "hors-ligne (avec cache), et d'offrir une experience utilisateur proche d'une app mobile. "
        "C'est un standard web moderne qui evite de developper une app mobile separee.",
        C["blue"], C["blue_l"])

    y = pdf.tech_block(y, "OpenStreetMap", "",
        "OpenStreetMap (OSM) est le fournisseur de tuiles cartographiques utilise avec Leaflet. "
        "On l'a choisi car c'est gratuit, open source, et offre une couverture mondiale. Contrairement "
        "a Google Maps, OSM ne necessite pas de cle API ni de restrictions de quota. Les donnees "
        "sont community-driven et mises a jour regulierement. C'est le standard pour les projets "
        "open source utilisant des cartes.",
        C["blue"], C["blue_l"])

    y = pdf.tech_block(y, "localStorage (Web Storage API)", "",
        "localStorage est utilise côté client pour stocker les tokens JWT (access + refresh) "
        "de maniere persistante. Contrairement aux cookies, localStorage n'est pas envoye "
        "automatiquement avec chaque requete HTTP, ce qui donne plus de controle sur l'envoi "
        "des tokens (via les headers Authorization). C'est le stockage standard pour les apps "
        "JWT modernes.",
        C["blue"], C["blue_l"])

    y = pdf.tech_block(y, "Fetch API / XHR", "",
        "Fetch API est l'API native des navigateurs pour effectuer des requetes HTTP. On l'a "
        "utilisee pour la plupart des appels API du frontend (tickets, dashboard, sites). "
        "Elle est plus moderne et legere que XMLHttpRequest (XHR). Axios est aussi present "
        "pour les cas complexes (intercepteurs JWT). Les deux coexistent dans le projet.",
        C["blue"], C["blue_l"])

    # ═══════════════════════════════════════════════════
    # SECTION 8 : INTELLIGENCE ARTIFICIELLE
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.header_bar("8 - Intelligence artificielle", C["orange"])
    pdf.footer_bar()

    y = 18
    y = pdf.section_title(y, "INTELLIGENCE ARTIFICIELLE", C["orange"],
                          "Les technologies IA integrees dans l'application")

    y += 4
    y = pdf.tech_block(y, "Mistral AI (mistral-small-latest)", "",
        "Mistral AI est le modele de langage (LLM) utilise pour l'intelligence artificielle "
        "du projet. On l'a choisi car :\n\n"
        "1. Performance : Mistral-small est un modele performant avec un excellent "
        "rapport qualite/prix par rapport a GPT-4.\n\n"
        "2. API compatible OpenAI : L'API de Mistral est compatible avec le SDK OpenAI, "
        "ce qui simplifie l'integration (meme syntaxe, meme structure de reponse).\n\n"
        "3. Souverainete europeenne : Mistral est une entreprise francaise, ce qui est "
        "important pour la conformite RGPD et la souverainete des donnees.\n\n"
        "4. Utilisations dans le projet :\n"
        "   - Generation automatique des titres et descriptions pour les groupes de tickets\n"
        "   - Generation de rapports HTML d'analyse reseau avec la section 'commentaire IA'\n"
        "   - Analyse des tendances et patterns dans les reclamations",
        C["orange"], C["orange_l"])

    y = pdf.tech_block(y, "Algorithme Jaccard (fallback local)", "",
        "L'algorithme de similarite de Jaccard est utilise comme fallback quand Mistral AI "
        "est indisponible. Il compare les mots-cles des tickets et calcule un score de "
        "similarite (>= 80% de similarite = meme groupe). Les tickets du meme site et de "
        "la meme fenetre de 7 jours sont regroupes. C'est une solution de secours simple "
        "mais efficace qui assure la continuite du service meme sans connexion a l'API IA.",
        C["orange"], C["orange_l"])

    # ═══════════════════════════════════════════════════
    # SECTION 9 : SECURITE
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.header_bar("9 - Securite", C["red"])
    pdf.footer_bar()

    y = 18
    y = pdf.section_title(y, "SECURITE", C["red"],
                          "Les mecanismes de securite implementes dans l'application")

    y += 4
    y = pdf.tech_block(y, "JWT (JSON Web Tokens) - SimpleJWT", "",
        "L'authentification JWT est implementee via SimpleJWT avec un systeme de tokens "
        "d'acces (1h) et refresh (7j). Les refresh tokens sont rotates a chaque utilisation "
        "et blacklistes apres rotation ou deconnexion. Des claims custom (role, code_user) "
        "sont injectes dans le token pour la gestion des permissions côté client. Le logout "
        "blackliste le refresh token pour empecher toute reutilisation. C'est le standard "
        "d'authentification pour les APIs REST modernes.",
        C["red"], C["red_l"])

    y = pdf.tech_block(y, "HSTS (HTTP Strict Transport Security)", "",
        "HSTS est un mecanisme de securite qui force le navigateur a communiquer uniquement "
        "en HTTPS. Configuré en production avec :\n\n"
        "- SECURE_HSTS_SECONDS = 31536000 (1 an)\n"
        "- SECURE_HSTS_INCLUDE_SUBDOMAINS = True\n"
        "- SECURE_HSTS_PRELOAD = True\n\n"
        "Pourquoi HSTS est essentiel :\n"
        "1. Protection SSL stripping : Empeche les attaques ou un attaquant force la "
        "connexion HTTP au lieu de HTTPS pour intercepter les donnees.\n"
        "2. Protection contre les cookies non securises : Avec SESSION_COOKIE_SECURE=True "
        "et CSRF_COOKIE_SECURE=True, les cookies ne sont envoyes qu'en HTTPS.\n"
        "3. Preload : Le site peut etre ajoute a la HSTS preload list du navigateur, "
        "ce qui force HTTPS des la premiere visite.\n\n"
        "En development (DEBUG=True), HSTS est desactive (SECURE_HSTS_SECONDS=0) pour "
        "permettre le developpement local sans certificat SSL.",
        C["red"], C["red_l"])

    y = pdf.tech_block(y, "CORS (Cross-Origin Resource Sharing)", "",
        "CORS est configure via django-cors-headers avec une liste blanche restrictive : "
        "localhost:3000, 127.0.0.1:3000, localhost:5173, 127.0.0.1:5173. "
        "CORS_ALLOW_ALL_ORIGINS=False empeche toute origine non listee d'acceder a l'API. "
        "C'est un mecanisme de securite essentiel car le frontend et le backend sont sur des "
        "ports differents (3000 vs 8000), ce qui constitue une cross-origin request.",
        C["red"], C["red_l"])

    if y > PH - 70:
        pdf.add_page()
        pdf.header_bar("9 - Securite (suite)", C["red"])
        pdf.footer_bar()
        y = 18

    y = pdf.tech_block(y, "Rate Limiting (Throttling)", "",
        "Le rate limiting est implemente via DRF throttling : 30 requetes/minute pour les "
        "utilisateurs anonymes et 100 requetes/minute pour les utilisateurs connectes. "
        "Cela protege l'API contre les attaques par deni de service (DDoS) et le scraping. "
        "C'est une securite de base indispensable pour toute API publique.",
        C["red"], C["red_l"])

    y = pdf.tech_block(y, "DOMPurify - Protection XSS", "",
        "DOMPurify sanitise le HTML genere par Mistral AI avant de l'afficher dans le navigateur. "
        "Sans cette protection, un prompt injection pourrait injecter du JavaScript malveillant "
        "dans les rapports IA (attaques XSS - Cross-Site Scripting). DOMPurify supprime tous les "
        "scripts, events handlers, et elements dangereux du HTML. C'est la bibliotheque de "
        "reference utilisee par Mozilla, Google et GitHub.",
        C["red"], C["red_l"])

    y = pdf.tech_block(y, "Restriction IP Admin (Middleware)", "",
        "Un middleware personnalise (AdminIPRestrictionMiddleware) bloque l'acces a /admin/ "
        "sauf depuis les IP autorisees (configurable via .env : ALLOWED_ADMIN_IPS). "
        "C'est une securite en couches : meme si un attaquant devine les identifiants admin, "
        "il ne peut pas acceder a l'interface Django admin depuis une IP non autorisee. "
        "Ce middleware est active en 3eme position dans la pile de middleware Django.",
        C["red"], C["red_l"])

    y = pdf.tech_block(y, "Securite SSL/HTTPS - Headers supplementaires", "",
        "En production (DEBUG=False), les headers de securite suivants sont actives :\n\n"
        "- SECURE_SSL_REDIRECT = True : Redirige toutes les requetes HTTP vers HTTPS\n"
        "- SESSION_COOKIE_SECURE = True : Les cookies de session ne sont envoyes qu'en HTTPS\n"
        "- CSRF_COOKIE_SECURE = True : Les cookies CSRF ne sont envoyes qu'en HTTPS\n"
        "- SECURE_BROWSER_XSS_FILTER = True : Filtre XSS du navigateur\n"
        "- SECURE_CONTENT_TYPE_NOSNIFF = True : Empeche le MIME sniffing\n"
        "- X_FRAME_OPTIONS = 'DENY' : Empeche le clickjacking (iframes)\n"
        "- SECURE_PROXY_SSL_HEADER : Fait confiance au header X-Forwarded-Proto pour les proxys",
        C["red"], C["red_l"])

    y = pdf.tech_block(y, "Validation des mots de passe", "",
        "Les 4 validateurs integres de Django sont actives :\n"
        "- UserAttributeSimilarityValidator : Empeche les mots de passe trop similaires au profil\n"
        "- MinimumLengthValidator : Longueur minimale requise\n"
        "- CommonPasswordValidator : Verifie contre un dictionnaire de mots de passe communs\n"
        "- NumericPasswordValidator : Empeche les mots de passe uniquement numeriques\n\n"
        "La validation est aussi appliquee cote API via les serializers DRF (register + change password).",
        C["red"], C["red_l"])

    # ═══════════════════════════════════════════════════
    # PAGE DE CONCLUSION
    # ═══════════════════════════════════════════════════
    pdf.add_page()
    pdf.header_bar("Conclusion", C["dark"])
    pdf.footer_bar()

    y = 18
    y = pdf.section_title(y, "RESUME DES CHOIX TECHNOLOGIQUES", C["dark"])

    y += 4
    pdf.set_fill_color(*C["white"])
    pdf.set_draw_color(*C["gray_l"])
    pdf.set_line_width(0.3)
    pdf.rect(14, y, PW - 28, 70, style="DF")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*C["dark"])
    pdf.set_xy(18, y + 4)
    pdf.multi_cell(PW - 36, 5,
        "Ce document presente l'ensemble des technologies utilisees pour le developpement de "
        "Djezzy Supervision Reseau, un systeme NOC (Network Operations Center) de gestion des "
        "reclamations et supervision des sites BTS.\n\n"
        "Chaque choix technologique a ete justifie par des criteres concrets : popularite et "
        "communaute, qualite technique, securite, productivite, et coherence avec l'ecosysteme "
        "du projet. L'architecture 3-tier (React / Django / PostgreSQL) est un standard eprouve "
        "pour les applications web professionnelles.\n\n"
        "Les technologies open source ont ete privilegiees (Django, PostgreSQL, Leaflet, Firefox, "
        "draw.io) pour la transparence, la souverainete des donnees, et l'absence de cout de "
        "licence. L'integration de Mistral AI apporte une dimension d'intelligence artificielle "
        "unique tout en restant souveraine (entreprise francaise).")

    y += 75

    # Stats summary boxes
    stats = [
        ("5", "Langages", C["blue"]),
        ("12+", "Librairies", C["green"]),
        ("1", "Base de donnees", C["purple"]),
        ("9", "Mesures securite", C["red"]),
    ]

    box_w = (PW - 36) / 4 - 2
    for i, (num, label, color) in enumerate(stats):
        bx = 14 + i * (box_w + 3)
        pdf.set_fill_color(*color)
        pdf.rect(bx, y, box_w, 18, style="F")
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(*C["white"])
        pdf.set_xy(bx, y + 1)
        pdf.cell(box_w, 10, num, align="C")
        pdf.set_font("Helvetica", "", 7)
        pdf.set_xy(bx, y + 10)
        pdf.cell(box_w, 6, label, align="C")

    # Save
    out = os.path.join(os.path.dirname(__file__), "media", "Technologies_Utilisees_Detaillees.pdf")
    pdf.output(out)
    print(f"PDF genere: {out}")


if __name__ == "__main__":
    generate()
