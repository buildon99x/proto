# Full Implementation Request (Fable용 프롬프트)

**Date:** 2026-07-14
**Type:** 구현 요청 프롬프트 (아래 블록을 그대로 새 세션에 붙여넣어 사용)

---

## 프롬프트

Stackflow 클론의 **완전한 버전**을 구현해줘. 프로젝트는 `projects/stackflow`이고, 설계는 이미 끝나 있다 — 네 임무는 설계를 코드로 옮기는 것이지 재설계가 아니다.

### 반드시 먼저 읽을 문서 (이 순서로)

1. `projects/stackflow/AGENTS.md` — 프로젝트 규칙
2. `projects/stackflow/spec.md` — **유일한 구현 기준 문서.** §13 빌드 순서 포함
3. `projects/stackflow/eval.md` — 완성 판정 체크리스트 (A–G가 곧 인수 조건)
4. `projects/stackflow/brief.md`, `notes/decisions.md`, `notes/design-acts.md`, `notes/mda-review.md` — 의도가 애매할 때 참조

### 범위: "완전한 버전"의 정의

spec §13 빌드 순서 **1–8 전부**. MVP(1–3)에서 멈추지 말 것.

1. 그리드 + 컬러 조각 + 이동/3방향 회전(SRS식 월킥)/락 + 라인 클리어 + 동색 그룹 ≥N 셰이프 클리어 (§2, §3, §6)
2. 중력 + 캐스케이드 + **라이브 체인 카운터 + 초선형 체인 배율** `1,2,4,7,11,16,…` (§4, §7.1)
3. 스테이지 타깃/진행/패배 + **탑아웃 DANGER 연출** + **스테이지 1 첫 60초 훅(시드된 오프닝 백)** + 런 요약(run-bests) (§8.1, §8.7)
4. 특수 블록 5종: Stone, Obsidian, Vine, Combo Tile, Score Booster + 퍼펙트 클리어 ×4 + Overdrive 미터 (§5, §7.1)
5. 상점 경제: 짝수 스테이지 풀숍(3오퍼+리롤) / 홀수 스테이지 인라인 퀵바이 + **Bank vs Press 오버킬** + 4개 블록 그룹 시너지(Explosives/Colony/Arcane/Harmony) (§5.3, §8.3)
6. Advantage 시스템 (automation/reward-multiplier/rule-changer 각 3종 이상, 이벤트 훅 기반, 활성 5슬롯 상한; automation은 §8.4대로 "스펙터클 트리거") (§8.4)
7. 보스: 미니보스 3/6/9(룰 모디파이어 + 라이트 넛지) + 액트 보스 10(**Break 게이지 + 60% 페이즈 전환 + 격파 크레셴도 + Treasure 1-of-3**) — 시그니처 보스 Inverter/Turner/Warden (§8.2)
8. 주스 티어링(링크별 피치 상승/셰이크 스케일/link≥5 티어업/~120ms 슬로모) + **주스 버짓 + reduce-motion 토글** + §7.1 크레셴도 대비 타깃 커브 재검증 (§12, §8.1)

추가로: 화면 7종 전부 (§10 — 타이틀/플레이/Bank·Press/상점·퀵바이/Treasure/런 요약/**Blockipedia**), 키보드 컨트롤 (§11), run-bests + Blockipedia 크로스런 저장(localStorage).

### 구현 원칙

- `[SRC]` 항목은 **요구사항**, `[DEF]`/`[DES]` 값은 기본값이되 **데이터 파일로 분리해 튜닝 가능하게**: `data/blocks.json`, `data/scoring.json`, `data/stages.json` (그리드 크기, 타깃 공식, 체인 커브, 블록/어드밴티지 테이블 — 매직 넘버 하드코딩 금지, eval §G).
- 모든 난수(백, 상점, 어드밴티지, 보스 선택)는 **단일 시드 PRNG** 하나에서 파생 — 같은 시드 = 같은 런 (eval §G).
- **타이머/드롭 클록 절대 금지** — 압박은 공간(탑아웃)과 연출로만 (eval §F2 identity invariant).
- 보드는 액트 내 유지·액트 시작 시 리셋, 점수는 스테이지마다 0에서 (§8.7).
- 접근성: 색맹 안전 팔레트 + 모양/아이콘 병행 코딩(색 단독 금지), reduce-motion 토글, 키 리맵.
- 기존 `app/` Vite React 템플릿 위에 구현. 렌더링은 Canvas 또는 DOM 중 성능/주스 요구를 감당하는 쪽을 택하고 이유를 `notes/decisions.md`에 기록.

### 검증 (구현만큼 중요)

- **유닛 테스트** (eval §G 최소 범위): 라인 클리어, 셰이프 클리어, 캐스케이드 체인 카운팅, Vine 체인 점수, Obsidian 배율, 보스 룰 적용, 시드 재현성. `tests/`에 배치.
- **eval.md §A–§G를 하나씩 자체 점검**하고, 통과/미통과를 체크 표시로 갱신해 커밋할 것. 미통과 항목은 사유를 남길 것.
- 실제로 앱을 띄워 스테이지 1 훅(60초 내 멀티링크 체인)과 액트 1 완주가 되는지 직접 플레이 확인 (`pnpm --filter stackflow dev`).
- 밸런스: 초선형 체인 커브 + Overdrive 기준으로 §8.1 타깃 커브를 재검증하고, 조정했다면 `data/stages.json`과 `notes/decisions.md`에 기록 (spec §8.1 crescendo re-validation).

### 마무리 워크플로

- `brief.md`/`spec.md`/`eval.md`를 실제 구현과 일치하게 갱신, `changelog.md`에 항목 추가.
- 루트 `AGENTS.md` 워크플로 준수: `pnpm sync:registry` 실행, 필요 시 런처 경로 확인.
- 지정된 브랜치에 의미 단위로 커밋하고 푸시.

작업량이 크니 §13 마일스톤 단위로 커밋을 나누고, 각 마일스톤이 끝날 때마다 동작 확인 후 다음으로 진행해줘. 질문이 생기면 spec → decisions → mda-review 순으로 답을 찾고, 문서에 없는 결정은 `[DEF]`로 간주해 `notes/decisions.md`에 기록한 뒤 진행해.
