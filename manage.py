#!/usr/bin/env python
import os
import sys

def main():
    """Tâches administratives Django"""
    
    # ─── CONFIG CHEMINS ───────────────────────────────────────
    # Permet aux apps de s'importer entre elles (ex: reclamations -> sites_reseau)
    current_path = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(os.path.join(current_path, 'backend'))

    # Pointage vers les settings dans le dossier backend
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config.settings')
    # ──────────────────────────────────────────────────────────

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django introuvable. Verifie ton venv !"
        ) from exc
    
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()