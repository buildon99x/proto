# 옛 엔진에 계측기를 이식할 때 — 읽기 전용 심

전·후를 **같은 자**로 재려고 지금의 `density.ts`·`telemetry.ts`·`play.mjs`·`harness.mjs`를
기준 커밋에도 옮겨 쓴다. 그런데 계측기는 엔진 함수 몇 개를 부르고, 옛 엔진에는 그중 일부가
없거나 숨어 있다. 그 틈을 메우는 것이 심이다.

## 원칙

1. **게임 동작을 바꾸지 않는다.** 심은 셋 중 하나다 — 이미 있는 값을 돌려준다, 숨어 있던
   함수에 `export`만 붙인다, 세기만 한다. 난수를 한 번이라도 더 뽑거나 상태를 쓰는 심은
   심이 아니라 패치다. 그러면 그 쪽 숫자는 옛 버전의 숫자가 아니다.
2. **붙인 뒤 기록값 하나를 재현한다.** 그 버전의 `eval.md`·`brief.md`에 적힌 값 중 계측기가
   직접 재는 것(예: 첫 제보 시각)을 1시드로 돌려 맞춰 본다. 맞으면 이식이 됐다고 본다.
   안 맞으면 심이 동작을 건드린 것이다.
3. **조용히 틀리는 경우를 조심한다.** export가 없으면 즉시 오류가 나서 차라리 낫다. 위험한
   것은 오류 없이 값이 달라지는 경우다 — 아래 `createWorld`가 그 예다.

`scripts/apply_known_shims.py`가 아래 넷을 자동으로 붙인다(`prepare_side.sh`가 부른다).

## 알려진 넷 (v0.5.x 이하 엔진)

| 계측기가 부르는 것 | 옛 엔진 | 심 |
| --- | --- | --- |
| `ownedSiteCap()` | 없음. 상수 `MAX_OWNED_SITES`를 직접 씀 | `export function ownedSiteCap() { return MAX_OWNED_SITES; }` |
| `playerCanReactAt()` | 같은 본문이 **export 없이** 있음 | `function` 앞에 `export`만 |
| `tipPoolStages()` | 없음. `spawnTip` 안에 필터가 인라인 | 그 버전 `spawnTip`의 후보 필터를 단계별로 **세기만** 하는 함수. 필터 조건이 버전마다 다르니 그 버전의 `spawnTip`을 읽고 맞춘다 |
| `createWorld(seed, grantTeam)` | 인자가 `seed` 하나. 안에서 `grantStartingTeam`을 바로 부름 | 두 번째 인자 `grantTeam = true`를 받아 `false`면 건너뛴다 |

**`createWorld`가 가장 중요하다.** 계측기는 `createWorld(seed, false)`로 세계를 만들고,
기록기를 붙인 **다음에** `grantStartingTeam`을 부른다. 0초의 '단장 합류'·'첫 파견'을 보려는
것이다. 옛 `createWorld`는 두 번째 인자를 무시하고 팀을 먼저 배정해 버린다. 그러면 오류
없이 첫 1분·10분 사건 종류가 한 종류 적게 잡힌다. 2026-09-24 첫 측정에서 v0.5.1이
1종·2종으로 나왔다가 이 심을 달고 2종·3종이 됐다.

## 그 밖의 export가 빠졌을 때

`apply_known_shims.py`가 "손으로 써야 할 심"을 찍고 멈춘다. 그 함수가 HEAD에서 무엇을
하는지 읽고, 옛 엔진에서 같은 값을 **읽기만 해서** 만들 수 있으면 심을 쓴다. 만들 수 없으면
그 계측 항목을 기준 쪽에서 빼고, 보고서 '어떻게 쟀나'에 빠진 이유를 적는다. 억지로 맞추지 않는다.
