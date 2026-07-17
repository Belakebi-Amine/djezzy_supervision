from django.conf import settings
from django.http import HttpResponseForbidden


class AdminIPRestrictionMiddleware:
    """
    Blocks access to /admin/ unless the request comes from
    an IP listed in ALLOWED_ADMIN_IPS.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/admin/'):
            client_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            if not client_ip:
                client_ip = request.META.get('REMOTE_ADDR', '')
            allowed = getattr(settings, 'ALLOWED_ADMIN_IPS', ['127.0.0.1', 'localhost'])
            if client_ip not in allowed:
                return HttpResponseForbidden("Accès admin refusé depuis cette adresse IP.")
        return self.get_response(request)
