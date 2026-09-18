import type { Contract } from '../data/types';

interface Props {
  contract: Contract;
  contractIndex: number;
  totalContracts: number;
  completed: boolean;
}

export function ContractPanel({ contract, contractIndex, totalContracts, completed }: Props) {
  return (
    <div className={`panel contract-panel ${completed ? 'panel--completed' : ''}`}>
      <div className="panel-header">
        <span className="panel-label">CONTRACT {contractIndex + 1} / {totalContracts}</span>
        {completed && <span className="badge badge--success">COMPLETE</span>}
      </div>

      <h2 className="contract-customer">{contract.name}</h2>
      <p className="contract-description">{contract.description}</p>

      <div className="contract-model">
        <span className="label">Model</span>
        <span className="value">{contract.modelClass}</span>
      </div>

      <div className="contract-traffic">
        <div className="traffic-item">
          <span className="label">Traffic</span>
          <span className="value">{contract.workload.requestsPerSecond} req/s</span>
        </div>
        <div className="traffic-item">
          <span className="label">Context</span>
          <span className="value">{(contract.workload.contextTokens / 1000).toFixed(1)}K tokens</span>
        </div>
      </div>

      <div className="contract-section-title">Requirements</div>
      <div className="requirements">
        <div className="requirement">
          <span className="req-label">Throughput</span>
          <span className="req-value">≥ {contract.requirements.minThroughput} req/s</span>
        </div>
        <div className="requirement">
          <span className="req-label">P99 Latency</span>
          <span className="req-value">≤ {contract.requirements.maxP99Latency} ms</span>
        </div>
        <div className="requirement">
          <span className="req-label">Cost</span>
          <span className="req-value">≤ ${contract.requirements.maxHourlyCost.toFixed(2)}/hr</span>
        </div>
      </div>

      <div className="contract-section-title">Reward</div>
      <div className="reward">
        <span className="reward-cash">${contract.reward.cash.toLocaleString()}</span>
        <span className="reward-sep">+</span>
        <span className="reward-research">{contract.reward.research} Research</span>
      </div>
    </div>
  );
}
