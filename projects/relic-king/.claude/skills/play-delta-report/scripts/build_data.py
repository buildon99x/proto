#!/usr/bin/env python3
"""측정 결과 폴더(WORK)를 읽어 보고서용 데이터 두 개를 만든다.

  WORK/density/{before,after}.json · .log   ← pnpm density --seeds N --json
  WORK/play/first-{before,after}-{n}/report.json (+ 03-first-tip.png)
  WORK/play/suite-after/report.json          ← 전체 UI 검사(선택)

출력: WORK/report-data.json, WORK/ui-data.json

중앙값은 계측기(density.ts)와 같은 규칙 — 정렬 뒤 낮은 쪽 가운데 값 — 으로 잡는다.
표(계측기 출력)와 차트(이 스크립트)가 다른 규칙을 쓰면 같은 축의 숫자가 어긋난다.
"""
import base64, glob, json, os, re, sys

WORK = sys.argv[1] if len(sys.argv) > 1 else "."
KO = {"newSpecies": "신규종", "layerUp": "층 돌파", "tipOpened": "제보", "raceWon": "레이스 승",
      "raceLost": "레이스 패", "lostToRival": "상실", "firstT4": "유일 획득", "siteUnlocked": "거점 해금",
      "teamSlotUnlocked": "발굴단 슬롯", "foremanHired": "단장 합류", "teamDispatched": "파견",
      "teamReturned": "귀환", "displayed": "전시", "museumBuilt": "박물관", "museumUpgraded": "박물관↑",
      "auctionBuilt": "경매장", "curatorHired": "관장", "theft": "도난", "theftResolved": "회수",
      "vaultOverflow": "정원 초과", "sealedBacklog": "봉인 적체", "seasonRollover": "시즌", "ending": "엔딩"}


