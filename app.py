import os
import re
import io
import pickle
import pandas as pd
import numpy as np
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from PIL import Image

import database

database.init_db()

MODEL_PATH = "model/disease_model.pkl"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "model", "disease_model.pkl")
with open(MODEL_PATH, "rb") as f:
    model_bundle = pickle.load(f)

rf_model = model_bundle["model"]
label_encoder = model_bundle["label_encoder"]
symptom_features = model_bundle["symptom_features"]
symptoms_meta = model_bundle["symptoms_meta"]
disease_classes = model_bundle["classes"]

SPEC_MODEL_PATH = "model/specialized_models.pkl"
SPEC_MODEL_PATH = os.path.join(BASE_DIR, "model", "specialized_models.pkl")
spec_bundle = None
if os.path.exists(SPEC_MODEL_PATH):
    with open(SPEC_MODEL_PATH, "rb") as f:
        spec_bundle = pickle.load(f)

EYE_MODEL_PATH = "model/eye_vision_model.pkl"
EYE_MODEL_PATH = os.path.join(BASE_DIR, "model", "eye_vision_model.pkl")
eye_bundle = None
if os.path.exists(EYE_MODEL_PATH):
    with open(EYE_MODEL_PATH, "rb") as f:
        eye_bundle = pickle.load(f)

