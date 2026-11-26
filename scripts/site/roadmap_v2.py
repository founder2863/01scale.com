"""Roadmap v2: build its data from docs/process/roadmap/v2/ROADMAP.md.

v2 = v1 (scripts/site/roadmap_v1.py, frozen) plus Nikhil's sprint rules of 26 Nov 2026: a
Definition of Ready checked from the repository, one-week sprints, crews for stories longer
than a sprint, and a forecast range from simulated rollovers. Once v3 starts, v2 is frozen too.

Reads:
- docs/process/roadmap/v2/ROADMAP.md  the waves, side tracks and later groups: their stories in
                                  order, value and reason, how the order was worked out, risks
- docs/epics/*.md                 every story's title and size (S, M or L)
- docs/process/cost-model.json    the done stories (closed
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

Run from the repo root:  npm run roadmap:v2
Without network (stories without a saved issue number link to an issue search):
  npm run roadmap:v2 -- --offline
"""
import csv
import json
import math
import os
import random
import re
import subprocess
import sys
from datetime import date
from urllib.parse import quote

ROADMAP = "docs/process/roadmap/v2/ROADMAP.md"
EPICS = ["docs/epics/MVP1-EPICS.md", "docs/epics/MVP2-EPICS.md", "docs/epics/AUTOREP-EPICS.md"]
MODEL = "docs/process/cost-model.json"
V1_MODEL = "docs/process/roadmap/v2/model.json"
SERVICES = "docs/services"
# Every module has a read me, an API spec and user journeys; a data model and UI components only
# where it holds data or ships UI (the gateway does neither), so those are not required.
DESIGN_DOCS = ("README.md", "API-SPEC.md", "USER-JOURNEYS.md")
# The Service line of a story names its module; these words map it to its design folder.
SERVICE_FOLDERS = [("identity", "identity"), ("upload", "upload"), ("extraction", "extraction"),
                   ("review", "review"), ("payment", "payment"), ("delivery", "delivery"),
                   ("docflow", "docflow"), ("gateway", "gateway"), ("service template", "service-kit")]
OUT = "app/how-its-built/roadmap-v2.ts"
CSV_OUT = "docs/process/roadmap/v2/estimates.csv"
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


def story_texts():
    """Each story's text in the epics files, for the readiness check."""
    texts, current = {}, None
    for path in EPICS:
        try:
            lines = open(path, encoding="utf-8").read().splitlines()
        except FileNotFoundError:
            continue
        for line in lines:
            m = HEADING.match(line)
            if m:
                current = m.group(1)
                texts[current] = []
            elif line.startswith("## "):
                current = None
            elif current:
                texts[current].append(line)
    return {k: "\n".join(v) for k, v in texts.items()}


def readiness(story_ids_):
    """Definition of Ready, checked from the repository (v2): the story's module has its design
    documents, and the story has no open questions in its text."""
    texts = story_texts()
    out = {}
    for sid in story_ids_:
        text = texts.get(sid, "")
        service = re.search(r"^- \*\*Service:\*\*\s*(.+)$", text, re.M)
        service = service.group(1).lower() if service else ""
        folder = next((f for word, f in SERVICE_FOLDERS if word in service), None)
        docs = None
        if folder and not service.startswith("site"):
            docs = all(os.path.exists(os.path.join(SERVICES, folder, d)) for d in DESIGN_DOCS)
        questions = []
        for line in text.splitlines():
            if re.search(r"open questions?\b", line, re.I):
                questions.append(re.sub(r"^- \*\*[^*]+:\*\*\s*", "", line).strip())
        out[sid] = {"module": folder, "designDocs": docs, "openQuestions": questions,
                    "ready": docs is not False and not questions}
    return out


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


def crew_for(days, sprint):
    """Engineers on a story so its development fits a sprint (v2), and how long it then takes."""
    n = min(sprint["max_crew"], max(1, math.ceil(days / sprint["days"] - 1e-9)))
    dur = days if n == 1 else days * (1 + sprint["swarm_overhead"]) / n
    return n, dur


