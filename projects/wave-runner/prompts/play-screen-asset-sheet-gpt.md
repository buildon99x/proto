# GPT 프롬프트 — 플레이 화면 에셋 시트

컨셉과 규칙은 [`notes/visual-concept-silkscreen.md`](../notes/visual-concept-silkscreen.md),
화면 전체를 한 장으로 뽑는 프롬프트는
[`visual-concept-silkscreen-gpt.md`](./visual-concept-silkscreen-gpt.md) 에 있다.
이 문서는 **실제 구현에 넣을 에셋**을 굽기 위한 것이다.

## 0. 먼저 — 에셋으로 굽지 않는 것

이 게임에서 화면의 대부분은 **매 프레임 코스 데이터로부터 그려진다.** 이것들을 그림으로
구우면 틀린 물건이 된다.

| 굽지 않는다 | 왜 |
|---|---|
| 통로 폴리곤·**판정선** | 코스는 시드로 생성된다. 스테이지마다 다르고, 무엇보다 **충돌 판정과 화면이 같은 선이어야 한다.** 그림으로 구우면 보이는 선과 죽는 선이 갈린다 |
| 어긋난 판(고스트) | 판정선에서 파생된다. 원본이 절차적이면 파생물도 절차적이다 |
| 게이트 렌즈·표식 | 통로 폭과 축 상태에서 나온다 |
| 아바타와 궤적 | 기체 곡선과 입력 이력이다 |
| 레터박스·HUD 레일 | 캔버스 크기에서 나온다 |

**에셋은 "코스가 아닌 것"만 맡는다** — 판의 결, 종이, 잉크 에지, 그리고 배경 풍경.

## 1. 해상도 — 월드 단위에서 역산한다

화면이 아니라 **월드**가 기준이다. `camera.ts` 는 `zoom = min(캔버스높이/100, (캔버스폭 ×
0.82)/50.4)` 이고 `GameCanvas.tsx` 는 DPR 을 2 로 묶는다.

| 기기 | 줌 | 월드 1단위 = 기기 픽셀 |
|---|---|---|
| 390×720 (기준) | 6.35 | 12.7 |
| 430×932 | 7.00 | 14.0 |
| 큰 뷰포트 | 최대 ~10 | **~20 (설계 천장)** |

**월드 1단위 = 20 기기 픽셀**을 천장으로 잡고, 원본은 거기에 1.5~2배를 더 준다.
한 화면에 보이는 폭은 약 **61 월드 단위**, 높이는 약 113이다(섹터 하나가 460이므로
화면 7.5개 분량이다).

| 에셋 | 월드 크기 | 천장 픽셀 | **원본 규격** |
|---|---|---|---|
| 판 타일(선망·망점·밴드) | 16 × 16 | 320 | **512 × 512** (이음매 없는 타일) |
| 종이 결 | 32 × 32 | 640 | **1024 × 1024** (이음매 없는 타일) |
| 잉크 에지 결 | 32 × 4 | 640 × 80 | **1024 × 128** (가로 이음매 없음) |
| 능선·절벽 | ~40 × 30 | 800 × 600 | **1536 × 1152** |
| 도시·폐허 한 벌 | ~50 × 25 | 1000 × 500 | **2048 × 1024** |
| 마른 나무 | ~14 × 20 | 280 × 400 | **768 × 1024** |
| 달 | 지름 14 | 280 | **768 × 768** |
| 부엉이·표범·바위 | ~8 × 6 | 160 × 120 | **512 × 384** |

**배경 선화는 최종적으로 SVG 가 맞다.** 선으로만 이루어져 있어 벡터면 용량이 1/50 이고
어느 해상도에서도 또렷하며, `currentColor` 로 농도(지형 0.17 · 구조 0.25 · 상징 0.44)를
코드에서 바꿀 수 있다. 아래 프롬프트 B·C 는 **벡터로 옮길 원화**를 뽑는 용도다. 반대로
종이 결과 잉크 에지는 노이즈라서 래스터가 맞다.

---

## 프롬프트 A — 판·종이·에지 텍스처 시트 (래스터, 이음매 없음)

