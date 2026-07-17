import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from decouple import config
from reclamations.models import Reclamation, CommentaireTicket
from dashboard.models import RapportIA
from sites_reseau.models import SiteReseau

User = get_user_model()

# ─── USER DEFINITIONS (placeholder data — ne pas utiliser en prod) ───
USERS = [
    ("admin", "systeme", "ADMIN"),
    ("superviseur", "un", "SUPERVISEUR"),
    ("ingenieur", "alpha", "INGENIEUR_RESEAUX"),
    ("ingenieur", "beta", "INGENIEUR_RESEAUX"),
    ("ingenieur", "gamma", "INGENIEUR_RESEAUX"),
    ("ingenieur", "delta", "INGENIEUR_RESEAUX"),
    ("ingenieur", "epsilon", "INGENIEUR_RESEAUX"),
    ("agent", "alpha", "AGENT_CALL_CENTER"),
    ("agent", "beta", "AGENT_CALL_CENTER"),
    ("agent", "gamma", "AGENT_CALL_CENTER"),
    ("agent", "delta", "AGENT_CALL_CENTER"),
    ("agent", "epsilon", "AGENT_CALL_CENTER"),
]

COMMON_PASSWORD = config('SEED_PASSWORD', default='change-me')

# ─── 80 CLIENT NAMES ───
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

# ─── 50+ KEYWORDS (grouped by category) ───
MOTS_CLES = [
    # Signal / Connexion
    "perte signal, zone rurale",
    "coupure frequente, instabilite reseau",
    "signal faible, appartement",
    "signal varie, instable",
    "zone morte, aucun reseau possible",
    "pas de signal depuis hier",
    "deconnexion repetee, soiree",
    "connexion intermitente, zone urbaine",
    # Debit / Performance
    "debit lent, navigation difficile",
    "lenteur navigation, videos bloquent",
    "debit tres faible soir",
    "latence elevee, gaming impossible",
    "debit montant faible, uploads impossible",
    "surcharge cellule, heure pointe",
    "depassement quota data, forfait epuise",
    # Pannes
    "panne totale, plus de service",
    "panne internet, urgence",
    "panne site cellulaire, antenne tombee",
    "panne equipement BTS, alimentation",
    "coupure jour, pas de service",
    "coupure frequente matin et soir",
    "coupure electrique, pas de backup",
    "coupure 5G, retrogradation 4G",
    # Appels
    "reseau indisponible, appel echoue",
    "mauvaise qualite appel, gresillement",
    "appels coupent sans raison",
    "taux rejet appels eleve",
    "aucun reseau, telephone muet",
    # Infrastructure
    "cable coupe, intemperies",
    "fibre optique coupe, chantier",
    "defaut alimentation site, batterie",
    "temperature elevee equipement, surchauffe",
    "humidite intrusion armoire, corrosion",
    "vent fort, antenne destabilisee",
    "pluie intense, deterioration cablage",
    # Technique
    "reseau 3G perdu, que 2G",
    "probleme 4G, que Edge",
    "panne internet, urgence",
    "mise a jour logiciel echouee",
    "erreur config site, parametre incorrect",
    "conflit adresse IP, reseau local",
    "interference frequences, bruit radio",
    "handechec, bascule reseau echoue",
    # Client / Facturation
    "fraude detection, ligne compromise",
    "client insatisfait, retard traitement",
    "demande remboursement, facturation erreur",
    "changement forfait, delai traitement",
    "activation ligne, delai anormal",
    "portabilite numero, echec transfert",
]

