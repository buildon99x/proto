"""Reproduce the seventh OpenMontage call using inspectable QA evidence.

The upstream reviewer validates artifacts and supplied check flags; its
motion_detected field is not a measured motion result. This script does not
replace visual inspection or auditory listening.
"""
import dataclasses
import json
import os
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
UPSTREAM = Path(os.environ.get("OPENMONTAGE_ROOT", "/workspace/OpenMontage-source"))
sys.path.insert(0, str(UPSTREAM))

from tools.tool_registry import registry


def load(relative_path):
    return json.loads((PROJECT / relative_path).read_text())


def main():
    browser = load("qa/browser-qa.json")
    metrics = load("qa/metrics.json")
    states = browser.get("states", [])
    browser_checked = (
        browser.get("errors") == []
        and browser.get("seek_repeatable") is True
        and len(states) >= 8
        and len({state.get("character") for state in states}) > 1
        and len({state.get("head") for state in states}) > 1
    )
    frames = [0, 24, 72, 165, 201, 243, 360, 449]
    frames_checked = metrics.get("pass") is True and all(
        (PROJECT / "qa" / f"frame-{frame:03d}.png").is_file()
        for frame in frames
    )
    if not browser_checked or not frames_checked:
        raise SystemExit("Run browser-qa.cjs and verify.py successfully before review.py.")

    registry.discover()
    result = registry._tools["character_animation_reviewer"].execute({
        "rig_plan": load("artifacts/rig_plan.json"),
        "pose_library": load("artifacts/pose_library.json"),
        "action_timeline": load("artifacts/action_timeline.json"),
        "preview_path": str(PROJECT / "hyperframes/index.html"),
        "review_level": "final",
        "browser_preview_checked": browser_checked,
        "frame_samples_checked": frames_checked,
        "output_path": str(PROJECT / "artifacts/character_qa_report.json"),
    })
    receipt = PROJECT / "artifacts/receipt_character_animation_reviewer.json"
    receipt.write_text(json.dumps(dataclasses.asdict(result), ensure_ascii=False, indent=2))
    report = result.data.get("character_qa_report", {})
    print(json.dumps({"success": result.success, "status": report.get("status"),
                      "evidence": ["qa/browser-qa.json", "qa/metrics.json", "qa/frame-*.png"],
                      "note": "Upstream motion_detected is action metadata, not measured motion."},
                     ensure_ascii=False, indent=2))
    if not result.success or report.get("status") != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
