#!/usr/bin/env python3
"""옛 엔진에 계측기가 부르는 함수가 없을 때, 알려진 읽기 전용 심을 붙인다.

  apply_known_shims.py WORKTREE_APP_DIR      (예: WT/projects/relic-king/app)

원칙 — 심은 **게임 동작을 바꾸지 않는다.** 이미 있는 값을 돌려주거나(상수), 숨어 있던
함수에 export만 붙이거나, 세기만 한다. 붙인 뒤에는 반드시 그 버전의 기록값 하나를
재현해 확인한다(references/shims.md).

여기 없는 export가 빠졌다면 손으로 심을 쓴다. 이 스크립트는 알려진 넷만 안다.
"""
import io, os, re, sys

APP = sys.argv[1]
ENG = os.path.join(APP, "src/game/engine.ts")
DEN = os.path.join(APP, "src/sim/density.ts")
eng = io.open(ENG, encoding="utf-8").read()
den = io.open(DEN, encoding="utf-8").read()


def exported(name):
    return re.search(rf"export (?:function|const|let) {name}\b", eng) is not None


need = re.search(r'import \{([^}]*)\} from "\.\./game/engine"', den)
names = [n.strip() for n in need.group(1).split(",") if n.strip()] if need else []
missing = [n for n in names if not exported(n)]
applied, manual = [], []

for n in missing:
    if n == "ownedSiteCap" and "MAX_OWNED_SITES" in eng:
        eng += ("\n// [play-delta-report 심] HEAD의 ownedSiteCap()과 같은 값 — 이 버전은 상수를 그대로 쓴다.\n"
                "export function ownedSiteCap(): number { return MAX_OWNED_SITES; }\n")
        applied.append(n)
    elif n == "playerCanReactAt" and re.search(r"\nfunction playerCanReactAt\(", eng):
        eng = re.sub(r"\nfunction playerCanReactAt\(", "\nexport function playerCanReactAt(", eng, count=1)
        applied.append(n + " (export만)")
    elif n == "tipPoolStages" and re.search(r"function available\(", eng) and "playerCanReactAt" in eng:
        # 이 버전의 spawnTip 필터를 그대로 따라 센다. 필터가 다르면 이 심도 맞춰 고쳐야 한다.
        eng += ("\n// [play-delta-report 심] spawnTip의 후보 필터를 단계별로 세기만 한다(읽기 전용).\n"
                "export function tipPoolStages(w: World) {\n"
                "  const universe = ARTIFACTS.filter((a) => a.tier >= 2 && a.sourceStatus === \"verified\");\n"
                "  const stock = universe.filter((a) => available(w, a));\n"
                "  const layer = stock.filter((a) => a.minLayer <= w.sites[a.site].layer);\n"
                "  const reactable = layer.filter((a) => playerCanReactAt(w, a.site));\n"
                "  return { all: universe.length, stock: stock.length, layer: layer.length,\n"
                "    reactable: reactable.length, sites: [...new Set(reactable.map((a) => a.site))] };\n"
                "}\n")
        applied.append(n + " (spawnTip 필터 확인 필요)")
    else:
        manual.append(n)

# createWorld의 계측용 문 — 이게 없으면 0초의 단장 합류·첫 파견이 계측기 붙기 전에 일어나
# 사건 종류가 조용히 한두 개 적게 잡힌다(오류 없이 틀린다. 2026-09-24에 실제로 겪었다).
m = re.search(r"export function createWorld\(seed = (\d+)\): World \{", eng)
if m and "grantStartingTeam(world);" in eng:
    eng = eng.replace(m.group(0), f"export function createWorld(seed = {m.group(1)}, grantTeam = true): World {{", 1)
    eng = eng.replace("  grantStartingTeam(world);",
                      "  if (grantTeam) grantStartingTeam(world); // [play-delta-report 심] 계측용 문", 1)
    applied.append("createWorld(seed, grantTeam) 문")

io.open(ENG, "w", encoding="utf-8").write(eng)
print("붙인 심:", applied or "없음")
if manual:
    print("손으로 써야 할 심:", manual)
    sys.exit(2)
