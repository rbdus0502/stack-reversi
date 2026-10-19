import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG, type UnitId } from './engine/config';
import { moveToString } from './engine/notation';
import { previewMove } from './engine/preview';
import { applyMove, initialState, isGameOver, legalMoves, opponent, score } from './engine/rules';
import type { GameState, Move, Player, Pos } from './engine/types';
import type { AiRequest, AiResponse } from './ai/worker';
import type { Difficulty } from './ai/search';
import Board from './ui/Board';
import type { CellAnim } from './ui/Cell';
import Hud from './ui/Hud';
import PiecePicker from './ui/PiecePicker';
import Tutorial from './ui/Tutorial';
import { play as playSound, type SoundKind } from './ui/sound';

type Mode = 'pvp' | 'ai';

interface Settings {
  mode: Mode;
  human: Player;
  difficulty: Difficulty;
}

interface Saved {
  settings: Settings;
  moves: Move[];
  cursor: number;
}

interface Prefs {
  sound: boolean;
  hints: boolean;
  tutorialSeen: boolean;
}

// v3 keys: saves from the old stack rules are ignored.
const SAVE_KEY = 'battle-reversi:v3';
const PREFS_KEY = 'battle-reversi:prefs';
const DEFAULT_SETTINGS: Settings = { mode: 'ai', human: 'B', difficulty: 'normal' };
const DIFF_LABEL: Record<Difficulty, string> = { easy: '쉬움', normal: '보통', hard: '어려움' };
const COLOR: Record<Player, string> = { B: '흑', W: '백' };
const AI_MIN_DELAY = 500;
const BASE_UNIT: UnitId = DEFAULT_CONFIG.START_UNIT;

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is a convenience only.
  }
}

/** Replays moves from the start; stops at the first illegal move so a corrupt save cannot crash the app. */
function replay(moves: Move[]): { states: GameState[]; moves: Move[] } {
  const states = [initialState(DEFAULT_CONFIG)];
  const ok: Move[] = [];
  for (const m of moves) {
    try {
      states.push(applyMove(states[states.length - 1], m));
      ok.push(m);
    } catch {
      break;
    }
  }
  return { states, moves: ok };
}

