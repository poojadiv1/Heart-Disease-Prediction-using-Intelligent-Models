import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch import nn
from ucimlrepo import fetch_ucirepo


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MODEL_DIR = ROOT / "model"
CSV_PATH = DATA_DIR / "heart_disease_uci.csv"
MODEL_PATH = MODEL_DIR / "heart_model.json"
FEATURE_ORDER = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "fbs",
    "restecg",
    "thalach",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal",
]


def ensure_dirs():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)


def fetch_dataset():
    dataset = fetch_ucirepo(id=45)
    features = dataset.data.features.copy()
    target = dataset.data.targets.copy()
    frame = pd.concat([features, target], axis=1)
    frame.to_csv(CSV_PATH, index=False)
    return frame


def load_dataset():
    if CSV_PATH.exists():
        return pd.read_csv(CSV_PATH)
    return fetch_dataset()


def prepare_frame(frame):
    clean = frame.copy()
    for column in FEATURE_ORDER + ["num"]:
      clean[column] = pd.to_numeric(clean[column], errors="coerce")

    for column in FEATURE_ORDER:
        clean[column] = clean[column].fillna(clean[column].median())

    clean["target"] = (clean["num"] > 0).astype(int)
    return clean


def stratified_split(frame, test_ratio=0.2, seed=42):
    rng = np.random.default_rng(seed)
    test_indices = []
    train_indices = []
    for target_value in [0, 1]:
        indices = frame.index[frame["target"] == target_value].to_numpy()
        rng.shuffle(indices)
        cutoff = max(1, int(len(indices) * test_ratio))
        test_indices.extend(indices[:cutoff].tolist())
        train_indices.extend(indices[cutoff:].tolist())

    train_df = frame.loc[sorted(train_indices)].reset_index(drop=True)
    test_df = frame.loc[sorted(test_indices)].reset_index(drop=True)
    return train_df, test_df


class HeartNet(nn.Module):
    def __init__(self, input_size):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_size, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
        )

    def forward(self, x):
        return self.net(x)


class SubsetNet(nn.Module):
    def __init__(self, input_size):
        super().__init__()
        hidden = max(4, min(12, input_size * 2))
        self.net = nn.Sequential(
            nn.Linear(input_size, hidden),
            nn.ReLU(),
            nn.Linear(hidden, 1),
        )

    def forward(self, x):
        return self.net(x)


def accuracy_from_logits(logits, labels):
    probs = torch.sigmoid(logits)
    preds = (probs >= 0.5).float()
    return float((preds.eq(labels).float().mean()).item())


def evaluate_subset(x_train_scaled, y_train, x_test_scaled, y_test, chromosome):
    indices = [index for index, gene in enumerate(chromosome) if gene == 1]
    if not indices:
        return {
            "fitness": 0.0,
            "accuracy": 0.0,
            "feature_count": 0,
            "indices": [],
        }

    x_train_subset = torch.tensor(x_train_scaled[:, indices], dtype=torch.float32)
    y_train_tensor = torch.tensor(y_train, dtype=torch.float32)
    x_test_subset = torch.tensor(x_test_scaled[:, indices], dtype=torch.float32)
    y_test_tensor = torch.tensor(y_test, dtype=torch.float32)

    torch.manual_seed(42 + sum(indices))
    model = SubsetNet(len(indices))
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    criterion = nn.BCEWithLogitsLoss()

    for _ in range(120):
        model.train()
        optimizer.zero_grad()
        logits = model(x_train_subset)
        loss = criterion(logits, y_train_tensor)
        loss.backward()
        optimizer.step()

    model.eval()
    with torch.no_grad():
        test_logits = model(x_test_subset)
        accuracy = accuracy_from_logits(test_logits, y_test_tensor)

    compactness_bonus = 0.02 * (1 - (len(indices) / len(FEATURE_ORDER)))
    fitness = accuracy + compactness_bonus
    return {
        "fitness": float(fitness),
        "accuracy": float(accuracy),
        "feature_count": len(indices),
        "indices": indices,
    }


def random_chromosome(rng, size):
    chromosome = [int(rng.random() > 0.35) for _ in range(size)]
    if not any(chromosome):
        chromosome[rng.integers(0, size)] = 1
    return chromosome


def crossover(rng, parent_a, parent_b):
    pivot = rng.integers(1, len(parent_a))
    child = parent_a[:pivot] + parent_b[pivot:]
    if not any(child):
        child[rng.integers(0, len(child))] = 1
    return child


def mutate(rng, chromosome, rate=0.08):
    mutated = chromosome[:]
    for index in range(len(mutated)):
        if rng.random() < rate:
            mutated[index] = 1 - mutated[index]
    if not any(mutated):
        mutated[rng.integers(0, len(mutated))] = 1
    return mutated


