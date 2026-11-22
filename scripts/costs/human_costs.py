"""Work out the human team's cost per story, so far and projected (MVP1-E8-09).

Reads:
- docs/process/cost-model.json   person-days per size, the rate, the scope, and the
                                  done stories (saved from closed GitHub issues)
- docs/epics/*.md (from the model's scope)  every story's ID, title and size
- docs/process/token-ledger.json  the measured token cost, where a story has one

Writes:
- app/how-its-built/human-costs.ts  the data behind the human cost on the site
- docs/process/cost-model.json      the done list, refreshed from GitHub

Rules (skill: .claude/skills/estimate-human-cost):
- A size comes only from the story's heading in the epics file. A story without
  one is TBD: it is listed, never guessed, and left out of the totals.
- A story is done when its GitHub issue is closed as completed.
- The rate is an assumption until MVP1-E8-02 sets a loaded rate per role.
- No figure is entered by hand.

Run from the repo root:  npm run human-costs
Without network (or to rebuild from the saved done list):  npm run human-costs -- --offline
"""
import json
import re
import subprocess
import sys
from datetime import date

MODEL = "docs/process/cost-model.json"
LEDGER = "docs/process/token-ledger.json"
OUT = "app/how-its-built/human-costs.ts"

HEADING = re.compile(r"^### ((?:[A-Z0-9]+)-E(\d+)-(\d+)) · (.+?)(?: — ([SML]))?\s*$")
ISSUE_TITLE = re.compile(r"^\[([A-Z0-9]+-E\d+-\d+)\]")
LEDGER_ID = re.compile(r"^(?:([A-Z0-9]+)-)?E(\d+)-(\d+)$")


def money(x):
    return None if x is None else round(x, 2)


def parse_epics(text):
    """Every story heading in an epics file: ID, title, size (None when missing)."""
    stories = []
    for line in text.splitlines():
        m = HEADING.match(line)
        if not m:
            continue
        sid, epic_no, _, title, size = m.groups()
        product = sid.split("-")[0]
        stories.append({
            "id": sid,
            "title": title.strip(),
            "product": product,
            "epic": f"{product}-E{epic_no}",
            "size": size,
        })
    return stories


def ledger_story_ids(name, known_ids):
    """The story IDs a ledger entry covers, from its name: "MVP1-E0-14 to E0-16 · …",
    "MVP1-E1-05, E0-06 · …" or "AUTOREP-E6-03 · …". An epic-level name ("MVP1-E1 · …")
    or a name with no ID covers no story and is reported as unassigned."""
    prefix = name.split(" · ")[0]
    ids, product = [], None
    for part in prefix.split(","):
        ends = []
        for token in part.strip().split(" to "):
            m = LEDGER_ID.match(token.strip())
            if not m:
                return []
            product = m.group(1) or product
            if not product:
                return []
            ends.append(f"{product}-E{m.group(2)}-{m.group(3)}")
        if len(ends) == 1:
            ids.append(ends[0])
        elif len(ends) == 2 and ends[0] in known_ids and ends[1] in known_ids:
            i, j = known_ids.index(ends[0]), known_ids.index(ends[1])
            ids.extend(known_ids[i:j + 1])
        else:
            return []
    return [i for i in ids if i in known_ids]


def measured_token_costs(ledger, stories):
    """Measured build + rework cost per story (the same figure as the Token Costs table).
    An entry that covers several stories is split by their person-days (equally if any
    is TBD), and each share is marked shared."""
    known = [s["id"] for s in stories]
    days = {s["id"]: s["personDays"] for s in stories}
    per_story, unassigned = {}, []
    for key, name in ledger["stories"].items():
        rows = [r for r in ledger["requests"] if r["area"] == key and r["kind"] in ("build", "rework")]
        if not rows:
            continue
        cost = sum(r["cost_usd"] or 0 for r in rows)
        pending = any(r["cost_usd"] is None for r in rows)
        ids = ledger_story_ids(name, known)
        if not ids:
            unassigned.append({"key": key, "name": name, "cost": money(cost), "pending": pending})
            continue
        weights = [days[i] for i in ids]
        if any(w is None for w in weights):
            weights = [1] * len(ids)
        for sid, w in zip(ids, weights):
            entry = per_story.setdefault(sid, {"cost": 0.0, "shared": False, "pending": False, "keys": []})
            entry["cost"] += cost * w / sum(weights)
            entry["shared"] = entry["shared"] or len(ids) > 1
            entry["pending"] = entry["pending"] or pending
            entry["keys"].append(key)
    return per_story, unassigned


def fetch_done(repo):
    """Stories whose GitHub issue is closed as completed. Needs the gh CLI and network."""
    out = subprocess.run(
        ["gh", "api", "-X", "GET", "search/issues", "--paginate",
         "-f", f"q=repo:{repo} is:issue is:closed reason:completed", "-f", "per_page=100",
         "--jq", ".items[] | [.number, .title, .closed_at] | @tsv"],
        capture_output=True, text=True, check=True,
    ).stdout
    done = {}
    for line in out.splitlines():
        number, title, closed = line.split("\t")
        m = ISSUE_TITLE.match(title)
        if m:
            done[m.group(1)] = {"id": m.group(1), "issue": int(number), "closed": closed[:10]}
    return sorted(done.values(), key=lambda d: d["id"])