# ─── 25 DETAILED DESCRIPTION TEMPLATES ───
DESCRIPTIONS = [
    "Le client {nom} ({tel}) signale des pertes de signal repetees dans la zone de {commune}, wilaya de {wilaya}. Les problemes sont survenus pour la premiere fois il y a {jours} jours et se sont intensifies recemment. Le client utilise un forfait {type_forfait} et a {nb_reclamations} precedent(s) de meme type. Le site {site_code} ({techno}) dessert cette zone. Symptomes : {keywords}.",
    "Coupure frequente du service signalee par {nom} ({tel}). Les deconnexions surviennent principalement en soiree entre 18h et 22h, affectant a la fois les appels et la data. Le client reside dans la commune de {commune}, wilaya de {wilaya}. Le site {site_code} ({techno}) montre des signaux de surcharge. Priorite : {priorite}.",
    "Debit internet extremement lent depuis {jours} jours selon {nom} ({tel}). Le client ne peut plus naviguer correctement ni regarder des videos. La zone concernee est {commune}, {wilaya}. Les tests montrent un debit inferieur a 1 Mbps sur le site {site_code}. Le client est en forfait {type_forfait}.",
    "Panne totale du service. Le client {nom} ({tel}) n'a plus aucun signal depuis {jours} jours. Le telephone affiche 'Aucun reseau' et ne capte meme plus les ondes 2G. Le client est dans la commune de {commune}, wilaya de {wilaya}. Le site {site_code} ({techno}) est en panne complete.",
    "Reseau indisponible dans le quartier de {commune}. Plusieurs clients sont受影响, dont {nom} ({tel}). Les appels echouent systematiquement avec le message 'Reseau non disponible'. Le probleme est lie a une panne du site {site_code} ({techno}). Date de debut : il y a {jours} jours.",
    "Connexion intermitente depuis {jours} jours. {nom} ({tel}) rapporte que le signal apparait et disparait regulierement, rendant tout usage du telephone impossible. La zone de {commune}, {wilaya} est affectee. Le site {site_code} ({techno}) semble en mode degradé.",
    "Cable principal endommage suite aux intemperies de la semaine derniere. {nom} ({tel}) signale que la connexion du site {site_code} ({techno}) a ete coupee par des travaux de voirie dans la commune de {commune}. Le client utilise le forfait {type_forfait} et n'a plus de service.",
    "Deconnexions repetees chaque soir entre 19h et 23h. {nom} ({tel}) ne parvient pas a maintenir une connexion stable. Le probleme est present depuis {jours} jours dans la wilaya de {wilaya}, commune de {commune}. Le site {site_code} ({techno}) est soupconne de surcharge.",
    "Signal tres faible a l'interieur de l'appartement. {nom} ({tel}) doit sortir dans la rue pour passer un appel. Le batiment est situe a {commune}, {wilaya}. Le site {site_code} ({techno}) couvre mal cette zone. Le client a deja signale ce probleme {nb_reclamations} fois.",
    "Coupure totale pendant la journee. {nom} ({tel}) a perdu le service pendant {jours} heures consecutives. Le site {site_code} ({techno}) de {commune}, {wilaya} etait en panne. Le client a ete oblige de se connecter au wifi pour maintenir ses communications.",
    "Mauvaise qualite d'appel avec gresillement continu. {nom} ({tel}) ne parvient pas a mener une conversation normale sur le site {site_code} ({techno}). Le probleme est dans la zone de {commune}, {wilaya}. Le client utilise le forfait {type_forfait}.",
    "Lenteur extreme de navigation, les videos ne se chargent plus et les pages mettent plus de 30 secondes a s'afficher. {nom} ({tel}) utilise le reseau {techno} depuis {jours} jours a {commune}, {wilaya}. Le site {site_code} montre des metriques de performance dgrades.",
    "Panne internet en cours. {nom} ({tel}) demande une intervention urgente. Le service est completement indisponible a {commune}, {wilaya} depuis {jours} jours. Le site {site_code} ({techno}) ne repond plus aux commandes de supervision.",
    "Aucun reseau detecte sur le telephone de {nom} ({tel}). L'appareil affiche 'telephone muet' depuis {jours} jours. Le client reside a {commune}, {wilaya}. Le site {site_code} ({techno}) est hors service. Le client a {nb_reclamations} reclamations precedentes sur ce sujet.",
    "Le reseau est passe de {techno} a 3G/2G de maniere permanente. {nom} ({tel}) constate une degradation importante du service a {commune}, {wilaya}. Le site {site_code} ne supporte plus la {techno}. Le client est en forfait {type_forfait} et paie pour un service qu'il ne recoit pas.",
    "Probleme de synchronisation du site {site_code}. L'antenne {techno} ne fonctionne plus depuis {jours} jours. {nom} ({tel}) signale des coupures temporaires a {commune}, {wilaya}. Les autres sites voisins fonctionnent normalement.",
    "Intemperies severes endommageant l'infrastructure du site {site_code} ({techno}). {nom} ({tel}) rapporte des pertes de signal pendant les orages depuis {jours} jours. La zone de {commune}, {wilaya} est particulierement affectee.",
    "Alimentation electrique du site {site_code} ({techno}) interrompue depuis {jours} jours. {nom} ({tel}) signale une panne generalisee dans la commune de {commune}, wilaya de {wilaya}. Le backup batterie est epuise.",
    "Mise a jour logiciel du site {site_code} ({techno}) en cours d'execution. {nom} ({tel}) signale des coupures temporaires a {commune}, {wilaya}. La maintenance devrait durer {jours} jours supplementaires.",
    "Depassement de quota de donnees mobiles. {nom} ({tel}) utilise le forfait {type_forfait} et a atteint la limite mensuelle. Le client se trouve a {commune}, {wilaya}, site {site_code} ({techno}). Le debit est reduit a 128 Kbps.",
    "Detection de fraude sur la ligne de {nom} ({tel}). La ligne a ete compromise et des appels non autorises ont ete effectues depuis {commune}, {wilaya}. Le client nie et demande une investigation sur le site {site_code} ({techno}).",
    "Client tres insatisfait du traitement de sa reclamation. {nom} ({tel}) attend une reponse depuis {jours} jours pour un probleme de facturation sur son forfait {type_forfait}. Le service client a ete contacte {nb_reclamations} fois sans resolution.",
    "Demande de remboursement pour une facturation erronee. {nom} ({tel}) a ete facture {montant} DA pour des services non utilises sur le site {site_code} ({techno}) a {commune}, {wilaya}. Le client utilise le forfait {type_forfait} depuis {jours} mois.",
    "Activation de ligne en cours depuis {jours} jours. {nom} ({tel}) a souscrit a un forfait {type_forfait} mais la ligne n'est toujours pas active. Le client se trouve a {commune}, {wilaya}, zone couverte par le site {site_code} ({techno}).",
    "Portabilite de numero en echec. {nom} ({tel}) souhaite transferer son numero vers Djezzy mais l'operation a echoue {nb_reclamations} fois. Le client se trouve a {commune}, {wilaya}, site {site_code} ({techno}). Delai normal : 48h. Delai ecoule : {jours} jours.",
]


