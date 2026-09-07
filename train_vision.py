import os
import glob
import pickle
import numpy as np
import pandas as pd
from PIL import Image
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score

print("="*60)
print("TRAINING COMPUTER VISION EYE DISEASE CLASSIFIER")
print("="*60)

classes = ['Bulging_Eyes', 'Cataracts', 'Crossed_Eyes', 'Glaucoma', 'Uveitis']
base_dir = 'data/incoming/archive_2/Eye_diseases'

def extract_image_features(img_path_or_pil):
    if isinstance(img_path_or_pil, str):
        img = Image.open(img_path_or_pil).convert('RGB')
    else:
        img = img_path_or_pil.convert('RGB')
        
    img = img.resize((96, 96))
    arr = np.array(img, dtype=np.float32) / 255.0
    
    # 1. Color channel statistics (Mean, Std, Median, Min, Max in RGB)
    feats = []
    for c in range(3):
        channel = arr[:, :, c]
        feats.extend([
            float(np.mean(channel)),
            float(np.std(channel)),
            float(np.median(channel)),
            float(np.percentile(channel, 25)),
            float(np.percentile(channel, 75))
        ])
        
    # 2. Color Histograms across 3 channels (16 bins each = 48 features)
    for c in range(3):
        hist, _ = np.histogram(arr[:, :, c], bins=16, range=(0, 1), density=True)
        feats.extend(hist.tolist())
        
    # 3. Spatial 3x3 block color averages (9 blocks * 3 channels = 27 features)
    h, w, _ = arr.shape
    bh, bw = h // 3, w // 3
    for i in range(3):
        for j in range(3):
            block = arr[i*bh:(i+1)*bh, j*bw:(j+1)*bw, :]
            for c in range(3):
                feats.append(float(np.mean(block[:, :, c])))
                
    # 4. Grayscale edge gradient magnitudes (Mean & Std)
    gray = np.dot(arr[..., :3], [0.2989, 0.5870, 0.1140])
    gx, gy = np.gradient(gray)
    grad_mag = np.sqrt(gx**2 + gy**2)
    feats.extend([
        float(np.mean(grad_mag)),
        float(np.std(grad_mag)),
        float(np.max(grad_mag))
    ])
    
    return np.array(feats, dtype=np.float32)

X_data = []
y_labels = []
seen_paths = set()

for c_name in classes:
    pattern = os.path.join(base_dir, c_name, '*.*')
    files = [f for f in glob.glob(pattern) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    print(f"Class '{c_name}': Found {len(files)} images")
    for f_path in files:
        canonical_path = os.path.normpath(f_path)
        if canonical_path in seen_paths:
            continue
        seen_paths.add(canonical_path)
        try:
            feats = extract_image_features(f_path)
            X_data.append(feats)
            y_labels.append(c_name)
        except Exception as e:
            print(f"Error reading {f_path}: {e}")

X_arr = np.array(X_data)
le = LabelEncoder()
y_arr = le.fit_transform(y_labels)

print(f"\nExtracted Feature Matrix: {X_arr.shape} across {len(le.classes_)} eye disease classes.")

# 80/20 Stratified Split
X_train, X_test, y_train, y_test = train_test_split(
    X_arr, y_arr, test_size=0.20, random_state=42, stratify=y_arr
)

vision_pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', ExtraTreesClassifier(n_estimators=200, max_depth=12, class_weight='balanced', random_state=42))
])

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(vision_pipeline, X_arr, y_arr, cv=cv, scoring='accuracy')
print(f"5-Fold CV Accuracy: {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*100:.2f}%)")

vision_pipeline.fit(X_train, y_train)
y_pred = vision_pipeline.predict(X_test)
test_acc = accuracy_score(y_test, y_pred)
print(f"Holdout Test Accuracy: {test_acc*100:.2f}%\n")
print(classification_report(y_test, y_pred, target_names=le.classes_))

# Save vision model bundle
eye_model_bundle = {
    'pipeline': vision_pipeline,
    'label_encoder': le,
    'classes': list(le.classes_),
    'feature_dim': X_arr.shape[1],
    'class_descriptions': {
        "Bulging_Eyes": {
            "display_name": "Proptosis / Exophthalmos (Bulging Eyes)",
            "description": "Abnormal protrusion of one or both eyeballs, commonly associated with Graves' thyroid eye disease, orbital inflammation, or vascular anomalies.",
            "precautions": ["Consult an ophthalmologist and endocrinologist", "Get comprehensive Thyroid Profile (TSH, Free T4, T3)", "Use lubricating eye drops to prevent corneal exposure keratitis", "Undergo orbital CT/MRI imaging if acute onset"]
        },
        "Cataracts": {
            "display_name": "Cataracts (Lens Opacification)",
            "description": "Progressive clouding of the natural crystalline lens of the eye leading to blurred vision, glare sensitivity, and diminished color perception.",
            "precautions": ["Schedule a comprehensive dilated slit-lamp eye examination", "Use anti-glare sunglasses and adequate lighting for reading", "Update prescription eyeglasses as needed", "Consult a cataract surgeon for phacoemulsification evaluation"]
        },
        "Crossed_Eyes": {
            "display_name": "Strabismus (Crossed / Misaligned Eyes)",
            "description": "A condition in which both eyes do not align simultaneously under normal gaze, potentially leading to amblyopia (lazy eye) or double vision.",
            "precautions": ["Consult a pediatric or strabismus ophthalmology specialist", "Consider corrective refractive glasses or prism therapy", "Implement occlusion (eye patching) therapy if amblyopia is present", "Evaluate for orthoptic vision therapy or surgical realignment"]
        },
        "Glaucoma": {
            "display_name": "Glaucoma (Optic Neuropathy)",
            "description": "A group of eye conditions that damage the optic nerve, often caused by abnormally high intraocular pressure (IOP), leading to irreversible visual field loss.",
            "precautions": ["URGENT: Schedule tonometry (IOP check) and visual field perimetry test", "Strict adherence to prescribed intraocular pressure-lowering eye drops", "Routine optic disc OCT imaging every 6 months", "Seek emergency ophthalmology care if acute severe eye pain with halos occurs"]
        },
        "Uveitis": {
            "display_name": "Uveitis (Intraocular Inflammation)",
            "description": "Inflammation of the uvea (the middle layer of the eye), causing eye redness, photophobia, floaters, and aching ocular pain.",
            "precautions": ["Consult an ophthalmologist / uveitis specialist promptly", "Use prescribed topical corticosteroid or cycloplegic eye drops", "Undergo systemic autoimmune and infectious screening", "Wear dark sunglasses to alleviate photophobia"]
        }
    }
}

save_path = 'model/eye_vision_model.pkl'
with open(save_path, 'wb') as f:
    pickle.dump(eye_model_bundle, f)

print(f"Successfully saved Computer Vision Eye Model to: {save_path}!")