def normalize_symptom_key(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    return re.sub(r'_+', '_', s).strip('_')

SYMPTOM_LABEL_MAP = {s["key"]: s["label"] for s in symptoms_meta}

training_df = pd.read_csv("data/Training.csv")
TRAINING_DATA_PATH = os.path.join(BASE_DIR, "data", "Training.csv")
training_df = pd.read_csv(TRAINING_DATA_PATH)
if 'Unnamed: 133' in training_df.columns:
    training_df = training_df.drop(columns=['Unnamed: 133'])
raw_cols = [c for c in training_df.columns if c != 'prognosis']
training_df = training_df.rename(columns=dict(zip(raw_cols, [normalize_symptom_key(c) for c in raw_cols])))
training_df['prognosis'] = training_df['prognosis'].astype(str).str.strip()

DISEASE_SYMPTOM_PROFILES = {}
for d, group in training_df.groupby('prognosis'):
    profile = group[symptom_features].mean()
    DISEASE_SYMPTOM_PROFILES[d] = profile[profile > 0.4].to_dict()

EMERGENCY_RULES = [
    {
        "name": "Possible Acute Coronary Syndrome / Heart Attack",
        "cluster": {"chest_pain", "breathlessness", "sweating"},
        "severity": "CRITICAL",
        "instructions": ["CALL 911 / 112 IMMEDIATELY", "Chew aspirin (325mg) if advised", "Rest comfortably"]
    },
    {
        "name": "Possible Stroke / Acute Neurological Event",
        "cluster": {"altered_sensorium", "loss_of_balance", "unsteadiness", "headache"},
        "severity": "CRITICAL",
        "instructions": ["CALL 911 / 112 IMMEDIATELY", "Check F.A.S.T. signs", "Do NOT give food or water"]
    }
]

DISEASE_INFO = {
    "(vertigo) Paroymsal  Positional Vertigo": {
        "display_name": "Benign Paroxysmal Positional Vertigo (BPPV)",
        "description": "An inner ear disorder causing short episodes of vertigo.",
        "precautions": ["Perform Epley maneuver", "Avoid sudden head turns", "Sleep elevated"]
    },
    "AIDS": {
        "display_name": "Acquired Immunodeficiency Syndrome (AIDS)",
        "description": "Chronic condition caused by HIV weakening immunity.",
        "precautions": ["Consult infectious disease specialist", "Adhere to ART therapy", "Monitor CD4 count"]
    },
    "Acne": {
        "display_name": "Acne Vulgaris",
        "description": "Skin condition where hair follicles become plugged with oil.",
        "precautions": ["Wash face twice daily", "Avoid picking blemishes", "Use non-comedogenic products"]
    },
    "Alcoholic hepatitis": {
        "display_name": "Alcoholic Hepatitis",
        "description": "Liver inflammation caused by chronic heavy alcohol intake.",
        "precautions": ["Strict alcohol cessation", "Hepatologist evaluation", "Nutrient-dense diet"]
    },
    "Allergy": {
        "display_name": "Allergic Reaction",
        "description": "Exaggerated immune response to allergens.",
        "precautions": ["Eliminate allergen exposure", "Use antihistamines", "Carry EpiPen if severe"]
    },
    "Arthritis": {
        "display_name": "Arthritis (Joint Inflammation)",
        "description": "Joint inflammation causing stiffness and pain.",
        "precautions": ["Low-impact joint exercises", "Hot/cold compress", "Healthy weight maintenance"]
    },
    "Bronchial Asthma": {
        "display_name": "Bronchial Asthma",
        "description": "Chronic airway inflammation causing wheezing and dyspnea.",
        "precautions": ["Keep rescue inhaler close", "Avoid smoke/cold triggers", "Track peak flow"]
    },
    "Cervical spondylosis": {
        "display_name": "Cervical Spondylosis",
        "description": "Age-related wear affecting cervical spine discs.",
        "precautions": ["Neck mobility exercises", "Ergonomic posture", "Supportive pillow"]
    },
    "Chicken pox": {
        "display_name": "Chickenpox (Varicella)",
        "description": "Contagious viral infection causing itchy blister rash.",
        "precautions": ["Isolate until crusted", "Calamine lotion", "Avoid scratching"]
    },
    "Chronic cholestasis": {
        "display_name": "Chronic Cholestasis",
        "description": "Impaired bile excretion from the liver.",
        "precautions": ["Consult gastroenterologist", "Low-fat diet", "Avoid alcohol"]
    },
    "Common Cold": {
        "display_name": "Common Cold",
        "description": "Viral upper respiratory infection causing congestion and sneezing.",
        "precautions": ["Rest and sleep", "Warm fluids", "Saline sprays", "Hand hygiene"]
    },
    "Dengue": {
        "display_name": "Dengue Fever",
        "description": "Mosquito-borne viral disease with high fever, rash, and joint pain.",
        "precautions": ["Monitor platelet counts", "Aggressive oral hydration", "Use Paracetamol only"]
    },
    "Diabetes": {
        "display_name": "Diabetes Mellitus",
        "description": "Metabolic disorder characterized by elevated blood glucose.",
        "precautions": ["Monitor blood sugar", "Low-glycemic diet", "150 min/week exercise"]
    },
    "Dimorphic hemmorhoids(piles)": {
        "display_name": "Hemorrhoids (Piles)",
        "description": "Swollen veins in rectum/anus causing discomfort.",
        "precautions": ["High fiber diet", "8-10 glasses water", "Warm sitz baths"]
    },
    "Drug Reaction": {
        "display_name": "Adverse Drug Reaction",
        "description": "Unexpected or allergic pharmaceutical response.",
        "precautions": ["Discontinue suspected medication under doctor advice", "Seek ER if wheezing"]
    },
    "Fungal infection": {
        "display_name": "Fungal Skin Infection",
        "description": "Fungal skin infection causing circular red itchy patches.",
        "precautions": ["Keep areas clean/dry", "Topical antifungal cream", "Cotton clothes"]
    },
    "GERD": {
        "display_name": "Gastroesophageal Reflux Disease",
        "description": "Stomach acid backflow irritating esophagus.",
        "precautions": ["Avoid spicy/acidic foods", "Don't lie down for 3h after eating", "Elevate bed head"]
    },
    "Gastroenteritis": {
        "display_name": "Gastroenteritis",
        "description": "Stomach flu with diarrhea and vomiting.",
        "precautions": ["Drink ORS fluids", "Follow BRAT diet", "Rest and hygiene"]
    },
    "Heart attack": {
        "display_name": "Myocardial Infarction (Heart Attack)",
        "description": "Blocked blood supply to heart muscle.",
        "precautions": ["CALL 911 / 112 IMMEDIATELY", "Chew aspirin (325mg)", "Stay calm"]
    },
    "Hepatitis B": {
        "display_name": "Hepatitis B",
        "description": "Viral liver infection transmitted via bodily fluids.",
        "precautions": ["Hepatology antiviral evaluation", "Avoid alcohol", "Vaccinate contacts"]
    },
    "Hepatitis C": {
        "display_name": "Hepatitis C",
        "description": "Blood-borne viral infection causing liver inflammation.",
        "precautions": ["Direct-acting antivirals", "Abstain from alcohol", "Avoid sharing razors"]
    },
    "Hepatitis D": {
        "display_name": "Hepatitis D",
        "description": "Liver infection occurring alongside Hepatitis B.",
        "precautions": ["Specialist hepatology care", "Antiviral regimen", "Liver monitoring"]
    },
    "Hepatitis E": {
        "display_name": "Hepatitis E",
        "description": "Acute liver infection transmitted via water.",
        "precautions": ["Drink boiled water", "Complete bed rest", "Hospitalization if pregnant"]
    },
    "Hypertension": {
        "display_name": "Essential Hypertension",
        "description": "Chronically high systemic blood pressure.",
        "precautions": ["Reduce sodium (<2g/day)", "Aerobic exercise", "Take medications"]
    },
    "Hyperthyroidism": {
        "display_name": "Hyperthyroidism",
        "description": "Overactive thyroid accelerating metabolism.",
        "precautions": ["Endocrinology consult", "Take antithyroid meds", "Avoid excess iodine"]
    },
    "Hypoglycemia": {
        "display_name": "Hypoglycemia",
        "description": "Abnormally low blood sugar level.",
        "precautions": ["15-15 rule (15g fast carbs)", "Carry glucose tabs", "Regular meals"]
    },
    "Hypothyroidism": {
        "display_name": "Hypothyroidism",
        "description": "Underactive thyroid slowing metabolism.",
        "precautions": ["Take levothyroxine on empty stomach", "Regular TSH tests", "Balanced diet"]
    },
    "Impetigo": {
        "display_name": "Impetigo",
        "description": "Contagious bacterial skin infection with crusting sores.",
        "precautions": ["Wash with mild soap", "Antibacterial ointment", "Short clean nails"]
    },
    "Jaundice": {
        "display_name": "Jaundice",
        "description": "Yellow skin/eye pigmentation from high bilirubin.",
        "precautions": ["Liver tests & ultrasound", "Abundant fluids", "Avoid alcohol/fat"]
    },
    "Malaria": {
        "display_name": "Malaria",
        "description": "Parasitic mosquito-borne infection with cyclic fever.",
        "precautions": ["Immediate blood test", "Full antimalarial course", "Mosquito nets"]
    },
    "Migraine": {
        "display_name": "Migraine Headache",
        "description": "Throbbing unilateral headache with light sensitivity.",
        "precautions": ["Rest in dark quiet room", "Cold compresses", "Avoid food triggers"]
    },
    "Osteoarthristis": {
        "display_name": "Osteoarthritis",
        "description": "Cartilage wear in joints causing pain and stiffness.",
        "precautions": ["Low impact exercise", "Weight management", "Supportive footwear"]
    },
    "Paralysis (brain hemorrhage)": {
        "display_name": "Stroke / Brain Hemorrhage",
        "description": "Acute focal brain bleeding causing paralysis.",
        "precautions": ["CALL 911 / 112 IMMEDIATELY", "F.A.S.T check", "Emergency CT scan"]
    },
    "Peptic ulcer diseae": {
        "display_name": "Peptic Ulcer Disease",
        "description": "Sores on stomach/intestinal lining.",
        "precautions": ["Endoscopy evaluation", "Avoid NSAID painkillers", "Take prescribed PPIs"]
    },
    "Pneumonia": {
        "display_name": "Pneumonia",
        "description": "Lung air sac infection and fluid accumulation.",
        "precautions": ["Chest X-ray & antibiotics", "Monitor oxygen saturation", "Hydration and rest"]
    },
    "Psoriasis": {
        "display_name": "Psoriasis",
        "description": "Autoimmune skin disease causing silvery scaly plaques.",
        "precautions": ["Moisturize skin", "Lukewarm baths", "Dermatologist therapy"]
    },
    "Tuberculosis": {
        "display_name": "Tuberculosis (TB)",
        "description": "Bacterial lung infection with chronic cough.",
        "precautions": ["Complete 6-9 month DOTS course", "Wear mask", "Nutritious diet"]
    },
    "Typhoid": {
        "display_name": "Typhoid Fever",
        "description": "Bacterial infection causing sustained high fever.",
        "precautions": ["Complete antibiotic course", "Drink boiled water", "Hand hygiene"]
    },
    "Urinary tract infection": {
        "display_name": "Urinary Tract Infection",
        "description": "Bacterial infection of bladder/urinary tract.",
        "precautions": ["Drink plenty of water", "Urine culture & antibiotics", "Prompt urination"]
    },
    "Varicose veins": {
        "display_name": "Varicose Veins",
        "description": "Enlarged twisted veins in legs.",
        "precautions": ["Compression stockings", "Elevate legs", "Avoid prolonged standing"]
    },
    "hepatitis A": {
        "display_name": "Hepatitis A",
        "description": "Acute viral liver infection from contaminated food/water.",
        "precautions": ["Full bed rest", "Small frequent meals", "Strict hygiene"]
    }
}

app = FastAPI(
    title="Disease Prediction API",
    description="API for symptom-based disease prediction, risk scoring, and image classification experiments.",
    version="1.0.0"
)

allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
allow_credentials = bool(allowed_origins_env)
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()] if allowed_origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    symptoms: List[str] = Field(..., description="List of symptom keys selected by user")

