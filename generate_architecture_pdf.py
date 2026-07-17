"""
Architecture Technique 3-Tier - Djezzy Supervision Reseau
Une seule page A3 paysage, design propre et aere.
"""
import os, math
from fpdf import FPDF

C = {
    "blue": (41, 128, 185), "blue_l": (234, 242, 248),
    "green": (39, 174, 96), "green_l": (234, 247, 239),
    "purple": (142, 68, 173), "purple_l": (243, 237, 247),
    "orange": (230, 126, 34), "orange_l": (252, 243, 207),
    "orange_d": (180, 95, 25),
    "dark": (44, 62, 80), "gray": (127, 140, 141),
    "gray_l": (220, 225, 230), "white": (255, 255, 255),
    "bg": (248, 249, 252), "bg_d": (235, 237, 240),
}

PW, PH = 420, 297


class ArchPDF(FPDF):
    def __init__(self):
        super().__init__(orientation="L", unit="mm", format="A3")
        self.set_auto_page_break(auto=False)

    def header_bar(self, title, subtitle=""):
        self.set_fill_color(*C["dark"])
        self.rect(0, 0, PW, 14, style="F")
        self.set_fill_color(*C["blue"])
        self.rect(0, 14, PW, 0.8, style="F")
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*C["white"])
        self.set_xy(12, 2)
        self.cell(0, 8, title)
        if subtitle:
            self.set_font("Helvetica", "", 7)
            self.set_text_color(*C["gray_l"])
            self.set_xy(12, 8)
            self.cell(0, 5, subtitle)
        self.set_font("Helvetica", "", 6)
        self.set_text_color(*C["gray_l"])
        self.set_xy(PW - 20, 4)
        self.cell(0, 5, f"P.{self.page_no()}")

    def footer_bar(self):
        self.set_fill_color(*C["bg_d"])
        self.rect(0, PH - 7, PW, 7, style="F")
        self.set_font("Helvetica", "", 6)
        self.set_text_color(*C["gray"])
        self.set_xy(12, PH - 6)
        self.cell(0, 5, "Djezzy Supervision Reseau  |  Architecture Technique 3-Tier  |  PFE 2025-2026  |  Belakebi Amine & Bouachach Amel")

    def tier_card(self, x, y, w, h, color, light, title, subtitle, sections):
        # Shadow
        self.set_fill_color(*C["bg_d"])
        self.rect(x + 2, y + 2, w, h, style="F")
        # Card bg
        self.set_fill_color(*C["white"])
        self.set_draw_color(*color)
        self.set_line_width(0.6)
        self.rect(x, y, w, h, style="DF")
        # Header strip
        self.set_fill_color(*color)
        self.rect(x, y, w, 12, style="F")
        # Title
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*C["white"])
        self.set_xy(x + 4, y + 1)
        self.cell(w - 8, 6, title)
        # Subtitle
        self.set_font("Helvetica", "", 6.5)
        self.set_text_color(200, 220, 240)
        self.set_xy(x + 4, y + 7)
        self.cell(w - 8, 4, subtitle)

        cy = y + 15
        for sec_title, sec_items in sections:
            # Section header
            self.set_fill_color(*light)
            self.rect(x + 3, cy, w - 6, 7, style="F")
            self.set_fill_color(*color)
            self.rect(x + 3, cy, 2, 7, style="F")
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*color)
            self.set_xy(x + 7, cy + 1)
            self.cell(w - 10, 5, sec_title)
            cy += 8
            # Items
            for item in sec_items:
                self.set_font("Helvetica", "", 6)
                self.set_text_color(*C["dark"])
                self.set_xy(x + 9, cy)
                self.cell(w - 13, 4.5, item)
                # Bullet
                self.set_fill_color(*color)
                self.ellipse(x + 7, cy + 1.2, 1.3, 1.3, style="F")
                cy += 5
            cy += 1.5
        return cy

    def badge_row(self, x, y, color, light, badges):
        cx = x
        for label in badges:
            bw = self.get_string_width(label) + 7
            self.set_fill_color(*light)
            self.set_draw_color(*color)
            self.set_line_width(0.3)
            self.rect(cx, y, bw, 7, style="DF")
            self.set_font("Helvetica", "B", 6)
            self.set_text_color(*color)
            self.set_xy(cx, y + 0.8)
            self.cell(bw, 5.4, label, align="C")
            cx += bw + 2

    def arrow_h(self, x1, y1, x2, y2, color=(160, 160, 160)):
        self.set_draw_color(*color)
        self.set_line_width(0.6)
        self.line(x1, y1, x2, y2)
        angle = math.atan2(y2 - y1, x2 - x1)
        al = 3
        self.set_fill_color(*color)
        self.polygon([(x2, y2),
            (x2 - al * math.cos(angle - 0.35), y2 - al * math.sin(angle - 0.35)),
            (x2 - al * math.cos(angle + 0.35), y2 - al * math.sin(angle + 0.35))], style="F")

    def arrow_label(self, cx, cy, text, color):
        tw = self.get_string_width(text) + 8
        self.set_fill_color(*C["white"])
        self.set_draw_color(*color)
        self.set_line_width(0.3)
        self.rect(cx - tw / 2, cy - 6, tw, 7, style="DF")
        self.set_font("Helvetica", "B", 6)
        self.set_text_color(*color)
        self.set_xy(cx - tw / 2, cy - 5)
        self.cell(tw, 5, text, align="C")


