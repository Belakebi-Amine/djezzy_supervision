"""
seed_all_data.py
------------------------------------------------------------─
Injection complète de données réalistes :
  - 80 clients
  - 400 réclamations -> ~50 GroupeTickets (cascade top-down)
  - 12 rapports IA (5 archivés > 3 mois)
  - ~1200 entrées audit log sur 120 jours

Cascade de statuts :
  1. Toutes les réclamations sont créées "resolu"
  2. Tous les GroupeTickets sont créés "ferme" -> réclamations internes passent "ferme"
  3. ~15 groupes passent "ouvert" -> réclamations passent "ouvert"
  4. ~5 groupes passent "resolu" -> réclamations passent "resolu"
"""
import random
from datetime import timedelta
from collections import defaultdict
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from decouple import config
from reclamations.models import Reclamation, CommentaireTicket, GroupeTicket
from dashboard.models import RapportIA
from sites_reseau.models import SiteReseau
from reclamations.models import Client
from audit_log.models import ActivityLog
from keywords_config import calculer_priorite

User = get_user_model()
COMMON_PASSWORD = config('SEED_PASSWORD', default='change-me')

# -- Client names ------------------------------------------
NOMS_CLIENTS = [
    "Mohammed Benali", "Fatima Zohra", "Ahmed Khelifi", "Karim Mansouri",
    "Nadia Oulmane", "Yacine Bensalem", "Amina Derradji", "Sofiane Bouaziz",
    "Meriem Hadjadj", "Lyes Tazi", "Samira Belkacem", "Rachid Ait Ali",
    "Houria Meziane", "Djamel Boumediene", "Nassima Ouali", "Tahar Kaci",
    "Zineb Laouar", "Farid Amrani", "Sonia Bouchareb", "Nabil Kheddam",
    "Wassila Bouzid", "Hakim Seddiki", "Nawel Cheikh", "Youcef Touati",
    "Djamila Haddad", "Mourad Lounis", "Lynda Zaidi", "Slimane Belaid",
    "Ratiba Khemici", "Azzedine Rahmani", "Noura Soltani", "Samy Hocine",
    "Ghania Messaoudi", "Redouane Bella", "Nabila Slimani", "Brahim Chaouche",
    "Souad Kadri", "Lamine Hamza", "Tassadit Yala", "Abderrahmane Mokhtar",
    "Hayet Bellal", "Kamel Bourenane", "Dalila Mezouar", "Walid Harouni",
    "Hafida Chabane", "Nadjib Kheireddine", "Farida Boudjellal", "Miloud Tabti",
    "Aicha Boukhari", "Louisa Bendaoud", "Rachid Tlemcani", "Naima Bouzid",
    "Hicham Benseddik", "Leila Benmoussa", "Omar Fenniche", "Asma Belkacem",
    "Khaled Mebarki", "Sabrina Zeroual", "Mourad Idir", "Hana Belkhir",
    "Abdelkader Charef", "Wided Bouchama", "Samir Lanteri", "Malika Ghodbane",
    "Rafik Bouhdid", "Nacera Belkacem", "Krimo Benslimane", "Fadila Boudiaf",
    "Mohamed Seghir", "Latifa Bensaid", "Abdelmoumen Cherif", "Souhila Ait Ahmed",
    "Djillali Amrani", "Naima Zeribi", "Sofiane Ait Ali", "Baya Boukhari",
    "Ali Benaissa", "Fatima Bahloul", "Messaoud Bouchareb", "Zohra Makhloufi",
    "Hocine Khenfer", "Samira Benaicha", "Noureddine Boukrouba", "Aicha Ait Hammou",
]

