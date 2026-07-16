#!/usr/bin/env python3
"""Seed GitHub milestones, labels, and issues from PRD section 8.

Parses docs/prd/pokedocs-prd-v1.md (milestones -> features -> user stories)
and creates one issue per story, milestone-assigned and labeled by feature
and package. Idempotent: existing milestones/labels/issues are skipped, so
it can re-run after PRD additions.

Usage:
  python3 seed-github-issues.py --dry-run
  python3 seed-github-issues.py
"""
import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

PRD = Path(__file__).resolve().parent.parent / "pokedocs-prd-v1.md"
PRD_URL = "https://github.com/wbaxterh/pokedocs/blob/main/docs/prd/pokedocs-prd-v1.md"

MILESTONE_COLORS = {
    "M0": "607D8B", "M1": "1976D2", "M2": "43A047",
    "M3": "8E24AA", "M4": "F4511E", "M5": "F9A825",
}

FEATURE_PACKAGE = {
    "F0.1": "pkg:repo", "F0.2": "pkg:repo", "F0.3": "pkg:repo",
    "F1.1": "pkg:create-pokedocs", "F1.2": "pkg:preset",
    "F1.3": "pkg:plugin-mermaid-ssr", "F1.4": "pkg:theme",
    "F1.5": "pkg:plugin-agent-endpoints", "F1.6": "pkg:preset",
    "F1.7": "pkg:cli",
    "F2.1": "pkg:cli", "F2.2": "pkg:plugin-frontmatter-schema",
    "F3.1": "pkg:theme", "F3.2": "pkg:plugin-agent-endpoints",
    "F3.3": "pkg:cli", "F3.4": "upstream",
    "F4.1": "pkg:actions", "F4.2": "pkg:actions", "F4.3": "pkg:preset",
    "F5.1": "pkg:theme", "F5.2": "pkg:cli", "F5.3": "pkg:theme",
    "F5.4": "pkg:repo",
}


def split_acceptance(text):
    """Split acceptance criteria on '; ' at paren depth 0."""
    parts, depth, cur = [], 0, []
    i = 0
    while i < len(text):
        ch = text[i]
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == ";" and depth == 0 and text[i + 1 : i + 2] == " ":
            parts.append("".join(cur).strip())
            cur = []
            i += 2
            continue
        cur.append(ch)
        i += 1
    if cur:
        parts.append("".join(cur).strip())
    return [p for p in parts if p]


def parse_prd():
    text = PRD.read_text()
    section8 = text.split("## 8. Milestones")[1].split("\n## 9.")[0]
    milestones, features, stories = {}, {}, []
    cur_m, cur_f = None, None
    lines = section8.splitlines()
    for idx, line in enumerate(lines):
        m = re.match(r"^### (M\d) — (.+)$", line)
        if m:
            cur_m = m.group(1)
            goal = ""
            for la in lines[idx + 1 : idx + 6]:
                if la.startswith("Goal:"):
                    goal = la[len("Goal:"):].strip()
                    break
            milestones[cur_m] = {"title": f"{m.group(1)} — {m.group(2)}", "goal": goal}
            continue
        f = re.match(r"^#### (F\d\.\d) (.+)$", line)
        if f:
            cur_f = f.group(1)
            features[cur_f] = {"name": f.group(2), "milestone": cur_m}
            continue
        s = re.match(r"^- \*\*(S\d\.\d\.\d) — (.+)\*\*$", line)
        if s:
            story_line = lines[idx + 1].strip()
            accept_line = lines[idx + 2].strip()
            assert story_line.startswith("*") and story_line.endswith("*"), f"bad story line for {s.group(1)}"
            assert accept_line.startswith("Acceptance:"), f"bad acceptance line for {s.group(1)}"
            stories.append({
                "id": s.group(1),
                "title": s.group(2),
                "story": story_line.strip("*"),
                "acceptance": split_acceptance(accept_line[len("Acceptance:"):].strip()),
                "feature": cur_f,
                "milestone": cur_m,
            })
    return milestones, features, stories


