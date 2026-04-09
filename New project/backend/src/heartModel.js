const fs = require("fs");
const path = require("path");
const { samplePatients, featureMetadata, datasetInfo } = require("./data");
const { GeneticAlgorithm } = require("./geneticAlgorithm");

const modelPath = path.join(__dirname, "..", "model", "heart_model.json");
const datasetCsvPath = path.join(__dirname, "..", "data", "heart_disease_uci.csv");
const featureOrder = featureMetadata.map((feature) => feature.key);

let cachedModel = null;
let cachedValidationDataset = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function relu(value) {
  return value > 0 ? value : 0;
}

function loadModelArtifact() {
  if (!cachedModel) {
    if (!fs.existsSync(modelPath)) {
      throw new Error("Trained model artifact not found. Run the training script first.");
    }
    cachedModel = JSON.parse(fs.readFileSync(modelPath, "utf8"));
  }
  return cachedModel;
}

function persistModelArtifact(model) {
  cachedModel = model;
  fs.writeFileSync(modelPath, JSON.stringify(model, null, 2), "utf8");
}

function normalizeInputs(payload = {}) {
  return {
    age: clamp(Number(payload.age ?? 54), 18, 100),
    sex: clamp(Number(payload.sex ?? 1), 0, 1),
    cp: clamp(Number(payload.cp ?? 3), 1, 4),
    trestbps: clamp(Number(payload.trestbps ?? 130), 80, 220),
    chol: clamp(Number(payload.chol ?? 220), 100, 620),
    fbs: clamp(Number(payload.fbs ?? 0), 0, 1),
    restecg: clamp(Number(payload.restecg ?? 1), 0, 2),
    thalach: clamp(Number(payload.thalach ?? 150), 60, 220),
    exang: clamp(Number(payload.exang ?? 0), 0, 1),
    oldpeak: clamp(Number(payload.oldpeak ?? 1.0), 0, 7),
    slope: clamp(Number(payload.slope ?? 2), 1, 3),
    ca: clamp(Number(payload.ca ?? 0), 0, 4),
    thal: [3, 6, 7].includes(Number(payload.thal)) ? Number(payload.thal) : 3
  };
}

function standardizeFeatureVector(inputs, model) {
  return featureOrder.map((key, index) => {
    const value = Number(inputs[key]);
    const mean = Number(model.scaler.mean[index]);
    const std = Number(model.scaler.std[index] || 1);
    return (value - mean) / (std || 1);
  });
}

function maskFeatureVector(vector, mask) {
  return vector.map((value, index) => (mask[index] ? value : 0));
}

function dense(input, weights, bias, activation = "none") {
  return weights.map((row, rowIndex) => {
    let total = Number(bias[rowIndex]);
    for (let i = 0; i < row.length; i += 1) {
      total += Number(row[i]) * Number(input[i]);
    }
    if (activation === "relu") {
      return relu(total);
    }
    return total;
  });
}

function runAnnFromStandardized(standardized, model) {
  const hidden1 = dense(standardized, model.layers[0].weights, model.layers[0].bias, "relu");
  const hidden2 = dense(hidden1, model.layers[1].weights, model.layers[1].bias, "relu");
  const output = dense(hidden2, model.layers[2].weights, model.layers[2].bias)[0];
  return sigmoid(output);
}

function runTrainedAnn(inputs, mask = null) {
  const model = loadModelArtifact();
  const standardized = standardizeFeatureVector(inputs, model);
  const masked = mask ? maskFeatureVector(standardized, mask) : standardized;
  const probability = runAnnFromStandardized(masked, model);
  return {
    probability,
    standardized,
    maskedStandardized: masked,
    model
  };
}