class FeatureAttribution(BaseModel):
    feature_key: str
    label: str
    impact: str

class DiseaseScore(BaseModel):
    rank: int
    disease: str
    display_name: str
    confidence: float
    confidence_percent: str
    description: str
    precautions: List[str]
    contributing_symptoms: List[FeatureAttribution]

class EmergencyAlert(BaseModel):
    is_emergency: bool
    title: str
    severity: str
    instructions: List[str]

class PredictResponse(BaseModel):
    selected_symptoms: List[str]
    selected_symptoms_count: int
    unrecognized_symptoms: List[str]
    emergency_alert: Optional[EmergencyAlert]
    top_predictions: List[DiseaseScore]
    suggested_followup_symptoms: List[Dict[str, str]]
    disclaimer: str

class NLPTextRequest(BaseModel):
    text: str = Field(..., min_length=3)

class DiabetesInput(BaseModel):
    pregnancies: int = Field(default=0, ge=0, le=20)
    glucose: float = Field(..., ge=40, le=300)
    blood_pressure: float = Field(..., ge=30, le=200)
    skin_thickness: float = Field(default=20, ge=0, le=99)
    insulin: float = Field(default=80, ge=0, le=900)
    bmi: float = Field(..., ge=10, le=70)
    diabetes_pedigree: float = Field(default=0.47, ge=0.05, le=3.0)
    age: int = Field(..., ge=1, le=120)

