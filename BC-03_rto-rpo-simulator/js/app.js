/* BC-03 RTO and RPO tabletop simulator: views, simulation clock, decisions, approvals. */
(function () {
  "use strict";
  const T = window.BC03.topology, SCEN = window.BC03.scenarios, E = window.Engine;
  const BY = {}; T.nodes.forEach((n) => { BY[n.id] = n; });
  const SVCS = E.serviceIds(T);
  const WHATIFS = T.whatifs;
  const STATIC = E.staticChecks(T);
  const TODAY = "2026-10-27";

  // ---------------------------------------------------------------- helpers
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const r1 = (x) => Math.round(x * 10) / 10;
  function plural(n, word, pl) { return `${n.toLocaleString("en-US")} ${n === 1 ? word : (pl || word + "s")}`; }
  function fmtH(h) {
    if (h === null || h === undefined) return "–";
    if (h === 0) return "0 h";
    if (h < 1) return `${Math.round(h * 60)} min`;
    return `${Math.round(h * 100) / 100} h`;
  }
  function money(n) {
    if (n >= 1e7) return "$" + r1(n / 1e6) + "M";
    if (n >= 1e6) return "$" + (Math.round(n / 1e4) / 100) + "M";
    if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
    return "$" + Math.round(n);
  }
  function bigNum(n) {
    if (n >= 1e6) return r1(n / 1e6) + "M";
    if (n >= 1e4) return Math.round(n / 1e3) + "K";
    return n.toLocaleString("en-US");
  }
  const name = (id) => (BY[id] ? BY[id].name : id);
  const SITE_LABEL = { DC1: "Primary DC", DC2: "Secondary DC", CE: "Cloud East", CW: "Cloud West", SaaS: "SaaS", EXT: "Third party", LOGICAL: "Business service" };

  // ---------------------------------------------------------------- people
  const PERSONAS = [
    { id: "facilitator", name: "Aby Rao", role: "Facilitator" },
    { id: "continuity", name: "Dana Whitfield", role: "Continuity lead" },
    { id: "payments", name: "Marcus Lee", role: "Head of Payments" },
    { id: "cards", name: "Elena Ruiz", role: "Head of Cards" },
    { id: "ciso", name: "Priya Natarajan", role: "CISO" },
  ];
  const persona = () => PERSONAS.find((p) => p.id === S.persona);
  const who = () => `${persona().name} (${persona().role})`;

  // pure rules (also exercised by the checks panel)
  const Rules = {
    canApproveMemo(memo, personaId) {
      if (!memo) return { ok: false, why: "Draft a memo first." };
      if (personaId !== "continuity") return { ok: false, why: "Only the continuity lead can approve the memo." };
      if (memo.lastEditor === personaId) return { ok: false, why: "You edited it last. Someone else must approve." };
      return { ok: true };
    },
    validateGap(svcId, personaId, reason, review) {
      const p = PERSONAS.find((x) => x.id === personaId), owner = BY[svcId].owner;
      if (!p || p.role !== owner) return { ok: false, why: `Only the service owner (${owner}) can accept this gap.` };
      if (!reason || reason.trim().length < 8) return { ok: false, why: "Add a reason (at least a short sentence)." };
      if (!review) return { ok: false, why: "Add a review date." };
      const days = (new Date(review) - new Date(TODAY)) / 864e5;
      if (!(days > 0 && days <= 90)) return { ok: false, why: "Review date must be within the next 90 days." };
      return { ok: true };
    },
  };

  // ---------------------------------------------------------------- state
  let S;
  function fresh() {
    return {
      view: "map", persona: "facilitator", focus: null, lens: "all",
      scenarioId: null, custom: false, seeds: [], start: "Fri 07:00", peak: false,
      run: null, rows: null, clock: 0, maxClock: 72, playing: false, speed: 4, revealing: false, revealed: new Set(),
      selSvc: null, whatifs: new Set(), failClosed: false, workarounds: {}, determined: null,
      gaps: {}, memo: null, log: [], notes: {}, scatterK: "rto", targetTile: "paper", decisions: [],
    };
  }
  S = fresh();

  // ---------------------------------------------------------------- toast, tooltip, log
  let toastTimer;
  function toast(msg, warn) {
    const t = $("#toast"); t.textContent = msg; t.className = "toast show" + (warn ? " warn" : "");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = "toast"; }, 2600);
  }
  const tip = $("#tip");
  function showTip(target) {
    const txt = target.getAttribute("data-tip"); if (!txt) return;
    tip.innerHTML = txt; tip.classList.add("show");
    const r = target.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2, y = r.bottom + 8;
    if (y + th > innerHeight - 44) y = r.top - th - 8;
    x = Math.max(8, Math.min(innerWidth - tw - 8, x));
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  const hideTip = () => tip.classList.remove("show");
  document.addEventListener("mouseover", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) showTip(t); });
  document.addEventListener("mouseout", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) hideTip(); });
  document.addEventListener("focusin", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) showTip(t); });
  document.addEventListener("focusout", hideTip);

  function clockLabel() { return S.run ? `h${r1(S.clock)}` : "—"; }
  function log(text) {
    S.log.unshift({ t: clockLabel(), who: who(), text });
    $("#logCount").textContent = S.log.length;
    renderLog();
  }
  function renderLog() {
    $("#logList").innerHTML = S.log.length ? S.log.map((l) => `<div class="log-item"><div class="t">${esc(l.t)}</div><div><b>${esc(l.who)}</b><br>${esc(l.text)}</div></div>`).join("")
      : `<div class="log-item"><div class="t">—</div><div class="muted">Nothing yet. Runs, decisions and approvals appear here.</div></div>`;
  }

  // ---------------------------------------------------------------- map
  const mapHost = document.createElement("div");
  mapHost.className = "map-host";
  mapHost.innerHTML = `<svg id="mapSvg" xmlns="http://www.w3.org/2000/svg"></svg>
    <div class="map-legend" id="mapLegend"></div>
    <div class="map-controls">
      <button class="btn sm" id="zIn" data-tip="Zoom in">+</button>
      <button class="btn sm" id="zOut" data-tip="Zoom out">−</button>
      <button class="btn sm" id="zFit" data-tip="Fit the whole map">Fit</button>
    </div>`;
  const svg = mapHost.querySelector("#mapSvg");
  const M = Layout.build(T, svg);
  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
  M.root.insertBefore(overlay, M.root.children[2]);
  const overlayTop = document.createElementNS("http://www.w3.org/2000/svg", "g");
  M.root.appendChild(overlayTop);
  let vb = { x: 0, y: 0, w: M.L.width, h: M.L.height };
  const setVB = () => svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  function fit() { vb = { x: 0, y: 0, w: M.L.width, h: M.L.height }; setVB(); }
  function zoom(f, cx, cy) {
    const nw = Math.max(M.L.width * 0.25, Math.min(M.L.width * 1.4, vb.w * f)), nh = nw * (vb.h / vb.w);
    cx = cx === undefined ? vb.x + vb.w / 2 : cx; cy = cy === undefined ? vb.y + vb.h / 2 : cy;
    vb.x = cx - (cx - vb.x) * (nw / vb.w); vb.y = cy - (cy - vb.y) * (nh / vb.h); vb.w = nw; vb.h = nh; setVB();
  }
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = svg.getBoundingClientRect(), s = Math.max(vb.w / r.width, vb.h / r.height);
    const ox = (r.width - vb.w / s) / 2, oy = (r.height - vb.h / s) / 2;
    zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, vb.x + (e.clientX - r.left - ox) * s, vb.y + (e.clientY - r.top - oy) * s);
  }, { passive: false });
  let drag = null;
  svg.addEventListener("mousedown", (e) => { if (e.target.closest(".node")) return; drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y }; svg.classList.add("dragging"); });
  window.addEventListener("mousemove", (e) => {
    if (!drag) return;
    const r = svg.getBoundingClientRect(), s = Math.max(vb.w / r.width, vb.h / r.height);
    vb.x = drag.vx - (e.clientX - drag.x) * s; vb.y = drag.vy - (e.clientY - drag.y) * s; setVB();
  });
  window.addEventListener("mouseup", () => { drag = null; svg.classList.remove("dragging"); });
  mapHost.querySelector("#zIn").onclick = () => zoom(1 / 1.25);
  mapHost.querySelector("#zOut").onclick = () => zoom(1.25);
  mapHost.querySelector("#zFit").onclick = fit;

  function closureOf(id, hardOnly) {
    const acc = new Set([id]);
    (function walk(x) {
      BY[x].deps.forEach((g) => (typeof g === "string" ? [g] : g.any).forEach((m) => { if (!acc.has(m)) { acc.add(m); walk(m); } }));
      if (!hardOnly) (BY[x].soft || []).forEach((m) => { if (!acc.has(m)) { acc.add(m); } });
    })(id);
    return acc;
  }
  const directDependents = (id) => T.nodes.filter((n) => n.deps.some((g) => (typeof g === "string" ? g === id : g.any.indexOf(id) >= 0)) || (n.soft || []).indexOf(id) >= 0).map((n) => n.id);

  function applyHighlight() {
    const inSim = S.view === "simulate";
    let set = null;
    if (!inSim && S.focus) set = closureOf(S.focus);
    else if (!inSim && S.lens !== "all") set = new Set(T.nodes.filter((n) => (S.lens === "EXT" ? n.site === "EXT" : n.site === S.lens)).map((n) => n.id));
    T.nodes.forEach((n) => {
      const g = M.nodeEls[n.id].g;
      g.classList.toggle("dim", !!set && !set.has(n.id));
      g.classList.toggle("lit", !!set && !!S.focus && set.has(n.id) && !inSim);
    });
    M.edges.forEach((e) => {
      const tos = Array.isArray(e.to) ? e.to : [e.to];
      const on = set && set.has(e.from) && tos.some((t) => set.has(t));
      e.el.classList.toggle("dim", !!set && !on);
      e.el.classList.toggle("lit", !!(set && on && S.focus) && (e.kind !== "fork" && e.kind !== "forklabel"));
    });
  }
  function legend() {
    const lg = $("#mapLegend");
    if (S.view === "simulate") {
      lg.innerHTML = `<span class="lg"><i style="background:var(--coral)"></i>Down</span><span class="lg"><i style="background:var(--gold)"></i>Failover or restore</span><span class="lg"><i style="background:var(--blue)"></i>Waiting on a prerequisite</span><span class="lg"><i style="background:var(--teal)"></i>Back up</span><span class="lg"><i style="background:var(--accent)"></i>Critical path</span>`;
    } else {
      lg.innerHTML = `<span class="lg"><i class="line"></i>Needs</span><span class="lg"><i class="dash"></i>Uses if up</span><span class="lg" data-tip="Either-or: the first is primary; the label is the switchover time.">◇ Either-or (sw = switch time)</span><span class="lg"><i style="background:var(--teal);border-radius:50%"></i>Tested</span><span class="lg"><i style="background:var(--gold);border-radius:50%"></i>Test over 12 months</span><span class="lg"><i style="background:var(--coral);border-radius:50%"></i>Never tested</span>`;
    }
  }

  // node interactions
  T.nodes.forEach((n) => {
    const g = M.nodeEls[n.id].g;
    g.addEventListener("click", (e) => { e.stopPropagation(); onNodeClick(n.id); });
    g.addEventListener("keydown", (e) => { if (e.key === "Enter") onNodeClick(n.id); });
    g.addEventListener("mouseenter", () => { if (S.view === "map" && n.lane === "Business services" && !S.pinnedFocus) { S.focus = n.id; applyHighlight(); markSvcList(); } });
    g.addEventListener("mouseleave", () => { if (S.view === "map" && !S.pinnedFocus) { S.focus = null; applyHighlight(); markSvcList(); } });
  });
  function onNodeClick(id) {
    if (S.view === "simulate" && BY[id].lane === "Business services" && S.run) { S.selSvc = id; renderSim(true); return; }
    openDrawer(id);
  }

  // ---------------------------------------------------------------- views
  function setView(v) {
    S.view = v;
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === v));
    $$(".view").forEach((s) => s.classList.toggle("active", s.id === "view-" + v));
    if (v === "map") { $("#mapSlotMap").appendChild(mapHost); svg.classList.add("flowing"); }
    if (v === "simulate") { $("#mapSlotSim").appendChild(mapHost); svg.classList.remove("flowing"); }
    legend();
    if (v === "map") { clearSimClasses(); applyHighlight(); renderMapSide(); }
    if (v === "targets") renderTargets();
    if (v === "simulate") { applyHighlight(); renderSim(true); }
    if (v === "impact") renderImpact();
    if (v === "decide") renderDecide();
    hideTip();
  }
  $$(".tab").forEach((t) => { t.onclick = () => setView(t.dataset.view); });

  // ---------- MAP VIEW
  function markSvcList() { $$("#svcList .svc-item").forEach((li) => li.classList.toggle("active", li.dataset.id === S.focus)); }
  function renderMapSide() {
    $("#svcList").innerHTML = SVCS.map((id) => {
      const n = BY[id], p = STATIC.paper.find((x) => x.id === id), miss = p.paper > n.rto;
      return `<li class="svc-item" data-id="${id}" tabindex="0" data-tip="<b>${esc(n.name)}</b><br>${esc(n.customers)} · ${money(n.revenue_per_hour)} an hour at risk${miss ? `<br>Chain can't meet ${fmtH(n.rto)}: worst target below it is ${fmtH(p.paper)}.` : ""}">
        <span class="nm">${esc(n.name)}</span><span class="mono">${fmtH(n.rto)} · ${fmtH(n.rpo)}</span>${miss ? `<span class="chip accent">chain ${fmtH(p.paper)}</span>` : `<span class="chip ok">holds</span>`}</li>`;
    }).join("");
    $$("#svcList .svc-item").forEach((li) => {
      li.onmouseenter = () => { if (!S.pinnedFocus) { S.focus = li.dataset.id; applyHighlight(); markSvcList(); } };
      li.onmouseleave = () => { if (!S.pinnedFocus) { S.focus = null; applyHighlight(); markSvcList(); } };
      li.onclick = () => {
        if (S.pinnedFocus === li.dataset.id) { S.pinnedFocus = null; S.focus = null; }
        else { S.pinnedFocus = li.dataset.id; S.focus = li.dataset.id; S.lens = "all"; renderLens(); }
        applyHighlight(); markSvcList();
      };
    });
    markSvcList(); renderLens();
  }
  function renderLens() {
    const opts = [["all", "All"], ["DC1", "Primary DC"], ["DC2", "Secondary DC"], ["CE", "Cloud East"], ["CW", "Cloud West"], ["SaaS", "SaaS"], ["EXT", "Third parties"]];
    $("#siteToggles").innerHTML = opts.map(([k, l]) => `<button class="tg ${S.lens === k ? "on" : ""}" data-k="${k}">${l}</button>`).join("");
    $$("#siteToggles .tg").forEach((b) => { b.onclick = () => { S.lens = b.dataset.k; S.pinnedFocus = null; S.focus = null; renderLens(); applyHighlight(); markSvcList(); }; });
  }

  // ---------- TARGETS VIEW
  function renderTargets() {
    const misses = STATIC.paperMisses.length;
    const tiles = [
      { k: "paper", hero: true, label: "Miss on paper", value: `${misses}<small>of ${SVCS.length}</small>`, note: "services promise more than their chain", tip: "Paper RTO: the worst target RTO on a service's dependency chain. If it's longer than the service's own target, the target can't hold even before anything is tested." },
      { k: "inv", label: "Target inversions", value: STATIC.inversions.length, note: "a dependency slower than its user", tip: "An asset whose direct dependency has a longer target RTO, or an either-or group whose switchover is longer than the user's target." },
      { k: "untested", label: "Untested", value: STATIC.untested.length, note: "never, or over 12 months ago", tip: "Assets we recover ourselves with no restore test, or a last test before October 2025." },
      { k: "spof", label: "Single points", value: STATIC.spof.length, note: "one outage breaks a service target", tip: "The engine fails each asset on its own (outage mode). Listed if any service then misses its RTO." },
    ];
    $("#targetTiles").innerHTML = tiles.map((t) => `<button class="card tile ${t.hero ? "hero" : ""} ${S.targetTile === t.k ? "selected" : ""}" data-k="${t.k}"><div class="label">${t.label} <span class="why" data-tip="${esc(t.tip)}" tabindex="0">Why?</span></div><div class="value">${t.value}</div><div class="note">${t.note}</div></button>`).join("");
    $$("#targetTiles .tile").forEach((b) => { b.onclick = () => { S.targetTile = b.dataset.k; renderTargets(); }; });
    renderDumbbell(); renderScatter(); renderTargetList();
  }
  function logScale(min, max, a, b) {
    const l0 = Math.log(min), l1 = Math.log(max);
    return (v) => a + (Math.log(Math.max(min, Math.min(max, v))) - l0) / (l1 - l0) * (b - a);
  }
  function renderDumbbell() {
    const box = $("#dumbbell"), W = box.clientWidth - 24, H = box.clientHeight - 16;
    if (W < 50) return;
    const rows = STATIC.paper.slice().sort((a, b) => (b.paper - b.rto) - (a.paper - a.rto));
    const L = 170, R = W - 120, top = 26, rh = Math.min(46, (H - top - 30) / rows.length);
    const x = logScale(0.75, 64, L, R);
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    let lastX = -99;
    [1, 2, 4, 8, 24, 48].forEach((t) => { if (x(t) - lastX < 34) return; lastX = x(t); s += `<line class="gridl" x1="${x(t)}" x2="${x(t)}" y1="${top - 6}" y2="${top + rh * rows.length}"/><text class="ax" x="${x(t)}" y="${top - 10}" text-anchor="middle">${t} h</text>`; });
    rows.forEach((r, i) => {
      const y = top + rh * i + rh / 2, miss = r.paper > r.rto, via = r.path.length > 1 ? r.path[r.path.length - 1] : null;
      s += `<g data-tip="<b>${esc(r.name)}</b><br>Target ${fmtH(r.rto)}. ${miss ? `Its chain can't recover faster than ${fmtH(r.paper)}, set by ${esc(name(via))}: ${r.path.map((p) => esc(name(p))).join(" → ")}` : "Its chain can meet the target."}" style="cursor:pointer" data-svc="${r.id}">`;
      s += `<rect x="0" y="${y - rh / 2}" width="${W}" height="${rh}" fill="transparent"/>`;
      s += `<text class="rowl" x="${L - 14}" y="${y + 5}" text-anchor="end">${esc(r.name)}</text>`;
      if (miss) s += `<line x1="${x(r.rto)}" x2="${x(r.paper)}" y1="${y}" y2="${y}" stroke="#7B2CBF" stroke-width="4" stroke-linecap="round" opacity=".35"/>`;
      s += `<circle cx="${x(r.rto)}" cy="${y}" r="8" fill="#2A9D8F"/>`;
      if (miss) s += `<circle cx="${x(r.paper)}" cy="${y}" r="9" fill="#7B2CBF"/><text class="val" x="${x(r.paper) + 14}" y="${y + 4}">${esc(Layout.SHORT[via] || name(via))}</text>`;
      else s += `<text class="val" x="${x(r.rto) + 14}" y="${y + 4}" fill="#1F7A6F">holds</text>`;
      s += `</g>`;
    });
    s += `<g transform="translate(${L},${H - 2})"><circle cx="0" cy="-4" r="6" fill="#2A9D8F"/><text class="ax" x="10" y="0">service target</text><circle cx="130" cy="-4" r="6" fill="#7B2CBF"/><text class="ax" x="140" y="0">slowest target on its chain</text></g>`;
    box.innerHTML = s + "</svg>";
    $$("[data-svc]", box).forEach((g) => { g.onclick = () => openDrawer(g.dataset.svc); });
  }
  function renderScatter() {
    $$("#scatterSeg button").forEach((b) => b.classList.toggle("on", b.dataset.k === S.scatterK));
    const rto = S.scatterK === "rto";
    $("#scatterTitle").textContent = rto ? "Target RTO vs tested restore" : "Target RPO vs last good backup";
    const box = $("#scatter"), W = box.clientWidth - 24, H = box.clientHeight - 16;
    if (W < 50) return;
    const pts = T.nodes.filter((n) => n.lane !== "Business services" && !n.vendor && (rto ? (n.restore_h && n.rto != null) : (n.data && n.rpo != null && n.backup_age_h)))
      .map((n) => ({ id: n.id, x: rto ? n.rto : n.rpo, y: rto ? n.restore_h : n.backup_age_h }));
    const L = 54, B = H - 40, Tp = 14, R = W - 14;
    const xmin = rto ? 0.75 : 0.03, xmax = 64, ymin = rto ? 1.5 : 0.75, ymax = 64;
    const x = logScale(xmin, xmax, L, R), y = logScale(ymin, ymax, B, Tp);
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    const ticks = rto ? [1, 2, 4, 8, 24, 48] : [0.05, 0.25, 1, 4, 24];
    ticks.forEach((t) => { s += `<line class="gridl" x1="${x(t)}" x2="${x(t)}" y1="${Tp}" y2="${B}"/><text class="ax" x="${x(t)}" y="${B + 18}" text-anchor="middle">${fmtH(t)}</text>`; });
    [2, 4, 8, 16, 32].forEach((t) => { if (t >= ymin) s += `<line class="gridl" x1="${L}" x2="${R}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${t} h</text>`; });
    // diagonal y = x
    const d0 = Math.max(xmin, ymin), d1 = Math.min(xmax, ymax);
    s += `<line x1="${x(d0)}" y1="${y(d0)}" x2="${x(d1)}" y2="${y(d1)}" stroke="#2A1633" stroke-dasharray="5 5" opacity=".35"/>`;
    s += `<text class="axl" x="${R}" y="${B + 34}" text-anchor="end">${rto ? "target RTO" : "target RPO"}</text>`;
    s += `<text class="axl" x="${L - 46}" y="${Tp + 4}">${rto ? "tested" : "backup"}</text>`;
    const label = rto ? { H01: 1, H05: 1, D01: 1, P05: 1 } : { D01: 1, D03: 1, I02: 1 };
    // jitter identical points
    const seen = {};
    pts.forEach((p) => {
      const k = p.x + "|" + p.y; seen[k] = (seen[k] || 0) + 1;
      const j = (seen[k] - 1) * 7;
      const above = p.y > p.x, cx = x(p.x) + j, cy = y(p.y);
      const n = BY[p.id];
      const t = rto ? `<b>${esc(n.name)}</b><br>Target ${fmtH(n.rto)} · tested restore ${fmtH(n.restore_h)}${n.failover_h != null ? ` · failover ${fmtH(n.failover_h)}` : ""}<br>${n.last_tested ? "Last test " + n.last_tested : "Never tested"}`
        : `<b>${esc(n.name)}</b><br>Target RPO ${fmtH(n.rpo)} · last good backup ${fmtH(n.backup_age_h)} old<br>Replication covers outages; corruption falls back to the backup.`;
      s += `<circle cx="${cx}" cy="${cy}" r="${label[p.id] ? 9 : 7}" fill="${above ? "#E76F51" : "#2A9D8F"}" opacity=".85" stroke="#fff" stroke-width="1.5" data-tip="${esc(t)}" data-node="${p.id}" style="cursor:pointer"/>`;
      if (label[p.id]) { const nearR = cx > R - 150; s += `<text class="val" x="${nearR ? cx - 12 : cx + 12}" y="${cy + 4}" text-anchor="${nearR ? "end" : "start"}">${esc(Layout.SHORT[p.id] || n.name)}</text>`; }
    });
    s += `<text class="ax" x="${L + 10}" y="${Tp + 14}" fill="#B4462C">above the dashed line = slower than target</text>`;
    box.innerHTML = s + "</svg>";
    $$("[data-node]", box).forEach((c) => { c.onclick = () => openDrawer(c.dataset.node); });
  }
  function renderTargetList() {
    const k = S.targetTile, list = $("#targetList");
    let title, items;
    if (k === "paper") {
      title = "Services that miss on paper";
      items = STATIC.paperMisses.slice().sort((a, b) => (b.paper - b.rto) - (a.paper - a.rto)).map((p) => ({ id: p.id, t1: p.name, t2: `target ${fmtH(p.rto)} · chain ${fmtH(p.paper)} · via ${name(p.path[p.path.length - 1])}`, chip: `+${fmtH(r1(p.paper - p.rto))}` }));
    } else if (k === "inv") {
      title = "Target inversions";
      items = STATIC.inversions.slice().sort((a, b) => (b.depRto / b.rto) - (a.depRto / a.rto)).map((v) => ({ id: v.node, t1: `${name(v.node)} → ${v.group ? v.dep.split("|").map(name).join(" or ") : name(v.dep)}`, t2: `${fmtH(v.rto)} target needs ${fmtH(v.depRto)}${v.group ? " switchover" : ""}`, chip: `${r1(v.depRto / v.rto)}×` }));
    } else if (k === "untested") {
      title = "Untested recoveries";
      items = STATIC.untested.map((u) => ({ id: u.node, t1: name(u.node), t2: `${u.tested ? "last test " + u.tested : "never tested"} · restore ${fmtH(BY[u.node].restore_h)}`, chip: u.tested ? "stale" : "never" }));
    } else {
      title = "Single points of failure";
      items = STATIC.spof.map((p) => ({ id: p.node, t1: name(p.node), t2: p.services.map((s) => `${Layout.SHORT[s.id] || name(s.id)} ${fmtH(s.down)}`).join(" · "), chip: plural(p.services.length, "service") }));
    }
    $("#targetListTitle").innerHTML = `${title} <span class="badge-count">${items.length}</span>`;
    list.innerHTML = items.map((i) => `<div class="item" data-id="${i.id}" tabindex="0"><div class="main"><div class="t1">${esc(i.t1)}</div><div class="t2">${esc(i.t2)}</div></div><span class="chip ${k === "untested" && i.chip === "never" ? "down" : "accent"}">${esc(i.chip)}</span></div>`).join("");
    $$(".item", list).forEach((d) => { d.onclick = () => openDrawer(d.dataset.id); d.onkeydown = (e) => { if (e.key === "Enter") openDrawer(d.dataset.id); }; });
  }
  $$("#scatterSeg button").forEach((b) => { b.onclick = () => { S.scatterK = b.dataset.k; renderScatter(); }; });

  // ---------- SIMULATE VIEW
  function scenario() { return SCEN.find((s) => s.id === S.scenarioId); }
  const startH = () => E.startHour(S.start);
  function timeLabel(h) {
    const c = E.calendar(startH() + h), mm = String(Math.round((c.hour % 1) * 60)).padStart(2, "0");
    const d = new Date(Date.UTC(2026, 9, 26 + Math.floor((startH() + h) / 24)));
    return `${E.DAYS[c.weekday]} ${String(Math.floor(c.hour)).padStart(2, "0")}:${mm} · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
  }
  function initSimControls() {
    $("#startDay").innerHTML = E.DAYS.map((d, i) => `<option value="${d}">${d} ${["Oct 26", "Oct 27", "Oct 28", "Oct 29", "Oct 30", "Oct 31", "Nov 1"][i]}</option>`).join("");
    $("#startHour").innerHTML = Array.from({ length: 24 }, (_, h) => `<option value="${String(h).padStart(2, "0")}:00">${String(h).padStart(2, "0")}:00</option>`).join("");
    syncStart();
    $("#startDay").onchange = $("#startHour").onchange = () => { S.start = `${$("#startDay").value} ${$("#startHour").value}`; if (S.run) { recalcRows(); log(`Start time set to ${S.start}`); renderSim(true); } };
    $("#peakToggle").onclick = () => { S.peak = !S.peak; $("#peakToggle").classList.toggle("on", S.peak); if (S.run) { recalcRows(); renderSim(true); } log(`Holiday peak ${S.peak ? "on" : "off"}`); };
    $("#btnRun").onclick = () => { if (!S.seeds.length) { openLibrary(); toast("Pick a scenario, or fail an asset in custom mode."); return; } runScenario(true); };
    $("#btnPlay").onclick = togglePlay;
    $$("#speed button").forEach((b) => { b.onclick = () => { S.speed = Number(b.dataset.s); $$("#speed button").forEach((x) => x.classList.toggle("on", x === b)); }; });
    $("#clock").oninput = (e) => { S.clock = Number(e.target.value); S.playing = false; playIcon(); renderSim(false); };
    $("#btnLibrary").onclick = openLibrary;
  }
  function syncStart() { const [d, h] = S.start.split(" "); $("#startDay").value = d; $("#startHour").value = h.slice(0, 2) + ":00"; $("#peakToggle").classList.toggle("on", S.peak); }
  function playIcon() { $("#playIcon").innerHTML = S.playing ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>' : '<path d="M7 5v14l11-7z"/>'; }
  function togglePlay() {
    if (!S.run) { toast("Run a scenario first."); return; }
    if (S.clock >= S.maxClock) S.clock = 0;
    S.playing = !S.playing; playIcon(); if (S.playing) lastFrame = performance.now();
  }

  // library
  const CATS = ["All", "Cyber", "Operational", "Facilities", "Third party"];
  let libCat = "All";
  function openLibrary() { renderLibrary(); $("#libOverlay").classList.add("open"); }
  function closeLibrary() { $("#libOverlay").classList.remove("open"); }
  $("#libClose").onclick = closeLibrary;
  $("#libOverlay").onclick = (e) => { if (e.target.id === "libOverlay") closeLibrary(); };
  function renderLibrary() {
    $("#libFilters").innerHTML = CATS.map((c) => `<button class="tg ${libCat === c ? "on" : ""}" data-c="${c}">${c}</button>`).join("");
    $$("#libFilters .tg").forEach((b) => { b.onclick = () => { libCat = b.dataset.c; renderLibrary(); }; });
    const list = SCEN.filter((s) => libCat === "All" || s.category === libCat);
    $("#libGrid").innerHTML = list.map((s) => `<button class="sc-card" data-id="${s.id}"><div class="id"><span>${s.id} · ${s.start}</span><span class="cat ${s.category.split(" ")[0]}">${s.category}</span></div><div class="nm">${esc(s.name)}</div><div class="ds">${esc(s.injects[0].replace(/^Hour \d+:\s*/, ""))}</div></button>`).join("")
      + `<button class="sc-card custom" data-id="custom"><div class="id"><span>Custom</span><span class="cat Operational">Any</span></div><div class="nm">Fail anything</div><div class="ds">Click assets on the map and choose how each one fails.</div></button>`;
    $$("#libGrid .sc-card").forEach((b) => { b.onclick = () => { closeLibrary(); pickScenario(b.dataset.id); }; });
  }
  function pickScenario(id) {
    stopPlay(); S.selSvc = null; S.failClosed = false; S.workarounds = {}; S.determined = null; S.whatifs = new Set();
    if (id === "custom") {
      S.run = null; S.clock = 0;
      S.custom = true; S.scenarioId = null; S.seeds = []; S.run = null; S.rows = null; S.clock = 0;
      $("#scenarioName").textContent = "Custom · no assets failed";
      clearSimClasses(); renderSim(true);
      toast("Custom mode: click an asset on the map to fail it.");
      log("Custom scenario started");
      if (S.view !== "simulate") setView("simulate");
      return;
    }
    const sc = SCEN.find((s) => s.id === id);
    S.run = null; S.clock = 0;
    S.custom = false; S.scenarioId = id; S.seeds = sc.seeds.map((s) => Object.assign({}, s)); S.start = sc.start; syncStart();
    $("#scenarioName").textContent = `${sc.id} · ${sc.name}`;
    if (sc.category === "Cyber") S.determined = 1;
    log(`Loaded ${sc.id} ${sc.name}`);
    if (S.view !== "simulate") setView("simulate");
    runScenario(true);
  }
  function recalcRows() {
    S.rows = E.summary(T, S.run, startH(), { peak: S.peak, workarounds: S.workarounds });
  }
  function runScenario(animate) {
    stopPlay();
    S.run = E.run(T, S.seeds, { failClosed: S.failClosed });
    recalcRows();
    const maxUp = Math.max.apply(null, Object.values(S.run.up));
    S.maxClock = Math.max(24, Math.ceil(maxUp + 12));
    $("#clock").max = S.maxClock;
    S.clock = 0; S.lastInject = -1;
    const down = S.rows.filter((r) => r.down_h > 0);
    log(`Ran ${S.custom ? "custom scenario" : S.scenarioId}: ${plural(down.length, "service")} down, ${plural(assetsDown(), "asset")} affected`);
    if (!S.selSvc) {
      const worst = down.slice().sort((a, b) => b.rto_gap - a.rto_gap || b.down_h - a.down_h)[0];
      S.selSvc = worst ? worst.id : null;
    }
    if (animate) reveal(); else { S.revealing = false; renderSim(true); }
    renderChecks();
  }
  function assetsDown() { return S.run ? Object.keys(S.run.up).filter((k) => S.run.up[k] > 0 && BY[k].lane !== "Business services").length : 0; }
  function reveal() {
    const r = S.run, dist = {};
    Object.keys(r.seeds).forEach((k) => { dist[k] = 0; });
    let changed = true;
    while (changed) {
      changed = false;
      T.nodes.forEach((n) => {
        if (r.up[n.id] <= 0 || n.id in dist) return;
        let best = Infinity;
        n.deps.forEach((g) => (typeof g === "string" ? [g] : g.any).forEach((m) => { if (m in dist) best = Math.min(best, dist[m] + 1); }));
        (n.recovery_deps || []).forEach((m) => { if (m in dist) best = Math.min(best, dist[m] + 1); });
        if (best < Infinity) { dist[n.id] = best; changed = true; }
      });
    }
    T.nodes.forEach((n) => { if (r.up[n.id] > 0 && !(n.id in dist)) dist[n.id] = 1; });
    S.revealing = true; S.revealed = new Set();
    const maxD = Math.max.apply(null, Object.values(dist).concat([0]));
    renderSim(true);
    for (let d = 0; d <= maxD; d++) {
      setTimeout(() => {
        Object.keys(dist).forEach((k) => { if (dist[k] === d) S.revealed.add(k); });
        renderSim(false);
        if (d === maxD) setTimeout(() => { S.revealing = false; renderSim(true); if (S.view === "simulate") { S.playing = true; playIcon(); lastFrame = performance.now(); } }, 300);
      }, 250 + d * 150);
    }
  }
  function stopPlay() { S.playing = false; playIcon(); }
  function clearSimClasses() {
    T.nodes.forEach((n) => {
      const ne = M.nodeEls[n.id];
      ne.g.setAttribute("class", "node" + (n.lane === "Business services" ? " svc" : "") + (BY[n.id].site === "EXT" ? " ext" : ""));
      ne.meta.textContent = ne.base; ne.prog.setAttribute("width", 0);
    });
    M.edges.forEach((e) => { e.el.classList.remove("broken", "path"); });
    overlay.innerHTML = ""; overlayTop.innerHTML = "";
  }
  const DOWNISH = { down: 1, failover: 1, restoring: 1, waiting: 1 };
  function paintMap() {
    const r = S.run, t = S.clock;
    if (!r) { clearSimClasses(); return; }
    const chain = S.selSvc ? r.chain(S.selSvc) : [], onPath = new Set(chain);
    const st = {};
    T.nodes.forEach((n) => {
      const ne = M.nodeEls[n.id];
      let s = r.stateAt(n.id, t);
      if (S.revealing && !S.revealed.has(n.id)) s = "ok";
      st[n.id] = s;
      const cls = ["node"];
      if (n.lane === "Business services") cls.push("svc");
      if (n.site === "EXT") cls.push("ext");
      if (s !== "ok") cls.push("s-" + s);
      if (r.seeds[n.id] && s !== "recovered" && s !== "ok") cls.push("seed");
      if (onPath.has(n.id) && !S.revealing) cls.push("on-path");
      ne.g.setAttribute("class", cls.join(" "));
      const up = r.up[n.id];
      let meta = ne.base, prog = 0;
      if (s === "down") meta = `down · back ${Layout.hShort(up)}`;
      else if (s === "failover") { meta = `failover · ${Layout.hShort(up)}`; prog = r.progress(n.id, t); }
      else if (s === "restoring") { prog = r.progress(n.id, t); meta = `restoring ${Math.round(prog * 100)}%`; }
      else if (s === "waiting") meta = `waiting · ${Layout.hShort(r.start[n.id])}`;
      else if (s === "recovered") meta = `✓ back at ${Layout.hShort(up)}`;
      else if (s === "degraded") meta = "degraded";
      if (ne.meta.textContent !== meta) ne.meta.textContent = meta;
      ne.prog.setAttribute("width", Math.max(0, (ne.w - 12) * prog));
    });
    M.edges.forEach((e) => {
      let broken = false;
      if (e.kind === "group") broken = e.to.every((m) => DOWNISH[st[m]]);
      else if (e.kind !== "fork" && e.kind !== "forklabel") broken = !!DOWNISH[st[e.to]] && !!DOWNISH[st[e.from]];
      e.el.classList.toggle("broken", broken);
      let path = false;
      if (!S.revealing && onPath.has(e.from)) {
        const i = chain.indexOf(e.from), nxt = chain[i + 1];
        if (nxt) path = Array.isArray(e.to) ? e.to.indexOf(nxt) >= 0 : e.to === nxt;
      }
      e.el.classList.toggle("path", path && e.kind !== "fork" && e.kind !== "forklabel");
    });
    // recovery-dependency links on the critical path (not drawn on the base map)
    overlay.innerHTML = ""; overlayTop.innerHTML = "";
    if (!S.revealing) {
      for (let i = 0; i < chain.length - 1; i++) {
        const a = chain[i], b = chain[i + 1];
        if ((BY[a].recovery_deps || []).indexOf(b) >= 0 && !BY[a].deps.some((g) => (typeof g === "string" ? g === b : g.any.indexOf(b) >= 0))) {
          const A = M.P[a], B = M.P[b];
          const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const ax = A.x + A.w / 2, ay = A.y, bx = B.x + B.w / 2, by = B.y;
          const lift = 60 + Math.abs(bx - ax) * 0.08;
          p.setAttribute("d", `M${ax},${ay} C${ax},${ay - lift} ${bx},${by - lift} ${bx},${by}`);
          p.setAttribute("class", "edge path"); p.setAttribute("stroke-dasharray", "7 5");
          overlay.appendChild(p);
          const lb = document.createElementNS("http://www.w3.org/2000/svg", "text");
          lb.setAttribute("x", (ax + bx) / 2); lb.setAttribute("y", Math.min(ay, by) - lift * 0.7); lb.setAttribute("text-anchor", "middle");
          lb.setAttribute("class", "fork-label rlabel"); lb.setAttribute("fill", "#7B2CBF"); lb.textContent = "needed to restore";
          overlayTop.appendChild(lb);
        }
      }
    }
  }
  function renderRail() {
    const rail = $("#rail");
    if (!S.run) { rail.innerHTML = `<div class="empty" style="padding:30px 10px"><div><h2>No scenario yet</h2><p>Pick one of 20, or fail anything.</p><button class="btn primary" id="railPick">Open library</button></div></div>`; $("#railPick").onclick = openLibrary; return; }
    const t = S.clock, maxScale = Math.max.apply(null, S.rows.map((r) => Math.max(r.down_h, r.rto)).concat([4]));
    rail.innerHTML = S.rows.map((r) => {
      const n = BY[r.id], down = r.down_h, cur = Math.min(t, down), over = cur > r.rto, done = down > 0 && t >= down;
      let status;
      if (down === 0) status = `<span class="chip ok">up</span>`;
      else if (done) status = `<span class="rt" style="color:${r.rto_gap ? "var(--accent)" : "var(--teal)"}">back ${fmtH(down)}</span>`;
      else status = `<span class="rt" style="color:${over ? "var(--accent)" : "#B4462C"}">down ${fmtH(r1(cur))}</span>`;
      const acc = S.gaps[r.id] ? ` <span class="chip gold">accepted</span>` : "";
      const bar = down === 0 ? "" : `<div class="rail-bar"><div class="fill ${done ? (r.rto_gap ? "over" : "ok") : (over ? "over" : "")}" style="width:${(cur / maxScale) * 100}%"></div><div class="mark" style="left:${(r.rto / maxScale) * 100}%" data-tip="RTO ${fmtH(r.rto)}"></div></div>`;
      return `<div class="rail-item ${S.selSvc === r.id ? "active" : ""}" data-id="${r.id}" tabindex="0"><span class="nm">${esc(n.name)}${acc}</span>${status}${bar}</div>`;
    }).join("");
    $$(".rail-item", rail).forEach((d) => { d.onclick = () => { S.selSvc = d.dataset.id; renderSim(true); }; d.onkeydown = (e) => { if (e.key === "Enter") d.onclick(); }; });
  }
  function injectsUpTo(t) {
    const sc = scenario(); if (!sc) return [];
    return sc.injects.map((s, i) => { const m = s.match(/^Hour (\d+):\s*(.*)$/); return { i, h: m ? Number(m[1]) : 0, text: m ? m[2] : s }; }).filter((x) => x.h <= t);
  }
  function renderSide() {
    const side = $("#simSide");
    if (!S.run) {
      $("#simSideTitle").textContent = "How it works";
      side.innerHTML = `<div class="why-panel"><p>Run a scenario and watch the failure spread from the assets that broke to every service that needs them.</p><p class="muted">Restores run in parallel once their prerequisites are up. Recovery staff limits are not modeled.</p></div>`;
      return;
    }
    let h = "";
    const r = S.rows.find((x) => x.id === S.selSvc);
    if (r && r.down_h > 0) {
      $("#simSideTitle").innerHTML = `Why? <span class="sim-tag">simulated</span>`;
      const ch = r.chain, last = BY[ch[ch.length - 1]];
      h += `<div class="why-panel"><div style="font-size:16px"><b>${esc(BY[r.id].name)}</b> is back at <b>${fmtH(r.down_h)}</b>${r.rto_gap ? `, <b style="color:var(--accent)">${fmtH(r.rto_gap)} over</b> its ${fmtH(r.rto)} target` : `, within its ${fmtH(r.rto)} target`}.${r.data_loss_h ? ` Data lost: <b>${fmtH(r.data_loss_h)}</b> (RPO ${fmtH(r.rpo)}).` : ""}</div>`;
      h += `<ul class="chain">` + ch.map((id, i) => {
        const n = BY[id], up = S.run.up[id], how = S.run.path[id];
        const rel = i === 0 ? "" : ((BY[ch[i - 1]].recovery_deps || []).indexOf(id) >= 0 && !BY[ch[i - 1]].deps.some((g) => (typeof g === "string" ? g === id : g.any.indexOf(id) >= 0)) ? "needed to restore" : "needs");
        return `<li><span class="pip"></span><span>${i ? `<span class="muted" style="font-size:12px">${rel} </span>` : ""}${esc(n.name)}${how ? ` <span class="chip ${how === "restore" ? "gold" : "blue"}" style="font-size:11px;padding:1px 7px">${how}</span>` : ""}</span><span class="mono">${fmtH(up)}</span></li>`;
      }).join("") + `</ul>`;
      if (last && last.note) h += `<div class="note-box" style="margin-top:8px">${esc(last.name)}: ${esc(last.note)}</div>`;
      h += `</div>`;
    } else {
      $("#simSideTitle").textContent = "Tabletop";
      h += `<div class="why-panel muted">Click a service on the rail or the map for its critical path.</div>`;
    }
    // decisions
    const fraudHit = S.run.up.A13 > 0;
    if (fraudHit) {
      h += `<div class="decision"><div class="q">Fraud scoring is down for ${fmtH(S.run.up.A13)}. Card approvals?</div><div class="seg" id="fraudSeg"><button data-v="open" class="${!S.failClosed ? "on" : ""}">Fail open</button><button data-v="closed" class="${S.failClosed ? "on" : ""}">Fail closed</button></div>
        <div class="muted" style="font-size:13px;margin-top:6px">${S.failClosed ? `Cards decline while scoring is down: card payments down ${fmtH(S.run.up.S01)}.` : `Cards keep working; estimated fraud exposure ${money(E.fraudExposure(S.run, {}))} <span class="sim-tag">fictional</span>`}</div></div>`;
    }
    const wk = S.rows.filter((x) => x.down_h > 0 && BY[x.id].workaround);
    if (wk.length) {
      h += `<div class="decision"><div class="q">Workarounds</div>` + wk.map((x) => {
        const w = BY[x.id].workaround;
        return `<div style="display:flex;align-items:center;gap:10px;margin:6px 0"><button class="switch ${S.workarounds[x.id] ? "on" : ""}" data-wk="${x.id}" aria-label="${esc(w.name)}"></button><span style="flex:1"><b>${esc(w.name)}</b> <span class="muted" style="font-size:13px">${esc(Layout.SHORT[x.id] || BY[x.id].name)} · ${Math.round(w.capacity * 100)}% after ${fmtH(w.after_h)}</span></span></div>`;
      }).join("") + `</div>`;
    }
    // injects
    const inj = injectsUpTo(S.clock).reverse();
    if (inj.length) {
      h += inj.slice(0, 3).map((x) => `<div class="inject"><div class="h">Hour ${x.h}</div><p>${esc(x.text)}</p>${x.i === inj[0].i ? `<textarea data-note="${x.i}" placeholder="Room notes" style="width:100%;margin-top:6px;border:1px solid var(--line-2);border-radius:8px;padding:6px;height:44px;resize:none;background:#fff">${esc(S.notes[S.scenarioId + ":" + x.i] || "")}</textarea>` : ""}</div>`).join("");
    }
    side.innerHTML = h;
    $$("#fraudSeg button").forEach((b) => {
      b.onclick = () => {
        const v = b.dataset.v === "closed"; if (v === S.failClosed) return;
        S.failClosed = v; log(`Decision at hour ${r1(S.clock)}: fraud ${v ? "fail closed" : "fail open"}`);
        S.decisions.push({ h: S.clock, who: who(), what: v ? "Fraud fail closed" : "Fraud fail open" });
        const keep = S.clock; S.run = E.run(T, S.seeds, { failClosed: S.failClosed }); recalcRows(); S.clock = keep; renderSim(true);
      };
    });
    $$("[data-wk]", side).forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.wk; S.workarounds[id] = !S.workarounds[id];
        log(`Decision at hour ${r1(S.clock)}: ${BY[id].workaround.name} ${S.workarounds[id] ? "activated" : "stopped"} for ${BY[id].name}`);
        S.decisions.push({ h: S.clock, who: who(), what: BY[id].workaround.name });
        recalcRows(); renderSim(true);
      };
    });
    $$("[data-note]", side).forEach((ta) => { ta.oninput = () => { S.notes[S.scenarioId + ":" + ta.dataset.note] = ta.value; }; ta.onkeydown = (e) => e.stopPropagation(); });
  }
  function renderClock() {
    $("#clock").value = S.clock;
    $("#clockH").textContent = `Hour ${Math.floor(S.clock)}`;
    $("#clockT").textContent = S.run ? timeLabel(S.clock) : "–";
  }
  function renderTicks() {
    const sc = $("#scrub");
    $$(".tick", sc).forEach((t) => t.remove());
    const add = (h, cls, tipTxt) => { if (h > S.maxClock) return; const d = document.createElement("div"); d.className = "tick " + cls; d.style.left = `calc(${(h / S.maxClock) * 100}% + ${8 - (h / S.maxClock) * 16}px)`; d.setAttribute("data-tip", tipTxt); sc.appendChild(d); };
    const sc0 = scenario();
    if (sc0) injectsUpTo(999).forEach((x) => add(x.h, "", `Hour ${x.h}: ${esc(x.text)}`));
    if (S.determined !== null) add(S.determined + 36, "reg", `36-hour regulator notification window ends (incident determined at hour ${S.determined})`);
  }
  let lastSideKey = "";
  function renderSim(full) {
    paintMap(); renderClock();
    const injN = injectsUpTo(S.clock).length;
    const key = [S.selSvc, injN, S.failClosed, JSON.stringify(S.workarounds), S.run ? 1 : 0, S.revealing].join("|");
    if (full || key !== lastSideKey) { renderSide(); lastSideKey = key; if (injN > (S.lastInject || 0) && S.playing) { /* new inject */ } S.lastInject = injN; }
    if (full) renderTicks();
    renderRail();
    if (S.custom) $("#scenarioName").textContent = `Custom · ${plural(S.seeds.length, "asset")} failed`;
  }
  let lastFrame = performance.now();
  function frame(now) {
    const dt = (now - lastFrame) / 1000; lastFrame = now;
    if (S.playing && S.run && !S.revealing) {
      S.clock = Math.min(S.maxClock, S.clock + dt * S.speed);
      if (S.clock >= S.maxClock) { S.playing = false; playIcon(); }
      if (S.view === "simulate") renderSim(false);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- IMPACT VIEW
  function needRun(body) {
    body.innerHTML = `<div class="card empty"><div><h2>No scenario run yet</h2><p>Run one in Simulate, or start with ransomware.</p><button class="btn primary" id="loadSC01">Run SC01 ransomware</button></div></div>`;
    $("#loadSC01").onclick = () => { pickScenario("SC01"); };
  }
  function renderImpact() {
    const body = $("#impactBody");
    if (!S.run) { needRun(body); $("#impactSub").textContent = "Data lost to the left of hour 0, time down to the right."; return; }
    const rows = S.rows, hit = rows.filter((r) => r.down_h > 0 || r.data_loss_h > 0);
    const down = rows.filter((r) => r.down_h > 0);
    const worst = rows.slice().sort((a, b) => b.rto_gap - a.rto_gap)[0];
    const lossMax = rows.slice().sort((a, b) => b.data_loss_h - a.data_loss_h)[0];
    const totalCost = rows.reduce((s, r) => s + r.cost, 0), txn = rows.reduce((s, r) => s + r.txn_lost, 0);
    const exposure = E.fraudExposure(S.run, { failClosed: S.failClosed });
    const lossAsset = (() => { let b = null; S.run.closure(lossMax.id, new Set()).forEach((x) => { if (S.run.loss[x] === lossMax.data_loss_h && S.run.loss[x] > 0) b = x; }); return b; })();
    $("#impactSub").textContent = `${S.custom ? "Custom scenario" : scenario().id + " · " + scenario().name} · starts ${timeLabel(0)}`;
    const wkOn = Object.keys(S.workarounds).filter((k) => S.workarounds[k]).length;
    body.innerHTML = `
      <div class="tiles" style="grid-template-columns: repeat(5, 1fr)">
        <div class="card tile"><div class="label">Services down</div><div class="value">${down.length}<small>of ${SVCS.length}</small></div><div class="note">${plural(assetsDown(), "asset")} affected</div></div>
        <div class="card tile hero"><div class="label">Worst overrun <span class="why" tabindex="0" data-tip="Hours past the service's RTO. ${worst.rto_gap ? esc(BY[worst.id].name) + " is back at " + fmtH(worst.down_h) + " against " + fmtH(worst.rto) + "." : "No service misses its RTO."}">Why?</span></div><div class="value">${worst.rto_gap ? fmtH(worst.rto_gap) : "none"}</div><div class="note">${worst.rto_gap ? esc(BY[worst.id].name) + " · target " + fmtH(worst.rto) : "all targets met"}</div></div>
        <div class="card tile"><div class="label">Data lost <span class="why" tabindex="0" data-tip="The largest data loss among the assets a service depends on. Failover loses the replication lag; corruption falls back to the last good backup.">Why?</span></div><div class="value">${lossMax.data_loss_h ? fmtH(lossMax.data_loss_h) : "none"}</div><div class="note">${lossAsset ? esc(BY[lossAsset].name) : "no data loss"}</div></div>
        <div class="card tile"><div class="label">Cost <span class="why" tabindex="0" data-tip="Revenue and fees at risk per hour × business-hours weight × calendar multiplier (payroll Friday, month-end, holiday peak), minus active workarounds.">Why?</span></div><div class="value">${money(totalCost)}</div><div class="note">${wkOn ? plural(wkOn, "workaround") + " on" : "no workarounds"}${exposure ? " · fraud exposure " + money(exposure) : ""}</div></div>
        <div class="card tile"><div class="label">To rebuild <span class="why" tabindex="0" data-tip="Transactions recorded during the data-loss window that must be re-keyed or re-requested.">Why?</span></div><div class="value">${bigNum(txn)}</div><div class="note">transactions</div></div>
      </div>
      <div style="display:grid; grid-template-columns: 1.7fr 1fr; gap:14px; flex:1; min-height:0">
        <div class="card" style="display:flex;flex-direction:column;overflow:hidden"><div class="card-h">Data lost · time down <span class="sub">per service, against RPO and RTO</span></div><div class="chart" id="mirror"></div></div>
        <div style="display:flex;flex-direction:column;gap:14px;min-height:0">
          <div class="card" style="flex:1.2;display:flex;flex-direction:column;overflow:hidden"><div class="card-h">Cost over time <span class="sub" id="costNow"></span></div><div class="chart" id="costChart"></div></div>
          <div class="card" style="flex:1;display:flex;flex-direction:column;overflow:hidden"><div class="card-h">Regulatory clocks <span class="sub">reference only</span><span style="flex:1"></span><button class="btn sm" id="btnDetermine" data-tip="Record the hour the incident was determined to be notifiable. Starts the 36-hour window.">Mark determined</button></div><div class="chart" id="regChart"></div></div>
        </div>
      </div>`;
    renderMirror(hit); renderCost(); renderReg();
    $("#btnDetermine").onclick = () => { S.determined = r1(S.clock); log(`Incident marked as determined at hour ${S.determined}`); renderImpact(); };
  }
  function renderMirror(hit) {
    const box = $("#mirror"), W = box.clientWidth - 24, H = box.clientHeight - 12;
    if (W < 60) return;
    if (!hit.length) { box.innerHTML = `<div class="empty"><div><h2>No services affected</h2><p>Every service stays within reach of its users.</p></div></div>`; return; }
    const L = 200, mid = L + (W - L) * 0.32, R = W - 70, top = 30;
    const lmax = Math.max.apply(null, hit.map((r) => Math.max(r.data_loss_h, r.rpo)).concat([2])) * 1.08;
    const rmax = Math.max.apply(null, hit.map((r) => Math.max(r.down_h, r.rto)).concat([S.clock, 4])) * 1.05;
    const xl = (h) => mid - 8 - (h / lmax) * (mid - 8 - L - 52), xr = (h) => mid + 8 + (h / rmax) * (R - mid - 8);
    const rh = Math.min(48, (H - top - 50) / hit.length), bh = Math.min(20, rh * 0.5);
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    s += `<text class="axl" x="${mid - 12}" y="16" text-anchor="end">← data lost</text><text class="axl" x="${mid + 12}" y="16">time down →</text>`;
    s += `<line x1="${mid}" x2="${mid}" y1="${top - 8}" y2="${top + rh * hit.length}" stroke="#2A1633" stroke-width="2"/>`;
    const rt = niceTicks(rmax, W < 900 ? 5 : 6), lt = niceTicks(lmax, (mid - L) < 300 ? 2 : 4);
    rt.forEach((t) => { s += `<line class="gridl" x1="${xr(t)}" x2="${xr(t)}" y1="${top - 4}" y2="${top + rh * hit.length}"/><text class="ax" x="${xr(t)}" y="${top + rh * hit.length + 16}" text-anchor="middle">${t} h</text>`; });
    lt.forEach((t) => { if (t) s += `<line class="gridl" x1="${xl(t)}" x2="${xl(t)}" y1="${top - 4}" y2="${top + rh * hit.length}"/><text class="ax" x="${xl(t)}" y="${top + rh * hit.length + 16}" text-anchor="middle">${t} h</text>`; });
    hit.forEach((r, i) => {
      const y = top + rh * i + rh / 2, n = BY[r.id];
      s += `<text class="rowl" x="${L - 16}" y="${y + 5}" text-anchor="end">${esc(Layout.SHORT[r.id] || n.name)}</text>`;
      if (r.data_loss_h > 0) {
        s += `<rect x="${xl(r.data_loss_h)}" y="${y - bh / 2}" width="${mid - 8 - xl(r.data_loss_h)}" height="${bh}" rx="5" fill="${r.rpo_gap ? "#457B9D" : "#9FC1D6"}" data-tip="<b>${esc(n.name)}</b><br>${fmtH(r.data_loss_h)} of data lost vs RPO ${fmtH(r.rpo)}<br>${r.txn_lost.toLocaleString("en-US")} ${esc(n.transaction_unit)} to rebuild"/>`;
        s += `<text class="val" x="${xl(r.data_loss_h) - 6}" y="${y + 4}" text-anchor="end">${fmtH(r.data_loss_h)}</text>`;
      }
      s += `<line x1="${xl(r.rpo)}" x2="${xl(r.rpo)}" y1="${y - bh / 2 - 4}" y2="${y + bh / 2 + 4}" stroke="#2A1633" stroke-width="2" data-tip="RPO ${fmtH(r.rpo)}"/>`;
      if (r.down_h > 0) {
        const within = Math.min(r.down_h, r.rto);
        s += `<rect x="${mid + 8}" y="${y - bh / 2}" width="${xr(within) - mid - 8}" height="${bh}" rx="5" fill="#E76F51" data-tip="<b>${esc(n.name)}</b><br>Down ${fmtH(r.down_h)} vs RTO ${fmtH(r.rto)}<br>Cost ${money(r.cost)}"/>`;
        if (r.down_h > r.rto) s += `<rect x="${xr(r.rto)}" y="${y - bh / 2}" width="${xr(r.down_h) - xr(r.rto)}" height="${bh}" rx="5" fill="${S.gaps[r.id] ? "#E0A100" : "#7B2CBF"}" data-tip="<b>${fmtH(r.rto_gap)} over target</b>${S.gaps[r.id] ? "<br>Gap accepted by " + esc(S.gaps[r.id].by) : ""}"/>`;
        s += `<text class="val" x="${xr(r.down_h) + 6}" y="${y + 4}">${fmtH(r.down_h)}</text>`;
      }
      s += `<line x1="${xr(r.rto)}" x2="${xr(r.rto)}" y1="${y - bh / 2 - 4}" y2="${y + bh / 2 + 4}" stroke="#2A1633" stroke-width="2" data-tip="RTO ${fmtH(r.rto)}"/>`;
      if (n.mtd <= rmax) s += `<line x1="${xr(n.mtd)}" x2="${xr(n.mtd)}" y1="${y - bh / 2 - 4}" y2="${y + bh / 2 + 4}" stroke="#E0A100" stroke-width="2" stroke-dasharray="3 2" data-tip="Maximum tolerable downtime ${fmtH(n.mtd)}"/>`;
    });
    if (S.clock > 0) s += `<line x1="${xr(Math.min(S.clock, rmax))}" x2="${xr(Math.min(S.clock, rmax))}" y1="${top - 10}" y2="${top + rh * hit.length}" stroke="#E0A100" stroke-width="2"/><text class="ax" x="${xr(Math.min(S.clock, rmax))}" y="${top - 14}" text-anchor="middle" fill="#8A6400">now</text>`;
    s += `<g transform="translate(${L},${H - 2})"><rect x="0" y="-11" width="14" height="10" rx="3" fill="#457B9D"/><text class="ax" x="20" y="-2">data lost</text><rect x="100" y="-11" width="14" height="10" rx="3" fill="#E76F51"/><text class="ax" x="120" y="-2">within RTO</text><rect x="210" y="-11" width="14" height="10" rx="3" fill="#7B2CBF"/><text class="ax" x="230" y="-2">over RTO</text><line x1="320" x2="320" y1="-13" y2="0" stroke="#2A1633" stroke-width="2"/><text class="ax" x="326" y="-2">target</text><line x1="390" x2="390" y1="-13" y2="0" stroke="#E0A100" stroke-width="2" stroke-dasharray="3 2"/><text class="ax" x="396" y="-2">max tolerable</text></g>`;
    box.innerHTML = s + "</svg>";
  }
  function niceTicks(max, most) {
    const steps = [1, 2, 4, 6, 12, 24, 48];
    const st = steps.find((s) => max / s <= (most || 6)) || 48;
    const out = []; for (let t = 0; t <= max; t += st) out.push(t); return out;
  }
  function totalCurve() {
    const step = Math.max(0.5, S.maxClock / 96), pts = [];
    for (let t = 0; t <= S.maxClock + 1e-9; t += step) {
      let c = 0;
      S.rows.forEach((r) => { if (r.down_h > 0) c += E.cost(BY[r.id], startH(), Math.min(t, r.down_h), !!S.workarounds[r.id], { peak: S.peak }); });
      pts.push([t, c]);
    }
    return pts;
  }
  function renderCost() {
    const box = $("#costChart"), W = box.clientWidth - 24, H = box.clientHeight - 10;
    if (W < 60) return;
    const pts = totalCurve(), max = Math.max(1, pts[pts.length - 1][1]);
    const L = 64, R = W - 10, top = 10, B = H - 26;
    const x = (t) => L + (t / S.maxClock) * (R - L), y = (v) => B - (v / max) * (B - top);
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    [0, 0.5, 1].forEach((f) => { s += `<line class="gridl" x1="${L}" x2="${R}" y1="${y(max * f)}" y2="${y(max * f)}"/><text class="ax" x="${L - 8}" y="${y(max * f) + 4}" text-anchor="end">${money(max * f)}</text>`; });
    niceTicks(S.maxClock).forEach((t) => { s += `<text class="ax" x="${x(t)}" y="${B + 18}" text-anchor="middle">${t} h</text>`; });
    const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p[0])},${y(p[1])}`).join(" ");
    s += `<path d="${d} L${x(pts[pts.length - 1][0])},${B} L${L},${B} Z" fill="#EFE3FA"/><path d="${d}" fill="none" stroke="#7B2CBF" stroke-width="3"/>`;
    const now = pts.reduce((b, p) => (p[0] <= S.clock + 1e-9 ? p : b), pts[0]);
    s += `<circle cx="${x(now[0])}" cy="${y(now[1])}" r="6" fill="#E0A100" stroke="#fff" stroke-width="2"/>`;
    box.innerHTML = s + "</svg>";
    $("#costNow").textContent = `${money(now[1])} by hour ${Math.floor(now[0])}`;
  }
  function renderReg() {
    const box = $("#regChart"), W = box.clientWidth - 24, H = box.clientHeight - 10;
    if (W < 60) return;
    const max = Math.max(S.maxClock, S.determined !== null ? S.determined + 40 : 0);
    const L = 10, R = W - 10, x = (t) => L + (t / max) * (R - L);
    const sc = scenario(), vendor = S.seeds.some((s) => s.mode === "vendor" && s.duration >= 4);
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    let y = 22;
    const row = (label, a, b, color, tipTxt) => {
      s += `<text class="axl" x="${L}" y="${y}">${label}</text>`;
      s += `<rect x="${L}" y="${y + 8}" width="${R - L}" height="14" rx="7" fill="#F7F3F8"/>`;
      if (a !== null) s += `<rect x="${x(a)}" y="${y + 8}" width="${Math.max(4, x(b) - x(a))}" height="14" rx="7" fill="${color}" opacity=".85" data-tip="${esc(tipTxt)}"/><text class="ax" x="${Math.min(R - 4, x(b))}" y="${y + 38}" text-anchor="end">hour ${r1(b)}</text>`;
      else s += `<text class="ax" x="${L + 8}" y="${y + 19}">not started</text>`;
      y += 54;
    };
    row("36-hour regulator notice", S.determined, S.determined === null ? null : S.determined + 36, "#7B2CBF", "Federal banking rule: notify the primary regulator within 36 hours of determining a notification incident. Reference marker only; legal decides.");
    row("Vendor 4-hour notice", vendor ? 0 : null, vendor ? 4 : null, "#457B9D", "A bank service provider must tell the bank when a disruption is expected to last 4 hours or more. Reference marker only.");
    if (S.clock > 0) s += `<line x1="${x(S.clock)}" x2="${x(S.clock)}" y1="10" y2="${y - 10}" stroke="#E0A100" stroke-width="2"/>`;
    box.innerHTML = s + "</svg>";
  }

  // ---------- DECIDE VIEW
  function projection() { return E.run(T, S.seeds, { whatifs: Array.from(S.whatifs), failClosed: S.failClosed }); }
  function fixImpact(w) {
    const base = S.run, p = E.run(T, S.seeds, { whatifs: [w], failClosed: S.failClosed });
    let hours = 0, data = 0, svcs = 0;
    SVCS.forEach((id) => {
      const dh = base.up[id] - p.up[id], dl = base.dataLoss(id) - p.dataLoss(id);
      if (dh > 0 || dl > 0) svcs++;
      hours += Math.max(0, dh); data += Math.max(0, dl);
    });
    return { w, hours: r1(hours), data: r1(data), svcs };
  }
  function renderDecide() {
    const body = $("#decideBody");
    if (!S.run) { needRun(body); return; }
    const fixes = WHATIFS.map((w) => Object.assign(fixImpact(w.id), w)).sort((a, b) => b.hours - a.hours || b.data - a.data);
    const maxH = Math.max(1, ...fixes.map((f) => f.hours));
    const p = projection();
    const affected = S.rows.filter((r) => r.down_h > 0 || p.up[r.id] > 0);
    const gapsOpen = S.rows.filter((r) => r.rto_gap > 0);
    body.innerHTML = `
      <div style="display:grid;grid-template-columns: 1fr 1.15fr 440px; gap:14px; flex:1; min-height:0">
        <div class="card" style="display:flex;flex-direction:column;overflow:hidden">
          <div class="card-h">Fixes <span class="sub" data-tip="Downtime hours saved, added up across all services in this scenario.">ranked by hours saved</span><span class="sim-tag">simulated</span></div>
          <div class="scroll" style="flex:1">${fixes.map((f) => `
            <div class="wi"><button class="switch ${S.whatifs.has(f.id) ? "on" : ""}" data-w="${f.id}" aria-label="${esc(f.name)}"></button>
              <span class="nm">${esc(f.name)}</span>
              <span class="mono" style="font-size:13px;color:var(--ink-2)">${f.hours ? fmtH(f.hours) + " saved" : (f.data ? fmtH(f.data) + " less data lost" : "no change")}</span>
              <span class="ds">${esc(f.detail)}${f.svcs ? ` · helps ${plural(f.svcs, "service")}` : ""}${f.hours && f.data ? ` · also ${fmtH(f.data)} less data lost` : ""}</span>
              <span class="bar"><i style="width:${(f.hours / maxH) * 100}%"></i></span></div>`).join("")}
          </div>
          <div class="memo-actions" style="padding-top:10px"><button class="btn" id="btnPropose" ${S.whatifs.size ? "" : "disabled"}>Propose to owners</button><span class="chip blue">Projection only</span></div>
        </div>
        <div class="card" style="display:flex;flex-direction:column;overflow:hidden">
          <div class="card-h">Baseline vs with fixes <span class="sub">${S.whatifs.size ? plural(S.whatifs.size, "fix", "fixes") + " on" : "toggle a fix"}</span></div>
          <div class="chart" id="ghost"></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;min-height:0">
          <div class="card" style="flex:1.6;display:flex;flex-direction:column;overflow:hidden">
            <div class="card-h">Decision memo ${S.memo ? `<span class="chip ${S.memo.status === "sent" ? "ok" : S.memo.status === "approved" ? "accent" : "gold"}">${S.memo.status}</span>` : ""}<span style="flex:1"></span><span class="sim-tag">simulated</span></div>
            ${S.memo ? `<div class="memo" id="memoText" contenteditable="true" spellcheck="false">${esc(S.memo.text)}</div>
              <div class="status-line">Last edit: ${esc(S.memo.lastEditorLabel)}${S.memo.approvedBy ? ` · approved by ${esc(S.memo.approvedBy)}` : ""}</div>` : `<div class="empty" style="padding:20px"><div><p>The AI drafts a one-page memo for the executive risk committee. A person approves it.</p></div></div>`}
            <div class="memo-actions">
              <button class="btn ${S.memo ? "" : "primary"}" id="btnDraft">${S.memo ? "Redraft" : "Draft memo"}</button>
              <button class="btn primary" id="btnApprove" ${S.memo && S.memo.status === "draft" ? "" : "disabled"}>Approve</button>
              <button class="btn" id="btnSend" ${S.memo && S.memo.status === "approved" ? "" : "disabled"}>Mark sent</button>
              <button class="btn ghost" id="btnDownload" ${S.memo ? "" : "disabled"}>Download</button>
            </div>
          </div>
          <div class="card" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
            <div class="card-h">Accept a gap <span class="sub">service owner only</span></div>
            <div class="form">
              ${gapsOpen.length ? `<select id="gapSvc">${gapsOpen.map((r) => `<option value="${r.id}">${esc(BY[r.id].name)} · ${fmtH(r.rto_gap)} over · owner ${esc(BY[r.id].owner)}</option>`).join("")}</select>
              <textarea id="gapReason" placeholder="Reason"></textarea>
              <div class="row"><input type="date" id="gapDate" min="2026-10-28" max="2027-01-25" aria-label="Review date"><button class="btn gold" id="btnAccept">Accept gap</button></div>` : `<div class="muted">No service misses its RTO in this scenario.</div>`}
              ${Object.keys(S.gaps).length ? `<div class="muted" style="font-size:13px">${Object.keys(S.gaps).map((k) => `${esc(BY[k].name)}: accepted by ${esc(S.gaps[k].by)}, review ${S.gaps[k].review}`).join("<br>")}</div>` : ""}
            </div>
          </div>
        </div>
      </div>`;
    renderGhost(affected, p);
    $$("[data-w]", body).forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.w;
        if (S.whatifs.has(id)) S.whatifs.delete(id); else S.whatifs.add(id);
        log(`What-if ${S.whatifs.has(id) ? "on" : "off"}: ${WHATIFS.find((w) => w.id === id).name} (projection only)`);
        renderDecide();
      };
    });
    $("#btnPropose").onclick = () => {
      const names = Array.from(S.whatifs).map((w) => WHATIFS.find((x) => x.id === w).name).join(", ");
      log(`Proposed to asset owners: ${names}. Baseline unchanged until they approve.`);
      toast("Sent to asset owners. The baseline stays as is until they approve.");
    };
    $("#btnDraft").onclick = draftMemo;
    $("#btnApprove").onclick = () => {
      const r = Rules.canApproveMemo(S.memo, S.persona);
      if (!r.ok) { toast(r.why, true); log(`Approval blocked: ${r.why}`); return; }
      S.memo.status = "approved"; S.memo.approvedBy = who(); log("Memo approved"); renderDecide();
    };
    $("#btnSend").onclick = () => { S.memo.status = "sent"; log("Memo marked sent to the executive risk committee (simulated)"); toast("Memo marked sent (simulated)."); renderDecide(); };
    $("#btnDownload").onclick = () => {
      const blob = new Blob([S.memo.text], { type: "text/plain" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `BC-03_decision-memo_${S.scenarioId || "custom"}.txt`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000); log("Memo downloaded");
    };
    const mt = $("#memoText");
    if (mt) {
      mt.onkeydown = (e) => e.stopPropagation();
      mt.oninput = () => {
        S.memo.text = mt.innerText; S.memo.lastEditor = S.persona; S.memo.lastEditorLabel = who();
        if (S.memo.status !== "draft") { S.memo.status = "draft"; S.memo.approvedBy = null; log("Memo edited after approval; approval cleared"); }
        $("#btnApprove").disabled = false; $("#btnSend").disabled = true;
        const sl = $(".status-line", body); if (sl) sl.textContent = `Last edit: ${who()}`;
      };
      mt.onblur = () => renderDecide();
    }
    const acc = $("#btnAccept");
    if (acc) {
      $("#gapReason").onkeydown = (e) => e.stopPropagation();
      acc.onclick = () => {
        const id = $("#gapSvc").value, reason = $("#gapReason").value, date = $("#gapDate").value;
        const r = Rules.validateGap(id, S.persona, reason, date);
        if (!r.ok) { toast(r.why, true); log(`Gap acceptance blocked: ${r.why}`); return; }
        S.gaps[id] = { by: who(), reason, review: date }; log(`Gap accepted for ${BY[id].name}, review ${date}: ${reason}`);
        toast(`${BY[id].name} gap accepted. It stays visible in amber.`); renderDecide();
      };
    }
  }
  function renderGhost(rows, p) {
    const box = $("#ghost"), W = box.clientWidth - 24, H = box.clientHeight - 12;
    if (W < 60) return;
    if (!rows.length) { box.innerHTML = `<div class="empty"><div><h2>Nothing down</h2></div></div>`; return; }
    const L = 150, R = W - 70, top = 16;
    const max = Math.max.apply(null, rows.map((r) => Math.max(r.down_h, r.rto))) * 1.05;
    const x = (h) => L + (h / max) * (R - L);
    const rh = Math.min(50, (H - top - 50) / rows.length), bh = Math.min(16, rh * 0.32);
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    niceTicks(max, W < 520 ? 3 : 6).forEach((t) => { s += `<line class="gridl" x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${top + rh * rows.length}"/><text class="ax" x="${x(t)}" y="${top + rh * rows.length + 16}" text-anchor="middle">${t} h</text>`; });
    rows.forEach((r, i) => {
      const y = top + rh * i + rh / 2, pr = p.up[r.id], n = BY[r.id];
      s += `<text class="rowl" x="${L - 14}" y="${y + 5}" text-anchor="end">${esc(Layout.SHORT[r.id] || n.name)}</text>`;
      s += `<rect x="${L}" y="${y - bh - 1}" width="${Math.max(2, x(r.down_h) - L)}" height="${bh}" rx="4" fill="#E76F51" opacity=".3" data-tip="Baseline: ${fmtH(r.down_h)}"/>`;
      s += `<rect x="${L}" y="${y + 1}" width="${Math.max(2, x(pr) - L)}" height="${bh}" rx="4" fill="${pr > n.rto ? "#7B2CBF" : "#2A9D8F"}" style="transition: width .4s" data-tip="With fixes: ${fmtH(pr)} (target ${fmtH(n.rto)})"/>`;
      s += `<text class="val" x="${Math.max(x(r.down_h), x(pr)) + 6}" y="${y + 5}">${fmtH(r.down_h)} → <tspan font-weight="600" fill="${pr > n.rto ? "#7B2CBF" : "#1F7A6F"}">${fmtH(pr)}</tspan></text>`;
      s += `<line x1="${x(n.rto)}" x2="${x(n.rto)}" y1="${y - bh - 4}" y2="${y + bh + 4}" stroke="#2A1633" stroke-width="2"/>`;
    });
    s += `<g transform="translate(${L},${H - 2})"><rect x="0" y="-11" width="14" height="10" rx="3" fill="#E76F51" opacity=".35"/><text class="ax" x="20" y="-2">baseline</text><rect x="96" y="-11" width="14" height="10" rx="3" fill="#7B2CBF"/><text class="ax" x="116" y="-2">with fixes</text><line x1="210" x2="210" y1="-13" y2="0" stroke="#2A1633" stroke-width="2"/><text class="ax" x="216" y="-2">RTO</text></g>`;
    box.innerHTML = s + "</svg>";
  }
  function draftMemo() {
    const sc = scenario(), rows = S.rows, down = rows.filter((r) => r.down_h > 0);
    const worst = rows.slice().sort((a, b) => b.rto_gap - a.rto_gap)[0];
    const loss = rows.slice().sort((a, b) => b.data_loss_h - a.data_loss_h)[0];
    const cost = rows.reduce((s, r) => s + r.cost, 0);
    const chain = worst.chain.map(name).join(" → "), root = BY[worst.chain[worst.chain.length - 1]];
    const fixes = WHATIFS.map((w) => Object.assign(fixImpact(w.id), w)).filter((f) => f.hours || f.data).sort((a, b) => b.hours - a.hours || b.data - a.data);
    const top2 = fixes.slice(0, 2), proj = top2.length ? E.run(T, S.seeds, { whatifs: top2.map((f) => f.w), failClosed: S.failClosed }) : null;
    const lines = [];
    lines.push(`DECISION MEMO · Executive risk committee`);
    lines.push(`Scenario: ${sc ? sc.id + " " + sc.name : "Custom"} · starts ${timeLabel(0)}`);
    lines.push(`Prepared by: AI draft (simulated) for the continuity lead`);
    lines.push(``);
    lines.push(`WHAT HAPPENED`);
    lines.push(`• ${plural(down.length, "service")} down; ${plural(assetsDown(), "asset")} affected.`);
    if (worst.rto_gap) lines.push(`• Worst: ${BY[worst.id].name} back at ${fmtH(worst.down_h)} against a ${fmtH(worst.rto)} target.`);
    else lines.push(`• Every service is back within its RTO.`);
    if (loss.data_loss_h) lines.push(`• Data lost: up to ${fmtH(loss.data_loss_h)} (${BY[loss.id].name}; RPO ${fmtH(loss.rpo)}).`);
    lines.push(`• Estimated cost: ${money(cost)}${Object.values(S.workarounds).some(Boolean) ? " with workarounds" : ""}.`);
    if (S.decisions.length) lines.push(`• Room decisions: ${S.decisions.map((d) => `${d.what} at hour ${r1(d.h)}`).join("; ")}.`);
    lines.push(``);
    if (worst.rto_gap) {
      lines.push(`WHY IT TOOK THIS LONG`);
      lines.push(chain + ".");
      if (root && root.note) lines.push(`${root.name}: ${root.note}.`);
      lines.push(``);
    }
    if (top2.length) {
      lines.push(`FIXES THAT MATTER MOST (PROJECTED)`);
      top2.forEach((f, i) => lines.push(`${i + 1}. ${f.name}: ${f.hours ? "saves " + fmtH(f.hours) + " of downtime" : "cuts " + fmtH(f.data) + " of data loss"} across ${plural(f.svcs, "service")}.`));
      if (proj && worst.rto_gap) lines.push(`Together: ${BY[worst.id].name} from ${fmtH(worst.down_h)} to ${fmtH(proj.up[worst.id])}.`);
      lines.push(``);
    }
    lines.push(`ASKS`);
    lines.push(`1. Fund the fixes above this quarter${top2.length ? "" : " (none needed for this scenario)"}.`);
    if (STATIC.untested.length) lines.push(`2. Test the ${plural(STATIC.untested.length, "recovery", "recoveries")} that are untested or over 12 months old, starting with Active Directory.`);
    lines.push(`3. Service owners accept or fix remaining gaps within 90 days.`);
    lines.push(``);
    lines.push(`Numbers come from the tabletop model, not production systems.`);
    S.memo = { text: lines.join("\n"), status: "draft", lastEditor: "ai", lastEditorLabel: "AI draft (simulated)", approvedBy: null };
    log("Memo drafted (simulated)");
    renderDecide();
  }

  // ---------------------------------------------------------------- drawer
  function openDrawer(id) {
    const n = BY[id], svc = n.lane === "Business services";
    const flags = [];
    STATIC.inversions.filter((v) => v.node === id).forEach((v) => flags.push({ c: "", t: `Needs ${v.group ? v.dep.split("|").map(name).join(" or ") : name(v.dep)}, which targets ${fmtH(v.depRto)}${v.group ? " to switch" : ""}. Its own target is ${fmtH(v.rto)}.`, tip: "Target inversion: a dependency with a longer target RTO than the asset that needs it." }));
    if (svc) { const p = STATIC.paper.find((x) => x.id === id); if (p.paper > p.rto) flags.push({ c: "accent", t: `Paper RTO ${fmtH(p.paper)}: ${p.path.map(name).join(" → ")}.`, tip: "The worst target RTO on its dependency chain." }); }
    if (!svc && !n.vendor && n.restore_h && n.rto != null && n.restore_h > n.rto) flags.push({ c: "gold", t: `Tested restore ${fmtH(n.restore_h)} is longer than the ${fmtH(n.rto)} target.${n.failover_h != null ? ` Failover (${fmtH(n.failover_h)}) covers outages, not corruption.` : ""}`, tip: "Corruption and compromise force a restore; failover would copy the damage." });
    if (n.data && n.backup_age_h && n.rpo != null && n.backup_age_h > n.rpo) flags.push({ c: "", t: `Last good backup is ${fmtH(n.backup_age_h)} old against a ${fmtH(n.rpo)} RPO.`, tip: "Replication protects against outages. Corruption replicates too, so recovery falls back to the last good backup." });
    const un = STATIC.untested.find((u) => u.node === id); if (un) flags.push({ c: "gold", t: un.tested ? `Last restore test ${un.tested}, over 12 months ago.` : "Recovery has never been tested.", tip: "Untested means the restore time is an estimate." });
    const sp = STATIC.spof.find((x) => x.node === id); if (sp) flags.push({ c: "", t: `Single point: on its own, its outage breaks ${sp.services.map((s) => name(s.id) + " (" + fmtH(s.down) + " vs " + fmtH(s.rto) + ")").join(", ")}.`, tip: "The engine failed this asset alone and checked every service." });
    const deps = [];
    n.deps.forEach((g) => { if (typeof g === "string") deps.push(`<button data-go="${g}">${esc(name(g))}</button>`); else deps.push(`<button data-go="${g.any[0]}">${esc(g.any.map(name).join(" or "))} · switch ${fmtH(g.switch)}</button>`); });
    (n.soft || []).forEach((s) => deps.push(`<button data-go="${s}">${esc(name(s))} (if up)</button>`));
    const users = directDependents(id);
    const inherit = svc ? [] : SVCS.filter((s) => closureOf(s, true).has(id));
    let simBlock = "";
    if (S.run && (S.view === "simulate" || S.view === "impact")) {
      const st = S.run.stateAt(id, S.clock), up = S.run.up[id];
      simBlock = `<div class="sec">In this scenario</div><div class="kv"><div><div class="k">Now</div><div class="v">${st}</div></div><div><div class="k">Back at</div><div class="v">${up ? fmtH(up) : "never down"}</div></div><div><div class="k">Data lost</div><div class="v">${fmtH(S.run.loss[id] || 0)}</div></div></div>`;
      if (S.run.chain(id).length > 1) simBlock += `<div class="note-box">Waits on: ${S.run.chain(id).slice(1).map(name).join(" → ")}</div>`;
    }
    let failBlock = "";
    if (S.custom && S.view === "simulate" && !svc) {
      const seeded = S.seeds.find((s) => s.node === id);
      const modes = n.vendor || n.restore_h == null ? [["vendor", "Vendor outage 4 h"], ["vendor8", "Vendor outage 8 h"]] : [["outage", "Outage"], ["corruption", "Corruption"], ["compromise", "Compromise"]];
      failBlock = `<div class="sec">Fail this asset</div><div class="linklist">${modes.map(([k, l]) => `<button data-fail="${k}" class="${seeded && seeded.mode === k.replace("8", "") ? "on" : ""}">${l}</button>`).join("")}${seeded ? `<button data-fail="none">Restore it</button>` : ""}</div>
        <div class="muted" style="font-size:13px;margin-top:6px" data-tip="Outage uses failover if it exists. Corruption and compromise force a restore from the last good backup.">Outage uses failover; corruption and compromise force a restore.</div>`;
    }
    $("#drawerHead").innerHTML = `<div class="muted mono" style="font-size:13px">${id} · ${esc(n.lane)} · ${esc(SITE_LABEL[n.site] || n.site)}</div><h2>${esc(n.name)}</h2><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${n.owner ? `<span class="chip">${esc(n.owner)}</span>` : ""}<span class="chip">${n.tier}</span>${n.vendor ? `<span class="chip blue">vendor-managed</span>` : ""}</div>`;
    const kv = svc
      ? [["RTO", fmtH(n.rto)], ["RPO", fmtH(n.rpo)], ["Max tolerable", fmtH(n.mtd)], ["At risk / hour", money(n.revenue_per_hour)], ["Volume / hour", bigNum(n.transactions_per_hour)], ["Hours", n.hours_profile === "24x7" ? "24×7" : "Business"]]
      : [["RTO", fmtH(n.rto)], ["RPO", fmtH(n.rpo)], ["Failover", fmtH(n.failover_h)], ["Tested restore", n.vendor ? "vendor" : fmtH(n.restore_h)], ["Last test", n.last_tested || (n.restore_h ? "never" : "–")], ["Last good backup", n.data ? fmtH(n.backup_age_h) : "–"]];
    $("#drawerBody").innerHTML = `${failBlock}${simBlock}
      <div class="kv">${kv.map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`).join("")}</div>
      ${svc ? `<div class="note-box">${esc(n.customers)}${n.workaround ? ` · Workaround: ${esc(n.workaround.name)} (${Math.round(n.workaround.capacity * 100)}% after ${fmtH(n.workaround.after_h)})` : ""}</div>` : ""}
      ${n.note ? `<div class="note-box" style="margin-top:8px">${esc(n.note)}</div>` : ""}
      ${flags.length ? `<div class="sec">Flags</div>` + flags.map((f) => `<div class="flag ${f.c}"><span class="txt">${esc(f.t)}</span><span class="why" tabindex="0" data-tip="${esc(f.tip)}">Why?</span></div>`).join("") : ""}
      <div class="sec">Needs</div><div class="linklist">${deps.join("") || '<span class="muted">Nothing upstream</span>'}</div>
      ${(n.recovery_deps || []).length ? `<div class="sec">Needed to restore</div><div class="linklist">${n.recovery_deps.map((r) => `<button data-go="${r}">${esc(name(r))}</button>`).join("")}</div>` : ""}
      <div class="sec">Used by</div><div class="linklist">${users.map((u) => `<button data-go="${u}">${esc(name(u))}</button>`).join("") || '<span class="muted">No direct users</span>'}</div>
      ${inherit.length ? `<div class="sec">Services that depend on it</div><div class="linklist">${inherit.map((u) => `<button data-go="${u}">${esc(name(u))}</button>`).join("")}</div>` : ""}`;
    $$("[data-go]", $("#drawerBody")).forEach((b) => { b.onclick = () => openDrawer(b.dataset.go); });
    $$("[data-fail]", $("#drawerBody")).forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.fail;
        S.seeds = S.seeds.filter((s) => s.node !== id);
        if (k !== "none") {
          const seed = k.startsWith("vendor") ? { node: id, mode: "vendor", duration: k === "vendor8" ? 8 : 4 } : { node: id, mode: k };
          S.seeds.push(seed); log(`Custom: ${n.name} fails (${k.replace("8", " 8 h")})`);
        } else log(`Custom: ${n.name} restored`);
        S.selSvc = null;
        if (S.seeds.length) runScenario(true); else { S.run = null; S.rows = null; clearSimClasses(); renderSim(true); }
        openDrawer(id);
      };
    });
    T.nodes.forEach((x) => M.nodeEls[x.id].g.classList.toggle("selected", x.id === id));
    $("#drawer").classList.add("open");
  }
  function closeDrawer() { $("#drawer").classList.remove("open"); T.nodes.forEach((x) => M.nodeEls[x.id].g.classList.remove("selected")); }
  $("#drawerClose").onclick = closeDrawer;

  // ---------------------------------------------------------------- checks
  function check(id, label, expected, fn) {
    let actual, pass;
    try { const r = fn(); actual = r[0]; pass = r[1]; } catch (e) { actual = "error: " + e.message; pass = false; }
    return { id, label, expected, actual, pass };
  }
  function runChecks() {
    const sc = (id) => SCEN.find((s) => s.id === id);
    const svcRow = (sid, scId, opts) => { const s = sc(scId), r = E.run(T, s.seeds, opts || {}); return E.summary(T, r, E.startHour(s.start), opts || {}).find((x) => x.id === sid); };
    return [
      check("K1", "No failures", "All 11 services up, $0", () => { const r = E.run(T, []), rows = E.summary(T, r, E.startHour("Mon 09:00")); const ok = rows.every((x) => x.down_h === 0 && x.cost === 0); return [`${rows.filter((x) => x.down_h === 0).length} up, ${money(rows.reduce((a, b) => a + b.cost, 0))}`, ok]; }),
      check("K2", "SC01 ransomware: wires", "56 h, 24 h lost, via Active Directory", () => { const x = svcRow("S04", "SC01"); return [`${fmtH(x.down_h)}, ${fmtH(x.data_loss_h)} lost, ends at ${name(x.chain[x.chain.length - 1])}`, x.down_h === 56 && x.data_loss_h === 24 && x.chain.join(">") === "S04>A05>A04>D03>H04>P01>H10>H01"]; }),
      check("K3", "SC01 + break-glass + AD rehearsal", "Wires 26 h, cards 16 h", () => { const r = E.run(T, sc("SC01").seeds, { whatifs: ["W1", "W2"] }); return [`Wires ${fmtH(r.up.S04)}, cards ${fmtH(r.up.S01)}`, r.up.S04 === 26 && r.up.S01 === 16]; }),
      check("K4", "SC02 core DB corruption", "Digital 14 h, 31 h lost, 192,600 to rebuild; 4 h with 4-hour backups", () => { const x = svcRow("S02", "SC02"), y = E.run(T, sc("SC02").seeds, { whatifs: ["W5"] }); return [`${fmtH(x.down_h)}, ${fmtH(x.data_loss_h)}, ${x.txn_lost.toLocaleString("en-US")}; ${fmtH(y.dataLoss("S02"))}`, x.down_h === 14 && x.data_loss_h === 31 && x.txn_lost === 192600 && y.dataLoss("S02") === 4]; }),
      check("K5", "SC03 primary site power loss", "Cards 48 h; 15 min with HSM pair in DC2", () => { const a = E.run(T, sc("SC03").seeds), b = E.run(T, sc("SC03").seeds, { whatifs: ["W3"] }); return [`${fmtH(a.up.S01)} → ${fmtH(b.up.S01)}`, a.up.S01 === 48 && b.up.S01 === 0.25]; }),
      check("K6", "SC12 fiber cut, then diverse entry", "4 services down, digital 20 h; none with fix", () => { const a = E.run(T, sc("SC12").seeds), b = E.run(T, sc("SC12").seeds, { whatifs: ["W4"] }); const na = SVCS.filter((s) => a.up[s] > 0).length, nb = SVCS.filter((s) => b.up[s] > 0).length; return [`${na} down, digital ${fmtH(a.up.S02)}; ${nb} with fix`, na === 4 && a.up.S02 === 20 && nb === 0]; }),
      check("K7", "SC13 DNS: wires exactly at target", "2 h, shown as met", () => { const x = svcRow("S04", "SC13"); return [`${fmtH(x.down_h)}, gap ${fmtH(x.rto_gap)}`, x.down_h === 2 && x.rto_gap === 0]; }),
      check("K8", "SC07 HSM failure, Fri 17:00", "Cards 18 h, $5,166,000", () => { const x = svcRow("S01", "SC07"); return [`${fmtH(x.down_h)}, $${x.cost.toLocaleString("en-US")}`, x.down_h === 18 && x.cost === 5166000]; }),
      check("K9", "SC09 ACH on payroll Friday", "$3,450,000", () => { const x = svcRow("S03", "SC09"); return [`$${x.cost.toLocaleString("en-US")}`, x.cost === 3450000]; }),
      check("K10", "Static checks", "8 of 11 · 20 · 20 · 11", () => [`${STATIC.paperMisses.length} of ${SVCS.length} · ${STATIC.inversions.length} · ${STATIC.untested.length} · ${STATIC.spof.length}`, STATIC.paperMisses.length === 8 && STATIC.inversions.length === 20 && STATIC.untested.length === 20 && STATIC.spof.length === 11]),
      check("K11", "Approvals", "Rules hold", () => {
        const m = { lastEditor: "continuity" };
        const a = !Rules.canApproveMemo(null, "continuity").ok, b = !Rules.canApproveMemo({ lastEditor: "ai" }, "facilitator").ok, c = !Rules.canApproveMemo(m, "continuity").ok, d = Rules.canApproveMemo({ lastEditor: "ai" }, "continuity").ok;
        const base = E.run(T, sc("SC01").seeds).up.S04; E.run(T, sc("SC01").seeds, { whatifs: ["W1", "W2"] }); const e = E.run(T, sc("SC01").seeds).up.S04 === base;
        const f = !Rules.validateGap("S04", "facilitator", "Long enough reason", "2026-12-01").ok, g = !Rules.validateGap("S04", "payments", "", "2026-12-01").ok, h = !Rules.validateGap("S04", "payments", "Long enough reason", "2027-03-01").ok, i = Rules.validateGap("S04", "payments", "Long enough reason", "2026-12-01").ok;
        const all = [a, b, c, d, e, f, g, h, i];
        return [`${all.filter(Boolean).length} of ${all.length} rules`, all.every(Boolean)];
      }),
      check("K12", "Counts of 0 and 1", "1 hour · 0 services · 1 asset", () => { const s = [plural(1, "hour"), plural(0, "service"), plural(1, "asset"), plural(2, "fix", "fixes"), plural(1, "recovery", "recoveries")].join(" · "); return [s, s === "1 hour · 0 services · 1 asset · 2 fixes · 1 recovery"]; }),
    ];
  }
  function renderChecks() {
    const res = runChecks(), pass = res.filter((r) => r.pass).length;
    $("#checkCount").textContent = `${pass}/${res.length}`;
    $("#checkList").innerHTML = res.map((r) => `<div class="check"><span class="id">${r.id}</span><div><div><b>${esc(r.label)}</b></div><div class="ex">Expected: ${esc(r.expected)}</div><div class="ex">Actual: ${esc(r.actual)}</div></div><span class="res ${r.pass ? "pass" : "fail"}">${r.pass ? "Pass" : "Fail"}</span></div>`).join("");
    return res;
  }
  $("#rerunChecks").onclick = () => { const r = renderChecks(); log(`Checks run: ${r.filter((x) => x.pass).length} of ${r.length} pass`); };

  // ---------------------------------------------------------------- top bar
  $("#persona").innerHTML = PERSONAS.map((p) => `<option value="${p.id}">${p.name} · ${p.role}</option>`).join("");
  $("#persona").onchange = (e) => { S.persona = e.target.value; log(`Now viewing as ${who()}`); if (S.view === "decide") renderDecide(); };
  $("#btnLog").onclick = () => { $("#checkPanel").classList.remove("open"); $("#logPanel").classList.toggle("open"); };
  $("#btnChecks").onclick = () => { $("#logPanel").classList.remove("open"); renderChecks(); $("#checkPanel").classList.toggle("open"); };
  $$("[data-close]").forEach((b) => { b.onclick = () => $("#" + b.dataset.close).classList.remove("open"); });
  $("#btnPresenter").onclick = () => { document.body.classList.toggle("presenter"); setTimeout(() => setView(S.view), 50); };
  $("#btnReset").onclick = reset;
  function reset() {
    S = fresh(); closeDrawer(); clearSimClasses(); fit();
    $("#persona").value = S.persona; $("#scenarioName").textContent = "Choose a scenario"; $("#logCount").textContent = "0";
    $("#clock").max = 72; syncStart();
    $$("#speed button").forEach((x) => x.classList.toggle("on", x.dataset.s === "4"));
    $("#logPanel").classList.remove("open"); $("#checkPanel").classList.remove("open");
    setView("map"); log("Reset"); renderChecks();
  }
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select, [contenteditable=true]")) return;
    if (e.key >= "1" && e.key <= "5") setView(["map", "targets", "simulate", "impact", "decide"][Number(e.key) - 1]);
    else if (e.key === " ") { e.preventDefault(); if (S.view === "simulate") togglePlay(); }
    else if (e.key === "p" || e.key === "P") $("#btnPresenter").click();
    else if (e.key === "Escape") { closeDrawer(); closeLibrary(); $("#logPanel").classList.remove("open"); $("#checkPanel").classList.remove("open"); }
  });
  let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => setView(S.view), 120); });

  // ---------------------------------------------------------------- start
  initSimControls();
  renderLog();
  setView("map");
  renderChecks();
  window.BC03App = { state: () => S, setView, pickScenario, runChecks, openDrawer };
})();
