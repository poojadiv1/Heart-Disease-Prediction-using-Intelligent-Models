# Heart Disease Prediction using Intelligent Models

## Abstract

This project predicts the likelihood of heart disease using intelligent models based on a trained PyTorch neural network, Fuzzy Logic, and explainable feature ranking inspired by Genetic Algorithms. The system accepts patient health attributes from the UCI heart disease dataset and produces a disease-risk prediction with confidence, key influencing features, clinical-style explanation, user authentication, and stored prediction history.

## Problem Statement

Heart disease is one of the major causes of death worldwide. Early identification of risk can support doctors, students, and researchers in understanding how clinical attributes contribute to disease prediction. Manual analysis of multiple patient features can be difficult, so an intelligent prediction system is needed to estimate whether a patient is likely to have heart disease.

## Objectives

1. To build a system that predicts heart disease as `Yes` or `No`.
2. To use an ANN-inspired intelligent model as the main prediction engine.
3. To apply fuzzy logic for human-readable low, medium, and high risk interpretation.
4. To include genetic-style feature selection for stronger explainability.
5. To create a frontend dashboard for entering patient details and viewing results.
6. To support scenario analysis for testing how risk changes when values are modified.

## Methodology

1. Collect patient attributes from a UCI Heart Disease style dataset.
2. Normalize and process features for model scoring.
3. Use the trained PyTorch model to produce a heart disease probability.
4. Convert the numeric score into risk levels using fuzzy logic rules.
5. Rank the strongest features with a genetic-style selection layer.
6. Save predictions for logged-in users in SQLite.
7. Display predictions, confidence, and feature importance in the dashboard.

## Key Features

- Heart disease prediction
- PyTorch model output
- Fuzzy risk classification
- Genetic feature selection
- Explainable AI result summary
- Scenario analysis
- Model comparison
- PDF report export
- Authentication
- Prediction history database

## Suggested PPT Slide Flow

1. Title slide
2. Introduction to heart disease prediction
3. Problem statement
4. Objectives
5. System architecture
6. Dataset and features
7. ANN, Fuzzy Logic, and Genetic Algorithm overview
8. Dashboard screenshots
9. Prediction result and scenario analysis
10. Conclusion and future scope

## Short Architecture Explanation for Viva

The frontend is stored in `frontend/public` and provides the dashboard interface. The backend is stored in `backend/` and exposes API routes for authentication, prediction, history, model info, scenario analysis, and report export. The backend calls the prediction engine in `backend/src/heartModel.js`, which runs inference from a saved PyTorch model, applies fuzzy risk labeling, and ranks the most important features. User accounts and prediction history are stored in SQLite.

## Viva Questions With Answers

### 1. Why did you choose the UCI Heart Disease Dataset?

Because it is a standard and widely used dataset for binary heart disease prediction problems.

### 2. What is the role of ANN in this project?

The ANN is the main intelligent model used to learn clinical feature interactions and estimate the probability of heart disease.

### 3. Why is fuzzy logic added?

Fuzzy logic helps convert numerical risk values into understandable categories such as low risk, medium risk, and high risk.

### 4. What is the use of the genetic algorithm here?

It is used as an intelligent optimization idea for feature selection and helps explain which patient features are most influential.

### 5. What is scenario analysis?

Scenario analysis changes one or more patient values, such as cholesterol or blood pressure, and shows how the predicted risk changes.

### 6. What are the outputs of the system?

The system gives disease prediction, confidence score, risk class, important features, model comparison, and a short explanation.

### 7. What are the limitations?

This project is a demonstration system and should not be used as a replacement for real medical diagnosis by a doctor.

## Conclusion

The project demonstrates how intelligent models can be applied to healthcare prediction in an explainable and user-friendly way. It is suitable for mini projects, final-year demonstrations, soft computing presentations, and academic evaluation.

## Future Scope

- Deploy on cloud for remote access
- Add SHAP or LIME based explainability
- Add doctor and admin dashboards