class Command(BaseCommand):
    help = "Seed complet: 12 users, 650 tickets sur 3 mois, rapports IA"

    def handle(self, *args, **options):
        now = timezone.now()
        random.seed(42)

        self.stdout.write(self.style.HTTP_INFO("=== SEED ALL DATA ==="))

        # ─── Step 1: Delete all data ───
        self.stdout.write("\n[1/5] Suppression des donnees...")
        CommentaireTicket.objects.all().delete()
        count_r = Reclamation.objects.all().delete()
        count_p = RapportIA.objects.all().delete()
        self.stdout.write(f"  Reclamations: {count_r}, Rapports IA: {count_p}")

        users_before = User.objects.count()
        User.objects.all().delete()
        users_after = User.objects.count()
        self.stdout.write(f"  Users: {users_before} -> {users_after} (tous supprimes)")

        # ─── Step 2: Create users ───
        self.stdout.write("\n[2/5] Creation des 12 utilisateurs...")
        created_users = {}
        from django.db import connection

        admin_first, admin_last, admin_role = USERS[0]
        admin_email = "admin@exemple.com"
        admin_user = User.objects.create_superuser(
            username=admin_email, email=admin_email, password=COMMON_PASSWORD,
            first_name=' '.join(w.capitalize() for w in admin_first.split()),
            last_name=' '.join(w.capitalize() for w in admin_last.split()),
            role=admin_role, is_active=True,
        )
        try:
            with connection.cursor() as cursor:
                cursor.execute("UPDATE accounts_customuser SET sexe = %s WHERE id = %s", ['Homme', admin_user.id])
        except Exception:
            pass
        created_users[admin_role] = [admin_user]
        self.stdout.write(f"  {admin_user.code_user} - {admin_user.first_name} {admin_user.last_name} ({admin_role}) [SUPERUSER]")

        for first_name, last_name, role in USERS[1:]:
            first_clean = first_name.split()[0].lower()
            last_clean = last_name.lower()
            email = f"{first_clean}.{last_clean}@exemple.com" if last_clean else f"{first_clean}@exemple.com"
            user = User.objects.create_user(
                username=email, email=email, password=COMMON_PASSWORD,
                first_name=' '.join(w.capitalize() for w in first_name.split()),
                last_name=' '.join(w.capitalize() for w in last_name.split()),
                role=role, is_active=True,
            )
            try:
                with connection.cursor() as cursor:
                    cursor.execute("UPDATE accounts_customuser SET sexe = %s WHERE id = %s",
                        ['Homme' if first_name not in ('amel', 'soundous', 'bouchra', 'malak', 'manel') else 'Femme', user.id])
            except Exception:
                pass
            created_users[role] = created_users.get(role, [])
            created_users[role].append(user)
            self.stdout.write(f"  {user.code_user} - {user.first_name} {user.last_name} ({role})")

        admin_user = created_users["ADMIN"][0]
        superviseur_user = created_users["SUPERVISEUR"][0]
        ingenieurs = created_users.get("INGENIEUR_RESEAUX", [])
        agents_cc = created_users.get("AGENT_CALL_CENTER", [])

        self.stdout.write(f"\n  Admin: 1, Superviseur: 1, Ingenieurs: {len(ingenieurs)}, Agents CC: {len(agents_cc)}")

        # ─── Step 3: Create 650 tickets over 3 months ───
        self.stdout.write("\n[3/5] Creation de 650 reclamations sur 3 mois...")
        sites = list(SiteReseau.objects.all())
        if not sites:
            self.stdout.write(self.style.ERROR("Aucun site trouve dans la base."))
            return

        # Distribution over 90 days
        # 120 FERME (never opened, no engineer)
        # 130 OUVERT (opened by engineer, assigned, in progress)
        # 200 RESOLU recent (resolved < 30 days)
        # 100 RESOLU old (resolved > 30 days -> will be auto-archived)
        # 100 ARCHIVED (resolved > 30 days, manually set as archived)
        DISTRIBUTION = {
            "ferme": 150,
            "ouvert": 150,
            "resolu_recent": 220,
            "resolu_old": 130,
        }

        all_tickets = []
        ticket_num = 0

        def random_date(days_max=90):
            jours = random.randint(0, days_max)
            base = now - timedelta(days=jours)
            h = random.choices(
                [random.randint(8, 12), random.randint(14, 18), random.randint(9, 17), random.randint(0, 23)],
                weights=[0.35, 0.30, 0.20, 0.15]
            )[0]
            return base.replace(hour=h, minute=random.randint(0, 59), second=random.randint(0, 59), microsecond=0)

        def make_ticket(statut, cc_agent, ing=None, jours_max=90, resolu_old=False):
            nonlocal ticket_num
            ticket_num += 1
            cree = random_date(jours_max)
            priorite = random.choices(
                ["basse", "normale", "haute", "critique"],
                weights=[0.20, 0.40, 0.25, 0.15]
            )[0]
            type_client = random.choices(
                ["particulier", "entreprise"],
                weights=[0.70, 0.30]
            )[0]
            site = random.choice(sites)
            nom_client = random.choice(NOMS_CLIENTS)
            telephone = f"0{random.choice([5,6,7,8])}{random.randint(10,99)}{random.randint(10,99)}{random.randint(10,99)}{random.randint(10,99)}"
            email = f"{nom_client.lower().replace(' ', '.')}@gmail.com"
            mots_cles = random.choice(MOTS_CLES)
            desc_template = random.choice(DESCRIPTIONS)

            jours_aleatoire = random.randint(1, 30)
            type_forfait = random.choice(["Essentiel", "Premium", "Business", "Illimite", "Data+"]
                + (["5G Pro"] if site.technologie == "5G" else []))

            try:
                desc = desc_template.format(
                    nom=nom_client, tel=telephone, wilaya=site.wilaya,
                    commune=site.commune, jours=jours_aleatoire,
                    type_forfait=type_forfait,
                    nb_reclamations=random.randint(0, 5),
                    techno=site.technologie, site_code=site.codeSite,
                    priorite=priorite, keywords=mots_cles,
                    montant=random.randint(500, 15000),
                )
            except KeyError:
                desc = f"{nom_client} ({telephone}) a signale un probleme de type '{mots_cles}' sur le site {site.codeSite} ({site.technologie}) a {site.commune}, {site.wilaya}. Priorite: {priorite}."

            resolu_le = None
            updated = cree

            if statut == "resolu":
                delay = random.randint(15, 2880)
                resolu_le = cree + timedelta(minutes=delay)
                updated = resolu_le
                if resolu_old:
                    old_days = random.randint(31, 85)
                    resolu_le = now - timedelta(days=old_days)
                    resolu_le = resolu_le.replace(hour=random.randint(8, 18), minute=random.randint(0, 59))
                    updated = resolu_le

            fields = dict(
                numero_ticket=f"TK{ticket_num:06d}",
                nom_client=nom_client,
                telephone_client=telephone,
                email_client=email,
                type_client=type_client,
                site=site,
                mots_cles_ia=mots_cles,
                description=desc,
                priorite=priorite,
                statut=statut,
                cree_par=cc_agent,
                assigne_a=ing if statut in ("ouvert", "resolu") else None,
            )
            dates = dict(created_at=cree, updated_at=updated, resolu_le=resolu_le)
            return (fields, dates)

        # FERME: 150 tickets, created by agents, no engineer assigned
        self.stdout.write("  150 ferme (jamais ouverts)...")
        for _ in range(DISTRIBUTION["ferme"]):
            cc = random.choice(agents_cc)
            all_tickets.append(make_ticket("ferme", cc, ing=None, jours_max=90))

        # OUVERT: 150 tickets, opened+assigned by engineers
        self.stdout.write("  150 ouvert (en cours)...")
        for _ in range(DISTRIBUTION["ouvert"]):
            cc = random.choice(agents_cc)
            ing = random.choice(ingenieurs)
            all_tickets.append(make_ticket("ouvert", cc, ing=ing, jours_max=60))

        # RESOLU recent: 220 tickets resolved < 30 days
        self.stdout.write("  220 resolu (recent, < 30j)...")
        for _ in range(DISTRIBUTION["resolu_recent"]):
            cc = random.choice(agents_cc)
            ing = random.choice(ingenieurs)
            all_tickets.append(make_ticket("resolu", cc, ing=ing, jours_max=60, resolu_old=False))

        # RESOLU old: 130 tickets resolved > 30 days
        self.stdout.write("  130 resolu (ancien, > 30j)...")
        for _ in range(DISTRIBUTION["resolu_old"]):
            cc = random.choice(agents_cc)
            ing = random.choice(ingenieurs)
            all_tickets.append(make_ticket("resolu", cc, ing=ing, jours_max=60, resolu_old=True))

        all_tickets.sort(key=lambda x: x[1]["created_at"])

        reclamations = []
        for idx, (fields, _dates) in enumerate(all_tickets):
            fields["numero_ticket"] = f"TK{idx + 1:06d}"
            reclamations.append(Reclamation(**fields))

        Reclamation.objects.bulk_create(reclamations)
        self.stdout.write(f"  {len(reclamations)} reclamations creees")

        self.stdout.write("  Mise a jour des dates...")
        for fields, dates in all_tickets:
            tn = fields["numero_ticket"]
            Reclamation.objects.filter(numero_ticket=tn).update(
                created_at=dates["created_at"],
                updated_at=dates["updated_at"],
                resolu_le=dates["resolu_le"],
            )

        # ─── Step 4: Create rapports IA spread over 6 months (local templates) ───
        self.stdout.write("\n[4/5] Creation de 8 rapports IA sur 6 mois (local)...")

        from dashboard.rapport_services import generer_rapport_local

        report_data = [
            ("Rapport hebdomadaire - Performance reseau Alger", "Analyser la performance du reseau dans la wilaya d'Alger pour la semaine", -7, 0),
            ("Analyse des pannes - Wilaya de Oran", "Lister et categoriser toutes les pannes survenues dans la wilaya d'Oran", -30, -7),
            ("Bilan mensuel - Satisfaction client", "Evaluer la satisfaction client basee sur les reclamations du mois", -60, -30),
            ("Synthese des reclamations - Zone Est", "Synthetiser les reclamations de la zone Est et identifier les tendances", -90, -60),
            ("Rapport trimestriel - Infrastructure 5G", "Analyser l'etat de l'infrastructure 5G et les zones a risque", -120, -30),
            ("Performance ingenieurs - T1 2026", "Evaluer les performances des ingenieurs reseaux sur le trimestre", -150, -60),
            ("Analyse comparative - Alger vs Oran", "Comparer les metriques de performance entre Alger et Oran", -180, -90),
            ("Rapport annuel - Bilan 2025", "Bilan complet de l'annee 2025 avec KPI et recommandations", -365, -180),
        ]

        for title, prompt, days_start, days_end in report_data:
            debut = now + timedelta(days=days_start)
            fin = now + timedelta(days=days_end)
            created = debut - timedelta(days=random.randint(1, 5))

            self.stdout.write(f"  {title} ... ", ending="")
            contenu = generer_rapport_local(prompt, debut.date(), fin.date())

            r = RapportIA(
                titre=title,
                prompt=prompt,
                contenu=contenu,
                date_debut=debut.date(),
                date_fin=fin.date(),
                cree_par=superviseur_user,
            )
            r.save()
            RapportIA.objects.filter(id=r.id).update(created_at=created)
            self.stdout.write(self.style.SUCCESS("OK"))

        # ─── Verification ───
        from django.db.models import Count, Q
        stats = Reclamation.objects.aggregate(
            total=Count("id"),
            ouverts=Count("id", filter=Q(statut="ouvert")),
            resolus=Count("id", filter=Q(statut="resolu")),
            fermes=Count("id", filter=Q(statut="ferme")),
            archives=Count("id", filter=Q(is_archived=True)),
        )
        self.stdout.write(f"\n=== STATISTIQUES ===")
        self.stdout.write(f"  Users: {User.objects.count()} (hors superuser)")
        self.stdout.write(f"  Reclamations: {stats['total']}")
        self.stdout.write(f"    Ouvertes: {stats['ouverts']}")
        self.stdout.write(f"    Resolues: {stats['resolus']}")
        self.stdout.write(f"    Fermees: {stats['fermes']}")
        self.stdout.write(f"    Archivees: {stats['archives']}")
        self.stdout.write(f"  Rapports IA: {RapportIA.objects.count()}")

        self.stdout.write(f"\n  Par ingenieur:")
        for ing in ingenieurs:
            n = Reclamation.objects.filter(assigne_a=ing).count()
            self.stdout.write(f"    {ing.code_user} ({ing.first_name}): {n} tickets assigns")

        self.stdout.write(f"\n  Par agent CC:")
        for agent in agents_cc:
            n = Reclamation.objects.filter(cree_par=agent).count()
            self.stdout.write(f"    {agent.code_user} ({agent.first_name}): {n} tickets crees")

        self.stdout.write(self.style.SUCCESS(f"\nSeed termine!"))
        self.stdout.write(f"  Login: email + mot de passe '{COMMON_PASSWORD}'")
