# 유물왕 (relic-king)

실존하는 유물을 발굴·감정·소장해 세계 자산 순위 1위에 오르는 방치형 웹게임.
**세상에 단 하나뿐인 유물은 먼저 찾는 사람이 가진다.**

- 슬러그: `relic-king` (레지스트리 id는 kebab-case ASCII만 허용해 한글 이름과 별도로 둔다)
- 상태: `idea` — **설계 완료, 구현 대기**
- 실행: `pnpm --filter relic-king dev` / 빌드: `pnpm --filter relic-king build`

## 문서

| 문서 | 내용 |
| --- | --- |
| [brief.md](brief.md) | 대상 사용자, 재미 정의, 첫 30분, 범위 |
| [spec.md](spec.md) | 코어 루프, 시스템 수치, UX, 도트 규격, 데이터 모델 |
| [notes/mda.md](notes/mda.md) | MDA 설계 — Mechanics·Dynamics·Aesthetics, Design Contract, 역전 현상, 리스크 |
| [notes/artifacts-dataset.md](notes/artifacts-dataset.md) | 유물 데이터 규격과 티어 매핑 원칙 |
| [eval.md](eval.md) | 검증 체크리스트 (자동·밸런스·데이터·재미 가설) |

## 한 문단 요약

방치형 게임은 보통 모든 숫자가 한 방향으로만 커지고, 그래서 돌아올 이유가 일일 보상밖에
없다. 유물왕은 둘을 각각 공격한다. **점수와 자원을 같은 물건으로 만들어서**(유물을 팔면
성장이 빨라지고 순위는 떨어진다) 매 드랍마다 선택을 되돌리고, **지금 아니면 영영 안 되는
순간을 만들어서**(유일 유물 제보 → 3~8분 선점 레이스) 긴장을 넣는다. 유물의 등급은
지어낸 것이 아니라 **현실의 현존 개체 수**다 — 신라 금관은 6점, 로제타 석은 1점.

## 다음 단계

v0.1 구현: 권역 3, 유물 60점(유일 8), 감정·매각, 라이벌 6, 제보, 오프라인 진척, 순위, 도감, 세이브.
착수 전에 [notes/artifacts-dataset.md](notes/artifacts-dataset.md)의 현존 수량·소장처를
1차 자료로 검증해야 한다(현재 환경은 외부 네트워크 차단).
