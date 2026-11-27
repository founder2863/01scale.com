"""Roll the token ledger up into the cost table on the site and in the docs.

Reads docs/process/token-ledger.json and writes:
- app/how-its-built/costs.ts      the data behind "Token Costs" on How It's Built
- docs/process/TOKEN-COSTS.md     the same table as a document

Definitions
- Build: work that produced something kept.
- Rework: work that changed or fixed something already delivered for the same
  story, because a requirement changed or a mistake was found.
- Scaffolding: work tied to no story: questions, discovery, tooling, process.
- Token yield (per story): build tokens divided by build plus rework tokens.
  100% means everything spent on the story was kept the first time.

Product and Engineering (MVP1-E8-16, Nikhil's rules of 27 Nov 2026): every ledger row is counted
toward Product, Engineering or both, by docs/process/token-classes.json. So far comes from the
ledger; projected comes from the latest roadmap's cost by story, read from
app/how-its-built/total-cost.ts (each remaining story follows the roadmap's owner).
Scaffolding is shown as "pre-requisites" under each side.

Run from the repo root:  npm run costs   (after `npm run total-cost` when the roadmap changes)
"""
import json
import os

LEDGER = "docs/process/token-ledger.json"
CLASSES = "docs/process/token-classes.json"
TOTAL_COST = "app/how-its-built/total-cost.ts"
SIDES = ("product", "engineering")


def money(x):
    return None if x is None else round(x, 2)


def product_share(row, classes):
    """The Product share (0 to 1) of a ledger row; Engineering gets the rest. Stops on a row no rule covers."""
    if row["kind"] != "scaffolding":
        entry = classes["stories"].get(row["area"])
        if entry is None:
            raise SystemExit(f"costs: story area {row['area']!r} is not classified in {CLASSES}")
        return entry["product"]
    entry = classes["requests"].get(f"{row['session']}#{row['n']}") or classes["prerequisiteDefaults"].get(row["area"])
    if entry is None:
        raise SystemExit(f"costs: pre-requisite row {row['session']}#{row['n']} ({row['area']}) is not classified in {CLASSES}")
    return entry["product"]


def by_side(rows, names, classes, overhead, projected):
    """Product and Engineering, each so far (stories and pre-requisites) and projected. Pure."""
    out = {}
    for side in SIDES:
        def part(r):
            p = product_share(r, classes)
            return p if side == "product" else 1 - p

        stories = []
        for key, name in names.items():
            mine = [r for r in rows if r["area"] == key and r["kind"] != "scaffolding"]
            share = part(mine[0]) if mine else 0
            if not mine or share == 0:
                continue
            bt = sum(r["tokens"] for r in mine if r["kind"] == "build")
            rt = sum(r["tokens"] for r in mine if r["kind"] == "rework")
            bc = sum(r["cost_usd"] or 0 for r in mine if r["kind"] == "build")
            rc = sum(r["cost_usd"] or 0 for r in mine if r["kind"] == "rework")
            stories.append({
                "key": key, "name": name, "share": round(100 * share),
                "why": classes["stories"][key]["why"],
                "tokens": round((bt + rt) * share), "buildCost": money(bc * share),
                "reworkCost": money(rc * share), "totalCost": money((bc + rc) * share),
                "yield": round(100 * bt / (bt + rt)) if bt + rt else None,
                "pending": any(r["cost_usd"] is None for r in mine),
                "raw": (bc + rc) * share,
            })
        prereq = []
        for area in dict.fromkeys(r["area"] for r in rows if r["kind"] == "scaffolding"):
            mine = [(r, part(r)) for r in rows if r["area"] == area and r["kind"] == "scaffolding"]
            mine = [(r, w) for r, w in mine if w > 0]
            if mine:
                prereq.append({"name": area, "requests": len(mine),
                               "tokens": round(sum(r["tokens"] * w for r, w in mine)),
                               "cost": sum((r["cost_usd"] or 0) * w for r, w in mine)})
        out[side] = {"stories": stories, "prereq": prereq}

    # Tool overhead belongs to no request: it is shared in proportion to what each side measured.
    measured = {side: sum(s["raw"] for s in out[side]["stories"]) + sum(a["cost"] for a in out[side]["prereq"])
                for side in SIDES}
    whole = sum(measured.values())
    for side in SIDES:
        o = out[side]
        if overhead:
            o["prereq"].append({"name": "Tool overhead (background calls), shared in proportion", "requests": 0,
                                "tokens": 0, "cost": overhead * measured[side] / whole if whole else 0})
        story_cost = sum(s.pop("raw") for s in o["stories"])
        prereq_cost = sum(a["cost"] for a in o["prereq"])
        for a in o["prereq"]:
            a["cost"] = money(a["cost"])
        remaining = sorted((b for b in projected if b["owner"] == side), key=lambda b: b["id"])
        o["storyTotals"] = {"tokens": sum(s["tokens"] for s in o["stories"]), "cost": money(story_cost),
                            "buildCost": money(sum(s["buildCost"] for s in o["stories"])),
                            "reworkCost": money(sum(s["reworkCost"] for s in o["stories"])),
                            "pending": any(s["pending"] for s in o["stories"])}
        o["prereqTotals"] = {"requests": sum(a["requests"] for a in o["prereq"]),
                             "tokens": sum(a["tokens"] for a in o["prereq"]), "cost": money(prereq_cost)}
        o["projected"] = [{"id": b["id"], "title": b["title"], "size": b["size"], "issue": b["issue"],
                           "cost": b["tokens"]} for b in remaining]
        o["soFar"] = money(story_cost + prereq_cost)
        o["projectedCost"] = money(sum(b["tokens"] for b in remaining))
        o["projectedStories"] = len(remaining)
        o["total"] = money(story_cost + prereq_cost + sum(b["tokens"] for b in remaining))
    return out


