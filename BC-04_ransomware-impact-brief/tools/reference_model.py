"""BC-04 reference model: crown jewels, attack paths, recovery schedule, business impact.
Writes data/*.json and prints known answers. All data is fictional."""
import json, sys, copy, datetime as dt

# ------------------------------------------------------------------ company
COMPANY = {
    "description": "Fictional consumer products manufacturer: online store, 340 retail partners, 3 plants, 2 distribution centers",
    "annual_revenue": 1_900_000_000, "employees": 6400, "plant_workers": 2900,
    "customers": 2_400_000, "retail_partners": 340, "plants": 3, "distribution_centers": 2,
}

# ------------------------------------------------------------------ trust zones
ZONES = {
    "Z_user":   "Office workstations",
    "Z_corp":   "Corporate data center",
    "Z_ot":     "Plant networks",
    "Z_backup": "Backup platform",
    "Z_cloud":  "Cloud accounts",
    "Z_saas":   "Payroll provider",
    "Z_vault":  "Isolated formula vault",
}
# path: from, to, how, which control cuts it
PATHS = [
    ("P1", "Z_user", "Z_corp", "Domain admins sign in on office workstations", "C1"),
    ("P2", "Z_corp", "Z_ot", "Plants share the corporate domain and a flat network", "C2"),
    ("P3", "Z_ot", "Z_corp", "Plant remote-support tool stores domain credentials", "C2"),
    ("P4", "Z_corp", "Z_backup", "Backup console is joined to the corporate domain", "C3"),
    ("P5", "Z_corp", "Z_cloud", "Cloud admin roles granted to synced domain accounts", "C4"),
]

# ------------------------------------------------------------------ crown jewels
# backup: immutable (survives), standard (destroyed if its backup store is reached), vendor
# store: where standard backups live (Z_backup for on-prem, own zone for cloud snapshots)
CJ = []
def jewel(id, name, zone, hosting, owner, crit, data, restore_h, rebuild_h, backup, copy_age_h,
          offline_age_h=None, listed=True, note="", rto=None, rpo=None):
    CJ.append(dict(id=id, kind="enabler" if id == "AD" else "crown jewel", name=name, zone=zone, hosting=hosting, owner=owner, criticality=crit,
                   data=data, restore_h=restore_h, rebuild_h=rebuild_h, backup=backup,
                   copy_age_h=copy_age_h, offline_age_h=offline_age_h, listed=listed, note=note,
                   rto_h=rto, rpo_h=rpo))

D = lambda cls, n, unit, what: {"class": cls, "records": n, "unit": unit, "what": what}
jewel("AD", "Active Directory", "Z_corp", "Data center", "Identity team", 5, [],
      20, 40, "standard", 24, offline_age_h=None, note="Every on-premises restore waits for it", rto=8, rpo=24)
jewel("CJ01", "Online store", "Z_cloud", "Cloud", "VP Digital Commerce", 5,
      [D("customer", 2_400_000, "customers", "Names, addresses, order history")],
      10, 72, "immutable", 0.25, rto=4, rpo=0.25)
jewel("CJ02", "Customer data platform", "Z_cloud", "Cloud", "VP Marketing", 3,
      [D("customer", 2_400_000, "customers", "Profiles, loyalty, purchase history, email")],
      12, 96, "standard", 24, offline_age_h=168, note="Snapshots sit in the same cloud account", rto=24, rpo=24)
jewel("CJ03", "Payment token vault", "Z_cloud", "Cloud", "Treasurer", 5,
      [D("payment", 900_000, "stored cards", "Payment tokens and last four digits; no full card numbers")],
      6, 48, "immutable", 0.25, rto=4, rpo=0.25)
jewel("CJ04", "ERP", "Z_corp", "Data center", "CFO", 5,
      [D("financial", 4_200, "suppliers", "Supplier bank details, pricing, margins, orders")],
      30, 120, "immutable", 24, rto=24, rpo=24)
jewel("CJ05", "Financial close", "Z_corp", "Data center", "Controller", 4,
      [D("financial", 1, "quarter", "Unreleased Q3 results, due out Dec 8")],
      16, 60, "standard", 24, offline_age_h=168, rto=48, rpo=24)
jewel("CJ06", "Treasury and bank payments", "Z_corp", "Data center", "Treasurer", 5,
      [D("financial", 38, "bank accounts", "Bank accounts, payment files, signing keys")],
      12, 48, "immutable", 24, rto=24, rpo=24)
