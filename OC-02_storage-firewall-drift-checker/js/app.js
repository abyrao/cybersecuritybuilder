/* OC-02 · Cloud storage and firewall drift checker against a CIS baseline */
(function () {
  const $ = id => document.getElementById(id);
  const PC = { P1: "#B5543C", P2: "#D9822B", P3: "#C9A227", P4: "#8FA89A" };
  const SEVC = { Critical: "#B5543C", High: "#D9822B", Medium: "#C9A227", Low: "#8FA89A" };
  const C = B.CLOUDS, CTRL = DR.CTRL;
  const KIND = { object: "Object", block: "Block", file: "File", snapshot: "Snapshot", vault: "Backup vault", token: "Access token", sg: "Security group", nacl: "Network ACL", fwpolicy: "Firewall policy", waf: "WAF", flowlog: "Flow log", vnet: "Network", asg: "App security group" };

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
  const pct = n => (Math.round(n * 10) / 10).toFixed(1) + "%";
  const pl = (n, one, many) => num(n) + " " + (Math.round(n) === 1 ? one : many);
  const fmt = d => d ? new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "–";
  const sum = (l, f) => l.reduce((a, x) => a + f(x), 0);
  const avg = (l, f) => l.length ? sum(l, f) / l.length : 0;
  const confColor = v => v >= 95 ? "#2F7D4F" : v >= 85 ? "#C9A227" : "#B5543C";
  const cloudChip = (c, p) => el("span", { class: "cloud", style: "color:" + C[c].color + ";border-color:" + C[c].color + "88", text: C[c].short, "data-tip": C[c].name }, p);
  const priChip = (d, p) => el("span", { class: "pri-chip", style: "background:" + PC[d.priority], text: d.priority, "data-tip": d.priority + " · risk " + d.risk + " (impact " + d.impact + " × likelihood " + d.likelihood + ") · fix within " + d.sla }, p);
  const sevChip = (s, p) => el("span", { class: "sev", style: "background:" + SEVC[s], text: s }, p);
  const simTag = t => el("span", { class: "tag", text: "simulated", "data-tip": t || "Produced by simulated AI from the fictional estate. Verify before use." });
  const slaDays = { P1: 2, P2: 7, P3: 30, P4: 90 };
  const overdue = d => d.age > slaDays[d.priority];
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
  let state, EV = null;
  function fresh() { return { st: RM.create(ES.generate()), view: "baseline", persona: "maya", ctlF: { domain: "all", sev: "all", auto: false }, invDomain: "storage", net: "aws-vnet-payroll", tab: "queue", cell: null, qf: { cloud: "all", pri: "all" }, limit: 40, qsel: null }; }
  const ev = () => EV || (EV = RM.current(state.st));
  const dirty = () => { EV = null; };
  const res = id => state.st.byId[id];
  const assessed = () => state.st.est.resources.filter(r => ev().resources[r.id].applicable);
  const fleetConf = list => avg(list || assessed(), r => ev().resources[r.id].conformance);
  const me = () => RM.persona(state.persona);

  // ---------- shell ----------
  function render() {
    document.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("on", b.dataset.view === state.view)); moveSeg();
    const v = $("view"); v.innerHTML = ""; v.style.animation = "none"; void v.offsetWidth; v.style.animation = "";
    ({ baseline: renderBaseline, inventory: renderInventory, drift: renderDrift, exposure: renderExposure, prioritize: renderPrioritize, report: renderReport })[state.view](v);
  }
  function moveSeg() { const on = document.querySelector(".seg-btn.on"), ind = document.querySelector(".seg-ind"); if (!on) return; ind.style.width = on.offsetWidth + "px"; ind.style.transform = "translateX(" + (on.offsetLeft - 4) + "px)"; }
  function setView(v) { state.view = v; closeDrawer(); render(); window.scrollTo(0, 0); }
  addEventListener("resize", moveSeg);

  // ---------- Baseline ----------
  function renderBaseline(v) {
    head(v, "What does <em>good</em> look like?", "Baseline v1.0 · 41 storage and firewall controls aligned to six CIS Foundations Benchmarks · effective Oct 1, 2026");
    const bw = el("div", { class: "benches" }, v);
    B.BENCH.forEach((b, i) => el("div", { class: "bench", style: "border-top-color:" + C[b.cloud].color + ";animation-delay:" + i * .04 + "s", "data-tip": b.name + " " + b.v + " · versions checked Oct 27, 2026", html: "<div class='eyebrow'>" + esc(C[b.cloud].name) + "</div><b>" + b.v + "</b><span>" + esc(b.name.replace("CIS ", "")) + "</span>" }, bw));
    const ac = el("div", { class: "card pad" }, v); cardHead(ac, "Assumptions", "Stated so anyone can challenge them. Change one and the baseline gets a new version.");
    const aw = el("div", { class: "assume" }, ac); B.ASSUMPTIONS.forEach(([t, d], i) => el("div", { class: "as", html: "<b>" + (i + 1) + ". " + esc(t) + "</b>" + esc(d) }, aw));
    const cc = el("div", { class: "card pad mt" }, v);
    const counts = {}; ev().drifts.forEach(d => counts[d.controlId] = (counts[d.controlId] || 0) + 1);
    cardHead(cc, "Control catalog", "Squares: filled = maps to that cloud's CIS section · outlined = org addition beyond CIS · gray = not applicable");
    const f = el("div", { class: "chips", style: "margin-bottom:10px" }, cc), F = state.ctlF;
    [["all", "All 41"], ["storage", "Storage 21"], ["network", "Firewall 20"]].forEach(([k, l]) => el("button", { class: "chip" + (F.domain === k ? " on" : ""), text: l, on: { click: () => { F.domain = k; render(); } } }, f));
    el("span", { style: "width:8px" }, f);
    ["all", "Critical", "High", "Medium", "Low"].forEach(k => el("button", { class: "chip" + (F.sev === k ? " on" : ""), html: (k !== "all" ? "<span class='dot' style='background:" + SEVC[k] + "'></span>" : "") + (k === "all" ? "Any severity" : k), on: { click: () => { F.sev = k; render(); } } }, f));
    el("span", { style: "width:8px" }, f);
    el("button", { class: "chip" + (F.auto ? " on" : ""), text: "Auto-fix eligible", on: { click: () => { F.auto = !F.auto; render(); } } }, f);
    const wrap = el("div", { style: "overflow-x:auto" }, cc), t = el("table", { class: "tbl" }, wrap), hr = el("tr", null, el("thead", null, t));
    ["ID", "Control", "Expected", "Measure", "Severity", "Level", "Auto", "CIS mapping", "Drifts"].forEach(h => el("th", { text: h }, hr));
    const bd = el("tbody", null, t);
    B.CONTROLS.filter(c => (F.domain === "all" || c.domain === F.domain) && (F.sev === "all" || c.sev === F.sev) && (!F.auto || c.auto)).forEach(c => {
      const tr = el("tr", { class: "click", tabindex: 0, on: { click: () => openControl(c.id), keydown: e => { if (e.key === "Enter") openControl(c.id); } } }, bd);
      el("td", { class: "nw", html: "<b>" + c.id + "</b>" }, tr); el("td", { text: c.name }, tr); el("td", { class: "nw", text: c.expected }, tr);
      el("td", { class: "nw", text: { binary: "Binary", min: "Threshold (min)", max: "Threshold (max)", ordinal: "Ordinal", cidr: "Exposure (CIDR)", ports: "Exposure (ports)", count: "Count" }[c.measure] }, tr);
      sevChip(c.sev, el("td", null, tr)); el("td", { text: c.level }, tr); el("td", { text: c.auto ? "✓" : "", style: "color:var(--accent);font-weight:700" }, tr);
      const s = el("span", { class: "strip" }, el("td", null, tr));
      B.ALL.forEach(cl => { const m = c.cis[cl]; el("i", { style: m === "n/a" ? "border-color:#CBD3C8;background:#E1E6DE" : m === "org" ? "border-color:" + C[cl].color + ";background:transparent" : "border-color:" + C[cl].color + ";background:" + C[cl].color, "data-tip": C[cl].name + ": " + (m === "org" ? "org addition (beyond CIS)" : m === "n/a" ? "not applicable" : m) }, s); });
      el("td", { class: "r", text: num(counts[c.id] || 0), style: counts[c.id] ? "color:var(--rust);font-weight:700" : "" }, tr);
    });
  }
  function openControl(id) {
    const c = CTRL[id], body = $("drawerBody"); body.innerHTML = "";
    el("div", { class: "eyebrow", text: c.id + " · " + (c.domain === "storage" ? "Storage" : "Firewall and network") + " · " + c.family }, body); el("h2", { text: c.name }, body);
    const w = el("div", { class: "chips" }, body); sevChip(c.sev, w); el("span", { class: "pill", text: c.level === "org" ? "Org addition" : "CIS " + c.level }, w); if (c.auto) el("span", { class: "pill ok", text: "Auto-fix eligible" }, w);
    const f = el("div", { class: "facts" }, body);
    [["Expected", c.expected], ["Measure", c.measure], ["Applies to", c.kinds.map(k => KIND[k]).join(", ")], ["Likelihood path", c.path === "exposure" ? "Exposure" : "Hygiene"], ["Weight", B.SEVW[c.sev]], ["Open drifts", num(ev().drifts.filter(d => d.controlId === id).length)]]
      .forEach(([k, v2]) => el("div", { class: "fact", html: esc(k) + "<b>" + esc(v2) + "</b>" }, f));
    el("h4", { text: "Per-cloud mapping" }, body);
    const t = el("table", { class: "tbl" }, body), bd = el("tbody", null, t);
    B.ALL.forEach(cl => { const tr = el("tr", null, bd); cloudChip(cl, el("td", null, tr)); el("td", { text: (c.setting && c.setting[cl]) || "Equivalent setting" }, tr); el("td", { class: "nw", text: c.cis[cl] === "org" ? "Org addition" : c.cis[cl] === "n/a" ? "Not applicable" : "CIS " + B.BENCH.find(b => b.cloud === cl).v + " · " + c.cis[cl] }, tr); });
    el("div", { class: "note", text: "Mapped by intent to the benchmark section. Recommendation numbers aren't reproduced; confirm against the licensed CIS text." }, body);
    const fx = B.FIX[id]; el("h4", { html: "Remediation <span class='tag' data-tip='Simulated. Verify before use.'>simulated</span>" }, body);
    if (fx) Object.keys(fx).forEach(k => { el("div", { class: "eyebrow", style: "margin-top:8px", text: k === "tf" ? "Terraform" : C[k].name }, body); el("pre", { class: "code", text: fx[k].split("{r}").join("<resource>") }, body); });
    else el("div", { class: "note", text: "Set the expected value in the module and apply through the pipeline. Re-check to confirm." }, body);
    openDrawer();
  }

  // ---------- Inventory ----------
  function renderInventory(v) {
    const R = state.st.est.resources, sto = R.filter(r => r.domain === "storage"), fw = R.filter(r => r.domain === "network" && r.kind !== "vnet");
    const tg = el("div", { class: "tabs" }); [["storage", "Storage"], ["network", "Firewall and network"]].forEach(([k, l]) => el("button", { class: state.invDomain === k ? "on" : "", text: l, on: { click: () => { state.invDomain = k; render(); } } }, tg));
    head(v, "What do we <em>have</em>?", "Six clouds, " + new Set(R.map(r => r.cloud + r.type)).size + " resource types, " + num(state.st.est.accounts.length) + " accounts, subscriptions, projects, and compartments", tg);
    const k = el("div", { class: "kpis k6" }, v);
    kpi(k, "Storage", num(sto.length), new Set(sto.map(r => r.cloud + r.type)).size + " types", "", "Buckets, disks, file systems, snapshots, vaults, and access tokens", 0);
    kpi(k, "Firewall objects", num(fw.length), new Set(fw.map(r => r.cloud + r.type)).size + " types", "", "Security groups, ACLs, firewall and WAF policies, flow logs", 1);
    kpi(k, "Rules", num(sum(R, r => (r.rules || []).length)), "ingress rules evaluated", "", "Every rule is checked for port and source breadth", 2);
    kpi(k, "Networks", num(state.st.est.networks.length), "VPC, VNet, VCN", "", "Virtual networks across all clouds", 3);
    kpi(k, "Subnets", num(state.st.est.subnets.length), "across all networks", "", "Each should have a security list or NSG attached", 4);
    kpi(k, "Accounts", num(state.st.est.accounts.length), "6 business units", "", "Production and non-production", 5);
    const list = state.invDomain === "storage" ? sto : R.filter(r => r.domain === "network");
    const g = el("div", { class: "clouds6" }, v);
    B.ALL.forEach((cl, ci) => {
      const L = list.filter(r => r.cloud === cl), c = el("div", { class: "card ccard", style: "border-top-color:" + C[cl].color + ";animation:pop .4s ease both;animation-delay:" + ci * .05 + "s" }, g);
      el("div", { class: "h", html: "<b>" + esc(C[cl].name) + "</b><span>" + pl(L.length, "resource", "resources") + " · " + pct(fleetConf(L.filter(r => ev().resources[r.id].applicable))) + " conformant</span>" }, c);
      const types = [...new Set(L.map(r => r.type))], mx = Math.max(...types.map(t => L.filter(r => r.type === t).length));
      types.sort((a, b) => L.filter(r => r.type === b).length - L.filter(r => r.type === a).length).forEach((t, i) => {
        const T = L.filter(r => r.type === t), dr = T.filter(r => ev().resources[r.id].drifts.length).length;
        const r = el("div", { class: "trow", "data-tip": t + " · " + pl(T.length, "resource", "resources") + " · " + dr + " drifted" + (T[0].kind === "asg" ? " · grouping only, not assessed" : "") }, c);
        el("span", { class: "lab", text: t }, r); const tr = el("div", { class: "track", style: "width:" + Math.max(8, T.length / mx * 100) + "%" }, r);
        el("span", { style: "width:" + (100 - dr / T.length * 100) + "%;background:" + C[cl].color + ";animation-delay:" + i * .04 + "s" }, tr); el("span", { style: "width:" + (dr / T.length * 100) + "%;background:#B5543C;animation-delay:" + i * .04 + "s" }, tr);
        el("span", { class: "n", text: num(T.length) }, r);
      });
    });
    el("div", { class: "legend mt", html: "<span><i style='background:#2F7D4F'></i>Cloud color: conforming</span><span><i style='background:#B5543C'></i>Drifted share</span><span>Bar length: count</span>" }, v);
  }

  // ---------- Drift ----------
  function renderDrift(v) {
    const A = assessed(), D = ev().drifts, rs = RM.redriftStats(state.st), conf = fleetConf(A);
    head(v, "Where have we <em>drifted</em>, and how far?", "Weighted by severity and by how far each setting is from the baseline");
    const k = el("div", { class: "kpis" }, v);
    kpi(k, "Conformance", pct(conf), "fleet average", conf >= 95 ? "good" : "", "Average of resource conformance (100 − drift score)", 0);
    kpi(k, "Drifted", num(A.filter(r => ev().resources[r.id].drifts.length).length), "of " + num(A.length) + " resources", "", "Resources with at least one control off baseline", 1);
    kpi(k, "Open drifts", num(D.length), pl(D.filter(overdue).length, "past target", "past target"), "", "Resource × control pairs off baseline", 2);
    kpi(k, "P1", num(D.filter(d => d.priority === "P1").length), "fix within 48 hours", "bad", "Risk 20 or more (impact × likelihood)", 3);
    kpi(k, "Re-drift", Math.round(rs.rate * 100) + "%", rs.redrift + " of " + rs.fixes + " fixes came back", "bad", "Fixes that drifted back within 30 days: " + rs.consoleRedrift + " of " + rs.console + " console fixes, " + rs.codeRedrift + " of " + rs.code + " code fixes", 4);
    const row = el("div", { class: "row2" }, v);
    const cc = el("div", { class: "card pad" }, row); cardHead(cc, "Conformance by cloud", "Average resource conformance. Line = 95% target.");
    B.ALL.map(cl => ({ cl, v: fleetConf(A.filter(r => r.cloud === cl)), n: D.filter(d => res(d.resourceId).cloud === cl).length })).sort((a, b) => b.v - a.v).forEach((x, i) => {
      const r = el("div", { class: "hbar", "data-tip": C[x.cl].name + " · " + pct(x.v) + " · " + pl(x.n, "open drift", "open drifts") }, cc); el("span", { text: C[x.cl].name }, r);
      const t = el("div", { class: "track" }, r); el("span", { style: "width:" + Math.max(0, (x.v - 60) / 40 * 100) + "%;background:" + confColor(x.v) + ";animation-delay:" + i * .05 + "s" }, t); el("em", { style: "left:" + (35 / 40 * 100) + "%" }, t);
      el("span", { class: "v", text: pct(x.v), style: "color:" + confColor(x.v) }, r); });
    el("div", { class: "legend", html: "<span>Scale 60–100%</span><span><i style='background:#2F7D4F'></i>95%+</span><span><i style='background:#C9A227'></i>85–95%</span><span><i style='background:#B5543C'></i>under 85%</span>" }, cc);
    const ct = el("table", { class: "tbl", style: "margin-top:14px" }, cc), ch = el("tr", null, el("thead", null, ct)); ["Cloud", "Resources", "Drifts", "P1", "Most drift in"].forEach(h => el("th", { text: h, class: h === "Cloud" || h === "Most drift in" ? "" : "r" }, ch));
    const cb = el("tbody", null, ct);
    B.ALL.forEach(cl => { const L = D.filter(d => res(d.resourceId).cloud === cl), fam = {}; L.forEach(d => fam[CTRL[d.controlId].family] = (fam[CTRL[d.controlId].family] || 0) + d.points);
      const top = Object.entries(fam).sort((a, b) => b[1] - a[1])[0], tr = el("tr", null, cb); cloudChip(cl, el("td", null, tr));
      el("td", { class: "r", text: num(A.filter(r => r.cloud === cl).length) }, tr); el("td", { class: "r", text: num(L.length) }, tr); el("td", { class: "r", text: num(L.filter(d => d.priority === "P1").length), style: "color:var(--rust);font-weight:700" }, tr); el("td", { text: top ? top[0] : "–" }, tr); });
    const tc = el("div", { class: "card pad" }, row); cardHead(tc, "Conformance, last 90 days", "Fleet conformance by day. Marks show days when a past fix drifted back.");
    trend(tc);
    const r2 = el("div", { class: "row2 mt" }, v);
    const pc = el("div", { class: "card pad" }, r2); cardHead(pc, "Which controls drift most", "Drift points by control (severity × deviation, summed). Line = cumulative share.");
    pareto(pc, D);
    const hc = el("div", { class: "card pad" }, r2); cardHead(hc, "Cloud × control family", "Open drift points. Click a cell to see the queue for it.");
    heat(hc, D);
  }
  function trend(p) {
    const t = RM.trend(state.st, ev()), W = 640, H = 250, L = 40, Bm = 26, T = 10;
    const svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, class: "chart", role: "img", "aria-label": "Conformance trend" }, p);
    const lo = Math.floor(Math.min(...t.map(x => x.conf)) - 1), hi = Math.ceil(Math.max(...t.map(x => x.conf)) + 1), X = i => L + i / 90 * (W - L - 10), Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - Bm);
    [lo, (lo + hi) / 2, hi].forEach(g => { el("svg:line", { x1: L, x2: W - 10, y1: Y(g), y2: Y(g), stroke: "#E1E6DE" }, svg); el("svg:text", { x: L - 6, y: Y(g) + 4, "text-anchor": "end", text: Math.round(g) + "%" }, svg); });
    const d = t.map((x, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(x.conf).toFixed(1)).join(" ");
    el("svg:path", { d: d + " L" + X(90) + "," + (H - Bm) + " L" + X(0) + "," + (H - Bm) + " Z", fill: "#2F7D4F", opacity: .1 }, svg);
    el("svg:path", { d, fill: "none", stroke: "#2F7D4F", "stroke-width": 2.5 }, svg);
    t.forEach((x, i) => { if (x.redrifts) el("svg:circle", { cx: X(i), cy: Y(x.conf), r: 3 + x.redrifts * 1.5, fill: "#B5543C", "data-tip": fmt(x.d) + " · " + pl(x.redrifts, "fix drifted back", "fixes drifted back") }, svg); });
    t.forEach((x, i) => el("svg:rect", { x: X(i) - 3, y: T, width: 6, height: H - T - Bm, fill: "transparent", "data-tip": fmt(x.d) + " · " + pct(x.conf) }, svg));
    [0, 30, 60, 90].forEach(i => el("svg:text", { x: X(i), y: H - 8, "text-anchor": i === 90 ? "end" : i === 0 ? "start" : "middle", text: fmt(t[i].d).replace(", 2026", "") }, svg));
    el("div", { class: "legend", html: "<span><i style='background:#2F7D4F'></i>Fleet conformance</span><span><i style='background:#B5543C;border-radius:50%'></i>Fix drifted back</span>" }, p);
  }
  function pareto(p, D) {
    const by = {}; D.forEach(d => by[d.controlId] = (by[d.controlId] || 0) + d.points); const rows = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 14), tot = sum(Object.values(by), x => x) || 1;
    const W = 640, H = 270, L = 56, Bm = 40, T = 10, svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, class: "chart", role: "img", "aria-label": "Drift by control" }, p);
    const mx = rows.length ? rows[0][1] : 1, bw = (W - L - 20) / Math.max(1, rows.length), Y = v => T + (1 - v / mx) * (H - T - Bm), YC = v => T + (1 - v) * (H - T - Bm);
    let cum = 0;
    const pts = rows.map(([id, v], i) => { const x = L + i * bw; el("svg:rect", { x: x + 3, y: Y(v), width: bw - 6, height: H - Bm - Y(v), rx: 3, fill: CTRL[id].domain === "storage" ? "#4A6FA5" : "#2F7D4F", "data-tip": id + " · " + CTRL[id].name + " · " + num(v) + " points · " + pl(D.filter(d => d.controlId === id).length, "drift", "drifts"), class: "cell", on: { click: () => openControl(id) } }, svg);
      el("svg:text", { x: x + bw / 2, y: H - Bm + 14, "text-anchor": "middle", text: id.replace("STG-", "S").replace("NET-", "N"), style: "font-size:10px" }, svg); cum += v; return [x + bw / 2, YC(cum / tot)]; });
    el("svg:polyline", { points: pts.map(q => q.join(",")).join(" "), fill: "none", stroke: "#C9A227", "stroke-width": 2 }, svg); pts.forEach(q => el("svg:circle", { cx: q[0], cy: q[1], r: 3, fill: "#C9A227" }, svg));
    [0, .5, 1].forEach(g => el("svg:text", { x: W - 4, y: YC(g) + 4, "text-anchor": "end", text: Math.round(g * 100) + "%", style: "fill:#8A6D10" }, svg));
    el("svg:text", { x: L, y: H - 6, text: "S = storage control, N = network control" }, svg);
    el("div", { class: "legend", html: "<span><i style='background:#4A6FA5'></i>Storage</span><span><i style='background:#2F7D4F'></i>Firewall and network</span><span><i style='background:#C9A227'></i>Cumulative share</span>" }, p);
  }
  function heat(p, D) {
    const W = 640, L = 110, T = 64, cw = (W - L - 6) / 6, ch = 30, H = T + B.FAMILIES.length * ch + 6, svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, class: "chart", role: "img", "aria-label": "Drift heatmap" }, p);
    const m = {}; D.forEach(d => { const k = res(d.resourceId).cloud + "|" + CTRL[d.controlId].family; m[k] = (m[k] || 0) + d.points; }); const mx = Math.max(1, ...Object.values(m));
    B.ALL.forEach((cl, c) => el("svg:text", { x: L + c * cw + cw / 2, y: T - 10, "text-anchor": "middle", text: C[cl].short, style: "font-weight:700;fill:" + C[cl].color }, svg));
    B.FAMILIES.forEach((f, r) => { el("svg:text", { x: L - 8, y: T + r * ch + 19, "text-anchor": "end", text: f, style: "fill:#1C2B22;font-size:12px" }, svg);
      B.ALL.forEach((cl, c) => { const v = m[cl + "|" + f] || 0, t = v / mx;
        el("svg:rect", { class: "cell", x: L + c * cw + 2, y: T + r * ch + 2, width: cw - 4, height: ch - 4, rx: 5, fill: v ? "rgba(181,84,60," + (0.08 + t * .9).toFixed(2) + ")" : "#F7F9F5", "data-tip": C[cl].name + " · " + f + " · " + num(v) + " drift points",
          on: { click: () => { state.qf = { cloud: cl, pri: "all", family: f }; state.cell = null; state.tab = "queue"; setView("prioritize"); } } }, svg);
        if (v) el("svg:text", { x: L + c * cw + cw / 2, y: T + r * ch + 19, "text-anchor": "middle", text: num(v), style: "font-size:11px;fill:" + (t > .5 ? "#fff" : "#1C2B22"), "pointer-events": "none" }, svg); }); });
    el("svg:text", { x: L, y: 18, text: "Darker = more drift points", style: "font-size:11px" }, svg);
  }

  // ---------- Exposure ----------
  function netExposure(netId) { return sum(ev().drifts.filter(d => { const r = res(d.resourceId); return (r.network === netId || r.id === netId) && CTRL[d.controlId].path === "exposure"; }), d => d.risk); }
  function renderExposure(v) {
    head(v, "What's <em>open</em>, and how widely?", "Firewall rules measured by port and by how many addresses can reach them");
    const nets = state.st.est.networks.map(n => ({ n, e: netExposure(n.id) })).filter(x => x.e > 0).sort((a, b) => b.e - a.e);
    const row = el("div", { class: "row2w" }, v);
    const lc = el("div", { class: "card pad" }, row);
    const sel = res(state.net) || nets[0].n;
    cardHead(lc, sel.name, "Subnets inside the network; security groups attached; rust ports are open beyond our network.", el("span", { class: "pill bad", text: "exposure " + num(netExposure(sel.id)) }));
    topology(lc, sel);
    const xd = ev().drifts.filter(d => { const r = res(d.resourceId); return (r.network === sel.id || r.id === sel.id) && CTRL[d.controlId].path === "exposure"; }).sort((a, b) => b.risk - a.risk);
    el("div", { class: "eyebrow", style: "margin:14px 0 4px", text: pl(xd.length, "exposure drift", "exposure drifts") + " in this network" }, lc);
    xd.slice(0, 6).forEach(d => { const r = res(d.resourceId), row = el("div", { class: "htl", style: "display:flex;gap:8px;align-items:center;cursor:pointer", on: { click: () => openResource(r.id) } }, lc);
      priChip(d, row); el("b", { text: r.name }, row); el("span", { text: d.controlId + " · " + d.actual + " · open " + pl(d.age, "day", "days"), style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, row); });
    if (xd.length > 6) el("div", { class: "htl", text: "and " + pl(xd.length - 6, "more", "more") + " in the fix queue" }, lc);
    const rc = el("div", { class: "card pad netlist" }, row); cardHead(rc, "Most exposed networks", "Ranked by summed risk of exposure drifts in the network");
    nets.slice(0, 12).forEach(x => { const b = el("button", { class: x.n.id === sel.id ? "on" : "", on: { click: () => { state.net = x.n.id; render(); } } }, rc);
      const l = el("span", { style: "display:flex;gap:8px;align-items:center;min-width:0" }, b); cloudChip(x.n.cloud, l); el("span", { class: "nm", text: x.n.name }, l); el("span", { class: "pill bad", text: num(x.e) }, b); });
    const r2 = el("div", { class: "row2 mt" }, v);
    const bc = el("div", { class: "card pad" }, r2); cardHead(bc, "How widely open", "Each bar is one rule open beyond our network. Length = addresses that can reach it (log scale). 0.0.0.0/0 = 4.3 billion.");
    breadth(bc);
    const pc = el("div", { class: "card pad" }, r2); cardHead(pc, "Ports open beyond our network", "Rules allowing admin or database ports from public sources, by cloud");
    portMatrix(pc);
  }
  function topology(p, net) {
    const sgs = state.st.est.resources.filter(r => r.network === net.id && (r.kind === "sg" || r.kind === "nacl"));
    const open = r => ev().resources[r.id].drifts.filter(d => d.rule && !DR.isPrivate(d.rule.cidr));
    const allOpen = sgs.flatMap(open);
    const top = el("div", { style: "display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap" }, p);
    el("span", { class: "pill " + (allOpen.length ? "bad" : "ok"), text: allOpen.length ? "Internet / public ranges → " + [...new Set(allOpen.map(d => DR.portLabel(d.rule.port)))].join(", ") : "No public exposure" }, top);
    cloudChip(net.cloud, top); el("span", { class: "pill", text: net.team }, top); el("span", { class: "pill", text: net.classification }, top); el("span", { class: "pill", text: net.env }, top);
    const box = el("div", { class: "topo" }, p); el("div", { class: "eyebrow", text: net.type + " · " + pl(net.subnets, "subnet", "subnets") + " · " + pl(sgs.length, "firewall object", "firewall objects") }, box);
    const sn = el("div", { class: "subnets" }, box);
    for (let s = 0; s < net.subnets; s++) { const d = el("div", { class: "subnet" }, sn); el("b", { text: ["public", "app", "data", "mgmt"][s % 4] + " subnet " + (s + 1) }, d);
      sgs.filter((g, i) => i % net.subnets === s).forEach(g => { const o = open(g), c = el("span", { class: "sgchip" + (o.length ? " bad" : ""), tabindex: 0, "data-tip": g.name + " · " + g.type + (o.length ? " · " + o.map(x => x.controlId + ": " + x.actual).join(" · ") : " · no public exposure"), on: { click: () => openResource(g.id) } }, d);
        el("span", { text: g.isDefault ? "default" : g.name.replace(/^.*?-(\w+-sg-\w+)$/, "$1").slice(0, 22) }, c); [...new Set(o.map(x => DR.portLabel(x.rule.port)))].forEach(pt => el("span", { class: "port", text: pt }, c)); }); }
  }
  function breadth(p) {
    const seen = new Set(), rows = [];
    ev().drifts.filter(d => d.rule && !DR.isPrivate(d.rule.cidr)).sort((a, b) => b.risk - a.risk).forEach(d => { const k = d.resourceId + d.rule.port + d.rule.cidr; if (seen.has(k)) return; seen.add(k); rows.push(d); });
    const pick = rows.sort((a, b) => DR.cidrDev(b.rule.cidr) - DR.cidrDev(a.rule.cidr) || b.risk - a.risk);
    const show = []; const seenC = {}; pick.forEach(d => { const c = d.rule.cidr; seenC[c] = (seenC[c] || 0) + 1; if (seenC[c] <= 2 && show.length < 12) show.push(d); });
    show.forEach(d => { const r = res(d.resourceId), dev = DR.cidrDev(d.rule.cidr);
      const row = el("div", { class: "hbar", style: "grid-template-columns:190px minmax(0,1fr) 110px", "data-tip": r.name + " · " + d.controlId + " · " + d.actual + " · " + d.priority, on: { click: () => openResource(r.id) } }, p);
      el("span", { style: "white-space:nowrap;overflow:hidden;text-overflow:ellipsis", html: "<b>" + esc(DR.portLabel(d.rule.port)) + "</b> · " + esc(r.name) }, row);
      const t = el("div", { class: "track" }, row); el("span", { style: "width:" + dev * 100 + "%;background:" + (dev >= 1 ? "#B5543C" : dev >= .7 ? "#D9822B" : "#C9A227") }, t);
      el("span", { class: "v", text: d.rule.cidr, style: "font-size:12px" }, row); });
    el("div", { class: "legend", html: "<span>Scale: /32 = 1 address · /16 = 65,536 · /8 = 16.7 million · /0 = everyone</span>" }, p);
  }
  function portMatrix(p) {
    const ports = [22, 3389, 1433, 1521, 3306, 5432, 6379, 9200, 27017, "all"], m = {};
    ev().drifts.filter(d => d.rule && !DR.isPrivate(d.rule.cidr)).forEach(d => ports.forEach(pt => { if (d.rule.port === pt || (pt !== "all" && Array.isArray(d.rule.port) && pt >= d.rule.port[0] && pt <= d.rule.port[1])) { const k = pt + "|" + res(d.resourceId).cloud; m[k] = m[k] || new Set(); m[k].add(d.resourceId); } }));
    const t = el("table", { class: "tbl" }, p), hr = el("tr", null, el("thead", null, t)); el("th", { text: "Port" }, hr); B.ALL.forEach(cl => el("th", { class: "r", text: C[cl].short, style: "color:" + C[cl].color }, hr));
    const bd = el("tbody", null, t), names = { 22: "SSH", 3389: "RDP", 1433: "SQL Server", 1521: "Oracle DB", 3306: "MySQL", 5432: "PostgreSQL", 6379: "Redis", 9200: "Elasticsearch", 27017: "MongoDB", all: "All ports" };
    ports.forEach(pt => { const tr = el("tr", null, bd); el("td", { html: "<b>" + pt + "</b> <span style='color:var(--muted)'>" + names[pt] + "</span>" }, tr);
      B.ALL.forEach(cl => { const n = m[pt + "|" + cl] ? m[pt + "|" + cl].size : 0; el("td", { class: "r", text: n || "·", style: n ? "color:#fff;background:rgba(181,84,60," + Math.min(1, .25 + n / 25) + ");font-weight:700;border-radius:4px" : "color:var(--dim)", "data-tip": C[cl].name + " · port " + pt + " · " + pl(n, "firewall object", "firewall objects") }, tr); }); });
  }

  // ---------- Prioritize ----------
  function queue() {
    const f = state.qf; return ev().drifts.filter(d => (f.cloud === "all" || res(d.resourceId).cloud === f.cloud) && (f.pri === "all" || d.priority === f.pri) && (!f.family || CTRL[d.controlId].family === f.family) && (!state.cell || (d.impact === state.cell[0] && d.likelihood === state.cell[1])))
      .sort((a, b) => b.risk - a.risk || b.age - a.age);
  }
  function renderPrioritize(v) {
    const deploy = el("button", { class: "btn", text: "Run pipeline", "data-tip": "Simulate the next deployment: modules re-apply their settings and overwrite console fixes", on: { click: () => act(RM.deploy(state.st)) } });
    head(v, "What do we <em>fix first</em>?", "Impact × likelihood, with a fix-time target for each priority", deploy);
    const D = ev().drifts, row = el("div", { class: "row2w", style: "grid-template-columns:minmax(0,1fr) minmax(0,1.6fr)" }, v);
    const mc = el("div", { class: "card pad" }, row); cardHead(mc, "Impact × likelihood", "Rows = impact (data, criticality, environment). Columns = likelihood (exposure, attack path, age). Click a cell to filter.");
    const mx = el("div", { class: "matrix" }, mc);
    for (let i = 5; i >= 1; i--) { el("div", { class: "mx-l", text: i }, mx); for (let l = 1; l <= 5; l++) { const n = D.filter(d => d.impact === i && d.likelihood === l).length, r = i * l, band = r >= 20 ? "P1" : r >= 12 ? "P2" : r >= 6 ? "P3" : "P4", on = state.cell && state.cell[0] === i && state.cell[1] === l;
      el("button", { class: "mx" + (n ? "" : " empty") + (on ? " on" : ""), style: "background:" + PC[band], text: n || "·", "data-tip": "Impact " + i + " × likelihood " + l + " = " + r + " (" + band + ") · " + pl(n, "drift", "drifts"), on: { click: () => { state.cell = on ? null : [i, l]; state.limit = 40; render(); } } }, mx); } }
    el("div", { class: "mx-l" }, mx); for (let l = 1; l <= 5; l++) el("div", { class: "mx-l", text: l }, mx);
    el("div", { class: "legend", style: "margin-top:10px", html: Object.keys(PC).map(k => "<span><i style='background:" + PC[k] + "'></i>" + k + " · " + PR.BANDS.find(b => b[0] === k)[3] + "</span>").join("") }, mc);
    const pk = el("div", { class: "kpis", style: "grid-template-columns:repeat(4,minmax(0,1fr));margin:14px 0 0" }, mc);
    ["P1", "P2", "P3", "P4"].forEach((p2, i) => { const L = D.filter(d => d.priority === p2); kpi(pk, p2, num(L.length), num(L.filter(overdue).length) + " late", p2 === "P1" ? "bad" : "", p2 + ": fix within " + PR.BANDS.find(b => b[0] === p2)[3], i); });
    const qc = el("div", { class: "card pad" }, row);
    const tabs = el("div", { class: "tabs" }); [["queue", "Queue"], ["wins", "Quick wins"]].forEach(([k, l]) => el("button", { class: state.tab === k ? "on" : "", text: l, on: { click: () => { state.tab = k; render(); } } }, tabs));
    cardHead(qc, state.tab === "queue" ? "Fix queue" : "Quick wins", state.tab === "queue" ? "Highest risk first, then oldest" : "Auto-fix eligible drifts: safe settings like logging, versioning, and encryption", tabs);
    state.tab === "queue" ? renderQueue(qc) : renderWins(qc);
  }
  function renderQueue(p) {
    const f = el("div", { class: "chips", style: "margin-bottom:8px" }, p), F = state.qf;
    ["all"].concat(B.ALL).forEach(c => el("button", { class: "chip" + (F.cloud === c ? " on" : ""), text: c === "all" ? "All clouds" : C[c].short, on: { click: () => { F.cloud = c; state.limit = 40; render(); } } }, f));
    el("span", { style: "width:6px" }, f);
    ["all", "P1", "P2", "P3", "P4"].forEach(k => el("button", { class: "chip" + (F.pri === k ? " on" : ""), html: (k !== "all" ? "<span class='dot' style='background:" + PC[k] + "'></span>" : "") + (k === "all" ? "All" : k), on: { click: () => { F.pri = k; state.limit = 40; render(); } } }, f));
    if (F.family || state.cell) el("button", { class: "chip on", text: (F.family || "") + (state.cell ? " impact " + state.cell[0] + " × likelihood " + state.cell[1] : "") + " ✕", on: { click: () => { F.family = null; state.cell = null; render(); } } }, f);
    const Q = queue(), w = el("div", { style: "overflow-x:auto" }, p), t = el("table", { class: "tbl" }, w), hr = el("tr", null, el("thead", null, t));
    ["", "Risk", "Resource", "Control", "Actual", "Drift", "Age", "Team", "Status"].forEach(h => el("th", { text: h }, hr));
    const bd = el("tbody", null, t);
    Q.slice(0, state.limit).forEach(d => { const r = res(d.resourceId), tr = el("tr", { class: "click", tabindex: 0, on: { click: () => openResource(r.id), keydown: e => { if (e.key === "Enter") openResource(r.id); } } }, bd);
      priChip(d, el("td", null, tr)); el("td", { class: "r", html: "<b>" + d.risk + "</b>", "data-tip": d.why.map(x => x.t).join(" · ") }, tr);
      const rc = el("td", null, tr), rw = el("div", { style: "display:flex;gap:6px;align-items:center" }, rc); cloudChip(r.cloud, rw); el("span", { text: r.name, style: "white-space:nowrap" }, rw);
      el("td", { class: "nw", html: "<b>" + d.controlId + "</b>", "data-tip": CTRL[d.controlId].name }, tr); el("td", { text: d.actual, style: "max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap", "data-tip": "Expected: " + d.expected + " · Actual: " + d.actual }, tr);
      const dv = el("span", { class: "devbar", "data-tip": "Deviation " + d.d.toFixed(2) }, el("td", null, tr)); el("span", { style: "width:" + d.d * 100 + "%" }, dv);
      el("td", { class: "r nw", text: d.age + "d", style: overdue(d) ? "color:var(--rust);font-weight:700" : "", "data-tip": overdue(d) ? "Past the " + d.sla + " target" : "Within the " + d.sla + " target" }, tr);
      el("td", { class: "nw", text: r.team }, tr); el("td", { class: "nw", html: d.status === "submitted" ? "<span class='pill gold'>fix submitted</span>" : "<span class='pill bad'>drifted</span>" }, tr); });
    if (!Q.length) el("div", { class: "note ok", text: "Nothing matches these filters." }, p);
    if (Q.length > state.limit) el("button", { class: "btn ghost", style: "margin-top:10px", text: "Show " + Math.min(40, Q.length - state.limit) + " more of " + num(Q.length - state.limit), on: { click: () => { state.limit += 40; render(); } } }, p);
  }
  function renderWins(p) {
    const D = ev().drifts.filter(d => CTRL[d.controlId].auto && d.status !== "submitted"), sub = ev().drifts.filter(d => d.status === "submitted"), A = assessed(), n = A.length, cur = fleetConf(A);
    const groups = {}; D.forEach(d => (groups[d.controlId] = groups[d.controlId] || []).push(d));
    if (!state.qsel) state.qsel = new Set(Object.keys(groups));
    const ids = Object.keys(groups).sort((a, b) => sum(groups[b], x => x.points) - sum(groups[a], x => x.points));
    const selD = ids.filter(id => state.qsel.has(id)).flatMap(id => groups[id]), gain = sum(selD, x => x.points) / n;
    const top = el("div", { class: "note", style: "margin-top:0" }, p);
    top.innerHTML = "<b>" + pl(selD.length, "drift", "drifts") + "</b> selected · fleet conformance <b>" + pct(cur) + " → " + pct(cur + gain) + "</b> · removes " + Math.round(sum(selD, x => x.points) / Math.max(1, sum(ev().drifts, x => x.points)) * 100) + "% of open drift points. Fixes go in as module pull requests, so they hold.";
    const gb = el("div", { class: "gain", style: "margin-top:10px" }, p); el("span", { style: "width:" + cur + "%;background:#2F7D4F" }, gb); el("span", { style: "width:" + gain + "%;background:#C9A227" }, gb);
    ids.forEach(id => { const g = groups[id], r = el("label", { class: "qw" }, p); const cb = el("input", { type: "checkbox" }, r); cb.checked = state.qsel.has(id); cb.addEventListener("change", () => { cb.checked ? state.qsel.add(id) : state.qsel.delete(id); render(); });
      el("span", { html: "<b>" + id + "</b> · " + esc(CTRL[id].name) }, r); el("span", { class: "r", text: pl(g.length, "drift", "drifts") }, r); el("span", { class: "r", text: num(sum(g, x => x.points)) + " pts" }, r);
      const gc = el("span", { class: "gaincol" }, r); const gg = el("div", { class: "gain" }, gc); el("span", { style: "width:" + Math.min(100, sum(g, x => x.points) / Math.max(1, sum(D, x => x.points)) * 300) + "%;background:#C9A227" }, gg); });
    const a = el("div", { class: "acts" }, p);
    el("button", { class: "btn pri", text: "Approve and apply " + num(selD.length), "data-tip": "Cloud security lead only. Applies module changes for eligible controls.", on: { click: () => act(RM.autofix(state.st, selD.map(d => d.key), state.persona)) } }, a);
    if (me().type !== "lead") el("button", { class: "btn ghost", text: "Switch to Omar Haddad", on: { click: () => setPersona("omar") } }, a);
    el("button", { class: "btn", text: "Re-check " + num(sub.length) + " submitted", on: { click: () => act(RM.recheck(state.st, sub.map(d => d.key))) } }, a);
    if (!ids.length) el("div", { class: "note ok", text: "No auto-fix eligible drifts left." }, p);
  }
  function act(r) { toast(r.msg); log(r.ok ? r.msg : "Blocked · " + r.msg); if (r.ok) dirty(); state.qsel = null; render(); if ($("drawer").classList.contains("open") && state.openRes) openResource(state.openRes); return r; }

  // ---------- Resource drawer ----------
  function openResource(id) {
    state.openRes = id; const r = res(id), e = ev().resources[id], body = $("drawerBody"); body.innerHTML = "";
    el("div", { class: "eyebrow", text: C[r.cloud].name + " · " + r.type }, body); el("h2", { text: r.name }, body);
    const f = el("div", { class: "facts" }, body);
    [["Account", r.account], ["Team", r.team], ["Environment", r.env], ["Classification", r.classification], ["Criticality", "Tier " + r.tier], ["Deployed by", r.deployedBy === "module" ? "IaC module" : "Console"]].forEach(([k, v2]) => el("div", { class: "fact", html: esc(k) + "<b>" + esc(v2) + "</b>" }, f));
    const sr = el("div", { class: "scorerow" }, body), ring = el("div", { class: "ring" }, sr), sv = el("svg:svg", { viewBox: "0 0 92 92", width: 92, height: 92 }, ring), Cc = 2 * Math.PI * 38;
    el("svg:circle", { cx: 46, cy: 46, r: 38, fill: "none", stroke: "#E1E6DE", "stroke-width": 9 }, sv);
    el("svg:circle", { cx: 46, cy: 46, r: 38, fill: "none", stroke: confColor(e.conformance), "stroke-width": 9, "stroke-linecap": "round", "stroke-dasharray": (Cc * e.conformance / 100) + " " + Cc, transform: "rotate(-90 46 46)" }, sv);
    el("div", { class: "lbl", html: "<div><b>" + Math.round(e.conformance) + "%</b><span>conformant</span></div>" }, ring);
    el("div", { html: "<div style='font-size:14px'><b>" + pl(e.drifts.length, "control", "controls") + " off baseline</b> of " + e.applicable + " that apply</div><div style='font-size:12.5px;color:var(--muted);margin-top:4px'>Drift score " + e.score + " = 100 × Σ(severity weight × deviation) ÷ Σ(weights).</div>" + (r.deployedBy === "module" ? "<div class='pill gold' style='display:inline-block;margin-top:6px'>Managed by a module: console fixes get overwritten</div>" : "") }, sr);
    e.excepted.forEach(x => el("div", { class: "note", text: x.controlId + " excepted under " + x.exception + " until " + fmt(state.st.exceptions.find(y => y.id === x.exception).until) + ": " + state.st.exceptions.find(y => y.id === x.exception).reason + "." }, body));
    if (!e.drifts.length && !e.excepted.length) el("div", { class: "note ok", text: "Meets every applicable control." }, body);
    e.drifts.slice().sort((a, b) => b.risk - a.risk).forEach(d => {
      const c = CTRL[d.controlId], card = el("div", { class: "dcard" + (d.status === "submitted" ? " sub" : "") }, body), top = el("div", { class: "top" }, card);
      el("b", { text: d.controlId + " · " + c.name }, top); const tg = el("span", { style: "display:flex;gap:6px" }, top); priChip(d, tg); el("span", { class: "pill", text: d.age + " days" }, tg);
      const df = el("div", { class: "diff" }, card); el("div", { class: "exp", html: "<span>Expected</span>" + esc(d.expected) }, df); el("div", { class: "act", html: "<span>Actual</span>" + esc(d.actual) }, df);
      el("div", { class: "why", html: "<b>Deviation " + d.d.toFixed(2) + "</b> · risk " + d.risk + " = impact " + d.impact + " × likelihood " + d.likelihood + "<br>Why? " + esc(d.why.map(x => x.t).join(" · ")) }, card);
      const fx = B.FIX[d.controlId], snip = fx && (fx[r.cloud] || null), tf = fx && fx.tf;
      if (snip || tf) { const h = el("div", { class: "eyebrow", style: "margin-top:10px;display:flex;gap:6px;align-items:center" }, card); h.textContent = "Fix"; h.appendChild(simTag());
        if (tf) el("pre", { class: "code", text: (r.deployedBy === "module" ? "# Terraform: change the baseline module\n" : "# Terraform: bring this resource under a module\n") + tf }, card);
        if (snip) el("pre", { class: "code", text: "# " + C[r.cloud].name + " CLI\n" + snip.split("{r}").join(r.name) }, card); }
      else el("div", { class: "why", text: "Fix: " + B.STEPS[c.measure === "binary" ? "binary" : c.path === "exposure" ? "exposure" : "threshold"].join(" → ") + "." }, card);
      const a = el("div", { class: "acts" }, card);
      if (d.status === "submitted") { el("span", { class: "pill gold", text: "Fix submitted (" + d.method + ")" }, a); el("button", { class: "btn pri sm", text: "Re-check", on: { click: () => act(RM.recheck(state.st, [d.key])) } }, a); return; }
      let rv = null; if (c.path === "exposure" && !c.auto) { const l = el("label", { class: "review" }, a); rv = el("input", { type: "checkbox" }, l); el("span", { text: "Owner confirmed nothing depends on it" }, l); }
      el("button", { class: "btn pri sm", text: "Fix in code", "data-tip": "Change the module and open a pull request. Holds on the next deployment.", on: { click: () => act(RM.fix(state.st, d.key, "code", state.persona, { reviewed: rv ? rv.checked : true })) } }, a);
      el("button", { class: "btn sm", text: "Fix in console", "data-tip": r.deployedBy === "module" ? "The module will overwrite this on the next deployment" : "Holds, because nothing re-applies this resource", on: { click: () => act(RM.fix(state.st, d.key, "console", state.persona, { reviewed: rv ? rv.checked : true })) } }, a);
      el("button", { class: "btn ghost sm", text: "Request exception", on: { click: () => exceptionForm(card, d) } }, a);
    });
    const hist = state.st.history.filter(h => h.resourceId === id);
    if (hist.length || Object.keys(r.since || {}).length) { el("h4", { text: "History" }, body);
      hist.forEach(h => el("div", { class: "htl", html: "<b>" + h.controlId + "</b> fixed in the " + h.method + " on " + fmt(h.fixedOn) + (h.redrift ? " · <span style='color:var(--rust)'>drifted back " + fmt(h.revertedOn) + "</span>" : " · held") }, body));
      Object.keys(r.since || {}).filter(k => !hist.some(h => h.controlId === k)).forEach(k => el("div", { class: "htl", html: "<b>" + k + "</b> drifted on " + fmt(r.since[k]) }, body)); }
    if (r.rules) { el("h4", { text: "Rules (" + r.rules.length + ")" }, body); const t = el("table", { class: "tbl" }, body), bd = el("tbody", null, t);
      r.rules.forEach(x => { const bad = !DR.isPrivate(x.cidr) && x.port !== 443 && x.port !== 80; const tr = el("tr", null, bd); el("td", { html: "<b>" + DR.portLabel(x.port) + "</b>" }, tr); el("td", { text: x.cidr, style: bad ? "color:var(--rust);font-weight:600" : "" }, tr); el("td", { text: x.hit > 90 ? "unused " + x.hit + "d" : "used " + x.hit + "d ago", style: "color:var(--muted)" }, tr); el("td", { text: x.note || "", style: "color:var(--muted)" }, tr); }); }
    openDrawer();
  }
  function exceptionForm(card, d) {
    const f = el("div", { class: "form" }, card); const ta = el("textarea", { rows: 2, placeholder: "Why is this drift acceptable for now?" }, f);
    const sel = el("select", null, f); [30, 90, 180].forEach(n => el("option", { value: n, text: n + " days" }, sel));
    el("button", { class: "btn sm", text: "Approve exception", on: { click: () => act(RM.except(state.st, d.key, state.persona, ta.value, +sel.value)) } }, f);
  }

  // ---------- Report ----------
  function renderReport(v) {
    const ex = el("button", { class: "btn pri", text: "Export CSV", "data-tip": "Every open drift with priority, deviation, and fix target", on: { click: exportCsv } });
    head(v, "How are we <em>doing</em>?", "Conformance against baseline v1.0 as of " + fmt(state.st.today), ex);
    const A = assessed(), D = ev().drifts, rs = RM.redriftStats(state.st), t = RM.trend(state.st, ev());
    const k = el("div", { class: "kpis" }, v);
    kpi(k, "Conformance", pct(fleetConf(A)), "was " + pct(t[0].conf) + " 90 days ago", "", "Fleet average", 0);
    kpi(k, "P1 open", num(D.filter(d => d.priority === "P1").length), pl(D.filter(d => d.priority === "P1" && overdue(d)).length, "past 48 hours", "past 48 hours"), "bad", "Highest-risk drifts", 1);
    kpi(k, "Past target", num(D.filter(overdue).length), "of " + num(D.length) + " open drifts", "", "Older than the fix-time target for their priority", 2);
    kpi(k, "Console re-drift", Math.round(rs.consoleRedrift / Math.max(1, rs.console) * 100) + "%", rs.consoleRedrift + " of " + rs.console + " console fixes", "bad", "Console fixes on module-managed resources get overwritten", 3);
    kpi(k, "Code re-drift", Math.round(rs.codeRedrift / Math.max(1, rs.code) * 100) + "%", rs.codeRedrift + " of " + rs.code + " code fixes", "good", "Fixes made in the module hold", 4);
    const sm = el("div", { class: "card pad" }, v); const sh = cardHead(sm, "Summary"); sh.appendChild(simTag("Drafted by simulated AI from the numbers on this page. Edit before sharing."));
    const worst = B.ALL.map(cl => ({ cl, v: fleetConf(A.filter(r => r.cloud === cl)) })).sort((a, b) => a.v - b.v);
    el("p", { style: "margin:0;font-size:15px;line-height:1.6", text: "Fleet conformance is " + pct(fleetConf(A)) + ", down from " + pct(t[0].conf) + " 90 days ago. " + C[worst[0].cl].name + " (" + pct(worst[0].v) + ") and " + C[worst[1].cl].name + " (" + pct(worst[1].v) + ") trail, mostly on logging and network defaults. " + pl(D.filter(d => d.priority === "P1").length, "P1 drift is", "P1 drifts are") + " open, led by SSH and RDP open to the internet in the payroll production network for 97 days. " + Math.round(rs.rate * 100) + "% of last quarter's fixes drifted back, all of them console fixes on resources a pipeline manages; none of the code fixes did. Recommendation: make fixes in the modules, and approve the auto-fix batch for logging, versioning, and encryption." }, sm);
    const row = el("div", { class: "row2 mt" }, v);
    const bu = el("div", { class: "card pad", style: "overflow-x:auto" }, row); cardHead(bu, "By business unit and team", "Conformance, open drifts, P1, and past target");
    const tb = el("table", { class: "tbl" }, bu), hr = el("tr", null, el("thead", null, tb)); ["Business unit", "Team", "Conformance", "Drifts", "P1", "Past target"].forEach(h => el("th", { text: h }, hr)); const bd = el("tbody", null, tb);
    ES.BUS.forEach(b => { const L = A.filter(r => r.bu === b.id), DD = D.filter(d => res(d.resourceId).bu === b.id), c2 = fleetConf(L), tr = el("tr", null, bd);
      el("td", { html: "<b>" + esc(b.name) + "</b>" }, tr); el("td", { text: b.team }, tr); el("td", { class: "r", text: pct(c2), style: "color:" + confColor(c2) + ";font-weight:700" }, tr);
      el("td", { class: "r", text: num(DD.length) }, tr); el("td", { class: "r", text: num(DD.filter(d => d.priority === "P1").length) }, tr); el("td", { class: "r", text: num(DD.filter(overdue).length) }, tr); });
    const rc = el("div", { class: "card pad" }, row); cardHead(rc, "Top 10 resources by risk", "Highest single-drift risk, then drift score");
    const top = A.map(r => ({ r, e: ev().resources[r.id] })).filter(x => x.e.drifts.length).sort((a, b) => Math.max(...b.e.drifts.map(d => d.risk)) - Math.max(...a.e.drifts.map(d => d.risk)) || b.e.score - a.e.score).slice(0, 10);
    top.forEach(x => { const d = x.e.drifts.slice().sort((a, b) => b.risk - a.risk)[0], r = el("div", { class: "htl", style: "display:flex;gap:8px;align-items:center;cursor:pointer", on: { click: () => openResource(x.r.id) } }, rc);
      priChip(d, r); cloudChip(x.r.cloud, r); el("b", { text: x.r.name }, r); el("span", { text: d.controlId + " · " + d.actual, style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, r); });
    const ec = el("div", { class: "card pad mt" }, v); cardHead(ec, "Exceptions", "Approved drifts with an expiry");
    state.st.exceptions.forEach(x => el("div", { class: "htl", html: "<b>" + x.id + "</b> · " + esc(res(x.resource).name) + " · " + x.controls.join(", ") + " · until " + fmt(x.until) + " · " + esc(x.reason) }, ec));
  }
  function exportCsv() {
    const rows = [["priority", "risk", "impact", "likelihood", "cloud", "resource", "type", "team", "control", "expected", "actual", "deviation", "age_days", "status"]];
    ev().drifts.slice().sort((a, b) => b.risk - a.risk).forEach(d => { const r = res(d.resourceId); rows.push([d.priority, d.risk, d.impact, d.likelihood, r.cloud, r.name, r.type, r.team, d.controlId, d.expected, d.actual, d.d.toFixed(2), d.age, d.status]); });
    const csv = rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(",")).join("\n"), a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "oc02-drift-" + state.st.today + ".csv"; a.click(); log("Exported " + pl(rows.length - 1, "drift", "drifts") + " to CSV"); toast("CSV exported");
  }

  // ---------- Checks ----------
  function checks() {
    const out = [], s0 = RM.create(ES.generate()), e0 = RM.current(s0);
    const g = e0.resources["aws-object-gold"]; out.push(["K1", g.score === 0 && g.conformance === 100, "A resource meeting every control: drift 0, conformance 100%", "score " + g.score + " · " + g.conformance + "%"]);
    const p = e0.drifts.find(d => d.resourceId === "aws-sg-pay01" && d.controlId === "NET-01"); out.push(["K2", p && p.d === 1 && p.impact === 5 && p.likelihood === 5 && p.risk === 25 && p.priority === "P1", "Payroll SSH from 0.0.0.0/0: deviation 1, 5 × 5 = 25, P1", p ? "deviation " + p.d + " · " + p.impact + " × " + p.likelihood + " = " + p.risk + " · " + p.priority : "missing"]);
    const fl = e0.drifts.find(d => d.controlId === "NET-08" && s0.byId[d.resourceId].cloud === "azure"); out.push(["K3", fl && fl.d.toFixed(2) === "0.67", "Flow log retention 30 vs 90 days: deviation 0.67", fl ? fl.actual + " → " + fl.d.toFixed(2) : "missing"]);
    const pt = e0.drifts.find(d => d.resourceId === "azure-sg-ptr-edi"); out.push(["K4", pt && pt.d === .75, "PostgreSQL open to a /8: exposure deviation 0.75", pt ? pt.actual + " → " + pt.d : "missing"]);
    const w = e0.resources["aws-object-www"], w2 = RM.current(s0, "2027-02-01").resources["aws-object-www"];
    out.push(["K5", w.drifts.length === 0 && w.excepted.length === 2 && w2.drifts.length === 2, "Public website bucket: excepted now, drift after expiry", "now " + w.excepted.length + " excepted · Feb 1, 2027: " + w2.drifts.length + " drifts"]);
    const s6 = RM.create(ES.generate()), e6 = RM.current(s6), mod = e6.drifts.find(d => s6.byId[d.resourceId].deployedBy === "module" && DR.CTRL[d.controlId].path === "hygiene"), mod2 = e6.drifts.filter(d => s6.byId[d.resourceId].deployedBy === "module" && DR.CTRL[d.controlId].path === "hygiene")[1];
    RM.fix(s6, mod.key, "console", "maya"); RM.fix(s6, mod2.key, "code", "maya"); RM.recheck(s6, [mod.key, mod2.key]); const dp = RM.deploy(s6);
    out.push(["K6", dp.undone.includes(mod.key) && !dp.undone.includes(mod2.key) && s6.history.some(h => h.key === mod.key && h.redrift), "Console fix on a module resource re-drifts; a code fix holds", dp.msg]);
    const s7 = RM.create(ES.generate()), e7 = RM.current(s7), autoD = e7.drifts.find(d => DR.CTRL[d.controlId].auto), nonA = e7.drifts.find(d => !DR.CTRL[d.controlId].auto);
    const a1 = RM.autofix(s7, [autoD.key], "maya"), a2 = RM.autofix(s7, [nonA.key], "omar"); out.push(["K7", !a1.ok && !a2.ok, "Auto-fix needs the lead and an eligible control", a1.msg + " · " + a2.msg]);
    RM.fix(s7, autoD.key, "code", "maya"); const still = RM.current(s7).drifts.find(d => d.key === autoD.key);
    out.push(["K8", still && still.status === "submitted", "A submitted fix isn't counted until re-checked", still ? "status: " + still.status : "gone"]);
    const byCloud = B.ALL.reduce((a, cl) => a + e0.drifts.filter(d => s0.byId[d.resourceId].cloud === cl).length, 0), sample = s0.est.resources.slice(0, 200).every(r => { const x = e0.resources[r.id]; return Math.abs(x.conformance - (100 - sum(x.drifts, d => d.points))) < .11; });
    out.push(["K9", byCloud === e0.drifts.length && sample, "Cloud counts add up; conformance = 100 − drift points", num(byCloud) + " = " + num(e0.drifts.length)]);
    const q = [pl(0, "drift", "drifts"), pl(1, "rule", "rules"), pl(2, "fix", "fixes")]; out.push(["K10", q[0] === "0 drifts" && q[1] === "1 rule" && q[2] === "2 fixes", "Counts of 0 and 1 read correctly", q.join(" · ")]);
    return out;
  }
  function openChecks() {
    state.openRes = null; const body = $("drawerBody"); body.innerHTML = ""; el("div", { class: "eyebrow", text: "Known answers" }, body); el("h2", { text: "Can we trust it?" }, body);
    const res2 = checks(), pass = res2.filter(r => r[1]).length; el("div", { class: "note", text: pass + " of " + res2.length + " checks pass. Each runs on a fresh copy of the estate." }, body);
    res2.forEach(([id, ok, lab, det]) => { const r = el("div", { class: "check-row", tabindex: 0, "data-tip": det }, body); el("span", { class: ok ? "pass-tag" : "fail-tag", text: ok ? "PASS" : "FAIL" }, r); el("span", { text: id, style: "color:var(--muted);font-weight:600" }, r); el("span", { text: lab }, r); });
    el("h4", { text: "Guardrails" }, body); const g = el("div", null, body);
    [["Written baseline", "41 controls, versioned, with stated assumptions"], ["Distance, not pass/fail", "Deviation 0–1 per control"], ["Change review", "Exposure fixes need the owner's confirmation"], ["Lead approves auto-fix", "Only eligible controls"], ["Re-check to close", "Submitted isn't fixed"], ["Re-drift tracked", "Console fixes on module resources come back"], ["Exceptions expire", "Within 180 days"], ["Nothing touches a real cloud", "All fixes are simulated"]]
      .forEach(([k, t]) => el("span", { class: "guard", tabindex: 0, "data-tip": t, text: k }, g));
    openDrawer(); log("Ran checks: " + pass + " of " + res2.length + " pass");
  }

  // ---------- chrome ----------
  function openDrawer() { $("drawer").classList.add("open"); $("drawer").setAttribute("aria-hidden", "false"); }
  function closeDrawer() { $("drawer").classList.remove("open"); $("drawer").setAttribute("aria-hidden", "true"); state.openRes = null; hideTip(); }
  document.querySelector("[data-close=drawer]").addEventListener("click", closeDrawer);
  function fillPersona() { const s = $("persona"); s.innerHTML = ""; RM.PERSONAS.forEach(p => el("option", { value: p.id, text: p.name + " · " + p.role }, s)); s.value = state.persona; }
  function setPersona(id) { state.persona = id; $("persona").value = id; log("Viewing as " + RM.persona(id).name + " (" + RM.persona(id).role + ")"); toast("Viewing as " + RM.persona(id).name); render(); if (state.openRes) openResource(state.openRes); }
  $("persona").addEventListener("change", e => setPersona(e.target.value));
  document.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
  $("checksBtn").addEventListener("click", openChecks);
  $("logBtn").addEventListener("click", () => { const l = $("log"); l.classList.toggle("open"); l.setAttribute("aria-hidden", !l.classList.contains("open")); });
  $("presenterBtn").addEventListener("click", e => { const on = document.body.classList.toggle("present"); e.currentTarget.setAttribute("aria-pressed", on); if (on) $("log").classList.remove("open"); render(); });
  $("resetBtn").addEventListener("click", () => { state = fresh(); dirty(); fillPersona(); closeDrawer(); $("logList").innerHTML = ""; log("Reset"); toast("Reset"); render(); });
  document.addEventListener("keydown", e => { if (e.target.matches("input, textarea, select")) return; const v = { 1: "baseline", 2: "inventory", 3: "drift", 4: "exposure", 5: "prioritize", 6: "report" }[e.key]; if (v) setView(v); if (e.key === "Escape") { closeDrawer(); $("log").classList.remove("open"); } });

  state = fresh(); fillPersona(); log("Evaluated " + num(state.st.est.resources.length) + " resources against baseline v1.0"); render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveSeg);
  window.OC02 = { get state() { return state; }, checks, setView, openResource, setPersona, ev };
})();
