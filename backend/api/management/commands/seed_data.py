from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import pandas as pd
import numpy as np

from api.models import Analyst, SLARule, Ticket, QueueRun, QueueDecision
from api.services.queue_service import QueueService
from api.services.sla_service import SLAService
from api.services.ml_service import MLService
from demo_queue import generate_synthetic_inputs


class Command(BaseCommand):
    help = 'Seeds initial analysts, SLA rules, and 20 demo tickets'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting database seeding..."))

        # 1. Seed Analysts
        QueueService.seed_default_analysts()
        self.stdout.write(self.style.SUCCESS(f"Seeded {Analyst.objects.count()} analysts."))

        # 2. Seed SLA Rules
        SLAService.seed_default_rules()
        self.stdout.write(self.style.SUCCESS(f"Seeded {SLARule.objects.count()} SLA rules."))

        # 3. Seed 20 Demo Tickets matching demo_queue.py
        Ticket.objects.all().delete()
        QueueRun.objects.all().delete()
        QueueDecision.objects.all().delete()

        tickets_df, analysts_df = generate_synthetic_inputs()
        now = timezone.now()

        ml_service = MLService.get_instance()
        preds_df = ml_service.predict_batch(tickets_df)

        tickets_to_create = []
        for i, row in tickets_df.iterrows():
            p_row = preds_df.iloc[i]
            sla_h = float(row["SLA_Hours"])
            created = now - timedelta(minutes=(len(tickets_df) - i) * 8)
            deadline = created + timedelta(hours=sla_h)

            t = Ticket(
                ticket_id=str(row["Incident_ID"]),
                incident_type=str(row["Incident_Type"]),
                source=str(row["Source"]),
                attack_vector=str(row["Attack_Vector"]),
                priority=str(row["Priority"]),
                affected_systems=int(row["Affected_Systems"]),
                users_affected=int(row["Users_Affected"]),
                threat_score=float(row["Threat_Score"]),
                analyst_experience_years=int(row["Analyst_Experience_Years"]),
                current_queue=int(row["Current_Queue"]),
                available_analysts=int(row["Available_Analysts"]),
                sla_hours=sla_h,
                historical_incidents=int(row["Historical_Incidents"]),
                time_of_day=str(row["Time_of_Day"]),
                day_of_week=str(row["Day_of_Week"]),
                assigned_analyst=str(row["Assigned_Analyst"]),
                status="OPEN",
                created_at=created,
                deadline=deadline,
                predicted_severity=str(p_row["Predicted_Severity"]),
                predicted_resolution_hours=float(p_row["Predicted_Resolution_Hours"]),
                predicted_queue_delay=float(p_row["Predicted_Queue_Delay_Minutes"]),
                predicted_workload=float(p_row["Predicted_Analyst_Workload"]),
                sla_breach_probability_before=float(p_row["SLA_Breach_Probability"]),
                escalation_priority=str(p_row["Escalation_Priority"]),
                original_position=i + 1,
                is_active=True
            )
            tickets_to_create.append(t)

        Ticket.objects.bulk_create(tickets_to_create)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(tickets_to_create)} demo incident tickets."))

        # 4. Run initial Queue Optimization
        self.stdout.write("Running initial AI queue optimization...")
        opt_res = QueueService.run_optimization()
        self.stdout.write(self.style.SUCCESS(
            f"Optimization complete! Expected breaches before: {opt_res['metrics']['expected_breaches_before']} -> "
            f"after: {opt_res['metrics']['expected_breaches_after']} "
            f"(Avoided: {opt_res['metrics']['breaches_avoided']})"
        ))
