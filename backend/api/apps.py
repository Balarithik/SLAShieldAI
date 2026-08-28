from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Pre-warm ML models once on server startup
        try:
            from api.services.ml_service import MLService
            MLService.get_instance().warm_up()
        except Exception as e:
            print(f"[ApiConfig] Model warm-up deferred: {e}")