class StrokeInput(BaseModel):
    gender: str = Field(default="Male")
    age: float = Field(..., ge=1, le=120)
    hypertension: int = Field(default=0, ge=0, le=1)
    heart_disease: int = Field(default=0, ge=0, le=1)
    ever_married: str = Field(default="Yes")
    work_type: str = Field(default="Private")
    residence_type: str = Field(default="Urban")
    avg_glucose_level: float = Field(..., ge=40, le=350)
    bmi: float = Field(..., ge=10, le=70)
    smoking_status: str = Field(default="never smoked")

class HeartFailureInput(BaseModel):
    age: float = Field(..., ge=18, le=110)
    anaemia: int = Field(default=0, ge=0, le=1)
    creatinine_phosphokinase: float = Field(default=250, ge=20, le=8000)
    diabetes: int = Field(default=0, ge=0, le=1)
    ejection_fraction: float = Field(..., ge=10, le=80)
    high_blood_pressure: int = Field(default=0, ge=0, le=1)
    platelets: float = Field(default=250000, ge=20000, le=900000)
    serum_creatinine: float = Field(..., ge=0.3, le=15.0)
    serum_sodium: float = Field(default=137, ge=110, le=160)
    sex: int = Field(default=1, ge=0, le=1)
    smoking: int = Field(default=0, ge=0, le=1)
    time: int = Field(default=120, ge=1, le=300)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "models_active": {
            "general_disease_symptom_engine": True,
            "diabetes_risk_predictor": spec_bundle is not None and "diabetes" in spec_bundle,
            "stroke_risk_predictor": spec_bundle is not None and "stroke" in spec_bundle,
            "heart_failure_risk_predictor": spec_bundle is not None and "heart_failure" in spec_bundle,
            "eye_vision_classifier": eye_bundle is not None
        },
        "total_symptom_features": len(symptom_features),
        "total_disease_classes": len(disease_classes),
        "disclaimer": "Educational tool only — not medical advice."
    }

