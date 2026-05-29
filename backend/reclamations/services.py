import os
from google import genai
from google.genai import types

def generer_description_incident_ia(nom_client, telephone_client, mots_cles):
    """
    C'est notre fonction principale pour l'IA. 
    Je l'ai conçue pour récupérer les notes rapides prises par l'agent au téléphone
    et les transformer en un rapport d'incident bien propre pour Djezzy.
    """
    # ─── CONFIGURATION DE LA CLÉ DE TEST ───
    # Pour mes tests immédiats, je remplace "METS_TA_CLE_ICI" par ma vraie clé Gemini (qui commence par AIzaSy...)
    ma_cle_gemini = "AIzaSyBOUnV6YytAAU0NdzKNo4QCUEhY6Z04BXA"
    
    # Si la variable d'environnement n'est pas configurée, j'utilise ma clé de test en dur
    api_key = os.environ.get("GEMINI_API_KEY", ma_cle_gemini)
    
    try:
        # Je configure le client Google. Avec le nouveau SDK google-genai, 
        # si on lui passe api_key=api_key, il faut s'assurer que la syntaxe soit lue nativement.
        client = genai.Client(api_key=api_key)
        
        # C'est ici que je prépare le "prompt". J'ai choisi de donner un rôle précis 
        # à l'IA (expert Djezzy) pour qu'elle adopte le bon ton professionnel.
        # Je lui injecte de manière dynamique les données du client et ses mots-clés.
        prompt = f"""
        Tu es un assistant IA spécialisé dans la gestion du réseau mobile et internet pour l'opérateur Djezzy en Algérie.
        Ton rôle est de transformer des notes rapides prises par un agent du Call Center en un rapport d'incident clair, professionnel et structuré.

        Voici les informations de la réclamation :
        - Nom du Client : {nom_client}
        - Téléphone du Client : {telephone_client}
        - Notes de l'agent (Mots-clés) : {mots_cles}

        Consignes de rédaction :
        - Rédige en français de manière professionnelle et concise.
        - Structure le texte (ex: Description du problème, Impacts, Urgence perçue).
        - N'invente pas d'informations techniques qui ne sont pas suggérées dans les mots-clés.
        - Termine par une conclusion standard sur la transmission du ticket.
        """

        # Nous avons choisi d'utiliser le modèle 'gemini-2.5-flash' parce qu'il est 
        # extrêmement rapide pour le traitement de texte, ce qui évite de faire attendre l'agent.
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        # Je renvoie le résultat généré en nettoyant les espaces inutiles
        return response.text.strip()

    except Exception as e:
        # J'ai rajouté ce bloc de sécurité : si jamais internet coupe ou que l'API bloque,
        # le système ne plante pas. On sauvegarde quand même les mots-clés de l'agent par sécurité.
        return f"[Génération IA indisponible] Notes de l'agent : {mots_cles} (Erreur : {str(e)})"