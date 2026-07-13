# AI 프로토타입 공장 Spec

## 명령

```bash
pnpm prototype:factory -- --name "Dragon Post Office" --prompt "용이 우체국을 운영하는 경영 게임"
```

옵션:

- `--name <name>`: 필수, 영문/숫자를 포함하는 프로젝트 이름
- `--prompt <idea>`: 필수, 자유 형식 아이디어
- `--offline`: API 호출 없이 결정론적 블루프린트 생성
- `--blueprint <json>`: 미리 작성한 블루프린트를 사용
- `--no-verify`: 생성 후 빌드와 브라우저 검증 생략
- `--dry-run`: 프로젝트를 만들지 않고 블루프린트만 출력
- `--resume`: 동일한 블루프린트로 실패한 생성 작업을 이어서 실행

## 블루프린트

모델 출력은 다음 필드만 허용한다.

- `name`, `slug`, `pitch`
- `theme`: `warm`, `mystic`, `ocean`, `forest`, `neon`
- `actionLabel`, `resourceName`, `itemName`
- `goalCount`, `rewardPerAction`, `upgradeCost`
- `tags`, `playerGoal`, `successMessage`

문자열 길이, slug 형식, 숫자 범위, 배열 길이를 검증한다. 생성 앱에는 JSON 문자열 리터럴로만 주입하며 모델이 만든 JavaScript를 실행하지 않는다.

## 생성 산출물

- 표준 프로젝트 디렉터리와 `project.json`
- 구체화된 `brief.md`, `spec.md`, `eval.md`, `README.md`, `changelog.md`
- 아이디어와 블루프린트를 보존한 `prompts/initial-request.md`, `data/factory-blueprint.json`
- React 기반 1화면 마이크로 루프 앱
- 범용 selector를 사용하는 `tests/e2e/scenario.mjs`
- 검증 후 `assets/screenshots/shots/factory-report.json`과 스크린샷

## 앱 루프

- 주 행동 버튼을 누르면 진행도와 자원이 증가한다.
- 자원으로 1회 업그레이드하면 행동 효율이 증가한다.
- 목표 횟수만큼 아이템을 완성하면 성공 상태가 된다.
- 재시작할 수 있고 모바일 폭에서 가로 넘침이 없어야 한다.

## AI 연동

- `OPENAI_API_KEY`가 있고 `--offline`이 아니면 `OPENAI_BASE_URL` 또는 기본 Responses API를 호출한다.
- 모델은 `OPENAI_MODEL`로 선택하며 기본값을 제공한다.
- 네트워크 또는 파싱 실패 시 조용히 품질을 낮추지 않고 실패 사유를 알린 뒤 오프라인 재실행 방법을 제시한다.
