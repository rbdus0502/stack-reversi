# CLAUDE.md — 배틀 리버시 (가제)

리버시처럼 끼워서 두지만, 끼운 기물은 바로 뒤집히지 않고 **대미지**를 받는 웹 보드게임 (규칙 v0.3).
- 대미지 = 둔 기물 ATK + 반대쪽 끝(받침) ATK. HP가 0이 되면 능력 없는 **토큰**이 되어 뒤집히고, 그 뒤로는 맞을 때마다 뒤집힌다.
- 포탑은 판에 있는 동안 내가 행동할 때마다 주변을 공격한다.
- 각자 **이동권 3개**로 기물을 1칸 옮겨 공격할 수 있다(턴 소모, 돌격 보너스 +1).

- 규칙의 단일 기준은 `docs/RULES.md`. 규칙을 추측하지 말고 항상 그 문서를 읽고 따른다.
- 기획 의도와 위험 요소는 `docs/DESIGN.md`, 유사작 조사는 `docs/RESEARCH.md`.
- v0.1(스택·겹치기), v0.2 규칙은 폐기됐다. 저장소에 이전 규칙 코드가 남아 있으면 v0.3으로 교체한다.

## 언어
- 사용자와의 대화, 커밋 메시지 본문, UI 문구는 한국어.
- 코드 식별자와 주석은 영어.
- "오셀로(Othello)"는 등록상표다. UI·README·메타태그 어디에도 쓰지 않는다. "리버시"만 쓴다.

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
    config.ts    # BOARD_SIZE, UNITS, MOVE_TICKETS, CHARGE_BONUS, MOVE_DIRS, AURA_DIRS
    types.ts     # UnitId, Piece(기물/토큰), Player, Move, GameState
    rules.ts     # initialState, legalMoves, applyMove, isGameOver, score, winner
    preview.ts   # previewMove(state, move) -> 칸별 변화(줄 대미지, 받침 위치, 토큰화, 뒤집힘, 포탑 발사) 목록. UI 미리보기용
    notation.ts  # 'a1' <-> {row, col}
  ai/
    evaluate.ts  # 평가 함수
    search.ts    # 미니맥스 + 알파베타
    worker.ts    # Web Worker 진입점
  ui/
    Board.tsx, Cell.tsx, PiecePicker.tsx, Hud.tsx, Tutorial.tsx
  App.tsx
tests/
  rules.test.ts    # docs/RULES.md 9절의 T1~T19 전부
  preview.test.ts  # previewMove 결과가 applyMove 결과와 항상 일치하는지
scripts/
  selfplay.ts    # AI끼리 N판 대전. 흑/백/무 승률, 유닛별 사용량·사용 시점·배치 위치(중앙/변/모서리), 이동권 사용량, 전멸 종료 비율 출력
docs/
  RULES.md, DESIGN.md, RESEARCH.md
```

## 설계 원칙
1. `engine/`은 순수 함수만. `applyMove(state, move)`는 새 state를 반환하고 원본을 바꾸지 않는다.
2. 규칙 상수와 유닛 수치는 전부 `config.ts`에서 읽는다. 하드코딩 금지. 밸런스 조정이 잦을 예정이다.
3. 유닛 능력은 `UNITS` 데이터(maxHp, atk, supply, aura)로 표현한다. 토큰은 `unit: null, hp: 0`. 유닛 이름으로 분기하는 `if (unit === 'tower')` 같은 코드 금지. 새 유닛은 데이터 추가로 들어올 수 있어야 한다.
4. `GameState`는 JSON 직렬화가 가능해야 한다(나중에 링크 공유 대전, 리플레이에 사용). `supply`의 무제한은 `null`.
5. 수(Move)는 `{ kind: 'place', unit, row, col }`, `{ kind: 'move', fromRow, fromCol, row, col }`, `{ kind: 'pass' }`.
6. UI는 엔진이 돌려준 `legalMoves`와 `previewMove`만 쓴다. UI에서 규칙을 재구현하지 않는다.

## UI 필수 사항 (기획 리뷰에서 나온 위험 대응)
- **읽히는 화면이 규칙만큼 중요하다.** 이전 버전이 재미없던 주원인으로 본다.
- HP는 숫자 대신 점(●●○)으로. 최대 HP 1인 기물은 점 생략.
- **토큰은 기물과 한눈에 구분**: 아이콘 없는 납작한 돌. 기물이 토큰이 될 때 "깨지는" 연출.
- 유닛은 아이콘으로 구분, 소유자는 기물 색(흑/백)으로 구분. 색만으로 정보를 전달하지 않는다.
- 하단에 유닛 선택 바(PiecePicker): 유닛별 남은 수량 표시, 0이면 비활성.
- 마우스 오버(휴대폰은 첫 탭) 미리보기: 줄마다 대미지 숫자, **받침 기물 강조**, 토큰이 될 기물, 뒤집힐 토큰, 포탑 발사 칸을 서로 다르게 표시. 두 번째 탭/클릭에 확정.
- 이동: 내 기물을 탭하면 이동 가능한 칸이 화살표로 표시되고, 도착 칸에 같은 미리보기. 이동권이 0이면 기물 탭은 아무 일도 하지 않음.
- 타격 시 대미지 숫자가 튀어오르는 연출, 뒤집힐 때 회전 연출.
- 양쪽 말 수, HP 합, 남은 이동권을 상시 표시.
- 모바일 세로 화면에서도 판 전체와 유닛 선택 바가 한 화면에 보일 것.

## 작업 방식
- 엔진은 테스트를 먼저 쓴다. `docs/RULES.md` 9절의 케이스가 전부 통과하기 전에는 UI 작업을 시작하지 않는다.
- 각 단계가 끝나면 `npm run test`와 `npm run build`가 통과해야 한다.
- 규칙 해석이 애매하면 임의로 정하지 말고 사용자에게 묻는다.
- 단계가 끝날 때마다 사용자에게 한국어로 보고한다: 한 일, 테스트 결과, 사용자가 직접 할 일, 남은 결정.

## 배포 (GitHub Pages)
- 저장소 이름 `stack-reversi`, 공개 저장소. 주소: `https://<GitHub 아이디>.github.io/stack-reversi/`
  (정식 이름이 정해져 저장소 이름을 바꾸면 `vite.config.ts`의 `base`도 같이 바꾼다.)
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
- `npm run selfplay -- --games 500 --depth 3` AI 셀프플레이 밸런스 측정
