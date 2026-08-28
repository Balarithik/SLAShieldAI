"""
Queue Optimizer Engine for Cybersecurity Incident Management
===========================================================
Framework-agnostic library containing simulation, prediction,
scoring, and queue-level SLA optimization routines.
"""

import pandas as pd
import numpy as np

# Default feature definitions matching existing ML system
BASE_FEATURES = [
    "Incident_Type", "Source", "Attack_Vector", "Priority",
    "Affected_Systems", "Users_Affected", "Threat_Score",
    "Analyst_Experience_Years", "Current_Queue", "Available_Analysts",
    "SLA_Hours", "Historical_Incidents", "Time_of_Day", "Day_of_Week"
]

CATEGORICAL_FEATURES = [
    "Incident_Type", "Source", "Attack_Vector", "Priority", "Time_of_Day", "Day_of_Week"
]

NUMERICAL_FEATURES = [
    "Affected_Systems", "Users_Affected", "Threat_Score", "Analyst_Experience_Years",
    "Current_Queue", "Available_Analysts", "SLA_Hours", "Historical_Incidents"
]

DEFAULT_WEIGHTS = {
    "workload_penalty": 0.35,      # Penalty for overloading analysts
    "escalation_penalty": 0.25,    # Penalty for unnecessary escalation
    "reassignment_penalty": 0.15   # Penalty for analyst switching overhead
}


def _extract_ticket_id(row: pd.Series, fallback_idx: int) -> str:
    """Extracts original ticket ID preserving incoming naming convention."""
    for col in ["Ticket_ID", "Incident_ID", "ticket_id", "incident_id", "ID", "id"]:
        if col in row and pd.notna(row[col]):
            return str(row[col])
    return f"INC{fallback_idx:05d}"


def validate_and_prepare_inputs(
    tickets: pd.DataFrame, 
    analysts: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame, str]:
    """
    Validates input DataFrames and prepares them for inference:
    - Ensures non-empty DataFrames
    - Validates analyst roster
    - Normalizes ticket ID column
    - Imputes missing base features with valid defaults if absent
    - Assigns valid default analysts if Assigned_Analyst is missing
    """
    if tickets is None or tickets.empty:
        raise ValueError("Provided ticket batch is empty or None.")
    if analysts is None or analysts.empty:
        raise ValueError("Provided analyst DataFrame is empty or None.")

    required_analyst_cols = ["Analyst_ID", "Experience_Years", "Current_Workload", "Maximum_Capacity"]
    missing_analyst_cols = [c for c in required_analyst_cols if c not in analysts.columns]
    if missing_analyst_cols:
        raise ValueError(f"Analyst DataFrame is missing required columns: {missing_analyst_cols}")

    prepared_tickets = tickets.copy()
    prepared_analysts = analysts.copy()

    # Identify ticket ID column name
    id_col = None
    for col in ["Ticket_ID", "Incident_ID", "ticket_id", "incident_id", "ID", "id"]:
        if col in prepared_tickets.columns:
            id_col = col
            break
    
    if id_col is None:
        id_col = "Ticket_ID"
        prepared_tickets[id_col] = [f"INC{i+1:05d}" for i in range(len(prepared_tickets))]
    else:
        # Fill any missing individual IDs
        prepared_tickets[id_col] = [
            str(val) if pd.notna(val) else f"INC{i+1:05d}" 
            for i, val in enumerate(prepared_tickets[id_col])
        ]

    # Validate Base Features presence and fill reasonable defaults if missing
    default_vals = {
        "Incident_Type": "Malware",
        "Source": "SIEM",
        "Attack_Vector": "Endpoint",
        "Priority": "P3",
        "Time_of_Day": "Morning",
        "Day_of_Week": "Mon",
        "Affected_Systems": 5,
        "Users_Affected": 15,
        "Threat_Score": 50.0,
        "Analyst_Experience_Years": 3,
        "Current_Queue": 10,
        "Available_Analysts": len(analysts),
        "SLA_Hours": 4,
        "Historical_Incidents": 20
    }

    for feature in BASE_FEATURES:
        if feature not in prepared_tickets.columns:
            prepared_tickets[feature] = default_vals[feature]
        else:
            prepared_tickets[feature] = prepared_tickets[feature].fillna(default_vals[feature])

    # Convert numerical types to numeric
    for num_col in NUMERICAL_FEATURES:
        prepared_tickets[num_col] = pd.to_numeric(prepared_tickets[num_col], errors="coerce").fillna(default_vals[num_col])

    # Validate Assigned_Analyst column
    valid_analyst_ids = set(prepared_analysts["Analyst_ID"].astype(str))
    if "Assigned_Analyst" not in prepared_tickets.columns:
        # Round-robin assign from available analysts
        analyst_list = list(valid_analyst_ids)
        prepared_tickets["Assigned_Analyst"] = [analyst_list[i % len(analyst_list)] for i in range(len(prepared_tickets))]
    else:
        # Replace invalid/missing analyst assignments with a valid analyst
        first_analyst = prepared_analysts["Analyst_ID"].iloc[0]
        prepared_tickets["Assigned_Analyst"] = prepared_tickets["Assigned_Analyst"].apply(
            lambda x: str(x) if str(x) in valid_analyst_ids else first_analyst
        )

    return prepared_tickets, prepared_analysts, id_col


