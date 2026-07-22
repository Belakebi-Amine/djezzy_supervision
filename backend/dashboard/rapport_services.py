# dashboard/rapport_services.py
# ─────────────────────────────────────────────────────────────
# Report generation service. Collects real-time network data
# and produces professional HTML reports with analysis,
# trends, and recommendations.
# Uses Mistral API (cloud) for AI-powered report generation.
# Falls back to local rule-based generation if Mistral unavailable.
# ─────────────────────────────────────────────────────────────
import logging
from datetime import timedelta
from django.utils import timezone
from django.db import models
from django.db.models import Count, Q, Avg, F
from django.db.models.functions import TruncDate
from decouple import config

logger = logging.getLogger(__name__)

MISTRAL_API_KEY = config('MISTRAL_API_KEY', default='')
MISTRAL_MODEL = config('MISTRAL_MODEL', default='mistral-small-latest')

from reclamations.models import Reclamation
from sites_reseau.models import SiteReseau
from accounts.models import Role


# ── CSS shared across all reports ──────────────────────────
_CSS = """
font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
color: #1E293B; line-height: 1.65;
"""

def _card(content, border_left="#E8401A"):
    return (
        f'<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;'
        f'padding:20px 24px;margin-bottom:18px;border-left:4px solid {border_left};{_CSS}'
        f'page-break-inside:avoid;">'
        f'{content}</div>'
    )


# ── Data collection (expanded) ─────────────────────────────

def _collecter_donnees(date_debut=None, date_fin=None):
    """Gathers comprehensive network statistics for report generation."""
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

    sites_par_techno = list(
        SiteReseau.objects.values('technologie')
        .annotate(total=Count('id'), up=Count('id', filter=Q(statut='UP')))
        .order_by('-total')
    )

    # ── Ticket statistics for the period ──
    tickets = Reclamation.objects.filter(created_at__range=(debut, fin))
    total_tickets = tickets.count()
    ouverts = tickets.filter(statut='ouvert').count()
    resolus = tickets.filter(statut='resolu').count()
    fermes = tickets.filter(statut='ferme').count()
    critiques = tickets.filter(priorite='critique').count()

    repartition_priorite = {
        'critique': tickets.filter(priorite='critique').count(),
        'haute': tickets.filter(priorite='haute').count(),
        'normale': tickets.filter(priorite='normale').count(),
        'basse': tickets.filter(priorite='basse').count(),
    }

    # ── Client type breakdown ──
    par_type_client = list(
        tickets.values('type_client').annotate(nb=Count('id')).order_by('-nb')
    )

    # ── Tickets per day (evolution) ──
    evolution = list(
        tickets.annotate(jour=TruncDate('created_at'))
        .values('jour')
        .annotate(nb=Count('id'))
        .order_by('jour')
    )

    # ── Top 7 most impacted sites ──
    top_sites = list(
        tickets.values('site__codeSite', 'site__nom', 'site__wilaya', 'site__commune')
        .annotate(nb=Count('id'))
        .order_by('-nb')[:7]
    )

    # ── Top 5 wilayas ──
    wilayas = list(
        tickets.values('site__wilaya')
        .annotate(nb=Count('id'))
        .order_by('-nb')[:5]
    )

    # ── Engineer performance ──
    ingenieurs = list(
        tickets.filter(assigne_a__role=Role.INGENIEUR_RESEAUX)
        .values('assigne_a__code_user', 'assigne_a__first_name', 'assigne_a__last_name')
        .annotate(
            total=Count('id'),
            resolus=Count('id', filter=Q(statut__in=['resolu', 'ferme'])),
            ouverts=Count('id', filter=Q(statut='ouvert')),
            critiques=Count('id', filter=Q(priorite='critique')),
        )
        .order_by('-total')
    )

    # ── Agent call center performance ──
    agents = list(
        tickets.filter(cree_par__role=Role.AGENT_CALL_CENTER)
        .values('cree_par__code_user', 'cree_par__first_name', 'cree_par__last_name')
        .annotate(total=Count('id'))
        .order_by('-total')
    )

    # ── Resolution metrics ──
    tickets_resolus = tickets.filter(statut__in=['resolu', 'ferme']).count()
    taux_resolution = round((tickets_resolus / total_tickets * 100), 1) if total_tickets else 0

    avg_delai = tickets.filter(
        statut__in=['resolu', 'ferme'], resolu_le__isnull=False,
        resolu_le__gt=models.F('created_at'),
    ).annotate(
        duree=models.ExpressionWrapper(
            models.F('resolu_le') - models.F('created_at'),
            output_field=models.DurationField()
        )
    ).aggregate(avg=Avg('duree'))['avg']

    delai_moyen = "N/A"
    if avg_delai:
        total_sec = int(avg_delai.total_seconds())
        if total_sec >= 0:
            heures = total_sec // 3600
            minutes = (total_sec % 3600) // 60
            delai_moyen = f"{heures}h {minutes}m"

    # ── Keywords frequency ──
    top_keywords = list(
        tickets.values('mots_cles_ia')
        .annotate(nb=Count('id'))
        .order_by('-nb')[:10]
    )

    # ── Sites with most DOWN status ──
    sites_down_list = list(
        SiteReseau.objects.filter(statut='DOWN')
        .values('codeSite', 'nom', 'wilaya', 'commune', 'technologie')[:10]
    )

    return {
        'periode': {'debut': debut.strftime('%d/%m/%Y'), 'fin': fin.strftime('%d/%m/%Y')},
        'reseau': {
            'total_sites': total_sites, 'sites_up': sites_up,
            'sites_down': sites_down, 'disponibilite': dispo,
            'par_techno': sites_par_techno, 'sites_down_list': sites_down_list,
        },
        'tickets': {
            'total': total_tickets, 'ouverts': ouverts, 'resolus': resolus,
            'fermes': fermes, 'critiques': critiques,
            'taux_resolution': taux_resolution, 'delai_moyen': delai_moyen,
        },
        'priorites': repartition_priorite,
        'type_client': par_type_client,
        'evolution': [{'jour': e['jour'].strftime('%d/%m'), 'nb': e['nb']} for e in evolution],
        'top_sites': top_sites,
        'top_wilayas': [{'wilaya': w['site__wilaya'], 'nb': w['nb']} for w in wilayas if w['site__wilaya']],
        'ingenieurs': [
            {
                'code': i['assigne_a__code_user'],
                'nom': f"{i['assigne_a__first_name']} {i['assigne_a__last_name']}",
                'total': i['total'], 'resolus': i['resolus'],
                'ouverts': i['ouverts'], 'critiques': i['critiques'],
                'taux': round(i['resolus'] / i['total'] * 100, 1) if i['total'] else 0,
            }
            for i in ingenieurs
        ],
        'agents': [
            {
                'code': a['cree_par__code_user'],
                'nom': f"{a['cree_par__first_name']} {a['cree_par__last_name']}",
                'total': a['total'],
            }
            for a in agents
        ],
        'top_keywords': top_keywords,
    }


