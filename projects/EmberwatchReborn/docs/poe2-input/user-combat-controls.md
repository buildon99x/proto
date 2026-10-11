# Emberwatch Reborn — POE2 핵앤슬래시 전투·조작 메커니즘 이식 설계

- 작성일: 2026-10-11
- 상태: 구현 기준 초안 (POE2 최신 빌드별 변경 확인 및 실기 검증 필요)
- 플랫폼: PC / Godot 4.x 가정
- 우선순위: 전투·조작 개선 P0, 밸런스 튜닝 일시 보류
- 원칙: Path of Exile 2의 전투 조작·반응성을 참고하여 기존 Emberwatch 세계관과 2D 비주얼에 이식. 검증되지 않은 POE2 내부 수치는 추정하지 않음.

## 1. 목표와 플레이어 경험

POE2의 핵심 경험은 **이동과 조준을 독립적으로 제어**하고, **공격 중 포지셔닝**과 **위험 신호에 대응하는 회피**를 결합하는 것이다. 공격 입력은 즉시 받아들이되 실제 명중은 스킬의 준비·타격 프레임에 맞춘다.

**완료 경험:** 거너가 WASD로 후퇴하며 마우스로 적을 겨냥하고 좌클릭을 유지해 연속 사격한다. 강력한 적 공격 예고 시 Space로 허용 구간의 공격을 취소·회피하고, 복귀 즉시 공격을 재개한다. 의도치 않은 이동·조준 흡착·입력 누락이 없어야 한다.

## 2. POE2 참고 사실과 설계상 선택 구분

### POE2 관찰/공개 자료로 확인된 수준
- PC에서 WASD 이동과 마우스 기반 클릭 이동을 지원한다.
- 이동과 공격 조준을 분리할 수 있다. WASD 이동 중에도 커서 기반 사격·주문을 사용할 수 있다.
- 스킬별로 이동 공격, 재조준, 시전·공격 중 이동 감속 정도가 다르다.
- 회피 구르기는 다수 공격 동작을 취소할 수 있으며, 회피 판정은 모든 피해에 대한 전면 무적과 같지 않다.
- Cursor Targeting / Ground Targeting 같은 조준 설정이 존재하며, 지면 대상 기술은 지면 좌표를 활용한다.

**주의:** 이 항목들은 모든 스킬/모든 버전에 동일한 보편 규칙을 뜻하지 않는다. 정확한 취소 프레임, 이동 감속, 타겟 선택 수식, 달리기·구르기 결합 여부는 적용할 POE2 빌드를 지정해 직접 검증한다.

### Emberwatch를 위한 설계안 (POE2 실측값 아님)
- WASD를 기본 조작, 클릭 이동을 선택형 완전 지원.
- 달리기는 Shift 별도 할당. POE2의 회피 길게 누르기 달리기는 선택형 프리셋으로만 고려.
- 기본 공격은 좌클릭 유지 시 반복; 우클릭은 주력 스킬; Space는 회피.
- 일반 공격의 입력 버퍼 80~120ms 초기값, 실제 테스트 후 조정.
- 이동 공격 속도 배율, 경직, 히트스톱 등은 데이터 구동으로 개별 조율.

## 3. 키 매핑 — 권장 기본 프리셋

| 기능 | 키 | 입력 방식 | 설계 유의사항 |
|---|---|---|---|
| 이동 | WASD | 유지 | 정규화된 대각 입력, UI 포커스 처리 |
| 조준 | 마우스 | 지속 | 화면→월드 좌표 변환, 카메라 보정 |
| 기본 공격 | 좌클릭 | 클릭/유지 | 스킬별 반복 가능 여부 |
| 주력 스킬 | 우클릭 | 클릭/유지 | 이동 명령과 분리 |
| 보조 공격 | 휠클릭 | 누름 | 휠 클릭 대체 바인딩 제공 |
| 스킬 1·2 | Q / E | 누름 | 중복 할당 방지 |
| 스킬 3·4 | R / F | 누름 | 재지정 가능 |
| 회피 | Space | 누름 | 우선순위와 취소 창 명시 |
| 달리기 | Shift | 유지 | 별도 이동 상태/속도 정의 |
| 회복 | 1 / 2 | 누름 | 소모품 사용 중 이동 규칙 정의 |
| 지도 | Tab | 토글 | 입력 포커스 처리 |
| 캐릭터 | C | 토글 | 공격 입력 차단 |

클릭 이동 모드에서는 좌클릭 이동·상호작용, 공격은 사용자 선택 슬롯으로 재매핑한다. 어떤 모드에서도 이동과 공격이 동시에 발동하지 않도록 입력 문맥(UI/월드/아이템/적)을 정의한다. 키 중복·연타·유지·눌렀다 떼기 구분을 설정 UI에서 노출한다.

