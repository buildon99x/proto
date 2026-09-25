# 유물왕(Relic King) 디자인 리뷰용 비교작 조사

작성일: 2026-09-23 · 조사 방식: WebSearch 검색 결과(제목·URL·요약 스니펫) 기반

## 0. 출처 처리 방식 (먼저 읽을 것)

- 이 환경에서는 **WebFetch와 curl이 egress 프록시에 막혀**(gamedeveloper.com, wikipedia.org, archive.org, substack, kongregate 전부 403) 원문 본문을 직접 열어보지 못했다. 그래서 아래 수치와 사실은 모두 **검색엔진이 해당 URL에서 뽑아준 요약 스니펫**을 근거로 한다. 스니펫 요약이 원문을 잘못 옮겼을 가능성이 있으므로, 결정에 영향을 주는 숫자는 링크를 열어 다시 확인하는 것이 좋다.
- 표기 규칙
  - `[URL]` = 해당 URL의 검색 스니펫에서 확인한 내용.
  - `(기억, 미검증)` = 조사자의 사전 지식. 이번 조사에서 출처를 찾지 못했다.
  - `(추정)` = 조사자의 분석이나 판단. 사실 주장이 아니다.
- SteamSpy·Gamalytic·VGI 같은 판매 "추정치"는 제3자 모델 값이다. 공식 발표와 구분해서 표기했다.

---

## 1. 요약: 유물왕에 바로 걸리는 교훈 7개

1. **3.5시간 무사건 구간 → "단계 전환(Stage)"과 "작은 무작위 사건"을 함께 써야 한다.** Universal Paperclips는 약 6–12시간짜리 한 판을 3개 단계로 나누고, 단계마다 UI와 목표를 통째로 바꾼다. Cookie Clicker는 5–15분마다 13초짜리 골든쿠키를 띄워 "가만히 있어도 뭔가 온다"는 느낌을 만든다. 유물왕에서 팁(T4 선점전)이 끊기는 구간은 이 두 장치가 모두 빠진 상태다. (§3.1, §3.3)
2. **140시간 엔딩은 이 장르의 "완결형" 성공작보다 한 자릿수 배 길다.** Paperclips 첫 클리어는 약 6–12시간, Gnorp Apologue는 약 8–20시간이다. Gnorp는 솔로 개발로 발매 후 약 한 달 만에 10만 장을 팔았다. "끝이 있는 짧은 인크리멘털"을 선호하는 층이 실제로 있다. (§3.1, §3.4)
3. **영구 손실은 플레이어가 고른 모드일 때 정당성이 생긴다.** XCOM Ironman은 선택 모드이고, 디렉터는 그것을 "최고의 형태"라고 부른다. 기본값이 아니다. 유물왕의 "선점전 패배 = 도감 영구 구멍"을 기본값으로 두면 FOMO와 손실회피를 이용한다는 비판(§4.4)에 그대로 걸린다. (추정) 권장: 기본은 "복구 경로 있음(재등장, 암시장, 고스트 라이벌 경유)", 영구는 "철인 모드"로 분리한다.
4. **실물 지식 콘텐츠는 "진짜/가짜 판별"이 가장 강한 게임화다.** 동물의 숲의 미술품 43점은 전부 실제 작품이고, 여우(여욱) 상점은 진품과 위작을 섞어 판다. 위작은 기증도 판매도 되지 않는다. 유물왕에는 이미 감정과 암시장이 있으므로 비용 대비 효과가 가장 큰 차용 지점이다. (§3.6)
5. **도감 보상은 "개수 임계점 → 새 시스템 해금"으로 줘야 수집이 동력이 된다.** Stardew Valley는 기증 60개에 하수도 열쇠, 95개(전체)에 스타드롭을 준다. 동물의 숲은 기증 60개에 미술관 해금이 열린다. 유물왕의 1,900종 도감에도 중간 임계점마다 새 시스템을 거는 편이 좋다. (§3.6, §3.7)
6. **관리 조작량 → Melvor나 Kittens처럼 "자동화 자체를 해금 보상"으로 준다.** Kittens Game의 설계 원칙 "모든 해결책은 새 문제를 만들어야 한다"와 "처음엔 어렵게, 나중에 업그레이드로 해결"은 조작량을 단계적으로 덜어주는 틀로 쓸 수 있다. (§3.5)
7. **귀환 이유는 "시계(clock)"로 만들고, 시계 간격을 지수적으로 늘린다.** Eric Guan의 원칙에 따르면 플레이어 관여는 자연히 감쇠하므로, 재방문 주기도 30분 → 5시간처럼 점점 늘려 맞춘다. 알림 없이도 "가득 참"이 귀환 이유가 된다. 반면 Travel Frog는 DAU가 약 2개월 만에 2,160만에서 360만으로 떨어졌다. 귀환 이유가 한 가지뿐인 방치형은 빠르게 식는다. (§2, §3.8)

---

## 2. 장르 일반 연구 (방치형·인크리멘털 설계)