jewel("CJ07", "HR and payroll", "Z_saas", "SaaS", "CHRO", 5,
      [D("employee", 6_400, "employees", "Social Security numbers, bank details, salaries")],
      None, None, "vendor", 24, rto=24, rpo=24)
jewel("CJ08", "Product designs (PLM)", "Z_cloud", "Cloud", "VP Product", 4,
      [D("ip", 14_000, "design files", "Product designs, including the unreleased 2027 line")],
      20, 120, "immutable", 24, rto=72, rpo=24)
jewel("CJ09", "Formula library", "Z_corp", "File share", "VP R&D", 5,
      [D("ip", 2_300, "formulas", "Product formulas and lab data: the company's core trade secret")],
      8, None, "standard", 24, offline_age_h=984, listed=False,
      note="A folder on a general file share; not on the crown-jewel list", rto=72, rpo=24)
jewel("CJ10", "Plant systems (MES)", "Z_ot", "Plants", "VP Manufacturing", 5,
      [D("ip", 2_300, "formulas", "Production recipes copied from the formula library")],
      36, 96, "standard", 24, offline_age_h=168, rto=12, rpo=24)
jewel("CJ11", "Warehouse management", "Z_corp", "Data center", "VP Supply Chain", 5,
      [D("customer", 2_400_000, "customers", "Shipping addresses")],
      18, 72, "immutable", 24, rto=12, rpo=4)
jewel("CJ12", "Retail partner orders (EDI)", "Z_corp", "Data center", "VP Wholesale", 5,
      [D("financial", 340, "retail partners", "Partner orders, pricing, contracts")],
      8, 48, "immutable", 24, rto=8, rpo=4)
BY = {j["id"]: j for j in CJ}
ONPREM = {"Z_corp", "Z_ot"}

# ------------------------------------------------------------------ business services
SERVICES = [
    dict(id="S1", name="Online sales", deps=["CJ01", "CJ03"], revenue_per_hour=58_000, profile="online",
         loss_rate=0.70, avg_order=90, people="shoppers", kind="revenue",
         note="Shoppers who can't buy mostly go elsewhere"),
    dict(id="S2", name="Retail partner orders", deps=["CJ12", "CJ04"], revenue_per_hour=260_000, profile="wholesale",
         loss_rate=0.15, people="retail partners", kind="revenue",
         note="Partners mostly wait, but miss shelf dates and cancel some orders",
         workaround={"id": "WK1", "name": "Manual order desk", "capacity": 0.30, "after_h": 24}),
    dict(id="S3", name="Shipping", deps=["CJ11", "CJ04"], kind="flow", shipments_per_hour=1_400, profile="online",
         people="orders delayed"),
    dict(id="S4", name="Production", deps=["CJ10", "CJ04"], kind="cost", cost_per_hour=110_000, profile="plant",
         people="plant workers idle",
         workaround={"id": "WK2", "name": "Paper batch records", "capacity": 0.40, "after_h": 12}),
    dict(id="S5", name="Payroll and payments", deps=["CJ07", "CJ06", "CJ04"], kind="obligation"),
]
OBLIGATIONS = [
    dict(id="O1", name="Payroll file to bank", due="2026-11-23T16:00", deps=["CJ07", "CJ06"], people=6_400,
         unit="employees", note="Payday moved up to Wed Nov 25 for Thanksgiving; bank needs the file 2 days ahead"),
    dict(id="O2", name="Supplier payment run", due="2026-11-24T10:00", deps=["CJ04", "CJ06"], people=1_150,
         unit="suppliers", note="Weekly run every Tuesday"),
    dict(id="O3", name="Q3 earnings release", due="2026-12-08T08:00", deps=["CJ05"], people=None,
         unit=None, note="Public company; date already announced"),
]
SVC = {s["id"]: s for s in SERVICES}

# ------------------------------------------------------------------ calendar
HOLIDAYS = {dt.date(2026, 11, 26), dt.date(2026, 11, 27)}
def online_season(d):
    if dt.date(2026, 11, 26) <= d <= dt.date(2026, 11, 30): return 3.0, "Thanksgiving to Cyber Monday"
    if dt.date(2026, 11, 1) <= d <= dt.date(2026, 11, 25): return 1.3, "Holiday build"
    if dt.date(2026, 12, 1) <= d <= dt.date(2026, 12, 20): return 1.6, "Holiday peak"
    return 1.0, "Normal"
