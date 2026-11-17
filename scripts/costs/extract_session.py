"""Measure the tokens and cost of every request in a Claude Code session.

Reads a session transcript (and its subagents' transcripts) and prints one row
per request the person typed: when it was sent, the tokens used answering it,
and the cost.

Where the cost comes from
-------------------------
Claude Code writes its own running cost into the transcript ("cost-state"
entries), broken down by model. Those snapshots are cumulative and only written
now and then, so they cannot be split by request directly. This script works out
the per-token rates Claude Code used for each model by fitting those snapshots
(the fit must be exact), then prices each response from its recorded tokens.
Rows plus overhead add up to Claude Code's own latest figure;
anything the tool charged beyond the responses in the transcript (its own
background calls) is reported once, as overhead, instead of being spread over
the requests. Nothing here uses a price written by hand.

A model with too few snapshots to fit is priced in proportion to its tokens and
scaled to its recorded total. Responses after a model's last snapshot, for a
model that cannot be fitted, are reported as pending.

Splitting a long request
------------------------
One request can cover several stories (for example "design every module").
Pass split times and the request is cut into segments at those moments, each
priced separately, so each story gets its own cost. A good split time is the
commit that finished a story. The ledger keeps the split times, so the result
can be reproduced.

Usage (from the repo root):
    python3 scripts/costs/extract_session.py <session.jsonl> [split-time ...] > requests.json
"""
import glob
import json
import os
import sys

FIELDS = ["input", "output", "cache_read", "cache_write"]


def load(path):
    with open(path) as handle:
        for line in handle:
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def usage_of(entry):
    usage = entry.get("message", {}).get("usage") or {}
    return {
        "input": usage.get("input_tokens", 0),
        "output": usage.get("output_tokens", 0),
        "cache_read": usage.get("cache_read_input_tokens", 0),
        "cache_write": usage.get("cache_creation_input_tokens", 0),
    }


def solve(rows):
    """Least squares for the rate of each token kind; returns (rates, max error)."""
    cols = [i for i in range(4) if any(r[0][i] for r in rows)]
    a = [[r[0][i] for i in cols] for r in rows]
    y = [r[1] for r in rows]
    n = len(cols)
    if len({tuple(r) for r in a}) < n + 1:
        return None, None
    m = [[sum(x[i] * x[k] for x in a) for k in range(n)] + [sum(x[i] * v for x, v in zip(a, y))] for i in range(n)]
    for i in range(n):
        p = max(range(i, n), key=lambda k: abs(m[k][i]))
        m[i], m[p] = m[p], m[i]
        if abs(m[i][i]) < 1e-30:
            return None, None
        for k in range(n):
            if k != i:
                f = m[k][i] / m[i][i]
                m[k] = [u - f * w for u, w in zip(m[k], m[i])]
    sol = [m[i][n] / m[i][i] for i in range(n)]
    rates = [0.0] * 4
    for k, c in enumerate(cols):
        rates[c] = sol[k]
    err = max(abs(sum(rates[i] * x[0][i] for i in range(4)) - x[1]) for x in rows)
    return rates, err


