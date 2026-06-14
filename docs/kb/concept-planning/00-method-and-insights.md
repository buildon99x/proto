# 00 — 방법론 · 페이퍼 조사 · 컨셉 인사이트

> **이 문서가 답하는 것:** "좋은 컨셉 기획이란 무엇이고, 무엇이 컨셉 단계에서 게임의 성패를 가르는가?" — 공개 게임디자인 이론(페이퍼)과 56개 실 사례(§02·§03)를 교차해 **검사 가능한 원칙**으로 정리한다.
> **갱신일:** 2026-06-14.

---

## 1. 방법론

### 1.1 역기획(reverse-engineering)의 정의

여기서 **역기획**은 *완성·출시된 게임을 마치 출시 전 컨셉 기획서였던 것처럼 거꾸로 복원*하는 작업이다. 출력은 §01 템플릿의 13개 칸이며, 추가로 **판정(성공/실패/혼합)**과 **성패 원인 한 줄**을 단다. 핵심은 "이 게임이 *재미있다/안 재밌다*"가 아니라 **"이 게임의 컨셉 문서를 출시 전에 봤다면 성패를 예측할 수 있었는가, 어느 칸에서 신호가 보였는가"**다.

### 1.2 표본 설계 (왜 이 56종인가)

- **기간:** 최근 ~10년(2016–2026). 장르 정의작은 일부 예외 인정(StS 2019, Darkest Dungeon 2016, Stardew 2016).
- **계층(사용자 지정):** **핵심층** = 이 프로젝트(덱빌더·로그라이크·로그라이트·인디)에 직결되는 사례 — 깊게 분해. **확장층** = 전 장르 대표 성공/실패작 — 보편 교훈 위주.
- **성공/실패 균형:** 성공 34 + 실패 22. 실패 표본을 크게 잡은 이유: *성공은 다양하지만 실패는 소수 패턴으로 수렴*(§3) → 실패 카탈로그가 레드플래그로서 가성비가 높다.
- **선택 기준:** ① 컨셉이 명확히 분해되는가 ② 성패 신호가 컨셉 단계에 있었는가 ③ 우리 프로젝트에 전이되는 교훈이 있는가.

### 1.3 분석 렌즈

주 렌즈는 repo가 이미 채택한 **MDA**(Mechanics→Dynamics→Aesthetics, `docs/research/02`). 여기에 아래 §2의 페이퍼들을 보조 렌즈로 얹어, 컨셉을 **(설계자 측) 메커닉 → (창발) 다이내믹 → (목표) 미학·욕구충족 → (시장) 가독성·차별화**의 사슬로 본다.

---

## 2. 페이퍼·이론 조사 (공개 문헌)

각 이론에서 **컨셉 기획에 바로 쓰는 한 줄 도구**를 뽑았다.

