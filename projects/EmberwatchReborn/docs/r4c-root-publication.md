# R4c 공개 루트 승격

2026-10-09 17:01:25 UTC 배포 성공. https://emberwatch-reborn.buildon733500.chatgpt.site/

- Site ID: appgprj_6ac8ea942a608191bb680178f189f1d3
- 공개/active, Site 버전11
- 저장 버전: appgprj_6ac8ea942a608191bb680178f189f1d3~appgver_cbe8b21d032c819185a4d44a0d0f1638
- deployment: appgdep_6ac91dd5f9c481919da2698dc343b8e3 (succeeded)
- Site 소스: 2be5bbea42661d1e682e3cd5bb0736f57f3c9a3f
- 앱: R4c / package0.4.0-reimplementation.3, 구현 소스 e1158e4f08d35994bae0fb0566f30a192e177dd0
- 업로드 tar 해시111ec9be9a0acffbd206f05fb4f30f4a5820bfef02e133253b0e54dd0a3cd854,32020480bytes,91files

후보 v10의45빌드파일과 루트45파일을 byte 단위 일치 확인 후 공식 Sites helper로 소스 동기화·패키징했다. `/qa-r4/` 후보는 그대로 유지되고 저장 namespace도 분리된다. 원본 Emberwatch0.4.7 사이트/저장소/ref는 변경하지 않았다. 원래 대기 중인 PNG Git 게시와 세이브 가져오기는 재시도하지 않았다.

## 게시본 정상 입력 회귀

17:02 dot 브라우저에서 실제 루트 첫 화면 R4c를 확인했다. 승격 직전 R3b에서 정상 조회한 자신의 기존 QA `qa-r2-live-20261009`를 게시 후 이어하기로 열었다. L4,누적492XP,XP42/250,124G,HP36/76,MP46/46,기력57/57,25처치/1사망,힘2/잔여13/기술점수8을 유지했다. 철퇴+0/방패+1/두건+0,철3/목재0/실3,대장장이도구,물약2,사용자 지정 E/1/Z를 유지했다. 새로운 수문소 의뢰 안내가 정상 표시되며 후보의 L6/아이템이 루트에 섞이지 않았다. 실제 일반 사용자 프로필은 읽거나 바꾸지 않았다.

기존 QA를 안전 저장한 뒤 자신의 QA 탭11만 닫았고, 기존 탭2/4는 남겼다. 보존된 R4a/R4c 후보와 release 저장을 같은 프로필로 혼동하지 않는다.

후보에서 검증한 전체 첫 던전/보스/보고/장비/사망/새로고침 기록은 r4c-normal-input-qa.md 참조. 자동334/334와 실제 보통 난이도 플레이를 분리한다. 전체 캠페인, 실제 숙련 승급, 중후반 완결, 마법사·궁사, 실제 청취와 AAA 수준 합격은 아직 미달/미검증이다.

메타데이터 제한: 네이티브 update_site_metadata는 title만 지원하고 description 갱신은 지원하지 않는다. 설명 갱신 시도는 schema 오류로 적용되지 않았다. 서비스 목록의 오래된 R2 설명은 남지만 실제 게임 첫 화면/도움말은 R4c와 현재 범위를 정확히 표시한다. 비공식 API/브라우저 우회는 하지 않았다.
