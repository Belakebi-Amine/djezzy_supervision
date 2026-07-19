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

User = get_user_model()

COMMON_PASSWORD = config('SEED_PASSWORD', default='change-me')

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

# Keywords grouped by family for realistic grouping within a GroupeTicket
KEYWORD_FAMILIES = {
    "signal": [
        "perte signal, zone rurale",
        "signal faible, appartement",
        "signal varie, instable",
        "zone morte, aucun reseau possible",
        "pas de signal depuis hier",
        "aucun reseau, telephone muet",
    ],
    "deconnexion": [
        "deconnexion repetee, soiree",
        "connexion intermitente, zone urbaine",
        "coupure frequente, instabilite reseau",
    ],
    "debit": [
        "debit lent, navigation difficile",
        "lenteur navigation, videos bloquent",
        "debit tres faible soir",
        "latence elevee, gaming impossible",
        "debit montant faible, uploads impossible",
        "surcharge cellule, heure pointe",
    ],
    "panne": [
        "panne totale, plus de service",
        "panne internet, urgence",
        "panne site cellulaire, antenne tombee",
        "panne equipement BTS, alimentation",
    ],
    "coupure": [
        "coupure jour, pas de service",
        "coupure frequente matin et soir",
        "coupure electrique, pas de backup",
        "coupure 5G, retrogradation 4G",
    ],
    "appel": [
        "reseau indisponible, appel echoue",
        "mauvaise qualite appel, gresillement",
        "appels coupent sans raison",
        "taux rejet appels eleve",
    ],
    "infrastructure": [
        "cable coupe, intemperies",
        "fibre optique coupe, chantier",
        "defaut alimentation site, batterie",
        "temperature elevee equipement, surchauffe",
        "humidite intrusion armoire, corrosion",
        "vent fort, antenne destabilisee",
        "pluie intense, deterioration cablage",
    ],
    "config": [
        "reseau 3G perdu, que 2G",
        "probleme 4G, que Edge",
        "mise a jour logiciel echouee",
        "erreur config site, parametre incorrect",
        "conflit adresse IP, reseau local",
        "interference frequences, bruit radio",
        "handechec, bascule reseau echoue",
    ],
    "facturation": [
        "depassement quota data, forfait epuise",
        "fraude detection, ligne compromise",
        "client insatisfait, retard traitement",
        "demande remboursement, facturation erreur",
        "changement forfait, delai traitement",
        "activation ligne, delai anormal",
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
    "Le reseau est passe de {techno} a 3G de maniere permanente. {nom} ({tel}) constate une degradation a {commune}, {wilaya}. Site {site_code}.",
    "Alimentation electrique du site {site_code} ({techno}) interrompue depuis {jours} jours. {nom} ({tel}) signale une panne generalisee a {commune}, {wilaya}.",
    "Depassement de quota de donnees. {nom} ({tel}) utilise le forfait {type_forfait} a {commune}, {wilaya}. Site {site_code} ({techno}).",
    "Detection de fraude sur la ligne. {nom} ({tel}) signale des appels non autorises depuis {commune}, {wilaya}. Site {site_code} ({techno}).",
    "Activation de ligne en cours depuis {jours} jours. {nom} ({tel}) a souscrit a un forfait {type_forfait} a {commune}, {wilaya}. Site {site_code} ({techno}).",
    "Portabilite de numero en echec. {nom} ({tel}) souhaite transferer son numero. {commune}, {wilaya}. Site {site_code} ({techno}).",
]


class Command(BaseCommand):
    help = "Seed propre: 350 reclamations FERMEES, groupees en tickets par site, zero incoherence"

    def handle(self, *args, **options):
        now = timezone.now()
        random.seed(42)

        self.stdout.write(self.style.HTTP_INFO("=== SEED PROPRE ==="))

        # ─── Step 1: Delete old data ───
        self.stdout.write("\n[1/5] Suppression des anciennes donnees...")
        CommentaireTicket.objects.all().delete()
        Reclamation.objects.all().delete()
        GroupeTicket.objects.all().delete()
        RapportIA.objects.all().delete()
        self.stdout.write("  Toutes les reclamations, groupes, commentaires, rapports supprimes.")

        # ─── Step 2: Add inactive/archived users ───
        self.stdout.write("\n[2/5] Ajout de users inactifs et archives...")
        inactive_users_data = [
            ("Omar", "Bensalem", "AGENT_CALL_CENTER", False, False, "omar.bensalem@inactive.com"),
            ("Leila", "Meziane", "AGENT_CALL_CENTER", False, False, "leila.meziane@inactive.com"),
            ("Tarek", "Aoudia", "INGENIEUR_RESEAUX", False, True, "tarek.aoudia@inactive.com"),
        ]
        for first, last, role, active, archived, email in inactive_users_data:
            if not User.objects.filter(email=email).exists():
                u = User.objects.create_user(
                    username=email, email=email, password=COMMON_PASSWORD,
                    first_name=first, last_name=last, role=role,
                    is_active=active, is_archived=archived,
                )
                status = "INACTIF" if not active else "ARCHIVE"
                self.stdout.write(f"  {u.code_user} - {first} {last} ({role}) [{status}]")
            else:
                self.stdout.write(f"  {email} existe deja, skip.")

        # ─── Step 3: Prepare data ───
        self.stdout.write("\n[3/5] Preparation des donnees...")
        sites = list(SiteReseau.objects.filter(archive=False))
        if not sites:
            self.stdout.write(self.style.ERROR("Aucun site trouve! Lancez d'abord le seed des sites."))
            return

        agents_cc = list(User.objects.filter(role='AGENT_CALL_CENTER', is_active=True))
        ingenieurs = list(User.objects.filter(role='INGENIEUR_RESEAUX', is_active=True))
        admin = User.objects.filter(role='ADMIN').first()
        superviseur = User.objects.filter(role='SUPERVISEUR').first()

        self.stdout.write(f"  Sites: {len(sites)}, Agents CC: {len(agents_cc)}, Ingenieurs: {len(ingenieurs)}")

        # ─── Step 4: Create 350 reclamations, ALL FERMEES ───
        self.stdout.write("\n[4/5] Creation de 350 reclamations (toutes fermees)...")

        DAYS = 120
        family_names = list(KEYWORD_FAMILIES.keys())
        forfait_types = ["Essentiel", "Premium", "Business", "Illimite", "Data+"]

        def random_date(days_max=DAYS):
            jours = random.randint(0, days_max)
            base = now - timedelta(days=jours)
            h = random.choices(
                [random.randint(8, 12), random.randint(14, 18), random.randint(9, 17), random.randint(0, 23)],
                weights=[0.35, 0.30, 0.20, 0.15]
            )[0]
            return base.replace(hour=h, minute=random.randint(0, 59), second=random.randint(0, 59), microsecond=0)

        def make_reclamation(site, family, cree_par):
            keyword = random.choice(KEYWORD_FAMILIES[family])
            nom_client = random.choice(NOMS_CLIENTS)
            telephone = f"0{random.choice([5, 6, 7])}{random.randint(10, 99)}{random.randint(10, 99)}{random.randint(10, 99)}{random.randint(10, 99)}"
            email = f"{nom_client.lower().replace(' ', '.')}@gmail.com"
            priorite = random.choices(
                ["basse", "normale", "haute", "critique"],
                weights=[0.20, 0.40, 0.25, 0.15]
            )[0]
            type_client = random.choices(
                ["particulier", "entreprise"],
                weights=[0.70, 0.30]
            )[0]
            desc_template = random.choice(DESCRIPTIONS)
            jours_aleatoire = random.randint(1, 30)
            type_forfait = random.choice(forfait_types)
            try:
                desc = desc_template.format(
                    nom=nom_client, tel=telephone, wilaya=site.wilaya,
                    commune=site.commune, jours=jours_aleatoire,
                    type_forfait=type_forfait,
                    techno=site.technologie, site_code=site.codeSite,
                )
            except KeyError:
                desc = f"{nom_client} ({telephone}) a signale un probleme sur le site {site.codeSite} a {site.commune}, {site.wilaya}."

            return {
                "nom_client": nom_client,
                "telephone_client": telephone,
                "email_client": email,
                "type_client": type_client,
                "site": site,
                "mots_cles_ia": keyword,
                "priorite": priorite,
                "statut": "ferme",
                "cree_par": cree_par,
                "assigne_a": None,
                "_created_at": random_date(),
                "_is_archived": False,
                "_archived_at": None,
            }

        # Distribute 350 reclamations across sites with keyword families
        # Each site gets reclamations, grouped by keyword family for GroupeTicket grouping
        all_recl_data = []
        site_family_reclamations = defaultdict(list)

        for i in range(350):
            site = random.choice(sites)
            family = random.choice(family_names)
            agent = random.choice(agents_cc)
            data = make_reclamation(site, family, agent)
            all_recl_data.append(data)
            site_family_reclamations[(site.id, family)].append(data)

        # Sort by date
        all_recl_data.sort(key=lambda x: x["_created_at"])

        # Bulk create reclamations
        reclamations = []
        for idx, t in enumerate(all_recl_data):
            r = Reclamation(
                numero_ticket=f'R{idx + 1:04d}',
                nom_client=t["nom_client"],
                telephone_client=t["telephone_client"],
                email_client=t["email_client"],
                type_client=t["type_client"],
                site=t["site"],
                mots_cles_ia=t["mots_cles_ia"],
                priorite=t["priorite"],
                statut="ferme",
                cree_par=t["cree_par"],
                assigne_a=None,
                is_archived=False,
            )
            reclamations.append(r)

        Reclamation.objects.bulk_create(reclamations)
        self.stdout.write(f"  {len(reclamations)} reclamations creees (toutes fermees)")

        # Update dates
        recls = list(Reclamation.objects.all().order_by('id'))
        for idx, t in enumerate(all_recl_data):
            if idx < len(recls):
                Reclamation.objects.filter(id=recls[idx].id).update(
                    created_at=t["_created_at"],
                    updated_at=t["_created_at"],
                )

        # ─── Step 5: Create GroupeTickets by site+family ───
        self.stdout.write("\n[5/5] Creation des tickets regroupes par site + famille...")
        recls_fresh = list(Reclamation.objects.select_related('site', 'cree_par').all().order_by('id'))

        # Rebuild the mapping from DB objects
        gt_groups = defaultdict(list)
        for r in recls_fresh:
            key = (r.site_id, r.mots_cles_ia.split(',')[0].strip() if r.mots_cles_ia else 'autre')
            # Use a broader family match
            for family, keywords in KEYWORD_FAMILIES.items():
                if r.mots_cles_ia in keywords:
                    key = (r.site_id, family)
                    break
            gt_groups[key].append(r)

        from reclamations.models import PRIORITE_SCORES

        groupe_count = 0
        for (site_id, family), recs in gt_groups.items():
            site_obj = recs[0].site
            priorites = [r.priorite for r in recs]
            avg_score = sum(PRIORITE_SCORES.get(p, 45) for p in priorites) / len(priorites)
            if avg_score >= 100:
                gp = 'critique'
            elif avg_score >= 60:
                gp = 'haute'
            elif avg_score >= 30:
                gp = 'normale'
            else:
                gp = 'basse'

            premier = min(r.created_at for r in recs)
            representative = recs[0]

            titre_prefixes = {
                "signal": "Perte de signal",
                "deconnexion": "Deconnexions repetees",
                "debit": "Debit lent",
                "panne": "Panne de service",
                "coupure": "Coupure de service",
                "appel": "Probleme d'appels",
                "infrastructure": "Incident infrastructure",
                "config": "Erreur de configuration",
                "facturation": "Reclamation facturation",
            }

            gt = GroupeTicket(
                site=site_obj,
                titre=f"{titre_prefixes.get(family, 'Incident')} - {site_obj.codeSite}",
                description=f"Consolidation de {len(recs)} reclamations sur le site {site_obj.codeSite} ({site_obj.commune}). Famille: {family}.",
                mots_cles=representative.mots_cles_ia or '',
                priorite=gp,
                statut='ferme',
                assigne_a=None,
                cree_par=representative.cree_par,
                nombre_reclamations=len(recs),
                premier_signalement=premier,
                is_archived=False,
            )
            gt.save()
            groupe_count += 1

            for r in recs:
                Reclamation.objects.filter(id=r.id).update(groupe=gt)

        self.stdout.write(f"  {groupe_count} tickets crees (tous fermes)")

        # ─── Create 10 rapports IA ───
        self.stdout.write("\n  Creation de 10 rapports IA...")
        from dashboard.rapport_services import generer_rapport_local

        reports_data = [
            ("Rapport hebdomadaire - Performance reseau Alger", "Analyser la performance du reseau dans la wilaya d'Alger pour la semaine", -7, 0),
            ("Analyse des pannes - Wilaya d'Alger", "Lister et categoriser toutes les pannes survenues dans la wilaya d'Alger", -30, -7),
            ("Bilan mensuel - Satisfaction client", "Evaluer la satisfaction client basee sur les reclamations du mois", -60, -30),
            ("Synthese des reclamations - Zone Est", "Synthetiser les reclamations de la zone Est et identifier les tendances", -90, -60),
            ("Rapport trimestriel - Infrastructure 5G", "Analyser l'etat de l'infrastructure 5G et les zones a risque", -120, -30),
            ("Performance ingenieurs - T1 2026", "Evaluer les performances des ingenieurs reseaux sur le trimestre", -90, 0),
            ("Analyse comparative - Nord vs Sud Alger", "Comparer les metriques de performance entre les zones nord et sud", -60, -15),
            ("Rapport criticite - Tickets priorite haute", "Analyser les tickets critiques et haute priorite pour identifier les causes racines", -45, 0),
            ("Bilan coverage - Zones mortes", "Identifier les zones mortes et les problemes de couverture reseau", -120, -60),
            ("Rapport mensuel - Trafic et charge reseau", "Analyser le trafic reseau et les pics de charge sur le mois", -30, 0),
        ]

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
                cree_par=superviseur or admin,
            )
            r.save()
            RapportIA.objects.filter(id=r.id).update(created_at=created)

        old_rapports = list(RapportIA.objects.all().order_by('created_at')[:2])
        for r in old_rapports:
            RapportIA.objects.filter(id=r.id).update(
                is_archived=True,
                archived_at=r.created_at + timedelta(days=random.randint(5, 15)),
            )
        self.stdout.write(f"  {len(reports_data)} rapports crees, {len(old_rapports)} archives")

        # ─── Verification finale ───
        from django.db.models import Count, Q

        stats_r = Reclamation.objects.aggregate(
            total=Count("id"),
            ouverts=Count("id", filter=Q(statut="ouvert")),
            resolus=Count("id", filter=Q(statut="resolu")),
            fermes=Count("id", filter=Q(statut="ferme")),
            archives=Count("id", filter=Q(is_archived=True)),
        )
        stats_gt = GroupeTicket.objects.aggregate(
            total=Count("id"),
            ouverts=Count("id", filter=Q(statut="ouvert")),
            resolus=Count("id", filter=Q(statut="resolu")),
            fermes=Count("id", filter=Q(statut="ferme")),
            archives=Count("id", filter=Q(is_archived=True)),
        )

        self.stdout.write(f"\n{'='*50}")
        self.stdout.write(self.style.SUCCESS("  SEED PROPRE TERMINE"))
        self.stdout.write(f"{'='*50}")
        self.stdout.write(f"  Users: {User.objects.count()} total ({User.objects.filter(is_active=True).count()} actifs)")
        self.stdout.write(f"  Reclamations: {stats_r['total']}")
        self.stdout.write(f"    Ouvertes:  {stats_r['ouverts']}")
        self.stdout.write(f"    Resolues:  {stats_r['resolus']}")
        self.stdout.write(f"    Fermees:   {stats_r['fermes']}")
        self.stdout.write(f"    Archivees: {stats_r['archives']}")
        self.stdout.write(f"  Tickets:    {stats_gt['total']}")
        self.stdout.write(f"    Ouverts:   {stats_gt['ouverts']}")
        self.stdout.write(f"    Resolus:   {stats_gt['resolus']}")
        self.stdout.write(f"    Fermes:    {stats_gt['fermes']}")
        self.stdout.write(f"    Archives:  {stats_gt['archives']}")
        self.stdout.write(f"  Rapports IA: {RapportIA.objects.count()} ({RapportIA.objects.filter(is_archived=True).count()} archives)")

        # Verify consistency
        inconsistency = Reclamation.objects.exclude(statut='ferme').count()
        if inconsistency == 0:
            self.stdout.write(self.style.SUCCESS("  COHERENCE: OK - Toutes les reclamations sont fermees"))
        else:
            self.stdout.write(self.style.ERROR(f"  INCOHERENCE: {inconsistency} reclamations non-fermees!"))

        gt_inconsistency = GroupeTicket.objects.exclude(statut='ferme').count()
        if gt_inconsistency == 0:
            self.stdout.write(self.style.SUCCESS("  COHERENCE: OK - Tous les tickets sont fermes"))
        else:
            self.stdout.write(self.style.ERROR(f"  INCOHERENCE: {gt_inconsistency} tickets non-fermes!"))

        self.stdout.write(self.style.SUCCESS(f"\n  Login: email + mot de passe '{COMMON_PASSWORD}'"))
