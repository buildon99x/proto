# Dragon Post Office Spec

## 런타임

- Vite + React + TypeScript 단일 화면 앱
- 정적 artifact를 launcher iframe에서 실행
- AI Prototype Factory blueprint schema v1

## 상태

- `resource`: 보유 마력
- `progress`: 다음 유물 진행도
- `completed`: 완성한 유물 수
- `power`: 클릭당 진행 효율
- `upgraded`: 효율 강화 구매 여부

## 규칙

- 주 행동 1회당 마력 +3
- 진행도 5를 채우면 유물 1개 완성
- 강화 비용은 마력 9, 효율은 x2
- 유물 5개와 강화 1회를 모두 달성하면 성공
