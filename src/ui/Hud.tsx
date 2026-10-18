import type { GameState, Player, Score } from '../engine/types';

interface HudProps {
  state: GameState;
  score: Score;
  names: Record<Player, string>;
  thinking: Player | null;
  over: boolean;
}

function PlayerCard({ p, state, score, name, thinking, over }: {
  p: Player;
  state: GameState;
  score: Score;
  name: string;
  thinking: boolean;
  over: boolean;
}) {
  const active = !over && state.turn === p;
  const total = state.config.STACK_TOKENS;
  const left = state.tokens[p];
  return (
    <div className={`pcard${active ? ' active' : ''}`} aria-current={active}>
      <div className="pcard-head">
        <span className={`chip disc-${p}`} aria-hidden />
        <span className="pname">{name}</span>
        {thinking && <span className="thinking">생각 중…</span>}
      </div>
      <div className="pstats">
        <div className="stat">
          <span className="stat-v">{score.cells[p]}</span>
          <span className="stat-k">칸</span>
        </div>
        <div className="stat">
          <span className="stat-v">{score.heights[p]}</span>
          <span className="stat-k">층 합</span>
        </div>
      </div>
      <div className="tokens" aria-label={`겹치기 토큰 ${left}개 남음`}>
        <span className="tokens-k">토큰</span>
        <span className="pips">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`pip${i < left ? ' on' : ''}`} />
          ))}
        </span>
        <span className="tokens-v">{left}</span>
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
          over={over}
        />
      ))}
    </div>
  );
}
