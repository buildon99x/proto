# 유물왕 (relic-king)

실존하는 유물을 발굴·감정·소장해 세계 자산 순위 1위에 오르는 방치형 웹게임.
**세상에 단 하나뿐인 유물은 먼저 찾는 사람이 가진다.**

- 슬러그: `relic-king` (레지스트리 id는 kebab-case ASCII만 허용해 한글 이름과 별도로 둔다)
- 상태: `prototype` — **v0.4까지 전부 구현돼 플레이 가능한 빌드다.** 5탭(발굴·소장고·
  시설·시장·도감), 12거점, 유물 2,000종.
- 실행: `pnpm --filter relic-king dev` / 빌드: `pnpm --filter relic-king build`
- 검증: `pnpm --filter relic-king sim` (밸런스 시뮬) · `pnpm --filter relic-king smoke` (브라우저 스모크)
- QA 게이트: `qa:migration` (세이브 v1→v8) · `qa:artifacts` (데이터셋·세계 총가치·실사 이미지
  라이선스·번들 예산) · `qa:sprites` (아이콘 중복·거점 구분력·유일 12종 분리) ·
  `qa:economy` (통화 성장·원장 보존) · `qa:expedition` (원정 스텝 무관성) ·
  `qa:season` (시즌 롤오버) · `qa:autosell` (소장고 중복분 자동 매각)
- 아이콘 검수: `pnpm --filter relic-king sheets` → `assets/generated/contact-*.png`

## 문서

| 문서 | 내용 |
| --- | --- |
| [brief.md](brief.md) | 대상 사용자, 재미 정의, 첫 세션, 범위(v0.1~v0.7) |
| [spec.md](spec.md) | 코어 루프·시스템 수치·UX·도트 규격·데이터 모델(v0.1) + 거점·경영·시장(v0.2) |
| [notes/mda.md](notes/mda.md) | MDA 설계 — Mechanics·Dynamics·Aesthetics, Design Contract, 역전 현상, 리스크 |
| [notes/artifacts-dataset.md](notes/artifacts-dataset.md) | 유물 데이터 규격과 티어 매핑 원칙 |
| [notes/decisions.md](notes/decisions.md) | v0.2 결정 게이트 전체 기록 — 충돌·결정·버린 선택지 |
| [notes/economy.md](notes/economy.md) | v0.2 경제 설계 — 화폐 소스·싱크 총괄표, 인플레이션 방어 구조 |
| [notes/world-map.md](notes/world-map.md) | v0.2 세계지도·거점 12곳·거리 시세 모델 |
| [notes/staff.md](notes/staff.md) | v0.2 스텝(단장·관장·경매관장) 고용·스탯·급여 설계 |
| [notes/ux-v02.md](notes/ux-v02.md) | v0.2 UX — 탭 구조·조작 단계 수·알림 체계·레이아웃 검사 |
| [eval.md](eval.md) | 검증 체크리스트와 실측 (§17 v0.3 엔딩·§18 자동매각·§19 v0.4 아이콘 구분력·§20 세계지도·§21 v0.5 기록패) |
| [scripts/README.md](scripts/README.md) | 유물 데이터 파이프라인 + 실사 이미지 수집 |
| [changelog.md](changelog.md) | 릴리스별 변경 |

## 한 문단 요약

방치형 게임은 보통 모든 숫자가 한 방향으로만 커지고, 그래서 돌아올 이유가 일일 보상밖에
없다. 유물왕은 둘을 각각 공격한다. **점수와 자원을 같은 물건으로 만들어서**(유물을 팔면
성장이 빨라지고 순위는 떨어진다) 매 드랍마다 선택을 되돌리고, **지금 아니면 영영 안 되는
순간을 만들어서**(유일 유물 제보 → 3~8분 선점 레이스) 긴장을 넣는다. 유물의 등급은
지어낸 것이 아니라 **현실의 현존 개체 수**다 — 신라 금관은 6점, 로제타 석은 1점.

## 지금 되는 것 (v0.4)

12거점 세계지도 × 12층, 유물 **2,000종**(유일 12 · 국보 28 · 진귀 146), 발굴단
회차제 원정(최대 4팀), 스텝 3직군, 감정소·보관소·박물관·경매장·암시장, 보존 상태 축,
시즌제(12주)와 3축 종합 순위(자산·도감·명성), 제보 레이스, 오프라인 진척, 도감,
세이브(export/import). 클릭 0회 방치만으로 약 141시간에 엔딩([eval.md §17.3](eval.md)).

v0.4가 더한 것: 32×32 도트 아이콘이 shape 10종 안에서 **실루엣 60종**으로 갈라지고,
거점 12곳이 악센트색·테두리 양식·문양 세 채널로 **아이콘만 보고 구분된다**(기계 판정
95.2%). 유일 12종은 손으로 찍은 전용 도트를 쓴다. T3·T4 40종에 계측·내력·소장 경위를
담은 실사 디테일이 상세 화면에 접힌 채로 붙는다.

## 다음 단계

1. **실사 이미지 수집** — 스키마·파이프라인·UI는 들어갔고 이미지가 0장이다. egress
   허용 목록에 `commons.wikimedia.org`·`upload.wikimedia.org`가 필요하다
   ([scripts/README.md](scripts/README.md)).
2. **실사 디테일 검증·확장** — 40종이 전부 `sourceStatus: "pending"`이다(1차 자료
   대조 미완). T2 146종으로 넓히는 것도 같은 세션 몫이다.
3. **v0.5** — T4 전용 이전 경로 오퍼/역오퍼(라이벌과 1:1 협상). 영구 상실의
   첫 회복 경로다.
4. **v0.6** — 서버 전환(G1) + 거래소(유저 간 P2P) 신설(v0.2 도입 취소 이후 처음부터
   실유저 유동성 전제로 새로 설계한다).
5. **v0.7** — 실유저 간 경쟁 지표(명예의 전당), 도난 시스템 고도화, 거점 확장 2차 실행.

범위·마일스톤의 세부는 [brief.md](brief.md)를 따른다.