def read_ts(path):
    """The JSON object in a generated TypeScript data file."""
    text = open(path, encoding="utf-8").read()
    body = text[text.index("= ") + 2:]
    return json.loads(body[: body.rindex("}") + 1])


def main():
    ledger = json.load(open(LEDGER))
    rows = ledger["requests"]
    names = ledger["stories"]

    stories = []
    for key, name in names.items():
        mine = [r for r in rows if r["area"] == key]
        if not mine:
            continue
        build = [r for r in mine if r["kind"] == "build"]
        rework = [r for r in mine if r["kind"] == "rework"]
        bt = sum(r["tokens"] for r in build)
        rt = sum(r["tokens"] for r in rework)
        pending = any(r["cost_usd"] is None for r in mine)
        bc = sum(r["cost_usd"] or 0 for r in build)
        rc = sum(r["cost_usd"] or 0 for r in rework)
        stories.append({
            "key": key,
            "name": name,
            "requests": len(mine),
            "buildTokens": bt,
            "reworkTokens": rt,
            "buildCost": money(bc),
            "reworkCost": money(rc),
            "totalCost": money(bc + rc),
            "yield": round(100 * bt / (bt + rt)) if bt + rt else None,
            "pending": pending,
        })

    areas = []
    for area in dict.fromkeys(r["area"] for r in rows if r["kind"] == "scaffolding"):
        mine = [r for r in rows if r["area"] == area and r["kind"] == "scaffolding"]
        areas.append({
            "name": area,
            "requests": len(mine),
            "tokens": sum(r["tokens"] for r in mine),
            "cost": money(sum(r["cost_usd"] or 0 for r in mine)),
        })

    overhead = round(sum(sess.get("overhead_usd", 0) for sess in ledger["sessions"]), 2)
    if overhead:
        areas.append({"name": "Tool overhead (background calls)", "requests": 0, "tokens": 0, "cost": overhead})

    def total(kind=None):
        sel = [r for r in rows if kind is None or r["kind"] == kind]
        return sum(r["tokens"] for r in sel), sum(r["cost_usd"] or 0 for r in sel)

    all_t, all_c = total()
    b_t, b_c = total("build")
    r_t, r_c = total("rework")
    s_t, s_c = total("scaffolding")
    totals = {
        "requests": len(rows),
        "tokens": all_t,
        "cost": money(all_c + overhead),
        "buildCost": money(b_c),
        "reworkCost": money(r_c),
        "scaffoldingCost": money(s_c + overhead),
        "storyYield": round(100 * b_t / (b_t + r_t)) if b_t + r_t else None,
        "overallYield": round(100 * b_t / all_t) if all_t else None,
        "pendingRequests": sum(1 for r in rows if r["cost_usd"] is None),
        # Upper-bound estimate for rows never priced by the tool (PR #158); kept out of every measured total.
        "pendingEstimate": round(sum(r.get("estimated_usd") or 0 for r in rows if r["cost_usd"] is None), 2),
        "pendingEstimated": sum(1 for r in rows if r["cost_usd"] is None and r.get("estimated_usd") is not None),
    }
    # The Total line under each table (Nikhil's request on PR #136).
    story_totals = {
        "requests": sum(s["requests"] for s in stories),
        "tokens": b_t + r_t,
        "buildCost": money(b_c),
        "reworkCost": money(r_c),
        "cost": money(b_c + r_c),
        "yield": totals["storyYield"],
        "pending": any(s["pending"] for s in stories),
    }
    scaffolding_totals = {
        "requests": sum(a["requests"] for a in areas),
        "tokens": sum(a["tokens"] for a in areas),
        "cost": money(s_c + overhead),
    }

    by_kind = {}
    for session in ledger["sessions"]:
        for k, v in session.get("by_kind_usd", {}).items():
            by_kind[k] = round(by_kind.get(k, 0) + v, 2)
    expensive = sorted((r for r in rows if r["cost_usd"]), key=lambda r: r["cost_usd"], reverse=True)[:5]

    # Figures for the Expensive Mistakes tab (MVP1-E0-46), worked out here so no number on it is typed by hand.
    def story_split(key):
        mine = [r for r in rows if r["area"] == key]
        build = sum(r["cost_usd"] or 0 for r in mine if r["kind"] == "build")
        rework = sum(r["cost_usd"] or 0 for r in mine if r["kind"] == "rework")
        reload = sum(r["cost_usd"] or 0 for r in mine if r["kind"] == "rework" and "after a long break" in r["summary"])
        return {"build": money(build), "rework": money(rework), "reworkAfterBreak": money(reload),
                "reworkRequests": sum(1 for r in mine if r["kind"] == "rework"),
                "yield": round(100 * build / (build + rework)) if build + rework else None}

    priced = [r for r in rows if r["cost_usd"] is not None]
    after_break = [r["cost_usd"] for r in priced if "after a long break" in r["summary"]]
    others = sorted(r["cost_usd"] for r in priced if "after a long break" not in r["summary"])
    typical = others[len(others) // 2] if others else 0
    late = [r for r in rows if "merged too late" in r["summary"]]
    mistakes = {
        "designRedo": story_split("DESIGN-ALL"),
        "homePage": story_split("MVP1-E0-36-42"),
        "reloads": {
            "requests": len(after_break),
            "cost": money(sum(after_break)),
            "share": round(100 * sum(after_break) / (all_c + overhead)) if all_c else None,
            "median": money(sorted(after_break)[len(after_break) // 2]) if after_break else None,
            "typical": money(typical),
            "extra": money(sum(after_break) - typical * len(after_break)),
        },
        "mergedTooSoon": {"requests": len(late), "cost": money(sum(r["cost_usd"] or 0 for r in late))},
    }

    # Product and Engineering, so far and projected (MVP1-E8-16).
    classes = json.load(open(CLASSES, encoding="utf-8"))
    total_cost = read_ts(TOTAL_COST) if os.path.exists(TOTAL_COST) else None
    projected = total_cost["projected"]["byStory"] if total_cost else []
    sides = by_side(rows, names, classes, overhead, projected)
    split = {
        **sides,
        "roadmap": total_cost["version"] if total_cost else None,
        "tokenRate": total_cost["projected"]["tokenRate"] if total_cost else None,
        "tokensWhy": total_cost["projected"]["tokensWhy"] if total_cost else "",
        "soFar": money(all_c + overhead),
        "projectedCost": money(sum(sides[x]["projectedCost"] for x in SIDES)),
        "total": money(all_c + overhead + sum(b["tokens"] for b in projected)),
    }

    data = {
        "updated": max(r["ts"] for r in rows)[:10],
        "sessions": len(ledger["sessions"]),
        "stories": stories,
        "storyTotals": story_totals,
        "scaffolding": areas,
        "scaffoldingTotals": scaffolding_totals,
        "totals": totals,
        "byKind": by_kind,
        "mistakes": mistakes,
        "split": split,
        "mostExpensive": [{"summary": r["summary"], "cost": money(r["cost_usd"]), "tokens": r["tokens"], "outputTokens": r["output_tokens"]} for r in expensive],
    }
    with open("app/how-its-built/costs.ts", "w") as f:
        f.write("// Generated by scripts/costs/build_costs.py from docs/process/token-ledger.json. Do not edit by hand.\n")
        f.write("export const costs = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n")

    def m(x):
        return "pending" if x is None else f"${x:,.2f}"

    lines = [
        "# Token costs",
        "",
        "What it costs to build 01scale with Claude Code, per story. Generated from `docs/process/token-ledger.json` by `npm run costs`; do not edit by hand.",
        "",
        f"Updated {data['updated']}. {totals['requests']} requests across {data['sessions']} session(s). Total **{m(totals['cost'])}** for {all_t / 1e6:,.1f} million tokens.",
        "",
        "## Per story",
        "",
        "| Story | Requests | Tokens | Build cost | Rework cost | Total | Token yield |",
        "|---|---|---|---|---|---|---|",
    ]
    for s in stories:
        lines.append(f"| {s['name']} | {s['requests']} | {(s['buildTokens'] + s['reworkTokens']) / 1e6:.2f}M | {m(s['buildCost'])} | {m(s['reworkCost'])} | {m(s['totalCost'])}{' (part pending)' if s['pending'] else ''} | {s['yield']}% |")
    st = story_totals
    lines.append(f"| **Total** | **{st['requests']}** | **{st['tokens'] / 1e6:.2f}M** | **{m(st['buildCost'])}** | **{m(st['reworkCost'])}** | **{m(st['cost'])}**{' (part pending)' if st['pending'] else ''} | **{st['yield']}%** |")
    lines += ["", "## Scaffolding (not tied to a story)", "", "| Area | Requests | Tokens | Cost |", "|---|---|---|---|"]
    for a in areas:
        lines.append(f"| {a['name']} | {a['requests']} | {a['tokens'] / 1e6:.2f}M | {m(a['cost'])} |")
    sc = scaffolding_totals
    lines.append(f"| **Total** | **{sc['requests']}** | **{sc['tokens'] / 1e6:.2f}M** | **{m(sc['cost'])}** |")
    lines += ["", "## Product and Engineering", "",
              "Every ledger row counts toward Product, Engineering or both (`docs/process/token-classes.json`; rules in `docs/decisions/MVP1-E8.md`). Projected: the remaining stories of the latest roadmap, by owner.", "",
              "| | So far | Projected | Total |", "|---|---|---|---|"]
    for side in SIDES:
        o = split[side]
        lines.append(f"| {side.capitalize()} | {m(o['soFar'])} | {m(o['projectedCost'])} ({o['projectedStories']} stories) | {m(o['total'])} |")
    lines.append(f"| **Total token cost** | **{m(split['soFar'])}** | **{m(split['projectedCost'])}** | **{m(split['total'])}** |")
    for side in SIDES:
        o = split[side]
        lines += ["", f"### {side.capitalize()}: stories so far", "", "| Story | Share | Tokens | Build cost | Rework cost | Total | Token yield |", "|---|---|---|---|---|---|---|"]
        for s in o["stories"]:
            lines.append(f"| {s['name']} | {s['share']}% | {s['tokens'] / 1e6:.2f}M | {m(s['buildCost'])} | {m(s['reworkCost'])} | {m(s['totalCost'])}{' (part pending)' if s['pending'] else ''} | {s['yield']}% |")
        lines += ["", f"### {side.capitalize()}: pre-requisites so far", "", "| Area | Requests | Tokens | Cost |", "|---|---|---|---|"]
        for a in o["prereq"]:
            lines.append(f"| {a['name']} | {a['requests']} | {a['tokens'] / 1e6:.2f}M | {m(a['cost'])} |")
    lines += [
        "",
        "## Totals",
        "",
        f"- Build {m(totals['buildCost'])}, rework {m(totals['reworkCost'])}, scaffolding {m(totals['scaffoldingCost'])}.",
        f"- Token yield across stories (build ÷ build + rework): {totals['storyYield']}%.",
        *([f"- {totals['pendingEstimated']} pending request(s) were never priced by the tool; estimated at about ${totals['pendingEstimate']:,.2f} from their measured tokens at list prices (an upper bound), not included in the totals above."] if totals['pendingEstimated'] else []),
        f"- Share of all tokens that went into kept story work: {totals['overallYield']}%.",
        "",
        "## Definitions",
        "",
        "- **Build**: work that produced something kept.",
        "- **Rework**: work that changed or fixed something already delivered for the same story, because a requirement changed or a mistake was found.",
        "- **Scaffolding**: work tied to no story: questions, discovery, tooling, process.",
        "- **Token yield**: a story's build tokens divided by its build plus rework tokens.",
        "- **Tokens** include context re-read from the cache, which is most of the volume but the cheapest part.",
        "- **Tool overhead** is what Claude Code charged beyond the responses recorded for requests, such as its own background checks. It is counted under scaffolding.",
        "- **Pending** means Claude Code had not yet priced those responses when the table was updated. Nothing is estimated.",
        "",
        "## How it is measured",
        "",
        "`scripts/costs/extract_session.py` reads a session transcript. Claude Code records its own running cost there; the script recovers the exact per-token rates it used and prices each response from its recorded tokens. A long request can be cut at split times (for example the commit that finished a story) so each story gets its own cost. The story, kind and summary of each request are assigned by hand in the ledger.",
        "",
    ]
    open("docs/process/TOKEN-COSTS.md", "w").write("\n".join(lines))
    print(json.dumps(totals))


if __name__ == "__main__":
    main()
