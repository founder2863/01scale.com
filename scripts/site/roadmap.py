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
import csv
import json
import math
import re
import subprocess
import sys
from datetime import date
from urllib.parse import quote

ROADMAP = "docs/process/ROADMAP.md"
EPICS = ["docs/epics/MVP1-EPICS.md", "docs/epics/MVP2-EPICS.md", "docs/epics/AUTOREP-EPICS.md"]
MODEL = "docs/process/cost-model.json"
OUT = "app/how-its-built/roadmap.ts"
CSV_OUT = "docs/process/estimates.csv"
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


DAYS_PER_MONTH = 20


def pm_story_ids(tables, order):
    """The stories the Team table gives to the product manager."""
    ids = set()
    for role, _count, does in ((r[0], r[1], r[2]) for r in tables.get("team") or []):
        if role.lower().startswith("product"):
            ids |= set(story_ids(does, order))
    return ids


def half(x, step):
    """Round to the nearest step (0.5 days); never round real work down to nothing."""
    if x <= 0:
        return 0.0
    return max(step, round(x / step) * step)


def story_estimates(stories, pm_ids, model):
    """The four estimates per story, in person-days: product and development work, without and
    with Claude Code. Sizes are the human estimates; the split and the factors are assumptions in
    docs/process/cost-model.json ("estimates")."""
    cfg = model["estimates"]
    share, step = cfg["product_share_of_engineering_story"], cfg["round_to_days"]
    f = cfg["with_claude_code_factor"]
    out = {}
    for sid, s in stories.items():
        total = s["days"] or 0
        if sid in pm_ids:
            product, dev = float(total), 0.0
        else:
            product = half(total * share, step)
            dev = max(0.0, total - product)
        out[sid] = {
            "productWithout": product,
            "productWith": half(product * f["product"], step),
            "devWithout": dev,
            "devWith": half(dev * f["development"], step),
        }
    return out


