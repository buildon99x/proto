# GPT 이미지 프롬프트 — 실크스크린 컨셉

컨셉 정의와 규칙은 [`notes/visual-concept-silkscreen.md`](../notes/visual-concept-silkscreen.md)
에 있다. 이 문서는 **그 컨셉을 GPT(이미지 생성)로 뽑기 위한 프롬프트**다.

## 쓰기 전에

- **한글을 이미지 안에 넣지 마라.** 이미지 모델은 한글 자소를 깨뜨린다. 프롬프트는
  라틴 문자만 찍게 하고, 한글 카피는 나중에 위에 얹는다. 카피 자리를 비워 두라는 지시가
  프롬프트에 들어 있다.
- **구도 레퍼런스를 같이 넣어라.** `assets/references/silkscreen/main-screen.png` 과
  `play-screen.png` 를 첨부하고 "match this layout and value structure, restyle the surface
  only" 를 덧붙이면 배치가 흔들리지 않는다. 첨부 없이 쓰면 구도는 매번 다르게 나온다.
- **비율은 9:16.** 1024×1536 이 무난하다. 목표 해상도는 780×1440.
- 규칙 2·3(어긋남은 죽는 쪽으로만, 판정선은 떨지 않는다)은 **생성 이미지가 대체로
  어긴다.** 시안으로는 괜찮지만, 구현으로 옮길 때는 생성물이 아니라 규칙이 기준이다.

---

## 공통 스타일 블록

두 프롬프트 모두 이 문단으로 시작한다. `[잉크 세트]` 자리에는 아래 A 나 B 중 한 벌을
통째로 붙인다.

```
Style: authentic 1970s screen-printed (silkscreen) poster artwork, rendered as a
portrait mobile game screen. Limited spot-ink printing on mid-tone stock — NOT a
digital neon/glow look. Flat inks only, no gradients, no bloom, no 3D shading, no
photographic texture. Visible print craft: fine halftone dot screens, coarse line
screens, slight ink build-up along edges, faint paper fiber, tiny registration
crosshairs in the corner margins, and a subtle 3-4px misregistration ghost of one
ink layer.

[잉크 세트]

Value law: blocked areas are the DARKEST thing on the page; open/passable areas are
lighter. Never invert this. Only hairlines may be lighter than the passable area —
never a filled shape.
```

## 잉크 세트

### A. 야경 세트 (기본)

```
Palette — use these exact inks and NO other hues:
  paper stock      #141b29 (mid-tone blue-charcoal; the passable corridor)
  dark ink         #04070e (walls / blocked mass; DARKER than the paper)
  light ink        #9fb4d8 (corridor outline, marks, halftone dots, small type)
  accent ink       #ffe66d (the avatar trail only)
  far silhouette   #0c1322   mid #0a1020   near #05080f
  moon disc        #101828   silhouette keyline #33436a
```

### B. 자외선 세트 — 진한 퍼플 종이 · 형광 라임 심볼

```
Palette — use these exact inks and NO other hues:
  paper stock      #2a1b47 (deep purple; the passable corridor)
  dark ink         #0d0518 (walls / blocked mass; DARKER than the paper)
  light ink        #9fb4d8 (corridor outline, marks, small type)
  accent ink       #ffe66d (the avatar trail only)
  symbol ink       #ccff33 (FLUORESCENT LIME — background symbols ONLY: the moon's
                   halo rings, a sign on the ruined city, a beacon on a spire, small
                   stencil marks on rubble. Never inside the corridor, never on the
                   avatar, never on the gate marks.)
  far silhouette   #1c1133   mid #160d2a   near #0a0417
  moon disc        #221540   silhouette keyline #583f93
The lime is a fluorescent spot ink — a color that only exists in screen printing,
never in offset. It must look like ink on paper, not like an emissive glow. It is
drawn as THIN LINES at reduced ink density, never as a filled shape, and it must
stay visibly dimmer than the corridor outline.
```

**라임은 배경 전용이다.** 아바타를 라임으로 칠하면 홀드 표시(`#b8ff5e`)와 종료선
(`#7dffb0`)을 둘 다 비켜 세워야 하는데, 심볼로만 쓰면 그 대가가 사라진다. 실측 서열은
`아바타 227 > 판정선 178 > 라임 심볼 152 > 통로 33` 이고 라임 화소는 화면의 0.09% 다.
근거는 [컨셉 문서](../notes/visual-concept-silkscreen.md)의 "자외선 세트".

