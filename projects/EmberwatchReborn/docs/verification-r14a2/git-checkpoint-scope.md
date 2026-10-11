# Git 보존 범위

원격 base: buildon99x/proto, codex/emberwatch-campaign, 7240e49430ef34b08cc1f0ac332fb7912e135a4d (원본 0.4.7, Emberwatch 167 파일). 새 codex/emberwatch-rebuild 브랜치에 projects/EmberwatchReborn만 추가한다. 이는 소실된 Reborn Git 이력 복구가 아니라 검증된 Library 기반 재구현 코드의 신규 Git 보존이다.

런타임 바이너리 7개는 기존 원격 원본 blob과 정확히 동일하다. 새로운 QA JPEG 3개는 이 Git 체크포인트에서 제외하고 Library libfile_f6838aec787481919580f453cdaf9f13 에 보존한다. 새/변경 PNG 업로드는 없다. 목록은 git-resource-provenance.json.

요구된 registry 동기화는 pnpm launcher가 환경의 /home/agent/.local/share/pnpm 생성 ENOENT로 막혔다. 설치된 tsx를 node --import tsx로 실행해 동일 원본 registry 스크립트는 성공했다. 생성물은 이 문서 폴더에 검증 증거로만 보존하며 프로젝트 경로 밖의 catalog 변경은 원래대로 복구해 커밋에서 제외한다.

pnpm build:vercel도 같은 package-manager bootstrap 오류로 프로젝트 빌드 전에 중단됐다. 다른 프로젝트 의존성을 설치하거나 Vercel 릴리스를 시도하지 않았다. 독립 app의 Node 자동검사/문법검사/정적 build와 GPT Site 후보 배포를 별도 검증한다. 전체 monorepo/Vercel 배포 성공으로 표현하지 않는다.
