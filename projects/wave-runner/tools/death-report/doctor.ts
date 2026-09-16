/**
 * Blob 스토어 점검 — **왕복이 실제로 되는가.**
 *
 * 코드가 있다고 수집이 되는 것이 아니다. 토큰이 없거나, 스토어가 공개로 만들어졌거나,
 * 한도에 걸려 잠겼거나, 프로젝트에 연결되지 않았을 수 있고 그 넷은 증상이 전부 다르다.
 * 여기서 쓰기 → 목록 → 읽기 → 삭제를 한 번 돌려 어디서 끊기는지 이름을 붙인다.
 *
 * 남기지 않는다 — 점검이 쓴 객체는 같은 실행에서 지운다. 지우지 못하면 그 경로를
 * 찍어 사람이 치울 수 있게 한다.
 *
 *   pnpm exec tsx projects/wave-runner/tools/death-report/doctor.ts [--project <id>]
 */
import { del, get, list, put } from "@vercel/blob";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { LOCAL_DIR, credentials, diagnose, prefixFor } from "./blob";

const argv = process.argv.slice(2);
const i = argv.indexOf("--project");
const project = i >= 0 ? argv[i + 1] : "wave-runner";

const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => console.log(`  ✗ ${m}`);
const info = (m: string) => console.log(`    ${m}`);

function localSummary(): void {
  const root = path.join(LOCAL_DIR, prefixFor(project));
  if (!existsSync(root)) {
    info(`개발 폴백도 비어 있다 (${path.relative(process.cwd(), root)})`);
    return;
  }
  let files = 0;
  let bytes = 0;
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const s = statSync(full);
      if (s.isDirectory()) walk(full);
      else if (name.endsWith(".ndjson")) {
        files += 1;
        bytes += s.size;
      }
    }
  };
  walk(root);
  info(`개발 폴백에 ${files}개 · ${(bytes / 1024).toFixed(1)}KB — 보려면 pull.ts --local`);
}

async function main() {
  console.log(`Blob 점검 — 프로젝트 ${project}\n`);

  const cred = credentials();
  if (cred.kind === "none") {
    bad("자격 없음");
    console.log("");
    for (const line of diagnose()) info(line);
    console.log("");
    info("스토어가 없다면:  vercel blob create-store <이름> --access private --region icn1");
    info("스토어가 있다면:  vercel link  후  vercel env pull   (레포 루트에서)");
    info("`vercel env pull` 의 기본 출력은 .env.local 이다. 커밋하지 않는다.");
    info("스토어를 만들었는데도 키가 없으면, 그 스토어가 이 프로젝트에 연결됐는지 본다");
    info("(대시보드의 Storage 탭에서 loop-lab 이 Connected Projects 에 있어야 한다).");
    console.log("");
    localSummary();
    process.exit(1);
  }
  ok(`자격 ${cred.note}`);

  const probe = `tele/_doctor/${Date.now()}.ndjson`;
  const payload = `{"probe":${Date.now()}}\n`;
  let wrote = false;

  try {
    // 1) 쓰기. 여기서 막히면 토큰이 읽기 전용이거나 스토어가 한도로 잠긴 것이다.
    const putRes = await put(probe, payload, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/x-ndjson",
      ...cred.options
    });
    wrote = true;
    ok(`쓰기 — ${putRes.pathname}`);

    // 2) 공개로 만들어졌는지. 비공개 객체는 인증 없이 받으면 200 이 아니어야 한다.
    const anon = await fetch(putRes.url).catch(() => null);
    if (anon && anon.ok) {
      bad("스토어가 **공개**다 — URL 만 알면 누구나 수집본을 받아 간다");
      info("비공개 스토어를 새로 만들어 연결하는 것이 답이다. 지금 것은 폐기한다.");
    } else {
      ok(`비공개 — 인증 없는 요청은 ${anon ? anon.status : "거부"}`);
    }

    // 3) 목록. 접두사 조회가 되어야 pull 이 동작한다.
    const listed = await list({ prefix: "tele/_doctor/", limit: 10, ...cred.options });
    if (listed.blobs.some((b) => b.pathname === putRes.pathname)) ok("목록 — 방금 쓴 것이 보인다");
    else bad("목록 — 방금 쓴 것이 보이지 않는다 (전파 지연일 수 있다)");

    // 4) 읽기. 비공개는 인증을 거쳐 스트림으로 온다.
    const res = await get(putRes.pathname, { access: "private", ...cred.options });
    if (!res) bad("읽기 — 방금 쓴 객체를 찾지 못했다");
    else {
      const back = res.statusCode === 200 ? await new Response(res.stream).text() : "";
      if (back === payload) ok("읽기 — 내용이 같다");
      else bad(`읽기 — 내용이 다르다 (${back.length}B vs ${payload.length}B)`);
    }

    // 5) 실제 수집본 현황
    let files = 0;
    let bytes = 0;
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: prefixFor(project), cursor, limit: 1000, ...cred.options });
      for (const b of page.blobs) {
        if (!b.pathname.endsWith(".ndjson")) continue;
        files += 1;
        bytes += b.size;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    console.log("");
    if (files === 0) {
      info(`수집본 없음 — ${prefixFor(project)} 아래가 비어 있다. 아직 아무도 플레이하지 않았거나`);
      info("엔드포인트가 이 스토어를 못 보고 있다.");
    } else {
      const fps = new Set<string>();
      let c2: string | undefined;
      do {
        const page = await list({ prefix: prefixFor(project), cursor: c2, limit: 1000, ...cred.options });
        for (const b of page.blobs) {
          const m = b.pathname.split("/")[2];
          if (m) fps.add(m);
        }
        c2 = page.hasMore ? page.cursor : undefined;
      } while (c2);
      info(`수집본 ${files}개 · ${(bytes / 1024).toFixed(1)}KB · 코스 지문 ${[...fps].join(", ")}`);
      // Hobby 한도는 저장 1GB 다. 넘기면 스토어가 30일 잠기고 **내보내기도 막힌다.**
      info(`Hobby 저장 한도 1GB 대비 ${((bytes / 1024 / 1024 / 1024) * 100).toFixed(3)}%`);
    }
  } catch (error) {
    bad(`끊김 — ${error instanceof Error ? error.message : String(error)}`);
    info("토큰이 만료됐거나, 스토어가 삭제됐거나, 사용 한도로 잠겼을 수 있다.");
    info("한도로 잠기면 이미 모은 것을 내보내는 것까지 막히므로, 주기적 덤프가 유일한 방어다.");
    process.exitCode = 1;
  } finally {
    if (wrote) {
      try {
        await del(probe, cred.options);
        ok("정리 — 점검 객체를 지웠다");
      } catch {
        bad(`정리 실패 — ${probe} 를 손으로 지워야 한다`);
      }
    }
  }

  console.log("");
  localSummary();
}

main().catch((error) => {
  console.error("실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