---

## 프롬프트 1 — 메인 화면 (홈)

시안: `assets/references/silkscreen/main-screen.png`

```
[공통 스타일 블록]

Subject: the home screen of a one-button arcade game, designed as a screen-printed
concert-poster sheet. Portrait 9:16 mobile layout, generous margins, printed on the
mid-tone stock described above.

Composition, top to bottom:
1. Small registration crosshair marks in all four corner margins.
2. A huge two-line poster headline reading "WAVE RUNNER" in a heavy condensed
   sans-serif, printed in the accent ink #ffe66d, with a second pass of the SAME
   ink offset about 6px down-left at ~30% opacity — a misregistered ghost, not a
   drop shadow.
3. Two blank horizontal bars under the headline where body copy will be composited
   later. Leave them empty — no lettering.
4. A row of four ink-swatch panels, equal width, each a rectangle of pure dark ink
   filled with a DIFFERENT printed screen texture, separated only by texture, never
   by color:
     - coarse diagonal line screen, about -38 degrees
     - tight horizontal line screen
     - irregular stipple of round halftone dots of mixed sizes
     - rhythmic horizontal bands of alternating thickness
   Under each swatch, a short Latin caption slug in the light ink, tiny.
5. Two stacked wide panel cards with thin light-ink rules, slightly lighter than the
   stock. The upper card contains a strip of four small rectangles whose light-ink
   halftone dots grow denser from left to right — a four-step tonal ramp from nearly
   bare to almost fully covered. The lower card is visibly dimmer, as if printed
   with weaker ink pressure.
6. A 2x2 grid of four swatch cards at the bottom. Each card contains a sharp
   zigzag line drawn corner to corner like a seismograph trace, printed with rough
   inked edges; one card's zigzag is the accent ink and its border is accent ink,
   the other three are light ink with a dashed light-ink zigzag ghosted behind at a
   slightly different angle. Under each zigzag, two short horizontal progress bars.
7. A footer line of small spaced-out Latin capitals in the light ink.

Print artifacts: halftone dots must be visible at close range on the swatches and
the tonal ramp; the paper shows a faint fiber grain across the whole sheet; ink
edges are slightly ragged, as if pulled through a screen.

Do NOT include: Korean or CJK characters, gradients, glow, drop shadows, neon,
lens flare, 3D perspective, photo texture, mockup device frame, hands, watermark,
signature, any hue outside the four listed inks.
```

**손잡이(수정 지점)** — 결과가 마음에 안 들 때 이 순서로 건드린다.

1. 너무 디지털하면 → `ink edges are slightly ragged` 를 `ink edges are noticeably
   ragged with visible squeegee streaks and pinholes in the flood` 로 키운다.
2. 색이 새면 → 팔레트 문장 뒤에 `Monochrome except #ffe66d.` 를 덧붙인다.
3. 판 네 개가 비슷해지면 → 네 텍스처를 각각 다른 프롬프트 줄로 떼어 번호를 붙인다.
4. 헤드라인 고스트가 그림자로 읽히면 → `offset ghost printed in the same yellow ink,
   visible AS A SEPARATE PRINTED LAYER, not a shadow` 로 바꾼다.

---

## 프롬프트 2 — 플레이 화면 (계곡 · 폐허 · 무너진 도시 · 달 · 마른 나무)

시안: `assets/references/silkscreen/play-screen.png`

배경을 넣되 **통로는 그대로 비어 있다.** 풍경은 전부 벽(잉크) 안에서만 살고, 통로 경계
안쪽 75px 은 배경이 한 점도 들어오지 않는 침묵 띠다. 자세한 이유는 컨셉 문서의 규칙 5.

