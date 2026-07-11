# reclamations/services.py
# ─────────────────────────────────────────────────────────────
# AI service for automatic incident description generation.
# Uses Google's Gemini API to transform quick agent notes
# (keywords taken during a phone call) into a structured
# incident report for the network engineering team.
# ─────────────────────────────────────────────────────────────
import os
from decouple import config
from google import genai


def generer_description_incident_ia(nom_client, telephone_client, mots_cles):
    """
    Transforms quick call center notes into a structured incident report.

    The flow:
    1. Agent takes brief notes during customer call (mots_cles)
    2. On ticket save, this function sends those notes to Gemini
    3. Gemini returns a formatted report with: problem description,
       impact assessment, perceived urgency, and transmission note
    4. The report is stored in the ticket's description field

    If the API key is missing or the call fails, falls back to raw notes.
    """
    api_key = config('GEMINI_API_KEY', default=None)

    if not api_key:
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
