import type { PlayerState } from '../data/types';
import { GPU_DEFINITIONS } from '../data/gpus';

interface Props {
  state: PlayerState;
  onGPUChange: (gpuId: string) => void;
  onCountChange: (count: number) => void;
  onUnlockGPU: (gpuId: string) => void;
}

const MAX_GPUS = 16;

export function InfrastructurePanel({ state, onGPUChange, onCountChange, onUnlockGPU }: Props) {
  const { gpuId, gpuCount } = state.clusterConfig;
  const selectedGPU = GPU_DEFINITIONS.find((g) => g.id === gpuId)!;

  const hourlyCostTotal = selectedGPU.hourlyCost * gpuCount;
  const totalMemory = selectedGPU.memory * gpuCount;
  const totalPower = selectedGPU.power * gpuCount;

  return (
    <div className="panel infra-panel">
      <div className="panel-header">
        <span className="panel-label">GPU FLEET</span>
      </div>

      <div className="gpu-selector">
        {GPU_DEFINITIONS.map((gpu) => {
          const isUnlocked = state.unlockedGPUs.includes(gpu.id);
          const isSelected = gpu.id === gpuId;
          const canUnlock =
            !isUnlocked && state.research >= gpu.researchCost && state.cash >= gpu.purchaseCost;

          return (
            <div
              key={gpu.id}
              className={`gpu-card ${isSelected ? 'gpu-card--selected' : ''} ${!isUnlocked ? 'gpu-card--locked' : ''}`}
              onClick={() => isUnlocked && onGPUChange(gpu.id)}
            >
              <div className="gpu-card-header">
                <span className="gpu-name">{gpu.name}</span>
                <span className="gpu-gen">{gpu.label}</span>
              </div>
              {isUnlocked ? (
                <div className="gpu-stats">
                  <div className="gpu-stat">
                    <span className="stat-label">VRAM</span>
                    <span className="stat-value">{gpu.memory} GB</span>
                  </div>
                  <div className="gpu-stat">
                    <span className="stat-label">Compute</span>
                    <div className="compute-bar">
                      <div
                        className="compute-bar-fill"
                        style={{ width: `${(gpu.compute / 500) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="gpu-stat">
                    <span className="stat-label">$/hr</span>
                    <span className="stat-value">${gpu.hourlyCost.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="gpu-locked-info">
                  <div className="lock-icon">🔒</div>
                  <div className="lock-cost">
                    {gpu.researchCost > 0 && (
                      <span className={state.research >= gpu.researchCost ? 'met' : 'unmet'}>
                        {gpu.researchCost} Research
                      </span>
                    )}
                    {gpu.purchaseCost > 0 && (
                      <span className={state.cash >= gpu.purchaseCost ? 'met' : 'unmet'}>
                        ${gpu.purchaseCost.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {canUnlock && (
                    <button
                      className="btn btn--unlock btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnlockGPU(gpu.id);
                      }}
                    >
                      Unlock
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="quantity-row">
        <span className="quantity-label">Quantity</span>
        <div className="quantity-controls">
          <button
            className="qty-btn"
            onClick={() => onCountChange(Math.max(1, gpuCount - 1))}
            disabled={gpuCount <= 1}
          >
            −
          </button>
          <span className="qty-value">{gpuCount}</span>
          <button
            className="qty-btn"
            onClick={() => onCountChange(Math.min(MAX_GPUS, gpuCount + 1))}
            disabled={gpuCount >= MAX_GPUS}
          >
            +
          </button>
        </div>
      </div>

      <div className="fleet-summary">
        <div className="fleet-stat">
          <span className="label">Total VRAM</span>
          <span className="value">{totalMemory} GB</span>
        </div>
        <div className="fleet-stat">
          <span className="label">Total Cost</span>
          <span className="value">${hourlyCostTotal.toFixed(2)}/hr</span>
        </div>
        <div className="fleet-stat">
          <span className="label">Power Draw</span>
          <span className="value">{totalPower} W</span>
        </div>
      </div>
    </div>
  );
}