def predict_ticket(ticket_df: pd.DataFrame, models: dict) -> pd.DataFrame:
    """
    Runs existing 6 ML models on a DataFrame of incident tickets.
    Does NOT retrain or alter any model.
    """
    X = ticket_df[BASE_FEATURES].copy()
    
    severity = models["severity"].predict(X)
    res_time = models["resolution"].predict(X)
    queue_delay = models["queue"].predict(X)
    workload = models["workload"].predict(X)
    
    # SLA Model Input Prep
    sla_input = X.copy()
    sla_input["Predicted_Resolution_Hours"] = res_time
    sla_input["Predicted_Queue_Delay_Minutes"] = queue_delay
    
    # SLA Breach Probability
    sla_prob = models["sla"].predict_proba(sla_input)[:, 1]
    
    # Escalation Model Input Prep
    esc_input = sla_input.copy()
    esc_input["SLA_Breach_Probability"] = sla_prob
    escalation = models["escalation"].predict(esc_input)
    
    results = ticket_df.copy()
    results["Predicted_Severity"] = severity
    results["Predicted_Resolution_Hours"] = np.round(res_time, 2)
    results["Predicted_Queue_Delay_Minutes"] = np.round(queue_delay, 2)
    results["Predicted_Analyst_Workload"] = np.round(workload, 0)
    results["SLA_Breach_Probability"] = np.round(sla_prob * 100, 2)
    results["Escalation_Priority"] = escalation
    
    return results


