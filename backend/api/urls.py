from django.urls import path
from api.views import (
    HealthCheckView, DashboardMetricsView, TicketUploadView,
    DiagnosticCorsView,
    TicketListCreateView, TicketDetailView, QueueOptimizeView,
    QueueCurrentView, QueueBeforeView, QueueAfterView, QueueHistoryView,
    AnalystListCreateView, AnalystDetailView, SLARuleListUpdateView,
    BreachTrendsView, SimulationView, MLPerformanceView
)

urlpatterns = [
    # Health & System
    path('health/', HealthCheckView.as_view(), name='api-health'),
    path('dashboard/metrics/', DashboardMetricsView.as_view(), name='dashboard-metrics'),
    path('debug/cors/', DiagnosticCorsView.as_view(), name='debug-cors'),
    
    # Tickets
    path('tickets/upload/', TicketUploadView.as_view(), name='tickets-upload'),
    path('tickets/', TicketListCreateView.as_view(), name='tickets-list-create'),
    path('tickets/<str:ticket_id>/', TicketDetailView.as_view(), name='tickets-detail'),
    
    # Queue Optimization & Results
    path('queue/optimize/', QueueOptimizeView.as_view(), name='queue-optimize'),
    path('queue/current/', QueueCurrentView.as_view(), name='queue-current'),
    path('queue/before/', QueueBeforeView.as_view(), name='queue-before'),
    path('queue/after/', QueueAfterView.as_view(), name='queue-after'),
    path('queue/history/', QueueHistoryView.as_view(), name='queue-history'),
    
    # Analysts
    path('analysts/', AnalystListCreateView.as_view(), name='analysts-list-create'),
    path('analysts/<str:analyst_id>/', AnalystDetailView.as_view(), name='analysts-detail'),
    
    # SLA Rules
    path('sla-rules/', SLARuleListUpdateView.as_view(), name='sla-rules'),
    
    # Analytics & Trends
    path('breach-trends/', BreachTrendsView.as_view(), name='breach-trends'),
    path('ml/performance/', MLPerformanceView.as_view(), name='ml-performance'),
    
    # Simulation
    path('simulation/generate/', SimulationView.as_view(), name='simulation-generate'),
]
