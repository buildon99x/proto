# ADR: Phaser Canvas with React DOM Panels

Date: 2026-06-14

## Status

Accepted

## Context

알톡! 드래곤 부화장은 클릭 피드백과 중앙 알 연출이 핵심인 2D 클릭커 프로토타입이다. 동시에 도감, 업그레이드, 알 선택 패널처럼 텍스트와 상태가 많은 UI가 필요하다.

## Decision

- 중앙 부화 무대와 클릭 피드백은 Phaser 캔버스로 구현한다.
- 도감, 업그레이드, 자원, 알 선택 UI는 React DOM으로 구현한다.
- 게임 데이터는 `src/data.ts`, 상태 전이와 규칙은 `src/gameLogic.ts`, Phaser 브리지는 `src/EggStage.tsx`로 분리한다.

## Consequences

- 클릭 애니메이션, 균열, 부화 피드백은 캔버스에서 즉각적으로 표현할 수 있다.
- DOM 패널은 반응형 레이아웃과 접근 가능한 버튼 상태를 유지하기 쉽다.
- Phaser 번들이 커져 production build에서 chunk size warning이 발생한다. MVP에서는 수용하고, 정식화 단계에서 코드 스플리팅을 검토한다.
