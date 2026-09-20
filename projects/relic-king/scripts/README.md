# 빌드타임 생성 파이프라인

두 갈래다 — **유물 데이터**(`artifacts.generated.ts`)와 **세계지도 해안선**
(`worldmap-raster.ts`). 둘 다 개발 시점에 돌려 산출물을 커밋하고, 런타임은 결과만
읽는다. 앱은 어떤 외부 리소스도 실행 중에 부르지 않는다.

## 세계지도 해안선 — `build-worldmap.mjs`

```bash
node scripts/build-worldmap.mjs          # 다시 굽는다
node scripts/build-worldmap.mjs --check  # 커밋된 산출물이 최신인지만 검사
```

Natural Earth 1:110m 육지 지오메트리(npm `world-atlas`, 데이터는 퍼블릭 도메인)를
정거방형 도법으로 320×160 이진 비트맵에 구워 `app/src/render/worldmap-raster.ts`에
정적 상수로 쓴다. `world-atlas`·`topojson-client`는 `app/package.json`의
**devDependencies**에만 있고 런타임 번들에 들어가지 않는다. 설계·구현 서술은
[`notes/world-map.md` §6](../notes/world-map.md), 판단 근거는
[`notes/decisions.md` G8·G69](../notes/decisions.md).

`app/src/game/sites.ts`의 12거점 좌표를 읽어 **모든 거점 도트가 육지인지 확인**하고,
이웃 8칸까지 전부 바다인 거점이 있으면 빌드를 깬다 — 좌표 오류 회귀 방지다.
`balance.ts`의 `MAP_*`·`COASTLINE_LAND_THRESHOLD`가 스크립트 가정과 어긋나도 깬다.

## 유물 데이터

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
