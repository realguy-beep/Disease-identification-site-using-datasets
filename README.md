# Disease Prediction Project

I built this project for coursework to learn how to train several scikit-learn models and serve them through a FastAPI backend with a simple web interface.

A note on intent: this is an educational programming project, not medical software. The datasets are benchmark or synthetic collections from Kaggle and UCI, so the predictions are just statistical pattern matching and should never be used as medical advice.

## What I built

The application has five core tools accessible from the browser:

1. **Choose symptoms (Disease prediction):** Matches selected symptoms against 41 disease classes using a Random Forest classifier trained on 132 binary symptom indicators.
   - Includes a text parser that extracts recognized symptom keys from free text (for example, typing "headache and fever" checks those boxes).
   - Shows which selected symptoms contributed most to the top predicted condition.
   - Suggests follow-up symptoms that often co-occur with top candidates to help clarify ambiguous cases.
   - Includes a basic rule check for high-risk combinations (like chest pain with breathlessness) that displays an emergency warning.
2. **Upload an eye image (Eye image classifier):** A small experimental classifier for five eye conditions (cataracts, glaucoma, strabismus, uveitis, and proptosis). Instead of a deep neural network, I extracted basic color and edge features (mean/std per RGB channel, color histograms, and Sobel gradient magnitude) and trained an ExtraTrees classifier on them.
3. **Diabetes risk:** A Random Forest pipeline with a standard scaler trained on the Pima Indians Diabetes dataset (768 rows, 8 clinical features).
4. **Stroke risk:** A Random Forest with balanced class weights, imputation, and one-hot encoding trained on the Kaggle stroke dataset (5,110 records).
5. **Heart failure risk:** A Random Forest pipeline with standard scaling trained on the Heart Failure Clinical Records dataset (299 patient records).
6. **Recent predictions:** A basic query log backed by SQLite (`predictions.db`) that records the inputs, top prediction, confidence score, and timestamp for each request.

## Why I built it

I wanted hands-on experience taking multiple tabular and image datasets from preprocessing to deployment:
- Learning how to set up clean scikit-learn pipelines with `ColumnTransformer`, imputer steps, and scalers.
- Serializing trained estimators with `pickle` and loading them reliably inside a FastAPI service using relative paths.
- Building a lightweight single-page frontend with vanilla JavaScript and Tailwind CSS that talks directly to FastAPI endpoints.
- Packaging the application with Docker and configuring it for deployment on Hugging Face Spaces (port 7860, non-root user).

## Implementation details

- `app.py`: FastAPI server that loads model bundles from `model/` on startup and defines the POST and GET routes. Serves `frontend/index.html` statically on `/`.
- `database.py`: Helper functions that initialize `predictions.db` and append inference sessions.
- `train.py`: Data loading, stratified 80/20 train/validation split, and training for the 132-symptom Random Forest model.
- `train_specialized.py`: Preprocessing pipelines and cross-validation for the diabetes, stroke, and heart failure datasets.
- `train_vision.py`: Image resizing (96x96), color/gradient feature extraction, and ExtraTrees training on the eye dataset.
- `test_pipeline.py`: Test script using FastAPI's `TestClient` to verify every endpoint and model output.
- `frontend/index.html`: Responsive UI built with HTML, Tailwind CSS utility classes, and Lucide icons.
- `Dockerfile`: Debian slim container with Python 3.10, non-root user 1000, exposing port 7860.

## How to run it locally

### Prerequisites
- Python 3.10 or newer
- pip

### 1. Set up the environment

```bash
git clone https://github.com/realguy-beep/Disease-identification-site-using-datasets.git
cd Disease-identification-site-using-datasets

python -m venv .venv
# On Linux/macOS:
source .venv/bin/activate
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the application

Pre-trained `.pkl` bundles are already in the `model/` directory, so you can run the server directly:

```bash
uvicorn app:app --host 0.0.0.0 --port 7860
```

Open `http://localhost:7860` in your browser.

If you prefer to run with a different port:
```bash
PORT=8000 uvicorn app:app --host 0.0.0.0 --port 8000
```

### 4. Run tests

To check that all endpoints and models respond as expected:

```bash
python test_pipeline.py
```

### 5. Retraining models (optional)

If you change any training logic or datasets:

```bash
python train.py
python train_specialized.py
python train_vision.py
```

## Docker

You can also run the app in a container:

```bash
docker build -t disease-prediction-app .
docker run --rm -p 7860:7860 disease-prediction-app
```

The container listens on port 7860 and uses user ID 1000, matching the Hugging Face Spaces Docker SDK requirements.

## Model limitations

Working through this project made several limitations very clear:

1. **The symptom dataset is synthetic and rigid:** The 132-symptom dataset uses clean binary 1/0 flags. Real patients do not experience symptoms as clean binary switches; symptoms vary in severity, onset, and duration.
2. **Handcrafted vision features are fragile:** The eye classifier uses color and edge histograms rather than a modern convolutional neural network or vision transformer. While it achieves reasonable training accuracy on this specific small set, it fails when tested on images with different lighting, skin tones, or camera angles.
3. **Class imbalance:** The stroke dataset has an outcome rate of only ~4.9%. Using `class_weight='balanced'` helped the model identify true positives, but it also increases the rate of false alarms on borderline cases.
4. **Small dataset sizes:** The heart failure dataset contains 299 records, and the diabetes dataset contains 768. Both are prone to variance between train and test splits despite cross-validation.
5. **Database persistence:** The SQLite database `predictions.db` is stored locally. In container deployments without a persistent volume mount, logs will reset whenever the container restarts.
