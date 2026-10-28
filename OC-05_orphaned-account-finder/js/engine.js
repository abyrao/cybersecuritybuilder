// OC-05 · Matching, classification and scoring. Pure functions; runs in the browser and under Node.
(function (root) {
  "use strict";
  const DAY = 864e5;
  const D = (s) => new Date(s + "T00:00:00Z");
  const days = (a, b) => Math.round((D(b) - D(a)) / DAY);
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, "").trim();

  const REACH = {
    forecast: { pts: 25, label: "Financial forecast" }, payments: { pts: 25, label: "Vendor payments" }, domain: { pts: 25, label: "Directory admin" },
    prod: { pts: 25, label: "Production cloud" }, gl: { pts: 20, label: "General ledger" }, customer: { pts: 20, label: "Customer records" },
    employee: { pts: 20, label: "Employee data" }, source: { pts: 15, label: "Source code" }, email: { pts: 8, label: "Email and files" }, tickets: { pts: 5, label: "Tickets" },
  };
  const PRIV = [{ pts: 0, label: "Standard user" }, { pts: 13, label: "Elevated role" }, { pts: 27, label: "Admin or write to a financial system" }, { pts: 40, label: "Domain or financial admin" }];
  const ROOT = { lark: "feed", fin: "sso", crm: "local", code: "local", cloud: "local", corp: "manual", entra: "manual", okta: "manual", tick: "manual", plan: "manual" };
  const ROOT_LABEL = { feed: "Not on HR feed", sso: "Not behind SSO", local: "Login outside SSO", manual: "Missed manual step" };
  const MATCH_THRESHOLD = 85;

  function index(data) {
    const byId = {}, byEmail = {}, byName = {}, successor = {};
    for (const r of data.hr) {
      byId[r.id] = r;
      if (r.email) (byEmail[r.email] = byEmail[r.email] || []).push(r);
      (byName[norm(r.name)] = byName[norm(r.name)] || []).push(r);
      if (r.priorId) successor[r.priorId] = r;
    }
    const sys = {}; for (const s of data.systems) sys[s.id] = s;
    return { byId, byEmail, byName, successor, sys };
  }

  // Simulated AI: picks among same-name HR records using group and department hints.
  function aiNameMatch(acct, cands) {
    const hint = acct.deptHint || null;
    const scored = cands.map((r) => ({ r, s: (hint && r.dept === hint ? 0.62 : 0.2) + (r.status === "Terminated" ? 0.0 : 0) }));
    scored.sort((a, b) => b.s - a.s);
    const best = scored[0];
    return { rec: best.r, conf: Math.round(best.s * 100), why: hint ? `Groups point to ${deptName(best.r.dept)}; ${cands.length} people share the name` : `${cands.length} people share the name` };
  }
  let DEPTS = {};
  const deptName = (id) => (DEPTS[id] ? DEPTS[id].name : id);

  function match(acct, ix) {
    if (acct.kind === "service") {
      const r = ix.byId[acct.owner];
      return r ? { rec: r, method: "Owner attribute", conf: 100 } : { rec: null, method: "No owner", conf: 0 };
    }
    if (acct.empId && ix.byId[acct.empId]) return follow({ rec: ix.byId[acct.empId], method: "Employee ID", conf: 100 }, ix);
    if (acct.email && ix.byEmail[acct.email]) {
      const list = ix.byEmail[acct.email].slice().sort((a, b) => (a.start < b.start ? 1 : -1));
      const m = { rec: list[0], method: "Email", conf: 95 };
      if (list.length > 1) m.older = list.slice(1);
      return follow(m, ix);
    }
    const cands = ix.byName[norm(acct.display)] || [];
    if (cands.length === 1) return follow({ rec: cands[0], method: "Name only", conf: 80 }, ix);
    if (cands.length > 1) { const ai = aiNameMatch(acct, cands); return { rec: ai.rec, method: "Name only (simulated AI)", conf: ai.conf, why: ai.why, twins: cands.length }; }
    return { rec: null, method: "No match", conf: 0 };
  }
  // Rehires and conversions: follow priorId links to the newest record.
  function follow(m, ix) {
    let r = m.rec, via = null;
    while (r && r.status === "Terminated" && ix.successor[r.id]) { via = r; r = ix.successor[r.id]; }
    if (via) { m.from = via; m.rec = r; m.successorReason = via.type === "Contract end" ? "Converted" : "Rehired"; }
    if (!via && m.older && m.older.some((o) => o.status === "Terminated") && m.rec.priorId) { m.from = m.older[0]; m.successorReason = m.from.type === "Contract end" ? "Converted" : "Rehired"; }
    return m;
  }

  function score(f, run) {
    const a = f.acct, r = f.rec;
    const factors = [];
    const priv = PRIV[a.priv || 0];
    factors.push({ k: "priv", label: "Privilege", pts: priv.pts, max: 40, why: priv.label + (a.groups.length ? ": " + a.groups.slice(0, 3).join(", ") : "") });
    const reach = (a.reach || []).map((k) => REACH[k]).filter(Boolean).sort((x, y) => y.pts - x.pts)[0] || { pts: 0, label: "Nothing sensitive" };
    factors.push({ k: "reach", label: "Business reach", pts: reach.pts, max: 25, why: reach.label });
    const open = f.daysOpen;
    factors.push({ k: "days", label: "Days open", pts: Math.min(15, Math.round(open / 3)), max: 15, why: plural(open, "day") + (f.cat === "service" ? " since the owner left" : f.cat === "unowned" ? " since first flagged" : " since termination") });
    factors.push({ k: "act", label: "Late activity", pts: f.activity ? 10 : 0, max: 10, why: f.activity ? f.activityWhy : f.cat === "service" ? "Not used since the owner left" : "No sign-in or activity after leaving" });
    const credAge = a.pwdSet ? days(a.pwdSet, run) : null;
    factors.push({ k: "cred", label: "Old credential", pts: credAge !== null && credAge > 365 ? 5 : 0, max: 5, why: credAge === null ? "No password set" : "Password last set " + plural(credAge, "day") + " ago" + (credAge > 365 ? ", over a year" : "") });
    const invol = r && r.type === "Involuntary";
    factors.push({ k: "invol", label: "Involuntary exit", pts: invol ? 5 : 0, max: 5, why: invol ? (f.cat === "service" ? "The owner's termination was involuntary" : "The termination was involuntary") : (f.cat === "unowned" ? "No owner on record" : "Voluntary or contract end") });
    return { total: factors.reduce((s, x) => s + x.pts, 0), factors };
  }

  function topReason(f) {
    const a = f.acct;
    if (a.groups.includes("AP Clerk") && a.groups.includes("AP Approver")) return "Can create and approve vendor payments";
    if (a.radius === "fpa") return "Can change the forecast the board sees";
    if (a.groups.includes("Domain Admins")) return "Domain admin in a domain corp trusts";
    if (f.investigate) return a.events && a.events.length ? a.events[0].what : "Signed in after termination";
    if (f.cat === "service") return f.inUse ? "In use, nobody owns it" : "Unused since " + fmtDate(a.lastLogon) + ", nobody owns it";
    if (f.cat === "unowned") return a.note;
    if (f.nameOnly) return "Matched on name only";
    const reach = (a.reach || []).map((k) => REACH[k]).filter(Boolean).sort((x, y) => y.pts - x.pts)[0];
    return reach ? "Still has access to " + reach.label.toLowerCase() : "Still enabled";
  }

  function analyze(data, opts) {
    opts = opts || {};
    const run = data.meta.run;
    DEPTS = {}; (data.depts || []).forEach((d) => (DEPTS[d.id] = d));
    const ix = index(data);
    const findings = [], excluded = [], closed = [];
    const termNames = new Set(data.hr.filter((r) => r.status === "Terminated").map((r) => norm(r.name)));
    for (const a of data.accounts) {
      const m = match(a, ix);
      const base = { id: a.id, acct: a, sys: a.sys, rec: m.rec, method: m.method, conf: m.conf, matchWhy: m.why || null };
      if (a.kind === "shared") { if (a.signInBlocked) excluded.push(Object.assign(base, { reason: "Shared mailbox", why: "Shared mailbox with sign-in blocked; nobody signs in to it directly." })); continue; }
      if (a.kind === "service") {
        if (!a.enabled || !m.rec || m.rec.status !== "Terminated") continue;
        const daysOpen = days(m.rec.term, run);
        const inUse = a.lastLogon && days(a.lastLogon, run) <= 7;
        const usedAfter = a.lastLogon && a.lastLogon > m.rec.term;
        findings.push(Object.assign(base, { cat: "service", daysOpen, inUse, activity: usedAfter, activityWhy: usedAfter ? "Last sign-in " + fmtDate(a.lastLogon) + ", " + plural(days(m.rec.term, a.lastLogon), "day") + " after the owner left" : "" }));
        continue;
      }
      if (a.kind === "unknown") {
        if (!a.enabled) continue;
        const recent = a.lastLogon && days(a.lastLogon, run) <= 30;
        findings.push(Object.assign(base, { cat: "unowned", daysOpen: days(a.firstSeen, run), activity: recent, activityWhy: recent ? "Signed in " + fmtDate(a.lastLogon) : "" }));
        continue;
      }
      // person accounts
      if (!m.rec) { if (a.enabled) findings.push(Object.assign(base, { cat: "unowned", daysOpen: 0, activity: false })); continue; }
      if (m.successorReason) { if (a.enabled) excluded.push(Object.assign(base, { reason: m.successorReason, why: m.successorReason === "Rehired" ? `${m.from.id} left ${fmtDate(m.from.term)}; rehired as ${m.rec.id} on ${fmtDate(m.rec.start)}.` : `Contract ${m.from.id} ended ${fmtDate(m.from.term)}; employee ${m.rec.id} since ${fmtDate(m.rec.start)}.` })); continue; }
      if (m.rec.status === "Leave of absence") { if (a.enabled) excluded.push(Object.assign(base, { reason: "Leave of absence", why: "On leave since " + fmtDate(m.rec.loaSince) + ". Not a termination." })); continue; }
      if (m.rec.status === "Active") { if (a.enabled && m.method === "Employee ID" && !m.rec.priorId && termNames.has(norm(a.display))) excluded.push(Object.assign(base, { reason: "Name twin", why: `Matched by employee ID to the active ${m.rec.name} (${m.rec.id}). A former employee shares the name.` })); continue; }
      // terminated
      const daysOpen = days(m.rec.term, run);
      if (!a.enabled) { closed.push(Object.assign(base, { delay: a.disabledOn ? days(m.rec.term, a.disabledOn) : null })); continue; }
      const after = (a.events || []).filter((e) => e.date > m.rec.term);
      const lateLogin = a.lastLogon && a.lastLogon > m.rec.term;
      const activity = after.length > 0 || lateLogin;
      findings.push(Object.assign(base, { cat: "person", daysOpen, activity, activityWhy: after.length ? after[0].what + " on " + fmtDate(after[0].date) : lateLogin ? "Signed in " + fmtDate(a.lastLogon) + ", " + plural(days(m.rec.term, a.lastLogon), "day") + " after termination" : "", nameOnly: m.conf < MATCH_THRESHOLD }));
    }
    for (const f of findings) {
      const r = f.rec;
      f.investigate = f.cat === "person" && f.activity;
      f.exec = !!(r && r.exec && f.cat === "person");
      f.legalHold = !!(r && r.legalHold && f.cat === "person");
      f.twoPerson = f.cat === "service" || (f.acct.priv || 0) >= 2 || f.exec || f.investigate;
      f.score = score(f, run);
      f.top = topReason(f);
      f.root = ROOT[f.sys];
      if (f.cat === "service") { f.action = f.inUse ? "reassign" : "disable"; f.deleteBlocked = f.inUse ? "Used in the last 7 days" : null; }
      else if (f.cat === "unowned") { f.action = "owner"; f.deleteBlocked = "No owner yet"; }
      else { f.action = f.nameOnly ? "confirm" : "disable"; f.deleteBlocked = f.legalHold ? "Legal hold: disable only" : null; }
      f.batch = f.cat === "person" && !f.twoPerson && !f.nameOnly && !f.legalHold;
    }
    findings.sort((a, b) => b.score.total - a.score.total || a.id.localeCompare(b.id));
    return { findings, excluded, closed, stats: stats(data, findings, closed) };
  }

  function median(arr) { if (!arr.length) return null; const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); }
  function stats(data, findings, closed) {
    const bySys = {};
    for (const s of data.systems) if (s.id !== "hr") bySys[s.id] = { open: 0, delays: [] };
    for (const c of closed) if (bySys[c.sys] && c.delay !== null) bySys[c.sys].delays.push(c.delay);
    for (const f of findings) if (f.cat === "person") bySys[f.sys].open++;
    const medians = {}; for (const k in bySys) medians[k] = median(bySys[k].delays);
    const roots = {}; for (const f of findings) if (f.cat === "person") roots[f.root] = (roots[f.root] || 0) + 1;
    const cnt = (c) => findings.filter((f) => f.cat === c).length;
    const people = new Set(findings.filter((f) => f.cat === "person").map((f) => f.rec.id)).size;
    const terminated = data.hr.filter((r) => r.status === "Terminated").length;
    return { person: cnt("person"), service: cnt("service"), unowned: cnt("unowned"), total: findings.length, people, terminated, cleanLeavers: terminated - people, bySys, medians, roots, exposureDays: findings.reduce((s, f) => s + f.daysOpen, 0), batch: findings.filter((f) => f.batch).length, twoPerson: findings.filter((f) => f.twoPerson).length, investigate: findings.filter((f) => f.investigate).length, inUse: findings.filter((f) => f.cat === "service" && f.inUse).length };
  }

  // A copy of the data where every leaver's accounts were removed on time (the "All clean" toggle).
  function cleanData(data) {
    const c = JSON.parse(JSON.stringify(data));
    for (const a of c.accounts) {
      if (a.kind === "person" && a.personId) { const r = c.hr.find((x) => x.id === a.personId); if (r && r.status === "Terminated" && !c.hr.some((x) => x.priorId === r.id)) { a.enabled = false; a.disabledOn = a.disabledOn || r.term; } }
      if (a.kind === "service" || a.kind === "unknown") a.enabled = false;
    }
    return c;
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(s) { if (!s) return "never"; const d = D(s); return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() + (d.getUTCFullYear() !== 2026 ? ", " + d.getUTCFullYear() : ""); }
  function plural(n, word, pl) { return n.toLocaleString("en-US") + " " + (n === 1 ? word : pl || word + "s"); }

  const api = { analyze, cleanData, match, index, days, fmtDate, plural, REACH, PRIV, ROOT_LABEL, MATCH_THRESHOLD, median };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.OAF = api;
})(typeof window !== "undefined" ? window : globalThis);