# ── Prompt analysis ────────────────────────────────────────

def _detecter_sections(prompt):
    """Analyzes the user prompt to determine which report sections to include."""
    p = prompt.lower()
    sections = []
    if any(w in p for w in ['reseau', 'site', 'infrastructure', 'disponibilite', 'up', 'down', 'panne', 'technologie', '5g', '4g', '3g']):
        sections.append('reseau')
    if any(w in p for w in ['ticket', 'reclamation', 'plainte', 'signale', 'ouvert', 'ferme']):
        sections.append('tickets')
    if any(w in p for w in ['priorite', 'critique', 'urgenc', 'haute']):
        sections.append('priorites')
    if any(w in p for w in ['resolution', 'delai', 'temps', 'moyen', 'traitement', 'resolu']):
        sections.append('resolution')
    if any(w in p for w in ['ingenieur', 'equipe', 'performance', 'agent', 'call center', 'technicien']):
        sections.append('performance_equipe')
    if any(w in p for w in ['wilaya', 'commune', 'zone', 'geograph', 'localisation', 'alger', 'oran']):
        sections.append('geographie')
    if any(w in p for w in ['client', 'entreprise', 'particulier', 'type', 'satisfaction']):
        sections.append('clients')
    if any(w in p for w in ['tendance', 'evolution', 'trend', 'variation', 'progression', 'compar']):
        sections.append('evolution')
    if any(w in p for w in ['mot', 'cle', 'keyword', 'motif', 'cause', 'raison']):
        sections.append('mots_cles')
    if any(w in p for w in ['recommand', 'suggestion', 'amelioration', 'action', 'plan']):
        sections.append('recommandations')
    if any(w in p for w in ['kpi', 'indicateur', 'metrique', 'resume', 'synthese', 'bilan', 'resume executif', 'vue densemble', 'vue d\'ensemble', 'global']):
        sections.append('kpi')
    # Default: if no specific section detected, show everything
    if not sections:
        sections = ['kpi', 'reseau', 'tickets', 'priorites', 'resolution', 'performance_equipe', 'geographie', 'evolution', 'recommandations']
    # Always include KPI + priority sections for summary stats
    if 'kpi' not in sections:
        sections.insert(0, 'kpi')
    if 'priorites' not in sections:
        idx = sections.index('kpi') + 1 if 'kpi' in sections else 0
        sections.insert(idx, 'priorites')
    return sections


