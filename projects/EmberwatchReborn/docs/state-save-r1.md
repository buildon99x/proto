# R1 상태·저장·보상 공용 처리

## 구현 범위와 출처

이 코드는 환경 소실 후 새로 작성한 재구현이다. 원본 0.4.7의 `campaign/save.js`와 `campaign/controller.js`에 있던 두 슬롯/commit receipt, expected revision, Web Locks, 불변 command queue 설계를 참고했다. 원본 파일은 수정하지 않았다. 새 `state.js`, `save.js`, `controller.js`는 최신 잃어버린 Reborn 원문의 회수가 아니다.

- 저장 namespace: `emberwatch-reborn.reimplementation.v1.main` 또는 명시적인 `qa-...` 프로필. 원작/기존 Reborn/다른 QA의 키는 읽거나 쓰지 않는다.
- 시작 상태: L1, 미훈련, 0 XP/금화. R1은 플레이 가능한 시작 장비/스킬/퀘스트를 제공하지 않는다. 다음 수직 슬라이스에서 정상 초기화를 연결한다.
- 공용 runtime dispatch는 현재 능력치 배분, 목표 달성 후 보상 수령, 접근성 옵션 저장을 처리한다. 전투 목표를 임의로 완료하거나 임의 XP/금화를 주는 명령은 없다.
- `watch_patrol`은 Emberwatch 작성 임시 보상이다: 순찰 목표6, XP70, 금화20, 철1. 원작 수치가 아니며 실제 적/전투·수급 경로가 아직 연결되지 않았다. 이 수치만으로 성장 속도가 검증된 것은 아니다.
- 모든 성공은 보상 영수증, 성장, 금화 수입, 재료를 하나의 저장 transaction으로 확정한 뒤 메모리/UI에 알린다. 같은 입력의 연속/동시 호출과 재접속 수령은 재보상하지 않는다.
- 영구 보상 영수증4096개를 넘으면 거절한다. 예전 영수증을 잘라 중복 보상을 허용하지 않는다. 반복 전투용 encounter별 영수증 설계는 R2에서 별도 구현한다.
- 2MiB payload 한도. FNV checksum은 우발적 손상 검출이며 암호학적 보안이 아니다. localStorage는 사용자가 직접 수정할 수 있다.
- staging slot은 commit으로 간주하지 않는다. 최신 손상 시 남아 있는 이전 commit receipt로만 복구하며, 복구됐다는 상태를 돌려준다. 첫 저장에서 head가 없으면 자동으로 성공 처리하지 않고 손상 상태를 알린다.
- 저장 충돌·불확실한 commit은 메모리 진행을 공개하지 않고 명시적인 load까지 추가 입력을 막는다. 저장 adapter가 실제 쓰기 뒤 예외를 내는 경우도 검사한다.
- 브라우저 저장은 프로필별 Web Lock을 필수로 한다. 잠금이 없으면 쓰지 않으며, 나중에 UI가 지원 불가를 안내해야 한다. 동기 store 원시 함수는 격리 adapter/검사 용도다.
- 미구현 스킬/배타 분기/장비 객체는 현재 저장 validator가 거절한다. reference catalog의 존재를 전투 구현으로 취급하지 않는다.

## 검사 층과 한계

`app/tests/state-save.test.mjs`는 실제 `reduceRuntime`, `createController`, `createStore`, `createSession`을 호출한다. 보상 성공 검사에서는 `world.objectives.patrol_scouts=6`을 **합성 fixture로 주입**했다. 실제 전투로 달성했다고 표시하지 않는다. 성장 검사는 실제 XP 함수에 합성 수여량을 전달했다. 새 게임에서 정상 입력으로 XP를 벌었다는 증거가 아니다.

검사한 범위: 잘못된 수치/저장/금화 원장, 중복 수령, 불충족 실패, receipt 한도, 미구현 성장 차단, accessor 실행 차단, 키 격리, 낡은 revision, 동시 UI 입력 queue, 손상 슬롯/헤더/미완 commit, 저장 거절/쓰기 뒤 예외, reload 후 중복 방지, 불변 snapshot/intent/observer, 옵션0–1.

미실행: 브라우저 실제 Web Locks/localStorage, 시작/성장/지역 왕복/사망/승급/보스 경로, 새 스킬·장비, 시각·청취 검토, 일반 입력 플레이, Site 배포, 시간·재미·난이도 수급 검증. 이 체크포인트는 중간 모델 기반이며 게임 완성 빌드가 아니다.

## 실행

프로젝트의 app 폴더에서 `npm test`, `npm run lint`. Node 기본 모듈만 사용하며 외부 dependency 설치가 필요 없다.

원본 보존 검사는 프로젝트 루트의 `python3 scripts/check-recovery-inputs.py`이며 별도 보존한 원본167파일이 같은 repo에 있어야 한다. `pnpm sync:registry`는 sparse 복구 작업면에서 성공하지 못했다: pnpm 환경 디렉터리 `/home/agent/.local/share/pnpm` 생성 ENOENT로 종료1. 원본 root scripts/launcher도 이 sparse 범위에 없으므로 전체 launcher build/release 통과라고 하지 않는다. 현재 범위는 독립 Reborn 앱의 소스·모델 검사이며 공개 배포 빌드는 후속으로 별도 준비한다.
