# 햇살냥 · Cat Café Metaverse

원본 절차적 3D 고양이 카페입니다. 같은 방의 방문객·고양이·장난감은 별도 권한 서버가 공유합니다. 세 방은 권장50명, 최대100석이며 끊어진 연결의20초 예약도 정원에 포함합니다. 서버가 없으면 온라인 방문객을 꾸며내지 않습니다. **혼자 둘러보기 · 실시간 연결 아님**을 누르면 서버 없이 고양이 18마리와 내 캐릭터만 있는 로컬 미리보기를 사용할 수 있습니다.

## 실행 (Node20+, pnpm9.15.4)
```sh
git clone https://github.com/buildon99x/proto.git
cd proto
git checkout codex/cat-cafe-metaverse
corepack pnpm install --frozen-lockfile
npm --prefix projects/cat-cafe-metaverse/server ci --ignore-scripts
corepack pnpm --filter cat-cafe-metaverse dev
```
브라우저에서 http://127.0.0.1:4173/ 를 열고 **햇살 카페에 들어가기**. 이 명령은 Vite 정적 앱과 별도 방 서버를 같은 로컬 프로세스 트리로 실행합니다. `/ws` 개발 프록시가 `ws://127.0.0.1:8787/ws`로 전달합니다. 종료는 Ctrl+C.

- PC: WASD/방향키 이동, 드래그 시점, 휠 확대, 고양이 선택 후 쓰다듬기/깃털/공.
- 모바일: 왼쪽 조이스틱, 화면 드래그, 오른쪽 행동 버튼. 실제 휴대전화 접속은 별도 승인된 WSS 호스트가 필요하며 이 로컬 버전은 외부 바인딩을 거부합니다.
- 방 버튼으로 이동. 고양이와2.8m 이내에서 상호작용. 다른 사람이 놀고 있는 고양이는 기다려 주세요.
- WebGL2 필요. 지원하지 않는 브라우저에는 명시적 안내를 표시합니다.

## 정적 빌드와 서버의 구분
```sh
corepack pnpm --filter cat-cafe-metaverse build
npm --prefix projects/cat-cafe-metaverse/server start
```
`app/dist`는 정적 파일이며 서버가 포함되지 않습니다. 방문객은 서버 주소를 입력하지 않습니다. 운영자가 승인된 WSS 서버를 `VITE_ROOM_SERVER_URL=wss://.../ws` 빌드 환경변수로 설정해야 합니다(또는 같은 호스트의 `/ws` 경로를 명시). 설정되지 않은 공개 페이지는 입장 버튼을 비활성화하고 모든 실시간 방이 준비 중임을 안내합니다. 별도 혼자 둘러보기는 온라인 입장과 구분됩니다. HTTPS 화면에서 비보안 ws는 거부합니다. 공개 기본(main) 버전 변경, 유료 호스팅 또는 공개 실시간 서비스 개통은 수행하지 않았습니다. 인터넷용 호스트/TLS/Origin/인증·남용방지·대역폭 검토는 별도입니다. 서버 기본값은 localhost이며, 명시적 운영 설정과 엄격한 HTTPS Origin 검증 코드는 준비되어 있습니다. 실제 공개 리스너/호스트는 실행하지 않았고 서버 재시작 시 임시 세계가 초기화됩니다. 운영 준비 방법과 미검증 컨테이너 레시피는 `server/DEPLOYMENT.md`를 참고하세요.

## 검사
```sh
corepack pnpm --filter cat-cafe-metaverse test
corepack pnpm --filter cat-cafe-metaverse lint
npm --prefix projects/cat-cafe-metaverse/server test
LOAD_SECONDS=30 npm --prefix projects/cat-cafe-metaverse/server run load
corepack pnpm sync:registry
corepack pnpm build:vercel
corepack pnpm verify --project cat-cafe-metaverse
```
현재 실행 결과와 미검증 범위는 `eval.md`, 서버 부하 원자료는 `server/load-packed.jsonl`. 소켓300개와 실제 사용자300명의 렌더링/인터넷 품질은 다릅니다.

