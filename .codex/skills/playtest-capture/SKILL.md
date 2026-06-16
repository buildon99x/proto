---
name: playtest-capture
description: 프로젝트 앱을 헤드리스 크롬으로 실제 구동하며 화면을 캡처하고 콘솔/페이지 에러를 수집하는 재사용 브라우저 플레이테스트. "스크린샷 찍어줘", "브라우저로 테스트", "실제로 돌려봐", "동작 확인/플레이테스트", 빌드만으로 부족해 런타임 검증이 필요할 때 사용. 어떤 projects/<slug>에도 일관되게 적용된다.
---

# playtest-capture — 브라우저 플레이테스트 + 스크린샷

`tsc`/`vite build`는 *타입·번들*만 본다. 실제 런타임 버그(이벤트 유실, WebGL 실패, 화면 전환 깨짐)는 **브라우저로 돌려봐야** 잡힌다. 이 스킬은 그 과정을 `scripts/playtest/run.mjs` 하니스로 자산화해, 모든 프로젝트에서 동일하게 재사용한다.

## 핵심 명령

```
pnpm playtest --project <slug>
# = node scripts/playtest/run.mjs --project <slug>
```

하니스가 자동으로: ① `pnpm --filter <slug> build` ② `dist/`를 내장 정적 서버로 서빙(SPA 폴백) ③ 헤드리스 크롬 구동 ④ 시나리오 실행하며 스크린샷 ⑤ page/console 에러 수집 ⑥ `playtest-report.json` 기록 + PASS/FAIL 종료코드.

산출물 기본 위치: `projects/<slug>/assets/screenshots/shots/`.

### 옵션
- `--scenario <path>` 시나리오 모듈(기본 `projects/<slug>/tests/e2e/scenario.mjs`, 없으면 기본 시나리오: 로드+타임랩스).
- `--no-build` 기존 `dist/` 재사용. `--port <n>` 서버 포트. `--strict` 콘솔 error도 실패 처리.
- `--base-url <url>` 크롬 다운로드 호스트(기본 `chrome-for-testing` 공개 버킷).

## 절차

### 1. 시나리오 작성(프로젝트별 1회)
`projects/<slug>/tests/e2e/scenario.mjs`에 화면 플로우를 정의한다. 예시는 `projects/dragon-danmaku/tests/e2e/scenario.mjs`.

```js
export const meta = { viewport: { width: 520, height: 820, deviceScaleFactor: 2 } };
export async function run({ page, sleep, shot, clickText, log }) {
  await shot("01-title");
  await clickText("게임 시작");          // 텍스트로 버튼/카드 클릭
  await sleep(400); await shot("02-next");
  await page.keyboard.press("KeyX");    // 키 입력
  // page = puppeteer Page. 자유롭게 page.* 사용 가능
}
```
헬퍼: `page`(puppeteer Page), `sleep(ms)`, `shot(name)`(→ `<name>.png`), `clickText(text,{timeout})`, `log(...)`, `baseUrl`.

### 2. 실행 + 검증
```
pnpm playtest --project <slug>
```
- **page errors 0, PASS**가 합격선. FAIL이면 리포트의 `pageErrors`를 보고 코드 수정 후 재실행.
- 캡처본을 읽어(Read 도구) 화면이 의도대로 그려졌는지 *눈으로* 확인한다 — 에러 0이라도 렌더가 깨질 수 있다.

### 3. 발견 → 수정 → 재현
런타임 버그를 찾으면 고치고, 같은 시나리오로 재실행해 회귀를 막는다. 의미 있는 캡처는 `assets/screenshots/`에 커밋해 PR 증빙으로 쓴다.

## 원칙 / 함정
- **브라우저 도구를 프로젝트/루트 `package.json`에 넣지 말 것.** puppeteer/playwright의 postinstall이 크롬을 받아 `pnpm install --frozen-lockfile`(Vercel) 단계를 깨뜨린다. 하니스는 `.playtest/`(gitignore)에 격리 설치하고 크롬은 `~/.cache/puppeteer`에 캐시한다 — 커밋 산출물·lockfile에 영향 없음.
- **네트워크 정책**: 크롬은 허용 호스트 `storage.googleapis.com`(chrome-for-testing)에서 받는다. `cdn.playwright.dev`·apt는 보통 막혀 있다. 다른 미러만 열려 있으면 `--base-url`로 지정.
- **헤드리스 렌더**: WebGL은 `--use-gl=swiftshader`로 소프트웨어 렌더(하니스 기본 플래그). 캔버스/Phaser 게임도 정상 캡처된다.
- **클릭은 텍스트 기반**(`clickText`)이라 DOM 구조 변경에 덜 취약하다. 텍스트가 안 잡히면 `page.click(selector)`로.

## 관련 파일
- 하니스: `scripts/playtest/run.mjs` (빌드·서버·크롬·시나리오·리포트)
- 예시 시나리오: `projects/dragon-danmaku/tests/e2e/scenario.mjs`
- 워크플로: `.codex/workflows/test-project.md`
- 출력 리포트: `projects/<slug>/assets/screenshots/shots/playtest-report.json`
