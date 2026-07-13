import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { createOfflineBlueprint, describeAiError, validateBlueprint } from "./blueprint";
import { writeProjectAtomically } from "./scaffold";
import { renderApp, renderScenario } from "./templates";

async function main() {
const idea = '용이 "별빛 편지"를 배달하는 우체국 <게임>';
const first = createOfflineBlueprint("Factory Test", idea);
const second = createOfflineBlueprint("Factory Test", idea);
assert.deepEqual(first, second, "offline blueprint must be deterministic");
assert.equal(first.slug, "factory-test");

assert.throws(
  () => validateBlueprint({ ...first, slug: "INVALID SLUG" }),
  /slug must be lowercase kebab-case/
);
assert.throws(() => validateBlueprint({ ...first, goalCount: 100 }), /goalCount/);
assert.throws(() => validateBlueprint({ ...first, tags: [] }), /tags/);
assert.throws(() => validateBlueprint({ ...first, name: "" }), /name/);
const safeError = describeAiError({
  status: 400,
  statusText: "Bad Request",
  headers: new Headers({ "x-request-id": "req-safe" })
});
assert.match(safeError, /400 Bad Request, request req-safe/);
assert.doesNotMatch(safeError, /별빛 편지|OPENAI_API_KEY/);

const appSource = renderApp(first);
const compiled = ts.transpileModule(appSource, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  reportDiagnostics: true
});
const errors = (compiled.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
assert.deepEqual(errors, [], "rendered App.tsx must parse without TypeScript errors");
assert.match(appSource, /별빛 편지/);
assert.doesNotMatch(appSource, /<게임>.*<게임>/);

const scenario = renderScenario(first);
assert.match(scenario, /data-factory=upgrade/);
assert.match(scenario, /mobileOverflow/);

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "prototype-factory-test-"));
try {
  const existingRoot = path.join(tempRoot, "projects", first.slug);
  await mkdir(existingRoot, { recursive: true });
  await writeFile(path.join(existingRoot, "sentinel.txt"), "preserve me", "utf8");
  await assert.rejects(() => writeProjectAtomically(first, idea, "test", { root: tempRoot }), /already exists/);
  assert.equal(await readFile(path.join(existingRoot, "sentinel.txt"), "utf8"), "preserve me");

  await rm(existingRoot, { recursive: true });
  await assert.rejects(
    () => writeProjectAtomically(first, idea, "test", { root: tempRoot, failAfterBlueprint: true }),
    /injected scaffold failure/
  );
  assert.equal((await readdir(path.join(tempRoot, "projects"))).length, 0, "failed scaffold must leave no partial project");

  const concurrent = await Promise.allSettled([
    writeProjectAtomically(first, idea, "test", { root: tempRoot }),
    writeProjectAtomically(first, idea, "test", { root: tempRoot })
  ]);
  assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(concurrent.filter((result) => result.status === "rejected").length, 1);
  const publishedBlueprint = JSON.parse(
    await readFile(path.join(existingRoot, "data", "factory-blueprint.json"), "utf8")
  );
  assert.deepEqual(publishedBlueprint, first);
  assert.deepEqual(
    (await readdir(path.join(tempRoot, "projects"))).filter((name) => name.startsWith(".")),
    [],
    "concurrent scaffold must clean staging directories"
  );
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

console.log("prototype factory tests: PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
