"""Tests for the Product and Engineering split in scripts/costs/build_costs.py (MVP1-E8-16),
on a small synthetic ledger. Run: npm run test:costs"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import build_costs as bc  # noqa: E402

NAMES = {"A": "Story A (design)", "B": "Story B (code)"}
CLASSES = {
    "stories": {"A": {"product": 0.75, "why": "design"}, "B": {"product": 0, "why": "code"}},
    "prerequisiteDefaults": {"Planning": {"product": 1, "why": "PRDs"}},
    "requests": {"s#4": {"product": 0, "why": "merge conflict"}},
}


def row(n, area, kind, tokens, cost):
    return {"session": "s", "n": n, "area": area, "kind": kind, "tokens": tokens, "cost_usd": cost}


ROWS = [
    row(1, "A", "build", 300, 3.0),
    row(2, "A", "rework", 100, 1.0),
    row(3, "B", "build", 200, 2.0),
    row(4, "Process", "scaffolding", 50, 0.5),
    row(5, "Planning", "scaffolding", 50, 1.5),
]
PROJECTED = [
    {"id": "X-1", "title": "PM story", "size": "S", "issue": 1, "owner": "product", "tokens": 10.0},
    {"id": "X-2", "title": "Eng story", "size": "M", "issue": 2, "owner": "engineering", "tokens": 30.0},
]


def test_sides_add_up_to_the_whole():
    out = bc.by_side(ROWS, NAMES, CLASSES, 2.0, PROJECTED)
    p, e = out["product"], out["engineering"]
    # Story A: 4.0 at 75% Product. Story B: 2.0 Engineering. Planning 1.5 Product, Process 0.5 Engineering.
    assert p["storyTotals"]["cost"] == 3.0
    assert e["storyTotals"]["cost"] == 3.0
    # Overhead 2.0 shared by measured cost: Product 4.5 of 8, Engineering 3.5 of 8.
    assert p["soFar"] == pytest.approx(4.5 + 2.0 * 4.5 / 8, abs=0.01)
    assert e["soFar"] == pytest.approx(3.5 + 2.0 * 3.5 / 8, abs=0.01)
    assert p["soFar"] + e["soFar"] == pytest.approx(10.0, abs=0.01)
    assert (p["projectedCost"], e["projectedCost"]) == (10.0, 30.0)
    assert p["total"] + e["total"] == pytest.approx(50.0, abs=0.01)


def test_shared_story_keeps_its_yield_and_share():
    a = next(s for s in bc.by_side(ROWS, NAMES, CLASSES, 0, [])["engineering"]["stories"] if s["key"] == "A")
    assert a["share"] == 25
    assert a["yield"] == 75
    assert a["totalCost"] == 1.0


def test_unclassified_row_stops_the_build():
    with pytest.raises(SystemExit):
        bc.by_side(ROWS + [row(6, "Questions", "scaffolding", 10, 0.1)], NAMES, CLASSES, 0, [])


def test_classes_cover_the_real_ledger():
    import json
    root = os.path.join(os.path.dirname(__file__), "..", "..", "..")
    ledger = json.load(open(os.path.join(root, bc.LEDGER), encoding="utf-8"))
    classes = json.load(open(os.path.join(root, bc.CLASSES), encoding="utf-8"))
    for r in ledger["requests"]:
        assert 0 <= bc.product_share(r, classes) <= 1


def test_epic_grid_rows_and_dashes():
    classes = {**CLASSES, "stories": {"MVP1-E1-09-E4-05": {"product": 0, "why": "code"},
                                      "P0-SITE": {"product": 0, "why": "code"}},
               "epics": {"P0-SITE": {"epic": "MVP1-E0", "why": "site"}}}
    rows = [row(1, "MVP1-E1-09-E4-05", "build", 100, 2.0), row(2, "P0-SITE", "rework", 50, 1.0),
            row(3, "Planning", "scaffolding", 10, 0.5)]
    proj = [{"id": "MVP1-E2-01", "title": "t", "size": "S", "issue": 1, "epic": "MVP1-E2", "owner": "product", "tokens": 5.0}]
    sides = bc.by_side(rows, {"MVP1-E1-09-E4-05": "x", "P0-SITE": "y"}, classes, 0, proj)
    grid = bc.by_epic(rows, classes, sides, proj, {"MVP1-E1": "Identity"})
    by_key = {r["key"]: r for r in grid["rows"]}
    assert list(by_key) == ["MVP1-E0", "MVP1-E1", "MVP1-E2"]          # a two-epic area goes to the first epic
    assert by_key["MVP1-E1"]["product"]["actual"] is None             # no data: "—" on the page
    assert by_key["MVP1-E0"]["engineering"]["actual"]["rework"] == 1.0
    assert by_key["MVP1-E2"]["product"]["projected"] == 5.0
    assert grid["prereq"]["product"]["actual"]["build"] is None       # pre-requisites have no build/rework split
    assert grid["total"]["grand"] == {"actual": 3.5, "projected": 5.0, "total": 8.5}


def test_area_without_epic_stops_the_build():
    with pytest.raises(SystemExit):
        bc.epic_of("SOMETHING-NEW", {"epics": {}})
