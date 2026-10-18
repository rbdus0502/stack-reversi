# CLAUDE.md — 스택 리버시 (가제)

리버시에 "겹치기"를 더한 웹 보드게임. 정석이 굳어진 리버시에 새로운 전략 변수를 주는 것이 목표다.
규칙의 단일 기준은 `docs/RULES.md`. 규칙을 추측하지 말고 항상 그 문서를 읽고 따른다.

## 언어
- 사용자와의 대화, 커밋 메시지 본문, UI 문구는 한국어.
- 코드 식별자와 주석은 영어.

## 기술 스택
- Vite + React + TypeScript (strict)
- 테스트: Vitest
- 스타일: 일반 CSS 또는 CSS Modules (UI 라이브러리 없이 시작)
- AI 연산: Web Worker
- 배포: GitHub Pages (정적 사이트, 서버 없음). 아래 "배포" 절 참고.

## 폴더 구조
```
src/
  engine/        # 순수 게임 로직. React·DOM 의존 금지
    config.ts    # BOARD_SIZE, MAX_HEIGHT, STACK_TOKENS, STACK_MUST_FLIP
    types.ts     # Cell, Stack, Player, Move, GameState
    rules.ts     # legalMoves, applyMove, isGameOver, score
    notation.ts  # 'a1' <-> {row, col}
  ai/
    evaluate.ts  # 평가 함수
    search.ts    # 미니맥스 + 알파베타
    worker.ts    # Web Worker 진입점
  ui/
    Board.tsx, Cell.tsx, Hud.tsx, Tutorial.tsx
  App.tsx
tests/
  rules.test.ts  # docs/RULES.md 9절의 T1~T10 전부
scripts/
  selfplay.ts    # AI끼리 N판 대전, 흑/백/무 승률 출력 (Node에서 실행)
docs/
  RULES.md
```

## 설계 원칙
1. `engine/`은 순수 함수만. `applyMove(state, move)`는 새 state를 반환하고 원본을 바꾸지 않는다.
2. 규칙 상수는 전부 `config.ts`에서 읽는다. 하드코딩 금지. 밸런스 조정이 잦을 예정이다.
3. `GameState`는 JSON 직렬화가 가능해야 한다(나중에 링크 공유 대전, 리플레이에 사용).
4. 수(Move)는 `{ kind: 'place' | 'stack', row, col }`. 패스는 `{ kind: 'pass' }`.
5. UI는 엔진이 돌려준 `legalMoves`만 클릭 가능하게 한다. UI에서 규칙을 재구현하지 않는다.

## UI 필수 사항 (기획 리뷰에서 나온 위험 대응)
- 모든 더미에 층수 배지 표시(1층은 생략 가능).
- 마우스를 올리면 미리보기: 색이 바뀔 칸과 한 층 깎일 칸을 서로 다르게 표시.
- 방패 처리 시 "층이 한 장 떨어져 나가는" 애니메이션.
- 남은 토큰 수를 양쪽 모두 상시 표시.
- 놓기와 겹치기가 같은 칸에서 헷갈리지 않게, 겹치기 가능 칸은 별도 표시.
- 모바일 세로 화면에서도 판 전체가 보일 것.

## 작업 방식
- 엔진은 테스트를 먼저 쓴다. `docs/RULES.md` 9절의 케이스가 전부 통과하기 전에는 UI 작업을 시작하지 않는다.
- 각 단계가 끝나면 `npm run test`와 `npm run build`가 통과해야 한다.
- 규칙 해석이 애매하면 임의로 정하지 말고 사용자에게 묻는다.

## 배포 (GitHub Pages)
- 저장소 이름 `stack-reversi`, 공개 저장소. 주소: `https://<GitHub 아이디>.github.io/stack-reversi/`
- `vite.config.ts`에 `base: '/stack-reversi/'`를 설정한다(없으면 배포 후 빈 화면).
- 워크플로 `.github/workflows/deploy.yml`: main 푸시 시 `npm ci` → `npm run test` → `npm run build` → `actions/upload-pages-artifact`(dist) → `actions/deploy-pages`.
- 테스트가 실패하면 배포하지 않는다.
- 저장소 Settings → Pages → Source를 "GitHub Actions"로 바꾸는 것은 사용자가 직접 해야 한다. 워크플로를 만든 뒤 사용자에게 이 설정을 안내한다.
- 공개 저장소이므로 API 키, 비밀번호, 개인정보를 커밋하지 않는다.
- LICENSE 파일(MIT 등 오픈소스 라이선스)을 추가하지 않는다. 저작권은 작성자에게 유지한다. README 끝에 "© <연도> <작성자>. All rights reserved." 한 줄만 둔다.
- 정적 에셋 경로는 `import.meta.env.BASE_URL` 기준으로 쓴다(절대경로 `/` 금지).

## 명령어
- `npm run dev` 개발 서버
- `npm run test` 테스트
- `npm run build` 배포용 빌드
- `npm run selfplay -- --games 500` AI 셀프플레이 밸런스 측정