| # | 이론 / 저자 | 골자 | 컨셉 기획용 도구 |
|---|------------|------|-----------------|
| P1 | **MDA** — Hunicke, LeBlanc, Zubek (2004) | 메커닉→다이내믹→미학. 설계자는 좌→우로 만들고 플레이어는 우→좌로 경험. 미학 = "8 kinds of fun"(Sensation·Fantasy·Narrative·Challenge·Fellowship·Discovery·Expression·Submission) | **컨셉은 미학에서 출발해 역설계하라.** "우리가 팔려는 감정은?"을 먼저 못 적으면 컨셉이 아니다. |
| P2 | **Elemental Tetrad** — Jesse Schell, *The Art of Game Design: A Book of Lenses* (2008) | 게임 = **Mechanics·Story·Aesthetics·Technology** 4요소의 균형. 가장 약한 요소가 체험의 천장. 100+ "렌즈"(질문) 제공. | **4요소 균형 점검표.** 컨셉서에서 한 요소(보통 Story나 Tech)가 비면 그게 리스크. |
| P3 | **Self-Determination Theory / PENS** — Ryan, Rigby, Przybylski (2006) "The Motivational Pull of Video Games" | 내적 동기 = **Competence(유능감)·Autonomy(자율성)·Relatedness(관계성)** 충족. 이 세 욕구를 채우는 게임이 오래 붙잡는다. | **CAR 테스트.** 컨셉이 셋 중 *무엇을* 어떻게 채우는지 한 줄씩. 라이브서비스 리텐션은 결국 이 셋. |
| P4 | **Flow / GameFlow** — Csikszentmihalyi (1990); Sweetser & Wyeth (2005) | 도전과 실력의 균형 → 몰입(flow). GameFlow는 이를 8요소(집중·도전·실력·통제·명확한 목표·피드백·몰입·사회성)로 게임화. | **난이도 곡선·피드백 즉시성**을 컨셉 단계에서 약속. StS의 "Intent 텔레그래프"가 곧 명확한 목표+피드백. |
| P5 | **A Theory of Fun** — Raph Koster (2004) | 재미 = **패턴을 학습(grok)하는 쾌감**. 학습이 끝나면 지루함, 너무 어려우면 좌절. | **"무엇을 배우는 게임인가"**를 한 문장으로. 학습 곡선이 없는 컨셉은 곧 소모된다(반례 관리). |
| P6 | **Loops & Arcs** — Daniel Cook, *Lostgarden* (2012) | 게임 = 반복되는 **루프**(즉각 피드백 스킬-사슬) + 일회성 **아크**(서사·해금). 로그라이크는 루프 중심. | **코어 루프를 30초 안에 그려라.** 컨셉서에 루프 다이어그램이 없으면 메커닉이 아직 없는 것. |
| P7 | **Hooked (Trigger·Action·Variable Reward·Investment)** — Nir Eyal (2014) | 습관 형성 4단계. 가변 보상 + 누적 투자 = "한 판 더". | **변동 보상의 출처**를 명시(로그라이크의 절차적 보상·덱 시너지 발견). 단 *착취형 가변보상(가챠/슬롯)*은 §3의 양날. |
| P8 | **Rules of Play / Second-order design** — Salen & Zimmerman (2004) | 설계자는 규칙을 만들지만 *경험은 플레이어가 만든다*. "의미 있는 플레이" = 식별 가능 + 통합된 행동·결과. | **설계자가 직접 통제 못 하는 창발**을 의도하라. "플레이어가 만들 이야기"를 컨셉에 적는다. |
| P9 | **Meaningful decisions** — Costikyan, "I Have No Words & I Must Design" (1994/2002); Sid Meier "흥미로운 결정의 연속" | 게임 = 흥미로운 결정의 연쇄. 결정이 명백하거나(자명) 무의미하면(랜덤) 게임이 아니다. | **"가장 흥미로운 결정 1개"**를 컨셉서에 적시. 덱빌더라면 카드 선택의 트레이드오프. |
| P10 | **The Art of Failure / Half-Real** — Jesper Juul (2013/2005) | 실패는 게임의 본질적 매력(개선 동기). 단 *부당한* 실패는 이탈. | 로그라이크 영구사망의 정당화(디제시스 부활), "내 실수였다"는 납득. §03 StS2 리뷰폭탄(RNG 부당감). |
| P11 | **Player types** — Bartle (1996), 확장(Quantic Foundry 동기 모델) | Achiever·Explorer·Socializer·Killer. 동기 다양성. | **주 타겟 동기 1순위**를 못 정하면 컨셉이 산만. (Explorer=Discovery, Socializer=Fellowship…) |
| P12 | **Toy-first / Possibility space** — Will Wright, Sims·SimCity 계보 | 먼저 "만지면 즐거운 장난감"을 만들고 그 위에 목표(게임)를 얹는다. | **"목표를 빼도 만지는 게 즐거운가?"** 컨셉의 코어 동사(verb)가 그 자체로 쾌감인지 검사. |
| P13 | **디스커버러빌리티(시장 이론)** — Chris Zukowski "How to Market a Game"; GameDiscoverCo (Simon Carless) | 스팀 알고리즘·위시리스트·캡슐(썸네일)이 운명을 가른다. "한 장의 스크린샷으로 장르·후크가 읽혀야." | **"캡슐 1장 + 1문장으로 팔리는가"** 테스트. 안 읽히는 컨셉은 마케팅비로 못 메운다. |
| P14 | **8 Domains of Play / 5 Reasons** — Jason VandenBerghe "Engines of Play"; Quantic Foundry | 플레이 동기를 다축으로 측정. 장르별 핵심 동기 클러스터 존재. | **동기 좌표**로 타겟층을 표현(예: "전략+몰입형, 액션 회피층"). |
| P15 | **Postmortem 전통** — Game Developer(구 Gamasutra) 포스트모템, GDC 강연 | 실패 원인의 사후 공개 문화. 반복 패턴: 스코프/피처 크립, 정체성 부재, 잘못된 타이밍. | **사전 포스트모템(premortem)**: "1년 뒤 이 게임이 망했다면 이유는?"을 컨셉 단계에 적는다. |

