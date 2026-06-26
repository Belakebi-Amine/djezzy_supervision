import os
from google import genai


def generer_description_incident_ia(nom_client, telephone_client, mots_cles):
    """
    Transforme les notes rapides prises par l'agent au téléphone
    en un rapport d'incident structuré pour Djezzy, via Gemini.
    """
    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        # Pas de clé configurée : on ne plante pas, on garde les notes brutes.
        return f"[IA non configurée] Notes de l'agent : {mots_cles}"

    try:
        client = genai.Client(api_key=api_key)

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

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text.strip()

    except Exception as e:
        return f"[Génération IA indisponible] Notes de l'agent : {mots_cles} (Erreur : {str(e)})"