def team_plan(groups, tables, order, errors, duration):
    """Plan the stories for the team: each person takes the most urgent ready story their role
    does (the one with the longest chain of work waiting on it); one person per story."""
    team = tables.get("team") or []
    if not team:
        errors.append("no Team table")
        return None
    people, pm_stories = [], set()
    for role, count, does in (r[:3] for r in team):
        is_pm = role.lower().startswith("product")
        for i in range(int(count)):
            label = role if int(count) == 1 else f"{role} {i + 1}"
            people.append({"name": label, "pm": is_pm})
        if is_pm:
            pm_stories |= set(story_ids(does, order))

    stories = {s["id"]: s for g in groups for r in g["rows"] for s in r["stories"]}
    wave_of = {s["id"]: r["name"] for g in groups for r in g["rows"] for s in r["stories"]}
    wave0 = [s["id"] for g in groups if g["kind"] == "main" for r in g["rows"][:1] for s in r["stories"]]
    needs = {}
    for story_cell, needs_cell in ((r[0], r[1]) for r in tables.get("story", [])):
        ids = story_ids(story_cell, order)
        if len(ids) != 1 or ids[0] not in stories:
            errors.append(f"Story dependencies: '{story_cell}' is not one story on the roadmap")
            continue
        deps = []
        if re.search(r"\bWave 0\b", needs_cell):
            deps += wave0
        deps += story_ids(re.sub(r"\bWave 0\b", "", needs_cell), order)
        for d in deps:
            if d not in stories:
                errors.append(f"{ids[0]} needs {d}, which is not on the roadmap")
        needs[ids[0]] = [d for d in deps if d in stories and d != ids[0]]
    for sid, deps in needs.items():
        for d in deps:
            if d not in needs:
                errors.append(f"{sid} needs {d}, which is not planned (add it to Story dependencies)")
    if errors:
        return None

    # Urgency: the story's own days plus the longest chain of planned work that waits on it.
    waiting = {sid: [o for o, deps in needs.items() if sid in deps] for sid in needs}
    urgency = {}

    def chain(sid, seen=()):
        if sid in seen:
            errors.append(f"dependency loop through {sid}")
            return 0
        if sid not in urgency:
            urgency[sid] = duration[sid] + max([chain(o, seen + (sid,)) for o in waiting[sid]] or [0])
        return urgency[sid]

    for sid in needs:
        chain(sid)
    if errors:
        return None

    # Ties go to the story listed first on the roadmap (requirements before the market, and so on).
    rank = {sid: i for i, sid in enumerate(stories)}
    finish, start, who = {}, {}, {}
    free_at = [0] * len(people)
    todo = [sid for sid in needs if not stories[sid]["done"]]
    for sid in needs:
        if stories[sid]["done"]:
            finish[sid] = 0
    t = 0
    while todo:
        progressed = False
        for p in sorted(range(len(people)), key=lambda i: people[i]["pm"], reverse=True):
            if free_at[p] > t:
                continue
            ready = [sid for sid in todo
                     if all(d in finish and finish[d] <= t for d in needs[sid])
                     and (sid in pm_stories) == people[p]["pm"]]
            if not ready:
                continue
            sid = max(ready, key=lambda x: (urgency[x], -rank[x]))
            start[sid], finish[sid], who[sid] = t, t + duration[sid], p
            free_at[p] = finish[sid]
            todo.remove(sid)
            progressed = True
        if not progressed:
            later = [f for f in free_at if f > t] + [f for f in finish.values() if f > t]
            if not later:
                errors.append("stories that can never start: " + ", ".join(todo))
                return None
            t = min(later)

    def month(day):
        return int(day // DAYS_PER_MONTH) + 1

    end = max(finish.values() or [0])
    planned = []
    for sid in sorted(start, key=lambda x: (start[x], rank[x])):
        planned.append({
            "id": sid,
            "title": stories[sid]["title"],
            "size": stories[sid]["size"],
            "href": stories[sid]["href"],
            "issue": stories[sid]["issue"],
            "wave": wave_of[sid],
            "person": people[who[sid]]["name"],
            "start": int(start[sid]) + 1,
            "end": math.ceil(finish[sid]),
            "startMonth": month(start[sid]),
            "endMonth": month(finish[sid] - 1),
        })
    milestones = []
    for name, when in ((r[0], r[1]) for r in tables.get("milestones", [])):
        ids = wave0 if re.search(r"\bWave 0\b", when) else []
        ids += story_ids(re.sub(r"\bWave 0\b", "", when), order)
        missing = [i for i in ids if i not in finish]
        if missing or not ids:
            errors.append(f"milestone '{name}' needs {', '.join(missing) or 'a story'}, not planned")
            continue
        day = max(finish[i] for i in ids)
        milestones.append({"name": name, "day": math.ceil(day), "month": month(math.ceil(day) - 1)})
    busy = [round(sum(finish[s] - start[s] for s in start if who[s] == p), 1) for p in range(len(people))]
    return {
        "daysPerMonth": DAYS_PER_MONTH,
        "people": [{"name": p["name"], "pm": p["pm"], "busyDays": b} for p, b in zip(people, busy)],
        "endDay": math.ceil(end),
        "months": month(math.ceil(end) - 1) if end else 0,
        "stories": planned,
        "milestones": milestones,
        "notPlanned": [sid for sid in stories if sid not in needs],
    }


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

    method, risks, groups, errors, tables = [], [], [], [], {}
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
        if heading.startswith(("Team", "Story dependencies", "Milestones")):
            tables[heading.split()[0].lower()] = table(section["lines"])[1]
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
            group["rows"].append(row)
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

    stories_by_id = {s["id"]: s for g in groups for r in g["rows"] for s in r["stories"]}
    pm_ids = pm_story_ids(tables, order)
    est = story_estimates(stories_by_id, pm_ids, model)
    for sid, s in stories_by_id.items():
        s["estimates"] = est[sid]
    # The person who owns a story does its main work: the product manager the product work of
    # their own stories, an engineer the development work. The product share of an engineering
    # story is the product manager's, alongside it, and does not hold the engineer up.
    def owner_days(key):
        return {sid: est[sid][f"product{key}"] if sid in pm_ids else est[sid][f"dev{key}"] for sid in est}
    plan = team_plan(groups, tables, order, errors, owner_days("Without"))
    plan_cc = team_plan(groups, tables, order, errors, owner_days("With")) if not errors else None
    if errors:
        fail("\n  ".join(["ROADMAP.md's team plan does not hold together:"] + errors))

    data = {
        "updated": date.today().isoformat(),
        "source": ROADMAP,
        "personDaysPerSize": per_size,
        "method": method,
        "risks": risks,
        "plan": plan,
        "planWithClaudeCode": plan_cc,
        "estimatesModel": {k: model["estimates"][k] for k in
                           ("source", "product_share_of_engineering_story", "with_claude_code_factor",
                            "product_share_why", "with_claude_code_why")},
        "estimateTotals": {k: sum(e[k] for e in est.values()) for k in
                           ("productWithout", "productWith", "devWithout", "devWith")},
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
    # A flat file for reports: one row per story, the four estimates and when it is planned.
    when = {s["id"]: s for s in plan["stories"]}
    when_cc = {s["id"]: s for s in plan_cc["stories"]}
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["story", "title", "issue", "size", "wave", "owner",
                    "product_days_without_claude_code", "product_days_with_claude_code",
                    "dev_days_without_claude_code", "dev_days_with_claude_code",
                    "month_without_claude_code", "month_with_claude_code"])
        for g in groups:
            for r in g["rows"]:
                for s in r["stories"]:
                    e = s["estimates"]
                    a, b = when.get(s["id"]), when_cc.get(s["id"])
                    w.writerow([s["id"], s["title"], s["issue"] or "", s["size"] or "", r["name"],
                                "product manager" if s["id"] in pm_ids else "engineer",
                                e["productWithout"], e["productWith"], e["devWithout"], e["devWith"],
                                f"{a['startMonth']}-{a['endMonth']}" if a else "not planned",
                                f"{b['startMonth']}-{b['endMonth']}" if b else "not planned"])
    t = data["totals"]
    print(f"Roadmap: {t['stories']} stories, {t['days']} person-days, "
          f"{t['doneStories']} done, {t['remainingDays']} person-days left. Wrote {OUT}")
    print(f"Team plan: {len(plan['people'])} people, {plan['months']} months ({plan['endDay']} working days); "
          f"not planned: {', '.join(plan['notPlanned']) or 'none'}")
    for m, mc in zip(plan["milestones"], plan_cc["milestones"]):
        print(f"  without Claude Code month {m['month']} (day {m['day']}), with month {mc['month']} (day {mc['day']}): {m['name']}")
    print(f"With Claude Code: {plan_cc['months']} months ({plan_cc['endDay']} working days). Wrote {CSV_OUT}")


if __name__ == "__main__":
    main(sys.argv[1:])
