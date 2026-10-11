# Explicit portable QA checkpoint recovery UI

## 2026-10-10 파일 표시 보완

변경 파일은 `app/src/portable-checkpoint-ui.js`,
`app/tests/portable-checkpoint-ui.test.mjs`, 이 문서의 세 개다.
체크포인트 코어·파일 형식·저장·게임플레이·빌드·기존 복구 모듈은 변경하지 않았다.

- 내보내기와 파일 복원 확인 화면의 SHA-256 이름을 **체크포인트 내용 SHA-256**으로
  수정했다. `digest`를 제외한 메타데이터와 원본 `payload`를 정해진 필드 순서로
  JSON 직렬화한 UTF-8 내용의 해시임을 설명한다. 파일 전체 바이트를 해시하는
  `sha256sum`과 계산 대상이 다르며, 기존 digest 계약과 파일 형식은 그대로다.
- 네이티브 파일 선택 칸과 별도로 선택 시점의 파일명과 정확한 바이트 크기를 표시한다.
  내용을 검증하는 동안에는 `내용 검증 중`, 통과 뒤에는 `내용 검증 완료`로 표시한다.
  다시 그린 네이티브 선택 칸이 비어 보여도 확인한 파일 정보는 유지된다는 안내를 둔다.
  파일명과 크기는 표시용 정보이며 원본 QA·저장 공간·digest·복원 대상 확인을 대신하지 않는다.
- 새 파일을 선택하면 이전 확인 화면을 즉시 대체한다. 빈 선택, 복수 선택, 네이티브
  `cancel`, Back은 이전 파일명·크기·복원 확인을 지운다. 크기 오류와 읽기·검증 실패는
  현재 파일만 보여 주고 검증 미실시 또는 실패 상태를 표시한다.
- 복원 성공에는 `복원에 사용한 파일`, 거절·불확실한 결과에는 `복원을 시도한 파일`로
  파일명·크기를 남긴다. 해당 결과 화면에 복원 재시도나 활성 파일 선택은 없다.
  Back 뒤에는 선택이 비어 있다.
- 파일명을 HTML 이스케이프하고 긴 이름의 줄바꿈과 최대 폭을 지정했다. 네이티브
  `FileList`나 input 값을 복원하지 않으며 `DataTransfer` 등의 숨은 선택 쓰기도 없다.
  기존 선택 토큰·render epoch·분리된 확인 입력·실제 잠금 콜백·stale DOM·중복 클릭
  방어는 유지된다. 네이티브 취소 이벤트도 현재 살아 있는 파일 input에만 적용한다.

### 이번 보완의 검증

Node `v24.19.0`. 다음 집중 묶음을 이번 수정 이후 새로 실행했다.

```
node --check app/src/portable-checkpoint-ui.js
node --check app/tests/portable-checkpoint-ui.test.mjs
node --test --test-concurrency=1 \
  app/tests/portable-checkpoint-ui.test.mjs \
  app/tests/recovery-page.test.mjs \
  app/tests/recovery-storage-ui.test.mjs \
  app/tests/portable-checkpoint.test.mjs
```

결과: **310/310 통과**, 실패·취소·건너뜀·TODO 모두 0,
**3176.850591 ms**. UI/download 121건(기존 100 + 새 회귀 21),
변경하지 않은 기존 복구 UI 56건, 변경하지 않은 portable core 133건이다.
기존 검사는 삭제하지 않았다. 기존 라벨 기대값을 정확한 이름으로 바꾸고,
잘못된 새 파일을 고르는 두 기존 취소 검사에는 이전 버튼의 비활성화 확인을 유지하면서
현재 화면에서 복원 버튼까지 제거됐는지 확인을 추가했다.

새 회귀는 전체 파일 해시와 canonical digest의 차이, 외부 JSON 공백 변경 후 동일한
내용 digest, 표시용 파일명으로 프로필을 선택할 수 없음, 빈 네이티브 input과 독립된
파일명·크기, 선택 시점 정보의 고정, 새 파일과 늦게 끝난 이전 읽기, 네이티브 취소,
빈 선택·복수 선택·Back, 크기·읽기·검증 오류, 복원 성공·거절·불확실 결과,
긴 악성 파일명의 이스케이프와 줄바꿈 속성, 실제 잠금 대기 중 취소 및
분리된 옛 input의 취소 이벤트를 다룬다.

**이번 표시 변경의 실제 브라우저 화면·네이티브 선택 대화상자·긴 이름 시각 배치는 아직
미검증이다.** 테스트는 production handler를 실행하는 합성 DOM/파일/저장 경계 검사다.
통합 담당자가 보고한 v49 네이티브 왕복과 전체 2743건 통과는 변경 이전 체크포인트의
근거이며, 이번 수정의 실제 화면 또는 전체 검증으로 승계하지 않는다.
전체 suite·빌드·브라우저·배포·Git 작업은 이 보완에서 수행하지 않았다.

## 최초 UI 체크포인트 기록

아래는 표시 보완 이전의 289건 검증 기록이다. 현재 변경의 결과는 위에 별도로 기록했다.

2026-10-10. This bounded slice adds the local-file checkpoint UI to the existing
standalone recovery entry. It does not change gameplay, save-core or portable-core
behavior, any existing test, build scripts or build/version headers. The existing
`RECOVERY_BUILD` remains `R12a2`. It does not operate a browser, publish a Site,
initialize Git, push a repository or retry the historical denied save import.
No real QA profile was accessed by these synthetic tests.

## Files

