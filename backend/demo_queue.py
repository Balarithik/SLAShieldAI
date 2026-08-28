"""
Executable Demo for Queue SLA Optimization Engine
=================================================
Loads pre-trained models (or generates them if absent), prepares 20 synthetic 
incidents & 5 analysts, runs optimization, and displays output tables & metrics.
"""

import os
import pandas as pd
import numpy as np
import joblib

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

from queue_optimizer import optimize_queue, BASE_FEATURES

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

MODEL_FILES = {
    "severity": "severity_model.pkl",
    "resolution": "resolution_model.pkl",
    "queue": "queue_model.pkl",
    "workload": "workload_model.pkl",
    "sla": "sla_model.pkl",
    "escalation": "escalation_model.pkl"
}


def _resolve_model_path(filename: str) -> str:
    """Finds model path either in models/ directory or local directory."""
    in_models = os.path.join(MODELS_DIR, filename)
    if os.path.exists(in_models):
        return in_models
    in_local = os.path.join(BASE_DIR, filename)
    if os.path.exists(in_local):
        return in_local
    return in_models


def train_and_save_synthetic_models():
    """Helper routine to train and save models if .pkl files are missing."""
    print("Pre-trained model files not found. Training synthetic models...")
    os.makedirs(MODELS_DIR, exist_ok=True)
    np.random.seed(42)
    n = 1000
    
    types = np.random.choice(["Malware", "Phishing", "DDoS", "Ransomware", "Unauthorized Access"], n)
    sources = np.random.choice(["Firewall", "SIEM", "EDR", "Email Gateway", "IDS"], n)
    vectors = np.random.choice(["Email", "Network", "Web", "Endpoint", "Credential"], n)
    priorities = np.random.choice(["P1", "P2", "P3", "P4"], n)
    aff_sys = np.random.poisson(5, n) + 1
    users = np.random.poisson(15, n) + 1
    threat = np.clip(np.random.normal(55, 20, n), 0, 100)
    exp = np.random.randint(1, 11, n)
    queue = np.random.poisson(12, n)
    avail = np.random.randint(1, 8, n)
    sla_h = np.random.choice([2, 4, 8, 12], n)
    hist = np.random.poisson(20, n)
    tod = np.random.choice(["Morning", "Afternoon", "Evening", "Night"], n)
    dow = np.random.choice(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], n)
    
    risk = 0.45 * threat + 0.8 * aff_sys + 0.3 * users
    sev = pd.cut(risk, [-np.inf, 30, 50, 70, np.inf], labels=["Low", "Medium", "High", "Critical"]).astype(str)
    res_t = np.maximum(0.5, 1.0 + 0.045 * risk - 0.18 * exp + np.random.normal(0, 0.5, n))
    q_delay = np.maximum(2, 3 + 2.8 * queue / np.maximum(avail, 1) + np.random.normal(0, 2, n))
    workload = np.maximum(1, np.round(0.5 * queue + 0.4 * hist))
    sla_b = ((res_t + q_delay / 60) > sla_h).astype(int)
    esc_p = pd.cut(risk + 0.8 * q_delay + 15 * sla_b, [-np.inf, 40, 70, 100, np.inf], labels=["P4", "P3", "P2", "P1"]).astype(str)
    
    df = pd.DataFrame({
        "Incident_Type": types, "Source": sources, "Attack_Vector": vectors, "Priority": priorities,
        "Affected_Systems": aff_sys, "Users_Affected": users, "Threat_Score": threat,
        "Analyst_Experience_Years": exp, "Current_Queue": queue, "Available_Analysts": avail,
        "SLA_Hours": sla_h, "Historical_Incidents": hist, "Time_of_Day": tod, "Day_of_Week": dow,
        "Severity": sev, "Resolution_Time_Hours": res_t, "Queue_Delay_Minutes": q_delay,
        "Future_Analyst_Workload": workload, "SLA_Breach": sla_b, "Escalation_Priority": esc_p
    })
    
    cats = ["Incident_Type", "Source", "Attack_Vector", "Priority", "Time_of_Day", "Day_of_Week"]
    nums = ["Affected_Systems", "Users_Affected", "Threat_Score", "Analyst_Experience_Years", 
            "Current_Queue", "Available_Analysts", "SLA_Hours", "Historical_Incidents"]
    
    pre = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), cats), ("num", "passthrough", nums)])
    
    m_sev = Pipeline([("pre", pre), ("m", RandomForestClassifier(n_estimators=50, random_state=42))]).fit(df[BASE_FEATURES], df["Severity"])
    m_res = Pipeline([("pre", pre), ("m", RandomForestRegressor(n_estimators=50, random_state=42))]).fit(df[BASE_FEATURES], df["Resolution_Time_Hours"])
    m_q = Pipeline([("pre", pre), ("m", RandomForestRegressor(n_estimators=50, random_state=42))]).fit(df[BASE_FEATURES], df["Queue_Delay_Minutes"])
    m_w = Pipeline([("pre", pre), ("m", RandomForestRegressor(n_estimators=50, random_state=42))]).fit(df[BASE_FEATURES], df["Future_Analyst_Workload"])
    
    sla_train = df[BASE_FEATURES].copy()
    sla_train["Predicted_Resolution_Hours"] = res_t
    sla_train["Predicted_Queue_Delay_Minutes"] = q_delay
    sla_pre = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), cats), ("num", "passthrough", nums + ["Predicted_Resolution_Hours", "Predicted_Queue_Delay_Minutes"])])
    m_sla = Pipeline([("pre", sla_pre), ("m", RandomForestClassifier(n_estimators=50, random_state=42))]).fit(sla_train, df["SLA_Breach"])
    
    esc_train = sla_train.copy()
    esc_train["SLA_Breach_Probability"] = df["SLA_Breach"]
    esc_pre = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), cats), ("num", "passthrough", nums + ["Predicted_Resolution_Hours", "Predicted_Queue_Delay_Minutes", "SLA_Breach_Probability"])])
    m_esc = Pipeline([("pre", esc_pre), ("m", RandomForestClassifier(n_estimators=50, random_state=42))]).fit(esc_train, df["Escalation_Priority"])
    
    for key, filename in MODEL_FILES.items():
        save_path = os.path.join(MODELS_DIR, filename)
        if key == "severity":
            joblib.dump(m_sev, save_path)
        elif key == "resolution":
            joblib.dump(m_res, save_path)
        elif key == "queue":
            joblib.dump(m_q, save_path)
        elif key == "workload":
            joblib.dump(m_w, save_path)
        elif key == "sla":
            joblib.dump(m_sla, save_path)
        elif key == "escalation":
            joblib.dump(m_esc, save_path)
            
    print("Synthetic models trained and saved successfully.")


