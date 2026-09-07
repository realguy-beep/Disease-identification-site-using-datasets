# MediPredict AI — Multi-Modal Clinical Intelligence Platform (v2.1)

> **DISCLAIMER: Educational tool only — not medical advice.**

A multi-modal clinical AI web application featuring general multi-class disease prediction (132 symptoms to 41 diseases), Computer Vision ophthalmic pathology analysis, specialized risk calculators (Diabetes, Stroke, Heart Failure), Explainable AI (XAI) feature attribution, natural language intake, dynamic triage questions, emergency red-flag detection, and printable doctor consultation summaries.

---

## 🏗️ Multi-Modal AI Engine Matrix

| # | Model / Pipeline | Dataset / Modality | Algorithm & Architecture | Key Clinical Focus |
|---|---|---|---|---|
| **1** | **General Multi-Class Disease Engine** | Tabular (4,920 records) | Balanced Random Forest (132 Symptoms &rarr; 41 Diseases) | **97.6% Test Accuracy** with XAI & Triage |
| **2** | **Ophthalmic Computer Vision AI** | Medical Imaging (778 Eye Photos) | Spatial-Color-Texture ExtraTrees Classifier | Cataracts, Glaucoma, Strabismus, Uveitis, Proptosis |
| **3** | **Diabetes Risk Diagnostic Model** | Tabular (768 records) | Scaler + Random Forest Pipeline | **ROC-AUC: 0.819** |
| **4** | **Stroke Probability Predictor** | Tabular (5,110 records) | One-Hot Imputer + Random Forest | **ROC-AUC: 0.795** |
| **5** | **Heart Failure Mortality Model** | Clinical Tabular (299 records) | Scaler + Balanced Random Forest | **ROC-AUC: 0.904 (83.3% Acc)** |

---

## 🌟 Advanced Clinical Features Added

1. **🗣️ NLP Natural Language Symptom Intake**: Type symptom descriptions in conversational English (e.g. *"I've had severe headache and high fever since yesterday"*); NLP extracts and auto-selects catalog symptoms.
2. **🔍 Explainable AI (XAI) Feature Drivers**: Explains *why* a disease was predicted (e.g., *"Why Malaria? +34% High Fever, +28% Chills, +18% Sweating"*).
3. **❓ Dynamic Symptom Follow-Up (Intelligent Triage)**: Evaluates diagnostic ambiguity among top candidate diseases and asks discriminating follow-up questions.
4. **🚨 Red-Flag Emergency Alert System**: Automatically detects high-acuity life-threatening clusters (e.g., Chest Pain + Dyspnea) with immediate 911 dispatch prompts and first-aid instructions.
5. **👁️ Computer Vision Eye Scan Upload**: Drag-and-drop anterior eye or fundus scans with immediate differential disease probabilities and guidelines.
6. **📄 One-Click Printable Doctor Consultation Report**: Cleanly formatted printable medical summary to take to physician consultations.
7. **📜 SQLite Audit Trail**: Persistent logging of inference requests in `predictions.db`.
