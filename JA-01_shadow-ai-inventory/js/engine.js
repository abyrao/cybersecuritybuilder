/* JA-01 · seeded event generator, blacklist rules engine, correlation, and scoring.
   Pure (no browser APIs): runs under Node for tests; swap generate() for real tool exports later. */
(function (root) {
  const D = root.JD, DAY = 864e5;
  const iso = ms => new Date(ms).toISOString().slice(0, 10);
  const T0 = Date.parse(D.START + "T12:00:00Z");
  const DAYS = Array.from({ length: 30 }, (_, i) => iso(T0 + i * DAY));
  const addDays = (d, n) => iso(Date.parse(d + "T12:00:00Z") + n * DAY);
  const dow = d => new Date(d + "T12:00:00Z").getUTCDay();
  const weekday = d => dow(d) > 0 && dow(d) < 6;
  const APP = Object.fromEntries(D.APPS.map(a => [a.id, a]));
  const SEV_W = { Critical: 50, High: 35, Medium: 20, Low: 8 };
  const TIER_M = { none: 1.0, internal: 1.2, customer: 1.6, financial: 1.6, payroll: 2.0, production: 2.0, privileged: 2.0 };
  const CORR = n => n >= 3 ? 1.0 : n === 2 ? 0.85 : 0.6;
  const BAND = s => s >= 75 ? "Critical" : s >= 50 ? "High" : s >= 25 ? "Medium" : "Low";
  const SENSITIVE = ["financial-statement", "payroll", "customer-pii", "source-code", "contract"];
  const FIRST = ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Quinn", "Drew", "Reese", "Rowan", "Skyler", "Emerson", "Hayden", "Parker", "Dakota", "Finley", "Sage", "Kai", "Noor", "Ravi", "Mei", "Lena", "Omar", "Ines", "Tomas", "Aisha", "Kenji"];
  const LAST = ["Nguyen", "Patel", "Garcia", "Kim", "Okafor", "Silva", "Novak", "Haddad", "Larsen", "Moreno", "Chen", "Bauer", "Rossi", "Mensah", "Ito", "Kowalski", "Duarte", "Fischer", "Abbott", "Reyes", "Sato", "Lindgren", "Osei", "Varga"];

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // Which rules are in force on a date (blacklist versions)
  function activeRules(d) {
    const base = ["BL-01", "BL-02", "BL-03", "BL-04", "BL-05", "BL-06", "BL-07", "BL-08", "BL-09"];
    if (d >= "2026-10-14") return base.concat(["BL-10", "BL-12", "BL-11"]);
    if (d >= "2026-08-26") return base.concat(["BL-10", "BL-12", "R-IMG"]);
    return base;
  }
  const use = e => ["visit", "upload", "session"].includes(e.action);
  const charge = e => e.action === "charge";
  // Rule match logic: the committee's decisions as code
  const MATCH = {
    "BL-01": (e, a) => a.cat === "file" && a.status === "blacklisted" && use(e),
    "BL-02": (e, a) => a.status === "sanctioned" && e.detail.tenant === "personal",
    "BL-03": (e, a) => e.source === "purview" && a.status !== "sanctioned" && SENSITIVE.includes(e.detail.cls),
    "BL-04": (e, a) => a.perms === "all-sites" && (e.action === "extension" || e.action === "installed"),
    "BL-05": (e, a, p) => a.cat === "endpoint" && p.tier === "production" && (e.action === "process" || e.action === "installed"),
    "BL-06": (e, a) => a.cat === "notetaker" && a.status !== "sanctioned" && ((e.action === "meeting" && e.detail.external) || (e.action === "oauth" && /calendar/.test(e.detail.scope))),
    "BL-07": (e, a) => e.action === "oauth" && /mail|drive|files/i.test(e.detail.scope) && a.status !== "sanctioned",
    "BL-08": (e, a, p, ctx) => charge(e) && a.status !== "sanctioned" && a.cat !== "api" && !ctx.procured.has(a.id),
    "BL-09": (e, a) => a.noOptOut && use(e),
    "BL-10": (e, a) => a.cat === "code" && a.status !== "sanctioned" && !!e.detail.regulated,
    "BL-11": (e, a) => e.action === "token" && e.detail.scope === "write" && a.cat === "agent",
    "BL-12": (e, a) => a.cat === "api" && charge(e),
    "R-IMG": (e, a) => a.cat === "image" && use(e)
  };

  function generate() {
    const r = rng(20261026), people = {}, events = [];
    let pid = 10000, hid = 3000, eid = 0;
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const tierOf = dept => ({ FIN: "financial", HR: "payroll", SAL: "customer", SUP: "customer", LEG: "customer", EXE: "financial", ENG: "internal", MKT: "internal", OPS: "internal" })[dept];
    function person(dept, extra) {
      const id = "E-" + (pid++), p = Object.assign({ id, dept, tier: tierOf(dept), admin: false, exec: dept === "EXE", name: pick(FIRST) + " " + pick(LAST), host: "LT-" + (hid++), online: true, role: "Staff" }, extra || {});
      people[id] = p; return p;
    }
    const cohort = (n, depts, extra) => Array.from({ length: n }, (_, i) => person(Array.isArray(depts) ? depts[i % depts.length] : depts, typeof extra === "function" ? extra(i) : extra));
    const ev = (date, source, p, app, action, detail) => { events.push({ id: "EV-" + String(++eid).padStart(6, "0"), date, source, personId: p.id, hostId: p.host, appId: app, action, detail: detail || {} }); };
    const mondays = DAYS.filter(d => dow(d) === 1);

    // 1. SheetSage: Finance quarter-end close, seen only by expense + browser + DLP
    const ss = cohort(3, "FIN", i => ({ role: "Financial analyst", tier: i === 1 ? "payroll" : "financial" }));
    const close = DAYS.filter(d => d >= D.CLOSE[0] && d <= D.CLOSE[1]);
    const uploads = [[14, 13, 12, 13, 14, 13, 12, 15], [13, 14, 13, 12, 13, 14, 13, 14], [13, 13, 14, 14, 12, 13, 14, 13]]; // 318 total
    ss.forEach((p, i) => {
      ev("2026-10-02", "concur", p, "sheetsage", "charge", { amount: 24, merchant: "SheetSage AI" });
      close.forEach((d, k) => { ev(d, "chrome", p, "sheetsage", "visit", {}); for (let u = 0; u < uploads[i][k]; u++) ev(d, "purview", p, "sheetsage", "upload", { cls: u % 3 === 0 ? "payroll" : "financial-statement" }); });
      DAYS.filter(d => d > D.CLOSE[1] && weekday(d)).forEach(d => { if (r() < .35) ev(d, "chrome", p, "sheetsage", "visit", {}); });
    });

    // 2. TabGenie: 87 hosts with an all-sites extension, 6 IT admins; weekly inventory on Mondays
    const tgDepts = [].concat(Array(30).fill("SAL"), Array(15).fill("MKT"), Array(14).fill("SUP"), Array(8).fill("FIN"), Array(4).fill("HR"), Array(10).fill("ENG"));
    const tg = cohort(6, "OPS", { role: "IT administrator", admin: true, tier: "privileged" }).concat(tgDepts.map(d => person(d)));
    tg[20].host = "LT-4471"; tg[20].online = false; tg[20].lastSeen = "2026-10-23"; // a Sales laptop, offline
    tg.forEach(p => {
      const inst = DAYS[Math.floor(r() * 20)];
      ev(inst, "chrome", p, "tabgenie", "extension", { perms: "Read and change all your data on all websites" });
      mondays.filter(d => d > inst).forEach(d => { ev(d, "chrome", p, "tabgenie", "extension", { perms: "Read and change all your data on all websites", inventory: true }); ev(d, "falcon", p, "tabgenie", "installed", { path: "Chrome extension store" }); });
    });

    // 3. ModelBox: local model runner on 4 Engineering laptops with production access
    const mb = cohort(4, "ENG", { role: "Software engineer", tier: "production" });
    mb.forEach((p, i) => DAYS.forEach((d, k) => { if (k >= 3 + i && (k - i) % 3 === 0) { ev(d, "falcon", p, "modelbox", "process", { proc: "modelbox serve", gpu: true }); ev(d, "umbrella", p, "modelbox", "dns", { q: "models.modelbox.example" }); } }));

    // 4. NoteHawk: 19 Sales users granted calendar access; it joined 212 external calls
    const nh = cohort(19, "SAL", { role: "Account executive" });
    const consent = nh.map((p, i) => { const d = DAYS[i % 12]; ev(d, "entra", p, "notehawk", "oauth", { scope: "Calendars.Read, OnlineMeetings.Read" }); return d; });
    let joins = 0; const target = 212;
    while (joins < target) { const i = Math.floor(r() * nh.length), d = DAYS[Math.floor(r() * 30)]; if (d > consent[i] && weekday(d)) { ev(d, "zscaler", nh[i], "notehawk", "meeting", { external: true }); joins++; } }

    // 5. Personal accounts on a sanctioned tool: 163 people; notices on Oct 19 cut usage
    const pa = cohort(163, ["SAL", "MKT", "SUP", "ENG", "OPS", "FIN", "HR"]);
    pa.forEach(p => DAYS.forEach(d => {
      let rate = weekday(d) ? .32 : .06;
      if (d >= "2026-10-19") rate *= Math.max(.28, 1 - .2 * (Date.parse(d) - Date.parse("2026-10-19")) / DAY);
      if (r() < rate) { ev(d, "zscaler", p, "chatgpt", "session", { tenant: "personal" }); ev(d, "chrome", p, "chatgpt", "visit", { account: "personal" }); }
    }));
    // Sanctioned enterprise use (should never signal)
    const ent = cohort(240, ["SAL", "MKT", "SUP", "ENG", "OPS", "FIN", "HR", "LEG", "EXE"]);
    ent.forEach(p => DAYS.forEach(d => { if (weekday(d) && r() < .5) ev(d, "okta", p, pick(["chatgpt", "claude", "copilot", "gemini"]), "signin", { tenant: "enterprise" }); }));

    // 6. Spend outside procurement: 46 people, $920 a month ($11,040 a year) incl. the 3 SheetSage analysts
    const unrev = D.APPS.filter(a => a.status === "unreviewed");
    const sp = cohort(43, ["SAL", "MKT", "OPS", "SUP", "HR", "ENG"]);
    sp.forEach((p, i) => { const a = i < 40 ? unrev[i % unrev.length].id : "promptpal"; const amt = i < 40 ? 20 : 16;
      ev(DAYS[2 + (i % 26)], i % 2 ? "amex" : "concur", p, a, "charge", { amount: amt, merchant: D.APPS.find(x => x.id === a).name });
      ev(DAYS[3 + (i % 26)], "chrome", p, a, "visit", {}); });
    // Procured (no BL-08): Coupa invoices
    const legal = cohort(8, "LEG", { role: "Counsel" });
    ev("2026-09-28", "coupa", legal[0], "clausebot", "invoice", { amount: 4800, po: "PO-88213" });
    ev("2026-10-05", "coupa", legal[1], "transly", "invoice", { amount: 2100, po: "PO-88340" });

    // 7. ClauseBot: Legal pilot under EX-12 (DLP sees contracts; suppressed by exception)
    legal.forEach(p => DAYS.forEach(d => { if (weekday(d) && r() < .55) { ev(d, "chrome", p, "clausebot", "visit", {}); if (r() < .4) ev(d, "purview", p, "clausebot", "upload", { cls: "contract" }); } }));

    // 8. ImageForge: Marketing pilot under EX-09 (expired Oct 25)
    const imf = cohort(6, "MKT", { role: "Designer" });
    imf.forEach((p, i) => DAYS.forEach(d => { if ((weekday(d) && r() < .5) || (d === D.TODAY && i < 4)) ev(d, "chrome", p, "imageforge", "visit", {}); }));

    // 9. PixelPup: image app once covered by the retired rule
    cohort(10, ["MKT", "SAL", "SUP"]).forEach(p => DAYS.forEach(d => { if (weekday(d) && r() < .25) ev(d, "chrome", p, "pixelpup", "visit", {}); }));

    // 10. Background blacklisted use
    cohort(40, ["SAL", "SUP", "OPS", "FIN", "HR", "LEG"]).forEach(p => DAYS.forEach(d => { if (weekday(d) && r() < .14) { const a = pick(["pdfwhiz", "docudigest", "summarix"]); ev(d, "chrome", p, a, "visit", {}); ev(d, "zscaler", p, a, "upload", { kb: 200 + Math.floor(r() * 4000) }); } }));
    cohort(35, ["MKT", "SAL", "SUP", "OPS", "ENG"]).forEach(p => DAYS.forEach(d => { if (weekday(d) && r() < .18) { const a = pick(["promptpal", "chatterbox"]); ev(d, "chrome", p, a, "visit", {}); if (r() < .5) ev(d, "umbrella", p, a, "dns", {}); } }));
    cohort(9, "ENG", { role: "Software engineer" }).forEach(p => DAYS.forEach(d => { if (weekday(d) && r() < .4) ev(d, "falcon", p, "codewhisp", "process", { repo: "payments-core", regulated: true }); }));
    cohort(3, ["OPS", "SAL", "OPS"], { role: "Operations analyst" }).forEach((p, i) => { ev(i === 0 ? "2026-10-06" : DAYS[19 + i * 3], "entra", p, "agentforge", "token", { scope: "write", target: "CRM" }); ev(DAYS[24 + i], "entra", p, "agentforge", "token", { scope: "write", target: "Ticketing" }); });
    cohort(14, ["SAL", "EXE", "FIN", "HR"]).forEach((p, i) => ev(DAYS[(i * 2) % 30], "entra", p, "mailmind", "oauth", { scope: "Mail.Read, Files.Read.All" }));
    cohort(7, "ENG").forEach((p, i) => ev(DAYS[4 + i * 3], "amex", p, "modelapi", "charge", { amount: 50 + i * 25, merchant: "Model API credits" }));
    cohort(4, "SUP").forEach((p, i) => { ev(DAYS[8 + i], "entra", p, "transcribo", "oauth", { scope: "Calendars.Read" }); ev(DAYS[15 + i * 2], "zscaler", p, "transcribo", "meeting", { external: true }); });
    // DLP: customer data into unreviewed apps
    cohort(6, ["SUP", "SAL"]).forEach((p, i) => { const a = unrev[i * 5].id; ev(DAYS[10 + i * 3], "purview", p, a, "upload", { cls: "customer-pii" }); ev(DAYS[10 + i * 3], "chrome", p, a, "visit", {}); });

    // 11. Unreviewed app browsing (no rule; feeds the inventory)
    cohort(320, ["SAL", "MKT", "SUP", "ENG", "OPS", "FIN", "HR", "LEG"]).forEach(p => { const a = pick(unrev).id; DAYS.forEach(d => { if (weekday(d) && r() < .12) ev(d, r() < .7 ? "chrome" : "umbrella", p, a, r() < .7 ? "visit" : "dns", {}); }); });

    return { people, events };
  }

  // Evaluate the blacklist over events → daily activities → signals
  function evaluate(data, opts) {
    const o = opts || {}, people = data.people, events = data.events;
    const ctx = { procured: new Set(events.filter(e => e.source === "coupa").map(e => e.appId)) };
    const byPA = {}; events.forEach(e => { (byPA[e.personId + "|" + e.appId] = byPA[e.personId + "|" + e.appId] || []).push(e); });
    const act = {}, suppressed = {};
    events.forEach(e => {
      const a = APP[e.appId], p = people[e.personId]; if (!a || !p) return;
      const rules = o.rulesOn ? o.rulesOn(e.date) : activeRules(e.date);
      rules.forEach(rid => {
        if (!MATCH[rid](e, a, p, ctx)) return;
        const key = e.date + "|" + e.personId + "|" + e.appId + "|" + rid;
        const ex = D.EXCEPTIONS.find(x => x.app === e.appId && x.dept === p.dept && e.date <= x.until);
        const bucket = ex ? suppressed : act;
        const k = bucket[key] || (bucket[key] = { date: e.date, personId: e.personId, appId: e.appId, ruleId: rid, eventIds: [], exception: ex ? ex.id : null });
        k.eventIds.push(e.id);
      });
    });
    const activities = Object.values(act).map(x => {
      const p = people[x.personId], rule = D.RULES[x.ruleId], lo = addDays(x.date, -29);
      const win = (byPA[x.personId + "|" + x.appId] || []).filter(e => e.date >= lo && e.date <= x.date);
      const sources = [...new Set(win.map(e => e.source))];
      const cal = p.dept === "FIN" && x.date >= D.CLOSE[0] && x.date <= D.CLOSE[1] ? 1.25 : 1.0;
      const factors = [{ k: "Severity", v: SEV_W[rule.sev], t: rule.sev + " rule (" + x.ruleId + ")" }, { k: "Data access", v: TIER_M[p.tier], t: "Can reach " + p.tier + " data" },
        { k: "Corroboration", v: CORR(sources.length), t: sources.length + " source" + (sources.length === 1 ? "" : "s") + " in the last 30 days" }, { k: "Calendar", v: cal, t: cal > 1 ? "Finance during Q3 close" : "Normal period" }];
      const risk = Math.min(100, Math.round(factors.reduce((m, f) => m * f.v, 1)));
      return Object.assign(x, { dept: p.dept, sources, factors, risk, band: BAND(risk) });
    });
    // Signals: one per person + app + rule
    const sig = {};
    activities.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(x => {
      const k = x.personId + "|" + x.appId + "|" + x.ruleId;
      const s = sig[k] || (sig[k] = { id: "SG-" + String(Object.keys(sig).length + 1).padStart(4, "0"), personId: x.personId, appId: x.appId, ruleId: x.ruleId, dept: x.dept, first: x.date, last: x.date, days: [], eventIds: [], sources: [], risk: 0 });
      s.last = x.date; s.days.push(x.date); s.eventIds = s.eventIds.concat(x.eventIds); s.sources = [...new Set(s.sources.concat(x.sources))];
      if (x.risk >= s.risk) { s.risk = x.risk; s.factors = x.factors; } s.band = BAND(s.risk);
    });
    return { activities, suppressed: Object.values(suppressed), signals: Object.values(sig), ctx };
  }

  root.E = { DAYS, addDays, weekday, dow, generate, evaluate, activeRules, MATCH, APP, SEV_W, TIER_M, CORR, BAND, SENSITIVE };
})(typeof window !== "undefined" ? window : globalThis);