def main(path, splits=()):
    folder = os.path.splitext(path)[0]
    entries = list(load(path))

    # Requests the person typed, in order.
    requests = []
    for e in entries:
        if e.get("type") != "user" or e.get("origin", {}).get("kind") != "human":
            continue
        content = e.get("message", {}).get("content")
        if isinstance(content, list):
            text = " ".join(c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text")
        else:
            text = content or ""
        if text.strip():
            requests.append({"ts": e.get("timestamp"), "text": text.strip()})

    # Cut requests at the split times. Times are compared as UTC ISO strings.
    for split in sorted(splits):
        split = split.replace("+00:00", "Z")
        before = [r for r in requests if r["ts"] < split]
        if before and split not in {r["ts"] for r in requests}:
            parent = before[-1]
            requests.append({"ts": split, "text": "(continued) " + parent["text"].lstrip("(continued) ")})
            requests.sort(key=lambda r: r["ts"])

    # Every model response, from the session and its subagents, de-duplicated.
    responses, seen = [], set()
    sources = [entries] + [list(load(f)) for f in sorted(glob.glob(os.path.join(folder, "subagents", "*.jsonl")))]
    for n, source in enumerate(sources):
        for pos, e in enumerate(source):
            if e.get("type") != "assistant":
                continue
            msg = e.get("message", {})
            if not msg.get("usage") or msg.get("model") in (None, "<synthetic>") or msg.get("id") in seen:
                continue
            seen.add(msg.get("id"))
            # Position in the main transcript; subagents' responses count as early.
            responses.append({"ts": e.get("timestamp"), "model": msg["model"], "pos": pos if n == 0 else -1, **usage_of(e)})

    # Claude Code's own cumulative cost, per model.
    snapshots, latest, last_pos = {}, {}, {}
    for pos, e in enumerate(entries):
        if e.get("type") != "cost-state":
            continue
        for model in e.get("modelUsage", {}):
            last_pos[model] = pos
        for model, u in e.get("modelUsage", {}).items():
            row = ([u.get("inputTokens", 0), u.get("outputTokens", 0), u.get("cacheReadInputTokens", 0), u.get("cacheCreationInputTokens", 0)], u.get("costUSD", 0.0))
            snapshots.setdefault(model, []).append(row)
            latest[model] = row

    rates = {}
    for model, rows in snapshots.items():
        fitted, err = solve(rows)
        if fitted and err is not None and err < 0.01 and all(r >= 0 for r in fitted):
            rates[model] = fitted

    # Price each response, then scale each model so its total matches the tool.
    weight_rates = next(iter(rates.values()), [1, 5, 0.025, 2])
    for r in responses:
        model_rates = rates.get(r["model"], weight_rates)
        r["raw"] = sum(model_rates[i] * r[f] for i, f in enumerate(FIELDS))
    overhead = {}
    for model in {r["model"] for r in responses}:
        mine = [r for r in responses if r["model"] == model]
        if model not in latest:
            for r in mine:
                r["cost"] = None
            continue
        if model not in rates:
            # Without exact rates, only responses the tool has already priced can
            # share its total. Later ones stay pending until the next snapshot.
            later = [r for r in mine if r["pos"] > last_pos[model]]
            for r in later:
                r["cost"] = None
            mine = [r for r in mine if r["pos"] <= last_pos[model]]
        raw = sum(r["raw"] for r in mine)
        if model in rates:
            # Priced exactly from the tool's own rates. Anything the tool charged
            # beyond the responses in the transcript (its own background calls)
            # is reported separately as overhead, not spread over requests.
            for r in mine:
                r["cost"] = r["raw"]
            overhead[model] = latest[model][1] - raw
        else:
            scale = latest[model][1] / (raw or 1)
            for r in mine:
                r["cost"] = r["raw"] * scale

    # Assign each response to the request that was being answered.
    out = []
    for i, req in enumerate(requests):
        start = req["ts"]
        end = requests[i + 1]["ts"] if i + 1 < len(requests) else "9999"
        mine = [r for r in responses if start <= r["ts"] < end]
        pending = any(r["cost"] is None for r in mine)
        out.append({
            "ts": start,
            "prompt": req["text"][:120],
            "models": sorted({r["model"] for r in mine}),
            "tokens": sum(r[f] for r in mine for f in FIELDS),
            "output_tokens": sum(r["output"] for r in mine),
            "cost_usd": None if pending else round(sum(r["cost"] for r in mine), 4),
        })
    # Where the money went, by kind of token, from the tool's own latest totals.
    by_kind = dict.fromkeys(FIELDS, 0.0)
    for model, row in latest.items():
        model_rates = rates.get(model)
        if not model_rates:
            continue
        for i, f in enumerate(FIELDS):
            by_kind[f] += model_rates[i] * row[0][i]

    json.dump({
        "session": os.path.basename(folder),
        "by_kind_usd": {k: round(v, 2) for k, v in by_kind.items()},
        "overhead_usd": round(sum(overhead.values()), 4),
        "tool_total_usd": round(sum(v[1] for v in latest.values()), 4),
        "rates_usd_per_million": {m: dict(zip(FIELDS, [round(x * 1e6, 4) for x in v])) for m, v in rates.items()},
        "requests": out,
    }, sys.stdout, indent=1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
