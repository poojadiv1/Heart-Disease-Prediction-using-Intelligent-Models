# Heart Disease Prediction Using Intelligent Models

A full-stack healthcare prediction system that estimates heart disease risk from clinical inputs using a trained neural network, fuzzy risk interpretation, and Genetic Algorithm based feature optimization.

This project combines machine learning, soft computing, and web engineering into one practical application. Users can log in, enter patient details, generate predictions, store prediction history, review summary analytics, and run runtime feature optimization through a Genetic Algorithm (GA).

## Overview

The application predicts whether a patient is likely to have heart disease using 13 standard clinical attributes derived from the UCI Heart Disease dataset. Along with the prediction, it provides:

- binary output: `Disease` or `No Disease`
- risk category: `Low Risk`, `Moderate Risk`, or `High Risk`
- confidence score
- important contributing features
- short explanation for the result
- saved prediction history per user
- history-based summary analytics
- daily health tip on login
- runtime Genetic Algorithm optimization of feature subsets

## Why This Project

Heart disease prediction is a meaningful and widely studied healthcare problem. This project was designed to go beyond a basic classifier by combining:

- a trained ANN for prediction
- fuzzy logic for interpretability
- a Genetic Algorithm for feature subset optimization
- a complete backend with authentication and persistence
- a dashboard that makes outputs easy to understand

## Key Features

### Prediction Engine

- Trained ANN model using PyTorch
- Inference served from Node.js using exported trained weights
- Binary disease prediction with confidence score
- Model comparison against baseline approaches

### Soft Computing Concepts

- Fuzzy logic based risk interpretation
- Genetic Algorithm based feature subset optimization
- Runtime `/optimize` API to run GA on demand

### Application Features

- Login and registration
- SQLite-based prediction history
- Saved prediction analysis
- PDF report export
- Daily health reminder / health tip
- Sample patients for quick testing

## Soft Computing Used In This Project

### 1. Artificial Neural Network (ANN)

The ANN is the main predictive model. It learns nonlinear relationships between patient features and heart disease outcomes.

Why ANN was used:

- medical features interact in complex ways
- nonlinear learning is useful for structured clinical data
- better suited than fixed rules for learning patterns from data

### 2. Fuzzy Logic

Fuzzy logic is used after the ANN prediction to convert probability into human-friendly risk categories.

Why fuzzy logic was used:

- medical risk is not naturally expressed only as yes/no.
- fuzzy labels such as low, medium, and high are easier to interpret.
- improves explainability for users and examiners.

### 3. Genetic Algorithm (GA)

The GA is used for feature subset optimization. It searches different binary masks of selected features and evaluates them using runtime ANN-based fitness.

Why GA was used:

- feature selection is an optimization problem
- GA can explore combinations better than simple greedy approaches
- it strongly supports the soft computing theme of the project

## Dataset

This project uses a UCI Heart Disease dataset based workflow.

### Input Features

- Age
- Sex
- Chest Pain Type
- Resting Blood Pressure
- Serum Cholesterol
- Fasting Blood Sugar
- Resting ECG
- Maximum Heart Rate
- Exercise Induced Angina
- Oldpeak
- Slope
- Number of Major Vessels
- Thalassemia

### Output

- `0` = No Disease
- `1` = Disease

### Dataset Notes

- dataset is stored locally after training at [heart_disease_uci.csv](C:/Users/pooja/Documents/New%20project/backend/data/heart_disease_uci.csv)
- the project converts the original UCI target into binary classification: `num > 0` means disease

## Project Architecture

```text
Frontend Dashboard
        ->
Backend API Server
        ->
Prediction Engine
        ->
SQLite Database + Trained Model Artifact
        ->
Runtime Genetic Algorithm Optimization
```

## Tech Stack

### Frontend

- HTML
- CSS
- Vanilla JavaScript

### Backend

- Node.js
- native HTTP server
- SQLite via `node:sqlite`

### AI / Model Training

- Python
- PyTorch
- NumPy
- Pandas
- UCI ML Repository loader

## Folder Structure

```text
backend/
  data/
    app.db
    heart_disease_uci.csv
  model/
    heart_model.json
  scripts/
    train_model.py
  src/
    auth.js
    data.js
    db.js
    geneticAlgorithm.js
    heartModel.js
    report.js
  server.js

frontend/
  public/
    app.js
    index.html
    styles.css

docs/
  presentation-kit.md
  project-report.md
  viva-questions.md
```

## How It Works

### Prediction Flow

1. User logs into the application.
2. User fills in the patient medical form.
3. Frontend sends data to `POST /predict`.
4. Backend normalizes inputs.
5. ANN inference runs using saved trained weights.
6. Fuzzy logic maps the result into a risk band.
7. Important features and explanations are generated.
8. Prediction is saved to SQLite for authenticated users.
9. Frontend updates the dashboard and analysis panels.

### Genetic Algorithm Flow

1. A request is sent to `POST /optimize`.
2. GA creates a population of binary feature masks.
3. Each mask is evaluated by running ANN inference with masked features.
4. Fitness is computed from validation accuracy, confidence, and subset compactness.
5. Selection, crossover, and mutation evolve the population.
6. The best feature subset is returned.

