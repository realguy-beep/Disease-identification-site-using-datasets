import os
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, classification_report

print("="*60)
print("TRAINING SPECIALIZED CLINICAL RISK MODELS")
print("="*60)

# ==========================================
# 1. DIABETES RISK MODEL
# ==========================================
print("\n[1/3] Training Diabetes Risk Model (Pima Indians)...")
df_diab = pd.read_csv("data/incoming/archive_4/diabetes_dataset.csv")
print(f"Diabetes dataset shape: {df_diab.shape}")

# Replace 0s with NaN for columns where 0 is biologically impossible
zero_as_missing = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
df_diab[zero_as_missing] = df_diab[zero_as_missing].replace(0, np.nan)

X_diab = df_diab.drop(columns=['Outcome'])
y_diab = df_diab['Outcome']

diab_preprocessor = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

diab_pipeline = Pipeline(steps=[
    ('preprocessor', diab_preprocessor),
    ('classifier', RandomForestClassifier(n_estimators=150, max_depth=6, class_weight='balanced', random_state=42))
])

X_diab_train, X_diab_test, y_diab_train, y_diab_test = train_test_split(
    X_diab, y_diab, test_size=0.2, random_state=42, stratify=y_diab
)

diab_pipeline.fit(X_diab_train, y_diab_train)
diab_preds = diab_pipeline.predict(X_diab_test)
diab_probs = diab_pipeline.predict_proba(X_diab_test)[:, 1]
diab_acc = accuracy_score(y_diab_test, diab_preds)
diab_auc = roc_auc_score(y_diab_test, diab_probs)
print(f"Diabetes Model -> Test Accuracy: {diab_acc*100:.2f}%, ROC-AUC: {diab_auc:.4f}")

# ==========================================
# 2. STROKE RISK MODEL
# ==========================================
print("\n[2/3] Training Stroke Risk Model...")
df_stroke = pd.read_csv("data/incoming/archive_3/healthcare-dataset-stroke-data.csv")
if 'id' in df_stroke.columns:
    df_stroke = df_stroke.drop(columns=['id'])
print(f"Stroke dataset shape: {df_stroke.shape}")

X_stroke = df_stroke.drop(columns=['stroke'])
y_stroke = df_stroke['stroke']

numeric_features = ['age', 'avg_glucose_level', 'bmi']
categorical_features = ['gender', 'hypertension', 'heart_disease', 'ever_married', 'work_type', 'Residence_type', 'smoking_status']

numeric_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

categorical_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
])

stroke_preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, categorical_features)
    ]
)

stroke_pipeline = Pipeline(steps=[
    ('preprocessor', stroke_preprocessor),
    ('classifier', RandomForestClassifier(n_estimators=200, max_depth=8, class_weight='balanced_subsample', random_state=42))
])

X_stroke_train, X_stroke_test, y_stroke_train, y_stroke_test = train_test_split(
    X_stroke, y_stroke, test_size=0.2, random_state=42, stratify=y_stroke
)

stroke_pipeline.fit(X_stroke_train, y_stroke_train)
stroke_probs = stroke_pipeline.predict_proba(X_stroke_test)[:, 1]
stroke_auc = roc_auc_score(y_stroke_test, stroke_probs)
print(f"Stroke Model -> Test ROC-AUC: {stroke_auc:.4f} (Evaluated on balanced probability distribution)")

# ==========================================
# 3. HEART FAILURE RISK MODEL
# ==========================================
print("\n[3/3] Training Heart Failure Risk Model...")
df_heart = pd.read_csv("data/incoming/archive_1/heart_failure_clinical_records_dataset.csv")
print(f"Heart failure dataset shape: {df_heart.shape}")

X_heart = df_heart.drop(columns=['DEATH_EVENT'])
y_heart = df_heart['DEATH_EVENT']

heart_pipeline = Pipeline(steps=[
    ('scaler', StandardScaler()),
    ('classifier', RandomForestClassifier(n_estimators=150, max_depth=5, class_weight='balanced', random_state=42))
])

X_heart_train, X_heart_test, y_heart_train, y_heart_test = train_test_split(
    X_heart, y_heart, test_size=0.2, random_state=42, stratify=y_heart
)

heart_pipeline.fit(X_heart_train, y_heart_train)
heart_preds = heart_pipeline.predict(X_heart_test)
heart_probs = heart_pipeline.predict_proba(X_heart_test)[:, 1]
heart_acc = accuracy_score(y_heart_test, heart_preds)
heart_auc = roc_auc_score(y_heart_test, heart_probs)
print(f"Heart Failure Model -> Test Accuracy: {heart_acc*100:.2f}%, ROC-AUC: {heart_auc:.4f}")

# ==========================================
# SAVE SPECIALIZED MODELS BUNDLE
# ==========================================
specialized_bundle = {
    'diabetes': {
        'pipeline': diab_pipeline,
        'features': list(X_diab.columns),
        'metrics': {'accuracy': float(diab_acc), 'roc_auc': float(diab_auc)}
    },
    'stroke': {
        'pipeline': stroke_pipeline,
        'numeric_features': numeric_features,
        'categorical_features': categorical_features,
        'all_features': list(X_stroke.columns),
        'metrics': {'roc_auc': float(stroke_auc)}
    },
    'heart_failure': {
        'pipeline': heart_pipeline,
        'features': list(X_heart.columns),
        'metrics': {'accuracy': float(heart_acc), 'roc_auc': float(heart_auc)}
    }
}

os.makedirs('model', exist_ok=True)
save_path = 'model/specialized_models.pkl'
with open(save_path, 'wb') as f:
    pickle.dump(specialized_bundle, f)

print(f"\nSuccessfully serialized all 3 specialized models to: {save_path}!")
