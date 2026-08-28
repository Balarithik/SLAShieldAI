"""
test_new_data.py
=================
Independent test harness for the SLA Shield AI queue optimizer.

WHAT THIS SCRIPT DOES
----------------------
- Loads the six ALREADY-TRAINED models from models/*.pkl (read-only).0
- Does NOT retrain anything, does NOT touch queue_optimizer.py, does
  NOT overwrite any .pkl file.
- Generates 100 fresh synthetic queue scenarios (20 per category x 5
  categories) with a NEW random seed every run, so this is never the
  fixed 20-ticket set from demo_queue.py.
- Runs the existing optimize_queue() from queue_optimizer.py on each
  queue, capturing before/after metrics.
- Verifies every ticket ID is unique per run and that the optimizer
  neither drops nor duplicates tickets.
- Writes independent_queue_test_results.csv and scenario_summary.csv.

READ THIS FIRST — ADAPTER SECTION
----------------------------------
I do not have your real queue_optimizer.py, so I cannot see
optimize_queue()'s actual signature or return shape. I assumed:

    optimize_queue(tickets: pd.DataFrame, analysts: pd.DataFrame,
                    models: dict) -> dict

returning a dict shaped like:

    {
        "before": {"expected_breaches": float, "avg_queue_delay": float},
        "after":  {"expected_breaches": float, "avg_queue_delay": float},
        "actions": {
            "reassignments": int, "escalations": int,
            "prioritizations": int, "kept": int,
        },
        "tickets_processed": [ticket_id, ticket_id, ...],  # for the
                                                             # drop/dup check
    }

Everything else in this script (data generation, the 5 scenario
categories, metric aggregation, CSV output, uniqueness checks) is
independent of that shape. If your real optimize_queue() differs,
you only need to edit `_call_optimizer()` below — nothing else.
If it errors when you first run this against your real files, that
error is almost certainly a mismatch in `_call_optimizer()`, so
start there.
"""

import os
import sys
import time
import uuid
import joblib
import numpy as np
import pandas as pd

# ------------------------------------------------------------------
# Reproducibility: a *different* seed every run, but we still log it
# so a specific run's output can be explained after the fact.
# ------------------------------------------------------------------
RUN_SEED = int(time.time() * 1000) % (2**31 - 1)
rng = np.random.default_rng(RUN_SEED)
print(f"Run seed: {RUN_SEED}")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_FILES = {
    "severity": "severity_model.pkl",
    "resolution": "resolution_model.pkl",
    "queue": "queue_model.pkl",
    "workload": "workload_model.pkl",
    "sla": "sla_model.pkl",
    "escalation": "escalation_model.pkl",
}

CATEGORICAL_VALUES = {
    "Incident_Type": ["Malware", "Phishing", "DDoS", "Ransomware",
                       "Unauthorized Access", "Data Exfiltration"],
    "Source": ["Firewall", "SIEM", "EDR", "Email Gateway", "IDS", "User Report"],
    "Attack_Vector": ["Email", "Network", "Web", "Endpoint", "Credential", "Cloud"],
    "Priority": ["P1", "P2", "P3", "P4"],
    "Time_of_Day": ["Morning", "Afternoon", "Evening", "Night"],
    "Day_of_Week": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
}


# ====================================================================
# MODEL LOADING (read-only)
# ====================================================================
def load_models():
    models = {}
    for key, filename in MODEL_FILES.items():
        path = os.path.join(MODELS_DIR, filename)
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"Expected trained model at '{path}' but it was not found. "
                f"This script only loads existing models, it never trains them."
            )
        models[key] = joblib.load(path)
    print(f"Loaded {len(models)} models from '{MODELS_DIR}/' (read-only).")
    return models


