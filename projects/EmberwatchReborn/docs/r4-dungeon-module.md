# R4a 수문소 모듈: 던전 → L5 / 강화 +2 조건

2026-10-09 UTC. 새 재구현 작업면의 **모듈/명령 정산 검증**이다. 정상 입력 플레이, 보스 체감 난이도, 화면/소리 가독성, 캠페인 소요 시간은 이 작업에서 검증하지 않았다. 예전 소실된 구현의 검사 수를 이어받지 않는다.

## 범위와 근거

- 담당 신규 파일: `app/src/dungeon-content.js`, `app/src/dungeon.js`, `app/tests/dungeon.test.mjs`, 이 문서.
- 기본 설계: [첫 던전 경로 제안](./r4-first-dungeon-route-proposal.md). 제안의 후속 숙련 승급 단계는 이번 구현에서 제외했다. **위임장만 지급하며, 캐릭터는 입문 티어에 남는다. 숙련 16노드의 효과/구매/저장 검증은 아직 구현되지 않았다.**
- 보존된 HWII 참조 규칙: 기본 네 기술 첫 랭크 비용 0, 레벨업 속성점 5, L2–4 기술점 3 / L5–14 기술점 4, 숙련 최소 L5, Hard/Serious 처치 XP ×0.75, L5부터 입문 적 XP ×0.5. 참조 파일과 미확인 `null` 값은 수정하지 않았다.
- 기존 Emberwatch 조정: XP 곡선, 기본 능력치/회복/공격 공간·시간, 잿길과 기존 보상, 장비 수치와 제작/강화 비용, 사망 금화 손실과 재도전 규칙.
- **신규 Emberwatch 조정:** 두 층의 지도·적 배치·도구·퍼즐·고유 ID·보스 수치·보상·위임장. 아래 수치는 HWII 원작 수치/지도/퀘스트의 복원이 아니다. 알려지지 않은 원작 수수료나 보스 값을 0으로 추정하지 않는다.
- HP나 빈 이동 거리를 늘려 플레이 시간을 만들지 않는다. 보스 HP 220은 기존 감시자 260보다 작다. 독립 승강기와 영구 문 개방으로 정비/재시도/보고 동선을 줄인다.

## 공개 API와 책임 경계

`dungeon-content.js`는 import가 없는 깊은 동결 상수 모듈이다. `DUNGEON_REGIONS`, `DUNGEON_FOES`, `DUNGEON_LINKS`, `DUNGEON_GROUPS`, `DUNGEON_BOSS_ID`, `DUNGEON_TOOLS`, `DUNGEON_REWARDS`, `DUNGEON_PROGRESS_DEFAULTS`, `DUNGEON_RECEIPTS`를 내보낸다. `world.js`가 이를 가져와 기존 지역/적 목록과 합친다.

`dungeon.js` 공개 함수:

| API | 결과 / 사용 |
|---|---|
| `DUNGEON_COMMANDS` | `acceptSluiceQuest`, `interactDungeon`, `reportSluiceQuest` 세 명령의 Set. 내부 명령 검사는 별도 고정 목록으로 제한한다. |
| `reduceDungeon(state, command)` | 성공 `{ok:true,state,events}`, 실패 `{ok:false,code,reason}`. 입력 상태/명령은 수정하지 않는다. |
| `validateDungeonProgress(state)` | `{ok:true}` 또는 오류. 던전 도메인 정합성 검사이며 전체 저장 검사를 대신하지 않는다. |
| `dungeonPortalAllowed(state, portal)` | 성공/오류 객체. 호출자는 현재 지역에서 찾은 **저작된 포털**을 전달한다. 임의 사용자 포털 객체를 신뢰하는 API가 아니다. |

실제 UI → 부모의 `reduceRuntime` → `reduceDungeon` → 부모의 최종 `validateState`/저장 순서를 사용한다. 이 모듈은 저장소/브라우저/전투 프레임을 직접 조작하지 않는다. `getRegion`, `createMap(regionId,state)`, `inMap`, `near`, `lineOfSight`는 world 인터페이스를 사용한다. 콘텐츠 상수가 world를 import하지 않으므로 순환 import가 없다.

명령 공통 필드는 `type`, `position:{x,y}`, `life`, `vitals:{hp,mana,stamina}`이다. 선택적인 `recovery`는 `cooldowns`, `lock`, `manaDelay`, `staminaDelay`, `invuln`, `potionCooldown`을 모두 포함한다. cooldown은 현재 기본 네 기술 키만 허용하며 회수 값은 유한한 0–60초다. 보고된 자원은 현재 파생 최대치를 넘을 수 없다. 쓰러진 생명, 다른 생명 번호, 유효하지 않은 지도 위치는 거부한다.

