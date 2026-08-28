import numpy as np
import pandas as pd
from django.utils import timezone
from datetime import timedelta
from typing import Dict, Any, List

from api.models import Ticket, Analyst, SLARule
from api.services.ml_service import MLService
from api.services.sla_service import SLAService

CATEGORICAL_VALUES = {
    "Incident_Type": ["Malware", "Phishing", "DDoS", "Ransomware", "Unauthorized Access", "Data Exfiltration"],
    "Source": ["Firewall", "SIEM", "EDR", "Email Gateway", "IDS", "User Report"],
    "Attack_Vector": ["Email", "Network", "Web", "Endpoint", "Credential", "Cloud"],
    "Priority": ["P1", "P2", "P3", "P4"],
    "Time_of_Day": ["Morning", "Afternoon", "Evening", "Night"],
    "Day_of_Week": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
}


class SimulationService:

    @classmethod
    def generate_scenario_tickets(cls, scenario: str = "NORMAL", count: int = 20, clear_existing: bool = True) -> List[Ticket]:
        """
        Generates realistic synthetic cybersecurity tickets tailored to specific test scenarios.
        """
        rng = np.random.default_rng()
        now = timezone.now()

        if clear_existing:
            Ticket.objects.all().delete()

        analysts = list(Analyst.objects.all())
        if not analysts:
            from api.services.queue_service import QueueService
            QueueService.seed_default_analysts()
            analysts = list(Analyst.objects.all())

        analyst_ids = [a.analyst_id for a in analysts]

        # Adjust generation parameters based on scenario
        if scenario == "CRITICAL_SURGE":
            priorities = rng.choice(["P1", "P2", "P3", "P4"], count, p=[0.45, 0.35, 0.15, 0.05])
            threat_scores = np.clip(rng.normal(82, 10, count), 20, 100)
            sla_hours_choices = [2, 4]
            sla_hours_p = [0.6, 0.4]
        elif scenario == "SLA_CRISIS":
            priorities = rng.choice(["P1", "P2", "P3", "P4"], count, p=[0.35, 0.35, 0.20, 0.10])
            threat_scores = np.clip(rng.normal(70, 15, count), 20, 100)
            sla_hours_choices = [2, 4]
            sla_hours_p = [0.7, 0.3]
        elif scenario == "ANALYST_OVERLOAD":
            priorities = rng.choice(["P1", "P2", "P3", "P4"], count, p=[0.20, 0.35, 0.30, 0.15])
            threat_scores = np.clip(rng.normal(58, 18, count), 10, 95)
            sla_hours_choices = [2, 4, 8, 12]
            sla_hours_p = [0.25, 0.35, 0.25, 0.15]
            # Shock analyst workloads (make A01 and A04 heavily overloaded)
            for a in analysts:
                if a.analyst_id in ["A01", "A04"]:
                    a.current_workload = a.maximum_capacity + 2
                else:
                    a.current_workload = max(1, a.maximum_capacity // 4)
                a.save()
        elif scenario == "HEAVY_LOAD":
            count = max(count, 40)
            priorities = rng.choice(["P1", "P2", "P3", "P4"], count, p=[0.25, 0.35, 0.25, 0.15])
            threat_scores = np.clip(rng.normal(60, 20, count), 10, 100)
            sla_hours_choices = [2, 4, 8, 12]
            sla_hours_p = [0.2, 0.4, 0.3, 0.1]
        else:  # NORMAL
            priorities = rng.choice(["P1", "P2", "P3", "P4"], count, p=[0.15, 0.30, 0.35, 0.20])
            threat_scores = np.clip(rng.normal(52, 18, count), 10, 95)
            sla_hours_choices = [2, 4, 8, 12]
            sla_hours_p = [0.2, 0.4, 0.3, 0.1]

        incident_types = rng.choice(CATEGORICAL_VALUES["Incident_Type"], count)
        sources = rng.choice(CATEGORICAL_VALUES["Source"], count)
        vectors = rng.choice(CATEGORICAL_VALUES["Attack_Vector"], count)
        times = rng.choice(CATEGORICAL_VALUES["Time_of_Day"], count)
        days = rng.choice(CATEGORICAL_VALUES["Day_of_Week"], count)
        sla_hours = rng.choice(sla_hours_choices, count, p=sla_hours_p)
        assigned = rng.choice(analyst_ids, count)

        aff_sys = rng.poisson(5, count) + 1
        users = rng.poisson(15, count) + 1
        exp = rng.integers(1, 11, count)
        queue = rng.poisson(12, count)
        avail = rng.integers(1, 8, count)
        hist = rng.poisson(20, count)

        # Batch create ticket records
        tickets_to_create = []
        df_for_ml = []

        for i in range(count):
            t_id = f"INC{i+1:05d}"
            created = now - timedelta(minutes=int(rng.integers(5, 120)))
            sla_h = float(sla_hours[i])
            deadline = created + timedelta(hours=sla_h)

            t_dict = {
                "Ticket_ID": t_id,
                "Incident_Type": incident_types[i],
                "Source": sources[i],
                "Attack_Vector": vectors[i],
                "Priority": priorities[i],
                "Affected_Systems": int(aff_sys[i]),
                "Users_Affected": int(users[i]),
                "Threat_Score": round(float(threat_scores[i]), 1),
                "Analyst_Experience_Years": int(exp[i]),
                "Current_Queue": int(queue[i]),
                "Available_Analysts": int(avail[i]),
                "SLA_Hours": sla_h,
                "Historical_Incidents": int(hist[i]),
                "Time_of_Day": times[i],
                "Day_of_Week": days[i],
                "Assigned_Analyst": assigned[i]
            }
            df_for_ml.append(t_dict)

            ticket_obj = Ticket(
                ticket_id=t_id,
                incident_type=incident_types[i],
                source=sources[i],
                attack_vector=vectors[i],
                priority=priorities[i],
                affected_systems=int(aff_sys[i]),
                users_affected=int(users[i]),
                threat_score=round(float(threat_scores[i]), 1),
                analyst_experience_years=int(exp[i]),
                current_queue=int(queue[i]),
                available_analysts=int(avail[i]),
                sla_hours=sla_h,
                historical_incidents=int(hist[i]),
                time_of_day=times[i],
                day_of_week=days[i],
                assigned_analyst=assigned[i],
                status='OPEN',
                created_at=created,
                deadline=deadline,
                is_active=True
            )
            tickets_to_create.append(ticket_obj)

        # Run baseline ML prediction to calculate initial risk and severity
        ml_service = MLService.get_instance()
        preds_df = ml_service.predict_batch(pd.DataFrame(df_for_ml))

        for i, t in enumerate(tickets_to_create):
            row = preds_df.iloc[i]
            t.predicted_severity = str(row["Predicted_Severity"])
            t.predicted_resolution_hours = float(row["Predicted_Resolution_Hours"])
            t.predicted_queue_delay = float(row["Predicted_Queue_Delay_Minutes"])
            t.predicted_workload = float(row["Predicted_Analyst_Workload"])
            t.sla_breach_probability_before = float(row["SLA_Breach_Probability"])
            t.escalation_priority = str(row["Escalation_Priority"])
            t.original_position = i + 1

        Ticket.objects.bulk_create(tickets_to_create)
        return tickets_to_create

    @classmethod
    def inject_workload_shock(cls, analyst_id: str, new_workload: int) -> Analyst:
        analyst = Analyst.objects.get(analyst_id=analyst_id)
        analyst.current_workload = int(new_workload)
        analyst.save()
        return analyst
