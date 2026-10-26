// BC-01 · Quarterly Top 5 Risk Board Update · prototype logic
(function () {
  const D = window.BC01;
  const C = D.CURRENT;
  const NS = "http://www.w3.org/2000/svg";
  const $ = id => document.getElementById(id);
  const byId = id => D.RISKS.find(r => r.id === id);

  const state = { view: "now", aiSummary: true, playing: false, raf: null };

  const QUESTIONS = {
    now: "What are our top five cyber risks this quarter?",
    lastq: "What changed since last quarter?",
    lasty: "What changed since this time last year?",
    five: "How has our risk picture changed in five years?"
  };

  // ---------- helpers ----------
  function el(tag, attrs, parent) {
    const n = tag.startsWith("svg:") ? document.createElementNS(NS, tag.slice(4)) : document.createElement(tag);
    for (const k in (attrs || {})) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function stamp() {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, "0")).join(":");
  }
  function log(msg) {
    const li = el("li", { html: "<span>" + stamp() + "</span>" + msg });
    $("logList").prepend(li);
  }
  function rankOf(id, i) { return D.RANKS[i][id]; }
  function inTop(id, i) { return rankOf(id, i) <= 5; }
  function fmt(n) { return (Math.round(n * 10) / 10).toString(); }

  // ---------- simulated AI summaries ----------
  function changeSummary(prevIdx) {
    const now = D.topFive(C).map(r => r.id), prev = D.topFive(prevIdx).map(r => r.id);
    const entered = now.filter(id => !prev.includes(id));
    const left = prev.filter(id => !now.includes(id));
    let climber = null, best = 0;
    now.filter(id => prev.includes(id)).forEach(id => {
      const delta = rankOf(id, prevIdx) - rankOf(id, C);
      if (delta > best) { best = delta; climber = id; }
    });
    const parts = ["Since " + D.quarterLabel(prevIdx) + ":"];
    if (climber) {
      parts.push("<b>" + byId(climber).name + "</b> climbed from #" + rankOf(climber, prevIdx) + " to #" + rankOf(climber, C) + ".");
      const ms = D.MILESTONES.filter(m => m.q > prevIdx && m.q <= C && m.risks.includes(climber)).pop();
      if (ms) parts.push("That tracks with the roadmap milestone \"" + ms.label + "\" (" + D.quarterLabel(ms.q) + ").");
    }
    if (entered.length) parts.push("<b>" + entered.map(id => byId(id).name).join(", ") + "</b> entered the top five.");
    if (left.length) parts.push(left.map(id => byId(id).name).join(", ") + " dropped out.");
    if (!climber && !entered.length) parts.push("The top five held steady.");
    return parts.join(" ");
  }
  const SUMMARIES = {
    now: () => "<b>AI security</b> is now our #1 risk. Employees are using 34 AI tools that haven't been reviewed, up from 21, ahead of the AI assistant rollout in Q4. <b>Secure code</b> entered the top five, replacing third-party risk. Identity and access improved: privileged accounts without MFA fell from 19 to 12.",
    lastq: () => changeSummary(C - 1),
    lasty: () => changeSummary(C - 4),
    five: () => "Five years ago, <b>ransomware</b> and <b>phishing</b> led the list and AI security wasn't on it. Today <b>AI security</b> is #1. The format stayed the same every quarter; the risks didn't."
  };
  function renderSummary() {
    $("summaryText").innerHTML = state.aiSummary ? SUMMARIES[state.view]() : "<span style='color:var(--pencil)'>AI summary is turned off.</span>";
  }

  // ---------- view: this quarter ----------
  function renderNow(stage) {
    const rows = el("div", { class: "rows" }, stage);
    D.topFive(C).forEach((r, n) => {
      const det = D.DETAIL[r.id];
      const s = r.scores[C];
      const prevRank = rankOf(r.id, C - 1);
      const rank = n + 1;
      let trend;
      if (!inTop(r.id, C - 1)) trend = "<span class='new'><span class='arrow'>●</span>new</span>";
      else if (prevRank > rank) trend = "<span class='up'><span class='arrow'>▲</span>up " + (prevRank - rank) + "</span>";
      else if (prevRank < rank) trend = "<span class='down'><span class='arrow'>▼</span>down " + (rank - prevRank) + "</span>";
      else trend = "<span class='flat'><span class='arrow'>–</span>same</span>";

      const linked = D.UPCOMING.filter(u => u.risks.includes(r.id)).map(u => u.label)[0];
      const row = el("button", { class: "row clickable" + (rank === 1 ? " top" : ""), style: "animation-delay:" + (n * 0.09) + "s", "data-risk": r.id }, rows);
      row.innerHTML =
        "<div class='rank'>" + rank + "</div>" +
        "<div><div class='name'>" + r.name + "</div><div class='sub'>mitigation " + det.progress + "%" + (linked ? " · next on roadmap: " + linked : "") + "</div></div>" +
        "<div class='benchcell'><div class='bench'><div class='fill'></div><div class='tick' style='left:" + (det.benchmark / 25 * 100) + "%'></div></div>" +
        "<div class='bench-label'>industry " + det.benchmark + " (fictional)</div></div>" +
        "<div class='score'>" + fmt(s) + "<small>/25</small></div>" +
        "<div class='trend'>" + trend + "</div>";
      row.addEventListener("click", () => openRisk(r.id));
      requestAnimationFrame(() => setTimeout(() => { row.querySelector(".fill").style.width = (s / 25 * 100) + "%"; }, 150 + n * 90));
    });
    const lg = el("div", { class: "legend" }, stage);
    lg.innerHTML = "<span><i style='background:var(--ink)'></i>our score out of 25</span><span><i style='background:var(--pencil);width:3px'></i>industry benchmark (fictional)</span><span>▲ rose since last quarter · ● new to the top five</span>";
    const up = el("div", { class: "upcoming" }, stage);
    el("span", { class: "label", text: "Coming on the roadmap" }, up);
    D.UPCOMING.forEach(u => {
      el("span", { class: "chip", html: "<span class='mono'>" + u.when + "</span>" + u.label + " → " + u.risks.map(id => byId(id).name).join(", ") }, up);
    });
  }

  // ---------- view: comparison slope chart ----------
  function renderCompare(stage, prevIdx) {
    const W = 1140, H = 600, xL = 400, xR = 720, y0 = 70, gap = 92, yOut = 540;
    const svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Top five risks compared" }, stage);
    el("svg:text", { x: xL, y: 28, "text-anchor": "middle", class: "mono", "font-size": 16, fill: "#8A857C", text: D.quarterLabel(prevIdx) }, svg);
    el("svg:text", { x: xR, y: 28, "text-anchor": "middle", class: "mono", "font-size": 16, text: D.quarterLabel(C) + " (now)" }, svg);
    el("svg:line", { x1: xL, y1: 42, x2: xL, y2: yOut - 30, stroke: "#D6D0C3" }, svg);
    el("svg:line", { x1: xR, y1: 42, x2: xR, y2: yOut - 30, stroke: "#D6D0C3" }, svg);
    el("svg:text", { x: (xL + xR) / 2, y: yOut + 34, "text-anchor": "middle", class: "mono", "font-size": 13, fill: "#8A857C", text: "outside the top five" }, svg);
    el("svg:line", { x1: 200, y1: yOut, x2: 920, y2: yOut, stroke: "#D6D0C3", "stroke-dasharray": "4 6" }, svg);

    const prevTop = D.topFive(prevIdx).map(r => r.id), nowTop = D.topFive(C).map(r => r.id);
    const ids = Array.from(new Set(prevTop.concat(nowTop)));
    const yFor = (id, i) => inTop(id, i) ? y0 + (rankOf(id, i) - 1) * gap + 20 : yOut;

    ids.forEach((id, k) => {
      const r = byId(id);
      const ya = yFor(id, prevIdx), yb = yFor(id, C);
      const entered = !inTop(id, prevIdx), left = !inTop(id, C);
      const color = entered ? "#FF5A1F" : left ? "#A8A39A" : (rankOf(id, prevIdx) > rankOf(id, C) ? "#C4421A" : "#1A1A1A");
      const g = el("svg:g", { class: left ? "" : "clickable" }, svg);
      el("svg:line", { x1: xL, y1: ya, x2: xR, y2: yb, stroke: color, "stroke-width": entered || left ? 3 : 4,
        "stroke-dasharray": left ? "6 6" : null, class: left ? "fade" : "draw", style: "animation-delay:" + (k * 0.12) + "s" }, g);
      el("svg:circle", { cx: xL, cy: ya, r: 8, fill: entered ? "#F4F1EA" : color, stroke: color, "stroke-width": 2 }, g);
      el("svg:circle", { cx: xR, cy: yb, r: 8, fill: left ? "#F4F1EA" : color, stroke: color, "stroke-width": 2 }, g);
      if (!entered) {
        el("svg:text", { x: xL - 20, y: ya + 7, "text-anchor": "end", "font-size": 22, text: "#" + rankOf(id, prevIdx) + "  " + r.name }, g);
        el("svg:text", { x: xL - 20, y: ya + 28, "text-anchor": "end", class: "mono", "font-size": 13, fill: "#8A857C", text: fmt(r.scores[prevIdx]) + " / 25" }, g);
      }
      if (!left) {
        el("svg:text", { x: xR + 20, y: yb + 7, "font-size": 22, "font-weight": 500, text: "#" + rankOf(id, C) + "  " + r.name }, g);
        el("svg:text", { x: xR + 20, y: yb + 28, class: "mono", "font-size": 13, fill: entered ? "#FF5A1F" : "#8A857C",
          text: fmt(r.scores[C]) + " / 25" + (entered ? "  · new" : "") }, g);
        g.addEventListener("click", () => openRisk(id));
      } else {
        el("svg:text", { x: xR + 20, y: yb + 7, "font-size": 18, fill: "#8A857C", text: r.name + " · dropped out" }, g);
      }
    });
    const lg = el("div", { class: "legend" }, stage);
    lg.innerHTML = "<span><i style='background:#C4421A'></i>rose in rank</span><span><i style='background:#1A1A1A'></i>held or fell</span><span><i style='background:#FF5A1F'></i>entered the top five</span><span><i style='background:#A8A39A'></i>dropped out</span><span>click a risk for detail</span>";
  }

  // ---------- view: five-year bump chart ----------
  function renderFive(stage) {
    const ctl = el("div", { class: "play" }, stage);
    const btn = el("button", { text: "▶ Play five years" }, ctl);
    const qLabel = el("span", { class: "mono", text: "Press play · or press P" }, ctl);

    const W = 1320, H = 700, xa = 330, xb = 960, ya = 40, rowH = 56, ranks = D.RISKS.length;
    const X = i => xa + (xb - xa) * (i / (D.QUARTERS - 1));
    const Y = rk => ya + (rk - 1) * rowH;
    const svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Five-year ranking of cyber risks" }, stage);

    // top-five band
    el("svg:rect", { x: xa - 10, y: Y(1) - 24, width: xb - xa + 20, height: rowH * 5 - 8, fill: "#EBE6DB", rx: 6 }, svg);
    el("svg:text", { x: xa - 10, y: Y(1) - 30, class: "mono", "font-size": 13, fill: "#8A857C", text: "TOP FIVE" }, svg);
    // year ticks
    for (let i = 0; i < D.QUARTERS; i++) {
      const lab = D.quarterLabel(i);
      if (lab.startsWith("Q1") || i === C) {
        el("svg:line", { x1: X(i), y1: Y(ranks) + 24, x2: X(i), y2: Y(ranks) + 32, stroke: "#8A857C" }, svg);
        el("svg:text", { x: X(i), y: Y(ranks) + 50, "text-anchor": "middle", class: "mono", "font-size": 13, fill: "#8A857C", text: lab }, svg);
      }
    }
    // milestones
    D.MILESTONES.forEach((m, k) => {
      const x = X(m.q), yb = Y(ranks) + 78 + (k % 3) * 28;
      el("svg:line", { x1: x, y1: Y(ranks) + 34, x2: x, y2: yb - 14, stroke: "#FF5A1F", "stroke-dasharray": "2 3" }, svg);
      el("svg:rect", { x: x - 6, y: yb - 20, width: 12, height: 12, fill: "#FF5A1F", transform: "rotate(45 " + x + " " + (yb - 14) + ")", class: "ms-mark", "data-q": m.q, opacity: 0.25 }, svg);
      el("svg:text", { x: x + 12, y: yb - 9, class: "mono ms-text", "font-size": 13, "data-q": m.q, opacity: 0.25, text: m.label }, svg);
    });

    // clip for the reveal
    const defs = el("svg:defs", {}, svg);
    const cp = el("svg:clipPath", { id: "reveal" }, defs);
    const clipRect = el("svg:rect", { x: 0, y: 0, width: X(0) + 14, height: H }, cp);
    const lines = el("svg:g", { "clip-path": "url(#reveal)" }, svg);

    const nowIds = D.topFive(C).map(r => r.id);
    D.RISKS.slice().sort((a, b) => (nowIds.includes(a.id) ? 1 : 0) - (nowIds.includes(b.id) ? 1 : 0)).forEach(r => {
      const pts = [];
      for (let i = 0; i < D.QUARTERS; i++) pts.push(X(i) + "," + Y(rankOf(r.id, i)));
      const strong = nowIds.includes(r.id);
      const g = el("svg:g", { class: "clickable" }, lines);
      el("svg:polyline", { points: pts.join(" "), fill: "none", stroke: r.color, "stroke-width": r.id === "ai" ? 7 : strong ? 4.5 : 3,
        "stroke-linejoin": "round", "stroke-linecap": "round", opacity: strong ? 1 : 0.55 }, g);
      for (let i = 0; i < D.QUARTERS; i++) el("svg:circle", { cx: X(i), cy: Y(rankOf(r.id, i)), r: r.id === "ai" ? 5 : 3.5, fill: r.color, opacity: strong ? 1 : 0.55 }, g);
      g.addEventListener("click", () => openRisk(r.id));
    });

    // start labels
    D.RISKS.forEach(r => {
      el("svg:text", { x: xa - 24, y: Y(rankOf(r.id, 0)) + 6, "text-anchor": "end", "font-size": 18, fill: inTop(r.id, 0) ? "#1A1A1A" : "#8A857C", text: r.name }, svg);
    });
    // end labels (shown when finished)
    const endG = el("svg:g", { opacity: 0 }, svg);
    D.RISKS.forEach(r => {
      const strong = nowIds.includes(r.id);
      const t = el("svg:text", { x: xb + 22, y: Y(rankOf(r.id, C)) + 6, "font-size": r.id === "ai" ? 22 : 18, "font-weight": r.id === "ai" ? 700 : 400,
        fill: r.id === "ai" ? "#FF5A1F" : strong ? "#1A1A1A" : "#8A857C", text: "#" + rankOf(r.id, C) + " " + r.name, class: "clickable" }, endG);
      t.addEventListener("click", () => openRisk(r.id));
    });
    // cursor
    const cursor = el("svg:line", { x1: X(0), y1: Y(1) - 28, x2: X(0), y2: Y(ranks) + 24, stroke: "#1A1A1A", "stroke-width": 1.5, "stroke-dasharray": "3 4" }, svg);

    function setFrame(t) { // t from 0 to 1
      const i = t * (D.QUARTERS - 1);
      const x = xa + (xb - xa) * t;
      clipRect.setAttribute("width", x + 14);
      cursor.setAttribute("x1", x); cursor.setAttribute("x2", x);
      const qi = Math.min(C, Math.round(i));
      qLabel.textContent = D.quarterLabel(qi) + "  ·  #1 " + D.topFive(qi)[0].name;
      svg.querySelectorAll("[data-q]").forEach(n => n.setAttribute("opacity", Number(n.dataset.q) <= i ? 1 : 0.25));
      endG.setAttribute("opacity", t >= 1 ? 1 : 0);
      endG.style.transition = "opacity .6s";
    }
    function play() {
      if (state.playing) return;
      state.playing = true;
      log("Played the five-year story");
      btn.textContent = "Playing…";
      const start = performance.now(), dur = 7000;
      const step = now => {
        const t = Math.min(1, (now - start) / dur);
        setFrame(t);
        if (t < 1) state.raf = requestAnimationFrame(step);
        else { state.playing = false; btn.textContent = "↺ Replay"; }
      };
      state.raf = requestAnimationFrame(step);
    }
    btn.addEventListener("click", play);
    stage._play = play;
    setFrame(0);
    const lg = el("div", { class: "legend" }, stage);
    lg.innerHTML = "<span><i style='background:#FF5A1F'></i>AI security</span><span>thick lines: today's top five</span><span><i style='background:#FF5A1F;width:10px;height:10px;transform:rotate(45deg)'></i>business roadmap milestone</span><span>click a line for detail</span>";
  }

  // ---------- render ----------
  function render() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.playing = false;
    const stage = $("stage");
    stage.innerHTML = "";
    $("question").textContent = QUESTIONS[state.view];
    document.querySelectorAll(".view").forEach(b => b.classList.toggle("on", b.dataset.view === state.view));
    if (state.view === "now") renderNow(stage);
    if (state.view === "lastq") renderCompare(stage, C - 1);
    if (state.view === "lasty") renderCompare(stage, C - 4);
    if (state.view === "five") renderFive(stage);
    renderSummary();
  }
  function setView(v, quiet) {
    state.view = v;
    if (!quiet) log("Viewed: " + document.querySelector(".view[data-view='" + v + "']").textContent);
    render();
  }

  // ---------- risk detail drawer ----------
  function sparkline(r) {
    const W = 520, H = 120, pad = 10;
    const svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%" });
    const X = i => pad + (W - 2 * pad) * i / (D.QUARTERS - 1);
    const Yv = v => H - 26 - (H - 46) * v / 25;
    const pts = r.scores.map((v, i) => X(i) + "," + Yv(v)).join(" ");
    el("svg:polyline", { points: pts, fill: "none", stroke: r.id === "ai" ? "#FF5A1F" : "#1A1A1A", "stroke-width": 3, class: "draw" }, svg);
    for (let i = 0; i < D.QUARTERS; i++) if (inTop(r.id, i)) el("svg:circle", { cx: X(i), cy: Yv(r.scores[i]), r: 3, fill: "#1A1A1A" }, svg);
    el("svg:circle", { cx: X(C), cy: Yv(r.scores[C]), r: 7, fill: "#FF5A1F" }, svg);
    el("svg:text", { x: pad, y: H - 4, class: "mono", "font-size": 12, fill: "#8A857C", text: D.quarterLabel(0) }, svg);
    el("svg:text", { x: W - pad, y: H - 4, "text-anchor": "end", class: "mono", "font-size": 12, fill: "#8A857C", text: D.quarterLabel(C) }, svg);
    return svg;
  }
  function ring(pct) {
    const svg = el("svg:svg", { viewBox: "0 0 90 90", width: 90, height: 90 });
    el("svg:circle", { cx: 45, cy: 45, r: 36, fill: "none", stroke: "#EBE6DB", "stroke-width": 10 }, svg);
    const c = 2 * Math.PI * 36;
    el("svg:circle", { cx: 45, cy: 45, r: 36, fill: "none", stroke: "#FF5A1F", "stroke-width": 10, "stroke-dasharray": (c * pct / 100) + " " + c,
      transform: "rotate(-90 45 45)", "stroke-linecap": "round" }, svg);
    el("svg:text", { x: 45, y: 51, "text-anchor": "middle", class: "mono", "font-size": 18, text: pct + "%" }, svg);
    return svg;
  }
  function openRisk(id) {
    const r = byId(id), det = D.DETAIL[id], s = r.scores[C], body = $("drawerBody");
    body.innerHTML = "";
    const current = inTop(id, C);
    el("div", { class: "mono", style: "color:var(--pencil);font-size:14px", text: current ? "#" + rankOf(id, C) + " this quarter · " + D.quarterLabel(C) : "Not in the top five this quarter" }, body);
    el("h2", { text: r.name }, body);
    el("div", { class: "big", html: fmt(s) + "<small> / 25</small>" }, body);

    const why = el("details", { class: "why" }, body);
    el("summary", { text: "Why this score?" }, why);
    const lik = s / r.impact;
    let whyHtml = "Score = likelihood × impact. Likelihood " + fmt(lik) + " × impact " + r.impact + " = " + fmt(s) + ".";
    if (det) whyHtml += "<br><br>Likelihood is driven by: " + det.indicators.map(i => i.label + " (" + i.now + i.unit + ")").join("; ") + ".";
    whyHtml += "<br><br>Rank #" + rankOf(id, C) + " of " + D.RISKS.length + " tracked risks this quarter.";
    el("div", { html: whyHtml }, why);

    if (det) {
      el("h3", { text: "Us vs. industry" }, body);
      const diff = Math.round((s - det.benchmark) * 10) / 10;
      const cmp = el("div", {}, body);
      [["Us", s, r.id === "ai" ? "#FF5A1F" : "#1A1A1A"], ["Industry (fictional)", det.benchmark, "#A8A39A"]].forEach(([lab, v, col]) => {
        cmp.insertAdjacentHTML("beforeend", "<div style='display:grid;grid-template-columns:170px 1fr 50px;gap:12px;align-items:center;margin:8px 0;font-size:17px'><span>" + lab + "</span><div style='background:var(--paper-2);height:16px;border-radius:3px'><div style='width:" + (v / 25 * 100) + "%;height:100%;background:" + col + ";border-radius:3px'></div></div><span class='mono'>" + fmt(v) + "</span></div>");
      });
      el("div", { class: "mono", style: "font-size:14px;color:" + (diff > 0 ? "var(--bad)" : "var(--good)"), text: diff > 0 ? fmt(diff) + " points above the industry benchmark" : fmt(-diff) + " points below the industry benchmark" }, body);

      el("h3", { text: "What's driving it" }, body);
      det.indicators.forEach(i => {
        const change = i.now - i.prev, worse = i.worseIsUp ? change > 0 : change < 0;
        const d = el("div", { class: "ind" }, body);
        d.innerHTML = "<span>" + i.label + "</span><span class='v'>" + i.now + i.unit + "</span><span class='d " + (worse ? "up" : "down") + "'>" +
          (change > 0 ? "▲ " : "▼ ") + Math.abs(change) + i.unit + " vs last quarter (" + i.prev + i.unit + ")" + (worse ? " · worse" : " · better") + "</span>";
      });

      el("h3", { text: "Mitigation" }, body);
      const rg = el("div", { class: "ring" }, body);
      rg.appendChild(ring(det.progress));
      el("div", { html: "<div class='mono' style='font-size:13px;color:var(--pencil)'>NEXT MILESTONE</div>" + det.next }, rg);
    }

    const ms = D.MILESTONES.filter(m => m.risks.includes(id));
    const up = D.UPCOMING.filter(m => m.risks.includes(id));
    if (ms.length || up.length) {
      el("h3", { text: "Connected to the business roadmap" }, body);
      ms.forEach(m => el("div", { class: "ms", html: "<span class='mono'>" + D.quarterLabel(m.q) + "</span>" + m.label }, body));
      up.forEach(m => el("div", { class: "ms", style: "border-left-style:dashed", html: "<span class='mono'>" + m.when + " · upcoming</span>" + m.label }, body));
    }

    el("h3", { text: "Five-year score history" }, body);
    body.appendChild(sparkline(r));
    el("div", { class: "src", text: "src · risk register export (GRC tool) · indicator exports (IAM, cloud posture, scanner, code scanning, AI inventory) · industry benchmark (fictional) · strategy office roadmap" }, body);

    $("drawer").classList.add("open");
    $("drawer").setAttribute("aria-hidden", "false");
    log("Opened detail: " + r.name);
  }

  // ---------- about this build ----------
  function checks() {
    const out = [];
    let ok1 = true;
    for (let i = 0; i < D.QUARTERS; i++) {
      const t = D.topFive(i);
      if (t.length !== 5 || t.some((r, n) => rankOf(r.id, i) !== n + 1)) ok1 = false;
    }
    out.push([ok1, "Every quarter shows exactly five risks, ranked 1 to 5"]);
    const a = D.topFive(C).map(r => r.id).join(), b = D.topFive(C - 1).map(r => r.id).join();
    out.push([a !== b, "This quarter and last quarter show different top fives"]);
    const dropped = D.topFive(0).filter(r => !inTop(r.id, C)).map(r => r.name);
    out.push([dropped.length > 0, "A risk from five years ago has left the top five (" + dropped.join(", ") + ")"]);
    out.push([!inTop("ai", 0) && rankOf("ai", C) <= 2, "AI security was outside the top five five years ago and is top two now"]);
    return out;
  }
  function openAbout() {
    const body = $("aboutBody");
    body.innerHTML = "";
    el("div", { class: "mono", style: "color:var(--pencil);font-size:14px", text: "BC-01 · Business communication · Dashboard" }, body);
    el("h2", { text: "About this build" }, body);
    el("p", { style: "font-size:18px;line-height:1.5", text: "A consistent quarterly view of the top five cyber risks for the board, compared with last quarter, last year, five years, the industry, and the business roadmap." }, body);

    el("h3", { text: "Known answers (live checks)" }, body);
    checks().forEach(([ok, label]) => el("div", { class: "check", html: "<span class='" + (ok ? "ok" : "no") + "'>" + (ok ? "PASS" : "FAIL") + "</span>" + label }, body));

    el("h3", { text: "Trustworthy guardrails" }, body);
    [
      ["Approved", "Built with an approved AI tool; uses fictional data only."],
      ["Registered", "Build ID BC-01, listed in the build inventory."],
      ["Minimal", "Reads only: risk name, quarter, likelihood, impact, score, two indicators per risk, mitigation progress, roadmap milestones."],
      ["Validated", "Known-answer checks above run every time this panel opens."],
      ["Supervised", "Read-only dashboard. It takes no actions, so no approval step is needed."],
      ["Logged", "Every view change and drill-down appears in the activity log."],
      ["Explainable", "Every score has a 'Why this score?' breakdown."],
      ["Owned", "Owner: Aby Rao. The AI summary can be switched off below."]
    ].forEach(([k, v]) => el("div", { class: "check", html: "<b>" + k + ":</b> " + v }, body));

    el("h3", { text: "Off switch" }, body);
    const t = el("button", { class: "ghost mono", "aria-pressed": state.aiSummary ? "true" : "false", text: state.aiSummary ? "AI summary: on" : "AI summary: off" }, body);
    t.addEventListener("click", () => {
      state.aiSummary = !state.aiSummary;
      t.textContent = state.aiSummary ? "AI summary: on" : "AI summary: off";
      t.setAttribute("aria-pressed", state.aiSummary ? "true" : "false");
      log("AI summary turned " + (state.aiSummary ? "on" : "off"));
      renderSummary();
    });
    el("div", { class: "src", text: "src · data.js (fictional) · owner Aby Rao" }, body);

    $("about").classList.add("open");
    $("about").setAttribute("aria-hidden", "false");
    log("Opened: About this build");
  }

  function closeAll() {
    ["drawer", "about"].forEach(id => { $(id).classList.remove("open"); $(id).setAttribute("aria-hidden", "true"); });
  }

  // ---------- wiring ----------
  document.querySelectorAll(".view").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeAll));
  $("aboutBtn").addEventListener("click", openAbout);
  $("logBtn").addEventListener("click", () => $("log").classList.toggle("open"));
  $("presenterBtn").addEventListener("click", e => {
    const on = document.body.classList.toggle("presenter");
    e.currentTarget.setAttribute("aria-pressed", on ? "true" : "false");
    log("Presenter mode " + (on ? "on" : "off"));
    render();
  });
  $("resetBtn").addEventListener("click", () => {
    closeAll();
    state.aiSummary = true;
    document.body.classList.remove("presenter");
    $("presenterBtn").setAttribute("aria-pressed", "false");
    $("log").classList.remove("open");
    $("logList").innerHTML = "";
    setView("now", true);
    log("Demo reset");
  });
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT") return;
    const map = { "1": "now", "2": "lastq", "3": "lasty", "4": "five" };
    if (map[e.key]) setView(map[e.key]);
    if (e.key === "Escape") closeAll();
    if ((e.key === "p" || e.key === "P") && state.view === "five" && $("stage")._play) $("stage")._play();
  });

  $("quarterNow").textContent = D.quarterLabel(C);
  setView("now", true);
  log("Dashboard opened · " + D.quarterLabel(C));
})();
