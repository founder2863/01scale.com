"""Build the data behind the Total Cost tab (MVP1-E8-15): so far and projected, from the latest
roadmap version (Nikhil, 27 Nov 2026).

Reads:
- app/how-its-built/human-costs.ts   every story in scope, its size and whether it is done
                                     (written by `npm run human-costs`)
- docs/process/token-ledger.json     the tokens actually spent so far
- docs/process/cost-model.json       the day rates of a product manager and an engineer
- the latest roadmap version          docs/process/roadmap/v<N>/model.json and
                                     app/how-its-built/roadmap-v<N>.ts (the highest N)

Writes:
- app/how-its-built/total-cost.ts

Rules (Nikhil, 27 Nov 2026):
- Scope is the latest roadmap's: the stories it plans. Stories in scope that it does not plan are
  listed with their size, not priced.
- So far: tokens actually spent, and what a human team would have cost for the stories built,
  priced like the roadmap prices planned stories: a story the roadmap knows uses its product and
  development days; any other built story is engineering work, its size plus the product
  manager's sprint share. Product days at the product manager rate, development days at the
  engineer rate.
- Projected: without Claude Code, the team for the plan's length; with Claude Code, the team for
  its shorter plan plus the projected tokens of the remaining stories.
- No figure is typed by hand.

Run from the repo root:  npm run total-cost   (after `npm run human-costs` and the latest
`npm run roadmap:v<N>`)
"""
import glob
import json
import re
from datetime import date

HUMAN = "app/how-its-built/human-costs.ts"
LEDGER = "docs/process/token-ledger.json"
MODEL = "docs/process/cost-model.json"
OUT = "app/how-its-built/total-cost.ts"
REPO = "https://github.com/founder2863/01scale.com/blob/main"


def read_ts(path):
    """The JSON object in a generated TypeScript data file."""
    text = open(path, encoding="utf-8").read()
    body = text[text.index("= ") + 2:]
    body = body[: body.rindex("}") + 1]
    return json.loads(body)


def latest_version():
    found = []
    for path in glob.glob("docs/process/roadmap/v*/model.json"):
        m = re.search(r"/v(\d+)/model\.json$", path)
        if m:
            found.append(int(m.group(1)))
    if not found:
        raise SystemExit("total-cost: no roadmap version found")
    return max(found)