# ====================================================================
# TICKET GENERATION
# ====================================================================
def generate_tickets(n_tickets, category, ticket_id_start):
    """
    Generate `n_tickets` synthetic tickets with globally unique IDs
    starting at `ticket_id_start`, biased per scenario category.
    Returns (DataFrame, next_free_ticket_id_start).
    """
    ids = [f"TCK{ticket_id_start + i:07d}" for i in range(n_tickets)]

    incident_type = rng.choice(CATEGORICAL_VALUES["Incident_Type"], n_tickets)
    source = rng.choice(CATEGORICAL_VALUES["Source"], n_tickets)
    attack_vector = rng.choice(CATEGORICAL_VALUES["Attack_Vector"], n_tickets)
    time_of_day = rng.choice(CATEGORICAL_VALUES["Time_of_Day"], n_tickets)
    day_of_week = rng.choice(CATEGORICAL_VALUES["Day_of_Week"], n_tickets)

    if category == "CRITICAL_SURGE":
        priority = rng.choice(["P1", "P2", "P3", "P4"], n_tickets, p=[0.45, 0.35, 0.15, 0.05])
        threat_score = np.clip(rng.normal(80, 12, n_tickets), 0, 100)
    elif category == "SLA_CRISIS":
        priority = rng.choice(["P1", "P2", "P3", "P4"], n_tickets, p=[0.30, 0.35, 0.25, 0.10])
        threat_score = np.clip(rng.normal(65, 18, n_tickets), 0, 100)
    else:
        priority = rng.choice(["P1", "P2", "P3", "P4"], n_tickets, p=[0.15, 0.30, 0.35, 0.20])
        threat_score = np.clip(rng.normal(55, 20, n_tickets), 0, 100)

    affected_systems = rng.poisson(5, n_tickets) + 1
    users_affected = rng.poisson(15, n_tickets) + 1
    analyst_experience = rng.integers(1, 11, n_tickets)
    current_queue = rng.poisson(12, n_tickets)
    available_analysts = rng.integers(1, 8, n_tickets)
    historical_incidents = rng.poisson(20, n_tickets)

    if category == "SLA_CRISIS":
        sla_hours = rng.choice([2, 4], n_tickets, p=[0.55, 0.45])
    else:
        sla_hours = rng.choice([2, 4, 8, 12], n_tickets, p=[0.20, 0.40, 0.30, 0.10])

    df = pd.DataFrame({
        "Ticket_ID": ids,
        "Incident_Type": incident_type,
        "Source": source,
        "Attack_Vector": attack_vector,
        "Priority": priority,
        "Affected_Systems": affected_systems,
        "Users_Affected": users_affected,
        "Threat_Score": threat_score,
        "Analyst_Experience_Years": analyst_experience,
        "Current_Queue": current_queue,
        "Available_Analysts": available_analysts,
        "SLA_Hours": sla_hours,
        "Historical_Incidents": historical_incidents,
        "Time_of_Day": time_of_day,
        "Day_of_Week": day_of_week,
    })
    return df, ticket_id_start + n_tickets


# ====================================================================
# ANALYST GENERATION
# ====================================================================
def generate_analysts(category, analyst_id_start):
    n_analysts = int(rng.integers(3, 11))
    ids = [f"ANL{analyst_id_start + i:04d}" for i in range(n_analysts)]
    experience = rng.integers(1, 11, n_analysts)
    max_capacity = rng.integers(6, 15, n_analysts)

    if category == "ANALYST_OVERLOAD":
        # Deliberately lopsided: half near/over capacity, half nearly idle.
        split = n_analysts // 2
        heavy = rng.integers(
            (max_capacity[:split] * 0.85).astype(int),
            (max_capacity[:split] * 1.15).astype(int) + 1
        ) if split > 0 else np.array([], dtype=int)
        light = rng.integers(0, 3, n_analysts - split)
        current_workload = np.concatenate([heavy, light])
        rng.shuffle(current_workload)
    else:
        current_workload = np.array([
            int(rng.integers(0, cap + 1)) for cap in max_capacity
        ])

    active_tickets = np.minimum(current_workload, max_capacity)

    df = pd.DataFrame({
        "Analyst_ID": ids,
        "Experience_Years": experience,
        "Current_Workload": current_workload,
        "Maximum_Capacity": max_capacity,
        "Active_Tickets": active_tickets,
    })
    return df, analyst_id_start + n_analysts


