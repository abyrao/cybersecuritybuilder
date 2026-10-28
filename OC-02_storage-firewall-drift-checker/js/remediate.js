/* OC-02 · remediation workflow: fix in code or console, re-check, simulated pipeline run (re-drift),
   auto-fix batches with approval, exceptions. Pure: state in, result out. */
(function (root) {
  const B = root.B, DR = root.DR, PR = root.PR, ES = root.ES, DAY = 864e5;
  const PERSONAS = [
    { id: "maya", name: "Maya Chen", role: "Cloud engineer", type: "engineer" },
    { id: "omar", name: "Omar Haddad", role: "Cloud security lead", type: "lead" },
    { id: "grace", name: "Grace Okafor", role: "Engineering manager", type: "manager" }
  ];
  const persona = id => PERSONAS.find(p => p.id === id);
  const addDays = (d, n) => new Date(Date.parse(d + "T12:00:00Z") + n * DAY).toISOString().slice(0, 10);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function create(est) {
    const st = { est, today: est.today, byId: Object.fromEntries(est.resources.map(r => [r.id, r])), status: {}, history: [], exceptions: est.exceptions.slice() };
    seedHistory(st); return st;
  }
  function exceptionFor(st, asOf) { return (rid, cid) => st.exceptions.find(x => x.resource === rid && x.controls.includes(cid) && asOf <= x.until) || null; }
  // Evaluate the whole estate as of a date (exceptions) with workflow status applied
  function current(st, asOf) {
    const date = asOf || st.today, exf = exceptionFor(st, date), out = { resources: {}, drifts: [], excepted: [] };
    st.est.resources.forEach(res => {
      const ev = DR.evaluate(res, { exceptionFor: exf });
      const live = ev.drifts.filter(d => { const s = st.status[d.key]; return !s || s.s !== "conforming"; });
      live.forEach(d => { Object.assign(d, PR.score(res, d, date)); d.status = st.status[d.key] ? st.status[d.key].s : "drifted"; d.method = st.status[d.key] ? st.status[d.key].method : null; });
      const score = Math.round(live.reduce((a, x) => a + x.points, 0) * 10) / 10;
      out.resources[res.id] = { applicable: ev.applicable.length, score, conformance: Math.round((100 - score) * 10) / 10, drifts: live, excepted: ev.excepted };
      out.drifts.push(...live); out.excepted.push(...ev.excepted);
    });
    return out;
  }
  // Last quarter's fixes: 160 total; 40 console fixes on pipeline-managed resources came undone
  function seedHistory(st) {
    const r = rng(1027), ev = current(st), cand = ev.drifts.filter(d => { const res = st.byId[d.resourceId]; return res.deployedBy === "module" && !res.planted && d.since; });
    cand.sort((a, b) => a.key.localeCompare(b.key));
    const picked = []; for (let i = 0; picked.length < 40 && i < cand.length; i += Math.max(1, Math.floor(cand.length / 40))) picked.push(cand[i]);
    picked.forEach((d, i) => { const fixedOn = addDays(st.today, -(32 + (i * 53) % 58)), revertedOn = addDays(fixedOn, 4 + (i * 7) % 24), origSince = addDays(fixedOn, -(10 + (i * 13) % 60));
      st.history.push({ key: d.key, resourceId: d.resourceId, controlId: d.controlId, method: "console", fixedOn, revertedOn, origSince, redrift: true });
      st.byId[d.resourceId].since[d.controlId] = revertedOn; });
    // 120 fixes that held: 72 in code, 48 in the console on console-managed resources
    const pool = st.est.resources.filter(res => !res.planted && (res.domain === "storage" || res.kind === "vnet"));
    let code = 0, cons = 0, guard = 0;
    while ((code < 72 || cons < 48) && guard++ < 5000) {
      const res = pool[Math.floor(r() * pool.length)], app = B.CONTROLS.filter(c => DR.applies(c, res)); if (!app.length) continue;
      const c = app[Math.floor(r() * app.length)], key = res.id + "|" + c.id; if (st.history.some(h => h.key === key) || (res.since && res.since[c.id])) continue;
      const method = res.deployedBy === "console" && cons < 48 ? "console" : code < 72 ? "code" : null; if (!method) continue;
      if (method === "console") cons++; else code++;
      const fixedOn = addDays(st.today, -(31 + Math.floor(r() * 59)));
      st.history.push({ key, resourceId: res.id, controlId: c.id, method, fixedOn, revertedOn: null, origSince: addDays(fixedOn, -(5 + Math.floor(r() * 50))), redrift: false, weight: B.SEVW[c.sev] });
    }
  }
  function redriftStats(st) {
    const q = st.history.filter(h => h.fixedOn <= addDays(st.today, -30) || h.session), byM = m => q.filter(h => h.method === m);
    const rd = q.filter(h => h.redrift);
    return { fixes: q.length, redrift: rd.length, rate: q.length ? rd.length / q.length : 0, console: byM("console").length, consoleRedrift: byM("console").filter(h => h.redrift).length, code: byM("code").length + byM("auto").length, codeRedrift: byM("code").filter(h => h.redrift).length + byM("auto").filter(h => h.redrift).length };
  }

  // ---- actions ----
  function fix(st, key, method, who, opts) {
    const p = persona(who), [rid, cid] = key.split("|"), c = DR.CTRL[cid];
    if (p.type === "manager") return { ok: false, msg: "Engineers and the cloud security lead apply fixes." };
    if (st.status[key] && st.status[key].s === "submitted") return { ok: false, msg: "Fix already submitted. Re-check to confirm it." };
    if (c.path === "exposure" && !c.auto && !(opts && opts.reviewed)) return { ok: false, msg: "This change can break an app. Confirm the owner checked nothing depends on it." };
    st.status[key] = { s: "submitted", method, by: who, at: st.today };
    return { ok: true, msg: p.name + " submitted a " + (method === "code" ? "code change (pull request)" : "console change") + " for " + cid + " on " + st.byId[rid].name };
  }
  function recheck(st, keys) {
    let n = 0; keys.forEach(k => { const s = st.status[k]; if (s && s.s === "submitted") { s.s = "conforming"; s.on = st.today; n++;
      const [rid, cid] = k.split("|"); st.history.push({ key: k, resourceId: rid, controlId: cid, method: s.method, fixedOn: st.today, revertedOn: null, redrift: false, session: true }); } });
    return { ok: n > 0, n, msg: n ? "Re-check passed: " + n + (n === 1 ? " control now meets" : " controls now meet") + " the baseline" : "Nothing to re-check. Submit a fix first." };
  }
  // Simulated pipeline run: modules re-apply their settings, undoing console fixes on module-managed resources
  function deploy(st) {
    const undone = [];
    Object.keys(st.status).forEach(k => { const s = st.status[k], rid = k.split("|")[0];
      if (s.s === "conforming" && s.method === "console" && st.byId[rid].deployedBy === "module") { delete st.status[k]; undone.push(k);
        const h = st.history.slice().reverse().find(x => x.key === k && x.session); if (h) { h.redrift = true; h.revertedOn = st.today; } } });
    return { ok: true, undone, msg: undone.length ? "Pipeline run: " + undone.length + " console fix" + (undone.length === 1 ? " was" : "es were") + " overwritten by the module" : "Pipeline run: every fix held" };
  }
  function autofix(st, keys, who) {
    const p = persona(who);
    if (p.type !== "lead") return { ok: false, msg: "Only the cloud security lead approves auto-fix batches." };
    const bad = keys.filter(k => !DR.CTRL[k.split("|")[1]].auto); if (bad.length) return { ok: false, msg: bad.length + " selected control" + (bad.length === 1 ? " isn't" : "s aren't") + " eligible for auto-fix." };
    if (!keys.length) return { ok: false, msg: "Nothing selected." };
    keys.forEach(k => { st.status[k] = { s: "submitted", method: "auto", by: who, at: st.today }; });
    return { ok: true, msg: p.name + " approved and applied " + keys.length + " auto-fix" + (keys.length === 1 ? "" : "es") + " (module pull requests). Re-check to confirm." };
  }
  function except(st, key, who, reason, days) {
    const p = persona(who), [rid, cid] = key.split("|");
    if (p.type !== "lead") return { ok: false, msg: "Only the cloud security lead approves exceptions." };
    if (!reason || reason.trim().length < 10) return { ok: false, msg: "Write a reason of at least 10 characters." };
    if (!days || days > 180) return { ok: false, msg: "Expiry must be within 180 days." };
    const id = "EX-" + String(st.exceptions.length + 1).padStart(2, "0");
    st.exceptions.push({ id, resource: rid, controls: [cid], until: addDays(st.today, days), by: p.name, reason: reason.trim() });
    return { ok: true, msg: id + ": " + cid + " on " + st.byId[rid].name + " excepted until " + addDays(st.today, days) };
  }
  // Fleet conformance per day for the last 90 days (re-drift intervals included)
  function trend(st, ev) {
    const days = Array.from({ length: 91 }, (_, i) => addDays(st.today, i - 90)), n = st.est.resources.filter(r => ev.resources[r.id].applicable).length;
    const iv = [];
    ev.drifts.forEach(d => { const h = st.history.find(x => x.key === d.key && x.redrift && !x.session); if (h) { iv.push([h.origSince, h.fixedOn, d.points]); iv.push([h.revertedOn, "9999", d.points]); } else iv.push([d.since || "2026-07-01", "9999", d.points]); });
    st.history.filter(h => !h.redrift && !h.session).forEach(h => { const res = st.byId[h.resourceId], wsum = DR.evaluate(res).wsum || 1; iv.push([h.origSince, h.fixedOn, 100 * h.weight * 1 / wsum]); });
    return days.map(d => { const pts = iv.reduce((a, [s, e, p]) => a + (s <= d && d < e ? p : 0), 0); return { d, conf: Math.round((100 - pts / n) * 10) / 10, redrifts: st.history.filter(h => h.redrift && h.revertedOn === d).length }; });
  }
  root.RM = { PERSONAS, persona, create, current, exceptionFor, redriftStats, fix, recheck, deploy, autofix, except, trend, addDays };
})(typeof window !== "undefined" ? window : globalThis);