def build_tasks(stories_needed, est, key, pm_ids, design_ids, done, ready, sprint, factor, extra):
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
        # Not ready because of an open question: the product manager and an engineer decide it
        # together first.
        if ready[sid]["openQuestions"]:
            days = sprint["decision_days"] * (factor if key == "With" else 1)
            tasks[(sid, "decide")] = {"story": sid, "kind": "joint", "roles": ["pm", "eng"], "dur": days, "deps": list(before)}
            before = before + [("task", (sid, "decide"))]
        if sid in design_ids:
            owner = "pm" if sid in pm_ids else "eng"
            own, other = (product, dev) if owner == "pm" else (dev, product)
            solo = max(0.0, own - other)
            crew, dur = (1, solo) if owner == "pm" else crew_for(solo, sprint)
            if owner == "eng":
                dur += extra.get(sid, 0) * sprint["days"]
            tasks[(sid, "solo")] = {"story": sid, "kind": "product" if owner == "pm" else "dev",
                                    "roles": [owner] * crew, "dur": dur, "deps": before, "sprint": owner == "eng"}
            tasks[(sid, "joint")] = {"story": sid, "kind": "joint", "roles": ["pm", "eng"], "dur": other,
                                     "deps": [("task", (sid, "solo"))]}
            last[sid] = (sid, "joint")
        else:
            tasks[(sid, "product")] = {"story": sid, "kind": "product", "roles": ["pm"], "dur": product,
                                       "deps": [x for x in before if x[0] == "task"]}
            crew, dur = crew_for(dev, sprint)
            dur += extra.get(sid, 0) * sprint["days"]
            tasks[(sid, "dev")] = {"story": sid, "kind": "dev", "roles": ["eng"] * crew, "dur": dur,
                                   "deps": before + [("task", (sid, "product"))], "sprint": True}
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


def team_plan(groups, tables, order, errors, people, needs, wave0, est, key, pm_ids, design_ids,
              ready, sprint, factor, extra=None, light=False):
    """Plan the tasks for the team. Whenever people are free, the most urgent ready task (the one
    with the longest chain of work waiting on it) goes to whoever its roles need; a joint task
    needs the product manager and an engineer free at the same time."""
    stories = {s["id"]: s for g in groups for r in g["rows"] for s in r["stories"]}
    wave_of = {s["id"]: r["name"] for g in groups for r in g["rows"] for s in r["stories"]}
    done = {sid for sid in needs if stories[sid]["done"]}
    tasks, last = build_tasks(needs, est, key, pm_ids, design_ids, done, ready, sprint, factor, extra or {})
    # Main path first (v2): side tracks and later work take only the time the main path cannot use.
    tier_of = {s["id"]: {"main": 0, "side": 1}.get(g["kind"], 2) for g in groups for r in g["rows"] for s in r["stories"]}
    # Within the main path, earlier steps of the journey first (v2): upload before extraction,
    # extraction before review, and so on, the way a product manager orders a sprint.
    step_of = {s["id"]: i for g in groups for i, r in enumerate(g["rows"]) for s in r["stories"]}
    sd = sprint["days"]

    def sprint_end(t):
        return (math.floor(t / sd + 1e-9) + 1) * sd

    def can_start(tid, t):
        """Engineers pull a story at sprint planning, or during a sprint only if it can finish by
        the sprint's end (v2)."""
        if not tasks[tid].get("sprint"):
            return True
        at_boundary = abs(t / sd - round(t / sd)) < 1e-9
        return at_boundary or t + tasks[tid]["dur"] <= sprint_end(t) + 1e-9

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
                           key=lambda x: (-waiting_only_on_product(x), tier_of[x[0]], step_of[x[0]] if tier_of[x[0]] == 0 else 0,
                                          -urgency[x], rank[x[0]], x[1]))
            for tid in ready:
                if not can_start(tid, t):
                    continue
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
            later = sorted({x for x in list(free_at) + list(finish.values()) + [sprint_end(t)] if x > t + 1e-9})
            if not later:
                errors.append("tasks that can never start: " + ", ".join(sorted({x[0] for x in todo})))
                return None
            t = later[0]

    def month(day):
        return int(day // DAYS_PER_MONTH) + 1

    if light:
        return {sid: finish[last[sid]] for sid in last}

    # A story's dates are its work, not the product manager's refinement before it (v2).
    story_start = {}
    for tid, st in start.items():
        sid = tid[0]
        if tid[1] == "product" and (sid, "dev") in tasks:
            continue
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
        "crews": [{"id": tid[0], "crew": len(t["roles"]), "days": round(t["dur"], 2),
                   "sprints": math.ceil(t["dur"] / sd - 1e-9)}
                  for tid, t in tasks.items() if t.get("sprint") and len(t["roles"]) > 1],
        "longStories": [{"id": tid[0], "who": "engineers" if t.get("sprint") else "product manager",
                         "days": round(t["dur"], 2), "sprints": math.ceil(t["dur"] / sd - 1e-9)}
                        for tid, t in tasks.items()
                        if tid[1] in ("dev", "solo") and t["dur"] > sd + 1e-9],
        "pmBlocked": sorted(blocked, key=lambda b: -b["days"]),
        "milestones": milestones,
        "notPlanned": [sid for sid in stories if sid not in needs],
    }


