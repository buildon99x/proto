---
name: concept-design
description: 골든셋 기반으로 신규 게임 컨셉을 기획·채점한다. docs/kb/concept-planning의 템플릿·골든셋(117종)·루브릭을 활용해 컨셉 기획서를 작성하고 자가채점한다. 사용자가 "컨셉 기획", "새 컨셉 발굴", "컨셉 채점/리뷰", "기획서 작성"을 요청할 때 사용.
---

# concept-design — 골든셋 기반 컨셉 기획

신규 게임 컨셉을 `docs/kb/concept-planning`의 **템플릿(§01)·골든셋(§02/03/06)·루브릭(§04)**을 써서 *작성·비교·채점*한다. 결과물은 `docs/concepts/`에 둔다(기존 컨셉 발굴 계층).

## 입력 파악

사용자 요청이 다음 중 무엇인지 먼저 판별한다.
- **(A) 신규 컨셉 작성** — 아이디어/키워드에서 컨셉 기획서를 만든다.
- **(B) 기존 컨셉 채점·리뷰** — 이미 있는 `docs/concepts/*.md`를 루브릭으로 평가한다.
- **(C) 골든셋 질의** — "G1 성공작 보여줘", "라이브서비스 실패 교훈" 등 참조만.

## 절차

### 0. 기준선 로딩(항상)
- `docs/kb/concept-planning/01-concept-template.md`(13섹션·품질 바)와 `04-eval-and-rubric.md`(12항목 루브릭·8 레드플래그·가드레일)를 읽는다.
- `00-method-and-insights.md`의 15대 인사이트(I1–I15)는 차별화·레드플래그 판단의 근거다.

### 1. 동급 골든셋 비교(영감 + 함정)
- 대상 장르를 정하고 도구로 동급 사례를 끌어온다:
  ```
  python3 docs/kb/concept-planning/tools/score_concept.py compare --genre G1 --verdict success
  python3 docs/kb/concept-planning/tools/score_concept.py compare --genre G3 --verdict failure   # 레드플래그 카탈로그
  python3 docs/kb/concept-planning/tools/score_concept.py find <키워드>
  ```
- 장르 코드는 `data/golden-set.json`의 `genres`(G1 덱빌더 … G10 샌드박스/UGC, misc) 참조. 본 프로젝트는 **G1·G2 우선**(차별화 어휘), **G3·G7–G9에서 레드플래그·리텐션** 학습.

### 2. (A) 컨셉 작성 — 템플릿 13섹션
- §01 템플릿을 *순서대로* 채운다. 각 섹션의 **[품질 바]**를 통과할 때까지.
- 필수 충족: ① §1 로그라인이 "또 하나의 X"가 아님 ② §5 "A + B"(메커닉 축) + 흥미로운 결정 1개 ③ §4 코어 루프 30초 다이어그램 + toy-first ④ §8 톤앤매너 (a)~(h) 8칸 구체 ⑤ §9 30초 데모 컷 ⑥ §12 CAR 3줄 ⑦ §13 프리모템 3개 + 가드레일.
- 엔진 정합: §6에서 현 프로젝트 피처(F1–F10)·콘텐츠 DSL에 매핑. 코어를 흐리는 피처는 컷(`docs/concepts`·`CLAUDE.md` 가드레일 계승).

### 3. 구조 린트(기계 점검)
- 작성/대상 문서를 린트해 누락 섹션·토큰을 잡는다(완성도 ≥80 목표):
  ```
  python3 docs/kb/concept-planning/tools/score_concept.py lint <concept.md>
  ```
- 린트는 *구조 완성도*만 본다. 통과해도 다음 단계(질 채점)는 필수.

### 4. 루브릭 채점 + 레드플래그(질 판정)
- §04의 **12항목(각 1–5, /60)**으로 채점하고 각 셀에 근거 한 줄.
- **8대 레드플래그**를 ✅/❌로 점검. 켜지면 `03-golden-set-failure.md`의 해당 사례로 돌아가 반증한다.
- **합격선:** 루브릭 ≥52/60 **그리고** 레드플래그 0개. (42–51 보완 후 진행 / ≤41 컨셉 재고.)
- 동점·우선순위 타이브레이커: ③ 차별화 → ⑥ 가독성 → ② 미학.

### 5. 산출
- (A) 결과를 `docs/concepts/`에 새 번호로 저장(기존 README 인덱스 갱신). 형식·언어(한국어)는 기존 `docs/concepts/02`를 따른다.
- 채점표(12항목·합계·레드플래그·결론)를 문서 말미에 붙인다.
- 복수 안이면 종합 점수 매트릭스로 최적안을 도출(`docs/concepts/02` 방식).

## 원칙
- **골든셋은 기준선이지 정답이 아니다.** 동급 사례보다 *선명하고 정당한가*를 물어라(README §3).
- 수치·사례는 골든셋 JSON을 신뢰하되, 새 사실은 신뢰도 태그([H]/[M]/[L])와 함께.
- 본 프로젝트(덱빌딩 로그라이크)에 주류 라이브 장르(G7–G10)는 *경쟁이 아니라 교훈의 원천*이다(§06).

## 관련 파일
- 템플릿: `docs/kb/concept-planning/01-concept-template.md`
- 골든셋(사람용): `02-golden-set-success.md` · `03-golden-set-failure.md` · `06-mainstream-market.md`
- 골든셋(기계용 단일 소스): `data/golden-set.json`
- 장르 인덱스: `05-genre-index.md`
- 루브릭: `04-eval-and-rubric.md`  · 인사이트: `00-method-and-insights.md`
- 도구: `tools/score_concept.py` (stats·compare·find·lint)
