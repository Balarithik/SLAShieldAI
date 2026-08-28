# SLA Shield AI — Walkthrough & System Report
**AI-Powered Cybersecurity Incident Queue Optimization & SLA Breach Prevention System**

---

## 1. Executive Summary

SLA Shield AI is a full-stack, production-quality SOC (Security Operations Center) cybersecurity incident queue management platform. It uses **6 pre-trained Machine Learning models** coupled with a **deterministic Queue SLA Optimization Engine** to dynamically re-plan incident triage, avoid SLA breaches, protect analyst workload capacity, and fast-track high-threat escalations.

```
                    USER / ADMIN / SIEM INGESTION
                                  ↓
                        Django REST Backend
                                  ↓
         [6 Pre-Trained scikit-learn Models Cached In-Memory]
         • Severity Classifier      • Resolution Time Regressor
         • Queue Delay Regressor    • Analyst Workload Regressor
         • SLA Breach Classifier    • Escalation Priority Classifier
                                  ↓
                       Queue Optimizer Engine
        (Penalty-aware candidate action evaluation & sorting)
                                  ↓
                 BEFORE vs AFTER Optimized Queue Plan
                                  ↓
           Real-Time React SOC Dashboard & Decision Audit Log
```

---

## 2. Key Accomplishments & Hackathon Deliverables

### A. ML Service Architecture (`backend/api/services/ml_service.py`)
- **Singleton In-Memory Cache**: All 6 pre-trained `.pkl` model files (`severity_model.pkl`, `resolution_model.pkl`, `queue_model.pkl`, `workload_model.pkl`, `sla_model.pkl`, `escalation_model.pkl`) are loaded once on startup and kept in memory.
- **Zero Retraining Overhead**: Performs instant batch or single-ticket inference without retraining models or modifying weights.
- **Feature Schema Normalization**: Validates all 14 input features (`Incident_Type`, `Source`, `Attack_Vector`, `Priority`, `Affected_Systems`, `Users_Affected`, `Threat_Score`, `Analyst_Experience_Years`, `Current_Queue`, `Available_Analysts`, `SLA_Hours`, `Historical_Incidents`, `Time_of_Day`, `Day_of_Week`).

### B. Dynamic Queue Optimization (`backend/api/services/queue_service.py`)
- Integrates framework-agnostic [`queue_optimizer.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/queue_optimizer.py).
- Evaluates candidate actions for each ticket:
  - `KEEP_CURRENT`: Maintain analyst assignment
  - `PRIORITIZE`: Elevate queue priority to mitigate queue delay
  - `REASSIGN`: Route to analyst with lower workload / higher IR experience
  - `ESCALATE`: Elevate to senior IR lead for P1/P2 threats
- **Mathematical Integrity**: Tested across 100 scenario queues (5,863 tickets) in [`test_new_data.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/test_new_data.py) with **0 dropped tickets, 0 duplicate tickets, and ~45.5% average breach reduction**.

### C. Django REST API (`backend/api/`)
- `GET /api/health/` — Engine online check & loaded model inventory.
- `GET /api/dashboard/metrics/` — High-density SOC KPI metrics, radar countdown data, capacity fleet, and historical breach trends.
- `POST /api/queue/optimize/` — Executes optimization, persists `QueueRun` and `QueueDecision` records, and updates live ticket positions and assignments.
- `POST /api/tickets/upload/` — Ingests CSV or JSON datasets with schema and range validation.
- `POST /api/tickets/` — Manual ticket input with instant ML prediction breakdown.
- `GET /api/queue/before/` & `GET /api/queue/after/` — Compare baseline vs optimized queues.
- `GET /api/analysts/`, `PUT /api/analysts/<id>/` — Live fleet capacity adjustment.
- `GET /api/sla-rules/`, `PUT /api/sla-rules/` — Configurable SLA hours by severity.
- `POST /api/simulation/generate/` — Generates preset surge scenarios (`NORMAL`, `CRITICAL_SURGE`, `ANALYST_OVERLOAD`, `SLA_CRISIS`, `HEAVY_LOAD`).

