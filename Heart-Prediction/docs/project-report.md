# Project Report

## Title

Heart Disease Prediction using Intelligent Models

## 1. Introduction

Heart disease is one of the leading causes of death across the world. Predicting the possibility of heart disease at an early stage can help support clinical awareness and data-driven healthcare analysis. This project builds an intelligent prediction system that estimates whether a patient is likely to have heart disease based on standard clinical parameters.

The project combines three ideas often discussed in soft computing and intelligent systems:

- PyTorch-based Artificial Neural Network as the primary prediction model
- Fuzzy Logic for human-readable risk interpretation
- Genetic Algorithm style feature selection for explainability

The final system provides a dashboard for entering patient data, viewing predictions, checking important features, performing scenario analysis, logging in as different users, and storing prediction history in a local SQLite database.

## 2. Problem Statement

Medical decision-making often depends on multiple interacting patient features such as age, blood pressure, cholesterol, ECG results, and heart rate. Manual assessment of all features together can be difficult and time-consuming. The problem is to design a system that can intelligently analyze these parameters and predict whether heart disease is likely to be present.

## 3. Objectives

1. To predict heart disease as Yes or No using patient data.
2. To use an ANN-style intelligent model as the main predictor.
3. To classify risk levels using fuzzy logic.
4. To identify important contributing features using a genetic-style selection layer.
5. To provide explainable outputs with confidence and feature importance.
6. To build an interactive frontend dashboard.
7. To support scenario analysis for observing risk changes.
8. To store prediction history in a database.
9. To support authentication for multiple users.

## 4. Scope of the Project

The scope of the project includes:

- Patient data input
- Heart disease prediction
- Risk visualization
- Feature importance analysis
- Model comparison
- Scenario analysis
- PDF report export
- User authentication
- Prediction history storage

The system is designed for academic demonstration and learning. It is not a medical-grade diagnostic product.

## 5. Dataset Description

The project uses the UCI Heart Disease dataset. A local CSV copy is saved inside the backend for repeatable training and demonstration.

### Input Features

- Age
- Sex
- Chest Pain Type
- Blood Pressure
- Cholesterol
- Blood Sugar
- ECG Results
- Max Heart Rate
- Exercise Induced Angina
- Oldpeak
- Slope
- Number of Major Vessels
- Thalassemia

### Output

- `0` = No Disease
- `1` = Disease

## 6. System Architecture

```text
Frontend Dashboard
        ->
Backend API
        ->
Prediction Engine
        ->
Dataset and Model Logic
```

### Frontend

The frontend is responsible for:

- collecting patient input
- sending requests to the backend
- displaying prediction results
- showing charts and risk meters
- allowing scenario testing
- handling login and registration
- viewing saved prediction history

### Backend

The backend is responsible for:

- receiving API requests
- validating and normalizing inputs
- running the prediction engine
- returning prediction results
- generating report files
- storing prediction history in SQLite
- authenticating multiple users

## 7. Modules Used

### 7.1 Artificial Neural Network

The PyTorch ANN is the main prediction component. It is trained on the real UCI heart disease dataset and exported as a saved model artifact for use inside the Node.js backend. It models the idea that the final decision depends on multiple features acting together rather than a single rule.

### 7.2 Fuzzy Logic

Fuzzy logic is used to map numeric prediction outputs into human-friendly categories:

- Low Risk
- Medium Risk
- High Risk

This improves interpretability for users.

### 7.3 Genetic Algorithm

The genetic-style component is used as a feature selection and explainability layer. It highlights the most influential patient factors contributing to the final risk estimate.

### 7.4 Database Module

The database module uses SQLite to store user accounts, session tokens, and prediction history. This allows each authenticated user to maintain a separate list of previous predictions.

### 7.5 Authentication Module

The authentication module supports registration, login, logout, and current-user lookup. Passwords are stored as salted hashes, and sessions are represented by secure random tokens.

## 8. Methodology

1. Collect patient inputs from the dashboard.
2. Normalize and constrain values into valid ranges.
3. Convert inputs into scaled features using statistics from model training.
4. Compute risk probability using the saved PyTorch ANN weights.
5. Apply fuzzy rules to determine the final risk band.
6. Rank important features using a genetic-style selection strategy.
7. Save prediction history for authenticated users in SQLite.
8. Display the prediction, confidence, and explanation on the frontend.
9. Allow scenario changes and compare the updated risk.

## 9. API Endpoints

- `GET /api/bootstrap`
- `GET /model-info`
- `POST /register`
- `POST /login`
- `POST /logout`
- `GET /me`
- `GET /history`
- `POST /predict`
- `POST /scenario`
- `POST /api/report`

### `POST /predict`

Accepts patient input data and returns prediction, confidence, important features, and explanation.

### `POST /scenario`

Accepts a baseline patient and changed values, then returns how the risk changes.

### `GET /model-info`

Returns project, dataset, feature, and intelligent model details.

## 10. Frontend Features

- Patient input form
- Prediction button
- Prediction result card
- Risk meter
- Feature importance chart
- Model comparison table
- Scenario analysis section
- PDF report export
- Authentication panel
- Prediction history panel

## 11. Expected Output

The system provides:

- Disease or No Disease
- Risk percentage
- Risk band
- Important features
- Explanation
- Model comparison
- Scenario-based comparison
- User-specific saved history

## 12. Advantages

- Simple and interactive user interface
- Explainable prediction output
- Includes multiple intelligent techniques
- Good for academic presentation
- Useful for demonstrating soft computing concepts

## 13. Limitations

- Training is done offline and the saved model is used at runtime
- Should not be treated as a real medical diagnosis tool
- Performance can vary depending on dataset split and preprocessing choices

## 14. Future Enhancements

- Deploy on cloud for remote access
- Add SHAP or LIME based explainability
- Add doctor and admin dashboards
- Add multi-hospital dataset integration
- Add email verification and password reset

## 15. Conclusion

This project shows how intelligent models can be used for healthcare prediction in a simple, understandable, and presentation-ready way. It combines a real PyTorch-trained neural network, fuzzy logic interpretation, explainable feature ranking, SQLite-based prediction history, and multi-user authentication in a full-stack application. The system is appropriate for academic submission, demonstrations, and viva discussions.
