// OC-05 · Shared state, helpers, decisions and actions.
(function () {
  "use strict";
  const DATA = window.OAF_DATA;
  const E = window.OAF;
  const CLEAN = E.cleanData(DATA);
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plural = E.plural;
  const fmtDate = E.fmtDate;

  const PERSONAS = [
    { id: "lena", name: "Lena Ortiz", role: "analyst", title: "IAM analyst", short: "IAM analyst" },
    { id: "dana", name: "Dana Kim", role: "owner", title: "Finance systems owner", short: "Finance owner" },
    { id: "raj", name: "Raj Menon", role: "owner", title: "IT operations manager", short: "IT ops manager" },
    { id: "alex", name: "Alex Rivera", role: "ciso", title: "Deputy CISO", short: "Deputy CISO" },
    { id: "jordan", name: "Jordan Lee", role: "secops", title: "Security operations", short: "Security ops" },
  ];
  const HEAD_USER = "svc-fpa-sync";

  const fresh = () => ({ view: "map", persona: "lena", names: "generic", dataset: "seed", sel: null, depKey: null, revFilter: "open", dec: {}, fixes: {}, log: [], runs: 0, lastRun: "06:00", presenter: false });
  const S = fresh();
  let R = E.analyze(DATA);

  const APP = (window.APP = {
    DATA, CLEAN, E, S, $, $$, esc, plural, fmtDate, PERSONAS, HEAD_USER,
    get R() { return R; },
    views: {},
    data() { return S.dataset === "seed" ? DATA : CLEAN; },
    recompute() { R = E.analyze(this.data()); if (!S.sel || !R.findings.some((f) => f.id === S.sel)) S.sel = R.findings.length ? (R.findings.find((f) => f.acct.user === HEAD_USER) || R.findings[0]).id : null; },
    sys(id) { return DATA.systems.find((s) => s.id === id); },
    sysName(id) { const s = this.sys(id); return s ? (S.names === "real" ? s.real : s.generic) : id; },
    dept(id) { const d = DATA.depts.find((x) => x.id === id); return d ? d.name : id; },
    f(id) { return R.findings.find((x) => x.id === id); },
    isHead(f) { return f && f.acct.user === HEAD_USER; },
    persona() { return PERSONAS.find((p) => p.id === S.persona); },
    dec(f) { return S.dec[f.id] || null; },
    status(f) { const d = S.dec[f.id]; return d ? d.status : "open"; },
    isOpen(f) { return !["done", "verified", "kept"].includes(this.status(f)); },
    openFindings() { return R.findings.filter((f) => this.isOpen(f)); },
    who(f) { return f.cat === "unowned" ? f.acct.user : f.cat === "service" ? f.acct.user : f.rec.name; },
    whoSub(f) { return f.cat === "service" ? "Service account · owner " + f.rec.name + " left " + fmtDate(f.rec.term) : f.cat === "unowned" ? "No owner · " + this.sysName(f.sys) : f.rec.title + " · " + this.dept(f.rec.dept); },
    catLabel(f) { return f.cat === "service" ? "Service account" : f.cat === "unowned" ? "Unowned" : "Person"; },
  });

  // ---------------------------------------------------------------- ui helpers
  const tip = $("#tip");
  function showTip(el) {
    const t = el.getAttribute("data-tip"); if (!t) return;
    tip.innerHTML = t; tip.classList.add("on");
    const r = el.getBoundingClientRect(); const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2; x = Math.max(8, Math.min(window.innerWidth - tw - 8, x));
    let y = r.bottom + 8; if (y + th > window.innerHeight - 44) y = r.top - th - 8;
    tip.style.left = x + "px"; tip.style.top = Math.max(8, y) + "px";
  }
  const hideTip = () => tip.classList.remove("on");
  document.addEventListener("mouseover", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) showTip(t); });
  document.addEventListener("mouseout", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) hideTip(); });
  document.addEventListener("focusin", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) showTip(t); else hideTip(); });
  document.addEventListener("focusout", hideTip);
  document.addEventListener("click", hideTip, true);
  APP.hideTip = hideTip;

  let toastT;
  APP.toast = (msg) => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); };

  APP.modal = (html, onMount) => {
    const root = $("#modalRoot");
    root.innerHTML = `<div class="modal-bg"><div class="card modal" role="dialog" aria-modal="true">${html}</div></div>`;
    const bg = $(".modal-bg", root);
    bg.addEventListener("click", (e) => { if (e.target === bg) APP.closeModal(); });
    if (onMount) onMount($(".modal", root));
    const first = $(".modal button, .modal input", root); if (first) first.focus();
  };
  APP.closeModal = () => { $("#modalRoot").innerHTML = ""; };

  const now = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  APP.log = (what, who) => { S.log.unshift({ t: now(), what, who: who || APP.persona().name + ", " + APP.persona().title }); renderLog(); };
  function renderLog() {
    $("#logCount").textContent = S.log.length;
    $("#logList").innerHTML = S.log.length ? S.log.map((l) => `<li><span class="t">${l.t}</span><div>${l.what}<div class="who">${esc(l.who)}</div></div></li>`).join("") : `<li style="display:block;border:0" class="faint">Nothing yet. Approvals, actions and runs appear here.</li>`;
  }
  APP.renderLog = renderLog;

  // ---------------------------------------------------------------- decisions
  APP.actionsFor = (f) => {
    if (f.cat === "service") return [{ k: "reassign", label: "Reassign", key: "R" }, { k: "disable", label: "Disable", key: "D", off: f.inUse ? "Used in the last 7 days. Disabling it would stop the job it runs." : null }, { k: "keep", label: "Keep", key: "K" }];
    if (f.cat === "unowned") return [{ k: "owner", label: "Find owner", key: "O" }, { k: "disable", label: "Disable", key: "D" }, { k: "keep", label: "Keep", key: "K" }];
    const d = APP.dec(f);
    if (f.nameOnly && !(d && d.confirmed)) return [{ k: "confirm", label: "Confirm match", key: "C" }, { k: "keep", label: "Keep", key: "K" }];
    return [{ k: "disable", label: "Disable", key: "D" }, { k: "keep", label: "Keep", key: "K" }];
  };
  APP.ensureDec = (f) => {
    if (!S.dec[f.id]) S.dec[f.id] = { action: f.action, approvals: [], status: "open", reason: "", owner: null, confirmed: false, steps: [] };
    const d = S.dec[f.id];
    if ((d.action === "reassign" || d.action === "owner") && !d.owner) d.owner = APP.suggestions(f)[0].name;
    return d;
  };
  APP.secondOwner = (f) => (["plan", "fin"].includes(f.sys) || (f.rec && f.rec.dept === "fin") ? "dana" : "raj");
  APP.slots = (f) => {
    const d = APP.dec(f) || { action: f.action };
    const s = [{ role: "analyst", label: "IAM analyst" }];
    if (f.twoPerson && d.action !== "keep" && d.action !== "confirm") s.push({ role: "second", label: f.cat === "service" ? "System owner" : f.exec ? "Executive's manager or system owner" : "System owner or manager" });
    return s;
  };
  const roleOk = (slot, p) => (slot.role === "analyst" ? p.role === "analyst" : ["owner", "ciso"].includes(p.role));

  // Simulated AI owner suggestions.
  const TEAM = { fin: ["Aisha Rahman", "Priya Shah", "Marta Quinn"], eng: ["Leah Fontaine", "Tariq Haddad", "Mei Kato"], it: ["Raj Menon", "Hector Ibarra", "Noah Vance"], ops: ["Sean Whitley", "Rosa Delgado"], cs: ["Tomas Riedel", "Grace Park"], sales: ["Holly Brandt", "Ian Walsh"], mkt: ["Ivy Chandler"], prod: ["Owen Patterson"], ppl: ["Gwen Abara"] };
  APP.suggestions = (f) => {
    if (f.acct.user === HEAD_USER) return [
      { name: "Aisha Rahman", title: "Finance systems lead", conf: 91, why: "In FPA-Integration-Admins; ran 6 of the last 8 manual loads" },
      { name: "Dana Kim", title: "Finance systems owner", conf: 74, why: "Owns the planning app; approves its integrations" },
      { name: "Priya Shah", title: "FP&A manager", conf: 41, why: "Uses the forecast; not in any admin group" },
    ];
    if (f.cat === "service") {
      const t = TEAM[f.rec.dept] || ["Raj Menon"];
      return [
        { name: t[1] || t[0], title: "Teammate of the previous owner", conf: 84, why: "Member of " + (f.acct.groups[0] || "the same team") + "; changed this job's settings in the last 90 days" },
        { name: f.rec.manager, title: "Previous owner's manager", conf: 72, why: "Managed " + f.rec.name + "; approves changes for this team" },
      ];
    }
    const sysTeam = { corp: "Raj Menon", lark: "Raj Menon", entra: "Raj Menon", okta: "Raj Menon", tick: "Hector Ibarra", code: "Leah Fontaine", cloud: "Tariq Haddad", crm: "Holly Brandt", fin: "Dana Kim", plan: "Dana Kim" };
    return [
      { name: sysTeam[f.sys] || "Raj Menon", title: APP.sysName(f.sys) + " admin team", conf: 68, why: "Administers the system where the account lives" },
      { name: "IT service desk", title: "Default owner", conf: 35, why: "Used when no one else claims the account" },
    ];
  };

  APP.stepsFor = (f, d) => {
    const a = f.acct; const out = [];
    const hold = E.fmtDate(addDays(DATA.meta.run, 30));
    if (d.action === "disable") {
      out.push("Account disabled in " + APP.sysName(f.sys));
      if (a.groups.length) out.push("Removed from " + plural(a.groups.length, "group"));
      out.push(f.sys === "cloud" ? "Access keys deactivated" : "Sessions and tokens revoked");
      out.push(f.deleteBlocked && f.legalHold ? "Deletion blocked: legal hold. Account stays disabled." : "Deletion scheduled for " + hold + " (30-day hold)");
    } else if (d.action === "reassign") {
      out.push("Owner set to " + d.owner);
      out.push("Password rotated and stored in the vault");
      out.push("Group membership kept: " + a.groups.slice(0, 2).join(", "));
      out.push("Owner review scheduled in 90 days");
    } else if (d.action === "owner") {
      out.push("Owner set to " + d.owner);
      out.push("Disable date set for " + E.fmtDate(addDays(DATA.meta.run, 14)) + " unless the owner confirms the account");
    } else if (d.action === "keep") {
      out.push("Kept: " + d.reason);
      out.push("Flag returns in 30 days");
    }
    if (f.investigate && d.action !== "keep") out.push("Security operations case SEC-" + (2291 + R.findings.filter((x) => x.investigate).indexOf(f)) + " opened (simulated)");
    return out;
  };
  function addDays(s, n) { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  APP.addDays = addDays;

  APP.setAction = (f, k) => {
    const opt = APP.actionsFor(f).find((o) => o.k === k); if (!opt || opt.off) return false;
    const d = APP.ensureDec(f);
    if (d.status === "done" || d.status === "verified" || d.status === "kept") return false;
    if (d.action !== k) { d.action = k; d.approvals = []; }
    if ((k === "reassign" || k === "owner") && !d.owner) d.owner = APP.suggestions(f)[0].name;
    if (d.status === "failed") d.status = "open";
    return true;
  };
  APP.confirmMatch = (f) => {
    const d = APP.ensureDec(f);
    if (APP.persona().role !== "analyst") { APP.toast("Only an IAM analyst can confirm a match."); return; }
    d.confirmed = true; d.action = "disable"; d.approvals = [];
    APP.log(`Confirmed <b>${esc(f.acct.user)}</b> in ${esc(APP.sysName(f.sys))} belongs to ${esc(f.rec.name)} (${esc(APP.dept(f.rec.dept))}, ${esc(f.rec.id)})`);
  };

  // Returns an error string, or null when the current persona can approve the next slot.
  APP.canApprove = (f) => {
    const d = APP.ensureDec(f);
    if (d.status === "done" || d.status === "verified" || d.status === "kept") return "Already done";
    if (d.action === "confirm") return "Confirm the match first";
    if ((d.action === "reassign" || d.action === "owner") && !d.owner) return "Pick an owner first";
    if (d.action === "keep" && (!d.reason || d.reason.trim().length < 3)) return "Add a reason to keep it";
    const slots = APP.slots(f); const next = slots[d.approvals.length]; if (!next) return "Already approved";
    const p = APP.persona();
    if (!roleOk(next, p)) return next.role === "analyst" ? "Needs an IAM analyst" : "Needs a system owner or manager";
    if (d.approvals.some((a) => a.pid === p.id)) return "Needs a second person";
    return null;
  };
  APP.approve = (f, quiet) => {
    const err = APP.canApprove(f); if (err) { if (!quiet) APP.toast(err); return false; }
    const d = APP.ensureDec(f); const p = APP.persona();
    d.approvals.push({ pid: p.id, name: p.name, title: p.title, at: now() });
    const need = APP.slots(f).length;
    if (d.approvals.length < need) { d.status = "pending"; if (!quiet) APP.log(`Approved ${actionWord(d.action)} for <b>${esc(f.acct.user)}</b> (${d.approvals.length} of ${need})`); return true; }
    execute(f, quiet);
    return true;
  };
  const actionWord = (k) => ({ disable: "disable", reassign: "reassign and rotate", owner: "new owner", keep: "keep", confirm: "confirm match" }[k] || k);
  function execute(f, quiet) {
    const d = APP.dec(f);
    d.steps = APP.stepsFor(f, d);
    d.status = d.action === "keep" ? "kept" : "done";
    d.attempts = (d.attempts || 0) + 1;
    if (!quiet) APP.log(`${d.action === "keep" ? "Kept" : "Ran " + actionWord(d.action) + " for"} <b>${esc(f.acct.user)}</b> in ${esc(APP.sysName(f.sys))}${d.approvals.length > 1 ? " after 2 approvals" : ""}. ${d.action === "keep" ? esc(d.reason) : "Awaiting verification on the next run."}`);
  }
  APP.batchApprove = (ids) => {
    const p = APP.persona(); if (p.role !== "analyst") { APP.toast("Batch approval needs an IAM analyst."); return 0; }
    let n = 0;
    for (const id of ids) { const f = APP.f(id); if (!f || !f.batch || !APP.isOpen(f)) continue; const d = APP.ensureDec(f); d.action = "disable"; d.approvals = []; if (APP.approve(f, true)) n++; }
    if (n) APP.log(`Batch approved and disabled ${plural(n, "low-risk account")}. Awaiting verification on the next run.`);
    return n;
  };

  APP.runNow = () => {
    S.runs++; S.lastRun = now();
    let ok = 0, bad = 0;
    for (const f of R.findings) {
      const d = APP.dec(f); if (!d || d.status !== "done") continue;
      if (f.acct.failOnce && !d.failedOnce) { d.failedOnce = true; d.status = "failed"; d.approvals = []; d.note = f.acct.failOnce; bad++; APP.log(`<b>Not removed:</b> ${esc(f.acct.user)} is still enabled in ${esc(APP.sysName(f.sys))}. Back in the review deck.`, "Finder, scheduled run (simulated)"); }
      else { d.status = "verified"; ok++; }
    }
    APP.log(`Run complete: ${plural(ok, "action")} verified${bad ? ", " + bad + " not removed" : ""}. ${plural(APP.openFindings().length, "open orphan")}.`, "Finder, run " + S.runs + " (simulated)");
    APP.toast(`Run complete: ${plural(ok, "action")} verified${bad ? ", " + bad + " not removed" : ""}`);
    APP.render();
  };

  APP.acceptFix = (key) => {
    const p = APP.persona(); if (p.role !== "ciso") { APP.toast("Only the Deputy CISO can fund a fix."); return; }
    S.fixes[key] = { by: p.name, at: now() };
    APP.log(`Accepted upstream fix: <b>${esc(key === "lark" ? "Connect Larkspur to HR-driven removal" : "Put the finance app behind SSO")}</b>`);
    APP.render();
  };

  // ---------------------------------------------------------------- navigation and render
  APP.go = (view, fid) => {
    if (fid) S.sel = fid;
    if (view === "departure" && fid) { const f = APP.f(fid); S.depKey = f.cat === "service" ? "s:" + f.id : f.cat === "person" ? "p:" + f.rec.id : null; }
    S.view = view;
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
    APP.hideTip();
    APP.render();
  };
  APP.render = () => {
    const open = APP.openFindings();
    $("#reviewCount").textContent = open.length;
    const v = APP.views[S.view]; if (v) v.render();
    renderLog();
  };
  APP.reset = () => {
    const pres = S.presenter;
    Object.assign(S, fresh(), { presenter: pres, view: S.view });
    $$("#namesSeg button").forEach((b) => b.classList.toggle("on", b.dataset.names === "generic"));
    $("#persona").value = "lena";
    APP.recompute();
    APP.views.map.replayIntro = true;
    APP.logStart();
    APP.render();
    APP.toast("Reset: back to the seeded data");
  };
  APP.recompute();
})();
