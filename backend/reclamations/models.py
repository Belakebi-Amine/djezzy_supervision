from django.db import models
from django.conf import settings
from django.utils import timezone
from sites_reseau.models import SiteReseau

class Reclamation(models.Model):
    """
    C'est notre modèle principal pour représenter un ticket de réclamation.
    Je l'ai conçu pour gérer automatiquement le cycle de vie d'un incident, 
    de sa création par le Call Center jusqu'à sa résolution par les ingénieurs.
    """

    STATUT_CHOICES = [
        ('ouvert',    'Ouvert'),
        ('en_cours',  'En cours'),
        ('resolu',    'Résolu'),
        ('ferme',     'Fermé'),
    ]

    PRIORITE_CHOICES = [
        ('basse',   'Basse'),
        ('normale', 'Normale'),
        ('haute',   'Haute'),
        ('critique','Critique'),
    ]

    # --- IDENTIFICATION UNIQUE ---
    # Pour le numéro de ticket, je bloque la modification manuelle (editable=False)
    # car nous générons ce code de manière automatique dans la méthode save().
    numero_ticket = models.CharField(max_length=20, unique=True, editable=False)

    # --- DONNÉES DU CLIENT ---
    # J'ai choisi de stocker directement le nom et le téléphone du client ici.
    # Cela simplifie notre base de données et permet à l'IA d'avoir un accès direct 
    # aux coordonnées pour rédiger son rapport d'incident.
    nom_client = models.CharField(max_length=200, verbose_name='Nom du client')
    telephone_client = models.CharField(max_length=20, verbose_name='Téléphone client')

    # --- LIEN AVEC L'INFRASTRUCTURE DJEZZY ---
    # Je lie chaque réclamation à un site réseau de notre table SiteReseau.
    # Si jamais un site est supprimé, je mets ce champ à NULL (on_delete=models.SET_NULL)
    # pour ne pas perdre l'historique du ticket de notre client.
    site = models.ForeignKey(
        SiteReseau,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reclamations',
        verbose_name='Site concerné',
    )

    # --- NOTRE BRIQUE EN INTÉGRATION IA ---
    # C'est le nouveau champ que j'ai ajouté pour l'idée de notre encadrante.
    # L'agent du Call Center va simplement taper ses notes rapides ou mots-clés ici.
    mots_cles_ia = models.CharField(
        max_length=255, 
        blank=True, 
        null=True, 
        verbose_name='Mots-clés pour l\'IA'
    )

    # --- DÉTAILS ET ÉTATS DU TICKET ---
    # J'ai rajouté 'blank=True' sur la description. Comme ça, l'agent peut laisser 
    # ce champ vide au départ, et c'est notre script IA qui viendra injecter 
    # automatiquement le rapport détaillé et structuré à l'intérieur.
    description = models.TextField(verbose_name='Description de l\'incident', blank=True)
    priorite = models.CharField(max_length=10, choices=PRIORITE_CHOICES, default='normale')
    
    # MODIFICATION : Statut mis à 'ferme' par défaut selon tes exigences
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='ferme')

    # --- ACTEURS (Utilisateurs du système) ---
    # Je relie le ticket à l'agent qui l'a créé et à l'ingénieur réseau qui va le traiter.
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reclamations_creees',
        verbose_name='Créé par',
    )
    assigne_a = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reclamations_assignees',
        verbose_name='Assigné à',
    )

    # --- TIMESTAMPS (Suivi des dates) ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolu_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Réclamation'
        verbose_name_plural = 'Réclamations'
        ordering = ['-created_at'] # Je trie pour afficher les tickets les plus récents en premier

    def __str__(self):
        return f"Ticket {self.numero_ticket} — {self.get_statut_display()}"

    def save(self, *args, **kwargs):
        """
        J'ai personnalisé la méthode de sauvegarde pour automatiser deux choses clés :
        l'appel à notre service IA et la génération de l'identifiant unique du ticket.
        """
        # 1. DÉCLENCHEMENT AUTOMATIQUE DE L'IA
        # Si l'agent a tapé des mots-clés mais n'a pas encore rédigé de description,
        # je fais appel à notre fonction IA pour générer le rapport avant l'écriture en base.
        if self.mots_cles_ia and not self.description:
            # J'importe notre service ici pour éviter les conflits d'importation dans Django
            from .services import generer_description_incident_ia
            
            # J'exécute l'appel API en lui passant les infos du ticket actuel
            self.description = generer_description_incident_ia(
                nom_client=self.nom_client,
                telephone_client=self.telephone_client,
                mots_cles=self.mots_cles_ia
            )

        # 2. GÉNÉRATION DU NUMÉRO DE TICKET (Ex: TK202606130001)
        # Si c'est un nouveau ticket, je construis un identifiant unique basé sur la date 
        # du jour et un compteur pour que l'indexation soit propre.
        if not self.numero_ticket:
            prefix = timezone.now().strftime('TK%Y%m%d')
            last_count = Reclamation.objects.filter(numero_ticket__startswith=prefix).count()
            self.numero_ticket = f"{prefix}{str(last_count + 1).zfill(4)}"
        
        # 3. SUIVI DU MOMENT DE RÉSOLUTION
        # Si le statut passe à 'resolu', j'enregistre l'heure exacte à la volée.
        if self.statut == 'resolu' and not self.resolu_le:
            self.resolu_le = timezone.now()
        elif self.statut != 'resolu':
            self.resolu_le = None

        # Pour finir, j'appelle la méthode de base pour enregistrer le tout dans PostgreSQL
        super().save(*args, **kwargs)


class CommentaireTicket(models.Model):
    """
    Nous utilisons ce modèle pour permettre une communication directe sur le ticket.
    J'ai prévu cela pour que les ingénieurs réseau et les agents du Call Center 
    puissent échanger des notes techniques pendant la résolution de la panne.
    """
    reclamation = models.ForeignKey(
        Reclamation,
        on_delete=models.CASCADE,
        related_name='commentaires',
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    contenu = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at'] # Tri par ordre chronologique des discussions

    def __str__(self):
        return f"Commentaire de {self.auteur} sur {self.reclamation}"