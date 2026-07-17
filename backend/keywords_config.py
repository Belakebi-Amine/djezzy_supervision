# keywords_config.py
# ─────────────────────────────────────────────────────────────
# Centralized keyword scoring system for telecom incidents.
# Each keyword has a score (5-80) and a category.
# Priority is auto-calculated from the sum of selected keywords.
# ─────────────────────────────────────────────────────────────

KEYWORDS_TELECOM = {
    # ── Signal (couverture) ──
    'perte signal':        {'score': 45, 'category': 'signal', 'label': 'Perte signal'},
    'signal faible':       {'score': 20, 'category': 'signal', 'label': 'Signal faible'},
    'signal varie':        {'score': 15, 'category': 'signal', 'label': 'Signal variable'},
    'zone morte':          {'score': 55, 'category': 'signal', 'label': 'Zone morte'},
    'pas de signal':       {'score': 60, 'category': 'signal', 'label': 'Pas de signal'},
    'aucun reseau':        {'score': 75, 'category': 'signal', 'label': 'Aucun réseau'},

    # ── Connexion ──
    'connexion intermitente': {'score': 20, 'category': 'connexion', 'label': 'Connexion intermittente'},
    'deconnexion':           {'score': 20, 'category': 'connexion', 'label': 'Déconnexion'},
    'connexion instable':    {'score': 18, 'category': 'connexion', 'label': 'Connexion instable'},
    'connexion perdue':      {'score': 25, 'category': 'connexion', 'label': 'Connexion perdue'},

    # ── Débit ──
    'debit lent':          {'score': 12, 'category': 'debit', 'label': 'Débit lent'},
    'debit faible':        {'score': 12, 'category': 'debit', 'label': 'Débit faible'},
    'lenteur':             {'score': 8, 'category': 'debit', 'label': 'Lenteur'},
    'latence':             {'score': 10, 'category': 'debit', 'label': 'Latence élevée'},
    'videos bloquent':     {'score': 15, 'category': 'debit', 'label': 'Vidéos bloquent'},
    'uploads impossible':  {'score': 15, 'category': 'debit', 'label': 'Uploads impossibles'},
    'surcharge':           {'score': 20, 'category': 'debit', 'label': 'Surcharge cellule'},
    'forfait epuise':      {'score': 8, 'category': 'debit', 'label': 'Forfait épuisé'},

    # ── Panne ──
    'panne totale':        {'score': 80, 'category': 'panne', 'label': 'Panne totale'},
    'panne internet':      {'score': 70, 'category': 'panne', 'label': 'Panne internet'},
    'panne site':          {'score': 75, 'category': 'panne', 'label': 'Panne site'},
    'panne equipement':    {'score': 55, 'category': 'panne', 'label': 'Panne équipement'},
    'coupure':             {'score': 50, 'category': 'panne', 'label': 'Coupure'},
    'pas de service':      {'score': 70, 'category': 'panne', 'label': 'Pas de service'},
    'antenne tombee':      {'score': 75, 'category': 'panne', 'label': 'Antenne tombée'},

    # ── Appel ──
    'appel echoue':        {'score': 40, 'category': 'appel', 'label': 'Appel échoué'},
    'appel rate':          {'score': 25, 'category': 'appel', 'label': 'Appel raté'},
    'qualite appel':       {'score': 20, 'category': 'appel', 'label': 'Qualité appel'},
    'gresillement':        {'score': 15, 'category': 'appel', 'label': 'Grésillement'},
    'appel coupe':         {'score': 35, 'category': 'appel', 'label': 'Appel coupé'},
    'voix':                {'score': 15, 'category': 'appel', 'label': 'Problème voix'},

    # ── SMS ──
    'sms':                 {'score': 5, 'category': 'sms', 'label': 'SMS'},
    'envoi echoue':        {'score': 15, 'category': 'sms', 'label': 'Envoi échoué'},
    'reception sms':       {'score': 10, 'category': 'sms', 'label': 'Réception SMS'},

    # ── Internet / Data ──
    'internet':            {'score': 5, 'category': 'internet', 'label': 'Internet'},
    '3g':                  {'score': 5, 'category': 'internet', 'label': '3G'},
    '4g':                  {'score': 5, 'category': 'internet', 'label': '4G'},
    '5g':                  {'score': 5, 'category': 'internet', 'label': '5G'},
    'mobile data':         {'score': 5, 'category': 'internet', 'label': 'Mobile data'},

    # ── Infrastructure ──
    'batterie':            {'score': 15, 'category': 'infrastructure', 'label': 'Batterie'},
    'alimentation':        {'score': 40, 'category': 'infrastructure', 'label': 'Alimentation'},
    'cable coupe':         {'score': 45, 'category': 'infrastructure', 'label': 'Câble coupé'},
    'fibre optique':       {'score': 50, 'category': 'infrastructure', 'label': 'Fibre optique'},
    'surchauffe':          {'score': 20, 'category': 'infrastructure', 'label': 'Surchauffe'},
    'intemperies':         {'score': 30, 'category': 'infrastructure', 'label': 'Intempéries'},

    # ── Facturation / Client ──
    'facturation':         {'score': 5, 'category': 'facturation', 'label': 'Facturation'},
    'prelevement':         {'score': 10, 'category': 'facturation', 'label': 'Prélèvement'},
    'erreur facturation':  {'score': 15, 'category': 'facturation', 'label': 'Erreur facturation'},
}

# ── Priority thresholds ──
SEUILS = {
    'basse':    0,
    'normale':  30,
    'haute':    60,
    'critique': 100,
}

CATEGORY_LABELS = {
    'signal': 'Signal / Couverture',
    'connexion': 'Connexion',
    'debit': 'Débit / Performance',
    'panne': 'Panne / Incident',
    'appel': 'Appels vocaux',
    'sms': 'SMS',
    'internet': 'Internet / Data',
    'infrastructure': 'Infrastructure',
    'facturation': 'Facturation / Client',
}


def calculer_priorite(mots_cles: str) -> str:
    """Auto-calculate priority from comma-separated keywords."""
    total = 0
    for mot in mots_cles.lower().split(','):
        mot = mot.strip()
        if mot in KEYWORDS_TELECOM:
            total += KEYWORDS_TELECOM[mot]['score']
    if total >= SEUILS['critique']:
        return 'critique'
    elif total >= SEUILS['haute']:
        return 'haute'
    elif total >= SEUILS['normale']:
        return 'normale'
    return 'basse'


def calculer_score(mots_cles: str) -> int:
    """Return the total score for a set of keywords."""
    total = 0
    for mot in mots_cles.lower().split(','):
        mot = mot.strip()
        if mot in KEYWORDS_TELECOM:
            total += KEYWORDS_TELECOM[mot]['score']
    return total


def get_all_keywords():
    """Return keywords organized by category for the frontend."""
    categories = {}
    for kw, info in KEYWORDS_TELECOM.items():
        cat = info['category']
        if cat not in categories:
            categories[cat] = {
                'label': CATEGORY_LABELS.get(cat, cat),
                'keywords': [],
            }
        categories[cat]['keywords'].append({
            'key': kw,
            'label': info['label'],
            'score': info['score'],
        })
    return categories
