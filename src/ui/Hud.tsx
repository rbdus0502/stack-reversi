import type { GameState, Player, Score } from '../engine/types';
import UnitIcon from './UnitIcon';

interface HudProps {
  state: GameState;
  score: Score;
  names: Record<Player, string>;
  thinking: Player | null;
  over: boolean;
}

function PlayerCard({ p, state, score, name, thinking, active }: {
  p: Player;
  state: GameState;
  score: Score;
  name: string;
  thinking: boolean;
  active: boolean;
}) {
  const cfg = state.config;
  const tickets = state.moveTickets[p];
  const specials = Object.entries(cfg.UNITS).filter(([, d]) => d.supply !== null);
  return (
    <div className={`pcard${active ? ' active' : ''}`} aria-current={active}>
      <div className="pcard-head">
        <span className={`chip side-${p}`} aria-hidden />
        <span className="pname">{name}</span>
        {thinking && <span className="thinking">생각 중…</span>}
      </div>
      <div className="pstats">
        <div className="stat">
          <span className="stat-v">{score.pieces[p]}</span>
          <span className="stat-k">말</span>
        </div>
        <div className="stat">
          <span className="stat-v">{score.hp[p]}</span>
          <span className="stat-k">HP 합</span>
        </div>
      </div>
      <div className="prow" aria-label={`이동권 ${tickets}개 남음`}>
        <span className="prow-k">이동</span>
        <span className="pips">
          {Array.from({ length: cfg.MOVE_TICKETS }, (_, i) => (
            <span key={i} className={`pip${i < tickets ? ' on' : ''}`} />
          ))}
        </span>
      </div>
      <div className="prow reserve" aria-label="남은 특수 유닛">
        {specials.map(([id, d]) => (
          <span key={id} className={`res${state.supply[p][id] ? '' : ' none'}`} title={d.name}>
            <UnitIcon unit={id} name={d.name} className="res-icon" />
            {state.supply[p][id]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Hud({ state, score, names, thinking, over }: HudProps) {
  return (
    <div className="hud">
      {(['B', 'W'] as const).map((p) => (
        <PlayerCard
          key={p}
          p={p}
          state={state}
          score={score}
          name={names[p]}
          thinking={thinking === p}
          active={!over && state.turn === p}
        />
      ))}
    </div>
  );
}
