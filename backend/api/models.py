from django.db import models
from django.utils import timezone
from datetime import timedelta


class Analyst(models.Model):
    analyst_id = models.CharField(max_length=32, primary_key=True)
    name = models.CharField(max_length=100, default='')
    experience_years = models.IntegerField(default=3)
    current_workload = models.IntegerField(default=0)
    maximum_capacity = models.IntegerField(default=10)
    active_tickets = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)
    skills = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['analyst_id']

    def __str__(self):
        return f"{self.analyst_id} - {self.name or 'Analyst'} ({self.experience_years}y Exp, Workload: {self.current_workload}/{self.maximum_capacity})"

    @property
    def utilization_pct(self):
        if self.maximum_capacity <= 0:
            return 0.0
        return round((self.current_workload / self.maximum_capacity) * 100, 1)

    @property
    def capacity_status(self):
        util = self.utilization_pct
        if not self.is_available:
            return "OFFLINE"
        if util >= 90:
            return "OVERLOADED"
        elif util >= 70:
            return "BUSY"
        elif util >= 40:
            return "MODERATE"
        else:
            return "AVAILABLE"


class SLARule(models.Model):
    severity = models.CharField(max_length=20, unique=True)
    sla_hours = models.FloatField(default=4.0)
    description = models.CharField(max_length=255, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['severity']

    def __str__(self):
        return f"{self.severity} SLA: {self.sla_hours}h"


class Ticket(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
        ('ESCALATED', 'Escalated'),
    ]

    ticket_id = models.CharField(max_length=64, unique=True, db_index=True)
    
    # 14 ML Features
    incident_type = models.CharField(max_length=64, default='Malware')
    source = models.CharField(max_length=64, default='SIEM')
    attack_vector = models.CharField(max_length=64, default='Endpoint')
    priority = models.CharField(max_length=16, default='P3')
    affected_systems = models.IntegerField(default=5)
    users_affected = models.IntegerField(default=15)
    threat_score = models.FloatField(default=50.0)
    analyst_experience_years = models.IntegerField(default=3)
    current_queue = models.IntegerField(default=10)
    available_analysts = models.IntegerField(default=5)
    sla_hours = models.FloatField(default=4.0)
    historical_incidents = models.IntegerField(default=20)
    time_of_day = models.CharField(max_length=32, default='Morning')
    day_of_week = models.CharField(max_length=16, default='Mon')

    # Assignment & Lifecycle
    assigned_analyst = models.CharField(max_length=32, default='A01')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    created_at = models.DateTimeField(default=timezone.now)
    deadline = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    # ML Inference & Queue Optimization Outputs
    predicted_severity = models.CharField(max_length=32, blank=True, default='')
    predicted_resolution_hours = models.FloatField(null=True, blank=True)
    predicted_queue_delay = models.FloatField(null=True, blank=True)
    predicted_workload = models.FloatField(null=True, blank=True)
    sla_breach_probability_before = models.FloatField(null=True, blank=True)
    sla_breach_probability_after = models.FloatField(null=True, blank=True)
    recommended_action = models.CharField(max_length=32, blank=True, default='KEEP_CURRENT')
    assigned_analyst_after = models.CharField(max_length=32, blank=True, default='')
    escalation_priority = models.CharField(max_length=16, blank=True, default='P3')
    reason = models.TextField(blank=True, default='')
    original_position = models.IntegerField(null=True, blank=True)
    new_position = models.IntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['new_position', 'original_position', '-created_at']

    def __str__(self):
        return f"{self.ticket_id} ({self.priority} / {self.incident_type} - {self.assigned_analyst})"

    def save(self, *args, **kwargs):
        if not self.deadline and self.created_at and self.sla_hours:
            self.deadline = self.created_at + timedelta(hours=float(self.sla_hours))
        super().save(*args, **kwargs)

    @property
    def remaining_seconds(self):
        if not self.deadline:
            return 0
        now = timezone.now()
        diff = (self.deadline - now).total_seconds()
        return int(diff)

    @property
    def sla_risk_level(self):
        prob = self.sla_breach_probability_after or self.sla_breach_probability_before or 0.0
        if prob >= 70:
            return "Critical Risk"
        elif prob >= 50:
            return "High Risk"
        elif prob >= 25:
            return "Medium Risk"
        else:
            return "Low Risk"


class QueueRun(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    total_tickets = models.IntegerField(default=0)
    high_risk_before = models.IntegerField(default=0)
    high_risk_after = models.IntegerField(default=0)
    expected_breaches_before = models.FloatField(default=0.0)
    expected_breaches_after = models.FloatField(default=0.0)
    breaches_avoided = models.FloatField(default=0.0)
    breach_reduction_pct = models.FloatField(default=0.0)
    average_queue_delay_before = models.FloatField(default=0.0)
    average_queue_delay_after = models.FloatField(default=0.0)
    delay_reduction_pct = models.FloatField(default=0.0)
    number_of_reassignments = models.IntegerField(default=0)
    number_of_escalations = models.IntegerField(default=0)
    number_of_prioritizations = models.IntegerField(default=0)
    number_kept_current = models.IntegerField(default=0)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"QueueRun #{self.id} at {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')} - Breaches Avoided: {self.breaches_avoided}"


class QueueDecision(models.Model):
    queue_run = models.ForeignKey(QueueRun, on_delete=models.CASCADE, related_name='decisions')
    ticket_id = models.CharField(max_length=64)
    old_position = models.IntegerField(default=1)
    new_position = models.IntegerField(default=1)
    old_analyst = models.CharField(max_length=32)
    new_analyst = models.CharField(max_length=32)
    action = models.CharField(max_length=32)
    sla_risk_before = models.FloatField(default=0.0)
    sla_risk_after = models.FloatField(default=0.0)
    reason = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['new_position']

    def __str__(self):
        return f"{self.ticket_id}: {self.action} ({self.old_analyst} -> {self.new_analyst})"
