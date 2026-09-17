# Spec — 유물왕 (Relic King)

> 설계 근거는 [notes/mda.md](notes/mda.md), 유물 데이터 규격은 [notes/artifacts-dataset.md](notes/artifacts-dataset.md).
> 이 문서는 **v0.1 구현 상태**를 기술한다. 아래 수치는 전부
> [`app/src/game/balance.ts`](app/src/game/balance.ts)의 실제 상수와 일치하며,
> 헤드리스 시뮬(`pnpm --filter relic-king sim`)로 측정해 조정한 값이다.

## 1. 코어 루프

### 1.1 루프 도식

```
      ┌──────────────────────────────────────────────────┐
      │                                                  │
 [발굴] ─진척─> [층 돌파] ─깊이─> [상위 티어 풀]          │
   ↑ D                                  │                │
   │                                    ↓                │
 [장비·인부] <─자금── [매각]  <──  [유물 드랍(미감정)]     │
   │                    ↑               │                │
   │                    │               ↓                │
   │                 [감정] ────────> [소장] ──자산──> [순위]
   │                                    │                │
   └────────────────────────────────────┴────────────────┘
                     제보 ──> 선점 레이스 ──> 유일 유물 | 영구 상실
```

**교차점**: `매각`은 자금(성장)과 자산(점수)을 맞바꾸는 단 하나의 지점이다.
여기가 비면 게임은 단조로운 우상향이 된다.

### 1.2 시간 스케일

| 스케일 | 주기 | 내용 | 감정 |
| --- | --- | --- | --- |
| 초 | 1~5s | 클릭 삽질, 진척바, 지층 하강 | Solace, Submission |
| 분 | 40s~5m | 드랍 → 감정 → 소장/매각 → 구매 | Progression, Discovery |
| 세션 | 10~20m | 층 돌파, 발굴지 해금, 제보 대응 | FOMO, Catharsis |
| 일 | 8~24h | 오프라인 진척, 복귀 요약, 라이벌 로그 | Progression, Melancholy |
| 세계 | 20~40h | 도감 완주, 자산 1위 | Completionism, Flex |

**경보 기준**: 분 스케일 드랍 간격이 5분을 넘으면 방치형이 아니라 대기 화면이다.
초기 20분 구간은 드랍 간격 40초 이하를 유지한다.

---

## 2. 시스템

### 2.1 발굴

- 발굴력 `D` = `(1 + 인부 × 1.1) × 1.6^장비레벨` [진척/초]
- 층 `L` 돌파 비용: `C(L) = 300 × 2.45^(L-1) × 권역계수` 진척. 권역당 12층.
- 드랍 임계: `Q(L) = E(L) / (1000 × (1 + 0.12 × (L-1))) × 권역계수`
  — `E(L)`은 그 층의 기대 평가액.
- 굴착과 드랍은 **같은 진척을 공유하지 않는다** — 진척은 양쪽에 동시 적립된다.
- 클릭: 1클릭 = `D × 0.06 × 콤보` 진척. 3초 내 연타로 콤보 1.0 → 1.4.
  **초당 클릭 진척은 `D × 0.35`를 넘지 못한다** — 진행 속도 상한 ×1.35.
- **미클릭 완주 보장**: 모든 밸런스 수치는 클릭 0회 기준으로 잡는다. 클릭은 가속일 뿐이다.

#### 깊이는 돈을 벌어 주지 않는다

드랍 임계를 기대 평가액에 묶은 이유가 있다. 깊이와 발굴력이 둘 다 수입을 곱하면
초당 수입이 `깊이 × 발굴력`으로 폭주한다 — 첫 시뮬에서 20분 만에 발굴력 194만/s가
나왔다. 그래서 **깊이는 유물의 희소성만 열고, 수입은 발굴력에서만 나온다.**
깊이가 주는 수입 보너스는 12층에서 약 2.3배로 제한했다.

### 2.2 발굴지 (v0.1: 3곳)

발굴지는 지점이 아니라 **권역**이다. 거점 유적의 이름을 쓰되, 그 권역의 유물이 층마다 나온다.

| 권역 (거점) | 해금 | 층별 시대 | 성격 |
| --- | --- | --- | --- |
| 한반도 — 경주 고분군 | 시작 | 조선 → 고려 → 통일신라 → 원삼국 | 흔함 비중 높음, 안정적 |
| 이집트 — 룩소르 왕가의 계곡 | 자금 500만 | 로마 이집트 → 신왕국 → 중왕국 | 국보 비중 1.6배, 층 비용 1.4배 |
| 로마 — 폼페이 유적 | 자금 3억 | 중세 → 로마 제정 → 공화정 | 드랍 간격 0.8배, 상위 티어 비중 낮음 |

각 권역은 **독립된 깊이**를 갖는다. 발굴력은 한 번에 한 곳에만 투입된다(전환은 즉시, 비용 없음).

### 2.3 티어와 세계 원장

| 티어 | 이름 | 세계 재고 | 기준 평가액 | 층별 등장 |
| --- | --- | --- | --- | --- |
| T0 | 흔함 | 무한 | 1만 ₩ | 전 층 |
| T1 | 희귀 | 2,000 | 30만 ₩ | L2+ |
| T2 | 진귀 | 60 | 800만 ₩ | L5+ |
| T3 | 국보 | 6 | 2억 ₩ | L8+ |
| T4 | 유일 | **1** | 50억 ₩ | L10+ 또는 제보 |

- 평가액은 유물별 계수(0.6~1.8)를 곱해 개체차를 준다.
- 세계 원장은 유물 id별 잔여 수량을 들고 있다. 0이면 드랍 풀에서 제외된다.
- **플레이어와 라이벌이 같은 원장에서 뽑는다.** 이것이 경쟁의 실체다.

층별 티어 가중표(경주 기준, 나머지는 계수 조정):

| 층 | T0 | T1 | T2 | T3 | T4 |
| --- | --- | --- | --- | --- | --- |
| 1–2 | 97 | 3 | – | – | – |
| 3–4 | 88 | 12 | – | – | – |
| 5–7 | 70 | 26 | 4 | – | – |
| 8–9 | 52 | 36 | 11 | 1 | – |
| 10–12 | 38 | 40 | 18 | 3.9 | **0.1** |

### 2.4 감정

- 드랍 유물은 `미감정` 큐에 쌓인다(최대 20점, 초과 시 가장 오래된 것부터 자동 매각).
- 감정 시간 `20 / 감정소 레벨` 초, 비용 = 추정가의 2%. 추정가는 그 층의 기대 평가액이다.
- 큐는 **병렬로** 처리된다. 순차 처리로 두면 감정소가 드랍 속도의 병목이 되어
  수집 자체가 막힌다(시뮬에서 소장고가 텅 빈 채로 전량 자동 처분됐다).
