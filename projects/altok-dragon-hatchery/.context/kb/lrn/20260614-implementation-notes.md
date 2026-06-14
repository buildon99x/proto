# Learning: 알톡! 드래곤 부화장 구현 메모

Date: 2026-06-14

## Notes

- 프로젝트 생성 스크립트의 slugify는 한글 이름만 입력하면 빈 slug가 되어 실패한다. 영문 생성명 `Altok Dragon Hatchery`로 프로젝트를 만들고 `project.json`의 표시 이름을 한국어로 바꿨다.
- 레지스트리 스키마는 `type: game`을 허용하지 않는다. 게임 프로토타입은 `type: demo`와 `tags: ["game", "clicker"]`로 표현했다.
- sandbox 안에서 Vite/esbuild가 상위 경로 접근 제한으로 빌드에 실패할 수 있다. 같은 명령을 승인된 외부 실행으로 재시도하면 정상 빌드된다.
- Phaser 의존성을 추가할 때 기존 `node_modules`가 외부 pnpm store를 가리켜 `--store-dir C:\Users\jhchoi\AppData\Local\pnpm\store\v3` 지정이 필요했다.