@app.get("/symptoms")
def get_symptoms():
    return {
        "total": len(symptoms_meta),
        "symptoms": symptoms_meta
    }

@app.post("/extract-symptoms")
def extract_symptoms_nlp(payload: NLPTextRequest):
    text_lower = payload.text.lower()
    extracted = []
    for item in symptoms_meta:
        key = item["key"]
        label = item["label"].lower()
        key_words = key.replace("_", " ")
        if key_words in text_lower or label in text_lower or key in text_lower:
            extracted.append({"key": key, "label": item["label"]})
    return {
        "query": payload.text,
        "matched_count": len(extracted),
        "matched_symptoms": extracted
    }

@app.post("/predict", response_model=PredictResponse)
def predict_disease(payload: PredictRequest, request: Request):
    if not payload.symptoms or len(payload.symptoms) == 0:
        raise HTTPException(status_code=400, detail="No symptoms provided.")
    
    known_symptoms_set = set(symptom_features)
    input_df = pd.DataFrame(np.zeros((1, len(symptom_features)), dtype=int), columns=symptom_features)
    matched_features = []
    unrecognized = []
    
    for raw_item in payload.symptoms:
        cleaned_key = normalize_symptom_key(raw_item)
        if not cleaned_key:
            continue
        if cleaned_key in known_symptoms_set:
            input_df.at[0, cleaned_key] = 1
            if cleaned_key not in matched_features:
                matched_features.append(cleaned_key)
        else:
            if raw_item not in unrecognized:
                unrecognized.append(raw_item)
            
    if len(matched_features) == 0:
        raise HTTPException(status_code=400, detail="None of the provided symptoms match our catalog.")
    
    matched_set = set(matched_features)
    emergency_detected = None
    for rule in EMERGENCY_RULES:
        if rule["cluster"].intersection(matched_set) or ("chest_pain" in matched_set and "breathlessness" in matched_set):
            emergency_detected = EmergencyAlert(
                is_emergency=True,
                title=rule["name"],
                severity=rule["severity"],
                instructions=rule["instructions"]
            )
            break
            
    probabilities = rf_model.predict_proba(input_df)[0]
    top_indices = np.argsort(probabilities)[::-1][:3]
    
    results = []
    top_disease_names = []
    for rank, idx in enumerate(top_indices, 1):
        raw_disease_name = str(disease_classes[idx])
        conf = float(probabilities[idx])
        top_disease_names.append(raw_disease_name.strip())
        
        info = DISEASE_INFO.get(raw_disease_name, {
            "display_name": raw_disease_name.strip(),
            "description": f"Clinical presentation consistent with {raw_disease_name.strip()}.",
            "precautions": ["Consult a medical professional", "Perform clinical tests", "Monitor symptoms", "Stay hydrated"]
        })
        
        disease_profile = DISEASE_SYMPTOM_PROFILES.get(raw_disease_name.strip(), {})
        contributing = []
        for s in matched_features:
            if s in disease_profile:
                contributing.append(FeatureAttribution(
                    feature_key=s,
                    label=SYMPTOM_LABEL_MAP.get(s, s.replace('_', ' ').title()),
                    impact="High Positive Driver" if disease_profile[s] >= 0.8 else "Moderate Contributor"
                ))
                
        results.append(DiseaseScore(
            rank=rank,
            disease=raw_disease_name.strip(),
            display_name=info.get("display_name", raw_disease_name.strip()),
            confidence=round(conf, 4),
            confidence_percent=f"{conf * 100:.1f}%",
            description=info["description"],
            precautions=info["precautions"],
            contributing_symptoms=contributing
        ))
        
    followup_symptoms = []
    candidate_profiles = [DISEASE_SYMPTOM_PROFILES.get(d, {}) for d in top_disease_names]
    candidate_syms = set()
    for cp in candidate_profiles:
        candidate_syms.update(cp.keys())
    
    unselected_candidates = candidate_syms - matched_set
    for s_key in list(unselected_candidates)[:4]:
        followup_symptoms.append({
            "key": s_key,
            "label": SYMPTOM_LABEL_MAP.get(s_key, s_key.replace('_', ' ').title())
        })
        
    client_ip = request.client.host if request.client else None
    database.log_prediction(
        symptoms=matched_features,
        predictions=[{"disease": r.disease, "confidence": r.confidence} for r in results],
        client_ip=client_ip
    )
    
    return PredictResponse(
        selected_symptoms=matched_features,
        selected_symptoms_count=len(matched_features),
        unrecognized_symptoms=unrecognized,
        emergency_alert=emergency_detected,
        top_predictions=results,
        suggested_followup_symptoms=followup_symptoms,
        disclaimer="Educational tool only — not medical advice."
    )

