import type { SimulationResult, Contract } from '../data/types';

interface Props {
  result: SimulationResult | null;
  contract: Contract;
  isRunning: boolean;
  onRun: () => void;
  onNext: () => void;
  contractPassed: boolean;
  isGameComplete: boolean;
}

interface MetricRowProps {
  label: string;
  value: string;
  requirement?: string;
  met?: boolean;
  warning?: boolean;
}

function MetricRow({ label, value, requirement, met, warning }: MetricRowProps) {
  return (
    <div className={`metric-row ${met === true ? 'metric--pass' : met === false ? 'metric--fail' : warning ? 'metric--warn' : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-right">
        <span className="metric-value">{value}</span>
        {requirement && (
          <span className="metric-req">{requirement}</span>
        )}
        {met !== undefined && (
          <span className="metric-status">{met ? '✓' : '✗'}</span>
        )}
        {warning && <span className="metric-status metric-status--warn">⚠</span>}
      </div>
    </div>
  );
}

function FlowDiagram({ technologies }: { technologies: string[] }) {
  const kvEnabled = technologies.includes('kv-cache');
  const batchEnabled = technologies.includes('continuous-batching');
  const flashEnabled = technologies.includes('flash-attention');
  const pagedEnabled = technologies.includes('paged-attention');

  return (
    <div className="flow-diagram">
      <div className="flow-node flow-node--always">REQUESTS</div>
      <div className="flow-arrow">↓</div>
      {batchEnabled && (
        <>
          <div className="flow-node flow-node--tech">BATCHER</div>
          <div className="flow-arrow">↓</div>
        </>
      )}
      {kvEnabled && (
        <>
          <div className="flow-node flow-node--tech">
            KV CACHE{pagedEnabled ? ' (Paged)' : ''}
          </div>
          <div className="flow-arrow">↓</div>
        </>
      )}
      <div className="flow-node flow-node--always">
        ATTENTION{flashEnabled ? ' (Flash)' : ''}
      </div>
      <div className="flow-arrow">↓</div>
      <div className="flow-node flow-node--gpu">GPU FLEET</div>
      <div className="flow-arrow">↓</div>
      <div className="flow-node flow-node--always">RESPONSES</div>
    </div>
  );
}

export function ResultsPanel({
  result,
  contract,
  isRunning,
  onRun,
  onNext,
  contractPassed,
  isGameComplete,
}: Props) {
  const { requirements } = contract;

  return (
    <div className="panel results-panel">
      <div className="panel-header">
        <span className="panel-label">RESULTS</span>
      </div>

      {!result && !isRunning && (
        <div className="pre-run">
          <FlowDiagram technologies={[]} />
          <p className="pre-run-hint">Configure your GPU fleet and technologies, then run the workload.</p>
        </div>
      )}

      {isRunning && (
        <div className="running-state">
          <div className="spinner" />
          <p>Simulating workload…</p>
        </div>
      )}

      {result && !isRunning && (
        <div className="result-content">
          <div className={`verdict ${contractPassed ? 'verdict--pass' : 'verdict--fail'}`}>
            {contractPassed ? '✓ CONTRACT PASSED' : '✗ CONTRACT FAILED'}
          </div>

          {!contractPassed && result.failureReasons.length > 0 && (
            <div className="failure-reasons">
              {result.failureReasons.map((r, i) => (
                <div key={i} className="failure-reason">
                  {r}
                </div>
              ))}
            </div>
          )}

          <div className="metrics">
            <MetricRow
              label="THROUGHPUT"
              value={`${result.throughput} req/s`}
              requirement={`req: ≥${requirements.minThroughput}`}
              met={result.throughput >= requirements.minThroughput}
            />
            <MetricRow
              label="P99 LATENCY"
              value={`${result.p99Latency} ms`}
              requirement={`req: ≤${requirements.maxP99Latency} ms`}
              met={result.p99Latency <= requirements.maxP99Latency}
            />
            <MetricRow
              label="P50 LATENCY"
              value={`${result.p50Latency} ms`}
            />
            <MetricRow
              label="GPU MEMORY"
              value={`${(result.memoryUsedFraction * 100).toFixed(0)}%`}
              warning={result.memoryUsedFraction > 0.9}
            />
            <MetricRow
              label="COST"
              value={`$${result.hourlyCost.toFixed(2)}/hr`}
              requirement={`req: ≤$${requirements.maxHourlyCost.toFixed(2)}/hr`}
              met={result.hourlyCost <= requirements.maxHourlyCost}
            />
            <MetricRow
              label="GPU UTIL"
              value={`${(result.gpuUtilization * 100).toFixed(0)}%`}
            />
          </div>
        </div>
      )}

      <div className="run-area">
        {contractPassed ? (
          isGameComplete ? (
            <div className="game-complete">
              <div className="game-complete-title">🏆 YOU WIN</div>
              <p>All contracts complete. You built an AI compute empire.</p>
            </div>
          ) : (
            <button className="btn btn--next" onClick={onNext}>
              Next Contract →
            </button>
          )
        ) : (
          <button className="btn btn--run" onClick={onRun} disabled={isRunning}>
            {isRunning ? 'Running…' : 'RUN WORKLOAD'}
          </button>
        )}
      </div>
    </div>
  );
}