### 2.1 Anthony Pecorella (Kongregate) 강연과 글
- GDC 2015 「Idle Games: The Mechanics and Monetization of Self-Playing Games」: 코어 루프와 메타 루프를 분석하고, 방치형의 리텐션이 왜 "비정상적으로 높은지" 다뤘다. 2015년 Kongregate에서 방치형은 리텐션이 가장 좋고 가장 많이 플레이되는 장르 중 하나였다. 다룬 게임은 Make It Rain, Bitcoin Billionaire, Clicker Heroes, AdVenture Capitalist. [https://www.gdcvault.com/play/1022065/Idle-Games-The-Mechanics-and] [https://blog.kongregate.com/idle-games-mechanics-and-monetization-of-self-playing-games/] [https://archive.org/details/GDC2015Pecorella]
  - 과금 기법 목록: 캐시 투입, 타임워프, 속도 배수, 즉시 프레스티지, 부정적 이벤트 방지권, 가챠, 이벤트 재화, 보상형 광고. [https://www.slideshare.net/slideshow/idle-games-gdc2015final/45563367]
  - 유물왕은 과금이 없는 게임이다. 이 목록은 "무과금 게임에서는 **어떤 병목을 풀어주지 말아야 할지**"를 보여주는 역목록으로 쓰면 된다. 예를 들어 타임워프를 과금 없이 주면 기다림의 가치가 무너진다. (추정)
- GDC Europe 2016 「Quest for Progress: The Math and Design of Idle Games」: 미적분이 조금 나오는 설계·수학 강연이다. 본인이 "데이터·과금 강연이 아니다"라고 밝혔다. 평가 96% 긍정. [https://www.gdcvault.com/play/1023876/Quest-for-Progress-The-Math] [https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf] [https://archive.org/details/GDCEU2016Pecorella]
  - 같은 강연의 워크시트: 여러 성장 시스템의 공식과 반복 모델. 프레스티지 파트는 "배수를 조정해 프레스티지 주기를 어떻게 바꿀 수 있는가"를 모델링한다. [https://archive.org/details/idlegameworksheets]
- 「The Math of Idle Games」 3부작 (Game Developer)
  - Part I: 업그레이드 비용은 지수적으로 오르고, 배수 업그레이드가 그 속도를 상쇄하며 "작은 승리(bump)"를 만든다. [https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i]
  - Part II: 도함수 기반 성장처럼 다른 성장 방식을 다룬다. [https://www.gamedeveloper.com/game-platforms/the-math-of-idle-games-part-ii]
  - Part III: 프레스티지 주기와 균형. 예시 공식으로 `floor(sqrt(max/1e12))`처럼 루트나 로그를 쓴다. [https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii]
  - 비용 성장률 1.07–1.15 같은 구체 상수는 스니펫에서 확인하지 못했다. 흔히 인용되는 AdVenture Capitalist의 1.07 계열 값은 (기억, 미검증).
- **유물왕 적용 (추정)**: 유물왕의 "순자산이 평탄해지는 구간"은 Part I이 말하는 "지수 비용이 선형·다항 생산을 추월하는 벽"에 해당한다. 보통 이 벽 직전에 배수 업그레이드(bump)를 두거나 프레스티지 해금을 연다. 유물왕에는 프레스티지가 없다. 대신 **시즌이 프레스티지 역할을 할 수 있는지**가 핵심 질문이다.

### 2.2 학술 연구
- Alharthi 외, 「Playing to Wait: A Taxonomy of Idle Games」, CHI 2018. 방치형 66개와 비방치형 10개를 근거이론(grounded theory)으로 분석했다. 분석 차원은 보상, 상호작용성, 진행 속도, UI. 결론은 방치형이 플레이어를 "플레이에서 **계획**으로" 옮긴다는 것이다. [https://dl.acm.org/doi/10.1145/3173574.3174195] [https://research.monash.edu/en/publications/playing-to-wait-a-taxonomy-of-idle-games/]
- 후속 연구: 「"It Started as a Joke": On the Design of Idle Games」(CHI PLAY 2019). [https://dl.acm.org/doi/10.1145/3311350.3347180] 내용은 스니펫에 없었다. 개발자 인터뷰 기반 연구로 알고 있다 (기억, 미검증).
- **유물왕 적용 (추정)**: "계획으로의 이동"이 곧 유물왕의 관리 레이어다. 문제는 계획할 대상, 즉 결정이 없는데 조작만 남는 구간이다. 조작량 지표 대신 "시간당 의미 있는 결정 수"를 측정하는 편이 맞다.

### 2.3 설계 원칙 글과 벤치마크
- Eric Guan, 「Idle Game Design Principles」: 재방문을 유도하는 여러 "시계"를 둔다. 예: 생산물 30분마다 1개, 최대 10개. 5시간이면 가득 차서 생산이 멈추므로 최소 5시간마다 돌아오게 된다. **시계들의 최적 대기 시간이 지수적으로 길어지게** 해서, 자연히 감쇠하는 관여도에 맞춘다. [https://ericguan.substack.com/p/idle-game-design-principles]
- 관여 감쇠 패턴: 초반에는 15–60분 연속 플레이하고, 이후 매시간 확인에서 결국 주 1회 확인으로 줄어든다. 흔한 실패는 "초반엔 업그레이드를 기계적으로 연타, 후반엔 할 게 없는 기다림"이다. [https://ericguan.substack.com/p/idle-game-design-principles] [https://itch.io/post/9091246]
- 오프라인 진행: 부재 중에도 보상이 쌓여야 한다. 너무 적으면 돌아올 이유가 없고, 너무 많으면 재화 가치가 무너진다. [https://machinations.io/articles/idle-games-and-how-to-design-them]
- GameAnalytics 모바일 방치형 벤치마크(2020): D1 리텐션 상위 10% 45.55%, 상위 25% 39.40%. DAU/MAU 18%(하이퍼캐주얼 10.5%). 하루 5.3세션, 평균 세션 약 8분. [https://gameworldobserver.com/2020/12/22/gameanalytics-names-benchmark-engagement-metrics-idle-games]
  - 유물왕은 웹 무과금 게임이라 이 수치와 직접 비교하긴 어렵다. 다만 "세션 8분 × 하루 5회"라는 리듬은 선점전 길이 60–150초를 정할 때 참고가 된다. 선점전은 한 세션 안에 끝나는 길이다. (추정)

---

## 3. 비교작 상세 (9편 + 경계 사례)

선정 기준: 소규모 팀이나 솔로 개발 성공작을 우선했고, 유물왕의 문제 5축(초반 훅·무사건 구간·엔딩 길이·조작량·영구손실)에 직접 걸리는 게임을 골랐다. AAA는 "아이디어만 참고"로 표시했다.

| # | 게임 | 축 | 팀 규모 | 이식성 |
|---|---|---|---|---|
| 3.1 | Universal Paperclips | 1, 5 | 사실상 1인(+2) | 매우 높음 |
| 3.2 | A Dark Room (+Candy Box) | 1, 5 | 1–2인 | 매우 높음 |
| 3.3 | Cookie Clicker | 1, 4 | 1–2인 | 높음 |
| 3.4 | (the) Gnorp Apologue | 1, 5 | 1인 | 높음 |
| 3.5 | Melvor Idle / Kittens Game | 1 (조작량) | 1인 | 높음 |
| 3.6 | 동물의 숲: 모여봐요 박물관·여욱 | 2, 3 | AAA | 아이디어만 |
| 3.7 | Stardew Valley 박물관 | 2 | 1인 | 높음 |
| 3.8 | Neko Atsume / Travel Frog | 2, 귀환, 경고 | 소규모 스튜디오 | 중간 |
| 3.9 | Papers, Please / Reigns | 4, 5 | 1인 / 약 10인 | 중간–높음 |
| 경고 A | Clicker Heroes 2 | 실패 | 소규모 | 교훈 |
| 경고 B | NGU Idle 후반부 | 쇠퇴 구간 | 1인 | 교훈 |
| 보조 | Dark Souls·Trackmania·Death Stranding·XCOM | 4 (비동기·영구성) | AAA | 아이디어만 |

---

### 3.1 Universal Paperclips (2017, Frank Lantz)

**(a) 선정 이유, 축.** 축 1(페이싱)과 축 5(텍스트 서사 아크). 정적 웹페이지 하나로 만든 인크리멘털 게임에 **끝이 있는 서사**를 붙여 성공했다. 유물왕과 형식이 가장 비슷하다.

**사실 확인**
- 2017년 10월 9일 출시. 브라우저, iOS, Android. 개발은 Frank Lantz, 협력은 Bennett Foddy와 Hilary Lantz. [https://en.wikipedia.org/wiki/Universal_Paperclips] [https://gamefaqs.gamespot.com/iphone/227764-universal-paperclips/data]
- 출시 첫 11일 동안 45만 명이 플레이했고 대부분 끝까지 갔다(Wired 인용). [https://en.wikipedia.org/wiki/Universal_Paperclips]
- 누적 200만 명 이상. [https://www.franklantz.net/universal-paperclips]
- 한 판 길이: 첫 클리어 약 6–12시간 이상. 플레이어 기록 6시간 13분, 7시간 15분 등. 스피드런 1:40:05. [https://news.ycombinator.com/item?id=24389655] [https://www.quora.com/How-long-does-the-universal-paperclip-game-take]
- 단계 구조: 3단계로 나뉜다. 1단계는 자금과 수요 관리, 2단계는 전력 생산과 소비, 3단계는 우주 탐사와 드론 수명주기 관리. 1단계는 "Release the HypnoDrones" 프로젝트로 끝나고 2단계가 시작된다. [https://universalpaperclips.fandom.com/wiki/Stages] [https://universalpaperclips.fandom.com/wiki/Release_the_HypnoDrones]
- 초반 루프: 가격과 수요가 반비례한다(초반 적정가 약 $0.10). 클립 2,000개에서 Trust가 생기고 프로세서와 메모리에 투자하며, Trust 프로젝트가 순차 해금된다. [https://universalpaperclips.fandom.com/wiki/Price_Per_Clip] [https://universalpaperclips.fandom.com/wiki/Trust]
- 소리는 약 5시간째가 되어서야 처음 난다는 리뷰가 있다. 연출 절제를 보여주는 사례다. [https://medium.com/the-strange-games-review/universal-paperclips-is-a-silent-game-until-about-5-hours-in-67412299de26]

**(b) 강점을 만드는 메커닉.**
- **단계가 바뀔 때 기존 자원과 지표가 무의미해진다.** 예를 들어 1단계의 "돈"은 2단계에서 사라진다. 그래서 곡선이 평탄해질 무렵 게임 자체가 바뀐다. 무사건 구간을 확장 대신 "교체"로 없앤다. (Stages 위키 기반 해석, 추정)
- 가격 슬라이더처럼 한 손으로 조작하는 **결정 하나**가 경제 전체를 움직인다. 조작 수는 적고 결정의 밀도는 높다.
- 서사는 UI 문구와 프로젝트 이름으로만 전달된다. 따로 만든 컷신이 없다.

**(c) 의존 자원, 이식성.** 텍스트와 HTML 버튼만으로 만들었고 아트가 없다. 라이브 운영도 없다. **솔로 정적 웹 게임에 100% 이식 가능하다.** Lantz의 게임 디자인 명성과 AI 정렬 담론이라는 시의성이 초기 확산을 도왔을 수 있다 (추정).

**(d) 유물왕에 가장 중요한 교훈.** 3.5시간 지점을 **1단계에서 2단계로 넘어가는 전환점**으로 설계하라. 예: "개인 발굴가 → 재단·박물관 운영자"로 넘어가며 주 지표를 바꾼다(순자산 → 소장 명성 또는 방문객 수). 이 시점에 선점전 팁을 다시 공급할 수단도 새로 열린다. **충돌:** 유물왕은 순자산을 점수로 쓰는 동시에 화폐로 쓴다. Paperclips 식으로 지표를 교체하면 이 핵심 긴장이 단계마다 다시 정의되어야 한다. 교체하되 "판매할 때마다 순위가 떨어진다"는 긴장은 단계를 넘어 유지해야 한다.

---

### 3.2 A Dark Room (2013, Doublespeak Games / Michael Townsend) + Candy Box! (2013, aniwey)

**(a) 선정 이유, 축.** 축 1(첫 화면 훅, 점진적 UI 공개)과 축 5(텍스트만으로 만든 드라마).

**사실 확인**
- 2013년 6월 10일 웹으로 출시. 제작자 Michael Townsend. Candy Box를 약 10분 해보고 서사를 더 밀고 싶어져서 만들었다. [https://en.wikipedia.org/wiki/A_Dark_Room] [https://mediacommons.org/imr/2017/04/18/lighting-fire-dark-room]
- 첫 화면에는 "the fire is dead", "the room is freezing" 두 줄과 "light fire" 버튼 하나만 있다. [https://mediacommons.org/imr/2017/04/18/lighting-fire-dark-room]
- iOS판(Amir Rajan 이식): 출시 직후 하루 80다운로드 수준이었다가 약 5개월 뒤 영국에서 하루 2만 다운로드로 1위에 올랐고, 이후 미국 1위. [https://www.utdallas.edu/news/2014/8/7-31041_Alumnus-Finds-Bright-Side-of-Success-with-Dark-Roo-_story-wide.html] [https://cultofmac.com/277035/dark-room-iphone-top-paid-game]
- 2년 동안 226만 다운로드. 첫 12개월 유료 구매 773,933명. 총매출 $697,270, Rajan 순익 $191,810. 광고나 피처드 없이 미국 유료 1위를 18일 유지했다. [https://www.gamedeveloper.com/business/a-two-year-look-at-the-sales-of-chart-topping-ios-title-i-a-dark-room-i-] [https://www.pocketgamer.com/a-dark-room/the-co-creator-of-top-selling-ios-game-a-dark-room-shares-its-sales-numbers-and/]
- Candy Box!: 2013년 4월 출시. 19세 프랑스 학생 aniwey가 ASCII 아트로 만들었다. 시작 화면은 저장 버튼과 사탕 카운터뿐이다. 제작자 말로는 "처음엔 아무것도 없다가 자라나는 것"이 가장 좋아하는 부분이고, 완전히 의도한 것이다. [https://en.wikipedia.org/wiki/Candy_Box!] [https://kotaku.com/candy-box-a-game-thats-simple-sweet-and-strangely-c-492318079]

**(b) 강점을 만드는 메커닉.** **UI 자체가 보상**이다. 새 버튼, 새 탭, 새 지역이 나타나는 것이 곧 진행이다. 그래서 숫자 곡선이 평평해도 "다음에 뭐가 열릴까"가 동기로 남는다. 텍스트 톤이 차갑고 짧아서 여백이 상상력을 끌어낸다. 마트료시카를 거꾸로 여는 구조라는 평이 있다. [https://mediacommons.org/imr/2017/04/18/lighting-fire-dark-room]

**(c) 의존 자원, 이식성.** 텍스트와 ASCII만 쓴다. 1–2인 개발에 서버가 없다. **완전히 이식 가능하다.** 다만 iOS에서의 성공은 원인이 불명확하다. 개발자 스스로 언론 노출과 판매 사이의 상관을 찾지 못했다. [https://en.wikipedia.org/wiki/A_Dark_Room]

**(d) 유물왕 교훈.** 유물왕은 처음부터 시스템이 많다(발굴지, 원정, 직원, 감정, 창고, 박물관, 경매, 암시장, 도난, 시즌, 고스트). **처음 한 시간에는 절반 이상을 숨기고**, 각 시스템이 처음 열리는 순간을 "사건"으로 만들라. 공개 순서를 무사건 구간 뒤쪽에 배치하면 3.5시간 이후의 빈 구간을 "새 탭 열림"으로 메울 수 있다. **충돌:** 유물왕은 "규칙과 확률 전면 공개"를 원칙으로 한다. A Dark Room은 미지 자체를 동력으로 쓴다. 해결책은 "열린 시스템의 규칙은 전면 공개하고, **아직 열리지 않은 시스템의 존재만** 숨기는 것"이다. 이 둘은 양립 가능하다. (추정)

---

### 3.3 Cookie Clicker (2013, Orteil / DashNet)

**(a) 선정 이유, 축.** 축 1(장기 꼬리, 프레스티지, 오프라인)과 축 4(짧은 기회 창과 시즌 이벤트).

**사실 확인**
- 2013년 8월 8일, Julien "Orteil" Thiennot가 하룻저녁에 만들어 4chan에 올렸고 몇 시간 만에 5만 명이 플레이했다. [https://en.wikipedia.org/wiki/Cookie_Clicker]
- Steam판은 2021년 9월 1일 출시. 추정 판매 약 260만 장, 추정 총매출 약 $1,020만(제3자 추정치). [https://app.sensortower.com/vgi/game/cookie-clicker] [https://store.steampowered.com/app/1454400/Cookie_Clicker/]
- 골든쿠키: 화면의 무작위 위치에 나타나 약 13초 동안 커지고 맥동하다 사라진다. 클릭하면 Frenzy(CpS 배수)나 Lucky(큰 일시금) 같은 무작위 보상을 준다. [https://cookieclicker.wiki.gg/wiki/Golden_Cookie]
- 기본 출현 간격은 5–15분이다(최소 5분). Lucky Day와 Serendipity 업그레이드가 각각 간격을 절반으로 줄인다. [https://cookieclicker.fandom.com/wiki/Golden_Cookie]
- 오프라인 생산: 천상 업그레이드 "Twin Gates of Transcendence"를 사야 생긴다. 첫 1시간은 CpS의 5%, 이후 0.5%. [https://cookieclicker.wiki.gg/wiki/Offline_Cookie_Production]
- 프레스티지: 천상 칩은 누적 쿠키의 **세제곱근**에 비례한다. 그래서 긴 판이 불균형하게 더 많이 보상받는다. [https://cookieclickernew.com/blog/cookie-clicker-prestige-system-explained-heavenly-chips-ascend-and-legacy-upgrades/]
- 시즌: 할로윈, 크리스마스, 발렌타인, 만우절, 부활절에 대형 업데이트와 이벤트가 있다. [https://en.wikipedia.org/wiki/Cookie_Clicker]

**(b) 강점을 만드는 메커닉.**
- **골든쿠키는 저위험·고빈도 "팁"이다.** 놓쳐도 영구 손실이 없고 다음 쿠키가 5–15분 뒤에 온다. 그래서 탭을 켜 둔 플레이어에게 늘 "곧 뭔가 온다"는 기대를 주면서도 FOMO 비난을 받지 않는다. (추정)
- 오프라인 진행을 **처음부터 주지 않고 해금 보상으로** 만들었고, 효율에 상한이 있다. 오프라인이 온라인을 대체하지 못한다.

**(c) 의존 자원, 이식성.** 초기에는 1인, 이후 Opti와 2인 체제 (기억, 미검증). 아트는 단순한 2D이고 웹 네이티브다. 시즌 이벤트는 실제 날짜 기반이라 서버 없이 구현할 수 있다. **이식 가능하다.**

**(d) 유물왕 교훈.** 유물왕의 T4 선점전은 **고위험·저빈도** 사건이다. 무사건 구간이 생기는 직접 원인은 그 사이를 메우는 **저위험·고빈도 층이 없다는 것**이다. 골든쿠키에 해당하는 것을 넣어라. 예: 5–15분 간격의 "현장 소문" 알림으로, 60초 안에 누르면 T1–T2 보너스 발굴이나 감정 할인을 준다. 놓쳐도 손실은 없다. 그리고 T4 팁은 이 층 위에 드물게 얹는다. **충돌:** 유물은 "실물 개체 수"로 등급을 매긴다. 저위험 사건이 T4 희소성을 희석해서는 안 된다. 저위험 층은 유물 자체 대신 **시간과 비용 보너스**로 줘라.

---

### 3.4 (the) Gnorp Apologue (2023, Myco, 솔로)

**(a) 선정 이유, 축.** 축 1(**끝이 있는** 인크리멘털)과 축 5(주스, 시각 피드백). 최근의 솔로 개발 상업 성공 사례다.

**사실 확인**
- 노르웨이의 솔로 개발자 Myco가 만들었다. 여자친구를 위한 장난감 게임으로 시작했고, 개발하면서 Rust를 배웠다. [https://newsletter.gamediscover.co/p/how-this-solo-dev-incremental-game]
- 2023년 12월 Steam 신작 판매량 4위(GameDiscoverCo 데이터), 가격 $7. 2024년 1월 6일 10만 장 돌파를 발표했다. [https://newsletter.gamediscover.co/p/how-this-solo-dev-incremental-game] [https://gnorp.dev/news/11-100k-Players/]
- Steam 사용자 리뷰 7,391개 중 95% 긍정(검색 시점 기준). [https://steamcommunity.com/app/1473350/reviews/]
- 명확한 목표가 있다. 10번째 압축(compression) 이벤트에 도달하면 끝난다. 플레이 시간은 약 8–10시간이고, 방치를 포함하면 14.5–21시간이라는 보고가 있다. [https://gameplay.tips/guides/the-gnorp-apologue-compression-10-end-guide-17-talents-short-easy-simple.html] [https://steamcommunity.com/app/1473350/discussions/0/4038104133466644335/]
- 평론 인용: "기계적 깊이가 꾸준히 늘어나 실제로 투자한 결정을 하게 만든다… 자원 축적 시간이 절묘하게 맞춰져 있다… 깔끔하고 단순하며 매우 촉각적인 인터페이스." "짧은 인크리멘털"을 좋아하는 층이 있다. [https://newsletter.gamediscover.co/p/how-this-solo-dev-incremental-game]

**(b) 강점을 만드는 메커닉.** 숫자가 늘면 화면의 작은 캐릭터(gnorp)와 오브젝트가 **실제로 늘어난다.** 성장이 숫자와 그림으로 동시에 보인다. 명시적 종착점(10번째 압축)이 있어서 "언제 끝나?"에 대한 불안이 없다.

**(c) 의존 자원, 이식성.** 솔로 개발에 픽셀과 벡터 아트, 데스크톱 네이티브(Rust). 웹 이식 자체는 무관하다. 핵심인 "성장의 시각화"는 픽셀 아트로 구현 가능하다. **대부분 이식 가능하다.**

**(d) 유물왕 교훈.** 140시간 엔딩은 이 장르 완결형의 약 7–15배다. **메인 엔딩을 약 10–20시간으로 당기고**, 1,900종 도감 완성은 엔딩 이후의 선택 목표로 분리하는 방안을 검토하라. 추가로, 순자산 증가가 **박물관 픽셀 화면에 전시물과 관람객 수로 보이게** 하라. **충돌:** 유물왕은 실물 1,900종이 콘텐츠의 전부다. 짧은 엔딩으로는 대부분을 보지 못하고 끝난다. 해결 방향은 "엔딩 = 특정 컬렉션(예: 한 문명 세트) 완성"처럼 부분 목표로 두는 것이다. (추정)

---

### 3.5 Melvor Idle (2019 조기 접근~, Games by Malcs) + Kittens Game (bloodrizer)

**(a) 선정 이유, 축.** 축 1 중 **관리 조작량**. 유물왕처럼 시스템이 많은 방치형을 솔로가 어떻게 버티게 만드는지 본다.

**사실 확인 (Melvor)**
- 호주의 솔로 개발자 Brendan Malcolm(Games by Malcs)이 만들었고, 독학으로 코딩을 배웠다. RuneScape의 스킬 구조를 방치형으로 압축했다. [https://www.mmorpg.com/interviews/interview-digging-deep-into-melvor-idle-with-its-creator-brendan-malcolm-2000123838] [https://www.pocketgamer.biz/jagex-partners-publish-runescape-inspired-melvor-idle/]
- 조기 접근 기간에만 Steam, App Store, Google Play 합산 60만 다운로드. 2021년 Jagex Partners로 퍼블리싱 계약. [https://www.jagex.com/news/jagex-announces-partnership-to-publish-melvor-idle]
- 정식 출시 2021년 11월 18일. Steam 리뷰 약 92% 긍정. SteamSpy 추정 소유자 50만–100만. [https://store.steampowered.com/app/1267910/Melvor_Idle/] [https://steamspy.com/app/1267910]
- 스킬 하나만 방치로 돌리고, 나머지는 사용자가 전환한다 (기억, 미검증). 이 구조가 조작량을 제한한다.

**사실 확인 (Kittens Game)**
- 텍스트 기반 반방치형 마을 경영 게임이다. 초반이 매우 느리고, 업그레이드 우선순위를 신경 쓰지 않으면 오래 정체한다. [https://jayisgames.com/review/kittens-game.php] [https://www.kongregate.com/en/games/bloodrizer/kittens-game]
- 코드 저장소에 적힌 설계 원칙: "능동 플레이는 장려하되 필수는 아니게", "모든 병목은 여러 방법으로 풀 수 있게", **"모든 해결책은 새 문제를 만들어야 한다"**, "처음엔 어렵게 만들고 나중에 업그레이드로 해결", "절대 너프하지 마라", "후반 스케일을 고려하라(희귀 자원 100만 개면 누군가는 조 단위로 농사짓는다)". [https://github.com/nuclear-unicorn/kittensgame] [https://github.com/SilenceFactor/kittensgame]

**(b) 강점을 만드는 메커닉.** Kittens는 **조작량이 많은 상태를 "문제"로 먼저 제시한 뒤, 자동화를 "해결책"으로 해금한다.** 그 해결책이 다시 새 병목을 낳는다(원칙 3·4). Melvor는 동시 진행을 제한해서 "무엇을 돌릴지"라는 결정 하나로 조작을 압축한다.

**(c) 의존 자원, 이식성.** 둘 다 솔로 개발이고 아이콘 수준의 아트다. Kittens는 웹 네이티브다. **이식 가능하다.** Melvor는 RuneScape라는 IP 친숙도에 기댄 부분이 있다 (추정).

**(d) 유물왕 교훈.** 측정된 "관리 조작량 과다"를 없애야 할 결함으로만 보지 말고, **해금 보상의 재료**로 재설계하라. 예: 창고 보존 열화를 처음엔 수동 관리하게 하고, 수석 보존관 직원을 고용하면 자동화한다. 그 대신 급여 부담이라는 새 문제가 생긴다. **충돌:** Kittens의 느린 초반은 유물왕의 "첫 10시간 페이싱 문제"를 악화시키는 방향이다. 자동화 해금은 **첫 1–2시간 안에 한 번은** 경험하게 해야 한다. (추정)

---

### 3.6 동물의 숲: 모여봐요 (2020, Nintendo) — 박물관·부엉(Blathers)·여욱(Redd)

**(a) 선정 이유, 축.** 축 2(도감 만족감)와 축 3(실물 지식 콘텐츠). **AAA이므로 아이디어만 참고한다.**

**사실 확인**
- 누적 판매 5,029만 장(2026년 6월 30일 기준), Switch 역대 판매 2위. [https://en.wikipedia.org/wiki/List_of_best-selling_Nintendo_Switch_video_games]
- 화석 73종 내외. 감정한 뒤 기증하면 연대기 순으로 배치된 전시실 3곳에 놓이고, 바닥 동선이 생명의 진화사를 따른다. [https://www.nintendolife.com/guides/animal-crossing-new-horizons-fossils-complete-fossil-list-and-dinosaur-guide] [https://www.playthepast.org/?p=6880]
- 미술품 43점은 모두 실제 전 세계 미술관 소장품이다. [https://nookipedia.com/wiki/Famous_painting]
- 여욱은 진품과 위작을 섞어 판다. 가격은 4,980벨 균일. 위작은 부엉이 기증을 거부하고 상점에도 팔 수 없다. 위작마다 진품과 **눈에 보이는 차이 하나**가 있다. 예: 모나리자 위작은 눈썹이 살짝 올라가 있다. [https://animalcrossingworld.com/guides/new-horizons/jolly-redds-art-real-genuine-vs-fake-forgery-cheat-sheet/] [https://nookipedia.com/wiki/Item:Famous_painting_(New_Horizons)]
- 박물관에 **60점을 기증**하면 부엉이 미술품 수집에 관심을 보인다. 이것이 미술관 확장의 트리거다. [https://www.inverse.com/gaming/animal-crossing-new-horizons-real-fake-art-redd-painting-sculpture]
- 위작 판별은 실제 미술 전문가도 헷갈릴 수 있다는 기사가 있다. [https://news.artnet.com/art-world/animal-crossing-forged-art-spotting-1848198]
- 부엉이 해설이 실제 화석과 작품의 짧은 지식을 전달하고, 캐릭터의 열정이 교육적 가치를 가진다는 분석이 있다. [https://www.playthepast.org/?p=6880]

**(b) 강점을 만드는 메커닉.**
- **위작 판별 = 실물 지식이 곧 게임 스킬이 된다.** 원본을 알면 이득을 본다. 단, 가격이 균일하므로 손실은 한정적이다.
- 해설자 캐릭터(부엉이)의 목소리가 백과사전식 정보를 **개성 있는 문장**으로 바꾼다.
- 기증 개수 임계점(60)이 새 수집 카테고리를 연다.

**(c) 의존 자원, 이식성.** 대규모 팀, 3D, 모델링, IP 인지도가 필요하다. 그대로는 이식할 수 없다. 이식할 수 있는 것은 (1) 진위 판별 메커닉(2D 픽셀 차분 하나), (2) 해설 캐릭터의 짧은 문장 톤, (3) 임계점 해금이다.

**(d) 유물왕 교훈.** 유물왕의 감정과 암시장에 **"위작 섞임 + 시각 차이 1개 + 감정 스킬로 확률 공개"**를 붙이면 실물 지식과 확률 공개 원칙이 동시에 게임이 된다. 1,900종 설명은 긴 백과 문장이 아니라 **한 명의 큐레이터 NPC 목소리**로 1–2문장씩 줘라. **충돌:** 1,900종 모두에 위작 차분을 픽셀로 그리는 것은 솔로 개발로 불가능하다. T3–T4 등 상위 소수에만 적용하는 방안을 권한다. 또한 실물 유물의 위작을 묘사하면 박물관 소장품 이미지의 저작권과 초상 문제를 점검해야 한다 (추정).

---

### 3.7 Stardew Valley (2016, ConcernedApe) 박물관

**(a) 선정 이유, 축.** 축 2. 솔로 개발 게임 안의 **작은 박물관 서브시스템**이 도감 동기를 만드는 방식을 본다.

**사실 확인**
- 누적 4,100만 장 이상(2024년 12월). 그중 PC 2,600만, Switch 790만. 4년간 솔로 개발하며 음악, 아트, 프로그래밍, 디자인을 독학했다. [https://www.gamedeveloper.com/business/stardew-valley-sales-grew-to-over-41-million-by-2024-s-end] [https://www.gamesradar.com/games/simulation/cozy-farming-sim-stardew-valley-has-sold-over-41-million-copies-as-of-right-now-with-over-half-on-pc-and-almost-8-million-on-the-switch/]
- 기증 가능 품목 95개(광물 53, 유물 42). 60개에 하수도 열쇠, 95개에 스타드롭. 드워프 두루마리 4종을 모으면 드워프 번역서를 받아 NPC와 대화할 수 있게 된다. 전시 칸은 102개로 품목 수보다 많다. [https://stardewvalleywiki.com/Museum]

**(b) 강점을 만드는 메커닉.** 도감 보상이 **새 지역(하수도), 새 대화(드워프), 영구 스탯(스타드롭)** 같은 다른 시스템 해금으로 이어진다. 특정 세트(두루마리 4종)를 모으는 소목표가 전체 95개를 쪼개 준다. 플레이어가 전시 배치를 직접 정한다.

**(c) 의존 자원, 이식성.** 솔로 개발, 2D 픽셀. **그대로 이식할 수 있다.**

**(d) 유물왕 교훈.** 1,900종 도감을 **세트 단위**(예: "로제타석과 동시대 이집트 석비 5종")로 쪼개고, 세트를 완성할 때마다 새 발굴지, 새 원정 경로, 새 NPC 대화를 연다. 세트 완성 시점을 무사건 구간에 심을 수 있다. **충돌:** Stardew의 모든 품목은 결국 얻을 수 있다. 영구 결손이 없다. 유물왕은 T4를 영구 손실할 수 있으므로, **영구 손실 가능 품목을 세트 완성 조건에서 빼거나** 대체 경로를 두지 않으면 세트 시스템이 좌절 장치가 된다.

---

### 3.8 Neko Atsume (2014, Hit-Point) + Travel Frog/旅かえる (2017, Hit-Point) — 성공과 경고

**(a) 선정 이유, 축.** 축 2(희귀 개체 수집)와 "다크패턴 없는 귀환 이유". Travel Frog는 **빠르게 식은 경고 사례**다.

**사실 확인**
- Neko Atsume: 2014년 10월 20일 출시. 1,000만 다운로드 이상이라는 보도가 있고, 3,000만 이상이라는 자료도 있다(시점이 달라 수치가 다름). 희귀 고양이 22종. 특정 아이템을 두어야 찾아온다. [https://en.wikipedia.org/wiki/Neko_Atsume] [https://www.thecrimson.com/article/2016/2/2/neko-atsume/] [https://www.pocketgamer.com/neko-atsume/rare-cats-guide/]
- 먹이 타이머가 숨겨져 있고 보상이 이어져서 고양이가 꾸준히 오지만, 한꺼번에 다 보여주지 않아 재방문하게 만든다. 짧고 잦은 체크인이 기본 리듬이다. [https://alexiamandeville.medium.com/game-design-breakdown-the-simplicity-of-neko-atsume-a8616a937a47]
- Travel Frog: 2017년 11월 24일 출시. 개구리가 여행을 떠나 기념품과 사진을 보낸다. 2018년 1월 중국 App Store 다운로드 1위, 누적 3,000만 다운로드 이상(알리바바 자료). 중국 DAU는 2018년 2월 초 2,160만으로 정점을 찍고 3월 27일 360만으로 떨어졌다(Analysys). [https://en.wikipedia.org/wiki/Travel_Frog] [https://www.cnbc.com/2018/01/29/tabikaeru-a-mobile-game-about-a-traveling-frog-is-a-hit-in-china.html]

**(b) 강점을 만드는 메커닉.** **부재 중에 일이 일어나고, 돌아오면 결과를 발견한다.** 고양이의 방문과 개구리의 여행은 플레이어의 압박 없이 귀환 이유를 만든다. 희귀 개체는 "특정 조건을 준비하면 확률이 오른다" 구조라서 플레이어의 준비가 행운과 결합된다.

**(c) 의존 자원, 이식성.** 소규모 스튜디오이고 귀여운 2D 아트의 비중이 크다. 무사건 설계 자체는 이식 가능하다. 캐릭터 매력은 아트 품질에 의존한다.

**(d) 유물왕 교훈.** 유물왕의 **원정(이동 시간)**이 바로 Travel Frog의 여행 구조다. 원정에서 돌아올 때 "엽서/현장 일지" 한 장(짧은 텍스트와 픽셀 스냅샷)을 주면 귀환 보상이 된다. **경고:** Travel Frog는 **귀환 이유가 한 가지(개구리 확인)뿐이고 결정이 거의 없어서** 약 2개월 만에 DAU가 83% 줄었다 (해석, 추정). 유물왕은 결정 레이어(판매 vs 순위)가 있으므로 원정 결과가 반드시 결정을 요구하게 설계해야 한다. 예: "이 발굴품, 팔까 전시할까".

---

### 3.9 Papers, Please (2013, Lucas Pope) + Reigns (2016, Nerial)

**(a) 선정 이유, 축.** 축 5(작은 범위가 "완결"로 느껴지는 방식)와 축 4(되돌릴 수 없는 결정의 무게).

**사실 확인**
- Papers, Please: 2013년 8월 8일 출시. Lucas Pope가 프로그래밍, 아트, 음악을 혼자 맡아 약 6–9개월에 개발했다. 엔딩 20개 이상. 2023년 8월 기준 500만 장. IGF 대상(Seumas McNally), BAFTA 수상. [https://en.wikipedia.org/wiki/Papers,_Please] [https://www.gamingbible.com/features/lucas-pope-papers-please-return-of-the-obra-dinn-and-no-sequels-20220523]
- Reigns: 2016년 8월 11일 출시(Devolver). 틴더식 좌우 스와이프로 조작한다. 한 달여 만에 60만 장, 2016년 12월 100만 장. 10주년에 누적 플레이어 400만 명 이상. 카드 750장 중 발견한 수, 사망 수, 만난 인물 초상, 목표 45개를 누적 추적한다. 네 가지 지표 중 하나가 극단으로 가면 치세가 끝나고 새 왕으로 이어진다. 팀은 약 10명. [https://en.wikipedia.org/wiki/Reigns_(video_game)] [https://www.pocketgamer.biz/news/63976/tinder-esque-indie-strategy-reigns-600000-downloads/] [https://worthplaying.com/article/2026/8/11/news/150677-reigns-reaches-more-than-4-million-players-on-its-10th-anniversary-celebrates-with-massive-free-update/] [https://videlais.com/2021/01/01/understanding-reigns-2016-through-storylet-design-terms/]

**(b) 강점을 만드는 메커닉.**
- Papers, Please: 반복 루프(서류 대조)는 퍼즐 게임에 가깝고, 그 위에 **도덕적 무게**를 한 겹씩 쌓는다. 조작은 적고 의미는 크다. [https://en.wikipedia.org/wiki/Papers,_Please]
- Reigns: **입력 하나(좌/우)**로 결정하고, 실패(사망)도 영구 진행(발견 카드 수)에 합산된다. 실패가 도감을 채운다.

**(c) 의존 자원, 이식성.** Papers, Please는 1인 개발에 픽셀 아트로, 형식상 이식 가능하다. Reigns는 약 10명이 만들었고 일러스트 품질에 기대지만 스와이프 구조는 이식 가능하다.

**(d) 유물왕 교훈.** **판매 vs 보유 결정을 Reigns식 이지선다 한 번 입력으로 압축하라.** 그러면 관리 조작량은 줄고 핵심 긴장만 남는다. 그리고 **선점전 패배도 도감에 "놓친 유물" 기록으로 남겨라.** Reigns의 사망처럼 실패가 수집 대상이 된다. 예: "라이벌 ○○가 가져간 유물 목록"이 고스트 라이벌 복수전의 목표가 된다. **충돌:** 유물왕은 수치 경제가 중심이고, Reigns와 Papers는 서사 카드가 중심이다. 1,900종마다 서사 카드를 쓸 수는 없으므로 T4 선점전에만 서사 카드를 쓰는 식으로 범위를 제한해야 한다.

---

### 경고 사례 A: Clicker Heroes 2 (2018 조기 접근 → 2024 판매 중단, Playsaurus)

**사실 확인**
- 2018년 7월 16일 Steam 조기 접근 출시. 소규모 팀이 3년간 개발했다. 초기 가격 $29.99(이후 $19.99)이었고, 제작사 스스로 가격을 가장 큰 불만 요인으로 꼽았다. 플레이어들은 "방치형 = 무한 콘텐츠"를 기대하고 완성품이라 여겨 샀다가 크게 실망했다. 노후한 Flash 기반으로 대규모 개발을 계속한 것도 실수로 인정했다. [https://playsaurus.com/blog/index.php/2021/06/28/the-state-of-clicker-heroes-2/] [https://techraptor.net/gaming/news/financial-troubles-slow-down-clicker-heroes-2-development]
- 약 6년간 조기 접근을 벗어나지 못했고, 2024년 3월 1.0 없이 판매가 중단되었다(리뷰 사이트 서술). [https://playwanderer.online/game-reviews/clicker-heroes-2]

**유물왕 교훈 (추정).** (1) **기대 길이와 실제 길이의 불일치가 치명적이다.** 방치형 플레이어는 "끝없는 것"을 기대한다. 유물왕이 140시간 엔딩을 두려면 엔딩 이후(시즌, 고스트 라이벌)가 무한 꼬리라는 것을 명시하라. (2) 솔로 개발자는 **기술 스택의 수명**을 고려해야 한다. 정적 웹(HTML, JS)은 Flash와 달리 수명이 길다. 이것은 유물왕의 장점이다.

### 경고 사례 B: NGU Idle (4G) 후반부

**사실 확인**
- 솔로 개발자 4G가 만든 무료 방치형이다. 수백 시간 분량의 콘텐츠가 있고, 어드벤처 모드에는 방치로는 잡을 수 없는 보스(타이탄)가 있어 수동 공략이 필요하다. [https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/NGUIdle] [https://armorgames.com/ngu-idle-game/18444]
- 리뷰 비판: 마지막 콘텐츠 몇 조각을 약 1년의 그라인드로 늘려 놓았다. "1–2주마다 뭔가는 있어야 한다." Evil과 Sadistic 난이도에 거대한 어드벤처 벽이 있다. "1년차쯤부터 무너진다." [https://steamcommunity.com/app/1147690/reviews/] [http://www.jeremietessier.com/reviews/2022/6/19/i-look-at-ngu-idle]

**유물왕 교훈 (추정).** 무사건 구간 문제는 장기 방치형에서도 **후반에 같은 모양으로 다시 나타난다.** "이벤트 간격 상한"(예: 어떤 구간에서도 최대 N분 안에는 의미 있는 사건이 1건 발생)을 **설계 불변식**으로 정하고 시뮬레이터로 검증하라. 유물왕은 이미 "3.5시간 이후 팁 0"을 측정했으므로, 같은 측정을 10–140시간 전 구간으로 확장하면 된다.

---

## 4. 축 4 보조 자료: 선점·영구 손실·비동기

### 4.1 XCOM: Enemy Unknown — Ironman
- Ironman은 저장 슬롯 하나로 자동 저장해서 되돌리기를 막는다. 선택 모드다. 디렉터 Jake Solomon은 Classic Ironman을 "게임의 최고 형태"라고 불렀다. 전투 난수를 고정 시드로 처리해 재로드 파밍을 막았다. 영구사를 넣는다면 턴제여야 한다고 했다. 실시간이면 플레이어가 AI 탓을 하기 때문이다. [https://xcom.fandom.com/wiki/Ironman] [https://techland.time.com/2012/10/12/why-xcoms-random-results-sometimes-arent-and-you-should-play-on-ironman/] [https://www.pcgamesn.com/xcom-2/xcom-jake-solomon-interview]
- **유물왕 교훈:** (1) 영구 손실은 **옵트인 모드**로 둔다. (2) 선점전은 60–150초 실시간 경쟁이다. Solomon의 말대로 실시간 패배는 "불공정"하다고 느끼기 쉽다. 선점전 결과를 **확률 공개 + 사전 준비(직원, 원정 배치)로 결정되는 준턴제**에 가깝게 만들면 패배를 받아들이기 쉬워진다 (추정). (3) 로컬 저장 게임은 새로고침이나 저장 파일 복원으로 결과를 되돌릴 수 있다. 영구 손실을 유지하려면 XCOM처럼 시드를 고정해야 한다 (추정).

### 4.2 비동기 고스트 (Dark Souls / Trackmania / Death Stranding)
- Demon's Souls와 Dark Souls: 메시지, 혈흔(다른 플레이어의 죽음 재생), 유령 형상. 미야자키가 눈길에서 모르는 사람들이 차를 밀어 준 경험에서 착안했다. 소통을 일부러 **불투명하게** 해서 플레이어가 스스로 해석하게 했다. [https://www.gamedeveloper.com/design/how-i-dark-souls-i-multiplayer-mechanics-are-invading-other-worlds] [https://en.wikipedia.org/wiki/Dark_Souls_(video_game)]
- Trackmania: 순위표와 연동한 고스트. 상위 5명과 바로 위·아래 순위의 고스트를 켤 수 있다(플러그인과 커뮤니티 설명). [https://github.com/zer0detail/Any-Ghost] [https://en.wikipedia.org/wiki/Trackmania_(2020_video_game)]
- Death Stranding: 다른 플레이어가 지은 구조물이 이름과 함께 내 세계에 나타나고, "좋아요"로 보상한다. 코지마는 이를 "스트랜드 게임"이라고 불렀다. [https://en.wikipedia.org/wiki/Death_Stranding] [https://deathstranding.fandom.com/wiki/Social_Strand_System]
- **유물왕 교훈 (추정).** 공유 코드 고스트 라이벌은 Trackmania의 "바로 위 순위 고스트"처럼 **나보다 약간 앞선 상대**를 불러올 때 동기가 가장 크다. 공유 코드 목록에 "내 순자산 ±20% 구간"만 뜨게 하는 식이다. 또한 Death Stranding처럼 **상대에게 해가 아닌 흔적**을 남기게 하면 PvP 적대감 없이 연결감을 줄 수 있다. 예: 고스트가 소장한 T4를 내 박물관에 "대여 전시"로 들인다. 서버가 없으므로 이 흔적은 코드에 담긴 스냅샷 한 방향으로만 전달된다.

### 4.3 Frostpunk (11 bit studios) — 참고만
- 법전의 선택이 희망과 불만 지표를 움직이고, 한계를 넘으면 반란으로 게임이 끝난다. "선을 넘을 것인가"를 거래로 제시한다. [https://www.pcgamer.com/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws/] [https://en.wikipedia.org/wiki/Frostpunk]
- 유물왕의 "판매하면 순위 하락"은 Frostpunk의 "생존 vs 도덕"과 같은 **두 지표 사이의 거래** 구조다. 도굴이나 암시장 판매에 평판 지표를 붙이면 Frostpunk식 선이 생긴다 (추정). 3D와 중규모 팀 게임이므로 전체 이식은 불가하다.

### 4.4 FOMO, 다크패턴 비판 문헌
- 게임 다크패턴 분류: 시간형(일일 로그인, 시한 이벤트), 금전형(루트박스, 프리미엄 재화), 사회자본형(호혜 의무). [https://www.researchgate.net/publication/390235729_Dark_Patterns_in_Games_An_Empirical_Study_of_Their_Harmfulness]
- 시한 이벤트("약속 플레이")는 긴급감과 FOMO로 잦은 접속을 유도한다. FOMO와 손실회피를 이용하는 설계는 플레이어 자율성을 훼손한다는 윤리적 비판을 받는다. 청소년 대상 체계적 문헌고찰도 있다. [https://www.sciencedirect.com/science/article/pii/S1875952126000443] [https://www.gamedesignknowledge.com/blog-post/the-ethics-of-dark-patterns-in-game-design]
- Destiny의 FOMO 설계 관련 유출 사례 분석(미시간대). [https://smi.engin.umich.edu/destiny-fomo-leak]
- **유물왕 대입 (추정).** 유물왕은 과금이 없으므로 금전형은 해당하지 않는다. 하지만 "팁 알림 → 60–150초 안에 반응하지 않으면 영구 결손"은 **시간형 다크패턴의 교과서적 형태**다. 특히 알림이 앱 밖(브라우저 알림)으로 나가면 더 그렇다. 완화책:
  1. 팁은 **플레이어가 접속해 있을 때만** 발생시키거나, 부재 중 발생분은 복귀 시 "보류 팁"으로 대기시킨다.
  2. 패배해도 **회수 경로**를 둔다. 라이벌 소장 → 경매 재출현 → 고스트 교환.
  3. 영구 결손은 옵트인 "철인 모드"에서만 적용한다.
  4. 확률 공개 원칙에 맞춰 **선점 성공률을 사전에 표시**한다.

---

## 5. 축 3 보조: 실물 지식 콘텐츠

- **Wikitrivia** (2022, Tom J. Watson): 위키백과와 위키데이터에서 날짜를 가져와 카드를 연표에 끼우는 게임. 목숨 3개. 오픈소스이고 오류 카드를 신고받는다. 2022년 1월에 화제가 되었다. [https://en.wikipedia.org/wiki/Wikitrivia] [https://github.com/tom-james-watson/wikitrivia]
  - **유물왕 교훈:** 1,900종 데이터를 솔로가 검수하는 방식의 모범이다. **오픈 데이터 소스 + 플레이어 오류 신고.** 서버 없이도 GitHub 이슈나 폼 링크로 가능하다. 또한 "연대 맞히기" 미니게임을 감정 단계에 넣을 수 있다. 예: 연대를 맞히면 감정 비용을 할인한다 (추정).
- **Assassin's Creed Discovery Tour** (Ubisoft, AAA, 아이디어만): 역사학자가 감수한 전투 없는 투어 모드. McGill대 연구실과 교사용 커리큘럼을 만들었다. 연구에서 학습 향상은 게임 44%, 교사 강의 51%였다. [https://www.ubisoft.com/en-us/game/assassins-creed/discovery-tour] [https://www.cbc.ca/news/canada/montreal/assassins-creed-discovery-tour-teaching-tool-1.4566553] [https://variety.com/2018/gaming/news/assassins-creed-origins-discovery-tour-effectiveness-1202861325]
  - **이식 불가.** 3D 재구성이 핵심이기 때문이다. 이식할 수 있는 개념은 "게임 규칙을 끈 **열람 모드**"다. 유물왕 도감을 순수 박물관 도록처럼 볼 수 있게 하면 교육용과 공유용 가치가 생긴다 (추정).
- **Two Point Museum** (2025, Two Point Studios / SEGA): 2025년 3월 4일 출시. 직원을 원정 보내 화석과 유물을 가져오고, 등급과 품질이 가챠처럼 갈리며, 공룡 뼈는 4부위를 모아야 완성된다. 관람객은 Buzz, 지식, 재미 세 가지를 원한다. 수입은 티켓, 기부함, 상점, 음식이고, 이것으로 급여, 확장, 원정비를 낸다. [https://en.wikipedia.org/wiki/Two_Point_Museum] [https://press-start.com.au/reviews/ps5-reviews/2025/02/26/two-point-museum-review-a-night-at-the-museum/] [https://gamingtrend.com/reviews/two-point-museum-review-2/]
  - 유물왕의 원정, 박물관, 관람객 수입과 **구조가 거의 같은 상업 선례**다. 다만 3D이고 중형 스튜디오 게임이며, **가상의 유물**을 쓴다. 비교작 본문에서 제외한 이유는 §6에 있다. 참고할 점: 부위 수집으로 완성하는 전시물은 유물왕 "세트 도감"의 근거가 되고, 원정의 가챠성은 유물왕의 "확률 공개"와 대비된다.

---

## 6. 검토했으나 본문에서 제외한 후보

| 후보 | 제외 이유 |
|---|---|
| Two Point Museum (2025) | 원정·박물관 구조가 가장 비슷하지만 3D 중형 스튜디오 게임이고 가상 유물을 쓴다. 교훈은 이식되지만 제작 방식은 이식되지 않는다. §5에 요약만 남겼다. 판매 수치는 이번 검색에서 찾지 못했다. |
| Antimatter Dimensions | 프레스티지 층(Infinity → Eternity → Reality) 공개의 모범이다. 하지만 Reality 업데이트에 4년 이상 걸렸고(2018 → 2022-12-17) 팀 체제다. 유물왕에 필요한 "10시간 안의 훅"과 스케일이 다르다. [https://store.steampowered.com/app/1399720/] [https://antimatter-dimensions.fandom.com/wiki/Celestials] 참고: 후반 Celestial 7명이 **플레이어와 대화하는 캐릭터**로 등장해 수치 게임에 서사를 입힌다. |
| Balatro (2024, LocalThunk) | 솔로 개발로 500만 장. 컬렉션 메뉴(발견한 조커와 덱)가 있다. 그러나 로그라이크 덱빌더라 방치형 페이싱에 교훈이 적다. [https://www.gematsu.com/2025/01/balatro-sales-top-five-million] [https://en.wikipedia.org/wiki/Balatro] |
| Hades (Supergiant) | 죽을 때마다 서사가 진행되어 실패가 보상이 된다는 교훈은 Reigns가 더 작은 규모로 보여준다. 중형 팀이고 풀보이스다. [https://www.gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death] |
| Cultist Simulator (Weather Factory) | 소규모(2–4인)로 첫 2주 4만 장, 10만 장·$176만. 카드와 텍스트 서사 모범이지만 유물왕과 거리가 있다. "첫해 기대치 3만 장을 2주 만에 넘었다"는 사례만 참고로 남긴다. [https://www.pcgamesinsider.biz/news/68530/cultist-simulators-100000-sales-cap-off-a-successful-first-year-for-weather-factory/] [https://weatherfactory.biz/after-the-dawn-what-happened-when-we-launched-cultist-simulator/] |
| Idle Slayer (Pablo Leban) | 픽셀 방치형으로 능동·방치 전환과 완전한 오프라인 진행이 있다. 판매·다운로드 수치와 설계 인터뷰를 확보하지 못했다. [https://store.steampowered.com/app/1353300/Idle_Slayer/] [https://idleslayer.com/press-kit] |
| Pokémon Sleep | 수집과 일일 습관 결합의 사례다. 매출이 월 $1,060만(2023-08)에서 $510만(2025-01)으로 떨어졌다. 대형 IP라 이식성이 낮다. [https://www.pocketgamer.biz/pokmon-sleep-slumbers-over-150m-mark-despite-slowdown-since-first-anniversary/] |
| 고고학 시뮬레이터류 (ArchaeologyX, The Archaeologists, A Totally Legal Archaeology Adventure 등) | 주제는 같지만 흥행과 설계 자료를 확인하지 못했다. 출처가 부족해 교훈을 끌어낼 수 없다. [https://store.steampowered.com/app/724630/ArchaeologyX/] [https://store.steampowered.com/app/3568150/A_Totally_Legal_Archaeology_Adventure/] |
| Trimps, Leaf Blower Revolution, Unnamed Space Idle | 커뮤니티 평가는 좋지만, 이번 검색으로는 팀 규모와 판매 등 사실 출처를 확보하지 못해 제외했다. (기억, 미검증) Trimps는 오픈소스 웹 방치형이라 구조 분석 대상으로는 유효하다. |
| Kittens Game (단독 항목) | §3.5에 Melvor와 묶었다. |
| Candy Box! | §3.2에 A Dark Room과 묶었다. |

---

## 7. 유물왕 측정 문제별 대응 매트릭스

| 측정된 문제 | 가장 관련된 비교작 | 구체 장치 | 근거 절 |
|---|---|---|---|
| 첫 10시간 중 약 3.5시간 이후 무사건(팁 0, 순자산 평탄) | Paperclips, Cookie Clicker, A Dark Room, Eric Guan | (1) 3.5시간 부근에 단계 전환(주 지표 교체) (2) 5–15분 간격 저위험 "소문" 사건 (3) 미공개 시스템을 순차로 열어 새 탭이 사건이 되게 (4) 재방문 시계 간격을 지수적으로 | §3.1, §3.3, §3.2, §2.3 |
| 엔딩 약 140시간 | Gnorp(8–20시간), Paperclips(6–12시간), Clicker Heroes 2(기대 불일치) | 메인 엔딩 10–20시간 + 도감 완성과 시즌을 엔딩 이후의 무한 꼬리로 명시 | §3.4, 경고 A |
| 관리 조작량 과다 | Kittens, Melvor, Reigns | 조작을 "문제"로 먼저 보여준 뒤 자동화 직원을 해금 보상으로 준다. 판매/보유는 이지선다 한 번 입력 | §3.5, §3.9 |
| 선점전 패배 = 영구 결손 (FOMO 위험) | XCOM Ironman, 다크패턴 문헌, Reigns | 기본은 복구 경로 있음, 영구는 옵트인. 패배도 "놓친 유물" 도감으로 수집. 부재 중 팁은 보류 | §4.1, §4.4, §3.9 |
| 실물 1,900종의 전달력 | 동물의 숲, Stardew, Wikitrivia | 큐레이터 NPC 한 명의 1–2문장 해설. 세트 단위 도감과 임계점 해금. 상위 등급만 진위 판별. 오픈 데이터와 오류 신고 | §3.6, §3.7, §5 |
| 고스트 라이벌 동기 | Trackmania, Death Stranding | "바로 위 순위" 고스트 추천. 적대 대신 대여 전시 같은 흔적 | §4.2 |
| 귀환 이유 | Neko Atsume, Travel Frog, Cookie Clicker 오프라인 | 원정에서 돌아올 때 현장 일지 한 장 + 결정 요구. 오프라인 효율 상한 | §3.8, §3.3 |

---

## 8. 추가 검증이 필요한 항목

- Pecorella 「Math of Idle Games」 원문의 비용 성장 상수와 프레스티지 최적 타이밍 결론. 원문에 접근하지 못했다.
- Wired 2017 기사의 "11일 45만 명, 대부분 완주" 원문 확인. 위키백과 요약만 거쳤다.
- Neko Atsume 다운로드 수. 1,000만과 3,000만 이상이 시점별로 다르다.
- Cookie Clicker 팀 구성(Orteil + Opti). (기억, 미검증)
- Melvor Idle의 "동시에 한 스킬만 진행" 규칙. (기억, 미검증)
- Two Point Museum 판매량과 개발 인원. 이번 검색에서 찾지 못했다.
