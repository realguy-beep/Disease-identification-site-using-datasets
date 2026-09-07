import os
import re
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, f1_score

def normalize_symptom_key(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    return re.sub(r'_+', '_', s).strip('_')

def load_and_preprocess_data(train_path='data/Training.csv', test_path='data/Testing.csv'):
    print(f"[Data Pipeline] Loading {train_path}...")
    df_train = pd.read_csv(train_path)
    
    if 'Unnamed: 133' in df_train.columns:
        df_train = df_train.drop(columns=['Unnamed: 133'])
        
    target_col = 'prognosis'
    if target_col not in df_train.columns:
        target_col = df_train.columns[-1]
        
    raw_symptom_cols = [c for c in df_train.columns if c != target_col]
    symptom_features = [normalize_symptom_key(c) for c in raw_symptom_cols]
    
    # Rename DataFrame columns to clean canonical keys
    rename_map = dict(zip(raw_symptom_cols, symptom_features))
    df_train = df_train.rename(columns=rename_map)
    
    X_train_df = df_train[symptom_features].fillna(0).astype(int).copy()
    y_raw_train = df_train[target_col].astype(str).str.strip()
    
    le = LabelEncoder()
    y_train_encoded = pd.Series(le.fit_transform(y_raw_train), name='target')
    
    df_test = None
    if os.path.exists(test_path):
        df_test_raw = pd.read_csv(test_path)
        if 'Unnamed: 133' in df_test_raw.columns:
            df_test_raw = df_test_raw.drop(columns=['Unnamed: 133'])
            
        df_test_raw = df_test_raw.rename(columns=rename_map)
        X_test_df = df_test_raw[symptom_features].fillna(0).astype(int).copy()
        y_test_raw = df_test_raw[target_col].astype(str).str.strip()
        y_test_encoded = pd.Series(le.transform(y_test_raw), name='target')
        df_test = (X_test_df, y_test_encoded, y_test_raw)
        
    return X_train_df, y_train_encoded, symptom_features, le, df_test

def train_and_evaluate():
    X, y, symptom_features, le, df_test = load_and_preprocess_data()
    
    print(f"Dataset Summary: {X.shape[0]} training samples, {X.shape[1]} canonical symptom features, {len(le.classes_)} unique disease classes.")
    
    # 80/20 Stratified Split
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    print("\n" + "="*60)
    print("STEP 3: Baseline Random Forest Training...")
    baseline_rf = RandomForestClassifier(n_estimators=100, random_state=42)
    baseline_rf.fit(X_train, y_train)
    val_preds = baseline_rf.predict(X_val)
    print(f"Baseline Validation Accuracy: {accuracy_score(y_val, val_preds) * 100:.2f}%")
    print(f"Baseline Weighted F1 Score:  {f1_score(y_val, val_preds, average='weighted'):.4f}")
    
    print("\n" + "="*60)
    print("STEP 4: Optimized Random Forest Training (Balanced Weights, 150 Trees)...")
    best_model = RandomForestClassifier(
        n_estimators=150,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(best_model, X, y, cv=cv, scoring='accuracy')
    print(f"5-Fold Cross Validation Accuracy: {cv_scores.mean() * 100:.2f}% (+/- {cv_scores.std() * 100:.2f}%)")
    
    best_model.fit(X_train, y_train)
    val_opt_preds = best_model.predict(X_val)
    print(f"Optimized Validation Accuracy:  {accuracy_score(y_val, val_opt_preds) * 100:.2f}%")
    
    if df_test is not None:
        X_test, y_test, _ = df_test
        test_preds = best_model.predict(X_test)
        test_acc = accuracy_score(y_test, test_preds)
        print(f"Independent Benchmark Set Accuracy: {test_acc * 100:.2f}% ({sum(test_preds == y_test)}/{len(y_test)} correct)")
        
    # Step 5: Save Model Bundle
    print("\n" + "="*60)
    print("STEP 5: Saving Model Bundle...")
    symptoms_meta = []
    for s in symptom_features:
        clean_name = s.replace('_', ' ').strip().title()
        symptoms_meta.append({'key': s, 'label': clean_name})
        
    model_bundle = {
        'model': best_model,
        'label_encoder': le,
        'symptom_features': symptom_features,
        'symptoms_meta': symptoms_meta,
        'classes': list(le.classes_),
        'metrics': {
            'cv_mean_accuracy': float(cv_scores.mean()),
            'val_accuracy': float(accuracy_score(y_val, val_opt_preds)),
            'test_accuracy': float(test_acc) if df_test is not None else None
        }
    }
    
    os.makedirs('model', exist_ok=True)
    model_path = 'model/disease_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(model_bundle, f)
    print(f"Successfully saved canonical model artifact to {model_path}!")

if __name__ == '__main__':
    train_and_evaluate()
