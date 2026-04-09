const datasetInfo = {
  name: "UCI Heart Disease Dataset",
  source: "UCI Machine Learning Repository - Cleveland heart disease attributes",
  samples: 303,
  target: {
    0: "No Disease",
    1: "Disease"
  },
  notes: "Binary target is derived from the original dataset by mapping num > 0 to Disease."
};

const featureMetadata = [
  { key: "age", label: "Age", type: "number", min: 18, max: 100, step: 1 },
  {
    key: "sex",
    label: "Sex",
    type: "select",
    options: [
      { value: 1, label: "Male" },
      { value: 0, label: "Female" }
    ]
  },
  {
    key: "cp",
    label: "Chest Pain Type",
    type: "select",
    options: [
      { value: 1, label: "Typical Angina" },
      { value: 2, label: "Atypical Angina" },
      { value: 3, label: "Non-anginal Pain" },
      { value: 4, label: "Asymptomatic" }
    ]
  },
  { key: "trestbps", label: "Resting Blood Pressure", type: "number", min: 80, max: 220, step: 1 },
  { key: "chol", label: "Serum Cholesterol", type: "number", min: 100, max: 620, step: 1 },
  {
    key: "fbs",
    label: "Fasting Blood Sugar > 120 mg/dl",
    type: "select",
    options: [
      { value: 0, label: "False" },
      { value: 1, label: "True" }
    ]
  },
  {
    key: "restecg",
    label: "Resting ECG",
    type: "select",
    options: [
      { value: 0, label: "Normal" },
      { value: 1, label: "ST-T Abnormality" },
      { value: 2, label: "Left Ventricular Hypertrophy" }
    ]
  },
  { key: "thalach", label: "Maximum Heart Rate", type: "number", min: 60, max: 220, step: 1 },
  {
    key: "exang",
    label: "Exercise Induced Angina",
    type: "select",
    options: [
      { value: 0, label: "No" },
      { value: 1, label: "Yes" }
    ]
  },
  { key: "oldpeak", label: "ST Depression (Oldpeak)", type: "number", min: 0, max: 7, step: 0.1 },
  {
    key: "slope",
    label: "Slope of Peak Exercise ST Segment",
    type: "select",
    options: [
      { value: 1, label: "Upsloping" },
      { value: 2, label: "Flat" },
      { value: 3, label: "Downsloping" }
    ]
  },
  { key: "ca", label: "Number of Major Vessels", type: "number", min: 0, max: 4, step: 1 },
  {
    key: "thal",
    label: "Thalassemia",
    type: "select",
    options: [
      { value: 3, label: "Normal" },
      { value: 6, label: "Fixed Defect" },
      { value: 7, label: "Reversible Defect" }
    ]
  }
];

const samplePatients = [
  {
    id: "patient-high",
    name: "High-Risk Sample",
    age: 67,
    sex: 1,
    cp: 4,
    trestbps: 160,
    chol: 286,
    fbs: 0,
    restecg: 2,
    thalach: 108,
    exang: 1,
    oldpeak: 1.5,
    slope: 2,
    ca: 3,
    thal: 3
  },
  {
    id: "patient-medium",
    name: "Moderate-Risk Sample",
    age: 57,
    sex: 0,
    cp: 3,
    trestbps: 132,
    chol: 236,
    fbs: 0,
    restecg: 1,
    thalach: 148,
    exang: 0,
    oldpeak: 1.2,
    slope: 2,
    ca: 1,
    thal: 6
  },
  {
    id: "patient-low",
    name: "Low-Risk Sample",
    age: 41,
    sex: 0,
    cp: 2,
    trestbps: 130,
    chol: 204,
    fbs: 0,
    restecg: 2,
    thalach: 172,
    exang: 0,
    oldpeak: 1.4,
    slope: 1,
    ca: 0,
    thal: 3
  }
];

module.exports = {
  datasetInfo,
  featureMetadata,
  samplePatients
};
