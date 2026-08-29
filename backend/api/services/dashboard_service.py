from django.utils import timezone
from typing import Dict, Any, List
from django.db.models import Avg, Sum, Count

from api.models import Ticket, Analyst, QueueRun, QueueDecision, SLARule
from api.services.sla_service import SLAService


class DashboardService:

    @classmethod
    def get_dashboard_metrics(cls) -> Dict[str, Any]:
        """
        Gathers comprehensive live metrics for the SOC dashboard.
        """
        active_tickets_qs = Ticket.objects.filter(is_active=True).exclude(status__in=['RESOLVED', 'CLOSED'])
        total_active = active_tickets_qs.count()

        # Severity breakdown
        sev_counts = {
            "Critical": active_tickets_qs.filter(predicted_severity='Critical').count(),
            "High": active_tickets_qs.filter(predicted_severity='High').count(),
            "Medium": active_tickets_qs.filter(predicted_severity='Medium').count(),
            "Low": active_tickets_qs.filter(predicted_severity='Low').count()
        }

        # Risk tier breakdown (using after probability if optimized, else before)
        critical_risk_count = 0
        high_risk_count = 0
        medium_risk_count = 0
        low_risk_count = 0
        all_probs = []

        for t in active_tickets_qs:
            prob = t.sla_breach_probability_after if t.sla_breach_probability_after is not None else (t.sla_breach_probability_before or 0.0)
            if prob is not None:
                all_probs.append(float(prob))
            if prob >= 80:
                critical_risk_count += 1
            elif prob >= 60:
                high_risk_count += 1
            elif prob >= 30:
                medium_risk_count += 1
            else:
                low_risk_count += 1

        overall_sla_breach_probability = round((sum(all_probs) / len(all_probs)), 2) if all_probs else 0.0

        # SLA Countdown radar (top 15 tickets closest to SLA breach/deadline)
        countdown_tickets = []
        for t in active_tickets_qs.order_by('deadline')[:15]:
            rem_sec = t.remaining_seconds
            status_info = SLAService.get_status_from_seconds(rem_sec, t.sla_hours)
            prob = t.sla_breach_probability_after if t.sla_breach_probability_after is not None else (t.sla_breach_probability_before or 0.0)
            countdown_tickets.append({
                "ticket_id": t.ticket_id,
                "incident_type": t.incident_type,
                "priority": t.priority,
                "severity": t.predicted_severity or "Medium",
                "assigned_analyst": t.assigned_analyst,
                "sla_hours": t.sla_hours,
                "deadline": t.deadline.isoformat() if t.deadline else None,
                "remaining_seconds": rem_sec,
                "status_label": status_info["label"],
                "status_color": status_info["color"],
                "sla_risk_pct": prob
            })

        # Analyst Capacity Panel
        analysts = Analyst.objects.all()
        analyst_capacity = []
        total_capacity = 0
        total_workload = 0

        for a in analysts:
            total_capacity += a.maximum_capacity
            total_workload += a.current_workload
            analyst_capacity.append({
                "analyst_id": a.analyst_id,
                "name": a.name or f"Analyst {a.analyst_id}",
                "experience_years": a.experience_years,
                "current_workload": a.current_workload,
                "maximum_capacity": a.maximum_capacity,
                "active_tickets": a.active_tickets,
                "utilization_pct": a.utilization_pct,
                "capacity_status": a.capacity_status,
                "is_available": a.is_available,
                "skills": a.skills
            })

        fleet_utilization_pct = round((total_workload / total_capacity * 100), 1) if total_capacity > 0 else 0.0

        # Escalation Queue (P1/P2 tickets or recommended ESCALATE/PRIORITIZE)
        escalation_tickets = []
        esc_qs = active_tickets_qs.filter(
            escalation_priority__in=['P1', 'P2']
        ).order_by('escalation_priority', '-sla_breach_probability_after', '-threat_score')[:10]

        for t in esc_qs:
            prob = t.sla_breach_probability_after if t.sla_breach_probability_after is not None else (t.sla_breach_probability_before or 0.0)
            escalation_tickets.append({
                "ticket_id": t.ticket_id,
                "incident_type": t.incident_type,
                "priority": t.priority,
                "severity": t.predicted_severity or "High",
                "threat_score": t.threat_score,
                "escalation_priority": t.escalation_priority or "P1",
                "current_analyst": t.assigned_analyst,
                "recommended_action": t.recommended_action or "ESCALATE",
                "recommended_analyst": t.assigned_analyst_after or t.assigned_analyst,
                "sla_risk": prob,
                "reason": t.reason or "Critical priority threat requiring expedited senior tier handling."
            })

        # Latest QueueRun performance & Avoided Breaches
        latest_run = QueueRun.objects.order_by('-timestamp').first()
        if latest_run and total_active > 0:
            kpi_metrics = {
                "last_run_id": latest_run.id,
                "last_run_timestamp": latest_run.timestamp.isoformat(),
                "expected_breaches_before": latest_run.expected_breaches_before,
                "expected_breaches_after": latest_run.expected_breaches_after,
                "breaches_avoided": latest_run.breaches_avoided,
                "breach_reduction_pct": latest_run.breach_reduction_pct,
                "average_queue_delay_before": latest_run.average_queue_delay_before,
                "average_queue_delay_after": latest_run.average_queue_delay_after,
                "delay_reduction_pct": latest_run.delay_reduction_pct,
                "reassignments": latest_run.number_of_reassignments,
                "escalations": latest_run.number_of_escalations,
                "prioritizations": latest_run.number_of_prioritizations,
                "kept_current": latest_run.number_kept_current
            }
        elif total_active > 0:
            # Baseline estimation if tickets exist but no optimization run yet
            avg_risk = active_tickets_qs.aggregate(avg=Avg('sla_breach_probability_before'))['avg'] or 0.0
            sum_risk = active_tickets_qs.aggregate(sum=Sum('sla_breach_probability_before'))['sum'] or 0.0
            avg_delay = active_tickets_qs.aggregate(avg=Avg('predicted_queue_delay'))['avg'] or 0.0
            kpi_metrics = {
                "last_run_id": None,
                "last_run_timestamp": None,
                "expected_breaches_before": round(sum_risk / 100.0, 2),
                "expected_breaches_after": round(sum_risk / 100.0, 2),
                "breaches_avoided": 0.0,
                "breach_reduction_pct": 0.0,
                "average_queue_delay_before": round(float(avg_delay), 2),
                "average_queue_delay_after": round(float(avg_delay), 2),
                "delay_reduction_pct": 0.0,
                "reassignments": 0,
                "escalations": 0,
                "prioritizations": 0,
                "kept_current": total_active
            }
        else:
            kpi_metrics = {
                "last_run_id": None,
                "last_run_timestamp": None,
                "expected_breaches_before": 0.0,
                "expected_breaches_after": 0.0,
                "breaches_avoided": 0.0,
                "breach_reduction_pct": 0.0,
                "average_queue_delay_before": 0.0,
                "average_queue_delay_after": 0.0,
                "delay_reduction_pct": 0.0,
                "reassignments": 0,
                "escalations": 0,
                "prioritizations": 0,
                "kept_current": 0
            }

        # Historical Breach Trends (last 10 runs)
        trend_runs = QueueRun.objects.order_by('-timestamp')[:10]
        breach_trends = [
            {
                "run_id": r.id,
                "timestamp": r.timestamp.strftime('%H:%M:%S'),
                "breaches_before": r.expected_breaches_before,
                "breaches_after": r.expected_breaches_after,
                "breaches_avoided": r.breaches_avoided,
                "breach_reduction_pct": r.breach_reduction_pct,
                "delay_before": r.average_queue_delay_before,
                "delay_after": r.average_queue_delay_after,
                "tickets": r.total_tickets
            }
            for r in reversed(trend_runs)
        ]

        # Recent AI Decision Log (from latest run)
        recent_decisions = []
        if latest_run:
            for d in latest_run.decisions.all()[:15]:
                recent_decisions.append({
                    "ticket_id": d.ticket_id,
                    "old_position": d.old_position,
                    "new_position": d.new_position,
                    "old_analyst": d.old_analyst,
                    "new_analyst": d.new_analyst,
                    "action": d.action,
                    "sla_risk_before": d.sla_risk_before,
                    "sla_risk_after": d.sla_risk_after,
                    "risk_delta": round(d.sla_risk_before - d.sla_risk_after, 2),
                    "reason": d.reason
                })

        return {
            "has_data": total_active > 0,
            "system_status": "ONLINE",
            "active_tickets_count": total_active,
            "overall_sla_breach_probability": overall_sla_breach_probability,
            "overall_sla_breach_probability_label": "Low Risk" if overall_sla_breach_probability < 30 else "Medium Risk" if overall_sla_breach_probability < 60 else "High Risk" if overall_sla_breach_probability < 80 else "Critical Risk",
            "severity_breakdown": sev_counts,
            "risk_tier_breakdown": {
                "critical": critical_risk_count,
                "high": high_risk_count,
                "medium": medium_risk_count,
                "low": low_risk_count,
                "total_high_risk": critical_risk_count + high_risk_count
            },
            "risk_distribution": {
                "low": low_risk_count,
                "medium": medium_risk_count,
                "high": high_risk_count,
                "critical": critical_risk_count
            },
            "kpi_metrics": kpi_metrics,
            "countdown_tickets": countdown_tickets,
            "analyst_fleet": {
                "analysts": analyst_capacity,
                "total_capacity": total_capacity,
                "total_workload": total_workload,
                "utilization_pct": fleet_utilization_pct
            },
            "escalation_queue": escalation_tickets,
            "breach_trends": breach_trends,
            "recent_decisions": recent_decisions
        }
