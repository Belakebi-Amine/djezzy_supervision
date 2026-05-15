# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class Role(models.TextChoices):
    """
    Ici, je définis les rôles exactement comme ils apparaissent sur mon diagramme.
    Cela me permet de restreindre les accès plus tard dans mon projet.
    """
    ADMIN                 = 'ADMIN',                  'Administrateur'
    INGENIEUR_RESEAUX      = 'INGENIEUR_RESEAUX',      'Ingénieur Réseaux'
    AGENT_CALL_CENTER      = 'AGENT_CALL_CENTER',      'Agent Call Center'
    RESPONSABLE_REPORTING  = 'RESPONSABLE_REPORTING',  'Responsable Reporting'

class CustomUser(AbstractUser):
    """
    Ma classe Utilisateur : c'est le miroir de mon diagramme de classes.
    Je l'ai conçue pour regrouper tous les attributs et méthodes de l'entité Utilisateur.
    """

    # --- ATTRIBUTS DU DIAGRAMME ---
    # id_user    -> j'utilise le champ 'id' auto-incrémenté de Django.
    # nom_user   -> je le gère via une propriété (voir plus bas).
    # email      -> j'utilise le champ 'email' hérité de AbstractUser.
    # motDePasse -> j'utilise le champ 'password' sécurisé de Django.
    
    # Pour le role_user, je crée ce champ avec les choix définis plus haut.
    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.AGENT_CALL_CENTER,
        verbose_name='role_user' 
    )

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    # --- MÉTHODES DU DIAGRAMME ---

    @property
    def nom_user(self):
        """
        Dans mon diagramme, j'ai un attribut 'nom_user'. 
        Ici, je le calcule en combinant le prénom et le nom pour qu'il soit dynamique.
        """
        return self.get_full_name() or self.username

    def sAuthentifier(self) -> bool:
        """
        Cette méthode de mon diagramme vérifie si je peux me connecter.
        Je me base sur le statut 'is_active' de mon compte.
        """
        return self.is_active

    def deconnecter(self) -> None:
        """
        Prévue dans mon schéma, cette action sera déclenchée par mes vues de déconnexion.
        """
        pass

    def modifierMotDePasse(self, ancien: str, nouveau: str) -> bool:
        """
        Je vérifie d'abord si l'ancien mot de passe est correct avant d'enregistrer le nouveau,
        exactement comme je l'ai modélisé.
        """
        if self.check_password(ancien):
            self.set_password(nouveau)
            self.save()
            return True
        return False

    def mettreAJourProfil(self, data: dict) -> None:
        """
        Je reçois un dictionnaire de données et je mets à jour mes informations
        (nom, prénom, email) de manière sécurisée.
        """
        for champ, valeur in data.items():
            if hasattr(self, champ):
                setattr(self, champ, valeur)
        self.save()

    def __str__(self):
        return f"{self.nom_user} ({self.get_role_display()})"