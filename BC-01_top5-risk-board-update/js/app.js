// BC-01 · Top 5 Risk Board · prototype logic (visual scheme 8 · Ocean Depth)
(function () {
  const D = window.BC01, C = D.CURRENT, NS = "http://www.w3.org/2000/svg";
  const $ = id => document.getElementById(id);
  const byId = id => D.RISKS.find(r => r.id === id);
  const COL = { text: "#E3F1FB", muted: "#8FA9BF", dim: "#5E7A92", line: "rgba(227,241,251,.12)", accent: "#FFB547", second: "#4FD1C5", bad: "#FF7A90", good: "#B8E986", bg: "#071A2B" };
  const state = { view: "now", ai: true, playing: false, raf: null };

  const VIEWS = {
    now: { h: "Top five cyber risks, " + D.quarterLabel(C), sub: "Ranked by score, against industry and roadmap" },
    lastq: { h: "What changed since last quarter?", sub: D.quarterLabel(C - 1) + " → " + D.quarterLabel(C) },
    lasty: { h: "What changed since last year?", sub: D.quarterLabel(C - 4) + " → " + D.quarterLabel(C) },
    five: { h: "Five years of shifting risk", sub: "Press play to watch the ranking change" }
  };
  const VIEW_NAMES = { now: "This quarter", lastq: "Last quarter", lasty: "Last year", five: "5 years" };

  // ---------- helpers ----------
  function el(tag, attrs, parent) {
    const svg = tag.startsWith("svg:");
    const n = svg ? document.createElementNS(NS, tag.slice(4)) : document.createElement(tag);
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (v === null || v === undefined) continue;
      if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else n.setAttribute(k, v);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  const fmt = n => (Math.round(n * 10) / 10).toString();
  const rankOf = (id, i) => D.RANKS[i][id];
  const inTop = (id, i) => rankOf(id, i) <= 5;
  function stamp() { const d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, "0")).join(":"); }
  function log(msg) { $("logList").prepend(el("li", { html: "<span>" + stamp() + "</span>" + msg })); }

  // ---------- tooltips (hover and keyboard focus) ----------
  const tip = $("tip");
  function showTip(target) {
    const text = target.getAttribute("data-tip");
    if (!text) return;
    tip.textContent = text;
    tip.classList.add("show");
    const r = target.getBoundingClientRect(), t = tip.getBoundingClientRect();
    let x = r.left + r.width / 2 - t.width / 2, y = r.top - t.height - 10;
    if (y < 8) y = r.bottom + 10;
    x = Math.max(8, Math.min(window.innerWidth - t.width - 8, x));
    y = Math.min(window.innerHeight - t.height - 56, y);
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function hideTip() { tip.classList.remove("show"); }
  document.addEventListener("mouseover", e => { const t = e.target.closest && e.target.closest("[data-tip]"); t ? showTip(t) : hideTip(); });
  document.addEventListener("focusin", e => { const t = e.target.closest && e.target.closest("[data-tip]"); t ? showTip(t) : hideTip(); });
  document.addEventListener("focusout", hideTip);
  window.addEventListener("scroll", hideTip, true);

  // ---------- comparison facts ----------
  function compare(prevIdx) {
    const now = D.topFive(C).map(r => r.id), prev = D.topFive(prevIdx).map(r => r.id);
    const entered = now.filter(id => !prev.includes(id)), left = prev.filter(id => !now.includes(id));
    let climber = null, best = 0;
    now.filter(id => prev.includes(id)).forEach(id => {
      const d = rankOf(id, prevIdx) - rankOf(id, C);
      if (d > best) { best = d; climber = id; }
    });
    const ms = climber ? D.MILESTONES.filter(m => m.q > prevIdx && m.q <= C && m.risks.includes(climber)).pop() : null;
    return { entered, left, climber, ms, prevIdx };
  }

  // ---------- KPI tiles ----------
  function kpi(parent, k, v, cls, tipText, wide, delay) {
    el("div", { class: "card kpi" + (wide ? " wide" : ""), tabindex: 0, "data-tip": tipText, style: "animation-delay:" + delay + "s",
      html: "<div class='k'>" + k + "</div><div class='v " + (cls || "") + "'>" + v + "</div>" }, parent);
  }
  function fitKpis() {
    document.querySelectorAll(".kpi .v").forEach(v => {
      v.style.fontSize = "";
      let size = parseFloat(getComputedStyle(v).fontSize);
      while (v.scrollWidth > v.clientWidth + 1 && size > 12) { size -= 1; v.style.fontSize = size + "px"; }
    });
  }
  window.addEventListener("resize", () => fitKpis());
  function renderKpis() {
    const box = $("kpis"); box.innerHTML = "";
    requestAnimationFrame(fitKpis);
    if (state.view === "now") {
      const top = D.topFive(C);
      const above = top.filter(r => r.scores[C] > D.DETAIL[r.id].benchmark).length;
      const avg = Math.round(top.reduce((a, r) => a + D.DETAIL[r.id].progress, 0) / 5);
      kpi(box, "#1 risk", top[0].short, "accent", top[0].name + " · " + fmt(top[0].scores[C]) + " of 25", false, 0);
      kpi(box, "New", "Secure code", "", "Entered the top five this quarter, replacing third-party risk", false, .06);
      kpi(box, "Above industry", above + " of 5", "bad", "Risks scoring higher than the fictional industry benchmark", false, .12);
      kpi(box, "Mitigated", avg + "%", "good", "Average completion of the five mitigation plans", false, .18);
    } else if (state.view === "five") {
      const first = D.topFive(0), now = D.topFive(C).map(r => r.id);
      const rotated = first.filter(r => !now.includes(r.id)).length;
      kpi(box, "#1 in " + D.quarterLabel(0).slice(3), first[0].short, "", first[0].name + " led the list in " + D.quarterLabel(0), false, 0);
      kpi(box, "#1 now", D.topFive(C)[0].short, "accent", D.topFive(C)[0].name + " leads in " + D.quarterLabel(C), false, .06);
      kpi(box, "Rotated out", rotated + " of 5", "", "Risks from the " + D.quarterLabel(0) + " top five that are no longer in it", false, .12);
      kpi(box, "AI climb", "#" + rankOf("ai", 0) + " → #1", "accent", "AI security's rank five years ago vs today", false, .18);
    } else {
      const f = compare(state.view === "lastq" ? C - 1 : C - 4);
      if (f.climber) kpi(box, "Climbed", byId(f.climber).short, "bad", byId(f.climber).name + ": #" + rankOf(f.climber, f.prevIdx) + " → #" + rankOf(f.climber, C), false, 0);
      kpi(box, "Entered", f.entered.length ? f.entered.map(id => byId(id).short).join(", ") : "None", "accent", "New to the top five since " + D.quarterLabel(f.prevIdx), false, .06);
      kpi(box, "Dropped", f.left.length ? f.left.map(id => byId(id).short).join(", ") : "None", "good", "Left the top five since " + D.quarterLabel(f.prevIdx), false, .12);
      if (f.ms) kpi(box, "Roadmap link", f.ms.label, "", f.ms.full + " (" + D.quarterLabel(f.ms.q) + ")", false, .18);
    }
  }

  // ---------- simulated AI summary ----------
  function bullets() {
    if (state.view === "now") return [
      { t: "<b>AI security</b> is now #1", hl: true },
      { t: "Unreviewed AI tools: 21 → 34" },
      { t: "Secure code in; third parties out" },
      { t: "Admins without MFA: 19 → 12" }
    ];
    if (state.view === "five") return [
      { t: "2021 leaders: ransomware, phishing" },
      { t: "<b>AI security:</b> #8 → #1", hl: true },
      { t: "Same format, different risks" }
    ];
    const f = compare(state.view === "lastq" ? C - 1 : C - 4), out = [];
    if (f.climber) out.push({ t: "<b>" + byId(f.climber).name + ":</b> #" + rankOf(f.climber, f.prevIdx) + " → #" + rankOf(f.climber, C), hl: true });
    if (f.ms) out.push({ t: "Tracks the roadmap: " + f.ms.label + " (" + D.quarterLabel(f.ms.q) + ")" });
    if (f.entered.length) out.push({ t: "In: " + f.entered.map(id => byId(id).name).join(", ") });
    if (f.left.length) out.push({ t: "Out: " + f.left.map(id => byId(id).name).join(", ") });
    return out;
  }
  function renderSummary() {
    const ul = $("summary"); ul.innerHTML = "";
    if (!state.ai) { el("li", { class: "ai-off", text: "AI summary is off." }, ul); ul.firstChild.style.opacity = 1; return; }
    bullets().forEach((b, i) => el("li", { class: b.hl ? "hl" : "", html: "<span>" + b.t + "</span>", style: "animation-delay:" + (i * .08) + "s" }, ul));
  }

  // ---------- stage header ----------
  function stageTop(stage, legendHtml, infoTip, extraLeft) {
    const top = el("div", { class: "stage-top" }, stage);
    const left = el("div", { class: "legend", html: legendHtml }, top);
    if (extraLeft) top.insertBefore(extraLeft, left);
    el("button", { class: "info", "data-tip": infoTip, "aria-label": "How to read this", text: "?" }, top);
    return top;
  }

  function miniRing(pct) {
    const s = el("svg:svg", { viewBox: "0 0 48 48", width: 48, height: 48 });
    const c = 2 * Math.PI * 19;
    el("svg:circle", { cx: 24, cy: 24, r: 19, fill: "none", stroke: "rgba(227,241,251,.1)", "stroke-width": 5 }, s);
    el("svg:circle", { cx: 24, cy: 24, r: 19, fill: "none", stroke: COL.second, "stroke-width": 5, "stroke-linecap": "round",
      "stroke-dasharray": (c * pct / 100) + " " + c, transform: "rotate(-90 24 24)" }, s);
    el("svg:text", { x: 24, y: 28, "text-anchor": "middle", class: "mono", "font-size": 11, text: pct + "%" }, s);
    return s;
  }

  // ---------- view: this quarter ----------
  function renderNow(stage) {
    stageTop(stage, "<span><i style='background:var(--second)'></i>Score</span><span><i style='background:var(--text);width:3px'></i>Industry</span><span><i style='background:var(--second);border-radius:50%;width:8px'></i>Mitigated</span>",
      "Score = likelihood × impact, out of 25. The white tick is a fictional industry benchmark. The ring shows mitigation progress. Click a risk for detail.");
    const rows = el("div", { class: "rows" }, stage);
    D.topFive(C).forEach((r, n) => {
      const det = D.DETAIL[r.id], s = r.scores[C], rank = n + 1, prev = rankOf(r.id, C - 1);
      let chip;
      if (!inTop(r.id, C - 1)) chip = ["new", "● New", "Not in the top five last quarter (#" + prev + ")"];
      else if (prev > rank) chip = ["up", "▲ " + (prev - rank), "Up from #" + prev + " last quarter"];
      else if (prev < rank) chip = ["down", "▼ " + (rank - prev), "Down from #" + prev + " last quarter"];
      else chip = ["flat", "— Same", "Also #" + prev + " last quarter"];
      const card = el("button", { class: "rcard" + (rank === 1 ? " top" : ""), style: "animation-delay:" + (n * .08) + "s", "data-risk": r.id }, rows);
      el("div", { class: "rank", text: rank }, card);
      el("div", { html: "<div class='rname'>" + r.name + "</div><div class='rsub'>" + det.indicators[0].label + ": " + det.indicators[0].now + det.indicators[0].unit + "</div>" }, card);
      const bc = el("div", {}, card);
      const bench = el("div", { class: "bench", "data-tip": "Us " + fmt(s) + " · industry " + det.benchmark + " (fictional)" }, bc);
      const fill = el("div", { class: "fill" }, bench);
      el("div", { class: "tick", style: "left:" + (det.benchmark / 25 * 100) + "%" }, bench);
      el("div", { class: "rscore", "data-tip": "Likelihood " + fmt(s / r.impact) + " × impact " + r.impact, html: fmt(s) + "<small>/25</small>" }, card);
      el("div", {}, card).appendChild(el("span", { class: "chip " + chip[0], "data-tip": chip[2], text: chip[1] }));
      const ringWrap = el("div", { "data-tip": det.progress + "% mitigated · Next: " + det.next + " (" + det.nextWhen + ")" }, card);
      ringWrap.appendChild(miniRing(det.progress));
      card.addEventListener("click", () => openRisk(r.id));
      setTimeout(() => { fill.style.width = (s / 25 * 100) + "%"; }, 200 + n * 80);
    });
    const rm = el("div", { class: "roadmap" }, stage);
    el("span", { class: "eyebrow", text: "Next on roadmap" }, rm);
    D.UPCOMING.forEach(u => el("span", { class: "rm", tabindex: 0, "data-tip": u.full + " · affects " + u.risks.map(id => byId(id).name).join(", "),
      html: "<span class='mono'>" + u.when + "</span>" + u.label }, rm));
  }

  // ---------- view: comparison ----------
  function renderCompare(stage, prevIdx) {
    stageTop(stage, "<span><i style='background:var(--bad)'></i>Rose</span><span><i style='background:var(--text)'></i>Held or fell</span><span><i style='background:var(--accent)'></i>New</span><span><i style='background:var(--dim)'></i>Dropped</span>",
      "Left column: " + D.quarterLabel(prevIdx) + ". Right column: now. Lines link the same risk. Click a risk for detail.");
    const W = 1000, H = 540, xL = 320, xR = 680, y0 = 60, gap = 86, yOut = 500;
    const svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Top five compared" }, stage);
    el("svg:text", { x: xL, y: 22, "text-anchor": "middle", class: "mono", "font-size": 15, fill: COL.muted, text: D.quarterLabel(prevIdx) }, svg);
    el("svg:text", { x: xR, y: 22, "text-anchor": "middle", class: "mono", "font-size": 15, fill: COL.accent, text: D.quarterLabel(C) + " · now" }, svg);
    [xL, xR].forEach(x => el("svg:line", { x1: x, y1: 36, x2: x, y2: yOut - 28, stroke: COL.line }, svg));
    el("svg:line", { x1: 180, y1: yOut, x2: 820, y2: yOut, stroke: COL.line, "stroke-dasharray": "4 6" }, svg);
    el("svg:text", { x: W / 2, y: yOut + 28, "text-anchor": "middle", class: "mono", "font-size": 12, fill: COL.dim, text: "outside top five" }, svg);
    const prevTop = D.topFive(prevIdx).map(r => r.id), nowTop = D.topFive(C).map(r => r.id);
    const ids = Array.from(new Set(prevTop.concat(nowTop)));
    const yFor = (id, i) => inTop(id, i) ? y0 + (rankOf(id, i) - 1) * gap + 14 : yOut;
    ids.forEach((id, k) => {
      const r = byId(id), ya = yFor(id, prevIdx), yb = yFor(id, C);
      const entered = !inTop(id, prevIdx), left = !inTop(id, C), rose = !entered && !left && rankOf(id, prevIdx) > rankOf(id, C);
      const color = entered ? COL.accent : left ? COL.dim : rose ? COL.bad : COL.text;
      const tipText = r.name + ": " + (entered ? "new, was #" + rankOf(id, prevIdx) : "#" + rankOf(id, prevIdx)) + " → " + (left ? "#" + rankOf(id, C) + ", dropped out" : "#" + rankOf(id, C));
      const g = el("svg:g", { class: left ? "" : "hot", tabindex: 0, "data-tip": tipText }, svg);
      el("svg:line", { x1: xL, y1: ya, x2: xR, y2: yb, stroke: color, "stroke-width": entered || left ? 3 : 4, "stroke-linecap": "round",
        "stroke-dasharray": left ? "6 7" : null, class: left ? "fade" : "draw", style: "animation-delay:" + (k * .1) + "s", opacity: (rose || entered) ? 1 : .8 }, g);
      el("svg:circle", { cx: xL, cy: ya, r: 7, fill: entered ? COL.bg : color, stroke: color, "stroke-width": 2 }, g);
      el("svg:circle", { cx: xR, cy: yb, r: 7, fill: left ? COL.bg : color, stroke: color, "stroke-width": 2 }, g);
      if (!entered) {
        el("svg:text", { x: xL - 18, y: ya + 6, "text-anchor": "end", "font-size": 19, "font-weight": 600, fill: left ? COL.muted : COL.text, text: r.short + "  #" + rankOf(id, prevIdx) }, g);
        el("svg:text", { x: xL - 18, y: ya + 25, "text-anchor": "end", class: "mono", "font-size": 12, fill: COL.dim, text: fmt(r.scores[prevIdx]) + "/25" }, g);
      }
      if (!left) {
        el("svg:text", { x: xR + 18, y: yb + 6, "font-size": 19, "font-weight": 700, fill: rose || entered ? color : COL.text, text: "#" + rankOf(id, C) + "  " + r.short }, g);
        el("svg:text", { x: xR + 18, y: yb + 25, class: "mono", "font-size": 12, fill: COL.dim, text: fmt(r.scores[C]) + "/25" + (entered ? " · new" : "") }, g);
        g.addEventListener("click", () => openRisk(id));
      } else {
        el("svg:text", { x: xR + 18, y: yb + 6, "font-size": 16, fill: COL.dim, text: r.short + " · out" }, g);
      }
    });
  }

  // ---------- view: five years ----------
  function renderFive(stage) {
    const ctl = el("div", { class: "play" });
    const btn = el("button", { text: "▶ Play", "data-tip": "Shortcut: P" }, ctl);
    const qLabel = el("span", { class: "mono", text: D.quarterLabel(0) }, ctl);
    stageTop(stage, "<span><i style='background:var(--accent)'></i>AI security</span><span><i style='background:var(--accent);width:9px;height:9px;transform:rotate(45deg)'></i>Roadmap</span>",
      "Each line is a risk's rank over 20 quarters. The shaded band is the top five. Diamonds are business roadmap milestones; hover them for detail.", ctl);

    const W = 1100, H = 610, xa = 150, xb = 880, ya = 34, rowH = 54, ranks = D.RISKS.length;
    const X = i => xa + (xb - xa) * i / (D.QUARTERS - 1), Y = rk => ya + (rk - 1) * rowH;
    const svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Five-year ranking" }, stage);
    el("svg:rect", { x: xa - 12, y: Y(1) - 22, width: xb - xa + 24, height: rowH * 5 - 10, rx: 12, fill: "rgba(255,181,71,.06)", stroke: "rgba(255,181,71,.2)" }, svg);
    el("svg:text", { x: xb + 4, y: Y(1) - 22 + rowH * 5 - 18, "text-anchor": "end", class: "mono", "font-size": 11, fill: COL.accent, text: "TOP FIVE" }, svg);
    for (let i = 0; i < D.QUARTERS; i++) {
      const lab = D.quarterLabel(i);
      if ((lab.startsWith("Q1") && i > 1 && i < C - 1) || i === 0 || i === C) {
        el("svg:text", { x: X(i), y: Y(ranks) + 40, "text-anchor": "middle", class: "mono", "font-size": 12, fill: COL.dim, text: i === 0 || i === C ? lab : lab.slice(3) }, svg);
      }
    }
    D.MILESTONES.forEach((m, k) => {
      const x = X(m.q), yb = Y(ranks) + 72 + (k % 3) * 26;
      el("svg:line", { x1: x, y1: Y(ranks) + 22, x2: x, y2: yb - 6, stroke: "rgba(255,181,71,.35)", "stroke-dasharray": "2 4" }, svg);
      const g = el("svg:g", { tabindex: 0, "data-tip": m.full + " · " + D.quarterLabel(m.q) + " · affects " + m.risks.map(id => byId(id).name).join(", "), "data-q": m.q, opacity: .3, class: "ms" }, svg);
      el("svg:rect", { x: x - 6, y: yb - 6, width: 12, height: 12, fill: COL.accent, transform: "rotate(45 " + x + " " + yb + ")" }, g);
      el("svg:text", { x: x + 12, y: yb + 5, class: "mono", "font-size": 12, fill: COL.text, text: m.label }, g);
    });
    const defs = el("svg:defs", {}, svg);
    const cp = el("svg:clipPath", { id: "reveal" }, defs);
    const clipRect = el("svg:rect", { x: 0, y: 0, width: X(0) + 12, height: H }, cp);
    const lines = el("svg:g", { "clip-path": "url(#reveal)" }, svg);
    const nowIds = D.topFive(C).map(r => r.id);
    D.RISKS.slice().sort((a, b) => (a.id === "ai") - (b.id === "ai") || nowIds.includes(a.id) - nowIds.includes(b.id)).forEach(r => {
      const strong = nowIds.includes(r.id), pts = [];
      for (let i = 0; i < D.QUARTERS; i++) pts.push(X(i) + "," + Y(rankOf(r.id, i)));
      const g = el("svg:g", { class: "hot", tabindex: 0, "data-tip": r.name + ": #" + rankOf(r.id, 0) + " → #" + rankOf(r.id, C) }, lines);
      el("svg:polyline", { points: pts.join(" "), fill: "none", stroke: r.color, "stroke-width": r.id === "ai" ? 7 : strong ? 4 : 2.5,
        "stroke-linejoin": "round", "stroke-linecap": "round", opacity: strong ? 1 : .55 }, g);
      el("svg:circle", { cx: X(C), cy: Y(rankOf(r.id, C)), r: r.id === "ai" ? 7 : 4, fill: r.color }, g);
      g.addEventListener("click", () => openRisk(r.id));
    });
    D.RISKS.forEach(r => el("svg:text", { x: xa - 22, y: Y(rankOf(r.id, 0)) + 6, "text-anchor": "end", "font-size": 16, "font-weight": 600,
      fill: inTop(r.id, 0) ? COL.text : COL.dim, text: r.short }, svg));
    const endG = el("svg:g", { opacity: 0, style: "transition: opacity .6s" }, svg);
    D.RISKS.forEach(r => {
      const ai = r.id === "ai", strong = nowIds.includes(r.id);
      el("svg:text", { x: xb + 22, y: Y(rankOf(r.id, C)) + 6, "font-size": ai ? 19 : 16, "font-weight": ai ? 800 : 600,
        fill: ai ? COL.accent : strong ? COL.text : COL.dim, text: "#" + rankOf(r.id, C) + " " + r.short }, endG);
    });
    const cursor = el("svg:line", { x1: X(0), y1: Y(1) - 24, x2: X(0), y2: Y(ranks) + 20, stroke: COL.text, "stroke-width": 1.5, "stroke-dasharray": "3 5", opacity: .7 }, svg);
    function setFrame(t) {
      const i = t * (D.QUARTERS - 1), x = xa + (xb - xa) * t;
      clipRect.setAttribute("width", x + 12);
      cursor.setAttribute("x1", x); cursor.setAttribute("x2", x);
      const qi = Math.min(C, Math.round(i));
      qLabel.textContent = D.quarterLabel(qi) + " · #1 " + D.topFive(qi)[0].short;
      svg.querySelectorAll(".ms").forEach(n => n.setAttribute("opacity", Number(n.dataset.q) <= i ? 1 : .3));
      endG.setAttribute("opacity", t >= 1 ? 1 : 0);
    }
    function play() {
      if (state.playing) return;
      state.playing = true; log("Played 5-year story"); btn.textContent = "Playing…";
      const start = performance.now(), dur = 7000;
      const step = now => {
        const t = Math.min(1, (now - start) / dur);
        setFrame(t);
        if (t < 1) state.raf = requestAnimationFrame(step); else { state.playing = false; btn.textContent = "↺ Replay"; }
      };
      state.raf = requestAnimationFrame(step);
    }
    btn.addEventListener("click", play);
    stage._play = play;
    setFrame(0);
  }

  // ---------- render ----------
  function moveSeg() {
    const on = document.querySelector(".seg-btn.on"), ind = document.querySelector(".seg-ind");
    if (!on) return;
    ind.style.width = on.offsetWidth + "px";
    ind.style.transform = "translateX(" + (on.offsetLeft - 4) + "px)";
  }
  function render() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.playing = false; hideTip();
    const stage = $("stage"); stage.innerHTML = ""; stage._play = null;
    $("question").textContent = VIEWS[state.view].h;
    $("subhead").textContent = VIEWS[state.view].sub;
    document.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("on", b.dataset.view === state.view));
    moveSeg();
    ({ now: renderNow, five: renderFive })[state.view] ? ({ now: renderNow, five: renderFive })[state.view](stage) : renderCompare(stage, state.view === "lastq" ? C - 1 : C - 4);
    renderKpis(); renderSummary();
  }
  function setView(v, quiet) { state.view = v; if (!quiet) log("Viewed: " + VIEW_NAMES[v]); render(); }

  // ---------- risk drawer ----------
  function spark(r) {
    const W = 480, H = 110, p = 8;
    const s = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%" });
    const X = i => p + (W - 2 * p) * i / (D.QUARTERS - 1), Yv = v => H - 24 - (H - 40) * v / 25;
    const area = r.scores.map((v, i) => X(i) + "," + Yv(v)).join(" ");
    el("svg:polygon", { points: X(0) + "," + Yv(0) + " " + area + " " + X(C) + "," + Yv(0), fill: r.color, opacity: .12 }, s);
    el("svg:polyline", { points: area, fill: "none", stroke: r.color, "stroke-width": 3, "stroke-linejoin": "round", class: "draw" }, s);
    el("svg:circle", { cx: X(C), cy: Yv(r.scores[C]), r: 6, fill: r.color }, s);
    el("svg:text", { x: p, y: H - 4, class: "mono", "font-size": 11, fill: COL.dim, text: D.quarterLabel(0) }, s);
    el("svg:text", { x: W - p, y: H - 4, "text-anchor": "end", class: "mono", "font-size": 11, fill: COL.dim, text: D.quarterLabel(C) }, s);
    return s;
  }
  function ring(pct) {
    const s = el("svg:svg", { viewBox: "0 0 84 84", width: 84, height: 84 }), c = 2 * Math.PI * 34;
    el("svg:circle", { cx: 42, cy: 42, r: 34, fill: "none", stroke: "rgba(227,241,251,.1)", "stroke-width": 9 }, s);
    el("svg:circle", { cx: 42, cy: 42, r: 34, fill: "none", stroke: COL.second, "stroke-width": 9, "stroke-linecap": "round",
      "stroke-dasharray": (c * pct / 100) + " " + c, transform: "rotate(-90 42 42)" }, s);
    el("svg:text", { x: 42, y: 48, "text-anchor": "middle", class: "mono", "font-size": 17, text: pct + "%" }, s);
    return s;
  }
  function openRisk(id) {
    const r = byId(id), det = D.DETAIL[id], s = r.scores[C], body = $("drawerBody");
    body.innerHTML = "";
    el("div", { class: "dmeta", text: inTop(id, C) ? "#" + rankOf(id, C) + " · " + D.quarterLabel(C) : "#" + rankOf(id, C) + " · outside top five" }, body);
    el("h2", { text: r.name }, body);
    el("div", { class: "big", html: fmt(s) + "<small> / 25</small>" }, body);
    el("div", { class: "why", html: "<div class='formula'>" + fmt(s / r.impact) + " likelihood × " + r.impact + " impact</div>" +
      (det ? "Driven by " + det.indicators.map(i => i.tip.charAt(0).toLowerCase() + i.tip.slice(1) + " (" + i.now + i.unit + ")").join(" and ") + "." : "Tracked, but outside this quarter's top five.") }, body);
    if (det) {
      el("h3", { text: "vs industry" }, body);
      [["Us", s, r.color], ["Industry", det.benchmark, COL.dim]].forEach(([lab, v, col]) =>
        el("div", { class: "vs", "data-tip": lab === "Industry" ? "Fictional benchmark" : null, html: "<span>" + lab + "</span><div class='t'><span style='width:" + (v / 25 * 100) + "%;background:" + col + "'></span></div><span class='mono'>" + fmt(v) + "</span>" }, body));
      el("h3", { text: "Drivers" }, body);
      det.indicators.forEach(i => {
        const ch = i.now - i.prev, worse = i.worseIsUp ? ch > 0 : ch < 0;
        el("div", { class: "ind", html: "<span class='lab' tabindex='0' data-tip='" + i.tip + "'>" + i.label + "</span><span class='v'>" + i.now + i.unit + "</span>" +
          "<span class='chip " + (worse ? "up" : "down") + "' data-tip='Last quarter: " + i.prev + i.unit + "'>" + (ch > 0 ? "▲ " : "▼ ") + Math.abs(ch) + i.unit + "</span>" }, body);
      });
      el("h3", { text: "Mitigation" }, body);
      const rg = el("div", { class: "ring" }, body);
      rg.appendChild(ring(det.progress));
      el("div", { html: "<div class='eyebrow'>Next · " + det.nextWhen + "</div><div style='margin-top:4px;font-weight:600'>" + det.next + "</div>" }, rg);
    }
    const ms = D.MILESTONES.filter(m => m.risks.includes(id)), up = D.UPCOMING.filter(m => m.risks.includes(id));
    if (ms.length || up.length) {
      el("h3", { text: "Roadmap" }, body);
      ms.forEach(m => el("div", { class: "mstone", tabindex: 0, "data-tip": m.full, html: "<span class='mono'>" + D.quarterLabel(m.q) + "</span>" + m.label }, body));
      up.forEach(m => el("div", { class: "mstone up", tabindex: 0, "data-tip": m.full + " (upcoming)", html: "<span class='mono'>" + m.when + "</span>" + m.label }, body));
    }
    el("h3", { text: "5-year score" }, body);
    body.appendChild(spark(r));
    $("drawer").classList.add("open"); $("drawer").setAttribute("aria-hidden", "false");
    log("Opened: " + r.name);
  }

  // ---------- about ----------
  function checks() {
    let ok1 = true;
    for (let i = 0; i < D.QUARTERS; i++) { const t = D.topFive(i); if (t.length !== 5 || t.some((r, n) => rankOf(r.id, i) !== n + 1)) ok1 = false; }
    const dropped = D.topFive(0).filter(r => !inTop(r.id, C)).map(r => r.name);
    return [
      [ok1, "Five ranked risks, every quarter", "All 20 quarters show exactly five risks ranked 1 to 5"],
      [D.topFive(C).map(r => r.id).join() !== D.topFive(C - 1).map(r => r.id).join(), "Quarters differ", "This quarter's top five differs from last quarter's"],
      [dropped.length > 0, "Old risks rotated out", "No longer in the top five: " + dropped.join(", ")],
      [!inTop("ai", 0) && rankOf("ai", C) <= 2, "AI security rose", "Outside the top five in " + D.quarterLabel(0) + ", top two now"]
    ];
  }
  function openAbout() {
    const body = $("aboutBody"); body.innerHTML = "";
    el("div", { class: "dmeta", text: "BC-01 · Dashboard · Owner: Aby Rao" }, body);
    el("h2", { text: "About this build" }, body);
    el("div", { style: "color:var(--muted);font-size:15px", text: "One consistent quarterly view of the top five risks for the board." }, body);
    el("h3", { text: "Checks" }, body);
    const cw = el("div", { class: "checks" }, body);
    checks().forEach(([ok, label, tipText]) => el("div", { class: "check", tabindex: 0, "data-tip": tipText, html: "<span class='" + (ok ? "ok" : "no") + "'>" + (ok ? "PASS" : "FAIL") + "</span>" + label }, cw));
    el("h3", { text: "Guardrails" }, body);
    const gw = el("div", { class: "guards" }, body);
    [["Approved", "Built with an approved AI tool, using fictional data only"],
     ["Registered", "Listed in the build inventory as BC-01"],
     ["Minimal", "Reads only risk, quarter, likelihood, impact, two indicators per risk, mitigation, and roadmap"],
     ["Validated", "The checks above run each time this panel opens"],
     ["Supervised", "Read-only: it takes no actions, so no approval step is needed"],
     ["Logged", "Every view change and drill-down goes to the activity log"],
     ["Explainable", "Every score shows likelihood × impact and its drivers"],
     ["Owned", "Owner: Aby Rao. The AI summary has an off switch below"]
    ].forEach(([k, v]) => el("span", { class: "guard", tabindex: 0, "data-tip": v, text: k }, gw));
    el("h3", { text: "AI summary" }, body);
    const t = el("button", { class: "tool switch", "aria-pressed": state.ai ? "true" : "false", text: state.ai ? "On" : "Off", "data-tip": "Turn the simulated AI summary on or off" }, body);
    t.addEventListener("click", () => {
      state.ai = !state.ai; t.textContent = state.ai ? "On" : "Off"; t.setAttribute("aria-pressed", state.ai ? "true" : "false");
      log("AI summary " + (state.ai ? "on" : "off")); renderSummary();
    });
    $("about").classList.add("open"); $("about").setAttribute("aria-hidden", "false");
    log("Opened: About");
  }
  function closeAll() { ["drawer", "about"].forEach(id => { $(id).classList.remove("open"); $(id).setAttribute("aria-hidden", "true"); }); hideTip(); }

  // ---------- wiring ----------
  document.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeAll));
  $("aboutBtn").addEventListener("click", openAbout);
  $("logBtn").addEventListener("click", () => $("log").classList.toggle("open"));
  $("presenterBtn").addEventListener("click", e => {
    const on = document.body.classList.toggle("presenter");
    e.currentTarget.setAttribute("aria-pressed", on ? "true" : "false");
    log("Present mode " + (on ? "on" : "off")); render();
  });
  $("resetBtn").addEventListener("click", () => {
    closeAll(); state.ai = true;
    document.body.classList.remove("presenter"); $("presenterBtn").setAttribute("aria-pressed", "false");
    $("log").classList.remove("open"); $("logList").innerHTML = "";
    setView("now", true); log("Demo reset");
  });
  document.addEventListener("keydown", e => {
    const map = { "1": "now", "2": "lastq", "3": "lasty", "4": "five" };
    if (map[e.key]) setView(map[e.key]);
    if (e.key === "Escape") closeAll();
    if ((e.key === "p" || e.key === "P") && $("stage")._play) $("stage")._play();
  });
  window.addEventListener("resize", moveSeg);
  document.fonts && document.fonts.ready.then(() => { moveSeg(); fitKpis(); });

  $("quarterNow").textContent = D.quarterLabel(C);
  setView("now", true);
  log("Opened · " + D.quarterLabel(C));
})();
