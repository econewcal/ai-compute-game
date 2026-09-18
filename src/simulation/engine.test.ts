import { describe, it, expect } from 'vitest';
import { simulateWithWorkload, evaluateContract, scalingEfficiency } from './engine';
import type { ClusterConfig, Workload } from '../data/types';

const baseWorkload: Workload = {
  requestsPerSecond: 100,
  contextTokens: 1024,
  outputTokens: 128,
  modelSize: 0.5,
  attentionComplexity: 1.0,
};

const longContextWorkload: Workload = {
  ...baseWorkload,
  contextTokens: 8192,
  attentionComplexity: 2.2,
};

const highAttentionWorkload: Workload = {
  ...baseWorkload,
  contextTokens: 4096,
  attentionComplexity: 2.0,
};

function cfg(gpuCount: number, techs: string[] = []): ClusterConfig {
  return { gpuId: 'a100-class', gpuCount, technologies: techs };
}

describe('scalingEfficiency', () => {
  it('returns 1 for a single GPU', () => {
    expect(scalingEfficiency(1)).toBe(1.0);
  });
  it('decreases as GPU count increases', () => {
    const e2 = scalingEfficiency(2);
    const e4 = scalingEfficiency(4);
    const e8 = scalingEfficiency(8);
    expect(e2).toBeLessThan(1.0);
    expect(e4).toBeLessThan(e2);
    expect(e8).toBeLessThan(e4);
  });
  it('returns 0 for 0 GPUs', () => {
    expect(scalingEfficiency(0)).toBe(0);
  });
});

describe('adding GPUs', () => {
  it('increases throughput', () => {
    const r1 = simulateWithWorkload(cfg(1), baseWorkload);
    const r4 = simulateWithWorkload(cfg(4), baseWorkload);
    expect(r4.throughput).toBeGreaterThan(r1.throughput);
  });

  it('increases hourly cost', () => {
    const r1 = simulateWithWorkload(cfg(1), baseWorkload);
    const r4 = simulateWithWorkload(cfg(4), baseWorkload);
    expect(r4.hourlyCost).toBeGreaterThan(r1.hourlyCost);
  });

  it('increases total memory capacity', () => {
    const r1 = simulateWithWorkload(cfg(1), baseWorkload);
    const r4 = simulateWithWorkload(cfg(4), baseWorkload);
    expect(r4.memoryCapacity).toBeGreaterThan(r1.memoryCapacity);
  });

  it('throughput does not scale linearly — diminishing returns', () => {
    const r1 = simulateWithWorkload(cfg(1), baseWorkload);
    const r8 = simulateWithWorkload(cfg(8), baseWorkload);
    const ratio = r8.throughput / r1.throughput;
    expect(ratio).toBeLessThan(8);
  });
});

describe('determinism', () => {
  it('same config always produces same result', () => {
    const config = cfg(3, ['kv-cache', 'continuous-batching']);
    const r1 = simulateWithWorkload(config, baseWorkload);
    const r2 = simulateWithWorkload(config, baseWorkload);
    expect(r1.throughput).toBe(r2.throughput);
    expect(r1.p99Latency).toBe(r2.p99Latency);
    expect(r1.hourlyCost).toBe(r2.hourlyCost);
  });
});

describe('KV Cache', () => {
  it('improves throughput on long context', () => {
    const noKV = simulateWithWorkload(cfg(4), longContextWorkload);
    const withKV = simulateWithWorkload(cfg(4, ['kv-cache']), longContextWorkload);
    expect(withKV.throughput).toBeGreaterThan(noKV.throughput);
  });

  it('reduces P99 latency on long context', () => {
    const noKV = simulateWithWorkload(cfg(4), longContextWorkload);
    const withKV = simulateWithWorkload(cfg(4, ['kv-cache']), longContextWorkload);
    expect(withKV.p99Latency).toBeLessThan(noKV.p99Latency);
  });

  it('consumes additional memory compared to no KV', () => {
    const noKV = simulateWithWorkload(cfg(4), baseWorkload);
    const withKV = simulateWithWorkload(cfg(4, ['kv-cache']), baseWorkload);
    expect(withKV.memoryUsed).toBeGreaterThan(noKV.memoryUsed);
  });

  it('memory benefit is bigger for longer contexts', () => {
    const shortNoKV = simulateWithWorkload(cfg(4), baseWorkload);
    const shortKV = simulateWithWorkload(cfg(4, ['kv-cache']), baseWorkload);
    const longNoKV = simulateWithWorkload(cfg(4), longContextWorkload);
    const longKV = simulateWithWorkload(cfg(4, ['kv-cache']), longContextWorkload);
    const shortLatencyImprovement = shortNoKV.p99Latency - shortKV.p99Latency;
    const longLatencyImprovement = longNoKV.p99Latency - longKV.p99Latency;
    expect(longLatencyImprovement).toBeGreaterThan(shortLatencyImprovement);
  });
});

