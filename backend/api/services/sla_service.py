from django.utils import timezone
from datetime import timedelta
from typing import Dict, Any, List
from api.models import SLARule, Ticket


class SLAService:
    DEFAULT_RULES = {
        "Critical": {"hours": 2.0, "description": "Immediate critical tier incident response"},
        "High": {"hours": 4.0, "description": "High-priority security breach containment"},
        "Medium": {"hours": 8.0, "description": "Standard business hours investigation"},
        "Low": {"hours": 12.0, "description": "Low-urgency or informational alert"}
    }

    @classmethod
    def seed_default_rules(cls):
        for sev, cfg in cls.DEFAULT_RULES.items():
            SLARule.objects.update_or_create(
                severity=sev,
                defaults={"sla_hours": cfg["hours"], "description": cfg["description"]}
            )

    @classmethod
    def get_all_rules(cls) -> List[Dict[str, Any]]:
        if not SLARule.objects.exists():
            cls.seed_default_rules()
        rules = SLARule.objects.all()
        return [
            {
                "id": r.id,
                "severity": r.severity,
                "sla_hours": r.sla_hours,
                "description": r.description,
                "updated_at": r.updated_at.isoformat()
            }
            for r in rules
        ]

    @classmethod
    def update_rule(cls, severity: str, sla_hours: float, description: str = None) -> SLARule:
        defaults = {"sla_hours": float(sla_hours)}
        if description is not None:
            defaults["description"] = description
        rule, _ = SLARule.objects.update_or_create(
            severity=severity,
            defaults=defaults
        )
        return rule

    @classmethod
    def calculate_deadline(cls, created_at, severity: str, custom_hours: float = None) -> timezone.datetime:
        if custom_hours and float(custom_hours) > 0:
            hours = float(custom_hours)
        else:
            try:
                rule = SLARule.objects.get(severity=severity)
                hours = rule.sla_hours
            except SLARule.DoesNotExist:
                hours = cls.DEFAULT_RULES.get(severity, {}).get("hours", 4.0)

        return created_at + timedelta(hours=hours)

    @staticmethod
    def get_status_from_seconds(remaining_seconds: int, sla_hours: float) -> Dict[str, Any]:
        total_seconds = sla_hours * 3600.0 if sla_hours else 14400.0
        ratio = max(0.0, min(1.0, remaining_seconds / total_seconds)) if total_seconds > 0 else 0.0

        if remaining_seconds <= 0:
            return {"status": "BREACHED", "color": "#ef4444", "label": "SLA Breached"}
        elif ratio <= 0.25:
            return {"status": "CRITICAL", "color": "#dc2626", "label": "Critical Risk (<25% remaining)"}
        elif ratio <= 0.50:
            return {"status": "WARNING", "color": "#f97316", "label": "Approaching SLA (<50% remaining)"}
        else:
            return {"status": "SAFE", "color": "#10b981", "label": "Safe SLA Window"}