### D. SOC Dashboard React Frontend (`frontend/src/`)
- **Aesthetic**: Modern SOC Command Center dark theme (`#06090e`, `#0b111a`, `#101826`) with neon cyan, emerald, amber, and crimson accents.
- **Header**: Live AI Engine status badge with pulsing light, Last Optimization timestamp, navigation tabs, and master **"RUN AI OPTIMIZATION"** CTA button.
- **Hero KPI Card**: **"BREACHES AVOIDED BY AI"** displaying avoided breaches (e.g. `3.20`), avoidance % (e.g. `-55.4%`), and action distribution (Reassignments, Escalations, Prioritizations).
- **Real-Time SLA Countdown Radar**: Ticking live countdown timer for every active ticket (`01:42:35 remaining`) with dynamic color coding (Green: Safe, Yellow: Approaching, Orange: High Risk, Red: Breach Imminent).
- **Analyst Workload Fleet**: Visual capacity progress bars (e.g. `A01: 8/10 80% BUSY`, `A05: 2/8 25% AVAILABLE`) with status alerts (`OVERLOADED`, `BUSY`, `AVAILABLE`).
- **Escalation Priority Queue**: P1/P2 high-threat incidents sorted by urgency with recommended senior analyst assignments.
- **Before vs After AI Queue Comparison**: Visual position shifts (`#1` -> `#15`), movement indicators (`↑ Prioritized`, `↔ Kept`, `🔄 Reassigned`, `🚨 Escalated`), risk drops (`70% → 22%`), and deterministic reasons.
- **Breach Trend Trajectory Chart**: Interactive multi-line SVG chart tracking breaches before vs after across runs.
- **AI Decision Log Modal**: Mathematical decision rationale for every action.
- **Ticket Ingestion**: Drag & drop CSV/JSON upload with validation preview & manual single-ticket ML simulation.
- **Simulation Lab**: One-click demo scenarios to demonstrate continuous queue re-planning.
- **Model Architecture & Transparency**: Full documentation disclosing synthetic prototype evaluation.

---

## 3. Files Created & Modified