# -- Keyword families (same structure as KEYWORD_FAMILIES) --
KEYWORD_FAMILIES = {
    "signal": [
        "perte signal, zone morte", "signal faible, appartement",
        "signal varie, instable", "zone morte, aucun reseau possible",
        "pas de signal depuis hier", "aucun reseau, telephone muet",
    ],
    "connexion": [
        "deconnexion repetee, soiree", "connexion intermitente, zone urbaine",
        "coupure frequente, instabilite reseau",
    ],
    "debit": [
        "debit lent, navigation difficile", "lenteur navigation, videos bloquent",
        "debit tres faible soir", "latence elevee, gaming impossible",
        "debit montant faible, uploads impossible", "surcharge cellule, heure pointe",
    ],
    "panne": [
        "panne totale, plus de service", "panne internet, urgence",
        "panne site cellulaire, antenne tombee", "panne equipement bts, alimentation",
    ],
    "coupure": [
        "coupure jour, pas de service", "coupure frequente matin et soir",
        "coupure electrique, pas de backup", "coupure 5g, retrogradation 4g",
    ],
    "appel": [
        "reseau indisponible, appel echoue", "mauvaise qualite appel, gresillement",
        "appels coupent sans raison", "taux rejet appels eleve",
    ],
    "infrastructure": [
        "cable coupe, intemperies", "fibre optique coupe, chantier",
        "defaut alimentation site, batterie", "temperature elevee equipement, surchauffe",
        "humidite intrusion armoire, corrosion", "vent fort, antenne destabilisee",
        "pluie intense, deterioration cablage",
    ],
    "config": [
        "reseau 3g perdu, que 2g", "probleme 4g, que edge",
        "mise a jour logiciel echouee", "erreur config site, parametre incorrect",
        "conflit adresse ip, reseau local", "interference frequences, bruit radio",
        "handechec, bascule reseau echoue",
    ],
    "facturation": [
        "depassement quota data, forfait epuise", "fraude detection, ligne compromise",
        "client insatisfait, retard traitement", "demande remboursement, facturation erreur",
        "changement forfait, delai traitement", "activation ligne, delai anormal",
        "portabilite numero, echec transfert",
    ],
}

DESCRIPTIONS = [
    "Le client {nom} ({tel}) signale des pertes de signal repetees dans la zone de {commune}, wilaya de {wilaya}. Les problemes sont survenus il y a {jours} jours. Le client utilise un forfait {type_forfait}. Le site {site_code} ({techno}) dessert cette zone.",
    "Coupure frequente du service signalee par {nom} ({tel}). Les deconnexions surviennent en soiree entre 18h et 22h. Le client reside a {commune}, {wilaya}. Le site {site_code} ({techno}) montre des signaux de surcharge.",
    "Debit internet extremement lent depuis {jours} jours selon {nom} ({tel}). Le client ne peut plus naviguer. La zone concernee est {commune}, {wilaya}. Le site {site_code} montre un debit inferieur a 1 Mbps.",
    "Panne totale du service. {nom} ({tel}) n'a plus aucun signal depuis {jours} jours. Le telephone affiche 'Aucun reseau'. Le site {site_code} ({techno}) est en panne complete a {commune}, {wilaya}.",
    "Reseau indisponible. {nom} ({tel}) rapporte que les appels echouent systematiquement. Le site {site_code} ({techno}) est en panne a {commune}, {wilaya}.",
    "Connexion intermittente depuis {jours} jours. {nom} ({tel}) constate que le signal apparait et disparait regulierement a {commune}, {wilaya}. Le site {site_code} ({techno}) est en mode degrade.",
    "Cable principal endommage par les intemperies. {nom} ({tel}) signale que la connexion du site {site_code} ({techno}) a ete coupee a {commune}, {wilaya}.",
    "Deconnexions repetees chaque soir entre 19h et 23h. {nom} ({tel}) ne parvient pas a maintenir une connexion stable a {commune}, {wilaya}. Le site {site_code} ({techno}) est soupconne de surcharge.",
    "Signal tres faible a l'interieur de l'appartement. {nom} ({tel}) doit sortir pour passer un appel. Le site {site_code} ({techno}) couvre mal {commune}, {wilaya}.",
    "Coupure totale pendant la journee. {nom} ({tel}) a perdu le service pendant {jours} heures. Le site {site_code} ({techno}) etait en panne a {commune}, {wilaya}.",
    "Mauvaise qualite d'appel avec gresillement. {nom} ({tel}) ne parvient pas a mener une conversation a {commune}, {wilaya}. Site {site_code} ({techno}).",
    "Lenteur extreme de navigation. {nom} ({tel}) utilise le reseau {techno} depuis {jours} jours a {commune}, {wilaya}. Site {site_code}.",
    "Panne internet en cours. {nom} ({tel}) demande une intervention urgente a {commune}, {wilaya}. Site {site_code} ({techno}) ne repond plus.",
    "Aucun reseau detecte. {nom} ({tel}) signale 'telephone muet' depuis {jours} jours a {commune}, {wilaya}. Site {site_code} ({techno}) hors service.",
    "Le reseau est passe de {techno} a 3g de maniere permanente. {nom} ({tel}) constate une degradation a {commune}, {wilaya}. Site {site_code}.",
    "Alimentation electrique du site {site_code} ({techno}) interrompue depuis {jours} jours. {nom} ({tel}) signale une panne generalisee a {commune}, {wilaya}.",
    "Depassement de quota de donnees. {nom} ({tel}) utilise le forfait {type_forfait} a {commune}, {wilaya}. Site {site_code} ({techno}).",
    "Detection de fraude sur la ligne. {nom} ({tel}) signale des appels non autorises depuis {commune}, {wilaya}. Site {site_code} ({techno}).",
    "Activation de ligne en cours depuis {jours} jours. {nom} ({tel}) a souscrit a un forfait {type_forfait} a {commune}, {wilaya}. Site {site_code} ({techno}).",
    "Portabilite de numero en echec. {nom} ({tel}) souhaite transferer son numero. {commune}, {wilaya}. Site {site_code} ({techno}).",
]

