import type { Workload, ClusterConfig, SimulationResult } from '../data/types';
import { GPU_DEFINITIONS } from '../data/gpus';
import { TECHNOLOGY_DEFINITIONS } from '../data/technologies';

// Scaling efficiency: diminishing returns as GPUs increase.
// f(n) = n^0.88 / n  (i.e., each additional GPU contributes slightly less)
export function scalingEfficiency(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1.0;
  return Math.pow(count, 0.88) / count;
}


export function simulateWithWorkload(
  config: ClusterConfig,
  workload: Workload,
  allGPUs = GPU_DEFINITIONS,
  _allTechs = TECHNOLOGY_DEFINITIONS
): SimulationResult {
  const gpu = allGPUs.find((g) => g.id === config.gpuId);
  if (!gpu) {
    return failResult(`Unknown GPU type: ${config.gpuId}`, config, 0, 0);
  }

  const count = config.gpuCount;
  if (count <= 0) {
    return failResult('No GPUs selected.', config, 0, 0);
  }

  const techIds = new Set(config.technologies);

  // ── Scaling efficiency ──────────────────────────────────────────────────
  const scaling = scalingEfficiency(count);
  const rawCompute = gpu.compute * count;
  const effectiveCompute = rawCompute * scaling;

  // ── Memory capacity ─────────────────────────────────────────────────────
  const totalMemoryGB = gpu.memory * count;

  // Model weights occupy a base fraction of VRAM based on modelSize
  const modelMemoryGB = workload.modelSize * 40; // normalized: 1.0 modelSize ≈ 40 GB

  // KV cache memory: grows with context length and concurrency
  // Base concurrent sequences we can serve
  const baseMaxConcurrent = Math.max(1, Math.floor(effectiveCompute / 8));

  // KV cache per sequence: proportional to contextTokens and model size
  const kvMemoryPerSeqGB = (workload.contextTokens / 1024) * workload.modelSize * 0.5;

  let kvMemoryGB = 0;
  let kvEnabled = techIds.has('kv-cache');
  let pagedEnabled = techIds.has('paged-attention');

  if (kvEnabled) {
    let kvFactor = pagedEnabled ? 0.7 : 1.0; // paged attention reduces fragmentation overhead
    const flashEnabled = techIds.has('flash-attention');
    if (flashEnabled) kvFactor *= 0.85;
    kvMemoryGB = kvMemoryPerSeqGB * baseMaxConcurrent * kvFactor;
  }

  const systemOverheadGB = 2.0; // OS + framework overhead
  const totalMemoryUsed = modelMemoryGB + kvMemoryGB + systemOverheadGB;
  const memoryUsedFraction = totalMemoryUsed / totalMemoryGB;

  // OOM check
  if (memoryUsedFraction > 1.0) {
    const result = failResult(
      `GPU memory exhausted. Need ${totalMemoryUsed.toFixed(1)} GB but only have ${totalMemoryGB} GB. ` +
        `Model weights: ${modelMemoryGB.toFixed(1)} GB. KV cache: ${kvMemoryGB.toFixed(1)} GB.`,
      config,
      totalMemoryUsed,
      totalMemoryGB
    );
    result.memoryUsed = totalMemoryUsed;
    result.memoryCapacity = totalMemoryGB;
    result.memoryUsedFraction = memoryUsedFraction;
    result.hourlyCost = gpu.hourlyCost * count;
    result.powerUsage = gpu.power * count;
    result.effectiveCompute = effectiveCompute;
    result.scalingEfficiency = scaling;
    return result;
  }

  // ── Throughput calculation ──────────────────────────────────────────────
  // Base throughput capacity: normalized compute per unit work
  // Work per request scales with context and model size
  const computePerRequest =
    workload.modelSize * (1 + workload.contextTokens / 512) * workload.attentionComplexity * 0.8;

  let throughputCapacity = effectiveCompute / computePerRequest;

  // Technology multipliers
  const techMults: Record<string, number> = {};

  if (kvEnabled) {
    const mult = 1.4;
    throughputCapacity *= mult;
    techMults['kv-cache-throughput'] = mult;
  }

  if (techIds.has('continuous-batching')) {
    const mult = 1.55;
    throughputCapacity *= mult;
    techMults['continuous-batching'] = mult;
  }

  if (pagedEnabled) {
    const mult = 1.2;
    throughputCapacity *= mult;
    techMults['paged-attention'] = mult;
  }

  if (techIds.has('flash-attention')) {
    const mult = 1.25;
    throughputCapacity *= mult;
    techMults['flash-attention-throughput'] = mult;
  }

  // Memory headroom boosts concurrency when paged is active
  const memoryHeadroomFactor = pagedEnabled
    ? 1.0 + 0.3 * (1 - memoryUsedFraction)
    : 1.0 + 0.1 * (1 - memoryUsedFraction);
  throughputCapacity *= memoryHeadroomFactor;

  // Cap achieved throughput at demand (we don't overshoot demand)
  const achievedThroughput = Math.min(throughputCapacity, workload.requestsPerSecond * 1.4);

  // ── Latency calculation ─────────────────────────────────────────────────
  // Base latency: time to process one request
  const gpuSpeedFactor = gpu.compute / 100; // relative to Gen 1
  const baseLatency =
    ((workload.contextTokens / 512 + workload.outputTokens / 64) * workload.modelSize * 80) /
    gpuSpeedFactor;

  // Queue pressure: as demand approaches capacity, latency rises steeply
  const utilizationRatio = workload.requestsPerSecond / Math.max(throughputCapacity, 1);
  const queuePressure = utilizationRatio < 0.9 ? 1.0 + utilizationRatio * 0.3 : 1.0 + Math.pow(utilizationRatio - 0.9, 2) * 30 + 0.27;

  let p50Latency = baseLatency * queuePressure;
  let p99Latency = p50Latency * (1.4 + utilizationRatio * 0.6);

  // Technology latency reductions
  if (kvEnabled) {
    const longContextBonus = Math.min(2.0, 1 + (workload.contextTokens - 512) / 2048) * 0.35;
    const latencyMult = Math.max(0.45, 0.65 - longContextBonus * 0.1);
    p50Latency *= latencyMult;
    p99Latency *= latencyMult;
    techMults['kv-cache-latency'] = latencyMult;
  }

  if (techIds.has('continuous-batching')) {
    p50Latency *= 0.88;
    p99Latency *= 0.92;
    techMults['continuous-batching-latency'] = 0.9;
  }

  if (techIds.has('flash-attention')) {
    const attnBonus = 1 - (workload.attentionComplexity - 1) * 0.08;
    const latencyMult = Math.max(0.6, 0.78 * attnBonus);
    p50Latency *= latencyMult;
    p99Latency *= latencyMult;
    techMults['flash-attention-latency'] = latencyMult;
  }

  // ── Cost & power ────────────────────────────────────────────────────────
  const hourlyCost = gpu.hourlyCost * count;
  const powerUsage = gpu.power * count;

  // ── GPU utilization ─────────────────────────────────────────────────────
  const gpuUtilization = Math.min(0.99, workload.requestsPerSecond / throughputCapacity);

  // ── Failure checks ──────────────────────────────────────────────────────
  const failureReasons: string[] = [];

  return {
    throughput: Math.round(achievedThroughput),
    p50Latency: Math.round(p50Latency),
    p99Latency: Math.round(p99Latency),
    memoryUsed: totalMemoryUsed,
    memoryCapacity: totalMemoryGB,
    memoryUsedFraction,
    gpuUtilization,
    hourlyCost,
    powerUsage,
    effectiveCompute,
    scalingEfficiency: scaling,
    passed: false, // evaluated by caller against contract requirements
    failureReasons,
    debug: {
      rawCompute,
      baseLatency: Math.round(baseLatency),
      queuePressure,
      throughputCapacity: Math.round(throughputCapacity),
      memoryBreakdown: {
        model: modelMemoryGB,
        kvCache: kvMemoryGB,
        system: systemOverheadGB,
      },
      techMultipliers: techMults,
    },
  };
}

