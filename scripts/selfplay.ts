// AI vs AI self-play for balance checks.
// Usage: npm run selfplay -- --games 500 --depth 3 [--tickets 3] [--charge 1] [--random-plies 4]
//        Unit stats: --unit guard.maxHp=4 (repeatable)
import { DEFAULT_CONFIG, type RuleConfig } from '../src/engine/config';
import { applyUnchecked, initialState, isGameOver, score } from '../src/engine/rules';
import type { GameState, Player } from '../src/engine/types';
import { search } from '../src/ai/search';

const argv = process.argv.slice(2);
function arg(name: string, fallback: number): number {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? Number(argv[i + 1]) : fallback;
}

const games = arg('games', 100);
const depth = arg('depth', 3);
// Random opening plies so games differ beyond tie-breaking.
const randomPlies = arg('random-plies', 4);

const units = structuredClone(DEFAULT_CONFIG.UNITS);
argv.forEach((a, i) => {
  if (a !== '--unit') return;
  const m = /^(\w+)\.(\w+)=(.+)$/.exec(argv[i + 1] ?? '');
  if (!m || !units[m[1]]) throw new Error(`Bad --unit ${argv[i + 1]}`);
  (units[m[1]] as unknown as Record<string, number | null>)[m[2]] = m[3] === 'null' ? null : Number(m[3]);
});
const config: RuleConfig = {
  ...DEFAULT_CONFIG,
  UNITS: units,
  MOVE_TICKETS: arg('tickets', DEFAULT_CONFIG.MOVE_TICKETS),
  CHARGE_BONUS: arg('charge', DEFAULT_CONFIG.CHARGE_BONUS),
};

type Zone = 'center' | 'edge' | 'corner';
function zoneOf(row: number, col: number, n: number): Zone {
  const er = row === 0 || row === n - 1;
  const ec = col === 0 || col === n - 1;
  return er && ec ? 'corner' : er || ec ? 'edge' : 'center';
}

const result = { B: 0, W: 0, draw: 0 };
const unitIds = Object.keys(config.UNITS);
const usage: Record<string, { count: number; plySum: number; zone: Record<Zone, number>; wins: number; uses: number }> = {};
for (const u of unitIds) usage[u] = { count: 0, plySum: 0, zone: { center: 0, edge: 0, corner: 0 }, wins: 0, uses: 0 };
let totalPlies = 0;
let ticketsUsed = 0;
let wipeouts = 0;
const t0 = Date.now();

for (let g = 0; g < games; g++) {
  let s: GameState = initialState(config);
  let ply = 0;
  const placedBy: Record<Player, Set<string>> = { B: new Set(), W: new Set() };
  while (!isGameOver(s)) {
    const { move } = search(s, { depth, randomness: ply < randomPlies ? 1 : 0 });
    if (move.kind === 'place') {
      const u = usage[move.unit];
      u.count++;
      u.plySum += ply;
      u.zone[zoneOf(move.row, move.col, config.BOARD_SIZE)]++;
      placedBy[s.turn].add(move.unit);
    } else if (move.kind === 'move') {
      ticketsUsed++;
    }
    s = applyUnchecked(s, move);
    ply++;
  }
  totalPlies += ply;
  const sc = score(s);
  result[sc.winner]++;
  if (sc.pieces.B === 0 || sc.pieces.W === 0) wipeouts++;
  for (const p of ['B', 'W'] as const) {
    for (const u of placedBy[p]) {
      usage[u].uses++;
      if (sc.winner === p) usage[u].wins++;
    }
  }
  if ((g + 1) % Math.max(1, Math.floor(games / 10)) === 0) process.stdout.write(`  ${g + 1}/${games}\r`);
}

const pct = (n: number, d = games) => (d === 0 ? '-' : `${((n / d) * 100).toFixed(1)}%`);
console.log(
  `\n설정: 깊이 ${depth}, 이동권 ${config.MOVE_TICKETS}, 돌격 +${config.CHARGE_BONUS}, ${games}판 (처음 ${randomPlies}수 무작위)`,
);
console.log('\n| 흑 승 | 백 승 | 무승부 | 흑-백 차이 | 평균 수 | 판당 이동권 사용 | 전멸 종료 |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
console.log(
  `| ${pct(result.B)} | ${pct(result.W)} | ${pct(result.draw)} | ${(((result.B - result.W) / games) * 100).toFixed(1)}%p | ${(totalPlies / games).toFixed(1)} | ${(ticketsUsed / games).toFixed(2)} (양쪽 합) | ${pct(wipeouts)} |`,
);
console.log('\n| 유닛 | 판당 사용 | 평균 사용 시점(수) | 중앙 | 변 | 모서리 | 쓴 쪽 승률 |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const id of unitIds) {
  const u = usage[id];
  console.log(
    `| ${config.UNITS[id].name} | ${(u.count / games).toFixed(2)} | ${u.count ? (u.plySum / u.count).toFixed(1) : '-'} | ${pct(u.zone.center, u.count)} | ${pct(u.zone.edge, u.count)} | ${pct(u.zone.corner, u.count)} | ${pct(u.wins, u.uses)} |`,
  );
}
console.log(`\n소요: ${((Date.now() - t0) / 1000).toFixed(1)}초`);
