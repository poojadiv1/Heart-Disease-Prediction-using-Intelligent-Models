# Viva Questions and Answers

## Basic Questions

### 1. What is the title of your project?

Heart Disease Prediction using Intelligent Models.

### 2. What is the main goal of your project?

The goal is to predict whether a person is likely to have heart disease based on health parameters and to present the result in an explainable way.

### 3. Which dataset did you use?

I used a UCI Heart Disease style dataset with standard clinical features for binary classification.

### 4. What is the output of the system?

The output is a prediction of disease or no disease, along with confidence percentage, risk band, important features, and explanation.

## Technical Questions

### 5. Why did you choose ANN?

ANN is useful because it can model nonlinear relationships between multiple medical features. Heart disease prediction depends on interactions between age, cholesterol, blood pressure, ECG, and other attributes, so ANN is a good intelligent approach. In this project, the ANN was trained using PyTorch on the UCI heart disease dataset.

### 6. What is the role of fuzzy logic in your project?

Fuzzy logic converts raw prediction probability into low, medium, or high risk. This makes the output more understandable for users.

### 7. Why did you include a genetic algorithm?

The genetic algorithm idea is used for feature selection and explainability. It helps show which features are most influential in the prediction.

### 8. What is scenario analysis?

Scenario analysis means changing one or more patient values, such as increasing cholesterol or lowering blood pressure, and observing how the prediction changes.

### 9. Why is explainability important here?

Explainability is important because medical predictions should not be treated as black boxes. Users should understand which features caused the system to classify the patient as high or low risk.

### 10. What is the architecture of your project?

The architecture has two main parts: frontend and backend. The frontend collects patient data and displays results. The backend processes the request, runs the intelligent prediction logic, and returns the output.

## Backend Questions

### 11. Where is the backend in your project?

The backend is inside the `backend/` folder. The main file is `backend/server.js`, and the model logic is inside `backend/src/heartModel.js`.

### 12. How does the backend work?

The frontend sends HTTP requests to the backend. The backend receives JSON input, normalizes the values, runs inference using saved PyTorch model weights, applies fuzzy logic, ranks important features, and sends the final prediction back to the frontend.

### 13. Which API endpoints are available?

- `POST /register`
- `POST /login`
- `GET /me`
- `GET /history`
- `POST /predict`
- `GET /model-info`
- `POST /scenario`
- `POST /api/report`

### 14. Why did you use a database?

I used SQLite to store user accounts, sessions, and prediction history. This makes the project more realistic and allows each user to review previous predictions.

### 15. Why did you add authentication?

Authentication supports multiple users and connects prediction history to a specific account. It also makes the application feel more like a real healthcare software system.

## Comparison Questions

### 16. Why did you compare multiple models?

Model comparison strengthens the project academically. It shows that ANN is the main model while logistic regression and decision tree outputs are used as baseline comparisons.

### 17. Which model performed best in your project?

The trained PyTorch ANN is the main model in the project. In the current local training run, it achieved about 78% test accuracy on the UCI split used by this implementation.

## Practical Questions

### 18. What happens when cholesterol increases?

The risk score usually increases because higher cholesterol is treated as a stronger risk factor.

### 19. What happens when blood pressure decreases?

The risk can decrease because lower blood pressure reduces cardiovascular stress.

### 20. Can this project be used in hospitals?

Not directly. This is an academic demonstration system and should not replace professional clinical diagnosis.

## Limitations and Future Scope

### 21. What are the limitations of your project?

The project uses demonstration-oriented intelligent logic, does not train a deep model live in the application, and is intended for learning and academic presentation.

### 22. What is the future scope?

The future scope includes training on a full medical dataset, adding more features, storing patient history, deploying online, and using advanced explainability tools.
