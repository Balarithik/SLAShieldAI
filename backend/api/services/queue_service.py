import pandas as pd
import numpy as np
from django.db import transaction
from django.utils import timezone
from typing import Dict, Any, List

from api.models import Ticket, Analyst, QueueRun, QueueDecision
from api.services.ml_service import MLService
from queue_optimizer import optimize_queue


class QueueService:

    @staticmethod
    def get_tickets_dataframe(tickets: List[Ticket] = None) -> pd.DataFrame:
        if tickets is None:
            tickets = list(Ticket.objects.filter(is_active=True).exclude(status__in=['RESOLVED', 'CLOSED']))
        
        if not tickets:
            return pd.DataFrame()

        rows = []
        for t in tickets:
            rows.append({
                "Ticket_ID": t.ticket_id,
                "Incident_Type": t.incident_type,
                "Source": t.source,
                "Attack_Vector": t.attack_vector,
                "Priority": t.priority,
                "Affected_Systems": t.affected_systems,
                "Users_Affected": t.users_affected,
                "Threat_Score": t.threat_score,
                "Analyst_Experience_Years": t.analyst_experience_years,
                "Current_Queue": t.current_queue,
                "Available_Analysts": t.available_analysts,
                "SLA_Hours": t.sla_hours,
                "Historical_Incidents": t.historical_incidents,
                "Time_of_Day": t.time_of_day,
                "Day_of_Week": t.day_of_week,
                "Assigned_Analyst": t.assigned_analyst
            })

        return pd.DataFrame(rows)

    @staticmethod
    def get_analysts_dataframe(analysts: List[Analyst] = None) -> pd.DataFrame:
        if analysts is None:
            analysts = list(Analyst.objects.filter(is_available=True))

        if not analysts:
            # Fallback default roster
            analysts = [
                Analyst(analyst_id="A01", experience_years=2, current_workload=8, maximum_capacity=10, active_tickets=4),
                Analyst(analyst_id="A02", experience_years=5, current_workload=5, maximum_capacity=10, active_tickets=3),
                Analyst(analyst_id="A03", experience_years=8, current_workload=3, maximum_capacity=8, active_tickets=2),
                Analyst(analyst_id="A04", experience_years=3, current_workload=9, maximum_capacity=10, active_tickets=5),
                Analyst(analyst_id="A05", experience_years=9, current_workload=2, maximum_capacity=8, active_tickets=1),
            ]

        rows = []
        for a in analysts:
            rows.append({
                "Analyst_ID": a.analyst_id,
                "Experience_Years": a.experience_years,
                "Current_Workload": a.current_workload,
                "Maximum_Capacity": a.maximum_capacity,
                "Active_Tickets": a.active_tickets
            })

        return pd.DataFrame(rows)

    @classmethod
    def run_optimization(cls, weights: Dict[str, float] = None) -> Dict[str, Any]:
        """
        Runs complete AI queue optimization on all active tickets and analysts in DB.
        Persists results and returns unified Before vs After response.
        """
        ml_service = MLService.get_instance()
        models = ml_service.models

        # Fetch current DB records
        active_tickets = list(Ticket.objects.filter(is_active=True).exclude(status__in=['RESOLVED', 'CLOSED']))
        if not active_tickets:
            return {
                "success": False,
                "message": "No active tickets found in queue to optimize.",
                "total_tickets": 0,
                "before_queue": [],
                "after_queue": [],
                "metrics": {}
            }

        analysts = list(Analyst.objects.all())
        if not analysts:
            # Seed default analysts if empty
            cls.seed_default_analysts()
            analysts = list(Analyst.objects.all())

        tickets_df = cls.get_tickets_dataframe(active_tickets)
        analysts_df = cls.get_analysts_dataframe(analysts)

        # Execute existing queue optimizer
        opt_results = optimize_queue(tickets_df, analysts_df, models, weights)
        opt_queue_df = opt_results["optimized_queue"]
        metrics = opt_results["metrics"]

        # Calculate percentage reductions safely
        breaches_before = float(metrics.get("expected_breaches_before", 0.0))
        breaches_after = float(metrics.get("expected_breaches_after", 0.0))
        breaches_avoided = float(metrics.get("breaches_avoided", 0.0))
        breach_reduction_pct = round((breaches_avoided / breaches_before * 100), 2) if breaches_before > 0 else 0.0

        delay_before = float(metrics.get("average_queue_delay_before", 0.0))
        delay_after = float(metrics.get("average_queue_delay_after", 0.0))
        delay_reduction_pct = round(((delay_before - delay_after) / delay_before * 100), 2) if delay_before > 0 else 0.0

        # Atomic persistence of optimization run and ticket updates
        with transaction.atomic():
            queue_run = QueueRun.objects.create(
                total_tickets=len(opt_queue_df),
                high_risk_before=metrics.get("high_risk_before", 0),
                high_risk_after=metrics.get("high_risk_after", 0),
                expected_breaches_before=breaches_before,
                expected_breaches_after=breaches_after,
                breaches_avoided=breaches_avoided,
                breach_reduction_pct=breach_reduction_pct,
                average_queue_delay_before=delay_before,
                average_queue_delay_after=delay_after,
                delay_reduction_pct=delay_reduction_pct,
                number_of_reassignments=metrics.get("number_of_reassignments", 0),
                number_of_escalations=metrics.get("number_of_escalations", 0),
                number_of_prioritizations=metrics.get("number_of_prioritizations", 0),
                number_kept_current=metrics.get("number_kept_current", 0),
            )

            # Map tickets by ID for quick updating
            ticket_map = {t.ticket_id: t for t in active_tickets}
            decisions_to_create = []

            for _, row in opt_queue_df.iterrows():
                t_id = str(row["ticket_id"])
                ticket_obj = ticket_map.get(t_id)
                if not ticket_obj:
                    continue

                ticket_obj.predicted_severity = str(row["predicted_severity"])
                ticket_obj.predicted_resolution_hours = float(row["predicted_resolution_hours"])
                ticket_obj.predicted_queue_delay = float(row["predicted_queue_delay"])
                ticket_obj.sla_breach_probability_before = float(row["sla_breach_probability_before"])
                ticket_obj.sla_breach_probability_after = float(row["sla_breach_probability_after"])
                ticket_obj.recommended_action = str(row["recommended_action"])
                ticket_obj.assigned_analyst_after = str(row["assigned_analyst_after"])
                ticket_obj.escalation_priority = str(row["escalation_priority"])
                ticket_obj.reason = str(row["reason"])
                ticket_obj.original_position = int(row["original_position"])
                ticket_obj.new_position = int(row["new_position"])
                
                # Apply reassignment or escalation to active assigned_analyst if action taken
                if row["recommended_action"] in ["REASSIGN", "ESCALATE"]:
                    ticket_obj.assigned_analyst = str(row["assigned_analyst_after"])
                    if row["recommended_action"] == "ESCALATE":
                        ticket_obj.status = "ESCALATED"

                ticket_obj.save()

                # Build decision log record
                decisions_to_create.append(QueueDecision(
                    queue_run=queue_run,
                    ticket_id=t_id,
                    old_position=int(row["original_position"]),
                    new_position=int(row["new_position"]),
                    old_analyst=str(row["assigned_analyst_before"]),
                    new_analyst=str(row["assigned_analyst_after"]),
                    action=str(row["recommended_action"]),
                    sla_risk_before=float(row["sla_breach_probability_before"]),
                    sla_risk_after=float(row["sla_breach_probability_after"]),
                    reason=str(row["reason"])
                ))

            QueueDecision.objects.bulk_create(decisions_to_create)

            # Update Analyst active ticket counts & workloads
            for analyst in analysts:
                assigned_count = Ticket.objects.filter(
                    is_active=True, 
                    assigned_analyst=analyst.analyst_id
                ).exclude(status__in=['RESOLVED', 'CLOSED']).count()
                analyst.active_tickets = assigned_count
                analyst.save()

        # Build output payloads
        before_queue = []
        for _, row in opt_queue_df.sort_values(by="original_position").iterrows():
            t_id = str(row["ticket_id"])
            t_obj = ticket_map.get(t_id)
            before_queue.append({
                "position": int(row["original_position"]),
                "ticket_id": t_id,
                "incident_type": t_obj.incident_type if t_obj else "Cyber Incident",
                "priority": t_obj.priority if t_obj else "P3",
                "severity": str(row["predicted_severity"]),
                "assigned_analyst": str(row["assigned_analyst_before"]),
                "sla_hours": float(t_obj.sla_hours) if t_obj else 4.0,
                "sla_risk": float(row["sla_breach_probability_before"]),
                "predicted_queue_delay": float(t_obj.predicted_queue_delay or row["predicted_queue_delay"]) if t_obj else float(row["predicted_queue_delay"]),
                "predicted_resolution_hours": float(row["predicted_resolution_hours"]),
                "status": t_obj.status if t_obj else "OPEN",
                "remaining_seconds": t_obj.remaining_seconds if t_obj else 0
            })

        after_queue = []
        for _, row in opt_queue_df.sort_values(by="new_position").iterrows():
            t_id = str(row["ticket_id"])
            t_obj = ticket_map.get(t_id)
            pos_diff = int(row["original_position"]) - int(row["new_position"])
            movement = "KEPT"
            if pos_diff > 0:
                movement = f"UP_{pos_diff}"
            elif pos_diff < 0:
                movement = f"DOWN_{abs(pos_diff)}"

            after_queue.append({
                "position": int(row["new_position"]),
                "original_position": int(row["original_position"]),
                "movement": movement,
                "ticket_id": t_id,
                "incident_type": t_obj.incident_type if t_obj else "Cyber Incident",
                "priority": t_obj.priority if t_obj else "P3",
                "severity": str(row["predicted_severity"]),
                "assigned_analyst_before": str(row["assigned_analyst_before"]),
                "assigned_analyst_after": str(row["assigned_analyst_after"]),
                "action": str(row["recommended_action"]),
                "sla_risk_before": float(row["sla_breach_probability_before"]),
                "sla_risk_after": float(row["sla_breach_probability_after"]),
                "sla_risk_delta": round(float(row["sla_breach_probability_before"]) - float(row["sla_breach_probability_after"]), 2),
                "predicted_queue_delay": float(row["predicted_queue_delay"]),
                "predicted_resolution_hours": float(row["predicted_resolution_hours"]),
                "escalation_priority": str(row["escalation_priority"]),
                "reason": str(row["reason"]),
                "status": t_obj.status if t_obj else "OPEN",
                "remaining_seconds": t_obj.remaining_seconds if t_obj else 0
            })

        return {
            "success": True,
            "run_id": queue_run.id,
            "timestamp": queue_run.timestamp.isoformat(),
            "total_tickets": len(opt_queue_df),
            "metrics": {
                "total_tickets": len(opt_queue_df),
                "expected_breaches_before": breaches_before,
                "expected_breaches_after": breaches_after,
                "breaches_avoided": breaches_avoided,
                "breach_reduction_pct": breach_reduction_pct,
                "average_queue_delay_before": delay_before,
                "average_queue_delay_after": delay_after,
                "delay_reduction_pct": delay_reduction_pct,
                "high_risk_before": metrics.get("high_risk_before", 0),
                "high_risk_after": metrics.get("high_risk_after", 0),
                "reassignments": metrics.get("number_of_reassignments", 0),
                "escalations": metrics.get("number_of_escalations", 0),
                "prioritizations": metrics.get("number_of_prioritizations", 0),
                "kept_current": metrics.get("number_kept_current", 0)
            },
            "before_queue": before_queue,
            "after_queue": after_queue
        }

    @staticmethod
    def seed_default_analysts():
        default_roster = [
            {"analyst_id": "A01", "name": "Sarah Chen", "experience_years": 2, "current_workload": 8, "maximum_capacity": 10, "active_tickets": 4, "skills": ["EDR", "SIEM"]},
            {"analyst_id": "A02", "name": "Marcus Vance", "experience_years": 5, "current_workload": 5, "maximum_capacity": 10, "active_tickets": 3, "skills": ["Malware", "Phishing"]},
            {"analyst_id": "A03", "name": "Elena Rostova", "experience_years": 8, "current_workload": 3, "maximum_capacity": 8, "active_tickets": 2, "skills": ["Threat Hunting", "Forensics"]},
            {"analyst_id": "A04", "name": "Devon Patel", "experience_years": 3, "current_workload": 9, "maximum_capacity": 10, "active_tickets": 5, "skills": ["Network Security", "DDoS"]},
            {"analyst_id": "A05", "name": "Aria Montgomery", "experience_years": 9, "current_workload": 2, "maximum_capacity": 8, "active_tickets": 1, "skills": ["Senior IR", "Ransomware Lead"]},
        ]
        for a in default_roster:
            Analyst.objects.update_or_create(
                analyst_id=a["analyst_id"],
                defaults=a
            )