## 4. 전투 루프

1. **입력 포착:** 물리 프레임에서 move vector, aim position, action edge(pressed/released), hold 상태 수집.
2. **명령 버퍼:** 명령 타임스탬프 저장, 우선순위(사망·피격 제약 > 허용되는 회피 > 행동 시작 > 반복 공격) 적용.
3. **행동 허용 판정:** 현재 state, interrupt window, 자원, 쿨다운, 스킬 조건 검사.
4. **행동 시작:** 첫 유효 프레임에 facing/anim/VFX 준비를 반영. 즉시 공격 시작과 즉시 타격을 혼동하지 않는다.
5. **타격 처리:** startup/active/recovery 타임라인의 active 이벤트에서 히트박스·투사체·데미지 판정.
6. **반응:** 피격 경직/넉백/축적 상태이상, 명중 이펙트·타격음·화면 흔들림(옵션).
7. **복귀:** recovery 종료 또는 유효 회피 취소 시 다음 버퍼 명령 처리.

### 권장 타임라인 데이터

각 스킬은 `startup`, `active_windows[]`, `recovery`, `movement_multiplier`, `can_retarget`, `retarget_windows[]`, `dodge_cancel_windows[]`, `hold_repeat`, `hit_reaction_profile`, `hitbox/projectile profile`을 정의한다. 초기 개발에서 취소/재조준을 단순 bool로 시작할 수 있지만 최종 사양은 **시간 구간 데이터**를 사용한다.

## 5. 이동·조준·타겟팅

### 이동
- 이동 상태와 행동 상태를 분리해 **공격하며 이동**을 지원한다.
- 대각선 속도 정규화, 충돌 슬라이딩, 벽/코너 끼임 방지.
- WASD: 매 프레임 방향 벡터를 직접 이동 명령으로 변환.
- 클릭 이동: 클릭한 지면 좌표까지 경로 탐색. 전투/상호작용 명령 우선순위와 경로 재탐색 비용 고려.

### 조준
- 조준 좌표는 카메라 이동·줌을 고려해 화면에서 월드로 변환한다.
- `Cursor Targeting`: 커서 통과 방향을 기준으로 발사 벡터 계산.
- `Ground Targeting`: 커서의 지면 월드 좌표를 향해 발사 또는 스킬 적용.
- 지면 AoE는 커서의 지면 목표점으로 처리하고 사거리 제한·가시성·벽 충돌 규칙을 스킬 데이터로 정의.
- **플레이어의 직접 조준 우선.** 보정 사용 시 보정 각도, 거리, 차폐, 가중치를 제한하며 옵션으로 끌 수 있도록 한다.
- 근접 공격은 목표 하나에 강제로 흡착시키기보다 플레이어의 방향과 공격 호/범위를 기준으로 명중 판정.

## 6. 회피와 공격 취소

- Space pressed 이벤트를 기존 행동의 회피 취소 창과 대조한다.
- 회피가 가능한 경우 공격을 끊고 즉시 회피 상태로 진입.
- 이동 방향 입력을 우선 사용하고, 입력이 없다면 직전 유효 이동 방향/조준 방향 중 명시된 규칙을 적용.
- 회피 판정은 피해 유형별 정의(`projectile`, `melee`, `area`, `ground_hazard`, `unavoidable` 등). 무적 플래그 하나로 처리하지 않음.
- 회피 중 연속 재회피, 피격 경직 및 강제 이동은 개별 규칙으로 설정.
- 회피 종료 후 반복 공격 키가 여전히 유지돼 있으면 유효 조건에서 재개.

## 7. 클래스별 첫 구현

| 클래스 | 1차 테스트 스킬 | 필수 동작 |
|---|---|---|
| 거너 | 기본 연사 / 정밀 사격 | 후퇴하며 발사, 에임 추적, 발사 간격 일관성 |
| 전사 | 가벼운 베기 / 강타 | 전방 타격 호, 준비 동작, 공격 중 방향 보정, 회피 취소 |
| 마법사 | 기본 투사체 / 지면 범위 주문 | 이동 시전, 월드 좌표 타겟, 시전 중 이동 감속 |

권장 임시 이동 배율(실측이 아닌 초기 튜닝값): 거너 연사 0.75, 정밀사격 0.35 / 전사 경공격 0.50, 강타 0 / 마법사 기본 주문 0.65, 강한 채널링 0~0.25. 각 값은 실제 조작 테스트로 재조정한다.

## 8. Godot 4.x 구현 구조

