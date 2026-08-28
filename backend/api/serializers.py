from rest_framework import serializers
from api.models import Analyst, SLARule, Ticket, QueueRun, QueueDecision


class AnalystSerializer(serializers.ModelSerializer):
    utilization_pct = serializers.ReadOnlyField()
    capacity_status = serializers.ReadOnlyField()

    class Meta:
        model = Analyst
        fields = [
            'analyst_id', 'name', 'experience_years', 'current_workload',
            'maximum_capacity', 'active_tickets', 'is_available', 'skills',
            'utilization_pct', 'capacity_status', 'created_at', 'updated_at'
        ]


class SLARuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SLARule
        fields = ['id', 'severity', 'sla_hours', 'description', 'updated_at']


class TicketSerializer(serializers.ModelSerializer):
    remaining_seconds = serializers.ReadOnlyField()
    sla_risk_level = serializers.ReadOnlyField()

    class Meta:
        model = Ticket
        fields = '__all__'


class ManualTicketInputSerializer(serializers.Serializer):
    ticket_id = serializers.CharField(required=False, allow_blank=True, default='')
    incident_type = serializers.ChoiceField(
        choices=["Malware", "Phishing", "DDoS", "Ransomware", "Unauthorized Access", "Data Exfiltration"],
        default="Malware"
    )
    source = serializers.ChoiceField(
        choices=["Firewall", "SIEM", "EDR", "Email Gateway", "IDS", "User Report"],
        default="SIEM"
    )
    attack_vector = serializers.ChoiceField(
        choices=["Email", "Network", "Web", "Endpoint", "Credential", "Cloud"],
        default="Endpoint"
    )
    priority = serializers.ChoiceField(choices=["P1", "P2", "P3", "P4"], default="P3")
    affected_systems = serializers.IntegerField(min_value=1, default=5)
    users_affected = serializers.IntegerField(min_value=1, default=15)
    threat_score = serializers.FloatField(min_value=0.0, max_value=100.0, default=50.0)
    analyst_experience_years = serializers.IntegerField(min_value=1, max_value=30, default=3)
    current_queue = serializers.IntegerField(min_value=0, default=10)
    available_analysts = serializers.IntegerField(min_value=1, default=5)
    sla_hours = serializers.FloatField(min_value=0.5, default=4.0)
    historical_incidents = serializers.IntegerField(min_value=0, default=20)
    time_of_day = serializers.ChoiceField(
        choices=["Morning", "Afternoon", "Evening", "Night"],
        default="Morning"
    )
    day_of_week = serializers.ChoiceField(
        choices=["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        default="Mon"
    )
    assigned_analyst = serializers.CharField(required=False, default="A01")
    add_to_queue = serializers.BooleanField(default=True)


class QueueDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueueDecision
        fields = '__all__'


class QueueRunSerializer(serializers.ModelSerializer):
    decisions = QueueDecisionSerializer(many=True, read_only=True)

    class Meta:
        model = QueueRun
        fields = '__all__'
