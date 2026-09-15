# Render 배포 — 무엇이 되고 무엇이 걸리는가

결론부터. **Render 로 된다.** Free 인스턴스로도 이 게임은 돈다. 걸리는 것은 성능이
아니라 **15분 잠듦**이다. 그것 하나만 감수하면 나머지는 여유가 크다.

> 이 문서의 Render 관련 수치는 **검색 결과 요약**에서 가져왔다. 이 세션의 이그레스
> 프록시가 `render.com` 을 막아 공식 문서를 직접 열지 못했다. 배포 직전에 아래 출처를
> 한 번 확인하는 편이 좋다.

## 1. 앞서 쓴 것 중 틀린 것

`io-server.md` §4 에 두 가지를 잘못 적었다. 둘 다 여기서 정정한다.

**① "저장소가 서버를 둘 수 없다 — `runtime` 스키마를 열어야 한다."**
아니다. 코드를 다시 읽어 확인했다.

| 확인한 것 | 결과 |
| --- | --- |
| `pnpm-workspace.yaml` | 워크스페이스는 `launcher`, `packages/*`, `projects/*/app` |
| `scripts/build-all-projects.ts` | `runtime === "static-artifact"` 인 것만 빌드한다 |
| `scripts/sync-launcher-registry.ts` | `projects/*/project.json` 만 읽는다 |
| `vercel.json` | `pnpm build:vercel` → 레지스트리 → 프로젝트 → 런처 |

`projects/land-grab/server/` 는 **워크스페이스 밖이고, Vercel 빌드 경로에 없다.**
클라이언트는 그대로 `static-artifact` 로 남는다. 레지스트리 스키마는 손댈 일이 없다.

**② "Vercel 은 WebSocket 을 못 든다."**
2026-06-22 에 Vercel Functions 의 네이티브 WebSocket 지원이 퍼블릭 베타로 나왔다.
전송 자체는 이제 된다. 그래도 이 게임은 못 올린다 — 이유가 바뀌었을 뿐이다. §5 참조.

## 2. Render Free 인스턴스가 주는 것

| 항목 | 값 |
| --- | --- |
| 메모리 | 512 MB |
| CPU | 0.1 |
| 잠듦 | 인바운드 트래픽 없이 15분 → 잠듦, 다시 깨는 데 약 1분 |
| 인스턴스 시간 | 워크스페이스당 월 750시간 (잠든 동안은 안 깎임) |
| 아웃바운드 | 월 100 GB |
| 빌드 | 월 500분 |
| TLS·커스텀 도메인 | 포함 |

**WebSocket 과 잠듦**: 2026년 2월 변경으로, 이미 열린 연결에서 오는 **WebSocket
메시지도 인바운드 트래픽으로 센다.** 그 전에는 HTTP 요청만 셌기 때문에 사람이
붙어서 게임을 하는 중에도 서버가 잠들 수 있었다. 이 게임은 클라이언트가 방향 입력과
Pong 을 계속 올려 보내므로, **한 명이라도 접속해 있으면 잠들지 않는다.**

상시 가동이 필요하면 Starter($7/월, 512 MB / 0.5 CPU)로 올리면 잠듦이 사라진다.

## 3. 이 게임이 실제로 얼마나 쓰는가

추정이 아니라 이 저장소에서 잰 값이다.

| 잰 것 | 값 | 방법 |
| --- | --- | --- |
| 기동 직후 RSS | **76 MB** | `node dist/main.mjs` 띄우고 `ps` |
| 세계 1개(600², 봇 40기) 추가분 | **약 1 MB** | 격자 2 × `Uint8Array` + 방문 표시 |
| 사람 56명 접속 시 | **약 107 MB** | 세션 64개 + 유닛 96기 |
| 60초 시뮬레이션 + 64명 방송 | **327 ms** (실시간의 **183배**) | `server/src/check.ts` 부하 절 |
| 1인당 대역폭 | **1.6 KB/s** | 같은 검사, 16명 10초 |

읽는 법.