- 자금이 감정비보다 적으면 그 항목은 **대기**한다. 미감정 매각으로 언제든 풀 수 있으므로
  막다른 길은 아니지만, UI에 "자금 부족"을 명시한다.
- 시작 자금 3만 ₩. 0으로 두면 첫 유물의 감정비조차 못 내 첫 1분이 죽는다(스모크로 확인).
- **미감정 즉시 매각**: 추정가의 70%. 티어를 모른 채 털어내는 도박.
- 자동 매각 설정(기본 꺼짐) — 감정이 끝난 유물이 지정 티어 이하면 즉시 판다.

### 2.5 라이벌 (v0.1: 6인)

각 라이벌: `{ 이름, 기본 발굴력, 선호 발굴지, 선호 티어, 매각 성향 }`

- 1초 틱으로 플레이어와 동일한 규칙(굴착·드랍·감정·매각)을 돌린다.
- **추격 계수**: `min(2.0, 1 + 0.15 × log10(1위 자산 / 본인 자산))`. 상한 ×2.0.
- 라이벌 활동 로그를 세계 탭에 최근 22건 공개한다 — "박준서가 청자 상감운학문 매병을 발굴했다".
- 라이벌 발굴력과 추격 계수는 **UI에 그대로 노출한다**(Fair Progression).
- **라이벌은 제보 레이스 밖에서 유일(T4)을 뽑지 못한다.** 오프라인 중에는 진귀(T2) 이하만
  가져간다. 유일 유물을 잃는 경로는 레이스 하나뿐이다(§2.7).

### 2.6 제보 (선점 레이스)

- 발생: 첫 제보 90초, 이후 평균 3분 간격. **온라인일 때만** 뜬다.
- 대상: 진귀(T2) 이상 중 **플레이어가 이미 도달한 층**의 유물. 유일에 가중치 12,
  국보 5, 진귀 1을 줘 상위 티어가 주인공이 되게 한다.
  초반에도 제보를 한 번은 겪게 하려고 T2를 대상에 포함했다 — 10층을 파기 전까지는
  유일 유물이 아예 제보 대상이 될 수 없기 때문이다.
- 유효시간 60~150초.
- 효과: 대상 층을 파는 동안 **롤마다 28% 확률로 대상 유물이 직접 걸린다**.
- 대상 권역을 파는 라이벌 1~3명이 같은 제보를 받는다(롤당 10%).
- 먼저 성공한 쪽이 가진다. 실패한 쪽은 영구히 못 가진다(v0.3 거래 전까지).
- 놓쳐도 게임은 계속 돌아간다. 제보는 **보너스이자 유일한 긴장원**이지 진행 조건이 아니다.
- 아무도 못 가진 채 만료되면 그 유물은 세상에 그대로 남는다.

### 2.7 오프라인 진척

- 효율 60%, 누적 상한 12시간.
- 복귀 시 전면 요약 모달: 경과 시간, 획득 유물 수, 자금 증가, 순위 변동, **라이벌 활동 요약**.
- **영구 상실 규칙**: 오프라인 중 라이벌은 T0~T2만 획득한다.
  **T3·T4는 오프라인에 소실되지 않는다.** 영구 상실은 플레이어가 접속해 레이스에 참여했고
  거기서 졌을 때만 일어난다. (근거: notes/mda.md §5.2)

### 2.8 자산과 순위

- 자산 = Σ(소장 유물 평가액). 자금은 자산에 **포함하지 않는다** — 팔면 순위가 떨어져야 한다.
- 순위표는 플레이어 + 라이벌 6인. 1초마다 갱신, 순위 변동 시 토스트.

### 2.9 영속화

- `localStorage` 키 `relic-king/save/v1`.
- 스키마 버전 필드 + 마이그레이션 함수 체인.
- 자동 백업 3슬롯(직전/1시간 전/24시간 전) 순환.
- JSON export / import 버튼. 세이브 소실은 이 게임에서 곧 게임 종료다.

### 2.10 승리 조건

자산 1위 + 도감 **75%**(60점 중 45점) 달성 시 `유물왕` 엔딩. 이후 무한 모드로 계속된다.

80%로 잡으면 라이벌에게 넘어간 유물 탓에 도달 불가능해지는 경우가 생긴다 —
유일 8점 중 몇 점은 구조적으로 뺏기고, 국보는 6점뿐이라 경쟁이 빡빡하다.
시뮬 기준 방치만으로 **약 1시간**에 엔딩에 닿는다.

---

## 3. UX

### 3.1 화면 구성

**데스크톱 (1개 화면, 탭 이동 최소화)**

```
┌─────────────────────────────────────────────────────────────┐
│ 자산 12.4억 ₩ │ 자금 3,200만 ₩ │ 순위 4위 ▲1 │ 발굴력 842/s │ ← 상시
├──────────────────────────────┬──────────────────────────────┤
│                              │  [발굴] [소장고] [세계] [도감] │
│    지층 단면 캔버스           │                              │
│    (도트, 세로 스크롤)         │   미감정 ▮▮▮ 3점             │
│                              │   ─────────────────────       │
│    L7 · 통일신라              │   소장 그리드 (32×32 스프라이트)│
│    ▓▓▓▓▓▓▓░░░ 68%            │                              │
│                              │                              │
├──────────────────────────────┴──────────────────────────────┤
│ 인부 ×24 [+] │ 장비 Lv.6 [+] │ 감정소 Lv.3 [+] │ 발굴지 ▾   │
└─────────────────────────────────────────────────────────────┘
```

**모바일**: 하단 4탭(발굴/소장고/세계/도감). 상시 헤더는 그대로.
지층 단면이 세로 구도라 모바일에 오히려 잘 맞는다.

### 3.1.1 소장고 화면 — 열로 나눈다

미감정과 소장고는 **좌우 두 열**이다. 세로로 쌓으면 미감정 항목이 생기고 사라질 때마다
아래 소장고 전체가 밀려서, 겨냥해 둔 버튼이 손가락 아래에서 다른 것으로 바뀐다.
미감정 목록 자체도 높이를 고정(232~300px, 넘치면 스크롤)해 제 열 안에서도 요동치지 않게 한다.

소장고는 낱개가 아니라 **유물 종류로 묶어** 티어·이름 순으로 고정하고 수량 배지를 단다.
낱개로 최신순 정렬하면 새 유물이 들어올 때마다 격자 전체가 한 칸씩 밀린다 — 같은 문제가
격자 안에서 다시 생긴다. 묶으면 수량만 올라가고 자리는 그대로다. 매각은 `1점 매각`과
`전부 매각` 두 가지로 나눈다.

모바일에서는 한 열로 쌓되, 미감정 목록의 고정 높이는 유지한다.

### 3.2 정보 위계