```
[공통 스타일 블록 + 잉크 세트 B]

All silhouette fills are DARKER than the paper stock — this is not optional. Only
the hairline keyline may be lighter than the stock, and it must stay clearly dimmer
than the corridor outline.

Subject: the in-play screen of a side-scrolling one-button dodging game, drawn as a
screen print. Portrait 9:16. A passage has been cut straight through a dead
moonlit landscape — a canyon of ruins and a collapsed city, all rendered as flat
silhouette plates. The passage is the only empty thing in the picture.

Composition:
1. A wide open CORRIDOR runs from the left edge to the right edge, roughly through
   the middle third of the screen. It ascends toward the right as a staircase: a
   short diagonal ramp, then a flat recovery run, then another ramp, three or four
   steps in total. Constant generous width, narrowing only slightly as it climbs.
2. The corridor interior is BARE PAPER — perfectly flat stock color. No texture, no
   dots, no grain, no gradient, no scenery, no stars, nothing. This emptiness is
   the subject of the image.
3. Everything above and below the corridor is solid dark ink #04070e filling to all
   four edges, overprinted with a coarse diagonal line screen at about -38 degrees
   and a faint paper-fiber noise.
4. SCENERY, printed as a second plate ON TOP of that line screen, and only inside
   the dark mass:
   - Upper left: a large moon, drawn as a DARK disc (moon-disc ink) with a thin 2px
     light-ink outline and a wider faint concentric halo ring. It reads as a moon
     by its outline and halo, never by being bright. Two small darker craters.
   - Two bare dead trees stand in front of the moon, their branching silhouettes
     crossing the disc — leafless, forked, tapering, in the darkest near tone.
   - Behind them, jagged canyon ridge lines in the far tone, layered two deep.
   - Across the upper right, the skyline of a COLLAPSED CITY: blocky towers of
     varying height with snapped, diagonally sheared tops, one leaning off
     vertical, small rectangular window notches knocked out of the ink.
   - Lower mass: broken RUINS — stumps of columns with chipped tops, a couple of
     half-fallen arches, more dead trees rising from the bottom edge, and another
     distant ridge behind them.
   - Every silhouette carries a 1px keyline in the keyline ink. Shape comes from
     the keyline, not from brightness.
   - FLUORESCENT SYMBOLS, in the symbol ink, thin lines only, four places and no
     others: (a) three concentric halo rings around the moon — the disc itself stays
     dark, only the rings are fluorescent; (b) a circular sign hung on a mast over
     the ruined city, a zigzag wave glyph enclosed in a ring, clearly framed so it
     reads as a printed emblem and never as a trajectory; (c) a beacon at the tip of
     one spire — a small dot with two faint rings and a hairline mast running down to
     the structure; (d) two or three tiny stencil marks on the rubble — bars, a
     chevron, a barred circle, never anything letter-like. Together they cover well
     under 1% of the image.
5. A KNOCKOUT SILENCE BAND: for about 75px inside the dark mass, measured from the
   corridor outline, there is no scenery at all — only clean ink. Silhouettes are
   cut off cleanly where that band begins, like a printer's knockout gap. Nothing
   in the landscape ever touches the corridor outline.
6. The boundary between ink and paper is a single crisp light-ink line about
   3px wide with hard mitred corners — the sharpest, cleanest, brightest edge in the
   image. It must out-read every silhouette.
7. Immediately INSIDE the dark ink, hugging that boundary, a thicker soft ghost of
   the same outline is offset about 9px into the dark mass, ragged and slightly
   blurred, like a misregistered second pass. The ghost never crosses into the
   corridor — it only ever bleeds deeper into the ink.
8. In the corridor, a bright accent-ink (#ffe66d) zigzag path drawn as a hard-cornered polyline:
   long 45-degree rising legs alternating with short 45-degree falling legs, so the
   trace climbs as it advances to the right. It ends in a solid triangular arrowhead
   pointing up-right, mid-screen. The older trail is the same yellow at ~30%
   opacity, thinner. It is the brightest thing on the page — brighter than the
   corridor outline, and brighter than every fluorescent background symbol.
9. Near the right edge, the corridor splits into an upper and a lower lane around a
   sharp-tipped lens shape of the same dark ink, filled with a tight horizontal line
   screen and outlined in light ink. Centered in each lane, a small flat rounded
   plaque with an up-arrow above it — upper plaque orange #ffb347, lower violet
   #e07bff, the arrow a flat teal #2c6b78, all with a light halftone texture over
   the fill. These gate marks are untouched game elements — do not restyle or
   recolor them.
10. Top-left margin over the dark ink: a tiny registration crosshair and a short
    Latin readout in light ink. A thin light-ink progress rail along the very top
    edge. A registration crosshair in the bottom-right corner.

Mood: dry, still, post-collapse night under deep purple. Melancholy, not menacing.
No weather, no rain, no fog, no fire.

Hard constraint, repeated because it is the one that gets broken: the corridor
interior stays completely empty flat stock color, and NO area of the landscape is
brighter than that corridor. Only hairline keylines may be lighter, never a filled
shape. Blocked areas are the darkest thing on the page.

Do NOT include: any fluorescent ink inside the corridor or on the avatar or gate
marks, a fluorescent symbol brighter than the corridor outline, a filled
fluorescent shape, a glowing or emissive lime (it is ink, not light), scenery or
texture inside the corridor, a bright/glowing moon,
stars, clouds, fog, birds, water, foliage or leaves, people, vehicles, Korean or
CJK characters, glow or neon bloom, gradients, outer shadows, 3D perspective,
particles, watermark, signature, any hue outside the listed inks.
```