- **메모리**: 512 MB 중 110 MB 쯤 쓴다. 4배 이상 남는다. 걸림돌이 아니다.
- **CPU**: 이 장비 한 코어 기준 실시간의 183배다. Free 의 0.1 CPU 는 한 코어의 10%
  이므로 **실시간의 18배쯤 남는다**(추정 — Render 코어 성능을 직접 재지 못했다).
  초당 6칸짜리 게임에 18배는 충분한 여유다.
- **대역폭**: 1인당 1.6 KB/s 면 동시 접속 50명이 하루 종일 붙어 있어도
  `50 × 1.6KB × 86400 ≈ 6.9 GB/일`. 월 100 GB 한도에는 약 15일치다.
  실제로는 그렇게 붐비지 않는다.

시뮬레이션이 병목이 아닌 이유는 이미 알고 있다 — `600 × 600` 으로 키울 때 전면
스캔을 전부 걷어냈다. 경계 상자와 증분 집계가 그때 들어갔고, 그 덕을 서버가 그대로 본다.

## 4. 반드시 지켜야 하는 제약: 인스턴스는 하나

이게 이 배포의 **유일한 함정**이다.

세계는 전부 이 프로세스의 메모리 안에 있다. 인스턴스를 둘로 늘리면 로드 밸런서가
접속을 나눠 주고, 그 순간 **같은 세계에 있다고 믿는 사람들이 서로 다른 세계에 앉는다.**
버그처럼 보이지도 않는다 — 각자에게는 그냥 "상대가 아무도 없는 한산한 서버"다.

Free 와 Starter 는 수평 확장 자체가 없으니 기본값이 곧 1이다. 플랜을 올리더라도
오토스케일을 켜지 않는다. `render.yaml` 주석에도 같은 내용을 적어 두었다.

따라오는 성질이 하나 더 있다. **재배포하면 세계가 초기화된다.** 접속자는 전부 끊기고
영토는 사라진다. io 게임에서는 판이 짧아 큰 문제가 아니지만, 알고 배포해야 한다.

## 5. 그러면 Vercel 은 왜 안 되는가

WebSocket 을 들 수 있게 됐는데도 안 되는 이유는 **"연결"이 아니라 "프로세스"** 다.

1. **연결이 함수 인스턴스에 핀된다.** Fluid compute 로 한 인스턴스가 여러 연결을 받을
   수는 있지만, **나중에 붙는 연결이 같은 인스턴스로 간다는 보장이 없다.** §4 에서 말한
   "세계가 쪼개지는" 문제가 구조적으로 들어 있다.
2. **함수 실행 시간 제한을 물려받는다.** WebSocket 도 SSE 도 함수 안에서 돌기 때문에
   긴 세션은 타임아웃에 걸린다.
3. **틱을 돌 주체가 없다.** Vercel 이 권하는 공유 상태 해법은 Redis 인데, 36만 칸을
   매 틱 왕복시킬 수는 없다.

Render 의 Web Service 는 이 세 가지를 모두 피한다. **프로세스가 계속 살아 있고, 그
프로세스가 곧 세계다.** 그래서 외부 저장소도 필요 없다.

## 6. 배포 설정

`render.yaml` 이 저장소 루트에 있다. Render 대시보드 → Blueprints → 저장소 연결.

```yaml
type: web
runtime: node
plan: free
region: singapore
healthCheckPath: /healthz
buildCommand: cd projects/land-grab/server && npm ci --include=dev && npm run build
startCommand: cd projects/land-grab/server && node dist/main.mjs
```

하나씩 왜 그런지.

- **`rootDir` 를 쓰지 않고 `cd` 로 들어간다.** 서버는 `../../app/src/game` 을 가져다
  쓴다. `rootDir` 을 서버 폴더로 지정했을 때 그 바깥이 체크아웃돼 있는지 확인하지
  못했으므로(문서를 직접 못 읽었다), 저장소 전체가 확실히 있는 쪽을 택했다.
- **npm 을 쓴다.** `server/` 는 pnpm 워크스페이스 밖이라 자체 `package-lock.json` 을
  들고 독립적으로 설치한다. 루트 pnpm 빌드와 서로 간섭하지 않는다.