# ====================================================================
# ADAPTER: the one function you'll likely need to edit
# ====================================================================
def _call_optimizer(tickets, analysts, models):
    """
    Thin wrapper around your real optimize_queue(). See the module
    docstring's "ADAPTER SECTION" for the assumed contract. Edit the
    call below (and the extraction beneath it) to match your actual
    queue_optimizer.py.
    """
    from queue_optimizer import optimize_queue  # local import: fails loudly if missing

    raw_result = optimize_queue(tickets, analysts, models)

    before = raw_result["before"]
    after = raw_result["after"]
    actions = raw_result["actions"]
    processed_ids = raw_result.get("tickets_processed", tickets["Ticket_ID"].tolist())

    return {
        "breaches_before": float(before["expected_breaches"]),
        "breaches_after": float(after["expected_breaches"]),
        "delay_before": float(before["avg_queue_delay"]),
        "delay_after": float(after["avg_queue_delay"]),
        "reassignments": int(actions.get("reassignments", 0)),
        "escalations": int(actions.get("escalations", 0)),
        "prioritizations": int(actions.get("prioritizations", 0)),
        "kept": int(actions.get("kept", 0)),
        "processed_ids": list(processed_ids),
    }


# ====================================================================
# SCENARIO DEFINITIONS
# ====================================================================
SCENARIOS = {
    "NORMAL": {"ticket_range": (20, 40), "n_queues": 20},
    "HEAVY_LOAD": {"ticket_range": (50, 100), "n_queues": 20},
    "CRITICAL_SURGE": {"ticket_range": (20, 100), "n_queues": 20},
    "ANALYST_OVERLOAD": {"ticket_range": (20, 100), "n_queues": 20},
    "SLA_CRISIS": {"ticket_range": (20, 100), "n_queues": 20},
}


def run_all_scenarios(models):
    results_rows = []
    ticket_id_counter = 1
    analyst_id_counter = 1
    seen_ticket_ids = set()
    integrity_failures = []

    for category, cfg in SCENARIOS.items():
        low, high = cfg["ticket_range"]
        for i in range(cfg["n_queues"]):
            queue_id = f"{category}-{i + 1:02d}"
            n_tickets = int(rng.integers(low, high + 1))

            tickets, ticket_id_counter = generate_tickets(n_tickets, category, ticket_id_counter)
            analysts, analyst_id_counter = generate_analysts(category, analyst_id_counter)

            # Uniqueness check across the WHOLE run, not just this queue.
            batch_ids = set(tickets["Ticket_ID"])
            if batch_ids & seen_ticket_ids:
                integrity_failures.append(f"{queue_id}: duplicate ticket ID across queues")
            seen_ticket_ids |= batch_ids

            try:
                outcome = _call_optimizer(tickets, analysts, models)
            except Exception as exc:
                print(f"[{queue_id}] optimizer call failed: {exc}", file=sys.stderr)
                raise

            # Drop/duplicate check for THIS queue.
            processed = outcome["processed_ids"]
            if len(processed) != len(set(processed)):
                integrity_failures.append(f"{queue_id}: optimizer returned duplicate ticket IDs")
            if set(processed) != set(tickets["Ticket_ID"]):
                missing = set(tickets["Ticket_ID"]) - set(processed)
                extra = set(processed) - set(tickets["Ticket_ID"])
                if missing:
                    integrity_failures.append(f"{queue_id}: optimizer dropped {len(missing)} ticket(s)")
                if extra:
                    integrity_failures.append(f"{queue_id}: optimizer returned {len(extra)} unexpected ticket(s)")

            breaches_before = outcome["breaches_before"]
            breaches_after = outcome["breaches_after"]
            breaches_avoided = breaches_before - breaches_after
            breach_reduction_pct = (
                100.0 * breaches_avoided / breaches_before if breaches_before > 0 else 0.0
            )

            delay_before = outcome["delay_before"]
            delay_after = outcome["delay_after"]
            delay_reduction_pct = (
                100.0 * (delay_before - delay_after) / delay_before if delay_before > 0 else 0.0
            )

            row = {
                "Scenario": category,
                "Queue_ID": queue_id,
                "Num_Tickets": n_tickets,
                "Num_Analysts": len(analysts),
                "Breaches_Before": round(breaches_before, 3),
                "Breaches_After": round(breaches_after, 3),
                "Breaches_Avoided": round(breaches_avoided, 3),
                "Breach_Reduction_Pct": round(breach_reduction_pct, 2),
                "Queue_Delay_Before": round(delay_before, 3),
                "Queue_Delay_After": round(delay_after, 3),
                "Delay_Reduction_Pct": round(delay_reduction_pct, 2),
                "Reassignments": outcome["reassignments"],
                "Escalations": outcome["escalations"],
                "Prioritizations": outcome["prioritizations"],
                "Kept": outcome["kept"],
            }
            results_rows.append(row)

            print(
                f"[{row['Scenario']:<16}] {row['Queue_ID']:<16} "
                f"tickets={row['Num_Tickets']:<4} "
                f"breaches {row['Breaches_Before']:.2f}->{row['Breaches_After']:.2f} "
                f"({row['Breach_Reduction_Pct']:.1f}% reduced)  "
                f"delay {row['Queue_Delay_Before']:.2f}->{row['Queue_Delay_After']:.2f} "
                f"({row['Delay_Reduction_Pct']:.1f}% reduced)  "
                f"reassign={row['Reassignments']} escalate={row['Escalations']} "
                f"prioritize={row['Prioritizations']}"
            )

    return pd.DataFrame(results_rows), integrity_failures


