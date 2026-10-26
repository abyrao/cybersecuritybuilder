/* BC-02 · Cloud vulnerability and misconfiguration dashboard, by business unit */
(function () {
  const $ = id => document.getElementById(id);
  const BANDS = ["Critical", "High", "Medium", "Low"];
  const BANDC = { Critical: "#FF2E88", High: "#FFB13D", Medium: "#9D7BFF", Low: "#3DD9FF" };
  const GOOD = "#C6FF3D", PINK = "#FF2E88";
  const UNITS = D.BUS.concat([D.UNMAPPED]);
  const unit = id => UNITS.find(u => u.id === id);
  const ACCT = Object.fromEntries(D.ACCOUNTS.map(a => [a.id, a]));
  const DAY = 864e5, T0 = Date.parse(D.TODAY + "T12:00:00Z");
  const PERSONAS = D.PEOPLE.filter(p => p.bu !== "UNM").map(p => Object.assign({ type: "eng" }, p))
    .concat(D.BUS.map(b => ({ id: "own-" + b.id, name: b.owner, bu: b.id, role: b.ownerRole, type: "owner" })))
    .concat(D.PEOPLE.filter(p => p.bu === "UNM").map(p => Object.assign({ type: "platform" }, p)));
  const person = id => PERSONAS.find(p => p.id === id) || { name: "Unknown", bu: "", type: "" };
  const STATUS = { todo: "To do", progress: "In progress", review: "In review", verified: "Verified", pendingAccept: "Pending owner", accepted: "Risk accepted" };

  // ---------- state ----------
  let state;
  function fresh() {
    return { findings: G.build(), view: "overview", mode: "count", cloud: "all", unit: "PAY", persona: "rortiz", open: null, generic: false,
      board: { unit: "PAY", mine: false, kind: "all", band: "all", limit: {} }, accept: null, assign: null };
  }

  // ---------- helpers ----------
  function el(tag, attrs, parent) {
    const svg = tag.startsWith("svg:");
    const n = svg ? document.createElementNS("http://www.w3.org/2000/svg", tag.slice(4)) : document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k]; if (v === undefined || v === null || v === false) continue;
      if (k === "text") n.textContent = v; else if (k === "html") n.innerHTML = v; else if (k === "on") for (const e in v) n.addEventListener(e, v[e]); else n.setAttribute(k, v);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = n => Math.round(n).toLocaleString("en-US");
  const pl = (n, one, many) => num(n) + " " + (Math.round(n) === 1 ? one : many);
  const day = s => new Date(s + "T12:00:00Z");
  const fmt = s => day(s).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const addDays = (s, n) => new Date(day(s).getTime() + n * DAY).toISOString().slice(0, 10);
  const diff = (a, b) => Math.round((day(a) - day(b)) / DAY);
  const initials = name => name.split(" ").map(w => w[0]).join("").slice(0, 2);
  const isOpen = f => f.status === "todo" || f.status === "progress" || f.status === "review" || f.status === "pendingAccept";
  const sla = f => D.SLA[unit(f.bu).tier][f.band];
  const due = f => addDays(f.firstSeen, sla(f));
  const overdue = f => isOpen(f) && due(f) < D.TODAY;
  const srcName = id => { const s = D.SOURCES.find(x => x.id === id); return state.generic ? s.generic : s.name; };
  const cloudChip = (c, p) => el("span", { class: "cloud", style: "color:" + D.CLOUDS[c].color + ";border-color:" + D.CLOUDS[c].color + "66", text: D.CLOUDS[c].short, "data-tip": D.CLOUDS[c].name }, p);
  const scoreChip = (f, p) => el("span", { class: "score", style: "background:" + BANDC[f.band], text: f.score, "data-tip": f.band + " · score " + f.score + " of 100" }, p);
  const sum = (list, fn) => list.reduce((a, x) => a + fn(x), 0);
  const me = () => person(state.persona);

  function stamp() { const d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, "0")).join(":"); }
  function log(msg) { $("logList").prepend(el("li", { html: "<span>" + stamp() + "</span>" + esc(msg) })); }
  let toastT;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2400); }
  function floatPts(n, anchor) {
    const r = anchor ? anchor.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    const f = el("div", { class: "floatpts", text: "−" + n + " pts" }, document.body);
    f.style.left = (r.left + r.width / 2 - 50) + "px"; f.style.top = (r.top - 10) + "px";
    setTimeout(() => f.remove(), 1700);
  }

  // ---------- tooltips (hover and keyboard focus) ----------
  const tip = $("tip");
  function showTip(t) {
    const text = t.getAttribute("data-tip"); if (!text) return;
    tip.textContent = text; tip.classList.add("show");
    const r = t.getBoundingClientRect(), b = tip.getBoundingClientRect();
    let x = r.left + r.width / 2 - b.width / 2, y = r.bottom + 8;
    if (y + b.height > innerHeight - 52) y = r.top - b.height - 8;
    tip.style.left = Math.max(8, Math.min(innerWidth - b.width - 8, x)) + "px";
    tip.style.top = Math.max(8, y) + "px";
  }
  const hideTip = () => tip.classList.remove("show");
  document.addEventListener("mouseover", e => { const t = e.target.closest && e.target.closest("[data-tip]"); t ? showTip(t) : hideTip(); });
  document.addEventListener("focusin", e => { const t = e.target.closest && e.target.closest("[data-tip]"); t ? showTip(t) : hideTip(); });
  document.addEventListener("scroll", hideTip, true);

  // ---------- metrics ----------
  function openList(st, cloud) { return (st || state).findings.filter(f => isOpen(f) && (!cloud || cloud === "all" || f.cloud === cloud)); }
  function unitRisk(st, bu, cloud) { return sum(openList(st, cloud).filter(f => f.bu === bu), f => f.score); }
  function verified(st) { return (st || state).findings.filter(f => f.status === "verified"); }
  function fixFirst(list) {
    const sorted = list.slice().sort((a, b) => (b.score / b.effort - a.score / a.effort) || b.score - a.score);
    const total = sum(sorted, f => f.score); let cum = 0, hrs = 0, k = 0, kh = 0, kp = 0;
    const pts = sorted.map((f, i) => { cum += f.score; hrs += f.effort; const p = total ? cum / total * 100 : 0; if (!k && p >= 50) { k = i + 1; kh = hrs; kp = Math.round(p); } return { f, hrs, p }; });
    return { sorted, pts, total, k, kh, kp, hours: hrs };
  }
  function trend() {
    const out = [];
    for (let i = 90; i >= 0; i--) {
      const d = new Date(T0 - i * DAY).toISOString().slice(0, 10);
      let open = 0, removed = 0;
      state.findings.forEach(f => {
        if (f.firstSeen > d) return;
        if (f.status === "verified" && f.verifiedAt <= d) { if (f.verifiedAt === d) removed += f.score; return; }
        if (f.status === "accepted" && f.acceptedAt <= d) return;
        open += f.score;
      });
      out.push({ d, open, removed });
    }
    let c = 0; out.forEach(o => { c += o.removed; o.cum = c; });
    return out;
  }

  // ---------- actions (work on any state, so checks can run on a copy) ----------
  function linked(st, f) { return f.rootCause ? st.findings.filter(x => x.rootCause === f.rootCause && x.status !== "verified" && x.status !== "accepted") : [f]; }
  function act(st, f, action, who, opts) {
    const p = person(who), group = opts && opts.all ? linked(st, f) : [f];
    const res = (ok, msg) => ({ ok, msg, group });
    switch (action) {
      case "claim":
        if (f.bu === "UNM") return res(false, "No business unit owns this account yet. The cloud platform lead assigns an owner first.");
        if (p.type !== "eng") return res(false, "Only engineers can claim fixes.");
        if (p.bu !== f.bu) return res(false, p.name + " is on " + unit(p.bu).name + ", not " + unit(f.bu).name + ".");
        group.forEach(x => { if (x.status === "todo") { x.status = "progress"; x.assignee = who; x.note = null; } });
        return res(true, p.name + " claimed " + (group.length > 1 ? pl(group.length, "finding", "findings") : f.id));
      case "submit":
        if (f.assignee !== who) return res(false, "Only the person who claimed it can submit the fix.");
        group.forEach(x => { if (x.status === "progress") { x.status = "review"; x.fixer = who; x.approvedBy = null; x.note = (opts && opts.note) || "Fix submitted as a pull request (simulated)"; } });
        return res(true, p.name + " submitted a fix for " + (group.length > 1 ? pl(group.length, "finding", "findings") : f.id));
      case "approve":
        if (f.fixer === who) return res(false, "You can't approve your own fix. Ask a teammate.");
        if (p.type !== "eng" || p.bu !== f.bu) return res(false, "A second engineer from " + unit(f.bu).name + " reviews the fix.");
        group.forEach(x => { if (x.status === "review" && x.fixer !== who) x.approvedBy = who; });
        return res(true, p.name + " approved the fix for " + (group.length > 1 ? pl(group.length, "finding", "findings") : f.id));
      case "rescan": {
        if (!f.approvedBy) return res(false, "The fix needs a reviewer's approval before the rescan.");
        let bounced = [], done = [];
        group.forEach(x => {
          if (x.status !== "review" || !x.approvedBy) return;
          if (x.rescanFails) {
            x.status = "todo"; x.assignee = null; x.approvedBy = null; x.rescanFails = false;
            x.note = "Rescan still sees port 22 open on a second rule (" + x.resource + "-b). Fix that rule too."; bounced.push(x);
          } else { x.status = "verified"; x.verifiedAt = D.TODAY; x.closedAt = D.TODAY; x.note = null; done.push(x); }
        });
        const r = res(done.length > 0, bounced.length ? "Rescan still sees " + f.id + ". Back to To do." : "Rescan clean. " + pl(done.length, "fix", "fixes") + " verified.");
        r.done = done; r.bounced = bounced; r.points = sum(done, x => x.score); return r;
      }
      case "acceptReq": {
        const o = opts || {};
        if (!o.reason || o.reason.trim().length < 10) return res(false, "Write a reason of at least 10 characters.");
        if (!o.days || o.days > 90) return res(false, "Pick an expiry within 90 days.");
        f.prevStatus = f.status; f.status = "pendingAccept"; f.acceptReason = o.reason.trim(); f.acceptDays = o.days; f.acceptBy = who;
        return res(true, p.name + " asked " + unit(f.bu).owner + " to accept the risk on " + f.id);
      }
      case "acceptApprove":
        if (f.status !== "pendingAccept") return res(false, "Nothing is waiting for approval.");
        if (p.type !== "owner" || p.bu !== f.bu) return res(false, "Only " + unit(f.bu).owner + " (" + unit(f.bu).name + " owner) can accept this risk.");
        f.status = "accepted"; f.acceptedAt = D.TODAY; f.acceptedUntil = addDays(D.TODAY, f.acceptDays);
        return res(true, p.name + " accepted the risk on " + f.id + " until " + fmt(f.acceptedUntil));
      case "acceptDecline":
        if (p.type !== "owner" || p.bu !== f.bu) return res(false, "Only the unit owner can decline.");
        f.status = f.prevStatus || "todo"; f.note = "Risk acceptance declined by " + p.name + ". Fix it instead.";
        return res(true, p.name + " declined the risk acceptance on " + f.id);
      case "assign": {
        if (p.type !== "platform") return res(false, "Only the cloud platform lead can assign an owner.");
        const bu = opts && opts.bu; if (!bu || !unit(bu) || bu === "UNM") return res(false, "Pick a business unit.");
        const moved = st.findings.filter(x => x.account === f.account);
        moved.forEach(x => { x.bu = bu; });
        return res(true, p.name + " assigned " + f.account + " to " + unit(bu).name + " (" + pl(moved.length, "finding", "findings") + ")");
      }
    }
    return res(false, "Unknown action");
  }

  function run(f, action, opts, anchor) {
    const r = act(state, f, action, state.persona, opts);
    if (!r.ok && action !== "rescan") { toast(r.msg); log("Blocked · " + r.msg); return r; }
    if (action === "rescan") {
      if (!r.done && !r.bounced) { toast(r.msg); log("Blocked · " + r.msg); return r; }
      if (r.bounced && r.bounced.length) { toast(r.msg); log(r.msg + " " + r.bounced[0].note); }
      if (r.done && r.done.length) { toast(r.msg + " −" + r.points + " risk points"); log(r.msg + " " + unit(f.bu).name + " risk −" + r.points + " points."); floatPts(r.points, anchor); }
    } else { toast(r.msg); log(r.msg); }
    render(); if (state.open) drawFinding();
    return r;
  }

  // Simulated scan delay with a sweep bar
  function rescanWithSweep(f, opts, btn) {
    const bar = $("scanBar"); if (bar) bar.classList.add("on");
    if (btn) { btn.disabled = true; btn.textContent = "Scanning…"; }
    setTimeout(() => run(f, "rescan", opts, btn), 1100);
  }

  // ---------- render shell ----------
  const Q = {
    overview: ["Where is our <em>cloud risk</em>?", () => pl(openList().length, "open finding", "open findings") + " across 5 clouds and 6 business units"],
    units: [() => "What should <em>" + esc(unit(state.unit).name) + "</em> fix first?", () => "Ranked by risk removed per hour of work"],
    board: ["What can I <em>pick up</em>?", () => "Claim, fix, get a review, rescan. Only verified fixes count."],
    reduced: ["How much risk have we <em>removed</em>?", () => "Every point here is a verified fix by an engineer"],
    sources: ["Where do findings <em>come from</em>?", () => "8 tools across 5 clouds, deduped and mapped to owners"]
  };
  function render() {
    const q = Q[state.view];
    $("question").innerHTML = typeof q[0] === "function" ? q[0]() : q[0];
    $("subhead").textContent = q[1]();
    const hr = $("headRight"); hr.innerHTML = "";
    document.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("on", b.dataset.view === state.view));
    moveSeg();
    const v = $("view"); v.innerHTML = ""; v.style.animation = "none"; void v.offsetWidth; v.style.animation = "";
    ({ overview: renderOverview, units: renderUnits, board: renderBoard, reduced: renderReduced, sources: renderSources })[state.view](v, hr);
  }
  function moveSeg() {
    const on = document.querySelector(".seg-btn.on"), ind = document.querySelector(".seg-ind");
    if (!on) return; ind.style.width = on.offsetWidth + "px"; ind.style.transform = "translateX(" + (on.offsetLeft - 4) + "px)";
  }
  function setView(v) { state.view = v; closeAll(); render(); window.scrollTo(0, 0); }

  function kpi(p, k, v, s, cls, tipText, i) {
    const c = el("div", { class: "card kpi " + (cls || ""), tabindex: 0, "data-tip": tipText, style: "animation-delay:" + i * .05 + "s" }, p);
    el("div", { class: "k", text: k }, c); el("div", { class: "v", text: v }, c); el("div", { class: "s", text: s }, c);
  }
  function cardHead(p, title, tipText, right) {
    const h = el("div", { class: "card-head" }, p); const l = el("div", { style: "display:flex;gap:8px;align-items:center;min-width:0" }, h);
    el("div", { class: "card-title", text: title }, l);
    if (tipText) el("button", { class: "info", "data-tip": tipText, "aria-label": "About this", text: "?" }, l);
    if (right) h.appendChild(right); return h;
  }
  const simTag = t => el("span", { class: "tag", "data-tip": t || "Written by simulated AI from the finding data. Review before acting.", text: "simulated" });

  // ---------- Overview ----------
  function insights() {
    const open = openList(), crit = open.filter(f => f.band === "Critical");
    const pay = open.filter(f => f.bu === "PAY"), dat = open.filter(f => f.bu === "DATA");
    const top = UNITS.slice(0, 6).map(u => ({ u, r: unitRisk(null, u.id) })).sort((a, b) => b.r - a.r)[0];
    const most = UNITS.slice(0, 6).map(u => ({ u, n: open.filter(f => f.bu === u.id).length })).sort((a, b) => b.n - a.n)[0];
    const ff = fixFirst(pay);
    const mod = state.findings.filter(f => f.rootCause && isOpen(f));
    const unm = crit.filter(f => f.bu === "UNM");
    const tr = trend(), drop = tr[0].open ? Math.round((1 - tr[tr.length - 1].open / tr[0].open) * 100) : 0;
    const out = [];
    if (top && most && top.u.id !== most.u.id) out.push({ n: Math.round(top.r / sum(open, f => f.score) * 100) + "%", t: "of risk is in " + top.u.name, d: pl(open.filter(f => f.bu === top.u.id).length, "finding", "findings") + " · " + most.u.name + " has " + num(most.n),
      tip: "Why: " + top.u.name + " findings sit on revenue-critical production with sensitive data, so each one scores higher. " + most.u.name + "'s findings are mostly in non-production. Switch the map to Risk to see it.", go: () => { state.mode = "risk"; render(); } });
    if (ff.k) out.push({ n: ff.kp + "%", t: "of Payments risk in " + pl(ff.k, "fix", "fixes"), d: "About " + pl(ff.kh, "hour", "hours") + " of work", tip: "Why: ranked by risk removed per hour. The first " + pl(ff.k, "fix", "fixes") + " remove " + ff.kp + "% of Payments' open risk.", go: () => { state.unit = "PAY"; setView("units"); } });
    if (mod.length > 1) out.push({ n: mod.length, t: pl(mod.length, "finding", "findings") + ", 1 root cause", d: "Module storage-bucket 1.4.2", tip: "Why: every bucket built from this Terraform module version has public access blocking turned off. Update the module once and redeploy.", go: () => openFinding(mod[0].id) });
    if (unm.length) out.push({ n: unm.length, t: (unm.length === 1 ? "critical has" : "criticals have") + " no owner", d: "Accounts with no business unit tag", tip: "Why: these accounts have no business unit tag in the cloud or the CMDB, so no team sees them in their queue.", go: () => { state.unit = "UNM"; setView("units"); } });
    if (drop > 0) out.push({ g: true, n: "−" + drop + "%", t: "open risk since " + fmt(tr[0].d), d: pl(verified().length, "verified fix", "verified fixes"), tip: "Why: open risk on " + fmt(tr[0].d) + " was " + num(tr[0].open) + " points; today it's " + num(tr[tr.length - 1].open) + ".", go: () => setView("reduced") });
    return out;
  }
  function renderOverview(v) {
    const open = openList(), crit = open.filter(f => f.band === "Critical"), red = sum(verified(), f => f.score);
    const k = el("div", { class: "kpis" }, v);
    kpi(k, "Open risk", num(sum(open, f => f.score)), "points across all units", "hot", "Sum of the scores of every open finding. A score combines severity, exposure, exploit, asset, and data.", 0);
    kpi(k, "Critical", num(crit.length), "score 70 or higher", "", "Findings scoring 70 or more out of 100", 1);
    kpi(k, "Removed", num(red), "points in 90 days", "good", "Risk points removed by verified fixes since " + fmt(D.WINDOW_START), 2);
    kpi(k, "Overdue", num(open.filter(overdue).length), "past fix-time target", "", "Open past the fix-time target for its band. Tier 1 units: Critical 7 days, High 30, Medium 60, Low 120. Tier 2 units: 14, 45, 90, 180.", 3);
    kpi(k, "No owner", num(open.filter(f => f.bu === "UNM").length), "findings in unmapped accounts", "", "Findings in accounts with no business unit tag", 4);

    const g = el("div", { class: "grid-main" }, v);
    const left = el("div", { class: "card pad" }, g);
    const tg = el("div", { class: "toggle", role: "group", "aria-label": "Size tiles by" });
    [["count", "Count"], ["risk", "Risk"]].forEach(([m, lab]) => el("button", { class: state.mode === m ? "on" : "", text: lab, "aria-pressed": state.mode === m ? "true" : "false",
      "data-tip": m === "count" ? "Size each unit by number of open findings" : "Size each unit by risk points",
      on: { click: () => { state.mode = m; tg.querySelectorAll("button").forEach(b => { b.classList.toggle("on", b.textContent === lab); b.setAttribute("aria-pressed", b.textContent === lab); }); layoutMap(); log("Map sized by " + lab.toLowerCase()); } } }, tg));
    cardHead(left, "Business units", "Each tile is a business unit. Toggle Count and Risk to compare how many findings each unit has with how much risk they carry.", tg);
    const chips = el("div", { class: "chips", style: "margin-bottom:6px" }, left);
    ["all"].concat(Object.keys(D.CLOUDS)).forEach(c => {
      const n = openList(null, c).length;
      el("button", { class: "chip" + (state.cloud === c ? " on" : ""), "data-tip": c === "all" ? "All five clouds" : D.CLOUDS[c].name + " only",
        html: (c !== "all" ? "<span class='dot' style='background:" + D.CLOUDS[c].color + "'></span>" : "") + (c === "all" ? "All clouds" : D.CLOUDS[c].name) + "<span class='c'>" + n + "</span>",
        on: { click: e => { state.cloud = c; chips.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); e.currentTarget.classList.add("on"); layoutMap(); log("Map filtered to " + (c === "all" ? "all clouds" : D.CLOUDS[c].name)); } } }, chips);
    });
    const map = el("div", { class: "tmap", id: "tmap" }, left);
    UNITS.forEach(u => {
      const t = el("div", { class: "tile", id: "tile-" + u.id, tabindex: 0, role: "button", on: { click: () => { state.unit = u.id; setView("units"); }, keydown: e => { if (e.key === "Enter") { state.unit = u.id; setView("units"); } } } }, map);
      el("div", { class: "heat" }, t);
      const i = el("div", { class: "in" }, t);
      el("div", { class: "nm", text: u.name }, i); el("div", { class: "big" }, i); el("div", { class: "unit" }, i); el("span", { class: "flag" }, t);
      el("div", { class: "bands" }, i);
    });
    el("div", { class: "legend", style: "margin-top:12px", html: BANDS.map(b => "<span><i style='background:" + BANDC[b] + "'></i>" + b + "</span>").join("") + "<span style='margin-left:auto'>Bar = findings by band · click a tile to open the unit</span>" }, left);

    const right = el("div", { class: "col" }, g);
    const ai = el("div", { class: "card pad" }, right);
    cardHead(ai, "What stands out", null, simTag("Found by simulated AI from the findings, tags, and history. Hover any item for the reasoning."));
    insights().forEach((x, i) => {
      const b = el("button", { class: "insight" + (x.g ? " g" : ""), style: "animation-delay:" + (.1 + i * .07) + "s", "data-tip": x.tip, on: { click: x.go } }, ai);
      el("div", { class: "n", text: x.n }, b); const tx = el("div", null, b); el("div", { class: "t", text: x.t }, tx); el("div", { class: "d", text: x.d }, tx);
    });
    const cl = el("div", { class: "card pad" }, right);
    cardHead(cl, "Risk by cloud", "Open risk points by cloud provider");
    const byC = Object.keys(D.CLOUDS).map(c => ({ c, r: sum(open.filter(f => f.cloud === c), f => f.score) })).sort((a, b) => b.r - a.r), mx = byC[0].r || 1;
    byC.forEach((x, i) => { const r = el("div", { class: "hbar", tabindex: 0, "data-tip": D.CLOUDS[x.c].name + " · " + num(x.r) + " risk points · " + pl(open.filter(f => f.cloud === x.c).length, "finding", "findings") }, cl);
      el("div", { class: "lab", text: D.CLOUDS[x.c].name }, r); const tr = el("div", { class: "track" }, r); el("span", { style: "width:" + (x.r / mx * 100) + "%;background:" + D.CLOUDS[x.c].color + ";animation-delay:" + i * .06 + "s" }, tr); el("div", { class: "num", text: num(x.r) }, r); });
    requestAnimationFrame(layoutMap);
  }
  function squarify(items, x, y, w, h) {
    const out = [], total = sum(items, i => i.v) || 1, rest = items.map(i => Object.assign({}, i, { a: i.v / total * w * h }));
    const worst = (row, len) => { const s = sum(row, r => r.a), mx = Math.max(...row.map(r => r.a)), mn = Math.min(...row.map(r => r.a)); return Math.max(len * len * mx / (s * s), (s * s) / (len * len * mn)); };
    function place(row) {
      const s = sum(row, r => r.a);
      if (w >= h) { const cw = s / h; let cy = y; row.forEach(r => { const rh = r.a / cw; out.push(Object.assign(r, { x, y: cy, w: cw, h: rh })); cy += rh; }); x += cw; w -= cw; }
      else { const rh = s / w; let cx = x; row.forEach(r => { const rw = r.a / rh; out.push(Object.assign(r, { x: cx, y, w: rw, h: rh })); cx += rw; }); y += rh; h -= rh; }
    }
    let row = [];
    while (rest.length) { const len = Math.min(w, h), c = rest[0]; if (!row.length || worst(row.concat(c), len) <= worst(row, len)) { row.push(c); rest.shift(); } else { place(row); row = []; } }
    if (row.length) place(row);
    return out;
  }
  function layoutMap() {
    const map = $("tmap"); if (!map) return;
    const W = map.clientWidth, H = map.clientHeight, open = openList(null, state.cloud), gap = 5;
    const items = UNITS.map(u => { const l = open.filter(f => f.bu === u.id); return { u, l, n: l.length, r: sum(l, f => f.score), v: state.mode === "count" ? l.length : sum(l, f => f.score) }; });
    const vis = items.filter(i => i.v > 0).sort((a, b) => b.v - a.v);
    const rects = squarify(vis, 0, 0, W, H);
    const topId = vis.length ? vis[0].u.id : null;
    items.forEach(it => {
      const t = $("tile-" + it.u.id), rc = rects.find(r => r.u.id === it.u.id);
      if (!rc) { t.style.opacity = 0; t.style.pointerEvents = "none"; t.style.width = "0px"; t.style.height = "0px"; return; }
      t.style.opacity = 1; t.style.pointerEvents = "";
      t.style.left = (rc.x + gap / 2) + "px"; t.style.top = (rc.y + gap / 2) + "px"; t.style.width = Math.max(0, rc.w - gap) + "px"; t.style.height = Math.max(0, rc.h - gap) + "px";
      t.classList.toggle("sm", rc.w < 190 || rc.h < 120); t.classList.toggle("xs", rc.w < 110 || rc.h < 70);
      t.classList.toggle("top", it.u.id === topId && state.mode === "risk");
      const worst = BANDS.find(b => it.l.some(f => f.band === b)) || "Low";
      t.querySelector(".heat").style.background = "radial-gradient(120% 120% at 0% 0%, " + BANDC[worst] + (state.mode === "risk" ? "40" : "22") + ", transparent 65%)";
      t.querySelector(".big").textContent = state.mode === "count" ? num(it.n) : num(it.r);
      t.querySelector(".unit").textContent = state.mode === "count" ? (it.n === 1 ? "open finding" : "open findings") + " · " + num(it.r) + " pts" : "risk points · " + pl(it.n, "finding", "findings");
      const fl = t.querySelector(".flag"); fl.style.display = it.u.id === topId ? "" : "none"; fl.textContent = state.mode === "count" ? "Most findings" : "Most risk"; fl.className = "flag" + (state.mode === "count" ? " alt" : "");
      const bands = t.querySelector(".bands"); bands.innerHTML = "";
      BANDS.forEach(b => { const n = it.l.filter(f => f.band === b).length; if (n) el("span", { style: "width:" + (n / it.n * 100) + "%;background:" + BANDC[b] }, bands); });
      const crit = it.l.filter(f => f.band === "Critical").length;
      t.setAttribute("data-tip", it.u.name + " · " + pl(it.n, "open finding", "open findings") + " · " + num(it.r) + " risk points · " + pl(crit, "critical", "criticals") + (it.u.id === "UNM" ? " · accounts with no business unit tag" : " · owner " + it.u.owner));
      t.setAttribute("aria-label", t.getAttribute("data-tip"));
    });
  }
  addEventListener("resize", () => { if (state && state.view === "overview") layoutMap(); moveSeg(); });

  // ---------- Units ----------
  function renderUnits(v) {
    const chips = el("div", { class: "chips", style: "margin-bottom:14px" }, v);
    UNITS.forEach(u => el("button", { class: "chip" + (state.unit === u.id ? " on" : ""), "data-tip": u.id === "UNM" ? "Accounts with no business unit tag" : "Owner " + u.owner,
      html: esc(u.name) + "<span class='c'>" + num(unitRisk(null, u.id)) + "</span>", on: { click: () => { state.unit = u.id; render(); } } }, chips));
    const u = unit(state.unit), list = openList().filter(f => f.bu === u.id), ff = fixFirst(list), red = sum(verified().filter(f => f.bu === u.id), f => f.score);
    const h = el("div", { class: "card unit-head" }, v);
    const a = el("div", null, h); el("div", { class: "nm", text: u.name }, a);
    el("div", { class: "meta", text: u.id === "UNM" ? "No business unit tag · cloud platform lead decides" : u.owner + " · " + u.ownerRole }, a);
    el("div", { class: "meta", text: u.id === "UNM" ? "Assign an owner first" : u.app + " · tier " + u.tier + (u.rev ? " · $" + u.rev + "K/hr" : ""), "data-tip": u.id === "UNM" ? "Nobody can claim these until the cloud platform lead assigns the account" : u.app + " · tier " + u.tier + (u.rev ? " · $" + u.rev + "K revenue per hour" : "") + " · holds " + u.data + " · from the CMDB and the unit roster" }, a);
    [["Open risk", num(ff.total), "Sum of open finding scores", PINK], ["Findings", num(list.length), "Open findings in this unit"], ["Overdue", num(list.filter(overdue).length), "Past the fix-time target for the band (tier " + u.tier + ": Critical " + D.SLA[u.tier].Critical + " days, High " + D.SLA[u.tier].High + ", Medium " + D.SLA[u.tier].Medium + ", Low " + D.SLA[u.tier].Low + ")"],
      ["Removed", num(red), "Risk points removed by verified fixes in 90 days", GOOD]].forEach(([k, val, t, c]) => {
      const d = el("div", { tabindex: 0, "data-tip": t }, h); el("div", { class: "eyebrow", text: k }, d); el("div", { class: "v", text: val, style: c ? "color:" + c : "" }, d); });

    const row = el("div", { class: "row2" }, v);
    const cv = el("div", { class: "card pad" }, row);
    cardHead(cv, "Fix-first curve", "Open findings ranked by risk removed per hour of work. The curve shows how fast the unit's risk falls as fixes land.", list.length ? el("span", { class: "tag", "data-tip": "Effort estimates come from simulated AI and the fix type", text: "simulated effort" }) : null);
    if (!list.length) el("div", { class: "note", text: "No open findings. Nothing to fix here right now." }, cv); else curve(cv, ff);
    const side = el("div", { class: "col" }, row);
    const cc = el("div", { class: "card pad" }, side); cardHead(cc, "Risk by cloud", "Open risk points in this unit by cloud provider");
    const byC = Object.keys(D.CLOUDS).map(c => ({ c, r: sum(list.filter(f => f.cloud === c), f => f.score), n: list.filter(f => f.cloud === c).length })).filter(x => x.n), mx = Math.max(1, ...byC.map(x => x.r));
    if (!byC.length) el("div", { class: "note", text: "No open findings." }, cc);
    byC.forEach((x, i) => { const r = el("div", { class: "hbar", tabindex: 0, "data-tip": D.CLOUDS[x.c].name + " · " + pl(x.n, "finding", "findings") + " · " + num(x.r) + " pts" }, cc);
      el("div", { class: "lab", text: D.CLOUDS[x.c].name }, r); const tr = el("div", { class: "track" }, r); el("span", { style: "width:" + (x.r / mx * 100) + "%;background:" + D.CLOUDS[x.c].color + ";animation-delay:" + i * .05 + "s" }, tr); el("div", { class: "num", text: num(x.r) }, r); });
    const bc = el("div", { class: "card pad" }, side); cardHead(bc, "By band", "Open findings by risk band");
    BANDS.forEach((b, i) => { const n = list.filter(f => f.band === b).length; const r = el("div", { class: "hbar", tabindex: 0, "data-tip": b + ": " + pl(n, "finding", "findings") }, bc);
      el("div", { class: "lab", text: b }, r); const tr = el("div", { class: "track" }, r); el("span", { style: "width:" + (list.length ? n / list.length * 100 : 0) + "%;background:" + BANDC[b] + ";animation-delay:" + i * .05 + "s" }, tr); el("div", { class: "num", text: n }, r); });

    const lc = el("div", { class: "card pad", style: "margin-top:16px" }, v);
    cardHead(lc, "Fix in this order", "Same ranking as the curve: risk removed per hour of work, highest first");
    const fl = el("div", { class: "flist" }, lc);
    ff.sorted.forEach((f, i) => {
      const b = el("button", { class: "frow", on: { click: () => openFinding(f.id) }, style: i < ff.k ? "background:rgba(255,46,136,.06)" : "" }, fl);
      el("span", { class: "rk", text: "#" + (i + 1) }, b); scoreChip(f, b);
      const t = el("span", { class: "ti" }, b); el("b", { text: f.title }, t); el("span", { text: f.resource + " · " + f.account }, t);
      cloudChip(f.cloud, b); el("span", { class: "pillx", text: f.effort + "h", "data-tip": "Estimated effort: " + pl(f.effort, "hour", "hours") }, b);
      el("span", { class: "st", text: STATUS[f.status] + (overdue(f) ? " · late" : ""), style: overdue(f) ? "color:var(--accent)" : "" }, b);
    });
  }
  function curve(p, ff) {
    const W = 640, H = 270, L = 44, R = 16, T = 16, B = 34, svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, class: "chart", role: "img", "aria-label": "Fix-first curve" }, p);
    const X = h => L + h / ff.hours * (W - L - R), Y = pc => T + (1 - pc / 100) * (H - T - B);
    [0, 25, 50, 75, 100].forEach(g => { el("svg:line", { x1: L, x2: W - R, y1: Y(g), y2: Y(g), class: "gridl" }, svg); el("svg:text", { x: L - 8, y: Y(g) + 4, "text-anchor": "end", text: g + "%" }, svg); });
    [0, .25, .5, .75, 1].forEach(t => el("svg:text", { x: X(ff.hours * t), y: H - 12, "text-anchor": "middle", text: Math.round(ff.hours * t) + "h" }, svg));
    el("svg:text", { x: W - R, y: H - 0, "text-anchor": "end", text: "hours of work →" }, svg);
    const d = "M" + X(0) + "," + Y(0) + " " + ff.pts.map(pt => "L" + X(pt.hrs).toFixed(1) + "," + Y(pt.p).toFixed(1)).join(" ");
    const defs = el("svg:defs", null, svg), gr = el("svg:linearGradient", { id: "cg", x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    el("svg:stop", { offset: "0", "stop-color": PINK, "stop-opacity": .35 }, gr); el("svg:stop", { offset: "1", "stop-color": PINK, "stop-opacity": 0 }, gr);
    el("svg:path", { d: d + " L" + X(ff.hours) + "," + Y(0) + " Z", fill: "url(#cg)" }, svg);
    el("svg:path", { d, fill: "none", stroke: PINK, "stroke-width": 2.5, class: "draw" }, svg);
    if (ff.k) {
      const kx = X(ff.kh), ky = Y(ff.kp);
      el("svg:line", { x1: kx, x2: kx, y1: ky, y2: Y(0), stroke: GOOD, "stroke-dasharray": "4 4" }, svg);
      el("svg:line", { x1: L, x2: kx, y1: ky, y2: ky, stroke: GOOD, "stroke-dasharray": "4 4" }, svg);
      el("svg:circle", { cx: kx, cy: ky, r: 7, fill: GOOD, style: "filter:drop-shadow(0 0 8px rgba(198,255,61,.8))" }, svg);
      const lx = Math.min(kx + 14, W - 230);
      el("svg:text", { x: lx, y: ky + (ky > H / 2 ? -34 : 24), style: "fill:#F5F5F7;font-size:15px;font-weight:700", text: pl(ff.k, "fix", "fixes") + " · " + pl(ff.kh, "hour", "hours") }, svg);
      el("svg:text", { x: lx, y: ky + (ky > H / 2 ? -16 : 42), style: "fill:" + GOOD + ";font-size:13px", text: "remove " + ff.kp + "% of the risk" }, svg);
    }
    ff.pts.forEach((pt, i) => { if (i > 40) return;
      el("svg:circle", { cx: X(pt.hrs), cy: Y(pt.p), r: i < ff.k ? 5 : 3.5, fill: BANDC[pt.f.band], stroke: "#0A0A0F", "stroke-width": 1.5, tabindex: 0, style: "cursor:pointer",
        "data-tip": "#" + (i + 1) + " " + pt.f.title + " · score " + pt.f.score + " · " + pt.f.effort + "h · total " + Math.round(pt.p) + "%", on: { click: () => openFinding(pt.f.id) } }, svg); });
  }

  // ---------- Fix board ----------
  function renderBoard(v, hr) {
    const b = state.board, f = el("div", { class: "chips", style: "margin-bottom:10px" }, v);
    [["all", "All units"]].concat(UNITS.map(u => [u.id, u.name])).forEach(([id, lab]) => el("button", { class: "chip" + (b.unit === id ? " on" : ""), text: lab, "data-tip": id === "all" ? "Every unit" : "Only " + lab, on: { click: () => { b.unit = id; b.limit = {}; render(); } } }, f));
    const f2 = el("div", { class: "chips", style: "margin-bottom:14px" }, v);
    el("button", { class: "chip" + (b.mine ? " on" : ""), text: "Mine", "data-tip": "Only findings assigned to " + me().name, on: { click: () => { b.mine = !b.mine; render(); } } }, f2);
    el("span", { style: "width:10px" }, f2);
    [["all", "All types"], ["misconfig", "Misconfig"], ["vuln", "Vulnerability"]].forEach(([id, lab]) => el("button", { class: "chip" + (b.kind === id ? " on" : ""), text: lab, on: { click: () => { b.kind = id; render(); } } }, f2));
    el("span", { style: "width:10px" }, f2);
    ["all"].concat(BANDS).forEach(id => el("button", { class: "chip" + (b.band === id ? " on" : ""), html: (id !== "all" ? "<span class='dot' style='background:" + BANDC[id] + "'></span>" : "") + (id === "all" ? "All bands" : id), on: { click: () => { b.band = id; render(); } } }, f2));

    const match = x => (b.unit === "all" || x.bu === b.unit) && (!b.mine || x.assignee === state.persona) && (b.kind === "all" || x.kind === b.kind) && (b.band === "all" || x.band === b.band);
    const all = state.findings.filter(match);
    const cols = [
      { id: "todo", lab: "To do", c: "#6B6B80", list: all.filter(x => x.status === "todo" || x.status === "pendingAccept").sort((a, c) => c.score - a.score) },
      { id: "progress", lab: "In progress", c: "#9D7BFF", list: all.filter(x => x.status === "progress").sort((a, c) => c.score - a.score) },
      { id: "review", lab: "In review", c: "#FFB13D", list: all.filter(x => x.status === "review").sort((a, c) => c.score - a.score) },
      { id: "verified", lab: "Verified", c: GOOD, list: all.filter(x => x.status === "verified").sort((a, c) => (c.verifiedAt > a.verifiedAt ? 1 : c.verifiedAt < a.verifiedAt ? -1 : c.score - a.score)) }
    ];
    const acc = all.filter(x => x.status === "accepted");
    const board = el("div", { class: "board" }, v);
    cols.forEach(col => {
      const c = el("div", { class: "card colm" }, board), h = el("div", { class: "colm-h" }, c);
      el("b", { text: col.lab }, h); el("span", { class: "bar-l", style: "background:" + col.c }, h);
      el("span", { class: "c", text: col.id === "verified" ? num(sum(col.list, x => x.score)) + " pts · " + num(col.list.length) : num(col.list.length), "data-tip": col.id === "verified" ? "Risk points removed and fixes verified in 90 days" : pl(col.list.length, "finding", "findings") }, h);
      const cards = el("div", { class: "cards" }, c), lim = b.limit[col.id] || 25;
      if (!col.list.length) el("div", { class: "note", text: col.id === "review" ? "Nothing waiting for review." : col.id === "progress" ? "Nothing claimed yet." : "Nothing here." }, cards);
      col.list.slice(0, lim).forEach((x, i) => card(cards, x, i));
      if (col.list.length > lim) el("button", { class: "more", text: "Show " + pl(Math.min(25, col.list.length - lim), "more", "more"), on: { click: () => { b.limit[col.id] = lim + 25; render(); } } }, cards);
    });
    if (acc.length) el("div", { class: "note", style: "margin-top:12px", text: pl(acc.length, "finding has", "findings have") + " owner-accepted risk. Accepted risk isn't counted as open or as removed.", "data-tip": acc.map(x => x.id + " until " + fmt(x.acceptedUntil)).join(" · ") }, v);
  }
  function card(p, f, i) {
    const c = el("div", { class: "fcard", id: "card-" + f.id, tabindex: 0, role: "button", style: "--bandc:" + BANDC[f.band] + ";animation-delay:" + Math.min(i, 12) * .02 + "s",
      on: { click: () => openFinding(f.id), keydown: e => { if (e.key === "Enter") openFinding(f.id); } } }, p);
    const top = el("div", { class: "top" }, c); scoreChip(f, top);
    const r = el("div", { style: "display:flex;gap:6px;align-items:center" }, top); cloudChip(f.cloud, r);
    el("span", { class: "pillx", text: unit(f.bu).id, "data-tip": unit(f.bu).name }, r);
    el("div", { class: "ttl", text: f.title }, c); el("div", { class: "res", text: f.resource, "data-tip": f.resource + " · " + f.account }, c);
    const bot = el("div", { class: "bot" }, c);
    if (f.assignee) el("span", { class: "av" + (f.assignee === state.persona ? " me" : ""), text: initials(person(f.assignee).name), "data-tip": (f.status === "verified" ? "Fixed by " : "Assigned to ") + person(f.assignee).name }, bot);
    if (f.status === "verified") el("span", { class: "pillx ok", text: "−" + f.score + " · " + fmt(f.verifiedAt), "data-tip": "Verified by rescan on " + fmt(f.verifiedAt) }, bot);
    else if (overdue(f)) el("span", { class: "pillx late", text: Math.abs(diff(due(f), D.TODAY)) + "d late", "data-tip": "Due " + fmt(due(f)) + " (" + sla(f) + "-day target for " + f.band + ")" }, bot);
    else el("span", { class: "pillx", text: "due " + fmt(due(f)), "data-tip": sla(f) + "-day target for " + f.band + " in " + unit(f.bu).name }, bot);
    if (f.rootCause) el("span", { class: "pillx root", text: "shared cause", "data-tip": f.rootCause }, bot);
    if (f.status === "pendingAccept") el("span", { class: "pillx root", text: "pending owner", "data-tip": "Waiting for " + unit(f.bu).owner + " to accept the risk" }, bot);
    if (f.status === "review" && f.approvedBy) el("span", { class: "pillx ok", text: "approved", "data-tip": "Approved by " + person(f.approvedBy).name }, bot);
    if (f.note && f.status === "todo") el("span", { class: "pillx late", text: "rescan failed", "data-tip": f.note }, bot);
    const q = quick(f); if (q) { const bt = el("button", { class: "btn sm " + (q.cls || ""), text: q.lab, style: "margin-left:auto", "data-tip": q.tip }, bot); bt.addEventListener("click", e => { e.stopPropagation(); q.fn(bt); }); }
  }
  function quick(f) {
    const p = me();
    if (f.status === "todo" && p.type === "eng" && p.bu === f.bu) return { lab: "Claim", tip: "Assign this to " + p.name, fn: () => run(f, "claim") };
    if (f.status === "progress" && f.assignee === state.persona) return { lab: "Submit", tip: "Submit the fix for review", fn: () => run(f, "submit") };
    if (f.status === "review" && !f.approvedBy && p.type === "eng" && p.bu === f.bu && f.fixer !== state.persona) return { lab: "Approve", cls: "go", tip: "Approve " + person(f.fixer).name + "'s fix", fn: () => run(f, "approve") };
    if (f.status === "review" && f.approvedBy) return { lab: "Rescan", cls: "pri", tip: "Ask the scanner to confirm the fix", fn: b => { b.disabled = true; b.textContent = "Scanning…"; setTimeout(() => run(f, "rescan", null, b), 900); } };
    return null;
  }

  // ---------- Reduced ----------
  function renderReduced(v, hr) {
    const tr = trend(), vf = verified(), red = sum(vf, f => f.score), drop = tr[0].open ? Math.round((1 - tr[tr.length - 1].open / tr[0].open) * 100) : 0;
    const mine = vf.filter(f => f.fixer === state.persona || f.assignee === state.persona);
    const k = el("div", { class: "kpis" }, v);
    kpi(k, "Removed", num(red), "risk points in 90 days", "good", "Sum of scores of findings verified fixed since " + fmt(D.WINDOW_START), 0);
    kpi(k, "Fixes", num(vf.length), "verified by rescan", "", "A fix counts only after a rescan stops seeing the finding", 1);
    kpi(k, "Open risk", (drop >= 0 ? "−" : "+") + Math.abs(drop) + "%", "since " + fmt(tr[0].d), drop > 0 ? "good" : "", "Open risk went from " + num(tr[0].open) + " to " + num(tr[tr.length - 1].open) + " points, even as new findings arrived", 2);
    kpi(k, "Hours", num(sum(vf, f => f.effort)), "of engineering work", "", "Estimated effort behind the verified fixes", 3);
    kpi(k, "Your fixes", num(mine.length), pl(sum(mine, f => f.score), "point", "points") + " · " + me().name.split(" ")[0], "", "Verified fixes by the person you're viewing as", 4);

    const c = el("div", { class: "card pad" }, v);
    const play = el("button", { class: "btn pri", text: "Play 90 days", "data-tip": "Replay the last 90 days of fixes" });
    cardHead(c, "Open risk vs risk removed", "Pink: open risk points each day. Green bars: points removed that day. Green line: total removed since " + fmt(tr[0].d) + ".", play);
    const W = 1200, H = 330, L = 56, R = 64, T = 30, B = 34;
    const svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, class: "chart", role: "img", "aria-label": "Open risk and risk removed over 90 days" }, c);
    const nice = x => { const raw = x / 4, m = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(v => v * m).find(v => v >= raw); return st * 4; };
    const mo = nice(Math.max(...tr.map(t => t.open)) * 1.02), mc = nice(Math.max(1, tr[tr.length - 1].cum) * 1.02), md = Math.max(1, ...tr.map(t => t.removed));
    const X = i => L + i / (tr.length - 1) * (W - L - R), Y = val => T + (1 - val / mo) * (H - T - B), YC = val => T + (1 - val / mc) * (H - T - B);
    [0, .25, .5, .75, 1].forEach(g => { el("svg:line", { x1: L, x2: W - R, y1: Y(mo * g), y2: Y(mo * g), class: "gridl" }, svg); el("svg:text", { x: L - 8, y: Y(mo * g) + 4, "text-anchor": "end", text: num(mo * g) }, svg); el("svg:text", { x: W - R + 8, y: YC(mc * g) + 4, text: num(mc * g), style: "fill:" + GOOD }, svg); });
    tr.forEach((t, i) => { if (i % 15 === 0 || i === tr.length - 1) el("svg:text", { x: X(i), y: H - 10, "text-anchor": "middle", text: fmt(t.d) }, svg); });
    const defs = el("svg:defs", null, svg), gr = el("svg:linearGradient", { id: "og", x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    el("svg:stop", { offset: "0", "stop-color": PINK, "stop-opacity": .35 }, gr); el("svg:stop", { offset: "1", "stop-color": PINK, "stop-opacity": 0 }, gr);
    const clip = el("svg:clipPath", { id: "clip" }, defs), cr = el("svg:rect", { x: 0, y: 0, width: W, height: H }, clip);
    const g = el("svg:g", { "clip-path": "url(#clip)" }, svg);
    tr.forEach((t, i) => { if (t.removed) el("svg:rect", { x: X(i) - 4, width: 8, y: H - B - t.removed / md * 70, height: t.removed / md * 70, rx: 2, fill: GOOD, opacity: .55 }, g); });
    const od = tr.map((t, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(t.open).toFixed(1)).join(" ");
    el("svg:path", { d: od + " L" + X(tr.length - 1) + "," + (H - B) + " L" + X(0) + "," + (H - B) + " Z", fill: "url(#og)" }, g);
    el("svg:path", { d: od, fill: "none", stroke: PINK, "stroke-width": 3 }, g);
    el("svg:path", { d: tr.map((t, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + YC(t.cum).toFixed(1)).join(" "), fill: "none", stroke: GOOD, "stroke-width": 3 }, g);
    const cursor = el("svg:line", { x1: X(tr.length - 1), x2: X(tr.length - 1), y1: T - 10, y2: H - B, stroke: "#F5F5F7", "stroke-dasharray": "3 4", opacity: .7 }, svg);
    const lab = el("svg:text", { x: X(tr.length - 1) - 8, y: T - 12, "text-anchor": "end", style: "fill:#F5F5F7;font-size:13px;font-weight:700", text: fmt(tr[tr.length - 1].d) + " · " + num(tr[tr.length - 1].open) + " open · " + num(tr[tr.length - 1].cum) + " removed" }, svg);
    // hover targets
    tr.forEach((t, i) => el("svg:rect", { x: X(i) - 6, y: T, width: 12, height: H - T - B, fill: "transparent", "data-tip": fmt(t.d) + " · open " + num(t.open) + " pts · removed " + num(t.removed) + " that day · " + num(t.cum) + " total" }, svg));
    el("div", { class: "legend", style: "margin-top:4px", html: "<span><i style='background:" + PINK + "'></i>Open risk (left axis)</span><span><i style='background:" + GOOD + "'></i>Removed, total (right axis)</span><span><i style='background:" + GOOD + ";opacity:.55'></i>Removed that day</span>" }, c);
    play.addEventListener("click", () => {
      play.disabled = true; const dur = 4200, st = performance.now(); log("Replayed 90 days of fixes");
      function step(now) {
        const k = Math.min(1, (now - st) / dur), i = Math.round(k * (tr.length - 1));
        cr.setAttribute("width", X(i) + 2); cursor.setAttribute("x1", X(i)); cursor.setAttribute("x2", X(i));
        lab.setAttribute("x", Math.max(L + 300, X(i) - 8)); lab.textContent = fmt(tr[i].d) + " · " + num(tr[i].open) + " open · " + num(tr[i].cum) + " removed";
        if (k < 1) requestAnimationFrame(step); else play.disabled = false;
      }
      requestAnimationFrame(step);
    });

    const row = el("div", { class: "row2", style: "margin-top:16px" }, v);
    const bu = el("div", { class: "card pad" }, row);
    cardHead(bu, "Removed by unit", "Green: risk points each unit's engineers removed in 90 days. Pink: what's still open.");
    const data = UNITS.map(u => ({ u, r: sum(vf.filter(f => f.bu === u.id), f => f.score), o: unitRisk(null, u.id), n: vf.filter(f => f.bu === u.id).length })).sort((a, b) => b.r - a.r);
    const mx = Math.max(...data.map(d => d.r + d.o));
    data.forEach((d, i) => { const r = el("div", { class: "hbar", style: "grid-template-columns:150px minmax(0,1fr) 110px", tabindex: 0, "data-tip": d.u.name + " · removed " + num(d.r) + " pts with " + pl(d.n, "fix", "fixes") + " · " + num(d.o) + " pts still open" }, bu);
      el("div", { class: "lab", text: d.u.name }, r); const t = el("div", { class: "track" }, r);
      el("span", { style: "width:" + (d.r / mx * 100) + "%;background:" + GOOD + ";animation-delay:" + i * .05 + "s" }, t); el("span", { style: "width:" + (d.o / mx * 100) + "%;background:" + PINK + ";opacity:.6;animation-delay:" + i * .05 + "s" }, t);
      el("div", { class: "num", html: "<span style='color:" + GOOD + "'>" + num(d.r) + "</span> / " + num(d.o) }, r); });
    const yc = el("div", { class: "card pad" }, row);
    cardHead(yc, "Credit where it's due", "Verified fixes by the people on the selected unit. Shown to recognize the work, not to rank people.");
    const u = me().type === "eng" ? me().bu : (me().type === "owner" ? me().bu : "PAY");
    el("div", { class: "eyebrow", text: unit(u).name + " team", style: "margin-bottom:6px" }, yc);
    D.PEOPLE.filter(p => p.bu === u).forEach(p => {
      const l = vf.filter(f => f.fixer === p.id || (f.assignee === p.id && !f.fixer)), pts = sum(l, f => f.score);
      const r = el("div", { style: "display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)" }, yc);
      el("span", { class: "av" + (p.id === state.persona ? " me" : ""), text: initials(p.name) }, r);
      const t = el("div", { style: "flex:1;min-width:0" }, r); el("div", { text: p.name, style: "font-weight:600;font-size:14px" }, t); el("div", { text: p.role, style: "font-size:12px;color:var(--muted)" }, t);
      el("div", { class: "mono", style: "text-align:right;font-size:13px", html: "<b style='color:" + GOOD + "'>−" + num(pts) + "</b> pts<br><span style='color:var(--muted);font-size:11px'>" + pl(l.length, "fix", "fixes") + "</span>" }, r);
    });
    const today = vf.filter(f => f.verifiedAt === D.TODAY);
    el("div", { class: "note", style: "margin-top:12px", text: today.length ? pl(today.length, "fix", "fixes") + " verified today: −" + num(sum(today, f => f.score)) + " points." : "No fixes verified today yet. Try one from the Fix board." }, yc);
  }

  // ---------- Sources ----------
  function renderSources(v, hr) {
    const tg = el("button", { class: "tool", "aria-pressed": state.generic ? "true" : "false", text: "Generic names", "data-tip": "Swap product names for generic tool categories",
      on: { click: () => { state.generic = !state.generic; log("Source names: " + (state.generic ? "generic" : "product")); render(); } } }, hr);
    const open = openList(), raw = sum(open, f => f.sources.length);
    const k = el("div", { class: "kpis" }, v);
    kpi(k, "Tool findings", num(raw), "raw, open", "", "Open findings as the tools reported them, before dedupe", 0);
    kpi(k, "Unique", num(open.length), pl(raw - open.length, "duplicate removed", "duplicates removed"), "good", "Same resource and same issue from two tools counts once", 1);
    kpi(k, "Accounts", num(D.ACCOUNTS.length), "accounts, subscriptions, projects", "", "Across 5 cloud providers", 2);
    kpi(k, "Unmapped", num(D.ACCOUNTS.filter(a => !state.findings.some(f => f.account === a.id && f.bu !== "UNM") && state.findings.some(f => f.account === a.id)).length), "accounts with no owner", "hot", "No business unit tag in the cloud or the CMDB", 3);
    kpi(k, "Coverage gap", "1", "cloud with no CSPM", "", "Alibaba Cloud is seen only by its native tool and Tenable", 4);

    const c = el("div", { class: "card pad" }, v);
    cardHead(c, "From cloud to owner", "Left to right: where findings live, which tools report them, dedupe, and the business unit that owns the fix. Line width = open findings.", simTag("Dedupe and business unit mapping are simulated AI over tags and the CMDB"));
    flow(c, open);

    const row = el("div", { class: "row2", style: "margin-top:16px" }, v);
    const cv = el("div", { class: "card pad" }, row); cardHead(cv, "Coverage", "Which tool scans which cloud. A gap means findings there depend on fewer tools.");
    const tb = el("table", { class: "cov" }, cv), hd = el("tr", null, el("thead", null, tb)); el("th", { text: "Tool" }, hd);
    Object.values(D.CLOUDS).forEach(cl => el("th", { text: cl.short, "data-tip": cl.name }, hd));
    const bd = el("tbody", null, tb);
    D.SOURCES.forEach(s => { const r = el("tr", null, bd); el("td", { text: srcName(s.id), "data-tip": s.kind }, r);
      Object.keys(D.CLOUDS).forEach(cl => { const yes = s.covers.includes(cl), gap = !yes && s.id === "cspm" && cl === "alibaba";
        el("td", { class: yes ? "y" : gap ? "gap" : "n", text: yes ? "●" : gap ? "gap" : "·", "data-tip": yes ? srcName(s.id) + " scans " + D.CLOUDS[cl].name : gap ? "No CSPM coverage for Alibaba Cloud" : "Not applicable" }, r); }); });
    const cx = el("div", { class: "card pad" }, row); cardHead(cx, "Business context", "Data no security tool has, added on top");
    D.CONTEXT.forEach(x => { const r = el("div", { style: "display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)" }, cx);
      el("span", { style: "width:10px;height:10px;border-radius:3px;background:" + GOOD + ";box-shadow:0 0 10px rgba(198,255,61,.6);flex:0 0 10px" }, r);
      const t = el("div", null, r); el("div", { text: x.name, style: "font-weight:700;font-size:14px" }, t); el("div", { text: x.t, style: "font-size:12px;color:var(--muted)" }, t); });
  }
  function flow(p, open) {
    const W = 1200, H = 440, svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, class: "chart", role: "img", "aria-label": "Flow of findings from clouds to tools to business units" }, p);
    const cols = [40, 420, 800, 1000], nw = 14, top = 24, usable = H - 48, minSlot = 40;
    const clouds = Object.keys(D.CLOUDS), tools = D.SOURCES.map(s => s.id), units = UNITS.map(u => u.id);
    const l1 = {}, cnt = {};
    open.forEach(f => f.sources.forEach(s => { l1[f.cloud + "|" + s] = (l1[f.cloud + "|" + s] || 0) + 1; }));
    const raw = sum(open, f => f.sources.length), uniq = open.length;
    const cv = c => sum(Object.keys(l1).filter(x => x.startsWith(c + "|")), x => l1[x]);
    const tv = t => sum(Object.keys(l1).filter(x => x.endsWith("|" + t)), x => l1[x]);
    const uv = u => open.filter(f => f.bu === u).length;
    const k = usable * 0.52 / raw;
    // Each node gets a slot of at least minSlot so labels never collide; spare space spreads evenly.
    function stack(ids, val, x, kk) {
      const hs = ids.map(id => Math.max(2, val(id) * kk)), slots = hs.map(h => Math.max(h, minSlot));
      const gp = Math.max(4, (usable - sum(slots, s => s)) / Math.max(1, ids.length - 1)); let y = top; const o = {};
      ids.forEach((id, i) => { o[id] = { x, y, h: hs[i], off: 0, offIn: 0 }; y += slots[i] + gp; }); return o;
    }
    const nc = stack(clouds, cv, cols[0], k), nt = stack(tools, tv, cols[1], k), nu = stack(units, uv, cols[3], k);
    const ndH = raw * k, nd = { x: cols[2], y: top + (usable - ndH) / 2, h: ndH, off: 0, offIn: 0 };
    const link = (a, b, w, color, tipT) => {
      const y1 = a.y + a.off + w / 2, y2 = b.y + b.offIn + w / 2; a.off += w; b.offIn += w;
      const x1 = a.x + nw, x2 = b.x, mx = (x1 + x2) / 2, d = "M" + x1 + "," + y1 + " C" + mx + "," + y1 + " " + mx + "," + y2 + " " + x2 + "," + y2;
      el("svg:path", { d, class: "flow", stroke: color, "stroke-width": Math.max(1, w), "data-tip": tipT }, svg);
      if (w > 3) el("svg:path", { d, class: "flow anim", stroke: "#F5F5F7", "stroke-width": 1.2, opacity: .3, "pointer-events": "none" }, svg);
    };
    clouds.forEach(c => tools.forEach(t => { const n = l1[c + "|" + t]; if (n) link(nc[c], nt[t], n * k, D.CLOUDS[c].color, D.CLOUDS[c].name + " → " + srcName(t) + ": " + pl(n, "finding", "findings")); }));
    tools.forEach(t => { const n = tv(t); if (n) link(nt[t], nd, n * k, "#9D7BFF", srcName(t) + ": " + pl(n, "finding", "findings") + " reported"); });
    nd.off = (ndH - uniq * k) / 2;
    units.forEach(u => { const n = uv(u); if (n) link(nd, nu[u], n * k, u === "UNM" ? PINK : GOOD, unit(u).name + ": " + pl(n, "unique finding", "unique findings")); });
    const node = (n, label, sub, color, tipT) => {
      el("svg:rect", { x: n.x, y: n.y, width: nw, height: n.h, rx: 4, fill: color, "data-tip": tipT }, svg);
      const tx = n.x + nw + 8, cy = n.y + Math.max(n.h, 14) / 2;
      el("svg:text", { x: tx, y: cy + (sub ? -1 : 4), class: "lbl-bg", style: "fill:#F5F5F7;font-size:13px;font-family:Sora;font-weight:600", text: label }, svg);
      if (sub) el("svg:text", { x: tx, y: cy + 14, class: "lbl-bg", text: sub }, svg);
    };
    clouds.forEach(c => node(nc[c], D.CLOUDS[c].name, pl(cv(c), "finding", "findings"), D.CLOUDS[c].color, D.CLOUDS[c].name));
    tools.forEach(t => node(nt[t], srcName(t), pl(tv(t), "finding", "findings"), "#9D7BFF", srcName(t) + " · " + D.SOURCES.find(s => s.id === t).kind));
    el("svg:rect", { x: nd.x, y: nd.y, width: nw, height: nd.h, rx: 4, fill: "#F5F5F7", "data-tip": num(raw) + " tool findings became " + num(uniq) + " unique ones" }, svg);
    el("svg:text", { x: nd.x + nw / 2, y: nd.y - 12, "text-anchor": "middle", class: "lbl-bg", style: "fill:#F5F5F7;font-size:13px;font-family:Sora;font-weight:700", text: "Dedupe" }, svg);
    el("svg:text", { x: nd.x + nw / 2, y: nd.y + nd.h + 20, "text-anchor": "middle", class: "lbl-bg", text: num(raw) + " → " + num(uniq) }, svg);
    units.forEach(u => node(nu[u], unit(u).name, pl(uv(u), "finding", "findings"), u === "UNM" ? PINK : GOOD, unit(u).name));
  }

  // ---------- Finding drawer ----------
  function openFinding(id) { state.open = id; state.accept = null; state.assign = null; drawFinding(); openPanel("drawer"); const f = find(id); log("Opened " + id + " · " + f.title); }
  const find = id => state.findings.find(f => f.id === id);
  function drawFinding() {
    const f = find(state.open), a = ACCT[f.account], u = unit(f.bu), body = $("drawerBody"); body.innerHTML = "";
    el("div", { class: "eyebrow", text: f.id + " · " + (f.kind === "vuln" ? "Vulnerability" : "Misconfiguration") + " · " + f.cat }, body);
    el("h2", { text: f.title }, body);
    const sl = el("div", { class: "status-line" }, body); scoreChip(f, sl); cloudChip(f.cloud, sl);
    el("span", { class: "mono", style: "font-size:12px;color:var(--muted)", text: f.resource }, sl);
    const stages = ["To do", "In progress", "In review", "Verified"], idx = { todo: 0, pendingAccept: 0, progress: 1, review: 2, verified: 3, accepted: 3 }[f.status];
    const sg = el("div", { class: "stage" }, body);
    stages.forEach((s, i) => el("span", { class: i < idx || (i === 3 && f.status === "verified") ? "done" : i === idx ? "now" : "", text: i === 3 && f.status === "accepted" ? "Accepted" : s }, sg));

    const facts = el("div", { class: "facts" }, body);
    [["Unit", u.name, u.id === "UNM" ? "No business unit tag" : "Owner " + u.owner], ["App", u.app, "Main system in this unit"], ["Account", f.account, D.CLOUDS[f.cloud].name + " " + D.CLOUDS[f.cloud].unit],
      ["First seen", fmt(f.firstSeen), "Reported by " + f.sources.map(srcName).join(" and ")], ["Due", fmt(due(f)) + (overdue(f) ? " · late" : ""), sla(f) + "-day target for " + f.band + " findings in tier " + u.tier + " units"], ["Effort", pl(f.effort, "hour", "hours"), "Estimated by simulated AI"]]
      .forEach(([k, val, t]) => el("div", { class: "fact", tabindex: 0, "data-tip": t, html: esc(k) + "<b" + (k === "Due" && overdue(f) ? " style='color:var(--accent)'" : "") + ">" + esc(val) + "</b>" }, facts));

    el("h4", { html: "Score <button class='info' data-tip='score = severity × exposure × exploit × asset × data, scaled so the maximum is 100' aria-label='How the score works'>?</button>" }, body);
    const sb = el("div", { class: "scorebox" }, body), ring = el("div", { class: "ring" }, sb);
    const sv = el("svg:svg", { viewBox: "0 0 104 104", width: 104, height: 104 }, ring);
    el("svg:circle", { cx: 52, cy: 52, r: 44, fill: "none", stroke: "#2A2A3A", "stroke-width": 10 }, sv);
    const C = 2 * Math.PI * 44; el("svg:circle", { cx: 52, cy: 52, r: 44, fill: "none", stroke: BANDC[f.band], "stroke-width": 10, "stroke-linecap": "round", "stroke-dasharray": (C * f.score / 100) + " " + C, transform: "rotate(-90 52 52)", style: "filter:drop-shadow(0 0 6px " + BANDC[f.band] + ")" }, sv);
    el("div", { class: "lbl", html: "<div><b>" + f.score + "</b><span>" + f.band + "</span></div>" }, ring);
    const fx = el("div", null, sb), facs = S.factors(f, a), maxv = { Severity: 10, Exposure: 2, Exploit: 1.5, Asset: 2, Data: 1.5 };
    facs.forEach(x => { const r = el("div", { class: "fac", tabindex: 0, "data-tip": "Why: " + x.t }, fx); el("span", { text: x.k }, r);
      const t = el("div", { class: "track" }, r); el("span", { style: "width:" + (x.v / maxv[x.k] * 100) + "%;background:" + BANDC[f.band] }, t); el("span", { class: "x", text: "×" + x.v }, r); });
    el("div", { class: "note", text: "Why? " + facs.map(x => x.t).join(" · ") + ". " + facs.map(x => x.v).join(" × ") + " = " + (Math.round(facs.reduce((p, x) => p * x.v, 1) * 10) / 10) + " of 90 → " + f.score + "." }, body);

    if (u.id !== "UNM") el("div", { class: "impact", style: "margin-top:12px", html: "<b>Business impact</b> · " + esc(u.app) + " · tier " + u.tier + (u.rev ? " · $" + u.rev + "K revenue per hour" : "") + (a.sensitive ? " · holds " + esc(u.data) : "") + " · " + (a.env === "nonprod" ? "non-production" : "production") }, body);
    else el("div", { class: "impact", style: "margin-top:12px", html: "<b>No owner</b> · account " + esc(f.account) + " has no business unit tag. Nobody's queue shows this until the cloud platform lead assigns it." }, body);

    const h4 = el("h4", { text: "How to fix" }, body); h4.appendChild(simTag("Steps and command written by simulated AI from the finding type and cloud. An engineer reviews and runs it; nothing runs from here."));
    const st = el("ol", { class: "steps" }, body); D.STEPS[f.cat].forEach(s => el("li", { text: s }, st));
    const snip = (D.FIX[f.tpl] && (D.FIX[f.tpl][f.cloud] || D.FIX[f.tpl]._)) || "# Apply the cloud provider's recommended setting for:\n# " + f.title + "\n# Resource: {r}";
    const code = el("pre", { class: "code", text: snip.split("{r}").join(f.resource.replace(/^(s3|gs|oss):\/\//, "").replace(/^(blob|bucket|iam|entra|ram|ecr|acr|gar|ocir)\//, "")) }, body);
    const cp = el("button", { class: "btn sm ghost", style: "margin-top:8px", text: "Copy", "data-tip": "Copy the command" }, body);
    cp.addEventListener("click", () => { const t = code.textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Copied")).catch(() => { const r = document.createRange(); r.selectNodeContents(code); getSelection().removeAllRanges(); getSelection().addRange(r); toast("Selected. Press Ctrl+C to copy."); }); });
    if (f.rootCause) {
      const grp = linked(state, f);
      el("div", { class: "impact", style: "margin-top:12px;border-color:rgba(255,177,61,.6)", html: "<b>Shared root cause</b> · " + esc(f.rootCause) + " · " + pl(grp.length, "open finding", "open findings") + " across " + pl(new Set(grp.map(x => x.bu)).size, "unit", "units") + " (" + num(sum(grp, x => x.score)) + " pts). Fix the module once; every pipeline picks it up." }, body);
    }
    if (f.note) el("div", { class: "note" + (f.status === "todo" && /Rescan|declined/.test(f.note) ? " warn" : ""), text: f.note }, body);

    el("h4", { text: "Next step" }, body);
    actionsFor(body, f);
    el("div", { class: "scan", id: "scanBar", html: "<span></span>" }, body);
  }
  function actionsFor(p, f) {
    const box = el("div", { class: "actions" }, p), who = me(), u = unit(f.bu), grp = f.rootCause ? linked(state, f) : null;
    const btn = (lab, cls, fn, t, dis) => { const b = el("button", { class: "btn " + (cls || ""), text: lab, "data-tip": t }, box); if (dis) b.disabled = true; b.addEventListener("click", () => fn(b)); return b; };
    const teammate = PERSONAS.find(x => x.type === "eng" && x.bu === f.bu && x.id !== f.fixer && x.id !== state.persona) || PERSONAS.find(x => x.type === "eng" && x.bu === f.bu && x.id !== f.fixer);
    const switchTo = (id, why) => btn("Switch to " + person(id).name, "ghost", () => { setPersona(id); }, why);
    if (f.status === "verified") { el("div", { class: "note", style: "border-color:rgba(198,255,61,.5);color:var(--good)", text: "Verified on " + fmt(f.verifiedAt) + " by rescan. Fixed by " + person(f.fixer || f.assignee).name + " · −" + f.score + " points." }, box); return; }
    if (f.status === "accepted") { el("div", { class: "note", text: "Risk accepted by " + u.owner + " until " + fmt(f.acceptedUntil) + ". Reason: " + f.acceptReason }, box); return; }
    if (f.bu === "UNM") {
      if (who.type !== "platform") { el("div", { class: "note warn", text: "Only the cloud platform lead can assign this account to a business unit." }, box); switchTo("nbrooks", "Approver for unmapped accounts"); return; }
      const form = el("div", { class: "form", style: "width:100%" }, box); el("label", { text: "Assign " + f.account + " to" }, form);
      const sel = el("select", null, form); D.BUS.forEach(b => el("option", { value: b.id, text: b.name }, sel));
      const n = state.findings.filter(x => x.account === f.account).length;
      const go = el("button", { class: "btn pri", text: "Assign owner", "data-tip": "Moves " + pl(n, "finding", "findings") + " into that unit's queue" }, form);
      go.addEventListener("click", () => run(f, "assign", { bu: sel.value }));
      return;
    }
    if (f.status === "pendingAccept") {
      el("div", { class: "note", text: person(f.acceptBy).name + " asked to accept this risk for " + pl(f.acceptDays, "day", "days") + ". Reason: " + f.acceptReason }, box);
      if (who.type === "owner" && who.bu === f.bu) { btn("Accept risk", "pri", () => run(f, "acceptApprove"), "Accept until " + fmt(addDays(D.TODAY, f.acceptDays))); btn("Decline", "ghost", () => run(f, "acceptDecline"), "Send it back to the team to fix"); }
      else switchTo("own-" + f.bu, "Only the " + u.name + " owner can accept risk");
      return;
    }
    if (f.status === "todo") {
      if (who.type === "eng" && who.bu === f.bu) {
        btn("Claim", "pri", () => run(f, "claim"), "Assign this fix to you");
        if (grp && grp.length > 1) btn("Fix all " + grp.length, "go", () => run(f, "claim", { all: true }), "Claim every finding with the same root cause, across units, as one change");
      } else {
        const eng = PERSONAS.find(x => x.type === "eng" && x.bu === f.bu);
        el("div", { class: "note", text: "Engineers on " + u.name + " claim this." }, box); if (eng) switchTo(eng.id, "An engineer on " + u.name);
      }
      btn("Accept risk", "ghost", () => { state.accept = state.accept ? null : f.id; drawFinding(); }, "Ask " + u.owner + " to accept the risk instead of fixing it");
      if (state.accept === f.id) {
        const form = el("div", { class: "form", style: "width:100%" }, box);
        el("label", { text: "Reason (shown to " + u.owner + ")" }, form); const ta = el("textarea", { rows: 2, placeholder: "Why can't this be fixed now?" }, form);
        el("label", { text: "Expires in" }, form); const sel = el("select", null, form); [30, 60, 90].forEach(d => el("option", { value: d, text: d + " days" }, sel));
        const go = el("button", { class: "btn pri", text: "Request approval", "data-tip": "Accepted risk is shown separately. It never counts as risk removed." }, form);
        go.addEventListener("click", () => run(f, "acceptReq", { reason: ta.value, days: +sel.value }));
      }
      return;
    }
    if (f.status === "progress") {
      if (f.assignee === state.persona) { btn("Submit fix", "pri", () => run(f, "submit", { all: !!grp }), "Open a pull request (simulated) and ask a teammate to review"); }
      else { el("div", { class: "note", text: "Claimed by " + person(f.assignee).name + "." }, box); switchTo(f.assignee, "The person working on it"); }
      return;
    }
    if (f.status === "review") {
      if (!f.approvedBy) {
        const mineFix = f.fixer === state.persona;
        const b = btn("Approve", "go", () => run(f, "approve", { all: !!grp }), mineFix ? "You can't approve your own fix" : "Approve " + person(f.fixer).name + "'s fix", false);
        el("div", { class: "note", style: "width:100%", text: "Fix by " + person(f.fixer).name + ": " + (f.note || "submitted") + ". A second engineer on " + u.name + " reviews it." }, box);
        if ((mineFix || who.type !== "eng" || who.bu !== f.bu) && teammate) switchTo(teammate.id, "A teammate who can review");
      } else {
        el("div", { class: "note", style: "width:100%", text: "Approved by " + person(f.approvedBy).name + ". Rescan to confirm the finding is gone." }, box);
        btn("Rescan", "pri", b => rescanWithSweep(f, { all: !!grp }, b), "Ask " + f.sources.map(srcName).join(" and ") + " to check again (simulated)");
      }
    }
  }

  // ---------- Checks ----------
  function checks() {
    const clone = () => ({ findings: JSON.parse(JSON.stringify(state.findings)) });
    const fresh0 = G.build();
    const out = [];
    const k1 = fresh0.find(f => f.planted === "K1"); out.push(["K1", k1.score === 100 && k1.band === "Critical", "Public bucket with cardholder data scores 100, Critical", "Got " + k1.score + ", " + k1.band]);
    const k2 = fresh0.find(f => f.planted === "K2"); out.push(["K2", k2.score === 2 && k2.band === "Low", "Internal non-production bucket scores 2, Low", "Got " + k2.score + ", " + k2.band]);
    const keys = state.findings.map(f => f.resource + "|" + f.tpl), rawN = sum(state.findings, f => f.sources.length);
    const dupes = state.findings.filter(f => f.sources.includes("cspm") && f.sources.includes("sechub")).length;
    out.push(["K3", new Set(keys).size === state.findings.length && dupes > 0, "Same finding from Wiz and AWS Security Hub counts once", num(rawN) + " tool findings → " + num(state.findings.length) + " unique; " + pl(dupes, "finding", "findings") + " reported by both"]);
    const tot = sum(openList(), f => f.score), byU = sum(UNITS, u => unitRisk(null, u.id));
    out.push(["K4", tot === byU, "Unit risk totals add up to total open risk", num(byU) + " = " + num(tot)]);
    let c = clone(), f5 = c.findings.find(f => f.status === "review" && f.fixer); const r5 = act(c, f5, "approve", f5.fixer);
    out.push(["K5", !r5.ok, "An engineer can't approve their own fix", r5.msg]);
    c = clone(); let f6 = c.findings.find(f => f.planted === "K6");
    if (f6 && f6.rescanFails) { const before = unitRisk(c, f6.bu); const rev = PERSONAS.find(p => p.type === "eng" && p.bu === f6.bu && p.id !== f6.fixer); act(c, f6, "approve", rev.id); const r6 = act(c, f6, "rescan", rev.id);
      out.push(["K6", f6.status === "todo" && unitRisk(c, f6.bu) === before && !r6.ok, "Failed rescan goes back to To do, no risk removed", "Status " + STATUS[f6.status] + ", unit risk unchanged at " + num(before)]); }
    else out.push(["K6", true, "Failed rescan goes back to To do, no risk removed", "Already exercised in this session"]);
    c = clone(); const f7 = c.findings.find(f => f.status === "todo" && f.bu === "PAY" && !f.rootCause) || c.findings.find(f => f.status === "todo" && f.bu !== "UNM" && !f.rootCause);
    const eng = PERSONAS.filter(p => p.type === "eng" && p.bu === f7.bu), b7 = unitRisk(c, f7.bu);
    act(c, f7, "claim", eng[0].id); act(c, f7, "submit", eng[0].id); act(c, f7, "approve", eng[1].id); act(c, f7, "rescan", eng[1].id);
    out.push(["K7", f7.status === "verified" && b7 - unitRisk(c, f7.bu) === f7.score, "A verified fix lowers unit risk by exactly its score", f7.id + ": " + num(b7) + " → " + num(unitRisk(c, f7.bu)) + " (−" + f7.score + ")"]);
    c = clone(); const f8 = c.findings.find(f => f.status === "todo" && f.bu === "PAY"); const e8 = PERSONAS.find(p => p.type === "eng" && p.bu === "PAY");
    const a = act(c, f8, "acceptReq", e8.id, { reason: "", days: 30 }), b = act(c, f8, "acceptReq", e8.id, { reason: "Vendor patch due next sprint", days: 120 });
    const cc = act(c, f8, "acceptReq", e8.id, { reason: "Vendor patch due next sprint", days: 30 }), d = act(c, f8, "acceptApprove", e8.id);
    const redB = sum(verified(c), x => x.score); act(c, f8, "acceptApprove", "own-PAY");
    out.push(["K8", !a.ok && !b.ok && cc.ok && !d.ok && f8.status === "accepted" && sum(verified(c), x => x.score) === redB, "Risk acceptance needs a reason, an expiry within 90 days, and the owner", "No reason: blocked · 120 days: blocked · engineer approving: blocked · owner: accepted, removed total unchanged"]);
    c = clone(); const m = c.findings.filter(f => f.rootCause && f.status !== "verified");
    if (m.length) { const e = PERSONAS.filter(p => p.type === "eng" && p.bu === m[0].bu); act(c, m[0], "claim", e[0].id, { all: true }); act(c, m[0], "submit", e[0].id, { all: true });
      const mid = m.filter(x => x.status === "verified").length; act(c, m[0], "approve", e[1].id, { all: true }); act(c, m[0], "rescan", e[1].id, { all: true });
      out.push(["K9", mid === 0 && m.every(x => x.status === "verified"), "Module fix closes all " + m.length + " findings, only after rescan", "Before rescan: " + mid + " verified · after: " + m.filter(x => x.status === "verified").length]); }
    else out.push(["K9", true, "Module fix closes all linked findings, only after rescan", "Already fixed in this session"]);
    const p0 = pl(0, "finding", "findings"), p1 = pl(1, "finding", "findings"), p2 = pl(2, "fix", "fixes");
    out.push(["K10", p0 === "0 findings" && p1 === "1 finding" && p2 === "2 fixes", "Counts of 0 and 1 read correctly", p0 + " · " + p1 + " · " + p2]);
    return out;
  }
  function openChecks() {
    const body = $("checksBody"); body.innerHTML = "";
    el("div", { class: "eyebrow", text: "Known answers" }, body); el("h2", { text: "Can we trust it?" }, body);
    const res = checks(), pass = res.filter(r => r[1]).length;
    el("div", { class: "note", text: pass + " of " + res.length + " checks pass. Each one runs on a copy of the live data, so nothing on screen changes." }, body);
    res.forEach(([id, ok, lab, detail]) => { const r = el("div", { class: "check-row", tabindex: 0, "data-tip": detail }, body);
      el("span", { class: ok ? "pass-tag" : "fail-tag", text: ok ? "PASS" : "FAIL" }, r); el("span", { class: "mono", style: "color:var(--muted)", text: id }, r); el("span", { text: lab }, r); });
    el("h4", { text: "Guardrails" }, body);
    const g = el("div", null, body);
    [["Second reviewer", "Nobody approves their own fix"], ["Verified means rescanned", "A fix counts only when the tool stops seeing it"], ["Owner accepts risk", "Reason, expiry within 90 days, and the unit owner's approval"],
      ["Nothing runs from here", "Commands are suggestions; engineers run them in their own pipeline"], ["Simulated AI is labeled", "Dedupe, mapping, effort, and fixes are simulated"], ["Logged", "Every action and every blocked action goes to the log"]]
      .forEach(([k, t]) => el("span", { class: "guard", tabindex: 0, "data-tip": t, text: k }, g));
    el("h4", { text: "Score" }, body);
    el("div", { class: "note", text: "severity (10 · 6 · 3 · 1) × exposure (internet 2.0) × exploit (KEV or no credentials 1.5) × asset (tier 1 prod 2.0 · prod 1.4 · non-prod 0.6) × data (sensitive 1.5), scaled so 90 = 100. Bands: Critical 70+, High 40–69, Medium 15–39, Low under 15." }, body);
    openPanel("checks"); log("Ran checks: " + pass + " of " + res.length + " pass");
  }

  // ---------- panels, persona, keys ----------
  function openPanel(id) { ["drawer", "checks"].forEach(x => { if (x !== id) { $(x).classList.remove("open"); $(x).setAttribute("aria-hidden", "true"); } }); $(id).classList.add("open"); $(id).setAttribute("aria-hidden", "false"); }
  function closeAll() { ["drawer", "checks"].forEach(id => { $(id).classList.remove("open"); $(id).setAttribute("aria-hidden", "true"); }); state.open = null; hideTip(); }
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeAll));
  function fillPersona() {
    const s = $("persona"); s.innerHTML = "";
    [["Engineers", "eng"], ["Unit owners", "owner"], ["Platform", "platform"]].forEach(([lab, t]) => { const g = el("optgroup", { label: lab }, s);
      PERSONAS.filter(p => p.type === t).forEach(p => el("option", { value: p.id, text: p.name + " · " + (t === "platform" ? "PLT" : unit(p.bu).id) }, g)); });
    s.value = state.persona;
  }
  function setPersona(id) { state.persona = id; $("persona").value = id; log("Viewing as " + person(id).name + " (" + (person(id).type === "platform" ? "cloud platform lead" : person(id).role + ", " + unit(person(id).bu).name) + ")"); toast("Viewing as " + person(id).name); render(); if (state.open) drawFinding(); }
  $("persona").addEventListener("change", e => setPersona(e.target.value));
  document.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
  $("checksBtn").addEventListener("click", openChecks);
  $("logBtn").addEventListener("click", () => { const l = $("log"); l.classList.toggle("open"); l.setAttribute("aria-hidden", !l.classList.contains("open")); });
  $("presenterBtn").addEventListener("click", e => { const on = document.body.classList.toggle("present"); e.currentTarget.setAttribute("aria-pressed", on); if (on) $("log").classList.remove("open"); render(); });
  $("resetBtn").addEventListener("click", () => { const pres = document.body.classList.contains("present"); state = fresh(); fillPersona(); closeAll(); $("logList").innerHTML = ""; log("Reset to starting data"); toast("Reset"); render(); if (pres) document.body.classList.add("present"); });
  document.addEventListener("keydown", e => {
    if (e.target.matches("input, textarea, select")) return;
    const v = { 1: "overview", 2: "units", 3: "board", 4: "reduced", 5: "sources" }[e.key]; if (v) setView(v);
    if (e.key === "Escape") closeAll();
  });

  state = fresh(); fillPersona(); log("Loaded " + pl(state.findings.length, "finding", "findings") + " from " + D.SOURCES.length + " tools across 5 clouds"); render();
  window.BC02 = { get state() { return state; }, checks, act, openFinding, setPersona, setView };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { moveSeg(); if (state.view === "overview") layoutMap(); });
})();