def load_models() -> dict:
    """Loads all 6 trained .pkl models."""
    missing = [filename for filename in MODEL_FILES.values() if not os.path.exists(_resolve_model_path(filename))]
    if missing:
        train_and_save_synthetic_models()
        
    models = {}
    for key, filename in MODEL_FILES.items():
        path = _resolve_model_path(filename)
        models[key] = joblib.load(path)
    return models


def generate_synthetic_inputs():
    """Generates 20 test tickets and 5 analyst records."""
    np.random.seed(101)
    
    # 20 Incidents
    tickets = pd.DataFrame({
        "Incident_ID": [f"INC{i:05d}" for i in range(1, 21)],
        "Incident_Type": np.random.choice(["Ransomware", "Phishing", "DDoS", "Malware", "Data Exfiltration"], 20),
        "Source": np.random.choice(["EDR", "SIEM", "Firewall", "User Report"], 20),
        "Attack_Vector": np.random.choice(["Endpoint", "Email", "Network", "Credential"], 20),
        "Priority": np.random.choice(["P1", "P2", "P3", "P4"], 20, p=[0.25, 0.35, 0.25, 0.15]),
        "Affected_Systems": np.random.randint(1, 25, 20),
        "Users_Affected": np.random.randint(5, 150, 20),
        "Threat_Score": np.random.randint(30, 99, 20),
        "Analyst_Experience_Years": np.random.choice([2, 3, 5, 8], 20),
        "Current_Queue": np.random.randint(5, 25, 20),
        "Available_Analysts": np.random.randint(1, 5, 20),
        "SLA_Hours": np.random.choice([2, 4, 8, 12], 20, p=[0.3, 0.4, 0.2, 0.1]),
        "Historical_Incidents": np.random.randint(10, 50, 20),
        "Time_of_Day": np.random.choice(["Morning", "Afternoon", "Night"], 20),
        "Day_of_Week": np.random.choice(["Mon", "Tue", "Wed", "Thu", "Fri"], 20),
        "Assigned_Analyst": np.random.choice(["A01", "A02", "A03", "A04", "A05"], 20)
    })
    
    # 5 Analysts
    analysts = pd.DataFrame([
        {"Analyst_ID": "A01", "Experience_Years": 2, "Current_Workload": 8, "Maximum_Capacity": 10, "Active_Tickets": 4},
        {"Analyst_ID": "A02", "Experience_Years": 5, "Current_Workload": 5, "Maximum_Capacity": 10, "Active_Tickets": 3},
        {"Analyst_ID": "A03", "Experience_Years": 8, "Current_Workload": 3, "Maximum_Capacity": 8,  "Active_Tickets": 2},
        {"Analyst_ID": "A04", "Experience_Years": 3, "Current_Workload": 9, "Maximum_Capacity": 10, "Active_Tickets": 5},
        {"Analyst_ID": "A05", "Experience_Years": 9, "Current_Workload": 2, "Maximum_Capacity": 8,  "Active_Tickets": 1},
    ])
    
    return tickets, analysts


