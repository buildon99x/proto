#!/usr/bin/env python3
"""score_concept.py — 컨셉 기획 골든셋 질의 + 컨셉 문서 구조 린트.

골든셋(data/golden-set.json)을 단일 소스로 사용한다. 마크다운 문서
(02/03/06)는 사람용, 본 도구는 기계 질의·구조 점검용.

서브커맨드
  stats                  장르별 사례 수(≥10 충족 검증)·판정 분포 출력
  compare --genre G1 ...  특정 장르/판정의 동급 골든셋 사례(차별화 어휘) 나열
  find <키워드>           제목·X+Y·교훈에서 키워드 검색
  lint <concept.md>      컨셉 문서가 §01 템플릿 13섹션·필수 토큰을 갖췄는지 점검
                         (구조 완성도 점수 + 8대 레드플래그 자가점검 리마인더)

주의: lint는 *구조 완성도*만 기계 점검한다. 내용의 질(선명함·정당성)은
사람/스킬이 §04 루브릭으로 판정한다(README §3.1).
"""
import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data", "golden-set.json")

# §01 템플릿 13섹션 → 탐지 키워드(정규식, 대소문자 무시)
SECTIONS = [
    ("0 식별", r"식별|identity"),
    ("1 로그라인", r"로그라인|logline"),
    ("2 핵심 판타지/미학", r"핵심\s*판타지|판타지.*감정|aesthetic"),
    ("3 세계관·톤", r"세계관|world|톤"),
    ("4 코어 루프", r"코어\s*루프|core\s*loop"),
    ("5 차별화·결정", r"차별화|differentiation|흥미로운\s*결정"),
    ("6 피처 적합·스코프", r"피처\s*적합|feature\s*fit|스코프"),
    ("7 캐릭터/클래스", r"캐릭터|클래스|character"),
    ("8 비주얼·톤앤매너", r"톤앤매너|비주얼|visual"),
    ("9 데모컷·사운드", r"데모\s*컷|30초|사운드|audio"),
    ("10 유사사례·포지셔닝", r"유사\s*사례|comparable|포지셔닝"),
    ("11 MDA 분석", r"\bMDA\b|mechanics.*dynamics"),
    ("12 메타·리텐션·CAR", r"리텐션|메타|\bCAR\b|유능.*자율.*관계"),
    ("13 프리모템·가드레일", r"프리모템|premortem|가드레일"),
]

# 필수 토큰(품질 바 핵심) → (이름, 정규식)
TOKENS = [
    ("X+Y 차별화 공식", r"\+"),
    ("30초 데모컷", r"30\s*초|30s|first\s*30"),
    ("CAR 3요소", r"\bCAR\b|유능|자율|관계"),
    ("프리모템", r"프리모템|premortem"),
]

REDFLAGS = [
    "R1 me-too 라이브서비스 — 갈아탈 이유 한 줄이 없다",
    "R2 정체성 부재 — '그래서 뭐 하는 건데?'가 나온다",
    "R3 스튜디오/엔진 강점과 충돌",
    "R4 스코프 표류 — 코어 후크가 신규 시스템에 가려짐",
    "R5 타이밍·포화 — 직접 경쟁작이 같은 시기, 차별 약함",
    "R6 약속≠실물 — 마케팅 가독성을 빌드가 못 지킴",
    "R7 접근성·수익·복잡도(특히 카드) 진입장벽 높음",
    "R8 리텐션 루프 부재 — 후크는 있으나 CAR·메타가 빔",
]


def load():
    with open(DATA, encoding="utf-8") as f:
        return json.load(f)


def cmd_stats(args):
    d = load()
    cases = d["cases"]
    print(f"총 사례: {len(cases)}")
    print("\n장르별 (목표 ≥10):")
    for g, label in d["genres"].items():
        n = sum(1 for c in cases if c["genre"] == g)
        mark = "✅" if n >= 10 else ("▽" if g == "misc" else "❌")
        print(f"  {mark} {g:5} {n:3}  {label}")
    print("\n판정 분포:")
    verds = {}
    for c in cases:
        verds[c["verdict"]] = verds.get(c["verdict"], 0) + 1
    for v, n in sorted(verds.items(), key=lambda kv: -kv[1]):
        print(f"  {v:11} {n}")


