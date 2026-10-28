"""BC-05 reference model: what late patching of internet-facing systems costs, past and future.
Writes data/*.json and prints known answers. All data is fictional.

Usage: python3 tools/reference_model.py data
"""
import json, sys, math, random, datetime as dt
from collections import defaultdict

D = dt.date
TODAY = D(2026, 10, 30)
HORIZON_DAYS = 90
HISTORY_START = D(2025, 11, 1)

# ------------------------------------------------------------------ company
COMPANY = {
    "description": "Fictional regional health plan: 1.6 million members, 14,000 network providers, 3,200 brokers, 4,800 employees",
    "members": 1_600_000, "providers": 14_000, "brokers": 3_200, "employees": 4_800,
    "annual_premium_revenue": 4_200_000_000,
}

# ------------------------------------------------------------------ model parameters (fictional)
HAZARD = {"none": 0.0002, "poc": 0.001, "kev": 0.003}          # chance per day, public and no login
HAZARD_LABEL = {"none": "No public exploit", "poc": "Public exploit code", "kev": "Exploited in the wild (KEV)"}
EXPOSURE = {"public": 1.0, "login": 0.5, "partner": 0.2}         # partner = partner IP allowlist
EXPOSURE_LABEL = {"public": "Public, no login", "login": "Public, login required", "partner": "Partner allowlist only"}
MITIGATION = {"none": 1.0, "waf": 0.3, "allowlist": None}         # allowlist sets exposure to partner
COST_PER_RECORD = {"phi": 45, "payment": 25, "pii": 35, "employee": 50, "contact": 1}
CLASS_LABEL = {"phi": "Member health records", "payment": "Bank accounts (autopay)", "pii": "Provider and broker records",
               "employee": "Employee records", "contact": "Email addresses"}
WINDOW_WEIGHT = 0.2          # share of hourly cost during a 02:00 maintenance window
CHANGE_LABOR = 6_000         # per emergency change
WAF_RULE_COST = 1_500        # per virtual patch rule
SEASON = [((10, 15), (12, 7), 2.0, "Annual enrollment")]  # month/day ranges, multiplier on cost per hour down
FREEZES = [(D(2025, 10, 15), D(2025, 12, 7)), (D(2026, 10, 15), D(2026, 12, 7))]
WINDOW_DAYS = (1, 3)         # Tuesday, Thursday (weekday numbers) at 02:00

POLICY = {
    "current":  {"label": "Current policy", "kev": None, "Critical": 30, "High": 60, "Medium": 90, "Low": 180,
                 "emergency_lane": False},
    "proposed": {"label": "Proposed policy", "kev": 3, "Critical": 7, "High": 30, "Medium": 90, "Low": 180,
                 "emergency_lane": True},
}

def season_mult(d):
    for (m1, d1), (m2, d2), mult, _ in SEASON:
        if D(d.year, m1, d1) <= d <= D(d.year, m2, d2):
            return mult
    return 1.0

def in_freeze(d):
    return any(a <= d <= b for a, b in FREEZES)

def next_window(d, allow_freeze=False):
    """First Tue/Thu window on or after d, skipping the freeze unless allowed."""
    while True:
        if d.weekday() in WINDOW_DAYS and (allow_freeze or not in_freeze(d)):
            return d
        d += dt.timedelta(days=1)

# ------------------------------------------------------------------ assets
ASSETS = []
def asset(id, name, layer, team, owner, exposure, data, hourly, outage_h, window_h, in_cmdb=True, ir=1_000_000, note=""):
    ASSETS.append(dict(id=id, name=name, layer=layer, team=team, owner=owner, exposure=exposure,
                       data=[{"class": c, "records": n} for c, n in data], cost_per_hour_down=hourly,
                       outage_hours_if_exploited=outage_h, window_hours=window_h, in_cmdb=in_cmdb,
                       incident_response=ir, note=note))

asset("A01", "Member portal", "Web app", "Digital", "VP Member Experience", "public", [("phi", 1_600_000)], 95_000, 48, 2,
      note="Plan comparison and enrollment run here during annual enrollment")