## Model Training

The neural network is trained offline in Python and exported for runtime inference.

Training script:

- [train_model.py](C:/Users/pooja/Documents/New%20project/backend/scripts/train_model.py)

The exported model artifact contains:

- trained weights
- biases
- scaler statistics
- evaluation metrics
- GA optimization summary from training time

Saved model artifact:

- [heart_model.json](C:/Users/pooja/Documents/New%20project/backend/model/heart_model.json)

## Runtime Genetic Algorithm

Unlike a static precomputed result, this project also supports runtime GA execution inside the backend.

Implementation:

- [geneticAlgorithm.js](C:/Users/pooja/Documents/New%20project/backend/src/geneticAlgorithm.js)
- [heartModel.js](C:/Users/pooja/Documents/New%20project/backend/src/heartModel.js)

Runtime GA capabilities:

- configurable population size
- configurable generations
- configurable crossover rate
- configurable mutation rate
- on-demand feature subset optimization
- optional persistence into model artifact

## Authentication and Database

The project supports multiple users.

### Authentication

- user registration
- user login
- session token handling
- protected prediction history

Implementation:

- [auth.js](C:/Users/pooja/Documents/New%20project/backend/src/auth.js)

### Database

SQLite stores:

- users
- sessions
- prediction history

Implementation:

- [db.js](C:/Users/pooja/Documents/New%20project/backend/src/db.js)

Database file:

- [app.db](C:/Users/pooja/Documents/New%20project/backend/data/app.db)

## API Endpoints

### Authentication

- `POST /register` - register a new user
- `POST /login` - log in an existing user
- `POST /logout` - log out current user
- `GET /me` - get current authenticated user

### Prediction

- `POST /predict` - run heart disease prediction
- `POST /scenario` - compare baseline and changed patient values
- `GET /history` - get saved prediction history
- `POST /api/report` - export PDF report

### Metadata and Optimization

- `GET /api/bootstrap` - return feature metadata and sample patients
- `GET /model-info` - return model and dataset information
- `POST /optimize` - run Genetic Algorithm feature optimization at runtime

## Example Prediction Response

```json
{
  "prediction": "High Risk",
  "binaryPrediction": "Disease",
  "confidence": 99,
  "riskBand": "High Risk",
  "important_features": [
    "Serum Cholesterol",
    "Number of Major Vessels",
    "Age"
  ],
  "explanation": "visible vessel narrowing and exercise-induced angina push the patient toward high risk, with serum cholesterol acting as the strongest contributor."
}
```

## Example Runtime GA Request

```json
{
  "populationSize": 10,
  "generations": 6,
  "crossoverRate": 0.8,
  "mutationRate": 0.08,
  "tournamentSize": 3,
  "persist": false
}
```

## Example Runtime GA Response

```json
{
  "encodedMask": "1110101111111",
  "selectedCount": 11,
  "selectedFeatures": [
    "Age",
    "Sex",
    "Chest Pain Type",
    "Serum Cholesterol",
    "Resting ECG",
    "Maximum Heart Rate",
    "Exercise Induced Angina",
    "ST Depression (Oldpeak)",
    "Slope of Peak Exercise ST Segment",
    "Number of Major Vessels",
    "Thalassemia"
  ],
  "fitness": 0.9322,
  "accuracy": 0.9322
}
```

## Run Locally

### 1. Install project dependencies

```bash
npm install
```

### 2. Train the model

```bash
npm run train:model
```

### 3. Start the server

```bash
npm start
```

Open:

- [http://localhost:3000](http://localhost:3000)

## Validation / Checks

Run project checks:

```bash
npm run check
```

## Main Files To Review

### Backend

- [server.js](C:/Users/pooja/Documents/New%20project/backend/server.js)
- [heartModel.js](C:/Users/pooja/Documents/New%20project/backend/src/heartModel.js)
- [geneticAlgorithm.js](C:/Users/pooja/Documents/New%20project/backend/src/geneticAlgorithm.js)
- [auth.js](C:/Users/pooja/Documents/New%20project/backend/src/auth.js)
- [db.js](C:/Users/pooja/Documents/New%20project/backend/src/db.js)
- [train_model.py](C:/Users/pooja/Documents/New%20project/backend/scripts/train_model.py)

### Frontend

- [app.js](C:/Users/pooja/Documents/New%20project/frontend/public/app.js)
- [styles.css](C:/Users/pooja/Documents/New%20project/frontend/public/styles.css)

## Possible Future Improvements

- deploy on cloud
- add SHAP or LIME explanations
- add admin / doctor dashboards
- add email verification and password reset
- improve visual analytics on saved predictions
- train on a larger multi-source heart dataset

## Academic Note

This project is designed for educational and demonstration purposes. It is not a clinical diagnostic system and should not be used as a substitute for professional medical advice.

## License

This project is available for academic use and portfolio demonstration. Add a formal license if you plan to publish it openly..