- `acceptSluiceQuest`: 마을 촌장 에다 근거리/LOS, 기본 기술 학습, 순찰 보고 `watch_patrol`, 감시자 처치 및 `chest:warden-cache` 필요. 고정 초기 상태와 비소모 `sluice_key`를 한 번 만든다. 보상/레벨/티어 변화는 없다.
- `interactDungeon`: 공통 필드에 `objectId` 추가. 현재 지역의 던전 오브젝트만 찾고 유효 위치, 거리 76 이하, LOS를 모두 검사한다. 밸브에만 `value:0|1`, 방향 선택기에만 `value:1|2`가 필수다. 나머지 대상은 value가 있어도 거부한다.
- `reportSluiceQuest`: 핵 회수 후 촌장 에다 근거리/LOS에서 보고. **L5를 보고 선행 조건으로 두지 않는다.** 최소 어려움 경로는 보고 XP로 L5가 된다. `adept_commission=1`과 `adeptCommission` 이벤트의 `promotionImplemented:false`를 반환한다. 승급/기술 구매를 실행하지 않는다.
- 임의 XP, 금화, 보상 ID, 퀘스트 플래그, 알 수 없는 속성/명령을 받지 않는다. 실패 도중 변경한 복사본은 반환하지 않는다. JSON 외 값, NaN/Infinity, 순환, accessor, 숨김/symbol 속성, 예약 키, 희소 배열도 거부한다.

## 지도 스키마와 연결

지역은 `{id,name,w,h,spawn,rooms,doors,npcs,portals,objects,foes}` 구조다. `w/h`, `rooms:[{x,y,w,h}]`, `doors:[{x,y,w,h,unlockObjective}]`는 **32 단위 타일** 기준이다. spawn/오브젝트/적/포털/arrival은 월드 좌표다. rooms 합집합 밖은 벽이며, 문은 해당 objective ≥1일 때 열린다.

- 포털: `{id,name,x,y,to,arrival,gate?}`. gate는 `sluice_entry`(수락/열쇠), `sluice_bridge`(환경 퍼즐), `sluice_shortcut`(독립 승강기)의 세 문자열이다. 알 수 없는 gate는 거부한다. gate 없는 기존 귀환 포털도 전체 던전 상태 정합성을 먼저 검사한다.
- 오브젝트: `{type:'dungeon',id,name,x,y,actionKind,...}`. 순서판만 `rune:0|1|2`를 추가한다.
- 적: `{id,kind,x,y,gate}`. gate는 `world.objectives[gate]≥1` 활성 조건이다. 실제 LOS, 투사체/돌진/근접 벽 차단, 길 찾기, 보스 패턴 실행은 부모 combat/world 통합의 책임이다.

| 지역 | 크기 / 스폰 | 영구 문 조건 |
|---|---|---|
| `sluice_upper` | 28×22 / (112,576) | 중문 `(17,8,1,3)` → `sluice_sequence_solved`; 계단 통로 `(7,5,2,3)` → `sluice_bridge_open` |
| `sluice_lower` | 24×20 / (112,544) | 창고 문 **`(5,9,3,3)`** → `sluice_store_open`; 보스 문 `(14,8,3,1)` → `sluice_boss_awakened` |

상층 rooms: `(1,14,7,7)`, `(7,17,7,3)`, `(12,13,8,8)`, `(18,11,3,5)`, `(18,7,9,6)`, `(12,8,8,3)`, `(9,3,8,8)`, `(5,5,7,3)`, `(1,1,7,8)`.

하층 rooms: `(1,13,8,6)`, `(7,12,7,3)`, `(11,9,7,7)`, `(14,6,3,5)`, `(10,1,13,7)`, `(1,2,7,8)`, `(5,9,9,3)`.

제안 대비 두 좌표 변경을 명시한다. 정비 기록은 `(184,512)`에서 **`(240,512)`**로 옮겨 입구 구역의 근거리 벽 차단 사례를 실제 지도에서 검사한다. 하층 창고 문은 `(8,9,3,3)`에서 **`(5,9,3,3)`**으로 옮겼다. 부모의 공간 검토에서 발견한 남쪽 우회 연결을 차단하기 위한 수정이다. 본 모듈 검사만으로 모든 공간 BFS/정상 이동을 통과했다고 주장하지 않는다.