asset("A02", "Member mobile API", "API", "Digital", "VP Member Experience", "login", [("phi", 1_600_000)], 60_000, 24, 1)
asset("A03", "Provider portal", "Web app", "Provider Operations", "VP Provider Network", "login",
      [("pii", 14_000), ("phi", 400_000)], 40_000, 24, 2)
asset("A04", "Claims EDI gateway", "B2B gateway", "Claims IT", "VP Claims", "partner", [("phi", 1_600_000)], 70_000, 48, 4,
      note="Late claims trigger prompt-pay interest")
asset("A05", "Managed file transfer", "Appliance", "Infrastructure", "Director, Infrastructure", "public",
      [("phi", 900_000), ("pii", 14_000)], 25_000, 72, 3, note="Providers and pharmacy partners exchange claim files here")
asset("A06", "Remote access VPN", "Appliance", "Network", "Director, Network", "public",
      [("phi", 1_600_000), ("employee", 4_800)], 150_000, 72, 1, ir=1_500_000, note="A foothold here reaches the internal network")
asset("A07", "Email gateway", "Appliance", "Messaging", "Director, Workplace Tech", "public",
      [("employee", 4_800), ("phi", 120_000)], 15_000, 24, 1)
asset("A08", "Single sign-on portal", "Identity", "Identity", "Director, IAM", "public", [("employee", 4_800)], 80_000, 24, 1)
asset("A09", "Public website", "CMS", "Marketing", "VP Marketing", "public", [], 5_000, 24, 1, ir=250_000)
asset("A10", "Find a doctor", "Web app", "Digital", "VP Provider Network", "public", [], 8_000, 24, 1, ir=250_000)
asset("A11", "Premium payments", "Web app", "Payments", "Treasurer", "public", [("payment", 210_000)], 30_000, 24, 1)
asset("A12", "Broker portal", "Web app", "Sales", "VP Sales", "login", [("pii", 3_200), ("phi", 150_000)], 35_000, 24, 2)
asset("A13", "Telehealth scheduling", "Web app", "Clinical Apps", "VP Care Management", "login", [("phi", 85_000)], 12_000, 24, 1)
asset("A14", "Wellness rewards microsite", "CMS", "Marketing", "Unassigned", "public", [("contact", 11_000)], 0, 0, 1,
      in_cmdb=False, ir=250_000, note="2023 campaign site; found by the external attack surface scan, not in the CMDB")
asset("A15", "Developer API sandbox", "API", "Digital", "VP Member Experience", "public", [], 2_000, 24, 1, ir=250_000)
asset("A16", "Pharmacy benefits API", "API", "Pharmacy IT", "VP Pharmacy", "partner", [("phi", 600_000)], 45_000, 24, 2)
ASSET = {a["id"]: a for a in ASSETS}

def impact(a, d):
    """Cost if exploited on day d."""
    rec = sum(COST_PER_RECORD[x["class"]] * x["records"] for x in a["data"])
    return a["incident_response"] + rec + a["outage_hours_if_exploited"] * a["cost_per_hour_down"] * season_mult(d)

def impact_parts(a, d):
    rec = sum(COST_PER_RECORD[x["class"]] * x["records"] for x in a["data"])
    return {"incident_response": a["incident_response"], "records": rec,
            "downtime": a["outage_hours_if_exploited"] * a["cost_per_hour_down"] * season_mult(d)}

def window_cost(a, d):
    return round(a["window_hours"] * a["cost_per_hour_down"] * WINDOW_WEIGHT * season_mult(d))