def select_best_action_batch(
    ticket_row: pd.Series, 
    analysts_df: pd.DataFrame, 
    models: dict, 
    weights: dict = None
) -> dict:
    """
    Evaluates candidate actions (KEEP_CURRENT, PRIORITIZE, REASSIGN, ESCALATE)
    in a batched prediction call for optimal performance and deterministic decision making.
    """
    if weights is None:
        weights = DEFAULT_WEIGHTS

    current_analyst_id = str(ticket_row.get("Assigned_Analyst", analysts_df["Analyst_ID"].iloc[0]))
    base_dict = ticket_row[BASE_FEATURES].to_dict()

    candidate_configs = []

    # 1. KEEP_CURRENT
    c_keep = dict(base_dict)
    candidate_configs.append({
        "action": "KEEP_CURRENT",
        "assigned_analyst": current_analyst_id,
        "features": c_keep,
        "delay_multiplier": 1.0,
        "penalty": 0.0,
        "reason": "Maintained standard processing queue."
    })

    # 2. PRIORITIZE
    c_prio = dict(base_dict)
    c_prio["Current_Queue"] = max(1, int(c_prio["Current_Queue"]) // 3)
    c_prio["Priority"] = "P1"
    candidate_configs.append({
        "action": "PRIORITIZE",
        "assigned_analyst": current_analyst_id,
        "features": c_prio,
        "delay_multiplier": 0.35,
        "penalty": weights["escalation_penalty"] * 0.5,
        "reason": "Bumped queue priority to mitigate SLA delay."
    })

    # 3. REASSIGN (evaluate each other analyst)
    for _, analyst in analysts_df.iterrows():
        a_id = str(analyst["Analyst_ID"])
        if a_id != current_analyst_id:
            c_reassign = dict(base_dict)
            c_reassign["Analyst_Experience_Years"] = analyst["Experience_Years"]
            c_reassign["Current_Queue"] = analyst["Current_Workload"]
            
            workload_ratio = analyst["Current_Workload"] / max(1, analyst["Maximum_Capacity"])
            workload_penalty = max(0.0, workload_ratio - 0.7) * weights["workload_penalty"]
            total_penalty = weights["reassignment_penalty"] + workload_penalty

            candidate_configs.append({
                "action": "REASSIGN",
                "assigned_analyst": a_id,
                "features": c_reassign,
                "delay_multiplier": 1.0,
                "penalty": total_penalty,
                "reason": f"Reassigned to Analyst {a_id} (Exp: {analyst['Experience_Years']}y)."
            })

    # 4. ESCALATE (assign to most experienced senior analyst)
    senior_analyst = analysts_df.sort_values(by="Experience_Years", ascending=False).iloc[0]
    senior_id = str(senior_analyst["Analyst_ID"])
    c_esc = dict(base_dict)
    c_esc["Analyst_Experience_Years"] = senior_analyst["Experience_Years"]
    c_esc["Current_Queue"] = 1
    c_esc["Priority"] = "P1"
    candidate_configs.append({
        "action": "ESCALATE",
        "assigned_analyst": senior_id,
        "features": c_esc,
        "delay_multiplier": 0.15,
        "penalty": weights["escalation_penalty"],
        "reason": "Escalated for immediate senior tier intervention."
    })

    # Batch execute predictions across all candidates for this ticket
    cand_df = pd.DataFrame([c["features"] for c in candidate_configs])
    cand_pred = predict_ticket(cand_df, models)

    # Recalculate SLA breach probabilities with action-specific delay adjustments
    sla_inputs = cand_df.copy()
    sim_queue_delays = []
    for i, cfg in enumerate(candidate_configs):
        raw_delay = cand_pred["Predicted_Queue_Delay_Minutes"].iloc[i]
        if cfg["action"] == "PRIORITIZE":
            adjusted_delay = max(2.0, raw_delay * cfg["delay_multiplier"])
        elif cfg["action"] == "ESCALATE":
            adjusted_delay = max(1.0, raw_delay * cfg["delay_multiplier"])
        else:
            adjusted_delay = max(1.0, raw_delay)
        sim_queue_delays.append(round(adjusted_delay, 2))

    sla_inputs["Predicted_Resolution_Hours"] = cand_pred["Predicted_Resolution_Hours"]
    sla_inputs["Predicted_Queue_Delay_Minutes"] = sim_queue_delays
    adjusted_sla_probs = np.round(models["sla"].predict_proba(sla_inputs)[:, 1] * 100, 2)

    # Score each candidate: action_score = (sla_breach_prob / 100.0) + penalty
    best_candidate = None
    min_score = float("inf")

    for i, cfg in enumerate(candidate_configs):
        sla_prob = adjusted_sla_probs[i]
        score = (sla_prob / 100.0) + cfg["penalty"]
        
        # Tie-breaker: prefer earlier action (KEEP_CURRENT > PRIORITIZE > REASSIGN > ESCALATE)
        if score < min_score - 1e-6:
            min_score = score
            best_candidate = {
                "action": cfg["action"],
                "assigned_analyst": cfg["assigned_analyst"],
                "sla_breach_prob": sla_prob,
                "predicted_queue_delay": sim_queue_delays[i],
                "predicted_resolution_hours": cand_pred["Predicted_Resolution_Hours"].iloc[i],
                "reason": cfg["reason"],
                "score": score
            }

    return best_candidate


def calculate_metrics(before_df: pd.DataFrame, after_df: pd.DataFrame) -> dict:
    """Calculates before vs after queue performance metrics."""
    total_tickets = len(before_df)
    
    high_risk_before = int((before_df["SLA_Breach_Probability"] >= 50).sum())
    high_risk_after = int((after_df["sla_breach_probability_after"] >= 50).sum())
    
    expected_breaches_before = round(float(before_df["SLA_Breach_Probability"].sum() / 100.0), 2)
    expected_breaches_after = round(float(after_df["sla_breach_probability_after"].sum() / 100.0), 2)
    breaches_avoided = round(max(0.0, expected_breaches_before - expected_breaches_after), 2)
    
    avg_delay_before = round(float(before_df["Predicted_Queue_Delay_Minutes"].mean()), 2)
    avg_delay_after = round(float(after_df["predicted_queue_delay"].mean()), 2)
    
    actions = after_df["recommended_action"].value_counts().to_dict()
    
    return {
        "total_tickets": total_tickets,
        "high_risk_before": high_risk_before,
        "high_risk_after": high_risk_after,
        "expected_breaches_before": expected_breaches_before,
        "expected_breaches_after": expected_breaches_after,
        "breaches_avoided": breaches_avoided,
        "average_queue_delay_before": avg_delay_before,
        "average_queue_delay_after": avg_delay_after,
        "number_of_reassignments": actions.get("REASSIGN", 0),
        "number_of_escalations": actions.get("ESCALATE", 0),
        "number_of_prioritizations": actions.get("PRIORITIZE", 0),
        "number_kept_current": actions.get("KEEP_CURRENT", 0)
    }


def optimize_queue(
    tickets: pd.DataFrame, 
    analysts: pd.DataFrame, 
    models: dict, 
    weights: dict = None
) -> dict:
    """
    Main entry point for Queue SLA Optimization. Accepts incident DataFrames and
    analyst tables, returns optimized queue and comprehensive performance metrics.
    """
    # Step 1: Input Validation & Preparation
    prep_tickets, prep_analysts, id_col = validate_and_prepare_inputs(tickets, analysts)

    # Step 2: Baseline Predictions
    predicted_tickets = predict_ticket(prep_tickets, models)
    
    # Step 3: Establish Original Queue Ordering
    sev_map = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    esc_map = {"P4": 1, "P3": 2, "P2": 3, "P1": 4}
    
    predicted_tickets["Sev_Rank"] = predicted_tickets["Predicted_Severity"].map(sev_map).fillna(1)
    predicted_tickets["Esc_Rank"] = predicted_tickets["Escalation_Priority"].map(esc_map).fillna(1)
    
    # Stable baseline sorting
    predicted_tickets = predicted_tickets.sort_values(
        by=["SLA_Breach_Probability", "Sev_Rank", "Esc_Rank"], 
        ascending=[False, False, False]
    ).reset_index(drop=True)
    
    predicted_tickets["original_position"] = predicted_tickets.index + 1

    # Step 4: Simulate & Select Best Action for each ticket
    optimized_rows = []
    
    for idx, row in predicted_tickets.iterrows():
        best_action = select_best_action_batch(row, prep_analysts, models, weights)
        
        opt_row = {
            "ticket_id": str(row[id_col]),
            "original_position": int(row["original_position"]),
            "predicted_severity": row["Predicted_Severity"],
            "predicted_resolution_hours": float(row["Predicted_Resolution_Hours"]),
            "predicted_queue_delay": float(best_action["predicted_queue_delay"]),
            "sla_breach_probability_before": float(row["SLA_Breach_Probability"]),
            "recommended_action": best_action["action"],
            "assigned_analyst_before": str(row["Assigned_Analyst"]),
            "assigned_analyst_after": str(best_action["assigned_analyst"]),
            "sla_breach_probability_after": float(best_action["sla_breach_prob"]),
            "escalation_priority": row["Escalation_Priority"],
            "reason": best_action["reason"],
            "Sev_Rank": row["Sev_Rank"],
            "Esc_Rank": row["Esc_Rank"]
        }
        optimized_rows.append(opt_row)
        
    opt_df = pd.DataFrame(optimized_rows)
    
    # Step 5: Sort Modified Queue
    opt_df = opt_df.sort_values(
        by=["sla_breach_probability_after", "Sev_Rank", "Esc_Rank", "predicted_queue_delay"],
        ascending=[False, False, False, True]
    ).reset_index(drop=True)
    
    opt_df["new_position"] = opt_df.index + 1
    
    # Clean up internal sorting ranks from final DataFrame
    opt_df = opt_df.drop(columns=["Sev_Rank", "Esc_Rank"])
    
    # Step 6: Calculate Before vs After Metrics
    metrics = calculate_metrics(predicted_tickets, opt_df)
    
    # Construct complete unified return dictionary
    return {
        "optimized_queue": opt_df,
        "metrics": metrics,
        "tickets_processed": opt_df["ticket_id"].tolist(),
        "before": {
            "expected_breaches": metrics["expected_breaches_before"],
            "avg_queue_delay": metrics["average_queue_delay_before"],
            "high_risk_count": metrics["high_risk_before"]
        },
        "after": {
            "expected_breaches": metrics["expected_breaches_after"],
            "avg_queue_delay": metrics["average_queue_delay_after"],
            "high_risk_count": metrics["high_risk_after"]
        },
        "actions": {
            "reassignments": metrics["number_of_reassignments"],
            "escalations": metrics["number_of_escalations"],
            "prioritizations": metrics["number_of_prioritizations"],
            "kept": metrics["number_kept_current"]
        }
    }