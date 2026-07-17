# reclamations/services.py
# ─────────────────────────────────────────────────────────────
# AI service for automatic incident description generation
# and reclamation grouping logic. Handles:
# 1. Finding or creating GroupeTickets based on keyword similarity
# 2. Generating ticket titles and descriptions via Mistral
# 3. Updating descriptions when new reclamations broaden the scope
# Falls back to local rule-based generation when Mistral is unavailable.
# ─────────────────────────────────────────────────────────────
import logging
from datetime import timedelta
from decouple import config
from django.utils import timezone

logger = logging.getLogger(__name__)

MISTRAL_API_KEY = config('MISTRAL_API_KEY', default='')
MISTRAL_MODEL = config('MISTRAL_MODEL', default='mistral-small-latest')

SIMILARITY_THRESHOLD = 0.80
SIMILARITY_HIGH = 0.90
GROUP_WINDOW_DAYS = 7

# ── Keyword → category mapping ──────────────────────────────
_CATEGORY_KEYWORDS = {
    'signal': [
        'perte signal', 'signal faible', 'signal varie', 'zone morte',
        'pas de signal', 'aucun reseau', 'couverture', 'antenne',
    ],
    'connexion': [
        'connexion intermitente', 'deconnexion', 'deconnecte',
        'connexion instable', 'connexion perdue',
    ],
    'debit': [
        'debit lent', 'debit faible', 'lenteur', 'latence',
        'navigation lente', 'videos bloquent', 'uploads impossible',
        'debit montant', 'surcharge', 'depassement quota', 'forfait epuise',
    ],
    'panne': [
        'panne totale', 'panne internet', 'panne site', 'panne equipement',
        'coupure', 'pas de service', 'antenne tombee',
    ],
    'appel': [
        'appel echoue', 'appel rate', 'qualite appel', 'gresillement',
        'appel coupe', 'voix', 'reseau indisponible', 'appel',
    ],
    'sms': [
        'sms', 'message', 'envoi echoue', 'reception sms',
    ],
    'internet': [
        'internet', '3g', '4g', '4g+', '5g', 'hspa', 'edge',
        'data', 'mobile data', 'connexion internet',
    ],
    'batterie': [
        'batterie', 'autonomie', 'consommation', 'chauffe',
    ],
    'facturation': [
        'facture', 'facturation', 'prelevement', 'debit',
        'credit', 'forfait',
    ],
    'installation': [
        'installation', 'raccordement', 'routeur', 'livebox',
        'decouverte', 'mise en service',
    ],
}

_URGENCY_KEYWORDS = {
    'critique': [
        'panne totale', 'plus de service', 'aucun reseau', 'panne site',
        'urgence', 'critique', 'panne internet',
    ],
    'haute': [
        'coupure frequente', 'pas de signal', 'panne', 'instable',
        'deconnexion repetee', 'appel echoue',
    ],
}


# ── Similarity calculation ──────────────────────────────────

def _parse_keywords(mots_cles_str):
    if not mots_cles_str:
        return set()
    return {kw.strip().lower() for kw in mots_cles_str.split(',') if kw.strip()}


def jaccard_similarity(set_a, set_b):
    if not set_a and not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    if not union:
        return 0.0
    return len(intersection) / len(union)


# ── Grouping logic ──────────────────────────────────────────

def trouver_ou_creer_groupe(reclamation):
    from .models import GroupeTicket

    if not reclamation.site or not reclamation.mots_cles_ia:
        _creer_nouveau_groupe(reclamation)
        return

    mots_reclamation = _parse_keywords(reclamation.mots_cles_ia)
    cutoff = timezone.now() - timedelta(days=GROUP_WINDOW_DAYS)

    candidats = GroupeTicket.objects.filter(
        site=reclamation.site,
        statut__in=['ouvert', 'en_cours'],
        created_at__gte=cutoff,
        is_archived=False,
    )

    best_match = None
    best_similarity = 0.0

    for candidat in candidats:
        mots_candidat = _parse_keywords(candidat.mots_cles)
        sim = jaccard_similarity(mots_candidat, mots_reclamation)
        if sim >= SIMILARITY_THRESHOLD and sim > best_similarity:
            best_match = candidat
            best_similarity = sim

    if best_match:
        _ajouter_au_groupe(reclamation, best_match, best_similarity)
    else:
        _creer_nouveau_groupe(reclamation)


def _ajouter_au_groupe(reclamation, groupe, similarity):
    reclamation.groupe = groupe
    reclamation.save()

    groupe.nombre_reclamations = groupe.reclamations.count()
    groupe.recalculer_priorite()

    all_keywords = set()
    for r in groupe.reclamations.all():
        all_keywords.update(_parse_keywords(r.mots_cles_ia))
    groupe.mots_cles = ', '.join(sorted(all_keywords))

    if similarity < SIMILARITY_HIGH:
        groupe.description = _mettre_a_jour_description_ticket(
            groupe.description, reclamation.mots_cles_ia, groupe.mots_cles
        )

    groupe.save()


def _creer_nouveau_groupe(reclamation):
    from .models import GroupeTicket

    titre = generer_titre_ticket(reclamation.mots_cles_ia, reclamation.site)
    description = generer_description_ticket(reclamation.mots_cles_ia, reclamation.site)

    groupe = GroupeTicket.objects.create(
        site=reclamation.site,
        titre=titre,
        description=description,
        mots_cles=reclamation.mots_cles_ia or '',
        priorite=reclamation.priorite,
        statut='ouvert',
        cree_par=reclamation.cree_par,
        nombre_reclamations=1,
        premier_signalement=reclamation.created_at,
    )

    reclamation.groupe = groupe
    reclamation.save()