| 포털 ID / 출발 | 목적지 / 안전 도착점 | gate |
|---|---|---|
| `road-sluice-in` / 잿길 (944,96) | 상층 (112,576) | entry |
| `upper-road-return` / 상층 (80,624) | 잿길 (944,96) | 없음 |
| `upper-descend` / 상층 (112,112) | 하층 (112,544) | bridge |
| `lower-ascend` / 하층 (80,576) | 상층 (112,112) | bridge |
| `lower-lift-town` / 하층 (144,480) | 마을 (545,480) | shortcut |
| `town-sluice-lift` / 마을 (545,480) | 하층 (112,544) | shortcut |

entry/bridge/shortcut 표기는 각각 `sluice_` 접두어가 있는 gate 문자열의 약칭이다. 승강기는 보스 전에도 설치할 수 있으며, 이후 마을 치유·장비 정비·사망 재시도에 쓴다.

## 상호작용과 고유 적

| 오브젝트 ID | 위치 | 조건 / 효과 |
|---|---:|---|
| `sluice-entry-record` | 상층 240,512 | 물결 → 톱니 → 불씨, 급수 차단/배수 개방 안내. 재독 XP 없음. 정답을 아는 경우 읽기 클릭은 강제하지 않음. |
| `sluice-crank` | 상층 168,568 | 비소모 손잡이 도구와 발견 보상 1회 |
| `sluice-rune-water` / `-gear` / `-ember` | 상층 656/704/752,368 | 손잡이 + 경비3 처치. 순서 0→1→2로 중문 개방. 오답은 단계0으로 돌아가며 자원 손실/추가 보상 없음. |
| `sluice-valve-inlet` | 상층 336,176 | 손잡이 + 순서 완료 + 제어실3 처치. 급수 value0 필요 |
| `sluice-valve-outlet` | 상층 336,224 | 같은 조건. 배수 value1 필요 |
| `sluice-flow-selector` | 상층 384,192 | 방향1 직통 / 방향2 선택 창고. 위 두 밸브와 방향이 갖춰지면 주 통로 개방 |
| `sluice-lift-chain` | 하층 144,480 | 환경 해결 + 손잡이. 별도 승강기 개방, XP 없음 |
| `sluice-boss-bell` | 하층 480,336 | 전실2 처치 후 보스 문/활성화, XP 없음 |
| `sluice-core` | 하층 624,112 | 보스 처치 + 필수 퍼즐 뒤 핵 회수. `first_dungeon_cleared` 해금 |
| `sluice-store-cache` | 하층 96,96 | 방향2로 열린 창고의 적3 처치 뒤 선택 보상 1회 |

주 통로를 연 뒤 밸브를 다시 닫을 수 없다. 방향은 1↔2로 바꿀 수 있으나 열린 주 통로/창고는 영구 유지하고 환경 보상을 다시 주지 않는다. 선택 창고는 보스/보고/최소 L5 수지에 필수가 아니다.

`DUNGEON_GROUPS`는 필수 처치 가드와 검사에서 같은 고유 ID를 사용한다.

| 그룹 | 고유 ID / 종류 | 기본 XP / G 합 |
|---|---|---:|
| upper_guard | `sluice-upper-scout-1`, `sluice-upper-scout-2` / scout; `sluice-upper-archer-1` / archer | 30 / 10 |
| upper_control | `sluice-control-bruiser` / bruiser; `sluice-control-scout-1`, `sluice-control-scout-2` / scout | 40 / 13 |
| lower_antechamber | `sluice-lower-archer` / archer; `sluice-lower-scout` / scout | 21 / 7 |
| boss | `sluice-heartkeeper` / sluice_keeper | 100 / 26 |
| store (선택) | `sluice-store-archer-1`, `sluice-store-archer-2` / archer; `sluice-store-bruiser` / bruiser | 46 / 15 |

총 12적 중 필수 9적이다. 기존 scout/archer/bruiser 수치는 그대로 재사용한다. 모두 입문 적 티어로, 현재 레벨에 따른 XP 감쇠를 받는다. 순서판 전 경비3, 수문 전 제어실3, 봉인종 전 전실2를 요구하므로 최소 처치 예산이 퍼즐 명령에서 보장된다.

보스 `sluice_keeper`: HP220, 방어8, 이동48, 기본XP100, G26, role/style `boss`. 다음 고정 순환 데이터를 부모 전투에 제공한다. 수치는 난이도 적용 전이며 최종 영웅 피해를 뜻하지 않는다.