# ── Report sections ────────────────────────────────────────

_P = lambda txt: f'<p style="font-size:13px;color:#1E293B;line-height:1.8;margin:0 0 12px;">{txt}</p>'

def _section_kpi(d):
    t = d['tickets']
    r = d['reseau']
    texte = (
        f"Le reseau Djezzy compte actuellement <strong>{r['total_sites']} sites</strong> au total, "
        f"dont <strong>{r['sites_up']}</strong> en fonctionnement normal (UP) et "
        f"<strong>{r['sites_down']}</strong> en panne (DOWN). "
        f"La disponibilite globale est de <strong>{r['disponibilite']}%</strong>. "
        f"Sur la periode analysee, <strong>{t['total']} reclamations</strong> ont ete enregistrees, "
        f"avec un taux de resolution de <strong>{t['taux_resolution']}%</strong> et un delai moyen de traitement de <strong>{t['delai_moyen']}</strong>. "
        f"<strong>{t['critiques']}</strong> tickets de priorite critique ont ete declares, "
        f"necessitant une attention particuliere."
    )
    return _card(f'<h2 style="margin:0 0 14px;font-size:16px;color:#0F172A;">Synthese des Indicateurs</h2>' + _P(texte), "#2563EB")

def _section_reseau(d):
    r = d['reseau']
    tech_parts = []
    for t in r['par_techno']:
        up_pct = round(t['up'] / t['total'] * 100, 1) if t['total'] else 0
        tech_parts.append(
            f"La technologie <strong>{t['technologie']}</strong> comprend <strong>{t['total']} sites</strong>, "
            f"avec <strong>{t['up']} UP</strong> et <strong>{t['total'] - t['up']} DOWN</strong>, "
            f"soit un taux de disponibilite de <strong>{up_pct}%</strong>"
        )
    tech_text = ". ".join(tech_parts) + "." if tech_parts else "Aucune donnee technologique disponible."

    down_text = ""
    if r['sites_down_list']:
        down_items = ", ".join(
            f"<strong>{s['codeSite']}</strong> ({s['nom']}, {s['commune']}, {s['wilaya']})"
            for s in r['sites_down_list']
        )
        down_text = (
            f" Les <strong>{len(r['sites_down_list'])} site(s) en panne</strong> sont les suivants : {down_items}. "
            "Une intervention technique est recommandee sur ces sites afin de restaurer la couverture et "
            "de reduire l'impact sur les abonnes de ces zones."
        )

    texte = (
        f"Le reseau Djezzy s'etend sur <strong>{r['total_sites']} sites</strong>, "
        f"avec une disponibilite globale de <strong>{r['disponibilite']}%</strong>. "
        f"{tech_text}"
        f"{down_text}"
    )
    return _card(f'<h2 style="margin:0 0 14px;font-size:16px;color:#0F172A;">Etat du Reseau</h2>' + _P(texte), "#0EA5E9")