```
A flat lay of six seamless texture tiles for a screen-printed game, arranged as a
3x2 grid on a plain mid-grey background, each cell a perfect square separated by a
thin white gutter, no labels, no text, no drop shadows, no perspective, viewed
perfectly straight on.

Every tile is a MONOCHROME screen-print texture: black ink marks on transparent
white, flat and matte, with the slightly ragged bite of ink pulled through a mesh.
No color, no gradients, no glow, no photographic paper, no 3D.

Tile 1 — coarse diagonal line screen: parallel stripes at -38 degrees, stripe about
one third as wide as the gap, edges microscopically ragged.
Tile 2 — tight horizontal line screen: thin parallel stripes, evenly spaced.
Tile 3 — irregular stipple: round dots of mixed sizes scattered at uneven spacing,
never forming a visible grid.
Tile 4 — rhythmic horizontal bands: repeating groups of one thick, one medium and
one thin band with clear gaps.
Tile 5 — paper fiber noise: very fine random grain, uniform density, no visible
clumps or directionality.
Tile 6 — a horizontal ink-edge strip: one long black band whose top and bottom
edges are ragged and uneven, with tiny pinholes and skips in the flood, as if a
squeegee pulled unevenly.

Each tile must TILE SEAMLESSLY: the marks continue across opposite edges with no
seam, no vignette, no border, no fade at the edges, and nothing centered as a
motif. Uniform density corner to corner.
```

**손잡이**

1. **이음매가 생기면** → `seamless, edge-to-edge repeating pattern, no border, no
   vignette` 를 맨 끝에 복사한다. 그래도 안 되면 그 타일만 따로 뽑는다.
2. **가운데로 모이면** → `uniform density across the whole square, no focal point,
   no composition` 을 덧붙인다. 생성 모델은 기본적으로 가운데에 무언가를 만든다.
3. **회색조로 흐려지면** → `pure black marks on pure white, hard threshold, no
   anti-aliased grey wash` 를 넣는다. 알파로 뽑기 쉬워진다.

**후처리(필수)** — 생성물은 그대로 쓰지 않는다.

1. 타일 하나를 잘라 **4배로 반복 배치해 이음매를 눈으로 확인**한다. 어긋나면 오프셋
   필터로 중앙을 이어 붙이고 손으로 메운다. 생성 이미지는 거의 항상 어긋난다
2. 흑백을 임계값으로 끊어 **알파 채널**로 옮긴다. 색은 코드가 입힌다
   (`--ink` · `--screen-line` · `--mark`). 타일에 색을 구워 넣으면 잉크 세트를
   바꿀 때마다 다시 구워야 한다
3. 512 로 리샘플하고 **프리멀티플라이드 알파**로 저장한다

---

## 프롬프트 B — 배경 라인아트 원화 시트 (벡터로 옮길 것)

```
A reference sheet of nine line-art motifs for a screen-printed game background,
arranged as a 3x3 grid on plain white, each cell separated by a thin grey gutter,
no labels, no text, no shading, no fills, no color.

All nine are drawn ONLY in clean black outline of even weight — no filled shapes,
no hatching, no shadow, no gradient, no perspective. Flat side-on views, as if they
were stencil plates.

1. CANYON: two layered jagged ridgelines, the far one simpler, receding.
2. CLIFF: a sheer vertical rock face, its top edge broken and uneven, with three
   short horizontal strata lines and two long vertical fracture lines.
3. BOULDERS: three low wide angular rocks, six-sided, wider than tall, each with a
   single internal facet line. Never pointed like tents.
4. RUINS: four broken column stumps with chipped diagonal tops and two half-fallen
   arches between them.
5. COLLAPSED CITY: a row of blocky towers of varying height, tops snapped on the
   diagonal, one leaning off vertical, small rectangular window slots as short
   strokes.
6. DEAD TREE: a leafless tree, trunk forking into tapering bare branches, no
   foliage, no roots.
7. MOON: a plain circle with two small crater circles inside it and two faint
   concentric rings outside it. The disc is NOT filled.
8. OWL: perched frontally on a short branch — rounded body, two ear tufts, two
   unfilled circular eyes, a small triangular beak, two feet gripping the branch.
9. LEOPARD: standing in profile on a low rock — one continuous back-and-chest
   outline, a rounded head with two small ears, four short sturdy legs, a long tail
   curling up and back, four small rosette circles on the flank.

Every motif must read at thumbnail size from silhouette alone. Uniform line weight
across all nine. Pure black on pure white, nothing else.
```

**손잡이**

1. **면이 칠해져 나오면** → `outline only, zero fills, the interior of every shape
   is pure white` 를 맨 끝에 복사한다. 가장 자주 나는 실패다.
