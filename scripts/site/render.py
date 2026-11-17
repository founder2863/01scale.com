"""Render a module's design into its documents and its product page data.

A module's design is one Python file, scripts/site/<name>_design.py, that
defines MODULE: a dict in the same shape as the site's product page data
(see app/products/identity.ts for a complete example). This file turns it into

    docs/services/<service>/README.md        (when the Read Me part exists)
    docs/services/<service>/API-SPEC.md      (when endpoints exist)
    docs/services/<service>/DATA-MODEL.md    (when tables exist)
    docs/services/<service>/SCHEMA.md        (when the SQL exists)
    docs/services/<service>/USER-JOURNEYS.md (when journeys exist)
    docs/services/<service>/UI-COMPONENTS.md (when components exist)
    app/products/<key>.ts                    (when the module has a product page)

so a module can be designed one document at a time. Anything missing is filled
with an empty value, and the product page shows "Coming Soon..." for it.

Helpers at the bottom (param, endpoint, column, ...) keep the design files short.
"""
import json
import os

DEFAULTS = {
    "slug": "",
    "docsPath": "",
    "extraDocs": [],
    "labels": {"flow": "How it works", "hosted": "Pages provided by an outside service"},
    "notes": {"journey": "", "ui": "", "hosted": "", "token": "", "schema": ""},
    "notStored": [],
    "overview": {
        "name": "", "version": "", "status": "", "base": "",
        "what": [], "why": [], "scope_in": [], "scope_out": [], "stories": [],
    },
    "flow": [],
    "concepts": [],
    "quickstart": [],
    "cookies": [],
    "claims": [],
    "errorSample": "",
    "endpoints": [],
    "noEndpoint": [],
    "tables": [],
    "otherTables": "",
    "rules": [
        {"level": "API level: checked on every request before anything is stored", "items": []},
        {"level": "Schema level: enforced by the database, whatever the code does", "items": []},
        {"level": "Data model level: business rules the service guarantees", "items": []},
    ],
    "env": [],
    "openQuestions": [],
    "decisions": [],
    "journeys": [],
    "edgeCases": [],
    "components": [],
    "hostedPages": [],
    "uiRules": [],
    "entities": [],
    "lifecycles": [],
    "ddl": "",
    "queries": [],
}


def complete(module):
    """Return the module with every key the product page expects."""
    out = json.loads(json.dumps(DEFAULTS))
    for key, value in module.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key].update(value)
        else:
            out[key] = value
    for i, rule in enumerate(module.get("rules", [])):
        out["rules"][i] = rule
    return out


def table(headers, rows):
    lines = ["| " + " | ".join(headers) + " |", "|" + "---|" * len(headers)]
    for row in rows:
        lines.append("| " + " | ".join(str(c).replace("|", "\\|").replace("\n", " ") for c in row) + " |")
    return "\n".join(lines)


def header(m, title):
    o = m["overview"]
    stories = ", ".join(f"`{s}`" for s in o["stories"])
    return f"# {o['name']} service — {title}\n\n> **{o['version']}.** Status: {o['status'].lower()}. Stories: {stories}.\n"


def is_json(text):
    return text.lstrip().startswith(("{", "["))


