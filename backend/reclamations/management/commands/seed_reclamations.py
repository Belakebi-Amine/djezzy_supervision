import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from reclamations.models import Reclamation, CommentaireTicket
from sites_reseau.models import SiteReseau
from accounts.models import Role
from django.db.models import F

User = get_user_model()

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
    "Aicha Boukhari", "Louisa Bendaoud",
]

MOTS_CLES = [
    "perte signal, zone rurale", "coupure frequente, instabilite reseau",
    "debit lent, navigation difficile", "panne totale, plus de service",
    "reseau indisponible, appel echoue", "connexion intermitente, zone urbaine",
    "cable coupe, intemperies", "deconnexion repetee, soiree",
    "signal faible, appartement", "coupure jour, pas de service",
    "mauvaise qualite appel, grésillement", "lenteur navigation, videos bloquent",
    "panne internet, urgence", "aucun reseau, telephone muet",
    "reseau 3G perdu, que 2G", "coupure frequente matin et soir",
    "pas de signal depuis hier", "debit tres faible soir",
    "zone morte, aucun reseau possible", "appels coupent sans raison",
    "probleme 4G, que Edge", "signal varie, instable",
]

DESCRIPTIONS = [
    "Le client signale des pertes de signal repetees dans sa zone.",
    "Coupure frequente du service, surtout en soiree.",
    "Debit internet tres lent depuis plusieurs jours.",
    "Panne totale du service. Le client n'a plus aucun signal.",
    "Reseau indisponible dans le quartier.",
    "Connexion intermitente depuis une semaine.",
    "Cable endommage suite aux intemperies.",
    "Deconnexions repetees chaque soir entre 18h et 22h.",
    "Signal tres faible a l'interieur de l'appartement.",
    "Coupure totale pendant la journee.",
]