- **`--include=dev`**: 빌드에 esbuild 가 필요한데, `NODE_ENV=production` 이면
  `npm ci` 가 devDependencies 를 건너뛴다. 명시해 두면 어느 쪽이든 동작한다.
- **`healthCheckPath: /healthz`**: 무중단 배포의 판단 기준이다. Render 는 5초 안에
  2xx/3xx 가 오면 성공으로 본다. 이 경로는 세계 상태를 건드리지 않고 바로 `ok` 를 준다.
- **`buildFilter`**: 시뮬레이션이 `app/src/game` 에 있으므로 게임 규칙이 바뀌면 서버도
  다시 배포돼야 한다. 그래서 `server/**` 만이 아니라 `app/src/game/**` 과
  `app/src/net/**` 도 감시 대상에 넣었다.
  (`buildFilter` 경로가 저장소 루트 기준이라고 보고 적었다. 만약 `rootDir` 기준이라면
  이 항목이 안 맞아 **자동 배포가 안 걸릴 뿐**, 수동 배포로 해결된다.)
- **`region: singapore`**: 한국에서 가장 가깝다. 초당 6칸 게임이라 왕복 시간이
  체감에 직접 들어온다.
- **포트**: Render 가 `PORT` 를 주입한다. 서버는 그걸 읽고 `0.0.0.0` 에 바인딩한다.
  루프백에만 붙으면 헬스 체크가 실패한다.

## 7. 배포 전 확인 순서

```bash
cd projects/land-grab/server
npm ci --include=dev
npm test     # 타입 검사 + 규칙 검사 56개 (소켓 없이)
npm run build
npm run smoke  # 빌드된 서버를 실제로 띄우고 WebSocket 3개로 붙는다 (14개)
```

`npm run smoke` 가 Render 에서 도는 것과 같은 경로를 밟는다 —
`npm run build` 로 만든 `dist/main.mjs` 를 `node` 로 띄우고, 헬스 체크를 치고,
진짜 WebSocket 으로 접속해 움직이고, 끊었을 때 자리가 비는지까지 본다.

## 8. 남은 일

서버는 돌지만 **브라우저 클라이언트가 아직 서버에 붙지 않는다.** 지금 월드 모드는
브라우저 안에서 혼자 시뮬레이션을 돌린다. 붙이려면 다음이 필요하다.

1. `app/src/net/` 에 소켓 래퍼 — 재접속과 핑 처리. 상태 컨테이너(`client-state.ts`)와
   규약(`protocol.ts`)은 이미 있고 서버와 같은 파일을 쓴다.
2. 렌더러가 `Board` 대신 `NetWorld` 를 읽을 수 있게 하는 얇은 어댑터.
3. 타이틀 화면에 "온라인" 선택지와 이름 입력. 서버 주소는 빌드 환경변수로.
4. 서버가 잠들어 있을 때의 대기 화면 — Free 인스턴스는 깨는 데 1분쯤 걸린다.
   `/status` 를 먼저 쳐서 깨우고, 그동안 안내를 띄우는 편이 낫다.

## 9. 출처

- [Deploy for Free – Render Docs](https://render.com/docs/free)
- [Free web services now remain active while receiving WebSocket messages – Render Changelog](https://render.com/changelog/free-web-services-now-remain-active-while-receiving-websocket-messages)
- [Blueprint YAML Reference – Render Docs](https://render.com/docs/blueprint-spec)
- [Health Checks – Render Docs](https://render.com/docs/health-checks)
- [Monorepo Support – Render Docs](https://render.com/docs/monorepo-support)
- [Render Pricing 2026: Free Tier, RAM Limits & Alternatives](https://www.srvrlss.io/provider/render/)
- [Render Free Tier 2026: 750 Hours, Redis, Cron Jobs](https://unanswered.io/guide/render-free-tier-details)
- 서버 구조의 근거는 [io-server.md](io-server.md), 규칙은 [splix-analysis.md](splix-analysis.md)
