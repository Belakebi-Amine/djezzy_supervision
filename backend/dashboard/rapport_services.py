# dashboard/rapport_services.py
# ─────────────────────────────────────────────────────────────
# AI report generation service. Collects real-time network data
# and sends it to Google's Gemini API to produce professional
# HTML reports with analysis, trends, and recommendations.
# ─────────────────────────────────────────────────────────────
import os
from datetime import timedelta
from django.utils import timezone
from django.db import models
from django.db.models import Count, Q, Avg, F
from decouple import config
from google import genai

from reclamations.models import Reclamation
from sites_reseau.models import SiteReseau
from accounts.models import CustomUser


def _collecter_donnees(date_debut=None, date_fin=None):
    """
    Gathers current network statistics to feed the AI prompt.
    Collects: site status, ticket counts, resolution rates,
    top impacted sites, and geographic distribution.
    Defaults to the last 30 days if no date range is provided.
    """
    aujourd = timezone.now().date()

    # Use provided date range or default to last 30 days
    if date_debut and date_fin:
        debut = timezone.make_aware(timezone.datetime.combine(date_debut, timezone.datetime.min.time()))
        fin = timezone.make_aware(timezone.datetime.combine(date_fin, timezone.datetime.max.time()))
    else:
        debut = timezone.now() - timedelta(days=30)
        fin = timezone.now()

    # ── Site statistics ──
    total_sites = SiteReseau.objects.count()
    sites_up = SiteReseau.objects.filter(statut='UP').count()
    sites_down = SiteReseau.objects.filter(statut='DOWN').count()
    dispo = round((sites_up / total_sites * 100), 1) if total_sites else 100.0

    # ── Ticket statistics for the period ──
    tickets_periode = Reclamation.objects.filter(created_at__range=(debut, fin))
    total_tickets = tickets_periode.count()
    ouverts = tickets_periode.filter(statut='ouvert').count()
    resolus = tickets_periode.filter(statut='resolu').count()
    fermes = tickets_periode.filter(statut='ferme').count()
    critques = tickets_periode.filter(priorite='critique').count()

    # ── Priority breakdown ──
    repartition_priorite = {
        'critique': tickets_periode.filter(priorite='critique').count(),
        'haute': tickets_periode.filter(priorite='haute').count(),
        'normale': tickets_periode.filter(priorite='normale').count(),
        'basse': tickets_periode.filter(priorite='basse').count(),
    }

    # ── Top 7 most impacted sites ──
    top_sites = (
        tickets_periode.values('site__codeSite', 'site__nom')
        .annotate(nb=Count('id'))
        .order_by('-nb')[:7]
    )

    # ── Resolution metrics ──
    tickets_resolus = tickets_periode.filter(statut__in=['resolu', 'ferme']).count()
    taux_resolution = round((tickets_resolus / total_tickets * 100), 1) if total_tickets else 0

    # Average time from creation to resolution
    avg_delai = tickets_periode.filter(
        statut__in=['resolu', 'ferme'], resolu_le__isnull=False
    ).annotate(
        duree=models.ExpressionWrapper(
            models.F('resolu_le') - models.F('created_at'),
            output_field=models.DurationField()
        )
    ).aggregate(avg=models.Avg('duree'))['avg']

    delai_moyen = None
    if avg_delai:
        heures = int(avg_delai.total_seconds() // 3600)
        minutes = int((avg_delai.total_seconds() % 3600) // 60)
        delai_moyen = f"{heures}h {minutes}m"

    # ── Top 5 wilayas by ticket volume ──
    wilayas = (
        tickets_periode.values('site__wilaya')
        .annotate(nb=Count('id'))
        .order_by('-nb')[:5]
    )

    return {
        'periode': {
            'debut': debut.strftime('%d/%m/%Y'),
            'fin': fin.strftime('%d/%m/%Y'),
        },
        'reseau': {
            'total_sites': total_sites,
            'sites_up': sites_up,
            'sites_down': sites_down,
            'disponibilite': dispo,
        },
        'tickets': {
            'total': total_tickets,
            'ouverts': ouverts,
            'resolus': resolus,
            'fermes': fermes,
            'critiques': critques,
            'taux_resolution': taux_resolution,
            'delai_moyen': delai_moyen,
        },
        'priorites': repartition_priorite,
        'top_sites': [
            {'code': s['site__codeSite'], 'nom': s['site__nom'], 'nb': s['nb']}
            for s in top_sites
        ],
        'top_wilayas': [
            {'wilaya': w['site__wilaya'], 'nb': w['nb']}
            for w in wilayas if w['site__wilaya']
        ],
    }


def generer_rapport_ia(prompt_utilisateur, date_debut=None, date_fin=None):
    """
    Generates a professional HTML report via Gemini AI.

    Flow:
    1. Collects real network data from the database
    2. Builds a detailed prompt with the data + user's request
    3. Sends to Gemini 2.5 Flash for report generation
    4. Cleans up markdown code blocks if present in the response
    5. Returns the HTML content for display in the frontend

    The prompt instructs the AI to act as a Djezzy network analyst
    and produce a structured, styled HTML report in French.
    """
    api_key = config('GEMINI_API_KEY', default=None)

    if not api_key:
        return (
            "<div style='padding:20px;color:#DC2626;text-align:center;'>"
            "<h3>IA non configurée</h3>"
            "<p>La clé API Gemini n'est pas définie dans le fichier .env.</p>"
            "</div>"
        )

    donnees = _collecter_donnees(date_debut, date_fin)

    prompt = f"""
    Tu es un analyste réseau expert pour Djezzy, le premier opérateur mobile en Algérie.
    Tu rédiges des rapports professionnels en français destinés au superviseur réseau.

    Voici les données réelles collectées depuis le système de supervision :
    {donnees}

    Demande spécifique de l'utilisateur :
    {prompt_utilisateur}

    Consignes de rédaction :
    - Rédige exclusivement en français.
    - Génère un rapport structuré et professionnel en HTML.
    - Utilise uniquement des balises HTML standards : <h2>, <h3>, <p>, <ul>, <li>, <table>, <tr>, <th>, <td>, <strong>, <span>, <div>.
    - Ajoute du style CSS inline pour un rendu propre (couleurs, margins, paddings, bordures, border-radius, font-family).
    - N'inclus PAS les balises <html>, <head>, <body>. Commence directement par le contenu.
    - Mets en valeur les indicateurs clés (disponibilité, taux de résolution, tickets critiques).
    - Si des tendances sont visibles, mentionne-les.
    - Termine par une conclusion avec des recommandations si pertinent.
    - Sois concis mais complet. Le rapport doit faire environ 1 page A4.
    """

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        html = response.text.strip()
        # Strip markdown code fences if the AI wraps its HTML output
        if html.startswith('```html'):
            html = html[7:]
        if html.endswith('```'):
            html = html[:-3]
        return html.strip()
    except Exception as e:
        return (
            f"<div style='padding:20px;color:#DC2626;text-align:center;'>"
            f"<h3>Erreur de génération</h3>"
            f"<p>{str(e)}</p>"
            f"</div>"
        )
