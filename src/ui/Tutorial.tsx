import { useState } from 'react';
import { DEFAULT_CONFIG } from '../engine/config';
import type { Piece, Player } from '../engine/types';
import { PieceView } from './Cell';
import UnitIcon from './UnitIcon';

// Mini-board notation: 'B토' token, 'B병' soldier at full HP, 'W방1' guard HP 1, null = empty.
const UNIT_BY_CHAR: Record<string, string> = { 병: 'soldier', 방: 'guard', 창: 'lancer', 포: 'tower' };

function parse(code: string): Piece {
  const owner = code[0] as Player;
  if (code[1] === '토') return { owner, unit: null, hp: 0 };
  const unit = UNIT_BY_CHAR[code[1]];
  return { owner, unit, hp: code.length > 2 ? Number(code.slice(2)) : DEFAULT_CONFIG.UNITS[unit].maxHp };
}

interface Mark {
  dmg?: number;
  anchor?: boolean;
  flip?: boolean;
  broken?: boolean;
}

interface Step {
  title: string;
  body: string[];
  before: (string | null)[];
  after: (string | null)[];
  target: number;
  from?: number;
  marks?: Record<number, Mark>;
  units?: boolean;
}

const STEPS: Step[] = [
  {
    title: '1. 토큰만 있으면 일반 리버시',
    body: [
      '아이콘 없는 납작한 돌이 토큰이에요. 토큰은 끼우면 바로 뒤집혀요.',
      '둘 수 있는 칸은 판 위에 점으로 표시돼요.',
    ],
    before: ['B토', 'W토', null],
    after: ['B토', 'B토', 'B토'],
    target: 2,
    marks: { 1: { flip: true } },
  },
  {
    title: '2. 기물은 HP가 있어요',
    body: [
      '아이콘이 있는 말이 기물이에요. 끼워져도 바로 뒤집히지 않고 대미지를 받아요.',
      'HP는 점(●)으로 보여요. HP가 0이 되면 깨져서 내 색 토큰이 돼요.',
      '아래 바에서 놓을 유닛을 고르세요. 병사는 무제한, 나머지는 수량이 정해져 있어요.',
    ],
    before: ['B병', 'W방', null],
    after: ['B병', 'W방1', 'B병'],
    target: 2,
    marks: { 1: { dmg: 2 } },
    units: true,
  },
  {
    title: '3. 받침 — 반대쪽 끝도 같이 때려요',
    body: [
      '대미지 = 내가 둔 기물의 공격력 + 반대쪽 끝 내 기물(받침)의 공격력.',
      '창병(공격 2)끼리 끼우면 2+2=4로 방패병도 한 번에 깨져요.',
      '토큰은 공격력 0이라 받침이 돼도 대미지를 더하지 못해요. 변에 둔 창병은 좋은 받침이에요.',
    ],
    before: ['B창', 'W방', null],
    after: ['B창', 'B토', 'B창'],
    target: 2,
    marks: { 0: { anchor: true }, 1: { dmg: 4, broken: true } },
  },
  {
    title: '4. 이동권과 포탑',
    body: [
      '이동권 3개로 내 기물을 옆 칸으로 1칸 옮겨 공격할 수 있어요(턴을 써요). 옮긴 기물은 공격력 +1.',
      '내 기물을 누르면 갈 수 있는 칸이 화살표로 보여요. 토큰은 움직일 수 없어요.',
      '포탑은 내가 행동할 때마다 상하좌우의 적에게 1씩 대미지를 줘요(놓은 그 턴은 제외).',
      '둘 다 둘 곳이 없으면 끝. 말이 많은 쪽이 이기고, 같으면 HP 합으로 가려요.',
    ],
    before: ['B창', null, 'W방', 'B병'],
    after: [null, 'B창', 'B토', 'B병'],
    target: 1,
    from: 0,
    marks: { 2: { dmg: 4, broken: true }, 3: { anchor: true } },
  },
];

function MiniRow({ cells, step, isBefore }: { cells: (string | null)[]; step: Step; isBefore: boolean }) {
  return (
    <div className="mini-row" style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
      {cells.map((code, i) => {
        const m = isBefore ? step.marks?.[i] : undefined;
        const cls = [
          'cell mini',
          !isBefore && i === step.target ? 'last' : '',
          m?.flip ? 'pv-flipped' : '',
          m?.broken ? 'pv-tokenized' : m?.dmg ? 'pv-hurt' : '',
          m?.anchor ? 'pv-anchor' : '',
          isBefore && step.from === i ? 'moving-from' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={i} className={cls}>
            {code && <PieceView piece={parse(code)} cfg={DEFAULT_CONFIG} />}
            {isBefore && !code && i === step.target && step.from === undefined && <span className="dot side-B" />}
            {isBefore && !code && i === step.target && step.from !== undefined && (
              <svg className="arrow" viewBox="0 0 24 24" aria-hidden>
                <path d="M4 12h13M12 6l6 6-6 6" />
              </svg>
            )}
            {m?.anchor && <span className="anchor-tag">받침</span>}
            {m?.dmg !== undefined && <span className="dmg-tag">−{m.dmg}</span>}
            {m?.broken && <span className="break-mark" />}
            {m?.flip && <span className="flip-mark side-B" />}
          </div>
        );
      })}
    </div>
  );
}

export default function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="tut-title" onClick={onClose}>
      <div className="modal tut" onClick={(e) => e.stopPropagation()}>
        <div className="tut-progress">
          {STEPS.map((_, j) => (
            <span key={j} className={j <= i ? 'on' : ''} />
          ))}
        </div>
        <h2 id="tut-title">{step.title}</h2>
        <div className="mini-demo">
          <MiniRow cells={step.before} step={step} isBefore />
          <span className="mini-arrow" aria-hidden>
            →
          </span>
          <MiniRow cells={step.after} step={step} isBefore={false} />
        </div>
        {step.units && (
          <ul className="unit-list">
            {Object.entries(DEFAULT_CONFIG.UNITS).map(([id, d]) => (
              <li key={id}>
                <span className="pick-chip side-B">
                  <UnitIcon unit={id} name={d.name} className="unit-icon" />
                </span>
                <b>{d.name}</b>
                <span className="muted">
                  HP {d.maxHp} · 공격 {d.atk}
                  {d.aura ? ` · 포탑 ${d.aura}` : ''} · {d.supply === null ? '무제한' : `${d.supply}개`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <ul className="tut-body">
          {step.body.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            건너뛰기
          </button>
          <div className="spacer" />
          {i > 0 && (
            <button type="button" className="btn" onClick={() => setI(i - 1)}>
              이전
            </button>
          )}
          <button type="button" className="btn primary" onClick={() => (isLast ? onClose() : setI(i + 1))}>
            {isLast ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
