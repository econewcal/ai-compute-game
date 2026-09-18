import type { PlayerState } from '../data/types';
import { GPU_DEFINITIONS } from '../data/gpus';
import { TECHNOLOGY_DEFINITIONS } from '../data/technologies';
import { CONTRACTS } from '../data/contracts';

const STORAGE_KEY = 'ai-compute-game-v1';

export function initialPlayerState(): PlayerState {
  return {
    cash: 10000,
    research: 0,
    currentContractIndex: 0,
    completedContracts: [],
    unlockedGPUs: ['a100-class'],
    unlockedTechs: ['kv-cache'],
    enabledTechs: [],
    clusterConfig: {
      gpuId: 'a100-class',
      gpuCount: 1,
      technologies: [],
    },
  };
}

export function saveState(state: PlayerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function loadState(): PlayerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerState;
  } catch {
    return null;
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function canUnlockTechnology(techId: string, state: PlayerState): boolean {
  const tech = TECHNOLOGY_DEFINITIONS.find((t) => t.id === techId);
  if (!tech) return false;
  if (state.unlockedTechs.includes(techId)) return false;
  if (state.research < tech.researchCost) return false;
  for (const prereq of tech.prerequisites) {
    if (!state.unlockedTechs.includes(prereq)) return false;
  }
  return true;
}

export function canUnlockGPU(gpuId: string, state: PlayerState): boolean {
  const gpu = GPU_DEFINITIONS.find((g) => g.id === gpuId);
  if (!gpu) return false;
  if (state.unlockedGPUs.includes(gpuId)) return false;
  if (state.research < gpu.researchCost) return false;
  if (state.cash < gpu.purchaseCost) return false;
  return true;
}

export function unlockTechnology(techId: string, state: PlayerState): PlayerState {
  const tech = TECHNOLOGY_DEFINITIONS.find((t) => t.id === techId);
  if (!tech || !canUnlockTechnology(techId, state)) return state;
  return {
    ...state,
    research: state.research - tech.researchCost,
    unlockedTechs: [...state.unlockedTechs, techId],
  };
}

export function unlockGPU(gpuId: string, state: PlayerState): PlayerState {
  const gpu = GPU_DEFINITIONS.find((g) => g.id === gpuId);
  if (!gpu || !canUnlockGPU(gpuId, state)) return state;
  return {
    ...state,
    cash: state.cash - gpu.purchaseCost,
    research: state.research - gpu.researchCost,
    unlockedGPUs: [...state.unlockedGPUs, gpuId],
  };
}

export function toggleTechnology(techId: string, state: PlayerState): PlayerState {
  if (!state.unlockedTechs.includes(techId)) return state;

  // If disabling kv-cache, also disable paged-attention (which depends on it)
  let enabledTechs = state.clusterConfig.technologies;
  if (enabledTechs.includes(techId)) {
    enabledTechs = enabledTechs.filter((id) => {
      if (id === techId) return false;
      const tech = TECHNOLOGY_DEFINITIONS.find((t) => t.id === id);
      return !tech?.prerequisites.includes(techId);
    });
  } else {
    enabledTechs = [...enabledTechs, techId];
  }

  return {
    ...state,
    clusterConfig: { ...state.clusterConfig, technologies: enabledTechs },
  };
}

export function completeContract(contractIndex: number, state: PlayerState): PlayerState {
  const contract = CONTRACTS[contractIndex];
  if (!contract) return state;
  return {
    ...state,
    cash: state.cash + contract.reward.cash,
    research: state.research + contract.reward.research,
    completedContracts: [...state.completedContracts, contract.id],
    currentContractIndex: Math.min(contractIndex + 1, CONTRACTS.length - 1),
  };
}
