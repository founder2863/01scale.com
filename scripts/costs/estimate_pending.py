"""Estimate the cost of requests the tool never priced (cost_usd null), for the ledger field estimated_usd.

Usage: python3 scripts/costs/estimate_pending.py <transcript.jsonl> <requests.json from extract_session.py>
Writes <requests>-est.json: per unpriced request, its measured tokens by kind and an upper-bound cost at Opus 5.5 list
prices. Checked against priced requests it runs 5-21% high. Never write it into cost_usd (record-token-costs skill).
"""
import json, sys
T, REQ = sys.argv[1], sys.argv[2]
RATES = {"input": 4.0, "output": 20.0, "cache_read": 0.20, "cache_write": 8.0}  # Opus 5.5, per million (site RATES table)
reqs = json.load(open(REQ))["requests"]
seen, resp = set(), []
for line in open(T):
    try: e = json.loads(line)
    except Exception: continue
    m = e.get("message") or {}
    if e.get("type") != "assistant" or not m.get("usage") or m.get("model") in (None, "<synthetic>") or m.get("id") in seen: continue
    seen.add(m["id"]); u = m["usage"]
    resp.append((e["timestamp"], m["model"], {"input": u.get("input_tokens", 0), "output": u.get("output_tokens", 0),
        "cache_read": u.get("cache_read_input_tokens", 0), "cache_write": u.get("cache_creation_input_tokens", 0)}))
out = {}
for i, r in enumerate(reqs):
    if r["cost_usd"] is not None: continue
    end = reqs[i + 1]["ts"] if i + 1 < len(reqs) else "9999"
    k = {f: 0 for f in RATES}; models = set()
    for ts, model, u in resp:
        if r["ts"] <= ts < end:
            models.add(model)
            for f in RATES: k[f] += u[f]
    out[r["ts"]] = {"n": i + 1, "models": sorted(models), "tokens": k, "usd": round(sum(k[f] * RATES[f] for f in RATES) / 1e6, 4)}
for v in out.values(): print(v["n"], v["models"], v["tokens"], v["usd"])
json.dump(out, open(REQ.replace(".json", "-est.json"), "w"), indent=1)