def weight(profile, t):
    if profile == "online":
        w = 1.0 if 7 <= t.hour < 23 else 0.35
        return w * online_season(t.date())[0]
    if profile == "wholesale":
        return 1.0 if (t.weekday() < 5 and 6 <= t.hour < 20 and t.date() not in HOLIDAYS) else 0.0
    if profile == "plant":
        return 1.0 if (t.weekday() < 5 and t.date() not in HOLIDAYS) else 0.0
    raise ValueError(profile)

# ------------------------------------------------------------------ controls
CONTROLS = {
    "C1": {"name": "Tiered admin accounts", "detail": "Domain admins never sign in on office workstations; privileged access vault"},
    "C2": {"name": "Segment the plants", "detail": "Plants get their own domain and firewall; remote support through a jump host"},
    "C3": {"name": "Isolated immutable backups", "detail": "Backup console off the domain; immutable copies for every crown jewel"},
    "C4": {"name": "Cloud-only admins", "detail": "Cloud admin roles only on cloud-native accounts with phishing-resistant MFA"},
    "C5": {"name": "Formula vault", "detail": "Move formulas into an isolated vault with download alerts and immutable copies"},
    "C6": {"name": "Recovery retainer", "detail": "Pre-contracted recovery firm: 5 recovery teams instead of 3"},
}
def apply_controls(ctrls):
    jewels = copy.deepcopy(BY); paths = [p for p in PATHS if p[4] not in ctrls]; teams = 3
    if "C3" in ctrls:
        for j in jewels.values():
            if j["backup"] == "standard": j["backup"] = "immutable"
    if "C5" in ctrls:
        jewels["CJ09"].update(zone="Z_vault", backup="immutable", listed=True)
    if "C6" in ctrls: teams = 5
    return jewels, paths, teams

# ------------------------------------------------------------------ scenarios
SCENARIOS = [
    dict(id="R1", name="Phished finance workstation", entry="Z_user", mode="encrypt", start="2026-11-20T02:00",
         setup="A finance analyst opens a fake invoice. Nine days later, files are encrypted at 2 a.m. Friday.",
         suggested=["C1", "C3", "C5"]),
    dict(id="R2", name="VPN appliance exploit", entry="Z_corp", mode="encrypt", start="2026-11-20T02:00",
         setup="An unpatched VPN appliance gives the attacker a foothold inside the data center.",
         suggested=["C3", "C4"]),
    dict(id="R3", name="Plant remote-support tool", entry="Z_ot", mode="encrypt", start="2026-11-20T02:00",
         setup="A support vendor's remote access tool at a plant is compromised.",
         suggested=["C2"]),
    dict(id="R4", name="Leaked cloud access key", entry="Z_cloud", mode="encrypt", start="2026-11-20T02:00",
         setup="A developer's cloud key leaks in a public code repository.",
         suggested=["C4"]),
    dict(id="R5", name="Payroll provider ransomware", entry="Z_saas", mode="vendor", vendor_outage_h=96,
         start="2026-11-20T02:00", setup="The payroll provider is hit. It expects 4 days to restore.",
         suggested=[]),
    dict(id="R6", name="Formula theft, no encryption", entry=None, mode="exfil", targets=["CJ09"],
         stopped_records=40, start="2026-11-20T02:00",
         setup="A contractor's account downloads the formula library. A ransom note follows; nothing is encrypted.",
         suggested=["C5"]),
]

DEFAULT_PRIORITY = ["CJ01", "CJ03", "CJ04", "CJ12", "CJ11", "CJ06", "CJ10", "CJ02", "CJ05", "CJ08", "CJ09"]
CONTAIN_H = 24     # containment and forensic clearance before any restore starts
TEAM_RATE = 2_500  # recovery cost per team-hour (fictional)
IR_FLAT = 750_000  # incident response retainer and forensics, if anything is encrypted (fictional)
NOTIFY = {"customer": 3, "employee": 40, "payment": 0, "financial": 0, "ip": 0}  # $ per individual notified (fictional)
ORDER_SHIP_SHARE = 1.0

# ------------------------------------------------------------------ engine
def reach(entry, paths):
    if entry is None: return set()
    seen, todo = {entry}, [entry]
    while todo:
        z = todo.pop()
        for _, a, b, *_ in paths:
            if a == z and b not in seen: seen.add(b); todo.append(b)
    return seen