# ── Mistral AI functions ────────────────────────────────────

def _get_mistral_client():
    if not MISTRAL_API_KEY:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=MISTRAL_API_KEY, base_url='https://api.mistral.ai/v1')
    except Exception as e:
        logger.warning("Impossible de créer le client Mistral: %s", e)
        return None


def _call_mistral(prompt, max_tokens=512, temperature=0.3):
    client = _get_mistral_client()
    if not client:
        return None
    try:
        response = client.chat.completions.create(
            model=MISTRAL_MODEL,
            messages=[{'role': 'user', 'content': prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning("Mistral API erreur: %s", e)
        return None


def generer_titre_ticket(mots_cles, site=None):
    site_info = ""
    if site:
        site_info = f"au site {site.nom} ({site.codeSite}, {site.wilaya})"

    prompt = f"""Tu es un assistant IA spécialisé dans la gestion du réseau mobile Djezzy en Algérie.
Génère un TITRE COURT (5-8 mots max) pour un ticket d'incident basé sur ces mots-clés: {mots_cles}
{f'Le problème concerne le site {site.nom} ({site.codeSite}).' if site else ''}

Exemples de bons titres: "Perte de signal 4G", "Panne réseau Bab Ezzouar", "Débit faible zone centre"
Réponds UNIQUEMENT avec le titre, sans guillemets ni ponctuation supplémentaire."""

    result = _call_mistral(prompt, max_tokens=50, temperature=0.2)
    if result:
        return result.strip().strip('"').strip("'")[:255]

    categories = _detect_categories(mots_cles)
    cat_label = categories[0] if categories else 'incident'
    site_nom = site.nom if site else ''
    return f"Problème {cat_label}{' — ' + site_nom if site_nom else ''}"[:255]


def generer_description_ticket(mots_cles, site=None):
    site_info = ""
    if site:
        site_info = f"Site: {site.nom} ({site.codeSite}) — Wilaya: {site.wilaya} — Commune: {site.commune}\n"

    prompt = f"""Tu es un assistant IA spécialisé dans la gestion du réseau mobile Djezzy en Algérie.
Génère une description structurée et professionnelle pour un ticket d'incident.

{site_info}Mots-clés signalés: {mots_cles}

Structure la réponse en sections:
1. Description du problème
2. Impacts constatés
3. Mots-clés signalés
4. Urgence perçue

Sois concis (200-300 mots max), professionnel, en français."""

    result = _call_mistral(prompt, max_tokens=512)
    if result:
        return result

    return _generer_description_locale(mots_cles, site)


def _mettre_a_jour_description_ticket(description_existante, nouveaux_mots_cles, tous_mots_cles):
    prompt = f"""Tu es un assistant IA spécialisé dans la gestion du réseau mobile Djezzy en Algérie.
La description existante d'un ticket d'incident doit être mise à jour car de nouvelles réclamations
ont été ajoutées avec des mots-clés légèrement différents.

Description actuelle:
{description_existante}

Nouveaux mots-clés signalés: {nouveaux_mots_cles}
Tous les mots-clés du ticket: {tous_mots_cles}

Mets à jour la description pour refléter la situation élargie. Garde la même structure.
Sois concis (200-300 mots max), professionnel, en français."""

    result = _call_mistral(prompt, max_tokens=512)
    if result:
        return result

    return description_existante


# ── Local fallback functions ────────────────────────────────

def _detect_categories(mots_cles):
    text = (mots_cles or '').lower()
    found = []
    for cat, patterns in _CATEGORY_KEYWORDS.items():
        for kw in patterns:
            if kw in text:
                found.append(cat)
                break
    return found or ['signal']


def _detect_urgency(mots_cles):
    text = (mots_cles or '').lower()
    for level in ['critique', 'haute']:
        for kw in _URGENCY_KEYWORDS[level]:
            if kw in text:
                return level
    return 'normale'


def _generer_description_locale(mots_cles, site=None):
    categories = _detect_categories(mots_cles)
    urgency = _detect_urgency(mots_cles)
    keywords_list = [k.strip() for k in (mots_cles or '').split(',') if k.strip()]

    lines = []
    if site:
        lines.append(f'Site: {site.nom} ({site.codeSite}) — {site.wilaya}')
        lines.append('')

    lines.append('1. Description du problème')
    for cat in categories:
        lines.append(f'   • Problème de type "{cat}" signalé par les clients: {mots_cles}')

    lines.append('')
    lines.append('2. Impacts')
    for cat in categories:
        lines.append(f'   • Service réseau dégradé pour les clients de cette zone ({cat}).')

    lines.append('')
    lines.append('3. Mots-clés signalés')
    for kw in keywords_list:
        lines.append(f'   — {kw}')

    urgency_text = {
        'critique': 'CRITIQUE — Intervention immédiate requise.',
        'haute': 'HAUTE — Problème significatif.',
        'normale': 'NORMALE — Gérable dans les délais standards.',
    }
    lines.append('')
    lines.append(f'4. Urgence perçue : {urgency_text.get(urgency, urgency_text["normale"])}')

    lines.append('')
    lines.append('5. Transmission')
    lines.append("   Ce ticket est transmis à l'équipe réseau pour analyse et prise en charge.")

    return '\n'.join(lines)
