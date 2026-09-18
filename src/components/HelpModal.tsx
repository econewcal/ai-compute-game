interface Props {
  onClose: () => void;
}

export function HelpModal({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">How to Play</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p className="modal-intro">
          You run an AI inference company. Customers give you contracts with performance
          requirements. Build a GPU fleet and enable technologies to meet them.
        </p>

        <div className="modal-steps">
          <div className="modal-step">
            <span className="step-num">1</span>
            <div>
              <strong>Read the contract</strong> — note the throughput, latency, and cost requirements on the left.
            </div>
          </div>
          <div className="modal-step">
            <span className="step-num">2</span>
            <div>
              <strong>Configure your fleet</strong> — pick a GPU type and adjust the quantity with − and +.
            </div>
          </div>
          <div className="modal-step">
            <span className="step-num">3</span>
            <div>
              <strong>Enable technologies</strong> — toggle on unlocked optimizations like KV Cache or Continuous Batching.
            </div>
          </div>
          <div className="modal-step">
            <span className="step-num">4</span>
            <div>
              <strong>Run the workload</strong> — hit the big button and see your results.
            </div>
          </div>
          <div className="modal-step">
            <span className="step-num">5</span>
            <div>
              <strong>Iterate</strong> — if you fail, read why, change something, and run again.
            </div>
          </div>
          <div className="modal-step">
            <span className="step-num">6</span>
            <div>
              <strong>Earn rewards</strong> — passing a contract gives cash and Research Points to unlock better hardware and technologies.
            </div>
          </div>
        </div>

        <div className="modal-tip">
          <span className="tip-label">TIP</span>
          There's no tutorial. Experiment — the numbers always tell you what changed and why.
        </div>

        <button className="btn btn--run modal-btn" onClick={onClose}>
          Let's go →
        </button>
      </div>
    </div>
  );
}
