# 용린난무 龍鱗亂舞 / DRAGONPACHI

> 고전 탄막 슈팅 **도돈파치(DoDonPachi)**를 카피 베이스로, **드래곤·동양 신화** 테마를 입힌 종스크롤 탄막 슈팅 게임. 6스테이지 캠페인 + 영구 성장 메타로 **3–4시간 이상** 플레이타임.

**Status:** `concept / design (기획)` — 설계 문서 단계. 앱 코드·런처 등록 없음.

## 무엇을 베끼고 무엇을 더했나

- **그대로 계승(메커닉):** 샷/레이저 이원 무기, 연환(체인) 스코어링, 봄, 각성(하이퍼), 숨은 수집 아이템, 2주차 + 진 최종보스.
- **새로 입힘(테마·볼륨):** 드래곤 4종(샷타입 분담), 신화 세계관·화염 탄막 비주얼, **용비늘 경제·영구 해금 메타**로 3–4시간 볼륨 확보.

## 문서 지도

| 문서 | 내용 |
|---|---|
| [`brief.md`](./brief.md) | 게임 한 줄 정의 · 타겟 · 첫 플레이 워크플로 |
| [`spec.md`](./spec.md) | 전체 스코프 · 컨트롤 · 코어 규칙 · 콘텐츠 · 구현 메모 |
| [`eval.md`](./eval.md) | **E2E 완성도 점검** 수용 기준 체크리스트 |
| [`docs/concept.md`](./docs/concept.md) | 13섹션 컨셉 기획서(루브릭 양식) |
| [`docs/design/mechanics.md`](./docs/design/mechanics.md) | 도돈파치→드래곤 매핑 · 연환/스코어링/각성 수치 |
| [`docs/design/stages-bosses.md`](./docs/design/stages-bosses.md) | 6스테이지 · 보스 패턴 · 2주차/진보스 |
| [`docs/design/characters.md`](./docs/design/characters.md) | 플레이어블 드래곤 4종 × 샷/레이저 |
| [`docs/design/meta-progression.md`](./docs/design/meta-progression.md) | 용비늘 경제 · 해금 트리 · 난이도 · 플레이타임 예산 |
| [`docs/design/ux-flow.md`](./docs/design/ux-flow.md) | 전 화면·상태 E2E 플로우 |

## 구현 착수 시 할 일 (현재 미수행)

1. `projects/dragon-danmaku/app` 생성 (Vite + React + TS + Phaser 제안).
2. `project.json` 작성 후 런처 레지스트리 등록.
3. `pnpm sync:registry` → `pnpm build:vercel` 검증.
