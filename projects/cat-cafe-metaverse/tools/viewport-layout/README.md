# 좁은 뷰포트 레이아웃 진단
앱 빌드 후 이 폴더에서 `node dev.mjs` 또는 관리형 `sites-preview start <절대경로>`를 실행한다. 현재 app/dist를 로컬 after/에 복사하며 이 생성물은 Git에 포함하지 않는다. 브라우저에서4173을 열고 iframe의 **혼자 둘러보기**를 누른 뒤 각 크기 버튼과 **Measure visible layout**을 누른다. 게임 서버는 필요하지 않다.

2026-10-31 Cloud Chromium의320×568,390×844,568×320,844×390,768×1024 iframe에서 실제 DOM 경계를 측정했다. 조이스틱/카드, 헤더/방, 조이스틱/푸터, 안내/방, 안내/카드 겹침 없고 안내가 화면 안에 있는 것을 확인했다. 이전0.2.2의320px 조이스틱/카드24px 겹침은 수정 후28px 간격으로 바뀌었다. 이 과정에서 좁은 헤더 줄바꿈과 가로 안내 offscreen/방 버튼 겹침도 재현하여 수정했다. 원자료는 results-2026-10-31.json.

**한계:** iframe 크기 변경은 CSS 뷰포트 검사이지 실제 휴대폰·터치 입력·coarse-pointer 디바이스 에뮬레이션이 아니다. 768px fine-pointer 브라우저에서 조이스틱이 없는 것은 정상이다; coarse tablet 규칙은 소스/자동검사만 확인했다. Cloud WebGL이 비활성이라 오류 안내가 일부 조작부를 덮는다. 가로 카드의 overflow/scroll 높이는 측정했지만 실제 사용자 스크롤은 오류 안내의 hit-test 차단으로 검증하지 못했으며 강제 클릭하거나 오류 안내를 숨기지 않았다. 수치의 visible은 display/visibility/경계 기준이지 모든 occlusion 및 physical hit-test 통과 의미가 아니다. 실제폰, 실물 멀티터치, 최신 Safari 회귀 및 FPS는 여전히 별도 검증 대상이다.
