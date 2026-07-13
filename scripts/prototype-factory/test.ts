import assert from "node:assert/strict";
import ts from "typescript";
import { createOfflineBlueprint, validateBlueprint } from "./blueprint";
import { renderApp, renderScenario } from "./templates";

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

console.log("prototype factory tests: PASS");