REPORT_TITLES = [
    "Rapport trimestriel Q4 2025 - Performance reseau",
    "Analyse pannes - Octobre 2025",
    "Bilan infrastructure - Novembre 2025",
    "Synthese reclamations - Septembre 2025",
    "Coverage zones mortes - Ete 2025",
    "Rapport hebdomadaire - Semaine 28",
    "Analyse des pannes - Juillet 2026",
    "Bilan mensuel - Juin 2026",
    "Performance ingenieurs - Juillet",
    "Rapport criticite - Tickets critiques",
    "Zones a risque - Alger Est",
    "Trafic et charge - Point weekly",
]


def _fake_ip():
    return f"192.168.{random.randint(1, 254)}.{random.randint(1, 254)}"


class Command(BaseCommand):
    help = (
        "Seed complet : 400 reclamations, ~50 GroupeTickets (cascade top-down), "
        "12 rapports IA, ~1200 logs d'audit"
    )

    def handle(self, *args, **options):
        now = timezone.now()
        random.seed(42)

        self.stdout.write(self.style.HTTP_INFO("\n" + "=" * 55))
        self.stdout.write(self.style.HTTP_INFO("  INJECTION DE DONNEES REALISTES"))
        self.stdout.write(self.style.HTTP_INFO("=" * 55))

        # ===================================================═
        # ÉTAPE 1 — Nettoyage complet
        # ===================================================═
        self.stdout.write("\n[1/7] Nettoyage de l'ancien jeu de données...")
        ActivityLog.objects.all().delete()
        CommentaireTicket.objects.all().delete()
        Reclamation.objects.all().delete()
        GroupeTicket.objects.all().delete()
        RapportIA.objects.all().delete()
        Client.objects.all().delete()
        self.stdout.write("  [OK] ActivityLog, CommentaireTicket, Reclamation, GroupeTicket, RapportIA, Client supprimés")

        # ===================================================═
        # ÉTAPE 2 — 80 Clients
        # ===================================================═
        self.stdout.write("\n[2/7] Création de 80 clients...")
        client_objs = []
        for i, name in enumerate(NOMS_CLIENTS):
            parts = name.split()
            prenom = parts[0]
            nom = " ".join(parts[1:]) if len(parts) > 1 else parts[0]
            tel = f"0{random.choice([5, 6, 7])}{random.randint(10, 99)}{random.randint(10, 99)}{random.randint(10, 99)}{random.randint(10, 99)}"
            client_objs.append(Client(
                numero=tel,
                prenom=prenom,
                nom=nom,
                type_client=random.choices(["particulier", "entreprise"], weights=[0.70, 0.30])[0],
            ))
        Client.objects.bulk_create(client_objs, ignore_conflicts=True)
        clients = list(Client.objects.all())
        self.stdout.write(f"  [OK] {len(clients)} clients créés")

        # ===================================================═
        # ÉTAPE 3 — 400 Réclamations
        # ===================================================═
        self.stdout.write("\n[3/7] Création de 400 réclamations...")

        sites = list(SiteReseau.objects.filter(archive=False))
        agents_cc = list(User.objects.filter(role='AGENT_CALL_CENTER', is_active=True))
        ingenieurs = list(User.objects.filter(role='INGENIEUR_RESEAUX', is_active=True))
        admin_user = User.objects.filter(role='ADMIN', is_active=True).first()
        superviseur = User.objects.filter(role='SUPERVISEUR', is_active=True).first()

        if not sites:
            self.stdout.write(self.style.ERROR("Aucun site trouvé ! Lancez d'abord le seed des sites."))
            return

        family_names = list(KEYWORD_FAMILIES.keys())
        forfait_types = ["Essentiel", "Premium", "Business", "Illimite", "Data+"]
        DAYS = 120

        def random_date(days_max=DAYS):
            jours = random.randint(0, days_max)
            base = now - timedelta(days=jours)
            h = random.choices(
                [random.randint(8, 12), random.randint(14, 18), random.randint(9, 17), random.randint(0, 23)],
                weights=[0.35, 0.30, 0.20, 0.15],
            )[0]
            return base.replace(hour=h, minute=random.randint(0, 59), second=random.randint(0, 59), microsecond=0)

        all_recl_data = []
        site_family_recls = defaultdict(list)

        for i in range(400):
            site = random.choice(sites)
            family = random.choice(family_names)
            client = random.choice(clients)
            agent = random.choice(agents_cc)
            keyword = random.choice(KEYWORD_FAMILIES[family])
            desc_template = random.choice(DESCRIPTIONS)

            try:
                desc = desc_template.format(
                    nom=client.nom_complet, tel=client.numero,
                    wilaya=site.wilaya, commune=site.commune,
                    jours=random.randint(1, 30),
                    type_forfait=random.choice(forfait_types),
                    techno=site.technologie, site_code=site.codeSite,
                )
            except KeyError:
                desc = f"{client.nom_complet} ({client.numero}) a signalé un problème sur le site {site.codeSite} à {site.commune}, {site.wilaya}."

            priorite = calculer_priorite(keyword)
            created = random_date()

            data = {
                "client": client,
                "nom_client": client.nom_complet,
                "telephone_client": client.numero,
                "email_client": f"{client.prenom.lower()}.{client.nom.lower().replace(' ', '')}@gmail.com",
                "type_client": client.type_client,
                "site": site,
                "mots_cles_ia": keyword,
                "priorite": priorite,
                "cree_par": agent,
                "_created_at": created,
            }
            all_recl_data.append(data)
            site_family_recls[(site.id, family)].append(data)

        all_recl_data.sort(key=lambda x: x["_created_at"])

        reclamations = []
        for idx, d in enumerate(all_recl_data):
            reclamations.append(Reclamation(
                numero_ticket=f'R{idx + 1:04d}',
                client=d["client"],
                nom_client=d["nom_client"],
                telephone_client=d["telephone_client"],
                email_client=d["email_client"],
                type_client=d["type_client"],
                site=d["site"],
                mots_cles_ia=d["mots_cles_ia"],
                priorite=d["priorite"],
                statut="ferme",
                cree_par=d["cree_par"],
                is_archived=False,
            ))

        Reclamation.objects.bulk_create(reclamations, batch_size=500)
        self.stdout.write(f"  [OK] {len(reclamations)} réclamations créées (statut: fermé)")

        recls_list = list(Reclamation.objects.all().order_by('id'))
        updates = []
        for idx, d in enumerate(all_recl_data):
            if idx < len(recls_list):
                updates.append(Reclamation(id=recls_list[idx].id, created_at=d["_created_at"], updated_at=d["_created_at"]))
        Reclamation.objects.bulk_update(updates, ['created_at', 'updated_at'], batch_size=500)

        # ===================================================═
        # ÉTAPE 4 — ~50 GroupeTickets (cascade top-down)
        # ===================================================═
        self.stdout.write("\n[4/7] Création des GroupeTickets (cascade top-down)...")

        recls_fresh = list(Reclamation.objects.select_related('site', 'cree_par').order_by('created_at'))

        # Group by (site_id, family)
        site_family_map = defaultdict(list)
        for r in recls_fresh:
            family = 'autre'
            for fname, kws in KEYWORD_FAMILIES.items():
                if r.mots_cles_ia in kws:
                    family = fname
                    break
            site_family_map[(r.site_id, family)].append(r)

        # Sub-split by 3-day windows
        from reclamations.models import PRIORITE_SCORES
        titre_prefixes = {
            "signal": "Perte de signal",
            "connexion": "Déconnexions répétées",
            "debit": "Débit lent",
            "panne": "Panne de service",
            "coupure": "Coupure de service",
            "appel": "Problème d'appels",
            "infrastructure": "Incident infrastructure",
            "config": "Erreur de configuration",
            "facturation": "Réclamation facturation",
        }

        all_groups = []
        for (site_id, family), recs in site_family_map.items():
            recs_sorted = sorted(recs, key=lambda r: r.created_at)
            sub_clusters = []
            current_cluster = [recs_sorted[0]]
            for j in range(1, len(recs_sorted)):
                gap = (recs_sorted[j].created_at - recs_sorted[j - 1].created_at).total_seconds()
                if gap <= 3 * 86400:
                    current_cluster.append(recs_sorted[j])
                else:
                    sub_clusters.append(current_cluster)
                    current_cluster = [recs_sorted[j]]
            sub_clusters.append(current_cluster)
            for cluster in sub_clusters:
                all_groups.append((site_id, family, cluster))

        # Sort groups: bigger groups first, then shuffle within same size
        all_groups.sort(key=lambda g: -len(g[2]))
        if len(all_groups) > 50:
            all_groups = all_groups[:50]
        random.shuffle(all_groups)

        total_groups = len(all_groups)
        ouvert_count = min(15, total_groups)
        resolu_count = min(5, max(0, total_groups - ouvert_count))
        fermes_count = total_groups - ouvert_count - resolu_count

        status_order = ['ouvert'] * ouvert_count + ['resolu'] * resolu_count + ['ferme'] * fermes_count

        groupe_count = 0
        recl_updates_bulk = []

        for idx, (site_id, family, recs) in enumerate(all_groups):
            site_obj = recs[0].site
            representative = recs[0]
            premier = min(r.created_at for r in recs)
            group_status = status_order[idx] if idx < len(status_order) else 'ferme'

            avg_score = sum(PRIORITE_SCORES.get(r.priorite, 45) for r in recs) / len(recs)
            if avg_score >= 100:
                gp = 'critique'
            elif avg_score >= 60:
                gp = 'haute'
            elif avg_score >= 30:
                gp = 'normale'
            else:
                gp = 'basse'

            assignee = None
            if group_status in ('ouvert', 'resolu'):
                assignee = random.choice(ingenieurs) if ingenieurs else None

            # resolu_le: old for fermé (>60j), recent for resolu (<30j), none for ouvert
            resolu_le_val = None
            archived_at_val = None
            if group_status == 'ferme':
                resolu_le_val = now - timedelta(days=random.randint(60, 110))
            elif group_status == 'resolu':
                resolu_le_val = now - timedelta(days=random.randint(5, 25))

            gt = GroupeTicket(
                site=site_obj,
                titre=f"{titre_prefixes.get(family, 'Incident')} - {site_obj.codeSite}",
                description=f"Consolidation de {len(recs)} réclamation(s) sur le site {site_obj.codeSite} ({site_obj.commune}). Famille: {family}.",
                mots_cles=representative.mots_cles_ia or '',
                priorite=gp,
                statut=group_status,
                assigne_a=assignee,
                cree_par=representative.cree_par,
                nombre_reclamations=len(recs),
                premier_signalement=premier,
                resolu_le=resolu_le_val,
                is_archived=False,
            )
            gt.save()
            groupe_count += 1

            # Cascade: update reclamations in this group
            recl_statut = group_status
            for r in recs:
                r.statut = recl_statut
                r.assigne_a = assignee
                r.groupe = gt
                r.resolu_le = resolu_le_val
                recl_updates_bulk.append(r)

        Reclamation.objects.bulk_update(
            recl_updates_bulk,
            ['statut', 'assigne_a', 'groupe', 'resolu_le'],
            batch_size=500,
        )

        self.stdout.write(f"  [OK] {groupe_count} GroupeTickets créés : "
                          f"{fermes_count} fermés, {ouvert_count} ouverts, {resolu_count} résolus")

        # Fix orphaned reclamations (not in any group): set resolu_le for ferme ones
        orphan_fermes = Reclamation.objects.filter(groupe__isnull=True, statut='ferme', resolu_le__isnull=True)
        orphan_count = orphan_fermes.count()
        if orphan_count > 0:
            from django.db.models import F
            update_list = []
            for r in orphan_fermes:
                r.resolu_le = r.created_at + timedelta(days=random.randint(1, 10))
                update_list.append(r)
            Reclamation.objects.bulk_update(update_list, ['resolu_le'], batch_size=500)
            self.stdout.write(f"  [OK] {orphan_count} reclamations orphelines: resolu_le defini")

        # ===================================================═
        # ETAPE 5 -- Rapports IA
        # ===================================================═
        self.stdout.write("\n[5/7] Création de 12 rapports IA...")
        from dashboard.rapport_services import generer_rapport_local

        reports_data = [
            ("Rapport trimestriel Q4 2025 - Performance reseau", "Bilan trimestriel de la performance du reseau national", -120, -90),
            ("Analyse pannes - Octobre 2025", "Lister et categoriser toutes les pannes d'octobre 2025", -110, -80),
            ("Bilan infrastructure - Novembre 2025", "Etat de l'infrastructure reseau en novembre 2025", -100, -70),
            ("Synthese reclamations - Septembre 2025", "Synthese des reclamations du mois de septembre", -95, -65),
            ("Coverage zones mortes - Ete 2025", "Analyse des zones mortes pendant l'ete 2025", -105, -75),
            ("Rapport hebdomadaire - Semaine 28", "Analyser la performance reseau semaine 28", -7, 0),
            ("Analyse des pannes - Juillet 2026", "Pannes survenues en juillet 2026", -18, -3),
            ("Bilan mensuel - Juin 2026", "Evaluation de la satisfaction client juin", -45, -15),
            ("Performance ingenieurs - Juillet", "Evaluation des performances des ingenieurs reseaux", -30, 0),
            ("Rapport criticite - Tickets critiques", "Analyse des tickets critiques du mois", -20, 0),
            ("Zones a risque - Alger Est", "Identification des zones a risque dans Alger Est", -12, 0),
            ("Trafic et charge - Point weekly", "Analyse du trafic et des pics de charge", -5, 0),
        ]

        rapport_count = 0
        for title, prompt, days_start, days_end in reports_data:
            debut = now + timedelta(days=days_start)
            fin = now + timedelta(days=days_end)
            created = debut - timedelta(days=random.randint(1, 5))
            contenu = generer_rapport_local(prompt, debut.date(), fin.date())
            r = RapportIA(
                titre=title,
                prompt=prompt,
                contenu=contenu,
                date_debut=debut.date(),
                date_fin=fin.date(),
                cree_par=superviseur or admin_user,
            )
            r.save()
            RapportIA.objects.filter(id=r.id).update(created_at=created)
            rapport_count += 1

        three_months_ago = now - timedelta(days=90)
        old_reports = RapportIA.objects.filter(created_at__lte=three_months_ago, is_archived=False)
        old_count = old_reports.count()
        old_reports.update(is_archived=True, archived_at=now - timedelta(days=random.randint(1, 10)))

        self.stdout.write(f"  [OK] {rapport_count} rapports créés, {old_count} archivés (>3 mois)")

        # ===================================================═
        # ÉTAPE 6 — Audit Log (~1200 entrées sur 120 jours)
        # ===================================================═
        self.stdout.write("\n[6/7] Génération du journal d'activité (~1200 entrées)...")

        active_users = list(User.objects.filter(is_active=True))
        all_active_actions = []

        # -- 6a. Connexions quotidiennes --
        for u in active_users:
            days = random.randint(40, 100)
            for d in range(days):
                if random.random() > 0.75:
                    continue
                day = now - timedelta(days=d)
                if day.weekday() >= 5 and random.random() > 0.3:
                    continue
                h = random.choices(
                    [random.randint(7, 8), random.randint(9, 12), random.randint(14, 17), random.randint(18, 22)],
                    weights=[0.15, 0.35, 0.35, 0.15],
                )[0]
                ts = day.replace(hour=h, minute=random.randint(0, 59), second=random.randint(0, 59), microsecond=0)
                all_active_actions.append({
                    'user': u, 'action': 'login', 'created_at': ts,
                    'details': {'method': 'JWT'}, 'ip': _fake_ip(),
                })
                if random.random() > 0.55:
                    logout_ts = ts + timedelta(hours=random.randint(1, 6), minutes=random.randint(0, 59))
                    if logout_ts.day == ts.day:
                        all_active_actions.append({
                            'user': u, 'action': 'logout', 'created_at': logout_ts,
                            'details': {}, 'ip': _fake_ip(),
                        })

        # -- 6b. Créations de réclamations --
        for r in recls_list:
            if r.cree_par:
                all_active_actions.append({
                    'user': r.cree_par,
                    'action': 'create_ticket',
                    'created_at': r.created_at,
                    'details': {
                        'ticket': r.numero_ticket,
                        'client': r.nom_client,
                        'site': r.site.codeSite if r.site else None,
                        'priorite': r.priorite,
                    },
                    'ip': _fake_ip(),
                })

        # -- 6c. Assignations de tickets --
        assigned_recls = Reclamation.objects.filter(assigne_a__isnull=False).select_related('assigne_a', 'site', 'groupe')
        for r in assigned_recls:
            assign_date = r.created_at + timedelta(days=random.randint(1, 5), hours=random.randint(1, 8))
            if assign_date > now:
                assign_date = now - timedelta(days=1)
            all_active_actions.append({
                'user': r.assigne_a,
                'action': 'assign_ticket',
                'created_at': assign_date,
                'details': {
                    'ticket': r.numero_ticket,
                    'groupe': r.groupe.numero_ticket if r.groupe else None,
                    'site': r.site.codeSite if r.site else None,
                },
                'ip': _fake_ip(),
            })

        # -- 6d. Résolutions de tickets --
        resolved_recls = Reclamation.objects.filter(statut__in=['resolu', 'ferme'], assigne_a__isnull=False).select_related('assigne_a', 'site')
        for r in resolved_recls:
            if r.resolu_le:
                all_active_actions.append({
                    'user': r.assigne_a,
                    'action': 'resolve_ticket',
                    'created_at': r.resolu_le,
                    'details': {
                        'ticket': r.numero_ticket,
                        'site': r.site.codeSite if r.site else None,
                    },
                    'ip': _fake_ip(),
                })

        # -- 6e. Actions admin (utilisateurs) --
        users_for_admin = list(User.objects.all())
        for u in users_for_admin:
            created_offset = random.randint(30, 110)
            ts_create = now - timedelta(days=created_offset, hours=random.randint(0, 12))
            if u.is_archived:
                archive_ts = ts_create + timedelta(days=random.randint(10, 60))
                all_active_actions.append({
                    'user': admin_user, 'action': 'archive_user',
                    'created_at': archive_ts,
                    'details': {'code_user': u.code_user, 'nom': u.nom_user, 'role': u.role},
                    'ip': _fake_ip(),
                })
            elif random.random() > 0.85:
                update_ts = ts_create + timedelta(days=random.randint(1, 30))
                all_active_actions.append({
                    'user': admin_user, 'action': 'update_user',
                    'created_at': update_ts,
                    'details': {'code_user': u.code_user, 'champs_modifies': random.choice([['email'], ['nom_user'], ['email', 'nom_user']])},
                    'ip': _fake_ip(),
                })

        # -- 6f. Actions admin (sites) --
        for s in sites:
            if random.random() > 0.7:
                ts = now - timedelta(days=random.randint(10, 100), hours=random.randint(7, 17))
                all_active_actions.append({
                    'user': admin_user, 'action': 'update_site',
                    'created_at': ts,
                    'details': {'code_site': s.codeSite, 'nom': s.nom, 'champs_modifies': random.choice([['statut'], ['technologie'], ['statut', 'commune']])},
                    'ip': _fake_ip(),
                })

        # -- 6g. Actions système --
        system_actions_pool = []
        fermes_recls = list(Reclamation.objects.filter(statut='ferme').select_related('site')[:30])
        for r in fermes_recls:
            ts = r.resolu_le or (now - timedelta(days=random.randint(30, 90)))
            system_actions_pool.append({
                'user': None, 'action': 'archive_ticket',
                'created_at': ts,
                'details': {'ticket': r.numero_ticket, 'site': r.site.codeSite if r.site else None},
                'ip': _fake_ip(),
            })
        fermes_gts = list(GroupeTicket.objects.filter(statut='ferme')[:15])
        for gt in fermes_gts:
            ts = gt.resolu_le or (now - timedelta(days=random.randint(30, 90)))
            system_actions_pool.append({
                'user': None, 'action': 'toggle_site',
                'created_at': ts,
                'details': {'code_site': gt.site.codeSite if gt.site else None, 'nouveau_statut': random.choice(['UP', 'DOWN', 'DEGRADE'])},
                'ip': _fake_ip(),
            })
        all_active_actions.extend(system_actions_pool)

        # -- 6h. Actions superviseur (rapports) --
        rapports = list(RapportIA.objects.all())
        for rp in rapports:
            all_active_actions.append({
                'user': superviseur or admin_user,
                'action': 'generate_rapport',
                'created_at': rp.created_at,
                'details': {'titre': rp.titre, 'periode': f"{rp.date_debut} — {rp.date_fin}"},
                'ip': _fake_ip(),
            })

        # -- Sort and create --
        all_active_actions.sort(key=lambda x: x['created_at'])
        self.stdout.write(f"  -> {len(all_active_actions)} actions à insérer...")

        log_objs = []
        for a in all_active_actions:
            u = a.get('user')
            log_objs.append(ActivityLog(
                user=u,
                user_code=getattr(u, 'code_user', 'SYS') if u else 'SYS',
                user_name=getattr(u, 'nom_user', '') or (u.get_full_name() if u else '') if u else 'Système',
                user_role=getattr(u, 'role', 'SYSTEM') if u else 'SYSTEM',
                action=a['action'],
                details=a.get('details', {}),
                ip_address=a.get('ip'),
                created_at=a['created_at'],
            ))
        ActivityLog.objects.bulk_create(log_objs, batch_size=500)
        self.stdout.write(f"  [OK] {len(log_objs)} entrées d'audit créées")

        # ===================================================═
        # ÉTAPE 7 — Vérification
        # ===================================================═
        self.stdout.write("\n[7/7] Vérification finale...")
        from django.db.models import Count, Q

        stats_r = Reclamation.objects.aggregate(
            total=Count("id"),
            ouverts=Count("id", filter=Q(statut="ouvert")),
            resolus=Count("id", filter=Q(statut="resolu")),
            fermes=Count("id", filter=Q(statut="ferme")),
        )
        stats_gt = GroupeTicket.objects.aggregate(
            total=Count("id"),
            ouverts=Count("id", filter=Q(statut="ouvert")),
            resolus=Count("id", filter=Q(statut="resolu")),
            fermes=Count("id", filter=Q(statut="ferme")),
        )
        stats_log = ActivityLog.objects.aggregate(
            total=Count("id"),
            logins=Count("id", filter=Q(action="login")),
            logouts=Count("id", filter=Q(action="logout")),
            create_ticket=Count("id", filter=Q(action="create_ticket")),
            assign_ticket=Count("id", filter=Q(action="assign_ticket")),
            resolve_ticket=Count("id", filter=Q(action="resolve_ticket")),
            system=Count("id", filter=Q(user__isnull=True)),
        )

        self.stdout.write(f"\n{'=' * 55}")
        self.stdout.write(self.style.SUCCESS("  INJECTION TERMINÉE AVEC SUCCÈS"))
        self.stdout.write(f"{'=' * 55}")
        self.stdout.write(f"  Clients:          {len(clients)}")
        self.stdout.write(f"  Réclamations:     {stats_r['total']}")
        self.stdout.write(f"    Ouvertes:       {stats_r['ouverts']}")
        self.stdout.write(f"    Résolues:       {stats_r['resolus']}")
        self.stdout.write(f"    Fermées:        {stats_r['fermes']}")
        self.stdout.write(f"  GroupeTickets:    {stats_gt['total']}")
        self.stdout.write(f"    Ouverts:        {stats_gt['ouverts']}")
        self.stdout.write(f"    Résolus:        {stats_gt['resolus']}")
        self.stdout.write(f"    Fermés:         {stats_gt['fermes']}")
        self.stdout.write(f"  Rapports IA:      {RapportIA.objects.count()} ({RapportIA.objects.filter(is_archived=True).count()} archivés)")
        self.stdout.write(f"  Journal d'activité: {stats_log['total']}")
        self.stdout.write(f"    Connexions:     {stats_log['logins']}")
        self.stdout.write(f"    Déconnexions:   {stats_log['logouts']}")
        self.stdout.write(f"    Créations tickets: {stats_log['create_ticket']}")
        self.stdout.write(f"    Assignations:   {stats_log['assign_ticket']}")
        self.stdout.write(f"    Résolutions:    {stats_log['resolve_ticket']}")
        self.stdout.write(f"    Actions système: {stats_log['system']}")
        self.stdout.write(f"  Utilisateurs:     {User.objects.count()} ({User.objects.filter(is_active=True).count()} actifs, {User.objects.filter(is_archived=True).count()} archivés)")
        self.stdout.write(f"  Sites:            {SiteReseau.objects.filter(archive=False).count()}")
        self.stdout.write(f"{'=' * 55}")
        self.stdout.write(self.style.SUCCESS(f"  Login: email + mot de passe '{COMMON_PASSWORD}'"))