def render_readme(m):
    o = m["overview"]
    docs = ", ".join(f"[{label}]({f})" for f, label in [
        ("USER-JOURNEYS.md", "user journeys"), ("UI-COMPONENTS.md", "UI components"),
        ("API-SPEC.md", "API specification"), ("DATA-MODEL.md", "data model"), ("SCHEMA.md", "schema")])
    parts = [header(m, "developer guide"),
             f"The other documents for this service: {docs}. The same content is on the site at `/products/{m['slug']}`.\n" if m["slug"] else f"The other documents for this service: {docs}.\n",
             "## What this service is\n", "\n\n".join(o["what"]) + "\n",
             "## Why it exists\n", table(["Reason", "In plain terms"], [(w["title"], w["text"]) for w in o["why"]]) + "\n",
             "## What is in this version\n", "**In scope**\n", "\n".join(f"- {x}" for x in o["scope_in"]) + "\n",
             "**Not in this version**\n", "\n".join(f"- {x}" for x in o["scope_out"]) + "\n"]
    if m["flow"]:
        parts += [f"## {m['labels']['flow']}\n", table(["Step", "Who", "What happens"], [(i + 1, s["who"], s["what"]) for i, s in enumerate(m["flow"])]) + "\n"]
    if m["concepts"]:
        parts += ["## Words used in this guide\n", table(["Term", "Meaning"], [(c["term"], c["meaning"]) for c in m["concepts"]]) + "\n"]
    if m["quickstart"]:
        parts += ["## Quick start\n", "These examples work once the service is built and deployed behind the gateway.\n"]
        for i, q in enumerate(m["quickstart"]):
            parts.append(f"### {i + 1}. {q['title']}\n\n{q['text']}\n\n```{q['lang']}\n{q['code']}\n```\n")
    if m["endpoints"]:
        parts += ["## Endpoints at a glance\n", f"Base address: `https://01scale.com{o['base']}`\n",
                  table(["Method", "Path", "Access", "Purpose"], [(f"`{e['method']}`", f"`{e['path'].replace(o['base'], '')}`", e["access"], e["title"]) for e in m["endpoints"]]) + "\n"]
    if m["env"]:
        parts += ["## Configuration\n", "Environment variables on the service's own deployment. Secrets are never committed.\n",
                  table(["Variable", "Value", "Secret"], [(f"`{v['name']}`", v["value"], v["secret"]) for v in m["env"]]) + "\n"]
    if m["decisions"]:
        parts += ["## Decisions\n", table(["Question", "What I decided"], [(d["question"], d["decision"]) for d in m["decisions"]]) + "\n"]
    if m["openQuestions"]:
        parts += ["## Open questions\n", "\n".join(f"- {q}" for q in m["openQuestions"]) + "\n"]
    return "\n".join(parts)


def render_api(m):
    o = m["overview"]
    parts = [header(m, "API specification"),
             f"Base address: `https://01scale.com{o['base']}`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).\n"]
    if m["errorSample"]:
        parts.append("## Errors\n\nEvery error uses `application/problem+json` with a stable `code`. Branch on `code`, never on the text.\n\n```json\n" + m["errorSample"] + "\n```\n")
    if m["cookies"]:
        parts.append("## Cookies\n\n" + table(["Cookie", "Holds", "Lifetime", "Attributes"], [(c["name"], c["holds"], c["lifetime"], c["attributes"]) for c in m["cookies"]]) + "\n")
    if m["claims"]:
        parts.append(f"## Token\n\n{m['notes']['token']}\n\n" + table(["Claim", "Example", "Meaning"], [(c["claim"], c["example"], c["meaning"]) for c in m["claims"]]) + "\n")
    parts.append("## Endpoints\n")
    for e in m["endpoints"]:
        s = [f"### {e['method']} {e['path'].replace(o['base'], '')}\n", f"**{e['title']}.** {e['summary']}\n", f"Access: **{e['access']}** · Story: `{e['story']}`\n"]
        if e["params"]:
            s.append("**Inputs**\n\n" + table(["Name", "In", "Type", "Required", "Constraints", "Meaning"], [(f"`{p['name']}`", p["in"], p["type"], p["required"], p["constraints"], p["meaning"]) for p in e["params"]]) + "\n")
        else:
            s.append("**Inputs:** none.\n")
        s.append("**Behaviour**\n\n" + "\n".join(f"- {b}" for b in e["behaviour"]) + "\n")
        s.append("**Responses**\n\n" + table(["Status", "When", "Body or headers"], [(f"`{r['status']}`", r["when"], r["body"]) for r in e["responses"]]) + "\n")
        if e["errors"]:
            s.append("**Errors**\n\n" + table(["Status", "Code", "When"], [(f"`{x['status']}`", x["code"], x["when"]) for x in e["errors"]]) + "\n")
        s.append("**Sample request**\n\n```http\n" + e["request"] + "\n```\n")
        s.append("**Sample response**\n\n```" + ("json" if is_json(e["response"]) else "http") + "\n" + e["response"] + "\n```\n")
        parts.append("\n".join(s))
    if m["noEndpoint"]:
        parts.append("## Behaviour with no endpoint of its own\n\n" + table(["Topic", "How it works"], [(n["topic"], n["how"]) for n in m["noEndpoint"]]) + "\n")
    if m["rules"][0]["items"]:
        parts.append("## Constraints at the API level\n\n" + "\n".join(f"- {r}" for r in m["rules"][0]["items"]) + "\n")
    return "\n".join(parts)