# ------------------------------------------------------------------ findings
LAYER_TITLES = {
    "Web app": ["Web framework request smuggling", "Template injection", "Session fixation", "Server-side request forgery",
                "Deserialization flaw", "Path traversal", "Open redirect", "Outdated JavaScript library"],
    "API": ["API gateway auth bypass", "JSON parser denial of service", "Outdated HTTP client library", "Rate-limit bypass",
            "JWT validation flaw"],
    "B2B gateway": ["TLS library flaw", "Message parser overflow", "Outdated Java runtime"],
    "Appliance": ["Firmware command injection", "Management interface auth bypass", "Outdated OpenSSL", "Web UI cross-site scripting"],
    "Identity": ["SAML signature wrapping", "Outdated web server", "Login page cross-site scripting"],
    "CMS": ["CMS plugin SQL injection", "CMS core privilege escalation", "Outdated PHP runtime", "Plugin file upload flaw"],
}
COMPONENT = {"Web app": "Application", "API": "Application", "B2B gateway": "Server", "Appliance": "Appliance",
             "Identity": "Server", "CMS": "Application"}

FINDINGS = []
def finding(id, asset_id, title, component, severity, cvss, fix, poc=None, kev=None, patched=None, planned=None,
            status_note="", story=None, library=None):
    FINDINGS.append(dict(id=id, asset=asset_id, title=title, component=component, severity=severity, cvss=cvss,
                         fix_available=fix.isoformat(), poc_date=poc.isoformat() if poc else None,
                         kev_date=kev.isoformat() if kev else None,
                         patched=patched.isoformat() if patched else None,
                         planned=planned.isoformat() if planned else None,
                         status_note=status_note, story=story, library=library))

# --- story findings (open)
finding("F-0142", "A01", "Web framework remote code execution", "Application", "Critical", 9.8,
        D(2026, 10, 14), poc=D(2026, 10, 19), kev=D(2026, 10, 24), planned=D(2026, 12, 8),
        status_note="Change approved Oct 16, deferred by the enrollment freeze to the first window after it", story="headline")
finding("F-0118", "A05", "File transfer SQL injection", "Appliance", "Critical", 9.8,
        D(2026, 9, 8), poc=D(2026, 9, 11), kev=D(2026, 9, 15), planned=D(2026, 12, 10),
        status_note="Fix needs a vendor version upgrade; project slipped into the freeze", story="mft")
finding("F-0097", "A03", "XML parser external entity flaw", "Library", "High", 8.1,
        D(2026, 8, 17), poc=D(2026, 9, 2), planned=D(2026, 12, 15),
        status_note="Transitive dependency of the PDF export module; in the team backlog", story="library",
        library="xml-parser 2.4.1, pulled in by pdf-export 5.2")
finding("F-0031", "A14", "CMS plugin remote code execution", "Application", "Critical", 9.8,
        D(2026, 4, 1), poc=D(2026, 4, 9), kev=D(2026, 5, 2), planned=None,
        status_note="No owner; the site isn't in the CMDB", story="oldest")
finding("F-0151", "A06", "VPN web portal memory disclosure", "Appliance", "High", 7.5,
        D(2026, 10, 21), planned=D(2026, 12, 8), status_note="Waiting for the freeze to end")
finding("F-0149", "A11", "Payment page outdated JavaScript library", "Library", "Medium", 6.1,
        D(2026, 10, 6), planned=D(2026, 12, 10), library="charting-lib 3.1.0")

# --- story findings (closed, history) - stuck behind last year's freeze
finding("F-0004", "A06", "VPN gateway authentication bypass", "Appliance", "Critical", 9.8,
        D(2025, 10, 9), poc=D(2025, 10, 12), kev=D(2025, 10, 16), patched=D(2025, 12, 9),
        status_note="Deferred by the 2025 enrollment freeze", story="freeze2025")
finding("F-0006", "A01", "Member portal deserialization flaw", "Application", "Critical", 9.1,
        D(2025, 10, 20), poc=D(2025, 11, 3), patched=D(2025, 12, 11), status_note="Deferred by the 2025 enrollment freeze",
        story="freeze2025")
finding("F-0009", "A02", "API gateway auth bypass", "Application", "Critical", 9.4,
        D(2025, 10, 28), poc=D(2025, 11, 10), kev=D(2025, 11, 24), patched=D(2025, 12, 9),
        status_note="Deferred by the 2025 enrollment freeze", story="freeze2025")