> **종합:** 위 15개는 결국 4개 질문으로 압축된다 — **(1) 무슨 감정을 파는가(P1·P3·P11)? (2) 코어 루프·결정이 명확한가(P6·P9·P12)? (3) 한눈에 읽히고 차별되는가(P13)? (4) 어떻게 망할 수 있는가(P10·P15)?** §01 템플릿과 §04 루브릭은 이 4질문의 구체화다.

---

## 3. 56개 사례 횡단 분석 — 15대 컨셉 인사이트

> 각 인사이트: **명제 → 근거 사례(성공/실패) → 컨셉 기획 적용**. (사례 상세는 §02·§03.)

### A. 차별화 — "입장료"

**I1. "X + 친숙한 게임필" 공식이 성공작을 지배한다.**
거의 모든 인디 대박은 *검증된 코어 루프 위에 두 번째 친숙한 게임필을 접붙였다*.
- 근거(성공): Balatro=덱빌더+**포커**, Inscryption=덱빌더+**탈출방/메타호러**, Monster Train=덱빌더+**타워디펜스(수직 레인)**, Vampire Survivors=서바이벌+**뱀파이어물 클리커**, Hades=액션로그라이크+**연애/관계 서사**, Palworld=오픈서바이벌+**"몬스터+총"**, Loop Hero=오토배틀+**카드배치**.
- 근거(실패): 정체성이 "그냥 또 하나의 X"였던 라이브서비스들(§I9).
- **적용:** 컨셉서 1행에 **"우리 = A + B"**가 없으면 차별화 미달. 단 B는 *낯선 장르가 아니라 누구나 아는 게임필*이어야 가독성이 산다(P13).

**I2. 차별화 축은 "메커닉"이지 "테마"가 아니다 — 단, 테마가 마케팅 후크다.**
- 근거: 드래곤·해적 *테마*만 바꾼 카드게임은 흔해도(Dragon Eclipse 61%), Cobalt Core(96%)는 **함선 위치 전투**라는 메커닉 축으로 차별했다. 반대로 메커닉이 같아도 강한 테마는 위시리스트를 모은다.
- **적용:** §01 §5(차별화)는 *메커닉 1개로 수렴*시키고, 테마는 §3(세계관)·§8(비주얼)에서 마케팅 후크로 다룬다. 둘을 혼동하면 "테마만 갈아끼운 클론"이 된다.

### B. 가독성 — "바이럴의 조건"

**I3. 30초/한 장 가독성: 데모 영상 30초 또는 스크린샷 1장에서 후크가 안 읽히면 죽는다.**
- 근거(성공): Vampire Survivors(화면 가득 적+레벨업), Balatro(점수 폭주 숫자), Peglin(공 떨어지는 파친코) — *보기만 해도 이해*.
- 근거(실패): Concord(개성 없는 히어로 셀렉트 화면, 무료가 아닌 $40), The Day Before(트레일러와 실물 불일치).
- **적용:** §01 §9에 **"30초 데모 컷"**을 의무화. 글로 설명이 길어지는 컨셉은 가독성 미달.

**I4. 코어 동사(verb)가 그 자체로 쾌감이어야 한다(toy-first, P12).**
- 근거: Vampire Survivors의 "움직이며 자동공격", Balatro의 "족보 맞춰 점수 터뜨리기", Tetris 계보. 목표를 빼도 손맛이 있다.
- **적용:** §01 §4(핵심 루프)에서 "보상을 0으로 둬도 만지는 게 즐거운가?"를 자문.

### C. 감정·동기 — "왜 붙잡는가"