def main():
    print("Loading models and preparing test environment...")
    models = load_models()
    tickets, analysts = generate_synthetic_inputs()
    
    # Execute Queue Optimization
    results = optimize_queue(tickets, analysts, models)
    opt_queue = results["optimized_queue"]
    metrics = results["metrics"]

    # ----------------------------------------------------
    # DISPLAY: BEFORE OPTIMIZATION QUEUE
    # ----------------------------------------------------
    print("\n" + "=" * 80)
    print("                      BEFORE AI OPTIMIZATION")
    print("=" * 80)
    
    before_display = opt_queue.sort_values(by="original_position")[
        ["original_position", "ticket_id", "predicted_severity", "assigned_analyst_before", "sla_breach_probability_before"]
    ].rename(columns={
        "original_position": "Position",
        "ticket_id": "Ticket",
        "predicted_severity": "Severity",
        "assigned_analyst_before": "Analyst",
        "sla_breach_probability_before": "SLA Risk (%)"
    })
    print(before_display.to_string(index=False))

    # ----------------------------------------------------
    # DISPLAY: AFTER OPTIMIZATION QUEUE
    # ----------------------------------------------------
    print("\n" + "=" * 90)
    print("                      AFTER AI OPTIMIZATION")
    print("=" * 90)
    
    after_display = opt_queue[
        ["new_position", "ticket_id", "predicted_severity", "assigned_analyst_after", "recommended_action", "sla_breach_probability_after"]
    ].rename(columns={
        "new_position": "Position",
        "ticket_id": "Ticket",
        "predicted_severity": "Severity",
        "assigned_analyst_after": "Analyst",
        "recommended_action": "Action",
        "sla_breach_probability_after": "SLA Risk (%)"
    })
    print(after_display.to_string(index=False))

    # ----------------------------------------------------
    # DISPLAY: PERFORMANCE COMPARISON METRICS
    # ----------------------------------------------------
    print("\n" + "=" * 60)
    print("                       PERFORMANCE")
    print("=" * 60)
    print(f"Total Tickets Processed     : {metrics['total_tickets']}")
    print(f"Expected breaches before    : {metrics['expected_breaches_before']}")
    print(f"Expected breaches after     : {metrics['expected_breaches_after']}")
    print(f"Breaches avoided            : {metrics['breaches_avoided']}")
    print(f"Average queue delay before  : {metrics['average_queue_delay_before']} min")
    print(f"Average queue delay after   : {metrics['average_queue_delay_after']} min")
    print(f"Reassignments               : {metrics['number_of_reassignments']}")
    print(f"Escalations                 : {metrics['number_of_escalations']}")
    print(f"Prioritizations             : {metrics['number_of_prioritizations']}")
    print(f"Kept Current                : {metrics['number_kept_current']}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()