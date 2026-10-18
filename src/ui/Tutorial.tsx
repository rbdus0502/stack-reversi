import { useState } from 'react';

type Mini = (string | null)[]; // e.g. ['B1', 'W2', null]

interface Step {
  title: string;
  body: string[];
  before: Mini;
  after: Mini;
  target: number;
  marks?: Record<number, 'flip' | 'shave'>;
}

const STEPS: Step[] = [
  {
    title: '1. 놓기 — 일반 리버시와 같아요',
    body: [
      '빈칸에 돌을 놓아 상대 돌을 내 돌 사이에 끼우면 색이 바뀝니다.',
      '둘 수 있는 칸은 판 위에 작은 점으로 표시돼요.',
    ],
    before: ['B1', 'W1', null],
    after: ['B1', 'B1', 'B1'],
    target: 2,
    marks: { 1: 'flip' },
  },
  {
    title: '2. 겹치기 — 내 돌 위에 한 층 더',
    body: [
      '이미 놓인 내 돌 위에 돌을 쌓을 수 있어요. 이때도 상대 돌을 끼워야 합니다.',
      '겹칠 때마다 토큰이 1개 줄어요. 토큰은 한 판에 5개, 더미는 최대 3층.',
      '겹치기 가능한 칸은 주황색 + 표시로 구분돼요.',
    ],
    before: ['B1', 'W1', 'B1'],
    after: ['B1', 'B1', 'B2'],
    target: 2,
    marks: { 1: 'flip' },
  },
  {
    title: '3. 방패 — 높은 더미는 버틴다',
    body: [
      '2층 이상인 더미는 끼워져도 색이 바뀌지 않고 한 층만 깎여요.',
      '미리보기에서 색이 바뀔 칸은 점, 깎일 칸은 −1로 표시됩니다.',
      '둘 다 둘 곳이 없으면 끝. 칸이 많은 쪽이 이기고, 같으면 층 합으로 가립니다.',
    ],
    before: ['B1', 'W2', null],
    after: ['B1', 'W1', 'B1'],
    target: 2,
    marks: { 1: 'shave' },
  },
];

function MiniRow({ cells, target, marks, showTarget }: { cells: Mini; target: number; marks?: Step['marks']; showTarget: boolean }) {
  return (
    <div className="mini-row">
      {cells.map((v, i) => {
        const h = v ? Number(v.slice(1)) : 0;
        return (
          <div key={i} className={`cell mini${!showTarget && i === target ? ' last' : ''}${marks?.[i] ? ` pv-${marks[i]}` : ''}`}>
            {v && (
              <div className="stack" style={{ '--h': h } as React.CSSProperties}>
                {Array.from({ length: h }, (_, j) => (
                  <div key={j} className={`disc disc-${v[0]}`} style={{ '--i': j } as React.CSSProperties} />
                ))}
                {h > 1 && <span className="badge">{h}</span>}
              </div>
            )}
            {!v && showTarget && i === target && <span className="dot dot-B" />}
            {marks?.[i] === 'shave' && <span className="pv-tag">−1</span>}
            {marks?.[i] === 'flip' && <span className="pv-flip-dot dot-B" />}
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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="tut-progress">
          {STEPS.map((_, j) => (
            <span key={j} className={j <= i ? 'on' : ''} />
          ))}
        </div>
        <h2 id="tut-title">{step.title}</h2>
        <div className="mini-demo">
          <MiniRow cells={step.before} target={step.target} marks={step.marks} showTarget />
          <span className="mini-arrow" aria-hidden>→</span>
          <MiniRow cells={step.after} target={step.target} showTarget={false} />
        </div>
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