def run_genetic_feature_selection(x_train_scaled, y_train, x_test_scaled, y_test):
    rng = np.random.default_rng(42)
    population_size = 12
    generations = 8
    elite_count = 4
    population = [random_chromosome(rng, len(FEATURE_ORDER)) for _ in range(population_size)]
    cache = {}
    best = None
    history = []

    for generation in range(generations):
        scored = []
        for chromosome in population:
            key = tuple(chromosome)
            if key not in cache:
                cache[key] = evaluate_subset(x_train_scaled, y_train, x_test_scaled, y_test, chromosome)
            metrics = cache[key]
            scored.append((chromosome, metrics))

        scored.sort(key=lambda entry: entry[1]["fitness"], reverse=True)
        generation_best = scored[0][1]
        history.append(
            {
                "generation": generation + 1,
                "best_fitness": round(generation_best["fitness"], 4),
                "best_accuracy": round(generation_best["accuracy"], 4),
                "feature_count": generation_best["feature_count"],
            }
        )

        if best is None or generation_best["fitness"] > best["fitness"]:
            best = {
                **generation_best,
                "chromosome": scored[0][0][:],
            }

        elites = [entry[0] for entry in scored[:elite_count]]
        next_population = elites[:]
        while len(next_population) < population_size:
            parent_a = elites[rng.integers(0, len(elites))]
            parent_b = elites[rng.integers(0, len(elites))]
            child = crossover(rng, parent_a, parent_b)
            child = mutate(rng, child)
            next_population.append(child)
        population = next_population

    selected_features = [FEATURE_ORDER[index] for index in best["indices"]]
    return {
        "population_size": population_size,
        "generations": generations,
        "best_fitness": round(best["fitness"], 4),
        "subset_test_accuracy": round(best["accuracy"], 4),
        "selected_indices": best["indices"],
        "selected_features": selected_features,
        "history": history,
    }


def train_model():
    ensure_dirs()
    raw_frame = load_dataset()
    frame = prepare_frame(raw_frame)
    train_df, test_df = stratified_split(frame)

    x_train = train_df[FEATURE_ORDER].to_numpy(dtype=np.float32)
    y_train = train_df["target"].to_numpy(dtype=np.float32).reshape(-1, 1)
    x_test = test_df[FEATURE_ORDER].to_numpy(dtype=np.float32)
    y_test = test_df["target"].to_numpy(dtype=np.float32).reshape(-1, 1)

    mean = x_train.mean(axis=0)
    std = x_train.std(axis=0)
    std[std == 0] = 1.0

    x_train_scaled = (x_train - mean) / std
    x_test_scaled = (x_test - mean) / std
    ga_summary = run_genetic_feature_selection(x_train_scaled, y_train, x_test_scaled, y_test)

    torch.manual_seed(42)
    model = HeartNet(len(FEATURE_ORDER))
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    criterion = nn.BCEWithLogitsLoss()

    x_train_tensor = torch.tensor(x_train_scaled, dtype=torch.float32)
    y_train_tensor = torch.tensor(y_train, dtype=torch.float32)
    x_test_tensor = torch.tensor(x_test_scaled, dtype=torch.float32)
    y_test_tensor = torch.tensor(y_test, dtype=torch.float32)

    for _ in range(300):
        model.train()
        optimizer.zero_grad()
        logits = model(x_train_tensor)
        loss = criterion(logits, y_train_tensor)
        loss.backward()
        optimizer.step()

    model.eval()
    with torch.no_grad():
        train_logits = model(x_train_tensor)
        test_logits = model(x_test_tensor)
        train_accuracy = accuracy_from_logits(train_logits, y_train_tensor)
        test_accuracy = accuracy_from_logits(test_logits, y_test_tensor)
        final_loss = float(criterion(test_logits, y_test_tensor).item())

    layers = []
    linear_layers = [module for module in model.net if isinstance(module, nn.Linear)]
    for layer in linear_layers:
        layers.append(
            {
                "weights": layer.weight.detach().cpu().numpy().tolist(),
                "bias": layer.bias.detach().cpu().numpy().tolist(),
            }
        )

    artifact = {
        "framework": "pytorch",
        "dataset": "uci-heart-disease-cleveland",
        "feature_order": FEATURE_ORDER,
        "scaler": {
            "mean": mean.tolist(),
            "std": std.tolist(),
        },
        "layers": layers,
        "metrics": {
            "train_accuracy": train_accuracy,
            "test_accuracy": test_accuracy,
            "test_loss": final_loss,
            "train_size": int(len(train_df)),
            "test_size": int(len(test_df)),
            "epochs": 300,
        },
        "genetic_algorithm": ga_summary,
    }

    MODEL_PATH.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    print(json.dumps({"metrics": artifact["metrics"], "genetic_algorithm": ga_summary}, indent=2))


if __name__ == "__main__":
    train_model()