def _section_tickets(d):
    t = d['tickets']
    tc = d.get('type_client', [])
    tc_parts = []
    for c in tc:
        pct = round(c['nb'] / t['total'] * 100, 1) if t['total'] else 0
        tc_parts.append(
            f"<strong>{c['type_client'] or 'N/A'}</strong> avec <strong>{c['nb']} tickets</strong> ({pct}%)"
        )
    tc_text = ", ".join(tc_parts) + "." if tc_parts else "Aucune donnee par type de client."

    texte = (
        f"Sur la periode, <strong>{t['total']} reclamations</strong> ont ete recues, dont "
        f"<strong>{t['ouverts']} encore ouvertes</strong>, <strong>{t['resolus']} resolues</strong> "
        f"et <strong>{t['fermes']} fermees</strong>. "
        f"La repartition par type de client revele que {tc_text} "
        f"Cette analyse permet d'identifier les segments d'abonnes les plus affectes "
        f"et d'orienter les efforts d'amelioration du service."
    )
    return _card(f'<h2 style="margin:0 0 14px;font-size:16px;color:#0F172A;">Analyse des Reclamations</h2>' + _P(texte), "#E8401A")

def _section_priorites(d):
    p = d['priorites']
    total = sum(p.values()) or 1
    parts = []
    for label, nb in [("critique", p['critique']), ("haute", p['haute']), ("normale", p['normale']), ("basse", p['basse'])]:
        pct = round(nb / total * 100, 1)
        parts.append(f"<strong>{nb} de priorite {label}</strong> ({pct}%)")
    data_text = ", ".join(parts) + "."

    texte = (
        f"La repartition des reclamations par niveau de priorite indique que {data_text} "
        f"Les tickets de priorite critique et haute representent ensemble "
        f"<strong>{round((p['critique'] + p['haute']) / total * 100, 1)}%</strong> du volume total, "
        f"ce qui souligne l'importance de maintenir un temps de reponse rapide pour les incidents "
        f"les plus urgents. Il est recommande de renforcer les procedures d'escalade "
        f"pour les tickets critiques afin de minimiser les delais de resolution."
    )
    return _card(f'<h2 style="margin:0 0 14px;font-size:16px;color:#0F172A;">Repartition par Priorite</h2>' + _P(texte), "#F59E0B")

def _section_resolution(d):
    t = d['tickets']
    top_sites = d['top_sites']
    sites_text = ""
    if top_sites:
        items = ", ".join(
            f"<strong>{s['site__codeSite']}</strong> ({s['site__nom']}, {s['site__wilaya']}) avec {s['nb']} tickets"
            for s in top_sites
        )
        sites_text = (
            f" Les sites les plus impactes sont : {items}. "
            "Ces sites merentent une analyse approfondie pour identifier les causes profondes "
            "des incidents recurrants."
        )

    texte = (
        f"Le taux de resolution global est de <strong>{t['taux_resolution']}%</strong> avec un delai moyen "
        f"de traitement de <strong>{t['delai_moyen']}</strong>. "
        f"{sites_text}"
        "L'amelioration du delai de resolution passe par une meilleure allocation des ressources "
        "techniques et un suivi plus rigoureux des tickets en cours de traitement."
    )
    return _card(f'<h2 style="margin:0 0 14px;font-size:16px;color:#0F172A;">Resolution et Sites Impactes</h2>' + _P(texte), "#15803D")

def _section_performance_equipe(d):
    ing = d.get('ingenieurs', [])
    if not ing:
        return ''
    parts = []
    for i in ing:
        parts.append(
            f"<strong>{i['nom']} ({i['code']})</strong> a traite <strong>{i['total']} tickets</strong>, "
            f"en a resolu <strong>{i['resolus']}</strong>, avec <strong>{i['ouverts']} ouverts</strong> "
            f"et <strong>{i['critiques']} critiques</strong>. Son taux de resolution est de <strong>{i['taux']}%</strong>"
        )
    eng_text = ". ".join(parts) + "."

    texte = (
        f"L'analyse de la performance des ingenieurs reseau revele les resultats suivants. {eng_text} "
        "Les ingenieurs avec un taux de resolution inferieur a 80% devraient beneficier d'un accompagnement "
        "supplementaire, tandis que les meilleurs performeurs peuvent servir de referents pour les bonnes pratiques. "
        "Il est important de surveiller la charge de travail de chaque ingenieur pour eviter les risques de surcharge."
    )
    return _card(f'<h2 style="margin:0 0 14px;font-size:16px;color:#0F172A;">Performance des Ingenieurs</h2>' + _P(texte), "#7C3AED")

