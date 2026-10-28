/* BC-04 · Ransomware Impact Brief for Executives. All data is fictional. */
(function () {
  "use strict";
  const M = window.BC04.model, SCN = window.BC04.scenarios, E = window.BC04Engine;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const J = {}; M.jewels.forEach((j) => (J[j.id] = j));
  const SV = {}; M.services.forEach((s) => (SV[s.id] = s));
  const CT = {}; M.controls.forEach((c) => (CT[c.id] = c));
  const OB = {}; M.obligations.forEach((o) => (OB[o.id] = o));
  const ZN = M.zones;
  const CONTAIN = M.meta.contain_h;

  const PERSONAS = [
    { id: "lead", name: "Jordan Lee", role: "Security lead" },
    { id: "ciso", name: "Priya Natarajan", role: "CISO" },
    { id: "cfo", name: "Marcus Bell", role: "CFO" },
    { id: "coo", name: "Elena Ruiz", role: "COO" },
    { id: "gc", name: "Sam Okafor", role: "General Counsel" },
  ];
  const CLASSES = [
    { id: "customer", label: "Customer", color: "var(--c-customer)" },
    { id: "payment", label: "Payment", color: "var(--c-payment)" },
    { id: "financial", label: "Financial", color: "var(--c-financial)" },
    { id: "ip", label: "IP", color: "var(--c-ip)" },
    { id: "employee", label: "Employee", color: "var(--c-employee)" },
  ];
  const CLS = {}; CLASSES.forEach((c) => (CLS[c.id] = c));
  const STARTS = [
    { v: "2026-11-20T02:00", l: "Fri Nov 20, 02:00" },
    { v: "2026-11-25T02:00", l: "Wed Nov 25, 02:00" },
    { v: "2026-10-28T02:00", l: "Wed Oct 28, 02:00" },
  ];
  const WALL = [["CJ04", 2], ["CJ12", 2], ["CJ10", 1], ["CJ01", 1], ["CJ03", 1], ["CJ06", 1], ["CJ11", 1], ["CJ07", 1], ["CJ05", 1], ["CJ08", 1], ["CJ02", 1], ["CJ09", 1], ["AD", 2]];
  const SHORT = { AD: "AD", CJ01: "Online store", CJ02: "Customer data", CJ03: "Token vault", CJ04: "ERP", CJ05: "Fin. close", CJ06: "Treasury", CJ07: "Payroll", CJ08: "Designs", CJ09: "Formulas", CJ10: "Plant MES", CJ11: "Warehouse", CJ12: "EDI" };

  // ------------------------------------------------------------------ formatting
  const fmtInt = (n) => Math.round(n).toLocaleString("en-US");
  const IRREG = { "retail partner": "retail partners", "crown jewel": "crown jewels", "day": "days", "hour": "hours", "employee": "employees" };
  function plural(n, word, many) {
    const w = n === 1 ? word : (many || IRREG[word] || word + "s");
    return `${fmtInt(n)} ${w}`;
  }
  const isWord = (n, one, many) => (n === 1 ? one : many);
  function compact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    return fmtInt(n);
  }
  function money(n) {
    if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
    return "$" + fmtInt(n);
  }
  const moneyK = (n) => (n >= 1000 ? "$" + Math.round(n / 1000) + "K" : "$" + n);
  function hrs(h) {
    if (h > 0 && h < 1) return Math.round(h * 60) + " min";
    return (Math.round(h * 10) / 10).toString() + " h";
  }
  function lossText(h) {
    if (h >= 168) return plural(Math.round(h / 24), "day");
    if (h > 0 && h < 1) return Math.round(h * 60) + " min";
    return plural(h, "hour");
  }
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function wall(ms, withTime) {
    const d = new Date(ms);
    const s = `${DOW[d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
    if (!withTime) return s;
    return s + `, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }
  const at = (h) => wall(E.parseTime(S.start || scn().start) + h * E.HOUR, true);
  const dateLabel = (iso) => wall(E.parseTime(iso + "T00:00"), false);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ------------------------------------------------------------------ state
  const S = {};
  function freshState() {
    Object.assign(S, {
      view: S.view || "jewels", persona: S.persona || "lead", filter: null, selJewel: null,
      scnId: "R1", ran: false, start: null, workarounds: new Set(), materiality: 48, clock: 0,
      basePriority: M.default_priority.slice(), projPriority: null, projControls: new Set(), mapMode: "base",
      brief: newBrief(),
      log: [], dataClass: null,
    });
  }
  function newBrief() { return { status: "none", draftedBy: null, lastEditor: null, legalBy: null, approvedBy: null, sentBy: null, edited: false }; }
  const scn = () => SCN.find((s) => s.id === S.scnId);
  const persona = () => PERSONAS.find((p) => p.id === S.persona);
  const who = (id) => { const p = PERSONAS.find((x) => x.id === id); return p ? `${p.name} (${p.role})` : "–"; };
  const wkList = () => [...S.workarounds];
  const cache = new Map();
  function runCached(s, opts) {
    const key = JSON.stringify([s.id, opts]);
    if (!cache.has(key)) cache.set(key, E.run(M, s, opts));
    return cache.get(key);
  }
  const startOf = () => S.start || scn().start;
  const base = () => runCached(scn(), { priority: S.basePriority, workarounds: wkList(), start: startOf() });
  const proj = () => runCached(scn(), { controls: [...S.projControls].sort(), priority: S.projPriority || S.basePriority, workarounds: wkList(), start: startOf() });
  const projDiffers = () => S.projControls.size > 0 || (S.projPriority && S.projPriority.join() !== S.basePriority.join());

  function customersAffected(r) {
    const groups = [
      { n: r.customers_exposed, l: "presumed exposed" },
      { n: r.shoppers_turned_away, l: "shoppers turned away" },
      { n: r.partners_affected, l: plural(r.partners_affected, "retail partner").replace(/^[\d,]+ /, "") + " stalled" },
    ].sort((a, b) => b.n - a.n);
    return { n: groups[0].n, label: groups[0].l, groups };
  }

  // ------------------------------------------------------------------ log, toast, tooltip
  function log(what) {
    const d = new Date();
    S.log.unshift({ t: d.toTimeString().slice(0, 8), who: who(S.persona), what, sim: S.ran ? `hour ${S.clock}` : "" });
    $("#logCount").textContent = S.log.length;
    renderLog();
  }
  function renderLog() {
    $("#logBody").innerHTML = S.log.length ? S.log.map((e) => `<li><div class="when">${e.t}${e.sim ? " · sim " + e.sim : ""}</div><span class="who">${esc(e.who)}</span> ${esc(e.what)}</li>`).join("") : `<li class="empty">Nothing yet.</li>`;
  }
  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }
  function initTooltips() {
    const tip = $("#tooltip");
    let cur = null;
    function show(el) {
      const txt = el.getAttribute("data-tip"); if (!txt) return;
      cur = el; tip.textContent = txt; tip.classList.add("show");
      const r = el.getBoundingClientRect(), tr = tip.getBoundingClientRect();
      let x = r.left + r.width / 2 - tr.width / 2, y = r.top - tr.height - 8;
      if (y < 6) y = r.bottom + 8;
      x = Math.max(8, Math.min(window.innerWidth - tr.width - 8, x));
      y = Math.min(window.innerHeight - tr.height - 8, y);
      tip.style.left = x + "px"; tip.style.top = y + "px";
    }
    function hide() { cur = null; tip.classList.remove("show"); }
    document.addEventListener("mouseover", (e) => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el && el !== cur) show(el); else if (!el && cur) hide(); });
    document.addEventListener("focusin", (e) => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) show(el); });
    document.addEventListener("focusout", hide);
    document.addEventListener("scroll", hide, true);
  }

  // ------------------------------------------------------------------ views
  function setView(v) {
    S.view = v;
    $$(".tab").forEach((t) => { const on = t.dataset.view === v; t.classList.toggle("active", on); t.setAttribute("aria-selected", on); });
    $$(".view").forEach((s) => s.classList.toggle("active", s.id === "view-" + v));
    render();
  }

  function render() {
    renderHero();
    if (S.view === "jewels") renderJewels();
    if (S.view === "attack") renderAttack();
    if (S.view === "impact") renderImpact();
    if (S.view === "data") renderData();
    if (S.view === "decide") renderDecide();
  }

  // ------------------------------------------------------------------ hero strip
  let lastHero = {};
  function renderHero() {
    const show = S.ran && !animating;
    $("#heroEmpty").classList.toggle("hidden", show);
    $("#heroItems").classList.toggle("hidden", !show);
    $("#heroEmpty").querySelector("span:last-child").innerHTML = animating ? "Running the scenario…" : `Pick a scenario on <button class="linkish" data-goto="attack">Attack</button> and press <b>Run</b> to see the three numbers.`;
    if (!show) return;
    const r = base(), s = scn(), ca = customersAffected(r);
    $("#heroScn").innerHTML = `<div class="t">${s.id} · ${esc(s.name)}</div><div class="s">${at(0)} · total impact ${money(r.total_impact)}</div>`;
    const set = (id, v, sub, tip) => {
      const el = $("#" + id), hv = el.querySelector(".h-value");
      if (lastHero[id] !== v) { hv.textContent = v; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); lastHero[id] = v; }
      el.querySelector(".h-sub").textContent = sub; el.setAttribute("data-tip", tip);
    };
    const SVS = { S1: "online", S2: "retail orders", S3: "shipping", S4: "plants", S5: "payroll" };
    const last = Object.entries(r.services).filter(([, v]) => v.down_h === r.hours_down && v.down_h > 0).map(([k]) => SVS[k]);
    set("heroHours", r.hours_down ? hrs(r.hours_down) : "0 h",
      r.hours_down ? `${(r.hours_down / 24).toFixed(1)} days · ${last[0] || ""} last` : "No business service went down",
      "Hours until every business service is back. Recovery waits for containment, Active Directory, and free recovery teams.");
    set("heroCust", compact(ca.n), ca.n ? ca.label : "No customers affected",
      (ca.n ? ca.groups.filter((g) => g.n).map((g) => `${fmtInt(g.n)} ${g.l}`).join(" · ") + ". " : "") + "The largest group of affected customers is shown. Customers whose data sits on a reached system are presumed exposed; shoppers turned away are online orders not taken.");
    set("heroRev", money(r.revenue_at_risk), `${money(r.revenue_lost)} lost`,
      "Sales disrupted while online sales or retail partner orders are down. Lost is the share that doesn't come back: 70% online, 15% retail.");
  }

  // ------------------------------------------------------------------ JEWELS
  const ICON = {
    "Cloud": '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.8A3.2 3.2 0 0 0 7 18z"/>',
    "Data center": '<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/><path d="M8 7h.01M8 17h.01"/>',
    "SaaS": '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/>',
    "File share": '<path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
    "Plants": '<path d="M3 20V10l5 3V10l5 3V6h3v14z"/><path d="M3 20h18"/>',
  };
  const svgIcon = (k) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k] || ICON["Data center"]}</svg>`;
  const LOCK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  function jewelValue(id) {
    let v = 0; const tags = [];
    for (const s of M.services) if (s.deps.includes(id)) {
      if (s.revenue_per_hour) v += s.revenue_per_hour;
      if (s.cost_per_hour) v += s.cost_per_hour;
      if (s.kind === "flow") tags.push(fmtInt(s.shipments_per_hour) + " orders/h");
    }
    if (v) return { text: moneyK(v) + "/h", tip: "Revenue and plant output at stake per hour while this is down (services that need it)." };
    if (tags.length) return { text: tags[0], tip: "Orders that can't ship each hour while this is down." };
    if (id === "CJ06" || id === "CJ07") return { text: "Payroll", tip: "Needed for the payroll file and supplier payments." };
    if (id === "CJ05") return { text: "Q3 earnings", tip: "Needed for the Q3 earnings release on Dec 8." };
    if (id === "AD") return { text: "Gates restores", tip: "Every on-premises restore waits for it." };
    return { text: "Data", tip: "No direct revenue per hour; the risk is the data it holds." };
  }
  function recLabel(d) { if (d.unit === "quarter") return "Q3 results"; return d.records === 1 ? `1 ${d.unit.replace(/s$/, "")}` : `${compact(d.records)} ${d.unit}`; }
  function renderJewels() {
    $("#classFilters").innerHTML = `<button class="fbtn ${!S.filter ? "on" : ""}" data-f="">All</button>` +
      CLASSES.map((c) => `<button class="fbtn ${S.filter === c.id ? "on" : ""}" data-f="${c.id}" data-tip="Crown jewels that hold ${c.label.toLowerCase()} data."><i style="background:${c.color}"></i>${c.label}</button>`).join("");
    const r = S.ran ? base() : null;
    $("#wall").innerHTML = WALL.map(([id, span]) => {
      const j = J[id], v = jewelValue(id);
      const has = !S.filter || j.data.some((d) => d.class === S.filter);
      const locked = r && r.hit[id];
      const cls = ["jcard", span === 2 ? "span2" : "", j.listed ? "" : "unlisted", j.kind === "enabler" ? "enabler" : "", S.selJewel === id ? "sel" : "", has ? "" : "faded", locked ? "state-locked" : ""].join(" ");
      const data = j.data.map((d) => `<span class="dchip" data-tip="${esc(d.what)}"><i style="background:${CLS[d.class].color}"></i>${recLabel(d)}</span>`).join("") || `<span class="muted small">No business data · enabler</span>`;
      const flag = j.kind === "enabler" ? `<span class="flag chip">Enabler</span>` : "";
      const valueHtml = locked ? "" : `<span class="value" data-tip="${esc(v.tip)}">${v.text}</span>`;
      const unl = !j.listed ? `<div><span class="chip accent" style="font-size:11.5px;padding:1px 8px" data-tip="${esc(j.note)}">Not on the list</span></div>` : "";
      return `<button class="${cls}" data-j="${id}" aria-label="${esc(j.name)}">
        ${flag}
        <div class="top"><span class="ico">${svgIcon(j.hosting)}</span><div style="min-width:0"><div class="nm">${esc(j.name)}</div>${unl || `<div class="ow">${esc(j.owner)} · ${esc(j.hosting)}</div>`}</div></div>
        <div class="data">${data}</div>
        <div class="jfoot"><span class="bk ${j.backup}" data-tip="${backupTip(j)}">${j.backup}</span>
          <span class="chip lockbadge bad" data-tip="${locked ? `Encrypted in ${scn().id}; back at hour ${Math.round(locked.up)}.` : ""}">${LOCK} ${locked ? "h" + Math.round(locked.up) : ""}</span>
          ${valueHtml}</div>
      </button>`;
    }).join("");
    renderDrawer();
  }
  function backupTip(j) {
    if (j.backup === "immutable") return `Immutable copy, ${lossText(j.copy_age_h)} old at worst. An attacker can't delete it.`;
    if (j.backup === "vendor") return "Backed up by the vendor. Recovery runs on the vendor's timeline.";
    const where = (j.zone === "Z_corp" || j.zone === "Z_ot") ? "the backup platform" : "the same cloud account";
    return `Standard backup. If the attacker reaches ${where}, it's destroyed${j.offline_age_h ? `; the fallback offline copy is ${lossText(j.offline_age_h)} old` : ""}.`;
  }
  function renderDrawer() {
    const d = $("#jewelDrawer");
    if (!S.selJewel) {
      const tot = { customer: 2400000, payment: 900000, financial: 4200, ip: 2300, employee: 6400 };
      const lab = { customer: "customers", payment: "stored cards (tokens)", financial: "supplier bank details", ip: "formulas · 14,000 design files", employee: "employees" };
      const bk = { immutable: 0, standard: 0, vendor: 0 };
      M.jewels.forEach((j) => bk[j.backup]++);
      d.innerHTML = `<div class="card-h">Across the crown jewels</div><div class="d-body">
        ${CLASSES.map((c) => `<div class="sumrow"><i style="background:${c.color}"></i><span class="n">${compact(tot[c.id])}</span><span class="l">${lab[c.id]}</span></div>`).join("")}
        <div class="kv" style="margin-top:12px">
          <dt><span class="bk immutable">immutable</span></dt><dd>${plural(bk.immutable, "system")}</dd>
          <dt><span class="bk standard">standard</span></dt><dd>${plural(bk.standard, "system")} · deletable by an attacker</dd>
          <dt><span class="bk vendor">vendor</span></dt><dd>${plural(bk.vendor, "system")}</dd>
        </div>
        <div class="callout"><span>The formula library holds the core trade secret but isn't on the crown-jewel list.</span><button class="why" data-whyj="CJ09">Why?</button></div>
        <div class="muted small" style="margin-top:10px">Click any card for details.</div></div>`;
      return;
    }
    const j = J[S.selJewel], r = S.ran ? base() : null, hit = r && r.hit[j.id];
    const svcs = M.services.filter((s) => s.deps.includes(j.id)).map((s) => s.name);
    d.innerHTML = `<div class="card-h"><span style="overflow:hidden;text-overflow:ellipsis">${esc(j.name)}</span><span class="spacer"></span><button class="why" data-whyj="${j.id}">Why?</button><button class="btn sm icon" id="drawerClose" aria-label="Close details">✕</button></div>
      <div class="d-body">
        <div class="muted">${esc(j.owner)} · ${esc(j.hosting)} · ${esc(ZN[j.zone])}</div>
        ${hit ? `<div class="callout bad">${LOCK}<span>Encrypted in ${scn().id}. Back at hour ${Math.round(hit.up)} by ${hit.path}; ${lossText(hit.loss_h)} of data lost.</span></div>` : ""}
        ${!j.listed ? `<div class="callout">${esc(j.note)}.</div>` : ""}
        <dl class="kv">
          ${j.data.map((x) => `<dt>${CLS[x.class].label}</dt><dd>${recLabel(x)} · ${esc(x.what)}</dd>`).join("")}
          <dt>RTO · RPO</dt><dd>${hrs(j.rto_h)} · ${hrs(j.rpo_h)}</dd>
          <dt>Backup</dt><dd><span class="bk ${j.backup}">${j.backup}</span></dd>
          <dt>Tested restore</dt><dd>${j.restore_h ? hrs(j.restore_h) : "vendor"}</dd>
          <dt>Rebuild</dt><dd>${j.rebuild_h ? hrs(j.rebuild_h) : (j.backup === "vendor" ? "vendor" : "no rebuild path")}</dd>
          <dt>Newest copy</dt><dd>${lossText(j.copy_age_h)} old</dd>
          ${j.offline_age_h ? `<dt>Offline copy</dt><dd>${lossText(j.offline_age_h)} old</dd>` : ""}
          <dt>Supports</dt><dd>${svcs.length ? esc(svcs.join(", ")) : "No direct service"}</dd>
          <dt>Criticality</dt><dd>${j.criticality} of 5</dd>
        </dl>
        ${j.backup === "standard" ? `<div class="callout warn">${backupTip(j)}</div>` : ""}
        ${j.id === "AD" ? `<div class="callout warn">${esc(j.note)}.</div>` : ""}
      </div>`;
    $("#drawerClose").onclick = () => { S.selJewel = null; renderJewels(); };
  }

  // ------------------------------------------------------------------ ATTACK
  const ZPOS = {
    Z_user: { x: 30, y: 215, w: 200, h: 120, sub: "Laptops and desktops" },
    Z_saas: { x: 30, y: 420, w: 200, h: 120, sub: "Payroll SaaS" },
    Z_corp: { x: 300, y: 110, w: 420, h: 330, sub: "Domain-joined servers" },
    Z_vault: { x: 300, y: 470, w: 420, h: 110, sub: "Isolated · download alerts" },
    Z_cloud: { x: 800, y: 20, w: 270, h: 240, sub: "Online store and data" },
    Z_backup: { x: 800, y: 295, w: 270, h: 110, sub: "" },
    Z_ot: { x: 800, y: 440, w: 270, h: 140, sub: "3 plants" },
  };
  const ATT = { x: 115, y: 92 };
  const PGEOM = {
    P1: { a: [230, 275], b: [300, 275] },
    P5: { a: [720, 160], b: [800, 140] },
    P4: { a: [720, 350], b: [800, 350] },
    P2: { a: [720, 395], b: [800, 480] },
    P3: { a: [800, 520], b: [720, 425] },
  };
  function chipLayout(controls) {
    const pos = {};
    const zoneOf = (id) => (id === "CJ09" && controls.has("C5") ? "Z_vault" : J[id].zone);
    const place = (zone, ids, cols, w) => {
      const z = ZPOS[zone];
      ids.forEach((id, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        pos[id] = { x: z.x + 18 + c * (w + 12), y: z.y + 50 + r * 44, w, h: 34 };
      });
    };
    const corp = ["AD", "CJ04", "CJ12", "CJ11", "CJ06", "CJ05", "CJ09"].filter((id) => zoneOf(id) === "Z_corp");
    place("Z_corp", corp, 2, 186);
    if (zoneOf("CJ09") === "Z_vault") place("Z_vault", ["CJ09"], 1, 186);
    place("Z_cloud", ["CJ01", "CJ03", "CJ02", "CJ08"], 1, 234);
    place("Z_ot", ["CJ10"], 1, 234);
    place("Z_saas", ["CJ07"], 1, 164);
    return pos;
  }
  let animToken = 0;
  function mapControls() { return S.mapMode === "proj" ? S.projControls : new Set(); }
  function mapResult() { return S.mapMode === "proj" ? proj() : base(); }
  function renderAttack() {
    $("#scnList").innerHTML = SCN.map((s) => {
      const cat = s.mode === "exfil" ? "Theft only" : s.mode === "vendor" ? "Third party" : "Encryption";
      return `<button class="scn ${s.id === S.scnId ? "on" : ""}" data-scn="${s.id}" data-tip="${cat}. ${esc(s.setup)}"><span class="id">${s.id}</span><span class="nm">${esc(s.name)}</span></button>`;
    }).join("");
    $("#attackSub").textContent = scn().setup;
    $("#btnRun").textContent = S.ran ? "Run again" : "Run";
    $("#runNote").innerHTML = S.projControls.size && S.ran
      ? `<span class="field"><select id="mapMode" aria-label="Map shows"><option value="base">Baseline</option><option value="proj" ${S.mapMode === "proj" ? "selected" : ""}>With ${[...S.projControls].sort().join(", ")}</option></select></span>`
      : `Starts ${at(0)}`;
    const mm = $("#mapMode"); if (mm) mm.onchange = () => { S.mapMode = mm.value; renderAttack(); };
    if (!animating) drawZones(S.ran ? finalStage(mapResult()) : emptyStage());
    renderAttackResult(S.ran && !animating ? mapResult() : null);
  }
  function emptyStage() { return { zones: new Set(), paths: new Set(), locked: new Set(), exposed: new Set(), entry: null, entryLine: false }; }
  function finalStage(r) {
    return { zones: new Set(r.zones), paths: new Set(r.hops), locked: new Set(Object.keys(r.hit)), exposed: new Set(r.exposed), entry: scn().entry, entryLine: true };
  }
  function entryTarget(s, pos) {
    if (s.mode === "exfil") { const p = pos[s.targets[0]]; return [p.x + 6, p.y + p.h / 2]; }
    const z = ZPOS[s.entry];
    if (s.entry === "Z_user") return [z.x + 100, z.y];
    if (s.entry === "Z_corp") return [z.x, z.y + 30];
    if (s.entry === "Z_cloud") return [z.x, z.y + 40];
    if (s.entry === "Z_saas") return [z.x + 100, z.y];
    return [z.x + 40, z.y + z.h];
  }
  function entryPath(s, pos) {
    const [tx, ty] = entryTarget(s, pos);
    const sx = ATT.x, sy = ATT.y + 26;
    let cx = (sx + tx) / 2, cy = Math.min(sy, ty) - 40;
    if (s.entry === "Z_ot") { cx = 560; cy = 640; }
    if (s.entry === "Z_saas") { cx = 270; cy = 330; }
    if (s.entry === "Z_user") { cx = sx; cy = sy + 40; }
    if (s.mode === "exfil") { cx = 270; cy = 190; }
    return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
  }
  function drawZones(st) {
    const ctr = mapControls();
    const pos = chipLayout(ctr);
    const s = scn();
    const showVault = ctr.has("C5");
    let h = `<defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94A3B8"/></marker>
      <marker id="arrowRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#EF4444"/></marker>
      <marker id="arrowInk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#0F172A"/></marker>
    </defs>`;
    const stdOnprem = M.jewels.filter((j) => (j.zone === "Z_corp" || j.zone === "Z_ot") && (ctr.has("C3") ? false : j.backup === "standard")).length;
    for (const [zid, z] of Object.entries(ZPOS)) {
      if (zid === "Z_vault" && !showVault) continue;
      const reached = st.zones.has(zid);
      const sub = zid === "Z_backup" ? (ctr.has("C3") ? "Isolated · off the domain" : `Standard copies of ${plural(stdOnprem, "system")}`) : z.sub;
      h += `<g class="zone ${reached ? "reached" : ""} ${st.entry === zid ? "entry" : ""} ${zid === "Z_vault" ? "vault" : ""}" data-zone="${zid}">
        <rect class="zbox" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="16"/>
        <text class="zname" x="${z.x + 16}" y="${z.y + 25}">${esc(ZN[zid])}</text>
        <text class="zsub" x="${z.x + 16}" y="${z.y + 41}">${esc(sub)}</text>`;
      if (zid === "Z_user") h += `<g transform="translate(${z.x + 70},${z.y + 56})" stroke="${reached ? "#EF4444" : "#475569"}" fill="none" stroke-width="2"><rect x="8" y="0" width="44" height="30" rx="3"/><path d="M0 38h60"/></g><text class="zsub" x="${z.x + 100}" y="${z.y + 112}" text-anchor="middle">Finance laptop</text>`;
      if (zid === "Z_backup") h += `<g transform="translate(${z.x + 18},${z.y + 56})" stroke="${reached ? "#EF4444" : "#475569"}" fill="none" stroke-width="2"><ellipse cx="18" cy="6" rx="16" ry="6"/><path d="M2 6v26c0 3.3 7 6 16 6s16-2.7 16-6V6M2 19c0 3.3 7 6 16 6s16-2.7 16-6"/></g><text class="zsub" x="${z.x + 64}" y="${z.y + 80}">${reached ? "Backups deleted" : "Backup console"}</text>`;
      h += `</g>`;
    }
    // paths
    for (const p of M.paths) {
      const g = PGEOM[p.id]; if (!g) continue;
      const cut = ctr.has(p.cut_by), used = st.paths.has(p.id);
      const mx = (g.a[0] + g.b[0]) / 2, my = (g.a[1] + g.b[1]) / 2;
      h += `<line class="zpath ${used ? "used" : ""} ${cut ? "cut" : ""}" x1="${g.a[0]}" y1="${g.a[1]}" x2="${g.b[0]}" y2="${g.b[1]}"/>`;
      const tip = `${p.id}: ${p.how}. ${cut ? "Cut by " : "Cut by "}${p.cut_by} ${CT[p.cut_by].name}${cut ? " (on)" : ""}.`;
      h += `<g class="pbadge ${used ? "used" : ""} ${cut ? "cut" : ""}" data-tip="${esc(tip)}" tabindex="0" data-path="${p.id}"><circle cx="${mx}" cy="${my}" r="14"/>${cut ? `<path class="shield" transform="translate(${mx - 7},${my - 8}) scale(.6)" d="M12 2l9 4v6c0 5.5-3.8 9.7-9 11-5.2-1.3-9-5.5-9-11V6z"/>` : `<text x="${mx}" y="${my + 4}" text-anchor="middle">${p.id}</text>`}</g>`;
    }
    // chips
    for (const [id, p] of Object.entries(pos)) {
      const j = J[id], locked = st.locked.has(id), exp = st.exposed.has(id);
      const nm = j.name.length * 7.9 > p.w - 52 ? SHORT[id] : j.name;
      h += `<g class="jchip ${locked ? "locked" : ""} ${exp ? "exposed" : ""} ${j.kind === "enabler" ? "enabler" : ""} ${!j.listed && !(id === "CJ09" && ctr.has("C5")) ? "unlisted" : ""}" data-chip="${id}" tabindex="0" role="button" aria-label="${esc(j.name)}">
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="9"/>
        <circle class="expdot" cx="${p.x + 12}" cy="${p.y + p.h / 2}" r="4.5"/>
        <text x="${p.x + 22}" y="${p.y + 22}">${esc(nm)}</text>
        <g class="lockg" transform="translate(${p.x + p.w - 24},${p.y + 9})" stroke="#B91C1C" fill="none" stroke-width="2.4" stroke-linecap="round"><rect x="1" y="7" width="14" height="9" rx="2"/><path d="M4 7V5a4 4 0 0 1 8 0v2"/></g>
      </g>`;
    }
    // attacker + entry
    h += `<path class="entryline ${st.entryLine ? "on" : ""}" d="${entryPath(s, pos)}"/>`;
    h += `<g class="attacker"><circle class="a" cx="${ATT.x}" cy="${ATT.y}" r="24"/><g transform="translate(${ATT.x - 11},${ATT.y - 12})" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="8" r="5"/><path d="M2 23c1-5 5-8 9-8s8 3 9 8"/></g>
      <text x="${ATT.x + 34}" y="${ATT.y - 2}">${s.mode === "exfil" ? "Contractor account" : "Attacker"}</text>
      <text x="${ATT.x + 34}" y="${ATT.y + 15}" class="zsub" style="font:500 11.5px var(--mono);fill:#94A3B8">${s.mode === "exfil" ? "steals, no encryption" : "way in: " + esc(ZN[s.entry] || "")}</text></g>`;
    h += `<g id="particles"></g>`;
    $("#zoneSvg").innerHTML = h;
  }
  let animating = false;
  function runAttack() {
    const token = ++animToken;
    S.ran = true; S.mapMode = "base"; S.clock = 0;
    const r = base(), s = scn();
    log(`ran ${s.id} ${s.name} (start ${at(0)})`);
    animating = true;
    renderHero();
    renderAttack();
    renderAttackResult(null, true);
    const st = emptyStage();
    st.entry = s.entry; st.entryLine = true;
    if (s.entry) st.zones.add(s.entry);
    drawZones(st);
    const steps = [];
    const pathById = {}; M.paths.forEach((p) => (pathById[p.id] = p));
    r.hops.forEach((pid) => steps.push(() => { st.paths.add(pid); st.zones.add(pathById[pid].target); }));
    const order = Object.keys(r.hit);
    order.forEach((id) => steps.push(() => st.locked.add(id)));
    const step = (i) => {
      if (token !== animToken) return;
      if (i >= steps.length) return particles(r, st, token);
      const f = steps[i]; f(); drawZones(st);
      setTimeout(() => step(i + 1), i < r.hops.length ? 650 : 140);
    };
    setTimeout(() => step(0), 650);
  }
  function particles(r, st, token) {
    const pos = chipLayout(new Set());
    r.exposed.forEach((id) => st.exposed.add(id));
    drawZones(st);
    const g = $("#particles"); if (!g) return finish();
    const list = [];
    r.exposed.forEach((id, k) => {
      const p = pos[id]; if (!p) return;
      for (let i = 0; i < 3; i++) list.push({ x0: p.x + 12, y0: p.y + p.h / 2, delay: k * 90 + i * 220 });
    });
    if (!list.length) return finish();
    const els = list.map(() => { const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("r", 4); c.setAttribute("class", "particle"); g.appendChild(c); return c; });
    const t0 = performance.now(), dur = 900;
    function frame(t) {
      if (token !== animToken) return;
      let done = true;
      list.forEach((q, i) => {
        const u = Math.max(0, Math.min(1, (t - t0 - q.delay) / dur));
        if (u < 1) done = false;
        const e = u * u * (3 - 2 * u);
        const x = q.x0 + (ATT.x - q.x0) * e, y = q.y0 + (ATT.y - q.y0) * e - Math.sin(e * Math.PI) * 60;
        els[i].setAttribute("cx", x); els[i].setAttribute("cy", y); els[i].setAttribute("opacity", u === 0 || u === 1 ? 0 : 1);
      });
      if (!done) requestAnimationFrame(frame); else finish();
    }
    requestAnimationFrame(frame);
    function finish() {
      if (token !== animToken) return;
      animating = false;
      render();
    }
  }
  function zoneChain(r, targetZone) {
    const par = {}; M.paths.forEach((p) => { if (r.hops.includes(p.id) && !par[p.target]) par[p.target] = p; });
    const chain = [targetZone]; let z = targetZone, guard = 0;
    while (par[z] && guard++ < 10) { z = par[z].source; chain.unshift(z); }
    return chain;
  }
  function renderAttackResult(r, running) {
    const el = $("#attackResult");
    if (running) { el.innerHTML = `<div class="empty">Tracing the break-in…</div>`; return; }
    if (!r) { el.innerHTML = `<div class="empty">Results appear here after a run.</div>`; return; }
    const s = scn(), beyond = r.zones.filter((z) => z !== s.entry).length;
    let p;
    if (s.mode === "exfil") p = `Nothing encrypted. The account copied the formula library: ${plural(r.exposure.ip ? r.exposure.ip.formulas : 0, "formula")} presumed stolen. Expect an extortion demand.`;
    else if (s.mode === "vendor") p = `The payroll provider is down for ${plural(s.vendor_outage_h, "hour")}. Our network wasn't reached, but employee data held by the vendor is presumed exposed.`;
    else if (!r.jewels_down) p = `Contained at the entry point. Every path out of ${ZN[s.entry].toLowerCase()} is cut, so no crown jewel was reached.`;
    else p = `Reached ${plural(beyond, "zone")} beyond the entry and ${r.jewels_down} of 12 crown jewels through ${plural(r.hops.length, "path")} (${r.hops.join(", ")}).`;
    const ip = r.exposure.ip || {};
    el.innerHTML = `<p>${p}</p>
      <div class="counter-grid">
        <div class="cnt"><div class="v">${r.jewels_down}</div><div class="l">${isWord(r.jewels_down, "crown jewel", "crown jewels")} down</div></div>
        <div class="cnt"><div class="v">${compact(r.customers_exposed)}</div><div class="l">${isWord(r.customers_exposed, "customer", "customers")} exposed</div></div>
        <div class="cnt"><div class="v">${fmtInt(ip.formulas || 0)}</div><div class="l">${isWord(ip.formulas || 0, "formula", "formulas")} stolen</div></div>
        <div class="cnt"><div class="v">${fmtInt(ip.design_files || 0)}</div><div class="l">${isWord(ip.design_files || 0, "design file", "design files")}</div></div>
      </div>
      ${r.jewels_down || s.mode !== "encrypt" ? `<p class="see" style="margin-top:12px"><button class="btn sm primary" data-goto="impact">See the impact →</button></p>` : ""}`;
  }

  // ------------------------------------------------------------------ IMPACT
  let playing = null;
  function renderImpact() {
    const sel = $("#startSel");
    const opts = STARTS.slice();
    if (!opts.find((o) => o.v === scn().start)) opts.unshift({ v: scn().start, l: wall(E.parseTime(scn().start), true) });
    sel.innerHTML = opts.map((o) => `<option value="${o.v}" ${o.v === startOf() ? "selected" : ""}>${o.l}</option>`).join("");
    const wks = [SV.S2.workaround, SV.S4.workaround];
    $("#wkSwitches").innerHTML = wks.map((w) => `<button class="switch" data-wk="${w.id}" aria-pressed="${S.workarounds.has(w.id)}" data-tip="${esc(w.name)}: ${Math.round(w.capacity * 100)}% of ${w.id === "WK1" ? "retail orders" : "production"} after hour ${w.after_h}."><span class="knob"></span>${esc(w.name)}</button>`).join("");
    if (!S.ran) {
      $("#impactSub").textContent = "Run a scenario first.";
      $("#tlHost").innerHTML = `<div class="empty" style="padding:30px">No run yet. <button class="btn sm primary" data-goto="attack">Go to Attack</button></div>`;
      $("#peopleList").innerHTML = ""; $("#wfHost").innerHTML = ""; $("#oblList").innerHTML = ""; $("#clockRead").textContent = ""; $("#totalSub").textContent = ""; $("#tlSub").textContent = "";
      return;
    }
    const r = base(), s = scn();
    $("#impactSub").textContent = `${s.id} · ${s.name} · starts ${at(0)}`;
    $("#tlSub").textContent = r.jobs.length ? `${plural(r.teams, "recovery team")} · ${CONTAIN} h containment first` : "";
    renderTimeline(r);
    renderPeople(r);
    renderWaterfall(r);
    renderObligations(r);
  }
  function tlDomain(r) {
    const end = Math.max(r.hours_down, ...r.jobs.map((j) => j.end));
    return Math.max(120, Math.ceil((end + 14) / 24) * 24);
  }
  function renderTimeline(r) {
    const host = $("#tlHost");
    const W = Math.max(400, host.clientWidth - 24), H = Math.max(160, host.clientHeight);
    const X = tlDomain(r);
    const clock = $("#clock"); clock.max = X; if (S.clock > X) S.clock = X; clock.value = S.clock;
    const L = 158, R = 46, top = 34;
    const lanes = r.mode === "vendor" ? 1 : (r.jobs.length ? r.teams : 0);
    const svcIds = ["S1", "S2", "S3", "S4", "S5"];
    const rows = (lanes ? lanes + 1 : 0) + 1 + svcIds.length;
    const rh = Math.max(16, Math.min(34, (H - top - 8) / rows));
    const x = (h) => L + (W - L - R) * (h / X);
    const t0 = E.parseTime(startOf());
    let g = "";
    // day bands and ticks
    for (let h = 0; h <= X; h += 12) {
      g += `<g class="tl-axis"><line x1="${x(h)}" y1="${top - 6}" x2="${x(h)}" y2="${H - 4}"/>${h % 24 === 0 ? `<text x="${x(h) + 3}" y="${top - 9}">h${h}</text>` : ""}</g>`;
    }
    for (let h = 0; h < X; h += 24) {
      const lab = wall(t0 + h * E.HOUR, false);
      g += `<text class="tl-day" x="${x(h) + 3}" y="12">${lab}</text>`;
    }
    let y = top;
    if (lanes) {
      if (r.mode !== "vendor" && r.jobs.length) {
        g += `<rect class="tl-contain" x="${x(0)}" y="${y}" width="${x(CONTAIN) - x(0)}" height="${(lanes + 1) * rh}"/><text class="tl-contain-label" x="${x(CONTAIN / 2)}" y="${y + 11}" text-anchor="middle">containment</text>`;
      }
      g += `<text class="tl-sec" x="0" y="${y + 11}">${r.mode === "vendor" ? "VENDOR" : "RECOVERY TEAMS"}</text>`;
      y += rh;
      if (r.mode === "vendor") {
        const [id, v] = Object.entries(r.hit)[0];
        g += `<text class="tl-row-label" x="0" y="${y + rh / 2 + 4}">${esc(J[id].name)}</text>`;
        g += `<rect class="tl-job vendor" x="${x(0)}" y="${y + 3}" width="${x(v.up) - x(0)}" height="${rh - 6}" data-tip="${esc(J[id].name)}: vendor recovery, back at hour ${v.up}."/>`;
        g += `<text class="tl-job-label" x="${x(0) + 8}" y="${y + rh / 2 + 4}">Vendor restoring · back h${v.up}</text>`;
        y += rh;
      } else {
        for (let i = 0; i < lanes; i++) {
          g += `<text class="tl-row-label" x="0" y="${y + rh / 2 + 4}">Team ${i + 1}</text>`;
          r.jobs.filter((j) => j.lane === i).forEach((j) => {
            const cls = j.how === "offline copy" ? "offline" : j.how;
            if (j.free != null && j.gate > j.free && j.start === j.gate) g += `<line class="tl-wait" x1="${x(j.free)}" y1="${y + rh / 2}" x2="${x(j.start)}" y2="${y + rh / 2}" data-tip="Team waits for Active Directory."/>`;
            const w = x(j.end) - x(j.start);
            const tip = `${J[j.id].name}: ${j.how} from hour ${j.start} to ${j.end}${j.id === "AD" ? ". Every on-premises restore waits for it." : ""}`;
            g += `<rect class="tl-job ${cls}" x="${x(j.start) + 1}" y="${y + 3}" width="${Math.max(2, w - 2)}" height="${rh - 6}" data-tip="${esc(tip)}"/>`;
            const lab = J[j.id].name.length * 6.8 < w - 12 ? J[j.id].name : (SHORT[j.id].length * 6.8 < w - 12 ? SHORT[j.id] : "");
            if (lab) g += `<text class="tl-job-label" x="${x(j.start) + 7}" y="${y + rh / 2 + 4}">${esc(lab)}</text>`;
          });
          y += rh;
        }
      }
    }
    const secY = y;
    g += `<text class="tl-sec" x="0" y="${y + 11}">BUSINESS SERVICES</text>`;
    y += rh;
    for (const sid of svcIds) {
      const sv = SV[sid], d = r.services[sid].down_h;
      const rto = Math.max(...sv.deps.map((id) => J[id].rto_h || 0));
      g += `<text class="tl-row-label" x="0" y="${y + rh / 2 + 4}">${esc(sv.name)}</text>`;
      if (d > 0) {
        const cause = J[r.services[sid].cause];
        g += `<rect class="tl-svc" x="${x(0)}" y="${y + 4}" width="${x(d) - x(0)}" height="${rh - 8}" data-tip="${esc(sv.name)} is down ${plural(d, "hour")} (worst crown-jewel RTO ${hrs(rto)}). Last back: ${esc(cause.name)}."/>`;
        g += `<line class="tl-rto" x1="${x(rto)}" y1="${y + 2}" x2="${x(rto)}" y2="${y + rh - 2}" data-tip="RTO ${hrs(rto)}"/>`;
        g += `<text class="tl-svc-val" x="${x(d) + 5}" y="${y + rh / 2 + 4}">${hrs(d)}</text>`;
      } else {
        g += `<text class="tl-svc-val" x="${x(0) + 4}" y="${y + rh / 2 + 4}" style="fill:#16A34A">running</text>`;
      }
      y += rh;
    }
    // obligation flags
    r.obligations.forEach((o) => {
      if (o.due_h <= 0 || o.due_h > X || o.id === "O3") return;
      const ob = OB[o.id], c = o.missed ? "miss" : "ok";
      g += `<line class="tl-flag ${c}" x1="${x(o.due_h)}" y1="${top}" x2="${x(o.due_h)}" y2="${y}"/>`;
      g += `<text class="tl-flag-label ${c}" x="${x(o.due_h) + 4}" y="${secY + 11}" data-tip="${esc(ob.name)} due ${at(o.due_h)} (hour ${o.due_h}). ${o.missed ? "Missed: back at hour " + o.back_h : "On time"}.">${o.id === "O1" ? "Payroll" : "Suppliers"} ${o.missed ? "✕" : "✓"}</text>`;
    });
    const ck = E.clocks(startOf(), S.materiality);
    const due8k = (E.parseTime(ck.sec_8k_due + "T23:59") - t0) / E.HOUR;
    if (due8k > 0 && due8k <= X) {
      g += `<line class="tl-flag ref" x1="${x(due8k)}" y1="${top}" x2="${x(due8k)}" y2="${y}"/><text class="tl-flag-label ref" x="${x(due8k) - 4}" y="${secY + 11}" text-anchor="end">8-K due</text>`;
    }
    // clock
    g += `<line class="tl-clock" x1="${x(S.clock)}" y1="${top - 6}" x2="${x(S.clock)}" y2="${y}"/><circle class="tl-clock-dot" cx="${x(S.clock)}" cy="${top - 6}" r="4"/>`;
    host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Recovery timeline">${g}</svg>`;
    updateClockRead(r);
  }
  function updateClockRead(r) {
    const h = S.clock;
    const down = Object.values(r.services).filter((v) => v.down_h > h).length;
    $("#clockRead").textContent = `Hour ${h} · ${at(h)} · ${plural(down, "service")} down · ${money(r._revenueTo(h))} at risk so far`;
  }
  function renderPeople(r) {
    const o1 = r.obligations.find((o) => o.id === "O1");
    const emp = o1.missed ? OB.O1.people : r.employees_exposed;
    const empLabel = o1.missed && r.employees_exposed ? "employees affected" : o1.missed ? isWord(emp, "employee paid late", "employees paid late") : isWord(emp, "employee exposed", "employees exposed");
    const ca = customersAffected(r);
    const cells = [
      [r.customers_exposed, isWord(r.customers_exposed, "customer exposed", "customers exposed"), ca.label === "presumed exposed"],
      [r.shoppers_turned_away, isWord(r.shoppers_turned_away, "shopper turned away", "shoppers turned away"), ca.label === "shoppers turned away"],
      [r.partners_affected, isWord(r.partners_affected, "retail partner stalled", "retail partners stalled"), false],
      [r.orders_delayed, isWord(r.orders_delayed, "order late", "orders late"), false],
      [r.plant_workers_idle, isWord(r.plant_workers_idle, "plant worker idle", "plant workers idle"), false],
      [emp, empLabel, false],
    ];
    $("#peopleList").innerHTML = cells.map(([n, l, big]) => `<div class="prow ${big && n ? "big" : ""}"><div class="v">${compact(n)}</div><div class="l">${l}</div></div>`).join("");
  }
  function renderWaterfall(r) {
    const host = $("#wfHost");
    const W = Math.max(200, host.clientWidth - 24), H = Math.max(90, host.clientHeight - 6);
    const items = [["Revenue lost", r.revenue_lost, "var(--accent)"], ["Plants idle", r.plant_cost, "var(--amber)"], ["Notification", r.notification_cost, "var(--violet)"], ["Recovery", r.recovery_cost, "var(--teal)"]];
    const tot = r.total_impact || 1;
    const L = 92, Rr = 64, rh = H / 5;
    const x = (v) => L + (W - L - Rr) * (v / tot);
    let g = "", acc = 0;
    items.forEach(([l, v, c], i) => {
      const y = i * rh;
      g += `<text class="wf-label" x="0" y="${y + rh / 2 + 4}">${l}</text>`;
      g += `<rect class="wf-bar" x="${x(acc)}" y="${y + 4}" width="${Math.max(v ? 2 : 0, x(acc + v) - x(acc))}" height="${rh - 8}" rx="4" fill="${c}"/>`;
      g += `<text class="wf-val" x="${Math.min(x(acc + v) + 5, W - Rr + 4)}" y="${y + rh / 2 + 4}">${money(v)}</text>`;
      acc += v;
    });
    const y = 4 * rh;
    g += `<text class="wf-label" x="0" y="${y + rh / 2 + 4}" style="font-weight:800;fill:#0F172A">Total</text><rect x="${x(0)}" y="${y + 4}" width="${x(r.total_impact) - x(0)}" height="${rh - 8}" rx="4" fill="#0F172A"/><text class="wf-val" x="${Math.min(x(r.total_impact) + 5, W - Rr + 4)}" y="${y + rh / 2 + 4}">${money(r.total_impact)}</text>`;
    host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Total impact waterfall">${g}</svg>`;
    $("#totalSub").textContent = `${money(r.revenue_at_risk)} at risk`;
  }
  function renderObligations(r) {
    const rows = r.obligations.map((o) => {
      const ob = OB[o.id];
      let chip;
      if (o.due_h <= 0) chip = `<span class="chip">Before the attack</span>`;
      else if (o.missed) chip = `<span class="chip bad" data-tip="${esc(J[o.blocker].name)} is back at hour ${o.back_h}.">Missed by ${plural(Math.round(o.back_h - o.due_h), "hour")}</span>`;
      else chip = `<span class="chip ok">On time</span>`;
      return `<div class="orow"><div style="min-width:0"><div class="t">${esc(ob.name)}</div><div class="d">${o.due_h > 0 ? `${at(o.due_h)} · hour ${o.due_h}` : wall(E.parseTime(ob.due), true)}</div></div>${chip}</div>`;
    });
    const ck = E.clocks(startOf(), S.materiality);
    rows.push(`<div class="orow"><div style="min-width:0"><div class="t">8-K, 4 business days</div><div class="d">after materiality, hour ${S.materiality}</div></div>
      <div style="display:flex;gap:6px;align-items:center"><span class="stepper"><button data-mat="-12" aria-label="Earlier materiality">−</button><span>h${S.materiality}</span><button data-mat="12" aria-label="Later materiality">+</button></span><span class="chip vio">${dateLabel(ck.sec_8k_due)}</span></div></div>`);
    rows.push(`<div class="orow"><div style="min-width:0"><div class="t">State notice, 30 days</div><div class="d">shortest common deadline</div></div><span class="chip vio">${dateLabel(ck.state_notice_due)}</span></div>`);
    $("#oblList").innerHTML = rows.join("");
  }

  // ------------------------------------------------------------------ DATA
  function renderData() {
    const r = S.ran ? base() : null;
    const ex = r ? r.exposure : {};
    const tiles = [
      { c: "customer", v: r ? r.customers_exposed : 2400000, u: "customers", s: r ? sysList(ex.customer) : "held in 3 systems" },
      { c: "payment", v: r ? (ex.payment ? ex.payment.records : 0) : 900000, u: "stored cards (tokens)", s: "no full card numbers" },
      { c: "financial", v: r ? finCount(ex.financial) : 4200, u: "supplier bank details", s: r && !ex.financial ? "not reached" : "38 bank accounts · Q3 results" },
      { c: "ip", v: r ? (ex.ip ? ex.ip.formulas : 0) : 2300, u: "formulas", s: `${fmtInt(r ? (ex.ip ? ex.ip.design_files : 0) : 14000)} design files` },
      { c: "employee", v: r ? r.employees_exposed : 6400, u: "employees", s: r && !r.employees_exposed ? "held by the payroll provider" : "SSNs, bank details" },
    ];
    $("#dataTiles").innerHTML = tiles.map((t) => `<button class="card dtile ${t.v ? "" : "zero"} ${S.dataClass === t.c ? "on" : ""}" data-dc="${t.c}" data-tip="${r ? "Presumed exposed in " + scn().id + "." : "Held across the crown jewels. Run a scenario to see what's exposed."} Click to highlight where it sits.">
        <span class="bar" style="background:${CLS[t.c].color}"></span>
        <span class="lab">${CLS[t.c].label} <span class="chip ${r && t.v ? "bad" : ""}" style="font-size:11px">${r ? (t.v ? "exposed" : "safe") : "held"}</span></span>
        <span class="v">${compact(t.v)}</span><span class="u">${t.u}</span><span class="s">${esc(t.s)}</span></button>`).join("");
    $("#matrixSub").textContent = r ? "○ held · ● presumed exposed" : "○ held · run a scenario to see exposure";
    const rowsIds = WALL.map(([id]) => id).filter((id) => J[id].data.length);
    $("#matrix").innerHTML = `<table class="matrix"><thead><tr><th>Crown jewel</th>${CLASSES.map((c) => `<th>${c.label}</th>`).join("")}<th>Status</th></tr></thead><tbody>` +
      rowsIds.map((id) => {
        const j = J[id], expo = r && r.exposed.includes(id), hit = r && r.hit[id];
        const lit = S.dataClass && j.data.some((d) => d.class === S.dataClass);
        return `<tr class="${lit ? "lit" : ""}"><td>${esc(j.name)}${!j.listed ? ' <span class="chip accent" style="font-size:10.5px">not listed</span>' : ""}</td>` +
          CLASSES.map((c) => {
            const d = j.data.find((x) => x.class === c.id);
            if (!d) return "<td></td>";
            return `<td><span class="mdot ${expo ? "exp" : ""}" style="border-color:${c.color};background:${expo ? c.color : "transparent"}" data-tip="${esc(j.name)}: ${recLabel(d)}${expo ? ", presumed exposed" : ""}."></span></td>`;
          }).join("") +
          `<td>${!r ? "" : hit ? `<span class="chip bad">${hit.path === "vendor" ? "vendor down" : "encrypted"}</span>` : expo ? `<span class="chip bad">stolen</span>` : `<span class="chip ok">safe</span>`}</td></tr>`;
      }).join("") + `</tbody></table>`;
    // lost
    if (!r) {
      $("#lostBars").innerHTML = `<div class="empty">Run a scenario to see which data can't be restored.</div>`;
      $("#notifyLine").innerHTML = "";
      return;
    }
    const lost = Object.entries(r.data_lost_h).filter(([id, h]) => h > 0 && id !== "AD").sort((a, b) => b[1] - a[1]);
    const max = lost.length ? lost[0][1] : 1;
    $("#lostBars").innerHTML = lost.length ? lost.map(([id, h], i) => `<div class="lrow ${i === 0 && h >= 168 ? "worst" : ""}" data-tip="${esc(J[id].name)}: restored ${r.hit[id].path === "restore" ? "from the newest copy" : r.hit[id].path === "vendor" ? "by the vendor" : "from the offline copy"}; ${lossText(h)} of changes are gone.">
        <span class="n">${esc(J[id].name)}</span><span class="track"><span class="fill" style="width:${Math.max(1, (h / max) * 100)}%"></span></span><span class="v">${h >= 168 ? lossText(h) : hrs(h)}</span></div>`).join("")
      : `<div class="empty">No data lost: nothing had to be restored.</div>`;
    const np = M.meta.notify_per_person;
    $("#notifyLine").innerHTML = `<span data-tip="Fictional rates: $${np.customer} per customer (letter and call center), $${np.employee} per employee (adds credit monitoring).">Notification estimate:</span> <b>${fmtInt(r.customers_exposed)}</b> ${isWord(r.customers_exposed, "customer", "customers")} × $${np.customer} + <b>${fmtInt(r.employees_exposed)}</b> ${isWord(r.employees_exposed, "employee", "employees")} × $${np.employee} = <b>${money(r.notification_cost)}</b>`;
  }
  const sysList = (c) => (c ? `in ${plural(c.systems.length, "system")}` : "not reached");
  const finCount = (c) => (c ? (c.items.find((i) => i.unit === "suppliers") || { records: 0 }).records : 0);

  // ------------------------------------------------------------------ DECIDE
  function hitOrder(pri, r) {
    const ids = Object.keys(r.hit).filter((id) => id !== "AD" && r.hit[id].path !== "vendor");
    return pri.filter((id) => ids.includes(id));
  }
  function renderDecide() {
    const body = $("#view-decide .decide-body");
    if (!S.ran) {
      $("#ctrlGrid").innerHTML = `<div class="empty" style="grid-column:1/-1">Run a scenario first. <button class="btn sm primary" data-goto="attack">Go to Attack</button></div>`;
      $("#orderList").innerHTML = ""; $("#compare").innerHTML = `<div class="empty">Nothing to compare yet.</div>`; $("#teamsNote").textContent = "";
      renderBriefSteps(); body.classList.add("noscn"); return;
    }
    body.classList.remove("noscn");
    const b = base(), s = scn();
    $("#ctrlSub").textContent = `effect of each alone on ${s.id}`;
    $("#ctrlGrid").innerHTML = M.controls.map((c) => {
      const a = runCached(s, { controls: [c.id], priority: S.basePriority, workarounds: wkList(), start: startOf() });
      const on = S.projControls.has(c.id);
      const pay = (x) => (x.obligations[0].missed ? "missed" : "on time");
      const line = (label, from, to, f) => `<span>${label} <b class="${to < from ? "good" : ""}">${f(from)} → ${f(to)}</b></span>`;
      const helps = SCN.filter((q) => runCached(q, { controls: [c.id] }).total_impact < runCached(q, {}).total_impact).length;
      return `<button class="ctrl ${on ? "on" : ""}" data-ctrl="${c.id}" aria-pressed="${on}" data-tip="${esc(c.detail)}">
        <div class="row1"><span class="nm">${c.id} · ${esc(c.name)}</span><span class="knob"></span></div>
        <div class="eff">
          ${line("Hours down", b.hours_down, a.hours_down, hrs)}
          ${line("Total", b.total_impact, a.total_impact, money)}
          <span>Payroll <b class="${pay(a) === "on time" && pay(b) === "missed" ? "good" : ""}">${pay(a)}</b> · helps ${helps} of 6</span>
        </div>
        ${s.suggested.includes(c.id) ? `<span class="chip accent sugg">Suggested for ${s.id}</span>` : ""}
      </button>`;
    }).join("");
    // order
    const pri = S.projPriority || S.basePriority;
    const p = proj();
    const items = hitOrder(pri, b);
    const baseIdx = hitOrder(S.basePriority, b);
    $("#orderList").innerHTML = items.length ? items.map((id, i) => `<li class="oitem ${baseIdx[i] !== id ? "moved" : ""}" draggable="true" data-o="${id}">
        <span class="k">${i + 1}</span><span class="n">${esc(J[id].name)}</span>
        <span class="h" data-tip="Projected: back at hour ${p.hit[id] ? p.hit[id].up : 0}.">${p.hit[id] ? "h" + p.hit[id].up : "safe"}</span>
        <span class="mv"><button data-mv="-1" data-id="${id}" aria-label="Move ${esc(J[id].name)} up">▲</button><button data-mv="1" data-id="${id}" aria-label="Move ${esc(J[id].name)} down">▼</button></span></li>`).join("")
      : `<li class="empty">No restores in this scenario.</li>`;
    $("#teamsNote").textContent = b.jobs.length ? `${plural(p.teams, "recovery team")}${p.teams !== b.teams ? " (projected)" : ""}` : "";
    $("#btnAdopt").disabled = !(S.projPriority && S.projPriority.join() !== S.basePriority.join());
    bindDrag();
    // compare
    const cb = customersAffected(b).n, cp = customersAffected(p).n;
    const metrics = [
      ["Hours down", b.hours_down, p.hours_down, hrs],
      ["Customers affected", cb, cp, compact],
      ["Revenue at risk", b.revenue_at_risk, p.revenue_at_risk, money],
      ["Total impact", b.total_impact, p.total_impact, money],
    ];
    const differs = projDiffers();
    $("#compare").innerHTML = metrics.map(([l, x, y, f]) => {
      const mx = Math.max(x, y) || 1;
      return `<div class="cmp"><div class="l"><span>${l}</span><b class="${y < x ? "good" : ""}">${differs ? `${f(x)} → ${f(y)}` : f(x)}</b></div>
        <div class="track"><span class="ghost" style="width:${(x / mx) * 100}%"></span><span class="solid" style="width:${(y / mx) * 100}%"></span></div></div>`;
    }).join("") + (() => {
      const pb = b.obligations[0], pp = p.obligations[0];
      const chip = (o) => (o.due_h <= 0 ? `<span class="chip">n/a</span>` : o.missed ? `<span class="chip bad">missed</span>` : `<span class="chip ok">on time</span>`);
      return `<div class="cmp-pay">Payroll ${chip(pb)}${differs ? ` → ${chip(pp)}` : ""}<span class="spacer"></span><span class="muted small">${differs ? "striped: baseline" : "toggle a control or reorder"}</span></div>`;
    })();
    renderBriefSteps();
  }
  function bindDrag() {
    let dragId = null;
    $$("#orderList .oitem").forEach((li) => {
      li.addEventListener("dragstart", (e) => { dragId = li.dataset.o; li.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; });
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
      li.addEventListener("dragover", (e) => { e.preventDefault(); li.classList.add("over"); });
      li.addEventListener("dragleave", () => li.classList.remove("over"));
      li.addEventListener("drop", (e) => { e.preventDefault(); li.classList.remove("over"); if (dragId && dragId !== li.dataset.o) moveTo(dragId, li.dataset.o); });
    });
  }
  function currentFullOrder() { return (S.projPriority || S.basePriority).slice(); }
  function moveTo(id, beforeId) {
    const o = currentFullOrder().filter((x) => x !== id);
    o.splice(o.indexOf(beforeId), 0, id);
    setProjOrder(o, `moved ${J[id].name} above ${J[beforeId].name} (projection)`);
  }
  function moveBy(id, d) {
    const b = base(); const vis = hitOrder(currentFullOrder(), b);
    const i = vis.indexOf(id), k = i + d;
    if (k < 0 || k >= vis.length) return;
    const o = currentFullOrder(), a = o.indexOf(vis[i]), c = o.indexOf(vis[k]);
    [o[a], o[c]] = [o[c], o[a]];
    setProjOrder(o, `moved ${J[id].name} ${d < 0 ? "up" : "down"} (projection)`);
  }
  function setProjOrder(o, msg) {
    S.projPriority = o.join() === S.basePriority.join() ? null : o;
    log(msg); renderDecide(); renderHero();
  }

  // ------------------------------------------------------------------ brief and approvals
  /** Approval rules, pure so the checks can test them. */
  function approvalCheck(b, action, pid) {
    const P = PERSONAS.find((x) => x.id === pid);
    if (action === "draft") return { ok: true };
    if (b.status === "none") return { ok: false, reason: "Draft the brief first." };
    if (action === "edit") return b.status === "sent" ? { ok: false, reason: "Already sent. Draft a new brief to change it." } : { ok: true };
    if (action === "legal") {
      if (pid !== "gc") return { ok: false, reason: "Only General Counsel can sign off the regulatory lines." };
      if (b.status === "sent") return { ok: false, reason: "Already sent." };
      if (b.legalBy) return { ok: false, reason: "Legal has already signed off." };
      return { ok: true };
    }
    if (action === "approve") {
      if (pid !== "ciso") return { ok: false, reason: `Only the CISO can approve. You're viewing as ${P.role}.` };
      if (b.status === "approved" || b.status === "sent") return { ok: false, reason: "Already approved." };
      if (b.lastEditor === pid) return { ok: false, reason: "The last editor can't approve their own changes." };
      if (!b.legalBy) return { ok: false, reason: "General Counsel must sign off the regulatory lines first." };
      return { ok: true };
    }
    if (action === "send") {
      if (b.status === "sent") return { ok: false, reason: "Already sent." };
      if (b.status !== "approved") return { ok: false, reason: "The CISO must approve before it goes to the executive committee." };
      return { ok: true };
    }
    if (action === "adopt") return pid === "coo" ? { ok: true } : { ok: false, reason: "Only the COO can adopt a new restore order as the baseline." };
    return { ok: false, reason: "Unknown action." };
  }
  function renderBriefSteps() {
    const b = S.brief;
    const st = [
      ["Draft", b.status !== "none", b.draftedBy],
      ["Edit", b.edited, b.edited ? b.lastEditor : null],
      ["Legal", !!b.legalBy, b.legalBy],
      ["Approve", b.status === "approved" || b.status === "sent", b.approvedBy],
      ["Send", b.status === "sent", b.sentBy],
    ];
    const firstOpen = st.findIndex((x) => !x[1] && x[0] !== "Edit");
    const html = st.map(([l, done, by], i) => `<span class="step ${done ? "done" : ""} ${i === firstOpen ? "now" : ""}" ${by ? `data-tip="${esc(who(by))}"` : ""}><i>${done ? "✓" : i + 1}</i>${l}</span>`).join("");
    $("#briefSteps").innerHTML = html; $("#briefStepsModal").innerHTML = html;
    $("#btnOpenBrief").disabled = b.status === "none";
    $("#btnDraft").textContent = b.status === "none" ? "Draft brief" : "Redraft";
    $("#btnDraft").disabled = !S.ran;
  }
  function suggestOrderFix(b) {
    const o1 = b.obligations[0];
    if (!o1.missed || !o1.blocker) return null;
    const id = o1.blocker;
    let o = S.basePriority.slice();
    for (let k = 0; k < o.length; k++) {
      const i = o.indexOf(id); if (i <= 0) break;
      [o[i - 1], o[i]] = [o[i], o[i - 1]];
      const r = runCached(scn(), { priority: o, workarounds: wkList(), start: startOf() });
      if (!r.obligations[0].missed) {
        const passed = o[i];
        const worse = Object.entries(r.services).map(([sid, v]) => [sid, v.down_h - b.services[sid].down_h]).sort((a, c) => c[1] - a[1])[0];
        return { order: o.slice(), r, id, passed, worse };
      }
    }
    return null;
  }
  function buildBrief() {
    const b = base(), s = scn(), ca = customersAffected(b), ck = E.clocks(startOf(), S.materiality);
    const ex = b.exposure, ip = ex.ip || {};
    const reach = s.mode === "exfil" ? "Nothing was encrypted; the attacker copied data and demands payment."
      : s.mode === "vendor" ? `Our payroll provider was hit and is down for ${plural(s.vendor_outage_h, "hour")}. Our own network was not reached.`
      : !b.jewels_down ? "The attack was contained at the entry point."
      : `From ${ZN[s.entry].toLowerCase()}, the attacker reached ${b.jewels_down} of 12 crown jewels across ${b.hops.map((pid) => ZN[M.paths.find((q) => q.id === pid).target].toLowerCase()).join(", ")}.`;
    const lastSvc = Object.entries(b.services).filter(([, v]) => v.down_h > 0).sort((a, c) => c[1].down_h - a[1].down_h).map(([k, v]) => `${SV[k].name.toLowerCase()} (${plural(v.down_h, "hour")})`);
    const people = [];
    if (b.customers_exposed) people.push(`${fmtInt(b.customers_exposed)} customers' data presumed exposed`);
    if (b.shoppers_turned_away) people.push(`${fmtInt(b.shoppers_turned_away)} online shoppers turned away`);
    if (b.partners_affected) people.push(`${plural(b.partners_affected, "retail partner")} can't place orders`);
    if (b.orders_delayed) people.push(`${fmtInt(b.orders_delayed)} orders shipped late`);
    if (b.plant_workers_idle) people.push(`${fmtInt(b.plant_workers_idle)} plant workers idle`);
    const o1 = b.obligations[0];
    if (o1.missed) people.push(`${fmtInt(OB.O1.people)} employees paid late (payroll file misses its deadline by ${plural(Math.round(o1.back_h - o1.due_h), "hour")})`);
    if (b.employees_exposed) people.push(`${fmtInt(b.employees_exposed)} employees' SSNs and bank details presumed exposed`);
    const data = [];
    if (ex.customer) data.push(`Customer: ${fmtInt(ex.customer.records)} people (names, addresses, order history)`);
    if (ex.payment) data.push(`Payment: ${fmtInt(ex.payment.records)} stored card tokens (no full card numbers)`);
    if (ex.financial) data.push(`Financial: ${ex.financial.items.map((i) => recLabel(i)).join(", ")}`);
    if (ip.formulas || ip.design_files) data.push(`IP: ${[ip.formulas ? plural(ip.formulas, "formula") : "", ip.design_files ? fmtInt(ip.design_files) + " design files" : ""].filter(Boolean).join(", ")}${b.hit.CJ09 && b.hit.CJ09.path === "offline copy" ? `; the formula library's newest clean copy is ${lossText(b.hit.CJ09.loss_h)} old` : ""}`);
    if (ex.employee) data.push(`Employee: ${fmtInt(ex.employee.records)} people`);
    const decisions = [];
    const fix = suggestOrderFix(b);
    const projOrder = S.projPriority && S.projPriority.join() !== S.basePriority.join();
    if (projOrder) {
      const p = runCached(s, { priority: S.projPriority, workarounds: wkList(), start: startOf() });
      decisions.push(`Approve the proposed restore order: hours down ${hrs(b.hours_down)} → ${hrs(p.hours_down)}; payroll ${p.obligations[0].missed ? "still late" : "on time"}.`);
    } else if (fix) {
      decisions.push(`Restore ${J[fix.id].name.toLowerCase()} before ${J[fix.passed].name.toLowerCase()}: ${fmtInt(OB.O1.people)} employees are paid on time; ${SV[fix.worse[0]].name.toLowerCase()} restarts ${plural(fix.worse[1], "hour")} later.`);
    }
    const ranked = M.controls.map((c) => ({ c, r: runCached(s, { controls: [c.id], priority: S.basePriority, workarounds: wkList(), start: startOf() }) }))
      .map((x) => ({ ...x, saved: b.total_impact - x.r.total_impact, helps: SCN.filter((q) => runCached(q, { controls: [x.c.id] }).total_impact < runCached(q, {}).total_impact).length }))
      .filter((x) => x.saved > 0).sort((a, c) => c.saved - a.saved).slice(0, 2);
    if (ranked.length) decisions.push(`Fund ${ranked.map((x) => `${x.c.name.toLowerCase()} (total impact ${money(b.total_impact)} → ${money(x.r.total_impact)}; helps in ${x.helps} of 6 scenarios)`).join(" and ")}.`);
    if (b.exposed.includes("CJ09") && J.CJ09.zone !== "Z_vault") decisions.push("Add the formula library to the crown-jewel list and move it to an isolated vault with download alerts.");
    else if (b.customers_exposed) decisions.push(`Approve the customer notification plan: ${fmtInt(b.customers_exposed)} customers, estimated ${money(b.notification_cost)}.`);
    const signed = !!S.brief.legalBy;
    const reg = (t) => `<span class="reg ${signed ? "signed" : ""}">${t}${signed ? "" : " <em>(draft, not legal advice)</em>"}</span>`;
    const now = [];
    const order = hitOrder(S.basePriority, b);
    if (order.length) now.push(`Recovery order: ${order.slice(0, 4).map((id) => J[id].name).join(", ")}${order.length > 4 ? ", then the rest" : ""}. ${plural(b.teams, "recovery team")} after ${CONTAIN} hours of containment.`);
    S.workarounds.forEach((w) => { const sv = w === "WK1" ? SV.S2 : SV.S4; now.push(`Workaround active: ${sv.workaround.name.toLowerCase()} (${Math.round(sv.workaround.capacity * 100)}% of ${sv.name.toLowerCase()} after hour ${sv.workaround.after_h}).`); });
    if (!now.length) now.push("No restores needed; investigation and notification only.");
    return `<h1>Ransomware impact brief</h1>
      <div class="meta">Executive committee · ${s.id} ${esc(s.name)} · scenario starts ${at(0)} · prepared by ${esc(who(S.brief.draftedBy))}</div>
      <h2>What happened</h2><p>${esc(s.setup)} ${esc(reach)}</p>
      <h2>The three numbers</h2>
      <div class="nums"><div><b>${hrs(b.hours_down)}</b><span>hours down${lastSvc[0] ? `; last back: ${esc(lastSvc[0])}` : ""}</span></div>
        <div><b>${compact(ca.n)}</b><span>customers affected (${esc(ca.label)})</span></div>
        <div><b>${money(b.revenue_at_risk)}</b><span>revenue at risk; ${money(b.revenue_lost)} lost. Total impact ${money(b.total_impact)}</span></div></div>
      <h2>Who is affected</h2><ul>${people.map((x) => `<li>${esc(x)}</li>`).join("") || "<li>No customers, partners, or employees affected.</li>"}</ul>
      <h2>Data presumed exposed</h2><ul>${data.map((x) => `<li>${esc(x)}</li>`).join("") || "<li>None.</li>"}</ul>
      <h2>Obligations and clocks</h2><ul>
        ${b.obligations.filter((o) => o.due_h > 0).map((o) => `<li>${esc(OB[o.id].name)}, due ${at(o.due_h)}: ${o.missed ? `<b>missed</b> (back at hour ${o.back_h})` : "on time"}.</li>`).join("")}
        <li>${reg(`If materiality is determined at hour ${S.materiality}, the SEC Form 8-K (Item 1.05) is due ${dateLabel(ck.sec_8k_due)}.`)}</li>
        ${b.customers_exposed || b.employees_exposed ? `<li>${reg(`State notices to affected residents: as short as 30 days in some states (${dateLabel(ck.state_notice_due)}).`)}</li>` : ""}
      </ul>
      <h2>What we're doing now</h2><ul>${now.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <h2>Decisions for the executive committee</h2><ol>${decisions.map((x) => `<li>${esc(x)}</li>`).join("") || "<li>No decisions needed.</li>"}</ol>
      <h2>Not included</h2><p>Ransom payment, customer churn, share price, fines, and litigation.</p>
      <div class="stamp" id="stamp"></div>`;
  }
  function updateStamp() {
    const b = S.brief, el = $("#stamp"); if (!el) return;
    el.innerHTML = [`Drafted by ${esc(who(b.draftedBy))} (simulated AI draft)`, b.edited ? `Last edited by ${esc(who(b.lastEditor))}` : "", b.legalBy ? `Legal sign-off: ${esc(who(b.legalBy))}` : "Legal sign-off: pending", b.approvedBy ? `Approved by ${esc(who(b.approvedBy))}` : "Approval: pending", b.sentBy ? `Sent to the executive committee by ${esc(who(b.sentBy))}` : ""].filter(Boolean).join("<br>");
    $$("#paper .reg").forEach((x) => { x.classList.toggle("signed", !!b.legalBy); const em = x.querySelector("em"); if (em && b.legalBy) em.remove(); });
  }
  function briefAction(action) {
    const b = S.brief, chk = approvalCheck(b, action, S.persona);
    if (!chk.ok) { $("#briefMsg").textContent = chk.reason; toast(chk.reason); log(`was blocked from "${action}": ${chk.reason}`); return; }
    $("#briefMsg").textContent = "";
    const paper = $("#paper");
    if (action === "draft") {
      Object.assign(b, { status: "drafted", draftedBy: S.persona, lastEditor: S.persona, legalBy: null, approvedBy: null, sentBy: null, edited: false });
      paper.innerHTML = buildBrief(); paper.setAttribute("contenteditable", "false"); $("#btnEdit").textContent = "Edit";
      log(`drafted the executive brief for ${scn().id} (simulated AI)`);
      openModal("briefModal");
    } else if (action === "edit") {
      const editing = paper.getAttribute("contenteditable") === "true";
      if (!editing) { paper.setAttribute("contenteditable", "true"); $("#btnEdit").textContent = "Done editing"; paper.focus(); return; }
      paper.setAttribute("contenteditable", "false"); $("#btnEdit").textContent = "Edit";
      const reset = b.legalBy || b.approvedBy;
      Object.assign(b, { edited: true, lastEditor: S.persona, legalBy: null, approvedBy: null, status: "drafted" });
      log(`edited the brief${reset ? "; sign-offs reset" : ""}`);
    } else if (action === "legal") { b.legalBy = S.persona; log("signed off the regulatory lines"); }
    else if (action === "approve") { b.status = "approved"; b.approvedBy = S.persona; log("approved the executive brief"); }
    else if (action === "send") { b.status = "sent"; b.sentBy = S.persona; log("sent the brief to the executive committee (simulated)"); toast("Brief marked sent to the executive committee (simulated)."); }
    updateStamp(); renderBriefSteps();
  }
  function briefMarkdown() {
    const out = [];
    $$("#paper > *").forEach((el) => {
      const t = el.tagName;
      if (t === "H1") out.push("# " + el.innerText.trim());
      else if (t === "H2") out.push("\n## " + el.innerText.trim());
      else if (t === "UL") $$("li", el).forEach((li) => out.push("- " + li.innerText.trim()));
      else if (t === "OL") $$("li", el).forEach((li, i) => out.push(`${i + 1}. ${li.innerText.trim()}`));
      else if (el.classList.contains("nums")) $$("div", el).forEach((d) => out.push(`- **${d.querySelector("b").innerText}** ${d.querySelector("span").innerText}`));
      else if (el.innerText.trim()) out.push(el.innerText.trim().replace(/\n/g, "  \n"));
    });
    out.push("\n---\nFor demo purposes only. All data is fictional and does not represent any organization. · Built by Aby Rao");
    return out.join("\n");
  }

  // ------------------------------------------------------------------ WHY
  function openWhy(title, html) { $("#whyTitle").textContent = title; $("#whyBody").innerHTML = html; openModal("whyModal"); }
  function whyJewel(id) {
    const j = J[id];
    let h = "";
    if (!j.listed) h += `<p><b>Not on the crown-jewel list.</b> ${esc(j.note)}. It holds ${recLabel(j.data[0])}: ${esc(j.data[0].what.toLowerCase())}.</p>`;
    h += `<p>${backupTip(j)}</p>`;
    if (S.ran) {
      const r = base(), hit = r.hit[id], s = scn();
      if (hit && hit.path !== "vendor") {
        const chain = zoneChain(r, J[id].zone);
        h += `<p><b>In ${s.id}:</b> reached through</p><div class="chain">${chain.map((z) => `<span class="c">${esc(ZN[z])}</span>`).join('<span class="arr">→</span>')}</div>`;
        const job = r.jobs.find((x) => x.id === id);
        const destroyed = hit.path !== "restore";
        h += `<p>${destroyed ? (r.zones.includes("Z_backup") || J[id].zone === "Z_cloud" ? "The attacker also reached its backups, so they were deleted. " : "") : "Its backup survived. "}Team ${job.lane + 1} ${hit.path === "restore" ? "restores it" : hit.path === "rebuild" ? "rebuilds it from scratch" : "restores it from the offline copy"} from hour ${job.start} to hour ${job.end}${job.start > CONTAIN && r.hit.AD && (j.zone === "Z_corp" || j.zone === "Z_ot") ? ", after Active Directory is back" : ""}. ${lossText(hit.loss_h)} of data can't be recovered.</p>`;
      } else if (hit) h += `<p><b>In ${s.id}:</b> the vendor is down for ${plural(hit.up, "hour")}.</p>`;
      else if (r.exposed.includes(id)) h += `<p><b>In ${s.id}:</b> not encrypted, but its data was copied.</p>`;
      else h += `<p><b>In ${s.id}:</b> not reached.</p>`;
    }
    openWhy(j.name, h);
  }
  const WHY = {
    people() {
      const r = base();
      return ["Who is affected", `<p>Counted from the business services and the data on reached systems.</p>
        <div class="formula">Shoppers turned away = online revenue at risk ÷ $90 average order<br>Orders shipped late = 1,400 orders/h × online hour weight while shipping is down<br>Retail partners = all 340 if retail ordering is down during ordering hours<br>Plant workers = all 2,900 if production is down on a working day</div>
        <p>Customers are counted once even though ${r.exposure.customer ? plural(r.exposure.customer.systems.length, "system") + " hold" : "several systems hold"} the same people.</p>`];
    },
    cost() {
      const r = base();
      return ["Total impact", `<p>Revenue at risk is sales disrupted. Only part of it is lost: 70% of online sales (shoppers go elsewhere) and 15% of retail orders (partners mostly wait).</p>
        <div class="formula">Revenue lost ${money(r.revenue_lost)} + plants idle ${money(r.plant_cost)} + notification ${money(r.notification_cost)} + recovery ${money(r.recovery_cost)} = ${money(r.total_impact)}</div>
        <p>Recovery = $750,000 incident response + $2,500 per recovery-team hour (${plural(r.team_hours, "team hour")}). All rates are fictional. Ransom, churn, share price, fines, and litigation are not included.</p>`];
    },
    dataLost() {
      return ["Data that can't be restored", `<p>A restore brings a system back as it was when the copy was made. Everything after that is gone and has to be re-entered or rebuilt.</p>
        <p>Immutable copies survive the attack. Standard copies are deleted if the attacker reaches where they're stored, which forces a rebuild or an older offline copy. The formula library's only fallback is a copy 41 days old.</p>`];
    },
    order() {
      return ["Restore order", `<p>Recovery teams take crown jewels in this order. A team takes the first one that's ready; on-premises systems aren't ready until Active Directory is back.</p>
        <p>Drag items or use the arrows to project a new order. Only the COO can adopt it as the baseline. In R1, moving treasury above EDI gets the payroll file to the bank on time.</p>`];
    },
  };

  // ------------------------------------------------------------------ CHECKS
  function runChecks() {
    const R = (id, o) => E.run(M, SCN.find((s) => s.id === id), o || {});
    const list = [];
    const add = (id, t, exp, act, pass) => list.push({ id, t, exp, act, pass });
    let r = R("R1", { controls: ["C1"] });
    add("K1", "R1 with tiered admin accounts", "0 crown jewels down, $0", `${plural(r.jewels_down, "crown jewel")} down, ${money(r.total_impact)}`, r.jewels_down === 0 && r.total_impact === 0);
    r = R("R1");
    add("K2", "R1 baseline", "11 down · 190 h · S1 34 h · S2 94 h · $9,206,470 / $2,440,529 · 21,405 · 340 · 135,590 · $21,740,529",
      `${r.jewels_down} down · ${r.hours_down} h · S1 ${r.services.S1.down_h} h · S2 ${r.services.S2.down_h} h · $${fmtInt(r.revenue_at_risk)} / $${fmtInt(r.revenue_lost)} · ${fmtInt(r.shoppers_turned_away)} · ${r.partners_affected} · ${fmtInt(r.orders_delayed)} · $${fmtInt(r.total_impact)}`,
      r.jewels_down === 11 && r.hours_down === 190 && r.services.S1.down_h === 34 && r.services.S2.down_h === 94 && r.revenue_at_risk === 9206470 && r.revenue_lost === 2440529 && r.shoppers_turned_away === 21405 && r.partners_affected === 340 && r.orders_delayed === 135590 && r.total_impact === 21740529 && r.zones.length - 1 === 4);
    add("K3", "R1 formula library", "stolen · offline copy · 984 h lost", `${r.exposed.includes("CJ09") ? "stolen" : "safe"} · ${r.hit.CJ09.path} · ${r.hit.CJ09.loss_h} h lost`, r.exposed.includes("CJ09") && r.hit.CJ09.path === "offline copy" && r.hit.CJ09.loss_h === 984);
    const sw = R("R1", { priority: ["CJ01", "CJ03", "CJ04", "CJ06", "CJ12", "CJ11", "CJ10", "CJ02", "CJ05", "CJ08", "CJ09"] });
    const o = r.obligations[0], o2 = sw.obligations[0];
    add("K4", "R1 payroll, then treasury above EDI", "due h86, back h102 missed → back h76 paid; shipping 94 → 102 h", `due h${o.due_h}, back h${o.back_h} ${o.missed ? "missed" : "paid"} → back h${o2.back_h} ${o2.missed ? "missed" : "paid"}; shipping ${r.services.S3.down_h} → ${sw.services.S3.down_h} h`,
      o.due_h === 86 && o.back_h === 102 && o.missed && o2.back_h === 76 && !o2.missed && sw.services.S3.down_h === 102);
    const c3 = R("R1", { controls: ["C3"] });
    add("K5", "R1 with isolated immutable backups", "102 h · $5,566,470 · $16,274,529 · payroll on time · formulas 24 h · 2,400,000 exposed", `${c3.hours_down} h · $${fmtInt(c3.revenue_at_risk)} · $${fmtInt(c3.total_impact)} · payroll ${c3.obligations[0].missed ? "missed" : "on time"} · formulas ${c3.data_lost_h.CJ09} h · ${fmtInt(c3.customers_exposed)} exposed`,
      c3.hours_down === 102 && c3.revenue_at_risk === 5566470 && c3.total_impact === 16274529 && !c3.obligations[0].missed && c3.data_lost_h.CJ09 === 24 && c3.customers_exposed === 2400000);
    const r4 = R("R4");
    add("K6", "R4 leaked cloud key", "4 down · S1 34 h · CDP h120, 168 h lost · $9,628,529", `${r4.jewels_down} down · S1 ${r4.services.S1.down_h} h · CDP h${r4.hit.CJ02.up}, ${r4.hit.CJ02.loss_h} h lost · $${fmtInt(r4.total_impact)}`,
      r4.jewels_down === 4 && r4.services.S1.down_h === 34 && r4.hit.CJ02.up === 120 && r4.hit.CJ02.loss_h === 168 && r4.total_impact === 9628529);
    const r3 = R("R3", { controls: ["C2"] });
    add("K7", "R3 with plants segmented", "only plant systems, back h60 · $0 at risk · $2,420,000 plant cost", `${Object.keys(r3.hit).join(", ")}, back h${r3.hit.CJ10 ? r3.hit.CJ10.up : "–"} · ${money(r3.revenue_at_risk)} at risk · $${fmtInt(r3.plant_cost)} plant cost`,
      Object.keys(r3.hit).join() === "CJ10" && r3.hit.CJ10.up === 60 && r3.revenue_at_risk === 0 && r3.plant_cost === 2420000);
    const r5 = R("R5");
    add("K8", "R5 payroll provider", "96 h · payroll missed · 6,400 exposed · $256,000", `${r5.hours_down} h · payroll ${r5.obligations[0].missed ? "missed" : "on time"} · ${fmtInt(r5.employees_exposed)} exposed · $${fmtInt(r5.notification_cost)}`,
      r5.hours_down === 96 && r5.obligations[0].missed && r5.employees_exposed === 6400 && r5.notification_cost === 256000);
    const r6 = R("R6"), r6v = R("R6", { controls: ["C5"] });
    add("K9", "R6 formula theft, then with the vault", "2,300 formulas, 0 h down → 40 formulas", `${fmtInt(r6.exposure.ip.formulas)} formulas, ${r6.hours_down} h down → ${fmtInt(r6v.exposure.ip.formulas)} formulas`,
      r6.exposure.ip.formulas === 2300 && r6.hours_down === 0 && r6v.exposure.ip.formulas === 40);
    const ck = E.clocks(SCN[0].start, 48);
    add("K10", "Regulatory clocks, R1", "materiality Sun Nov 22 02:00 → 8-K due Fri Nov 27 · state notice Sun Dec 20", `materiality ${wall(E.parseTime(ck.materiality), true)} → 8-K due ${dateLabel(ck.sec_8k_due)} · state notice ${dateLabel(ck.state_notice_due)}`,
      ck.materiality === "2026-11-22T02:00" && ck.sec_8k_due === "2026-11-27" && ck.state_notice_due === "2026-12-20");
    // K11 approvals on a scratch brief
    const sb = { status: "drafted", draftedBy: "lead", lastEditor: "lead", legalBy: null, approvedBy: null, edited: false };
    const a1 = approvalCheck(sb, "send", "ciso").ok === false;
    const a2 = approvalCheck(sb, "approve", "ciso").ok === false; // no legal yet
    const a3 = approvalCheck(sb, "legal", "lead").ok === false && approvalCheck(sb, "legal", "gc").ok;
    const sb2 = { ...sb, legalBy: "gc", lastEditor: "ciso", edited: true };
    const a4 = approvalCheck(sb2, "approve", "ciso").ok === false;
    const sb3 = { ...sb, legalBy: "gc" };
    const a5 = approvalCheck(sb3, "approve", "ciso").ok && approvalCheck(sb3, "approve", "cfo").ok === false;
    const a6 = approvalCheck(sb, "adopt", "lead").ok === false && approvalCheck(sb, "adopt", "coo").ok;
    const keep = new Set(S.projControls), b0 = base().total_impact; S.projControls.add("C3"); S.projControls.add("C1");
    const a7 = base().total_impact === b0; S.projControls = keep;
    const all = a1 && a2 && a3 && a4 && a5 && a6 && a7;
    add("K11", "Approvals", "send needs approval · legal by GC only · last editor can't approve · CFO can't approve · adopt by COO only · what-ifs leave the baseline alone",
      [a1, a2, a3, a4, a5, a6, a7].map((x, i) => `${i + 1}:${x ? "ok" : "fail"}`).join(" "), all);
    const pl = [plural(0, "crown jewel") === "0 crown jewels", plural(1, "hour") === "1 hour", plural(1, "retail partner") === "1 retail partner", plural(1, "recovery team") === "1 recovery team", plural(2, "day") === "2 days", lossText(24) === "24 hours", lossText(984) === "41 days"];
    const txt = document.body.innerText;
    const bad = txt.match(/\b1 (hours|days|teams|partners|customers|crown jewels|services|systems|paths|zones|formulas|employees)\b|\b(0|[2-9]|\d{2,}) (hour|day|team|system|service|path|zone|formula|employee|customer)\b(?![s-])/g);
    add("K12", "Counts of 0 and 1", "no singular/plural errors in helpers or on screen", `${pl.filter(Boolean).length} of ${pl.length} helper cases · ${bad ? "found: " + bad.slice(0, 3).join(", ") : "screen clean"}`, pl.every(Boolean) && !bad);
    const pass = list.filter((x) => x.pass).length;
    $("#checksBody").innerHTML = list.map((c) => `<div class="chk"><span class="id">${c.id}</span><div><div class="t">${esc(c.t)}</div><div class="d">Expected: ${esc(c.exp)}<br>Actual: ${esc(c.act)}</div></div><span class="chip ${c.pass ? "ok" : "bad"}">${c.pass ? "pass" : "fail"}</span></div>`).join("");
    const cc = $("#checkCount"); cc.textContent = `${pass}/${list.length}`; cc.className = "badge-count " + (pass === list.length ? "good" : "bad");
    return list;
  }

  // ------------------------------------------------------------------ modals, panels
  function openModal(id) { const m = $("#" + id); m.classList.add("open"); m.setAttribute("aria-hidden", "false"); }
  function closeModal(id) { const m = $("#" + id); m.classList.remove("open", "show"); m.setAttribute("aria-hidden", "true"); }
  function togglePanel(id) {
    const p = $("#" + id), open = !p.classList.contains("open");
    $$(".panel").forEach((x) => { x.classList.remove("open"); x.setAttribute("aria-hidden", "true"); });
    if (open) { p.classList.add("open"); p.setAttribute("aria-hidden", "false"); }
  }

  // ------------------------------------------------------------------ events
  function bind() {
    $(".tabs").addEventListener("click", (e) => { const t = e.target.closest(".tab"); if (t) setView(t.dataset.view); });
    document.addEventListener("click", (e) => {
      const go = e.target.closest("[data-goto]"); if (go) { setView(go.dataset.goto); return; }
      const cl = e.target.closest("[data-close]"); if (cl) { const id = cl.dataset.close; if ($("#" + id).classList.contains("panel")) togglePanel(id); else closeModal(id); return; }
      const wj = e.target.closest("[data-whyj]"); if (wj) { e.stopPropagation(); whyJewel(wj.dataset.whyj); return; }
      const w = e.target.closest("[data-why]"); if (w) { if (!S.ran) { toast("Run a scenario first."); return; } const [t, h] = WHY[w.dataset.why](); openWhy(t, h); return; }
      const jc = e.target.closest(".jcard"); if (jc) { S.selJewel = S.selJewel === jc.dataset.j ? null : jc.dataset.j; renderJewels(); return; }
      const f = e.target.closest(".fbtn"); if (f) { S.filter = f.dataset.f || null; renderJewels(); return; }
      const sc = e.target.closest(".scn"); if (sc) { if (sc.dataset.scn !== S.scnId) { animToken++; animating = false; S.scnId = sc.dataset.scn; S.ran = false; S.start = null; S.projControls.clear(); S.projPriority = null; S.mapMode = "base"; S.clock = 0; S.brief = newBrief(); $("#paper").innerHTML = ""; log(`picked ${S.scnId} ${scn().name}`); render(); } return; }
      const ch = e.target.closest("[data-chip]"); if (ch) { whyJewel(ch.dataset.chip); return; }
      const wk = e.target.closest("[data-wk]"); if (wk) { const id = wk.dataset.wk; S.workarounds.has(id) ? S.workarounds.delete(id) : S.workarounds.add(id); log(`${S.workarounds.has(id) ? "activated" : "stopped"} workaround: ${id === "WK1" ? SV.S2.workaround.name : SV.S4.workaround.name}`); render(); return; }
      const mat = e.target.closest("[data-mat]"); if (mat) { S.materiality = Math.max(0, Math.min(240, S.materiality + +mat.dataset.mat)); log(`set the materiality marker to hour ${S.materiality}`); renderImpact(); return; }
      const dc = e.target.closest("[data-dc]"); if (dc) { S.dataClass = S.dataClass === dc.dataset.dc ? null : dc.dataset.dc; renderData(); return; }
      const ct = e.target.closest("[data-ctrl]"); if (ct) { const id = ct.dataset.ctrl; S.projControls.has(id) ? S.projControls.delete(id) : S.projControls.add(id); log(`${S.projControls.has(id) ? "projected" : "removed"} control ${id} ${CT[id].name}`); renderDecide(); return; }
      const mv = e.target.closest("[data-mv]"); if (mv) { moveBy(mv.dataset.id, +mv.dataset.mv); return; }
    });
    document.addEventListener("keydown", (e) => {
      const ch = e.target.closest && e.target.closest("[data-chip],.pbadge");
      if (ch && (e.key === "Enter" || e.key === " ") && ch.dataset.chip) { e.preventDefault(); whyJewel(ch.dataset.chip); return; }
      if (e.target.matches("input, select, textarea") || e.target.isContentEditable) return;
      if (e.key === "Escape") { $$(".modal.open").forEach((m) => closeModal(m.id)); $$(".panel.open").forEach((p) => togglePanel(p.id)); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const views = ["jewels", "attack", "impact", "data", "decide"];
      if (/^[1-5]$/.test(e.key)) setView(views[+e.key - 1]);
      if (e.key === "p" || e.key === "P") togglePresenter();
    });
    $("#persona").innerHTML = PERSONAS.map((p) => `<option value="${p.id}">${p.name} · ${p.role}</option>`).join("");
    $("#persona").onchange = (e) => { S.persona = e.target.value; log(`switched to ${who(S.persona)}`); $("#briefMsg").textContent = ""; };
    $("#btnRun").onclick = runAttack;
    $("#btnChecks").onclick = () => { runChecks(); togglePanel("panelChecks"); };
    $("#btnRerun").onclick = () => { runChecks(); toast("Checks run again."); };
    $("#btnLog").onclick = () => togglePanel("panelLog");
    $("#btnPresenter").onclick = togglePresenter;
    $("#btnReset").onclick = () => { animToken++; animating = false; stopPlay(); cache.clear(); freshState(); lastHero = {}; $("#logCount").textContent = "0"; renderLog(); $("#paper").innerHTML = ""; $("#persona").value = S.persona; log("reset the simulator"); render(); toast("Reset."); };
    $("#startSel").onchange = (e) => { S.start = e.target.value; S.clock = 0; log(`set the start to ${at(0)}`); render(); };
    $("#clock").oninput = (e) => { S.clock = +e.target.value; renderTimeline(base()); };
    $("#btnPlay").onclick = () => (playing ? stopPlay() : startPlay());
    $("#btnOrderReset").onclick = () => { S.projPriority = null; log("reset the projected restore order"); renderDecide(); };
    $("#btnAdopt").onclick = () => {
      const c = approvalCheck(S.brief, "adopt", S.persona);
      if (!c.ok) { toast(c.reason); log(`was blocked from adopting a restore order: ${c.reason}`); return; }
      S.basePriority = S.projPriority.slice(); S.projPriority = null; log("adopted the projected restore order as the baseline"); toast("New restore order adopted as the baseline."); render();
    };
    $("#btnDraft").onclick = () => briefAction("draft");
    $("#btnOpenBrief").onclick = () => openModal("briefModal");
    $("#btnEdit").onclick = () => briefAction("edit");
    $("#btnLegal").onclick = () => briefAction("legal");
    $("#btnApprove").onclick = () => briefAction("approve");
    $("#btnSend").onclick = () => briefAction("send");
    $("#btnDownload").onclick = () => {
      const blob = new Blob([briefMarkdown()], { type: "text/markdown" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `BC-04_brief_${S.scnId}.md`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000); log("downloaded the brief as Markdown");
    };
    $$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) closeModal(m.id); }));
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(render, 120); });
  }
  function startPlay() {
    const r = base(), X = tlDomain(r);
    if (S.clock >= X) S.clock = 0;
    $("#btnPlay").innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
    playing = setInterval(() => { S.clock = Math.min(X, S.clock + 2); renderTimeline(r); if (S.clock >= X) stopPlay(); }, 50);
  }
  function stopPlay() {
    clearInterval(playing); playing = null;
    $("#btnPlay").innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>';
  }
  function togglePresenter() { document.body.classList.toggle("presenter"); log(document.body.classList.contains("presenter") ? "turned on presenter mode" : "turned off presenter mode"); setTimeout(render, 30); }

  // ------------------------------------------------------------------ boot
  freshState();
  initTooltips();
  bind();
  renderLog();
  render();
  setTimeout(runChecks, 50);
  window.BC04App = { S, runChecks, approvalCheck, base, proj, setView, runAttack };
})();