| 패턴 | 모양 / 범위 | 준비 / 회수 (초) | 기본 피해 |
|---|---|---|---:|
| sluice-sweep | cone, range96, halfAngle1.1rad | 1 / 1 | 16 |
| sluice-bolt | line, 발동range280, width20, speed240, travelRange440 | 1.1 / 1.1 | 12 |
| sluice-pulse | circle, range/radius112 | 1.25 / 1.25 | 18 |

## 보상·저장·실패 규칙

| 고정 영수증 | XP | G | 재료/소모품 |
|---|---:|---:|---|
| r4:crank | 60 | 0 | 비소모 손잡이 도구 |
| r4:sequence | 60 | 8 | 없음 |
| r4:water | 70 | 12 | 철1 |
| r4:core | 70 | 20 | 강화+2 조건 해금 |
| r4:report | 90 | 60 | 위임장 플래그 |
| r4:store (선택) | 30 | 18 | 철1, 목재1, 실2, 체력 물약1 |

필수 목표 XP 합 **350**, 필수 적 기본 XP **191**, 필수 목표 G100 + 적 G56. 수락/승강기/봉인종도 각 `r4:accept`, `r4:lift`, `r4:bell` 영수증이 있으나 XP/G는 없다. 보고/회수 재입력은 실패하며, 기록 재독/방향 재선택은 성공해도 보상을 주지 않는다. 목표 XP는 난이도/하위티어 배율을 받지 않는다.

보상은 고정 테이블에서 가져와 기존 `grantExperience`와 earnedXp/earnedGold 원장에 반영한다. 금화·재료·소모품 안전 정수 한도와 영수증 최대4096을 넘으면 전체 입력이 실패한다. 입력을 먼저 수정하거나 영수증만 소비하는 부분 성공이 없다. 목표 보상 레벨업은 자원을 자동 완충하지 않는다.

기존 R3 v2 저장에 R4 필드/도구/영수증/던전 방문 기록이 하나도 없으면 그대로 유효하다. R4 진행을 시작하면 다음 14필드를 모두 갖춘다: 수락, 기록 읽기, 손잡이, 순서 단계/완료, 급수/배수/방향, 주 통로, 창고, 승강기, 보스 개시, 핵 회수, 위임장. 실제 키는 `DUNGEON_PROGRESS_DEFAULTS`에 있다. 정수/범위, 도구와 보상 영수증의 양방향 일치, 선행 퍼즐/처치, 새 지역의 알려진 고유 적 ID를 검사한다. 부분 이관/미래 단계 플래그/문 없이 창고 처치/벨 없이 보스 처치는 거부한다. 전체 장비/캐릭터/저장 검사는 부모의 `validateState` 책임이다.

사망·이동·처치 자체의 정산은 기존 runtime에 맡긴다. 보스와 영웅이 같은 정산에서 쓰러지면 보스 처치 XP는 유지되지만 쓰러진 상태로 핵을 받지 못한다. 재도전 뒤 열린 승강기로 돌아와 핵을 회수한다. 이미 처치한 고유 적, 핵, 보고를 다시 정산해도 보상은 늘지 않는다. 이 검사에서 실제 전투를 실행한 것은 아니다.

## 네 난이도의 실제 명령 정산 결과

실행: `node --test app/tests/dungeon.test.mjs` → **35/35 통과** (2026-10-09 UTC). 실행 시간 약2.1초는 검사 시간이다. 플레이 시간으로 사용하지 않는다. 본 담당자는 신규 검사 파일만 실행했고 전체 회귀/빌드/브라우저는 실행하지 않았다.

경로 fixture는 `createState`에서 시작해 `reduceRuntime`의 기본 학습, 순찰 수락, `settleCombat`, 상자, 이동, 순찰 보고, 던전 명령, 장비 명령을 사용한다. 레벨/XP/필수 플래그를 직접 넣지 않는다. **좌표는 스크립트로 지정하고 처치는 정산 보고 fixture로 대체하므로, 이는 AI 전투·정상 이동·일반 키보드/마우스 플레이 완료 증거가 아니다.** 별도 잘못된 상태/상한 검사는 의도적으로 변조한 fixture다.

누적 L5 기준은 기존 곡선 100+150+200+250=700, L6은1000이다. 최소 진입은 척후5+감시자1의 순찰6처치와 감시자 상자/보고이며, 남쪽 상자와 나머지19적은 생략한다. 전 잿길은25적+상자2+보고다. 적 XP는 **각 정산 시의 현재 레벨**로 계산한다.