def _section_geographie(d):
    w = d.get('top_wilayas', [])
    if not w:
        return ''
    parts = [f"<strong>{x['wilaya']}</strong> ({x['nb']} tickets)" for x in w]
    geo_text = ", ".join(parts) + "."

    texte = (
        f"L'analyse geographique des reclamations identifie les zones les plus affectees. "
        f"Les cinq wilayas concentrent le plus grand volume de tickets : {geo_text} "
        "Cette concentration peut etre liee a plusieurs facteurs : densite de population, etat "
        "des infrastructures reseau, conditions climatiques ou evenements locaux specifiques. "
        "Une etude geographique detaillee permettrait d'identifier les causes profondes "
        "et de cibler les interventions techniques de maniere plus efficace."
    )
    return _card(f'<h2 style="margin:0 0 14px;font-size:16px;color:#0F172A;">Repartition Geographique</h2>' + _P(texte), "#0EA5E9")

def _section_evolution(d):
    evo = d.get('evolution', [])
    if not evo:
        return ''
    total_evo = sum(x['nb'] for x in evo)
    max_j = max(evo, key=lambda x: x['nb'])
    min_j = min(evo, key=lambda x: x['nb'])
    moy = round(total_evo / len(evo), 1) if evo else 0

    texte = (
        f"Sur les <strong>{len(evo)} derniers jours</strong> analyses, un total de "
        f"<strong>{total_evo} reclamations</strong> ont ete enregistrees, soit une moyenne "
        f"de <strong>{moy} tickets par jour</strong>. "
        f"Le pic d'activite a ete observe le <strong>{max_j['jour']}</strong> avec "
        f"<strong>{max_j['nb']} tickets</strong>, tandis que le jour le plus calme a ete "
        f"le <strong>{min_j['jour']}</strong> avec <strong>{min_j['nb']} tickets</strong>. "
        f"Cette evolution temporelle permet de detecter les tendances et les pics d'activite "
        f"qui peuvent etre lies a des evenements specifiques ou a des problemes reseau ponctuels."
    )
    return _card(f'<h2 style="margin:0 0 14px;font-size:16px;color:#0F172A;">Evolution Temporelle</h2>' + _P(texte), "#E8401A")

def _section_mots_cles(d):
    kw = d.get('top_keywords', [])
    if not kw:
        return ''
    items = ", ".join(f"<strong>{k['mots_cles_ia']}</strong> ({k['nb']})" for k in kw)

    texte = (
        f"L'analyse des mots-cles les plus frequents dans les reclamations revele les themes "
        f"dominants : {items}. "
        f"Ces mots-cles constituent un indicateur précieux des problemes rencontres par les abonnes "
        f"et permettent de cibler les axes d'amelioration les plus pertinents. "
        f"Un suivi regulier de cette frequence permet d'anticiper les tendances emergentes "
        f"et d'ajuster les actions correctives en consequence."
    )
    return _card(f'<h2 style="margin:0 0 14px;font-size:16px;color:#0F172A;">Mots-cles Frequents</h2>' + _P(texte), "#64748B")

def _section_recommandations(d):
    t = d['tickets']
    r = d['reseau']
    recs = []
    if t['critiques'] > 0:
        pct_crit = round(t['critiques'] / t['total'] * 100, 1) if t['total'] else 0
        recs.append(f"<li><strong>Prioriser les tickets critiques :</strong> {t['critiques']} tickets critiques representent {pct_crit}% du total. Une procedure d'escalade automatique devrait etre envisagee pour les incidents de priorite critique.</li>")
    if r['sites_down'] > 0:
        recs.append(f"<li><strong>Intervention urgente sur les sites DOWN :</strong> {r['sites_down']} site(s) sont en panne. Une equipe technique devrait etre deployee en priorite pour restaurer la couverture.</li>")
    if t['ouverts'] > 0:
        pct_ouverts = round(t['ouverts'] / t['total'] * 100, 1) if t['total'] else 0
        recs.append(f"<li><strong>Reduire les tickets ouverts :</strong> {t['ouverts']} tickets restent ouverts ({pct_ouverts}%). Renforcer l'equipe de resolution ou ameliorer les procedures de traitement.</li>")
    taux = t['taux_resolution']
    if taux < 80:
        recs.append(f"<li><strong>Ameliorer le taux de resolution :</strong> Le taux actuel de {taux}% est en dessous de l'objectif de 80%. Former les agents et automatiser certaines taches.</li>")
    if r['disponibilite'] < 95:
        recs.append(f"<li><strong>Renforcer la disponibilite reseau :</strong> {r['disponibilite']}% de disponibilite est insuffisant. Investir dans les equipements de secours (batterie, generateur).</li>")
    recs.append("<li><strong>Mettre en place un tableau de bord en temps reel :</strong> Surveiller les KPI en continu pour detecter les anomalies plus tot.</li>")
    recs.append("<li><strong>Analyser les tendances mensuelles :</strong> Comparer chaque mois precedent pour identifier les ameliorations ou degradations.</li>")

    items = ''.join(recs)
    return _card(
        f'<h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;">Recommandations</h2>'
        f'<ol style="margin:0;padding-left:20px;font-size:13px;color:#334155;line-height:1.8;">{items}</ol>',
        "#15803D"
    )


