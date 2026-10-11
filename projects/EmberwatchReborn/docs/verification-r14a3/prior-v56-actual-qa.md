# R14a2 / Site v56 실제 입력 QA

2026-10-10 21:47–21:57 UTC, dot cloud Chrome. 공개 후보 https://emberwatch-reborn.buildon733500.chatgpt.site/qa-r14/ . 루트 R11b6.1·qa-r12 R12a6 파일은 변경하지 않았다. v56 Site source 1b82a3d0ae3a8ca331f7d9af6b2d0603fc3ba6a8. 이 묶음은 실제 관찰이며 자동 3,763검사와 합산하지 않는다.

## 정상 입력으로 확인
- 기존 qa-r14a1-wasd-20261010 이어하기: 실제 설정은 클릭 이동, J 철퇴/RMB 망치/Q 돌진/가운데+B 방패/Space 통합 회피/1 물약/V 대화. L1, HP55/MP40/STA45, XP0/G0, 0/6 퀘스트, 물약2가 그대로였다.
- 선택한 한 프로필을 복구 UI에서 미리 확인 후 JSON 다운로드. l1-before-controls5.ewqa.json은 revision185, FNV f0fe2ac6, 내용 digest cff462aa78cba8daf72ca5eeda7ccdb5a058336fec57223085c1e7785f0f9f6d. 원본은 변경하지 않았다.
- 명시 '전체 기술 배치 켜기'로 controls5를 활성화. J 슬롯 비우기→F 슬롯 철퇴 선택. 중복 기술 버튼은 비활성, HUD가 F 철퇴/J 빈 슬롯으로 바뀌었다. 자원·진행은 전환으로 변하지 않았다.
- 실제 RMB 망치, F 철퇴, Space+F 입력으로 적1 처치. G3/XP9, HP36/55·MP37.744/40·STA45·물약2 상태와 새 키를 저장→실제 reload→이어하기로 복원했다. 도착 안전 대기 중 값은 증가하지 않았다. 사진 controls5-reload.jpg.
- 키 설정의 '전환 전 키 설정 복원' 명시 클릭 후 J 철퇴, 기존 클릭/조준/추적 옵션 복원. 진행은 G3/XP9와 위 생존 상태로 유지되었다. 구 R14a1 코드에 controls5를 읽혔다는 주장은 아니다.
- 신규 qa-r14a2-context-20261010, 클릭 이동 프리셋, 보통. 브란 라벨 한 번 클릭→접근→훈련 모달, 무료4기술·물약2. 에다 클릭 뒤 바닥 새 클릭으로 예약 취소: 오린 쪽에 도착하며 에다 모달이 늦게 열리지 않았다.
- 다시 먼 에다 라벨을 1200ms 누름 요청→접근→대화 한 번, 정상 퀘스트 수락. 출입구 라벨 클릭→잿길 지역 전환과 신규 입력 대기. V를 추가로 누르지 않았다. context-eda-dialog.jpg.
- 적 군집을 향해 LMB1400ms 이동 요청: 군집 앞에서 막힌 위치를 관찰. J+Space950ms 요청 뒤 위치 변화와 HP43 유지. 몸 반경·정확한 밀기량·모든 대형 적은 이 화면만으로 검증한 것이 아니다.
- 밝은 효과0: 붉은 적 공격 예고, 플레이어, 금색 표적/타격 경계가 보였다. 망치1회 MP40→25, 적1 처치/XP12/G4. 훈련/주행/전투는 모두 일반 입력이며 레벨·자원·피해 주입 없음.
- 새 프로필 저장 후 복구 UI에서 해당 프로필만 export: revision62, FNV5cce423b, 내용 digest d95f84e3a592ff4cfa3f40e1e81e0b2f80320a327f13df60b461cfc18affb309. l1-context-normal-earned.ewqa.json. production inspectPortableCheckpoint는 두 JSON 모두 ok. 복원 실험은 아직 하지 않았다.
- 안전 저장·다운로드 후 자신의 tab18/19를 닫았으며 이전 qa-r12 recovery tab5는 유지했다.

## 즉시성 관찰과 발견 결함
- UI 계측: 망치 input1 start2.10ms/render dispatch20.80ms/audio dispatch2.50ms/contact294.60ms. 구르기 input3 start1.20ms/render23.80ms.
- 별도 F 홀드 input9 start31.30ms/render42.90ms/audio31.40ms/contact248.10ms. F25ms 요청 탭 input11 start0.90ms/render29.50ms/audio0.90ms, 바로 메뉴로 정지해 contact는 미관찰.
- 이는 앱 핸들러 및 이벤트 시각이다. 물리 키보드→화면/스피커 지연이나 POE2 실측, 프레임보다 짧은 탭 검증은 아니다. 25ms는 60Hz 한 프레임보다 길다.
- 회수 중 F 최초 pulse는 recovery-too-early로 거절됐다. 뒤의 정상 홀드 재개 이벤트가 별도 sequence인데 UI가 kind=input만 그려 시작 미관찰로 보이는 관측 누락 발견. 30/60/120Hz production handler 재현으로 실제 재개를 확인했으며 후속R14a3에서 반복 시작 기준 표시를 별도로 추가 중. 현재v56은 그 수정 전이다.
- controls5 키 추가/제거 버튼 접근성 이름이 실제 배치 기술 대신 역사 슬롯명을 쓰는 작은 결함 발견. v4 클릭 모드 설명도 좌클릭 기본공격을 고정 기술해 현재J와 불일치. 후속 UI 수정 중.

## 미완료
- 8슬롯 전체 기술/전문 채널의 실제 입력, WASD 독립 조준, 회피 후 연속 유지 공격의 영상 수준 확증, 대형/비밀문 몸 충돌과 모서리, 메뉴/blur/사망 유령 입력 전 범위.
- 망치 캡처는 준비를 시도했지만 캡처 시점에는 접촉·처치였다. 파일명도 hammer-contact-flash0.jpg로 기록. 화려한 FX의 모든 단계·기술별 품질, 실제 청취·오디오 지연·장기 프레임비용은 미검증.
- 캡처와 짧은 장면으로 전체 전투 재미·POE2 동일성·AAA 달성을 판정하지 않는다. 밸런스 및 R13 확장은 보류.