def run(scn, ctrls=(), priority=None, workarounds=(), start=None):
    jewels, paths, teams = apply_controls(set(ctrls))
    priority = priority or DEFAULT_PRIORITY
    t0 = dt.datetime.fromisoformat(start or scn["start"])
    zones = reach(scn.get("entry"), paths)
    hit, exposed, jobs, log, stopped = {}, [], [], [], {}
    mode = scn["mode"]
    if mode == "exfil":
        exposed = [j for j in scn["targets"]]
        stopped = {j: scn["stopped_records"] for j in exposed if jewels[j]["zone"] == "Z_vault"}
    elif mode == "vendor":
        hit = {j["id"]: {"up": scn["vendor_outage_h"], "loss_h": jewels[j["id"]]["copy_age_h"], "path": "vendor"}
               for j in jewels.values() if j["zone"] in zones}
        exposed = list(hit)
    else:
        down = [j for j in jewels.values() if j["zone"] in zones]
        exposed = [j["id"] for j in down if j["data"]]
        destroyed = lambda j: j["backup"] == "standard" and (
            ("Z_backup" in zones) if j["zone"] in ONPREM else (j["zone"] in zones))
        # durations
        dur = {}
        for j in down:
            if destroyed(j):
                if j["rebuild_h"] is None:
                    dur[j["id"]] = (j["restore_h"], j["offline_age_h"], "offline copy")
                else:
                    dur[j["id"]] = (j["rebuild_h"], j["offline_age_h"], "rebuild")
            else:
                dur[j["id"]] = (j["restore_h"], j["copy_age_h"], "restore")
        lanes = [CONTAIN_H] * teams
        up = {}
        # AD first if down
        if "AD" in dur:
            i = lanes.index(min(lanes)); s = lanes[i]; lanes[i] = s + dur["AD"][0]; up["AD"] = lanes[i]
            jobs.append(dict(id="AD", lane=i, start=s, end=lanes[i], how=dur["AD"][2]))
        pending = [p for p in priority if p in dur]
        while pending:
            i = lanes.index(min(lanes)); free = lanes[i]
            def gate(p):
                return max(CONTAIN_H, up["AD"]) if (jewels[p]["zone"] in ONPREM and "AD" in up) else CONTAIN_H
            ready = [p for p in pending if gate(p) <= free]
            if ready: p = ready[0]; s = free
            else:
                p = min(pending, key=lambda q: (gate(q), pending.index(q))); s = gate(p)
            e = s + dur[p][0]; lanes[i] = e; up[p] = e; pending.remove(p)
            jobs.append(dict(id=p, lane=i, start=s, end=e, how=dur[p][2]))
        for p, (d, loss, how) in dur.items():
            hit[p] = {"up": up[p], "loss_h": loss, "path": how}
    jup = lambda jid: hit[jid]["up"] if jid in hit else 0

    # services
    svc = {}
    for s in SERVICES:
        down_h = max([jup(d) for d in s["deps"]] or [0])
        cause = max(s["deps"], key=jup) if down_h > 0 else None
        svc[s["id"]] = {"down_h": down_h, "cause": cause}

    def integrate(profile, start_h, end_h, f=lambda h: 1.0, step=0.25):
        tot, h = 0.0, start_h
        while h < end_h - 1e-9:
            dh = min(step, end_h - h); t = t0 + dt.timedelta(hours=h)
            tot += weight(profile, t) * dh * f(h); h += dh
        return tot

    res = {"zones": sorted(zones), "hit": hit, "jobs": jobs, "services": svc}
    # revenue at risk and lost
    rev_risk = rev_lost = 0.0
    per = {}
    for sid in ("S1", "S2"):
        s = SVC[sid]; dh = svc[sid]["down_h"]
        wk = s.get("workaround") if (s.get("workaround") and s["workaround"]["id"] in workarounds) else None
        f = (lambda h, wk=wk: (1 - wk["capacity"]) if (wk and h >= wk["after_h"]) else 1.0)
        risk = s["revenue_per_hour"] * integrate(s["profile"], 0, dh, f)
        per[sid] = {"at_risk": round(risk), "lost": round(risk * s["loss_rate"])}
        rev_risk += risk; rev_lost += risk * s["loss_rate"]
    # customers / people
    s1 = SVC["S1"]; dh1 = svc["S1"]["down_h"]
    shoppers = round(s1["revenue_per_hour"] * integrate("online", 0, dh1) / s1["avg_order"])
    s3h = svc["S3"]["down_h"]
    delayed = round(SVC["S3"]["shipments_per_hour"] * integrate("online", 0, s3h))
    partners = COMPANY["retail_partners"] if integrate("wholesale", 0, svc["S2"]["down_h"]) > 0 else 0
    s4 = SVC["S4"]; wk2 = s4["workaround"] if s4["workaround"]["id"] in workarounds else None
    plant_hours = integrate("plant", 0, svc["S4"]["down_h"],
                            lambda h: (1 - wk2["capacity"]) if (wk2 and h >= wk2["after_h"]) else 1.0)
    plant_cost = round(s4["cost_per_hour"] * plant_hours)
    workers = COMPANY["plant_workers"] if plant_hours > 0 else 0
    # obligations
    obl = []
    for o in OBLIGATIONS:
        due_h = (dt.datetime.fromisoformat(o["due"]) - t0).total_seconds() / 3600
        back = max(jup(d) for d in o["deps"])
        obl.append({"id": o["id"], "due_h": due_h, "back_h": back, "missed": back > due_h > 0})
    # data exposure: people counted once per class (same customers appear in several systems)
    by_class = {}
    for jid in exposed:
        for d in jewels[jid]["data"]:
            c = by_class.setdefault(d["class"], {"items": [], "systems": []})
            n = stopped.get(jid, d["records"])
            c["items"].append({"jewel": jid, "records": n, "unit": d["unit"]}); c["systems"].append(jid)
    for k, c in by_class.items():
        c["systems"] = sorted(set(c["systems"]))
        if k in ("customer", "employee"):
            c["records"] = max(i["records"] for i in c["items"])
        elif k == "ip":
            c["formulas"] = max([i["records"] for i in c["items"] if i["unit"] == "formulas"] or [0])
            c["design_files"] = sum(i["records"] for i in c["items"] if i["unit"] == "design files")
        elif k == "payment":
            c["records"] = sum(i["records"] for i in c["items"])
    customers_exposed = by_class.get("customer", {}).get("records", 0)
    employees_exposed = by_class.get("employee", {}).get("records", 0)
    notify = customers_exposed * NOTIFY["customer"] + employees_exposed * NOTIFY["employee"]
    team_hours = sum(j["end"] - j["start"] for j in jobs)
    recovery = (IR_FLAT if (hit and mode == "encrypt") or mode == "exfil" else 0) + team_hours * TEAM_RATE
    lost_data = {jid: h["loss_h"] for jid, h in hit.items()}
    res.update(
        hours_down=max([v["down_h"] for v in svc.values()] or [0]),
        jewels_down=len([k for k in hit if k != "AD"]),
        revenue_at_risk=round(rev_risk), revenue_lost=round(rev_lost), per_service=per,
        shoppers_turned_away=shoppers, orders_delayed=delayed, partners_affected=partners,
        plant_workers_idle=workers, plant_cost=plant_cost,
        obligations=obl, exposed=sorted(exposed), exposure=by_class,
        customers_exposed=customers_exposed, employees_exposed=employees_exposed,
        notification_cost=notify, recovery_cost=round(recovery), team_hours=team_hours,
        total_impact=round(rev_lost + plant_cost + notify + recovery), data_lost_h=lost_data,
    )
    return res

