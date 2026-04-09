class GeneticAlgorithm {
  constructor(config = {}) {
    this.featureCount = Number(config.featureCount || 0);
    this.populationSize = Number(config.populationSize || 18);
    this.generations = Number(config.generations || 12);
    this.crossoverRate = Number(config.crossoverRate || 0.8);
    this.mutationRate = Number(config.mutationRate || 0.08);
    this.tournamentSize = Number(config.tournamentSize || 3);
    this.evaluateFitness = config.evaluateFitness;
    this.random = config.random || Math.random;

    if (!this.featureCount) {
      throw new Error("GeneticAlgorithm requires a positive featureCount");
    }
    if (typeof this.evaluateFitness !== "function") {
      throw new Error("GeneticAlgorithm requires an evaluateFitness function");
    }
  }

  static encodeMask(mask) {
    return mask.map((gene) => (gene ? "1" : "0")).join("");
  }

  static decodeMask(maskString) {
    return String(maskString || "")
      .trim()
      .split("")
      .map((char) => (char === "1" ? 1 : 0));
  }

  static selectedIndices(mask) {
    return mask.flatMap((gene, index) => (gene ? [index] : []));
  }

  initializePopulation() {
    return Array.from({ length: this.populationSize }, () => this.randomMask());
  }

  randomMask() {
    const mask = Array.from({ length: this.featureCount }, () => (this.random() > 0.38 ? 1 : 0));
    return this.ensureAtLeastOneGene(mask);
  }

  ensureAtLeastOneGene(mask) {
    if (mask.some(Boolean)) {
      return mask;
    }
    const forcedIndex = Math.floor(this.random() * this.featureCount);
    mask[forcedIndex] = 1;
    return mask;
  }

  tournamentSelect(scoredPopulation) {
    let best = null;
    for (let index = 0; index < this.tournamentSize; index += 1) {
      const candidate = scoredPopulation[Math.floor(this.random() * scoredPopulation.length)];
      if (!best || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    return [...best.mask];
  }

  crossover(parentA, parentB) {
    if (this.random() > this.crossoverRate) {
      return [[...parentA], [...parentB]];
    }

    const pivot = Math.max(1, Math.floor(this.random() * (this.featureCount - 1)));
    const childA = parentA.slice(0, pivot).concat(parentB.slice(pivot));
    const childB = parentB.slice(0, pivot).concat(parentA.slice(pivot));
    return [this.ensureAtLeastOneGene(childA), this.ensureAtLeastOneGene(childB)];
  }

  mutate(mask) {
    const mutated = [...mask];
    for (let index = 0; index < mutated.length; index += 1) {
      if (this.random() < this.mutationRate) {
        mutated[index] = mutated[index] ? 0 : 1;
      }
    }
    return this.ensureAtLeastOneGene(mutated);
  }

  async scorePopulation(population, cache) {
    const scored = [];

    for (const mask of population) {
      const encoded = GeneticAlgorithm.encodeMask(mask);
      let result = cache.get(encoded);
      if (!result) {
        result = await this.evaluateFitness(mask);
        cache.set(encoded, result);
      }

      scored.push({
        mask: [...mask],
        encodedMask: encoded,
        ...result
      });
    }

    scored.sort((a, b) => b.fitness - a.fitness);
    return scored;
  }

  async evolve() {
    const cache = new Map();
    let population = this.initializePopulation();
    let bestOverall = null;
    const history = [];

    for (let generation = 0; generation < this.generations; generation += 1) {
      const scoredPopulation = await this.scorePopulation(population, cache);
      const bestGeneration = scoredPopulation[0];

      history.push({
        generation: generation + 1,
        bestFitness: bestGeneration.fitness,
        bestAccuracy: bestGeneration.accuracy,
        selectedCount: bestGeneration.selectedCount
      });

      if (!bestOverall || bestGeneration.fitness > bestOverall.fitness) {
        bestOverall = {
          ...bestGeneration,
          history: [...history]
        };
      }

      const eliteCount = Math.max(2, Math.floor(this.populationSize * 0.25));
      const nextPopulation = scoredPopulation.slice(0, eliteCount).map((entry) => [...entry.mask]);

      while (nextPopulation.length < this.populationSize) {
        const parentA = this.tournamentSelect(scoredPopulation);
        const parentB = this.tournamentSelect(scoredPopulation);
        const [childA, childB] = this.crossover(parentA, parentB);
        nextPopulation.push(this.mutate(childA));
        if (nextPopulation.length < this.populationSize) {
          nextPopulation.push(this.mutate(childB));
        }
      }

      population = nextPopulation;
    }

    return {
      ...bestOverall,
      history
    };
  }
}

module.exports = {
  GeneticAlgorithm
};