finding("F-0011", "A05", "File transfer path traversal", "Appliance", "High", 8.6,
        D(2025, 11, 4), poc=D(2025, 11, 14), patched=D(2025, 12, 16), status_note="Deferred by the 2025 enrollment freeze",
        story=None)
finding("F-0013", "A07", "Email gateway command injection", "Appliance", "Critical", 9.6,
        D(2025, 10, 30), poc=D(2025, 11, 6), kev=D(2025, 11, 20), patched=D(2025, 12, 10),
        status_note="Deferred by the 2025 enrollment freeze", story="freeze2025")
finding("F-0015", "A12", "Broker portal session fixation", "Application", "High", 8.1,
        D(2025, 11, 6), poc=D(2025, 11, 25), patched=D(2025, 12, 17), status_note="Deferred by the 2025 enrollment freeze",
        story=None)

# --- background findings, seeded
rng = random.Random(505)
MEDIAN_DAYS = {"Critical": 34, "High": 58, "Medium": 84, "Low": 150}   # used to place background patch dates
SEV_CVSS = {"Critical": (9.0, 9.8), "High": (7.0, 8.9), "Medium": (4.0, 6.9), "Low": (2.0, 3.9)}
bg_assets = [a["id"] for a in ASSETS]
bg_weights = [5, 4, 4, 2, 2, 2, 2, 2, 4, 3, 3, 3, 2, 1, 2, 2]

def bg(n, start, end, open_):
    out = []
    span = (end - start).days
    for _ in range(n):
        aid = rng.choices(bg_assets, bg_weights)[0]
        a = ASSET[aid]
        sev = rng.choices(["Critical", "High", "Medium", "Low"], [8, 30, 45, 17])[0]
        lo, hi = SEV_CVSS[sev]
        cvss = round(rng.uniform(lo, hi), 1)
        fix = start + dt.timedelta(days=rng.randrange(span))
        r = rng.random()
        poc = kev = None
        # history may include exploited findings; open and projected background findings stay quieter
        if sev in ("Critical", "High") and r < (0.30 if not open_ else 0.10):
            poc = fix + dt.timedelta(days=rng.randrange(3, 30))
            if not open_ and r < 0.06:
                kev = poc + dt.timedelta(days=rng.randrange(3, 25))
        lib = rng.random() < 0.25 and a["layer"] in ("Web app", "API", "CMS")
        title = rng.choice(LAYER_TITLES[a["layer"]])
        comp = "Library" if lib else COMPONENT[a["layer"]]
        days = max(3, int(rng.gauss(MEDIAN_DAYS[sev], MEDIAN_DAYS[sev] * 0.35)))
        target = fix + dt.timedelta(days=days)
        out.append(dict(aid=aid, title=title, comp=comp, sev=sev, cvss=cvss, fix=fix, poc=poc, kev=kev, target=target, lib=lib))
    return out

counter = [200]
def nid():
    counter[0] += 1
    return f"F-{counter[0]:04d}"

for b in bg(150, HISTORY_START - dt.timedelta(days=60), TODAY - dt.timedelta(days=20), False):
    p = next_window(b["target"])
    if p >= TODAY:
        # still open: planned at its window; open background findings carry no KEV listing
        b["kev"] = None
        if b["poc"] and b["sev"] not in ("Critical", "High"): b["poc"] = None
        finding(nid(), b["aid"], b["title"], b["comp"], b["sev"], b["cvss"], b["fix"], b["poc"], b["kev"],
                planned=p, library="transitive dependency" if b["lib"] else None)
    elif p >= HISTORY_START:
        finding(nid(), b["aid"], b["title"], b["comp"], b["sev"], b["cvss"], b["fix"], b["poc"], b["kev"],
                patched=p, library="transitive dependency" if b["lib"] else None)
for b in bg(40, TODAY - dt.timedelta(days=40), TODAY - dt.timedelta(days=1), True):
    p = next_window(max(b["target"], TODAY))
    finding(nid(), b["aid"], b["title"], b["comp"], b["sev"], b["cvss"], b["fix"], b["poc"], b["kev"],
            planned=p, library="transitive dependency" if b["lib"] else None)