# ── Main generation function ───────────────────────────────

def generer_rapport_ia(prompt_utilisateur, date_debut=None, date_fin=None):
    """
    Generates a professional HTML report from real database data.
    Analyzes the user prompt to include relevant sections.
    Uses Mistral API (cloud). Falls back to local generation
    if Mistral is unavailable.
    """
    donnees = _collecter_donnees(date_debut, date_fin)

    # Try Mistral first
    if MISTRAL_API_KEY:
        try:
            from openai import OpenAI

            client = OpenAI(
                api_key=MISTRAL_API_KEY,
                base_url='https://api.mistral.ai/v1',
            )

            # Summarize data for Mistral to keep prompt small and fast
            resume = (
                f"Periode: {donnees['periode']['debut']} - {donnees['periode']['fin']}\n"
                f"Reseau: {donnees['reseau']['total_sites']} sites, "
                f"{donnees['reseau']['sites_up']} UP, {donnees['reseau']['sites_down']} DOWN, "
                f"Disponibilite: {donnees['reseau']['disponibilite']}%\n"
                f"Tickets: {donnees['tickets']['total']} total, "
                f"{donnees['tickets']['ouverts']} ouverts, {donnees['tickets']['resolus']} resolus, "
                f"{donnees['tickets']['fermes']} fermes, {donnees['tickets']['critiques']} critiques, "
                f"Taux resolution: {donnees['tickets']['taux_resolution']}%, Delai moyen: {donnees['tickets']['delai_moyen']}\n"
                f"Priorites: {donnees['priorites']}\n"
                f"Top wilayas: {', '.join(w['wilaya'] + '(' + str(w['nb']) + ')' for w in donnees['top_wilayas'][:5])}\n"
                f"Ingenieurs: {', '.join(i['nom'] + ':' + str(i['total']) + ' tickets/' + str(i['resolus']) + ' resolus' for i in donnees['ingenieurs'])}\n"
                f"Top mots-cles: {', '.join(k['mots_cles_ia'] + '(' + str(k['nb']) + ')' for k in donnees['top_keywords'][:7])}\n"
            )

            # Detect if this is a "vue globale" request
            is_vglobale = any(w in prompt_utilisateur.lower() for w in [
                'vue globale', 'vue d\'ensemble', 'bilan complet', 'etat general',
                'synthese globale', 'diagnostic complet', 'vue strategic',
            ])

            if is_vglobale:
                prompt = f"""Tu es le directeur reseau de Djezzy, operateur mobile en Algerie.
Tu t'adresses a la direction generale pour un bilan strategique.

DONNEES BRUTES DE LA PERIODE:
{resume}

ANALYSE ET REDIGE UN RAPPORT STRATEGIQUE:

1. SYNTHESE EXECUTIVE (3-4 phrases): Quel est le verdict global? Le reseau va-t-il bien ou
   des problemes urgents existent-ils? Sois direct et cite les chiffres cles.

2. SANTE DU RESEAU: Diagnostic technique approfondi. Disponibilite reelle vs objectif.
   Quels types de sites (4G/5G) sont le plus affectes? Y a-t-il des correlations entre
   les sites DOWN et les zones geographiques?

3. ANALYSE DES RECLAMATIONS: Que disent les tickets sur la qualite de service?
   Les clients se plaignent de quoi specifiquement? Les mots-cles revelent-ils un
   probleme systemique ou des incidents isoles?

4. PERFORMANCE DES EQUIPES: Qui performe bien? Qui a besoin d'accompagnement?
   Le delai de resolution est-il acceptable? Y a-t des goulets d'echangement?

5. ZONES CRITIQUES: Quelles wilayas/nodes necessitent une intervention prioritaire?
   Pourquoi ces zones sont-elles plus affectees?

6. TENDANCES: Les choses s'ameliorent ou se degradent sur la periode?
   Quels signaux faibles doit-on surveiller?

7. PLAN D'ACTION: 5 actions concretes avec priorite (haute/moyenne/basse) et
   responsable suggere. Chaque action doit etre specifique et mesurable.

8. ALERTES: Points necessitant une attention IMMEDIATE (dans les 24-48h).

INSTRUCTIONS CRITIQUES:
- Base TOUT sur les donnees, jamais de Generalites vides
- Cite des chiffres, des noms, des lieux SPECIFIQUES
- Identifie les CAUSES PROBABLES, pas seulement les symptomes
- Chaque constat doit avoir un "pourquoi" et un "quoi faire"
- HTML inline CSS, sans balises html/head/body
- UNIQUEMENT du texte descriptif, des paragraphes analytiques et des listes
- INTERDICTION COMPLETE: pas de tableaux, pas de graphiques, pas de barres,
  pas de SVG, pas de canvas, pas de diagrammes, pas d'element visuel
- Utilise des <p>, <h2>, <h3>, <strong>, <em>, <ol>, <ul>, <li>
- Chaque section doit faire au minimum 3-4 paragraphes de developpement
- 2-3 pages A4 maximum"""
            else:
                prompt = f"""Tu es un expert analyste reseau senior chez Djezzy, operateur mobile
en Algerie. Tu analyises les donnees du reseau et tu dois produire un rapport
qui REFLECHIT, pas simplement qui affiche des chiffres.

DONNEES BRUTES DE LA PERIODE:
{resume}

DEMANDE DE L'UTILISATEUR:
{prompt_utilisateur}

INSTRUCTIONS CRITIQUES - Tu dois REMPLIR CHACUN de ces points:

1. DIAGNOSTIC: Qu'est-ce que ces donnees disent VRAIMENT sur l'etat du reseau?
   Ne te contente pas de repeter les chiffres. EXPLIQUE-LES.

2. ANOMALIES: Y a-t-il des chiffres suspects? Un taux de resolution anormalement
   bas? Une wilaya qui explose? Des tickets qui s'accumulent sans resolution?
   IDENTIFIE LES ECARTS.

3. CORRELATIONS: Relie les donnees entre elles. Ex: "La baisse du taux de
   resolution coincide avec l'augmentation des tickets sur Oran, ce qui
   suggere un probleme de capacity sur cette zone."

4. CAUSES PROBABLES: Pourquoi ces choses se produisent-elles?
   Propose 2-3 hypotheses basees sur les donnees.

5. ACTIONS CONCRETES: Pas de "ameliorer la qualite". Plutot: "Assigner 2
   ingenieurs supplementaires sur la wilaya X cette semaine" ou
   "Escalader le ticket Y vers le management".

FORMAT:
- HTML inline CSS, sans balises html/head/body
- Commence par un RENSEIGNEMENT (2-3 phrases: verdict + chiffre cle)
- Organise en sections logiques de ton CHOIX (pas imposees)
- UNIQUEMENT du texte descriptif, des paragraphes analytiques et des listes
- INTERDICTION COMPLETE: pas de tableaux, pas de graphiques, pas de barres,
  pas de SVG, pas de canvas, pas de diagrammes, pas d'element visuel
- Utilise des <p>, <h2>, <h3>, <strong>, <em>, <ol>, <ul>, <li>
- Chaque section doit faire au minimum 3-4 paragraphes de developpement
- Termine par "Vision de l'expert": ton analyse globale personnelle
- Sois SPECIFIQUE: cite les wilayas, les ingenieurs, les chiffres exacts
- 2 a 3 pages A4 maximum"""

            response = client.chat.completions.create(
                model=MISTRAL_MODEL,
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.7,
                max_tokens=2048,
            )
            html = response.choices[0].message.content.strip()
            if html.startswith('```html'):
                html = html[7:]
            if html.endswith('```'):
                html = html[:-3]
            return html.strip()

        except Exception as e:
            logger.warning("Mistral indisponible pour rapport, generation locale: %s", e)

    # Local generation: analyze prompt and build report from real data
    sections = _detecter_sections(prompt_utilisateur)
    periode = donnees['periode']

    header = (
        f'<div style="background:linear-gradient(135deg,#E8401A 0%,#B91C1C 100%);color:#fff;'
        f'padding:28px 32px;border-radius:10px;margin-bottom:22px;">'
        f'<div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.8;margin-bottom:6px;">Djezzy Supervision — Rapport Genere par IA</div>'
        f'<h1 style="margin:0;font-size:22px;font-weight:700;">{prompt_utilisateur[:120]}</h1>'
        f'<div style="margin-top:10px;font-size:12px;opacity:0.85;">'
        f'Periode : <strong>{periode["debut"]}</strong> — <strong>{periode["fin"]}</strong>'
        f'&nbsp;&nbsp;|&nbsp;&nbsp;Genere le : <strong>{timezone.now().strftime("%d/%m/%Y a %H:%M")}</strong>'
        f'</div></div>'
    )

    section_map = {
        'kpi': _section_kpi,
        'reseau': _section_reseau,
        'tickets': _section_tickets,
        'priorites': _section_priorites,
        'resolution': _section_resolution,
        'performance_equipe': _section_performance_equipe,
        'geographie': _section_geographie,
        'evolution': _section_evolution,
        'mots_cles': _section_mots_cles,
        'recommandations': _section_recommandations,
    }

    body = ''
    for s in sections:
        if s in section_map:
            html_section = section_map[s](donnees)
            if html_section:
                body += html_section

    footer = (
        f'<div style="text-align:center;padding:18px;font-size:10px;color:#94A3B8;'
        f'border-top:1px solid #E5E7EB;margin-top:20px;">'
        f'Rapport genere automatiquement par le systeme Djezzy Supervision — '
        f'{timezone.now().strftime("%d/%m/%Y %H:%M")}</div>'
    )

    return header + body + footer


