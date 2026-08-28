from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
import json
import io

from api.models import Analyst, SLARule, Ticket, QueueRun, QueueDecision
from api.services.ml_service import MLService
from api.services.queue_service import QueueService
from api.services.simulation_service import SimulationService


class MLServiceTests(TestCase):
    def setUp(self):
        self.ml_service = MLService.get_instance()

    def test_models_loaded(self):
        models = self.ml_service.models
        self.assertEqual(len(models), 6)
        for key in ["severity", "resolution", "queue", "workload", "sla", "escalation"]:
            self.assertIn(key, models)

    def test_single_prediction(self):
        sample_ticket = {
            "ticket_id": "TEST001",
            "Incident_Type": "Ransomware",
            "Source": "EDR",
            "Attack_Vector": "Endpoint",
            "Priority": "P1",
            "Affected_Systems": 15,
            "Users_Affected": 80,
            "Threat_Score": 92.0,
            "Analyst_Experience_Years": 2,
            "Current_Queue": 18,
            "Available_Analysts": 2,
            "SLA_Hours": 2,
            "Historical_Incidents": 35,
            "Time_of_Day": "Night",
            "Day_of_Week": "Fri"
        }
        res = self.ml_service.predict_single(sample_ticket)
        self.assertEqual(res["ticket_id"], "TEST001")
        self.assertIn(res["predicted_severity"], ["Low", "Medium", "High", "Critical"])
        self.assertGreater(res["predicted_resolution_hours"], 0)
        self.assertGreaterEqual(res["sla_breach_probability"], 0.0)
        self.assertLessEqual(res["sla_breach_probability"], 100.0)


class APITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        QueueService.seed_default_analysts()
        SimulationService.generate_scenario_tickets(scenario="NORMAL", count=20, clear_existing=True)

    def test_health_endpoint(self):
        response = self.client.get(reverse('api-health'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'HEALTHY')
        self.assertEqual(response.data['models_loaded'], 6)

    def test_dashboard_metrics(self):
        response = self.client.get(reverse('dashboard-metrics'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("active_tickets_count", response.data)
        self.assertIn("kpi_metrics", response.data)
        self.assertIn("countdown_tickets", response.data)
        self.assertIn("analyst_fleet", response.data)
        self.assertIn("escalation_queue", response.data)
        self.assertEqual(response.data['active_tickets_count'], 20)

    def test_queue_optimization(self):
        response = self.client.post(reverse('queue-optimize'), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['total_tickets'], 20)
        
        # Verify no dropped or duplicate tickets
        before_ids = [t['ticket_id'] for t in response.data['before_queue']]
        after_ids = [t['ticket_id'] for t in response.data['after_queue']]
        self.assertEqual(len(before_ids), 20)
        self.assertEqual(len(after_ids), 20)
        self.assertEqual(set(before_ids), set(after_ids))

        # Verify breaches avoided is calculated
        metrics = response.data['metrics']
        self.assertIn('breaches_avoided', metrics)
        self.assertGreaterEqual(metrics['expected_breaches_before'], metrics['expected_breaches_after'])

    def test_manual_ticket_prediction_and_creation(self):
        payload = {
            "ticket_id": "MANUAL001",
            "incident_type": "Phishing",
            "source": "Email Gateway",
            "attack_vector": "Email",
            "priority": "P2",
            "affected_systems": 4,
            "users_affected": 25,
            "threat_score": 65.0,
            "analyst_experience_years": 5,
            "current_queue": 8,
            "available_analysts": 4,
            "sla_hours": 4.0,
            "historical_incidents": 15,
            "time_of_day": "Morning",
            "day_of_week": "Tue",
            "assigned_analyst": "A02",
            "add_to_queue": True
        }
        response = self.client.post(reverse('tickets-list-create'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('prediction', response.data)
        self.assertEqual(Ticket.objects.filter(ticket_id="MANUAL001").count(), 1)

    def test_csv_upload_validation(self):
        csv_data = (
            "Ticket_ID,Incident_Type,Source,Attack_Vector,Priority,Affected_Systems,Users_Affected,Threat_Score,Analyst_Experience_Years,Current_Queue,Available_Analysts,SLA_Hours,Historical_Incidents,Time_of_Day,Day_of_Week,Assigned_Analyst\n"
            "CSV001,Malware,SIEM,Endpoint,P1,10,30,85.0,4,12,3,2,15,Morning,Mon,A01\n"
            "CSV002,DDoS,Firewall,Network,P2,25,100,70.0,6,8,5,4,22,Night,Wed,A03\n"
        )
        csv_file = io.BytesIO(csv_data.encode('utf-8'))
        csv_file.name = 'test_tickets.csv'

        response = self.client.post(reverse('tickets-upload'), {'file': csv_file, 'replace_queue': 'true'}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['tickets_imported'], 2)
        self.assertEqual(Ticket.objects.count(), 2)

    def test_simulation_generation(self):
        payload = {"scenario": "CRITICAL_SURGE", "count": 25, "clear_existing": True}
        response = self.client.post(reverse('simulation-generate'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['tickets_generated'], 25)
        self.assertEqual(Ticket.objects.count(), 25)
