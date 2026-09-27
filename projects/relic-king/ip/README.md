# ip/ — 「지구 출토」 IP 층

게임 「유물왕」(`relic-king`)을 IP로 키운 산출물이다. 지시서는
`prompts/ip-world-narrative-visual.md`, 결정은 `notes/decisions.md` G118~G125,
판정은 `eval.md` §38. **v0.7.1에서 게임 화면에 올렸다** — 결정 G126~G131, 규격 `spec.md` §18,
판정 `eval.md` §39. 화면 문구는 `app/src/game/lore.ts` 하나에 있다.

| 파일 | 무엇 |
| --- | --- |
| [bible.md](bible.md) | IP 바이블 — 게임 화면 층(`notes/world-lore.md`)의 상위 문서 |
| [narrative.md](narrative.md) | 로그라인, 16시간 재독, 크루 아크, 확장 엔진, 피치 넷, 톤 견본, 화면 첫 적용 제안 |
| [visual-guide.md](visual-guide.md) | 선 규칙, 팔레트, 도트 ↔ 큰 그림 변환, 금지 그림, 굽는 법 |
| [directions.md](directions.md) | 발산 네 방향과 블라인드 수렴 |
| `showcase/index.html` | 한 페이지 쇼케이스 원본 → `app/public/ip/`(런처 `/runs/relic-king/ip/`) |
| `art/keyvisual/keyvisual.png` | 키 비주얼 |
| `art/logo/` | 타이틀 로고(밝은·어두운) |
| `art/crew/` | 크루 도트 원본(16×24)·시트 5·라인업·변환 증명·검수 시트 |
| `art/places/` | 장소 컨셉 셋 |
| `art/directions/` | 발산 썸네일 넷 |
| `art/review/` | 블라인드 리뷰에 쓴 가림판·식별 시험지 |
| `art/finds/` | 그림 속 유물 도트(게임 렌더러 그대로) |
| `src/` | 그림을 그리는 코드. `export-crew.mjs`는 크루 도트를 게임(`app/src/render/crew.generated.ts`)으로 굽는다 |
| `fonts/` | 서브셋 폰트(OFL) |

굽는 법은 [visual-guide.md](visual-guide.md) §11.