def generer_rapport_local(prompt_utilisateur, date_debut=None, date_fin=None):
    """
    Local template-based report generation — no Ollama needed.
    Used by the seed command for fast bulk generation.
    """
    donnees = _collecter_donnees(date_debut, date_fin)
    sections = _detecter_sections(prompt_utilisateur)
    periode = donnees['periode']

    header = (
        f'<div style="background:linear-gradient(135deg,#E8401A 0%,#B91C1C 100%);color:#fff;'
        f'padding:28px 32px;border-radius:10px;margin-bottom:22px;">'
        f'<div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.8;margin-bottom:6px;">Djezzy Supervision — Rapport Genere par IA</div>'
        f'<h1 style="margin:0;font-size:22px;font-weight:700;">{prompt_utilisateur[:120]}</h1>'
        f'<div style="margin-top:10px;font-size:12px;opacity:0.85;">'
        f'Periode : <strong>{periode["debut"]}</strong> — <strong>{periode["fin"]}</strong>'
        f'&nbsp;&nbsp;|&nbsp;&nbsp;Genere le : <strong>{timezone.now().strftime("%d/%m/%Y a %H:%M")}</strong>'
        f'</div></div>'
    )

    section_map = {
        'kpi': _section_kpi,
        'reseau': _section_reseau,
        'tickets': _section_tickets,
        'priorites': _section_priorites,
        'resolution': _section_resolution,
        'performance_equipe': _section_performance_equipe,
        'geographie': _section_geographie,
        'evolution': _section_evolution,
        'mots_cles': _section_mots_cles,
        'recommandations': _section_recommandations,
    }

    body = ''
    for s in sections:
        if s in section_map:
            html_section = section_map[s](donnees)
            if html_section:
                body += html_section

    footer = (
        f'<div style="text-align:center;padding:18px;font-size:10px;color:#94A3B8;'
        f'border-top:1px solid #E5E7EB;margin-top:20px;">'
        f'Rapport genere automatiquement par le systeme Djezzy Supervision — '
        f'{timezone.now().strftime("%d/%m/%Y %H:%M")}</div>'
    )

    return header + body + footer