| 잿길 / 창고 | Easy | Normal | Hard | Serious | 최종 레벨 / G |
|---|---:|---:|---:|---:|---|
| 최소6 / 생략 | 791 | 791 | 709.5 | 709.5 | 전부 L5 / 254 |
| 전25 / 생략 | 972.5 | 972.5 | 896 | 896 | 전부 L5 / 339 |
| 최소6 / 회수 | 867 | 867 | 774 | 774 | 전부 L5 / 287 |
| 전25 / 회수 | 1025.5 | 1025.5 | 915.125 | 915.125 | Easy/Normal L6, Hard/Serious L5 / 372 |

위 표의 XP는 전체 누적 earnedXp이며 G는 지출/사망 없는 fixture 잔액이다. 최소 비선택 경로는 총15처치(잿길6+던전9), L5 속성점20/기술점13, 입문 티어다. 최소 Hard/Serious 핵 회수 후 XP619.5 → 촌장 보고 후709.5이므로 보고에 L5 제한을 추가하면 진행이 막힌다. 최소 Easy/Normal은 보고 전701이다.

전 잿길 Normal은 환경 보상 때 L5가 되어 이후 전실/보스 처치 XP가 절반이 된다. 따라서 모든 기본 XP를 최종 레벨에서 한꺼번에 더하거나 선택 보상을 필수 보장에 포함하면 안 된다. 선택 창고는 fixture에서 하층 진입/승강기 설치 후, 전실/보스보다 먼저 처리했다. 다른 합법적 순서는 레벨 감쇠 시점에 따라 최종 XP가 달라질 수 있다.

장비 연결 검사에서는 기존 `first_dungeon_salvage`를 실제 equipment 명령으로 1회 받아 철2/목재1/불씨조각1을 얻고, 방패 구매→+1→+2를 수행했다. +2는 기존22G/철2/불씨1을 사용하고, 같은 불씨를 쓰는 집중 목걸이 제작은 이후 `MATERIAL_SHORTAGE`로 실패한다. 두 보상을 동시에 공짜로 주지 않는다. 새 commandId로 보급 재수령도 막힌다. 이 모듈은 기존 가격/레시피/장비 stats를 바꾸지 않는다.

## 확인 범위와 남은 합격 기준

확인한 35검사에는 네 난이도 최소/전체/선택 경로, 입력 불변, 반복 보상 방지, 필수3/3/2처치 가드, 오답 초기화, 밸브 상태와 영구 개방, 독립 승강기, 핵/보고 선행 조건, 근거리 실제 벽 LOS, 잘못된 위치/생명/자원, 임의 보상 입력 거부, 저장 정합성, 상한 원자성, 사망/재도전, JSON 재진입/왕복, 실제 장비+2 수지가 포함된다. 추가 네 검사는 실제 `createStore`/`createSession`/`createController`와 메모리 저장 어댑터를 사용했다. R3 저장→수락→순서판 중간→완료의 슬롯 재읽기, 동시 보고 입력1회 지급, head 쓰기 전/후 실패 시 차단·명시적 재읽기·보상 중복 방지를 확인했다. 브라우저의 실제 localStorage/Web Locks나 페이지 재접속은 사용하지 않았다.

부모 통합/정상 입력에서 계속 확인할 항목:

- 모든 열린 방의 몸 반경 안전 연결, 닫힌 중문/창고/보스 문 우회 불가, 포털 도착 안전, 문 개방 후 지도 재생성. 특히 이번 창고 문 수정의 BFS 회귀.
- 실제 벽 너머 적 활성화/피격 없음, 돌진과 투사체의 벽 통과 없음, 보스 세 모양 경고와 접촉 일치, 기절/방패/회피 대응.
- 손잡이/퍼즐 상태/남은 경비/보고 대상/열린 승강기의 현재 안내, 이미 회수한 대상 표현, 색 이외 문양/텍스트 구분.
- 저장 실패 시 원상 유지, 기존 R3 공개 저장 재진입, 퍼즐 도중/보스 처치 직후/사망/지역 왕복의 실제 저장·재접속.
- 현재 정상 획득 장비와 능력치 배분으로 네 기본 자유 시작 기술의 활용이 의미 있는지, 어려움 자원 수지와 귀환 길이가 적절한지. HP·대기·거리만 늘리지 않고 관측 결과로 조정한다.
- 숙련 승급은 별도16노드 실행 효과/검증/UI 연결을 갖춘 뒤 검수한다. R4a 위임장, L5, 장비+2 조건만으로 전사53노드/4티어·후반 완결을 완료 처리하지 않는다.
