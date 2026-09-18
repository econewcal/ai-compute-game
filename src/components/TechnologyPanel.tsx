import type { PlayerState, Technology } from '../data/types';
import { TECHNOLOGY_DEFINITIONS } from '../data/technologies';
import { canUnlockTechnology } from '../game/state';

interface Props {
  state: PlayerState;
  onToggle: (techId: string) => void;
  onUnlock: (techId: string) => void;
}

const CATEGORY_ORDER = ['Inference Optimization', 'Attention Optimization'];

export function TechnologyPanel({ state, onToggle, onUnlock }: Props) {
  const byCategory: Record<string, Technology[]> = {};
  for (const tech of TECHNOLOGY_DEFINITIONS) {
    if (!byCategory[tech.category]) byCategory[tech.category] = [];
    byCategory[tech.category].push(tech);
  }

  return (
    <div className="panel tech-panel">
      <div className="panel-header">
        <span className="panel-label">TECHNOLOGIES</span>
        <span className="research-badge">{state.research} RP</span>
      </div>

      {CATEGORY_ORDER.map((cat) => (
        <div key={cat} className="tech-category">
          <div className="tech-category-title">{cat}</div>
          <div className="tech-cards">
            {(byCategory[cat] || []).map((tech) => {
              const isUnlocked = state.unlockedTechs.includes(tech.id);
              const isEnabled = state.clusterConfig.technologies.includes(tech.id);
              const canUnlock = canUnlockTechnology(tech.id, state);
              const prereqsMet = tech.prerequisites.every((p) =>
                state.unlockedTechs.includes(p)
              );
              const prereqsEnabled = tech.prerequisites.every((p) =>
                state.clusterConfig.technologies.includes(p)
              );

              return (
                <div
                  key={tech.id}
                  className={`tech-card ${isUnlocked ? 'tech-card--unlocked' : 'tech-card--locked'} ${isEnabled ? 'tech-card--enabled' : ''}`}
                >
                  <div className="tech-card-header">
                    <span className="tech-name">{tech.name}</span>
                    {isUnlocked ? (
                      <button
                        className={`toggle-btn ${isEnabled ? 'toggle-btn--on' : 'toggle-btn--off'}`}
                        onClick={() => onToggle(tech.id)}
                        disabled={!isEnabled && !prereqsEnabled && tech.prerequisites.length > 0}
                        title={
                          !isEnabled && !prereqsEnabled && tech.prerequisites.length > 0
                            ? `Requires ${tech.prerequisites.join(', ')} to be enabled`
                            : undefined
                        }
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    ) : (
                      <span className="lock-label">Locked</span>
                    )}
                  </div>

                  <p className="tech-description">{tech.shortDescription}</p>

                  {!isUnlocked && (
                    <div className="tech-unlock-row">
                      <div className="tech-cost">
                        {tech.prerequisites.length > 0 && (
                          <span
                            className={`prereq ${prereqsMet ? 'met' : 'unmet'}`}
                            title="Prerequisites"
                          >
                            Needs: {tech.prerequisites.join(', ')}
                          </span>
                        )}
                        <span className={`rp-cost ${state.research >= tech.researchCost ? 'met' : 'unmet'}`}>
                          {tech.researchCost} RP
                        </span>
                      </div>
                      {canUnlock && (
                        <button
                          className="btn btn--unlock btn--sm"
                          onClick={() => onUnlock(tech.id)}
                        >
                          Research
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
