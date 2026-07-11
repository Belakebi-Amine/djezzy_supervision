#!/usr/bin/env python
# manage.py
# ─────────────────────────────────────────────────────────────
# Django management script. Sets up the Python path so that
# apps inside the backend/ directory can import each other,
# then delegates to Django's command-line utilities.
# ─────────────────────────────────────────────────────────────
import os
import sys


def main():
    """Run administrative tasks."""

    # Add backend/ to Python path so apps can cross-import
    # e.g., reclamations can import from sites_reseau
    current_path = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(os.path.join(current_path, 'backend'))

    # Point Django to the settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config.settings')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django introuvable. Verifie ton venv !"
        ) from exc

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
