import type { GPU } from './types';

export const GPU_DEFINITIONS: GPU[] = [
  {
    id: 'a100-class',
    name: 'A100-class',
    label: 'Gen 1',
    compute: 100,
    memory: 40,
    memoryBandwidth: 100,
    hourlyCost: 2.0,
    power: 400,
    purchaseCost: 0,
    unlocked: true,
    researchCost: 0,
    description:
      'Proven workhorse GPU. Solid compute, good memory. High power draw relative to newer generations. Unlocked from the start.',
  },
  {
    id: 'h100-class',
    name: 'H100-class',
    label: 'Gen 2',
    compute: 220,
    memory: 80,
    memoryBandwidth: 230,
    hourlyCost: 4.5,
    power: 700,
    purchaseCost: 6000,
    unlocked: false,
    researchCost: 3,
    description:
      'Next-generation GPU with dramatically higher compute throughput and doubled memory. Requires research investment to unlock.',
  },
  {
    id: 'b200-class',
    name: 'B200-class',
    label: 'Gen 3',
    compute: 500,
    memory: 192,
    memoryBandwidth: 600,
    hourlyCost: 9.0,
    power: 1000,
    purchaseCost: 16000,
    unlocked: false,
    researchCost: 3,
    description:
      'Cutting-edge GPU. Massive compute and memory capacity with improved power efficiency per FLOP. Top-tier cost.',
  },
];
