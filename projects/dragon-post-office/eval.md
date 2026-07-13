# Dragon Post Office Eval

## 자동 E2E

1. 초기 목표, 자원, 주 행동이 표시된다.
2. 행동 반복으로 마력이 증가한다.
3. 강화 버튼이 활성화되고 구매 후 효율이 x2가 된다.
4. 유물 5개를 완성하면 성공 메시지가 표시된다.
5. 다시 시작 버튼이 나타난다.
6. 390px 모바일 화면에서 가로 넘침이 없다.
7. 페이지와 콘솔 오류가 없다.

## 명령

- `pnpm --filter dragon-post-office test`
- `node scripts/playtest/run.mjs --project dragon-post-office --no-build --strict`