export default function App() {
  const saved = useMemo(() => load<Saved>(SAVE_KEY), []);
  const [prefs, setPrefs] = useState<Prefs>(() => ({ sound: true, hints: true, tutorialSeen: false, ...load<Prefs>(PREFS_KEY) }));
  const [settings, setSettings] = useState<Settings>(saved?.settings ?? DEFAULT_SETTINGS);
  const [moves, setMoves] = useState<Move[]>(() => (saved ? replay(saved.moves).moves : []));
  const [cursor, setCursor] = useState<number>(saved?.cursor ?? 0);
  const [animAt, setAnimAt] = useState<number | null>(null);
  const [unit, setUnit] = useState<UnitId>(BASE_UNIT);
  const [showTutorial, setShowTutorial] = useState(!prefs.tutorialSeen);
  const [showNewGame, setShowNewGame] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [thinking, setThinking] = useState(false);

  const states = useMemo(() => replay(moves).states, [moves]);
  const safeCursor = Math.min(cursor, states.length - 1);
  const state = states[safeCursor];
  const atEnd = safeCursor === states.length - 1;
  const legal = useMemo(() => legalMoves(state), [state]);
  const over = isGameOver(state);
  const sc = useMemo(() => score(state), [state]);

  const aiPlayer: Player | null = settings.mode === 'ai' ? opponent(settings.human) : null;
  const isAiTurn = !!aiPlayer && state.turn === aiPlayer && !over;
  const mustPass = !over && !isAiTurn && legal.length === 0;
  const pickerPlayer: Player = settings.mode === 'ai' ? settings.human : state.turn;

  useEffect(() => save(SAVE_KEY, { settings, moves, cursor: safeCursor } satisfies Saved), [settings, moves, safeCursor]);
  useEffect(() => save(PREFS_KEY, prefs), [prefs]);

  // Fall back to the unlimited unit when the chosen one runs out.
  useEffect(() => {
    const left = state.supply[pickerPlayer][unit];
    if (left !== null && left <= 0) setUnit(BASE_UNIT);
  }, [state, pickerPlayer, unit]);

  const sfx = useCallback((k: SoundKind) => prefs.sound && playSound(k), [prefs.sound]);

  // Last move highlight + animations (animations only right after it was played).
  const { anims, lastCells } = useMemo(() => {
    const anims = new Map<string, CellAnim>();
    const lastCells: Pos[] = [];
    if (safeCursor === 0) return { anims, lastCells };
    const prev = states[safeCursor - 1];
    const move = moves[safeCursor - 1];
    if (move.kind === 'pass') return { anims, lastCells };
    lastCells.push({ row: move.row, col: move.col });
    if (move.kind === 'move') lastCells.push({ row: move.fromRow, col: move.fromCol });
    if (animAt !== safeCursor) return { anims, lastCells };
    const pv = previewMove(prev, move);
    const key = safeCursor;
    anims.set(
      `${move.row},${move.col}`,
      move.kind === 'move'
        ? { key, kind: 'move', damage: 0, before: null, dx: move.fromCol - move.col, dy: move.fromRow - move.row }
        : { key, kind: 'place', damage: 0, before: null },
    );
    for (const ch of pv.changes) {
      anims.set(`${ch.row},${ch.col}`, { key, kind: ch.kind, damage: ch.lineDamage + ch.turretDamage, before: ch.before });
    }
    return { anims, lastCells };
  }, [states, moves, safeCursor, animAt]);

  const doMove = useCallback(
    (move: Move) => {
      const base = states[safeCursor];
      const next = applyMove(base, move);
      setMoves((ms) => [...ms.slice(0, safeCursor), move]);
      setCursor(safeCursor + 1);
      setAnimAt(safeCursor + 1);
      if (move.kind === 'pass') sfx('pass');
      else {
        const pv = previewMove(base, move);
        sfx(move.kind === 'move' ? 'move' : 'place');
        if (pv.changes.some((c) => c.kind === 'tokenized')) sfx('break');
        else if (pv.changes.some((c) => c.kind === 'hurt')) sfx('hit');
        if (pv.shots.length > 0) sfx('shot');
      }
      if (isGameOver(next)) {
        setResultDismissed(false);
        setTimeout(() => sfx('end'), 300);
      }
    },
    [states, safeCursor, sfx],
  );

  // --- AI worker ---
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);
  useEffect(() => {
    const w = new Worker(new URL('./ai/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = w;
    return () => w.terminate();
  }, []);

  const doMoveRef = useRef(doMove);
  doMoveRef.current = doMove;

  useEffect(() => {
    const w = workerRef.current;
    if (!w || !isAiTurn || !atEnd || showTutorial) return;
    const id = ++reqId.current;
    const started = performance.now();
    setThinking(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMsg = (e: MessageEvent<AiResponse>) => {
      if (e.data.id !== id) return;
      const wait = Math.max(0, AI_MIN_DELAY - (performance.now() - started));
      timer = setTimeout(() => {
        if (reqId.current !== id) return;
        setThinking(false);
        doMoveRef.current(e.data.move);
      }, wait);
    };
    w.addEventListener('message', onMsg);
    w.postMessage({ id, state, difficulty: settings.difficulty } satisfies AiRequest);
    return () => {
      // Invalidate this request (undo, new game, etc.).
      reqId.current++;
      clearTimeout(timer);
      w.removeEventListener('message', onMsg);
      setThinking(false);
    };
  }, [isAiTurn, atEnd, state, settings.difficulty, showTutorial]);

  // --- History navigation ---
  const humanTurnAt = useCallback(
    (i: number) => !aiPlayer || states[i].turn !== aiPlayer || isGameOver(states[i]),
    [aiPlayer, states],
  );

  const jump = (i: number) => {
    setCursor(i);
    setAnimAt(null);
  };

  const undo = useCallback(() => {
    let i = safeCursor - 1;
    while (i > 0 && !humanTurnAt(i)) i--;
    if (i >= 0) jump(i);
  }, [safeCursor, humanTurnAt]);

  const redo = useCallback(() => {
    let i = safeCursor + 1;
    while (i < states.length - 1 && !humanTurnAt(i)) i++;
    if (i <= states.length - 1) jump(i);
  }, [safeCursor, states.length, humanTurnAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showTutorial || showNewGame) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (!mod && /^[1-9]$/.test(e.key)) {
        // Number keys pick a unit from the bar.
        const id = Object.keys(state.config.UNITS)[Number(e.key) - 1];
        const left = id ? state.supply[pickerPlayer][id] : 0;
        if (id && (left === null || left > 0)) setUnit(id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, showTutorial, showNewGame, state, pickerPlayer]);

  const startGame = (s: Settings) => {
    setSettings(s);
    setMoves([]);
    setCursor(0);
    setAnimAt(null);
    setUnit(BASE_UNIT);
    setResultDismissed(false);
    setShowNewGame(false);
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    setPrefs((p) => ({ ...p, tutorialSeen: true }));
  };

  const names: Record<Player, string> =
    settings.mode === 'pvp'
      ? { B: '흑', W: '백' }
      : ({
          [settings.human]: `나 (${COLOR[settings.human]})`,
          [opponent(settings.human)]: `AI ${DIFF_LABEL[settings.difficulty]} (${COLOR[opponent(settings.human)]})`,
        } as Record<Player, string>);

  let status: string;
  if (over) {
    status = sc.winner === 'draw' ? '무승부' : `${names[sc.winner]} 승리`;
  } else if (isAiTurn) {
    status = atEnd ? 'AI가 생각하고 있어요' : '복기 중 — 최신 수로 가면 AI가 이어서 둡니다';
  } else if (mustPass) {
    status = `${names[state.turn]}: 둘 곳이 없어요`;
  } else {
    status = `${names[state.turn]} 차례 · ${state.config.UNITS[unit].name} 놓기, 또는 내 기물을 눌러 이동`;
  }

  const lastMove = safeCursor > 0 ? moves[safeCursor - 1] : null;
  const lastPass = lastMove?.kind === 'pass' && !over ? `${COLOR[opponent(state.turn)]}은 둘 곳이 없어 패스했어요` : null;
  const interactive = !over && !isAiTurn;

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="title">
          <span className="logo" aria-hidden />
          배틀 리버시
        </h1>
        <div className="top-actions">
          <button type="button" className="icon-btn" onClick={() => setShowTutorial(true)} aria-label="규칙 보기" title="규칙">
            ?
          </button>
          <button
            type="button"
            className={`icon-btn${prefs.sound ? '' : ' off'}`}
            onClick={() => setPrefs((p) => ({ ...p, sound: !p.sound }))}
            aria-label={prefs.sound ? '소리 끄기' : '소리 켜기'}
            aria-pressed={prefs.sound}
            title="소리"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
              {prefs.sound ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 6 6m0-6-6 6" />}
            </svg>
          </button>
          <button type="button" className="btn primary sm" onClick={() => setShowNewGame(true)}>
            새 게임
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="play">
          <Hud state={state} score={sc} names={names} thinking={thinking ? aiPlayer : null} over={over} />

          <div className={`status${over ? ' over' : ''}`} role="status" aria-live="polite">
            <span className={`chip sm side-${over ? (sc.winner === 'draw' ? 'B' : sc.winner) : state.turn}`} aria-hidden />
            {status}
          </div>

          <Board
            state={state}
            legal={legal}
            unit={unit}
            interactive={interactive}
            showHints={prefs.hints}
            anims={anims}
            lastCells={lastCells}
            onMove={doMove}
          />

          <PiecePicker state={state} player={pickerPlayer} unit={unit} disabled={over} onPick={setUnit} />

          {lastPass && <div className="toast">{lastPass}</div>}

          {mustPass && (
            <div className="pass-bar">
              <span>놓을 곳도, 옮길 곳도 없어요.</span>
              <button type="button" className="btn primary" onClick={() => doMove({ kind: 'pass' })}>
                패스
              </button>
            </div>
          )}

          <div className="controls">
            <button type="button" className="btn" onClick={undo} disabled={safeCursor === 0} title="Ctrl+Z">
              ↶ 무르기
            </button>
            <button type="button" className="btn" onClick={redo} disabled={atEnd} title="Ctrl+Y">
              다시 ↷
            </button>
            <label className="toggle">
              <input type="checkbox" checked={prefs.hints} onChange={(e) => setPrefs((p) => ({ ...p, hints: e.target.checked }))} />
              둘 곳 표시
            </label>
          </div>

          <ul className="legend" aria-label="미리보기 표시 안내">
            <li>
              <span className="lg lg-dot" /> 놓기
            </li>
            <li>
              <span className="lg lg-arrow">→</span> 이동
            </li>
            <li>
              <span className="lg lg-anchor">받침</span>
            </li>
            <li>
              <span className="lg lg-dmg">−2</span> 대미지
            </li>
            <li>
              <span className="lg lg-break" /> 깨짐
            </li>
            <li>
              <span className="lg lg-flip" /> 뒤집힘
            </li>
            <li>
              <span className="lg lg-shot" /> 포탑 발사
            </li>
          </ul>
        </section>

        <aside className="side">
          <div className="panel">
            <div className="panel-head">
              <h2>기보</h2>
              <span className="muted">{moves.length}수</span>
            </div>
            <MoveLog moves={moves} states={states} cursor={safeCursor} onJump={jump} />
            {!atEnd && (
              <button type="button" className="btn block" onClick={() => jump(states.length - 1)}>
                최신 수로 ⇥
              </button>
            )}
          </div>
          <div className="panel rules-mini">
            <h2>핵심 규칙</h2>
            <ul>
              <li>끼우면 대미지 = 둔 기물 공격 + 받침 공격</li>
              <li>HP 0 → 깨져서 상대 색 토큰. 토큰은 맞으면 무조건 뒤집힘</li>
              <li>포탑: 내 행동마다 상하좌우 적에게 1</li>
              <li>이동권 {DEFAULT_CONFIG.MOVE_TICKETS}개: 기물 1칸 이동, 공격 +{DEFAULT_CONFIG.CHARGE_BONUS}</li>
              <li>승패: 말 수 → 같으면 HP 합</li>
            </ul>
          </div>
        </aside>
      </main>

      {over && !resultDismissed && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="res-title">
          <div className="modal result">
            <h2 id="res-title">{sc.winner === 'draw' ? '무승부!' : `${names[sc.winner]} 승리!`}</h2>
            <div className="result-score">
              {(['B', 'W'] as const).map((p) => (
                <div key={p} className={`result-side${sc.winner === p ? ' win' : ''}`}>
                  <span className={`chip side-${p}`} />
                  <span className="big">{sc.pieces[p]}</span>
                  <span className="muted">말 · HP 합 {sc.hp[p]}</span>
                </div>
              ))}
            </div>
            {sc.pieces.B === sc.pieces.W && sc.winner !== 'draw' && <p className="muted center">말 수가 같아 HP 합으로 승부가 갈렸어요.</p>}
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setResultDismissed(true)}>
                복기하기
              </button>
              <div className="spacer" />
              <button type="button" className="btn primary" onClick={() => startGame(settings)}>
                한 판 더
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewGame && <NewGame initial={settings} onStart={startGame} onClose={() => setShowNewGame(false)} />}
      {showTutorial && <Tutorial onClose={closeTutorial} />}
    </div>
  );
}

function MoveLog({ moves, states, cursor, onJump }: { moves: Move[]; states: GameState[]; cursor: number; onJump: (i: number) => void }) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    // Scroll only the list itself; scrollIntoView would also move the page.
    const list = listRef.current;
    const cur = list?.querySelector<HTMLElement>('.current');
    if (!list || !cur) return;
    const top = cur.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + cur.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + cur.offsetHeight - list.clientHeight;
  }, [cursor, moves.length]);
  if (moves.length === 0) return <p className="muted empty">아직 둔 수가 없어요.</p>;
  const cfg = states[0].config;
  return (
    <ol className="movelog" ref={listRef}>
      <li>
        <button type="button" className={cursor === 0 ? 'current' : ''} onClick={() => onJump(0)}>
          <span className="mv-n">0</span> 시작
        </button>
      </li>
      {moves.map((m, i) => {
        const p = states[i]?.turn;
        if (!p) return null;
        const special = m.kind === 'move' || (m.kind === 'place' && cfg.UNITS[m.unit]?.supply !== null);
        return (
          <li key={i}>
            <button type="button" className={`${cursor === i + 1 ? 'current' : ''}${special ? ' is-special' : ''}`} onClick={() => onJump(i + 1)}>
              <span className="mv-n">{i + 1}</span>
              <span className={`chip xs side-${p}`} />
              {moveToString(m, cfg)}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function NewGame({ initial, onStart, onClose }: { initial: Settings; onStart: (s: Settings) => void; onClose: () => void }) {
  const [s, setS] = useState(initial);
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="ng-title" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="ng-title">새 게임</h2>
        <div className="field">
          <span className="field-k">상대</span>
          <div className="seg">
            <button type="button" className={s.mode === 'ai' ? 'on' : ''} onClick={() => setS({ ...s, mode: 'ai' })}>
              AI
            </button>
            <button type="button" className={s.mode === 'pvp' ? 'on' : ''} onClick={() => setS({ ...s, mode: 'pvp' })}>
              2인 (한 화면)
            </button>
          </div>
        </div>
        {s.mode === 'ai' && (
          <>
            <div className="field">
              <span className="field-k">난이도</span>
              <div className="seg">
                {(['easy', 'normal', 'hard'] as const).map((d) => (
                  <button key={d} type="button" className={s.difficulty === d ? 'on' : ''} onClick={() => setS({ ...s, difficulty: d })}>
                    {DIFF_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="field-k">내 돌</span>
              <div className="seg">
                <button type="button" className={s.human === 'B' ? 'on' : ''} onClick={() => setS({ ...s, human: 'B' })}>
                  흑 (선공)
                </button>
                <button type="button" className={s.human === 'W' ? 'on' : ''} onClick={() => setS({ ...s, human: 'W' })}>
                  백 (후공)
                </button>
              </div>
            </div>
          </>
        )}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            취소
          </button>
          <div className="spacer" />
          <button type="button" className="btn primary" onClick={() => onStart(s)}>
            시작
          </button>
        </div>
      </div>
    </div>
  );
}
