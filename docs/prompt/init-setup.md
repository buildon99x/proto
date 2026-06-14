
목표는 **Prototype Lab Monorepo 초기 세팅**입니다.

````md
# Codex 작업 요청: Prototype Lab Monorepo 초기 세팅

## 목표

단일 Git Repo와 단일 Vercel Project로 운영되는 `Prototype Lab Monorepo`를 초기 세팅해줘.

이 레포는 다양한 얼리프로덕션 / 프로토타입 / PoC / 내부 툴 프로젝트를 생성, 관리, 실행, 테스트, 개선, 배포하기 위한 구조다.

핵심 원칙은 다음과 같다.

1. Vercel에 배포되는 브라우저 사이트는 `launcher` 하나다.
2. `launcher`는 프로젝트를 보여주고 실행하는 카탈로그/런처일 뿐이다.
3. 실제 프로젝트의 모든 자산은 해당 프로젝트 폴더에 종속되어야 한다.
4. 각 프로젝트는 작은 독립 제품처럼 관리한다.
5. 전체는 하나의 Git Repo에서 관리한다.
6. 배포는 하나의 Vercel Project로 한다.
7. Codex가 이후 새 프로젝트를 반복적으로 생성할 수 있도록 스크립트, 템플릿, 문서, 규칙을 함께 만든다.

---

## 최종 레포 구조

다음 구조를 기준으로 생성해줘.