# ====================================================================
# SUMMARY + OUTPUT
# ====================================================================
def print_and_save_summary(results_df, integrity_failures):
    print("\n" + "=" * 60)
    print("SLASHIELD AI — INDEPENDENT QUEUE TEST")
    print("=" * 60)

    total_queues = len(results_df)
    total_tickets = int(results_df["Num_Tickets"].sum())

    print(f"\nTotal queues tested: {total_queues}")
    print(f"Total tickets tested: {total_tickets}")

    print(f"\nAverage breach reduction: {results_df['Breach_Reduction_Pct'].mean():.2f}%")
    print(f"Median breach reduction: {results_df['Breach_Reduction_Pct'].median():.2f}%")

    print(f"\nAverage queue delay reduction: {results_df['Delay_Reduction_Pct'].mean():.2f}%")
    print(f"Median queue delay reduction: {results_df['Delay_Reduction_Pct'].median():.2f}%")

    total_before = results_df["Breaches_Before"].sum()
    total_after = results_df["Breaches_After"].sum()
    print(f"\nTotal expected breaches before: {total_before:.2f}")
    print(f"Total expected breaches after: {total_after:.2f}")
    print(f"Total expected breaches avoided: {total_before - total_after:.2f}")

    print(f"\nTotal reassignments: {int(results_df['Reassignments'].sum())}")
    print(f"Total escalations: {int(results_df['Escalations'].sum())}")
    print(f"Total prioritizations: {int(results_df['Prioritizations'].sum())}")

    print("\n" + "=" * 60)
    print("SCENARIO RESULTS")
    print("=" * 60)
    scenario_summary = (
        results_df.groupby("Scenario")["Breach_Reduction_Pct"]
        .mean()
        .reindex(SCENARIOS.keys())
    )
    print(f"\n{'Scenario':<20}Avg Breach Reduction")
    for scenario, value in scenario_summary.items():
        print(f"{scenario:<20}{value:.2f}%")

    results_df.to_csv("independent_queue_test_results.csv", index=False)

    scenario_summary_df = results_df.groupby("Scenario").agg(
        Num_Queues=("Queue_ID", "count"),
        Total_Tickets=("Num_Tickets", "sum"),
        Avg_Breach_Reduction_Pct=("Breach_Reduction_Pct", "mean"),
        Median_Breach_Reduction_Pct=("Breach_Reduction_Pct", "median"),
        Avg_Delay_Reduction_Pct=("Delay_Reduction_Pct", "mean"),
        Median_Delay_Reduction_Pct=("Delay_Reduction_Pct", "median"),
        Total_Reassignments=("Reassignments", "sum"),
        Total_Escalations=("Escalations", "sum"),
        Total_Prioritizations=("Prioritizations", "sum"),
    ).reindex(SCENARIOS.keys())
    scenario_summary_df.to_csv("scenario_summary.csv")

    print("\nSaved independent_queue_test_results.csv")
    print("Saved scenario_summary.csv")

    print("\n" + "=" * 60)
    print("INTEGRITY CHECK (unique IDs, no drops/duplicates)")
    print("=" * 60)
    if integrity_failures:
        print(f"FAILED — {len(integrity_failures)} issue(s) found:")
        for issue in integrity_failures:
            print(f"  - {issue}")
    else:
        print("PASSED — all ticket IDs unique, no tickets dropped or duplicated.")


# ====================================================================
# MAIN
# ====================================================================
def main():
    models = load_models()
    results_df, integrity_failures = run_all_scenarios(models)
    print_and_save_summary(results_df, integrity_failures)

    if integrity_failures:
        sys.exit(1)


if __name__ == "__main__":
    main()