# --- projected new findings, next 90 days (deterministic, from last year's arrival rate)
NEW = []
for b in bg(36, TODAY + dt.timedelta(days=1), TODAY + dt.timedelta(days=HORIZON_DAYS - 5), True):
    NEW.append(dict(id=f"N-{len(NEW)+1:02d}", asset=b["aid"], title=b["title"], component=b["comp"], severity=b["sev"],
                    cvss=b["cvss"], fix_available=b["fix"].isoformat(),
                    poc_date=b["poc"].isoformat() if b["poc"] else None,
                    kev_date=b["kev"].isoformat() if b["kev"] else None, projected=True))

# ------------------------------------------------------------------ engine
def p(s):
    return D.fromisoformat(s) if s else None

def status_on(f, d):
    if f.get("kev_date") and d >= p(f["kev_date"]): return "kev"
    if f.get("poc_date") and d >= p(f["poc_date"]): return "poc"
    return "none"

def hazard(f, d, mit=None):
    a = ASSET[f["asset"]]
    exp = a["exposure"]
    m = 1.0
    if mit:
        kind, start = mit
        if d >= start:
            if kind == "allowlist": exp = "partner"
            elif kind == "waf": m = MITIGATION["waf"]
    return HAZARD[status_on(f, d)] * EXPOSURE[exp] * m

def due_date(f, policy):
    pol = POLICY[policy]
    fix = p(f["fix_available"])
    due = fix + dt.timedelta(days=pol[f["severity"]])
    if pol["kev"] is not None and f.get("kev_date"):
        due = min(due, max(fix, p(f["kev_date"])) + dt.timedelta(days=pol["kev"]))
    return due

def loss(f, a_, b_, mit=None, scale=1.0, by_day=None):
    """Expected loss accrued on days [a_, b_), with survival counted from the fix date."""
    fix = p(f["fix_available"])
    a = ASSET[f["asset"]]
    H = 0.0
    d = fix
    total = 0.0
    while d < b_:
        h = hazard(f, d, mit) * scale
        if d >= a_:
            e = impact(a, d) * math.exp(-H) * (1 - math.exp(-h))
            total += e
            if by_day is not None: by_day[d] += e
        H += h
        d += dt.timedelta(days=1)
    return total

def chance(f, end, start=None, mit=None):
    fix = p(f["fix_available"]); d = start or fix; H = 0.0
    while d < end:
        H += hazard(f, d, mit); d += dt.timedelta(days=1)
    return 1 - math.exp(-H)

def end_date(f):
    return p(f["patched"]) if f.get("patched") else None

def is_open(f):
    return not f.get("patched")

def daily_cost(f, d=TODAY, mit=None):
    a = ASSET[f["asset"]]
    fix = p(f["fix_available"])
    H = sum(hazard(f, fix + dt.timedelta(days=i), mit) for i in range((d - fix).days))
    h = hazard(f, d, mit)
    return impact(a, d) * math.exp(-H) * (1 - math.exp(-h))

# ------------------------------------------------------------------ views: Edge (today)
def edge_view():
    rows = []
    for a in ASSETS:
        fs = [f for f in FINDINGS if f["asset"] == a["id"] and is_open(f)]
        dc = sum(daily_cost(f) for f in fs)
        past_due = [f for f in fs if due_date(f, "current") < TODAY]
        rows.append(dict(asset=a["id"], open=len(fs), past_due=len(past_due), daily_cost=round(dc),
                         impact_if_exploited=round(impact(a, TODAY)),
                         oldest_days=max([(TODAY - p(f["fix_available"])).days for f in fs], default=0),
                         kev_open=sum(1 for f in fs if status_on(f, TODAY) == "kev")))
    return rows

