import type { Technology } from './types';

export const TECHNOLOGY_DEFINITIONS: Technology[] = [
  {
    id: 'kv-cache',
    name: 'KV Cache',
    category: 'Inference Optimization',
    description:
      'Caches the key-value attention tensors from previously processed tokens. Eliminates redundant computation during autoregressive generation. Dramatically reduces compute for long contexts — but consumes significant GPU memory.',
    shortDescription: 'Reduces repeated attention computation. Uses additional GPU memory.',
    researchCost: 0,
    prerequisites: [],
    unlocked: true,
    enabled: false,
    effects: {
      throughputMult: 1.4,
      latencyMult: 0.65,
      memoryOverhead: 0.18,
    },
  },
  {
    id: 'continuous-batching',
    name: 'Continuous Batching',
    category: 'Inference Optimization',
    description:
      'Dynamically slots new requests into the batch as older ones complete, rather than waiting for an entire batch to finish. Greatly improves GPU utilization and effective throughput under high concurrency.',
    shortDescription: 'Dynamically fills GPU capacity with requests. Improves utilization.',
    researchCost: 1,
    prerequisites: [],
    unlocked: false,
    enabled: false,
    effects: {
      throughputMult: 1.55,
      latencyMult: 0.88,
      concurrencyMult: 1.6,
    },
  },
  {
    id: 'paged-attention',
    name: 'Paged Attention',
    category: 'Inference Optimization',
    description:
      'Manages KV cache memory in fixed-size pages, like virtual memory in an OS. Eliminates memory fragmentation so the GPU can hold more concurrent sequences. Requires KV Cache to be active.',
    shortDescription: 'Reduces KV cache memory fragmentation. Allows more concurrent sequences.',
    researchCost: 2,
    prerequisites: ['kv-cache'],
    unlocked: false,
    enabled: false,
    effects: {
      memoryEfficiencyMult: 0.72,
      concurrencyMult: 1.35,
      throughputMult: 1.2,
    },
  },
  {
    id: 'flash-attention',
    name: 'Flash Attention',
    category: 'Attention Optimization',
    description:
      'Rewrites the attention computation to minimize reads/writes to GPU memory, keeping intermediate tensors in fast on-chip SRAM. Especially beneficial for longer context lengths. Reduces memory bandwidth pressure.',
    shortDescription: 'More efficient attention computation. Especially helps long contexts.',
    researchCost: 3,
    prerequisites: [],
    unlocked: false,
    enabled: false,
    effects: {
      throughputMult: 1.25,
      latencyMult: 0.78,
      memoryEfficiencyMult: 0.85,
    },
  },
];