def gh_api(path, method="GET", fields=None):
    cmd = ["gh", "api", path, "-X", method] if method != "GET" else ["gh", "api", path]
    if fields:
        cmd += ["--input", "-"]
        res = subprocess.run(cmd, input=json.dumps(fields), capture_output=True, text=True)
    else:
        res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"gh api {path} failed: {res.stderr.strip()}")
    return json.loads(res.stdout) if res.stdout.strip() else None


def issue_body(story, features):
    feat = features[story["feature"]]
    checklist = "\n".join(f"- [ ] {c[0].upper() + c[1:]}" for c in story["acceptance"])
    return f"""**Feature:** {story['feature']} — {feat['name']}
**Story ID:** `{story['id']}`

## Story

{story['story']}

## Acceptance criteria

{checklist}

---
_Source: [PRD v1.0 §8]({PRD_URL}). The acceptance criteria above are this issue's definition of done._
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    milestones, features, stories = parse_prd()
    print(f"Parsed: {len(milestones)} milestones, {len(features)} features, {len(stories)} stories")

    if args.dry_run:
        for mid, m in milestones.items():
            n = sum(1 for s in stories if s["milestone"] == mid)
            print(f"  {m['title']}  ({n} stories)")
        print("\nSample issue body for", stories[0]["id"], ":\n")
        print(issue_body(stories[0], features))
        return

    # Milestones (idempotent by title prefix)
    existing = gh_api("repos/{owner}/{repo}/milestones?state=all&per_page=100") or []
    ms_numbers = {}
    for mid, m in milestones.items():
        found = next((e for e in existing if e["title"].startswith(mid)), None)
        if found:
            ms_numbers[mid] = found["number"]
            print(f"milestone exists: {m['title']}")
        else:
            created = gh_api("repos/{owner}/{repo}/milestones", "POST",
                             {"title": m["title"], "description": m["goal"]})
            ms_numbers[mid] = created["number"]
            print(f"milestone created: {m['title']}")

    # Labels (idempotent: skip failures on existing)
    labels = [{"name": "user-story", "color": "00897B", "description": "PRD user story"}]
    for fid, feat in features.items():
        labels.append({"name": fid, "color": MILESTONE_COLORS[feat["milestone"]],
                       "description": feat["name"][:100]})
    for pkg in sorted(set(FEATURE_PACKAGE.values())):
        labels.append({"name": pkg, "color": "37474F" if pkg.startswith("pkg:") else "5C6BC0",
                       "description": ""})
    for lb in labels:
        try:
            gh_api("repos/{owner}/{repo}/labels", "POST", lb)
            print(f"label created: {lb['name']}")
        except RuntimeError as e:
            # gh reports a label collision as a bare 422 Validation Failed
            if "already_exists" in str(e) or "HTTP 422" in str(e):
                print(f"label exists: {lb['name']}")
            else:
                raise

    # Issues (idempotent by [S...] title prefix)
    existing_issues = json.loads(subprocess.run(
        ["gh", "issue", "list", "--state", "all", "--limit", "200", "--json", "title"],
        capture_output=True, text=True, check=True).stdout)
    existing_prefixes = {t["title"].split("]")[0] + "]" for t in existing_issues if t["title"].startswith("[")}

    created = 0
    for story in stories:
        prefix = f"[{story['id']}]"
        if prefix in existing_prefixes:
            print(f"issue exists: {prefix}")
            continue
        gh_api("repos/{owner}/{repo}/issues", "POST", {
            "title": f"{prefix} {story['title']}",
            "body": issue_body(story, features),
            "milestone": ms_numbers[story["milestone"]],
            "labels": ["user-story", story["feature"], FEATURE_PACKAGE[story["feature"]]],
        })
        created += 1
        print(f"issue created: {prefix} {story['title']}")
        time.sleep(1.5)  # stay under GitHub secondary rate limits
    print(f"\nDone. {created} issues created, {len(stories) - created} already existed.")


if __name__ == "__main__":
    sys.exit(main())
