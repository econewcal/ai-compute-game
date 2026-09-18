import type { Contract } from './types';

export const CONTRACTS: Contract[] = [
  {
    id: 'contract-1',
    name: 'Small AI Startup',
    description:
      '"We need a basic inference server for our assistant product. Small traffic, short prompts. Just make it work reliably."',
    modelClass: 'Llama-class (7B)',
    workload: {
      requestsPerSecond: 80,
      contextTokens: 512,
      outputTokens: 128,
      modelSize: 0.4,
      attentionComplexity: 1.0,
    },
    requirements: {
      minThroughput: 80,
      maxP99Latency: 500,
      maxHourlyCost: 3.0,
    },
    reward: { cash: 4000, research: 1 },
    teachingGoal: 'Learn GPU quantity → throughput/cost relationship',
  },
  {
    id: 'contract-2',
    name: 'MidSize SaaS Co',
    description:
      '"Our product hit a growth spurt. We need significantly more throughput than before, but we cannot break the bank on costs."',
    modelClass: 'Llama-class (13B)',
    workload: {
      requestsPerSecond: 200,
      contextTokens: 1024,
      outputTokens: 256,
      modelSize: 0.65,
      attentionComplexity: 1.1,
    },
    requirements: {
      minThroughput: 200,
      maxP99Latency: 400,
      maxHourlyCost: 6.0,
    },
    reward: { cash: 7000, research: 2 },
    teachingGoal: 'Scaling GPUs has diminishing returns — need better utilization',
  },
  {
    id: 'contract-3',
    name: 'Legal AI Corp',
    description:
      '"We process long legal documents — 16K token contexts. Throughput can be moderate but latency must stay reasonable. We noticed this gets very slow without proper caching."',
    modelClass: 'Llama-class (13B)',
    workload: {
      requestsPerSecond: 120,
      contextTokens: 8192,
      outputTokens: 512,
      modelSize: 0.65,
      attentionComplexity: 2.2,
    },
    requirements: {
      minThroughput: 120,
      maxP99Latency: 400,
      maxHourlyCost: 8.0,
    },
    reward: { cash: 9000, research: 2 },
    teachingGoal: 'Long context → KV Cache becomes critical',
  },
  {
    id: 'contract-4',
    name: 'Consumer Chat Platform',
    description:
      '"Thousands of simultaneous users. GPU utilization is terrible right now — we stall waiting for batches to fill. We need something smarter."',
    modelClass: 'Llama-class (13B)',
    workload: {
      requestsPerSecond: 350,
      contextTokens: 2048,
      outputTokens: 256,
      modelSize: 0.65,
      attentionComplexity: 1.3,
    },
    requirements: {
      minThroughput: 350,
      maxP99Latency: 300,
      maxHourlyCost: 10.0,
    },
    reward: { cash: 12000, research: 3 },
    teachingGoal: 'High concurrency → Continuous Batching matters',
  },
  {
    id: 'contract-5',
    name: 'Medical Records AI',
    description:
      '"Very long patient documents, many concurrent sessions. Our system keeps running out of GPU memory. We need to handle this memory pressure efficiently."',
    modelClass: 'Mistral-class (70B)',
    workload: {
      requestsPerSecond: 180,
      contextTokens: 16384,
      outputTokens: 512,
      modelSize: 1.4,
      attentionComplexity: 3.0,
    },
    requirements: {
      minThroughput: 180,
      maxP99Latency: 450,
      maxHourlyCost: 15.0,
    },
    reward: { cash: 18000, research: 4 },
    teachingGoal: 'Memory pressure → Paged Attention unlocks more concurrency',
  },
  {
    id: 'contract-6',
    name: 'Hedge Fund AI',
    description:
      '"Financial decisions. Latency is everything — we need sub-200ms P99 on complex models at high throughput. Budget is flexible but tight SLAs are non-negotiable."',
    modelClass: 'GPT-class (70B)',
    workload: {
      requestsPerSecond: 400,
      contextTokens: 4096,
      outputTokens: 128,
      modelSize: 1.4,
      attentionComplexity: 2.0,
    },
    requirements: {
      minThroughput: 400,
      maxP99Latency: 200,
      maxHourlyCost: 20.0,
    },
    reward: { cash: 30000, research: 5 },
    teachingGoal: 'Strict latency → newer GPU gen + Flash Attention required',
  },
];
