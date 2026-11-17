"""Mechanical checks for the review-architecture skill.

Lists every call one module's design makes to another service's endpoint and
whether that endpoint exists in the provider's design, plus every event named
and every error code per service. Run from the repo root:

    python3 scripts/site/review_architecture.py

Read-only: it writes nothing. The judgement is the skill's; this only finds seams.
"""
import glob
import importlib.util
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

SERVICES = {"Identity": "identity", "Upload": "upload", "Extraction": "extraction", "Review": "review",
            "Payment": "payment", "Delivery": "delivery", "DocFlow": "docflow"}


def norm(path):
    return re.sub(r"\{[^}]+\}", "{}", path.split("?")[0].rstrip("/"))


def lookup(method, full):
    """The module defining this call: exact, or a literal path matching a {param} segment."""
    want = norm(full).split("/")
    for (m, p), key in defined.items():
        have = p.split("/")
        if m == method and len(have) == len(want) and all(h == w or h == "{}" for h, w in zip(have, want)):
            return key
    return None


def by_path(method, p):
    """When no service is named before the call, find the one service whose spec has it."""
    hits = {key for (m, full), key in defined.items() if m == method and re.sub(r"^/api/\w+/v1", "", full) == norm(p)}
    return hits


# ---- what exists: endpoints per service
defined = {}  # (method, normalised full path) -> module
modules = {}
for path in sorted(glob.glob(os.path.join(HERE, "*_design.py"))):
    if path.endswith("identity_design.py"):
        continue
    spec = importlib.util.spec_from_file_location(os.path.basename(path)[:-3], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    modules[mod.KEY] = mod.MODULE
    for e in mod.MODULE.get("endpoints", []):
        defined[(e["method"], norm(e["path"]))] = mod.KEY

# Login predates the renderer: read its endpoints from the generated spec.
for line in open("docs/services/identity/API-SPEC.md"):
    m = re.match(r"^### (GET|POST|PUT|PATCH|DELETE) (/\S+)", line)
    if m:
        defined[(m.group(1), norm("/api/identity/v1" + m.group(2)))] = "login"

# Template endpoints exist in every service.
TEMPLATE = [(e["method"], e["path"]) for e in modules.get("template", {}).get("endpoints", [])]
for svc in list(SERVICES.values()) + ["template"]:
    for method, p in TEMPLATE:
        defined.setdefault((method, norm(p.replace("{service}", svc))), "template")


def module_service(key, m):
    base = m.get("overview", {}).get("base", "")
    found = re.match(r"/api/(\w+)/v1", base)
    return found.group(1) if found else key


# ---- what is used: calls named in behaviour, notes and components
CALL = re.compile(r"(?:(Identity|Upload|Extraction|Review|Payment|Delivery|DocFlow)(?:'s)?\s+)?`(GET|POST|PUT|PATCH|DELETE) (/[^`\s]+)`")
EVENT = re.compile(r"`((?:identity|upload|extraction|review|payment|delivery|docflow)\.[a-z_]+\.[a-z_|]+)`")


def texts(m):
    for e in m.get("endpoints", []):
        for b in e.get("behaviour", []):
            yield f"{e['method']} {e['path']}", b
        yield f"{e['method']} {e['path']}", e.get("summary", "")
    for e in m.get("endpoints", []):
        for prm in e.get("params", []):
            yield f"{e['method']} {e['path']}", prm.get("constraints", "")
    for n in m.get("noEndpoint", []):
        yield n["topic"], n["how"]
    for c in m.get("components", []):
        for call in c.get("calls", []):
            yield f"component {c['name']}", call
    for f in m.get("flow", []):
        yield "flow", f["what"]
    for j in m.get("journeys", []):
        for s in j.get("steps", []):
            yield f"journey {j['name']}", s["system"]


missing, unnamed, ok, events = [], [], 0, {}
for key, m in modules.items():
    own = module_service(key, m)
    for where, text in texts(m):
        for svc_name, method, p in CALL.findall(text):
            svc = SERVICES.get(svc_name, own)
            full = p if p.startswith("/api/") else f"/api/{svc}/v1{p}"
            if lookup(method, full):
                ok += 1
            elif not svc_name and not p.startswith("/api/") and len(by_path(method, p)) == 1:
                ok += 1
                unnamed.append((key, where, method, p, by_path(method, p).pop()))
            else:
                missing.append((key, where, method, full))
        for ev in EVENT.findall(text):
            for name in re.sub(r"\.([a-z_]+)\|", r".\1|", ev).split("|"):
                full_name = name if "." in name else ev.rsplit(".", 1)[0] + "." + name
                events.setdefault(full_name, set()).add(key)

print(f"Cross-service calls that match a designed endpoint: {ok}")
print(f"Calls with no matching endpoint: {len(missing)}")
for key, where, method, full in sorted(set(missing)):
    print(f"  - {key}: {where} -> {method} {full}")

print(f"Calls that name no service, resolved by path (wording to tighten): {len(unnamed)}")
for key, where, method, p, owner in sorted(set(unnamed)):
    print(f"  - {key}: {where} -> {method} {p} (found in {owner})")

print("\nEvents named, and the modules that name them:")
for name in sorted(events):
    print(f"  - {name}: {', '.join(sorted(events[name]))}")

print("\nError codes per module (a code used for two meanings across modules is a finding):")
codes = {}
for key, m in modules.items():
    for e in m.get("endpoints", []):
        for err in e.get("errors", []):
            codes.setdefault(err["code"].strip("`"), {}).setdefault(err["status"], set()).add(key)
for code in sorted(codes):
    statuses = codes[code]
    flag = "  <- more than one status" if len(statuses) > 1 else ""
    print(f"  - {code}: " + "; ".join(f"{s} in {', '.join(sorted(k))}" for s, k in sorted(statuses.items())) + flag)

print("\nTables per schema (no table in two services; user-owned tables need owner_id or user_id):")
for key, m in modules.items():
    for t in m.get("tables", []):
        cols = {c["name"] for c in t["columns"]}
        owner = "owner_id" in cols or "user_id" in cols
        print(f"  - {t['name']} ({key}){'' if owner else '  [no owner column]'}")