**항상 보인다**: 자산, 자금, 순위, 발굴력, 현재 층과 진척, 다음 드랍까지 남은 시간.
**한 번의 조작으로 보인다**: 소장고, 순위표, 도감.
**요청해야 보인다**: 규칙 화면(확률표·추격 계수 공식), 라이벌 상세, 세이브 관리.

### 3.3 연출 밀도 — 두 교차점에 몰아준다

**감정 결과 공개**

| 티어 | 연출 |
| --- | --- |
| T0 흔함 | 카드가 즉시 뒤집힘, 소리 없음 |
| T1 희귀 | 뒤집기 + 짧은 효과음 |
| T2 진귀 | 뒤집기 + 테두리 발광 + 화면 살짝 어두워짐 |
| T3 국보 | 전체 정지 + 카드 확대 + 내력 텍스트 타이핑 |
| T4 유일 | 화면 전체 연출 + "세계에 단 하나" 배지 + 원장 갱신 애니메이션 |

**복귀 요약** — 손실을 숨기지 않는다.

```
3시간 12분 동안
  유물 47점 발굴 · 자금 +8,400만 ₩ · 순위 4위 → 3위
  이무진이 '청자 상감운학문 매병'을 발굴했습니다 (남은 수량 58)
  [확인]
```

### 3.4 제보 배너

상단 전면, 붉은 계열, 카운트다운 숫자와 `[이 발굴지로 이동]` 버튼.
**게임 안에서 유일하게 플레이어를 방해하는 UI.** 이 특권을 다른 알림에 주지 않는다.

### 3.5 도감

격자 배치. 상태 3종:

- **미발견** — 검은 실루엣
- **소장** — 컬러 스프라이트 + 테두리
- **영구 소실** — 회색 + 소유자 이름 (T4만 해당)

하단 상시 문구: *평가액은 게임 내 가상 단위이며 실제 감정가가 아닙니다.*

### 3.6 접근성·편의

- 클릭 없이 완주 가능. 클릭 유도 UI를 쓰지 않는다.
- 자동 감정 토글, 자동 매각 기준(티어 이하 자동 매각) 설정.
- 숫자 한글 단위 표기(만/억/조). 소수 1자리.
- 조사는 앞말의 받침에 맞춰 고른다(`josa()`). 로그가 사람 이름과 유물 이름을 그대로
  끼워 넣기 때문에 "이(가)" 병기는 계속 눈에 걸린다 — "L. 로시이(가)".
- 색만으로 티어를 구분하지 않는다 — 테두리 두께와 배지 기호를 병행.
- 음소거 토글. 사운드는 WebAudio 즉석 합성(외부 에셋 없음).

---

## 4. 도트 그래픽

- 캔버스 논리 해상도 **240×360**(세로), CSS 정수배 확대 + `image-rendering: pixelated`.
- 고정 팔레트 40색. 지층·유물·UI가 같은 팔레트를 공유한다.
- **지층 단면**: 층마다 다른 흙 패턴과 색. 층 경계에 연대 라벨. 인부 스프라이트가 바닥에서 곡괭이질.
  진척에 따라 화면이 한 픽셀씩 아래로 스크롤된다.
- **유물 스프라이트 32×32, 절차 생성(결정론)**:
  - 입력: `shape`(항아리·검·관·가면·두루마리·동전·석판·조각·장신구·기계)
    + `palette`(청자·금·은·토기·석재·목재·유리) + `seed`
  - 생성: 실루엣 마스크 → 좌우 대칭 장식 패턴 → 광원 좌상단 4단 램프 → 외곽선
  - 같은 유물은 항상 같은 그림이 나온다. 유물 id 단위로 data URL 을 캐시한다.
  - 티어는 색만이 아니라 **테두리 두께와 배지 기호**로도 구분한다.
  - **외부 이미지를 쓰지 않는 이유**: 이 환경은 외부 네트워크가 차단되어 있고(박물관
    오픈액세스 API 403 확인), 정적 산출물은 런타임 네트워크 의존을 가질 수 없다.
- UI 텍스트는 캔버스 밖 DOM. 한글 비트맵 폰트를 직접 찍는 비용이 크므로,
  게임 캔버스만 도트로 가고 UI는 CSS + 픽셀 계열 시스템 폰트 스택을 쓴다.

---

## 5. 데이터 모델

```ts
type Tier = 0 | 1 | 2 | 3 | 4;

type Artifact = {
  id: string;              // "rosetta-stone"
  name: string;            // "로제타 석"
  era: string;             // "기원전 196년"
  origin: string;          // "이집트 라시드"
  holder: string;          // 실제 현 소장처: "대영박물관"
  note: string;            // 한 줄 내력
  disputed?: string;       // 반환 논쟁 사실 (있을 때만)
  tier: Tier;
  valueFactor: number;     // 0.6~1.8
  site: SiteId;
  minLayer: number;        // 등장 최소 층
  shape: Shape;            // 스프라이트 생성 입력
  palette: PaletteId;
  seed: number;
};

type WorldLedger = Record<string, { total: number; remaining: number; owners: OwnerId[] }>;

type SaveV1 = {
  version: 1;
  startedAt: number; lastTickAt: number;
  funds: number;
  sites: Record<SiteId, { layer: number; layerProgress: number; dropProgress: number }>;
  activeSite: SiteId;
  workers: number; gearLevel: number; labLevel: number;
  unappraised: { artifactId: string; at: number }[];
  vault: { artifactId: string; value: number }[];
  ledger: WorldLedger;
  rivals: RivalState[];
  codex: Record<string, "unseen" | "owned" | "lost">;
  settings: { autoAppraise: boolean; autoSellBelow: Tier | null; muted: boolean };
};
```

## 6. 모듈 구조

```
app/src/
  App.tsx                 얇은 셸
  game/
    engine.ts             1초 틱 + 오프라인 적분
    dig.ts                굴착·드랍 진척
    ledger.ts             세계 원장
    appraise.ts           감정·매각
    rivals.ts             라이벌 시뮬
    tips.ts               제보 생성·레이스 판정
    economy.ts            가격·업그레이드 곡선
    save.ts               직렬화·마이그레이션·백업
  render/
    strata.ts             지층 단면 캔버스
    sprite.ts             절차적 유물 스프라이트 생성기
    palette.ts            40색 팔레트
  data/
    artifacts.ts          유물 데이터셋
    sites.ts              발굴지·층 구성
  ui/                     헤더·소장고·세계·도감·모달
```

게임 로직은 순수 TypeScript, React는 셸만. (retro-bowling·wave-runner와 같은 구조)

## 7. 비목표 (v0.1)

- 거래·경매(v0.3), 프레스티지(v0.2).
- 서버, 계정, 실시간 멀티플레이, 온라인 순위표.
- 실존 유물 사진·3D. 도트 절차 생성만 쓴다.
- 손기술·반응속도 요구.

