/* BC-05 Patch Delay Cost Calculator · app. All data is fictional; AI behavior is simulated. */
(function () {
  "use strict";
  const DATA = window.BC05;
  const E = window.BC05Engine.build(DATA.model, DATA.findings);
  const T = E.TODAY, M = E.M;
  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";

  // ------------------------------------------------------------------ formatting
  const fmtInt = (n) => Math.round(n).toLocaleString("en-US");
  const money = (n) => "$" + fmtInt(n);
  const moneyS = (n) => (Math.abs(n) >= 1e6 ? "$" + (n / 1e6).toFixed(1) + "M" : money(n));
  const pct = (x, d = 1) => (x * 100).toFixed(d) + "%";
  const pl = (n, one, many) => (typeof n === "number" && !Number.isInteger(n) ? n.toFixed(1) : fmtInt(n)) + " " + (n === 1 ? one : many);
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const parts = (n) => { const d = new Date(n * 86400000); return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCDay()]; };
  const fmtD = (n) => { const [y, m, d] = parts(n); return MON[m] + " " + d + (y !== 2026 ? ", " + y : ""); };
  const fmtDW = (n) => { const [, , , w] = parts(n); return WD[w] + ", " + fmtD(n); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clock = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const STATUS_LABEL = { none: "No public exploit", poc: "Exploit code public", kev: "KEV" };
  const EXPO_SHORT = { public: "Public", login: "Login", partner: "Partner" };
  const CLASS_SHORT = { phi: "member health records", payment: "bank accounts", pii: "provider and broker records", employee: "employee records", contact: "email addresses" };
  const BIZ_LABEL = { phi: "Member records", payment: "Bank accounts", pii: "Provider records", employee: "Employee records", contact: "Email addresses" };
  const FID = Object.fromEntries(E.findings.map((f) => [f.id, f]));

  const PERSONAS = [
    { id: "vuln", label: "Vulnerability lead" },
    { id: "ciso", label: "CISO" },
    { id: "cio", label: "CIO, change board chair" },
    { id: "cfo", label: "CFO" },
    { id: "owner", label: "Business owner" },
  ];
  const personaLabel = (id) => PERSONAS.find((p) => p.id === id).label;

  // ------------------------------------------------------------------ precomputed results
  const SUM = E.summary();
  const EDGE = Object.fromEntries(E.edge().map((r) => [r.asset, r]));
  const HIST = E.history();
  const FC = E.forecast(), FC_LO = E.forecast(0.5), FC_HI = E.forecast(2.0);
  const ORD = E.ordering();
  const DAILY = Object.fromEntries(E.openFindings().map((f) => [f.id, E.dailyCost(f)]));
  const OPEN_SORTED = E.openFindings().slice().sort((a, b) => DAILY[b.id] - DAILY[a.id]);
  const SC = {
    current: { label: "Current policy", short: "Current", color: "var(--rust)", hex: "#B5543C" },
    proposed: { label: "Proposed policy", short: "Proposed", color: "var(--accent)", hex: "#2F7D4F" },
    proposed_waf: { label: "Proposed + virtual patch", short: "+ Virtual patch", color: "var(--blue)", hex: "#4A6FA5" },
  };

  // contributions per month, for the Delay drawer
  const MONTH_CONTRIB = (() => {
    const out = {};
    const add = (f, from, to, open) => {
      const bd = {};
      E.loss(f, from, to, { byDay: bd });
      for (const k in bd) {
        const n = +k;
        if (n < E.HISTORY_START || n > T) continue;
        const key = E.iso(n).slice(0, 7);
        out[key] = out[key] || {};
        out[key][f.id] = out[key][f.id] || { id: f.id, v: 0, open };
        out[key][f.id].v += bd[k];
      }
    };
    for (const f of E.findings) {
      const due = E.dueDate(f, "current");
      if (f.patched) { const end = E.dn(f.patched); if (end > due) add(f, due, end, false); }
      else if (due < T) add(f, due, T, true);
    }
    const res = {};
    for (const k in out) res[k] = Object.values(out[k]).sort((a, b) => b.v - a.v);
    return res;
  })();
  const HIST_BY_ID = Object.fromEntries(HIST.per_finding.map((x) => [x.id, x]));

  // ------------------------------------------------------------------ state
  const fresh = () => ({
    view: "edge", persona: "vuln", edgeFilter: "all", asset: "A01", month: "2025-11",
    calc: calcDefaults("F-0142"),
    scenario: "current", band: true, order: "cost",
    memo: { state: "none", text: "", editedBy: null, editing: false, ciso: null, board: null },
    accept: { fid: "F-0097", expiry: null, note: "" }, acceptances: [],
    log: [], opened: Date.now(),
  });
  function calcDefaults(fid) {
    const f = FID[fid];
    const planned = f.planned ? E.dn(f.planned) - T : null;
    return { fid, patch: planned !== null && planned >= 0 && planned <= 120 ? planned : 30,
      exposure: null, control: "none", assumeKev: false, overrides: {} };
  }
  let S = fresh();

  function log(what, kind) {
    S.log.unshift({ t: clock(), who: personaLabel(S.persona), what, kind: kind || "" });
    renderLog();
  }
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // ------------------------------------------------------------------ svg helpers
  function svg(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function text(parent, x, y, s, attrs) { const t = svg("text", Object.assign({ x, y }, attrs || {}), parent); t.textContent = s; return t; }
  // top of the axis: four steps of a round size (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10^n)
  function niceMax(v) {
    if (v <= 0) return 4;
    const raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * p).find((s) => s >= raw);
    return step * 4;
  }
  const axisMoney = (v) => (v >= 1e6 ? "$" + (+(v / 1e6).toFixed(1)) + "M" : v >= 1e3 ? "$" + (+(v / 1e3).toFixed(1)) + "K" : "$" + Math.round(v));
  function chartBox(id) {
    const host = $(id); host.innerHTML = "";
    const w = Math.max(200, host.clientWidth - 20), h = Math.max(140, host.clientHeight - 8);
    const s = svg("svg", { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: "img" }, host);
    return { host, s, w, h };
  }

  // ------------------------------------------------------------------ heat ramp
  const RAMP = ["#EEF0E6", "#E6DDB2", "#DDBE77", "#CE8D4F", "#B5543C", "#8C3825"];
  const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function heat(v) {
    const t = Math.max(0, Math.min(1, (Math.log10(Math.max(v, 50)) - Math.log10(50)) / (Math.log10(500000) - Math.log10(50))));
    const x = t * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(x)), f = x - i;
    const a = hex2(RAMP[i]), b = hex2(RAMP[i + 1]);
    return { color: `rgb(${a.map((c, k) => Math.round(c + (b[k] - c) * f)).join(",")})`, dark: t > 0.62 };
  }

  // ------------------------------------------------------------------ hero strip
  function renderHero() {
    const freeze = M.freezes.map((f) => [E.dn(f.start), E.dn(f.end)]).find(([a, b]) => T >= a && T <= b);
    $("ctxDate").textContent = "As of " + fmtDW(T) + ", 2026";
    $("ctxFreeze").textContent = freeze ? `Enrollment freeze · day ${T - freeze[0] + 1} of ${freeze[1] - freeze[0] + 1}` : "No change freeze";
    $("hvDaily").innerHTML = money(SUM.daily_cost_today) + "<small>/day</small>";
    $("heroDaily").dataset.tip = `Expected loss added by every day the ${pl(SUM.open, "open finding", "open findings")} stay unpatched: chance of exploitation that day × cost if exploited, summed. An estimate, not a forecast of a breach.`;
    $("hvDue").textContent = fmtInt(SUM.past_due);
    $("hsDue").textContent = `${SUM.past_due === 1 ? "finding" : "findings"} · ${fmtInt(SUM.kev_open)} exploited in the wild`;
    $("heroDue").dataset.tip = "Past due under the current policy: Critical 30 days, High 60, Medium 90, Low 180 from the fix date. The policy has no rule for findings exploited in the wild (KEV).";
    const approved = S.memo.state === "board";
    const sc = approved ? "proposed_waf" : "current";
    $("hvNext").textContent = moneyS(FC[sc].expected_loss);
    $("hsNext").textContent = approved ? "proposal approved" : "at the current pace";
    $("heroNext").dataset.tip = approved
      ? "The change board approved the emergency lane and virtual patches. Projection, not a guarantee."
      : `Expected loss over the next 90 days if nothing changes. Range ${moneyS(FC_LO.current.expected_loss)} to ${moneyS(FC_HI.current.expected_loss)}.`;
    tickHero();
  }
  function tickHero() {
    const secs = (Date.now() - S.opened) / 1000;
    $("hsDaily").textContent = "+" + money((SUM.daily_cost_today / 86400) * secs) + " since you opened this";
  }

  // ------------------------------------------------------------------ views
  function setView(v) {
    S.view = v;
    document.querySelectorAll(".tab").forEach((b) => { const on = b.dataset.view === v; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
    document.querySelectorAll(".view").forEach((s) => s.classList.toggle("active", s.id === "view-" + v));
    renderView();
  }
  function renderView() {
    ({ edge: renderEdge, delay: renderDelay, calc: renderCalc, forecast: renderForecast, decide: renderDecide })[S.view]();
  }

  // ================================================================== EDGE
  const EDGE_FILTERS = [
    { id: "all", label: "All", test: () => true, tip: "All 16 internet-facing systems." },
    { id: "kev", label: "KEV", test: (a) => EDGE[a.id].kev_open > 0, tip: "Systems with an open finding listed in CISA's Known Exploited Vulnerabilities catalog (simulated)." },
    { id: "due", label: "Past due", test: (a) => EDGE[a.id].past_due > 0, tip: "Systems with a finding past its SLA due date under the current policy." },
    { id: "public", label: "No login", test: (a) => a.exposure === "public", tip: "Reachable from the internet without signing in." },
  ];
  function squarify(items, x, y, w, h) {
    const out = [];
    const total = items.reduce((s, i) => s + i.v, 0);
    const scale = (w * h) / total;
    let rest = items.map((i) => Object.assign({}, i, { a: i.v * scale }));
    let rx = x, ry = y, rw = w, rh = h;
    const worst = (row, side) => {
      const s = row.reduce((t, r) => t + r.a, 0);
      const mx = Math.max(...row.map((r) => r.a)), mn = Math.min(...row.map((r) => r.a));
      return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
    };
    while (rest.length) {
      const side = Math.min(rw, rh);
      let row = [rest[0]], i = 1;
      while (i < rest.length && worst(row.concat(rest[i]), side) <= worst(row, side)) { row.push(rest[i]); i++; }
      const s = row.reduce((t, r) => t + r.a, 0);
      if (rw >= rh) {
        const cw = s / rh; let cy = ry;
        for (const r of row) { const ch = r.a / cw; out.push(Object.assign(r, { x: rx, y: cy, w: cw, h: ch })); cy += ch; }
        rx += cw; rw -= cw;
      } else {
        const ch = s / rw; let cx = rx;
        for (const r of row) { const cw = r.a / ch; out.push(Object.assign(r, { x: cx, y: ry, w: cw, h: ch })); cx += cw; }
        ry += ch; rh -= ch;
      }
      rest = rest.slice(i);
    }
    return out;
  }
  function renderEdge() {
    $("edgeFilters").innerHTML = EDGE_FILTERS.map((f) => `<button class="fbtn ${S.edgeFilter === f.id ? "on" : ""}" data-filter="${f.id}" data-tip="${esc(f.tip)}">${f.label}</button>`).join("");
    const host = $("treemap"); host.innerHTML = "";
    const W = host.clientWidth, H = host.clientHeight;
    const items = E.assets.map((a) => ({ id: a.id, v: Math.pow(EDGE[a.id].impact_if_exploited, 0.4) })).sort((p, q) => q.v - p.v);
    const flt = EDGE_FILTERS.find((f) => f.id === S.edgeFilter);
    const top = Object.values(EDGE).sort((p, q) => q.daily_cost - p.daily_cost)[0].asset;
    const G = 3;
    for (const r of squarify(items, 0, 0, W, H)) {
      const a = E.ASSET[r.id], e = EDGE[r.id], hc = heat(e.daily_cost);
      const b = document.createElement("button");
      const w = r.w - 2 * G, h = r.h - 2 * G;
      const size = w < 92 || h < 58 ? "s-xxs" : w < 150 || h < 80 ? "s-xs" : w < 210 || h < 112 ? "s-sm" : "";
      b.className = `tile ${hc.dark ? "dark" : ""} ${size} ${a.in_cmdb ? "" : "unlisted"} ${S.asset === a.id ? "sel" : ""} ${flt.test(a) ? "" : "faded"}`;
      Object.assign(b.style, { left: r.x + G + "px", top: r.y + G + "px", width: w + "px", height: h + "px", background: hc.color });
      b.dataset.asset = a.id;
      b.dataset.tip = `${a.name}: ${money(e.daily_cost)} a day across ${pl(e.open, "open finding", "open findings")}. Cost if exploited ${moneyS(e.impact_if_exploited)}. Owner: ${a.owner}.`;
      b.setAttribute("aria-label", `${a.name}, ${money(e.daily_cost)} a day`);
      const badges = [];
      if (e.kev_open) badges.push(`<span class="chip kev">KEV</span>`);
      if (e.past_due) badges.push(`<span class="chip due">${pl(e.past_due, "past due", "past due")}</span>`);
      if (!a.in_cmdb) badges.push(`<span class="chip">Not in CMDB</span>`);
      badges.push(`<span class="chip">${EXPO_SHORT[a.exposure]}</span>`);
      b.innerHTML = `<div class="nm">${esc(a.name)}</div><div class="cost">${money(e.daily_cost)}<small>/day</small></div>` +
        `<div class="meta">${pl(e.open, "open finding", "open findings")} · ${esc(a.layer)}</div><div class="badges">${badges.join("")}</div>` +
        (a.id === top ? `<span class="pulse" aria-hidden="true"></span>` : "");
      host.appendChild(b);
    }
    const g = RAMP.map((c, i) => `${c} ${Math.round((i / (RAMP.length - 1)) * 100)}%`).join(",");
    $("edgeLegend").innerHTML = `<span>Daily cost</span><span>$50</span><span class="ramp" style="background:linear-gradient(90deg,${g})"></span><span>$500K+</span><span class="spacer"></span>` +
      `<span data-tip="Tile area grows with the cost if exploited (power 0.4), so small systems stay readable.">Size: cost if exploited</span>` +
      `<span class="chip dash" data-tip="Found by the external attack surface scan, not in the CMDB.">Dashed: not in CMDB</span>`;
    renderAssetDrawer();
  }
  function findingRow(f, opts) {
    opts = opts || {};
    const st = E.statusOn(f, T), due = E.dueDate(f, "current");
    const late = due < T;
    const chips = [`${f.severity} ${f.cvss}`];
    if (st !== "none") chips.push(st === "kev" ? "KEV" : "exploit code");
    chips.push(late ? `due ${fmtD(due)}, late` : `due ${fmtD(due)}`);
    return `<div class="frow"><div class="t" title="${esc(f.title)}">${esc(f.title)}</div><div class="c">${money(DAILY[f.id])}<span class="faint small">/day</span></div>` +
      `<div class="m">${f.id} · ${chips.join(" · ")}${f.component === "Library" ? " · library" : ""}</div>` +
      `<div class="acts"><button class="why" data-why="${f.id}">Why?</button>${opts.noCalc ? "" : `<button class="btn sm" data-calc="${f.id}">Calculator</button>`}</div></div>`;
  }
  function renderAssetDrawer() {
    const a = E.ASSET[S.asset], e = EDGE[a.id];
    const fs = OPEN_SORTED.filter((f) => f.asset === a.id);
    const data = a.data.length ? a.data.map((x) => `${fmtInt(x.records)} ${CLASS_SHORT[x.class]}`).join(", ") : "No sensitive data";
    const parts = E.impactParts(a, T);
    const shown = fs.slice(0, 5);
    $("assetDrawer").innerHTML = `
      <div><h2>${esc(a.name)}</h2><div class="muted small">${esc(a.owner)} · ${esc(a.team)} team</div></div>
      <div class="row"><span class="chip blue">${esc(a.layer)}</span><span class="chip" data-tip="${esc(M.exposure_label[a.exposure])}">${EXPO_SHORT[a.exposure]}</span>${a.in_cmdb ? "" : `<span class="chip dash">Not in CMDB</span>`}${e.kev_open ? `<span class="chip kev">KEV open</span>` : ""}</div>
      ${a.note ? `<div class="note">${esc(a.note)}</div>` : ""}
      <div class="stat-grid">
        <div class="stat hot" data-tip="Sum of the daily expected loss of every open finding on this system."><div class="v">${money(e.daily_cost)}</div><div class="l">Daily cost of waiting</div></div>
        <div class="stat" data-tip="Response ${money(parts.incident_response)} + records ${money(parts.records)} + downtime ${money(parts.downtime)} (${pl(a.outage_hours_if_exploited, "hour", "hours")} × ${money(a.cost_per_hour_down)} × ${E.seasonMult(T)} for enrollment season)."><div class="v">${moneyS(e.impact_if_exploited)}</div><div class="l">Cost if exploited</div></div>
        <div class="stat"><div class="v">${fmtInt(e.open)}</div><div class="l">Open ${e.open === 1 ? "finding" : "findings"}</div></div>
        <div class="stat"><div class="v">${fmtInt(e.past_due)}</div><div class="l">Past due</div></div>
      </div>
      <div class="small muted"><b>Data:</b> ${esc(data)} · <b>Down:</b> ${money(a.cost_per_hour_down)} an hour</div>
      <div class="flist">${shown.map((f) => findingRow(f)).join("") || `<div class="empty">Nothing open.</div>`}</div>
      ${fs.length > shown.length ? `<div class="faint small">and ${pl(fs.length - shown.length, "more finding", "more findings")} under ${money(DAILY[fs[shown.length].id])} a day</div>` : ""}`;
  }

  // ================================================================== DELAY
  function renderDelay() {
    $("delayKpis").innerHTML = `
      <div class="kpi accent" data-tip="Expected loss accrued after each finding's SLA due date, Nov 2025 to Oct 2026. Includes ${money(HIST.accrued_open)} still accruing on open findings."><div class="v">${moneyS(HIST.total)}</div><div class="l">Cost of delay</div></div>
      <div class="kpi" data-tip="Closed findings patched after their SLA due date."><div class="v">${HIST.late} of ${HIST.closed}</div><div class="l">Patched late</div></div>
      <div class="kpi" data-tip="Four critical findings deferred by the Oct 15 – Dec 7, 2025 change freeze: ${money(HIST.freeze_cost)}."><div class="v">${Math.round(HIST.freeze_share * 100)}%</div><div class="l">From the 2025 freeze</div></div>`;
    renderMonthChart(); renderSev(); renderMonthDrawer();
  }
  function renderMonthChart() {
    const { s, w, h } = chartBox("monthChart");
    const keys = Object.keys(HIST.by_month);
    const vals = keys.map((k) => HIST.by_month[k]);
    const L = 58, R = 10, TP = 26, B = 28;
    const iw = w - L - R, ih = h - TP - B;
    const max = niceMax(Math.max(...vals));
    const bw = iw / keys.length;
    const y = (v) => TP + ih - (v / max) * ih;
    // freeze bands
    const freezes = M.freezes.map((f) => [E.dn(f.start), E.dn(f.end)]);
    keys.forEach((k, i) => {
      const [yy, mm] = k.split("-").map(Number);
      const first = E.dn(`${k}-01`), days = new Date(Date.UTC(yy, mm, 0)).getUTCDate(), last = first + days - 1;
      for (const [a, b] of freezes) {
        const lo = Math.max(a, first), hi = Math.min(b, last, T);
        if (lo <= hi) svg("rect", { x: L + i * bw + ((lo - first) / days) * bw, y: TP - 6, width: ((hi - lo + 1) / days) * bw, height: ih + 6, fill: "#F6EDCF", opacity: .75 }, s);
      }
    });
    const fz = freezes[0];
    if (keys.length) text(s, L + 6, TP - 10, "Enrollment change freeze", { class: "lbl", fill: "#8A6C10" });
    const ga = svg("g", { class: "axis grid" }, s);
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i;
      svg("line", { x1: L, x2: w - R, y1: y(v), y2: y(v) }, ga);
      text(ga, L - 8, y(v) + 4, axisMoney(v), { "text-anchor": "end" });
    }
    keys.forEach((k, i) => {
      const v = HIST.by_month[k];
      const g = svg("g", { class: "bar-hit" + (S.month === k ? " on" : ""), tabindex: 0, role: "button", "data-month": k, "aria-label": `${k}: ${money(v)}` }, s);
      const x = L + i * bw + bw * 0.18, bh = Math.max(2, TP + ih - y(v));
      svg("rect", { x: L + i * bw, y: TP, width: bw, height: ih, fill: "transparent" }, g);
      const rect = svg("rect", { class: "b", x, y: TP + ih - bh, width: bw * 0.64, height: bh, rx: 5, fill: S.month === k ? "#8C3825" : "#B5543C" }, g);
      rect.style.transition = "height .5s";
      text(g, x + bw * 0.32, TP + ih - bh - 6, moneyS(v).replace("$0", "$0"), { "text-anchor": "middle", class: "lbl", fill: "#1C2B22" });
      const [yy, mm] = k.split("-").map(Number);
      text(s, L + i * bw + bw / 2, h - 8, MON[mm - 1] + (mm === 1 || i === 0 ? " " + String(yy).slice(2) : ""), { "text-anchor": "middle", class: "axis" }).setAttribute("fill", "#87938A");
      g.dataset.tip = `${MONTH_FULL[mm - 1]} ${yy}: ${money(v)} of expected loss accrued past SLA, across ${pl((MONTH_CONTRIB[k] || []).length, "late finding", "late findings")}.`;
    });
    void fz;
  }
  function renderSev() {
    $("sevStrip").innerHTML = ["Critical", "High", "Medium", "Low"].map((sev) => {
      const r = HIST.by_severity[sev];
      const mx = Math.max(r.median_days, r.sla) * 1.35;
      const late = r.median_days > r.sla;
      return `<div class="sev" data-tip="${sev}: median ${pl(r.median_days, "day", "days")} from fix to patch, against a ${pl(r.sla, "day", "days")} SLA. ${r.on_time} of ${r.count} patched on time.">
        <div class="top"><b>${sev}</b><span>${pl(r.median_days, "day", "days")} · SLA ${r.sla}</span></div>
        <div class="track"><div class="fill" style="width:${(r.median_days / mx) * 100}%;background:${late ? "var(--rust)" : "var(--accent)"}"></div><div class="sla" style="left:${(r.sla / mx) * 100}%"></div></div>
        <div class="foot">${r.on_time} of ${r.count} on time</div></div>`;
    }).join("");
  }
  function renderMonthDrawer() {
    const k = S.month, [yy, mm] = k.split("-").map(Number);
    const rows = MONTH_CONTRIB[k] || [];
    const total = HIST.by_month[k] || 0;
    const fz = rows.filter((r) => { const f = FID[r.id]; return f.story === "freeze2025"; });
    $("monthDrawer").innerHTML = `
      <div><h2>${MONTH_FULL[mm - 1]} ${yy}</h2><div class="muted small">${pl(rows.length, "late finding", "late findings")} accrued cost this month</div></div>
      <div class="stat-grid"><div class="stat hot"><div class="v">${money(total)}</div><div class="l">Cost of delay</div></div>
      <div class="stat"><div class="v">${Math.round((total / HIST.total) * 100)}%</div><div class="l">Share of the year</div></div></div>
      ${fz.length ? `<div class="note">${pl(fz.length, "critical finding was", "critical findings were")} waiting for the 2025 enrollment freeze to end. Each could have gone in an emergency window.</div>` : ""}
      <div class="flist">${rows.slice(0, 7).map((r) => {
        const f = FID[r.id], a = E.ASSET[f.asset], hrow = HIST_BY_ID[r.id];
        const status = f.patched ? `patched ${fmtD(E.dn(f.patched))}, ${pl(hrow.days_late, "day", "days")} late` : "still open";
        return `<div class="frow"><div class="t">${esc(a.name)}: ${esc(f.title)}</div><div class="c">${moneyS(r.v)}</div>
          <div class="m">${f.id} · ${f.severity} ${f.cvss} · ${status}${f.story === "freeze2025" ? " · freeze" : ""}</div><div class="acts"><button class="why" data-why="${f.id}">Why?</button></div></div>`;
      }).join("") || `<div class="empty">No late findings this month.</div>`}</div>
      ${rows.length > 7 ? `<div class="faint small">and ${pl(rows.length - 7, "smaller finding", "smaller findings")}</div>` : ""}`;
  }

  // ================================================================== CALCULATOR
  function calcAsset() {
    const c = S.calc, f = FID[c.fid], base = E.ASSET[f.asset];
    const a = JSON.parse(JSON.stringify(base));
    if (c.exposure) a.exposure = c.exposure;
    const o = c.overrides;
    a.data.forEach((x, i) => { if (o["rec" + i] != null) x.records = o["rec" + i]; });
    if (o.hourly != null) a.cost_per_hour_down = o.hourly;
    if (o.window != null) a.window_hours = o.window;
    return a;
  }
  function calcMit() {
    const k = S.calc.control;
    return k === "waf" ? { kind: "waf", start: T + 1 } : k === "allowlist" ? { kind: "allowlist", start: T + 1 } : null;
  }
  function calcResult(patchDay) {
    const c = S.calc;
    return E.calculator(c.fid, { patch: T + (patchDay != null ? patchDay : c.patch), mit: calcMit(), assumeKev: c.assumeKev, asset: calcAsset() });
  }
  function breakEvenText(be) {
    if (be == null) return "never";
    if (be < 1) { const h = Math.round(be * 24); return h < 1 ? "under 1 hour" : pl(h, "hour", "hours"); }
    if (be > 120) return "over 120 days";
    const d = be < 10 ? Math.round(be * 10) / 10 : Math.round(be);
    return pl(d, "day", "days");
  }
  function renderCalc() {
    const c = S.calc, f = FID[c.fid], a = calcAsset(), base = E.ASSET[f.asset];
    // finding select
    $("calcFinding").innerHTML = OPEN_SORTED.map((x) => `<option value="${x.id}" ${x.id === c.fid ? "selected" : ""}>${x.id} · ${esc(E.ASSET[x.asset].name)} · ${moneyS(DAILY[x.id])}/day</option>`).join("");
    $("calcSub").textContent = `${f.id} · ${E.ASSET[f.asset].name} · ${f.title} · ${f.severity} ${f.cvss}`;
    $("patchSlider").value = c.patch;
    const pd = T + c.patch;
    $("patchLabel").textContent = c.patch === 0 ? "Today" : `${fmtDW(pd)} · ${pl(c.patch, "day", "days")}`;
    // quick dates
    const q = [["Today", 0, "Patch today."]];
    const nw = E.nextWindow(T + 1, true) - T;
    q.push(["Next window", nw, `First Tue or Thu maintenance window: ${fmtDW(T + nw)}, 02:00${E.inFreeze(T + nw) ? ". Inside the freeze, so it needs an emergency change." : "."}`]);
    const due = E.dueDate(f, "current") - T;
    if (due > 0 && due <= 120) q.push(["SLA due", due, `Due under the current policy: ${fmtD(T + due)}.`]);
    if (f.planned) { const p = E.dn(f.planned) - T; if (p > 0 && p <= 120) q.push(["Planned", p, `Planned in the change ticket: ${fmtD(T + p)}. ${f.status_note || ""}`]); }
    const seen = new Set();
    $("patchQuick").innerHTML = q.filter(([, d]) => (seen.has(d) ? false : seen.add(d))).map(([l, d, tip]) => `<button class="btn sm ${c.patch === d ? "on" : ""}" data-patch="${d}" data-tip="${esc(tip)}">${l}</button>`).join("");
    // segments
    const expo = c.exposure || base.exposure;
    $("segExposure").innerHTML = ["public", "login", "partner"].map((x) => `<button class="${expo === x ? "on" : ""}" data-expo="${x}" data-tip="${esc(M.exposure_label[x])}: × ${M.exposure[x]} on the chance per day${x === base.exposure ? " (this system today)" : ""}.">${EXPO_SHORT[x]}</button>`).join("");
    $("segControl").innerHTML = [["none", "None", "No compensating control."], ["waf", "Virtual patch", `WAF rule from ${fmtD(T + 1)}: × ${M.waf_factor} on the chance per day until patched.`], ["allowlist", "Allowlist", `Restrict to partner IP addresses from ${fmtD(T + 1)}: exposure becomes × ${M.exposure.partner}.`]]
      .map(([k, l, tip]) => `<button class="${c.control === k ? "on" : ""}" data-ctl="${k}" data-tip="${esc(tip)}" ${k === "allowlist" && expo === "partner" ? "disabled" : ""}>${l}</button>`).join("");
    $("assumeKev").checked = c.assumeKev;
    // business inputs
    $("bizFields").innerHTML = a.data.map((x, i) => `<label class="fld"><span>${BIZ_LABEL[x.class]}</span><input type="number" min="0" step="1000" data-ov="rec${i}" value="${x.records}" data-tip="Records this system can expose. Cost per record: ${money(M.cost_per_record[x.class])} (fictional)."></label>`).join("") +
      `<label class="fld"><span>Down, per hour</span><input type="number" min="0" step="1000" data-ov="hourly" value="${a.cost_per_hour_down}" data-tip="From finance's business impact analysis. Doubled during enrollment season."></label>` +
      `<label class="fld"><span>Window hours</span><input type="number" min="0" step="0.5" data-ov="window" value="${a.window_hours}" data-tip="Planned downtime to apply the patch, at 02:00 when traffic is about 20% of peak."></label>`;
    renderCalcOutputs();
  }
  function renderCalcOutputs() {
    const c = S.calc, f = FID[c.fid], a = calcAsset();
    const r = calcResult();
    const pd = T + c.patch;
    const ip = r.impact_parts, tot = r.impact_if_exploited;
    const be = breakEvenText(r.break_even_days);
    $("calcCards").innerHTML = `
      <div class="ccard" data-tip="Response ${money(ip.incident_response)} + records ${money(ip.records)} + downtime ${money(ip.downtime)}. Downtime uses ${pl(a.outage_hours_if_exploited, "hour", "hours")} at ${money(a.cost_per_hour_down)} × ${E.seasonMult(T)} for enrollment season.">
        <div class="l">Cost if exploited</div><div class="v">${moneyS(tot)}</div>
        <div class="parts"><i style="width:${(ip.records / tot) * 100}%;background:var(--rust)"></i><i style="width:${(ip.downtime / tot) * 100}%;background:var(--gold)"></i><i style="width:${(ip.incident_response / tot) * 100}%;background:var(--blue)"></i></div>
        <div class="s">records · downtime · response</div></div>
      <div class="ccard" data-tip="Chance this finding is exploited between today and the patch date, from its exploit status, exposure and control."><div class="l">Chance by patch</div><div class="v">${pct(r.chance_by_patch)}</div><div class="s">${c.patch === 0 ? "patched today" : "if patched " + fmtD(pd)}</div></div>
      <div class="ccard" data-tip="Expected loss added by one more day of waiting, starting today."><div class="l">Daily cost now</div><div class="v">${money(r.daily_cost_today)}</div><div class="s">per day of waiting</div></div>
      <div class="ccard hot" data-tip="Sum of each day's expected loss from today until the patch date."><div class="l">Cost of waiting</div><div class="v">${c.patch === 0 ? "$0" : moneyS(r.expected_loss_waiting)}</div><div class="s">${c.patch === 0 ? "nothing waiting" : pl(c.patch, "day", "days") + " to " + fmtD(pd)}</div></div>
      <div class="ccard" data-tip="${pl(a.window_hours, "hour", "hours")} × ${money(a.cost_per_hour_down)} an hour × ${M.window_weight} (02:00 traffic) × ${E.seasonMult(T)} (season), plus ${money(M.change_labor)} change labor."><div class="l">Window cost</div><div class="v">${money(r.window_cost)}</div><div class="s">${pl(a.window_hours, "hour", "hours")} at 02:00 + labor</div></div>
      <div class="ccard good" data-tip="Window cost ÷ daily cost now. Past this point, waiting costs more than taking the outage."><div class="l">Break-even</div><div class="v">${be}</div><div class="s">then waiting costs more</div></div>`;
    $("curveSub").textContent = r.break_even_days == null || r.break_even_days > 120 ? "waiting stays cheaper than the window" : `waiting more than ${be} costs more than the window`;
    // keep the parts bar inline
    document.querySelectorAll(".ccard .parts i").forEach((i) => { i.style.display = "block"; i.style.height = "100%"; });
    renderCompare(r);
    renderCurve(r);
  }
  function renderCompare(r) {
    const rows = [...document.querySelectorAll("#patchQuick button")].map((b) => {
      const d = +b.dataset.patch;
      return { l: b.textContent + (d ? " · " + fmtD(T + d) : ""), v: d ? calcResult(d).expected_loss_waiting : 0 };
    });
    rows.push({ l: "Window", v: r.window_cost, win: true });
    const mx = Math.max(...rows.map((x) => x.v), 1);
    $("calcCompare").innerHTML = rows.map((x) => `<div class="r ${x.win ? "win" : ""}"><span title="${esc(x.l)}">${esc(x.l)}</span><span class="bt"><i style="width:${(x.v / mx) * 100}%"></i></span><b>${moneyS(x.v)}</b></div>`).join("");
  }
  function renderCurve(r) {
    const c = S.calc, f = Object.assign({}, FID[c.fid]);
    if (c.assumeKev) f.kev_date = E.iso(T);
    const DAYS = 120;
    const cur = E.curve(c.fid, DAYS, { asset: calcAsset(), mit: calcMit(), assumeKev: c.assumeKev });
    const { s, w, h } = chartBox("curveChart");
    const L = 62, R = 18, TP = 22, B = 52;
    const iw = w - L - R, ih = h - TP - B;
    const max = niceMax(Math.max(cur[DAYS], r.window_cost * 1.2));
    const x = (d) => L + (d / DAYS) * iw, y = (v) => TP + ih - (v / max) * ih;
    // freeze band
    const fz = M.freezes.map((q) => [E.dn(q.start), E.dn(q.end)]).find(([a, b]) => T >= a && T <= b);
    if (fz) {
      svg("rect", { x: x(0), y: TP, width: x(fz[1] - T + 1) - x(0), height: ih, fill: "#F6EDCF", opacity: .6 }, s);
      text(s, x(fz[1] - T + 1) - 6, TP + 14, "Enrollment freeze", { "text-anchor": "end", class: "lbl", fill: "#8A6C10" });
    }
    const ga = svg("g", { class: "axis grid" }, s);
    for (let i = 0; i <= 4; i++) { const v = (max / 4) * i; svg("line", { x1: L, x2: w - R, y1: y(v), y2: y(v) }, ga); text(ga, L - 8, y(v) + 4, axisMoney(v), { "text-anchor": "end" }); }
    for (let d = 0; d <= DAYS; d += 14) text(ga, d === 0 ? x(d) + 2 : x(d), TP + ih + 18, fmtD(T + d), { "text-anchor": d === 0 ? "start" : "middle" });
    // area and lines
    const pts = cur.map((v, d) => `${x(d)},${y(v)}`);
    svg("polyline", { points: pts.join(" "), fill: "none", stroke: "#CBD3C5", "stroke-width": 2, "stroke-dasharray": "4 4" }, s);
    const upto = cur.slice(0, c.patch + 1).map((v, d) => `${x(d)},${y(v)}`);
    if (c.patch > 0) {
      svg("polygon", { points: `${x(0)},${y(0)} ${upto.join(" ")} ${x(c.patch)},${y(0)}`, fill: "#B5543C", opacity: .14 }, s);
      svg("polyline", { points: upto.join(" "), fill: "none", stroke: "#B5543C", "stroke-width": 3.2, "stroke-linejoin": "round" }, s);
    }
    // window line
    svg("line", { x1: L, x2: w - R, y1: y(r.window_cost), y2: y(r.window_cost), stroke: "#2F7D4F", "stroke-width": 2, "stroke-dasharray": "6 4" }, s);
    text(s, w - R, y(r.window_cost) - 6, `Maintenance window ${money(r.window_cost)}`, { "text-anchor": "end", class: "lbl", fill: "#23603C" });
    // markers
    const marks = [];
    const due = E.dueDate(f, "current") - T;
    if (due > 0 && due <= DAYS) marks.push([due, "SLA due"]);
    if (f.planned) { const p = E.dn(f.planned) - T; if (p > 0 && p <= DAYS) marks.push([p, "Planned"]); }
    if (f.kev_date && E.dn(f.kev_date) > T && E.dn(f.kev_date) - T <= DAYS) marks.push([E.dn(f.kev_date) - T, "KEV"]);
    let lastX = -999, lane = 0;
    marks.sort((p, q) => p[0] - q[0]).forEach(([d, l]) => {
      svg("line", { x1: x(d), x2: x(d), y1: TP, y2: TP + ih, stroke: "#87938A", "stroke-dasharray": "2 3" }, s);
      lane = x(d) - lastX < 70 ? lane + 1 : 0; lastX = x(d);
      text(s, x(d) + 4, TP + 30 + lane * 14, l, { class: "lbl", fill: "#4B5A50" });
    });
    // status band (exploit status per day)
    const by = TP + ih + 26, bh = 10;
    const col = { none: "#E1E6DC", poc: "#DDBE77", kev: "#B5543C" };
    let start = 0, prev = E.statusOn(f, T);
    const seg = (a0, a1, st) => {
      svg("rect", { x: x(a0), y: by, width: Math.max(1, x(a1) - x(a0)), height: bh, rx: 3, fill: col[st] }, s);
      if (x(a1) - x(a0) > 130) text(s, x(a0) + 6, by + bh + 13, STATUS_LABEL[st] === "KEV" ? "Exploited in the wild (KEV)" : STATUS_LABEL[st], { class: "lbl", fill: "#4B5A50" });
    };
    for (let d = 1; d <= DAYS; d++) { const st = E.statusOn(f, T + d); if (st !== prev) { seg(start, d, prev); start = d; prev = st; } }
    seg(start, DAYS, prev);
    // patch handle
    const hx = x(c.patch), hy = y(cur[c.patch]);
    svg("line", { x1: hx, x2: hx, y1: TP, y2: TP + ih, stroke: "#1C2B22", "stroke-width": 2 }, s);
    const lbl = c.patch === 0 ? "Patch today: $0" : `Patch ${fmtD(T + c.patch)}: ${moneyS(r.expected_loss_waiting)}`;
    const anchorEnd = hx > L + iw * 0.6;
    const tw = lbl.length * 7.3 + 16;
    const lx = anchorEnd ? hx - tw - 10 : hx + 10, ly = Math.max(TP + 4, Math.min(hy - 34, TP + ih - 30));
    svg("rect", { x: lx, y: ly, width: tw, height: 26, rx: 8, fill: "#1C2B22" }, s);
    text(s, lx + tw / 2, ly + 17, lbl, { "text-anchor": "middle", fill: "#fff", class: "lbl" });
    svg("circle", { cx: hx, cy: hy, r: 8, fill: "#C9A227", stroke: "#fff", "stroke-width": 3 }, s);
    // drag overlay
    const ov = svg("rect", { x: L, y: TP, width: iw, height: ih, fill: "transparent", style: "cursor:ew-resize" }, s);
    ov.setAttribute("aria-hidden", "true");
    const setFromEvent = (ev) => {
      const bb = s.getBoundingClientRect();
      const px = ((ev.clientX - bb.left) / bb.width) * w;
      const d = Math.max(0, Math.min(DAYS, Math.round(((px - L) / iw) * DAYS)));
      if (d !== S.calc.patch) { S.calc.patch = d; $("patchSlider").value = d; updatePatchUi(); }
    };
    ov.addEventListener("pointerdown", (ev) => { ov.setPointerCapture(ev.pointerId); setFromEvent(ev); ov._drag = true; });
    ov.addEventListener("pointermove", (ev) => { if (ov._drag) setFromEvent(ev); });
    ov.addEventListener("pointerup", () => { ov._drag = false; logPatch(); });
  }
  function updatePatchUi() {
    const c = S.calc, pd = T + c.patch;
    $("patchLabel").textContent = c.patch === 0 ? "Today" : `${fmtDW(pd)} · ${pl(c.patch, "day", "days")}`;
    document.querySelectorAll("#patchQuick button").forEach((b) => b.classList.toggle("on", +b.dataset.patch === c.patch));
    renderCalcOutputs();
  }
  let patchLogT;
  function logPatch() {
    clearTimeout(patchLogT);
    patchLogT = setTimeout(() => {
      const r = calcResult();
      log(`Calculator: ${S.calc.fid} patch ${S.calc.patch === 0 ? "today" : fmtD(T + S.calc.patch)} → cost of waiting ${money(r.expected_loss_waiting)}`);
    }, 500);
  }

  // ================================================================== FORECAST
  function renderForecast() {
    $("segScenario").innerHTML = Object.entries(SC).map(([k, v]) => `<button class="${S.scenario === k ? "on" : ""}" data-sc="${k}">${v.short}</button>`).join("");
    $("bandToggle").checked = S.band;
    renderFcChart(); renderFcSide();
  }
  function renderFcChart() {
    const { s, w, h } = chartBox("fcChart");
    const L = 62, R = 120, TP = 24, B = 30, N = E.HORIZON;
    const iw = w - L - R, ih = h - TP - B;
    const max = niceMax(S.band ? FC_HI[S.scenario].cumulative[N - 1] : FC.current.cumulative[N - 1]);
    const x = (d) => L + (d / (N - 1)) * iw, y = (v) => TP + ih - (Math.min(v, max) / max) * ih;
    const fz = M.freezes.map((q) => [E.dn(q.start), E.dn(q.end)]).find(([a, b]) => T >= a && T <= b);
    if (fz) {
      svg("rect", { x: x(0), y: TP, width: x(fz[1] - T + 1) - x(0), height: ih, fill: "#F6EDCF", opacity: .6 }, s);
      text(s, x(0) + 8, TP + 14, "Enrollment freeze until " + fmtD(fz[1]), { class: "lbl", fill: "#8A6C10" });
    }
    const ga = svg("g", { class: "axis grid" }, s);
    for (let i = 0; i <= 4; i++) { const v = (max / 4) * i; svg("line", { x1: L, x2: L + iw, y1: y(v), y2: y(v) }, ga); text(ga, L - 8, y(v) + 4, axisMoney(v), { "text-anchor": "end" }); }
    for (let d = 0; d < N; d += 14) text(ga, d === 0 ? x(d) + 2 : x(d), TP + ih + 18, fmtD(T + d), { "text-anchor": d === 0 ? "start" : "middle" });
    if (S.band) {
      const lo = FC_LO[S.scenario].cumulative, hi = FC_HI[S.scenario].cumulative;
      const up = hi.map((v, d) => `${x(d)},${y(v)}`), dn = lo.map((v, d) => `${x(d)},${y(v)}`).reverse();
      svg("polygon", { points: up.concat(dn).join(" "), fill: SC[S.scenario].hex, opacity: .13 }, s);
    }
    const order = Object.keys(SC).filter((k) => k !== S.scenario).concat(S.scenario);
    const ends = [];
    for (const k of order) {
      const cum = FC[k].cumulative, on = k === S.scenario;
      const line = svg("polyline", { points: cum.map((v, d) => `${x(d)},${y(v)}`).join(" "), fill: "none", stroke: SC[k].hex, "stroke-width": on ? 3.6 : 2, opacity: on ? 1 : .45, "stroke-linejoin": "round" }, s);
      const len = iw * 1.6;
      line.style.strokeDasharray = len; line.style.strokeDashoffset = len; line.style.transition = "stroke-dashoffset .9s ease";
      requestAnimationFrame(() => { line.style.strokeDashoffset = 0; });
      ends.push({ k, y: y(cum[N - 1]), on });
    }
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 36) ends[i].y = ends[i - 1].y + 36;
    for (const e of ends) {
      svg("circle", { cx: x(N - 1), cy: y(FC[e.k].cumulative[N - 1]), r: e.on ? 5 : 3.5, fill: SC[e.k].hex }, s);
      text(s, x(N - 1) + 10, e.y, moneyS(FC[e.k].expected_loss), { class: "lbl", fill: SC[e.k].hex, "font-size": e.on ? 15 : 12 });
      text(s, x(N - 1) + 10, e.y + (e.on ? 17 : 15), SC[e.k].short, { fill: "#87938A", "font-size": 11 });
    }
    // hover readout
    const guide = svg("line", { y1: TP, y2: TP + ih, stroke: "#1C2B22", "stroke-width": 1, opacity: 0 }, s);
    const ov = svg("rect", { x: L, y: TP, width: iw, height: ih, fill: "transparent" }, s);
    const tip = $("tip");
    ov.addEventListener("mousemove", (ev) => {
      const bb = s.getBoundingClientRect();
      const d = Math.max(0, Math.min(N - 1, Math.round((((ev.clientX - bb.left) / bb.width) * w - L) / iw * (N - 1))));
      guide.setAttribute("x1", x(d)); guide.setAttribute("x2", x(d)); guide.setAttribute("opacity", .35);
      tip.innerHTML = `<b>${fmtDW(T + d)}</b><br>` + Object.keys(SC).map((k) => `${SC[k].short}: ${moneyS(FC[k].cumulative[d])}`).join("<br>");
      placeTip(ev.clientX, ev.clientY);
    });
    ov.addEventListener("mouseleave", () => { guide.setAttribute("opacity", 0); hideTip(); });
  }
  function renderFcSide() {
    const sel = S.scenario;
    const cur = FC.current;
    const cmp = sel === "current" ? "proposed" : sel;
    const avoided = cur.expected_loss - FC[cmp].expected_loss;
    const pol = M.policies;
    const row = (k, l) => `<tr><td>${l}</td><td>${pol.current[k] == null ? "No rule" : pl(pol.current[k], "day", "days")}</td><td class="hl">${pol.proposed[k] == null ? "No rule" : pl(pol.proposed[k], "day", "days")}</td></tr>`;
    $("fcSide").innerHTML = Object.entries(SC).map(([k, v]) => {
      const r = FC[k];
      const sub = k === "current" ? `${moneyS(r.past_sla)} past SLA · no policy cost` : `${moneyS(r.past_sla)} past SLA · costs ${money(r.policy_cost)}`;
      return `<button class="sc-card ${sel === k ? "on" : "dim"}" data-sc="${k}" data-tip="${esc(k === "current" ? "Tickets as planned; nothing moves during the freeze; projected findings patched at last year's median." : k === "proposed" ? `KEV in 3 days, Critical in 7, High in 30. An emergency lane works through the freeze: ${pl(r.emergency_changes, "emergency change", "emergency changes")}.` : `The proposed policy plus ${pl(r.waf_rules, "WAF virtual patch rule", "WAF virtual patch rules")} on web-layer critical and high findings until they're patched.`)}">
        <span class="bar" style="background:${v.color}"></span><span class="n">${v.label}</span><span class="v">${moneyS(r.expected_loss)}</span><span class="s">${sub}</span></button>`;
    }).join("") + `
      <div class="roi" data-tip="Expected loss avoided over 90 days compared with the current policy, against what the policy costs: emergency windows and labor, plus WAF rules.">
        <div class="s">${SC[cmp].label} vs current</div>
        <div class="big">${moneyS(avoided)} avoided</div>
        <div class="s">for ${money(FC[cmp].policy_cost)}: ${pl(FC[cmp].emergency_changes, "emergency change", "emergency changes")}${FC[cmp].waf_rules ? ", " + pl(FC[cmp].waf_rules, "WAF rule", "WAF rules") : ""}</div>
      </div>
      <div class="card" style="padding:8px 10px"><table class="pol"><thead><tr><th>Patch within</th><th>Current</th><th>Proposed</th></tr></thead><tbody>
        ${row("kev", "KEV")}${row("Critical", "Critical")}${row("High", "High")}${row("Medium", "Medium")}
        <tr><td>During freeze</td><td>Wait</td><td class="hl">Emergency lane</td></tr></tbody></table></div>`;
  }

  // ================================================================== DECIDE
  function renderDecide() {
    $("segOrder").innerHTML = [["cost", "By cost"], ["cvss", "By CVSS"]].map(([k, l]) => `<button class="${S.order === k ? "on" : ""}" data-order="${k}">${l}</button>`).join("");
    const list = S.order === "cost" ? ORD.cost_list : ORD.cvss_list;
    const tot = S.order === "cost" ? ORD.cost_order : ORD.cvss_order;
    const diff = ORD.cvss_order - ORD.cost_order;
    $("queueTotal").innerHTML = `<span class="tv">${moneyS(tot)}</span><span class="ts">${S.order === "cost" ? `expected loss over 30 days · ${moneyS(diff)} less than CVSS order` : `expected loss over 30 days · ${moneyS(diff)} more than cost order`}</span>`;
    const top = new Set(ORD.first_week_cost);
    $("queue").innerHTML = list.map((q, i) => {
      const f = FID[q.id], a = E.ASSET[f.asset];
      const wk = Math.floor(i / ORD.capacity_per_week) + 1;
      const capped = E.dn(q.patch) - T >= ORD.days;
      return `<div class="qrow ${top.has(q.id) ? "hot" : ""}" data-tip="${esc(`${f.id} · ${f.title}. ${money(DAILY[f.id])} a day today. Patched ${capped ? "after day 30" : fmtD(E.dn(q.patch))}.`)}">
        <span class="wk">${capped ? "Later" : "Week " + wk}</span><span class="t">${esc(a.name)} <span>· ${esc(f.title)}</span></span>
        <span class="cv">CVSS ${f.cvss}</span><span class="ls">${moneyS(q.loss)}</span></div>`;
    }).join("");
    renderMemo(); renderAccept();
  }
  function memoNumbers() {
    const f1 = FID["F-0142"], f2 = FID["F-0118"];
    const c1 = E.calculator("F-0142", { patch: E.dn(f1.planned) }), c1n = E.calculator("F-0142", { patch: E.nextWindow(T + 1, true) });
    return { f1, f2, c1, c1n, a1: E.ASSET[f1.asset], a2: E.ASSET[f2.asset] };
  }
  function draftMemo() {
    const n = memoNumbers();
    const p = FC.proposed, w = FC.proposed_waf, c = FC.current;
    return `### Request: an emergency patch lane during the enrollment freeze
To: Change advisory board · From: Vulnerability management · ${fmtD(T)}, 2026

#### The ask
Allow emergency changes during the enrollment freeze (until ${fmtD(E.dn(M.freezes[1].end))}) for internet-facing findings that are exploited in the wild (KEV) or critical, and add WAF virtual patches until those changes land.

#### The cost of waiting
- Waiting costs **${money(SUM.daily_cost_today)} a day** in expected loss across ${pl(SUM.open, "open finding", "open findings")}.
- The ${n.a1.name.toLowerCase()} finding (${n.f1.id}) is exploited in the wild. Deferred to ${fmtD(E.dn(n.f1.planned))}, it costs **${moneyS(n.c1.expected_loss_waiting)}**; patched ${fmtDW(E.nextWindow(T + 1, true))}, ${moneyS(n.c1n.expected_loss_waiting)}.
- Last year, four critical findings held by the freeze accounted for ${Math.round(HIST.freeze_share * 100)}% of our ${moneyS(HIST.total)} cost of delay.

#### The cost of acting
- A ${n.a1.window_hours}-hour member portal window at 02:00 costs ${money(n.c1.window_cost)}, including change labor.

#### Options, next 90 days
- **Keep the freeze:** ${moneyS(c.expected_loss)} expected loss.
- **Emergency lane:** ${moneyS(p.expected_loss)}; ${pl(p.emergency_changes, "emergency change", "emergency changes")}, ${money(p.policy_cost)}.
- **Emergency lane and virtual patches (recommended):** ${moneyS(w.expected_loss)}; ${money(w.policy_cost)} in total.

#### Risk owners
- ${n.a1.owner}: ${n.a1.name} (${n.f1.id}).
- ${n.a2.owner}: ${n.a2.name} (${n.f2.id}).

#### Not included
Attacker movement between systems, cyber insurance, fines, and share price. All rates are fictional estimates.`;
  }
  function mdToHtml(md) {
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    const out = []; let inList = false;
    for (const line of md.split("\n")) {
      if (/^- /.test(line)) { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
      if (inList) { out.push("</ul>"); inList = false; }
      if (/^### /.test(line)) out.push(`<h3>${inline(line.slice(4))}</h3>`);
      else if (/^#### /.test(line)) out.push(`<h4>${inline(line.slice(5))}</h4>`);
      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
    if (inList) out.push("</ul>");
    return out.join("");
  }
  function memoSteps() {
    const m = S.memo;
    const st = [
      ["Drafted", m.state !== "none", "Drafted by the simulated AI from the engine's numbers."],
      [m.editedBy ? "Edited by " + personaLabel(m.editedBy) : "Edited", !!m.editedBy, "Any person can edit the draft. The last editor can't approve it."],
      ["CISO approved", !!m.ciso, "The CISO approves the memo before it goes to the change board."],
      ["Change board approved", !!m.board, "The CIO, as change board chair, approves the emergency lane."],
    ];
    const nowIdx = st.findIndex((x) => !x[1]);
    return st.map(([l, done, tip], i) => `<span class="step ${done ? "done" : i === nowIdx ? "now" : ""}" data-tip="${esc(tip)}">${done ? "✓ " : ""}${esc(l)}</span>`).join("");
  }
  function renderMemo() {
    const m = S.memo;
    let body;
    if (m.state === "none") body = `<div class="memo-empty"><div>The simulated AI drafts a one-page memo from the numbers on every view.</div><button class="btn primary" id="memoDraft">Draft memo</button></div>`;
    else if (m.editing) body = `<textarea id="memoText" aria-label="Memo text">${esc(m.text)}</textarea>`;
    else body = mdToHtml(m.text);
    $("memoCard").innerHTML = `
      <div class="card-h">Decision memo <span class="sim-tag" data-tip="Drafted by a simulated AI. No model is called; every number comes from the engine.">simulated</span><div class="spacer"></div>
        ${m.state !== "none" ? `<button class="btn sm" id="memoDl" data-tip="Download the memo as Markdown.">Download</button><button class="btn sm" id="memoPrint" data-tip="Print the memo on one page.">Print</button>` : ""}</div>
      <div class="steps">${memoSteps()}</div>
      <div class="memo">${body}</div>
      <div class="actions">
        ${m.state === "none" ? "" : m.editing ? `<button class="btn primary" id="memoSave">Save edits</button><button class="btn" id="memoCancel">Cancel</button>`
          : `<button class="btn" id="memoEdit" ${m.board ? "disabled" : ""}>Edit</button>
             <button class="btn primary" id="memoCiso" ${m.ciso ? "disabled" : ""} data-tip="Needs the CISO, who must not be the last editor.">${m.ciso ? "CISO approved" : "Approve as CISO"}</button>
             <button class="btn gold" id="memoBoard" ${m.board || !m.ciso ? "disabled" : ""} data-tip="Needs CISO approval first, then the CIO as change board chair.">${m.board ? "Lane approved" : "Change board approve"}</button>`}
        <span class="msg" id="memoMsg"></span>
      </div>`;
  }
  // approval rules, kept pure so the checks can test them
  const RULES = {
    canCisoApprove: (m, persona) => persona !== "ciso" ? "Only the CISO can approve the memo." : m.editedBy === "ciso" ? "You made the last edit. Another person must approve." : m.state === "none" ? "Draft the memo first." : null,
    canBoardApprove: (m, persona) => !m.ciso ? "The CISO must approve first." : persona !== "cio" ? "Only the CIO, as change board chair, can approve the emergency lane." : null,
    canAccept: (persona, note) => persona !== "owner" ? "Only the business owner can accept a delay." : !note.trim() ? "Write a note: why the delay is acceptable and what limits it." : null,
  };
  function renderAccept() {
    const a = S.accept;
    const f = FID[a.fid];
    const defExp = f.planned ? E.dn(f.planned) : T + 30;
    const exp = a.expiry != null ? a.expiry : defExp;
    const cost = exp > T ? E.loss(f, T, exp) : 0;
    const asset = E.ASSET[f.asset];
    const opts = OPEN_SORTED.slice(0, 25).map((x) => `<option value="${x.id}" ${x.id === a.fid ? "selected" : ""}>${x.id} · ${esc(E.ASSET[x.asset].name)}</option>`).join("");
    $("acceptCard").innerHTML = `
      <div class="card-h">Accept a delay <span class="sub">business owner signs, with the cost shown</span></div>
      <div class="accept-body">
        <div class="accept-line"><select id="accFinding" aria-label="Finding">${opts}</select><span>until</span><input type="date" id="accExpiry" value="${E.iso(exp)}" min="${E.iso(T + 1)}" aria-label="Expiry date"></div>
        <div class="accept-line"><span class="chip due" data-tip="Expected loss from today until the acceptance expires.">${money(cost)} expected through ${fmtD(exp)}</span><span class="chip">${esc(asset.owner)}</span></div>
        <textarea id="accNote" placeholder="Why is this delay acceptable, and what limits it?" aria-label="Acceptance note">${esc(a.note)}</textarea>
        <div class="accept-line"><button class="btn primary" id="accBtn">Accept delay</button><span class="msg small" id="accMsg" style="color:var(--rust-ink);font-weight:700"></span></div>
        <div class="accepted">${S.acceptances.map((x) => `<span class="chip ok">✓ ${x.fid} accepted by ${esc(x.owner)} until ${fmtD(x.expiry)}: ${money(x.cost)}</span>`).join("")}</div>
      </div>`;
  }

  // ================================================================== WHY
  function explain(fid) {
    const f = FID[fid], a = E.ASSET[f.asset], st = E.statusOn(f, T);
    const open = !f.patched;
    const parts = E.impactParts(a, T);
    const h = E.hazard(f, a, T);
    const lines = [
      ["Exploit status today", st === "kev" ? "Exploited in the wild (KEV)" : STATUS_LABEL[st]],
      ["Base chance per day", (M.hazard[st] * 100).toFixed(2) + "%"],
      ["Exposure: " + M.exposure_label[a.exposure], "× " + M.exposure[a.exposure]],
      ["Chance per day", (h * 100).toFixed(3) + "%"],
      ["Records", money(parts.records)],
      ["Downtime (" + pl(a.outage_hours_if_exploited, "hour", "hours") + ", season × " + E.seasonMult(T) + ")", money(parts.downtime)],
      ["Incident response", money(parts.incident_response)],
      ["Cost if exploited", money(E.impact(a, T))],
    ];
    if (open) lines.push(["Daily cost now", money(DAILY[fid])]);
    const due = E.dueDate(f, "current");
    let say;
    if (open) {
      const be = (E.windowCost(a, T) + M.change_labor) / DAILY[fid];
      const tip = st === "kev" && a.layer.match(/Web app|API|CMS/) ? "Patch in the next window; a WAF virtual patch tonight cuts the daily cost by 70% until then."
        : a.exposure !== "partner" && a.layer === "Appliance" ? "If the patch has to wait, restrict access to partner IP addresses first; that cuts the daily cost by 80%."
        : be > 30 ? "Keep it in the normal queue; the daily cost is small next to a maintenance window."
        : "Schedule it in the next normal window.";
      say = `${a.name} holds ${a.data.length ? a.data.map((x) => fmtInt(x.records) + " " + CLASS_SHORT[x.class]).join(" and ") : "no sensitive data"}. ` +
        `With ${st === "kev" ? "attackers already using this flaw" : st === "poc" ? "exploit code public" : "no public exploit yet"}, each day unpatched carries a ${(h * 100).toFixed(2)}% chance of exploitation. ` +
        `That makes one more day of waiting worth ${money(DAILY[fid])}. It's due ${fmtD(due)} under the current policy${due < T ? " and is already late" : ""}. ${tip}`;
    } else {
      const hr = HIST_BY_ID[fid];
      say = `Patched ${fmtD(E.dn(f.patched))}, ${pl(hr.days_late, "day", "days")} after its ${fmtD(due)} due date. Those days carried ${money(hr.cost_of_delay)} of expected loss. ${f.status_note || ""}`;
    }
    $("whyTitle").textContent = `${f.id} · ${a.name}`;
    $("whyBody").innerHTML = `<p style="margin-top:0">${esc(say)}</p>` + lines.map(([l, v]) => `<div class="mathline"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join("") +
      `<p class="faint small">Rates are fictional estimates for the demo. Findings are scored independently.</p>`;
    openDialog("whyWrap");
    log(`Why? opened for ${fid}`);
  }

  // ================================================================== CHECKS
  function checks() {
    const C = (id, name, expected, fn) => { let ok = false, actual = ""; try { [ok, actual] = fn(); } catch (e) { actual = "error: " + e.message; } return { id, name, expected, ok, actual }; };
    const calc = (fid, o) => E.calculator(fid, o);
    const d = E.dn;
    return [
      C("K1", "F-0142 cost if exploited", "$82,120,000 = $1,000,000 + $72,000,000 + $9,120,000", () => { const r = calc("F-0142", { patch: d("2026-12-08") }); const p = r.impact_parts; return [r.impact_if_exploited === 82120000 && p.incident_response === 1e6 && p.records === 72e6 && p.downtime === 9120000, `${money(r.impact_if_exploited)} = ${money(p.incident_response)} + ${money(p.records)} + ${money(p.downtime)}`]; }),
      C("K2", "F-0142 today", "$240,157 a day; window $82,000; break-even 0.34 days", () => { const r = calc("F-0142", { patch: d("2026-12-08") }); return [r.daily_cost_today === 240157 && r.window_cost === 82000 && r.break_even_days === 0.34, `${money(r.daily_cost_today)}; ${money(r.window_cost)}; ${r.break_even_days}`]; }),
      C("K3", "F-0142 wait to Dec 8", "11.0%; $8,852,240", () => { const r = calc("F-0142", { patch: d("2026-12-08") }); return [r.chance_by_patch === 0.1104 && r.expected_loss_waiting === 8852240, `${pct(r.chance_by_patch)}; ${money(r.expected_loss_waiting)}`]; }),
      C("K4", "F-0142 patch Nov 3", "$956,322", () => { const r = calc("F-0142", { patch: d("2026-11-03") }); return [r.expected_loss_waiting === 956322, money(r.expected_loss_waiting)]; }),
      C("K5", "F-0142 virtual patch, wait to Dec 8", "3.7%; $2,927,629", () => { const r = calc("F-0142", { patch: d("2026-12-08"), mit: { kind: "waf", start: T + 1 } }); return [r.chance_by_patch === 0.0365 && r.expected_loss_waiting === 2927629, `${pct(r.chance_by_patch)}; ${money(r.expected_loss_waiting)}`]; }),
      C("K6", "F-0118 to Dec 10, then allowlist", "$4,580,603 → $1,054,394", () => { const a = calc("F-0118", { patch: d("2026-12-10") }), b = calc("F-0118", { patch: d("2026-12-10"), mit: { kind: "allowlist", start: T + 1 } }); return [a.expected_loss_waiting === 4580603 && b.expected_loss_waiting === 1054394, `${money(a.expected_loss_waiting)} → ${money(b.expected_loss_waiting)}`]; }),
      C("K7", "F-0031 microsite", "$443 a day; $12,734 over 30 days; impact $261,000", () => { const r = calc("F-0031", { patch: T + 30 }); return [r.daily_cost_today === 443 && r.expected_loss_waiting === 12734 && r.impact_if_exploited === 261000, `${money(r.daily_cost_today)}; ${money(r.expected_loss_waiting)}; ${money(r.impact_if_exploited)}`]; }),
      C("K8", "F-0151 VPN, then assume exploited", "$19,032 → $285,078 a day; $739,427 → $10,508,016", () => { const a = calc("F-0151", { patch: d("2026-12-08") }), b = calc("F-0151", { patch: d("2026-12-08"), assumeKev: true }); return [a.daily_cost_today === 19032 && b.daily_cost_today === 285078 && a.expected_loss_waiting === 739427 && b.expected_loss_waiting === 10508016, `${money(a.daily_cost_today)} → ${money(b.daily_cost_today)}; ${money(a.expected_loss_waiting)} → ${money(b.expected_loss_waiting)}`]; }),
      C("K9", "Edge today", "16 assets, 83 open, 9 past due, 3 KEV; $786,621 a day; top two 45.6%", () => { const s = E.summary(); return [s.assets === 16 && s.open === 83 && s.past_due === 9 && s.kev_open === 3 && s.daily_cost_today === 786621 && s.top2_share === 0.456, `${s.assets}, ${s.open}, ${s.past_due}, ${s.kev_open}; ${money(s.daily_cost_today)}; ${pct(s.top2_share)}`]; }),
      C("K10", "History, last 12 months", "117 closed, 43 late; Critical 1 of 10, median 42; $19,020,393; freeze $11,140,342 (58.6%); F-0004 $7,838,565", () => { const h = E.history(), c = h.by_severity.Critical, f4 = h.per_finding.find((x) => x.id === "F-0004"); return [h.closed === 117 && h.late === 43 && c.on_time === 1 && c.count === 10 && c.median_days === 42 && h.total === 19020393 && h.freeze_cost === 11140342 && h.freeze_share === 0.586 && f4.cost_of_delay === 7838565, `${h.closed}, ${h.late}; ${c.on_time} of ${c.count}, ${c.median_days}; ${money(h.total)}; ${money(h.freeze_cost)} (${pct(h.freeze_share)}); ${money(f4.cost_of_delay)}`]; }),
      C("K11", "Forecast, 90 days", "Current $44,302,715 ($17,091,038 past SLA); Proposed $27,508,910, 7 changes, $348,000; + virtual patch $23,814,014, 31 rules, $394,500; current range $22,684,385 – $84,750,880", () => { const f = E.forecast(), lo = E.forecast(0.5), hi = E.forecast(2); const ok = f.current.expected_loss === 44302715 && f.current.past_sla === 17091038 && f.proposed.expected_loss === 27508910 && f.proposed.emergency_changes === 7 && f.proposed.policy_cost === 348000 && f.proposed_waf.expected_loss === 23814014 && f.proposed_waf.waf_rules === 31 && f.proposed_waf.policy_cost === 394500 && lo.current.expected_loss === 22684385 && hi.current.expected_loss === 84750880; return [ok, `${money(f.current.expected_loss)} (${money(f.current.past_sla)}); ${money(f.proposed.expected_loss)}, ${f.proposed.emergency_changes}, ${money(f.proposed.policy_cost)}; ${money(f.proposed_waf.expected_loss)}, ${f.proposed_waf.waf_rules}, ${money(f.proposed_waf.policy_cost)}; ${money(lo.current.expected_loss)} – ${money(hi.current.expected_loss)}`]; }),
      C("K12", "Ordering, 21 findings, 3 a week, 30 days", "CVSS order $6,641,772; cost order $3,885,765", () => { const o = E.ordering(); return [o.pool === 21 && o.cvss_order === 6641772 && o.cost_order === 3885765, `${o.pool}; ${money(o.cvss_order)}; ${money(o.cost_order)}`]; }),
      C("K13", "Everything patched today", "$0 expected loss; \"Nothing waiting\"", () => { const tot = E.openFindings().reduce((s, f) => s + E.calculator(f.id, { patch: T }).expected_loss_waiting, 0); return [tot === 0, money(tot) + (tot === 0 ? "; Nothing waiting" : "")]; }),
      C("K14", "Approvals and grammar", "CISO only; last editor can't approve; board after CISO; note required; 0 and 1 read correctly", () => {
        const m0 = { state: "drafted", editedBy: "ciso", ciso: null };
        const ok = RULES.canCisoApprove(m0, "vuln") && RULES.canCisoApprove(m0, "ciso") && !RULES.canCisoApprove({ state: "drafted", editedBy: "vuln" }, "ciso") &&
          RULES.canBoardApprove({ ciso: null }, "cio") && RULES.canBoardApprove({ ciso: 1 }, "cfo") && !RULES.canBoardApprove({ ciso: 1 }, "cio") &&
          RULES.canAccept("owner", "  ") && RULES.canAccept("vuln", "ok") && !RULES.canAccept("owner", "Compensating control in place");
        const g = [pl(1, "finding", "findings"), pl(0, "day", "days"), pl(1, "emergency change", "emergency changes"), pl(2, "hour", "hours"), breakEvenText(0.34), breakEvenText(1 / 24)];
        const gok = g.join("|") === "1 finding|0 days|1 emergency change|2 hours|8 hours|1 hour";
        return [ok && gok, (ok ? "rules hold" : "rule failed") + "; " + g.join(", ")];
      }),
    ];
  }
  function renderChecks() {
    const r = checks();
    const pass = r.filter((x) => x.ok).length;
    $("checkCount").textContent = `${pass}/${r.length}`;
    $("checkCount").classList.toggle("bad", pass !== r.length);
    $("checksSub").textContent = `${pass} of ${r.length} pass`;
    $("checksList").innerHTML = r.map((x) => `<div class="ck"><span class="id">${x.id}</span><span class="nm">${esc(x.name)}</span><span class="res"><span class="chip ${x.ok ? "ok" : "due"}">${x.ok ? "Pass" : "Fail"}</span></span>
      <span class="ex"><b>Expected</b> ${esc(x.expected)}<br><b>Actual</b> ${esc(x.actual)}</span></div>`).join("");
    return r;
  }

  // ================================================================== log, sheets, dialogs, tooltips
  function renderLog() {
    $("logCount").textContent = S.log.length;
    $("logList").innerHTML = S.log.map((l) => `<li class="${l.kind}"><div>${esc(l.what)}</div><div class="w">${l.t} · ${esc(l.who)}</div></li>`).join("") || `<li class="empty">Nothing yet.</li>`;
  }
  function openSheet(id) { document.querySelectorAll(".sheet").forEach((s) => { const on = s.id === id && !s.classList.contains("open"); s.classList.toggle("open", on); s.setAttribute("aria-hidden", !on); }); }
  function openDialog(id) { $(id).classList.add("open"); $(id).setAttribute("aria-hidden", "false"); setTimeout(() => $(id).querySelector("button[data-close]").focus(), 30); }
  function closeAll() {
    document.querySelectorAll(".sheet.open").forEach((s) => { s.classList.remove("open"); s.setAttribute("aria-hidden", "true"); });
    document.querySelectorAll(".dialog-wrap.open").forEach((d) => { d.classList.remove("open"); d.setAttribute("aria-hidden", "true"); });
    hideTip();
  }
  function placeTip(cx, cy) {
    const tip = $("tip");
    tip.classList.add("show");
    const r = tip.getBoundingClientRect();
    let x = cx + 14, y = cy + 16;
    if (x + r.width > innerWidth - 8) x = cx - r.width - 14;
    if (y + r.height > innerHeight - 40) y = cy - r.height - 12;
    tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
  }
  function showTipFor(el) {
    const t = el.dataset.tip; if (!t) return;
    $("tip").textContent = t;
    const r = el.getBoundingClientRect();
    placeTip(r.left + Math.min(r.width / 2, 40), r.bottom - 6);
  }
  function hideTip() { $("tip").classList.remove("show"); }

  // ================================================================== events
  function bind() {
    $("persona").innerHTML = PERSONAS.map((p) => `<option value="${p.id}">${p.label}</option>`).join("");
    document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.goto)));
    $("persona").addEventListener("change", (e) => { S.persona = e.target.value; log("Switched to " + personaLabel(S.persona)); });
    $("btnLog").addEventListener("click", () => openSheet("logSheet"));
    $("btnChecks").addEventListener("click", () => { renderChecks(); openSheet("checksSheet"); log("Ran the known-answer checks"); });
    $("rerunChecks").addEventListener("click", () => { const r = renderChecks(); toast(`${r.filter((x) => x.ok).length} of ${r.length} checks pass`); });
    $("btnPresenter").addEventListener("click", togglePresenter);
    $("btnReset").addEventListener("click", reset);
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-close]"); if (t) { closeAll(); return; }
      if (e.target.classList && e.target.classList.contains("dialog-wrap")) { closeAll(); return; }
      const w = e.target.closest("[data-why]"); if (w) { explain(w.dataset.why); return; }
      const c = e.target.closest("[data-calc]"); if (c) { S.calc = calcDefaults(c.dataset.calc); setView("calc"); log("Opened " + c.dataset.calc + " in the calculator"); return; }
      const tile = e.target.closest(".tile"); if (tile) { S.asset = tile.dataset.asset; document.querySelectorAll(".tile").forEach((x) => x.classList.toggle("sel", x === tile)); renderAssetDrawer(); return; }
      const fb = e.target.closest("[data-filter]"); if (fb) { S.edgeFilter = fb.dataset.filter; renderEdge(); return; }
      const bar = e.target.closest("[data-month]"); if (bar) { S.month = bar.dataset.month; renderMonthChart(); renderMonthDrawer(); return; }
      const q = e.target.closest("[data-patch]"); if (q) { S.calc.patch = +q.dataset.patch; $("patchSlider").value = S.calc.patch; updatePatchUi(); logPatch(); return; }
      const ex = e.target.closest("[data-expo]"); if (ex) { S.calc.exposure = ex.dataset.expo; if (S.calc.exposure === "partner" && S.calc.control === "allowlist") S.calc.control = "none"; renderCalc(); log(`Calculator: exposure set to ${EXPO_SHORT[S.calc.exposure]}`); return; }
      const ct = e.target.closest("[data-ctl]"); if (ct && !ct.disabled) { S.calc.control = ct.dataset.ctl; renderCalc(); log(`Calculator: control set to ${ct.textContent}`); return; }
      const sc = e.target.closest("[data-sc]"); if (sc) { S.scenario = sc.dataset.sc; renderForecast(); log("Forecast: " + SC[S.scenario].label); return; }
      const od = e.target.closest("[data-order]"); if (od) { S.order = od.dataset.order; renderDecide(); log("Queue ordered " + (S.order === "cost" ? "by cost" : "by CVSS")); return; }
      const id = e.target.id;
      if (id === "memoDraft") { S.memo = Object.assign(S.memo, { state: "drafted", text: draftMemo() }); renderMemo(); log("Memo drafted (simulated AI)"); toast("Memo drafted"); }
      else if (id === "memoEdit") { S.memo.editing = true; renderMemo(); $("memoText").focus(); }
      else if (id === "memoCancel") { S.memo.editing = false; renderMemo(); }
      else if (id === "memoSave") { S.memo.text = $("memoText").value; S.memo.editing = false; S.memo.editedBy = S.persona; S.memo.ciso = null; S.memo.state = "edited"; renderMemo(); log("Memo edited"); }
      else if (id === "memoCiso") { const why = RULES.canCisoApprove(S.memo, S.persona); if (why) { $("memoMsg").textContent = why; log("Blocked: memo approval. " + why, "block"); } else { S.memo.ciso = clock(); S.memo.state = "ciso"; renderMemo(); log("Memo approved by the CISO", "approve"); toast("CISO approved"); } }
      else if (id === "memoBoard") { const why = RULES.canBoardApprove(S.memo, S.persona); if (why) { $("memoMsg").textContent = why; log("Blocked: change board approval. " + why, "block"); } else { S.memo.board = clock(); S.memo.state = "board"; renderMemo(); renderHero(); log("Emergency lane approved by the change board", "approve"); toast("Emergency lane approved"); } }
      else if (id === "memoDl") { const blob = new Blob([S.memo.text + "\n\n---\nFor demo purposes only. All data is fictional and does not represent any organization. · Built by Aby Rao\n"], { type: "text/markdown" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "BC-05_decision_memo.md"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); log("Memo downloaded"); }
      else if (id === "memoPrint") { log("Memo printed"); window.print(); }
      else if (id === "accBtn") {
        const why = RULES.canAccept(S.persona, $("accNote").value);
        if (why) { $("accMsg").textContent = why; log("Blocked: risk acceptance. " + why, "block"); return; }
        const f = FID[S.accept.fid], exp = E.dn($("accExpiry").value);
        const cost = Math.round(E.loss(f, T, exp));
        S.acceptances = S.acceptances.filter((x) => x.fid !== f.id).concat({ fid: f.id, owner: E.ASSET[f.asset].owner, expiry: exp, cost, note: $("accNote").value });
        S.accept.note = ""; renderAccept();
        log(`Delay accepted for ${f.id} until ${fmtD(exp)}: ${money(cost)} expected. Note: ${S.acceptances[S.acceptances.length - 1].note}`, "approve");
        toast("Delay accepted");
      }
    });
    document.addEventListener("keydown", (e) => {
      const el = e.target;
      if (e.key === "Escape") { closeAll(); return; }
      if ((e.key === "Enter" || e.key === " ") && el.dataset && el.dataset.month) { e.preventDefault(); el.dispatchEvent(new MouseEvent("click", { bubbles: true })); return; }
      if (/input|textarea|select/i.test(el.tagName)) return;
      if (e.key >= "1" && e.key <= "5") setView(["edge", "delay", "calc", "forecast", "decide"][+e.key - 1]);
      if (e.key === "p" || e.key === "P") togglePresenter();
    });
    $("calcFinding").addEventListener("change", (e) => { S.calc = calcDefaults(e.target.value); renderCalc(); log("Calculator: picked " + e.target.value); });
    $("patchSlider").addEventListener("input", (e) => { S.calc.patch = +e.target.value; updatePatchUi(); logPatch(); });
    $("assumeKev").addEventListener("change", (e) => { S.calc.assumeKev = e.target.checked; renderCalc(); log(`Calculator: assume exploited ${e.target.checked ? "on" : "off"}`); });
    $("bizFields").addEventListener("change", (e) => {
      const k = e.target.dataset.ov; if (!k) return;
      const v = Math.max(0, +e.target.value || 0);
      S.calc.overrides[k] = v; renderCalcOutputs(); log(`Calculator: ${e.target.closest("label").querySelector("span").textContent.toLowerCase()} set to ${fmtInt(v)}`);
    });
    $("bandToggle").addEventListener("change", (e) => { S.band = e.target.checked; renderFcChart(); });
    document.addEventListener("change", (e) => {
      if (e.target.id === "accFinding") { S.accept.fid = e.target.value; S.accept.expiry = null; renderAccept(); }
      if (e.target.id === "accExpiry" && e.target.value) { S.accept.expiry = E.dn(e.target.value); renderAccept(); }
    });
    document.addEventListener("input", (e) => { if (e.target.id === "accNote") S.accept.note = e.target.value; });
    // tooltips on hover and keyboard focus
    document.addEventListener("mouseover", (e) => { const el = e.target.closest("[data-tip]"); if (el) showTipFor(el); });
    document.addEventListener("mouseout", (e) => { const el = e.target.closest("[data-tip]"); if (el && !el.contains(e.relatedTarget)) hideTip(); });
    document.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip]"); if (el) showTipFor(el); else hideTip(); });
    document.addEventListener("focusout", hideTip);
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(renderView, 120); });
    setInterval(tickHero, 250);
  }
  function togglePresenter() {
    document.body.classList.toggle("presenter");
    log("Presenter mode " + (document.body.classList.contains("presenter") ? "on" : "off"));
    setTimeout(renderView, 60);
  }
  function reset() {
    const persona = S.persona;
    S = fresh(); S.persona = persona;
    closeAll(); renderHero(); renderLog(); setView("edge");
    log("Reset: data restored; edits, decisions and approvals cleared");
    toast("Reset");
  }

  bind();
  renderHero(); renderLog();
  const r = renderChecks();
  setView("edge");
  log(`Opened with ${pl(SUM.open, "open finding", "open findings")}; ${r.filter((x) => x.ok).length} of ${r.length} checks pass`);
  window.BC05App = { state: () => S, checks, setView, E, RULES, pl, breakEvenText };
})();
