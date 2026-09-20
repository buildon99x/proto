# 유물 데이터 파이프라인

`app/src/game/artifacts.generated.ts`(1,720종)를 만드는 스크립트들. 손으로 쓴
280종은 `app/src/game/artifacts.ts`에 있고 이쪽이 건드리지 않는다.

설계 근거는 [`notes/artifacts-dataset.md` §14](../notes/artifacts-dataset.md)와
[`notes/decisions.md` G59~G62](../notes/decisions.md)에 있다.

## 실행

```bash
# 1) 메트로폴리탄 오픈액세스 덤프를 받는다 (317MB, CC0)
curl -sSL -o /tmp/MetObjects.csv \
  https://media.githubusercontent.com/media/metmuseum/openaccess/master/MetObjects.csv

# 2) 종 후보로 증류한다 → data/met-species.json
node scripts/distill-met.mjs /tmp/MetObjects.csv

# 3) 종 후보 → TypeScript. 인자는 손글씨 포함 목표 총 종수
node scripts/build-artifacts.mjs 2000

# 4) 검증
pnpm --filter relic-king qa:artifacts
```

`MetObjects.csv`는 레포에 넣지 않는다. `data/met-species.json`(약 1MB)만 커밋해
원본 없이도 3번을 다시 돌릴 수 있게 한다.

## 파일

| 파일 | 역할 |
| --- | --- |
| `taxonomy.mjs` | 문화·국가 → 12거점, 거점별 12층 연대 밴드, 거점 밖 문화권 제외 목록 |
| `lexicon.mjs` | 메트 `Object Name` → 한국어 유물명·shape·palette (271항목). **이 표가 곧 수집 필터다** — 여기 없는 이름은 후보에서 빠진다 |
| `distill-met.mjs` | CSV 전수 주사 → (거점, 어휘, 연대) 그룹으로 묶어 종 후보 JSON |
| `build-artifacts.mjs` | 거점별 물채우기 배분 + 층 라운드로빈 선발 → Row 튜플 TS |

## 손대기 전에 알아야 할 것

- **티어는 T0~T2만 자동으로 정한다.** 메트 한 곳의 소장 점수를 현존 수량의
  하한으로 쓰는 추정이라 항상 "흔한 쪽"으로만 틀린다. 국보(T3)·유일(T4)은
  근거를 들고 사람이 판정할 일이라 파이프라인이 만들지 않는다.
- **생성 `note`는 조립문이다.** 사실은 전부 메트 카탈로그에서 오고 원문을 옮기지
  않지만(라이선스 규칙 §6), 손글씨 280종의 내력과 질이 다르다. 실존의 무게는
  손글씨 쪽이 진다.
- 어휘표를 늘리면 종 후보가 늘고, `build-artifacts.mjs`의 목표 종수를 올리면
  그만큼 더 뽑힌다. 현재 후보 풀은 4,336종이라 2,000종은 여유가 있다.
- 종수를 바꾸면 `ARTIFACT_WORLD_VALUE_CEILING`을 다시 계산해야 한다.
  `qa:artifacts`가 어긋나면 실패로 잡아 준다.

## 실사 이미지 수집 (v0.4)

`app/src/game/images.generated.ts`와 `app/public/artifacts/*`를 만드는 별도
파이프라인. 설계 근거는 [`notes/decisions.md` G72](../notes/decisions.md)와
[`notes/artifacts-dataset.md` §6·§15](../notes/artifacts-dataset.md)에 있다.

```bash
# 1) 후보 조회 → data/commons-images.candidates.json (네트워크 필요)
node scripts/fetch-images.mjs --plan

# 2) candidates.json 을 **사람이 검수한다** (엉뚱한 사진은 항목째 삭제)

# 3) 검수분만 내려받아 생성 파일을 만든다
node scripts/fetch-images.mjs --apply

# 4) 검증
pnpm --filter relic-king qa:artifacts && pnpm --filter relic-king build
```

| 파일 | 역할 | 커밋 |
| --- | --- | --- |
| `scripts/fetch-images.mjs` | 커먼즈 조회·라이선스 게이트·썸네일 내려받기 | ○ |
| `data/commons-images.json` | 종별 검색 힌트(영문 질의어·정확한 File: 제목) | ○ |
| `data/commons-images.candidates.json` | `--plan` 산출물. 사람이 검수하는 중간물 | ○ |
| `app/src/game/images.generated.ts` | 라이선스·저작자·원본 URL 포함 메타데이터 | ○ |
| `app/public/artifacts/*.jpg` | 번들에 들어가는 480px 썸네일 | ○ |

### 이 환경에서는 못 돈다

egress 프록시가 위키미디어를 CONNECT 403으로 막는다(실측). `--plan`이 돌려면
허용 목록에 아래가 필요하다:

```
commons.wikimedia.org
upload.wikimedia.org
```

### 손대기 전에 알아야 할 것

- **두 단계인 이유.** 커먼즈 검색 결과를 그대로 승격하면 "금관"으로 검색해 엉뚱한
  사진이 도감에 들어온다. 이 게임은 실존이 전제라 그게 치명적이다. `--plan`은
  후보만 떨어뜨리고 `--apply`는 검수된 파일만 읽는다 — `lexicon.mjs`가 수집
  필터인 것과 같은 구조다.
- **라이선스 게이트는 우회 불가.** 허용은 퍼블릭 도메인·CC0·CC BY뿐이고,
  `--apply`가 candidates.json을 다시 판정한다. CC BY-SA는 전파조건 때문에 받지
  않는다(§6).
- **예산.** 파일당 96KB, 합계 4.5MB. 480px 썸네일이면 종당 30~60KB라 T2 이상
  186종을 다 채워도 들어온다. `qa:artifacts`가 초과를 실패로 잡는다.
- 커먼즈가 서버에서 썸네일을 만들어 주므로 로컬 이미지 처리 의존성(sharp 등)이
  필요 없다.
