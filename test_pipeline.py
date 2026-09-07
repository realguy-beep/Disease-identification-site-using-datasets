import json
import os
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

print("="*75)
print("COMPREHENSIVE MULTI-MODAL CLINICAL SUITE VERIFICATION")
print("="*75)

# 1. Health check with all 5 models
res = client.get("/health")
assert res.status_code == 200
data = res.json()
print("[PASS] 1. GET /health -> Status 200. Models Online:", data["models_active"])
assert data["models_active"]["general_disease_symptom_engine"] is True
assert data["models_active"]["diabetes_risk_predictor"] is True
assert data["models_active"]["stroke_risk_predictor"] is True
assert data["models_active"]["heart_failure_risk_predictor"] is True
assert data["models_active"]["eye_vision_classifier"] is True

# 2. NLP Free-Text Symptom Extraction
res = client.post("/extract-symptoms", json={"text": "Patient has severe throbbing headache, high fever, shivering, and vomiting since yesterday."})
assert res.status_code == 200
nlp_data = res.json()
print(f"[PASS] 2. POST /extract-symptoms (NLP) -> Extracted {nlp_data['matched_count']} symptoms: {[s['key'] for s in nlp_data['matched_symptoms']]}")
assert nlp_data["matched_count"] >= 3

# 3. Model 1 with XAI, Triage Follow-ups, and Normal Flow
res = client.post("/predict", json={"symptoms": ["chills", "vomiting", "high_fever", "sweating", "headache", "nausea"]})
assert res.status_code == 200
p_data = res.json()
top = p_data["top_predictions"][0]
print(f"[PASS] 3a. POST /predict -> Predicted: {top['display_name']} ({top['confidence_percent']})")
print(f"        XAI Feature Drivers: {[x['feature_key'] + ' (' + x['impact'] + ')' for x in top['contributing_symptoms']]}")
print(f"        Dynamic Triage Questions: {[q['label'] for q in p_data['suggested_followup_symptoms']]}")
assert len(top["contributing_symptoms"]) > 0

# 3b. Emergency Red-Flag Trigger
res_em = client.post("/predict", json={"symptoms": ["chest_pain", "breathlessness", "sweating"]})
assert res_em.status_code == 200
assert res_em.json()["emergency_alert"]["is_emergency"] is True
print(f"[PASS] 3b. Emergency Red-Flag Alert Triggered: {res_em.json()['emergency_alert']['title']}")

# 4. Computer Vision Eye Pathology Classifier
sample_eye_path = "data/incoming/archive_2/Eye_diseases/Glaucoma/image-10.jpeg"
if not os.path.exists(sample_eye_path):
    sample_eye_path = "data/incoming/archive_2/Eye_diseases/Eye_diseases/Glaucoma/image-10.jpeg"

with open(sample_eye_path, "rb") as f:
    files = {"file": ("image-10.jpeg", f, "image/jpeg")}
    res_vision = client.post("/predict/eye-disease", files=files)
assert res_vision.status_code == 200
v_data = res_vision.json()
print(f"[PASS] 4. POST /predict/eye-disease (Computer Vision) -> {v_data['primary_prediction']} ({v_data['confidence_percent']})")
assert "all_rankings" in v_data

# 5. Specialized Risk Calculators
res_diab = client.post("/predict/diabetes", json={"glucose": 170.0, "bmi": 36.0, "blood_pressure": 88.0, "age": 52})
assert res_diab.status_code == 200
print(f"[PASS] 5. POST /predict/diabetes -> {res_diab.json()['risk_level']} ({res_diab.json()['probability_percent']})")

res_stroke = client.post("/predict/stroke", json={"age": 72.0, "avg_glucose_level": 220.0, "bmi": 31.0, "hypertension": 1, "heart_disease": 1})
assert res_stroke.status_code == 200
print(f"[PASS] 6. POST /predict/stroke -> {res_stroke.json()['risk_level']} ({res_stroke.json()['probability_percent']})")

res_hf = client.post("/predict/heart-failure", json={"age": 68.0, "ejection_fraction": 20.0, "serum_creatinine": 2.5, "high_blood_pressure": 1})
assert res_hf.status_code == 200
print(f"[PASS] 7. POST /predict/heart-failure -> {res_hf.json()['risk_level']} ({res_hf.json()['probability_percent']})")

# 6. SQLite Audit Logs
res_logs = client.get("/logs?limit=5")
assert res_logs.status_code == 200
assert len(res_logs.json()["logs"]) >= 1
print(f"[PASS] 8. GET /logs -> Verified persistent SQLite logging.")

print("\n" + "="*75)
print("ALL MULTI-MODAL SUITE TESTS (ALL 6 CAPABILITIES) PASSED WITH 100% SUCCESS!")
print("="*75)
