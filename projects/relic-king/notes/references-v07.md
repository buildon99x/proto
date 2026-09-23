# v0.7 레퍼런스 조사 — 무엇을 보고 무엇만 가져왔는가

> `prompts/v0.7-worldview-relic-hunters.md` §8의 산출물. 조사일 2026-09-23.
> **규칙**: 레퍼런스에서 가져오는 것은 **구조이지 소재가 아니다.** 고유명사·설정
> 요소를 옮겨 온 것은 없다.

## 1. 유물 시장과 출처(provenance) — 값을 정하는 것은 물건이 아니라 문서다

- [Antiquities trade — Wikipedia](https://en.wikipedia.org/wiki/Antiquities_trade),
  [The Antiquities Trade and Problems of Provenance — St Andrews Law Review](https://www.standrewslawreview.com/post/the-antiquities-trade-and-problems-of-provenance),
  [Stealing History: How does Provenance Affect the Price of Antiquities? (Kiel & Tedesco)](https://hcapps.holycross.edu/hcs/RePEc/hcx/HC1105-Kiel-Tedesco_SellingHistory.pdf)

**가져온 구조 셋.**

1. **합법/암시장을 가르는 것은 물건의 진위가 아니라 출처 문서의 유무다.** 물질로
   진품이어도 출처가 없으면 공개 시장에 못 나온다.
2. **출처가 붙은 물건이 붙지 않은 물건보다 실제로 비싸게 팔린다.** 문서가 값의
   일부라는 것이 시장 데이터로 확인된다.
3. **위조되는 것은 물건이 아니라 출처다.** 세탁은 껍데기 회사를 거쳐 "합법인 것처럼"
   만드는 방식으로 일어난다.

→ `world-lore.md` §3(값은 물건이 아니라 목록의 한 줄에 붙는다)·§3.2(암시장은 권원
없는 물건이 모이는 곳)의 골격. 게임에 이미 있던 수치(미감정 매입 0.75, 장물 0.32,
경매 수수료 8%)가 이 구조에 그대로 앉는다 — **픽션을 위해 수치를 바꾼 곳은 없다.**

## 2. 난파선 인양법 — 먼저 찾은 자가 전부 가진다

- [Law of salvage — Wikipedia](https://en.wikipedia.org/wiki/Law_of_salvage),
  [Treasure Salvage and the Law of Finds — Liskow & Lewis](https://www.liskow.com/insights/series-treasure-salvage-and-the-law-of-finds-exploring-maritime-jurisdiction-a-102lyfq/),
  [Are Finders Keepers Under the Sea? — LawInfo](https://www.lawinfo.com/resources/admiralty-maritime/are-finders-keepers-under-the-sea-what-you-ne.html)

**가져온 구조 둘.**

1. **law of salvage**는 구조자에게 가치의 10~25%(최대 50%)를 준다 — 물건은 여전히
   원소유자의 것이다.
2. **law of finds**는 원소유자가 소멸·포기한 재산에만 적용되고, **발견자가 완전한
   권원을 얻는다.**

→ 해체로 원소유자가 전부 소멸했으므로 이 세계는 law of finds 쪽이다
(`world-lore.md` §3.1). **"먼저 찾는 사람이 가진다"**는 이 게임의 한 줄 요약
(`brief.md`)이 픽션에서 법조문이 됐고, 선점 레이스에 **전부가 걸리는 이유**가
여기서 나온다. 수수료만 정부가 뗀다(= `AUCTION_FEE_RATE` 8%).

## 3. 스토리 바이블의 구성

- [Building a basic story bible for your game — Game Developer](https://www.gamedeveloper.com/design/building-a-basic-story-bible-for-your-game)

게임 바이블은 디자인 문서와 달리 **스토리·설정·인물만** 다루고, 필러와 테마로
시작해 **핵심 오브젝트 · 주요 사건 · 장소**를 적는다. 팀이 계속 쓸 수 있게 자랄
여지를 남긴다.

→ `world-lore.md`의 순서(필러 → 연표 → 해체 → 값 → 무대 → 금기 → 결속표 → 용어집)가
이 구성이다. **"핵심 오브젝트"가 이 게임에서는 유물 데이터 그 자체**라 새로 지어낼
필요가 없었고, 그 자리를 §7 결속표가 대신한다.

## 4. 서사와 메커닉의 불일치

- [Ludonarrative dissonance — Wikipedia](https://en.wikipedia.org/wiki/Ludonarrative_dissonance)
  (Clint Hocking, 2007)

서사가 말하는 것과 메커닉이 보상하는 것이 어긋나면 픽션이 무너진다.

→ 이 작업의 판정을 문장이 아니라 **결속률(17행 중 몇 행)**로 잡은 이유
(`eval.md` §32.1). 특히 **안목을 수입에 붙이지 않은 것**이 이 원칙의 실제 적용이다 —
"많이 본 사람이 빨리 알아본다"는 선점 승산에만 붙고 발굴력에는 안 붙는데,
그 제약이 원래 밸런스(척추 2번)에서 왔고 픽션이 거기에 맞춰졌다. 반대 방향이
아니다.

## 5. 장르 레퍼런스 — 찾은 것과 못 찾은 것

- [ScavengerWorld / Video Games — TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/ScavengerWorld/VideoGames)

**찾은 것**: 붕괴 이전의 물질을 회수해 화폐로 쓰는 세계는 흔하다 — 파괴된 기계에서
나온 금속 조각이 통화인 사례, 전쟁 이전 기술의 재활용이 사회의 기반인 사례.

**찾지 못한 것**: 값이 **물질이 아니라 기록**에 붙는 회수 경제는 이번 조사
범위에서 확인되지 않았다. 스캐빈저 세계의 표준은 "쓸 수 있는 물건이 귀하다"인데,
이 게임은 완전 합성 때문에 **물건이 전혀 귀하지 않은** 세계다. 이 차이가 §1의
유물 시장 구조를 스캐빈저 장르보다 먼저 참고한 이유다.

**기존 참고작**(`prompts/initial-request.md`): 웹툰 `도굴왕`, 스팀 `바나나`.
전자는 "도굴이 직업"이라는 전제를, 후자는 "같은 물건의 수량이 가치를 만든다"를
이 프로젝트에 이미 남겼고, 이번 세계관은 후자의 전제를 픽션으로 설명한 것에 가깝다.

## 6. 조사하지 못한 것

- **문화재 반환 논쟁**(소유권의 정당성)은 조사 범위에 넣었지만 §1의 출처 구조로
  충분해 깊이 들어가지 않았다. 이 게임의 도덕 축(미라 ↔ 정도경)을 더 밀 때
  다시 볼 자리다.
- **콜로니 경제의 실제 모델**(지구-화성 교역 비용 등)은 보지 않았다. 이 게임에
  운송비 수식이 없어 당장 붙을 자리가 없다.