export function evaluateContract(
  result: SimulationResult,
  requirements: { minThroughput: number; maxP99Latency: number; maxHourlyCost: number }
): { passed: boolean; failureReasons: string[] } {
  const failureReasons: string[] = [];

  if (result.failureReasons.length > 0) {
    return { passed: false, failureReasons: result.failureReasons };
  }

  if (result.throughput < requirements.minThroughput) {
    const pct = Math.round(
      ((requirements.minThroughput - result.throughput) / requirements.minThroughput) * 100
    );
    failureReasons.push(
      `Throughput is ${pct}% below the contract requirement (${result.throughput} vs ${requirements.minThroughput} req/s).`
    );
  }

  if (result.p99Latency > requirements.maxP99Latency) {
    const pct = Math.round(
      ((result.p99Latency - requirements.maxP99Latency) / requirements.maxP99Latency) * 100
    );
    failureReasons.push(
      `P99 latency is ${pct}% over the contract limit (${result.p99Latency} ms vs ${requirements.maxP99Latency} ms).`
    );
  }

  if (result.hourlyCost > requirements.maxHourlyCost) {
    failureReasons.push(
      `Operating cost $${result.hourlyCost.toFixed(2)}/hr exceeds the $${requirements.maxHourlyCost.toFixed(2)}/hr budget.`
    );
  }

  return { passed: failureReasons.length === 0, failureReasons };
}

function failResult(
  reason: string,
  _config: ClusterConfig,
  memUsed: number,
  memCap: number
): SimulationResult {
  return {
    throughput: 0,
    p50Latency: 9999,
    p99Latency: 9999,
    memoryUsed: memUsed,
    memoryCapacity: memCap,
    memoryUsedFraction: memCap > 0 ? memUsed / memCap : 0,
    gpuUtilization: 0,
    hourlyCost: 0,
    powerUsage: 0,
    effectiveCompute: 0,
    scalingEfficiency: 0,
    passed: false,
    failureReasons: [reason],
    debug: {
      rawCompute: 0,
      baseLatency: 0,
      queuePressure: 1,
      throughputCapacity: 0,
      memoryBreakdown: { model: 0, kvCache: 0, system: 0 },
      techMultipliers: {},
    },
  };
}

