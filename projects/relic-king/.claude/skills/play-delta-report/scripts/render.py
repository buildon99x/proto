#!/usr/bin/env python3
"""보고서 HTML을 굽는다.

  render.py WORK OUT.html

WORK에는 build_data.py가 만든 report-data.json · ui-data.json과, 이 세션이 직접 쓴
meta.json · narrative.json이 있어야 한다. 숫자는 전부 데이터 파일에서 오고, 문장은
narrative.json에서만 온다 — 템플릿에 특정 버전의 문장이 남지 않게 하기 위해서다.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
WORK, OUT = sys.argv[1], sys.argv[2]
NARR_KEYS = ["h1", "lede", "lanes", "reach", "uiSub", "ui", "ratio", "cost", "cliff", "ledgerActive", "ledgerIdle", "method"]
META_KEYS = ["beforeLabel", "afterLabel", "beforeRef", "afterRef", "date", "ending"]


def load(name):
    return json.load(open(os.path.join(WORK, name), encoding="utf-8"))


data, ui, meta, narr = load("report-data.json"), load("ui-data.json"), load("meta.json"), load("narrative.json")
missing = [k for k in NARR_KEYS if not narr.get(k)] + [f"meta.{k}" for k in META_KEYS if not meta.get(k)]
if missing:
    sys.exit(f"빠진 항목: {', '.join(missing)} — narrative.json·meta.json을 채워라")
for k in ("before", "after", "note"):
    if k not in meta["ending"]:
        sys.exit(f"meta.ending.{k}가 없다")
meta.setdefault("seeds", data["seeds"])
tpl = open(os.path.join(HERE, "..", "assets", "report.tpl.html"), encoding="utf-8").read()
dump = lambda o: json.dumps(o, ensure_ascii=False).replace("</", "<\\/")
html = (tpl.replace("__TITLE__", meta.get("title") or f"유물왕 {meta['afterLabel']} 첫 10분")
           .replace("__DATA__", dump(data)).replace("__UI__", dump(ui))
           .replace("__META__", dump(meta)).replace("__NARR__", dump(narr)))
left = [p for p in ("__DATA__", "__UI__", "__META__", "__NARR__", "__TITLE__") if p in html]
if left:
    sys.exit(f"남은 자리표시자: {left}")
open(OUT, "w", encoding="utf-8").write(html)
print(f"{OUT} ({len(html) / 1024:.0f} KB)")