def render_data_model(m):
    parts = [header(m, "data model"),
             "What the service keeps, how the pieces relate, and what every field means. The SQL is in [`SCHEMA.md`](SCHEMA.md); shared database rules are in [`docs/architecture/DATABASE-DESIGN.md`](../../architecture/DATABASE-DESIGN.md).\n"]
    if m["entities"]:
        parts.append("## Entities\n\n" + table(["Entity", "Table", "What it is", "How it relates"], [(e["name"], e["table"], e["what"], e["relations"]) for e in m["entities"]]) + "\n")
    if m["lifecycles"]:
        parts.append("## Life of each record\n\n" + table(["Record", "Life"], [(l["name"], l["text"]) for l in m["lifecycles"]]) + "\n")
    for t in m["tables"]:
        parts.append(f"## `{t['name']}`\n\n{t['purpose']}\n\n" + table(["Field", "Type", "Empty allowed", "Default", "Constraints", "What it means"], [(f"`{c['name']}`", f"`{c['type']}`", c["nullable"], c["default"], c["constraints"], c["meaning"]) for c in t["columns"]]) + "\n")
    if m["otherTables"]:
        parts.append(f"## Other tables in this schema\n\n{m['otherTables']}\n")
    if m["rules"][2]["items"]:
        parts.append("## Business rules\n\n" + "\n".join(f"- {r}" for r in m["rules"][2]["items"]) + "\n")
    if m["notStored"]:
        parts.append("## What is deliberately not stored\n\n" + "\n".join(f"- {x}" for x in m["notStored"]) + "\n")
    return "\n".join(parts)


def render_schema(m):
    parts = [header(m, "schema"), f"{m['notes']['schema']} What each field means is in [`DATA-MODEL.md`](DATA-MODEL.md). In the build this is produced by Drizzle migrations; the SQL below is the target.\n",
             "```sql\n" + m["ddl"].rstrip() + "\n```\n"]
    if m["rules"][1]["items"]:
        parts.append("## Constraints at the schema level\n\n" + "\n".join(f"- {r}" for r in m["rules"][1]["items"]) + "\n")
    for t in m["tables"]:
        parts.append(f"## `{t['name']}`\n\n**Constraints and indexes**\n\n" + "\n".join(f"- {c}" for c in t["constraints"]) + "\n\n**Sample data**\n\n" + table([f"`{c}`" for c in t["sampleCols"]], [[v if str(v).startswith("(") else f"`{v}`" for v in r] for r in t["sampleRows"]]) + "\n")
    if m["queries"]:
        parts.append("## Common queries\n\n" + "\n".join(f"**{q['title']}**\n\n```sql\n{q['sql']}\n```\n" for q in m["queries"]))
    return "\n".join(parts)


def render_journeys(m):
    parts = [header(m, "user journeys"), f"{m['notes']['journey']}\n"]
    for j in m["journeys"]:
        parts.append(f"## {j['name']}\n\n**Who:** {j['who']} · **Starts when:** {j['trigger']} · **Stories:** " + ", ".join(f"`{s}`" for s in j["stories"]) + "\n\n" + table(["Step", "The person", "The system"], [(i + 1, s["person"], s["system"]) for i, s in enumerate(j["steps"])]) + f"\n\n**Result:** {j['outcome']}\n")
    if m["edgeCases"]:
        parts.append("## When something goes wrong\n\n" + table(["Situation", "What the person sees", "Error code"], [(e["situation"], e["sees"], e["code"]) for e in m["edgeCases"]]) + "\n")
    return "\n".join(parts)