```txt
early-production-lab/
├─ launcher/
│  ├─ app/
│  │  ├─ page.tsx
│  │  ├─ projects/
│  │  │  ├─ page.tsx
│  │  │  └─ [slug]/
│  │  │     ├─ page.tsx
│  │  │     └─ run/
│  │  │        └─ page.tsx
│  │  └─ layout.tsx
│  ├─ components/
│  ├─ lib/
│  ├─ public/
│  │  └─ runs/
│  ├─ package.json
│  ├─ next.config.ts
│  └─ tsconfig.json
│
├─ projects/
│  └─ sample-project/
│     ├─ app/
│     │  ├─ src/
│     │  │  ├─ main.tsx
│     │  │  └─ App.tsx
│     │  ├─ index.html
│     │  ├─ package.json
│     │  ├─ vite.config.ts
│     │  └─ tsconfig.json
│     ├─ assets/
│     │  ├─ images/
│     │  ├─ icons/
│     │  ├─ screenshots/
│     │  ├─ references/
│     │  └─ generated/
│     ├─ data/
│     │  ├─ mock/
│     │  ├─ fixtures/
│     │  └─ samples/
│     ├─ prompts/
│     │  ├─ initial-request.md
│     │  └─ improvement-log.md
│     ├─ tests/
│     │  ├─ smoke/
│     │  └─ e2e/
│     ├─ notes/
│     │  └─ decisions.md
│     ├─ project.json
│     ├─ README.md
│     ├─ brief.md
│     ├─ spec.md
│     ├─ eval.md
│     └─ changelog.md
│
├─ packages/
│  ├─ registry/
│  ├─ shared-ui/
│  └─ shared-utils/
│
├─ templates/
│  ├─ vite-react-project/
│  ├─ next-project/
│  ├─ static-html-project/
│  └─ canvas-project/
│
├─ scripts/
│  ├─ create-project.ts
│  ├─ sync-launcher-registry.ts
│  ├─ build-project.ts
│  ├─ build-all-projects.ts
│  └─ validate-project.ts
│
├─ .codex/
│  ├─ instructions.md
│  └─ workflows/
│     ├─ create-project.md
│     ├─ improve-project.md
│     ├─ test-project.md
│     └─ release-to-launcher.md
│
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
├─ tsconfig.base.json
├─ vercel.json
├─ README.md
└─ .gitignore
````

---

## 기술 스택

다음 스택을 사용해줘.

* Package manager: `pnpm`
* Monorepo task runner: `turbo`
* Launcher: `Next.js App Router`
* Project app 기본 템플릿: `Vite + React + TypeScript`
* Styling: 기본 CSS 또는 Tailwind 중 단순한 쪽 선택
* Test 기본값: smoke test 구조만 생성
* 배포 대상: 단일 Vercel Project

---

## 중요한 구조 원칙

### 1. Launcher는 프로젝트 자산을 소유하지 않는다

`launcher`는 브라우저 카탈로그/런처다.

하지 말아야 할 것:

```txt
launcher/src/projects/customer-insight/
launcher/public/images/customer-insight/
launcher/components/project-specific-ui/
```

해야 할 것:

```txt
projects/customer-insight/app/
projects/customer-insight/assets/
projects/customer-insight/data/
projects/customer-insight/prompts/
projects/customer-insight/tests/
```

단, 실행을 위해 빌드된 정적 결과물은 배포 시점에만 다음 경로로 복사한다.

```txt
launcher/public/runs/{project-slug}/
```

이 폴더는 generated artifact로 취급한다.

---

### 2. 프로젝트는 독립 제품처럼 캡슐화한다

각 프로젝트 폴더 안에는 아래 요소가 모두 있어야 한다.

```txt
app/          # 실행 코드
assets/       # 이미지, 아이콘, 스크린샷, 참고 이미지, 생성 이미지
data/         # mock, fixture, sample data
prompts/      # 초기 요청, 이미지 생성 프롬프트, Codex 개선 프롬프트
tests/        # smoke/e2e 테스트
notes/        # 판단 기록, 회고, 결정 로그
project.json
README.md
brief.md
spec.md
eval.md
changelog.md
```

프로젝트를 이해하고 재현하는 데 필요한 모든 것은 해당 프로젝트 폴더 안에 있어야 한다.

---

### 3. packages는 최소화한다

`packages`에는 정말 공통적인 것만 둔다.

* `packages/registry`: 프로젝트 메타데이터 로딩/검증/타입
* `packages/shared-ui`: 3개 이상의 프로젝트에서 반복되는 UI만
* `packages/shared-utils`: 일반 유틸만

프로젝트 전용 컴포넌트, 이미지, 데이터, 프롬프트는 절대 packages로 올리지 않는다.

---

## 프로젝트 메타데이터 스키마

각 프로젝트는 반드시 `project.json`을 가진다.

`sample-project/project.json`은 다음 구조로 만들어줘.

```json
{
  "id": "sample-project",
  "name": "Sample Project",
  "status": "prototype",
  "type": "webapp",
  "runtime": "static-artifact",
  "summary": "Prototype Lab Monorepo의 기본 샘플 프로젝트입니다.",
  "tags": ["sample", "prototype"],
  "projectRoot": "projects/sample-project",
  "entry": {
    "kind": "iframe",
    "path": "/runs/sample-project/index.html"
  },
  "docs": {
    "brief": "brief.md",
    "spec": "spec.md",
    "eval": "eval.md",
    "readme": "README.md",
    "changelog": "changelog.md"
  },
  "assets": {
    "cover": "assets/screenshots/cover.png"
  },
  "commands": {
    "dev": "pnpm --filter sample-project dev",
    "build": "pnpm --filter sample-project build",
    "test": "pnpm --filter sample-project test"
  }
}
```

`packages/registry`에는 이 스키마에 대한 TypeScript 타입과 간단한 검증 함수를 만들어줘.

---

## Launcher 요구사항

`launcher`는 다음 페이지를 제공해야 한다.

```txt
/                         # 홈. 프로젝트 요약 카드 표시
/projects                 # 전체 프로젝트 목록
/projects/[slug]          # 프로젝트 상세
/projects/[slug]/run      # 프로젝트 실행 화면
```

### 홈 `/`

* 레포 목적 설명
* 등록된 프로젝트 카드 표시
* 프로젝트 상태, 타입, 태그 표시
* “Open project” 버튼
* “Run” 버튼

### `/projects`

* 모든 프로젝트 목록
* status/type/tags 표시
* 프로젝트 상세 페이지 링크

### `/projects/[slug]`

* 프로젝트 이름
* summary
* status
* type
* runtime
* tags
* projectRoot
* commands
* docs 목록
* run 페이지로 이동하는 버튼

### `/projects/[slug]/run`

* 상단에 프로젝트명, 상태, 상세 페이지 링크 표시
* `entry.kind === "iframe"`이면 iframe으로 `entry.path` 실행
* iframe sandbox 속성 적용
* 실행 경로가 없을 때는 친절한 empty state 표시

---

## Registry 생성 방식

`scripts/sync-launcher-registry.ts`를 만들어줘.

역할:

1. `projects/*/project.json`을 스캔한다.
2. 타입/필수 필드를 검증한다.
3. `packages/registry/src/generated/projects.ts`를 생성한다.
4. launcher는 generated registry를 import해서 사용한다.

생성 파일 예시:

```ts
export const projects = [
  {
    id: "sample-project",
    name: "Sample Project",
    ...
  }
] as const;
```

---

## 빌드 방식

단일 Vercel Project에서 전체가 동작해야 한다.

루트 `package.json`에 다음 스크립트를 구성해줘.

```json
{
  "scripts": {
    "dev": "pnpm --filter launcher dev",
    "build": "turbo build",
    "build:vercel": "pnpm sync:registry && pnpm build:projects && pnpm --filter launcher build",
    "build:projects": "tsx scripts/build-all-projects.ts",
    "build:project": "tsx scripts/build-project.ts",
    "sync:registry": "tsx scripts/sync-launcher-registry.ts",
    "validate:projects": "tsx scripts/validate-project.ts",
    "create:project": "tsx scripts/create-project.ts",
    "test": "turbo test",
    "lint": "turbo lint"
  }
}
```

`build-all-projects.ts` 역할:

1. 모든 프로젝트의 `project.json`을 읽는다.
2. `runtime === "static-artifact"`인 프로젝트의 `app`을 빌드한다.
3. 결과물을 `launcher/public/runs/{project-id}/`로 복사한다.
4. 기존 `launcher/public/runs`는 빌드 전에 정리한다.

`sample-project`는 Vite 앱이므로 build 결과는 `projects/sample-project/app/dist`에 생기고, 이것을 `launcher/public/runs/sample-project/`로 복사한다.

---

## Vercel 설정

단일 Vercel Project를 전제로 한다.

`vercel.json`은 루트에 둔다.

```json
{
  "buildCommand": "pnpm build:vercel",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs"
}
```

Root Directory는 repo root 기준으로 동작하도록 맞춰줘.

---

## 템플릿 요구사항

`templates/vite-react-project`를 실제로 사용할 수 있는 형태로 만들어줘.

포함 내용:

```txt
app/
├─ src/
│  ├─ main.tsx
│  └─ App.tsx
├─ index.html
├─ package.json
├─ vite.config.ts
└─ tsconfig.json

assets/
data/
prompts/
tests/
notes/
project.json
README.md
brief.md
spec.md
eval.md
changelog.md
```

`create-project.ts`는 최소한 다음을 지원해야 한다.

```bash
pnpm create:project -- --name "Customer Insight Dashboard"
```

동작:

1. 이름을 slug로 변환한다.
2. `templates/vite-react-project`를 `projects/{slug}`로 복사한다.
3. `project.json`의 id/name/projectRoot/entry/commands를 새 slug 기준으로 수정한다.
4. `prompts/initial-request.md`에 생성 요청을 기록할 수 있는 placeholder를 둔다.
5. registry를 갱신한다.

복잡한 옵션은 나중에 추가할 수 있게 단순하게 구현해줘.

---

## sample-project 요구사항

`projects/sample-project/app`에는 실제로 실행 가능한 간단한 Vite React 앱을 만들어줘.

화면 내용:

* “Sample Project”
* “This project is served through the Launcher.”
* 프로젝트 구조 설명 카드
* assets/data/prompts/tests가 프로젝트 폴더에 종속된다는 메시지
* 간단한 버튼 또는 상태 변화 하나

빌드 후 `/projects/sample-project/run`에서 iframe으로 실행되어야 한다.

---

## 문서 요구사항

루트 `README.md`에는 다음을 설명해줘.

1. 이 레포의 목적
2. 구조 원칙
3. 프로젝트 생성 방법
4. 프로젝트 실행 방법
5. Launcher 실행 방법
6. Vercel 배포 방법
7. 프로젝트 자산 캡슐화 원칙
8. Codex 사용 방법

`.codex/instructions.md`에는 Codex가 앞으로 반드시 지켜야 할 규칙을 작성해줘.

핵심 규칙:

```txt
- 새 프로젝트는 반드시 projects/{slug} 아래에 생성한다.
- 프로젝트 전용 자산은 해당 프로젝트 폴더 밖으로 빼지 않는다.
- launcher는 프로젝트별 자산을 소유하지 않는다.
- launcher/public/runs는 빌드 산출물이다.
- 구현 전 brief/spec/eval을 먼저 작성한다.
- 구현 후 registry를 갱신한다.
- 구현 후 pnpm build:vercel이 성공해야 한다.
```

워크플로우 문서도 작성해줘.

```txt
.codex/workflows/create-project.md
.codex/workflows/improve-project.md
.codex/workflows/test-project.md
.codex/workflows/release-to-launcher.md
```

---

## 완료 조건

작업이 끝나면 아래가 가능해야 한다.

```bash
pnpm install
pnpm sync:registry
pnpm build:projects
pnpm --filter launcher dev
pnpm build:vercel
```

그리고 브라우저에서 다음이 동작해야 한다.

```txt
/
 /projects
 /projects/sample-project
 /projects/sample-project/run
```

`/projects/sample-project/run`에서는 sample-project가 iframe으로 실행되어야 한다.

---

## 구현 시 주의사항

1. 과하게 복잡한 추상화는 만들지 말 것.
2. 첫 버전은 단순하고 명확하게 동작하는 것을 우선할 것.
3. 공통 패키지는 최소한으로 만들 것.
4. 프로젝트별 전용 자산은 반드시 프로젝트 내부에 둘 것.
5. launcher는 registry 기반으로만 프로젝트를 인식하게 할 것.
6. build artifact 복사는 scripts에서 처리할 것.
7. 타입 오류 없이 빌드되도록 할 것.
8. TODO를 남기더라도 핵심 경로는 실제 동작해야 한다.

---

## 최종 산출

초기 세팅 완료 후 다음을 요약해서 알려줘.

1. 생성한 구조
2. 주요 스크립트
3. sample-project 실행 방법
4. 새 프로젝트 생성 방법
5. Vercel 배포 시 확인할 점
6. 아직 남겨둔 TODO

```
```
