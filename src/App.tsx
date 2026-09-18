import { useState, useCallback } from 'react';
import { ContractPanel } from './components/ContractPanel';
import { InfrastructurePanel } from './components/InfrastructurePanel';
import { TechnologyPanel } from './components/TechnologyPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { DebugPanel } from './components/DebugPanel';
import { HelpModal } from './components/HelpModal';
import { CONTRACTS } from './data/contracts';
import type { PlayerState, SimulationResult } from './data/types';
import {
  initialPlayerState,
  saveState,
  loadState,
  clearState,
  toggleTechnology,
  unlockTechnology,
  unlockGPU,
  completeContract,
} from './game/state';
import { simulateWithWorkload, evaluateContract } from './simulation/engine';
import './App.css';

const DEBUG_MODE = import.meta.env.DEV;

function App() {
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    return loadState() ?? initialPlayerState();
  });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [contractPassed, setContractPassed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showHelp, setShowHelp] = useState(() => loadState() === null);

  const update = useCallback((newState: PlayerState) => {
    setPlayerState(newState);
    saveState(newState);
    setResult(null);
    setContractPassed(false);
  }, []);

  const contract = CONTRACTS[playerState.currentContractIndex];
  const isAllComplete =
    playerState.currentContractIndex >= CONTRACTS.length - 1 &&
    playerState.completedContracts.includes(contract?.id ?? '');

  function handleRun() {
    setIsRunning(true);
    setResult(null);

    setTimeout(() => {
      const simResult = simulateWithWorkload(
        playerState.clusterConfig,
        contract.workload
      );
      const { passed, failureReasons } = evaluateContract(simResult, contract.requirements);
      simResult.passed = passed;
      simResult.failureReasons = [...simResult.failureReasons, ...failureReasons];
      setResult(simResult);
      setContractPassed(passed);
      setIsRunning(false);
    }, 900);
  }

  function handleNext() {
    const newState = completeContract(playerState.currentContractIndex, playerState);
    update(newState);
  }

  function handleReset() {
    if (confirm('Reset all progress?')) {
      clearState();
      setPlayerState(initialPlayerState());
      setResult(null);
      setContractPassed(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="title-main">AI COMPUTE COMPANY</span>
          <span className="title-sub">Build and manage your AI inference fleet</span>
        </div>
        <div className="player-stats">
          <div className="stat-chip stat-chip--cash">
            <span className="chip-label">CASH</span>
            <span className="chip-value">${playerState.cash.toLocaleString()}</span>
          </div>
          <div className="stat-chip stat-chip--research">
            <span className="chip-label">RESEARCH</span>
            <span className="chip-value">{playerState.research} RP</span>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowHelp(true)}>
            ?
          </button>
          <button className="btn btn--ghost btn--sm" onClick={handleReset}>
            Reset
          </button>
          {DEBUG_MODE && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setShowDebug((v) => !v)}
            >
              Debug
            </button>
          )}
        </div>
      </header>

      <main className="game-grid">
        {contract && (
          <>
            <ContractPanel
              contract={contract}
              contractIndex={playerState.currentContractIndex}
              totalContracts={CONTRACTS.length}
              completed={contractPassed}
            />
            <InfrastructurePanel
              state={playerState}
              onGPUChange={(gpuId) =>
                update({ ...playerState, clusterConfig: { ...playerState.clusterConfig, gpuId } })
              }
              onCountChange={(gpuCount) =>
                update({
                  ...playerState,
                  clusterConfig: { ...playerState.clusterConfig, gpuCount },
                })
              }
              onUnlockGPU={(gpuId) => update(unlockGPU(gpuId, playerState))}
            />
            <TechnologyPanel
              state={playerState}
              onToggle={(techId) => update(toggleTechnology(techId, playerState))}
              onUnlock={(techId) => update(unlockTechnology(techId, playerState))}
            />
            <ResultsPanel
              result={result}
              contract={contract}
              isRunning={isRunning}
              onRun={handleRun}
              onNext={handleNext}
              contractPassed={contractPassed}
              isGameComplete={isAllComplete}
            />
          </>
        )}
      </main>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {DEBUG_MODE && showDebug && (
        <aside className="debug-aside">
          <DebugPanel result={result} config={playerState.clusterConfig} />
        </aside>
      )}
    </div>
  );
}

export default App;