## OhMyGame
OhMyGame `c30bfabda86c27084128deca5bc4bd0d4e9983eb`의 기존 폴더 프로젝트로 이 프로젝트 루트를 등록했습니다. 프로젝트 생성/API원문 읽기/재시작 유지 검증 기록은 `docs/ohmygame-integration.json`. 별도 복제된 게임이 아니라 이 proto 폴더가 원본입니다. 키/AI공급자 호출 없이 로컬 API만 사용했습니다. 다른 컴퓨터에서는 OhMyGame에서 **기존 폴더 열기**로 `projects/cat-cafe-metaverse`를 선택하고 위 실행 명령을 사용하세요.

의존성: Three.js0.172.0(MIT), Vite6.4.3(MIT), ws8.18.3(MIT). 외부 이미지/유료 자산 없음. 서버 설계 참고: https://github.com/websockets/ws/blob/master/README.md

OhMyGame 실행 설정: 시작 폴더 `.`, 명령 모드 `node app/dev.mjs`, 미리보기 경로 `/`. 루트 `package.json`도 같은 진입점을 제공합니다. 공식 미리보기 API로 실제 프로젝트 HTML 제공까지 검증했습니다. 앱 루트는 실행 디렉터리와 무관하게 해석하며 할당된 로컬 미리보기 포트를 따릅니다.

## 0.2 변경
참고 분위기를 새 절차적 3D 고양이의 통통한 비율·짧은 발·점눈·파스텔 털무늬로 반영했습니다. 기존 카페를 유지하며 가로·세로를 √2배로 넓혀 바닥과 이동 가능 면적을 정확히 2배로 확장했습니다. 가구·캐릭터 크기와 이동 속도는 유지합니다. 방 선택 후 한 번 눌러 입장하고 나가기 후 다시 입장할 수 있습니다. 공개 실시간 호스트는 아직 연결되지 않았습니다.

## 혼자 둘러보기
입장 화면에서 **혼자 둘러보기 · 실시간 연결 아님**을 누르세요. 고양이가 걷고 쉬며, 가까이 가서 쓰다듬기·깃털·공 놀이를 할 수 있습니다. 내 SD 블록형 캐릭터는 PC WASD/방향키 또는 터치 조이스틱으로 움직입니다. 이 모드는 브라우저 안에서만 실행되며 다른 사람과 연결되거나 저장되지 않습니다. 방 변경·나가기 때 초기화됩니다. 3D 화면에는 WebGL2가 필요합니다.

## 소리와 고양이 반응
처음에는 조용히 시작합니다. 화면 아래 **소리 켜기**를 직접 누르고 **합성음 음량**을 조절하세요. 외부 음원 없이 만든 짧은 합성음으로, 성공한 쓰다듬기·깃털·공 놀이에만 반응합니다. 음소거·창 숨김·나가기 시 재생 중인 음원을 정리합니다. 고양이의 눈·귀·꼬리·하트 반응은 놀이 상태에 따라 바뀌며 무늬는 돌출 메시가 아닌 표면 색상 텍스처입니다.

출시 검증 현황은 `docs/release-gates.md`를 보세요. 코드·정적 후보 배포가 공개 멀티플레이 출시 완료를 뜻하지 않습니다. 이전0.2.2는 실제 MacBook Safari에서 주요3D/조작을 관찰했습니다. 이후 모바일 입력/레이아웃 변경의 새 실물기기 회귀·기기 청음·실제폰 조작·공개 서버 운영 검증은 남아 있습니다. OfflineAudioContext19케이스와 iframe5크기 수치 검사는 청음·실물터치 승인을 대신하지 않습니다.

## 운영 준비0.2.4
기본 로컬 실행은 그대로입니다. 운영 모드는 HTTPS Origin 목록을 명시하지 않으면 시작하지 않으며, Origin 없는 연결도 거부합니다. `/ready`와 제한시간 종료 코드는 loopback에서 검증했습니다. Docker 레시피는 비루트 Node24 기반 소스만 준비했으며 이 환경에 Docker가 없어 이미지 빌드/실행을 검증하지 않았습니다. 공개 호스트·예산·WSS·외부 남용방지 설정 승인이 필요하며 정적 후보 링크가 실시간 서버 개통을 의미하지 않습니다.