@app.post("/predict/eye-disease")
async def predict_eye_disease(file: UploadFile = File(...)):
    if not eye_bundle:
        raise HTTPException(status_code=503, detail="Eye vision model not loaded.")
    try:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents)).convert('RGB')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")
        
    img_resized = pil_img.resize((96, 96))
    arr = np.array(img_resized, dtype=np.float32) / 255.0
    
    feats = []
    for c in range(3):
        channel = arr[:, :, c]
        feats.extend([
            float(np.mean(channel)), float(np.std(channel)),
            float(np.median(channel)), float(np.percentile(channel, 25)), float(np.percentile(channel, 75))
        ])
    for c in range(3):
        hist, _ = np.histogram(arr[:, :, c], bins=16, range=(0, 1), density=True)
        feats.extend(hist.tolist())
    h, w, _ = arr.shape
    bh, bw = h // 3, w // 3
    for i in range(3):
        for j in range(3):
            block = arr[i*bh:(i+1)*bh, j*bw:(j+1)*bw, :]
            for c in range(3):
                feats.append(float(np.mean(block[:, :, c])))
    gray = np.dot(arr[..., :3], [0.2989, 0.5870, 0.1140])
    gx, gy = np.gradient(gray)
    grad_mag = np.sqrt(gx**2 + gy**2)
    feats.extend([float(np.mean(grad_mag)), float(np.std(grad_mag)), float(np.max(grad_mag))])
    
    feats_arr = np.array([feats], dtype=np.float32)
    pipeline = eye_bundle['pipeline']
    classes = eye_bundle['classes']
    descriptions = eye_bundle['class_descriptions']
    
    probs = pipeline.predict_proba(feats_arr)[0]
    top_idx = int(np.argmax(probs))
    pred_class = str(classes[top_idx])
    confidence = float(probs[top_idx])
    
    all_scores = []
    for idx, c_name in enumerate(classes):
        all_scores.append({
            "class_key": c_name,
            "display_name": descriptions.get(c_name, {}).get("display_name", c_name),
            "probability": round(float(probs[idx]), 4),
            "probability_percent": f"{float(probs[idx]) * 100:.1f}%"
        })
    all_scores.sort(key=lambda x: x["probability"], reverse=True)
    
    info = descriptions.get(pred_class, {
        "display_name": pred_class.replace("_", " "),
        "description": "Ophthalmic presentation observed on scan.",
        "precautions": ["Consult an eye specialist for examination."]
    })
    
    return {
        "model": "Eye Image Classifier",
        "primary_prediction": info["display_name"],
        "confidence": round(confidence, 4),
        "confidence_percent": f"{confidence * 100:.1f}%",
        "description": info["description"],
        "precautions": info["precautions"],
        "all_rankings": all_scores,
        "disclaimer": "Educational project only. Not intended for clinical diagnosis."
    }