**I5. 컨셉은 미학(감정)에서 출발한다(P1).**
- 근거: Hades는 "관계가 깊어지는 따뜻함"(Fellowship/Narrative)을 코어로 두고 로그라이크 반복사망을 *서사 장치*로 흡수. StS2는 Co-op으로 Fellowship을 신규 미학으로 추가.
- **적용:** §01 §2(핵심 판타지)와 §11(MDA 미학)에서 **1순위 감정**을 못 적으면 반려.

**I6. SDT의 CAR(유능·자율·관계) 중 무엇을 채우는지가 리텐션을 결정한다(P3).**
- 근거(성공): 라이브서비스 장수작(Fortnite·Genshin·Helldivers 2)은 셋을 고루 충족(스킬 성장·빌드 자율·소셜). Hades=유능+자율, Among Us=관계.
- 근거(실패): Anthem·Avengers·Suicide Squad는 *루트 그라인드(유능감 가짜 충족)*만 있고 자율·관계가 빈약 → 엔드게임 붕괴.
- **적용:** §01 §12(메타·리텐션)에 CAR 3줄을 의무화.

### D. 스코프·타이밍 — "실행 리스크"

**I7. 라이브서비스 me-too는 가장 비싼 실패 패턴이다.**
- 근거(실패): Concord·Suicide Squad·Anthem·Avengers·Babylon's Fall·Redfall·Hyenas(취소)·Foamstars·XDefiant — *이미 포화된 GaaS 시장에 늦게, 차별 없이* 진입. 다수가 $100–200M급 손실.
- 근거(대조 성공): Helldivers 2·Marvel Rivals·Palworld는 *명확한 단일 후크*(협동 물량전 / 잘 만든 히어로슈터 / "몬스터+총+오픈월드")로 진입.
- **적용:** §04 레드플래그 1순위. "기존 라이브서비스 대비 *유저가 갈아탈 이유 1줄*"이 없으면 컨셉 중단.

**I8. 피처 크립 > 컨셉. 스코프가 컨셉의 선명함을 잡아먹는다.**
- 근거(실패): Anthem(방향 표류), The Day Before(허세 스코프), Skull and Bones(11년 표류). 
- 근거(성공): Vampire Survivors·Balatro·Lethal Company(솔로/소수 개발, *작고 날카로운* 스코프).
- **적용:** §01 §6(피처 적합)은 *현 엔진으로 담기는가*를 검사. 새 피처가 코어 후크를 흐리면 컷(repo CLAUDE.md "do none of these → cut").

**I9. 정체성 부재("그래서 이게 뭔데?")는 모든 실패의 공통분모다.**
- 근거: Concord·Crucible·Bleeding Edge·Battleborn·LawBreakers — 한 줄 후크로 요약이 안 됐다.
- **적용:** §01 §1(로그라인). *낯선 사람에게 1문장 후 "오 그거 해보고 싶다"가 안 나오면 반려.*

**I10. 타이밍·시장 포화는 컨셉 단계 리스크다.**
- 근거(실패): Battleborn(Overwatch 직전 출시), LawBreakers(히어로슈터 포화), Knockout City·Rumbleverse(F2P 경쟁 과열).
- **적용:** §01 §10(유사 사례)에서 *직접 경쟁작과 출시 시점*을 명시하고 "왜 지금/왜 우리"를 답한다.

### E. 결정·실패의 설계 — "장르 코어"

**I11. 흥미로운 결정 1개가 게임의 심장이다(P9).**
- 근거: 덱빌더=카드 선택의 기회비용, StS=Intent 보고 턴 계획, Into the Breach=완전정보 퍼즐.
- **적용:** §01 §5에 "가장 흥미로운 결정"을 한 줄 박아넣는다.

**I12. 실패는 공정해야 한다(P10) — RNG는 완화 레버와 함께.**
- 근거(경고): StS2 EA 리뷰폭탄(8만+ 부정, 한때 66%) — *과한 RNG/난이도 부당감*. 성공작도 컨셉 결함이 라이브 단계에서 터진다.
- **적용:** §04 가드레일 — "빌드 표현 보호·RNG 완화 레버·인카운터는 시험이지 무효화 금지."

### F. 비즈니스·운영 — "출시 너머"