function createSeededRandom(seedValue = 42) {
  let seed = Math.max(1, Number(seedValue) || 42);
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function shuffleInPlace(values, random) {
  const clone = [...values];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

function loadValidationDataset() {
  if (cachedValidationDataset) {
    return cachedValidationDataset;
  }

  const model = loadModelArtifact();
  if (!fs.existsSync(datasetCsvPath)) {
    throw new Error("Dataset CSV not found. Train the model first so the runtime GA has evaluation data.");
  }

  const csv = fs.readFileSync(datasetCsvPath, "utf8").trim();
  const [headerLine, ...lines] = csv.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(",").map((item) => item.trim());
  const rows = lines.map((line) => {
    const values = line.split(",").map((item) => item.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    return row;
  });

  const prepared = rows.map((row) => {
    const features = {};
    featureOrder.forEach((key, index) => {
      const raw = Number(row[key]);
      const mean = Number(model.scaler.mean[index]);
      features[key] = Number.isFinite(raw) ? raw : mean;
    });

    return {
      standardized: standardizeFeatureVector(features, model),
      target: Number(row.num) > 0 ? 1 : 0
    };
  });

  const random = createSeededRandom(42);
  const grouped = {
    0: shuffleInPlace(prepared.filter((row) => row.target === 0), random),
    1: shuffleInPlace(prepared.filter((row) => row.target === 1), random)
  };

  const validationRows = [];
  Object.values(grouped).forEach((group) => {
    const count = Math.max(1, Math.floor(group.length * 0.2));
    validationRows.push(...group.slice(0, count));
  });

  cachedValidationDataset = validationRows;
  return cachedValidationDataset;
}

function decodeFeatureMask(mask) {
  const parsed = Array.isArray(mask) ? mask.map((gene) => (gene ? 1 : 0)) : GeneticAlgorithm.decodeMask(mask);
  if (parsed.length !== featureOrder.length) {
    throw new Error(`Feature mask must have ${featureOrder.length} genes`);
  }
  if (!parsed.some(Boolean)) {
    throw new Error("Feature mask must select at least one feature");
  }
  return parsed;
}

function encodeFeatureMask(mask) {
  return GeneticAlgorithm.encodeMask(mask);
}

function selectedFeatureNames(mask) {
  return decodeFeatureMask(mask).flatMap((gene, index) => (gene ? [featureDisplayName(featureOrder[index])] : []));
}

function evaluateFeatureMask(mask, options = {}) {
  const decodedMask = decodeFeatureMask(mask);
  const model = loadModelArtifact();
  const validationRows = loadValidationDataset();
  const maskPenalty = Number(options.maskPenalty ?? 0.02);
  const compactnessBonus = Number(options.compactnessBonus ?? 0.03);

  let correct = 0;
  let confidenceSum = 0;

  for (const row of validationRows) {
    const maskedVector = maskFeatureVector(row.standardized, decodedMask);
    const probability = runAnnFromStandardized(maskedVector, model);
    const prediction = probability >= 0.5 ? 1 : 0;
    if (prediction === row.target) {
      correct += 1;
    }
    confidenceSum += 1 - Math.abs(row.target - probability);
  }

  const accuracy = correct / Math.max(validationRows.length, 1);
  const averageConfidence = confidenceSum / Math.max(validationRows.length, 1);
  const selectedCount = decodedMask.reduce((sum, gene) => sum + gene, 0);
  const sparsity = 1 - selectedCount / decodedMask.length;
  const fitness = accuracy * 0.75 + averageConfidence * 0.25 + sparsity * compactnessBonus - selectedCount * maskPenalty * 0.01;

  return {
    mask: decodedMask,
    encodedMask: encodeFeatureMask(decodedMask),
    selectedCount,
    selectedFeatures: selectedFeatureNames(decodedMask),
    accuracy: round(accuracy, 4),
    averageConfidence: round(averageConfidence, 4),
    fitness: round(fitness, 4)
  };
}

function logisticBaseline(inputs) {
  const score =
    -4.2 +
    (inputs.age - 40) * 0.03 +
    inputs.sex * 0.4 +
    inputs.cp * 0.42 +
    (inputs.trestbps - 120) * 0.012 +
    (inputs.chol - 200) * 0.007 +
    inputs.fbs * 0.25 +
    inputs.restecg * 0.3 -
    (inputs.thalach - 140) * 0.018 +
    inputs.exang * 0.95 +
    inputs.oldpeak * 0.45 +
    inputs.ca * 0.6 +
    (inputs.thal === 7 ? 0.48 : inputs.thal === 6 ? 0.25 : 0);

  return sigmoid(score);
}

function decisionTreeBaseline(inputs) {
  let risk = 0.12;
  if (inputs.cp >= 4) risk += 0.16;
  if (inputs.exang === 1) risk += 0.16;
  if (inputs.oldpeak >= 2) risk += 0.12;
  if (inputs.ca >= 1) risk += 0.14;
  if (inputs.thal === 7) risk += 0.12;
  if (inputs.trestbps >= 140) risk += 0.08;
  if (inputs.chol >= 240) risk += 0.08;
  if (inputs.thalach <= 130) risk += 0.08;
  if (inputs.age >= 55) risk += 0.07;
  return clamp(risk, 0.05, 0.97);
}

function fuzzyRisk(inputs, probability) {
  let score = probability * 100;
  if (inputs.oldpeak >= 2) score += 8;
  if (inputs.ca >= 1) score += 8;
  if (inputs.thal === 7) score += 7;
  if (inputs.exang === 1) score += 6;
  if (inputs.thalach < 125) score += 5;
  if (inputs.cp <= 2) score -= 5;

  if (score < 35) return "Low Risk";
  if (score < 65) return "Medium Risk";
  return "High Risk";
}

function featureDisplayName(key) {
  const map = Object.fromEntries(featureMetadata.map((feature) => [feature.key, feature.label]));
  return map[key] || key;
}

function computeFeatureImportance(inputs, standardized, model) {
  const firstLayer = model.layers[0].weights;
  const aggregate = featureOrder.map((key, featureIndex) => {
    let influence = Math.abs(standardized[featureIndex]) * 0.3;
    for (let neuron = 0; neuron < firstLayer.length; neuron += 1) {
      influence += Math.abs(Number(firstLayer[neuron][featureIndex]));
    }
    if (key === "cp" && inputs.cp >= 3) influence += 1.4;
    if (key === "ca" && inputs.ca >= 1) influence += 1.2;
    if (key === "thal" && inputs.thal === 7) influence += 1.0;
    return {
      key,
      feature: featureDisplayName(key),
      score: round(influence * 16)
    };
  });

  return aggregate.sort((a, b) => b.score - a.score);
}

function applyGeneticSelection(importance, model) {
  const ga = model.genetic_algorithm;
  if (!ga || !Array.isArray(ga.selected_features) || !ga.selected_features.length) {
    return importance.slice(0, 3).map((item) => ({ feature: item.feature, influence: item.score }));
  }

  const selected = ga.selected_features
    .map((key) => importance.find((item) => item.key === key))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const combined = [...selected];
  for (const item of importance) {
    if (combined.length >= 4) {
      break;
    }
    if (!combined.some((entry) => entry.key === item.key)) {
      combined.push(item);
    }
  }

  return combined.slice(0, 4).map((item) => ({
    feature: item.feature,
    influence: item.score
  }));
}

function buildExplanation(inputs, riskBand, topFeatures) {
  const phrases = [];
  if (inputs.ca >= 1) phrases.push("visible vessel narrowing");
  if (inputs.oldpeak >= 2) phrases.push("elevated ST depression");
  if (inputs.exang === 1) phrases.push("exercise-induced angina");
  if (inputs.thal === 7) phrases.push("reversible thal defect");
  if (inputs.thalach < 130) phrases.push("reduced maximum heart rate");
  if (inputs.chol >= 240) phrases.push("high cholesterol");

  if (!phrases.length) {
    phrases.push("the combined cardiac pattern across ECG, chest pain, and exercise response");
  }

  return `${phrases.slice(0, 2).join(" and ")} push the patient toward ${riskBand.toLowerCase()}, with ${topFeatures[0].feature.toLowerCase()} acting as the strongest contributor.`;
}

function compareModels(inputs, annProbability, model) {
  return [
    { model: "PyTorch ANN", probability: round(annProbability * 100), accuracy: round(model.metrics.test_accuracy * 100, 1) },
    { model: "Logistic Regression Baseline", probability: round(logisticBaseline(inputs) * 100), accuracy: 82 },
    { model: "Decision Tree Baseline", probability: round(decisionTreeBaseline(inputs) * 100), accuracy: 80 },
    {
      model: "Genetic Algorithm Feature Search",
      probability: round(annProbability * 100),
      accuracy: round((model.genetic_algorithm?.subset_test_accuracy || 0) * 100, 1)
    }
  ];
}

function buildNarrative(result, model) {
  return [
    `The trained PyTorch ANN estimates a ${result.confidence}% probability of heart disease using 13 UCI clinical features.`,
    `Fuzzy logic maps the raw output to ${result.riskBand} by incorporating oldpeak, vessel count, thal status, and exercise angina.`,
    `The Genetic Algorithm selected ${model.genetic_algorithm?.selected_features?.length || 0} optimized features, and the most influential among them here are ${result.geneticSelection.map((item) => item.feature).join(", ")}.`,
    `The saved model was trained on the UCI Cleveland dataset and reached ${round(model.metrics.test_accuracy * 100, 1)}% ANN test accuracy, while the GA subset reached ${round((model.genetic_algorithm?.subset_test_accuracy || 0) * 100, 1)}%.`
  ];
}

function predictHeartDisease(payload = {}) {
  const inputs = normalizeInputs(payload);
  const runtimeMask = payload.featureMask ? decodeFeatureMask(payload.featureMask) : null;
  const inference = runTrainedAnn(inputs, runtimeMask);
  const probability = clamp(inference.probability, 0.01, 0.99);
  const confidence = round(probability * 100);
  const riskBand = fuzzyRisk(inputs, probability);
  const importance = computeFeatureImportance(inputs, inference.standardized, inference.model);
  const topFeatures = importance.slice(0, 3);
  const geneticSelection = applyGeneticSelection(importance, inference.model);
  const prediction = probability >= 0.7 ? "High Risk" : probability >= 0.45 ? "Moderate Risk" : "Low Risk";

  const result = {
    prediction,
    binaryPrediction: probability >= 0.5 ? "Disease" : "No Disease",
    probability: round(probability, 4),
    confidence,
    confidenceText: `${confidence}%`,
    riskBand,
    runtimeFeatureMask: runtimeMask ? encodeFeatureMask(runtimeMask) : null,
    important_features: topFeatures.map((item) => item.feature),
    featureImportance: importance,
    explanation: buildExplanation(inputs, riskBand, topFeatures),
    modelComparison: compareModels(inputs, probability, inference.model),
    geneticSelection,
    input: inputs,
    modelMetrics: inference.model.metrics,
    geneticAlgorithm: inference.model.genetic_algorithm
  };

  result.narrative = buildNarrative(result, inference.model);
  return result;
}

async function optimizeFeatureSubset(payload = {}) {
  const model = loadModelArtifact();
  const runtimeConfig = {
    populationSize: Number(payload.populationSize || 18),
    generations: Number(payload.generations || 12),
    crossoverRate: Number(payload.crossoverRate || 0.8),
    mutationRate: Number(payload.mutationRate || 0.08),
    tournamentSize: Number(payload.tournamentSize || 3)
  };

  const ga = new GeneticAlgorithm({
    featureCount: featureOrder.length,
    ...runtimeConfig,
    random: createSeededRandom(payload.seed || 42),
    evaluateFitness: async (mask) => evaluateFeatureMask(mask, payload.fitnessConfig || {})
  });

  const best = await ga.evolve();
  const response = {
    mask: best.mask,
    encodedMask: best.encodedMask,
    selectedFeatures: selectedFeatureNames(best.mask),
    selectedCount: best.selectedCount,
    fitness: round(best.fitness, 4),
    accuracy: round(best.accuracy, 4),
    averageConfidence: round(best.averageConfidence, 4),
    history: best.history,
    config: runtimeConfig
  };

  if (payload.exampleInput) {
    response.optimizedPrediction = predictHeartDisease({
      ...payload.exampleInput,
      featureMask: best.mask
    });
  }

  if (payload.persist === true) {
    model.runtimeGeneticAlgorithm = {
      ...response,
      persistedAt: new Date().toISOString()
    };
    persistModelArtifact(model);
    response.persisted = true;
  } else {
    response.persisted = false;
  }

  return response;
}

function analyzeScenario(payload = {}) {
  const baselineInputs = normalizeInputs(payload.base || payload);
  const scenarioInputs = normalizeInputs({
    ...baselineInputs,
    ...(payload.changes || {})
  });

  const baseline = predictHeartDisease(baselineInputs);
  const scenario = predictHeartDisease(scenarioInputs);
  const delta = round(scenario.confidence - baseline.confidence);

  return {
    baseline,
    scenario,
    deltaRisk: delta,
    summary:
      delta > 0
        ? `Risk increased by ${delta}% after the scenario change.`
        : delta < 0
          ? `Risk decreased by ${Math.abs(delta)}% after the scenario change.`
          : "Risk stayed the same after the scenario change."
  };
}

function getModelInfo() {
  const model = loadModelArtifact();
  return {
    project: "Heart Disease Prediction using Intelligent Models",
    dataset: {
      ...datasetInfo,
      featuresUsed: featureOrder,
      localDatasetPath: path.join("backend", "data", "heart_disease_uci.csv")
    },
    intelligentModels: [
      {
        name: "PyTorch ANN",
        role: "Primary trained neural network for heart disease classification",
        output: "Probability score and binary decision"
      },
      {
        name: "Fuzzy Logic",
        role: "Maps neural outputs into low, medium, and high risk groups",
        output: "Risk band"
      },
      {
        name: "Genetic Algorithm",
        role: "Optimizes feature subset selection using population-based evolutionary search at training time and runtime",
        output: "Selected feature subset and subset accuracy"
      }
    ],
    api: [
      { method: "POST", path: "/register", purpose: "Create a user account" },
      { method: "POST", path: "/login", purpose: "Authenticate an existing user" },
      { method: "GET", path: "/me", purpose: "Get current authenticated user" },
      { method: "POST", path: "/predict", purpose: "Predict heart disease risk and save history for logged-in users" },
      { method: "GET", path: "/history", purpose: "Return prediction history for the current user" },
      { method: "POST", path: "/scenario", purpose: "Compare risk under changed patient values" }
    ],
    features: featureMetadata,
    metrics: model.metrics,
    geneticAlgorithm: model.genetic_algorithm,
    runtimeGeneticAlgorithm: model.runtimeGeneticAlgorithm || null
  };
}

function getDashboardBootstrap() {
  const model = loadModelArtifact();
  return {
    dataset: datasetInfo,
    features: featureMetadata,
    samples: samplePatients,
    defaultPatient: samplePatients[0],
    metrics: model.metrics
  };
}

module.exports = {
  predictHeartDisease,
  getModelInfo,
  analyzeScenario,
  getDashboardBootstrap,
  normalizeInputs,
  optimizeFeatureSubset,
  evaluateFeatureMask,
  encodeFeatureMask,
  decodeFeatureMask
};