@app.post("/predict/diabetes")
def predict_diabetes_risk(payload: DiabetesInput):
    if not spec_bundle or 'diabetes' not in spec_bundle:
        raise HTTPException(status_code=503, detail="Diabetes model not loaded.")
    pipe = spec_bundle['diabetes']['pipeline']
    data = pd.DataFrame([{
        'Pregnancies': payload.pregnancies, 'Glucose': payload.glucose,
        'BloodPressure': payload.blood_pressure, 'SkinThickness': payload.skin_thickness,
        'Insulin': payload.insulin, 'BMI': payload.bmi,
        'DiabetesPedigreeFunction': payload.diabetes_pedigree, 'Age': payload.age
    }])
    prob = float(pipe.predict_proba(data)[0][1])
    risk_level = "High" if prob >= 0.60 else ("Moderate" if prob >= 0.35 else "Low")
    return {
        "model": "Diabetes Risk Model",
        "probability": round(prob, 4), "probability_percent": f"{prob * 100:.1f}%",
        "risk_level": risk_level,
        "recommendations": [
            "Maintain an HbA1c screening schedule every 3-6 months" if risk_level != "Low" else "Continue annual fasting glucose screenings",
            "Adopt a balanced low-glycemic Mediterranean meal plan",
            "Engage in at least 150 minutes of moderate aerobic activity weekly",
            "Consult an endocrinologist or primary care physician"
        ],
        "disclaimer": "Educational project only. Not intended for medical diagnosis."
    }

@app.post("/predict/stroke")
def predict_stroke_risk(payload: StrokeInput):
    if not spec_bundle or 'stroke' not in spec_bundle:
        raise HTTPException(status_code=503, detail="Stroke model not loaded.")
    pipe = spec_bundle['stroke']['pipeline']
    data = pd.DataFrame([{
        'gender': payload.gender, 'age': payload.age, 'hypertension': payload.hypertension,
        'heart_disease': payload.heart_disease, 'ever_married': payload.ever_married,
        'work_type': payload.work_type, 'Residence_type': payload.residence_type,
        'avg_glucose_level': payload.avg_glucose_level, 'bmi': payload.bmi,
        'smoking_status': payload.smoking_status
    }])
    prob = float(pipe.predict_proba(data)[0][1])
    risk_level = "High" if prob >= 0.50 else ("Moderate" if prob >= 0.25 else "Low")
    return {
        "model": "Stroke Risk Model",
        "probability": round(prob, 4), "probability_percent": f"{prob * 100:.1f}%",
        "risk_level": risk_level,
        "recommendations": [
            "Strict arterial blood pressure control (<120/80 mmHg)",
            "Maintain optimal glycemic and lipid management",
            "Quit tobacco smoking immediately",
            "Learn F.A.S.T. stroke signs (Face, Arm, Speech, Time)"
        ],
        "disclaimer": "Educational project only. Not intended for medical diagnosis."
    }

@app.post("/predict/heart-failure")
def predict_heart_failure_risk(payload: HeartFailureInput):
    if not spec_bundle or 'heart_failure' not in spec_bundle:
        raise HTTPException(status_code=503, detail="Heart failure model not loaded.")
    pipe = spec_bundle['heart_failure']['pipeline']
    data = pd.DataFrame([{
        'age': payload.age, 'anaemia': payload.anaemia,
        'creatinine_phosphokinase': payload.creatinine_phosphokinase, 'diabetes': payload.diabetes,
        'ejection_fraction': payload.ejection_fraction, 'high_blood_pressure': payload.high_blood_pressure,
        'platelets': payload.platelets, 'serum_creatinine': payload.serum_creatinine,
        'serum_sodium': payload.serum_sodium, 'sex': payload.sex,
        'smoking': payload.smoking, 'time': payload.time
    }])
    prob = float(pipe.predict_proba(data)[0][1])
    risk_level = "High Risk" if prob >= 0.55 else ("Moderate Risk" if prob >= 0.30 else "Low Risk")
    return {
        "model": "Heart Failure Risk Model",
        "probability": round(prob, 4), "probability_percent": f"{prob * 100:.1f}%",
        "risk_level": risk_level,
        "recommendations": [
            "Urgent cardiologist evaluation with echocardiogram",
            "Strict dietary sodium restriction (<2,000 mg/day)",
            "Track daily weight and report sudden fluid gains",
            "Take prescribed cardiac medications consistently"
        ],
        "disclaimer": "Educational project only. Not intended for medical diagnosis."
    }

@app.get("/logs")
def get_logs(limit: int = Query(default=15, ge=1, le=100)):
    return {"logs": database.get_recent_logs(limit)}

os.makedirs("frontend", exist_ok=True)
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
os.makedirs(FRONTEND_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_index():
    index_path = os.path.join("frontend", "index.html")
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend index.html ready."}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