**I13. 가변 보상은 양날: 발견의 쾌감 vs 착취.**
- 근거: 로그라이크의 절차적 보상(건전) ↔ 가챠/슬롯 도파민(CloverPit·슬롯물은 성공했으나 톤·윤리 리스크). StS2 가드레일 = "MTX 없음".
- **적용:** 컨셉 단계에서 *수익모델의 윤리선*을 명시(이 프로젝트는 프리미엄·무MTX).

**I14. 회생 아크는 컨셉이 옳았다는 증거다.**
- 근거(회생): No Man's Sky(2016 참사→수년 무료 업데이트로 회복), Cyberpunk 2077(2020 붕괴→2.0/Phantom Liberty로 회복), FFXIV(1.0 실패→A Realm Reborn 재출시).
- 교훈: **코어 컨셉(후크)은 견고했으나 *실행/스코프/출시 상태*가 죽였다.** 즉 컨셉≠실행. 컨셉이 빈약했던 Concord류는 회생도 못 했다(서비스 종료).
- **적용:** "컨셉이 좋아도 실행이 죽인다"는 §15로, "컨셉이 빈약하면 회생 불가"는 §I9로 — 둘 다 컨셉서가 막을 수 있는 건 후자뿐임을 인지.

**I15. 솔로/소수 개발 + 날카로운 후크 = 최고의 리스크조정 수익(인디).**
- 근거: Stardew Valley(1인), Balatro(1인 LocalThunk), Animal Well(1인 Billy Basso, ~120만 카피·$21.3M [M]), Lethal Company(1인), Vampire Survivors(소수). 
- **적용:** 이 프로젝트의 엔진 재사용 전략과 정합 — *엔진 상속 + 테마/후크 리스킨*으로 스코프를 통제(§02 인디 사례 참조).

---

## 4. 인사이트 → 템플릿/루브릭 매핑

| 인사이트 | 반영 위치 |
|---|---|
| I1·I2 X+Y, 메커닉 차별 | §01 §1·§5, §04 항목 5 |
| I3·I4 30초 가독성·toy-first | §01 §4·§9, §04 항목 9 |
| I5·I6 미학·CAR | §01 §2·§11·§12, §04 항목 2·11 |
| I7·I8·I9·I10 스코프·me-too·정체성·타이밍 | §01 §6·§10, §04 레드플래그 1–4 |
| I11·I12 결정·공정한 실패 | §01 §5, §04 가드레일 |
| I13·I14·I15 수익윤리·회생·스코프 | §01 §12, §04 레드플래그 5–8 |

---

## 참고문헌 (페이퍼·문헌)

- Hunicke, R., LeBlanc, M., Zubek, R. (2004). *MDA: A Formal Approach to Game Design and Game Research.* AAAI Workshop.
- Schell, J. (2008/2019). *The Art of Game Design: A Book of Lenses.* (Elemental Tetrad, Lenses)
- Ryan, R. M., Rigby, C. S., Przybylski, A. (2006). *The Motivational Pull of Video Games: A Self-Determination Theory Approach.* Motivation and Emotion 30(4). (PENS)
- Csikszentmihalyi, M. (1990). *Flow.* / Sweetser, P., Wyeth, P. (2005). *GameFlow: A Model for Evaluating Player Enjoyment in Games.* ACM CIE.
- Koster, R. (2004). *A Theory of Fun for Game Design.*
- Cook, D. (2012). *Loops and Arcs.* Lostgarden. / (2007) *The Chemistry of Game Design.*
- Eyal, N. (2014). *Hooked: How to Build Habit-Forming Products.*
- Salen, K., Zimmerman, E. (2004). *Rules of Play: Game Design Fundamentals.*
- Costikyan, G. (1994/2002). *I Have No Words & I Must Design.*
- Juul, J. (2005). *Half-Real.* / (2013) *The Art of Failure.*
- Bartle, R. (1996). *Hearts, Clubs, Diamonds, Spades: Players Who Suit MUDs.* / Quantic Foundry, *Gamer Motivation Model.*
- Zukowski, C. *How To Market A Game* (blog). / GameDiscoverCo (Simon Carless) newsletter.
- Game Developer (구 Gamasutra) Postmortems; GDC Vault postmortem talks.

> 시장 수치 출처(Concord·Balatro·Animal Well·Suicide Squad 등)는 §02·§03 각 사례의 인라인 태그와 〈출처〉 절에 단다.
