# reclamations/services.py
# ─────────────────────────────────────────────────────────────
# AI service for automatic incident description generation.
# Uses Mistral API (cloud) to transform quick agent notes
# (keywords taken during a phone call) into a structured
# incident report for the network engineering team.
#
# Falls back to local rule-based generation when Mistral
# is unavailable (API error, network issue).
# ─────────────────────────────────────────────────────────────
import logging
from decouple import config

logger = logging.getLogger(__name__)

MISTRAL_API_KEY = config('MISTRAL_API_KEY', default='')
MISTRAL_MODEL = config('MISTRAL_MODEL', default='mistral-small-latest')

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

_TEMPLATES = {
    'signal': {
        'title': 'Perte ou dégradation de signal',
        'desc': 'Le client signale des problèmes de signal : {keywords}. '
                'La couverture réseau dans sa zone semble dégradée.',
        'impact': 'Communication mobile perturbée, appels et data indisponibles ou instables.',
    },
    'connexion': {
        'title': 'Connexion instable / déconnexions répétées',
        'desc': 'Le client rapporte des déconnexions fréquentes : {keywords}. '
                'La connexion réseau est instable sur son équipement.',
        'impact': 'Navigation internet interrompue, applications mobiles inutilisables.',
    },
    'debit': {
        'title': 'Débit insuffisant / lenteur réseau',
        'desc': 'Le client constate un débit très faible : {keywords}. '
                'Les performances réseau sont dégradées dans sa zone.',
        'impact': 'Navigation difficile, streaming impossible, uploads/downloads très lents.',
    },
    'panne': {
        'title': 'Panne réseau ou équipement',
        'desc': 'Le client rapporte une panne : {keywords}. '
                'Le service semble totalement ou partiellement indisponible.',
        'impact': 'Aucun service disponible — urgence opérationnelle.',
    },
    'appel': {
        'title': 'Problème d\'appels vocaux',
        'desc': 'Le client rencontre des difficultés avec les appels : {keywords}. '
                'La qualité vocale ou la connectivité appel est dégradée.',
        'impact': 'Appels échoués ou de mauvaise qualité, communication vocale perturbée.',
    },
    'sms': {
        'title': 'Problème d\'envoi/réception SMS',
        'desc': 'Le client signale un dysfonctionnement SMS : {keywords}. '
                'L\'envoi ou la réception de messages est perturbé.',
        'impact': 'Messages non transmis ou non reçus, communication textuelle indisponible.',
    },
    'internet': {
        'title': 'Connexion internet mobile dégradée',
        'desc': 'Le client constate des problèmes de connexion data : {keywords}. '
                'La connectivité internet mobile est dégradée.',
        'impact': 'Navigation et applications mobiles ralenties ou inutilisables.',
    },
    'batterie': {
        'title': 'Autonomie batterie réduite',
        'desc': 'Le client signale une consommation excessive de batterie : {keywords}. '
                'L\'autonomie de l\'appareil est anormalement réduite.',
        'impact': 'Appareil épuisé rapidement, inutilisable sur la durée.',
    },
    'facturation': {
        'title': 'Réclamation de facturation',
        'desc': 'Le client conteste un élément de facturation : {keywords}. '
                'Une vérification du forfait et des prélèvements est nécessaire.',
        'impact': 'Mécontentement client, besoin de vérification comptable.',
    },
    'installation': {
        'title': 'Problème d\'installation ou raccordement',
        'desc': 'Le client rencontre un souci lors de l\'installation : {keywords}. '
                'Le raccordement ou la mise en service n\'a pas été effectué correctement.',
        'impact': 'Service non disponible malgré la souscription.',
    },
}

_URGENCY_TEXT = {
    'critique': 'CRITIQUE — Panne majeure nécessitant une intervention immédiate.',
    'haute': 'HAUTE — Problème significatif impactant l\'expérience client.',
    'normale': 'NORMALE — Problème gérable dans les délais standards.',
}


def _detect_categories(mots_cles: str) -> list:
    text = mots_cles.lower()
    found = []
    for cat, patterns in _CATEGORY_KEYWORDS.items():
        for kw in patterns:
            if kw in text:
                found.append(cat)
                break
    return found or ['signal']


def _detect_urgency(mots_cles: str) -> str:
    text = mots_cles.lower()
    for level in ['critique', 'haute']:
        for kw in _URGENCY_KEYWORDS[level]:
            if kw in text:
                return level
    return 'normale'


def _generer_description_locale(nom_client: str, telephone_client: str, mots_cles: str) -> str:
    categories = _detect_categories(mots_cles)
    urgency = _detect_urgency(mots_cles)
    keywords_list = [k.strip() for k in mots_cles.split(',') if k.strip()]

    lines = [
        f'Description du problème — {nom_client} ({telephone_client})',
        '',
        '1. Description du problème',
    ]

    for cat in categories:
        t = _TEMPLATES.get(cat, _TEMPLATES['signal'])
        desc = t['desc'].format(keywords=mots_cles)
        lines.append(f'   • {desc}')

    lines.append('')
    lines.append('2. Impacts')
    for cat in categories:
        t = _TEMPLATES.get(cat, _TEMPLATES['signal'])
        lines.append(f'   • {t["impact"]}')

    lines.append('')
    lines.append('3. Mots-clés signalés')
    for kw in keywords_list:
        lines.append(f'   — {kw}')

    lines.append('')
    lines.append(f'4. Urgence perçue : {_URGENCY_TEXT.get(urgency, _URGENCY_TEXT["normale"])}')

    lines.append('')
    lines.append('5. Transmission')
    lines.append('   Ce ticket est transmis à l\'équipe réseau pour analyse et prise en charge.')

    return '\n'.join(lines)


def generer_description_incident_ia(nom_client, telephone_client, mots_cles):
    """
    Transforms quick call center notes into a structured incident report.
    Uses Mistral API (cloud) to generate professional descriptions.
    Falls back to rule-based templates if Mistral is unavailable.
    """
    if MISTRAL_API_KEY:
        try:
            from openai import OpenAI

            client = OpenAI(
                api_key=MISTRAL_API_KEY,
                base_url='https://api.mistral.ai/v1',
            )

            prompt = f"""Tu es un assistant IA spécialisé dans la gestion du réseau mobile et internet pour l'opérateur Djezzy en Algérie.
Transforme les notes rapides d'un agent du Call Center en un rapport d'incident clair, professionnel et structuré.

Informations :
- Nom du Client : {nom_client}
- Téléphone du Client : {telephone_client}
- Notes de l'agent (Mots-clés) : {mots_cles}

Consignes :
- Rédige en français, de manière professionnelle et concise.
- Structure le texte en sections : Description du problème, Impacts, Mots-clés signalés, Urgence perçue, Transmission.
- N'invente pas d'informations techniques qui ne sont pas suggérées dans les mots-clés.
- Sois concis (200-300 mots max)."""

            response = client.chat.completions.create(
                model=MISTRAL_MODEL,
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.3,
                max_tokens=512,
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.warning("Mistral indisponible pour description, fallback local: %s", e)

    return _generer_description_locale(nom_client, telephone_client, mots_cles)
