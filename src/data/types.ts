export interface GPU {
  id: string;
  name: string;
  label: string; // e.g. "A100-class"
  compute: number; // normalized compute units
  memory: number; // GB VRAM
  memoryBandwidth: number; // normalized bandwidth units
  hourlyCost: number; // $/hr per GPU
  power: number; // watts per GPU
  purchaseCost: number; // one-time $ to unlock/buy
  unlocked: boolean;
  researchCost: number; // research points to unlock
  description: string;
}

export interface Technology {
  id: string;
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  researchCost: number;
  prerequisites: string[]; // technology ids
  unlocked: boolean;
  enabled: boolean;
  // simulation effect multipliers (applied in simulation engine)
  effects: {
    throughputMult?: number;
    latencyMult?: number;
    memoryOverhead?: number; // fraction of total VRAM consumed
    memoryEfficiencyMult?: number; // reduces memory pressure
    concurrencyMult?: number;
  };
}

export interface Contract {
  id: string;
  name: string; // customer name
  description: string;
  modelClass: string; // "Llama-class", "GPT-class", etc.
  workload: Workload;
  requirements: {
    minThroughput: number; // req/s
    maxP99Latency: number; // ms
    maxHourlyCost: number; // $/hr
  };
  reward: {
    cash: number;
    research: number;
  };
  teachingGoal: string; // internal — what mechanic this contract teaches
}

export interface Workload {
  requestsPerSecond: number; // traffic demand
  contextTokens: number; // tokens per request
  outputTokens: number; // tokens to generate
  modelSize: number; // normalized model weight size (affects VRAM)
  attentionComplexity: number; // 1.0 = normal, higher = more attention-bound
}

export interface ClusterConfig {
  gpuId: string;
  gpuCount: number;
  technologies: string[]; // enabled technology ids
}

export interface SimulationResult {
  throughput: number; // req/s achieved
  p50Latency: number; // ms
  p99Latency: number; // ms
  memoryUsed: number; // GB
  memoryCapacity: number; // GB
  memoryUsedFraction: number; // 0–1
  gpuUtilization: number; // 0–1
  hourlyCost: number; // $/hr
  powerUsage: number; // watts
  effectiveCompute: number;
  scalingEfficiency: number;
  passed: boolean;
  failureReasons: string[];
  // debug
  debug: {
    rawCompute: number;
    baseLatency: number;
    queuePressure: number;
    throughputCapacity: number;
    memoryBreakdown: { model: number; kvCache: number; system: number };
    techMultipliers: Record<string, number>;
  };
}

export interface PlayerState {
  cash: number;
  research: number;
  currentContractIndex: number;
  completedContracts: string[];
  unlockedGPUs: string[];
  unlockedTechs: string[];
  enabledTechs: string[];
  clusterConfig: ClusterConfig;
}
