// AI vs AI self-play for balance checks.
// Usage: npm run selfplay -- --games 500 --depth 3 --tokens 5 --height 3
import { DEFAULT_CONFIG, type RuleConfig } from '../src/engine/config';
import { applyMove, initialState, isGameOver, score } from '../src/engine/rules';
import { search } from '../src/ai/search';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const games = arg('games', 100);
const depth = arg('depth', 3);
// Small opening randomness so games differ beyond tie-breaking.
const randomPlies = arg('random-plies', 4);
const config: RuleConfig = {
  ...DEFAULT_CONFIG,
  STACK_TOKENS: arg('tokens', DEFAULT_CONFIG.STACK_TOKENS),
  MAX_HEIGHT: arg('height', DEFAULT_CONFIG.MAX_HEIGHT),
};

const result = { B: 0, W: 0, draw: 0 };
let totalPlies = 0;
let stackMoves = 0;
const t0 = Date.now();

for (let g = 0; g < games; g++) {
  let s = initialState(config);
  let ply = 0;
  while (!isGameOver(s)) {
    const { move } = search(s, { depth, randomness: ply < randomPlies ? 1 : 0 });
    if (move.kind === 'stack') stackMoves++;
    s = applyMove(s, move);
    ply++;
  }
  totalPlies += ply;
  result[score(s).winner]++;
  if ((g + 1) % Math.max(1, Math.floor(games / 10)) === 0) {
    process.stdout.write(`  ${g + 1}/${games}\r`);
  }
}

const pct = (n: number) => `${((n / games) * 100).toFixed(1)}%`;
console.log(`\n설정: 깊이 ${depth}, 토큰 ${config.STACK_TOKENS}, 최대 층 ${config.MAX_HEIGHT}, ${games}판`);
console.log('| 흑 승 | 백 승 | 무승부 | 흑-백 차이 | 평균 수 | 판당 겹치기 |');
console.log('| --- | --- | --- | --- | --- | --- |');
console.log(
  `| ${pct(result.B)} | ${pct(result.W)} | ${pct(result.draw)} | ${(((result.B - result.W) / games) * 100).toFixed(1)}%p | ${(totalPlies / games).toFixed(1)} | ${(stackMoves / games).toFixed(1)} |`,
);
console.log(`소요: ${((Date.now() - t0) / 1000).toFixed(1)}초`);