# ------------------------------------------------------------------ views: Delay (history)
def history():
    month = defaultdict(float)
    closed = [f for f in FINDINGS if not is_open(f)]
    per = []
    for f in closed:
        due = due_date(f, "current"); end = end_date(f)
        bd = defaultdict(float)
        c = loss(f, due, end, by_day=bd) if end > due else 0.0
        for d, v in bd.items():
            if HISTORY_START <= d <= TODAY: month[d.strftime("%Y-%m")] += v
        per.append(dict(id=f["id"], days_to_patch=(end - p(f["fix_available"])).days,
                        days_late=max(0, (end - due).days), cost_of_delay=round(c), freeze=any(
                            in_freeze(due + dt.timedelta(days=i)) for i in range(max(0, (end - due).days)))))
    total = sum(month.values())
    by_sev = {}
    for sev in ["Critical", "High", "Medium", "Low"]:
        ds = sorted(x["days_to_patch"] for x, f in zip(per, closed) if f["severity"] == sev)
        if ds:
            by_sev[sev] = dict(count=len(ds), median_days=ds[len(ds) // 2], sla=POLICY["current"][sev],
                               on_time=sum(1 for x, f in zip(per, closed) if f["severity"] == sev and x["days_late"] == 0))
    accrued_open = 0.0
    for f in [f for f in FINDINGS if is_open(f)]:
        due = due_date(f, "current")
        if due < TODAY:
            bd = defaultdict(float)
            c = loss(f, due, TODAY, by_day=bd)
            accrued_open += c
            for d, v in bd.items():
                if HISTORY_START <= d <= TODAY: month[d.strftime("%Y-%m")] += v
    total = sum(month.values())
    story = [x for x in per if x["id"] in {f["id"] for f in FINDINGS if f.get("story") == "freeze2025"}]
    late = [x for x in per if x["days_late"] > 0]
    return dict(by_month={k: round(v) for k, v in sorted(month.items())}, total=round(total),
                accrued_open=round(accrued_open),
                closed=len(closed), late=len(late), by_severity=by_sev, per_finding=per,
                freeze_share=round(sum(x["cost_of_delay"] for x in story) / total, 3) if total else 0,
                freeze_cost=round(sum(x["cost_of_delay"] for x in story)))

# ------------------------------------------------------------------ views: Calculator
def calculator(fid, patch, mit=None, assume_kev=False):
    f = dict(next(x for x in FINDINGS if x["id"] == fid))
    if assume_kev: f["kev_date"] = TODAY.isoformat()
    a = ASSET[f["asset"]]
    wait = loss(f, TODAY, patch, mit)
    dc = daily_cost(f, TODAY, mit)
    wc = window_cost(a, TODAY) + CHANGE_LABOR
    return dict(finding=fid, patch=patch.isoformat(), days_waiting=(patch - TODAY).days,
                chance_by_patch=round(chance(f, patch, start=TODAY, mit=mit), 4),
                expected_loss_waiting=round(wait), daily_cost_today=round(dc),
                window_cost=wc, break_even_days=round(wc / dc, 2) if dc else None,
                impact_if_exploited=round(impact(a, TODAY)), impact_parts={k: round(v) for k, v in impact_parts(a, TODAY).items()})

# ------------------------------------------------------------------ views: Forecast
def plan_date(f, scenario):
    """When each open or projected finding gets patched under a scenario."""
    if scenario == "current":
        if f.get("projected"):
            fix = p(f["fix_available"])
            return next_window(fix + dt.timedelta(days=MEDIAN_DAYS[f["severity"]]))
        if f.get("planned"): return p(f["planned"])
        return TODAY + dt.timedelta(days=365)   # no owner, no plan
    # proposed: patch by the proposed due date; emergency lane works through the freeze for KEV and Critical
    due = due_date(f, "proposed")
    start = max(due, TODAY) if not f.get("projected") else due
    urgent = f["severity"] == "Critical" or bool(f.get("kev_date"))
    d = next_window(start, allow_freeze=urgent)
    cur = plan_date(f, "current")
    return min(d, cur)

def forecast(scale=1.0):
    end = TODAY + dt.timedelta(days=HORIZON_DAYS)
    open_f = [f for f in FINDINGS if is_open(f)] + NEW
    out = {}
    for sc in ["current", "proposed", "proposed_waf"]:
        base = "current" if sc == "current" else "proposed"
        total = 0.0; delay = 0.0; by_day = defaultdict(float); emergency = set(); waf_rules = 0
        for f in open_f:
            pd = plan_date(f, base)
            start = max(TODAY, p(f["fix_available"]))
            mit = None
            a = ASSET[f["asset"]]
            if (sc == "proposed_waf" and a["layer"] in ("Web app", "API", "CMS") and f["severity"] in ("Critical", "High")
                    and pd > start + dt.timedelta(days=1)):
                mit = ("waf", start + dt.timedelta(days=1)); waf_rules += 1
            stop = min(pd, end)
            if stop > start:
                total += loss(f, start, stop, mit, scale, by_day)
                due = due_date(f, "current")
                if stop > max(due, start): delay += loss(f, max(due, start), stop, mit, scale)
            if base == "proposed" and in_freeze(pd) and pd < end:
                emergency.add((f["asset"], pd))
        policy_cost = sum(window_cost(ASSET[aid], d) + CHANGE_LABOR for aid, d in emergency)
        policy_cost += waf_rules * WAF_RULE_COST
        cum = []; run = 0.0
        for i in range(HORIZON_DAYS):
            run += by_day[TODAY + dt.timedelta(days=i)]; cum.append(round(run))
        out[sc] = dict(expected_loss=round(total), past_sla=round(delay), emergency_changes=len(emergency), waf_rules=waf_rules,
                       policy_cost=round(policy_cost), cumulative=cum)
    return out

# ------------------------------------------------------------------ CVSS order vs cost order
def ordering(capacity_per_week=3, n=12, days=30):
    open_f = [f for f in FINDINGS if is_open(f)]
    pool = sorted(open_f, key=lambda f: -f["cvss"])[:n] + sorted(open_f, key=lambda f: -daily_cost(f))[:n]
    pool = list({f["id"]: f for f in pool}.values())
    end = TODAY + dt.timedelta(days=days)
    def run(order):
        total = 0.0
        for i, f in enumerate(order):
            pd = TODAY + dt.timedelta(days=7 * (i // capacity_per_week) + 1)
            total += loss(f, TODAY, min(pd, end))
        return total
    by_cvss = sorted(pool, key=lambda f: (-f["cvss"], f["id"]))
    by_cost = sorted(pool, key=lambda f: -daily_cost(f))
    return dict(pool=len(pool), capacity_per_week=capacity_per_week, days=days,
                cvss_order=round(run(by_cvss)), cost_order=round(run(by_cost)),
                first_week_cvss=[f["id"] for f in by_cvss[:capacity_per_week]],
                first_week_cost=[f["id"] for f in by_cost[:capacity_per_week]])

# ------------------------------------------------------------------ outputs
def main(outdir):
    hist = history()
    edge = edge_view()
    fc = forecast(); fc_low = forecast(0.5); fc_high = forecast(2.0)
    calc = {
        "F-0142_planned": calculator("F-0142", D(2026, 12, 8)),
        "F-0142_next_window": calculator("F-0142", next_window(TODAY + dt.timedelta(days=1), True)),
        "F-0142_waf": calculator("F-0142", D(2026, 12, 8), mit=("waf", TODAY + dt.timedelta(days=1))),
        "F-0118_planned": calculator("F-0118", D(2026, 12, 10)),
        "F-0118_allowlist": calculator("F-0118", D(2026, 12, 10), mit=("allowlist", TODAY + dt.timedelta(days=1))),
        "F-0097_planned": calculator("F-0097", D(2026, 12, 15)),
        "F-0031_daily": calculator("F-0031", TODAY + dt.timedelta(days=30)),
        "F-0151_planned": calculator("F-0151", D(2026, 12, 8)),
        "F-0151_assume_kev": calculator("F-0151", D(2026, 12, 8), assume_kev=True),
    }
    order = ordering()
    open_f = [f for f in FINDINGS if is_open(f)]
    summary = dict(
        open=len(open_f), closed=hist["closed"], assets=len(ASSETS),
        past_due=sum(1 for f in open_f if due_date(f, "current") < TODAY),
        kev_open=sum(1 for f in open_f if status_on(f, TODAY) == "kev"),
        daily_cost_today=round(sum(daily_cost(f) for f in open_f)),
        top2_share=round(sum(sorted((daily_cost(f) for f in open_f), reverse=True)[:2]) / sum(daily_cost(f) for f in open_f), 3),
        top3_share=round(sum(sorted((daily_cost(f) for f in open_f), reverse=True)[:3]) / sum(daily_cost(f) for f in open_f), 3),
        projected_new=len(NEW),
    )
    data = dict(as_of=TODAY.isoformat(), horizon_days=HORIZON_DAYS, history_start=HISTORY_START.isoformat(),
                company=COMPANY,
                model=dict(hazard=HAZARD, hazard_label=HAZARD_LABEL, exposure=EXPOSURE, exposure_label=EXPOSURE_LABEL,
                           waf_factor=MITIGATION["waf"], cost_per_record=COST_PER_RECORD, class_label=CLASS_LABEL,
                           window_weight=WINDOW_WEIGHT, change_labor=CHANGE_LABOR, waf_rule_cost=WAF_RULE_COST,
                           season=[dict(start=f"{a[0]:02d}-{a[1]:02d}", end=f"{b[0]:02d}-{b[1]:02d}", multiplier=m, label=l)
                                   for a, b, m, l in SEASON],
                           freezes=[dict(start=a.isoformat(), end=b.isoformat(), label="Annual enrollment change freeze")
                                    for a, b in FREEZES],
                           window_days=["Tue", "Thu"], window_time="02:00", policies=POLICY,
                           background_median_days=MEDIAN_DAYS),
                assets=ASSETS)
    findings = dict(findings=FINDINGS, projected=NEW)
    expected = dict(summary=summary, edge=edge, history={k: v for k, v in hist.items() if k != "per_finding"},
                    history_findings=hist["per_finding"], calculator=calc,
                    forecast=dict(base=fc, low={k: v["expected_loss"] for k, v in fc_low.items()},
                                  high={k: v["expected_loss"] for k, v in fc_high.items()}),
                    ordering=order,
                    open_findings=[dict(id=f["id"], due_current=due_date(f, "current").isoformat(),
                                        due_proposed=due_date(f, "proposed").isoformat(),
                                        daily_cost=round(daily_cost(f)), status=status_on(f, TODAY),
                                        planned_current=plan_date(f, "current").isoformat(),
                                        planned_proposed=plan_date(f, "proposed").isoformat()) for f in open_f])
    for name, obj in [("edge_inventory.json", data), ("findings.json", findings), ("expected_results.json", expected)]:
        with open(f"{outdir}/{name}", "w") as fh: json.dump(obj, fh, indent=1)
    return data, findings, expected

if __name__ == "__main__":
    _, _, e = main(sys.argv[1] if len(sys.argv) > 1 else "data")
    s = e["summary"]
    print("SUMMARY", s)
    print("HISTORY", e["history"]["total"], e["history"]["freeze_cost"], e["history"]["freeze_share"],
          e["history"]["late"], "/", e["history"]["closed"], e["history"]["by_severity"])
    print("MONTHS", e["history"]["by_month"])
    for k, v in e["calculator"].items(): print("CALC", k, {x: v[x] for x in v if x != "impact_parts"})
    for k, v in e["forecast"]["base"].items(): print("FC", k, {x: v[x] for x in v if x != "cumulative"})
    print("FC low/high", e["forecast"]["low"], e["forecast"]["high"])
    print("ORDER", e["ordering"])
    top = sorted(e["open_findings"], key=lambda x: -x["daily_cost"])[:8]
    for t in top: print("TOP", t)
    for r in sorted(e["edge"], key=lambda x: -x["daily_cost"]): print("EDGE", r)