```text
InputManager
 ├─ InputContext (UI / World / Inventory)
 ├─ WasdMoveProvider / ClickMoveProvider
 └─ MouseAimProvider
       ↓
PlayerCommandBuffer (timestamps / priority / expiry)
       ↓
PlayerController
 ├─ LocomotionStateMachine
 └─ ActionStateMachine (Attack / Cast / Channel / Dodge / Stagger / Dead)
       ↓
SkillExecutionSystem
 ├─ AimResolver / TargetResolver
 ├─ SkillTimeline / AnimationDriver
 ├─ MovementModifier
 ├─ Hitbox / Projectile / Collision
 └─ Damage / Ailment / Stagger
       ↓
CombatFeedback (VFX / SFX / hit stop / camera)
```

`Input.is_action_just_pressed()`와 `Input.is_action_pressed()`를 구분하고, 렌더/물리 프레임 시차 및 화면→월드 좌표를 검증한다. 반복 공격에 OS 키 반복을 사용하지 않고 게임 자체 스킬 타임라인으로 처리한다.

### 스킬 데이터 필드 예시

```gdscript
class_name CombatSkill
extends Resource

@export var startup_time: float = 0.10
@export var active_time: float = 0.10
@export var recovery_time: float = 0.20
@export_range(0.0, 1.0) var move_speed_multiplier: float = 1.0
@export var can_move_while_attacking: bool = true
@export var can_retarget: bool = true
@export var dodge_cancel_enabled: bool = true
@export var repeat_while_held: bool = false
# Production: replace bool-only rules with timed cancel/retarget windows.
```

## 9. 단계별 구현 계획

| 단계 | 범위 | 통과 기준 |
|---|---|---|
| P0-1 | 입력 매핑 + WASD + 마우스 좌표/조준 + 클릭 이동 | 이동과 조준 독립, UI 입력 충돌 없음 |
| P0-2 | ActionState + SkillTimeline + CommandBuffer | 누름/유지/연속 명령 누락 없음 |
| P0-3 | 거너 기본 발사 + 이동 감속 + 타겟/투사체 | 후퇴 사격·측면 사격의 에임 정확 |
| P0-4 | 회피 + 구간별 공격 취소 + 재개 | 회피 시작 반응, 상태 잠김·입력 유실 0건 |
| P1-1 | 전사·마법사 타격과 스킬 | 클래스별 전투 루프 완주 |
| P1-2 | 경직·히트스톱·VFX·SFX·카메라 | 명중/피격 피드백 식별 가능 |
| P2 | 키 리바인딩 저장·접근성·패드 | 조작 프리셋 간 일관성 |

**진행 기준:** 현재 버전에 최소 1종 적의 명료한 공격 예고, 사격·근접·주문 테스트 더미, 입력 로그, 재생 가능한 테스트 상황을 구성한다. 전투 메커니즘의 안정성이 확보되기 전 세부 DPS 밸런스 작업은 보류한다.

## 10. QA / 계측

- `input_to_action_start_frames`: 입력→모션 시작 지연. 로컬 목표: 다음 처리 프레임 이내.
- `input_buffer_expired_count`: 만료/유실 명령 횟수 및 원인 로그.
- `invalid_target_snap_count`: 커서와 무관한 타겟 흡착 횟수.
- `dodge_cancel_success_rate`: 유효 취소 창 내 회피 성공률.
- `stuck_action_count`: 회피/피격 후 행동 잠김 0건.
- `aim_error_degrees`: 발사 방향과 의도된 커서 방향 오차.
- `repeated_attack_interval_variance`: 버튼 유지 공격 주기 편차.
- 60FPS를 최소 목표로 성능 프로파일링; 30/60/120FPS에서 조작 결과 일관성 확인.

**필수 테스트:** 전진/후퇴/측면 공격, 벽 근처 구르기, UI 위 클릭, 스킬 동시 입력, 빠른 커서 이동, 적 소멸 순간 명령, 끊임없는 공격 유지, 경직 중 회피, 다른 해상도·카메라 줌에서 조준.

## 11. 미해결 검증 항목

1. 목표 POE2 패치 버전과 실제 기본 키·달리기 조작 스펙.
2. 클래스별 공격 재조준/회피 취소 가능 창의 영상 프레임 실측.
3. Cursor/Ground Targeting의 원근·2D 변환 시 체감 차이.
4. 클릭 이동·공격 명령 우선순위에 대한 실제 POE2 체험 검증.
5. Emberwatch 현행 코드 구조와의 격차 및 리팩터링 범위.

## 12. 참고 링크

- POE2 공식 패치 노트: https://www.pathofexile.com/forum/view-thread/3826682
- POE2 회피 위키: https://www.poe2wiki.net/wiki/Dodge_roll
- POE2 메커니즘 개요: https://mobalytics.gg/poe-2/guides/mechanics

> 본 문서는 POE2 조작 및 전투에서 공개적으로 알려진 특징과 Emberwatch 적용을 위한 신규 제안값을 분리해 기록한다. 제안 수치를 POE2 공식 내부 파라미터로 취급하지 않는다.
