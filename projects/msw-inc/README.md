# MSW 주식회사

몬스터가 직원인 회사에 월드 매니저로 입사해 몬스터를 키우고, 던전을 이어 모험가들이 레벨 1부터 끝까지 즐겁게 올라가는 월드를 만드는 저관여 월드 매니지먼트 게임이다. 하루 몇 번, 몇 분 들어와 배지 세 종류(빨간 `!` 빈틈, 주황 🌀 과밀, 보라 ▲ 진화)를 치우고 떠난다. 월드는 서버 시간으로 계속 돈다.

- **해 보기:** 런처에서 "MSW 주식회사"를 연다. 또는 `pnpm --filter msw-inc dev`
- **범위:** 입사 튜토리얼 → 1장 헤네시스 → 2장 엘리니아 → 3장 페리온 → 4장 커닝시티 → 5장 슬리피우드 → 엔딩(주니어 발록) → 완전 클리어(던전 15곳 ★3 · 도감 36)
- **볼륨:** 표준(하루 3회) 약 5주에 엔딩. 봇 8성향 중앙값 D28~36
- **설계:** [spec.md](spec.md) (규칙 v1.2 · 화면). 뿌리는 컨셉 v1.1 [docs/concept/maple-idle/msw-inc](../../docs/concept/maple-idle/msw-inc/README.md)

## 컨셉 v1.1에서 무엇이 바뀌었나

[선택 점검](notes/choice-audit.md)에서 봇 8성향 × 체크인 시각을 흔든 5번, 40번을 최대 70일씩 굴렸다. 선택 하나가 진행을 크게 가르거나 아예 멈추게 하는 곳을 찾아 고쳤다.

| 문제 (v1.1) | v1.2 |
|---|---|
| 입구가 막히면 월드가 0명으로 멈춘다 (40번 중 13번) | 빈틈의 모험가는 떠나지 않고 **혼자 천천히 걷는다** |
| 결재 "동시 N명"이 빠르면 D12 엔딩, 모자라면 영영 못 넘는 벽 | 결재 ②를 **이번 장 즐거운 시간(누적)**으로 — 줄지 않는다 |
| "같은 던전에 신입을 두라"는 힌트가 모든 던전을 중간 레벨로 뭉갠다 | **승진 발령**: 진화한 직원은 위로, 빈자리는 신입으로. 한 번에, 결과를 먼저 보고 |
| 진화만 되돌릴 수 없고, 퇴사가 없어 월드를 되살릴 출구가 없다 | 모든 결정 **5초 되돌리기**, **본사 전근**(채용비 절반 환급) |
| 길 끝은 채용으로 안 닿는데 추천이 비었다 | **키워서 잇기** 추천 (진화 N번이면 닿는 계열) |
| 꽉 찬 던전에 놓을 수 없다 → 둘 곳 없는 신입 | 놓으면 **직원 자리 +1을 같이 산다** |
| 후반 스마일 과잉 (배율 없이 약 180만) | 챕터 수입 배율 → 약 16만 |

결과: v1.2는 40번 모두 엔딩(D27.4~38.5), 멈춘 월드 0. v1.1은 22번만 엔딩에 닿았고 13번은 월드가 멈췄다.

## 명령

```
pnpm --filter msw-inc dev        개발 서버
pnpm --filter msw-inc build      타입 검사 + 빌드
pnpm --filter msw-inc test       타입 검사 + 규칙 테스트 19개
pnpm --filter msw-inc pacing     첫 10분·Day 2·챕터 달력 (-- v1.1 로 옛 규칙)
pnpm --filter msw-inc audit      선택 점검: 8성향 × 체크인 시각 흔들기 5 (v1.1·v1.2), -- --ablate 로 하나씩 빼 보기
pnpm --filter msw-inc smoke      브라우저 스모크: 튜토리얼을 실제 클릭·드래그로 (빌드 뒤)
pnpm --filter msw-inc shots      시연 장면 16개를 assets/screenshots/ 로 굽는다 (빌드 뒤)
pnpm --filter msw-inc playreview      플레이 리뷰 계측: 입사~엔딩 체크인 기록, 성향 4개 → notes/data/playreview.json
pnpm --filter msw-inc playreview:ui   플레이 리뷰 화면 실측: 첫 진입 클릭·드래그와 화면 밀도 (빌드 뒤)
node notes/play-review/build.mjs      플레이 리뷰 보고서 데이터 → notes/play-review/data.js
```

## 폴더

| 경로 | 내용 |
|---|---|
| `app/src/sim/` | 규칙(화면과 분리): `content.ts` 콘텐츠 표, `rules.ts` 수치(V11·V12), `sim.ts` 월드·행동·미리보기, `bots.ts` 봇 매니저 |
| `app/src/sim/tools/` | `pacing.ts` 페이싱 점검, `audit.ts` 선택 점검 |
| `app/src/ui/` | `app.ts` 공통(HUD·독·오렌·저장·소리), `world.ts` S1, `dungeon.ts` S2·S4, `sheets.ts` S0·S3·S5·S6·S7·도감·엔딩, `tut.ts` 첫 10분, `art.ts` 자리표시 도트, `demo.ts` 시연 장면 |
| `tests/` | `sim.test.ts` 규칙 테스트, `e2e/` CDP 하니스·스모크·장면 굽기 |
| `notes/` | 선택 점검, 화면 점검, 콘텐츠 이름, 결정 기록, `data/` 점검 원자료, `play-review/` 플레이 리뷰 보고서(HTML), `improvement-plan.md` 리뷰 후속 개선 계획 |

## 테스트 도구

HUD 오른쪽 점선 칸은 실제 게임에 없는 도구다(평소 흐리게 접힘, 주소에 `?dev`). 배속 ×1·×60·×600, ⏭8h(8시간 뒤 출근), ↺(처음부터, 두 번). 시연 장면은 `?demo=` intro · gap · hire · dungeon · evolve · promote · grow · report · approval · ch2 · late · ch5 · ending · offduty · codex · fullclear.
