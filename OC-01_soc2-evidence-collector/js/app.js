// OC-01 · SOC 2 Audit Evidence Collector · prototype logic (visual scheme 1 · Paper & Signal)
(function () {
  const D = window.OC01, A = D.AUDIT, NS = "http://www.w3.org/2000/svg";
  const $ = id => document.getElementById(id);
  const INITIAL = JSON.parse(JSON.stringify(D.evidence));
  let EV = JSON.parse(JSON.stringify(INITIAL));
  const ctrl = id => D.controls.find(c => c.id === id);
  const evOf = c => EV.filter(e => e.control === c.id);
  const evById = id => EV.find(e => e.id === id);

  const ST = {
    accepted: { label: "Accepted", color: "#4E7A3A" }, exception: { label: "Exception", color: "#C2362B" },
    review: { label: "In review", color: "#3B6E8F" }, collected: { label: "Collected", color: "#8E5BA8" },
    requested: { label: "Requested", color: "#B8901E" }, open: { label: "Not requested", color: "#CFC9BC" }
  };
  const ORDER = ["accepted", "exception", "review", "collected", "requested", "open"];
  const WORST = ["exception", "open", "requested", "collected", "review", "accepted"];
  const COL = { ink: "#1A1A1A", muted: "#6E695F", dim: "#A8A39A", line: "#E7E2D7", accent: "#FF5A1F", second: "#3B6E8F", bad: "#C2362B", good: "#4E7A3A" };
  const VIEWS = {
    overview: () => ({ h: "Are we on track for fieldwork?", s: A.name + " · fieldwork " + fmt(A.fieldStart) + " – " + fmt(A.fieldEnd) + " · today " + fmt(A.today) }),
    controls: () => ({ h: "Where does each control stand?", s: pl(D.controls.length, "control", "controls") + " · click a tile for its evidence" }),
    evidence: () => ({ h: "What have we collected?", s: pl(EV.length, "item", "items") + " · " + EV.filter(e => e.by && e.by.startsWith("Auto")).length + " collected automatically" }),
    report: () => ({ h: "Audit status, ready to share", s: "Export or print for the audit committee" })
  };
  const state = { view: "overview", status: "all", q: "", evf: "all", evq: "", ai: true, openEv: null, confirm: null, busy: null, drawerCtrl: null };

  // ---------- helpers ----------
  function el(tag, attrs, parent) {
    const n = tag.startsWith("svg:") ? document.createElementNS(NS, tag.slice(4)) : document.createElement(tag);
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === "text") n.textContent = v; else if (k === "html") n.innerHTML = v; else n.setAttribute(k, v);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function fmt(s) { return D.day(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  function fmtY(s) { return D.day(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  const days = (a, b) => Math.round((D.day(b) - D.day(a)) / 864e5);
  const pl = (n, one, many) => n + " " + (n === 1 ? one : many);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function stamp() { const d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, "0")).join(":"); }
  function log(msg) { $("logList").prepend(el("li", { html: "<span>" + stamp() + "</span>" + esc(msg) })); }
  let toastT;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200); }
  const chip = st => "<span class='chip st-" + st + "'>" + ST[st].label + "</span>";
  const isDone = e => e.status === "accepted" || e.status === "exception";
  const overdue = e => e.status === "requested" && e.due && e.due < A.today;
  function ctrlStatus(c) { const s = evOf(c).map(e => e.status); return WORST.find(w => s.includes(w)) || "open"; }
  function counts(list) { const o = {}; ORDER.forEach(k => o[k] = 0); list.forEach(e => o[e.status]++); return o; }

  // ---------- tooltips (hover and keyboard focus) ----------
  const tip = $("tip");
  function showTip(t) {
    const text = t.getAttribute("data-tip"); if (!text) return;
    tip.textContent = text; tip.classList.add("show");
    const r = t.getBoundingClientRect(), b = tip.getBoundingClientRect();
    let x = r.left + r.width / 2 - b.width / 2, y = r.top - b.height - 10;
    if (y < 8) y = r.bottom + 10;
    tip.style.left = Math.max(8, Math.min(innerWidth - b.width - 8, x)) + "px";
    tip.style.top = Math.min(innerHeight - b.height - 52, y) + "px";
  }
  const hideTip = () => tip.classList.remove("show");
  document.addEventListener("mouseover", e => { const t = e.target.closest && e.target.closest("[data-tip]"); t ? showTip(t) : hideTip(); });
  document.addEventListener("focusin", e => { const t = e.target.closest && e.target.closest("[data-tip]"); t ? showTip(t) : hideTip(); });
  document.addEventListener("focusout", hideTip);
  addEventListener("scroll", hideTip, true);

  // ---------- metrics ----------
  function metrics() {
    const c = counts(EV), done = c.accepted + c.exception, open = EV.length - done;
    const elapsed = days(A.fieldStart, A.today), start = D.burn[0].open;
    const rate = Math.max(0.1, (start - open) / elapsed);
    const left = Math.ceil(open / rate), finish = D.addDays(A.today, left);
    return { c, done, open, rate, finish, late: days(A.fieldEnd, finish), pct: Math.round(done / EV.length * 100),
      overdue: EV.filter(overdue), auto: EV.filter(e => e.by && e.by.startsWith("Auto")).length, manual: EV.filter(e => e.by && !e.by.startsWith("Auto")).length };
  }

  // ---------- previews ----------
  function seeded(id) { let s = 0; for (const ch of id) s = (s * 31 + ch.charCodeAt(0)) % 2147483647; return () => (s = (s * 48271) % 2147483647) / 2147483647; }
  const NAMES = ["a.rivera", "j.kim", "m.okoro", "s.dubois", "t.nguyen", "r.shah", "l.ferraro", "c.mbeki", "e.larsen", "d.costa"];
  function preview(e, big) {
    const box = el("div", { class: "pv-wrap" });
    if (!e.collectedOn) { box.innerHTML = "<div class='pv-doc' style='display:grid;place-items:center;height:100%;color:var(--muted);font-size:13px'>" + (e.status === "requested" ? "Awaiting " + (D.SOURCES[e.src].auto ? "collection" : "owner upload") : "Not requested yet") + "</div>"; return box; }
    const r = seeded(e.id), rows = big ? 7 : 5;
    const SPECIAL = {
      "Timing comparison.csv": [["Employee", "Terminated", "Removed", "Hours"], [["c.mbeki · contractor", "May 12", "May 18", "144", 1], ["j.kim", "Jun 3", "Jun 5", "52", 1], ["r.shah · contractor", "Jul 21", "Jul 24", "70", 1], ["t.nguyen", "Aug 8", "Aug 10", "41", 1], ["a.rivera", "Aug 14", "Aug 14", "3", 0], ["m.okoro", "Sep 2", "Sep 2", "6", 0], ["e.larsen", "Sep 19", "Sep 19", "2", 0]]],
      "Deploy-to-ticket match.csv": [["Deploy", "Date", "Ticket", "Match"], [["dep-8812", "Mar 4", "SEC-4471", "Yes", 0], ["dep-8840", "Apr 11", "—", "No ticket", 1], ["dep-8903", "May 2", "SEC-4602", "Yes", 0], ["dep-8977", "Jun 16", "SEC-4689", "Yes", 0], ["dep-9031", "Jul 9", "—", "No ticket", 1], ["dep-9104", "Aug 1", "SEC-4815", "Yes", 0], ["dep-9152", "Sep 12", "SEC-4870", "Yes", 0]]],
      "Admin role inventory.csv": [["Role", "Assignee", "Type", "Reviewed"], [["prod-admin", "s.dubois", "Employee", "Q3", 0], ["prod-admin", "c.mbeki", "Contractor · left", "Missed", 1], ["billing-admin", "l.ferraro", "Employee", "Q3", 0], ["break-glass", "d.costa", "Employee", "Q3", 0], ["sec-audit", "e.larsen", "Employee", "Q3", 0], ["net-admin", "m.okoro", "Employee", "Q3", 0], ["db-admin", "a.rivera", "Employee", "Q3", 0]]]
    };
    if (SPECIAL[e.name]) {
      const [head, data] = SPECIAL[e.name];
      box.innerHTML = "<table class='pv-table'><tr>" + head.map(x => "<th>" + x + "</th>").join("") + "</tr>" +
        data.slice(0, rows).map(d => "<tr" + (d[4] ? " style='color:var(--s-exception)'" : "") + ">" + d.slice(0, 4).map(x => "<td>" + x + "</td>").join("") + "</tr>").join("") + "</table>";
      return box;
    }
    if (["export", "ticket", "log"].includes(e.type)) {
      let head, gen;
      if (e.type === "ticket") { head = ["Key", "Summary", "Approver", "State"]; gen = i => [(e.src === "jira" ? "SEC-" : "CHG-") + (4100 + Math.floor(r() * 800)), ["Grant access", "Prod deploy", "Revoke role", "Fix finding", "Rotate key"][i % 5], NAMES[Math.floor(r() * 10)], r() > .1 ? "Approved" : "Closed"]; }
      else if (e.type === "log") { head = ["Time", "User", "Event", "Result"]; gen = i => ["2026-0" + (1 + Math.floor(r() * 9)) + "-" + String(1 + Math.floor(r() * 27)).padStart(2, "0"), NAMES[Math.floor(r() * 10)], ["deprovision", "deploy", "backup", "login", "alert"][i % 5], r() > .08 ? "success" : "failed"]; }
      else { head = ["ID", "Name", "Status", "Date"]; gen = i => ["U" + (10230 + Math.floor(r() * 900)), NAMES[Math.floor(r() * 10)], r() > .12 ? "Compliant" : "Review", "2026-0" + (1 + Math.floor(r() * 9)) + "-" + String(1 + Math.floor(r() * 27)).padStart(2, "0")]; }
      let h = "<table class='pv-table'><tr>" + head.map(x => "<th>" + x + "</th>").join("") + "</tr>";
      for (let i = 0; i < rows; i++) h += "<tr>" + gen(i).map(x => "<td>" + x + "</td>").join("") + "</tr>";
      box.innerHTML = h + "</table>";
    } else if (e.type === "config") {
      const k = (n, v) => "  <span class='k'>\"" + n + "\"</span>: " + v;
      const S = v => "<span class='s'>\"" + v + "\"</span>", B = v => "<span class='b'>" + v + "</span>";
      const lines = {
        okta: [k("policy", S("Workforce MFA")), k("factors", "[" + S("push") + ", " + S("webauthn") + "]"), k("enforced", B("true")), k("sessionHours", B(12))],
        aws: [k("Rule", S(e.name.split(".")[0])), k("Encrypted", B("true")), k("MinTLS", S("1.2")), k("Compliant", B("true"))],
        gh: [k("branch", S("main")), k("requiredReviews", B(1)), k("dismissStale", B("true")), k("enforceAdmins", B("true"))],
        cs: [k("policy", S("Prevention - Workstations")), k("mlProtection", S("aggressive")), k("quarantine", B("true"))],
        spl: [k("alert", S("Impossible travel")), k("severity", S("high")), k("schedule", S("*/5 * * * *"))],
        bkp: [k("plan", S("prod-daily")), k("retentionDays", B(35)), k("crossRegion", B("true"))]
      }[e.src] || [k("setting", S("enabled")), k("value", B("true"))];
      box.innerHTML = "<pre class='pv-json'>{\n" + lines.join(",\n") + "\n}</pre>";
    } else if (e.type === "screenshot") {
      box.innerHTML = "<div class='pv-shot'><div class='tb'><i></i><i></i><i></i></div><div class='blk' style='width:60%'></div>" +
        "<div style='font-size:11px;margin:8px 0'><span class='tog'></span>Enabled</div><div class='blk' style='width:85%'></div><div class='blk' style='width:40%'></div></div>";
    } else {
      box.innerHTML = "<div class='pv-doc'><div class='h'></div>" + [92, 80, 88, 64, 90, 72, 50].slice(0, big ? 7 : 5).map(w => "<div class='line' style='width:" + w + "%'></div>").join("") + "</div>";
    }
    return box;
  }

  // ---------- simulated AI insights ----------
  function insights() {
    const exc = EV.filter(e => e.status === "exception");
    const rootN = exc.filter(e => /contractor/i.test(e.note || "")).length;
    const reuse = EV.filter(e => e.name === "Q2 user access review.csv").length;
    const stale = EV.filter(e => e.stale && e.status !== "accepted").length;
    const out = [];
    if (rootN >= 2) out.push({ n: rootN, t: pl(rootN, "exception", "exceptions") + ", 1 root cause", d: "Contractors offboarded outside Workday", tip: "Why: the late-removal sample (CC6.2) and the admin-role finding (CC6.3) both involve contractors who never had a Workday record, so no termination event reached Okta or AWS.", go: () => { state.status = "exception"; setView("controls"); } });
    if (reuse > 1) out.push({ n: reuse, t: "1 export covers " + pl(reuse, "control", "controls"), d: "Q2 Okta access review · ~6 hrs saved", tip: "Why: the same Q2 user access review file satisfies CC6.1, CC6.3, and privileged review. Collected once, hash-matched, and linked to each control.", go: () => { state.evf = "reused"; setView("evidence"); } });
    if (stale) out.push({ n: stale, t: pl(stale, "item predates", "items predate") + " the period", d: "Dated before Oct 1, 2025", tip: "Why: these files are dated before the audit period starts, so they can't show the control operated during the period. Ask owners for current versions.", go: () => { state.evf = "stale"; setView("evidence"); } });
    return out;
  }

  // ---------- generic bits ----------
  function kpi(p, k, v, s, cls, tipText, i) {
    el("div", { class: "card kpi", tabindex: 0, "data-tip": tipText, style: "animation-delay:" + i * .05 + "s",
      html: "<div class='k'>" + k + "</div><div class='v " + (cls || "") + "'>" + v + "</div><div class='s'>" + s + "</div>" }, p);
  }
  function cardHead(p, title, tipText, right) {
    const h = el("div", { class: "card-head" }, p);
    el("div", { class: "card-title", text: title }, h);
    const r = el("div", { style: "display:flex;gap:12px;align-items:center" }, h);
    if (right) r.appendChild(right);
    if (tipText) el("button", { class: "info", "data-tip": tipText, "aria-label": "About this chart", text: "?" }, r);
    return h;
  }
  function legend(keys) { return el("div", { class: "legend", html: keys.map(k => "<span><i style='background:" + ST[k].color + "'></i>" + ST[k].label + "</span>").join("") }); }

  // ---------- overview ----------
  function renderOverview(v) {
    const m = metrics();
    const g = el("div", { class: "grid-main" }, v);
    const left = el("div", { class: "col" }, g), right = el("div", { class: "col" }, g);

    // burndown
    const bc = el("div", { class: "card pad" }, left);
    const lg = el("div", { class: "legend", html: "<span><i style='background:var(--ink)'></i>Open items</span><span><i style='background:var(--dim)'></i>Plan</span><span><i style='background:var(--accent)'></i>Projection</span>" });
    cardHead(bc, "Evidence burndown", "Open evidence items per day since fieldwork began. Projection uses the average closing pace so far (" + m.rate.toFixed(1) + " items a day).", lg);
    burndown(bc, m);

    const row = el("div", { class: "row2" }, left);
    const cc = el("div", { class: "card pad" }, row);
    cardHead(cc, "Status by category", "Evidence items in each SOC 2 category, colored by status. Hover a segment for counts.");
    catBars(cc);
    const oc = el("div", { class: "card pad" }, row);
    cardHead(oc, "Who owes evidence", "Open items by control owner. Red is overdue.");
    ownerBars(oc);
    mixDonut(oc, m);

    // right column
    const k = el("div", { class: "kpis" }, right);
    kpi(k, "Ready", m.pct + "%", m.done + " of " + EV.length + " closed", m.pct >= 80 ? "good" : "", "Accepted or exception, out of all evidence items", 0);
    kpi(k, "Finish", fmt(m.finish), m.late > 0 ? m.late + (m.late === 1 ? " day" : " days") + " late" : "On time", m.late > 0 ? "accent" : "good", "Projected completion at the current pace vs. the fieldwork end date", 1);
    kpi(k, "Overdue", m.overdue.length, m.overdue.length === 1 ? "owner request" : "owner requests", m.overdue.length ? "bad" : "good", "Requests past their due date", 2);
    kpi(k, "Exceptions", m.c.exception, m.c.exception === 0 ? "all clear" : m.c.exception === 1 ? "needs a response" : "need responses", m.c.exception ? "bad" : "good", "Evidence showing the control did not operate as designed", 3);

    const ai = el("div", { class: "card pad" }, right);
    cardHead(ai, "AI findings", null, el("span", { class: "tag", "data-tip": "Written by simulated AI from the evidence register. Turn it off in About.", text: "simulated" }));
    const list = el("div", { class: "ai-list" }, ai);
    if (!state.ai) el("div", { class: "ai-off", text: "AI findings are off." }, list);
    else insights().forEach((x, i) => {
      const b = el("button", { class: "insight", style: "animation-delay:" + (.1 + i * .08) + "s", "data-tip": x.tip,
        html: "<span class='num'>" + x.n + "</span><span><div class='t'>" + x.t + "</div><div class='d'>" + x.d + "</div></span><span class='go'>→</span>" }, list);
      b.addEventListener("click", () => { log("Opened AI finding: " + x.t); x.go(); });
    });

    const dc = el("div", { class: "card pad" }, right);
    cardHead(dc, "Due next", "Open owner requests, soonest first. Click to open the control.");
    const due = el("div", { class: "due" }, dc);
    EV.filter(e => e.status === "requested").sort((a, b) => a.due < b.due ? -1 : 1).slice(0, 6).forEach(e => {
      const late = e.due < A.today, c = ctrl(e.control);
      const r = el("button", { class: "due-row", "data-tip": c.id + " · " + c.title + " · owner " + D.PEOPLE[c.owner].name,
        html: "<span class='d" + (late ? " late" : "") + "'>" + (late ? days(e.due, A.today) + "d late" : fmt(e.due)) + "</span><span class='n'>" + esc(e.name) + "</span><span class='mono' style='font-size:11px;color:var(--muted)'>" + D.PEOPLE[c.owner].name.split(" ")[0] + "</span>" }, due);
      r.addEventListener("click", () => openControl(c.id, e.id));
    });
  }

  function burndown(p, m) {
    const end = m.finish > A.fieldEnd ? D.addDays(m.finish, 2) : D.addDays(A.fieldEnd, 2);
    const span = days(A.fieldStart, end), top = Math.ceil(D.burn[0].open / 20) * 20;
    const W = 900, H = 300, L = 44, R = 20, T = 18, B = 34;
    const X = d => L + (W - L - R) * days(A.fieldStart, d) / span, Y = n => T + (H - T - B) * (1 - n / top);
    const svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Evidence burndown chart" }, p);
    for (let n = 0; n <= top; n += top / 4) {
      el("svg:line", { x1: L, x2: W - R, y1: Y(n), y2: Y(n), stroke: COL.line }, svg);
      el("svg:text", { x: L - 10, y: Y(n) + 4, "text-anchor": "end", class: "mono", "font-size": 11, fill: COL.muted, text: n }, svg);
    }
    for (let i = 0; i <= span; i += 7) {
      const d = D.addDays(A.fieldStart, i);
      el("svg:text", { x: X(d), y: H - 10, "text-anchor": "middle", class: "mono", "font-size": 11, fill: COL.muted, text: fmt(d) }, svg);
    }
    // fieldwork end
    el("svg:rect", { x: X(A.fieldEnd), y: T, width: Math.max(0, X(end) - X(A.fieldEnd)), height: H - T - B, fill: "rgba(194,54,43,.05)" }, svg);
    el("svg:line", { x1: X(A.fieldEnd), x2: X(A.fieldEnd), y1: T, y2: H - B, stroke: COL.bad, "stroke-dasharray": "4 4" }, svg);
    el("svg:text", { x: X(A.fieldEnd) - 6, y: T + 12, "text-anchor": "end", class: "mono", "font-size": 11, fill: COL.bad, text: "Fieldwork ends " + fmt(A.fieldEnd) }, svg);
    // plan
    el("svg:line", { x1: X(A.fieldStart), y1: Y(D.burn[0].open), x2: X(A.fieldEnd), y2: Y(0), stroke: COL.dim, "stroke-width": 2, "stroke-dasharray": "6 6" }, svg);
    // actual (with live point for today)
    const pts = D.burn.map(b => [X(b.date), Y(b.open)]);
    pts[pts.length - 1] = [X(A.today), Y(m.open)];
    el("svg:polygon", { points: pts.map(q => q.join(",")).join(" ") + " " + X(A.today) + "," + Y(0) + " " + X(A.fieldStart) + "," + Y(0), fill: "rgba(26,26,26,.06)" }, svg);
    el("svg:polyline", { points: pts.map(q => q.join(",")).join(" "), fill: "none", stroke: COL.ink, "stroke-width": 3.5, "stroke-linejoin": "round", class: "draw" }, svg);
    // projection
    el("svg:line", { x1: X(A.today), y1: Y(m.open), x2: X(m.finish), y2: Y(0), stroke: COL.accent, "stroke-width": 3, "stroke-dasharray": "2 7", "stroke-linecap": "round" }, svg);
    el("svg:circle", { cx: X(m.finish), cy: Y(0), r: 7, fill: COL.accent }, svg);
    const fl = el("svg:g", { tabindex: 0, "data-tip": "At " + m.rate.toFixed(1) + " items a day, the last item closes " + fmtY(m.finish) }, svg);
    el("svg:text", { x: X(m.finish), y: Y(0) - 16, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: COL.accent, text: "Projected " + fmt(m.finish) }, fl);
    // today
    el("svg:line", { x1: X(A.today), x2: X(A.today), y1: T, y2: H - B, stroke: COL.ink, "stroke-width": 1, opacity: .4 }, svg);
    el("svg:circle", { cx: X(A.today), cy: Y(m.open), r: 6, fill: COL.ink }, svg);
    el("svg:text", { x: X(A.today) + 10, y: Y(m.open) - 10, "font-size": 14, "font-weight": 700, text: m.open + " open today" }, svg);
    // hover targets
    D.burn.forEach((b, i) => {
      const o = i === D.burn.length - 1 ? m.open : b.open;
      el("svg:rect", { x: X(b.date) - 8, y: T, width: 16, height: H - T - B, fill: "transparent", "data-tip": fmt(b.date) + " · " + o + " open" }, svg);
    });
  }

  function catBars(p) {
    const wrap = el("div", { style: "display:flex;flex-direction:column;gap:9px" }, p);
    D.CATEGORIES.forEach((cat, ci) => {
      const list = EV.filter(e => ctrl(e.control).cat === cat.id); if (!list.length) return;
      const c = counts(list), done = c.accepted + c.exception;
      const row = el("div", { style: "display:grid;grid-template-columns:150px minmax(0,1fr) 44px;gap:10px;align-items:center;font-size:13px" }, wrap);
      el("div", { html: "<span class='mono' style='color:var(--muted)'>" + cat.id + "</span> " + cat.name, style: "white-space:nowrap;overflow:hidden;text-overflow:ellipsis" }, row);
      const bar = el("div", { style: "display:flex;height:12px;border-radius:999px;overflow:hidden;background:var(--line)" }, row);
      ORDER.forEach(k => { if (c[k]) el("span", { class: "grow", style: "animation-delay:" + ci * .04 + "s;width:" + (c[k] / list.length * 100) + "%;background:" + ST[k].color, "data-tip": cat.id + " · " + ST[k].label + ": " + c[k] }, bar); });
      el("div", { class: "mono", style: "font-size:12px;color:var(--muted);text-align:right", text: done + "/" + list.length }, row);
    });
    p.appendChild(legend(ORDER)).style.marginTop = "14px";
  }

  function ownerBars(p) {
    const rows = Object.keys(D.PEOPLE).map(k => {
      const list = EV.filter(e => ctrl(e.control).owner === k && !isDone(e));
      return { k, open: list.length, late: list.filter(overdue).length };
    }).filter(r => r.open).sort((a, b) => b.late - a.late || b.open - a.open).slice(0, 6);
    const max = Math.max(...rows.map(r => r.open), 1);
    const wrap = el("div", { style: "display:flex;flex-direction:column;gap:8px" }, p);
    rows.forEach((r, i) => {
      const row = el("div", { style: "display:grid;grid-template-columns:96px minmax(0,1fr) 28px;gap:10px;align-items:center;font-size:13px", "data-tip": D.PEOPLE[r.k].name + " (" + D.PEOPLE[r.k].team + ") · " + r.open + " open, " + r.late + " overdue" }, wrap);
      el("div", { text: D.PEOPLE[r.k].name.split(" ")[0] + " " + D.PEOPLE[r.k].name.split(" ")[1][0] + ".", style: "white-space:nowrap" }, row);
      const bar = el("div", { style: "display:flex;height:10px" }, row);
      el("span", { class: "grow", style: "animation-delay:" + i * .05 + "s;border-radius:999px 0 0 999px;width:" + ((r.open - r.late) / max * 100) + "%;background:var(--ink)" }, bar);
      if (r.late) el("span", { class: "grow", style: "animation-delay:" + i * .05 + "s;border-radius:0 999px 999px 0;width:" + (r.late / max * 100) + "%;background:var(--s-exception)" }, bar);
      el("div", { class: "mono", style: "font-size:12px;text-align:right", text: r.open }, row);
    });
  }

  function mixDonut(p, m) {
    const box = el("div", { style: "display:flex;gap:16px;align-items:center;margin-top:18px;padding-top:14px;border-top:1px solid var(--line)" }, p);
    const svg = el("svg:svg", { viewBox: "0 0 90 90", width: 84, height: 84, "data-tip": m.auto + " collected by connectors, " + m.manual + " uploaded by owners" }, box);
    const tot = m.auto + m.manual || 1, c = 2 * Math.PI * 34;
    el("svg:circle", { cx: 45, cy: 45, r: 34, fill: "none", stroke: COL.line, "stroke-width": 12 }, svg);
    el("svg:circle", { cx: 45, cy: 45, r: 34, fill: "none", stroke: COL.accent, "stroke-width": 12, "stroke-dasharray": (c * m.auto / tot) + " " + c, transform: "rotate(-90 45 45)" }, svg);
    el("svg:text", { x: 45, y: 50, "text-anchor": "middle", "font-size": 17, "font-weight": 700, text: Math.round(m.auto / tot * 100) + "%" }, svg);
    el("div", { html: "<div class='card-title' style='font-size:15px'>Auto-collected</div><div class='mono' style='font-size:12px;color:var(--muted);margin-top:4px'>" + m.auto + " by connectors<br>" + m.manual + " by owner upload</div>" }, box);
  }

  // ---------- controls ----------
  function renderControls(v) {
    const f = el("div", { class: "filters" }, v);
    const statuses = ["all", "exception", "open", "requested", "collected", "review", "accepted"];
    const cnt = s => s === "all" ? D.controls.length : D.controls.filter(c => ctrlStatus(c) === s).length;
    statuses.forEach(s => {
      const b = el("button", { class: "fchip" + (state.status === s ? " on" : ""), "data-tip": s === "all" ? "All controls" : "Controls whose least-finished evidence is " + ST[s].label.toLowerCase(),
        html: (s === "all" ? "All" : ST[s].label) + "<span class='c'>" + cnt(s) + "</span>" }, f);
      b.addEventListener("click", () => { state.status = s; log("Filtered controls: " + (s === "all" ? "All" : ST[s].label)); render(); });
    });
    el("span", { class: "sep" }, f);
    const q = el("input", { class: "search", type: "search", placeholder: "Search controls", value: state.q, "aria-label": "Search controls" }, f);
    q.addEventListener("input", () => { state.q = q.value; drawTiles(); });
    const cats = el("div", { class: "cats" }, v);
    function drawTiles() {
      cats.innerHTML = "";
      const term = state.q.toLowerCase();
      let shown = 0, k = 0;
      D.CATEGORIES.forEach(cat => {
        const list = D.controls.filter(c => c.cat === cat.id && (state.status === "all" || ctrlStatus(c) === state.status) &&
          (!term || (c.id + " " + c.title + " " + D.PEOPLE[c.owner].name).toLowerCase().includes(term)));
        if (!list.length) return;
        const row = el("div", { class: "cat" }, cats);
        const done = list.reduce((a, c) => a + evOf(c).filter(isDone).length, 0), tot = list.reduce((a, c) => a + evOf(c).length, 0);
        el("div", { class: "cat-name", html: "<b>" + cat.name + "</b><span>" + cat.id + " · " + done + "/" + tot + " closed</span>" }, row);
        const tiles = el("div", { class: "tiles" }, row);
        list.forEach(c => {
          shown++;
          const st = ctrlStatus(c), evs = evOf(c), cc = counts(evs);
          const t = el("button", { class: "tile", style: "border-left-color:" + ST[st].color + ";animation-delay:" + (k++ * .015) + "s",
            "data-tip": c.title + " · owner " + D.PEOPLE[c.owner].name + " · " + (cc.accepted + cc.exception) + "/" + evs.length + " closed" }, tiles);
          t.innerHTML = "<div class='id'><span>" + c.id + "</span>" + (st === "exception" ? "<span style='color:var(--s-exception)'>● Exception</span>" : evs.some(overdue) ? "<span style='color:#8A6A10'>● Overdue</span>" : "") + "</div>" +
            "<div class='tt'>" + c.title + "</div><div class='mini'>" + ORDER.filter(s => cc[s]).map(s => "<span style='width:" + (cc[s] / evs.length * 100) + "%;background:" + ST[s].color + "'></span>").join("") + "</div>";
          t.addEventListener("click", () => openControl(c.id));
        });
      });
      if (!shown) el("div", { class: "empty card", text: "No controls match." }, cats);
    }
    drawTiles();
    const lg = legend(ORDER); lg.style.marginTop = "16px"; v.appendChild(lg);
  }

  // ---------- evidence library ----------
  function renderEvidence(v) {
    const f = el("div", { class: "filters" }, v);
    const opts = [["all", "All"], ["stale", "Stale"], ["reused", "Reused"], ["exception", "Exception"], ["requested", "Requested"], ["review", "In review"], ["collected", "Collected"], ["accepted", "Accepted"]];
    const match = (e, k) => k === "all" ? true : k === "stale" ? e.stale : k === "reused" ? e.name === "Q2 user access review.csv" : e.status === k;
    const tips = { all: "Every evidence item", stale: "Dated before the audit period started", reused: "One file linked to several controls" };
    opts.forEach(([k, lab]) => {
      const b = el("button", { class: "fchip" + (state.evf === k ? " on" : ""), "data-tip": tips[k] || "Status: " + lab, html: lab + "<span class='c'>" + EV.filter(e => match(e, k)).length + "</span>" }, f);
      b.addEventListener("click", () => { state.evf = k; log("Filtered evidence: " + lab); render(); });
    });
    el("span", { class: "sep" }, f);
    const q = el("input", { class: "search", type: "search", placeholder: "Search evidence", value: state.evq, "aria-label": "Search evidence" }, f);
    const grid = el("div", { class: "ev-grid" }, v);
    function draw() {
      grid.innerHTML = "";
      const term = state.evq.toLowerCase();
      const list = EV.filter(e => match(e, state.evf) && (!term || (e.name + " " + e.control + " " + D.SOURCES[e.src].name).toLowerCase().includes(term)));
      list.slice(0, 120).forEach((e, i) => {
        const card = el("button", { class: "card evc", style: "animation-delay:" + Math.min(i, 30) * .015 + "s" }, grid);
        const th = el("div", { class: "thumb" }, card);
        th.appendChild(preview(e, false));
        el("span", { class: "typebadge", text: e.type }, th);
        const body = el("div", { class: "body" }, card);
        el("div", { class: "nm", text: e.name, "data-tip": e.name }, body);
        el("div", { class: "meta", html: "<span>" + e.control + " · " + D.SOURCES[e.src].name + "</span>" + chip(e.status) }, body);
        el("div", { class: "meta", html: "<span>" + (e.collectedOn ? fmt(e.collectedOn) + " · " + e.hash.slice(7, 15) : e.due ? "Due " + fmt(e.due) : "—") + "</span>" +
          (e.stale ? "<span class='flag' data-tip='Dated before the audit period'>Stale</span>" : e.name === "Q2 user access review.csv" ? "<span class='flag' data-tip='Linked to 3 controls'>Reused</span>" : overdue(e) ? "<span class='flag' data-tip='Past due date'>Overdue</span>" : "") }, body);
        card.addEventListener("click", () => openControl(e.control, e.id));
      });
      if (!list.length) el("div", { class: "empty card", text: "No evidence matches." }, grid);
    }
    q.addEventListener("input", () => { state.evq = q.value; draw(); });
    draw();
  }

  // ---------- report ----------
  function renderReport(v) {
    const m = metrics();
    const rep = el("div", { class: "card report" }, v);
    const head = el("div", { class: "rep-head" }, rep);
    el("div", { html: "<div class='rep-title'>" + A.name + " · Audit status</div><div class='rep-sub'>As of " + fmtY(A.today) + " · Internal Audit (" + A.lead + ") · period " + fmtY(A.periodStart) + " – " + fmtY(A.periodEnd) + "</div>" }, head);
    const act = el("div", { class: "actions rep-actions", style: "margin:0" }, head);
    const ex = el("button", { class: "btn orange", "data-tip": "Download the full evidence register as a CSV file", text: "Export CSV" }, act);
    const pr = el("button", { class: "btn ghost", "data-tip": "Print or save as PDF", text: "Print" }, act);
    ex.addEventListener("click", exportCsv);
    pr.addEventListener("click", () => { log("Printed report"); print(); });

    const g = el("div", { class: "rep-grid" }, rep);
    const lc = el("div", {}, g);
    gauge(lc, m.pct);
    const stats = [["Accepted", m.c.accepted, "accepted"], ["Exceptions", m.c.exception, "exception"], ["In progress", m.c.review + m.c.collected, "review"], ["Waiting on owners", m.c.requested, "requested"], ["Not requested", m.c.open, "open"]];
    const sl = el("div", { style: "margin-top:14px" }, lc);
    stats.forEach(([lab, n, k]) => el("div", { style: "display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:14px",
      html: "<span><i style='display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px;background:" + ST[k].color + "'></i>" + lab + "</span><b class='mono'>" + n + "</b>" }, sl));
    el("div", { style: "margin-top:12px;font-size:14px", html: "Projected finish <b style='color:" + (m.late > 0 ? "var(--accent)" : "var(--s-accepted)") + "'>" + fmtY(m.finish) + "</b>" + (m.late > 0 ? " · " + m.late + (m.late === 1 ? " day" : " days") + " late" : "") }, lc);

    const rc = el("div", {}, g);
    const sum = el("div", { class: "rep-sec", style: "margin-top:0" }, rc);
    el("h4", { html: "Summary <span class='tag' style='margin-left:8px;text-transform:none;letter-spacing:0' data-tip='Drafted by simulated AI from the register. Review before sharing.'>simulated AI</span>" }, sum);
    const ul = el("ul", { style: "margin:0;padding-left:18px;font-size:15px;line-height:1.6" }, sum);
    const lateOwners = [...new Set(m.overdue.map(e => D.PEOPLE[ctrl(e.control).owner].name))];
    (state.ai ? [m.pct + "% of evidence is closed; " + (m.c.exception === 0 ? "no exceptions so far." : m.c.exception === 1 ? "1 exception needs a management response." : m.c.exception + " exceptions need management responses."),
      m.overdue.length === 0 ? "No owner requests are overdue." : (m.overdue.length === 1 ? "1 owner request is overdue (" + lateOwners[0] + ")." : m.overdue.length + " owner requests are overdue, from " + (lateOwners.length > 2 ? lateOwners.slice(0, -1).join(", ") + ", and " + lateOwners[lateOwners.length - 1] : lateOwners.join(" and ")) + "."),
      "At the current pace, fieldwork finishes " + fmt(m.finish) + (m.late > 0 ? ", " + m.late + (m.late === 1 ? " day" : " days") + " late." + (m.overdue.length ? " Clearing overdue items closes the gap." : "") : ", on time.")]
      : ["AI summary is off."]).forEach(t => el("li", { text: t }, ul));
    const tbl = el("div", { class: "rep-sec" }, rc);
    el("h4", { text: "By category" }, tbl);
    const t = el("table", { class: "rtable" }, tbl);
    t.innerHTML = "<tr><th>Category</th><th>Controls</th><th>Status</th><th style='text-align:right'>Closed</th></tr>";
    D.CATEGORIES.forEach(cat => {
      const list = EV.filter(e => ctrl(e.control).cat === cat.id), c = counts(list);
      if (!list.length) return;
      t.insertAdjacentHTML("beforeend", "<tr><td><span class='mono' style='color:var(--muted)'>" + cat.id + "</span> " + cat.name + "</td><td class='mono'>" + D.controls.filter(x => x.cat === cat.id).length + "</td><td><div class='rbar'>" +
        ORDER.filter(k => c[k]).map(k => "<span style='width:" + (c[k] / list.length * 100) + "%;background:" + ST[k].color + "'></span>").join("") + "</div></td><td class='mono' style='text-align:right'>" + Math.round((c.accepted + c.exception) / list.length * 100) + "%</td></tr>");
    });

    const exs = el("div", { class: "rep-sec" }, rep);
    el("h4", { text: "Exceptions" }, exs);
    const excList = EV.filter(e => e.status === "exception");
    if (!excList.length) el("div", { style: "font-size:14px;color:var(--muted)", text: "None." }, exs);
    excList.forEach(e => el("div", { class: "exc", html: "<span class='mono'>" + e.control + "</span><span><b>" + ctrl(e.control).title + ".</b> " + esc(e.note || "Exception recorded.") + "</span>" }, exs));
    if (state.ai && excList.filter(e => /contractor/i.test(e.note || "")).length >= 2)
      el("div", { class: "root", html: "<b>Likely root cause:</b> contractors are offboarded outside Workday, so terminations never reach Okta or AWS. One fix closes two exceptions. <span class='mono' style='font-size:11px;color:var(--muted)'>· simulated AI</span>" }, exs);

    const ow = el("div", { class: "rep-sec" }, rep);
    el("h4", { text: "Open items by owner" }, ow);
    const ot = el("table", { class: "rtable" }, ow);
    ot.innerHTML = "<tr><th>Owner</th><th>Team</th><th>Open</th><th>Overdue</th><th>Next due</th></tr>";
    Object.keys(D.PEOPLE).map(k => ({ k, list: EV.filter(e => ctrl(e.control).owner === k && !isDone(e)) })).filter(r => r.list.length)
      .sort((a, b) => b.list.filter(overdue).length - a.list.filter(overdue).length || b.list.length - a.list.length).forEach(r => {
        const next = r.list.filter(e => e.due).sort((a, b) => a.due < b.due ? -1 : 1)[0], late = r.list.filter(overdue).length;
        ot.insertAdjacentHTML("beforeend", "<tr><td>" + D.PEOPLE[r.k].name + "</td><td style='color:var(--muted)'>" + D.PEOPLE[r.k].team + "</td><td class='mono'>" + r.list.length + "</td><td class='mono' style='color:" + (late ? "var(--s-exception)" : "inherit") + "'>" + late + "</td><td class='mono'>" + (next ? fmt(next.due) : "—") + "</td></tr>");
      });
  }
  function gauge(p, pct) {
    const svg = el("svg:svg", { viewBox: "0 0 240 140", width: "100%", "data-tip": pct + "% of evidence items are accepted or recorded as exceptions" }, p);
    const arc = (a0, a1) => { const r = 100, cx = 120, cy = 120, p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)]; return "M" + p0 + " A" + r + "," + r + " 0 0 1 " + p1; };
    el("svg:path", { d: arc(Math.PI, 2 * Math.PI), fill: "none", stroke: COL.line, "stroke-width": 18, "stroke-linecap": "round" }, svg);
    el("svg:path", { d: arc(Math.PI, Math.PI + Math.PI * pct / 100), fill: "none", stroke: COL.ink, "stroke-width": 18, "stroke-linecap": "round", class: "draw" }, svg);
    el("svg:text", { x: 120, y: 110, "text-anchor": "middle", "font-size": 40, "font-weight": 700, text: pct + "%" }, svg);
    el("svg:text", { x: 120, y: 134, "text-anchor": "middle", class: "mono", "font-size": 11, fill: COL.muted, text: "EVIDENCE CLOSED" }, svg);
  }
  function exportCsv() {
    const cols = ["Evidence ID", "Control", "Criteria", "Control title", "Owner", "Evidence", "Type", "Source", "Status", "Requested", "Due", "Collected", "Collected by", "Reviewer", "Hash", "Flags", "Note"];
    const rows = EV.map(e => { const c = ctrl(e.control); return [e.id, c.id, c.crit, c.title, D.PEOPLE[c.owner].name, e.name, e.type, D.SOURCES[e.src].name, ST[e.status].label, e.requestedOn || "", e.due || "", e.collectedOn || "", e.by || "", e.reviewer || "", e.hash || "", [e.stale ? "stale" : "", overdue(e) ? "overdue" : ""].filter(Boolean).join(" "), e.note || ""]; });
    const csv = [cols].concat(rows).map(r => r.map(x => "\"" + String(x).replace(/"/g, "\"\"") + "\"").join(",")).join("\n");
    const a = el("a", { href: URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })), download: "OC-01_evidence_register_" + A.today + ".csv" });
    document.body.appendChild(a); a.click(); a.remove();
    log("Exported evidence register (" + pl(EV.length, "row", "rows") + ")"); toast("Evidence register exported");
  }

  // ---------- control drawer ----------
  function openControl(id, evId) {
    state.drawerCtrl = id; state.openEv = evId || null; state.confirm = null;
    drawControl();
    $("drawer").classList.add("open"); $("drawer").setAttribute("aria-hidden", "false");
    log("Opened control " + id);
    if (evId) setTimeout(() => { const n = document.querySelector("[data-ev='" + evId + "']"); n && n.scrollIntoView({ block: "center", behavior: "smooth" }); }, 350);
  }
  function drawControl() {
    const c = ctrl(state.drawerCtrl), body = $("drawerBody"), evs = evOf(c), cat = D.CATEGORIES.find(x => x.id === c.cat);
    body.innerHTML = "";
    el("div", { class: "dmeta", html: c.id + " · " + c.crit + " · " + cat.name + " &nbsp;" + chip(ctrlStatus(c)) }, body);
    el("h2", { text: c.title }, body);
    const facts = el("div", { class: "facts" }, body);
    [["Owner", D.PEOPLE[c.owner].name, D.PEOPLE[c.owner].team], ["Runs", c.freq, "How often the control operates"], ["Test", c.test, "How the auditor tests it"], ["Sample", c.sample, "Items selected for testing"]]
      .forEach(([k, v, t]) => el("span", { class: "fact", tabindex: 0, "data-tip": t, html: k + " <b>" + v + "</b>" }, facts));

    el("h3", { text: "Sample testing" }, body);
    const fails = { "CC6.2-02": 4, "CC8.1-02": 2, "CC6.3-02": 1 }[c.id] || 0;
    const exc = evs.some(e => e.status === "exception"), doneShare = evs.filter(isDone).length / evs.length;
    const n = Math.min(c.sample, 40), tested = exc ? n : Math.round(n * doneShare);
    const dots = el("div", { class: "dots" }, body);
    for (let i = 0; i < n; i++) {
      const fail = exc && i < Math.min(fails, n) ? true : false, cls = i < tested ? (fail ? "fail" : "pass") : "pend";
      el("span", { class: "dot " + cls, tabindex: 0, "data-tip": "Sample " + (i + 1) + " · " + (cls === "pass" ? "passed" : cls === "fail" ? "exception" : "not yet tested") }, dots);
    }
    el("div", { class: "mono", style: "font-size:12px;color:var(--muted);margin-top:8px", text: tested + " of " + n + " tested" + (exc ? " · " + Math.min(fails, n) + " exception" + (fails === 1 ? "" : "s") : "") + (c.sample > 40 ? " · showing 40 of " + c.sample : "") }, body);

    el("h3", { text: "Evidence · " + evs.filter(isDone).length + "/" + evs.length + " closed" }, body);
    evs.forEach(e => evRow(body, c, e));
  }
  function evRow(p, c, e) {
    const row = el("div", { class: "evrow" + (state.openEv === e.id ? " open" : ""), "data-ev": e.id }, p);
    const top = el("div", { class: "evrow-top", tabindex: 0, role: "button", "aria-expanded": state.openEv === e.id ? "true" : "false" }, row);
    const left = el("div", { style: "min-width:0" }, top);
    el("div", { class: "nm", text: e.name }, left);
    el("div", { class: "sub", html: "<span>" + D.SOURCES[e.src].name + "</span><span>·</span><span>" + (e.collectedOn ? fmt(e.collectedOn) : e.due ? "due " + fmt(e.due) : "not requested") + "</span>" +
      (e.stale ? "<span class='flag' data-tip='Dated before the audit period'>Stale</span>" : "") + (overdue(e) ? "<span class='flag' data-tip='Past due date'>" + days(e.due, A.today) + "d late</span>" : "") +
      (e.name === "Q2 user access review.csv" ? "<span class='flag' data-tip='Same file linked to 3 controls'>Reused</span>" : "") }, left);
    el("div", { html: chip(e.status) }, top);
    const toggle = () => { state.openEv = state.openEv === e.id ? null : e.id; state.confirm = null; drawControl(); };
    top.addEventListener("click", toggle);
    top.addEventListener("keydown", k => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); toggle(); } });

    const det = el("div", { class: "evrow-detail" }, row);
    if (state.openEv !== e.id) return;
    const pv = el("div", { class: "pv" }, det); pv.appendChild(preview(e, true));
    if (e.collectedOn) {
      const ck = el("div", { class: "checks-ai" }, det);
      el("div", { html: "<span class='tag' data-tip='Checks run by simulated AI when the file arrived'>AI check · simulated</span>" }, ck);
      [[!e.stale, "Covers the audit period", e.stale ? "File is dated before Oct 1, 2025" : "Dated within Oct 1, 2025 – Sep 30, 2026"],
       [!!e.hash, "Integrity hash recorded", e.hash || "No hash"],
       [true, "Matches " + c.crit + " requirement", "Content matches what the control test asks for"]]
        .forEach(([ok, lab, t]) => el("div", { tabindex: 0, "data-tip": t, html: "<span class='" + (ok ? "ok" : "no") + "'>" + (ok ? "✓" : "✗") + "</span>" + lab }, ck));
      el("div", { class: "mono", style: "font-size:11px;color:var(--muted)", text: (e.by || "") + (e.reviewer ? " · reviewer " + e.reviewer : "") + " · " + e.hash }, det);
    }
    if (e.note) el("div", { class: "note", text: e.note }, det);
    actions(det, c, e);
  }

  function actions(p, c, e) {
    const a = el("div", { class: "actions" }, p), auto = D.SOURCES[e.src].auto, owner = D.PEOPLE[c.owner].name;
    const btn = (label, cls, fn, t) => { const b = el("button", { class: "btn " + (cls || ""), text: label, "data-tip": t }, a); b.addEventListener("click", ev => { ev.stopPropagation(); fn(b); }); return b; };
    if (state.busy === e.id) { el("button", { class: "btn orange", html: "<span class='spin'></span>Collecting…", disabled: "disabled" }, a); return; }
    if ((e.status === "open" || e.status === "requested") && auto) btn("Collect now", "orange", () => collect(e), "Pull this file from " + D.SOURCES[e.src].name + " through its connector");
    if (e.status === "open" && !auto) btn("Request", "", () => { state.confirm = { id: e.id, kind: "request" }; drawControl(); }, "Ask " + owner + " to upload it");
    if (e.status === "requested" && !auto) {
      btn("Mark received", "", () => change(e, { status: "collected", collectedOn: A.today, by: owner, hash: "sha256:" + D.hex(8) + "…" + D.hex(4), coverage: "Oct 1, 2025 – Sep 30, 2026" }, "Received " + e.name + " from " + owner), "Record the owner's upload");
      btn("Nudge", "ghost", () => { log("Nudged " + owner + " about " + e.name); toast("Reminder sent to " + owner); }, "Send " + owner + " a reminder");
    }
    if (e.status === "collected") btn("Start review", "", () => change(e, { status: "review", reviewer: A.lead }, "Started review of " + e.name), "Assign to yourself for review");
    if (e.status === "review" && e.stale) btn("Request current", "orange", () => change(e, { status: "requested", requestedOn: A.today, due: D.addDays(A.today, 5), collectedOn: null, hash: null, by: null, stale: false, coverage: null }, "Requested a current version of " + e.name), "This file predates the audit period, so it can't be accepted. Ask for a current version.");
    if (e.status === "review") {
      if (!e.stale) btn("Accept", "go", () => { state.confirm = { id: e.id, kind: "accept" }; drawControl(); }, "Accept as sufficient evidence");
      btn("Exception", "danger", () => { state.confirm = { id: e.id, kind: "exception" }; drawControl(); }, "Record that the control did not operate as designed");
    }
    if (isDone(e)) btn("Reopen", "ghost", () => change(e, { status: "review", note: e.status === "exception" ? e.note : null }, "Reopened " + e.name), "Move back to review");

    if (!state.confirm || state.confirm.id !== e.id) return;
    const k = state.confirm.kind, box = el("div", { class: "confirm" }, p);
    const msg = { request: "Send a request to <b>" + owner + "</b>, due <b>" + fmt(D.addDays(A.today, 7)) + "</b>?", accept: "Accept this evidence as <b>" + A.lead + "</b>? This is recorded in the log.", exception: "Record an exception. What did you find?" }[k];
    el("div", { html: msg }, box);
    let input, err;
    if (k === "exception") { input = el("input", { type: "text", placeholder: "Example: 3 of 25 samples lacked approval", "aria-label": "Exception note" }, box); err = el("div", { class: "err" }, box); input.addEventListener("input", () => err.textContent = ""); setTimeout(() => input.focus(), 50); }
    const ba = el("div", { class: "actions" }, box);
    const ok = el("button", { class: "btn " + (k === "exception" ? "danger" : k === "accept" ? "go" : ""), text: { request: "Send request", accept: "Confirm accept", exception: "Record exception" }[k] }, ba);
    const cancel = el("button", { class: "btn ghost", text: "Cancel" }, ba);
    cancel.addEventListener("click", () => { state.confirm = null; drawControl(); });
    ok.addEventListener("click", () => {
      if (k === "exception" && !input.value.trim()) { err.textContent = "Enter what you found first."; input.focus(); return; }
      state.confirm = null;
      if (k === "request") change(e, { status: "requested", requestedOn: A.today, due: D.addDays(A.today, 7) }, "Requested " + e.name + " from " + owner);
      if (k === "accept") change(e, { status: "accepted", reviewer: A.lead }, "Accepted " + e.name);
      if (k === "exception") change(e, { status: "exception", reviewer: A.lead, note: input.value.trim() }, "Exception on " + e.name);
    });
  }
  function collect(e) {
    state.busy = e.id; drawControl();
    setTimeout(() => {
      state.busy = null;
      change(e, { status: "collected", collectedOn: A.today, by: "Auto · " + D.SOURCES[e.src].name, hash: "sha256:" + D.hex(8) + "…" + D.hex(4), coverage: "Oct 1, 2025 – Sep 30, 2026", requestedOn: e.requestedOn || A.today }, "Collected " + e.name + " from " + D.SOURCES[e.src].name);
    }, 1100);
  }
  function change(e, patch, msg) {
    Object.assign(e, patch); log(msg); toast(msg);
    drawControl(); render(true);
  }

  // ---------- about ----------
  function openAbout() {
    const body = $("aboutBody"); body.innerHTML = "";
    el("div", { class: "dmeta", text: "OC-01 · Workflow · Owner: Aby Rao" }, body);
    el("h2", { text: "About this build" }, body);
    el("div", { style: "color:var(--muted);font-size:15px", text: "One place for internal auditors to collect, review, and report SOC 2 evidence." }, body);
    el("h3", { text: "Checks" }, body);
    const collected = EV.filter(e => e.collectedOn);
    const cc = counts(EV);
    [[D.controls.every(c => evOf(c).length > 0), "Every control has evidence", "All " + pl(D.controls.length, "control has", "controls have") + " at least one evidence item"],
     [collected.every(e => e.hash), "Every file has a hash", (collected.length === 1 ? "The 1 collected file carries" : "All " + collected.length + " collected files carry") + " an integrity hash"],
     [EV.filter(e => e.stale).every(e => e.status !== "accepted"), "No stale file accepted", "Files dated before the audit period are never in Accepted"],
     [EV.filter(e => e.status === "exception").every(e => e.note), "Every exception has a note", "Exceptions can't be recorded without a description"],
     [ORDER.reduce((a, k) => a + cc[k], 0) === EV.length, "Totals reconcile", "Status counts add up to " + EV.length + " items"]]
      .forEach(([ok, lab, t]) => el("div", { class: "check-row", tabindex: 0, "data-tip": t, html: "<span class='" + (ok ? "pass-tag" : "fail-tag") + "'>" + (ok ? "PASS" : "FAIL") + "</span>" + lab }, body));
    el("h3", { text: "Guardrails" }, body);
    const g = el("div", { class: "guards" }, body);
    [["Approved", "Built with an approved AI tool, using fictional data only"], ["Registered", "Listed in the build inventory as OC-01"],
     ["Minimal", "Connectors read only the files each control test needs"], ["Validated", "The checks above run each time this panel opens"],
     ["Supervised", "Requests, accepts, and exceptions each need an auditor to confirm"], ["Logged", "Every collection, request, and decision goes to the activity log"],
     ["Explainable", "Every AI finding and file check shows its reason on hover"], ["Owned", "Owner: Aby Rao. AI findings have an off switch below"]]
      .forEach(([k, t]) => el("span", { class: "guard", tabindex: 0, "data-tip": t, text: k }, g));
    el("h3", { text: "AI findings" }, body);
    const t = el("button", { class: "tool", "aria-pressed": state.ai ? "true" : "false", text: state.ai ? "On" : "Off", "data-tip": "Turn simulated AI findings and summaries on or off" }, body);
    t.addEventListener("click", () => { state.ai = !state.ai; t.textContent = state.ai ? "On" : "Off"; t.setAttribute("aria-pressed", state.ai ? "true" : "false"); log("AI findings " + (state.ai ? "on" : "off")); render(true); });
    $("about").classList.add("open"); $("about").setAttribute("aria-hidden", "false");
    log("Opened About");
  }
  function closeAll() { ["drawer", "about"].forEach(id => { $(id).classList.remove("open"); $(id).setAttribute("aria-hidden", "true"); }); state.confirm = null; hideTip(); }

  // ---------- render ----------
  function moveSeg() {
    const on = document.querySelector(".seg-btn.on"), ind = document.querySelector(".seg-ind");
    if (on) { ind.style.width = on.offsetWidth + "px"; ind.style.transform = "translateX(" + (on.offsetLeft - 4) + "px)"; }
  }
  function render(keepScroll) {
    const y = scrollY; hideTip();
    const v = $("view"); v.innerHTML = "";
    const t = VIEWS[state.view](); $("question").textContent = t.h; $("subhead").textContent = t.s;
    document.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("on", b.dataset.view === state.view));
    moveSeg();
    ({ overview: renderOverview, controls: renderControls, evidence: renderEvidence, report: renderReport })[state.view](v);
    if (keepScroll) scrollTo(0, y);
  }
  function setView(view, quiet) { state.view = view; if (!quiet) log("Viewed: " + view[0].toUpperCase() + view.slice(1)); render(); scrollTo(0, 0); }

  document.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeAll));
  $("aboutBtn").addEventListener("click", openAbout);
  $("logBtn").addEventListener("click", () => $("log").classList.toggle("open"));
  $("presenterBtn").addEventListener("click", e => { const on = document.body.classList.toggle("presenter"); e.currentTarget.setAttribute("aria-pressed", on ? "true" : "false"); log("Present mode " + (on ? "on" : "off")); render(true); });
  $("resetBtn").addEventListener("click", () => {
    closeAll(); EV = JSON.parse(JSON.stringify(INITIAL));
    Object.assign(state, { status: "all", q: "", evf: "all", evq: "", ai: true, openEv: null, confirm: null, busy: null });
    document.body.classList.remove("presenter"); $("presenterBtn").setAttribute("aria-pressed", "false");
    $("log").classList.remove("open"); $("logList").innerHTML = "";
    setView("overview", true); log("Demo reset"); toast("Demo reset");
  });
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT") { if (e.key === "Escape") e.target.blur(); return; }
    const map = { "1": "overview", "2": "controls", "3": "evidence", "4": "report" };
    if (map[e.key]) setView(map[e.key]);
    if (e.key === "Escape") closeAll();
  });
  addEventListener("resize", moveSeg);
  document.fonts && document.fonts.ready.then(moveSeg);

  setView("overview", true);
  log("Opened · " + A.name);
})();
