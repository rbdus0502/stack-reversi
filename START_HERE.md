# 코드 탭에서 시작하는 법

## 준비
1. GitHub에서 **공개(public)** 저장소 `stack-reversi`를 만든다. (GitHub Pages 무료 배포 조건)
2. 이 묶음의 `CLAUDE.md`, `START_HERE.md`, `docs/RULES.md`를 저장소 루트에 같은 경로로 올린다.
3. 코드 탭에서 그 저장소를 선택해 새 세션을 열고, 아래 첫 프롬프트를 붙여 넣는다.

## 첫 프롬프트 (그대로 복사)

```
CLAUDE.md와 docs/RULES.md를 먼저 읽어줘.
그다음 1단계만 진행해줘:
1) Vite + React + TypeScript + Vitest 프로젝트 세팅 (vite base는 '/stack-reversi/')
2) src/engine/ 구현 (config, types, notation, rules)
3) tests/rules.test.ts에 RULES.md 9절 T1~T10을 전부 테스트로 작성하고 통과시키기
4) CLAUDE.md "배포" 절대로 GitHub Pages 자동 배포 워크플로 만들기
UI는 아직 만들지 마. 화면에는 "준비 중" 문구만 있으면 돼.
끝나면 테스트 결과, 내가 GitHub에서 직접 해야 할 설정, 남은 애매한 규칙을 알려줘.
```

## 1단계 직후 직접 할 일 (한 번만)
1. GitHub 저장소 → Settings → Pages → Source를 **GitHub Actions**로 변경.
2. Actions 탭에서 배포가 초록색으로 끝났는지 확인.
3. `https://<내 GitHub 아이디>.github.io/stack-reversi/` 접속 → "준비 중" 화면이 보이면 성공.

이후로는 코드 탭에서 작업이 main에 반영될 때마다 같은 주소가 자동으로 갱신된다.

## 단계별 진행 (한 단계씩 요청)

| 단계 | 할 일 | 완료 기준 |
| --- | --- | --- |
| 1. 엔진 + 배포 파이프라인 | 프로젝트 세팅, 규칙 엔진, 테스트, GitHub Pages 자동 배포 | T1~T10 통과, github.io 주소 접속 가능 |
| 2. AI + 밸런스 | 미니맥스(깊이 조절) AI, `scripts/selfplay.ts` | 깊이 3 AI끼리 500판에서 흑·백 승률 차이 10%p 이내. 아니면 토큰 수/최대 층 조정 후 RULES.md 갱신 |
| 3. 플레이 가능한 UI | 판, 층 배지, 미리보기, 토큰 표시, 한 화면 2인 대전, AI 대전(쉬움/보통/어려움) | github.io 주소에서 처음부터 끝까지 한 판 플레이 가능(휴대폰 포함) |
| 4. 첫인상 | 3단계 튜토리얼, 방패 애니메이션, 효과음, 모바일 대응 | 처음 보는 친구가 링크만 받고 튜토리얼로 규칙 이해 |
| 5. 공개 준비 | 정식 게임 이름, 파비콘, 공유 미리보기(OG) 이미지, README, itch.io 업로드용 빌드 | 링크를 메신저에 붙였을 때 제목·이미지가 제대로 보임 |
| 6. (선택) 확장 | 링크 공유 친구 대전, 리플레이, 일일 퍼즐, 도메인 연결 | 사용자 반응을 본 뒤 결정 |

## 단계별 프롬프트 예시

- 2단계: `2단계 진행해줘. AI는 src/ai/에 미니맥스+알파베타로, 평가 함수는 칸 수·모서리·층수·남은 토큰을 가중합으로. selfplay 결과를 표로 보여줘.`
- 3단계: `3단계 진행해줘. CLAUDE.md의 UI 필수 사항을 전부 지켜줘. 디자인은 깔끔하고 미니멀하게. 휴대폰 세로 화면도 확인해줘.`
- 5단계: `5단계 진행해줘. 게임 이름은 ○○로. 파비콘, OG 이미지, README를 만들고, itch.io에 올릴 수 있게 base 경로를 './'로 바꾼 별도 빌드 명령(npm run build:itch)과 zip 생성도 추가해줘.`
- 밸런스 조정: `토큰을 3, 5, 8개로 바꿔가며 selfplay 각 300판 돌리고 결과 비교해줘.`

## 배포가 이상할 때
- 화면이 하얗게 나옴 → `vite.config.ts`의 `base`가 `/stack-reversi/`인지 확인.
- 주소가 404 → Settings → Pages의 Source가 GitHub Actions인지, Actions 탭에서 배포가 성공했는지 확인.
- 고쳤는데 반영이 안 됨 → 1~2분 기다린 뒤 새로고침(캐시 때문에 강력 새로고침 필요할 수 있음).