def forecast(common, key, pm_ids, design_ids, ready, sprint, factor, tables, order, wave0, base):
    """Simulate rollovers (v2): in each run every engineering story rolls over once or twice at
    the stated rates, keeping its crew one more sprint each time. Each milestone gets the day it
    lands on if nothing rolls over, the day half the runs beat (P50) and nine in ten (P90)."""
    groups, tables_, order_, errors, people, needs, wave0_, est = common
    rates = sprint["rollover_rates"]
    rng = random.Random(sprint["seed"] + (0 if key == "Without" else 1))
    stories = [sid for sid in needs if not any(s["id"] == sid and s["done"] for g in groups for r in g["rows"] for s in r["stories"])]
    pm_only = {sid for sid in stories if sid in design_ids and sid in pm_ids}
    milestones = []
    for name, when in ((r[0], r[1]) for r in tables.get("milestones", [])):
        ids = list(wave0) if re.search(r"\bWave 0\b", when) else []
        ids += story_ids(re.sub(r"\bWave 0\b", "", when), order)
        milestones.append((name, ids))
    runs = {name: [] for name, _ in milestones}
    ends = []
    for _ in range(sprint["runs"]):
        extra = {}
        for sid in stories:
            if sid in pm_only:
                continue
            x = rng.random()
            extra[sid] = 2 if x < rates["twice"] else 1 if x < rates["twice"] + rates["once"] else 0
        story_end = team_plan(*common, key, pm_ids, design_ids, ready, sprint, factor, extra=extra, light=True)
        if story_end is None:
            return None
        for name, ids in milestones:
            runs[name].append(max(story_end.get(i, 0) for i in ids))
        ends.append(max(story_end.values()))

    def pct(xs, p):
        xs = sorted(xs)
        return math.ceil(xs[min(len(xs) - 1, int(round(p * (len(xs) - 1))))])

    def month(day):
        return int(max(day - 1, 0) // DAYS_PER_MONTH) + 1

    out = []
    base_ms = {m["name"]: m for m in base["milestones"]}
    for name, _ in milestones:
        d0 = base_ms[name]["day"]
        p50, p90 = pct(runs[name], 0.5), pct(runs[name], 0.9)
        out.append({"name": name, "day": d0, "month": month(d0), "p50": p50, "p50Month": month(p50),
                    "p90": p90, "p90Month": month(p90)})
    e50, e90 = pct(ends, 0.5), pct(ends, 0.9)
    return {"milestones": out, "end": {"day": base["endDay"], "p50": e50, "p90": e90,
                                       "month": month(base["endDay"]), "p50Month": month(e50), "p90Month": month(e90)},
            "runs": sprint["runs"]}


def main(argv):
    model = json.load(open(MODEL, encoding="utf-8"))
    frozen = json.load(open(V1_MODEL, encoding="utf-8"))
    model["person_days_per_size"], model["estimates"] = frozen["person_days_per_size"], frozen["estimates"]
    model["sprint"] = frozen["sprint"]
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
    version = {"id": "v2", "adds": [], "gaps": []}
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
        if heading.startswith("What this version adds"):
            version["adds"] = bullets(section["lines"])
            continue
        if heading.startswith("Gaps found"):
            version["gaps"] = bullets(section["lines"])
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
    ready = readiness(list(stories_by_id))
    sprint = model["sprint"]
    factor = model["estimates"]["with_claude_code_factor"]["development"]
    plan = plan_cc = None
    common = (groups, tables, order, errors, people, needs, wave0, est)
    if not errors:
        plan = team_plan(*common, "Without", pm_ids, design_ids, ready, sprint, factor)
    if not errors:
        plan_cc = team_plan(*common, "With", pm_ids, design_ids, ready, sprint, factor)
    forecasts = {}
    if not errors:
        forecasts = {"Without": forecast(common, "Without", pm_ids, design_ids, ready, sprint, factor, tables, order, wave0, plan),
                     "With": forecast(common, "With", pm_ids, design_ids, ready, sprint, factor, tables, order, wave0, plan_cc)}
    if errors:
        fail("\n  ".join(["ROADMAP.md's team plan does not hold together:"] + errors))

    data = {
        "updated": date.today().isoformat(),
        "version": version,
        "source": ROADMAP,
        "personDaysPerSize": per_size,
        "method": method,
        "risks": risks,
        "plan": plan,
        "planWithClaudeCode": plan_cc,
        "forecast": forecasts,
        "sprint": {k: sprint[k] for k in ("days", "max_crew", "swarm_overhead", "rollover_rates", "runs",
                                           "decision_days", "why", "swarm_why", "rollover_why", "decision_why")},
        "readiness": [{"id": sid, **r} for sid, r in ready.items() if not r["ready"] and sid in needs],
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
        f.write("// Do not edit: change ROADMAP.md or the epics files, then run `npm run roadmap:v2`.\n\n")
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