def build(model, stories, ledger):
    """The data for human-costs.ts. Pure: no files, no network."""
    days_per_size = model["person_days_per_size"]
    role = model["default_role"]
    rate_info = model["rates_usd_per_person_day"][role]
    rate = rate_info["rate"]
    excluded_epics = set(model["scope"].get("exclude_epics", []))
    done = {d["id"]: d for d in model["done"]["stories"]}

    for s in stories:
        s["personDays"] = days_per_size.get(s["size"]) if s["size"] else None
    tokens, unassigned = measured_token_costs(ledger, stories) if ledger else ({}, [])

    rows = []
    for s in stories:
        t = tokens.get(s["id"])
        d = done.get(s["id"])
        rows.append({
            "id": s["id"],
            "title": s["title"],
            "product": s["product"],
            "epic": s["epic"],
            "size": s["size"] or "TBD",
            "personDays": s["personDays"],
            "cost": None if s["personDays"] is None else s["personDays"] * rate,
            "done": bool(d),
            "issue": d["issue"] if d else None,
            "closed": d["closed"] if d else None,
            "tokenCost": money(t["cost"]) if t else None,
            "tokenCostShared": t["shared"] if t else False,
            "tokenCostPending": t["pending"] if t else False,
        })

    in_scope = [r for r in rows if r["epic"] not in excluded_epics]
    excluded = [r for r in rows if r["epic"] in excluded_epics]

    def totals(sel):
        sized = [r for r in sel if r["personDays"] is not None]
        return {
            "stories": len(sel),
            "personDays": sum(r["personDays"] for r in sized),
            "cost": sum(r["cost"] for r in sized),
            "tokenCost": money(sum(r["tokenCost"] or 0 for r in sel)),
            "tbd": [r["id"] for r in sel if r["personDays"] is None],
        }

    epics = []
    for epic in dict.fromkeys(r["epic"] for r in rows):
        sel = [r for r in rows if r["epic"] == epic]
        epics.append({
            "epic": epic,
            "inScope": epic not in excluded_epics,
            "projected": totals(sel),
            "soFar": totals([r for r in sel if r["done"]]),
        })

    return {
        "updated": model["done"]["fetched"],
        "rate": {"role": role, "usdPerPersonDay": rate, "assumption": rate_info.get("assumption", True),
                 "source": rate_info.get("source", "")},
        "personDaysPerSize": days_per_size,
        "scope": model["scope"]["why"],
        "soFar": totals([r for r in in_scope if r["done"]]),
        "projected": totals(in_scope),
        "excludedSoFar": totals([r for r in excluded if r["done"]]),
        "excludedProjected": totals(excluded),
        "epics": epics,
        "stories": in_scope,
        "excluded": excluded,
        "ledgerUnassigned": unassigned,
    }


def main(argv):
    offline = "--offline" in argv
    model = json.load(open(MODEL))
    stories = []
    for path in model["scope"]["epics_files"]:
        stories.extend(parse_epics(open(path).read()))

    if not offline:
        try:
            model["done"]["stories"] = fetch_done(model["done"].get("repo", "founder2863/01scale.com"))
            model["done"]["fetched"] = date.today().isoformat()
            with open(MODEL, "w") as f:
                json.dump(model, f, indent=2)
                f.write("\n")
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"Could not read closed issues ({e}); using the saved done list from {model['done']['fetched']}.",
                  file=sys.stderr)

    data = build(model, stories, json.load(open(LEDGER)))
    with open(OUT, "w") as f:
        f.write("// Generated by scripts/costs/human_costs.py from docs/process/cost-model.json, the epics files\n")
        f.write("// and docs/process/token-ledger.json. Do not edit by hand: run npm run human-costs.\n")
        f.write("export const humanCosts = ")
        f.write(json.dumps(data, indent=2, ensure_ascii=False))
        f.write(" as const;\n")

    so_far, proj = data["soFar"], data["projected"]
    rate = data["rate"]["usdPerPersonDay"]
    print(f"Rate: ${rate:,} per person-day ({data['rate']['role']}, assumption until MVP1-E8-02)")
    print(f"So far:    {so_far['stories']} done stories, {so_far['personDays']} person-days, ${so_far['cost']:,}")
    print(f"Projected: {proj['stories']} stories, {proj['personDays']} person-days, ${proj['cost']:,}")
    if proj["tbd"]:
        print(f"No size (TBD, not in totals): {', '.join(proj['tbd'])}")
    ex = data["excludedProjected"]
    print(f"Out of scope ({', '.join(model['scope']['exclude_epics'])}): {ex['stories']} stories, ${ex['cost']:,}; "
          f"done ${data['excludedSoFar']['cost']:,}")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main(sys.argv[1:])