2. **동물이 사실적으로 나오면** → `stencil-style, minimal, as few strokes as
   possible, like a pictogram` 을 덧붙인다. 배경의 동물은 삽화가 아니라 기호다.
3. **표범이 고양이가 되면** → `a large cat, long body, long thick tail, small head,
   powerful shoulders` 로 비례를 지정한다.
4. **선 굵기가 제각각이면** → `single uniform stroke weight for all nine, no
   tapering` 을 넣는다. 벡터로 옮길 때 굵기를 하나로 맞춰야 농도 규칙이 산다.

**후처리(필수)**

1. 아홉을 각각 **SVG 로 트레이스**한다. 선 굵기는 월드 단위로 환산해 하나로 통일하고
   (권장 0.18 월드 단위 = 천장에서 3.6px), `fill="none" stroke="currentColor"` 로 뺀다
2. 농도는 파일에 굽지 않는다. 지형 0.17 · 구조 0.25 · 상징 0.44 는 **그리는 쪽에서**
   `globalAlpha` 로 건다. 구워 넣으면 잉크 세트를 바꿀 수 없다
3. 각 모티프의 **접지선**(바닥이 닿는 y)을 메타로 남긴다. 능선 위에 세울 때 쓴다

---

## 프롬프트 C — 상징 3종 확대 원화

달·부엉이·표범은 농도 0.44 로 가장 진하게 찍히는 셋이라 형태를 따로 다듬는다.

```
Three line-art studies on plain white, side by side, no labels, no text, no shading,
no fills, drawn in clean uniform black outline only, stencil style:

1. A moon as an unfilled circle with two small crater circles and two faint
   concentric halo rings outside it.
2. An owl perched on a bare branch, seen from the front — rounded body, two ear
   tufts, two unfilled circular eyes, small triangular beak, two feet gripping.
   The eyes are rings, never filled discs.
3. A leopard standing in profile on a low rock, facing left, tail curling up and
   back, four rosette circles on the flank.

Each drawing is a pictogram, not an illustration: as few strokes as possible, no
texture, no fur detail, no expression, no motion lines. Pure black on pure white.
```

**손잡이** — 부엉이 눈이 채워져 나오면 `the eyes are two empty rings` 를 세 번 반복해도
된다. 눈을 채우는 것은 모델의 가장 강한 기본값이고, 이 컨셉에서는 채우는 순간 배경이
통로보다 먼저 읽힌다.

---

## 프롬프트 D — UI 마크와 티어 망점 램프

```
A sheet of small print marks on plain white, no text, no labels, in clean black:

Row 1 — four registration crosshair marks: a full cross with a circle, a full cross
without a circle, a corner tick, and a small target with two concentric rings.
Row 2 — six stencil marks: two stacked bars, three stacked bars, a chevron, a
barred circle, a small square with a slot, a short ladder of three rungs. None of
them may resemble a letter or a number.
Row 3 — four halftone swatches in a row, each a square of round dots on a 45-degree
grid, the dots growing from very small and sparse in the first square to large and
nearly touching in the last. Even the last square is still visibly a field of DOTS
with gaps, never a solid fill.

Flat, matte, uniform, no shading, no perspective, no color.
```

---

## 2. 파일명

### 어디에 두는가

| 경로 | 무엇 |
|---|---|
| `app/src/assets/silkscreen/` | **런타임 에셋.** 코드가 import 하고 Vite 가 해시를 붙여 번들한다 |
| `assets/references/silkscreen/sheets/` | 생성 원본 시트와 작업 파일. 배포에 들어가지 않는다 |

`app/` 이 Vite 루트이므로 런타임 에셋은 그 안에 있어야 한다. 원본 시트는 레퍼런스라
프로젝트 `assets/` 에 남긴다 — 둘 다 프로젝트 루트 안이므로 저장소 규칙을 지킨다.

### 색은 파일명에 넣지 않는다

`plate-gorge-purple.png` 같은 이름이 생기는 순간 잉크 세트마다 파일이 두 벌이 된다.
전부 알파와 `currentColor` 로 내보내므로 **파일은 한 벌이고 색은 코드가 입힌다.**

### A 시트 — 판·종이·에지 (6 파일)

이름은 `defs.js` 의 패턴 id 를 그대로 쓴다. 시안과 구현이 같은 말을 해야 한다.

