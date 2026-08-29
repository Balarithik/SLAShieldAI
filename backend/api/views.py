import io
import json
import pandas as pd
import numpy as np
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from api.models import Analyst, SLARule, Ticket, QueueRun, QueueDecision
from api.serializers import (
    AnalystSerializer, SLARuleSerializer, TicketSerializer,
    ManualTicketInputSerializer, QueueRunSerializer, QueueDecisionSerializer
)
from api.services.ml_service import MLService
from api.services.queue_service import QueueService
from api.services.sla_service import SLAService
from api.services.dashboard_service import DashboardService
from api.services.simulation_service import SimulationService
from queue_optimizer import BASE_FEATURES, NUMERICAL_FEATURES, CATEGORICAL_FEATURES


class HealthCheckView(APIView):
    def get(self, request):
        ml_service = MLService.get_instance()
        models = ml_service.models
        return Response({
            "status": "HEALTHY",
            "ai_engine": "ONLINE",
            "models_loaded": len(models),
            "models": list(models.keys()),
            "timestamp": timezone.now().isoformat()
        })


class DashboardMetricsView(APIView):
    def get(self, request):
        metrics = DashboardService.get_dashboard_metrics()
        return Response(metrics)


class TicketUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        replace_queue = request.data.get('replace_queue', 'true').lower() in ['true', '1', True]
        
        raw_data = None
        filename = "direct_payload"

        if file_obj:
            filename = file_obj.name
            try:
                if filename.endswith('.csv'):
                    content = file_obj.read().decode('utf-8')
                    raw_df = pd.read_csv(io.StringIO(content))
                elif filename.endswith('.json'):
                    content = file_obj.read().decode('utf-8')
                    raw_json = json.loads(content)
                    raw_df = pd.DataFrame(raw_json)
                else:
                    return Response({
                        "success": False,
                        "error": "Unsupported file format. Please upload a .csv or .json file."
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({
                    "success": False,
                    "error": f"Failed to parse uploaded file: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        elif 'tickets' in request.data:
            try:
                raw_df = pd.DataFrame(request.data['tickets'])
            except Exception as e:
                return Response({
                    "success": False,
                    "error": f"Invalid tickets JSON array: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({
                "success": False,
                "error": "No file or tickets data provided."
            }, status=status.HTTP_400_BAD_REQUEST)

        if raw_df.empty:
            return Response({
                "success": False,
                "error": "The uploaded dataset is empty."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validation Checks
        errors = []
        
        # Check for Ticket ID column
        id_col = None
        for col in ["Ticket_ID", "Incident_ID", "ticket_id", "incident_id", "ID", "id"]:
            if col in raw_df.columns:
                id_col = col
                break
        
        if id_col is None:
            raw_df["Ticket_ID"] = [f"INC{i+1:05d}" for i in range(len(raw_df))]
            id_col = "Ticket_ID"

        # Check Duplicate Ticket IDs
        dup_ids = raw_df[raw_df[id_col].duplicated()][id_col].tolist()
        if dup_ids:
            errors.append(f"Duplicate ticket IDs detected in dataset: {dup_ids[:5]}")

        # Check Priority values
        if "Priority" in raw_df.columns:
            invalid_priorities = raw_df[~raw_df["Priority"].astype(str).isin(["P1", "P2", "P3", "P4"])]["Priority"].tolist()
            if invalid_priorities:
                errors.append(f"Invalid priority values found (expected P1, P2, P3, P4): {invalid_priorities[:5]}")

        # Check Numerical Ranges
        for num_col in ["Affected_Systems", "Users_Affected", "Current_Queue", "Available_Analysts", "Historical_Incidents", "SLA_Hours"]:
            if num_col in raw_df.columns:
                negatives = pd.to_numeric(raw_df[num_col], errors='coerce') < 0
                if negatives.any():
                    errors.append(f"Negative values found in numerical column: {num_col}")

        if "Threat_Score" in raw_df.columns:
            scores = pd.to_numeric(raw_df["Threat_Score"], errors='coerce')
            if ((scores < 0) | (scores > 100)).any():
                errors.append("Threat_Score contains values outside 0-100 range.")

        if errors:
            return Response({
                "success": False,
                "error": "Dataset validation failed.",
                "details": errors
            }, status=status.HTTP_400_BAD_REQUEST)

        # Prepare normalized DataFrame and run baseline ML predictions
        ml_service = MLService.get_instance()
        
        # Ensure analysts available
        analysts = list(Analyst.objects.all())
        if not analysts:
            QueueService.seed_default_analysts()
            analysts = list(Analyst.objects.all())
        
        analyst_ids = [a.analyst_id for a in analysts]

        if replace_queue:
            Ticket.objects.all().delete()

        now = timezone.now()
        tickets_to_create = []
        df_for_ml = []

        for i, row in raw_df.iterrows():
            t_id = str(row[id_col])
            # Prepare feature dict
            raw_dict = row.to_dict()
            feat_dict = ml_service.prepare_feature_dict(raw_dict)
            df_for_ml.append(feat_dict)

            assigned = str(row.get("Assigned_Analyst") or row.get("assigned_analyst") or analyst_ids[i % len(analyst_ids)])
            if assigned not in analyst_ids:
                assigned = analyst_ids[0]

            sla_h = float(feat_dict["SLA_Hours"])
            created = now - timezone.timedelta(minutes=(len(raw_df) - i) * 5)
            deadline = created + timezone.timedelta(hours=sla_h)

            ticket_obj = Ticket(
                ticket_id=t_id,
                incident_type=feat_dict["Incident_Type"],
                source=feat_dict["Source"],
                attack_vector=feat_dict["Attack_Vector"],
                priority=feat_dict["Priority"],
                affected_systems=feat_dict["Affected_Systems"],
                users_affected=feat_dict["Users_Affected"],
                threat_score=feat_dict["Threat_Score"],
                analyst_experience_years=feat_dict["Analyst_Experience_Years"],
                current_queue=feat_dict["Current_Queue"],
                available_analysts=feat_dict["Available_Analysts"],
                sla_hours=sla_h,
                historical_incidents=feat_dict["Historical_Incidents"],
                time_of_day=feat_dict["Time_of_Day"],
                day_of_week=feat_dict["Day_of_Week"],
                assigned_analyst=assigned,
                status='OPEN',
                created_at=created,
                deadline=deadline,
                is_active=True
            )
            tickets_to_create.append(ticket_obj)

        # Baseline Predictions
        preds_df = ml_service.predict_batch(pd.DataFrame(df_for_ml))
        for i, t in enumerate(tickets_to_create):
            p_row = preds_df.iloc[i]
            t.predicted_severity = str(p_row["Predicted_Severity"])
            t.predicted_resolution_hours = float(p_row["Predicted_Resolution_Hours"])
            t.predicted_queue_delay = float(p_row["Predicted_Queue_Delay_Minutes"])
            t.predicted_workload = float(p_row["Predicted_Analyst_Workload"])
            t.sla_breach_probability_before = float(p_row["SLA_Breach_Probability"])
            t.escalation_priority = str(p_row["Escalation_Priority"])
            t.original_position = i + 1

        Ticket.objects.bulk_create(tickets_to_create)

        return Response({
            "success": True,
            "filename": filename,
            "tickets_imported": len(tickets_to_create),
            "message": f"Successfully validated and ingested {len(tickets_to_create)} incident tickets."
        })


class TicketListCreateView(APIView):
    def get(self, request):
        tickets = Ticket.objects.filter(is_active=True)
        
        # Filtering
        status_filter = request.query_params.get('status')
        priority_filter = request.query_params.get('priority')
        severity_filter = request.query_params.get('severity')
        analyst_filter = request.query_params.get('analyst')

        if status_filter:
            tickets = tickets.filter(status=status_filter)
        if priority_filter:
            tickets = tickets.filter(priority=priority_filter)
        if severity_filter:
            tickets = tickets.filter(predicted_severity=severity_filter)
        if analyst_filter:
            tickets = tickets.filter(assigned_analyst=analyst_filter)

        serializer = TicketSerializer(tickets, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ManualTicketInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "error": "Validation error in manual ticket form",
                "details": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        ml_service = MLService.get_instance()
        prediction = ml_service.predict_single(data)

        add_to_queue = data.get('add_to_queue', True)
        ticket_obj = None

        if add_to_queue:
            t_id = data.get('ticket_id')
            if not t_id:
                count = Ticket.objects.count() + 1
                t_id = f"INC{count:05d}"

            # Check uniqueness
            if Ticket.objects.filter(ticket_id=t_id).exists():
                t_id = f"{t_id}-{int(timezone.now().timestamp()) % 10000}"

            now = timezone.now()
            sla_h = float(data.get('sla_hours', 4.0))
            deadline = now + timezone.timedelta(hours=sla_h)

            ticket_obj = Ticket.objects.create(
                ticket_id=t_id,
                incident_type=data['incident_type'],
                source=data['source'],
                attack_vector=data['attack_vector'],
                priority=data['priority'],
                affected_systems=data['affected_systems'],
                users_affected=data['users_affected'],
                threat_score=data['threat_score'],
                analyst_experience_years=data['analyst_experience_years'],
                current_queue=data['current_queue'],
                available_analysts=data['available_analysts'],
                sla_hours=sla_h,
                historical_incidents=data['historical_incidents'],
                time_of_day=data['time_of_day'],
                day_of_week=data['day_of_week'],
                assigned_analyst=data.get('assigned_analyst', 'A01'),
                status='OPEN',
                created_at=now,
                deadline=deadline,
                predicted_severity=prediction['predicted_severity'],
                predicted_resolution_hours=prediction['predicted_resolution_hours'],
                predicted_queue_delay=prediction['predicted_queue_delay'],
                predicted_workload=prediction['predicted_workload'],
                sla_breach_probability_before=prediction['sla_breach_probability'],
                escalation_priority=prediction['escalation_priority'],
                original_position=Ticket.objects.count()
            )

        return Response({
            "success": True,
            "prediction": prediction,
            "ticket": TicketSerializer(ticket_obj).data if ticket_obj else None,
            "message": "Ticket successfully analyzed by ML models."
        })


class TicketDetailView(APIView):
    def get(self, request, ticket_id):
        try:
            ticket = Ticket.objects.get(ticket_id=ticket_id)
            return Response(TicketSerializer(ticket).data)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, ticket_id):
        try:
            ticket = Ticket.objects.get(ticket_id=ticket_id)
            for field in ['status', 'priority', 'assigned_analyst', 'sla_hours']:
                if field in request.data:
                    setattr(ticket, field, request.data[field])
            ticket.save()
            return Response(TicketSerializer(ticket).data)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, ticket_id):
        try:
            ticket = Ticket.objects.get(ticket_id=ticket_id)
            ticket.delete()
            return Response({"success": True, "message": f"Ticket {ticket_id} deleted."})
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)


class QueueOptimizeView(APIView):
    def post(self, request):
        weights = request.data.get('weights')
        results = QueueService.run_optimization(weights=weights)
        return Response(results)


class QueueCurrentView(APIView):
    def get(self, request):
        tickets = Ticket.objects.filter(is_active=True).exclude(status__in=['RESOLVED', 'CLOSED'])
        serializer = TicketSerializer(tickets, many=True)
        return Response({
            "total_active": tickets.count(),
            "tickets": serializer.data
        })


class QueueBeforeView(APIView):
    def get(self, request):
        tickets = Ticket.objects.filter(is_active=True).order_by('original_position')
        return Response(TicketSerializer(tickets, many=True).data)


class QueueAfterView(APIView):
    def get(self, request):
        tickets = Ticket.objects.filter(is_active=True).order_by('new_position')
        return Response(TicketSerializer(tickets, many=True).data)


class QueueHistoryView(APIView):
    def get(self, request):
        runs = QueueRun.objects.all()[:20]
        return Response(QueueRunSerializer(runs, many=True).data)


class AnalystListCreateView(APIView):
    def get(self, request):
        analysts = Analyst.objects.all()
        return Response(AnalystSerializer(analysts, many=True).data)

    def post(self, request):
        serializer = AnalystSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AnalystDetailView(APIView):
    def get(self, request, analyst_id):
        try:
            analyst = Analyst.objects.get(analyst_id=analyst_id)
            return Response(AnalystSerializer(analyst).data)
        except Analyst.DoesNotExist:
            return Response({"error": "Analyst not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, analyst_id):
        try:
            analyst = Analyst.objects.get(analyst_id=analyst_id)
            serializer = AnalystSerializer(analyst, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Analyst.DoesNotExist:
            return Response({"error": "Analyst not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, analyst_id):
        try:
            analyst = Analyst.objects.get(analyst_id=analyst_id)
            analyst.delete()
            return Response({"success": True, "message": f"Analyst {analyst_id} removed."})
        except Analyst.DoesNotExist:
            return Response({"error": "Analyst not found"}, status=status.HTTP_404_NOT_FOUND)


class SLARuleListUpdateView(APIView):
    def get(self, request):
        rules = SLAService.get_all_rules()
        return Response(rules)

    def put(self, request):
        rules_data = request.data.get('rules', [])
        if not rules_data and isinstance(request.data, list):
            rules_data = request.data

        updated = []
        for r in rules_data:
            sev = r.get('severity')
            hours = r.get('sla_hours')
            desc = r.get('description')
            if sev and hours is not None:
                rule_obj = SLAService.update_rule(sev, hours, desc)
                updated.append(SLARuleSerializer(rule_obj).data)

        return Response({"success": True, "updated_rules": updated})


class BreachTrendsView(APIView):
    def get(self, request):
        runs = QueueRun.objects.order_by('-timestamp')[:15]
        trends = [
            {
                "run_id": r.id,
                "timestamp": r.timestamp.isoformat(),
                "display_time": r.timestamp.strftime("%H:%M:%S"),
                "breaches_before": r.expected_breaches_before,
                "breaches_after": r.expected_breaches_after,
                "breaches_avoided": r.breaches_avoided,
                "breach_reduction_pct": r.breach_reduction_pct,
                "delay_before": r.average_queue_delay_before,
                "delay_after": r.average_queue_delay_after,
                "total_tickets": r.total_tickets
            }
            for r in reversed(runs)
        ]
        return Response(trends)


class SimulationView(APIView):
    def post(self, request):
        scenario = request.data.get('scenario', 'NORMAL')
        count = int(request.data.get('count', 20))
        clear = request.data.get('clear_existing', True)

        tickets = SimulationService.generate_scenario_tickets(
            scenario=scenario,
            count=count,
            clear_existing=clear
        )

        return Response({
            "success": True,
            "scenario": scenario,
            "tickets_generated": len(tickets),
            "message": f"Generated {len(tickets)} tickets for scenario '{scenario}'."
        })


class MLPerformanceView(APIView):
    def get(self, request):
        ml_service = MLService.get_instance()
        info = ml_service.get_model_info()
        
        # Compute actual performance metrics
        try:
            metrics = ml_service.compute_model_performance()
            info['performance_metrics'] = metrics
        except Exception as e:
            info['performance_metrics'] = None
            info['metrics_error'] = str(e)
        
        return Response(info)