def main():
    n = latest_version()
    slug = f"v{n}"
    roadmap = read_ts(f"app/how-its-built/roadmap-{slug}.ts")
    rmodel = json.load(open(f"docs/process/roadmap/{slug}/model.json", encoding="utf-8"))
    human = read_ts(HUMAN)
    ledger = json.load(open(LEDGER, encoding="utf-8"))
    rates_cfg = json.load(open(MODEL, encoding="utf-8"))["rates_usd_per_person_day"]
    pm_rate = rates_cfg["product_manager"]["rate"]
    eng_rate = rates_cfg["engineer"]["rate"]
    share = rmodel["estimates"]["product_share_of_engineering_story"]
    step = rmodel["estimates"]["round_to_days"]

    def step_round(x):
        return 0.0 if x <= 0 else max(step, round(x / step) * step)

    # Every story the roadmap knows, with its estimates.
    known = {s["id"]: s for g in roadmap["groups"] for r in g["rows"] for s in r["stories"]}
    planned = {s["id"] for s in roadmap["plan"]["stories"]}

    # So far: the stories built, priced like the roadmap prices them.
    built = []
    for s in human["stories"]:
        if not s["done"] or not s["personDays"]:
            continue
        if s["id"] in known:
            e = known[s["id"]]["estimates"]
            product, dev = e["productWithout"], e["devWithout"]
            basis = f"roadmap {slug}"
        else:
            product, dev = step_round(s["personDays"] * share), float(s["personDays"])
            basis = "engineering, size plus sprint product work"
        built.append({
            "id": s["id"], "title": s["title"], "size": s["size"], "issue": s["issue"],
            "productDays": product, "devDays": dev,
            "cost": round(product * pm_rate + dev * eng_rate),
            "tokenCost": s.get("tokenCost"), "basis": basis,
        })
    spent = round(sum((r["cost_usd"] or 0) for r in ledger["requests"]), 2)
    pending = sum(1 for r in ledger["requests"] if r["cost_usd"] is None)

    # Projected: from the latest roadmap's cost.
    cost = roadmap["cost"]
    without, with_cc, tokens = cost["Without"], cost["With"], cost["tokens"]

    # In scope but not planned by the roadmap: listed, not priced.
    not_planned = [
        {"id": s["id"], "title": s["title"], "size": s["size"], "personDays": s["personDays"], "issue": s["issue"]}
        for s in human["stories"]
        if not s["done"] and s["id"] not in planned
    ]

    data = {
        "updated": date.today().isoformat(),
        "version": {"slug": slug, "href": f"/how-its-built/roadmap/{slug}",
                    "document": f"{REPO}/docs/process/roadmap/{slug}/ROADMAP.md",
                    "title": re.sub(r"^# Roadmap v\d+:\s*", "", open(f"docs/process/roadmap/{slug}/ROADMAP.md",
                                                                       encoding="utf-8").readline().strip())},
        "rates": {"productManager": pm_rate, "engineer": eng_rate},
        "productShare": share,
        "soFar": {
            "tokensSpent": spent,
            "tokensPending": pending,
            "stories": len(built),
            "productDays": sum(b["productDays"] for b in built),
            "devDays": sum(b["devDays"] for b in built),
            "humanCost": sum(b["cost"] for b in built),
            "storyTokenCost": round(sum(b["tokenCost"] or 0 for b in built), 2),
            "built": sorted(built, key=lambda b: b["id"]),
        },
        "projected": {
            "without": {"team": without["team"], "days": without["teamDays"], "work": without["work"],
                        "productDays": without["productDays"], "devDays": without["devDays"],
                        "productManagers": without["productManagers"], "engineers": without["engineers"],
                        "total": without["total"]},
            "with": {"team": with_cc["team"], "days": with_cc["teamDays"], "work": with_cc["work"],
                     "productDays": with_cc["productDays"], "devDays": with_cc["devDays"],
                     "tokens": tokens["projected"], "tokensProduct": tokens["projectedProduct"],
                     "tokensEngineering": tokens["projectedEngineering"], "total": with_cc["total"]},
            "saved": without["total"] - with_cc["total"],
            "tokenRate": tokens["ratePerPersonDay"],
            "tokensWhy": roadmap.get("tokensModel", {}).get("why", ""),
            "milestones": [
                {"name": m["name"],
                 "without": next((f for f in roadmap["forecast"]["Without"]["milestones"] if f["name"] == m["name"]), None),
                 "with": next((f for f in roadmap["forecast"]["With"]["milestones"] if f["name"] == m["name"]), None)}
                for m in roadmap["plan"]["milestones"] if "live in production" in m["name"]
            ],
            "notPlanned": not_planned,
            "notPlannedDays": sum(s["personDays"] or 0 for s in not_planned),
        },
    }
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// Generated by scripts/costs/total_cost.py (MVP1-E8-15). Do not edit: run `npm run total-cost`.\n\n")
        f.write("export const totalCost = ")
        f.write(json.dumps(data, indent=2, ensure_ascii=False))
        f.write(" as const;\n")
    sf, pj = data["soFar"], data["projected"]
    print(f"Total cost from roadmap {slug}. So far: tokens ${sf['tokensSpent']:,}, human cost of {sf['stories']} "
          f"stories built ${sf['humanCost']:,}. Projected: ${pj['without']['total']:,} without Claude Code, "
          f"${pj['with']['total']:,} with it. Not planned: {len(pj['notPlanned'])} stories. Wrote {OUT}")


if __name__ == "__main__":
    main()
