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


def step_round(x, step):
    """Round to the nearest step (a quarter day); never round real work down to nothing."""
    if x <= 0:
        return 0.0
    return max(step, round(x / step) * step)


def story_estimates(stories, pm_ids, design_ids, model):
    """The four estimates per story, in person-days: product and development work, without and
    with Claude Code. The owner's work is the story's size. On top of it (assumptions in
    docs/process/cost-model.json, "estimates", Nikhil on PR #193):
    - an engineering story takes the product manager a share of its size during the sprint
      (refining, answering questions, accepting it), before the engineer starts;
    - a design story (the documentation wave) has a share of design discussions and reviews that
      the product manager and an engineer do together, so the other role spends that time too.
    With Claude Code every part is scaled by the same factor."""
    cfg = model["estimates"]
    sprint, joint, step = cfg["product_share_of_engineering_story"], cfg["joint_share_of_design_story"], cfg["round_to_days"]
    f = cfg["with_claude_code_factor"]
    out = {}
    for sid, s in stories.items():
        total = float(s["days"] or 0)
        if sid in design_ids:
            other = step_round(total * joint, step)
            product, dev = (total, other) if sid in pm_ids else (other, total)
        else:
            product, dev = step_round(total * sprint, step), total
        out[sid] = {
            "productWithout": product,
            "productWith": step_round(product * f["product"], step),
            "devWithout": dev,
            "devWith": step_round(dev * f["development"], step),
            "joint": sid in design_ids,
        }
    return out


def build_tasks(stories_needed, est, key, pm_ids, design_ids, done):
    """Each story as the tasks people actually do. An engineering story: the product manager's
    sprint work, then the engineer's development. A design story: the owner alone, then a joint
    session where the product manager and an engineer work together."""
    tasks, last = {}, {}
    for sid, deps in stories_needed.items():
        if sid in done:
            continue
        e = est[sid]
        product, dev = e[f"product{key}"], e[f"dev{key}"]
        before = [("story", d) for d in deps]
        if sid in design_ids:
            owner = "pm" if sid in pm_ids else "eng"
            own, other = (product, dev) if owner == "pm" else (dev, product)
            solo = max(0.0, own - other)
            tasks[(sid, "solo")] = {"story": sid, "kind": "product" if owner == "pm" else "dev",
                                    "roles": [owner], "dur": solo, "deps": before}
            tasks[(sid, "joint")] = {"story": sid, "kind": "joint", "roles": ["pm", "eng"], "dur": other,
                                     "deps": [("task", (sid, "solo"))]}
            last[sid] = (sid, "joint")
        else:
            tasks[(sid, "product")] = {"story": sid, "kind": "product", "roles": ["pm"], "dur": product, "deps": []}
            tasks[(sid, "dev")] = {"story": sid, "kind": "dev", "roles": ["eng"], "dur": dev,
                                   "deps": before + [("task", (sid, "product"))]}
            last[sid] = (sid, "dev")
    # Point story dependencies at the last task of the story they wait for.
    for t in tasks.values():
        t["deps"] = [last[x] if kind == "story" else x for kind, x in t["deps"] if not (kind == "story" and x in done)]
    return tasks, last


def parse_team(tables, order, errors):
    team = tables.get("team") or []
    if not team:
        errors.append("no Team table")
    people = []
    for role, count, _does in (r[:3] for r in team):
        is_pm = role.lower().startswith("product")
        for i in range(int(count)):
            people.append({"name": role if int(count) == 1 else f"{role} {i + 1}", "role": "pm" if is_pm else "eng"})
    return people


def story_needs(groups, tables, order, errors):
    stories = {s["id"]: s for g in groups for r in g["rows"] for s in r["stories"]}
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
    return needs, wave0


