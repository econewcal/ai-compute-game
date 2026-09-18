import type { Workload, ClusterConfig, SimulationResult } from '../data/types';
import { GPU_DEFINITIONS } from '../data/gpus';
import { TECHNOLOGY_DEFINITIONS } from '../data/technologies';

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
  if (!gpu) return failResult(`Unknown GPU type: ${config.gpuId}`, config, 0, 0);

  const count = config.gpuCount;
  if (count <= 0) return failResult('No GPUs selected.', config, 0, 0);

  const techIds = new Set(config.technologies);
  const kvEnabled = techIds.has('kv-cache');
  const pagedEnabled = techIds.has('paged-attention');
  const cbEnabled = techIds.has('continuous-batching');
  const flashEnabled = techIds.has('flash-attention');

  // ── Compute ─────────────────────────────────────────────────────────────
  const scaling = scalingEfficiency(count);
  const rawCompute = gpu.compute * count;
  const effectiveCompute = rawCompute * scaling;

  // Context scales compute cost. KV cache eliminates recomputation of cached
  // tokens — the longer the context, the more KV cache helps.
  const contextScale = 1 + workload.contextTokens / 1024;
  const baseComputePerRequest =
    workload.modelSize * contextScale * workload.attentionComplexity * 0.8;

  const kvComputeFactor = kvEnabled
    ? Math.max(0.3, 1 / (1 + Math.min(4, workload.contextTokens / 1024) * 0.5))
    : 1.0;

  const computePerRequest = baseComputePerRequest * kvComputeFactor;

  // ── Memory ──────────────────────────────────────────────────────────────
  const totalMemoryGB = gpu.memory * count;
  const modelMemoryGB = workload.modelSize * 40;
  const systemOverheadGB = 2.0;

  const kvMemoryPerSeqGB = (workload.contextTokens / 1024) * workload.modelSize * 0.5;
  const kvPagedFactor = pagedEnabled ? 0.7 : 1.0;
  const kvFlashFactor = flashEnabled ? 0.85 : 1.0;
  const kvEfficiencyFactor = kvPagedFactor * kvFlashFactor;

  let kvMemoryGB = 0;
  let baseMaxConcurrent = Math.max(1, Math.floor(effectiveCompute / 8));

  if (kvEnabled) {
    const memAvailableForKV = totalMemoryGB - modelMemoryGB - systemOverheadGB;
    const kvPerSeqEffective = Math.max(0.01, kvMemoryPerSeqGB * kvEfficiencyFactor);
    const maxConcurrentByMemory = Math.max(1, Math.floor(memAvailableForKV / kvPerSeqEffective));
    baseMaxConcurrent = Math.min(baseMaxConcurrent, maxConcurrentByMemory);
    kvMemoryGB = kvMemoryPerSeqGB * baseMaxConcurrent * kvEfficiencyFactor;
  }

  const totalMemoryUsed = modelMemoryGB + kvMemoryGB + systemOverheadGB;
  const memoryUsedFraction = totalMemoryUsed / totalMemoryGB;

  if (memoryUsedFraction > 1.0) {
    const r = failResult(
      `GPU memory exhausted. Need ${totalMemoryUsed.toFixed(1)} GB but have ${totalMemoryGB} GB. ` +
        `Model: ${modelMemoryGB.toFixed(1)} GB, KV cache: ${kvMemoryGB.toFixed(1)} GB.`,
      config,
      totalMemoryUsed,
      totalMemoryGB
    );
    r.memoryUsed = totalMemoryUsed;
    r.memoryCapacity = totalMemoryGB;
    r.memoryUsedFraction = memoryUsedFraction;
    r.hourlyCost = gpu.hourlyCost * count;
    r.powerUsage = gpu.power * count;
    r.effectiveCompute = effectiveCompute;
    r.scalingEfficiency = scaling;
    return r;
  }

  // ── Throughput ──────────────────────────────────────────────────────────
  const techMults: Record<string, number> = {};
  let throughputCapacity = effectiveCompute / computePerRequest;

  // KV cache benefit is already in computePerRequest via kvComputeFactor.
  // CB, Paged, Flash each add independent utilization improvements.
  if (cbEnabled) {
    throughputCapacity *= 1.55;
    techMults['continuous-batching'] = 1.55;
  }
  if (pagedEnabled) {
    throughputCapacity *= 1.2;
    techMults['paged-attention'] = 1.2;
  }
  if (flashEnabled) {
    throughputCapacity *= 1.25;
    techMults['flash-attention-throughput'] = 1.25;
  }

  const memoryHeadroomFactor = pagedEnabled
    ? 1.0 + 0.3 * (1 - memoryUsedFraction)
    : 1.0 + 0.1 * (1 - memoryUsedFraction);
  throughputCapacity *= memoryHeadroomFactor;

  const achievedThroughput = Math.min(throughputCapacity, workload.requestsPerSecond * 1.4);

  // ── Latency ─────────────────────────────────────────────────────────────
  const gpuSpeedFactor = gpu.compute / 100;

  // With KV cache: only decode phase matters (prefill is cached).
  // The ratio outputTokens/(context+output) captures how much work remains.
  const kvPrefillFactor = kvEnabled
    ? Math.max(0.08, workload.outputTokens / (workload.contextTokens + workload.outputTokens))
    : 1.0;

  const baseLatency =
    ((workload.contextTokens / 512) * kvPrefillFactor + workload.outputTokens / 64) *
    workload.modelSize *
    70 /
    gpuSpeedFactor;

  const utilizationRatio = workload.requestsPerSecond / Math.max(throughputCapacity, 1);

  const queuePressure =
    utilizationRatio < 0.9
      ? 1.0 + utilizationRatio * 0.3
      : 1.0 + Math.pow(utilizationRatio - 0.9, 2) * 30 + 0.27;

  let p50Latency = baseLatency * queuePressure;
  let p99Latency = p50Latency * (1.1 + utilizationRatio * 0.4);

  if (cbEnabled) {
    p50Latency *= 0.88;
    p99Latency *= 0.92;
    techMults['continuous-batching-latency'] = 0.9;
  }

  if (flashEnabled) {
    const attnBonus = 1 - (workload.attentionComplexity - 1) * 0.08;
    const latencyMult = Math.max(0.6, 0.78 * attnBonus);
    p50Latency *= latencyMult;
    p99Latency *= latencyMult;
    techMults['flash-attention-latency'] = latencyMult;
  }

  // ── Cost / power ────────────────────────────────────────────────────────
  const hourlyCost = gpu.hourlyCost * count;
  const powerUsage = gpu.power * count;
  const gpuUtilization = Math.min(0.99, workload.requestsPerSecond / throughputCapacity);

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
    passed: false,
    failureReasons: [],
    debug: {
      rawCompute,
      baseLatency: Math.round(baseLatency),
      queuePressure,
      throughputCapacity: Math.round(throughputCapacity),
      memoryBreakdown: { model: modelMemoryGB, kvCache: kvMemoryGB, system: systemOverheadGB },
      techMultipliers: techMults,
    },
  };
}

export function evaluateContract(
  result: SimulationResult,
  requirements: { minThroughput: number; maxP99Latency: number; maxHourlyCost: number }
): { passed: boolean; failureReasons: string[] } {
  if (result.failureReasons.length > 0) {
    return { passed: false, failureReasons: result.failureReasons };
  }

  const failureReasons: string[] = [];

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