def cmd_compare(args):
    d = load()
    rows = [c for c in d["cases"] if c["genre"] == args.genre]
    if args.verdict:
        rows = [c for c in rows if c["verdict"] == args.verdict]
    if not rows:
        print(f"(매칭 없음) genre={args.genre} verdict={args.verdict}")
        return
    label = d["genres"].get(args.genre, args.genre)
    print(f"== {args.genre} {label} — 동급 골든셋 {len(rows)}종 ==\n")
    for c in rows[: args.limit]:
        rf = " ".join(c.get("redflags", []))
        rf = f"  [{rf}]" if rf else ""
        print(f"[{c['id']}] {c['title']} ({c['year']}) — {c['verdict']}{rf}")
        print(f"    X+Y : {c['xy']}")
        print(f"    교훈 : {c['lesson']}")
        print()


def cmd_find(args):
    d = load()
    kw = args.keyword.lower()
    hits = [
        c
        for c in d["cases"]
        if kw in c["title"].lower()
        or kw in c["xy"].lower()
        or kw in c["lesson"].lower()
    ]
    if not hits:
        print(f"(검색 결과 없음) '{args.keyword}'")
        return
    for c in hits:
        print(f"[{c['id']}] {c['title']} ({c['genre']}, {c['verdict']}) — {c['xy']}")


def cmd_lint(args):
    if not os.path.exists(args.path):
        print(f"파일 없음: {args.path}")
        sys.exit(2)
    text = open(args.path, encoding="utf-8").read()
    low = text.lower()

    print(f"== 구조 린트: {args.path} ==\n")
    print("[섹션 점검] §01 템플릿 13섹션")
    found = 0
    for name, pat in SECTIONS:
        ok = re.search(pat, text, re.I) is not None
        found += ok
        print(f"  {'✓' if ok else '✗'} {name}")
    print(f"\n[필수 토큰]")
    tok_found = 0
    for name, pat in TOKENS:
        ok = re.search(pat, text, re.I) is not None
        tok_found += ok
        print(f"  {'✓' if ok else '✗'} {name}")

    sect_score = found / len(SECTIONS)
    tok_score = tok_found / len(TOKENS)
    completeness = round(100 * (0.7 * sect_score + 0.3 * tok_score))
    print(f"\n[구조 완성도] {completeness}/100  "
          f"(섹션 {found}/{len(SECTIONS)}, 토큰 {tok_found}/{len(TOKENS)})")
    if completeness < 80:
        print("  → 80 미만: 누락 섹션/토큰을 채워라(§01 품질 바).")
    else:
        print("  → 구조 충족. 내용의 질은 §04 루브릭(12항목)으로 사람이 채점.")

    print(f"\n[레드플래그 자가점검] (기계 판정 불가 — 직접 ✅/❌)")
    for r in REDFLAGS:
        print(f"  [ ] {r}")
    print("\n합격선(§04): 루브릭 ≥52/60 AND 레드플래그 0개.")


def main():
    p = argparse.ArgumentParser(description="컨셉 골든셋 질의 + 컨셉 문서 린트")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("stats").set_defaults(func=cmd_stats)

    c = sub.add_parser("compare")
    c.add_argument("--genre", required=True, help="G1..G10 또는 misc")
    c.add_argument("--verdict", choices=["success", "failure", "mixed", "redemption"])
    c.add_argument("--limit", type=int, default=20)
    c.set_defaults(func=cmd_compare)

    f = sub.add_parser("find")
    f.add_argument("keyword")
    f.set_defaults(func=cmd_find)

    l = sub.add_parser("lint")
    l.add_argument("path", help="컨셉 기획 마크다운 경로")
    l.set_defaults(func=cmd_lint)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