class Command(BaseCommand):
    help = "Seed: 50 ouvert, 20 resolu, 30 ferme. 4 ingenieurs."

    def handle(self, *args, **options):
        now = timezone.now()
        cc_agents = list(User.objects.filter(role=Role.AGENT_CALL_CENTER, is_active=True).order_by("id"))
        ingenieurs = list(User.objects.filter(role=Role.INGENIEUR_RESEAUX, is_active=True).order_by("id"))
        sites = list(SiteReseau.objects.all())

        if not cc_agents:
            self.stdout.write(self.style.ERROR("Aucun agent CC trouve"))
            return
        if not sites:
            self.stdout.write(self.style.ERROR("Aucun site trouve"))
            return

        # Creer les 2 nouveaux ingenieurs si absents
        nouveaux_ing = [
            ("Manel", "Gridi", "manelgridi@gmail.com"),
            ("Manel", "Belakebi", "manelbelakebi@gmail.com"),
        ]
        for first, last, email in nouveaux_ing:
            existants = User.objects.filter(email=email)
            if not existants:
                user = User.objects.create(
                    first_name=first,
                    last_name=last,
                    email=email,
                    role=Role.INGENIEUR_RESEAUX,
                    is_active=True,
                )
                ingenieurs.append(user)
                self.stdout.write(f"  Ingenieur cree: {user.code_user} - {first} {last}")
            else:
                u = existants.first()
                if u not in ingenieurs:
                    ingenieurs.append(u)

        ingenieurs.sort(key=lambda u: u.id)

        if len(ingenieurs) < 4:
            self.stdout.write(self.style.ERROR(f"Moins de 4 ingenieurs (trouve={len(ingenieurs)})"))
            return

        # Passwords
        common_pwd = "password123"
        for agent in cc_agents + ingenieurs:
            agent.set_password(common_pwd)
            agent.save(update_fields=["password"])
        self.stdout.write(f"  Mots de passe synchronises")

        # Delete old
        CommentaireTicket.objects.all().delete()
        Reclamation.objects.all().delete()
        self.stdout.write("  Anciennes donnees supprimees")

        random.seed(42)

        # Collect ticket data separately: (fields dict, date_data)
        # date_data = (created_at, resolu_le, updated_at)
        tickets_data = []
        ticket_num = 0

        def random_date(days_max=89):
            jours = random.randint(0, days_max)
            base = now - timedelta(days=jours)
            h = random.choices(
                [random.randint(8, 12), random.randint(14, 18), random.randint(9, 17), random.randint(0, 23)],
                weights=[0.35, 0.30, 0.20, 0.15]
            )[0]
            return base.replace(hour=h, minute=random.randint(0, 59), second=random.randint(0, 59), microsecond=0)

        def make_ticket_data(statut, cc_agent, ing=None, jours_max=89):
            nonlocal ticket_num
            ticket_num += 1
            cree = random_date(jours_max)
            priorite = random.choices(
                ["basse", "normale", "haute", "critique"],
                weights=[0.15, 0.40, 0.30, 0.15]
            )[0]
            site = random.choice(sites)
            nom_client = random.choice(NOMS_CLIENTS)
            telephone = f"0{random.choice([5,6,7])}{random.randint(10,99)}{random.randint(10,99)}{random.randint(10,99)}{random.randint(10,99)}"
            email = f"{nom_client.lower().replace(' ', '.')}@gmail.com"
            type_client = random.choice(["particulier", "entreprise"])
            mots_cles = random.choice(MOTS_CLES)
            desc = random.choice(DESCRIPTIONS)

            resolu_le = None
            updated = cree
            if statut == "resolu":
                delay = random.randint(30, 1440)
                resolu_le = cree + timedelta(minutes=delay)
                updated = resolu_le
            elif statut == "ferme":
                delay = random.randint(30, 720)
                resolu_le = cree + timedelta(minutes=delay)
                updated = resolu_le

            fields = dict(
                numero_ticket=f"TK{ticket_num:04d}",
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
                assigne_a=ing,
            )
            dates = dict(created_at=cree, updated_at=updated, resolu_le=resolu_le)
            return (fields, dates)

        # 30 FERME (assigne_a=None)
        self.stdout.write("  30 ferme...")
        for i in range(30):
            cc = random.choice(cc_agents)
            tickets_data.append(make_ticket_data("ferme", cc, ing=None, jours_max=89))

        # 20 RESOLU (repartis aleatoirement entre les 4 ingenieurs)
        self.stdout.write("  20 resolu...")
        for i in range(20):
            cc = random.choice(cc_agents)
            ing = random.choice(ingenieurs)
            tickets_data.append(make_ticket_data("resolu", cc, ing=ing, jours_max=89))

        # 50 OUVERT (repartis aleatoirement entre les 4 ingenieurs)
        self.stdout.write("  50 ouvert...")
        for i in range(50):
            cc = random.choice(cc_agents)
            ing = random.choice(ingenieurs)
            tickets_data.append(make_ticket_data("ouvert", cc, ing=ing, jours_max=89))

        # Sort by created_at for sequential numbering
        tickets_data.sort(key=lambda x: x[1]["created_at"])

        # Step 1: bulk_create WITHOUT dates (auto_now_add will set created_at=now)
        reclamations = []
        for idx, (fields, _dates) in enumerate(tickets_data):
            fields["numero_ticket"] = f"TK{idx + 1:03d}"
            reclamations.append(Reclamation(**fields))

        Reclamation.objects.bulk_create(reclamations)
        self.stdout.write(f"  {len(reclamations)} reclamations creees")

        # Step 2: update dates via numero_ticket (bypass auto_now)
        self.stdout.write("  Mise a jour des dates...")
        for fields, dates in tickets_data:
            tn = fields["numero_ticket"]
            Reclamation.objects.filter(numero_ticket=tn).update(
                created_at=dates["created_at"],
                updated_at=dates["updated_at"],
                resolu_le=dates["resolu_le"],
            )

        # Verify
        from django.db.models import Count, Q, Avg, F
        stats = Reclamation.objects.aggregate(
            total=Count("id"),
            ouverts=Count("id", filter=Q(statut="ouvert")),
            resolus=Count("id", filter=Q(statut="resolu")),
            fermes=Count("id", filter=Q(statut="ferme")),
        )
        self.stdout.write(f"  Total={stats['total']} O={stats['ouverts']} R={stats['resolus']} F={stats['fermes']}")
        for ing in ingenieurs:
            n = Reclamation.objects.filter(assigne_a=ing).count()
            self.stdout.write(f"  {ing.code_user}: {n} assignes")

        # Verify dates
        rs = Reclamation.objects.filter(statut="resolu")[:3]
        ok = True
        for r in rs:
            if r.resolu_le and r.created_at:
                if r.resolu_le <= r.created_at:
                    ok = False
                    self.stdout.write(self.style.WARNING(f"  {r.numero_ticket}: resolu={r.resolu_le} <= created={r.created_at}"))
        if ok:
            self.stdout.write(self.style.SUCCESS("  Dates OK (resolu > created)"))

        self.stdout.write(self.style.SUCCESS("Termine"))