| 파일 | 타일 | 규격 | 이음매 |
|---|---|---|---|
| `plate-gorge.png` | 1 · 사선 선망 −38° | 512² | 상하좌우 |
| `plate-corridor.png` | 2 · 수평 선망 | 512² | 상하좌우 |
| `plate-scatter.png` | 3 · 불규칙 망점 | 512² | 상하좌우 |
| `plate-pulse.png` | 4 · 주기 밴드 | 512² | 상하좌우 |
| `paper-grain.png` | 5 · 종이 결 | 1024² | 상하좌우 |
| `ink-edge.png` | 6 · 잉크 에지 | 1024 × 128 | **가로만** |

원본: `sheets/sheet-a-textures.png` (생성물 그대로, 손대기 전)

### B 시트 — 배경 모티프 (9 이름, 그중 5 파일)

**아홉 중 넷은 파일이 아니라 생성기로 두는 편이 낫다.** 능선·도시·폐허·나무는 직선과
반복으로 이루어져 있어 코드가 씨앗만 바꿔 무한히 다르게 만들 수 있고
(`tools/visual-concept/scenery.js` 가 이미 그렇게 한다), 파일로 두면 같은 실루엣이
스테이지마다 반복된다. 반대로 절벽·바위·달·부엉이·표범은 불규칙하거나 형태가 고유해서
손으로 그린 것이 낫다.

이름은 예약해 두되, **파일로 만드는 것은 다섯이다.**

| 이름 | 모티프 | 판정 | viewBox (월드 단위) |
|---|---|---|---|
| `scn-cliff.svg` | 절벽 | **파일** | `0 0 24 30` |
| `scn-boulder-a.svg` · `-b` · `-c` | 바위 3종 | **파일** | `0 0 10 5` |
| `scn-moon.svg` | 달 | **파일** | `0 0 16 16` |
| `scn-owl.svg` | 부엉이 | **파일** | `0 0 6 8` |
| `scn-leopard.svg` | 표범 | **파일** | `0 0 12 7` |
| `scn-ridge-*.svg` | 계곡 능선 | 생성기 | (`ridge()`) |
| `scn-skyline-*.svg` | 무너진 도시 | 생성기 | (`skyline()`) |
| `scn-ruins-*.svg` | 폐허 | 생성기 | (`ruins()`) |
| `scn-tree-*.svg` | 마른 나무 | 생성기 | (`deadTree()`) |

원본: `sheets/sheet-b-motifs.png` · `sheets/sheet-c-signs.png`

**SVG 규약** — 셋을 지키지 않으면 농도 규칙과 잉크 세트가 같이 깨진다.

1. `fill="none"` · `stroke="currentColor"` — 색을 굽지 않는다
2. `stroke-width="0.18"` (월드 단위. 천장에서 3.6px) — 아홉이 같은 굵기여야 농도가 거리로 읽힌다
3. `viewBox` 가 곧 월드 크기다. 배율 계산을 그리는 쪽에 남기지 않는다
4. 접지선(바닥이 닿는 y)이 `viewBox` 의 아래 변과 같도록 그린다. 능선 위에 세울 때 좌표가 하나로 끝난다

## 3. 붙는 자리

| 에셋 | 어디에 | 어떻게 |
|---|---|---|
| 판 타일 | 벽 폴리곤 채움 | `createPattern` + **월드 고정**. 화면 고정이면 카메라가 움직일 때 벽이 제자리에서 반짝인다 |
| 종이 결 | 벽 폴리곤 위 한 겹 | 통로에는 걸지 않는다(규칙 1) |
| 잉크 에지 | 판정선의 고스트 | 벽 안쪽으로만(규칙 2). 판정선 자체는 여전히 떨지 않는 선이다 |
| 배경 SVG | 벽 클립 + 침묵 띠 마스크 | 시차는 통로보다 느리게. 띠는 경계에서 75px(규칙 5) |
| 티어 망점 | 스테이지 목록·결과 | 플레이 화면에는 쓰지 않는다 |

## 4. 받은 뒤 확인하는 것

에셋이 규칙을 지켰는지는 눈이 아니라 수치로 잡는다. 시안을 굽는
[`tools/visual-concept/render.mjs`](../tools/visual-concept) 와 같은 방식으로 재면 된다.

| 조건 | 기준 |
|---|---|
| 배경 선화 최대 밝기 ÷ 판정선 | 75% 이하 |
| 라임 화소 면적 | 1% 이하 |
| 통로 안 텍스처 | 0 |
| 타일 이음매 | 4× 반복에서 육안 확인 |
