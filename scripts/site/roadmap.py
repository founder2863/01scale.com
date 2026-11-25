"""Build the Roadmap tab's data from docs/process/ROADMAP.md (MVP1-E0-54).

Reads:
- docs/process/ROADMAP.md        the waves, side tracks and later groups: their stories in
                                  order, value and reason, how the order was worked out, risks
- docs/epics/*.md                 every story's title and size (S, M or L)
- docs/process/cost-model.json    the person-days per size, and the done stories (closed
                                  issues, saved by `npm run human-costs`)
- GitHub (optional)               the issue number of every story, for direct links

Writes:
- app/how-its-built/roadmap.ts   the data behind /how-its-built/roadmap

Rules:
- No figure is typed by hand on the page: sizes come from the epics files, days from
  the cost model, done from the closed issues, totals are summed here.
- The day counts typed in ROADMAP.md (each row's "Days" and the section headings) are
  checked against the sum of the sizes. A mismatch stops the build, so the file and the
  page cannot drift apart.
- A story ID in ROADMAP.md that is not in an epics file stops the build too.

Run from the repo root:  npm run roadmap
Without network (stories without a saved issue number link to an issue search):
  npm run roadmap -- --offline
"""
import json
import re
import subprocess
import sys
from datetime import date
from urllib.parse import quote

ROADMAP = "docs/process/ROADMAP.md"
EPICS = ["docs/epics/MVP1-EPICS.md", "docs/epics/MVP2-EPICS.md", "docs/epics/AUTOREP-EPICS.md"]
MODEL = "docs/process/cost-model.json"
OUT = "app/how-its-built/roadmap.ts"
REPO = "founder2863/01scale.com"

HEADING = re.compile(r"^### ([A-Z0-9]+-E\d+-\d+) · (.+?)(?: — ([SML]))?\s*$")
STORY_REF = re.compile(r"\b(?:([A-Z0-9]+)-)?(E\d+-\d+)\b")
ISSUE_TITLE = re.compile(r"^\[([A-Z0-9]+-E\d+-\d+)\]")
SECTIONS = {"Main path": "main", "Side tracks": "side", "Later": "later"}


def fail(message):
    print(f"roadmap: {message}", file=sys.stderr)
    sys.exit(1)


def parse_epics():
    stories = {}
    for path in EPICS:
        try:
            text = open(path, encoding="utf-8").read()
        except FileNotFoundError:
            continue
        for line in text.splitlines():
            m = HEADING.match(line)
            if m:
                stories[m.group(1)] = {"title": m.group(2).strip(), "size": m.group(3)}
    return stories


def story_ids(cell, order):
    """The story IDs in a cell, in order. "E8-02 to E8-08" takes every story between the two
    in the epics file; an ID without a product prefix is MVP1."""
    refs = [(m.start(), m.end(), f"{m.group(1) or 'MVP1'}-{m.group(2)}") for m in STORY_REF.finditer(cell)]
    ids, i = [], 0
    while i < len(refs):
        start, end, sid = refs[i]
        if i + 1 < len(refs) and re.fullmatch(r"\s*(?:\([SML]\)\s*)?to\s*", cell[end:refs[i + 1][0]]) \
                and sid in order and refs[i + 1][2] in order:
            a, b = order.index(sid), order.index(refs[i + 1][2])
            ids.extend(order[a:b + 1])
            i += 2
        else:
            ids.append(sid)
            i += 1
    return ids


def split_row(line):
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def parse_roadmap(text):
    """The sections of ROADMAP.md: tables of groups, the method bullets and the risks."""
    sections, current = [], None
    for line in text.splitlines():
        if line.startswith("## "):
            current = {"heading": line[3:].strip(), "lines": []}
            sections.append(current)
        elif current is not None:
            current["lines"].append(line)
    return sections


def bullets(lines):
    out = []
    for line in lines:
        if line.startswith("- "):
            out.append(line[2:].strip())
    return out


def table(lines):
    rows = [split_row(l) for l in lines if l.strip().startswith("|")]
    if len(rows) < 3:
        return None, []
    return rows[0], [r for r in rows[2:]]