**손잡이(수정 지점)**

1. 통로에 풍경이 새어 들어가면 → 5번의 침묵 띠 문장을 프롬프트 **맨 끝**에 한 번 더
   복사한다. 모델은 마지막 문단을 가장 잘 지킨다. 그래도 새면 띠를 `120px` 로 올린다.
2. 달이 밝게 빛나면 → `the moon is a DARK disc, an unlit hole in the sky, outlined
   only` 로 바꾸고 `no moonlight, no glow, no rim light` 를 부정 목록에 넣는다.
   이 실수가 제일 자주 난다 — 달이라는 단어가 모델에게 곧 밝기다.
3. 배경이 통로 경계와 경쟁하면 → 6번에 `the corridor outline is the highest-contrast
   element; reduce all silhouette keylines to 50% of its brightness` 를 덧붙인다.
4. 풍경이 너무 빽빽하면 → 4번에서 항목 하나를 지운다. 폐허와 도시를 같이 넣으면 아래쪽이
   먼저 무너진다. 위=도시+달, 아래=폐허+나무로 갈라 쓰는 편이 낫다.
5. 실루엣이 입체가 되면 → `flat silhouettes only, single flat tone per layer, no
   shading, no highlights, no ambient occlusion` 를 덧붙인다.
6. 라임이 네온처럼 빛나면 → `the lime is flat printed ink with a slightly ragged
   screen-printed edge; matte, no halo, no emission` 을 덧붙인다. 형광색을 말하면
   모델이 발광으로 알아듣는다.
7. 라임이 배경 밖으로 번지면(아바타·게이트·통로) → 잉크 세트의 `symbol ink` 줄을
   프롬프트 맨 끝에 한 번 더 복사한다. 심볼 네 자리를 이름으로 못 박는 편이
   "배경에만"이라는 추상적 지시보다 훨씬 잘 듣는다.
8. 코스 기하가 풍경에 먹히면 → 시안 PNG 를 첨부하고 `keep this exact corridor shape
   and staircase rhythm; restyle only what is outside it` 를 앞에 붙인다.

### 섹터별 풍경 배분 (같은 컨셉을 12스테이지로 늘릴 때)

풍경이 장식이 아니라 **섹터가 묻는 질문의 배경**이 되게 하려면 유형별로 갈라 둔다.

| 섹터 | 배경 | 왜 |
|---|---|---|
| **협곡** | 계곡 능선, 층진 암벽 | 통로의 계단 리듬과 능선 리듬이 같은 방향으로 읽힌다 |
| **회랑** | 무너진 도시의 협곡 — 양쪽으로 선 건물 벽 | 좁고 긴 관이 건물 사이 골목이 된다 |
| **산개** | 마른 나무 숲, 흩어진 잔해 | 흩뿌림이 배경에서 먼저 예고된다 |
| **맥동** | 달 아래 폐허 열주(列柱) | 일정 간격의 기둥이 셔터 주기와 같은 박자다 |

## 다음 판에서 뽑아 볼 것

시안 두 장으로는 판정이 안 나는 것들이다.

- **결이 다른 같은 코스** — 같은 통로 기하를 협곡 선망 / 회랑 선망 / 산개 망점으로만
  바꿔 세 장. 결만으로 섹터가 구분되는지가 컨셉의 생사다.
- **티어 1 과 티어 4 의 같은 자리** — 메타 화면에서 농도 차가 읽히는지.
- **사망 순간** — `#ff5e7a` 가 잉크 한 판으로 덮이는 그림. 이 컨셉에서 사망을 어떻게
  말할지가 아직 비어 있다.
