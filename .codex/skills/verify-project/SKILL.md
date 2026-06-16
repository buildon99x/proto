---
name: verify-project
description: 프로젝트 전체 테스트 과정(lint → build → 브라우저 플레이테스트+스크린샷)을 단일 진입점으로 한 번에 실행하고 단계별 PASS/FAIL 통합 리포트를 낸다. "전체 테스트 한 번에", "검증해줘", "다 돌려봐", 개별 명령(lint/build/playtest)을 따로 치지 않고 한 방에 확인하고 싶을 때 사용. 어떤 projects/<slug>에도 일관 적용.
---

# verify-project — 전체 테스트를 한 번에

프로젝트 검증은 보통 `lint` → `build` → 브라우저 `playtest` 세 단계를 거친다. 이 스킬은 그 단계들을 **단일 진입점**으로 묶어 한 번에 돌리고, **단계별 PASS/FAIL 통합 리포트**를 낸다. 개별 명령을 외워 순서대로 칠 필요가 없다.

## 핵심 명령

```
pnpm verify --project <slug>
# = node scripts/verify/run.mjs --project <slug>
```

## 단계 (순차 · 게이팅)

| # | 단계 | 내용 | 실패 시 |
|---|------|------|---------|
| 1 | **lint** | `pnpm --filter <slug> lint` (`tsc --noEmit`, 빠른 타입 선검사) | build/playtest **skip** |
| 2 | **build** | `pnpm --filter <slug> build` (`tsc + vite build`) | playtest **skip** |
| 3 | **playtest** | 헤드리스 크롬 구동 + 스크린샷 + page/console 에러 수집 | — |

**게이팅**: 앞 단계가 실패하면 이후 단계는 실행하지 않고 `skipped`로 표시한다(빌드가 깨졌는데 플레이테스트를 돌릴 수는 없으므로). 3단계 playtest는 2단계가 만든 `dist/`를 **재사용**한다 — 빌드를 두 번 하지 않는다.

## 옵션
- `--strict` playtest에서 콘솔 error도 실패로 처리(기본은 page error/uncaught만 실패).
- `--port <n>` playtest 정적 서버 포트. `--scenario <path>` 시나리오 모듈.
- `--base-url <url>` 크롬 다운로드 호스트(기본 `chrome-for-testing` 공개 버킷).

## 통합 리포트

콘솔 요약:
```
──── VERIFY: dragon-danmaku ────
✅ lint       tsc                    1.2s
✅ build      tsc + vite             4.3s
✅ playtest   11 shots · 0 err       38s
overall: ✅ PASS → 스크린샷 11, report: projects/dragon-danmaku/assets/screenshots/shots/verify-report.json
```
- 어느 단계든 실패하면 **비0 종료코드**(CI/스크립트에서 그대로 게이트로 사용).
- 기계가 읽을 통합 결과는 `verify-report.json`(스크린샷 dir, gitignore — 매 실행 갱신).
- **합격선**: overall PASS = 세 단계 모두 pass. playtest는 page errors 0 이 합격(에러 0이라도 캡처본을 Read 도구로 *눈으로* 확인해 렌더 깨짐을 잡는다).

## playtest-capture 와의 관계

`verify-project`는 `playtest-capture` 스킬의 브라우저 하니스(`scripts/playtest/playtest.mjs`의 `runPlaytest`)를 **그대로 재사용**하며, 그 앞에 lint·build 게이트를 둔 **상위 오케스트레이터**다.
- 전 과정을 한 번에 검증 → **`pnpm verify`** (이 스킬).
- 플레이테스트만 반복(시나리오 디버깅·재현) → **`pnpm playtest`** (`playtest-capture` 스킬).
- 시나리오 작성법·헬퍼(`shot`/`clickText` 등)·네트워크/헤드리스 함정은 `playtest-capture` 문서를 참조.

## 관련 파일
- 오케스트레이터: `scripts/verify/run.mjs`
- 플레이테스트 코어(공유): `scripts/playtest/playtest.mjs` (CLI 래퍼 `run.mjs`도 이를 사용)
- 워크플로: `.codex/workflows/test-project.md`
- 통합 리포트: `projects/<slug>/assets/screenshots/shots/verify-report.json`
