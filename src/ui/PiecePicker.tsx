import type { UnitId } from '../engine/config';
import type { GameState, Player } from '../engine/types';
import UnitIcon from './UnitIcon';

interface Props {
  state: GameState;
  player: Player;
  unit: UnitId;
  disabled: boolean;
  onPick: (u: UnitId) => void;
}

export default function PiecePicker({ state, player, unit, disabled, onPick }: Props) {
  const cfg = state.config;
  return (
    <div className="picker" role="radiogroup" aria-label="놓을 유닛">
      {Object.entries(cfg.UNITS).map(([id, def]) => {
        const left = state.supply[player][id];
        const empty = left !== null && left <= 0;
        const on = unit === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            className={`pick side-${player}${on ? ' on' : ''}`}
            disabled={disabled || empty}
            onClick={() => onPick(id)}
            title={`${def.name}: HP ${def.maxHp}, 공격 ${def.atk}${def.aura ? `, 포탑 ${def.aura}` : ''}`}
          >
            <span className={`pick-chip side-${player}`}>
              <UnitIcon unit={id} name={def.name} className="unit-icon" />
            </span>
            <span className="pick-name">{def.name}</span>
            <span className="pick-stats">
              HP{def.maxHp} · 공{def.atk}
              {def.aura > 0 ? ` · 포${def.aura}` : ''}
            </span>
            <span className="pick-left">{left === null ? '∞' : `×${left}`}</span>
          </button>
        );
      })}
    </div>
  );
}