describe('Paged Attention', () => {
  it('requires kv-cache to be enabled', () => {
    // paged attention without kv-cache should not have its effect
    const withKV = simulateWithWorkload(cfg(4, ['kv-cache']), longContextWorkload);
    const withBoth = simulateWithWorkload(cfg(4, ['kv-cache', 'paged-attention']), longContextWorkload);
    expect(withBoth.throughput).toBeGreaterThan(withKV.throughput);
  });

  it('reduces effective memory usage vs kv-cache alone', () => {
    const kvOnly = simulateWithWorkload(cfg(4, ['kv-cache']), longContextWorkload);
    const kvPaged = simulateWithWorkload(cfg(4, ['kv-cache', 'paged-attention']), longContextWorkload);
    expect(kvPaged.memoryUsed).toBeLessThan(kvOnly.memoryUsed);
  });
});

describe('Flash Attention', () => {
  it('improves throughput on attention-heavy workloads', () => {
    const noFlash = simulateWithWorkload(cfg(4), highAttentionWorkload);
    const withFlash = simulateWithWorkload(cfg(4, ['flash-attention']), highAttentionWorkload);
    expect(withFlash.throughput).toBeGreaterThan(noFlash.throughput);
  });

  it('reduces latency on attention-heavy workloads', () => {
    const noFlash = simulateWithWorkload(cfg(4), highAttentionWorkload);
    const withFlash = simulateWithWorkload(cfg(4, ['flash-attention']), highAttentionWorkload);
    expect(withFlash.p99Latency).toBeLessThan(noFlash.p99Latency);
  });
});

describe('OOM / memory', () => {
  it('triggers OOM failure when model is too large for GPU count', () => {
    // modelSize 3.0 = 120 GB — one A100-class (40 GB) cannot hold it
    const hugModel: Workload = { ...baseWorkload, modelSize: 3.0 };
    const result = simulateWithWorkload(cfg(1), hugModel);
    expect(result.failureReasons.length).toBeGreaterThan(0);
    const hasOOM = result.failureReasons.some((r) => r.toLowerCase().includes('memory'));
    expect(hasOOM).toBe(true);
  });

  it('more GPUs can resolve OOM', () => {
    const bigModel: Workload = { ...baseWorkload, modelSize: 1.5 };
    const small = simulateWithWorkload(cfg(1), bigModel);
    const large = simulateWithWorkload(cfg(8), bigModel);
    expect(small.failureReasons.length).toBeGreaterThan(0);
    expect(large.failureReasons.length).toBe(0);
  });
});

describe('queue pressure', () => {
  it('latency rises when demand approaches capacity', () => {
    const light: Workload = { ...baseWorkload, requestsPerSecond: 20 };
    const heavy: Workload = { ...baseWorkload, requestsPerSecond: 95 };
    const rLight = simulateWithWorkload(cfg(1), light);
    const rHeavy = simulateWithWorkload(cfg(1), heavy);
    expect(rHeavy.p99Latency).toBeGreaterThan(rLight.p99Latency);
  });
});

describe('evaluateContract', () => {
  const reqs = { minThroughput: 100, maxP99Latency: 300, maxHourlyCost: 5 };

  it('passes when all requirements are met', () => {
    const mockResult = {
      throughput: 150,
      p99Latency: 200,
      hourlyCost: 4,
      failureReasons: [],
    } as any;
    const { passed } = evaluateContract(mockResult, reqs);
    expect(passed).toBe(true);
  });

  it('fails when throughput is too low', () => {
    const mockResult = { throughput: 80, p99Latency: 200, hourlyCost: 4, failureReasons: [] } as any;
    const { passed, failureReasons } = evaluateContract(mockResult, reqs);
    expect(passed).toBe(false);
    expect(failureReasons.some((r) => r.toLowerCase().includes('throughput'))).toBe(true);
  });

  it('fails when latency is too high', () => {
    const mockResult = { throughput: 150, p99Latency: 500, hourlyCost: 4, failureReasons: [] } as any;
    const { passed, failureReasons } = evaluateContract(mockResult, reqs);
    expect(passed).toBe(false);
    expect(failureReasons.some((r) => r.toLowerCase().includes('latency'))).toBe(true);
  });

  it('fails when cost exceeds budget', () => {
    const mockResult = { throughput: 150, p99Latency: 200, hourlyCost: 8, failureReasons: [] } as any;
    const { passed, failureReasons } = evaluateContract(mockResult, reqs);
    expect(passed).toBe(false);
    expect(failureReasons.some((r) => r.toLowerCase().includes('cost'))).toBe(true);
  });
});