def generate():
    pdf = ArchPDF()

    pdf.add_page()
    pdf.header_bar(
        "Architecture Technique 3-Tier",
        "Djezzy Supervision Reseau  -  Systeme NOC de gestion des reclamations et supervision BTS"
    )
    pdf.footer_bar()

    # Layout: 3 cards + external services box below
    # Available: y=16 to y=290 = 274mm height, x=8 to x=412 = 404mm width
    gap = 10
    tw1, tw2, tw3 = 128, 148, 108
    tx1, tx2, tx3 = 8, 8 + tw1 + gap, 8 + tw1 + gap + tw2 + gap
    ty = 18
    card_h = 200

    # ── TIER 1: PRESENTATION ──
    s1 = [
        ("Framework", [
            "React 19.2 + React Router v7",
            "Build: Create React App (react-scripts 5)",
        ]),
        ("Pages (6)", [
            "Login               - Auth JWT + redirection par role",
            "AdminDashboard      - Panel admin complet (4 onglets)",
            "EngineerDashboard   - Sites BTS, tickets, carte, groupes",
            "SupervisorDashboard - KPIs, graphiques, rapports IA",
            "CallCenter          - Creation et gestion des tickets",
            "Profile             - Gestion profil + mot de passe",
        ]),
        ("Composants partages", [
            "PrivateRoute       - Garde de routes par role utilisateur",
            "Map                - Carte Leaflet interactive + markers",
            "DetailModal        - Modales Recharts (evolution, priorite)",
            "NotificationContext - Systeme de toast global",
        ]),
        ("API Layer (48 fonctions)", [
            "api/tickets.js   - 35 fonctions (tickets, sites, users, groupes)",
            "api/dashboard.js - 13 fonctions (stats, reporting, rapports IA)",
            "Gestion JWT: decode, refresh auto, injection headers",
        ]),
    ]
    pdf.tier_card(tx1, ty, tw1, card_h, C["blue"], C["blue_l"],
                  "TIER 1  -  PRESENTATION", "Client React - Interface utilisateur", s1)
    pdf.badge_row(tx1 + 5, ty + card_h - 10, C["blue"], C["blue_l"],
                  ["React 19", "Router v7", "Recharts", "Leaflet", "Axios", "DOMPurify", "html2pdf.js"])

    # ── TIER 2: LOGIQUE / API ──
    s2 = [
        ("Framework", [
            "Django 6.0.3 + Django REST Framework 3.17",
            "Auth: SimpleJWT 5.5 (access 1h / refresh 7j)",
        ]),
        ("Apps Django (5)", [
            "accounts      - Utilisateurs, 5 roles, JWT auth",
            "reclamations  - Tickets, groupes Jaccard, commentaires",
            "sites_reseau  - Sites BTS (4G/5G), 4 statuts",
            "dashboard     - KPIs, reporting geo, rapports IA",
            "cartographie  - Endpoints cartes pour Leaflet",
        ]),
        ("Modeles (6)", [
            "CustomUser        - 5 roles: ADMIN / INGENIEUR / CC / SUPERVISEUR / REPORTING",
            "Reclamation       - 14 champs, 5 FK, auto-priorite par mots-cles",
            "GroupeTicket      - Groupage IA: Jaccard >= 80%, fentre 7j, meme site",
            "SiteReseau        - BTS: UP / DOWN / DEGRADE / PERTURBE, 4G/5G",
            "CommentaireTicket - Commentaires sur reclamations",
            "RapportIA         - Rapports HTML generes par Mistral AI",
        ]),
        ("Securite", [
            "JWT: rotation + blacklist, claims custom (code_user, role)",
            "Middleware: IP restriction /admin/, CORS django-cors-headers",
            "Permissions: IsAdmin, IsAgentOrAdmin, IsEngineerOrAdmin",
        ]),
        ("Intelligence Artificielle", [
            "Mistral AI (mistral-small-latest) - SDK OpenAI-compatible",
            "Generation titres + descriptions pour groupes de tickets",
            "Rapports IA HTML (analyse reseau + prompt utilisateur)",
            "Fallback local: generation par regles si Mistral indisponible",
        ]),
    ]
    pdf.tier_card(tx2, ty, tw2, card_h, C["green"], C["green_l"],
                  "TIER 2  -  LOGIQUE / API", "Django REST Framework - Traitement et regles metier", s2)
    pdf.badge_row(tx2 + 5, ty + card_h - 10, C["green"], C["green_l"],
                  ["Django 6", "DRF 3.17", "SimpleJWT", "OpenAI SDK", "python-decouple", "psycopg2"])

    # ── TIER 3: DONNEES ──
    s3 = [
        ("Moteur", [
            "PostgreSQL 15",
            "Port: 5432 / Host: localhost",
            "Auth via variables .env",
        ]),
        ("Tables (6)", [
            "accounts_customuser",
            "sites_reseau_sitereseau",
            "reclamations_reclamation",
            "reclamations_groupticket",
            "reclamations_commentaireticket",
            "dashboard_rapportia",
        ]),
        ("Relations FK", [
            "CustomUser 1--N Reclamation",
            "CustomUser 1--N GroupeTicket",
            "CustomUser 1--N RapportIA",
            "SiteReseau 1--N Reclamation",
            "SiteReseau 1--N GroupeTicket",
            "GroupeTicket 1--N Reclamation",
            "Reclamation 1--N CommentaireTicket",
        ]),
        ("Migrations (25)", [
            "accounts: 8 | reclamations: 7",
            "sites_reseau: 8 | dashboard: 2",
        ]),
    ]
    pdf.tier_card(tx3, ty, tw3, card_h, C["purple"], C["purple_l"],
                  "TIER 3  -  DONNEES", "PostgreSQL - Persistance et stockage", s3)
    pdf.badge_row(tx3 + 5, ty + card_h - 10, C["purple"], C["purple_l"],
                  ["PostgreSQL 15", "psycopg2 2.9", "Pillow 12"])

    # ── Arrows between tiers ──
    arrow_y = ty + card_h / 2
    mid12 = (tx1 + tw1 + tx2) / 2
    pdf.arrow_h(tx1 + tw1 + 2, arrow_y, tx2 - 2, arrow_y, C["blue"])
    pdf.arrow_label(mid12, arrow_y, "REST API  (JSON)", C["blue"])

    mid23 = (tx2 + tw2 + tx3) / 2
    pdf.arrow_h(tx2 + tw2 + 2, arrow_y, tx3 - 2, arrow_y, C["purple"])
    pdf.arrow_label(mid23, arrow_y, "SQL  (psycopg2)", C["purple"])

    # ── External Services Box ──
    ext_y = ty + card_h + 12
    ext_h = PH - 7 - ext_y - 4
    ext_x = tx1
    ext_w = tw1 + tw2 + gap - 4

    # Shadow
    pdf.set_fill_color(*C["bg_d"])
    pdf.rect(ext_x + 2, ext_y + 2, ext_w, ext_h, style="F")
    # Box
    pdf.set_fill_color(*C["white"])
    pdf.set_draw_color(*C["orange"])
    pdf.set_line_width(0.6)
    pdf.rect(ext_x, ext_y, ext_w, ext_h, style="DF")
    # Header strip
    pdf.set_fill_color(*C["orange"])
    pdf.rect(ext_x, ext_y, ext_w, 10, style="F")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*C["white"])
    pdf.set_xy(ext_x + 5, ext_y + 1.5)
    pdf.cell(ext_w - 10, 7, "SERVICES EXTERNES")

    # Mistral box
    mx = ext_x + 6
    mw = (ext_w - 20) / 2
    pdf.set_fill_color(*C["orange_l"])
    pdf.set_draw_color(*C["orange"])
    pdf.set_line_width(0.3)
    pdf.rect(mx, ext_y + 13, mw, ext_h - 18, style="DF")
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*C["orange_d"])
    pdf.set_xy(mx + 3, ext_y + 14.5)
    pdf.cell(mw - 6, 6, "Mistral AI  (mistral-small-latest)")
    pdf.set_font("Helvetica", "", 6.5)
    pdf.set_text_color(*C["dark"])
    for i, t in enumerate([
        "Titres + descriptions auto-generees pour groupes",
        "Rapports IA HTML (analyse reseau + prompt)",
        "SDK OpenAI-compatible => api.mistral.ai/v1",
    ]):
        pdf.set_xy(mx + 4, ext_y + 23 + i * 6)
        pdf.cell(mw - 8, 5, t)

    # Fallback box
    fx = mx + mw + 8
    pdf.set_fill_color((253, 235, 233))
    pdf.set_draw_color((192, 57, 43))
    pdf.set_line_width(0.3)
    pdf.rect(fx, ext_y + 13, mw, ext_h - 18, style="DF")
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color((192, 57, 43))
    pdf.set_xy(fx + 3, ext_y + 14.5)
    pdf.cell(mw - 6, 6, "Fallback Local  (regles)")
    pdf.set_font("Helvetica", "", 6.5)
    pdf.set_text_color(*C["dark"])
    for i, t in enumerate([
        "Generation par templates si Mistral indisponible",
        "Mots-cles -> Priorite auto (45 regles)",
        "Regroupement Jaccard local",
    ]):
        pdf.set_xy(fx + 4, ext_y + 23 + i * 6)
        pdf.cell(mw - 8, 5, t)

    # Dashed arrow T2 -> External
    pdf.set_draw_color(*C["orange"])
    pdf.set_line_width(0.5)
    pdf.set_dash_pattern(dash=2, gap=1)
    ax = tx2 + tw2 / 2
    pdf.line(ax, ty + card_h, ax, ext_y)
    pdf.set_dash_pattern(dash=0, gap=0)
    pdf.set_fill_color(*C["orange"])
    pdf.polygon([(ax - 2, ext_y + 1), (ax + 2, ext_y + 1), (ax, ext_y - 1.5)], style="F")

    # Save
    out = os.path.join(os.path.dirname(__file__), "media", "architecture_technique_3_tier.pdf")
    pdf.output(out)
    print(f"PDF genere: {out}")


if __name__ == "__main__":
    generate()
