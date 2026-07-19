"""Middleware d'audit pour mesurer la durée des requêtes HTTP."""

import time
import threading

_local = threading.local()


class AuditTimingMiddleware:
    """Stores request start time so views can measure latency."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request._audit_start = time.time()
        response = self.get_response(request)
        return response