def team_plan(groups, tables, order, errors, people, needs, wave0, est, key, pm_ids, design_ids):
    """Plan the tasks for the team. Whenever people are free, the most urgent ready task (the one
    with the longest chain of work waiting on it) goes to whoever its roles need; a joint task
    needs the product manager and an engineer free at the same time."""
    stories = {s["id"]: s for g in groups for r in g["rows"] for s in r["stories"]}
    wave_of = {s["id"]: r["name"] for g in groups for r in g["rows"] for s in r["stories"]}
    done = {sid for sid in needs if stories[sid]["done"]}
    tasks, last = build_tasks(needs, est, key, pm_ids, design_ids, done)

    waiting = {tid: [o for o, t in tasks.items() if tid in t["deps"]] for tid in tasks}
    urgency = {}

    def chain(tid, seen=()):
        if tid in seen:
            errors.append(f"dependency loop through {tid[0]}")
            return 0
        if tid not in urgency:
            urgency[tid] = tasks[tid]["dur"] + max([chain(o, seen + (tid,)) for o in waiting[tid]] or [0])
        return urgency[tid]

    for tid in tasks:
        chain(tid)
    if errors:
        return None

    rank = {sid: i for i, sid in enumerate(stories)}
    start, finish, who = {}, {}, {}

    # Sprint refinement comes first when it is the only thing a story's development waits for:
    # a product manager refines a story as soon as an engineer could start it. They can still
    # hold a story up while in the middle of longer work, and the plan shows where.
    def waiting_only_on_product(tid):
        if tid[1] != "product" or (tid[0], "dev") not in tasks:
            return 0
        deps = [d for d in tasks[(tid[0], "dev")]["deps"] if d != tid]
        return 1 if all(d in finish and finish[d] <= t for d in deps) else 0
    free_at = [0.0] * len(people)
    todo = set(tasks)
    t = 0.0
    while todo:
        assigned = True
        while assigned:
            assigned = False
            ready = sorted((tid for tid in todo if all(d in finish and finish[d] <= t for d in tasks[tid]["deps"])),
                           key=lambda x: (-waiting_only_on_product(x), -urgency[x], rank[x[0]], x[1]))
            for tid in ready:
                picked = []
                for role in tasks[tid]["roles"]:
                    free = [i for i, p in enumerate(people) if p["role"] == role and free_at[i] <= t and i not in picked]
                    if not free:
                        break
                    picked.append(min(free, key=lambda i: (free_at[i], i)))
                if len(picked) != len(tasks[tid]["roles"]):
                    continue
                start[tid], finish[tid], who[tid] = t, t + tasks[tid]["dur"], picked
                for i in picked:
                    free_at[i] = finish[tid]
                todo.discard(tid)
                assigned = True
                break
        if todo:
            later = sorted({x for x in list(free_at) + list(finish.values()) if x > t})
            if not later:
                errors.append("tasks that can never start: " + ", ".join(sorted({x[0] for x in todo})))
                return None
            t = later[0]

    def month(day):
        return int(day // DAYS_PER_MONTH) + 1

    story_start = {}
    for tid, st in start.items():
        sid = tid[0]
        story_start[sid] = min(story_start.get(sid, st), st)
    story_end = {sid: finish[last[sid]] for sid in last}

    # Where the product manager held a story up: its development was ready to start (everything it
    # waits for was done) but its sprint product work was not.
    blocked = []
    for sid in last:
        if (sid, "dev") in tasks:
            deps_done = max([finish[d] for d in tasks[(sid, "dev")]["deps"] if d != (sid, "product")] or [0.0])
            wait = finish[(sid, "product")] - deps_done
            if wait > 0.01:
                blocked.append({"id": sid, "days": round(wait, 2)})

    end = max(finish.values() or [0])
    owner_task = {sid: (tasks.get((sid, "dev")) and (sid, "dev")) or (sid, "solo") for sid in last}
    planned = []
    for sid in sorted(last, key=lambda x: (story_start[x], rank[x])):
        main_people = who[owner_task[sid]]
        planned.append({
            "id": sid,
            "title": stories[sid]["title"],
            "size": stories[sid]["size"],
            "href": stories[sid]["href"],
            "issue": stories[sid]["issue"],
            "wave": wave_of[sid],
            "person": people[main_people[0]]["name"],
            "start": int(story_start[sid]) + 1,
            "end": math.ceil(story_end[sid]),
            "startMonth": month(story_start[sid]),
            "endMonth": month(max(story_end[sid] - 0.001, 0)),
        })
    task_rows = []
    for tid in sorted(start, key=lambda x: (start[x], rank[x[0]])):
        if tasks[tid]["dur"] <= 0:
            continue
        for i in who[tid]:
            task_rows.append({"story": tid[0], "kind": tasks[tid]["kind"], "wave": wave_of[tid[0]],
                              "person": people[i]["name"], "start": round(start[tid], 2), "end": round(finish[tid], 2)})
    milestones = []
    for name, when in ((r[0], r[1]) for r in tables.get("milestones", [])):
        ids = wave0 if re.search(r"\bWave 0\b", when) else []
        ids += story_ids(re.sub(r"\bWave 0\b", "", when), order)
        missing = [i for i in ids if i not in story_end and i not in done]
        if missing or not ids:
            errors.append(f"milestone '{name}' needs {', '.join(missing) or 'a story'}, not planned")
            continue
        day = math.ceil(max([story_end.get(i, 0) for i in ids]))
        milestones.append({"name": name, "day": day, "month": month(max(day - 1, 0))})
    busy = [round(sum(finish[x] - start[x] for x in start if i in who[x]), 1) for i in range(len(people))]
    return {
        "daysPerMonth": DAYS_PER_MONTH,
        "people": [{"name": p["name"], "pm": p["role"] == "pm", "busyDays": b} for p, b in zip(people, busy)],
        "endDay": math.ceil(end),
        "months": month(math.ceil(end) - 1) if end else 0,
        "stories": planned,
        "tasks": task_rows,
        "pmBlocked": sorted(blocked, key=lambda b: -b["days"]),
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
    people = parse_team(tables, order, errors)
    needs, wave0 = story_needs(groups, tables, order, errors)
    design_ids = set(wave0)
    est = story_estimates(stories_by_id, pm_ids, design_ids, model)
    for sid, s in stories_by_id.items():
        s["estimates"] = est[sid]
    plan = plan_cc = None
    if not errors:
        plan = team_plan(groups, tables, order, errors, people, needs, wave0, est, "Without", pm_ids, design_ids)
    if not errors:
        plan_cc = team_plan(groups, tables, order, errors, people, needs, wave0, est, "With", pm_ids, design_ids)
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
                           ("source", "product_share_of_engineering_story", "joint_share_of_design_story",
                            "with_claude_code_factor", "product_share_why", "joint_share_why",
                            "with_claude_code_why")},
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