> 위 목록의 "거래·경매(v0.3)"·"프레스티지(v0.2)"는 v0.1 시점의 계획이었다.
> `notes/decisions.md` G1·G2·G11이 이 계획을 갱신했다 — 거래소 골격과 경매장은
> v0.2로 앞당겨지고(단, 실유동성은 라이벌 NPC), 프레스티지는 박물관이 아니라
> 시즌이 전담한다. 이 절은 v0.1이 실제로 구현했던 상태의 기록이라 고치지 않는다.
> 아래 §8부터가 그 갱신을 반영한 v0.2다.

---

# v0.2 — 거점·경영·시장

> `prompts/v0.2-deepening.md` §5.2~§5.5, §8 4단계의 산출물. 전제는 `notes/decisions.md`
> 의 결정 게이트 11개, `notes/economy.md`, `notes/world-map.md`, `notes/staff.md`다.
> 이 절의 수치는 그 세 문서와 1:1로 대응한다 — 겹치는 상수는 재정의하지 않고
> 그대로 인용한다. v0.1(§1~§7)의 수치는 이 절에서 바뀌지 않는다.

## 8. 발굴단과 원정

### 8.1 데이터 모델의 변화

v0.1의 `World`는 `workers`·`gear`·`lab` 각 1개와 `activeSite` 1개를 들고 단일
발굴력 `D`를 계산했다. v0.2는 이걸 **발굴단 여러 개**로 쪼갠다.

```ts
type ExpeditionTeam = {
  id: string;
  foremanId: string;          // notes/staff.md 단장
  workers: number;
  gearLevel: number;
  status: "idle" | "traveling_out" | "on_site" | "traveling_back";
  targetSite: SiteId;
  dispatchedAt: number;
  arrivesAt: number;          // status가 on_site로 바뀌는 시각
  returnsAt: number;          // status가 idle로 바뀌는 시각(귀환 완료)
  mishapRolled: boolean;
  routine: { enabled: boolean; target: SiteId } | null;
};
```

**감정소(`lab`)와 보관소(`vault`)는 거점마다 짓지 않는다** — 플레이어 소속
전체에 하나뿐인 전역 시설로 유지한다(§9). 관리 대상을 거점 수만큼 곱하면
§5.8의 조작 단계 예산을 지킬 수 없다. 반대로 **박물관과 경매장은 거점에 종속된
건물**이다(§10, §11) — 그 거점의 로컬 시세(`notes/world-map.md` §8)가 적용되는
이유이기도 하다.

```
MAX_EXPEDITION_TEAMS_INITIAL = 1
MAX_EXPEDITION_TEAMS_CAP = 4
EXPEDITION_TEAM_UNLOCK_BASE = 50_000_000
EXPEDITION_TEAM_UNLOCK_GROWTH = 4.0

n번째 발굴단(2~4번째) 해금 비용 = EXPEDITION_TEAM_UNLOCK_BASE × EXPEDITION_TEAM_UNLOCK_GROWTH^(n-2)
  → 2번째 5,000만 / 3번째 2억 / 4번째 8억
```

### 8.2 발굴력 — 단장 스탯은 가산항으로만

```
D_team = (BASE_DIG + WORKERS_team × WORKER_DIG + LEADERSHIP × FOREMAN_DIG_COEFF) × GEAR_MULT^gearLevel_team
```

`notes/staff.md` §1과 동일한 식이다. `LEADERSHIP`(단장 통솔력)은 지수항
(`GEAR_MULT^gearLevel`) **안이 아니라 그 밑의 선형 기반항**에 더해진다 — 곱연산으로
D에 결합하는 스탯은 이 게임에 하나도 없다(`notes/economy.md` §7의 제약, 첫
구현의 194만/s 폭주를 재현하지 않기 위한 조건). 같은 거점에 여러 발굴단이
`status: "on_site"`면 그 거점의 진행량은 `Σ D_team`이다.

**상한**: 팀당 `WORKERS_team`·`gearLevel_team`은 v0.1의 `workerCost`·`gearCost`
곡선(지수 성장 비용)이 그대로 자기제동한다. 팀 수 자체는
`MAX_EXPEDITION_TEAMS_CAP = 4`로 하드 상한이 있다 — 무한정 팀을 늘려 D를
선형으로 계속 늘리는 경로를 막는다.

### 8.3 원정은 회차제다 — 이동시간·실패·손실

`notes/economy.md` K5("발굴 원정비... 파견 시 선지급")가 이미 회차(파견 단위)를
전제하고 있었다. v0.2는 이를 명시적으로 확정한다: **원정은 회차제다.** 파견
버튼을 누른 순간이 1회고, 귀환 시각까지 그 발굴단은 다른 곳에 쓸 수 없다.
이동·현지 작업 소요는 `notes/world-map.md` §3의 공식(`EXPEDITION_SPEED_KMH`,
`EXPEDITION_ONSITE_MIN_HOURS`) 그대로다. 현지 작업 구간(`on_site`)에는 v0.1과
동일한 초당 굴착·드랍 엔진이 그대로 돈다 — 층 돌파·드랍 임계·티어 가중 중
바뀌는 게 없다. 이동 구간(`traveling_out`/`traveling_back`)에는 진행량이 0이다
(거리가 시간·비용만 늘린다는 economy.md §7의 판정이 여기서 성립한다).

**실패 가능성**(대항해시대·K3·Evony의 원정 리스크):

```
EXPEDITION_MISHAP_BASE = 0.02
EXPEDITION_MISHAP_PER_1000KM = 0.01
EXPEDITION_MISHAP_CHANCE_CAP = 0.25
EXPEDITION_MISHAP_TIME_LOSS_RATIO = 0.5

EXPEDITION_MISHAP_CHANCE(distance) = min(EXPEDITION_MISHAP_CHANCE_CAP,
  EXPEDITION_MISHAP_BASE + EXPEDITION_MISHAP_PER_1000KM × distance_km / 1000)
  × (1 − CRISIS_MGMT × FOREMAN_MISHAP_REDUCTION_COEFF)   // notes/staff.md §1
```

