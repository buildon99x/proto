import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    /**
     * 기록 전송을 개발에서도 프로덕션과 같은 코드로 돌리기 위한 프록시.
     *
     * 배포에서는 게임이 런처와 같은 출처의 iframe(`/runs/wave-runner/`)이라
     * `/api/...` 한 줄로 닿고 CORS 가 없다. `sendBeacon` 은 프리플라이트를 할 수
     * 없으므로 개발에서도 같은 조건이어야 한다 — vite(5173)와 next(3000)가 갈리는
     * 것을 여기서 덮는다. 런처가 떠 있지 않으면 전송이 실패하고 큐에 남을 뿐이다.
     */
    proxy: {
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: false }
    }
  }
});