def stated_days(heading):
    m = re.search(r"(\d+) person-days", heading)
    return int(m.group(1)) if m else None


def fetch_issues():
    """Story ID -> issue number, from every issue in the repository. Needs gh and network."""
    out = subprocess.run(
        ["gh", "api", "-X", "GET", "search/issues", "--paginate",
         "-f", f"q=repo:{REPO} is:issue", "-f", "per_page=100",
         "--jq", ".items[] | [.number, .title] | @tsv"],
        capture_output=True, text=True, check=True, timeout=120,
    ).stdout
    issues = {}
    for line in out.splitlines():
        number, title = line.split("\t", 1)
        m = ISSUE_TITLE.match(title)
        if m:
            issues[m.group(1)] = int(number)
    return issues


def saved_issues():
    """Issue numbers from the last generated file, so an offline run keeps its direct links."""
    try:
        text = open(OUT, encoding="utf-8").read()
    except FileNotFoundError:
        return {}
    return {sid: int(n) for sid, n in re.findall(r'"id": "([A-Z0-9]+-E\d+-\d+)",\s*"title": [^\n]*\n\s*"size": [^\n]*\n\s*"days": [^\n]*\n\s*"done": [^\n]*\n\s*"issue": (\d+)', text)}


def main(argv):
    model = json.load(open(MODEL, encoding="utf-8"))
    per_size = model["person_days_per_size"]
    done = {d["id"]: d["issue"] for d in model["done"]["stories"]}
    epics = parse_epics()
    order = list(epics)

    issues = saved_issues()
    if "--offline" not in argv:
        try:
            issues.update(fetch_issues())
        except Exception as e:  # no gh, no network: keep the saved numbers
            print(f"Could not read issues ({e}); using saved issue numbers.", file=sys.stderr)
    issues.update(done)

    method, risks, groups, errors = [], [], [], []
    for section in parse_roadmap(open(ROADMAP, encoding="utf-8").read()):
        heading = section["heading"]
        if heading.startswith("How it was worked out"):
            for item in bullets(section["lines"]):
                m = re.match(r"\*\*(.+?):\*\*\s*(.*)", item)
                method.append({"label": m.group(1), "text": m.group(2)} if m else {"label": "", "text": item})
            continue
        if heading.startswith("Risks"):
            risks = bullets(section["lines"])
            continue
        kind = next((v for k, v in SECTIONS.items() if heading.startswith(k)), None)
        if not kind:
            continue
        header, rows = table(section["lines"])
        if not header:
            errors.append(f"section '{heading}' has no table")
            continue
        title = re.sub(r"\s*\(.*\)\s*$", "", heading)
        group = {"kind": kind, "title": title, "reasonLabel": header[-1], "rows": []}
        for cells in rows:
            if len(cells) != len(header):
                errors.append(f"row '{cells[0]}' has {len(cells)} cells, expected {len(header)}")
                continue
            col = {h.lower(): c for h, c in zip(header, cells)}
            name, story_cell, reason = cells[0], cells[1], cells[-1]
            days_cell, value = col.get("days", ""), col.get("value", "")
            after_cell = col.get("starts after")
            stories, seen = [], set()
            for sid in story_ids(story_cell, order):
                if sid in seen:
                    continue
                seen.add(sid)
                story = epics.get(sid)
                if not story:
                    errors.append(f"{sid} in '{name}' is not in an epics file")
                    continue
                days = per_size.get(story["size"]) if story["size"] else None
                issue = issues.get(sid)
                href = (f"https://github.com/{REPO}/issues/{issue}" if issue
                        else f"https://github.com/{REPO}/issues?q={quote(f'is:issue [{sid}]')}")
                stories.append({"id": sid, "title": story["title"], "size": story["size"], "days": days,
                                "done": sid in done, "issue": issue, "href": href})
            total = sum(s["days"] or 0 for s in stories)
            stated = re.match(r"\s*(\d+)", days_cell)
            if stated and int(stated.group(1)) != total:
                errors.append(f"'{name}' says {stated.group(1)} days; its stories' sizes add up to {total}")
            row = {
                "name": name,
                "value": value,
                "reason": reason,
                "days": total,
                "remainingDays": sum(s["days"] or 0 for s in stories if not s["done"]),
                "stories": stories,
            }
            if after_cell is not None:
                # "Start", or the waves it waits for by number: "1", "0 and 2".
                row["after"] = [] if after_cell.strip().lower() == "start" else re.findall(r"\d+", after_cell)
            group["rows"].append(row)
        # The main path runs one wave after another: give each wave its place on the timeline,
        # counted in person-days from the start (one builder, no parallel work).
        # With a "Starts after" column, a wave starts the day after the last wave it waits for
        # ends, so waves can run in parallel; without it, one after another.
        if kind == "main":
            by_number, elapsed = {}, 0
            for r in group["rows"]:
                number = (re.match(r"(\d+)", r["name"]) or [None, r["name"]])[1]
                if "after" in r:
                    missing = [n for n in r["after"] if n not in by_number]
                    if missing:
                        errors.append(f"'{r['name']}' starts after wave {', '.join(missing)}, which is not listed above it")
                    begin = max([by_number[n]["end"] for n in r["after"] if n in by_number] or [0])
                else:
                    begin = elapsed
                r["start"], r["end"] = begin + 1, begin + r["days"]
                by_number[number] = r
                elapsed = max(elapsed, r["end"])
            # Lanes: a wave that starts at the beginning opens a lane; a wave after one other wave
            # stays in its lane; a wave after two or more joins them back into lane 0.
            for r in group["rows"]:
                after = r.get("after")
                if after is None:
                    r["lane"] = 0
                elif not after:
                    r["lane"] = len({x["lane"] for x in group["rows"] if "lane" in x and x.get("after") == []})
                elif len(after) == 1 and after[0] in by_number:
                    r["lane"] = by_number[after[0]]["lane"]
                else:
                    r["lane"], r["join"] = 0, True
            group["elapsedDays"] = elapsed
        group["days"] = sum(r["days"] for r in group["rows"])
        group["remainingDays"] = sum(r["remainingDays"] for r in group["rows"])
        group["storyCount"] = sum(len(r["stories"]) for r in group["rows"])
        said = stated_days(heading)
        # "Side tracks" has no stated total; "Main path" and "Later" do.
        if said is not None and said != group["days"]:
            errors.append(f"'{heading}' says {said} person-days; its stories add up to {group['days']}")
        groups.append(group)

    all_stories = [s for g in groups for r in g["rows"] for s in r["stories"]]
    ids = [s["id"] for s in all_stories]
    for sid in sorted({i for i in ids if ids.count(i) > 1}):
        errors.append(f"{sid} is listed more than once")
    if not groups:
        errors.append("no waves or groups found")
    if errors:
        fail("\n  ".join(["ROADMAP.md does not match the epics files:"] + errors))

    main_group = next((g for g in groups if g["kind"] == "main"), None)
    data = {
        "updated": date.today().isoformat(),
        "source": ROADMAP,
        "personDaysPerSize": per_size,
        "method": method,
        "risks": risks,
        "criticalPath": [r["name"] for r in main_group["rows"]] if main_group else [],
        "groups": groups,
        "totals": {
            "stories": len(all_stories),
            "days": sum(s["days"] or 0 for s in all_stories),
            "doneStories": sum(1 for s in all_stories if s["done"]),
            "remainingDays": sum(s["days"] or 0 for s in all_stories if not s["done"]),
        },
    }
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// Generated by scripts/site/roadmap.py from docs/process/ROADMAP.md (MVP1-E0-54).\n")
        f.write("// Do not edit: change ROADMAP.md or the epics files, then run `npm run roadmap`.\n\n")
        f.write("export const roadmap = ")
        f.write(json.dumps(data, indent=2, ensure_ascii=False))
        f.write(" as const;\n")
    t = data["totals"]
    print(f"Roadmap: {t['stories']} stories, {t['days']} person-days, "
          f"{t['doneStories']} done, {t['remainingDays']} person-days left. Wrote {OUT}")


if __name__ == "__main__":
    main(sys.argv[1:])
