# 실제 브라우저 OfflineAudioContext PCM 진단

## 실행
프로젝트 의존성을 설치한 뒤 `cd projects/cat-cafe-metaverse/tools/audio-offline && node dev.mjs`. 지원되는 관리형 미리보기에서는 `sites-preview start <이 폴더의 절대 경로>`도 가능하다. 브라우저에서 로컬4173을 열고 **PCM 정량 검사 실행**을 누른다. 결과는 화면과 JSON 다운로드로 제공한다. 이 도구는 배포되는 앱에 포함되지 않는다.

시작 시 제품 `app/src/audio.js`를 `public/verified-audio.js`로 바이트 그대로 복사한다. Vite 변환을 피하도록 테스트 모듈과 검증 대상 모두 public 정적 경로에서 제공한다. 페이지가 실제로 받은 모듈 SHA256을 계산한다. 보존된 결과와 소스의 SHA256은 `6f6695154301a4344d51513292c0b34999f4a5fa9f393f3212639a6def5b2b7c`이다. 새 코드로 재실행하면 복제본은 갱신되므로 결과 해시를 반드시 다시 확인한다.

## 무엇을 검증했나
2026-10-31 Cloud Chromium155, 실제 네이티브 OfflineAudioContext 렌더링. 제품 CafeAudio.play()를 그대로 호출하여 실제 OscillatorNode/GainNode/AudioParam 그래프로 PCM을 생성했다. fake context 수치나 soundPlan 재구현 결과가 아니다.

19개 케이스: 3개 행동×44.1/48kHz×볼륨20%/100%, 6동시음, 20음 요청 시6음제한, 시작 전 음소거/볼륨0, 렌더링120ms에서 음소거/cleanup, 설정 가능한24음 상한. 유한 샘플, 비음소거 신호 존재, clipping(|sample|>=1), 재생종료시각, 1초후 꼬리, 중간중단후 무음, 활성음수 상한과 모든 oscillator/gain disconnect 및 최종voices0을 검증한다.

19/19 통과. 기본 상한6음·볼륨100% 겹침 peak0.244629(-12.23dBFS), 설정상한24음 peak0.978515(-0.19dBFS), clipping/nonfinite 모두0. 24음은 기본 설정이 아니며 headroom이 작으므로 상향 권장 근거가 아니다. 단일음 종료 pet0.81998s/feather0.37998s/ball0.39998s. 시작 전 음소거·볼륨0 PCM=0, 120ms mute/cleanup 이후PCM=0, 모든 생성 노드가 disconnect되고 voices0으로 끝났다.

## 반드시 구분할 한계
OfflineAudioContext는 startRendering 이전에는 running이 아니므로 주입한 어댑터의 state만 running, resume만 no-op으로 설정해 제품 play를 사전 예약했다. 나머지 oscillator/gain/destination/currentTime 및 렌더링은 네이티브 실제 객체다. disconnect/start 계수는 실제 메서드를 호출하는 래퍼로 집계했다. 이는 실시간 AudioContext gesture/autoplay·스피커/헤드폰·모바일 기기·주관적 청음 검증이 아니다. 24음 테스트는 이 특정 정렬 시나리오 결과이며 모든 임의음 위상/믹스의 상한 증명은 아니다. 제품 오디오 코드는 변경하지 않았다.