def lomed(xs):
    v = sorted(x for x in xs if x is not None)
    return v[(len(v) - 1) // 2] if v else None


def ledger(log, header):
    i = log.index(header)
    return [re.split(r"\s{2,}", l.strip()) for l in log[i:].split("\n")[2:16]]


def density():
    out = {"ledger": {}, "reach": {}, "grid": {}, "lanes": {}, "cliff": {}, "kinds": {}, "ko": KO}
    logs, jsons = {}, {}
    for ver in ("before", "after"):
        logs[ver] = open(f"{WORK}/density/{ver}.log", encoding="utf-8").read()
        jsons[ver] = json.load(open(f"{WORK}/density/{ver}.json"))
    out["seeds"] = len(jsons["after"]["seeds"])
    # 레인 차트의 대표 시드 — 계측기가 '겪은 사건 종류'에 찍은 중앙판 시드를 그대로 쓴다
    m = re.search(r"운영 seed (\d+) — 첫 1분", logs["after"])
    rep_seed = int(m.group(1)) if m else jsons["after"]["seeds"][0]
    for ver in ("before", "after"):
        log, D = logs[ver], jsons[ver]
        out["ledger"][ver] = {"active": ledger(log, "── 원장 — ② 운영"), "idle": ledger(log, "── 원장 — ① 탭만")}
        ra = [r for r in D["runs"] if r["label"] == "active"]
        reach = {}
        for k in ("firstTip", "firstRaceResult", "firstT4Encounter", "firstSiteUnlock"):
            vals = [r[k] for r in ra]
            got = [v for v in vals if v is not None]
            # 절반 넘게 도달 못 했으면 중앙값도 '도달 못 함'
            med = lomed(vals) if len(got) * 2 > len(vals) else None
            reach[k] = {"values": vals, "median": med,
                        "worst": max(vals) if all(v is not None for v in vals) else None,
                        "reached": len(got)}
        out["reach"][ver] = reach
        out["grid"][ver] = [{"from": b * 30, "to": (b + 1) * 30,
                             "meaningful": lomed([r["grid30s"][b]["meaningful"] for r in ra]),
                             "ambient": lomed([r["grid30s"][b]["ambient"] for r in ra])} for b in range(20)]
        rep = next((r for r in ra if r["seed"] == rep_seed), ra[0])
        out["lanes"][ver] = {"seed": rep["seed"], "kinds1m": rep["kinds1m"], "kinds10m": rep["kinds10m"],
                             "ratio": rep["ratio10m"],
                             "events": [{"t": e["t"], "k": e["kind"], "n": e.get("n", 1)}
                                        for e in rep["events"] if e["t"] <= 600 and e["kind"] in KO]}
        c = re.search(r"운영: 중앙 (.+?) · 최악 (.+?) \(중앙판 (.+?)\)", log)
        out["cliff"][ver] = {"median": c.group(1), "worst": c.group(2), "where": c.group(3)} if c else \
            {"median": "—", "worst": "—", "where": "—"}
        out["kinds"][ver] = {"ambient10m": lomed([r["ambient10m"] for r in ra]),
                             "meaningful10m": lomed([r["meaningful10m"] for r in ra])}
    return out


def first_milestones(report_path):
    """report.json에서 first 시나리오의 걸음별 게임초를 꺼낸다."""
    rep = json.load(open(report_path))
    for sc in rep["results"]:
        if not sc["scenario"].startswith("first"):
            continue
        m, tip = {}, None
        for c in sc["checks"]:
            if c["name"].startswith("첫 세션 마일스톤"):
                m = json.loads(c["detail"])
            if c["name"].startswith("④ 제보 — 20분 안에"):
                t = re.search(r"t≈([\d,]+)초", c["detail"])
                tip = int(t.group(1).replace(",", "")) if t else None
        return {"onboarding": m.get("onboarding"), "appraise": m.get("appraise"),
                "display": m.get("display"), "tip": tip}
    return None


def img(path):
    if not os.path.exists(path):
        return ""
    return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()


def ui():
    out = {"before": [], "after": [], "shots": {}, "suite": None}
    for ver in ("before", "after"):
        # 실행마다 폴더 하나 — 옆에 같은 이름의 .log도 있으니 폴더만 고른다
        dirs = sorted(d for d in glob.glob(f"{WORK}/play/first-{ver}-*") if os.path.isdir(d))
        for d in dirs:
            r = first_milestones(f"{d}/report.json")
            if r:
                out[ver].append(r)
        out["shots"][ver] = img(f"{dirs[0]}/03-first-tip.png") if dirs else ""
    out["runs"] = min(len(out["before"]), len(out["after"]))
    # 걸음별 회차 편차(초). 한 걸음만 크게 흔들리면 그 걸음의 사정이 따로 있다는 뜻이라
    # 전체 최댓값과 걸음별 값을 같이 남긴다 — 서술(narrative.ui)이 그 이유를 적는다.
    by = {}
    for ver in ("before", "after"):
        for k in ("onboarding", "appraise", "display", "tip"):
            v = [r[k] for r in out[ver] if r[k] is not None]
            by[f"{ver}.{k}"] = round(max(v) - min(v), 1) if len(v) > 1 else 0
    out["spreadBy"] = by
    out["spread"] = max(by.values()) if by else 0
    suite = f"{WORK}/play/suite-after/report.json"
    if os.path.exists(suite):
        rep = json.load(open(suite))
        checks = [c for sc in rep["results"] for c in sc["checks"] if c["pass"] is not None]
        out["suite"] = {"pass": sum(1 for c in checks if c["pass"]), "total": len(checks),
                        "scenarios": len(rep["results"])}
    return out


if __name__ == "__main__":
    d = density()
    json.dump(d, open(f"{WORK}/report-data.json", "w"), ensure_ascii=False)
    u = ui()
    json.dump(u, open(f"{WORK}/ui-data.json", "w"), ensure_ascii=False)
    act = {v: d["ledger"][v]["active"] for v in ("before", "after")}
    print(f"시드 {d['seeds']} · 원장 통과 {sum(r[5] == '✅' for r in act['before'])}/14 → "
          f"{sum(r[5] == '✅' for r in act['after'])}/14")
    print("첫 도달(중앙):", {v: {k: o["median"] for k, o in d["reach"][v].items()} for v in d["reach"]})
    print(f"UI {u['runs']}회 · 편차 최대 {u['spread']}초 {u['spreadBy']} · 전체 검사 {u['suite']}")
    for v in ("before", "after"):
        print(" ", v, [{k: (round(x) if x is not None else None) for k, x in r.items()} for r in u[v]])