파견 시점에 1회 판정한다. **실패해도 총 소요시간은 늘지 않는다** — 대신 그
원정의 현지작업시간 중 `EXPEDITION_MISHAP_TIME_LOSS_RATIO`(50%)만큼이 장비
정비·지연으로 소모돼, 그만큼 드랍 기회가 줄어든다. **잃는 것은 오직 "얻을 수
있었던 것의 절반"이다** — 이미 확보한 소장품·자금·유물은 어떤 경우에도 줄지
않는다. 원정비(K5)는 결과와 무관하게 파견 시점에 이미 지불한 값이라 별도로
또 잃는 게 아니다. 이건 `notes/decisions.md` G3("안 하면 잃는다 설계 전면
금지")를 실패 이벤트에도 지키는 방식이다 — 실패는 상실이 아니라 이득 감소다.

### 8.4 루틴 — 자동화하는 것과 하지 않는 것

루틴은 발굴단마다 켜고 끌 수 있다. **자동화하는 것**: 귀환(`idle`) 즉시 같은
`routine.target`으로 재파견, 감정 큐 등록, 설정된 자동 매각 기준 적용. **자동화
하지 않는 것 — 새 유적으로 처음 보내는 선택.** 어떤 발굴단을 어느 거점에
**처음** 배정할지는 항상 수동이다. 세계지도를 열어 거점을 고르는 행위
(`notes/world-map.md` §7의 3단계) 자체가 이 게임의 "탐험"이라는 핵심 결정이라,
루틴이 대신 고르게 하면 그 결정이 사라진다. 루틴은 "정해진 곳을 계속 간다"만
대행하고, "어디로 갈지"는 대행하지 않는다.

### 8.5 층 개념

**유지한다. 유적별이다.** `sites: Record<SiteId, SiteProgress>`(layer·
layerProgress·dropProgress)는 v0.1과 동일한 구조로, 이제 12거점 전부에
하나씩 존재한다. 층 돌파 비용(`layerCost`)·드랍 임계(`dropThreshold`)·층별
티어 가중(`tierWeights`)은 그대로다. 여러 발굴단이 같은 거점에 배치되면
그 거점의 `SiteProgress`를 공유해 함께 밀어붙인다.

## 9. 감정소·보관소

### 9.1 업그레이드 → 변수

| 업그레이드 | 움직이는 변수 |
| --- | --- |
| 감정량 | `PENDING_CAP(level) = PENDING_CAP_BASE + PENDING_CAP_PER_LEVEL × level` |
| 감정속도 | `appraiseSeconds(lab) = 20 / lab`(기존, 변경 없음) |
| 종류 해금 | `APPRAISAL_UNLOCK_LAB_LEVEL[tier]`(아래) — 그 레벨에 닿기 전에는 그 티어를 감정할 수 없다 |

```
PENDING_CAP_BASE = 20            // 기존 PENDING_CAP과 동일한 값에서 시작
PENDING_CAP_PER_LEVEL = 4
APPRAISAL_UNLOCK_LAB_LEVEL = [1, 1, 3, 6, 10]   // T0~T4. lab ≥ 이 값이어야 그 티어를 감정 가능
```

### 9.2 해금 전 유물의 처리

드랍 자체는 **막지 않는다** — 감정 해금 여부로 층별 티어 가중을 바꾸면 플레이어의
업그레이드 순서에 따라 드랍 RNG가 달라지는 왜곡이 생긴다. 대신 감정 가능 여부를
**큐 진입 이후**에 가른다.

```
LOCKED_HOLD_CAP = 5
```

`lab < APPRAISAL_UNLOCK_LAB_LEVEL[tier]`인 항목은 일반 미감정 큐(`PENDING_CAP`)가
아니라 별도의 "봉인 보관" 목록(최대 `LOCKED_HOLD_CAP`)에 들어간다. 감정 서비싱은
봉인 항목을 건너뛰고 나머지를 정상 처리한다(봉인 항목이 큐 병목이 되지 않는다).
봉인 목록이 가득 차면 가장 오래된 항목부터 **미감정 즉시매각**(`BLIND_SELL_RATE`
그대로 적용)으로 자동 처리된다 — v0.1에 이미 있던 안전판(`PENDING_CAP` 초과 시
자동 매각)과 정확히 같은 패턴이라 새 손실 경로가 아니다. 감정소 레벨을 올리면
봉인 항목이 다음 틱에 정상 큐로 옮겨간다.

### 9.3 보관소 정원 초과

**자동 매각도, 드랍 중단도 아니다.** 둘 다 방치 중 유물을 잃게 하므로
`notes/decisions.md` G3와 정면으로 부딪힌다. 대신:

```
VAULT_CAPACITY_BASE = 100
VAULT_CAPACITY_PER_LEVEL = 40
VAULT_OVERFLOW_CONDITION_DECAY_MULT = 2.0
```

정원(`VAULT_CAPACITY_BASE + VAULT_CAPACITY_PER_LEVEL × level`)을 넘는 초과분은
계속 보유된다 — 다만 "야적" 상태로 취급돼 아래 §9.4의 상태 저하 확률이
`VAULT_OVERFLOW_CONDITION_DECAY_MULT`(2배)로 커진다. 파괴·강제매각·드랍중단은
없다. 정리하라는 압박은 있지만 처벌은 없다.

### 9.4 습도·복원·보안 → G6 상태 축 · 도난 확률

```
CONDITION_DECAY_BASE_RATE_PER_DAY = 0.05
HUMIDITY_DECAY_REDUCTION_COEFF = 0.15

RESTORATION_BASE_HOURS = 48
RESTORATION_SUCCESS_BASE = 0.10
RESTORATION_SUCCESS_COEFF = 0.05
RESTORATION_SUCCESS_CAP = 0.6

VAULT_SECURITY_BASE_GRACE_HOURS = 2
VAULT_SECURITY_GRACE_COEFF = 0.5
```

- **습도조절장치**(레벨 H): `CONDITION_DECAY_CHANCE_PER_DAY(H, overflow) =
  CONDITION_DECAY_BASE_RATE_PER_DAY / (1 + HUMIDITY_DECAY_REDUCTION_COEFF × H)
  × (overflow ? VAULT_OVERFLOW_CONDITION_DECAY_MULT : 1)`. 매일 이 확률로 상태가
  한 단계 낮아진다(`notes/decisions.md` G6의 `CONDITION_VALUE_FACTOR` 5단계
  중 한 칸 아래로).
- **복원기술**(레벨 R): `RESTORATION_ATTEMPT_HOURS(R) = RESTORATION_BASE_HOURS / R`
  마다 백그라운드로 자동 시도(플레이어 조작 없음, 방치형 원칙). 성공률
  `min(RESTORATION_SUCCESS_CAP, RESTORATION_SUCCESS_BASE + R × RESTORATION_SUCCESS_COEFF)`
  로 상태 한 단계 상승. `관급`에서는 시도하지 않는다(더 올라갈 곳이 없다).
- **보안**(레벨 S): 보관소에 있는 유물은 도난 위험이 항상 0(`notes/decisions.md`
  G9의 제약 — "보관소에 내린 유물은 도난 위험이 0이어야 한다") — 그래서
  보관소 보안은 도난 발생률이 아니라, 그 보관소에서 갓 반출돼 박물관에 전시된
  유물의 **도난 판정 유예**를 늘린다: `THEFT_INITIAL_GRACE_HOURS(S) =
  VAULT_SECURITY_BASE_GRACE_HOURS × (1 + S × VAULT_SECURITY_GRACE_COEFF)`. 유예
  안에는 도난 확률 계산 자체를 하지 않는다.

## 10. 박물관

### 10.1 관람객 수식(완전형)

```
MUSEUM_VISITOR_BASE = 300
MUSEUM_POP_REF = 1_000_000
MUSEUM_POP_EXPONENT = 0.4
MUSEUM_POP_CONTRIB_CAP = 6.0
MUSEUM_RARITY_COEFF = 0.03
RARITY_WEIGHT = [1, 3, 10, 40, 200]        // T0~T4
MUSEUM_RARITY_CONTRIB_CAP = 5.0
MUSEUM_TICKET_PRICE = 8_000                // ₩/명, 가상 단위

관람객(1일) = MUSEUM_VISITOR_BASE
  × min(MUSEUM_POP_CONTRIB_CAP, (인근도시인구 / MUSEUM_POP_REF) ^ MUSEUM_POP_EXPONENT)
  × min(MUSEUM_RARITY_CONTRIB_CAP, 1 + MUSEUM_RARITY_COEFF × Σ_slot RARITY_WEIGHT[tier_slot] × FRESHNESS_slot)
  × min(MUSEUM_CURATOR_CONTRIB_CAP, 1 + MUSEUM_CURATOR_COEFF × CURATION)              // notes/staff.md §2
  × (1 + MUSEUM_MARKETING_COEFF × min(MUSEUM_MARKETING_LEVEL_CAP, 마케팅레벨) × (1 + MARKETING_SENSE × CURATOR_MKT_COEFF))
```

네 항 전부에 상한이 있다 — 인구 항은 ×6.0, 희귀도 항은 ×5.0, 관장 항은 ×1.5,
마케팅 항은 마케팅 레벨 자체를 `MUSEUM_MARKETING_LEVEL_CAP`(10)에서 멈춰
`MUSEUM_MARKETING_COEFF`(아래)와 `CURATOR_MKT_COEFF`(`notes/staff.md` §2, 최대
×1.4)를 곱해도 최대 ×2.12로 갇힌다. "인근 도시 인구"는 그 박물관이 지어진
거점의 `CITY_POPULATION`(`notes/world-map.md` §9)이다.

```
MUSEUM_MARKETING_COEFF = 0.08
MUSEUM_MARKETING_LEVEL_CAP = 10
관람수입(시간당) = 관람객(1일) × MUSEUM_TICKET_PRICE / 24
유지비(시간당) = MUSEUM_UPKEEP_RATE × 관람수입 × (1 − min(CURATOR_UPKEEP_CAP, MAINTENANCE × CURATOR_UPKEEP_COEFF))   // notes/staff.md §2
급여(시간당) = CURATOR_SALARY_INCOME_SHARE × 관람수입 × 스탯배율   // notes/staff.md §5
순수익(시간당, 캡 적용 전) = 관람수입 − 유지비 − 급여
```

### 10.2 G5의 30% 캡 — 강제하는 상수

```
순수익(시간당, 1시간 이동평균) = min(순수익(캡 적용 전),
  MUSEUM_NET_INCOME_CAP × D × PROGRESS_VALUE × bonus(L) / dropMod(그 거점) × 3600)
MUSEUM_NET_INCOME_CAP = 0.30   // notes/economy.md에 이미 정의됨
```

`min()`으로 하드 클램프한다 — 관장 스탯·마케팅을 아무리 올려도 이 값을 넘지
못한다. 이동평균 창은 1시간(`notes/economy.md` §1.2)이라 짧은 발굴 공백기에
캡이 급격히 걸리지 않는다.

### 10.3 최대 건립 수·건립 비용·회수 기간

```
MUSEUM_MAX_COUNT = MAX_OWNED_SITES = 3      // 박물관은 거점에 짓는 건물이라 보유 거점 수를 넘을 수 없다
MUSEUM_SLOT_BY_GRADE = [3, 6, 10, 15]       // 등급 1~4의 전시 슬롯 수, 소장 총량과 무관
MUSEUM_BUILD_COST_BASE = 50_000_000
MUSEUM_BUILD_COST_GROWTH = 3.0

건립비(n번째) = MUSEUM_BUILD_COST_BASE × MUSEUM_BUILD_COST_GROWTH^(n-1)   // 5천만 / 1.5억 / 4.5억
```

**회수 기간 계산**(구현자가 그대로 재현 가능하도록 입력값을 전부 명시한다):
경주(인구 264,000), 등급1(슬롯 3, T2 3점 전시·`FRESHNESS=1`), `CURATION=50`,
마케팅레벨 2·`MARKETING_SENSE=50`, `MAINTENANCE=50`, 플레이어 발굴력 `D=50`.

```
인구항 = (264,000/1,000,000)^0.4 ≈ 0.587
희귀도항 = min(5.0, 1+0.03×(3×10)) = 1.9
관장항 = min(1.5, 1+0.005×50) = 1.25
마케팅항 = 1+0.08×2×(1+50×0.004) = 1.192
관람객/일 ≈ 300×0.587×1.9×1.25×1.192 ≈ 499명
관람수입/시간 ≈ 499×8,000/24 ≈ 166,300₩
유지비/시간 ≈ 166,300×0.20×(1−0.15) ≈ 28,270₩
급여/시간 ≈ 166,300×0.15 ≈ 24,950₩
순수익/시간(캡 적용 전) ≈ 113,080₩
캡 = 0.30×50×1000×1×3600 = 54,000,000₩/시간 → 캡에 걸리지 않음
회수기간 = 50,000,000 / 113,080 ≈ 442시간 ≈ 약 18.4일
```

건립은 함정도 자명한 선택도 아니다 — 18일 회수는 `notes/decisions.md` G11의
D7(3시간, 박물관 1관)~D30(10시간, 2관) 마일스톤 구간 안에 들어오고, 발굴력이
자라는 동안 회수 기간은 계속 짧아진다(정적 스냅샷이라 실제로는 이보다 빠르다).

### 10.4 전시 피로 — 감쇠·회복

```
MUSEUM_FATIGUE_DECAY_RATE = 0.02
MUSEUM_FRESHNESS_FLOOR = 0.3
MUSEUM_FRESHNESS_RECOVERY_RATE = 0.05

FRESHNESS(전시경과시간h) = max(MUSEUM_FRESHNESS_FLOOR, exp(−MUSEUM_FATIGUE_DECAY_RATE × 전시경과시간h))
FRESHNESS_회복(보관소휴식시간h) = min(1, 전시하강시점값 + MUSEUM_FRESHNESS_RECOVERY_RATE × 보관소휴식시간h)
```

100시간 전시하면 `FRESHNESS`는 바닥(0.3)까지 떨어진다. 슬롯에서 내려 보관소에
14시간 쉬게 하면(바닥에서 시작할 경우) 다시 1.0으로 완전히 돌아온다 — 매각을
강제하지 않는다(G5).

### 10.5 전시 슬롯 교체 조작 단계

1. 소장고에서 교체할 유물 선택.
2. "전시하기" 버튼(빈 슬롯이 있으면 자동 배정, 다 찼으면 내릴 유물을 고르는
   확인 1탭이 추가돼도 2단계 안에 끝난다).

`spec.md` §3.1.1의 레이아웃 원칙(요소가 생기고 사라져도 버튼이 손가락 아래에서
바뀌지 않는다)을 그대로 적용한다 — 전시 슬롯 그리드는 소장고 그리드와 같은 고정
칸 방식을 쓴다.

## 11. 경매장·거래소·암시장

세 채널이 겹치지 않으려면 각자 다른 걸 최적화해야 한다: **직접매각**은 즉시성,
**경매장**은 고가, **거래소**는 가격 재량, **암시장**은 오직 **매입**(판매 채널이
아니다 — 그래서 애초에 위 셋과 겹칠 수 없다).

### 11.1 채널표

| 채널 | 방향 | 대상 티어 | 지역성 | 소요시간 | 물량 상한 | 가격 | 수수료 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 직접 매각 | 판매 | T0~T4 | 로컬 | 즉시 | 무제한 | 평가액 × 1.0 × `LOCAL_PRICE_MULT` | 없음 |
| 미감정 즉시매각 | 판매 | 전체(미감정) | 무관 | 즉시 | 무제한 | 추정가 × `BLIND_SELL_RATE`(0.7) | 없음 |
| 경매장 | 판매 | T0~T3(T4 제외) | 로컬 | `AUCTION_SETTLE_HOURS`(6h) | `AUCTION_SLOT_CAP_BY_GRADE`([3,5,8,12]) | 평가액 × `AUCTION_PRICE_MULT`(1.0~1.4) × `LOCAL_PRICE_MULT` | `AUCTION_FEE_RATE`(8%) |
| 거래소(유저 간) | 판매 | T1~T3(`TRADE_MIN_TIER`~`TRADE_MAX_TIER`) | 전역 | 기대 `1/TRADE_MATCH_CHANCE_PER_HOUR` | `TRADE_LISTING_CAP`(10/인) | 기준가 × (1±`TRADE_PRICE_BAND`) | `TRADE_FEE_RATE`(5%) + `TRADE_LISTING_FEE_RATIO`(1%, 상장 시 선지급·환불 없음) |
| 암시장 | **매입** | 미감정·장물 | 로컬(매물 구성만) | 즉시 | `BLACK_MARKET_SLOT_CAPACITY`(12) | 추정가 × `BLACK_MARKET_BUY_PRICE_RATIO`(0.4), 장물은 × 0.32 | 없음 |

```
TRADE_MIN_TIER = 1
TRADE_MAX_TIER = 3
AUCTION_HOUSE_MAX_COUNT = 3   // = MAX_OWNED_SITES, 경매장도 박물관과 같은 이유로 거점 수를 넘지 않는다
AUCTION_SETTLE_HOURS = 6
AUCTION_SLOT_CAP_BY_GRADE = [3, 5, 8, 12]
TRADE_LISTING_CAP = 10
TRADE_LISTING_FEE_RATIO = 0.01
TRADE_MATCH_CHANCE_PER_HOUR = { T1: 0.9, T2: 0.5, T3: 0.15 }   // 기대 대기 T1≈1.1h, T2=2h, T3≈6.7h
BLACK_MARKET_RESTOCK_INTERVAL_HOURS = 2
STOLEN_TO_BLACKMARKET_CHANCE = 0.5
BLACK_MARKET_STOLEN_PRICE_RATIO = 0.32   // = BLACK_MARKET_BUY_PRICE_RATIO × 0.8
```

경매장·거래소·직접매각이 같은 "판매"를 놓고 경쟁하는 것처럼 보이지만, 실제로는
빠름(직접매각, 즉시·수수료 0·기대값 최저) — 비쌈(거래소, 가격 재량 최대·매칭
불확실) — 그 사이(경매장, 몇 시간 후 확정·수수료 8%·배율 최대 1.4) 3중 삼각형이라
서로 잡아먹지 않는다. 암시장은 판매 채널이 아니라 매입 채널이므로 원천적으로
겹칠 수 없다.

### 11.2 시장가 허용 범위

`TRADE_PRICE_BAND = 0.20`(economy.md에 이미 정의), 기준가는 그 유물 종의
`TRADE_REFERENCE_WINDOW_HOURS = 24` 이동평균 체결가(체결 기록이 없으면 평가액).
가격 발견을 막는다는 지적은 맞다 — 밴드를 없애면 기준가가 없는 최초 등록
시점에 초고가 유일급을 헐값에 낚는 초보자 착취가 가능해지고, 그 대가(가격
발견 제한)가 착취 위험보다 싸다고 판단해 밴드를 유지한다(`notes/economy.md`
§3.2에서 이미 판정, 이 절은 그 결정에 시간·물량 차원을 더했을 뿐 뒤집지 않는다).

### 11.3 "희귀 이상만 거래 가능"의 결과와 대응

지적대로 T1(재고 2,000)은 공급 과잉, T4(재고 1)는 시장이 형성되지 않는다.
**실제로 유동적인 시장이 생기는 건 T2뿐이다** — 이건 결함이 아니라 그대로
받아들인다.

- **T1 과잉**: 거래소 상장을 막지 않지만, `TRADE_LISTING_FEE_RATIO`(상장 시
  선지급 1%, 팔리든 안 팔리든 환불 없음)가 스팸 상장의 비용을 만든다. T1은
  구조적으로 미감정 즉시매각·경매장 대량처분 쪽으로 자연히 흘러가고, 거래소는
  이를 억지로 막지 않는다 — 억지로 막으면 "왜 T1은 거래소에 없나"라는 또 다른
  질문이 생긴다.
- **T4 시장 미형성**: 거래소·경매장 양쪽 모두 **T4를 취급하지 않는다**
  (`TRADE_MAX_TIER = 3`, 경매장도 T3까지). T4는 v0.2에서 **직접 매각 채널로만**
  움직인다(즉시·고정가). 세계에 하나뿐인 물건을 얇은 시장·밴드 제한 있는
  거래소에 올리면 가격 왜곡과 초보자 착취 위험이 가장 크게 몰리는 곳이 바로
  T4이기 때문이다. `notes/economy.md` §3.2가 이미 이 판단을 내렸다(오퍼/역오퍼
  시스템으로 v0.3에 위임) — 이 절은 v0.2의 세 채널에서 T4를 명시적으로 제외하는
  구체적 규칙(`TRADE_MAX_TIER`, 경매장 대상 범위)으로 그 판단을 구현한다.
- 그렇다면 **거래소는 무엇을 위한 장치인가** — T2(진귀)의 가격 재량 거래를 위한
  장치다. T2는 재고 60점으로 완전 과잉도 완전 희소도 아니라, "이 정도면 팔겠다"는
  재량이 실제로 의미 있는 유일한 구간이다. T1·T3·T4는 거래소가 아니라 각자 더
  맞는 채널(직접매각/경매장/직접매각)로 자연히 빠진다 — 거래소를 모든 티어의
  만능 채널로 설계하지 않은 게 오히려 세 채널이 서로 잡아먹지 않는 이유다.

### 11.4 거점별 시세와의 연결

직접매각·경매장의 가격에는 `notes/world-map.md` §8.4의 `LOCAL_PRICE_MULT(그
거점, 유물의 shape, 현재 시각)`이 곱해진다(위 §11.1 표). 거래소는 전역
기준가를 쓰므로 지역성이 없다 — 지역 차익은 "어디서 파느냐"를 능동적으로
고르는 직접매각·경매장에만 붙는 보상이고, 거래소는 지역과 무관하게 늘 열려
있는 유동성 창구로 남는다.

### 11.5 암시장 · 도난 연결

```
STOLEN_TO_BLACKMARKET_CHANCE = 0.5
```

도난(`notes/decisions.md` G9) 발생 후 `THEFT_RECOVERY_WINDOW_HOURS`(72h) 안에
회수하지 못하면 소유권이 넘어간다. 그 시점에 `STOLEN_TO_BLACKMARKET_CHANCE`
(50%) 확률로 그 유물이 암시장 매물(장물 태그)로 등장한다(나머지 50%는 그
라이벌의 소장고로 편입되고 도감은 "영구 소실"로 유지된다). **내가 도난당한
유물이 암시장에 나올 수 있다** — 뜨면 "당신의 유물" 배지가 붙고, 아직
`THEFT_RECOVERY_WINDOW_HOURS` 안이면 보험/추적 결과에 따라 무료로 회수할 수
있다(§9.4·G9). 72시간을 넘기면 우선권이 없어져 다른 매물과 똑같이 사야 한다.

**남의 장물을 사면 대가가 있다** — 값은 싸다(`BLACK_MARKET_STOLEN_PRICE_RATIO
= 0.32`, 일반 암시장 매입가 0.4보다도 낮다). 하지만 그 유물의 도감 등록은
"최초 발굴"이 아니므로 명성 축(G4, 최초 발굴 횟수)에 전혀 기여하지 않는다 —
자산 축에는 기여하지만 도감·명성 축에는 기여하지 않는다는 규칙이 자동으로
적용될 뿐, 별도 페널티를 추가하지 않는다. 수치적 손실은 없다(G3) — 대가는
순전히 "이건 훔친 물건이다"라는 서사적 낙인이다.

## 12. v0.2 `balance.ts` 상수 총람

```ts
// 발굴단·원정(§8)
export const MAX_EXPEDITION_TEAMS_INITIAL = 1;
export const MAX_EXPEDITION_TEAMS_CAP = 4;
export const EXPEDITION_TEAM_UNLOCK_BASE = 50_000_000;
export const EXPEDITION_TEAM_UNLOCK_GROWTH = 4.0;
export const EXPEDITION_MISHAP_BASE = 0.02;
export const EXPEDITION_MISHAP_PER_1000KM = 0.01;
export const EXPEDITION_MISHAP_CHANCE_CAP = 0.25;
export const EXPEDITION_MISHAP_TIME_LOSS_RATIO = 0.5;

// 감정소·보관소(§9)
export const PENDING_CAP_BASE = 20;
export const PENDING_CAP_PER_LEVEL = 4;
export const APPRAISAL_UNLOCK_LAB_LEVEL = [1, 1, 3, 6, 10] as const;
export const LOCKED_HOLD_CAP = 5;
export const VAULT_CAPACITY_BASE = 100;
export const VAULT_CAPACITY_PER_LEVEL = 40;
export const VAULT_OVERFLOW_CONDITION_DECAY_MULT = 2.0;
export const CONDITION_DECAY_BASE_RATE_PER_DAY = 0.05;
export const HUMIDITY_DECAY_REDUCTION_COEFF = 0.15;
export const RESTORATION_BASE_HOURS = 48;
export const RESTORATION_SUCCESS_BASE = 0.10;
export const RESTORATION_SUCCESS_COEFF = 0.05;
export const RESTORATION_SUCCESS_CAP = 0.6;
export const VAULT_SECURITY_BASE_GRACE_HOURS = 2;
export const VAULT_SECURITY_GRACE_COEFF = 0.5;

// 박물관(§10)
export const MUSEUM_VISITOR_BASE = 300;
export const MUSEUM_POP_REF = 1_000_000;
export const MUSEUM_POP_EXPONENT = 0.4;
export const MUSEUM_POP_CONTRIB_CAP = 6.0;
export const MUSEUM_RARITY_COEFF = 0.03;
export const RARITY_WEIGHT = [1, 3, 10, 40, 200] as const;
export const MUSEUM_RARITY_CONTRIB_CAP = 5.0;
export const MUSEUM_TICKET_PRICE = 8_000;
export const MUSEUM_MARKETING_COEFF = 0.08;
export const MUSEUM_MARKETING_LEVEL_CAP = 10;
export const MUSEUM_MAX_COUNT = 3; // = MAX_OWNED_SITES
export const MUSEUM_SLOT_BY_GRADE = [3, 6, 10, 15] as const;
export const MUSEUM_BUILD_COST_BASE = 50_000_000;
export const MUSEUM_BUILD_COST_GROWTH = 3.0;
export const MUSEUM_FATIGUE_DECAY_RATE = 0.02;
export const MUSEUM_FRESHNESS_FLOOR = 0.3;
export const MUSEUM_FRESHNESS_RECOVERY_RATE = 0.05;

// 경매장·거래소·암시장(§11)
export const TRADE_MIN_TIER = 1;
export const TRADE_MAX_TIER = 3;
export const AUCTION_HOUSE_MAX_COUNT = 3;
export const AUCTION_SETTLE_HOURS = 6;
export const AUCTION_SLOT_CAP_BY_GRADE = [3, 5, 8, 12] as const;
export const TRADE_LISTING_CAP = 10;
export const TRADE_LISTING_FEE_RATIO = 0.01;
export const TRADE_MATCH_CHANCE_PER_HOUR = { 1: 0.9, 2: 0.5, 3: 0.15 } as const;
export const BLACK_MARKET_RESTOCK_INTERVAL_HOURS = 2;
export const STOLEN_TO_BLACKMARKET_CHANCE = 0.5;
export const BLACK_MARKET_STOLEN_PRICE_RATIO = 0.32;
```