- `app/src/recovery-page.js`: mounts the new UI, routes its actual document
  click/input/change handlers and invalidates pending selections on pagehide or
  a game-link click. Existing historical backup actions remain routed to the
  existing `createUpgradeBackupUi` implementation.
- `app/src/portable-checkpoint-ui.js`: latest-checkpoint selection, local file
  preview/download, independent empty-target confirmation and cancellation.
- `app/tests/portable-checkpoint-ui.test.mjs`: 100 new focused cases through the
  production page mount and local-download helper.
- This document. The separate `portable-qa-checkpoint.md` remains the core contract.

## Explicit user flow

The title has two clearly separate sections: latest committed QA checkpoint and
historical pre-v4/pre-v5 upgrade backups. The latest-source text box starts blank;
there is no profile enumeration or automatic source read. A preview click invokes
`exportPortableCheckpoint` for that exact QA and the current recovery namespace,
with exporter build `R12a2 · portable-v1`. The core owns locked committed/fallback
selection. The preview shows source/namespace, original state version, exporter
build/date, revision/slot, fallback status, level/current XP/earned XP/gold,
difficulty, payload checksum and file SHA-256.

Only the separate preview-bound download button creates a local JSON Blob and
safe `.ewqa.json` filename. The local object URL is revoked even on DOM/click
failure. The UI says a download was requested and directs the user to the browser
list; it does not claim that the device finished saving. It performs no network
transmission. SHA-256 is described as integrity checking, not proof of the player,
normal-input progression or an authenticated author. Preview time, unsaved/later
progress, original-format preservation and non-overwrite limits are visible.

The single-file selector accepts JSON. `File.size` is checked against 2 MiB
before reading. The file is read once and inspected once for this selection;
the core still independently revalidates it at restore. Source QA confirmation,
namespace confirmation and destination QA inputs all start blank. The destination
must be valid, separate from the file's source and in the current namespace.
Foreign-namespace files can be inspected but cannot enable restore. The restore
call binds the original text plus exact expected source, namespace and digest.
The core checks all five destination keys under its exclusive lock; even corrupt
or empty-string records and historical sidecars count as occupied.

Restoration writes only the new empty destination. It neither migrates state nor
launches gameplay. After success, the user must explicitly enter the new QA name
on the same namespace's game title. It explains that subsequently playing and
saving in current code may migrate the stored format.

## Interruption, uncertainty and duplicate actions

Each preview is bound to the visible render epoch and a separate selection epoch.
Click handlers require the current live DOM button plus its source/namespace/
digest/selection tokens. Changed restore fields replace the confirmation button,
so a detached old button cannot authorize a new selection. Programmatic value
changes are also checked before storage access. Inputs, newer files, Back,
historical navigation, game-link navigation and pagehide invalidate pending work.

Both the storage adapter and the actual Web Lock callback check current ownership.
A cancelled operation waiting on hashing, file I/O or a target lock cannot later
start target writes. A transaction already synchronously committed before
navigation is not undone; its delayed completion cannot replace the newer UI.
Double clicks cannot duplicate an in-flight export, download or restore.

Any uncertain restore produces a terminal screen without a retry button. It says
that partial or full target records may remain, preserves source/file, and does
not clean up, overwrite or automatically retry. Non-mutating errors also leave
an explicit error screen. Unsupported locks/storage/file/download APIs fail
without external fallback. Web Locks still protect only cooperating same-origin
writers; the core's existing readback/interference limitations remain unchanged.

## Verification

Node `v24.19.0`, from the project root:

```
node --check app/src/recovery-page.js
node --check app/src/portable-checkpoint-ui.js
node --check app/tests/portable-checkpoint-ui.test.mjs
node --test --test-concurrency=1 \
  app/tests/portable-checkpoint-ui.test.mjs \
  app/tests/recovery-page.test.mjs \
  app/tests/recovery-storage-ui.test.mjs \
  app/tests/portable-checkpoint.test.mjs
```

Final result: **289/289 passed**, zero failed/cancelled/skipped/TODO,
**2886.790759 ms**. This is 100 new UI/download checks, 56 unchanged recovery-page
and recovery-storage UI checks, and 133 unchanged portable-core checks. All three
syntax checks passed. Changed source/test files have no trailing whitespace.

Coverage includes production mounted click/change/input handlers, the actual
mounted default Blob helper, exact scoped three-key export reads and zero source
writes, original v1–5 payloads without migration, fallback metadata, separate
explicit download, all confirmation mismatches, all five occupied keys, stale
DOM and modified tokens, duplicate clicks, delayed source export/file read/file
inspection/target-lock completion, field changes, invalid replacement files,
Back/title/pagehide, post-commit late completion, file size/UTF-8/JSON/checksum/
digest errors, unavailable storage/locks/device APIs and terminal uncertain writes.
The historical recovery tests remain unchanged and still exercise both backup
kinds, their actual storage behavior and earlier cancellation contract.

An initial new-test syntax check caught an `await` in a default parameter; it was
moved into the async body. The first executable new-suite run passed 90/92:
one fixture incorrectly counted the separately requested historical backup read
as a late export read, and another denied fixture storage before seeding it.
The fixtures were corrected to compare post-navigation read counts and inject
denial after setup. No production behavior was relaxed for these failures.
An intermediate UI plus retained-recovery run passed 148/148 before eight further
hardening cases and the unchanged core were added to the final 289-test run.

This is synthetic handler/store evidence. Native file download/selection and
restoration, visual/accessibility review, complete aggregate/build, publication,
actual earned QA provenance and external archival remain integration-owner gates.
