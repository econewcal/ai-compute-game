import type { SimulationResult, ClusterConfig } from '../data/types';
import { scalingEfficiency } from '../simulation/engine';

interface Props {
  result: SimulationResult | null;
  config: ClusterConfig;
}

export function DebugPanel({ result, config }: Props) {
  if (!result) return <div className="debug-panel"><em>Run workload to see debug info.</em></div>;

  const scaling = scalingEfficiency(config.gpuCount);

  return (
    <div className="debug-panel">
      <h3>Debug / Balancing Panel</h3>
      <div className="debug-section">
        <div className="debug-title">Compute</div>
        <pre>
          {JSON.stringify(
            {
              rawCompute: result.debug.rawCompute,
              scalingEfficiency: scaling.toFixed(4),
              effectiveCompute: result.effectiveCompute.toFixed(2),
            },
            null,
            2
          )}
        </pre>
      </div>
      <div className="debug-section">
        <div className="debug-title">Memory (GB)</div>
        <pre>
          {JSON.stringify(
            {
              model: result.debug.memoryBreakdown.model.toFixed(2),
              kvCache: result.debug.memoryBreakdown.kvCache.toFixed(2),
              system: result.debug.memoryBreakdown.system.toFixed(2),
              total: result.memoryUsed.toFixed(2),
              capacity: result.memoryCapacity,
              usedFraction: (result.memoryUsedFraction * 100).toFixed(1) + '%',
            },
            null,
            2
          )}
        </pre>
      </div>
      <div className="debug-section">
        <div className="debug-title">Latency</div>
        <pre>
          {JSON.stringify(
            {
              baseLatency: result.debug.baseLatency + ' ms',
              queuePressure: result.debug.queuePressure.toFixed(4),
              p50: result.p50Latency + ' ms',
              p99: result.p99Latency + ' ms',
            },
            null,
            2
          )}
        </pre>
      </div>
      <div className="debug-section">
        <div className="debug-title">Throughput</div>
        <pre>
          {JSON.stringify(
            {
              capacity: result.debug.throughputCapacity + ' req/s',
              achieved: result.throughput + ' req/s',
              gpuUtil: (result.gpuUtilization * 100).toFixed(1) + '%',
            },
            null,
            2
          )}
        </pre>
      </div>
      <div className="debug-section">
        <div className="debug-title">Tech Multipliers</div>
        <pre>{JSON.stringify(result.debug.techMultipliers, null, 2)}</pre>
      </div>
    </div>
  );
}