| File | Type | Description |
| :--- | :--- | :--- |
| [`backend/sla_shield/settings.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/sla_shield/settings.py) | Config | Django project settings with DRF, CORS, SQLite/PostgreSQL |
| [`backend/sla_shield/urls.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/sla_shield/urls.py) | Routing | Root URL router routing to `/api/` |
| [`backend/api/models.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/api/models.py) | Database | `Analyst`, `SLARule`, `Ticket`, `QueueRun`, `QueueDecision` |
| [`backend/api/services/ml_service.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/api/services/ml_service.py) | ML Service | Singleton model loader, feature sanitizer, and batch predictor |
| [`backend/api/services/queue_service.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/api/services/queue_service.py) | Service | Adapter connecting `queue_optimizer.py` to Django DB |
| [`backend/api/services/sla_service.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/api/services/sla_service.py) | Service | SLA rule management, deadlines, and countdown status |
| [`backend/api/services/dashboard_service.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/api/services/dashboard_service.py) | Service | Aggregates live SOC metrics, radars, capacities, and trends |
| [`backend/api/services/simulation_service.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/api/services/simulation_service.py) | Service | Scenario generator (`NORMAL`, `CRITICAL_SURGE`, `ANALYST_OVERLOAD`, `SLA_CRISIS`, `HEAVY_LOAD`) |
| [`backend/api/serializers.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/api/serializers.py) | Serializers | DRF serializers with validation rules |
| [`backend/api/views.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/api/views.py) | Views | REST API view controllers for all endpoints |
| [`backend/api/urls.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/api/urls.py) | Routing | API endpoint route definitions |
| [`backend/api/management/commands/seed_data.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/api/management/commands/seed_data.py) | Management | Seeds initial analysts, SLA rules, 20 demo tickets, and runs initial optimization |
| [`backend/api/tests.py`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/backend/api/tests.py) | Tests | Automated test suite verifying ML, optimizer, and REST endpoints |
| [`frontend/vite.config.js`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/vite.config.js) | Config | Vite configuration with backend proxy |
| [`frontend/src/index.css`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/index.css) | Styles | Modern SOC cybersecurity dark theme design system |
| [`frontend/src/services/api.js`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/services/api.js) | Frontend API | Client for Django REST APIs |
| [`frontend/src/components/Header.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/Header.jsx) | UI | Top command header with live status & master CTA |
| [`frontend/src/components/KPICards.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/KPICards.jsx) | UI | 6 KPI cards with hero Breaches Avoided display |
| [`frontend/src/components/SLACountdownRadar.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/SLACountdownRadar.jsx) | UI | Real-time ticking countdown timers with color coding |
| [`frontend/src/components/AnalystCapacityPanel.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/AnalystCapacityPanel.jsx) | UI | Fleet utilization and workload progress bars |
| [`frontend/src/components/EscalationQueue.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/EscalationQueue.jsx) | UI | P1/P2 critical escalation tickets panel |
| [`frontend/src/components/QueueComparisonTable.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/QueueComparisonTable.jsx) | UI | Before vs After queue comparison with movement arrows and risk shifts |
| [`frontend/src/components/BreachTrendChart.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/BreachTrendChart.jsx) | UI | Interactive custom SVG multi-line breach trajectory chart |
| [`frontend/src/components/TicketIngestionView.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/TicketIngestionView.jsx) | UI | Drag & Drop CSV/JSON uploader & Manual ML prediction form |
| [`frontend/src/components/AnalystManager.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/AnalystManager.jsx) | UI | Analyst roster CRUD & capacity manager |
| [`frontend/src/components/SLARulesManager.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/SLARulesManager.jsx) | UI | Severity SLA threshold editor |
| [`frontend/src/components/SimulationPanel.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/SimulationPanel.jsx) | UI | One-click demo scenarios & workload shocks |
| [`frontend/src/components/ModelTransparency.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/ModelTransparency.jsx) | UI | Model architecture breakdown and prototype disclosure |
| [`frontend/src/components/DecisionLogModal.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/components/DecisionLogModal.jsx) | UI | Deterministic AI decision justification feed |
| [`frontend/src/App.jsx`](file:///c:/Users/Jason%20Harvey/projects/SLAShieldAI/frontend/src/App.jsx) | App | Root state manager & view orchestrator |

---

## 4. How to Run the Application

### 1. Start Django Backend Server:
```powershell
cd "c:\Users\Jason Harvey\projects\SLAShieldAI\backend"
python manage.py runserver 127.0.0.1:8000
```

### 2. Start Vite React Frontend:
```powershell
cd "c:\Users\Jason Harvey\projects\SLAShieldAI\frontend"
npm run dev
```
Open **`http://localhost:5173`** in any web browser.

### 3. Run Automated Tests:
```powershell
cd "c:\Users\Jason Harvey\projects\SLAShieldAI\backend"
python manage.py test api
```

### 4. Run Independent Scenario Queue Validation (100 Queues):
```powershell
cd "c:\Users\Jason Harvey\projects\SLAShieldAI\backend"
python test_new_data.py
```

---

## 5. Demonstration Walkthrough

1. **Initial View**: Open `http://localhost:5173`. Notice the **Hero KPI Card** showing **3.20 Breaches Avoided (-55.4%)**, the live ticking **SLA Countdown Radar**, and the **Analyst Capacity Fleet**.
2. **Before vs After Inspection**: Scroll to the **AI Optimized Queue** table. Observe the movement badges (e.g. `INC00003` reassigned from `A01 → A05` reducing SLA risk from `70% → 22%`).
3. **Trigger Manual Optimization**: Click **"RUN AI OPTIMIZATION"** in the top right. Watch the queue re-evaluate dynamically.
4. **Manual Incident ML Prediction**: Navigate to **"Ticket Ingestion"** -> **"Add Ticket Manually"**. Fill in an incident (e.g., Threat Score: 90, Ransomware, P1) and click **"Run ML Analysis & Add"**. Review the real-time predictions across all 6 models, then click **"Re-Optimize Queue With This Ticket"**.
5. **Stress Test Surge Simulation**: Navigate to **"Simulation Lab"**, select **"Critical Threat Surge"**, click **"Generate CRITICAL_SURGE Queue"**, then click **"Optimize Live Queue"**. Watch the AI avoid severe breach spikes by redistributing load.
6. **Adjust Capacity**: Go to **"Analyst Fleet"**, adjust Analyst A01's capacity/workload, and re-optimize to see how capacity constraints instantly shift queue routing.
