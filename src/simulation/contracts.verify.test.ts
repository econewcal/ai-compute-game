import { describe, it, expect } from 'vitest';
import { simulateWithWorkload, evaluateContract } from './engine';
import { CONTRACTS } from '../data/contracts';
import type { ClusterConfig } from '../data/types';

const solutions: ClusterConfig[] = [
  { gpuId: 'a100-class', gpuCount: 1, technologies: ['kv-cache'] },
  { gpuId: 'a100-class', gpuCount: 3, technologies: ['kv-cache', 'continuous-batching'] },
  { gpuId: 'a100-class', gpuCount: 4, technologies: ['kv-cache'] },
  { gpuId: 'a100-class', gpuCount: 4, technologies: ['kv-cache', 'continuous-batching'] },
  { gpuId: 'h100-class', gpuCount: 3, technologies: ['kv-cache', 'continuous-batching', 'paged-attention'] },
  { gpuId: 'b200-class', gpuCount: 2, technologies: ['kv-cache', 'continuous-batching', 'paged-attention', 'flash-attention'] },
];

describe('contract solvability', () => {
  CONTRACTS.forEach((contract, i) => {
    it(`C${i + 1} (${contract.name}) passes with intended solution`, () => {
      const r = simulateWithWorkload(solutions[i], contract.workload);
      const { passed, failureReasons } = evaluateContract(r, contract.requirements);
      if (!passed) {
        console.error(`C${i+1} FAIL: ${failureReasons.join('; ')} | throughput=${r.throughput} p99=${r.p99Latency}ms cost=$${r.hourlyCost.toFixed(2)}/hr mem=${(r.memoryUsedFraction*100).toFixed(0)}%`);
      }
      expect(passed).toBe(true);
    });
  });
});
