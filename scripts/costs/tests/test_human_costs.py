"""Tests for scripts/costs/human_costs.py on a small synthetic epics file (MVP1-E8-09 AC5).
Run: npm run test:costs"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import human_costs as hc  # noqa: E402

SAMPLE = """# Sample epics

## E0 · Foundation
### MVP1-E0-01 · Database — S
- **AC1:** something
### MVP1-E0-02 · Audit log — M
### MVP1-E0-03 · No size yet

## E1 · Identity
### MVP1-E1-01 · Login — L

## E8 · Costs
### MVP1-E8-01 · Cost tab — S
"""

MODEL = {
    "person_days_per_size": {"S": 3, "M": 8, "L": 15},
    "rates_usd_per_person_day": {"engineer": {"rate": 1000, "source": "test", "assumption": True}},
    "default_role": "engineer",
    "scope": {"epics_files": [], "exclude_epics": ["MVP1-E8"], "why": "test"},
    "done": {"fetched": "2026-11-22", "stories": [
        {"id": "MVP1-E0-01", "issue": 1, "closed": "2026-11-20"},
        {"id": "MVP1-E0-03", "issue": 3, "closed": "2026-11-21"},
        {"id": "MVP1-E8-01", "issue": 8, "closed": "2026-11-22"},
    ]},
}

LEDGER = {
    "stories": {
        "MVP1-E0-01": "MVP1-E0-01 · Database",
        "MVP1-E0-01-02": "MVP1-E0-01 to E0-02 · Database and audit (stories)",
        "MVP1-E1": "MVP1-E1 · Login design",
        "MVP1-E1-01": "MVP1-E1-01 · Login",
    },
    "requests": [
        {"area": "MVP1-E0-01", "kind": "build", "cost_usd": 2.0},
        {"area": "MVP1-E0-01", "kind": "rework", "cost_usd": 1.0},
        {"area": "MVP1-E0-01", "kind": "scaffolding", "cost_usd": 50.0},
        {"area": "MVP1-E0-01-02", "kind": "build", "cost_usd": 11.0},
        {"area": "MVP1-E1", "kind": "build", "cost_usd": 4.0},
        {"area": "MVP1-E1-01", "kind": "build", "cost_usd": None},
    ],
}


def data():
    return hc.build(MODEL, hc.parse_epics(SAMPLE), LEDGER)


def by_id(d):
    return {r["id"]: r for r in d["stories"] + d["excluded"]}


def test_sizes_parsed():
    stories = hc.parse_epics(SAMPLE)
    assert [(s["id"], s["size"]) for s in stories] == [
        ("MVP1-E0-01", "S"), ("MVP1-E0-02", "M"), ("MVP1-E0-03", None),
        ("MVP1-E1-01", "L"), ("MVP1-E8-01", "S"),
    ]
    assert stories[0]["title"] == "Database"
    assert stories[3]["epic"] == "MVP1-E1"


def test_missing_size_is_tbd_and_not_guessed():
    r = by_id(data())["MVP1-E0-03"]
    assert r["size"] == "TBD" and r["personDays"] is None and r["cost"] is None
    d = data()
    assert d["projected"]["tbd"] == ["MVP1-E0-03"]
    assert d["soFar"]["tbd"] == ["MVP1-E0-03"]  # done, but still not counted


def test_totals_add_up():
    d = data()
    # Projected: E0-01 (3) + E0-02 (8) + E1-01 (15); E0-03 is TBD, E8 is out of scope.
    assert d["projected"]["stories"] == 4
    assert d["projected"]["personDays"] == 26
    assert d["projected"]["cost"] == 26000
    # So far: only done stories with a size.
    assert d["soFar"]["stories"] == 2
    assert d["soFar"]["personDays"] == 3
    assert d["soFar"]["cost"] == 3000
    assert sum(e["projected"]["cost"] for e in d["epics"] if e["inScope"]) == d["projected"]["cost"]
    assert d["excludedProjected"]["cost"] == 3000 and d["excludedSoFar"]["cost"] == 3000


def test_measured_token_cost_from_ledger():
    rows = by_id(data())
    # E0-01: own build + rework (3.0, scaffolding ignored) + its share of the 11.0
    # covering E0-01 and E0-02, split by person-days 3:8.
    assert rows["MVP1-E0-01"]["tokenCost"] == 6.0
    assert rows["MVP1-E0-01"]["tokenCostShared"] is True
    assert rows["MVP1-E0-02"]["tokenCost"] == 8.0
    # Measured but not priced yet: pending, not $0.
    assert rows["MVP1-E1-01"]["tokenCost"] is None and rows["MVP1-E1-01"]["tokenCostPending"] is True
    assert [u["key"] for u in data()["ledgerUnassigned"]] == ["MVP1-E1"]


def test_ledger_names():
    known = ["MVP1-E0-05", "MVP1-E0-06", "MVP1-E0-07", "MVP1-E1-05", "AUTOREP-E6-03"]
    assert hc.ledger_story_ids("MVP1-E0-05 to E0-07 · x", known) == known[:3]
    assert hc.ledger_story_ids("MVP1-E1-05, E0-06 · x", known) == ["MVP1-E1-05", "MVP1-E0-06"]
    assert hc.ledger_story_ids("AUTOREP-E6-03 · x", known) == ["AUTOREP-E6-03"]
    assert hc.ledger_story_ids("MVP1-E1 · x", known) == []
    assert hc.ledger_story_ids("Design · x", known) == []
