# AI 프로토타입 공장 Eval

## 생성기 단위 검사

1. 같은 이름과 아이디어의 오프라인 블루프린트는 동일해야 한다.
2. 잘못된 slug, 빈 문자열, 범위 밖 숫자는 거부한다.
3. 템플릿에 따옴표와 HTML 문자가 포함되어도 유효한 TypeScript를 생성한다.
4. 기존 프로젝트 slug를 덮어쓰지 않는다.
5. dry-run은 프로젝트 파일을 만들지 않는다.
6. scaffold 중간 실패는 최종 프로젝트나 임시 디렉터리를 남기지 않는다.
7. 같은 slug의 동시 생성에서는 하나만 성공하고 성공한 프로젝트는 보존된다.
8. API 실패 응답 본문은 사용자 로그에 포함하지 않는다.

## 실제 생성 검사

1. 한 줄 아이디어에서 `projects/{slug}`가 생성된다.
2. `brief.md`, `spec.md`, `eval.md`가 placeholder가 아닌 구체적인 내용을 가진다.
3. `project.json`이 registry 스키마를 통과한다.
4. 생성 앱의 타입 검사와 Vite 프로덕션 빌드가 통과한다.
5. 브라우저 시나리오가 초기 화면, 업그레이드, 목표 완료, 모바일 화면을 캡처한다.
6. 페이지·콘솔 오류와 모바일 가로 넘침이 없다.
7. factory report가 모든 단계를 PASS로 기록한다.

## 전체 회귀 검사

- `pnpm factory:test`
- `pnpm validate:projects`
- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `pnpm build:vercel`
