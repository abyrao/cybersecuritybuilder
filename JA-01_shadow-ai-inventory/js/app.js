/* JA-01 · Shadow AI inventory and response */
(function () {
  const $ = id => document.getElementById(id);
  const BANDC = { Critical: "#B3261E", High: "#FF5A1F", Medium: "#E3A72F", Low: "#A7A39A" };
  const STATUSC = { sanctioned: "#6B8E4E", tolerated: "#3B6E8F", blacklisted: "#1A1A1A", unreviewed: "#A7A39A" };
  const RULEC = ["#FF5A1F", "#1A1A1A", "#3B6E8F", "#6B8E4E", "#8E5BA8", "#D3CCBE"];
  const VIEWS = [["sources", "Sources", "01"], ["blacklist", "Blacklist", "02"], ["today", "Today", "03"], ["inventory", "Inventory", "04"], ["respond", "Respond", "05"], ["outcomes", "Outcomes", "06"]];
  const DATA = E.generate(), RES = E.evaluate(DATA), P = DATA.people, APP = E.APP, DAYS = E.DAYS, TODAY = JD.TODAY;
  const SSO = new Set(DATA.events.filter(e => e.source === "okta" || e.source === "entra").map(e => e.appId));

  // ---------- helpers ----------
  function el(tag, attrs, parent) {
    const svg = tag.startsWith("svg:");
    const n = svg ? document.createElementNS("http://www.w3.org/2000/svg", tag.slice(4)) : document.createElement(tag);
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v === undefined || v === null || v === false) continue;
      if (k === "text") n.textContent = v; else if (k === "html") n.innerHTML = v; else if (k === "on") for (const e in v) n.addEventListener(e, v[e]); else n.setAttribute(k, v); }
    if (parent) parent.appendChild(n); return n;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = n => Math.round(n).toLocaleString("en-US");
  const pl = (n, one, many) => num(n) + " " + (Math.round(n) === 1 ? one : many);
  const fmt = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const fmtW = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const sum = (l, f) => l.reduce((a, x) => a + f(x), 0);
  const deptName = id => JD.DEPTS.find(d => d.id === id).name;
  const srcName = id => { const s = JD.SOURCES.find(x => x.id === id); return state.product ? s.product : s.generic; };
  const persona = id => JD.PERSONAS.find(p => p.id === id);
  const initials = n => n.split(" ").map(w => w[0]).join("").slice(0, 2);
  const appName = id => id === "spend" ? "AI subscriptions" : APP[id].name;
  const who = id => state.revealed[id] ? P[id].name : id;
  const sev = (s, p) => el("span", { class: "sev", style: "background:" + BANDC[s], text: s }, p);
  const scoreChip = (v, b, p) => el("span", { class: "score", style: "background:" + BANDC[b], text: v, "data-tip": b + " · risk " + v + " of 100" }, p);
  const simTag = t => el("span", { class: "tag", text: "simulated", "data-tip": t || "Produced by simulated AI from the fictional data. Review before acting." });
  function stamp() { const d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, "0")).join(":"); }
  function log(m) { $("logList").prepend(el("li", { html: "<span>" + stamp() + "</span>" + esc(m) })); }
  let tT; function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tT); tT = setTimeout(() => t.classList.remove("show"), 2600); }
  function kpi(p, k, v, s, cls, tipT, i) { const c = el("div", { class: "card kpi " + (cls || ""), tabindex: 0, "data-tip": tipT, style: "animation-delay:" + i * .05 + "s" }, p); el("div", { class: "k", text: k }, c); el("div", { class: "v", text: v }, c); el("div", { class: "s", text: s }, c); }
  function cardHead(p, title, tipT, right) { const h = el("div", { class: "card-head" }, p), l = el("div", { style: "display:flex;gap:8px;align-items:center;min-width:0" }, h); el("div", { class: "card-title", text: title }, l); if (tipT) el("button", { class: "info", "data-tip": tipT, "aria-label": "About this", text: "?" }, l); if (right) h.appendChild(right); return h; }
  function head(p, h, sub, right) { const r = el("div", { class: "headrow" }, p), l = el("div", null, r); el("h1", { html: h }, l); el("p", { class: "subhead", text: sub }, l); if (right) r.appendChild(right); }

  // ---------- tooltips ----------
  const tip = $("tip");
  function showTip(t) { const text = t.getAttribute("data-tip"); if (!text) return; tip.textContent = text; tip.classList.add("show");
    const r = t.getBoundingClientRect(), b = tip.getBoundingClientRect(); let x = r.left + r.width / 2 - b.width / 2, y = r.bottom + 8; if (y + b.height > innerHeight - 52) y = r.top - b.height - 8;
    tip.style.left = Math.max(8, Math.min(innerWidth - b.width - 8, x)) + "px"; tip.style.top = Math.max(8, y) + "px"; }
  const hideTip = () => tip.classList.remove("show");
  document.addEventListener("mouseover", e => { const t = e.target.closest && e.target.closest("[data-tip]"); t ? showTip(t) : hideTip(); });
  document.addEventListener("focusin", e => { const t = e.target.closest && e.target.closest("[data-tip]"); t ? showTip(t) : hideTip(); });
  document.addEventListener("scroll", hideTip, true);

  // ---------- state ----------
  let state, playT;
  function fresh() { return { view: "sources", persona: "jordan", product: false, day: TODAY, dept: null, statusF: "all", revealed: {}, actions: RS.build(DATA, RES), sel: "A1", proposals: [], committee: [], tomorrow: false, followups: [] }; }
  const actsOn = d => RES.activities.filter(a => a.date === d);
  const action = id => state.actions.find(a => a.id === id);

  // ---------- shell ----------
  function render() {
    const r = $("rail"); r.innerHTML = "";
    VIEWS.forEach(([id, lab, ic]) => { const b = el("button", { class: "rl" + (state.view === id ? " on" : ""), on: { click: () => setView(id) } }, r);
      el("span", { class: "ic", text: ic }, b); el("span", { text: lab }, b);
      if (id === "respond") { const n = state.actions.filter(a => a.status !== "done" && a.status !== "monitoring" && !(a.kind === "remove" && a.phase === "remaining")).length; if (n) el("span", { class: "ct", text: n }, b); } else el("span", null, b); });
    el("hr", { class: "aux" }, r);
    el("button", { class: "rl aux", html: "<span class='ic'>07</span><span>Log</span><span></span>", on: { click: () => { const l = $("log"); l.classList.toggle("open"); l.setAttribute("aria-hidden", !l.classList.contains("open")); } } }, r);
    el("button", { class: "rl aux", html: "<span class='ic'>08</span><span>Checks</span><span></span>", on: { click: openChecks } }, r);
    const v = $("view"); v.innerHTML = ""; v.style.animation = "none"; void v.offsetWidth; v.style.animation = "";
    ({ sources: renderSources, blacklist: renderBlacklist, today: renderToday, inventory: renderInventory, respond: renderRespond, outcomes: renderOutcomes })[state.view](v);
  }
  function setView(v) { stopPlay(); state.view = v; closeDrawer(); render(); window.scrollTo(0, 0); }

  // ---------- Sources ----------
  function renderSources(v) {
    head(v, "What can we <em>see</em>?", "10 security and finance tools feed one AI inventory");
    const k = el("div", { class: "kpis" }, v);
    kpi(k, "Events", num(DATA.events.length), "AI-related, 30 days", "", "Normalized events from all 10 sources", 0);
    kpi(k, "AI apps", "64", "5 sanctioned · 14 blacklisted", "", "8 tolerated with limits, 37 unreviewed", 1);
    kpi(k, "People", num(new Set(DATA.events.map(e => e.personId)).size), "with AI activity", "", "Of about 4,200 employees", 2);
    kpi(k, "Signals", num(RES.signals.length), "person + app + rule", "hot", "One signal per person, app, and blacklist rule", 3);
    kpi(k, "Not in SSO", num(JD.APPS.filter(a => DATA.events.some(e => e.appId === a.id) && !SSO.has(a.id)).length), "apps no sign-in log shows", "", "Seen only by browser, network, endpoint, DLP, or finance data", 4);
    const c = el("div", { class: "card pad flowwrap" }, v);
    cardHead(c, "Ten tools, one inventory", "Each tool sees a slice. Correlating them finds AI that no single tool sees.", simTag("Correlation and AI classification are simulated"));
    flow(c);
    const row = el("div", { class: "row2e mt" }, v);
    const g = el("div", { class: "card pad" }, row); cardHead(g, "Coverage gaps", "Places these tools can't see. Shown so nobody assumes the inventory is complete.");
    const gw = el("div", { class: "gaps" }, g); JD.GAPS.forEach(([a, b]) => el("div", { class: "gap", html: "<i></i><div><b>" + esc(a) + "</b><span>" + esc(b) + "</span></div>" }, gw));
    const b = el("div", { class: "card pad" }, row); cardHead(b, "Business context added", "Data the security tools don't have");
    [["Committee blacklist v3.2", "12 rules, approved Oct 14"], ["HR directory", "Department, manager, admin and executive flags"], ["Data access tiers", "Who can reach payroll, customer, financial, or production data"], ["Exceptions and calendar", "2 approved pilots · Q3 close Oct 1–8"]]
      .forEach(([a, s]) => el("div", { class: "gap", html: "<i style='background:var(--green)'></i><div><b>" + esc(a) + "</b><span>" + esc(s) + "</span></div>" }, b));
  }
  function flow(p) {
    const W = 1160, H = 440, svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Ten sources flowing into one inventory" }, p);
    const cx = 640, cy = H / 2, counts = {}; DATA.events.forEach(e => counts[e.source] = (counts[e.source] || 0) + 1);
    const maxC = Math.max(...Object.values(counts));
    JD.SOURCES.forEach((s, i) => {
      const y = 22 + i * 41, x = 20;
      const path = "M" + (x + 290) + "," + (y + 16) + " C" + (cx - 160) + "," + (y + 16) + " " + (cx - 160) + "," + cy + " " + (cx - 70) + "," + cy;
      el("svg:path", { d: path, fill: "none", stroke: "#D3CCBE", "stroke-width": 1 + 5 * counts[s.id] / maxC, id: "fp" + i }, svg);
      for (let k = 0; k < 2; k++) { const c = el("svg:circle", { r: 3.5, cx: -100, cy: -100, fill: i === 6 || i === 7 ? "#FF5A1F" : "#3B6E8F" }, svg); const am = el("svg:animateMotion", { dur: (2.4 + (i % 4) * .4) + "s", repeatCount: "indefinite", begin: (k * 1.2 + i * .15) + "s" }, c); el("svg:mpath", { href: "#fp" + i }, am); }
      const g = el("svg:g", { class: "srcnode", "data-tip": srcName(s.id) + " · " + s.cat + " · " + s.adds + " · last sync " + (s.sync >= 1440 ? "daily" : s.sync + " min ago") }, svg);
      el("svg:rect", { x, y, width: 290, height: 32, rx: 8, fill: "#FFFFFF", stroke: "#E6E1D6" }, g);
      el("svg:text", { x: x + 12, y: y + 21, text: srcName(s.id), style: "font-size:13px;font-weight:600;fill:#1A1A1A" }, g);
      el("svg:text", { x: x + 196, y: y + 21, text: num(counts[s.id] || 0), style: "font-family:'IBM Plex Mono';font-size:11.5px;fill:#6B675F", "text-anchor": "end" }, g);
      el("svg:circle", { cx: x + 214, cy: y + 16, r: 4, fill: s.sync <= 15 ? "#6B8E4E" : "#E3A72F" }, g);
      el("svg:text", { x: x + 224, y: y + 20, text: s.sync >= 1440 ? "daily" : s.sync + " min", style: "font-family:'IBM Plex Mono';font-size:10.5px;fill:#6B675F" }, g);
    });
    el("svg:circle", { cx, cy, r: 70, fill: "#1A1A1A" }, svg);
    el("svg:text", { x: cx, y: cy - 6, "text-anchor": "middle", text: "Inventory", style: "fill:#F4F1EA;font-size:17px;font-weight:700" }, svg);
    el("svg:text", { x: cx, y: cy + 16, "text-anchor": "middle", text: "correlate · score", style: "fill:#A7A39A;font-family:'IBM Plex Mono';font-size:11px" }, svg);
    const outs = [["64 AI apps", "inventory", "Every AI app seen, with its status"], [num(RES.signals.length) + " signals", "today", "Blacklist matches, risk-scored"], [state.actions.length + " responses", "respond", "Notices, blocks, revocations, removals"]];
    outs.forEach(([t, v2, d], i) => { const y = cy - 110 + i * 82;
      el("svg:path", { d: "M" + (cx + 70) + "," + cy + " C" + (cx + 160) + "," + cy + " " + (cx + 160) + "," + (y + 26) + " " + (cx + 230) + "," + (y + 26), fill: "none", stroke: "#1A1A1A", "stroke-width": 2 }, svg);
      const g = el("svg:g", { style: "cursor:pointer", "data-tip": d, on: { click: () => setView(v2) } }, svg);
      el("svg:rect", { x: cx + 230, y, width: 250, height: 52, rx: 10, fill: i === 1 ? "#FF5A1F" : "#FFFFFF", stroke: i === 1 ? "#FF5A1F" : "#1A1A1A" }, g);
      el("svg:text", { x: cx + 248, y: y + 32, text: t, style: "font-size:17px;font-weight:700;fill:" + (i === 1 ? "#FFFFFF" : "#1A1A1A") }, g);
    });
  }

  // ---------- Blacklist ----------
  function ruleSignals(id) { return RES.signals.filter(s => s.ruleId === id); }
  function renderBlacklist(v) {
    head(v, "What did the <em>committee</em> decide?", "Blacklist v3.2 · 12 rules · approved by the AI Governance Committee on Oct 14, 2026");
    const vs = el("div", { class: "versions" }, v);
    JD.VERSIONS.forEach(x => el("div", { class: "ver" + (x.v === "3.2" ? " on" : ""), html: "<b>v" + x.v + "</b> · " + fmt(x.date) + (x.v === "3.2" ? " · in force" : "") + "<span>" + esc(x.note) + "</span>" }, vs));
    const types = ["Usage", "App", "Extension", "Endpoint", "OAuth", "Spend"];
    const g0 = el("div", { class: "grp" }, v), w0 = el("div", { class: "rules" }, g0);
    types.forEach(t => Object.keys(JD.RULES).filter(id => JD.RULES[id].type === t && !JD.RULES[id].retired).forEach(id => ruleCard(w0, id, w0.children.length)));
    const g = el("div", { class: "grp" }, v); el("div", { class: "eyebrow", text: "Retired in v3.2", style: "margin-bottom:8px" }, g); ruleCard(el("div", { class: "rules" }, g), "R-IMG", 0);
    if (state.proposals.length) { const c = el("div", { class: "card pad mt" }, v); cardHead(c, "Waiting for the committee", "Proposals never change the blacklist until the committee approves a new version");
      state.proposals.forEach(pp => el("div", { class: "note", text: pp.rule + " · " + pp.text + " · proposed by " + persona(pp.by).name + " · next committee meeting Nov 4" }, c)); }
  }
  function ruleCard(p, id, i) {
    const r = JD.RULES[id], sig = ruleSignals(id);
    const b = el("button", { class: "rule" + (r.retired ? " retired" : ""), style: "animation-delay:" + i * .04 + "s", on: { click: () => openRule(id) } }, p);
    const t = el("div", { class: "top" }, b); el("span", { class: "id", text: id + " · " + r.type.toLowerCase() }, t); sev(r.sev, t);
    el("div", { class: "nm", text: r.name }, b);
    const f = el("div", { class: "ft" }, b); el("span", { text: pl(sig.length, "signal", "signals") + " · " + (r.retired ? "retired Oct 14" : r.grace ? r.grace + "-day grace" : "no grace") }, f);
    const sv = el("svg:svg", { width: 90, height: 24, viewBox: "0 0 90 24" }, f);
    const daily = DAYS.map(d => RES.activities.filter(a => a.ruleId === id && a.date === d).length), m = Math.max(1, ...daily);
    el("svg:polyline", { points: daily.map((n, k) => (k * 3) + "," + (22 - n / m * 20)).join(" "), fill: "none", stroke: r.retired ? "#A7A39A" : "#FF5A1F", "stroke-width": 1.5 }, sv);
  }
  function openRule(id) {
    const r = JD.RULES[id], body = $("drawerBody"); body.innerHTML = ""; const sig = ruleSignals(id);
    el("div", { class: "eyebrow", text: id + " · " + r.type + (r.retired ? " · retired in v3.2" : " · blacklist v3.2") }, body);
    el("h2", { text: r.name }, body); sev(r.sev, el("div", { class: "who" }, body));
    const f = el("div", { class: "facts" }, body);
    [["Playbook", r.playbook], ["Grace", r.grace ? pl(r.grace, "business day", "business days") : "None"], ["Policy", r.policy], ["Signals", pl(sig.length, "signal", "signals")], ["People", num(new Set(sig.map(s => s.personId)).size)], ["Owner", "AI Governance Committee"]]
      .forEach(([a, b2]) => el("div", { class: "fact", html: esc(a) + "<b>" + esc(b2) + "</b>" }, f));
    el("h4", { text: "Why the committee decided this" }, body); el("div", { class: "note", style: "margin-top:0", text: JD.RULE_RATIONALE[id] }, body);
    el("h4", { text: "Version history" }, body);
    JD.VERSIONS.forEach(x => el("div", { class: "note", text: "v" + x.v + " · " + fmt(x.date) + " · " + x.note }, body));
    el("h4", { text: "Propose a change" }, body);
    const form = el("div", { class: "form" }, body); const ta = el("textarea", { rows: 2, placeholder: "What should change, and why?" }, form);
    el("button", { class: "btn dark", text: "Send to the committee", "data-tip": "Analysts can only propose. The committee publishes a new version.", on: { click: () => {
      if (ta.value.trim().length < 10) return toast("Describe the change in at least 10 characters.");
      state.proposals.push({ rule: id, text: ta.value.trim(), by: state.persona }); log("Proposed a change to " + id + ": " + ta.value.trim() + " (queued for the committee)"); toast("Queued for the Nov 4 committee meeting. The blacklist is unchanged."); closeDrawer(); render(); } } }, form);
    openDrawer();
  }

  // ---------- Today ----------
  function renderToday(v) {
    const playBtn = el("button", { class: "btn pri", text: playT ? "Pause" : "Play 30 days", "data-tip": "Animate the last 30 days, one day at a time", on: { click: () => playT ? stopPlay(true) : startPlay() } });
    head(v, "What's happening <em>" + (state.day === TODAY ? "today" : fmt(state.day)) + "</em>?", "Blacklist matches by day, department, and rule", playBtn);
    const sc = el("div", { class: "scrub" }, v);
    const rg = el("input", { type: "range", min: 0, max: 29, value: DAYS.indexOf(state.day), "aria-label": "Day" }, sc); el("span", { class: "d", text: fmtW(state.day) }, sc);
    rg.addEventListener("input", () => { state.day = DAYS[+rg.value]; render(); });
    const acts = actsOn(state.day).filter(a => !state.dept || a.dept === state.dept), hi = acts.filter(a => a.band === "High" || a.band === "Critical");
    const newS = RES.signals.filter(s => s.first === state.day && (!state.dept || s.dept === state.dept));
    const k = el("div", { class: "kpis" }, v);
    kpi(k, "Active", num(acts.length), "signals with activity", "", "Signals with matching activity on " + fmt(state.day), 0);
    kpi(k, "New", num(newS.length), "first seen this day", "", "Signals seen for the first time", 1);
    kpi(k, "High risk", num(hi.length), "High or Critical", hi.length ? "hot" : "", "Risk 50 or more", 2);
    kpi(k, "Not in SSO", hi.length ? Math.round(hi.filter(a => !SSO.has(a.appId)).length / hi.length * 100) + "%" : "–", "of high-risk signals", "", "Share of high-risk signals from apps that never appear in sign-in logs", 3);
    kpi(k, "People", num(new Set(acts.map(a => a.personId)).size), state.dept ? deptName(state.dept) : "all departments", "", "Distinct people with active signals", 4);
    const row = el("div", { class: "row2" }, v);
    const hc = el("div", { class: "card pad" }, row);
    const clr = state.dept ? el("button", { class: "chip on", text: deptName(state.dept) + " ✕", on: { click: () => { state.dept = null; render(); } } }) : null;
    cardHead(hc, "Risk by department and day", "Each cell sums the risk of active signals. Click a cell to filter. The band marks Q3 close (Oct 1–8).", clr);
    heat(hc);
    const sa = el("div", { class: "card pad" }, row); cardHead(sa, "Signals by rule", "Daily active signals, stacked by blacklist rule");
    stacked(sa);
    const r2 = el("div", { class: "row2 mt" }, v);
    const tc = el("div", { class: "card pad", style: "overflow-x:auto" }, r2);
    cardHead(tc, "Top signals · " + fmt(state.day), "Highest risk first. People appear as employee IDs until someone with a reason reveals a name.");
    const tb = el("table", { class: "tbl" }, tc), hr = el("tr", null, el("thead", null, tb)); ["Risk", "App", "Rule", "Person", "Dept", "Sources"].forEach(h => el("th", { text: h }, hr));
    const bd = el("tbody", null, tb);
    acts.slice().sort((a, b) => b.risk - a.risk).slice(0, 10).forEach(a => { const s = RES.signals.find(x => x.personId === a.personId && x.appId === a.appId && x.ruleId === a.ruleId);
      const tr = el("tr", { class: "click", tabindex: 0, on: { click: () => openSignal(s.id), keydown: e => { if (e.key === "Enter") openSignal(s.id); } } }, bd);
      scoreChip(a.risk, a.band, el("td", null, tr)); el("td", { text: APP[a.appId].name }, tr); el("td", { class: "mono", text: a.ruleId, "data-tip": JD.RULES[a.ruleId].name }, tr);
      el("td", { class: "mono", text: who(a.personId) }, tr); el("td", { text: deptName(a.dept) }, tr); el("td", { class: "num", text: a.sources.length, "data-tip": a.sources.map(srcName).join(", ") }, tr); });
    if (!acts.length) el("div", { class: "note", text: "No blacklist matches on this day." }, tc);
    const scard = el("div", { class: "card pad" }, r2); cardHead(scard, "Who saw it", "Which tools contributed evidence to this day's signals");
    const cnt = {}; acts.forEach(a => a.sources.forEach(s => cnt[s] = (cnt[s] || 0) + 1)); const tot = sum(Object.values(cnt), x => x) || 1;
    const bar = el("div", { class: "srcbar" }, scard); const ord = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
    ord.forEach((s, i) => el("span", { style: "width:" + cnt[s] / tot * 100 + "%;background:" + RULEC[i % 5], "data-tip": srcName(s) + " · " + pl(cnt[s], "signal", "signals") }, bar));
    const lg = el("div", { class: "legend", style: "margin-top:10px" }, scard); ord.forEach((s, i) => el("span", { html: "<i style='background:" + RULEC[i % 5] + "'></i>" + esc(srcName(s)) + " " + cnt[s] }, lg));
    el("div", { class: "note", text: "Signals backed by 3 or more tools score full corroboration. A single-tool signal is never treated as high confidence." }, scard);
  }
  function heat(p) {
    const W = 760, L = 128, T = 18, cw = (W - L - 10) / 30, ch = 26, H = T + JD.DEPTS.length * ch + 30;
    const svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", class: "heat", role: "img", "aria-label": "Risk heatmap by department and day" }, p);
    const ci = DAYS.indexOf(JD.CLOSE[0]), ce = DAYS.indexOf(JD.CLOSE[1]);
    el("svg:rect", { x: L + ci * cw, y: 4, width: (ce - ci + 1) * cw, height: H - 30, fill: "#FF5A1F", opacity: .07 }, svg);
    el("svg:text", { x: L + ci * cw + 2, y: 13, text: "Q3 close", style: "fill:#FF5A1F" }, svg);
    const m = {}; RES.activities.forEach(a => { const k = a.dept + a.date; m[k] = (m[k] || 0) + a.risk; }); const mx = Math.max(...Object.values(m));
    JD.DEPTS.forEach((d, r) => { el("svg:text", { x: L - 8, y: T + r * ch + 17, "text-anchor": "end", text: d.name, style: "font-family:'Space Grotesk';font-size:12px;fill:" + (state.dept === d.id ? "#FF5A1F" : "#1A1A1A") }, svg);
      DAYS.forEach((day, c) => { const v = m[d.id + day] || 0, t = v / mx;
        el("svg:rect", { class: "cell", x: L + c * cw + 1, y: T + r * ch + 1, width: cw - 2, height: ch - 2, rx: 3, fill: v ? "rgba(255,90,31," + (0.08 + t * .92).toFixed(2) + ")" : "#F4F1EA", stroke: day === state.day ? "#1A1A1A" : "none", "stroke-width": 1.5,
          "data-tip": d.name + " · " + fmtW(day) + " · risk " + num(v), on: { click: () => { state.day = day; state.dept = state.dept === d.id ? null : d.id; render(); } } }, svg); }); });
    DAYS.forEach((d, c) => { if (c % 7 === 1 || c === 29) el("svg:text", { x: L + c * cw + cw / 2, y: H - 10, "text-anchor": "middle", text: fmt(d) }, svg); });
  }
  function stacked(p) {
    const W = 520, H = 260, L = 34, B = 26, T = 10, svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", class: "chart", role: "img", "aria-label": "Daily signals by rule" }, p);
    const tops = ["BL-04", "BL-02", "BL-01", "BL-09", "BL-06"], series = tops.concat(["Other"]);
    const rows = DAYS.map(d => { const a = RES.activities.filter(x => x.date === d && (!state.dept || x.dept === state.dept)); const o = {}; series.forEach(s => o[s] = 0); a.forEach(x => { o[tops.includes(x.ruleId) ? x.ruleId : "Other"]++; }); return o; });
    const mx = Math.max(1, ...rows.map(r => sum(series, s => r[s]))), X = i => L + i / 29 * (W - L - 8), Y = v => T + (1 - v / mx) * (H - T - B);
    [0, .5, 1].forEach(g => { el("svg:line", { x1: L, x2: W - 8, y1: Y(mx * g), y2: Y(mx * g), stroke: "#E6E1D6" }, svg); el("svg:text", { x: L - 6, y: Y(mx * g) + 4, "text-anchor": "end", text: Math.round(mx * g) }, svg); });
    let base = DAYS.map(() => 0);
    series.forEach((s, si) => { const top = base.map((b, i) => b + rows[i][s]);
      const d = top.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ") + " " + base.map((v, i) => "L" + X(29 - i).toFixed(1) + "," + Y(base[29 - i]).toFixed(1)).join(" ") + " Z";
      el("svg:path", { d, fill: RULEC[si], opacity: .85, "data-tip": s === "Other" ? "Other rules" : s + " · " + JD.RULES[s].name }, svg); base = top; });
    const di = DAYS.indexOf(state.day); el("svg:line", { x1: X(di), x2: X(di), y1: T, y2: H - B, stroke: "#1A1A1A", "stroke-dasharray": "3 3" }, svg);
    [0, 7, 14, 21, 29].forEach(i => el("svg:text", { x: X(i), y: H - 8, "text-anchor": i === 29 ? "end" : i === 0 ? "start" : "middle", text: fmt(DAYS[i]) }, svg));
    el("div", { class: "legend", html: series.map((s, i) => "<span><i style='background:" + RULEC[i] + "'></i>" + s + "</span>").join("") + "<span>Mondays: weekly extension inventory</span>" }, p);
  }
  function startPlay() { let i = 0; state.day = DAYS[0]; render(); playT = setInterval(() => { i++; if (i > 29) return stopPlay(true); state.day = DAYS[i]; render(); }, 260); log("Played 30 days"); }
  function stopPlay(rr) { if (playT) { clearInterval(playT); playT = null; if (rr) render(); } }

  // ---------- Signal drawer ----------
  function openSignal(id) {
    const s = RES.signals.find(x => x.id === id), p = P[s.personId], a = APP[s.appId], r = JD.RULES[s.ruleId], body = $("drawerBody"); body.innerHTML = "";
    el("div", { class: "eyebrow", text: s.id + " · " + s.ruleId + " · " + r.type }, body);
    el("h2", { text: a.name + ": " + r.name.charAt(0).toLowerCase() + r.name.slice(1) }, body);
    const w = el("div", { class: "who" }, body); el("span", { class: "mono", text: who(p.id) }, w);
    el("span", { text: deptName(p.dept) + " · " + p.role + (p.admin ? " · admin" : "") }, w);
    if (!state.revealed[p.id]) { const rb = el("button", { class: "btn sm ghost", text: "Reveal name", "data-tip": "Needs a reason; every reveal is logged" }, w);
      rb.addEventListener("click", () => { const f = el("div", { class: "form", style: "width:100%" }, w); const sel = el("select", null, f); ["Send the notice", "Manager follow-up", "Incident response"].forEach(o => el("option", { text: o }, sel));
        el("button", { class: "btn sm dark", text: "Reveal", on: { click: () => { state.revealed[p.id] = sel.value; log(persona(state.persona).name + " revealed " + p.id + " (reason: " + sel.value + ")"); openSignal(id); render(); openDrawer(); } } }, f); rb.remove(); }); }
    else el("span", { class: "pill", text: "revealed · " + state.revealed[p.id] }, w);
    const f = el("div", { class: "facts" }, body);
    [["First seen", fmt(s.first)], ["Last seen", fmt(s.last)], ["Active days", num(s.days.length)], ["Events", num(s.eventIds.length)], ["App status", a.status], ["In SSO logs", SSO.has(a.id) ? "Yes" : "Never"]]
      .forEach(([k, v2]) => el("div", { class: "fact", html: esc(k) + "<b>" + esc(v2) + "</b>" }, f));
    el("h4", { html: "Risk <button class='info' data-tip='risk = severity × data access × corroboration × calendar, capped at 100' aria-label='Formula'>?</button>" }, body);
    const sb = el("div", { class: "scorebox" }, body), ring = el("div", { class: "ring" }, sb), sv = el("svg:svg", { viewBox: "0 0 96 96", width: 96, height: 96 }, ring), C = 2 * Math.PI * 40;
    el("svg:circle", { cx: 48, cy: 48, r: 40, fill: "none", stroke: "#E6E1D6", "stroke-width": 9 }, sv);
    el("svg:circle", { cx: 48, cy: 48, r: 40, fill: "none", stroke: BANDC[s.band], "stroke-width": 9, "stroke-linecap": "round", "stroke-dasharray": (C * s.risk / 100) + " " + C, transform: "rotate(-90 48 48)" }, sv);
    el("div", { class: "lbl", html: "<div><b>" + s.risk + "</b><span>" + s.band + "</span></div>" }, ring);
    const fx = el("div", null, sb), mx = { Severity: 50, "Data access": 2, Corroboration: 1, Calendar: 1.25 };
    s.factors.forEach(x => { const r2 = el("div", { class: "fac", tabindex: 0, "data-tip": "Why: " + x.t }, fx); el("span", { text: x.k }, r2); const t = el("div", { class: "track" }, r2); el("span", { style: "width:" + Math.min(100, x.v / mx[x.k] * 100) + "%;background:" + BANDC[s.band] }, t); el("span", { class: "x", text: (x.k === "Severity" ? "" : "×") + x.v }, r2); });
    el("div", { class: "note", text: "Why? " + s.factors.map(x => x.t).join(" · ") + ". " + s.factors.map(x => x.v).join(" × ") + " → " + s.risk + "." }, body);
    el("h4", { text: "Evidence by source · 30 days" }, body);
    lanes(body, s);
    const ex = JD.EXCEPTIONS.find(x => x.app === s.appId && x.dept === p.dept);
    el("div", { class: "note" + (ex ? "" : " ok"), text: ex ? "Exception " + ex.id + " (" + ex.reason + ") ran until " + fmt(ex.until) + "." : "Exception check: no approved exception covers this person and app." }, body);
    const ac = state.actions.find(x => x.app === s.appId || (x.app === "spend" && s.ruleId === "BL-08"));
    el("h4", { text: "Recommended response" }, body);
    el("div", { class: "note", style: "margin-top:0", text: r.playbook + (r.grace ? " · " + pl(r.grace, "business day", "business days") + " grace" : " · no grace period") + "." }, body);
    if (ac) el("button", { class: "btn pri", style: "margin-top:10px", text: "Open in Respond", on: { click: () => { state.sel = ac.id; setView("respond"); } } }, body);
    openDrawer(); log("Opened " + s.id + " · " + a.name + " · " + s.ruleId);
  }
  function lanes(p, s) {
    const evs = DATA.events.filter(e => e.personId === s.personId && e.appId === s.appId), srcs = [...new Set(evs.map(e => e.source))];
    const W = 560, L = 150, rh = 26, H = srcs.length * rh + 26, svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", class: "lanes", role: "img", "aria-label": "Evidence timeline" }, p);
    const X = d => L + DAYS.indexOf(d) / 29 * (W - L - 10);
    srcs.forEach((src, i) => { const y = 8 + i * rh; el("svg:text", { x: L - 10, y: y + 12, "text-anchor": "end", text: srcName(src), style: "font-family:'Space Grotesk';font-size:12px;fill:#1A1A1A" }, svg);
      el("svg:line", { x1: L, x2: W - 10, y1: y + 8, y2: y + 8, stroke: "#E6E1D6" }, svg);
      const byD = {}; evs.filter(e => e.source === src).forEach(e => byD[e.date] = (byD[e.date] || 0) + 1);
      Object.keys(byD).forEach(d => el("svg:circle", { cx: X(d), cy: y + 8, r: Math.min(8, 3 + byD[d] / 2), fill: src === "purview" ? "#B3261E" : src === "concur" || src === "amex" ? "#FF5A1F" : "#3B6E8F", "data-tip": srcName(src) + " · " + fmt(d) + " · " + pl(byD[d], "event", "events") }, svg)); });
    [0, 14, 29].forEach(i => el("svg:text", { x: L + i / 29 * (W - L - 10), y: H - 4, "text-anchor": i === 29 ? "end" : "middle", text: fmt(DAYS[i]) }, svg));
  }

  // ---------- Inventory ----------
  function appStats(a) { const evs = DATA.events.filter(e => e.appId === a.id), sig = RES.signals.filter(s => s.appId === a.id); return { events: evs.length, people: new Set(evs.map(e => e.personId)).size, risk: Math.max(0, ...sig.map(s => s.risk)), signals: sig.length, sources: [...new Set(evs.map(e => e.source))] }; }
  function renderInventory(v) {
    head(v, "What <em>AI</em> is in use?", "64 apps seen in 30 days, by risk and reach");
    const ch = el("div", { class: "chips", style: "margin-bottom:12px" }, v);
    ["all", "sanctioned", "tolerated", "blacklisted", "unreviewed"].forEach(s => el("button", { class: "chip" + (state.statusF === s ? " on" : ""), html: (s !== "all" ? "<span class='dot' style='background:" + STATUSC[s] + "'></span>" : "") + (s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)) + "<span class='c'>" + (s === "all" ? 64 : JD.APPS.filter(a => a.status === s).length) + "</span>", on: { click: () => { state.statusF = s; render(); } } }, ch));
    const c = el("div", { class: "card pad" }, v); cardHead(c, "Apps by risk and people", "Right = highest signal risk. Up = more people (log scale). Size = events. Color = status.");
    const W = 1160, H = 440, L = 54, B = 34, T = 40, svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", class: "chart", role: "img", "aria-label": "AI apps by risk and people" }, c), placed = [];
    const st = JD.APPS.map(a => Object.assign({ a }, appStats(a))), mxp = Math.max(...st.map(s => s.people)), mxe = Math.max(...st.map(s => s.events));
    const X = r => L + r / 100 * (W - L - 20), Y = n => T + (1 - Math.log10(n + 1) / Math.log10(mxp + 1)) * (H - T - B);
    [0, 25, 50, 75, 100].forEach(g => { el("svg:line", { x1: X(g), x2: X(g), y1: T, y2: H - B, stroke: "#E6E1D6" }, svg); el("svg:text", { x: X(g), y: H - 12, "text-anchor": "middle", text: g }, svg); });
    [1, 10, 100].forEach(g => { if (g <= mxp) { el("svg:line", { x1: L, x2: W - 20, y1: Y(g), y2: Y(g), stroke: "#E6E1D6", "stroke-dasharray": "2 4" }, svg); el("svg:text", { x: L - 8, y: Y(g) + 4, "text-anchor": "end", text: g }, svg); } });
    el("svg:text", { x: W - 20, y: H - 12, "text-anchor": "end", text: "highest signal risk →" }, svg);
    st.sort((a, b) => b.events - a.events).forEach((s, i) => { const on = state.statusF === "all" || s.a.status === state.statusF, rr = 5 + 22 * Math.sqrt(s.events / mxe), jx = (i % 5 - 2) * 3;
      const g = el("svg:circle", { class: "bub", cx: X(s.risk) + jx, cy: Y(s.people), r: rr, fill: STATUSC[s.a.status], opacity: on ? (s.a.status === "unreviewed" ? .55 : .8) : .08, stroke: "#fff", "stroke-width": 1.5, tabindex: on ? 0 : -1,
        "data-tip": s.a.name + " · " + s.a.status + " · " + pl(s.people, "person", "people") + " · " + pl(s.events, "event", "events") + " · max risk " + s.risk + (SSO.has(s.a.id) ? "" : " · never in SSO"), on: { click: () => openApp(s.a.id) } }, svg);
      if (on && (s.risk >= 50 || s.people > 150)) { const right = X(s.risk) > W - 220, lx = right ? X(s.risk) + jx - rr - 4 : X(s.risk) + jx + rr + 4, ly = Y(s.people) + 4, w = s.a.name.length * 7;
        const x0 = right ? lx - w : lx; if (!placed.some(q => Math.abs(q.y - ly) < 15 && x0 < q.x + q.w + 6 && q.x < x0 + w + 6)) { placed.push({ x: x0, y: ly, w });
          el("svg:text", { x: lx, y: ly, "text-anchor": right ? "end" : "start", text: s.a.name, style: "font-family:'Space Grotesk';font-size:12px;fill:#1A1A1A;font-weight:600", "pointer-events": "none" }, svg); } } });
    el("div", { class: "legend", style: "margin-top:6px", html: Object.keys(STATUSC).map(k => "<span><i style='background:" + STATUSC[k] + "'></i>" + k + "</span>").join("") }, c);
    const r2 = el("div", { class: "row2e mt" }, v);
    const sn = el("div", { class: "card pad" }, r2); cardHead(sn, "Paid-for seats sitting idle", "Sanctioned enterprise seats with no one assigned. Redirecting personal accounts here costs nothing extra.");
    JD.SANCTIONED.forEach(x => { const r = el("div", { class: "gap", style: "grid-template-columns:minmax(0,1fr) auto" }, sn); el("div", { html: "<b>" + esc(x.name) + "</b><span>" + num(x.assigned) + " of " + num(x.seats) + " assigned</span>" }, r); el("span", { class: "pill acc", text: num(x.seats - x.assigned) + " idle" }, r); });
    const un = el("div", { class: "card pad" }, r2); cardHead(un, "Unreviewed, most used", "Not on the blacklist and not approved. Send to the committee to start a vendor review (JA-02).");
    st.filter(s => s.a.status === "unreviewed").sort((a, b) => b.people - a.people).slice(0, 6).forEach(s => { const r = el("div", { class: "gap", style: "grid-template-columns:minmax(0,1fr) auto" }, un);
      el("div", { html: "<b>" + esc(s.a.name) + "</b><span>" + pl(s.people, "person", "people") + " · " + (SSO.has(s.a.id) ? "in SSO" : "never in SSO") + "</span>" }, r);
      el("button", { class: "btn sm", text: state.committee.includes(s.a.id) ? "Queued ✓" : "Send to committee", on: { click: () => sendCommittee(s.a.id) } }, r); });
  }
  function sendCommittee(id) { if (state.committee.includes(id)) return toast("Already queued."); state.committee.push(id); log("Sent " + APP[id].name + " to the committee: opens JA-02 AI vendor intake with the vendor pre-filled (simulated)"); toast(APP[id].name + " sent to JA-02 vendor intake"); render(); if ($("drawer").classList.contains("open")) openApp(id); }
  function openApp(id) {
    const a = APP[id], s = appStats(a), body = $("drawerBody"); body.innerHTML = "";
    el("div", { class: "eyebrow", text: a.status + " · " + a.cat }, body); el("h2", { text: a.name }, body);
    const f = el("div", { class: "facts" }, body);
    [["People", num(s.people)], ["Events", num(s.events)], ["Signals", num(s.signals)], ["Max risk", s.risk || "–"], ["In SSO logs", SSO.has(id) ? "Yes" : "Never"], ["Domain", a.domain]].forEach(([k, v2]) => el("div", { class: "fact", html: esc(k) + "<b>" + esc(v2) + "</b>" }, f));
    el("h4", { text: "Seen by" }, body); const ch = el("div", { class: "chips" }, body); s.sources.forEach(x => el("span", { class: "chip", text: srcName(x) }, ch));
    if (a.note) el("div", { class: "note", text: a.note }, body);
    const san = JD.SANCTIONED.find(x => x.id === id); if (san) el("div", { class: "note ok", text: "Sanctioned on our tenant · " + num(san.assigned) + " of " + num(san.seats) + " seats assigned." }, body);
    if (a.status === "unreviewed") { el("h4", { text: "Next step" }, body); el("button", { class: "btn pri", text: state.committee.includes(id) ? "Queued for vendor intake ✓" : "Send to committee (JA-02 intake)", on: { click: () => sendCommittee(id) } }, body); }
    const rs = [...new Set(RES.signals.filter(x => x.appId === id).map(x => x.ruleId))]; if (rs.length) { el("h4", { text: "Rules matched" }, body); rs.forEach(r => el("div", { class: "note", text: r + " · " + JD.RULES[r].name }, body)); }
    openDrawer(); log("Opened " + a.name + " in the inventory");
  }

  // ---------- Respond ----------
  function ladder(a) {
    if (a.kind === "monitor") return [2, 3];
    if (a.kind === "remove") { const st = a.scanned ? 7 : a.phase === "remaining" ? 6 : a.phase === "canary" ? 5 : a.approvals.length >= 2 ? 4 : a.dryRun ? 3 : 2; return [st, 7]; }
    return [a.status === "done" ? 3 : a.approvals.length ? 2 : a.drafted ? 1 : 0, 3];
  }
  function renderRespond(v) {
    head(v, "What do we <em>do</em> about it?", "Notify first, act with approval, verify afterward");
    const g = el("div", { class: "actions" }, v);
    state.actions.forEach(a => { const b = el("button", { class: "acard" + (state.sel === a.id ? " on" : ""), on: { click: () => { state.sel = a.id; render(); } } }, g);
      const t = el("div", { style: "display:flex;justify-content:space-between;gap:8px;align-items:center" }, b); el("span", { class: "t", text: a.title }, t); sev(JD.RULES[a.rule].sev, t);
      el("div", { class: "s", text: a.rule + " · " + pl(a.targets.length, a.kind === "remove" ? "host" : "person", a.kind === "remove" ? "hosts" : "people") + " · " + statusText(a) }, b);
      const [d, n] = ladder(a), l = el("div", { class: "ladder" }, b); for (let i = 0; i < n; i++) el("span", { class: i < d ? "done" : i === d ? "now" : "" }, l); });
    const a = action(state.sel), c = el("div", { class: "card pad" }, v);
    const hh = cardHead(c, a.title, JD.RULES[a.rule].name + " · " + JD.RULES[a.rule].playbook); sev(JD.RULES[a.rule].sev, hh);
    const [d] = ladder(a), steps = el("div", { class: "steps" }, c); a.steps.forEach((s, i) => el("span", { class: "stp" + (i < d ? " done" : i === d ? " now" : ""), text: s }, steps));
    if (a.kind === "remove") return removal(c, a);
    if (a.kind === "monitor") { el("div", { class: "note", text: "Notices went out Oct 19 with the enterprise sign-in link. No removal or block: the fix is a redirect, not a penalty. See Outcomes for the effect." }, c); return; }
    if (!a.drafted) { el("div", { class: "note", text: pl(a.targets.length, "person", "people") + " · " + a.effect.split(";")[0].toLowerCase() + " after approval." }, c);
      el("button", { class: "btn pri", style: "margin-top:12px", text: "Draft notice", on: { click: () => { RS.draft(a, P); log("Drafted notice for " + a.title + " (simulated AI)"); render(); } } }, c); return; }
    const nt = el("div", { class: "notice", style: "margin-top:4px" }, c);
    const nh = el("div", { class: "card-head" }, nt); el("div", { class: "subj", text: a.subject }, nh); nh.appendChild(simTag("Drafted by simulated AI. Edit before approving."));
    const ta = el("textarea", { "aria-label": "Notice text" }, nt); ta.value = a.body; ta.disabled = a.status === "done"; ta.addEventListener("input", () => a.body = ta.value);
    el("div", { class: "mono", style: "font-size:12px;color:var(--muted);margin-top:6px", text: "To: " + pl(a.targets.length, "person", "people") + " · cc: their managers · also as a short chat message" }, nt);
    approvals(c, a);
    const ra = el("div", { class: "row-act" }, c);
    if (a.status === "done") { el("div", { class: "note ok", style: "width:100%", text: "Done by " + persona(a.doneBy).name + ": " + a.effect + "." }, ra); return; }
    el("button", { class: "btn pri", text: a.kind === "block" ? "Block, notify, open incident" : a.kind === "revoke" ? "Revoke access and notify" : a.kind === "finance" ? "Notify and flag for finance" : "Send notices",
      on: { click: () => run(RS.execute(a, state.persona)) } }, ra);
  }
  function statusText(a) {
    if (a.kind === "monitor") return "monitoring since Oct 19";
    if (a.kind === "remove") return a.scanned ? "verified Oct 27" : a.phase === "remaining" ? "removed · verify tomorrow" : a.phase === "canary" ? "canary done" : "grace ended today";
    return a.status === "done" ? "done" : a.approvals.length ? "approved" : a.drafted ? "draft ready" : "new";
  }
  function approvals(c, a) {
    const ap = el("div", { class: "appr" }, c); el("span", { class: "eyebrow", text: "Approvals " + a.approvals.length + " of " + a.needs }, ap);
    for (let i = 0; i < a.needs; i++) { const id = a.approvals[i]; el("span", { class: "slot" + (id ? " ok" : ""), html: id ? "<span class='av'>" + initials(persona(id).name) + "</span>" + esc(persona(id).name) : "<span class='av' style='background:#D3CCBE'>?</span>waiting" }, ap); }
    if (a.approvals.length < a.needs) {
      const mine = a.approvals.includes(state.persona);
      el("button", { class: "btn dark sm", text: "Approve as " + persona(state.persona).name, on: { click: () => run(RS.approve(a, state.persona)) } }, ap);
      if (mine) { const other = JD.PERSONAS.find(p => !a.approvals.includes(p.id)); el("button", { class: "btn ghost sm", text: "Switch to " + other.name, on: { click: () => setPersona(other.id) } }, ap); }
    }
    if (a.needs === 2) el("div", { class: "note", style: "width:100%", text: "Two approvers required: this removal touches " + pl(a.targets.filter(id => P[id].admin).length, "IT admin", "IT admins") + " and more than 25 hosts." }, c);
  }
  function run(r) { toast(r.msg); log(r.ok ? r.msg : "Blocked · " + r.msg); render(); return r; }
  function removal(c, a) {
    const tg = a.targets, admins = tg.filter(id => P[id].admin), off = tg.filter(id => !P[id].online), depts = new Set(tg.map(id => P[id].dept));
    if (!a.dryRun) { el("div", { class: "note", text: "Notices went out Oct 19; the 5-business-day grace period ended today. Run a dry run to see exactly which hosts and people a removal would touch." }, c);
      el("button", { class: "btn pri", style: "margin-top:12px", text: "Dry run", on: { click: () => { a.dryRun = true; log("Dry run for TabGenie AI removal: " + tg.length + " hosts, " + off.length + " offline"); render(); } } }, c); return; }
    const bl = el("div", { class: "blast" }, c);
    [[tg.length, "hosts"], [admins.length, "IT admins"], [depts.size, "departments"], [off.length, "offline now"]].forEach(([n, l]) => el("div", { html: "<b>" + n + "</b>" + l }, bl));
    el("div", { class: "note", text: "Business impact: " + tg.filter(id => P[id].dept === "FIN").length + " Finance laptops; Q3 close ended Oct 8, so no conflict. Offline: " + off.map(id => P[id].host + " (" + deptName(P[id].dept) + ", last seen " + fmt(P[id].lastSeen) + ")").join(", ") + "." }, c);
    const hg = el("div", { class: "hosts" }, c);
    tg.forEach(id => el("div", { class: "host " + (a.hosts[id] === "idle" ? "" : a.hosts[id]) + (P[id].admin ? " admin" : ""), id: "h-" + id, "data-tip": P[id].host + " · " + deptName(P[id].dept) + (P[id].admin ? " · IT admin" : "") + " · " + (a.hosts[id] === "idle" ? "not started" : a.hosts[id]) + (P[id].online ? "" : " · offline") }, hg));
    el("div", { class: "legend", style: "margin-top:8px", html: [["#D3CCBE", "queued"], ["#E3A72F", "running"], ["#3B6E8F", "removed"], ["#6B8E4E", "verified"], ["#B3261E", "pending (offline)"]].map(([c2, l]) => "<span><i style='background:" + c2 + "'></i>" + l + "</span>").join("") + "<span>white outline = IT admin</span>" }, c);
    el("pre", { class: "cmd", text: "# EDR real-time response, per host (simulated)\nrtr run-script --host <hostname> --script remove-browser-extension --args \"id=tabgenie\"" }, c);
    approvals(c, a);
    const ra = el("div", { class: "row-act" }, c);
    if (!a.phase) el("button", { class: "btn pri", text: "Run canary (5 hosts)", on: { click: () => phase(a, "canary") } }, ra);
    else if (a.phase === "canary") el("button", { class: "btn pri", text: "Remove from remaining " + (tg.length - 5) + " hosts", on: { click: () => phase(a, "remaining") } }, ra);
    else el("div", { class: "note" + (a.scanned ? " ok" : ""), style: "width:100%", text: a.scanned ? "Verified on Oct 27: " + Object.values(a.hosts).filter(x => x === "verified").length + " hosts. " + pl(Object.values(a.hosts).filter(x => x === "pending").length, "host is", "hosts are") + " still pending; a follow-up is open." : "Commands sent. Nothing counts as removed until tomorrow's scan confirms it. Go to Outcomes → Advance to tomorrow." }, ra);
    if (a.phase === "remaining" && !a.scanned) el("button", { class: "btn dark", text: "Go to Outcomes", on: { click: () => setView("outcomes") } }, ra);
  }
  function phase(a, ph) {
    const r = RS.execute(a, state.persona, ph); if (!r.ok) return run(r);
    toast(r.msg); log(r.msg); const ids = RS.hostsFor(a, P, ph);
    ids.forEach(id => { a.hosts[id] = "queued"; const h = $("h-" + id); if (h) h.className = "host queued" + (P[id].admin ? " admin" : ""); });
    ids.forEach((id, i) => { setTimeout(() => { const h = $("h-" + id); if (h) h.className = "host running" + (P[id].admin ? " admin" : ""); }, 120 + i * 40);
      setTimeout(() => { a.hosts[id] = P[id].online ? "removed" : "pending"; const h = $("h-" + id); if (h) h.className = "host " + a.hosts[id] + (P[id].admin ? " admin" : ""); }, 420 + i * 40); });
    setTimeout(() => { RS.settle(a, P, ids); const pend = ids.filter(id => a.hosts[id] === "pending").length; log((ph === "canary" ? "Canary" : "Removal") + " finished: " + (ids.length - pend) + " removed" + (pend ? ", " + pend + " offline (pending)" : "")); render(); }, 520 + ids.length * 40);
  }

  // ---------- Outcomes ----------
  function renderOutcomes(v) {
    const a = action("A2"), btn = el("button", { class: "btn pri", text: state.tomorrow ? "Showing Oct 27" : "Advance to tomorrow", "data-tip": "Run the next day's EDR and browser scan (simulated)", on: { click: advance } });
    if (state.tomorrow) btn.disabled = true;
    head(v, "Did it <em>work</em>?", "A response counts only when the next scan shows the usage stopped", btn);
    const hv = Object.values(a.hosts), ver = hv.filter(x => x === "verified").length, pen = hv.filter(x => x === "pending").length, rem = hv.filter(x => x === "removed").length;
    const bl02 = RES.activities.filter(x => x.ruleId === "BL-02"), cntD = ds => sum(ds, d => bl02.filter(x => x.date === d).length);
    const before = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"], after = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-26"], drop = Math.round((1 - cntD(after) / cntD(before)) * 100);
    const k = el("div", { class: "kpis" }, v);
    kpi(k, "Verified", num(ver), "TabGenie AI hosts", ver ? "" : "", "Removal confirmed by the next-day scan", 0);
    kpi(k, "Pending", num(pen), pen ? "offline, follow-up open" : "none", pen ? "hot" : "", "Commands that couldn't reach the host", 1);
    kpi(k, "Unconfirmed", num(rem), "sent, not yet scanned", "", "Removed by command but not yet verified", 2);
    kpi(k, "Personal use", "−" + drop + "%", "after Oct 19 notices", "", "Personal-account signals on 5 weekdays after the notices vs the 5 weekdays before", 3);
    kpi(k, "Responses done", state.actions.filter(x => x.status === "done").length + " of 4", "notify, block, revoke", "", "SheetSage, ModelBox, NoteHawk, and spend responses", 4);
    const row = el("div", { class: "row2" }, v);
    const lc = el("div", { class: "card pad" }, row); cardHead(lc, "Personal accounts, before and after notices", "BL-02 daily signals. Notices with the enterprise sign-in link went out Oct 19.");
    const W = 640, H = 250, L = 34, B = 26, T = 12, svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", class: "chart", role: "img", "aria-label": "Personal account signals over time" }, lc);
    const daily = DAYS.map(d => bl02.filter(x => x.date === d).length), mx = Math.max(...daily), X = i => L + i / 29 * (W - L - 10), Y = n => T + (1 - n / mx) * (H - T - B);
    [0, .5, 1].forEach(g => { el("svg:line", { x1: L, x2: W - 10, y1: Y(mx * g), y2: Y(mx * g), stroke: "#E6E1D6" }, svg); el("svg:text", { x: L - 6, y: Y(mx * g) + 4, "text-anchor": "end", text: Math.round(mx * g) }, svg); });
    const ni = DAYS.indexOf("2026-10-19"); el("svg:line", { x1: X(ni), x2: X(ni), y1: T, y2: H - B, stroke: "#FF5A1F", "stroke-dasharray": "4 3" }, svg); el("svg:text", { x: X(ni) + 6, y: T + 10, text: "notices sent", style: "fill:#FF5A1F" }, svg);
    daily.forEach((n, i) => el("svg:rect", { x: X(i) - 6, y: Y(n), width: 12, height: H - B - Y(n), rx: 2, fill: i >= ni ? "#6B8E4E" : "#1A1A1A", opacity: E.weekday(DAYS[i]) ? .85 : .35, "data-tip": fmtW(DAYS[i]) + " · " + pl(n, "signal", "signals") }, svg));
    [0, 7, 14, 21, 29].forEach(i => el("svg:text", { x: X(i), y: H - 8, "text-anchor": i === 29 ? "end" : "middle", text: fmt(DAYS[i]) }, svg));
    const dc = el("div", { class: "card pad" }, row); cardHead(dc, "TabGenie AI removal", "From command to confirmed. Pending hosts get a follow-up, never a checkmark.");
    const ds = el("svg:svg", { viewBox: "0 0 200 200", width: "100%", style: "max-width:220px;display:block;margin:0 auto" }, dc);
    const parts = [[ver, "#6B8E4E", "verified"], [rem, "#3B6E8F", "removed, unconfirmed"], [pen, "#B3261E", "pending"], [hv.filter(x => x === "idle" || x === "queued").length, "#E6E1D6", "not started"]];
    let ang = -Math.PI / 2; const tot = hv.length;
    parts.forEach(([n, col, lab]) => { if (!n) return; const a2 = ang + n / tot * Math.PI * 2, lg = a2 - ang > Math.PI ? 1 : 0;
      const p1 = [100 + 80 * Math.cos(ang), 100 + 80 * Math.sin(ang)], p2 = [100 + 80 * Math.cos(a2 - .0001), 100 + 80 * Math.sin(a2 - .0001)];
      el("svg:path", { d: "M" + p1 + " A80,80 0 " + lg + " 1 " + p2, fill: "none", stroke: col, "stroke-width": 26, "data-tip": pl(n, "host", "hosts") + " " + lab }, ds); ang = a2; });
    el("svg:text", { x: 100, y: 98, "text-anchor": "middle", text: ver + " / " + tot, style: "font-family:'IBM Plex Mono';font-size:24px;fill:#1A1A1A" }, ds);
    el("svg:text", { x: 100, y: 120, "text-anchor": "middle", text: "verified", style: "font-family:'IBM Plex Mono';font-size:12px;fill:#6B675F" }, ds);
    if (!a.phase) el("div", { class: "note", text: "Removal hasn't run yet. Start it on Respond." }, dc);
    state.followups.forEach(f => el("div", { class: "note warn", text: f }, dc));
    if (a.scanned && pen === 0) el("div", { class: "note ok", text: "Every host verified." }, dc);
    const sc = el("div", { class: "card pad mt" }, v); cardHead(sc, "Response record", "What was done, by whom, and the effect");
    state.actions.forEach(x => el("div", { class: "gap", style: "grid-template-columns:minmax(0,1fr) auto", html: "<div><b>" + esc(x.title) + "</b><span>" + esc(x.status === "done" ? x.effect + " · by " + persona(x.doneBy).name : statusText(x)) + "</span></div><span class='pill " + (x.status === "done" || x.scanned ? "ok" : "") + "'>" + esc(statusText(x)) + "</span>" }, sc));
  }
  function advance() {
    const a = action("A2"), r = RS.scan(a); if (!r.ok) return run(r);
    state.tomorrow = true; if (r.pending) state.followups = Object.keys(a.hosts).filter(id => a.hosts[id] === "pending").map(id => "Follow-up FU-1042: " + P[id].host + " (" + deptName(P[id].dept) + ") was offline. TabGenie AI is still on it. Retry when it reconnects; manager notified.");
    log(r.msg + (r.pending ? "; follow-up opened" : "")); toast(r.msg); render();
  }

  // ---------- Checks ----------
  function checks() {
    const out = [], sig = RES.signals, actv = RES.activities;
    const k1 = sig.filter(s => APP[s.appId].status === "sanctioned" && s.ruleId !== "BL-02").length, ent = DATA.events.filter(e => e.detail.tenant === "enterprise").length;
    out.push(["K1", k1 === 0 && ent > 0, "Sanctioned enterprise use raises no signals", num(ent) + " enterprise sign-ins · " + pl(k1, "signal", "signals")]);
    const k2 = sig.filter(s => s.ruleId === "BL-02");
    out.push(["K2", k2.length > 0 && k2.every(s => s.appId === "chatgpt"), "Personal accounts on a sanctioned tool raise BL-02", pl(k2.length, "signal", "signals") + " · bands " + [...new Set(k2.map(s => s.band))].join(", ")]);
    const k3 = new Set(sig.filter(s => s.ruleId === "BL-05").map(s => s.personId)).size; out.push(["K3", k3 === 4, "ModelBox on production-access laptops: exactly 4", pl(k3, "person", "people")]);
    const k4s = RES.suppressed.filter(x => x.appId === "clausebot").length, k4 = sig.filter(s => s.appId === "clausebot").length;
    out.push(["K4", k4 === 0 && k4s > 0, "ClauseBot pilot (EX-12) is suppressed and counted", pl(k4s, "match", "matches") + " suppressed · " + pl(k4, "signal", "signals")]);
    const imf = actv.filter(a => a.appId === "imageforge"); out.push(["K5", imf.length > 0 && imf.every(a => a.date >= "2026-10-26"), "ImageForge (EX-09) resumes the day after expiry", imf.length ? "First signal " + fmt(imf.map(a => a.date).sort()[0]) : "none"]);
    const ri = actv.filter(a => a.ruleId === "R-IMG"); out.push(["K6", ri.length > 0 && ri.every(a => a.date < "2026-10-14"), "Retired image rule: no new signals after Oct 14, earlier kept", pl(ri.length, "earlier match", "earlier matches") + " · last " + fmt(ri.map(a => a.date).sort().pop())]);
    let acts = RS.build(DATA, RES), a = acts.find(x => x.id === "A2"); a.dryRun = true; const r7 = RS.execute(a, "priya", "canary");
    out.push(["K7", !r7.ok, "Removal without approval is blocked", r7.msg]);
    RS.approve(a, "jordan"); const r8 = RS.execute(a, "priya", "canary"), dup = RS.approve(a, "jordan");
    out.push(["K8", RS.needsTwo(a, P) && !r8.ok && !dup.ok, "TabGenie removal needs two different approvers", "1 approval: " + r8.msg + " · same approver twice: blocked"]);
    RS.approve(a, "priya"); RS.execute(a, "priya", "canary"); RS.settle(a, P, RS.hostsFor(a, P, "canary")); RS.execute(a, "priya", "remaining"); RS.settle(a, P, RS.hostsFor(a, P, "remaining")); const sc = RS.scan(a);
    const offId = a.targets.find(id => !P[id].online);
    out.push(["K9", a.hosts[offId] === "pending" && sc.verified === a.targets.length - 1, "Offline host stays pending, never verified", sc.msg]);
    const byDay = {}, byDept = {}, byRule = {}; actv.forEach(x => { byDay[x.date] = (byDay[x.date] || 0) + 1; byDept[x.date + x.dept] = (byDept[x.date + x.dept] || 0) + 1; byRule[x.date + x.ruleId] = (byRule[x.date + x.ruleId] || 0) + 1; });
    const ok10 = DAYS.every(d => (byDay[d] || 0) === sum(JD.DEPTS, de => byDept[d + de.id] || 0) && (byDay[d] || 0) === sum(Object.keys(JD.RULES), r => byRule[d + r] || 0)) && sig.every(s => s.eventIds.length > 0 && JD.RULES[s.ruleId]);
    out.push(["K10", ok10, "Every signal has a rule and events; daily totals reconcile", num(actv.length) + " daily matches · " + num(sig.length) + " signals"]);
    return out;
  }
  function openChecks() {
    const body = $("drawerBody"); body.innerHTML = ""; el("div", { class: "eyebrow", text: "Known answers" }, body); el("h2", { text: "Can we trust it?" }, body);
    const res = checks(), pass = res.filter(r => r[1]).length;
    el("div", { class: "note", text: pass + " of " + res.length + " checks pass. They run on fresh copies, so nothing on screen changes." }, body);
    res.forEach(([id, ok, lab, det]) => { const r = el("div", { class: "check-row", tabindex: 0, "data-tip": det }, body); el("span", { class: ok ? "pass-tag" : "fail-tag", text: ok ? "PASS" : "FAIL" }, r); el("span", { class: "mono", style: "color:var(--muted)", text: id }, r); el("span", { text: lab }, r); });
    el("h4", { text: "Guardrails" }, body); const g = el("div", null, body);
    [["Committee owns the rules", "Analysts propose; the committee publishes versions"], ["People approve", "Every notice, block, revocation, and removal"], ["Two approvers", "Removals touching admins, executives, or more than 25 hosts"], ["Dry run first", "Approvers see the exact hosts and people"],
      ["Verified means rescanned", "A command isn't a result"], ["Names masked", "Employee IDs until a reason is logged"], ["Metadata only", "No prompt or file contents"], ["Simulated AI is labeled", "Classification, correlation, notices"]]
      .forEach(([k, t]) => el("span", { class: "guard", tabindex: 0, "data-tip": t, text: k }, g));
    el("h4", { text: "Risk formula" }, body);
    el("div", { class: "note", text: "severity (Critical 50 · High 35 · Medium 20 · Low 8) × data access (none 1.0 · internal 1.2 · customer or financial 1.6 · payroll, production, or privileged 2.0) × corroboration (1 tool 0.6 · 2 tools 0.85 · 3+ tools 1.0) × calendar (Finance during Q3 close 1.25), capped at 100. Bands: Critical 75+, High 50–74, Medium 25–49, Low under 25." }, body);
    openDrawer(); log("Ran checks: " + pass + " of " + res.length + " pass");
  }

  // ---------- chrome ----------
  function openDrawer() { $("drawer").classList.add("open"); $("drawer").setAttribute("aria-hidden", "false"); }
  function closeDrawer() { $("drawer").classList.remove("open"); $("drawer").setAttribute("aria-hidden", "true"); hideTip(); }
  document.querySelector("[data-close=drawer]").addEventListener("click", closeDrawer);
  function fillPersona() { const s = $("persona"); s.innerHTML = ""; JD.PERSONAS.forEach(p => el("option", { value: p.id, text: p.name + " · " + p.role }, s)); s.value = state.persona; }
  function setPersona(id) { state.persona = id; $("persona").value = id; log("Viewing as " + persona(id).name + " (" + persona(id).role + ")"); toast("Viewing as " + persona(id).name); render(); }
  $("persona").addEventListener("change", e => setPersona(e.target.value));
  $("namesBtn").addEventListener("click", e => { state.product = !state.product; e.currentTarget.setAttribute("aria-pressed", state.product); log("Source names: " + (state.product ? "product" : "generic")); render(); });
  $("presenterBtn").addEventListener("click", e => { const on = document.body.classList.toggle("present"); e.currentTarget.setAttribute("aria-pressed", on); if (on) $("log").classList.remove("open"); render(); });
  $("resetBtn").addEventListener("click", () => { stopPlay(); state = fresh(); fillPersona(); $("namesBtn").setAttribute("aria-pressed", "false"); closeDrawer(); $("logList").innerHTML = ""; log("Reset"); toast("Reset"); render(); });
  document.addEventListener("keydown", e => { if (e.target.matches("input, textarea, select")) return; const v = { 1: "sources", 2: "blacklist", 3: "today", 4: "inventory", 5: "respond", 6: "outcomes" }[e.key]; if (v) setView(v); if (e.key === "Escape") { closeDrawer(); $("log").classList.remove("open"); } });

  state = fresh(); fillPersona(); log("Loaded " + num(DATA.events.length) + " events from 10 sources · " + num(RES.signals.length) + " signals"); render();
  window.JA01 = { get state() { return state; }, checks, setView, openSignal, setPersona, DATA, RES };
})();
