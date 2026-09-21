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

두 프롬프트 모두 이 문단으로 시작한다. 따로 쓸 때는 이 블록을 앞에 붙여라.

```
Style: authentic 1970s screen-printed (silkscreen) poster artwork, rendered as a
portrait mobile game screen. Limited spot-ink printing on mid-tone stock — NOT a
digital neon/glow look. Flat inks only, no gradients, no bloom, no 3D shading, no
photographic texture. Visible print craft: fine halftone dot screens, coarse line
screens, slight ink build-up along edges, faint paper fiber, tiny registration
crosshairs in the corner margins, and a subtle 3-4px misregistration ghost of one
ink layer.

Palette — use these exact inks and NO other hues:
  paper stock  #18202f (mid-tone blue-charcoal)
  dark ink     #04070e (the walls / blocked mass; DARKER than the paper)
  light ink    #9fb4d8 (outlines, marks, halftone dots, small type)
  accent ink   #ffe66d (used for ONE element only — see each prompt)
Value law: blocked areas are the DARKEST thing on the page; open/passable areas are
lighter. Never invert this.
```

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

## 프롬프트 2 — 플레이 화면

시안: `assets/references/silkscreen/play-screen.png`

```
[공통 스타일 블록]

Subject: the in-play screen of a side-scrolling one-button dodging game, drawn as a
screen print. Portrait 9:16. The entire image is one continuous horizontal passage
cut through a printed mass.

Composition:
1. A wide open CORRIDOR runs from the left edge to the right edge, roughly through
   the middle third of the screen. It ascends toward the right as a staircase: a
   short diagonal ramp, then a flat recovery run, then another ramp, three or four
   steps in total. The corridor keeps a constant generous width and narrows only
   slightly as it climbs.
2. The corridor interior is BARE PAPER — perfectly flat stock color, absolutely no
   texture, no dots, no grain, no gradient. This emptiness is the point of the
   image.
3. Everything above and below the corridor is solid dark ink #04070e, filling to all
   four edges, and it is covered with a coarse diagonal line screen at about -38
   degrees plus a faint paper-fiber noise. All texture in the picture lives here and
   only here.
4. The boundary between ink and paper is a single crisp light-ink #9fb4d8 line about
   3px wide with hard mitred corners — the sharpest, cleanest edge in the image.
5. Immediately INSIDE the dark ink, hugging that boundary, a thicker soft ghost of
   the same outline is offset about 9px into the dark mass, ragged and slightly
   blurred, like a misregistered second pass. The ghost never crosses into the
   corridor — it only ever bleeds deeper into the ink.
6. In the corridor, a bright #ffe66d zigzag path drawn as a hard-cornered polyline:
   long 45-degree rising legs alternating with short 45-degree falling legs, so the
   trace climbs as it advances to the right. It ends in a solid triangular arrowhead
   pointing up-right, mid-screen. The older part of the trail is the same yellow at
   about 30% opacity, thinner. This yellow is the only warm element in the picture.
7. Near the right edge, the corridor is split into an upper and a lower lane by a
   sharp-tipped lens/eye shape made of the same dark ink, filled with a tight
   horizontal line screen and outlined in light ink. Centered in each lane is a small
   flat rounded rectangle plaque with a simple solid up-arrow above it — the upper
   plaque in orange #ffb347, the lower in violet #e07bff, both flat, both with a
   light halftone dot texture over the fill. These two plaques are the only other
   saturated marks allowed.
8. Top-left margin, over the dark ink: a tiny registration crosshair and a short
   Latin readout in light ink, small and quiet. A thin light-ink progress rail runs
   along the very top edge. A small registration crosshair sits in the bottom-right
   corner.

Do NOT include: any texture inside the corridor, Korean or CJK characters, glow or
neon bloom, gradients, outer shadows, stars, clouds, spaceship illustration, 3D
perspective, particles, HUD clutter across the corridor, watermark, signature, any
hue outside the listed inks.
```

**손잡이(수정 지점)**

1. 통로에 텍스처가 묻어 나오면 → 6번 다음에 `The corridor must remain completely
   untextured flat color — this is the single most important constraint.` 를 한 줄로
   다시 못 박는다. 이 실수가 가장 자주 난다.
2. 벽이 통로보다 밝아지면 → `Value law` 문장을 프롬프트 맨 끝에 한 번 더 복사한다.
   모델은 첫 문단보다 마지막 문단을 더 잘 지킨다.
3. 고스트가 통로 쪽으로 새면 → 5번을 `the ghost is clipped to the dark mass` 로 바꾸고
   두께를 9px → 6px 로 줄인다.
4. 지그재그가 부드러운 곡선이 되면 → `hard-cornered polyline, mitre joints, zero
   curvature, like a seismograph trace` 를 덧붙인다.
5. 게이트가 너무 튀면 → 7번의 plaque 를 `smaller, occupying less than 12% of the
   image width` 로 제한한다.

---

## 다음 판에서 뽑아 볼 것

시안 두 장으로는 판정이 안 나는 것들이다.

- **결이 다른 같은 코스** — 같은 통로 기하를 협곡 선망 / 회랑 선망 / 산개 망점으로만
  바꿔 세 장. 결만으로 섹터가 구분되는지가 컨셉의 생사다.
- **티어 1 과 티어 4 의 같은 자리** — 메타 화면에서 농도 차가 읽히는지.
- **사망 순간** — `#ff5e7a` 가 잉크 한 판으로 덮이는 그림. 이 컨셉에서 사망을 어떻게
  말할지가 아직 비어 있다.
