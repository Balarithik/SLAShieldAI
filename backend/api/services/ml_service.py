import os
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional

from queue_optimizer import BASE_FEATURES, NUMERICAL_FEATURES, CATEGORICAL_FEATURES, predict_ticket

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BASE_DIR, "models")

MODEL_FILES = {
    "severity": "severity_model.pkl",
    "resolution": "resolution_model.pkl",
    "queue": "queue_model.pkl",
    "workload": "workload_model.pkl",
    "sla": "sla_model.pkl",
    "escalation": "escalation_model.pkl"
}


class MLService:
    _instance: Optional['MLService'] = None
    _models: Optional[Dict[str, Any]] = None

    def __init__(self):
        if MLService._instance is not None:
            raise RuntimeError("MLService is a singleton. Use MLService.get_instance().")
        self.load_models()

    @classmethod
    def get_instance(cls) -> 'MLService':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_models(self) -> Dict[str, Any]:
        if self._models is not None:
            return self._models

        models = {}
        for key, filename in MODEL_FILES.items():
            path = os.path.join(MODELS_DIR, filename)
            if not os.path.exists(path):
                # Fallback to backend root
                path = os.path.join(BASE_DIR, filename)
            if not os.path.exists(path):
                raise FileNotFoundError(f"Model file {filename} not found at {path}")
            
            models[key] = joblib.load(path)

        self._models = models
        print(f"[MLService] Successfully loaded and cached all 6 ML models into memory.")
        return self._models

    def warm_up(self):
        """Ensures all models are loaded in memory."""
        if self._models is None:
            self.load_models()

    @property
    def models(self) -> Dict[str, Any]:
        if self._models is None:
            return self.load_models()
        return self._models

    def prepare_feature_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes and validates a dictionary of incident features."""
        defaults = {
            "Incident_Type": "Malware",
            "Source": "SIEM",
            "Attack_Vector": "Endpoint",
            "Priority": "P3",
            "Affected_Systems": 5,
            "Users_Affected": 15,
            "Threat_Score": 50.0,
            "Analyst_Experience_Years": 3,
            "Current_Queue": 10,
            "Available_Analysts": 5,
            "SLA_Hours": 4,
            "Historical_Incidents": 20,
            "Time_of_Day": "Morning",
            "Day_of_Week": "Mon"
        }

        # Case-insensitive / snake_case to CamelCase mapping
        mapping = {
            "incident_type": "Incident_Type",
            "source": "Source",
            "attack_vector": "Attack_Vector",
            "priority": "Priority",
            "affected_systems": "Affected_Systems",
            "users_affected": "Users_Affected",
            "threat_score": "Threat_Score",
            "analyst_experience_years": "Analyst_Experience_Years",
            "current_queue": "Current_Queue",
            "available_analysts": "Available_Analysts",
            "sla_hours": "SLA_Hours",
            "historical_incidents": "Historical_Incidents",
            "time_of_day": "Time_of_Day",
            "day_of_week": "Day_of_Week"
        }

        prepared = {}
        for feat in BASE_FEATURES:
            val = data.get(feat)
            if val is None:
                # check snake_case equivalent
                for k, v in mapping.items():
                    if v == feat and k in data:
                        val = data[k]
                        break
            if val is None or pd.isna(val):
                val = defaults[feat]
            
            # Type casting
            if feat in NUMERICAL_FEATURES:
                try:
                    val = float(val) if feat in ["Threat_Score", "SLA_Hours"] else int(float(val))
                except (ValueError, TypeError):
                    val = defaults[feat]
            else:
                val = str(val)

            prepared[feat] = val

        return prepared

    def predict_single(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """Runs the 6 ML models on a single ticket dictionary."""
        feat_dict = self.prepare_feature_dict(ticket_data)
        df = pd.DataFrame([feat_dict])
        
        preds_df = predict_ticket(df, self.models)
        row = preds_df.iloc[0]

        return {
            "ticket_id": ticket_data.get("ticket_id") or ticket_data.get("Ticket_ID") or "INC-PREVIEW",
            "predicted_severity": str(row["Predicted_Severity"]),
            "predicted_resolution_hours": float(row["Predicted_Resolution_Hours"]),
            "predicted_queue_delay": float(row["Predicted_Queue_Delay_Minutes"]),
            "predicted_workload": float(row["Predicted_Analyst_Workload"]),
            "sla_breach_probability": float(row["SLA_Breach_Probability"]),
            "escalation_priority": str(row["Escalation_Priority"]),
            "input_features": feat_dict
        }

    def predict_batch(self, tickets_df: pd.DataFrame) -> pd.DataFrame:
        """Runs the 6 ML models on a pandas DataFrame of tickets."""
        return predict_ticket(tickets_df, self.models)

    def get_model_info(self) -> Dict[str, Any]:
        """Returns metadata about the 6 models."""
        return {
            "system_status": "ONLINE",
            "model_count": len(MODEL_FILES),
            "models": [
                {
                    "name": "Severity Classification",
                    "file": MODEL_FILES["severity"],
                    "algorithm": "Random Forest Classifier",
                    "target": "Severity (Low, Medium, High, Critical)",
                    "type": "Classification"
                },
                {
                    "name": "Resolution Time Prediction",
                    "file": MODEL_FILES["resolution"],
                    "algorithm": "Random Forest Regressor",
                    "target": "Resolution Time (Hours)",
                    "type": "Regression"
                },
                {
                    "name": "Queue Delay Prediction",
                    "file": MODEL_FILES["queue"],
                    "algorithm": "Random Forest Regressor",
                    "target": "Queue Delay (Minutes)",
                    "type": "Regression"
                },
                {
                    "name": "Analyst Workload Prediction",
                    "file": MODEL_FILES["workload"],
                    "algorithm": "Random Forest Regressor",
                    "target": "Future Analyst Workload (Tickets)",
                    "type": "Regression"
                },
                {
                    "name": "SLA Breach Probability",
                    "file": MODEL_FILES["sla"],
                    "algorithm": "Random Forest Classifier (predict_proba)",
                    "target": "SLA Breach Likelihood (0.0 to 1.0)",
                    "type": "Probabilistic Classification"
                },
                {
                    "name": "Escalation Priority Prediction",
                    "file": MODEL_FILES["escalation"],
                    "algorithm": "Random Forest Classifier",
                    "target": "Escalation Priority (P1, P2, P3, P4)",
                    "type": "Classification"
                }
            ],
            "evaluation_notice": "Prototype trained and evaluated on synthetic cybersecurity incident data."
        }

    def compute_model_performance(self) -> Dict[str, Any]:
        """Computes actual performance metrics for all 6 models on a test set."""
        import numpy as np
        from sklearn.metrics import (
            accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
            mean_absolute_error, mean_squared_error, r2_score
        )

        # Generate synthetic test set (similar to training data generation)
        np.random.seed(43)  # Different seed from training
        n_test = 200

        types = np.random.choice(["Malware", "Phishing", "DDoS", "Ransomware", "Unauthorized Access"], n_test)
        sources = np.random.choice(["Firewall", "SIEM", "EDR", "Email Gateway", "IDS"], n_test)
        vectors = np.random.choice(["Email", "Network", "Web", "Endpoint", "Credential"], n_test)
        priorities = np.random.choice(["P1", "P2", "P3", "P4"], n_test)
        aff_sys = np.random.poisson(5, n_test) + 1
        users = np.random.poisson(15, n_test) + 1
        threat = np.clip(np.random.normal(55, 20, n_test), 0, 100)
        exp = np.random.randint(1, 11, n_test)
        queue = np.random.poisson(12, n_test)
        avail = np.random.randint(1, 8, n_test)
        sla_h = np.random.choice([2, 4, 8, 12], n_test)
        hist = np.random.poisson(20, n_test)
        tod = np.random.choice(["Morning", "Afternoon", "Evening", "Night"], n_test)
        dow = np.random.choice(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], n_test)

        # Generate ground truth labels
        risk = 0.45 * threat + 0.8 * aff_sys + 0.3 * users
        sev_true = pd.cut(risk, [-np.inf, 30, 50, 70, np.inf], labels=["Low", "Medium", "High", "Critical"]).astype(str)
        res_t_true = np.maximum(0.5, 1.0 + 0.045 * risk - 0.18 * exp + np.random.normal(0, 0.5, n_test))
        q_delay_true = np.maximum(2, 3 + 2.8 * queue / np.maximum(avail, 1) + np.random.normal(0, 2, n_test))
        workload_true = np.maximum(1, np.round(0.5 * queue + 0.4 * hist))
        sla_b_true = ((res_t_true + q_delay_true / 60) > sla_h).astype(int)
        esc_p_true = pd.cut(risk + 0.8 * q_delay_true + 15 * sla_b_true, [-np.inf, 40, 70, 100, np.inf], labels=["P4", "P3", "P2", "P1"]).astype(str)

        # Create test DataFrame
        test_df = pd.DataFrame({
            "Incident_Type": types, "Source": sources, "Attack_Vector": vectors, "Priority": priorities,
            "Affected_Systems": aff_sys, "Users_Affected": users, "Threat_Score": threat,
            "Analyst_Experience_Years": exp, "Current_Queue": queue, "Available_Analysts": avail,
            "SLA_Hours": sla_h, "Historical_Incidents": hist, "Time_of_Day": tod, "Day_of_Week": dow
        })

        from queue_optimizer import predict_ticket
        preds_df = predict_ticket(test_df, self.models)

        # Compute metrics
        metrics = {}

        # 1. Severity Classification
        sev_pred = preds_df["Predicted_Severity"].values
        metrics["severity"] = {
            "type": "Classification",
            "accuracy": float(accuracy_score(sev_true, sev_pred)),
            "precision": float(precision_score(sev_true, sev_pred, average='weighted', zero_division=0)),
            "recall": float(recall_score(sev_true, sev_pred, average='weighted', zero_division=0)),
            "f1": float(f1_score(sev_true, sev_pred, average='weighted', zero_division=0))
        }

        # 2. Resolution Time Prediction
        res_pred = preds_df["Predicted_Resolution_Hours"].values
        metrics["resolution_time"] = {
            "type": "Regression",
            "mae": float(mean_absolute_error(res_t_true, res_pred)),
            "rmse": float(np.sqrt(mean_squared_error(res_t_true, res_pred))),
            "r2": float(r2_score(res_t_true, res_pred))
        }

        # 3. Queue Delay Prediction
        q_pred = preds_df["Predicted_Queue_Delay_Minutes"].values
        metrics["queue_delay"] = {
            "type": "Regression",
            "mae": float(mean_absolute_error(q_delay_true, q_pred)),
            "rmse": float(np.sqrt(mean_squared_error(q_delay_true, q_pred))),
            "r2": float(r2_score(q_delay_true, q_pred))
        }

        # 4. Analyst Workload Prediction
        wl_pred = preds_df["Predicted_Analyst_Workload"].values
        metrics["analyst_workload"] = {
            "type": "Regression",
            "mae": float(mean_absolute_error(workload_true, wl_pred)),
            "rmse": float(np.sqrt(mean_squared_error(workload_true, wl_pred))),
            "r2": float(r2_score(workload_true, wl_pred))
        }

        # 5. SLA Breach Probability
        sla_pred = (preds_df["SLA_Breach_Probability"] > 0.5).astype(int).values
        sla_proba = preds_df["SLA_Breach_Probability"].values
        try:
            roc_auc = float(roc_auc_score(sla_b_true, sla_proba))
        except:
            roc_auc = 0.5
        metrics["sla_breach"] = {
            "type": "Classification",
            "accuracy": float(accuracy_score(sla_b_true, sla_pred)),
            "precision": float(precision_score(sla_b_true, sla_pred, zero_division=0)),
            "recall": float(recall_score(sla_b_true, sla_pred, zero_division=0)),
            "f1": float(f1_score(sla_b_true, sla_pred, zero_division=0)),
            "roc_auc": roc_auc
        }

        # 6. Escalation Priority Prediction
        esc_pred = preds_df["Escalation_Priority"].values
        metrics["escalation_priority"] = {
            "type": "Classification",
            "accuracy": float(accuracy_score(esc_p_true, esc_pred)),
            "precision": float(precision_score(esc_p_true, esc_pred, average='weighted', zero_division=0)),
            "recall": float(recall_score(esc_p_true, esc_pred, average='weighted', zero_division=0)),
            "f1": float(f1_score(esc_p_true, esc_pred, average='weighted', zero_division=0))
        }

        return metrics