FED_HOLIDAYS = {dt.date(2026, 11, 26), dt.date(2026, 12, 25)}
def business_days_after(t, n):
    d = t.date()
    while n:
        d += dt.timedelta(days=1)
        if d.weekday() < 5 and d not in FED_HOLIDAYS: n -= 1
    return d
def clocks(start, materiality_h=48):
    t0 = dt.datetime.fromisoformat(start)
    m = t0 + dt.timedelta(hours=materiality_h)
    return {"materiality": m.isoformat(), "sec_8k_due": business_days_after(m, 4).isoformat(),
            "state_notice_due": (t0 + dt.timedelta(days=30)).date().isoformat()}

def money(x):
    return f"${x/1e6:,.1f}M" if x >= 1e6 else f"${x:,.0f}"

def show(tag, r):
    sv = r["services"]
    print(f"{tag}: zones {r['zones']}  jewels down {r['jewels_down']}  hours down {r['hours_down']:g}")
    print("   services:", ", ".join(f"{k} {v['down_h']:g}h({v['cause']})" for k, v in sv.items() if v["down_h"]))
    print(f"   revenue at risk {money(r['revenue_at_risk'])} lost {money(r['revenue_lost'])} {r['per_service']}")
    print(f"   shoppers {r['shoppers_turned_away']:,} delayed {r['orders_delayed']:,} partners {r['partners_affected']} workers {r['plant_workers_idle']} plant {money(r['plant_cost'])}")
    print(f"   exposed {r['exposed']} cust {r['customers_exposed']:,} emp {r['employees_exposed']:,} {json.dumps({k:{kk:vv for kk,vv in v.items() if kk!='systems'} for k,v in r['exposure'].items()})}")
    print(f"   notify {money(r['notification_cost'])} recovery {money(r['recovery_cost'])} ({r['team_hours']:g} team-h) TOTAL {money(r['total_impact'])}")
    print("   obligations:", [(o['id'], round(o['due_h']), o['back_h'], 'MISSED' if o['missed'] else 'ok') for o in r['obligations']])
    print("   data lost h:", {k: v for k, v in r["data_lost_h"].items() if v})
    print("   jobs:", [(j['id'], j['lane'], j['start'], j['end'], j['how']) for j in r['jobs']])

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else None
    expected = {}
    for s in SCENARIOS:
        r = run(s); show(s["id"] + " " + s["name"], r); expected[s["id"]] = {"baseline": r}
        for c in s["suggested"]:
            rc = run(s, [c]); show(f"   + {c}", rc)
        if s["suggested"]:
            ra = run(s, s["suggested"]); show(f"   + all {s['suggested']}", ra); expected[s["id"]]["with_suggested"] = ra
        print()
    r1 = SCENARIOS[0]
    show("R1 on Oct 28", run(r1, start="2026-10-28T02:00"))
    show("R1 workarounds", run(r1, workarounds=["WK1", "WK2"]))
    show("R1 C6", run(r1, ["C6"]))
    show("R1 all controls", run(r1, list(CONTROLS)))
    pri = ["CJ04", "CJ12", "CJ11", "CJ06", "CJ10", "CJ01", "CJ03", "CJ02", "CJ05", "CJ08", "CJ09"]
    show("R1 wholesale-first priority", run(r1, priority=pri))
    show("R1 CDP last", run(r1, priority=["CJ01", "CJ03", "CJ04", "CJ12", "CJ11", "CJ06", "CJ10", "CJ05", "CJ08", "CJ09", "CJ02"]))
    show("R1 Nov 25", run(r1, start="2026-11-25T02:00"))
    show("R1 C2+C5", run(r1, ["C2", "C5"]))
    show("R1 C3+C6", run(r1, ["C3", "C6"]))
    show("R1 treasury after ERP", run(r1, priority=["CJ01","CJ03","CJ04","CJ06","CJ12","CJ11","CJ10","CJ02","CJ05","CJ08","CJ09"]))
    print("clocks", clocks(r1["start"]))
    for s_ in SCENARIOS:
        r = run(s_); print(s_["id"], "exposure", json.dumps(r["exposure"]))
    if out:
        json.dump({"meta": {"note": "All data is fictional.", "units": "hours, US dollars",
                            "contain_h": CONTAIN_H, "recovery_teams": 3, "team_rate": TEAM_RATE,
                            "ir_flat": IR_FLAT, "notify_per_person": NOTIFY},
                   "company": COMPANY, "zones": ZONES,
                   "paths": [dict(id=a, source=b, target=c, how=d, cut_by=e) for a, b, c, d, e in PATHS],
                   "jewels": CJ, "services": SERVICES, "obligations": OBLIGATIONS,
                   "controls": [dict(id=k, **v) for k, v in CONTROLS.items()],
                   "default_priority": DEFAULT_PRIORITY,
                   "calendar": {"holidays": ["2026-11-26", "2026-11-27"],
                                "online_multipliers": [["2026-11-01", "2026-11-25", 1.3, "Holiday build"],
                                                       ["2026-11-26", "2026-11-30", 3.0, "Thanksgiving to Cyber Monday"],
                                                       ["2026-12-01", "2026-12-20", 1.6, "Holiday peak"]]}},
                  open(f"{out}/crown_jewels.json", "w"), indent=1)
        json.dump(SCENARIOS, open(f"{out}/scenarios.json", "w"), indent=1)
        expected["_clocks_R1"] = clocks(SCENARIOS[0]["start"])
        expected["_priority_swap_R1"] = run(SCENARIOS[0], priority=["CJ01","CJ03","CJ04","CJ06","CJ12","CJ11","CJ10","CJ02","CJ05","CJ08","CJ09"])
        for c in CONTROLS:
            expected.setdefault("_controls_R1", {})[c] = {k: v for k, v in run(SCENARIOS[0], [c]).items() if k in ("hours_down","revenue_at_risk","total_impact","customers_exposed","jewels_down")}
        json.dump(expected, open(f"{out}/expected_results.json", "w"), indent=1, default=str)