def render_components(m):
    parts = [header(m, "UI components"), f"{m['notes']['ui']} Designed, not built.\n"]
    if m["uiRules"]:
        parts.append("## Rules\n\n" + "\n".join(f"- {r}" for r in m["uiRules"]) + "\n")
    for c in m["components"]:
        parts.append(f"## {c['name']}\n\n*{c['kind']}.* {c['purpose']}\n\n" + table(["Input", "Type", "Meaning"], [(f"`{p['name']}`", p["type"], p["meaning"]) for p in c["props"]]) + "\n\n**States:** " + "; ".join(c["states"]) + ".\n\n**Calls:** " + ", ".join(c["calls"]) + ".\n")
    if m["hostedPages"]:
        parts.append(f"## {m['labels']['hosted']}\n\n{m['notes']['hosted']}\n\n" + table(["Page", "What it does"], [(p["page"], p["what"]) for p in m["hostedPages"]]) + "\n")
    return "\n".join(parts)


def render(module, key):
    """Write the module's documents, and its page data if it has a product page."""
    m = complete(module)
    folder = m["docsPath"]
    os.makedirs(folder, exist_ok=True)
    outputs = [
        ("README.md", bool(m["overview"]["what"]), render_readme),
        ("API-SPEC.md", bool(m["endpoints"]), render_api),
        ("DATA-MODEL.md", bool(m["tables"]), render_data_model),
        ("SCHEMA.md", bool(m["ddl"]), render_schema),
        ("USER-JOURNEYS.md", bool(m["journeys"]), render_journeys),
        ("UI-COMPONENTS.md", bool(m["components"]), render_components),
    ]
    for name, present, fn in outputs:
        if present:
            open(os.path.join(folder, name), "w").write(fn(m))
    if m["slug"]:
        with open(f"app/products/{key}.ts", "w") as f:
            f.write(f"// Generated by scripts/site/render.py from scripts/site/{key}_design.py. Do not edit by hand.\n")
            f.write(f"export const {key} = " + json.dumps(m, indent=2, ensure_ascii=False) + ";\n")
    return m


# ---------------------------------------------------------------- helpers for design files

def param(name, where, kind, required, constraints, meaning):
    return {"name": name, "in": where, "type": kind, "required": required, "constraints": constraints, "meaning": meaning}


def response(status, when, body):
    return {"status": status, "when": when, "body": body}


def error(status, code, when):
    return {"status": status, "code": f"`{code}`", "when": when}


def endpoint(id, method, path, access, story, title, summary, params, behaviour, responses, errors, request, response_sample):
    return {"id": id, "method": method, "path": path, "access": access, "story": story, "title": title, "summary": summary,
            "params": params, "behaviour": behaviour, "responses": responses, "errors": errors,
            "request": request, "response": response_sample}


def column(name, kind, nullable, default, constraints, meaning):
    return {"name": name, "type": kind, "nullable": nullable, "default": default, "constraints": constraints, "meaning": meaning}


def journey(name, who, trigger, stories, steps, outcome):
    return {"name": name, "who": who, "trigger": trigger, "stories": stories,
            "steps": [{"person": a, "system": b} for a, b in steps], "outcome": outcome}


def component(name, kind, purpose, props, states, calls):
    return {"name": name, "kind": kind, "purpose": purpose,
            "props": [{"name": a, "type": b, "meaning": c} for a, b, c in props], "states": states, "calls": calls}


def problem(code, title, status, detail):
    return json.dumps({"type": f"https://01scale.com/errors/{code}", "title": title, "status": status,
                       "detail": detail, "code": code, "request_id": "req_0193a61f9c2e"}, indent=2)
