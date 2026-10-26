/* JA-02 · AI vendor intake and risk triage */
(function () {
  const $ = id => document.getElementById(id);
  const TIERC = { Low: "#34D399", Medium: "#FBBF24", High: "#F472B6", Critical: "#F87171", Prohibited: "#8E9AB5" };
  const STEPS = [["start", "Vendor"], ["recon", "Public recon"], ["use", "Your use"], ["risk", "Risk"], ["route", "Route"], ["decision", "Decision"]];
  const INTERVAL = { Low: 36, Medium: 24, High: 12, Critical: 12 };
  const DAY = 864e5;

  // ---------- helpers ----------
  function el(tag, attrs, parent) {
    const svg = tag.startsWith("svg:");
    const n = svg ? document.createElementNS("http://www.w3.org/2000/svg", tag.slice(4)) : document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k]; if (v === undefined || v === null || v === false) continue;
      if (k === "text") n.textContent = v; else if (k === "html") n.innerHTML = v; else if (k === "on") for (const e in v) n.addEventListener(e, v[e]); else n.setAttribute(k, v);
    }
    if (parent) parent.appendChild(n); return n;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = n => Math.round(n).toLocaleString("en-US");
  const pl = (n, one, many) => num(n) + " " + (Math.round(n) === 1 ? one : many);
  const fmt = s => new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const addMonths = (s, m) => { const d = new Date(s + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + m); return d.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
  const person = id => JD.PERSONAS.find(p => p.id === id);
  const initials = n => n.split(" ").map(w => w[0]).join("").slice(0, 2);
  const lc = t => /^[A-Z]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
  const optLabel = (k, v) => { const o = JD.ANSWERS[k].opts.find(x => x[0] === v); return o ? o[1] : String(v); };
  function fmtVal(field, v) {
    if (v === undefined || v === null) return "Not found";
    if (field === "training") return JD.TRAINING[v] ? JD.TRAINING[v].label : v;
    if (field === "soc2") return v.status === "current" ? "Current · period ends " + fmt(v.periodEnd) : v.status === "expired" ? "Expired · period ended " + fmt(v.periodEnd) : "None found";
    if (field === "iso42001" || field === "sso") return v ? "Yes" : "No";
    if (field === "incidents") return v ? pl(v, "incident", "incidents") : "None reported";
    if (field === "euAiAct") return { minimal: "Minimal risk", limited: "Limited risk (transparency)", high: "High-risk (Annex III)" }[v] || v;
    return String(v);
  }
  function stamp() { const d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, "0")).join(":"); }
  function log(msg) { $("logList").prepend(el("li", { html: "<span>" + stamp() + "</span>" + esc(msg) })); }
  let toastT; function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600); }
  const simTag = t => el("span", { class: "tag", text: "simulated", "data-tip": t || "Produced by simulated AI from prepared public sources. Nothing is fetched from the internet." });

  // ---------- tooltips ----------
  const tip = $("tip");
  function showTip(t) {
    const text = t.getAttribute("data-tip"); if (!text) return;
    tip.textContent = text; tip.classList.add("show");
    const r = t.getBoundingClientRect(), b = tip.getBoundingClientRect();
    let x = r.left + r.width / 2 - b.width / 2, y = r.bottom + 8; if (y + b.height > innerHeight - 52) y = r.top - b.height - 8;
    tip.style.left = Math.max(8, Math.min(innerWidth - b.width - 8, x)) + "px"; tip.style.top = Math.max(8, y) + "px";
  }
  const hideTip = () => tip.classList.remove("show");
  document.addEventListener("mouseover", e => { const t = e.target.closest && e.target.closest("[data-tip]"); t ? showTip(t) : hideTip(); });
  document.addEventListener("focusin", e => { const t = e.target.closest && e.target.closest("[data-tip]"); t ? showTip(t) : hideTip(); });
  document.addEventListener("scroll", hideTip, true);

  // ---------- state ----------
  let state;
  function fresh() {
    return { step: "start", max: 0, vendorId: null, query: "", use: "", persona: "maya", rec: null, resolutions: {}, overrides: {}, confirmed: {}, answers: null,
      whatif: {}, submitted: false, attested: false, decision: null, reconDone: false, useEdit: false, adds: [], showRegister: false, clause: false };
  }
  const vendor = st => JD.VENDORS[(st || state).vendorId];
  const isRe = st => !!(vendor(st) && vendor(st).prior);
  function unresolved(st) {
    st = st || state; if (!st.rec) return [];
    const f = new Set(st.rec.conflicts.concat(Object.keys(st.overrides)));
    return [...f].filter(k => st.resolutions[k] === undefined);
  }
  function current(st) {
    st = st || state; const v = vendor(st);
    if (!v) return null;
    if (v.blocked) return S.score({ data: "none", role: "assistive", connection: "web", critical: "no", users: 0 }, { training: "none", soc2: "none", iso42001: false, incidents: 0, modelDisclosed: true }, { blocked: true });
    return S.score(st.answers, R.effective(st.rec, st.resolutions), {});
  }
  function projected(st) {
    st = st || state; const w = st.whatif; if (!Object.values(w).some(Boolean)) return null;
    const a = Object.assign({}, st.answers), res = Object.assign({}, st.resolutions);
    if (w.enterprise) res.training = "none";
    if (w.pii) a.data = "internal";
    if (w.sso) a.connection = "sso";
    if (w.assist) a.role = "assistive";
    return S.score(a, R.effective(st.rec, res), {});
  }
  function evidence(st) {
    st = st || state; const s = current(st), e = R.effective(st.rec, st.resolutions), f = st.rec.facts;
    return s.route.evidence.map(item => {
      if (/SOC 2/.test(item)) return e.soc2 === "current" ? { item, s: "y", note: "Found: " + fmtVal("soc2", f.soc2.value) } : { item, s: "n", note: f.soc2 ? fmtVal("soc2", f.soc2.value) : "None found" };
      if (/Model and training/.test(item)) return f.aipolicy || f.aiFeatures ? { item, s: "y", note: "AI policy found · " + (f.modelProvider ? f.modelProvider.value : "") } : { item, s: "w", note: "Request from vendor" };
      if (/bias audit/.test(item)) return f.biasAudit && f.biasAudit.stale ? { item, s: "n", note: fmtVal("biasAudit", f.biasAudit.value) + " · older than 12 months" } : { item, s: "w", note: "Request from vendor" };
      if (/attestation/.test(item)) return { item, s: st.attested ? "y" : "w", note: st.attested ? "Signed by " + person("maya").name : "Requester signs on submit" };
      return { item, s: "w", note: "Request from vendor" };
    });
  }
  function conditions(st) {
    st = st || state; const e = R.effective(st.rec, st.resolutions), a = st.answers, out = [];
    if (/trains/.test(e.training)) out.push("Opt out of model training and confirm it in writing");
    if (a.connection === "calendar") out.push("Limit mailbox and calendar access to the requesting team");
    if (a.role === "external") out.push("Tell participants that AI notes are taken");
    if (a.role === "decisions") out.push("A person reviews every rejection; annual bias audit");
    if (e.soc2 !== "current") out.push("Deliver the new SOC 2 Type II report within 60 days");
    if (/Singapore/.test(e.regions || "")) out.push("Keep our data in US and EU regions");
    out.push("Sign the data processing agreement");
    return out;
  }

  // ---------- actions (state in, result out, so checks can run on copies) ----------
  function choose(st, id) {
    const v = JD.VENDORS[id]; st.vendorId = id; st.query = v.name; st.use = v.use || "";
    st.rec = v.blocked ? null : R.recon(v, JD.TODAY);
    st.answers = v.blocked ? null : Object.assign({}, v.prior ? v.prior.answers : v.answers);
    st.overrides = Object.assign({}, v.requesterSays || {}); st.resolutions = {}; st.confirmed = {}; st.whatif = {}; st.submitted = false; st.attested = false; st.decision = null; st.reconDone = false; st.useEdit = false; st.clause = false;
    st.max = 0; st.step = "start"; return { ok: true };
  }
  function resolve(st, who, field, how) {
    const p = person(who);
    if (p.type === "requester") return { ok: false, msg: "A reviewer resolves conflicts, not the requester." };
    if (how === "clause") { if (p.type !== "analyst" && p.type !== "committee") return { ok: false, msg: "Only a reviewer records contract terms." }; st.resolutions.training = "none"; st.clause = true; return { ok: true, msg: p.name + " recorded a signed no-training clause. Training now scored as none." }; }
    st.resolutions[field] = st.rec.facts[field] ? st.rec.facts[field].value : st.overrides[field];
    return { ok: true, msg: p.name + " resolved " + field + " using the public evidence (" + fmtVal(field, st.resolutions[field]) + ")" };
  }
  function decide(st, who, kind, reason, conds) {
    const p = person(who), s = current(st);
    if (s.tier === "Prohibited") return { ok: false, msg: "Prohibited by the committee. It can't be approved here." };
    if (s.tier === "Low" && !s.committee) return { ok: false, msg: "Low risk is fast-tracked by the requester's attestation." };
    if (s.committee && p.type !== "committee") return { ok: false, msg: "This one needs the AI Governance Committee (" + person("lena").name + ")." };
    if (!s.committee && p.type === "requester") return { ok: false, msg: "A reviewer decides, not the requester." };
    if (unresolved(st).length) return { ok: false, msg: "Resolve " + pl(unresolved(st).length, "conflict", "conflicts") + " first." };
    if (!reason || reason.trim().length < 10) return { ok: false, msg: "Write a reason of at least 10 characters." };
    st.decision = { kind, reason: reason.trim(), conds: conds || [], by: who, date: JD.TODAY, tier: s.tier, score: s.points };
    addToRegister(st, s.tier, kind);
    return { ok: true, msg: p.name + ": " + ({ approve: "approved", conditions: "approved with conditions", reject: "rejected" }[kind]) + " " + vendor(st).name + " (" + s.tier + ", " + s.points + ")" };
  }
  function attest(st) {
    const s = current(st);
    if (s.tier !== "Low" || s.committee) return { ok: false, msg: "Only Low-risk requests are fast-tracked." };
    if (unresolved(st).length) return { ok: false, msg: "Resolve conflicts first." };
    st.attested = true; st.submitted = true; st.decision = { kind: "fast", reason: "Fast-tracked by requester attestation", conds: [], by: "maya", date: JD.TODAY, tier: s.tier, score: s.points };
    addToRegister(st, s.tier, "fast"); return { ok: true, msg: vendor(st).name + " fast-tracked (Low, " + s.points + "). An analyst can reopen it." };
  }
  function addToRegister(st, tier, kind) {
    if (kind === "reject") return;
    const v = vendor(st); st.adds = st.adds.filter(x => x.name !== v.name);
    st.adds.push({ name: v.name, tier, owner: st.answers.owner, last: JD.TODAY, id: v.id, isNew: true });
  }

  // ---------- render ----------
  function render() {
    const s = state, v = vendor(s);
    $("vendorPill").innerHTML = v ? "<span class='logo' style='width:26px;height:26px;border-radius:8px;font-size:11px;background:" + v.color + "'>" + v.initials + "</span><b>" + esc(v.name) + "</b><span class='hide-sm'>" + (v.blocked ? "· blocked" : isRe() ? "· reassessment" : "· new request") + "</span>" : "";
    renderRail();
    const showMeter = !s.showRegister && v && !v.blocked && s.max >= 1;
    $("shell").classList.toggle("nometer", !showMeter);
    $("meter").style.display = showMeter ? "" : "none";
    if (showMeter) renderMeter();
    const view = $("view"); view.innerHTML = ""; view.style.animation = "none"; void view.offsetWidth; view.style.animation = "";
    if (s.showRegister) return renderRegister(view);
    if (v && v.blocked) s.step = "start";
    ({ start: renderStart, recon: renderRecon, use: renderUse, risk: renderRisk, route: renderRoute, decision: renderDecision })[s.step](view);
  }
  function renderRail() {
    const r = $("rail"); r.innerHTML = "";
    STEPS.forEach(([id, lab], i) => {
      const idx = STEPS.findIndex(x => x[0] === state.step);
      const b = el("button", { class: "step" + (!state.showRegister && id === state.step ? " on" : "") + (i < idx || (i <= state.max && i !== idx) ? " done" : ""), on: { click: () => go(id) } }, r);
      if (i > state.max) b.disabled = true;
      el("span", { class: "n", text: i + 1 }, b); el("span", { text: lab }, b);
    });
    el("div", { class: "mini", text: state.vendorId ? (isRe() ? "Reassessment: only what changed is re-asked." : "Every pre-filled fact cites a public source.") : "Type a vendor name to start." }, r);
  }
  function go(step) { state.showRegister = false; state.step = step; const i = STEPS.findIndex(x => x[0] === step); state.max = Math.max(state.max, i); render(); window.scrollTo(0, 0); }
  function head(p, h, sub) { el("h1", { html: h }, p); el("p", { class: "subhead", text: sub }, p); }
  function navRow(p, back, next, nextLab, nextTip, disabled) {
    const n = el("div", { class: "nav" }, p);
    if (back) el("button", { class: "btn ghost", text: "Back", on: { click: () => go(back) } }, n); else el("span", null, n);
    if (next) { const b = el("button", { class: "btn pri", text: nextLab || "Continue", "data-tip": nextTip, on: { click: () => go(next) } }, n); if (disabled) b.disabled = true; return b; }
  }

  // ---------- meter ----------
  function gauge(p, s, proj, w) {
    const W = w || 240, svg = el("svg:svg", { viewBox: "0 0 240 140", width: "100%", class: "gauge", role: "img", "aria-label": "Risk score " + s.points + " of 100" }, p);
    const cx = 120, cy = 124, R1 = 88, arc = (a0, a1, col) => { const p0 = pt(a0), p1 = pt(a1); el("svg:path", { d: "M" + p0 + " A" + R1 + "," + R1 + " 0 0 1 " + p1, stroke: col, "stroke-width": 16, fill: "none", opacity: .9 }, svg); };
    const pt = v => { const a = Math.PI * (1 - v / 100); return (cx + R1 * Math.cos(a)).toFixed(1) + "," + (cy - R1 * Math.sin(a)).toFixed(1); };
    arc(0, 24.5, TIERC.Low); arc(25, 49.5, TIERC.Medium); arc(50, 69.5, TIERC.High); arc(70, 100, TIERC.Critical);
    [0, 25, 50, 70, 100].forEach(t => { const a = Math.PI * (1 - t / 100); el("svg:text", { x: cx + (R1 + 16) * Math.cos(a), y: cy - (R1 + 16) * Math.sin(a) + 3, "text-anchor": "middle", text: t }, svg); });
    const needle = (v, dashed) => { const g = el("svg:g", { class: "needle", style: "transform-origin:120px 124px;transform:rotate(" + (-90 + v * 1.8) + "deg)" }, svg);
      el("svg:line", { x1: cx, y1: cy - 34, x2: cx, y2: cy - R1 + 6, stroke: dashed ? "#FBBF24" : "#E6EAF2", "stroke-width": dashed ? 2.5 : 4, "stroke-linecap": "round", "stroke-dasharray": dashed ? "5 5" : null }, g); return g; };
    // needles start at the rim and stop short of the centre so the score below stays readable
    if (proj) needle(proj.points, true);
    const n = needle(state._lastPts !== undefined ? state._lastPts : s.points);
    requestAnimationFrame(() => requestAnimationFrame(() => { n.style.transform = "rotate(" + (-90 + s.points * 1.8) + "deg)"; }));
    
    return svg;
  }
  function renderMeter() {
    const m = $("meter"); m.innerHTML = ""; const s = current(), proj = projected();
    const h = el("div", { class: "card-head" }, m); el("div", { class: "card-title", text: "Live risk" }, h);
    el("button", { class: "tag", style: "background:transparent", text: "Why?", "data-tip": "Every point below comes from an answer or a cited public fact. Floors from public frameworks can raise the tier." }, h);
    gauge(m, s, proj);
    el("div", { class: "big", text: s.points }, m); el("div", { class: "of", text: "of 100 · score tier " + s.scoreTier }, m);
    const tc = el("div", { class: "tc" }, m); el("span", { class: "tierchip", style: "background:" + TIERC[s.tier], text: s.tier }, tc);
    el("div", { class: "of", style: "margin-top:6px", text: s.route.path }, m);
    if (proj && proj.points !== s.points) el("div", { class: "proj", text: "Projected " + proj.points + " · " + proj.tier + " if these changes are signed", "data-tip": "What-if changes never change the real score. A reviewer records a signed term to make it count." }, m);
    s.floors.filter(f => f.tier !== "Medium" || s.tier === "Medium").slice(0, 2).forEach(f => el("div", { class: "floorline", text: "Floor: " + f.why + " → at least " + f.tier, "data-tip": "Basis: " + f.basis }, m));
    const d = el("div", { class: "drivers" }, m);
    s.factors.slice().sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).filter(f => f.v).forEach(f => { const r = el("div", { class: "drv", "data-tip": f.why }, d); el("span", { text: f.k }, r); el("span", { class: "x" + (f.v < 0 ? " neg" : ""), text: (f.v > 0 ? "+" : "") + f.v }, r); });
    if (unresolved().length) el("div", { class: "floorline", style: "color:var(--red)", text: pl(unresolved().length, "conflict", "conflicts") + " to resolve before approval" }, m);
    state._lastPts = s.points;
  }

  // ---------- Start ----------
  function renderStart(v) {
    head(v, "Which <em>AI vendor</em>?", "Type a name. The form researches public sources and fills itself in.");
    const box = el("div", { class: "search" }, v); el("span", { class: "ic", text: "⌕" }, box);
    const inp = el("input", { type: "text", placeholder: "Vendor name or domain", value: state.query, "aria-label": "Vendor name or domain", autocomplete: "off" }, box);
    const sugg = el("div", { class: "sugg" }, v);
    function list() {
      sugg.innerHTML = ""; const q = inp.value.trim().toLowerCase();
      Object.values(JD.VENDORS).filter(x => !q || x.name.toLowerCase().includes(q) || x.domain.includes(q)).forEach((x, i) => {
        const b = el("button", { class: "sg" + (state.vendorId === x.id ? " on" : ""), style: "animation-delay:" + i * .04 + "s", on: { click: () => { choose(state, x.id); log("Selected " + x.name + (x.blocked ? " (blocked)" : x.prior ? " (reassessment)" : " (new)")); render(); } } }, sugg);
        el("span", { class: "logo", style: "background:" + x.color, text: x.initials }, b);
        const t = el("span", null, b); el("b", { text: x.name }, t); el("span", { text: x.tagline + " · " + x.domain }, t);
        el("span", { class: "kind" + (x.blocked ? " bl" : x.prior ? " re" : ""), text: x.blocked ? "Blocklist" : x.prior ? "In register · reassess" : "New", "data-tip": x.blocked ? "On the AI Governance Committee's blocklist" : x.prior ? "Approved " + fmt(x.prior.date) + " · " + x.prior.tier : "Not in the AI vendor register" }, b);
      });
      if (!sugg.children.length) el("div", { class: "note", text: "Only the five demo vendors have prepared public sources." }, sugg);
    }
    inp.addEventListener("input", list); list();
    const vv = vendor();
    if (!vv) return;
    if (vv.blocked) {
      const c = el("div", { class: "card pad blocked" }, v); el("div", { class: "eyebrow", text: "Stopped at intake" }, c);
      el("h3", { text: vv.name + " is prohibited" }, c);
      el("div", { style: "font-size:14px;line-height:1.5", text: vv.blocked.rule + " · " + vv.blocked.reason + ". " + vv.blocked.decided + "." }, c);
      el("div", { class: "eyebrow", style: "margin-top:14px", text: "Approved alternatives" }, c);
      const alts = el("div", null, c); vv.alternatives.forEach(a => el("span", { class: "alt", text: "✓ " + a }, alts));
      const n = el("div", { class: "nav" }, c);
      el("button", { class: "btn ghost", text: "Ask for an exception", "data-tip": "Goes to the AI Governance Committee queue (simulated)", on: { click: () => { log("Exception request for " + vv.name + " sent to the committee queue"); toast("Sent to the committee queue"); } } }, n);
      el("button", { class: "btn pri", text: "Use an alternative", on: { click: () => { log("Requester redirected to an approved alternative for " + vv.name); toast("Redirected to " + vv.alternatives[0]); } } }, n);
      return;
    }
    const ub = el("div", { class: "usebox" }, v); el("div", { class: "eyebrow", text: "What will you use it for?", style: "margin-bottom:6px" }, ub);
    const ta = el("textarea", { "aria-label": "Intended use" }, ub); ta.value = state.use; ta.addEventListener("input", () => state.use = ta.value);
    if (isRe()) el("div", { class: "note", text: "Already approved on " + fmt(vv.prior.date) + " (" + vv.prior.tier + ", " + vv.prior.score + "). This runs as a reassessment: prior answers are pre-filled and only changes are re-asked." }, ub);
    const n = el("div", { class: "nav", style: "max-width:760px" }, v); el("span", null, n);
    el("button", { class: "btn pri", text: isRe() ? "Check what changed" : "Research vendor", on: { click: () => { log("Started public recon on " + vv.name); go("recon"); } } }, n);
  }

  // ---------- Recon ----------
  function renderRecon(v) {
    const vv = vendor(), rec = state.rec;
    head(v, "What does the <em>public record</em> say?", isRe() ? "Today's sources compared with the last assessment" : pl(rec.filled, "field", "fields") + " filled from " + pl(rec.sources, "public source", "public sources") + ". Confirm or correct each one.");
    if (isRe()) {
      const e = R.effective(rec, state.resolutions), changes = DF.diff(vv.prior, e), now = current();
      const b = el("div", { class: "banner" }, v);
      const l = el("div", null, b); el("div", { class: "eyebrow", text: "Reassessment" }, l);
      el("b", { text: pl(changes.length, "change", "changes") + " since " + fmt(vv.prior.date) }, l);
      el("div", { class: "mono", style: "font-size:22px", html: vv.prior.score + " <span style='color:var(--muted)'>→</span> <span style='color:" + TIERC[now.tier] + "'>" + now.points + "</span>", "data-tip": vv.prior.tier + " then, " + now.tier + " now" }, b);
      const c = el("div", { class: "card pad", style: "margin-bottom:16px" }, v);
      const hh = el("div", { class: "card-head" }, c); el("div", { class: "card-title", text: "Since last time" }, hh); hh.appendChild(simTag("Diff of the last assessment against today's simulated public sources"));
      changes.forEach((ch, i) => { const r = el("div", { class: "diff", style: "animation-delay:" + i * .08 + "s" }, c);
        el("b", { text: ch.label }, r); el("span", { class: "old", text: ch.field === "training" ? fmtVal("training", ch.from) : ch.from }, r); el("span", { class: "arrow", text: "→" }, r);
        el("span", { class: "new", text: ch.field === "training" ? fmtVal("training", ch.to) : ch.to }, r); el("span", { class: "chipx stale trg", text: "Trigger: " + ch.trigger, "data-tip": "Trigger events start a reassessment right away, whatever the schedule" }, r); });
    }
    const top = el("div", { class: "card pad recon-top" }, v);
    const rad = el("div", { class: "radar" + (state.reconDone ? " done" : "") }, top);
    const svg = el("svg:svg", { viewBox: "0 0 200 200", width: "100%", height: "100%" }, rad);
    [90, 64, 38].forEach(r => el("svg:circle", { cx: 100, cy: 100, r, fill: "none", stroke: "#313C58" }, svg));
    el("svg:line", { x1: 10, y1: 100, x2: 190, y2: 100, stroke: "#232C42" }, svg); el("svg:line", { x1: 100, y1: 10, x2: 100, y2: 190, stroke: "#232C42" }, svg);
    const defs = el("svg:defs", null, svg), g = el("svg:linearGradient", { id: "sw", x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el("svg:stop", { offset: 0, "stop-color": "#22D3EE", "stop-opacity": 0 }, g); el("svg:stop", { offset: 1, "stop-color": "#22D3EE", "stop-opacity": .55 }, g);
    el("svg:path", { class: "sweep", d: "M100,100 L190,100 A90,90 0 0 0 163.6,36.4 Z", fill: "url(#sw)" }, svg);
    const blips = el("svg:g", null, svg);
    const right = el("div", null, top);
    const hh = el("div", { class: "card-head" }, right); el("div", { class: "card-title", text: "Sources checked" }, hh); hh.appendChild(simTag());
    const grid = el("div", { class: "srcs" }, right);
    const types = Object.keys(JD.SOURCE_TYPES);
    const tiles = types.map(t => { const s = vv.sources.find(x => x.type === t), warn = s && Object.keys(s.facts).some(k => rec.conflicts.includes(k) || rec.stale.includes(k));
      const d = el("div", { class: "src", "data-tip": s ? JD.SOURCE_TYPES[t].label + " · " + s.url + " · published " + fmt(s.published) + " · checked " + fmt(s.checked) : "Not found" }, grid);
      el("i", { text: JD.SOURCE_TYPES[t].icon }, d); el("span", { text: JD.SOURCE_TYPES[t].label }, d); d._warn = warn; return d; });
    const sum = el("div", { class: "note", style: "margin-top:12px", text: "Checking public sources…" }, right);
    const body = el("div", null, v);
    function finish() {
      tiles.forEach(t => t.classList.add("lit")); tiles.forEach(t => { if (t._warn) t.classList.add("warn"); }); rad.classList.add("done");
      sum.textContent = pl(rec.filled, "field", "fields") + " filled · " + pl(rec.conflicts.length, "conflict", "conflicts") + " · " + pl(rec.stale.length, "stale fact", "stale facts") + " · " + pl(Object.keys(state.overrides).length, "requester correction", "requester corrections");
      drawFacts(body); state.reconDone = true; state.max = Math.max(state.max, 2); renderRail();
    }
    if (state.reconDone) finish();
    else { let i = 0; const t = setInterval(() => {
      if (!document.body.contains(grid)) return clearInterval(t);
      if (i < tiles.length) { tiles[i].classList.add("lit"); const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 60; el("svg:circle", { cx: 100 + r * Math.cos(a), cy: 100 + r * Math.sin(a), r: 3, fill: tiles[i]._warn ? "#F87171" : "#22D3EE" }, blips); i++; }
      else { clearInterval(t); finish(); log("Recon complete: " + sum.textContent); } }, 240); }
    navRow(v, "start", "use", isRe() ? "Confirm changes" : "Continue", "Next: how you'll use it");
  }
  function drawFacts(p) {
    const rec = state.rec, me = person(state.persona);
    p.innerHTML = "";
    // Conflict cards first
    unresolvedOrAll().forEach(field => {
      const f = rec.facts[field]; if (!f) return;
      const c = el("div", { class: "card pad conflict" }, p);
      const hh = el("div", { class: "card-head" }, c); el("h3", { text: "Sources disagree: " + JD.FIELDS.find(x => x.id === field).label.toLowerCase() }, hh);
      el("span", { class: "chipx " + (state.resolutions[field] !== undefined ? "ok" : "conf"), text: state.resolutions[field] !== undefined ? "Resolved" : "Unresolved" }, hh);
      const qs = el("div", { class: "quotes" }, c);
      f.sources.slice().sort((a, b) => a.published.localeCompare(b.published)).forEach((s, i, arr) => { const q = el("div", { class: "quote" + (i === arr.length - 1 ? " newer" : "") }, qs);
        el("q", { text: s.quote }, q); el("div", { class: "src2", text: JD.SOURCE_TYPES[s.type].label + " · " + s.url.replace("https://", "") + " · updated " + fmt(s.published) + (i === arr.length - 1 ? " · newer" : "") }, q); });
      if (state.overrides[field]) el("div", { class: "reqsaid", text: person("maya").name + " (requester) said: \"" + fmtVal(field, state.overrides[field]) + "\". Kept on record; it doesn't change the score." }, c);
      el("div", { class: "note", text: state.resolutions[field] !== undefined ? (state.clause ? "Resolved: signed no-training clause recorded. Scored as " + fmtVal(field, state.resolutions[field]) + "." : "Resolved with the public evidence: " + fmtVal(field, state.resolutions[field]) + ".") : "Until a reviewer resolves this, the riskier public value is scored: " + fmtVal(field, f.value) + "." }, c);
      if (state.resolutions[field] === undefined) {
        const rr = el("div", { class: "resolve" }, c);
        if (me.type === "requester") { el("button", { class: "btn sm ghost", text: "Switch to " + person("ravi").name, on: { click: () => setPersona("ravi") } }, rr); }
        else {
          el("button", { class: "btn sm", text: "Use newer source", "data-tip": "Score the newer public statement", on: { click: () => act(resolve(state, state.persona, field, "public")) } }, rr);
          if (field === "training") el("button", { class: "btn sm go", text: "Record signed clause", "data-tip": "Only a signed no-training clause lowers the score", on: { click: () => act(resolve(state, state.persona, field, "clause")) } }, rr);
        }
      }
    });
    const groups = [...new Set(JD.FIELDS.map(f => f.group))];
    const gw = el("div", { class: "groups" }, p);
    groups.forEach((g, gi) => {
      const c = el("div", { class: "card pad" }, gw); el("div", { class: "card-title", text: g, style: "margin-bottom:4px" }, c);
      JD.FIELDS.filter(f => f.group === g).forEach((fd, i) => {
        const f = rec.facts[fd.id]; if (!f) return;
        const r = el("div", { class: "fact", style: "animation-delay:" + (gi * .08 + i * .04) + "s" }, c);
        const l = el("div", null, r); el("div", { class: "lab", text: fd.label }, l);
        const shown = state.resolutions[fd.id] !== undefined ? state.resolutions[fd.id] : f.value;
        el("div", { class: "val", text: fmtVal(fd.id, shown), style: f.conflict && state.resolutions[fd.id] === undefined ? "color:var(--red)" : "" }, l);
        const m = el("div", { class: "meta" }, l);
        el("span", { class: "chipx", text: JD.SOURCE_TYPES[f.primary.type].icon + " " + JD.SOURCE_TYPES[f.primary.type].label + " · " + fmt(f.primary.published), "data-tip": "“" + f.primary.quote + "” · " + f.primary.url }, m);
        const cb = el("span", { class: "confbar", "data-tip": "Confidence " + Math.round(f.confidence * 100) + "%" + (f.conflict ? " (sources disagree)" : "") }, m); el("span", { style: "width:" + f.confidence * 100 + "%" }, cb);
        if (f.stale) el("span", { class: "chipx stale", text: "stale", "data-tip": "Older than 12 months. Can't count as current evidence." }, m);
        if (f.conflict) el("span", { class: "chipx conf", text: "conflict" }, m);
        if (state.overrides[fd.id]) el("span", { class: "chipx req", text: "requester: " + fmtVal(fd.id, state.overrides[fd.id]) }, m);
        if (fd.scored) el("span", { class: "chipx", text: "scored", "data-tip": "This fact feeds the risk score" }, m);
        const a = el("div", { class: "acts" }, r);
        el("button", { class: "iconbtn" + (state.confirmed[fd.id] ? " on" : ""), text: "✓", "aria-label": "Confirm " + fd.label, "data-tip": "Looks right", on: { click: e => { state.confirmed[fd.id] = !state.confirmed[fd.id]; e.currentTarget.classList.toggle("on"); log((state.confirmed[fd.id] ? "Confirmed " : "Unconfirmed ") + fd.label); } } }, a);
        el("button", { class: "iconbtn", text: "✎", "aria-label": "Correct " + fd.label, "data-tip": "Correct it. The public evidence stays on record for the reviewer.", on: { click: () => {
          const val = fd.id === "training" ? "none" : null;
          if (val) { state.overrides.training = val; log("Requester corrected training to \"" + fmtVal("training", val) + "\" (public evidence kept)"); toast("Correction saved. A reviewer will compare it with the public source."); render(); }
          else toast("In this demo, corrections are enabled for the training field only.");
        } } }, a);
      });
    });
  }
  function unresolvedOrAll() { const set = new Set(state.rec.conflicts.concat(Object.keys(state.overrides))); return [...set]; }
  function act(r) { toast(r.msg); log(r.ok ? r.msg : "Blocked · " + r.msg); render(); return r; }

  // ---------- Use ----------
  function renderUse(v) {
    const vv = vendor(), locked = isRe() && !state.useEdit;
    head(v, "How will we <em>use it</em>?", locked ? "Same answers as " + fmt(vv.prior.date) + ". Edit only if your use changed." : "Pre-filled from your description. Each choice moves the meter.");
    if (isRe()) { const b = el("div", { class: "banner" }, v); el("div", null, b).innerHTML = "<div class='eyebrow'>Reassessment</div><b>" + (locked ? "Has your use changed?" : "Editing your use") + "</b>";
      el("button", { class: "btn" + (locked ? "" : " ghost"), text: locked ? "Yes, edit answers" : "Done editing", on: { click: () => { state.useEdit = !state.useEdit; render(); } } }, b); }
    const c = el("div", { class: "card pad" }, v);
    const hh = el("div", { class: "card-head" }, c); el("div", { class: "card-title", text: "Your use" }, hh); hh.appendChild(simTag("Choices pre-filled by simulated AI from the intended-use description"));
    ["data", "role", "connection", "critical", "users"].forEach(k => {
      const q = JD.ANSWERS[k], g = el("div", { class: "qgrp" }, c), ql = el("div", { class: "ql" }, g);
      el("span", { text: q.label }, ql); el("button", { class: "tag", style: "background:transparent", text: "?", "data-tip": q.tip }, ql);
      const o = el("div", { class: "opts" }, g);
      q.opts.forEach(([val, lab, pts]) => { const b = el("button", { class: "opt" + (state.answers[k] === val ? " on" : ""), "aria-pressed": state.answers[k] === val ? "true" : "false", on: { click: () => { state.answers[k] = val; log(q.label + ": " + lab); render(); } } }, o);
        el("span", { text: lab }, b); el("span", { class: "p", text: k === "critical" ? (val === "yes" ? "floor: Critical" : "") : (pts ? "+" + pts : "0") }, b); if (locked) b.disabled = true; });
    });
    const g = el("div", { class: "qgrp" }, c); el("div", { class: "ql", text: "Business owner" }, g);
    const inp = el("input", { class: "owner", value: state.answers.owner, "aria-label": "Business owner" }, g); inp.disabled = locked; inp.addEventListener("input", () => state.answers.owner = inp.value);
    navRow(v, "recon", "risk", "See the risk", "Next: score, floors, and what-ifs");
  }

  // ---------- Risk ----------
  function renderRisk(v) {
    const s = current(), proj = projected();
    head(v, "How risky is this, <em>and why</em>?", "Score from answers and cited facts; floors from public frameworks; tier sets the path.");
    const row = el("div", { class: "row2" }, v);
    const wfc = el("div", { class: "card pad" }, row); const hh = el("div", { class: "card-head" }, wfc); el("div", { class: "card-title", text: "Where the points come from" }, hh);
    el("span", { class: "tierchip", style: "background:" + TIERC[s.tier], text: s.points + " · " + s.tier }, hh);
    waterfall(wfc, s);
    const side = el("div", { class: "stack" }, row);
    const fc = el("div", { class: "card pad floors" }, side); el("div", { class: "card-title", text: "Floor rules", style: "margin-bottom:6px" }, fc);
    if (!s.floors.length) el("div", { class: "note", text: "No floor rules apply. The score sets the tier." }, fc);
    s.floors.forEach(f => { const r = el("div", { class: "fl", "data-tip": "Basis: " + f.basis }, fc); el("span", { class: "tierchip", style: "background:" + TIERC[f.tier] + ";text-align:center", text: f.tier }, r); const t = el("div", null, r); el("b", { text: f.why }, t); el("span", { text: f.basis }, t); });
    const pc = el("div", { class: "pathcard" }, side); el("div", { class: "eyebrow", text: "Path" }, pc); el("div", { class: "p1", text: s.route.path }, pc);
    el("div", { class: "note", text: "Score tier " + s.scoreTier + (s.tier !== s.scoreTier ? ", raised to " + s.tier + " by a floor rule" : "") + ". Full reassessment: " + s.route.reassess.toLowerCase() + ". Between reviews: " + s.route.monitor.toLowerCase() + "." }, pc);
    const wc = el("div", { class: "card pad", style: "margin-top:16px" }, v); const wh = el("div", { class: "card-head" }, wc); el("div", { class: "card-title", text: "What if…" }, wh);
    el("span", { class: "eyebrow", text: proj ? "Projected " + proj.points + " · " + proj.tier : "Projection only · real score unchanged" }, wh);
    const wi = el("div", { class: "whatif" }, wc); const e = R.effective(state.rec, state.resolutions);
    [["enterprise", "Enterprise plan, training off", /trains|retention/.test(e.training)], ["pii", "Send no personal or confidential data", ["pii", "regulated", "confidential"].includes(state.answers.data)],
      ["sso", "SSO only, no data sync or mailbox access", ["api", "calendar"].includes(state.answers.connection)], ["assist", "Keep it assistive, a person decides", state.answers.role !== "assistive"]]
      .filter(x => x[2]).forEach(([k, lab]) => { const r = el("div", { class: "wi" }, wi); el("span", { text: lab }, r);
        el("button", { class: "sw" + (state.whatif[k] ? " on" : ""), "aria-pressed": state.whatif[k] ? "true" : "false", "aria-label": lab, on: { click: () => { state.whatif[k] = !state.whatif[k]; log("What-if " + (state.whatif[k] ? "on" : "off") + ": " + lab); render(); } } }, r); });
    el("div", { class: "note", text: "What-ifs show a projection (dotted needle). Only a signed contract term, recorded by a reviewer, changes the real score." }, wc);
    navRow(v, "use", "route", "Route it", "Next: reviewers and evidence");
  }
  function waterfall(p, s) {
    const fs = s.factors, W = 560, rowH = 34, H = fs.length * rowH + 60, L = 120, R0 = 40;
    const svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", class: "wf", role: "img", "aria-label": "Score waterfall" }, p);
    const X = v => L + v / 100 * (W - L - R0); let run = 0;
    [0, 25, 50, 70, 100].forEach(t => { el("svg:line", { x1: X(t), x2: X(t), y1: 6, y2: H - 30, stroke: "#232C42", "stroke-dasharray": t ? "3 4" : null }, svg); el("svg:text", { x: X(t), y: H - 14, "text-anchor": "middle", text: t }, svg); });
    fs.forEach((f, i) => { const y = 10 + i * rowH, a = run, b = run + f.v; run = b;
      el("svg:text", { x: L - 10, y: y + 17, "text-anchor": "end", text: f.k, style: "fill:#E6EAF2;font-family:Inter;font-size:12px" }, svg);
      const x0 = X(Math.min(a, b)), w = Math.max(2, Math.abs(X(b) - X(a)));
      el("svg:rect", { class: "bar-r", x: x0, y, width: w, height: 22, rx: 5, fill: f.v < 0 ? "#34D399" : f.v === 0 ? "#313C58" : "#22D3EE", opacity: .9, "data-tip": f.why + " · " + (f.v > 0 ? "+" : "") + f.v }, svg);
      el("svg:text", { x: X(Math.max(a, b)) + 6, y: y + 15, text: (f.v > 0 ? "+" : "") + f.v }, svg); });
    const y = 10 + fs.length * rowH;
    el("svg:rect", { x: X(0), y, width: Math.max(2, X(s.points) - X(0)), height: 22, rx: 5, fill: TIERC[s.scoreTier] }, svg);
    el("svg:text", { x: L - 10, y: y + 16, "text-anchor": "end", text: "Score", style: "fill:#E6EAF2;font-family:Inter;font-size:12px;font-weight:700" }, svg);
    el("svg:text", { x: X(s.points) + 6, y: y + 16, text: s.points + " · " + s.scoreTier, style: "fill:#E6EAF2" }, svg);
  }

  // ---------- Route ----------
  function renderRoute(v) {
    const s = current(), vv = vendor();
    head(v, "Who reviews, and <em>what do they need</em>?", s.route.path + (s.route.days ? " · target " + pl(s.route.days, "business day", "business days") : " · same day"));
    const lanes = el("div", { class: "lanes" }, v);
    [["Fast track", "Low", "Requester attests; analyst can reopen"], ["Standard review", "Medium", "Security analyst"], ["Full review", "High", "Security, privacy, legal"], ["Committee", "Critical", "AI Governance Committee"], ["Blocked", "Prohibited", "Committee blocklist"]]
      .forEach(([lab, t, d]) => { const on = s.tier === t; const l = el("div", { class: "lane" + (on ? " on" : "") }, lanes); el("div", { class: "dot", style: "background:" + TIERC[t] }, l); el("b", { text: lab + (on && s.committee && t !== "Critical" ? " + committee" : "") }, l); el("span", { text: d }, l); });
    const row = el("div", { class: "row2", style: "margin-top:16px" }, v);
    const ec = el("div", { class: "card pad" }, row); const eh = el("div", { class: "card-head" }, ec); el("div", { class: "card-title", text: "Evidence" }, eh);
    const ev = evidence(); el("span", { class: "eyebrow", text: ev.filter(x => x.s === "y").length + " of " + ev.length + " found" }, eh);
    ev.forEach(x => { const r = el("div", { class: "ev" }, ec); el("span", { class: "ck " + x.s, text: x.s === "y" ? "✓" : x.s === "n" ? "✗" : "○" }, r); el("span", { text: x.item }, r); el("span", { class: "chipx" + (x.s === "n" ? " stale" : x.s === "y" ? " ok" : ""), text: x.s === "y" ? "found" : x.s === "n" ? "gap" : "request", "data-tip": x.note }, r); });
    const rc = el("div", { class: "stack" }, row);
    const rv = el("div", { class: "card pad" }, rc); el("div", { class: "card-title", text: "Reviewers", style: "margin-bottom:10px" }, rv);
    if (!s.route.reviewers.length) el("div", { class: "note", text: "None. The requester attests and it's fast-tracked." }, rv);
    const nm = { Security: "Ravi Menon", Privacy: "Ines Duarte", Legal: "Tom Becker", "AI Governance Committee": "Lena Park" };
    s.route.reviewers.forEach(r => { const c = el("span", { class: "rv", "data-tip": nm[r] }, rv); el("span", { class: "av", text: initials(nm[r]) }, c); el("span", { text: r }, c); });
    const sm = el("div", { class: "card pad" }, rc); const sh = el("div", { class: "card-head" }, sm); el("div", { class: "card-title", text: "Reviewer summary" }, sh); sh.appendChild(simTag("Drafted by simulated AI. The reviewer edits and owns it."));
    const e = R.effective(state.rec, state.resolutions);
    el("div", { class: "summary", html: "<b>" + esc(vv.name) + "</b> would receive " + esc(lc(optLabel("data", state.answers.data))) + " through " + esc(lc(optLabel("connection", state.answers.connection))) + ". Public sources show <b>" + esc(fmtVal("training", e.training).toLowerCase()) + "</b>" +
      (unresolved().length ? ", but its sources disagree (" + esc(unresolved().join(", ")) + ")" : "") + ". SOC 2 Type II: " + esc(e.soc2) + ". Score <b>" + s.points + "</b>, tier <b>" + s.tier + "</b>" + (s.floors.length ? ", floor: " + esc(s.floors[0].why.toLowerCase()) : "") + ". Suggested conditions: " + esc(conditions().slice(0, 3).map(lc).join("; ")) + "." }, sm);
    const n = el("div", { class: "nav" }, v); el("button", { class: "btn ghost", text: "Back", on: { click: () => go("risk") } }, n);
    if (s.tier === "Low" && !s.committee) {
      el("button", { class: "btn go", text: state.decision ? "Fast-tracked ✓" : "Attest and fast-track", "data-tip": "I confirm the answers are accurate and the use stays as described", on: { click: () => { if (state.decision) return go("decision"); const r = act(attest(state)); if (r.ok) go("decision"); } } }, n);
    } else el("button", { class: "btn pri", text: state.submitted ? "Go to decision" : "Submit for review", on: { click: () => { if (!state.submitted) { state.submitted = true; log("Submitted " + vv.name + " for " + s.route.path.toLowerCase()); toast("Submitted to " + s.route.reviewers.join(", ")); } go("decision"); } } }, n);
  }

  // ---------- Decision ----------
  function renderDecision(v) {
    const s = current(), vv = vendor(), me = person(state.persona), needs = s.committee ? "lena" : "ravi";
    head(v, "Approve <em>" + esc(vv.name) + "</em>?", s.tier + " · " + s.points + " · " + s.route.path);
    if (state.decision) {
      const d = state.decision, c = el("div", { class: "card pad decided" + (d.kind === "reject" ? " rej" : "") }, v);
      el("div", { class: "eyebrow", text: "Decision recorded" }, c);
      el("h2", { style: "margin:6px 0", text: { approve: "Approved", conditions: "Approved with conditions", reject: "Rejected", fast: "Fast-tracked" }[d.kind] }, c);
      el("div", { style: "font-size:14px;color:var(--muted)", text: "By " + person(d.by).name + " on " + fmt(d.date) + " · " + d.tier + ", " + d.score + ". " + d.reason }, c);
      if (d.conds.length) { const u = el("ul", { style: "margin:10px 0 0;padding-left:20px;font-size:14px;line-height:1.7" }, c); d.conds.forEach(x => el("li", { text: x }, u)); }
      if (d.kind !== "reject") el("div", { class: "note", text: "Added to the AI vendor register. Next full review " + fmt(addMonths(JD.TODAY, INTERVAL[d.tier])) + "; " + s.route.monitor.toLowerCase() + ". Trigger events start a reassessment sooner." }, c);
      const n = el("div", { class: "nav" }, v); el("span", null, n); el("button", { class: "btn pri", text: "Open register", on: { click: () => { state.showRegister = true; render(); } } }, n);
      return;
    }
    const un = unresolved();
    if (un.length) { const c = el("div", { class: "card pad conflict", style: "margin-top:0" }, v); el("h3", { text: pl(un.length, "conflict blocks", "conflicts block") + " approval" }, c);
      el("div", { class: "note", text: "Resolve it on the Public recon step: use the newer source, or record a signed contract term." }, c);
      el("button", { class: "btn", style: "margin-top:10px", text: "Go to the conflict", on: { click: () => go("recon") } }, c); }
    if (me.id !== needs && !(needs === "ravi" && me.type === "committee")) {
      const c = el("div", { class: "card pad", style: "margin-top:16px" }, v); el("div", { class: "note", style: "margin-top:0", text: "Waiting for " + person(needs).name + " (" + person(needs).role + ")." + (s.committee ? " Uses that affect people go to the committee." : "") }, c);
      el("button", { class: "btn", style: "margin-top:10px", text: "Switch to " + person(needs).name, on: { click: () => setPersona(needs) } }, c);
      return;
    }
    const c = el("div", { class: "card pad form", style: "margin-top:16px" }, v);
    el("div", { class: "card-title", text: "Conditions" }, c);
    const conds = conditions(); const boxes = conds.map(x => { const l = el("label", { class: "cond" }, c); const i = el("input", { type: "checkbox" }, l); i.checked = true; el("span", { text: x }, l); return i; });
    el("div", { class: "card-title", text: "Reason", style: "margin-top:6px" }, c);
    const ta = el("textarea", { placeholder: "Why this decision? (required)", "aria-label": "Reason" }, c);
    const n = el("div", { class: "actions", style: "display:flex;gap:8px;flex-wrap:wrap" }, c);
    const pick = () => conds.filter((x, i) => boxes[i].checked);
    el("button", { class: "btn go", text: "Approve", on: { click: () => act(decide(state, state.persona, "approve", ta.value, [])) } }, n);
    el("button", { class: "btn pri", text: "Approve with conditions", on: { click: () => act(decide(state, state.persona, "conditions", ta.value, pick())) } }, n);
    el("button", { class: "btn warn", text: "Reject", on: { click: () => act(decide(state, state.persona, "reject", ta.value, [])) } }, n);
  }

  // ---------- Register ----------
  function registerRows() {
    const base = JD.REGISTER.map(r => Object.assign({}, r)), adds = state.adds;
    adds.forEach(a => { const i = base.findIndex(b => b.name === a.name); if (i >= 0) base[i] = a; else base.push(a); });
    return base.map(r => Object.assign(r, { next: addMonths(r.last, INTERVAL[r.tier]) }));
  }
  function renderRegister(v) {
    head(v, "What <em>AI vendors</em> do we use?", "Approved AI vendors, their tier, and when each is due for review");
    const rows = registerRows(), soon = rows.filter(r => daysBetween(JD.TODAY, r.next) <= 90);
    const L = JD.VENDORS.ledgerlens, lre = registerRows().find(r => r.name === L.name), lDone = lre && lre.isNew;
    const k = el("div", { class: "kpis" }, v);
    [["AI vendors", rows.length, "approved"], ["Critical + High", rows.filter(r => r.tier === "Critical" || r.tier === "High").length, "need yearly review"], ["Due ≤ 90 days", soon.length, "or overdue"],
      ["Triggers", lDone ? 0 : 1, "changes found by recon"], ["Added today", state.adds.length, "from this session"]]
      .forEach(([a, b, c], i) => { const d = el("div", { class: "card kpi", style: "animation-delay:" + i * .05 + "s" }, k); el("div", { class: "k", text: a }, d); el("div", { class: "v", text: b }, d); el("div", { class: "s", text: c }, d); });
    if (!lDone) { const t = el("div", { class: "card pad trig", style: "margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap" }, v);
      el("div", { html: "<div class='eyebrow'>Trigger event</div><b>LedgerLens AI: 4 changes in public sources</b><div style='font-size:13px;color:var(--muted);margin-top:2px'>Model provider, subprocessors, training policy, SOC 2 lapse · next scheduled review " + fmt(lre.next) + "</div>" }, t);
      el("button", { class: "btn pri", text: "Start reassessment", on: { click: () => { choose(state, "ledgerlens"); state.showRegister = false; log("Reassessment started from a trigger event: LedgerLens AI"); go("recon"); } } }, t); }
    const c = el("div", { class: "card pad" }, v); const hh = el("div", { class: "card-head" }, c); el("div", { class: "card-title", text: "Review calendar" }, hh);
    el("div", { class: "legend", style: "display:flex;gap:12px;font-size:11px;color:var(--muted);font-family:var(--mono)", html: ["Low", "Medium", "High", "Critical"].map(t => "<span><i style='display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;background:" + TIERC[t] + "'></i>" + t + "</span>").join("") }, hh);
    timeline(c, rows);
    const tc = el("div", { class: "card pad", style: "margin-top:16px;overflow-x:auto" }, v);
    const tb = el("table", { class: "reg" }, tc), hr = el("tr", null, el("thead", null, tb)); ["Vendor", "Tier", "Owner", "Last review", "Next review", ""].forEach(h => el("th", { text: h }, hr));
    const bd = el("tbody", null, tb);
    rows.slice().sort((a, b) => a.next.localeCompare(b.next)).forEach(r => { const tr = el("tr", { class: r.isNew ? "new" : "" }, bd);
      el("td", { html: "<b>" + esc(r.name) + "</b>" }, tr); el("td", { html: "<span class='tierchip' style='font-size:11px;padding:2px 9px;background:" + TIERC[r.tier] + "'>" + r.tier + "</span>" }, tr);
      el("td", { text: r.owner }, tr); el("td", { text: fmt(r.last) }, tr);
      const d = daysBetween(JD.TODAY, r.next); el("td", { text: fmt(r.next) + (d < 0 ? " · overdue" : d <= 90 ? " · soon" : ""), style: d < 0 ? "color:var(--red)" : d <= 90 ? "color:var(--amber)" : "" }, tr);
      el("td", { text: r.isNew ? "added today" : "", style: "color:var(--accent);font-size:12px" }, tr); });
  }
  function timeline(p, rows) {
    const W = 1100, H = 150, L = 20, Rr = 20, start = addMonths(JD.TODAY, -3), end = addMonths(JD.TODAY, 24), span = daysBetween(start, end);
    const svg = el("svg:svg", { viewBox: "0 0 " + W + " " + H, width: "100%", class: "timeline", role: "img", "aria-label": "Next review dates" }, p);
    const X = d => L + Math.max(0, Math.min(1, daysBetween(start, d) / span)) * (W - L - Rr), lanes = { Low: 30, Medium: 58, High: 86, Critical: 114 };
    for (let m = 0; m <= 27; m += 3) { const d = addMonths(start, m); el("svg:line", { x1: X(d), x2: X(d), y1: 14, y2: H - 22, stroke: "#232C42" }, svg); el("svg:text", { x: X(d), y: H - 6, "text-anchor": "middle", text: new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }) }, svg); }
    el("svg:line", { x1: X(JD.TODAY), x2: X(JD.TODAY), y1: 6, y2: H - 22, stroke: "#22D3EE", "stroke-width": 2 }, svg); el("svg:text", { x: X(JD.TODAY) + 6, y: 12, text: "today", style: "fill:#22D3EE" }, svg);
    rows.forEach((r, i) => el("svg:circle", { cx: X(r.next), cy: lanes[r.tier] + (i % 3 - 1) * 5, r: r.isNew ? 8 : 6, fill: TIERC[r.tier], stroke: r.isNew ? "#E6EAF2" : "#0B0F1A", "stroke-width": 2, "data-tip": r.name + " · " + r.tier + " · next review " + fmt(r.next) + (r.next < start ? " (overdue)" : "") }, svg));
  }

  // ---------- Checks ----------
  function sim(id) { const st = fresh(); choose(st, id); return st; }
  function checks() {
    const out = [];
    let st = sim("docudraft"), s = current(st); out.push(["K1", s.points === 3 && s.tier === "Low" && s.route.path === "Fast track", "DocuDraft scores 3, Low, fast track", s.points + " · " + s.tier + " · " + s.route.path]);
    st = sim("scribely"); s = current(st); out.push(["K2", s.points === 57 && s.tier === "High", "Scribely scores 57, High", s.points + " · " + s.tier]);
    st.whatif.enterprise = true; const pj = projected(st), real = current(st).points; resolve(st, "ravi", "training", "clause"); const after = current(st);
    out.push(["K3", pj.points === 42 && real === 57 && after.points === 42 && after.tier === "Medium", "Enterprise plan projects 42 but stays 57 until the signed clause; then 42, Medium", "projected " + pj.points + " · real " + real + " · after clause " + after.points + " " + after.tier]);
    st = sim("scribely"); s = current(st); st.submitted = true; const d4 = decide(st, "ravi", "conditions", "Approve with opt-out confirmed", []);
    out.push(["K4", st.rec.conflicts.includes("training") && !d4.ok, "Scribely's trust center vs privacy policy conflict blocks approval", d4.msg]);
    st = sim("scribely"); out.push(["K5", st.overrides.training === "none" && current(st).points === 57, "Requester's \"no training\" doesn't lower the score", "requester: none · scored: " + R.effective(st.rec, st.resolutions).training]);
    st = sim("hiresignal"); s = current(st); const d6 = decide(st, "ravi", "approve", "Looks fine to me", []);
    out.push(["K6", s.committee && s.route.evidence.some(x => /bias audit/.test(x)) && !d6.ok, "HireSignal needs the committee and a bias audit", s.tier + " · committee · " + d6.msg]);
    st = sim("promptpal"); s = current(st); out.push(["K7", s.tier === "Prohibited", "PromptPal is prohibited at intake", s.tier + " · alternatives: " + JD.VENDORS.promptpal.alternatives.length]);
    st = sim("ledgerlens"); const ch = DF.diff(JD.VENDORS.ledgerlens.prior, R.effective(st.rec, {})); s = current(st);
    out.push(["K8", ch.length === 4 && JD.VENDORS.ledgerlens.prior.score === 28 && s.points === 53, "LedgerLens: 4 changes, 28 → 53", pl(ch.length, "change", "changes") + " · " + JD.VENDORS.ledgerlens.prior.score + " → " + s.points]);
    const h = sim("hiresignal"); out.push(["K9", st.rec.facts.soc2.stale && R.effective(st.rec, {}).soc2 === "expired" && h.rec.facts.biasAudit.stale, "Facts older than 12 months are stale and don't count as current", "LedgerLens SOC 2: expired · HireSignal bias audit: stale"]);
    const a = pl(0, "conflict", "conflicts"), b = pl(1, "change", "changes"), c = pl(2, "field", "fields");
    out.push(["K10", a === "0 conflicts" && b === "1 change" && c === "2 fields", "Counts of 0 and 1 read correctly", a + " · " + b + " · " + c]);
    return out;
  }
  function openChecks() {
    const body = $("checksBody"); body.innerHTML = "";
    el("div", { class: "eyebrow", text: "Known answers" }, body); el("h2", { text: "Can we trust it?" }, body);
    const res = checks(), pass = res.filter(r => r[1]).length;
    el("div", { class: "note", text: pass + " of " + res.length + " checks pass. Each runs on a fresh copy, so nothing on screen changes." }, body);
    res.forEach(([id, ok, lab, det]) => { const r = el("div", { class: "check-row", tabindex: 0, "data-tip": det }, body); el("span", { class: ok ? "pass-tag" : "fail-tag", text: ok ? "PASS" : "FAIL" }, r); el("span", { class: "mono", style: "color:var(--muted)", text: id }, r); el("span", { text: lab }, r); });
    el("h4", { text: "Guardrails" }, body); const g = el("div", null, body);
    [["Every fact cited", "Source, date, and confidence on each pre-filled fact"], ["Conflicts block approval", "When sources disagree, a reviewer decides"], ["Riskier value scored", "Until resolved, the riskier public statement counts"],
      ["Signed terms only", "What-ifs project; only a recorded signed term changes the score"], ["Stale evidence flagged", "Older than 12 months can't count as current"], ["People decide", "Analyst for Medium and High, committee for Critical and uses that affect people"], ["Logged", "Every action and every blocked action"]]
      .forEach(([k, t]) => el("span", { class: "guard", tabindex: 0, "data-tip": t, text: k }, g));
    el("h4", { text: "Tier sources" }, body);
    el("div", { class: "note", text: "US interagency guidance on third-party relationships (2023) · common four-tier vendor tiering practice · EU AI Act risk categories · NIST AI RMF GOVERN 6. Tier = higher of score tier and floor rules." }, body);
    $("checks").classList.add("open"); $("checks").setAttribute("aria-hidden", "false"); log("Ran checks: " + pass + " of " + res.length + " pass");
  }

  // ---------- chrome ----------
  function fillPersona() { const s = $("persona"); s.innerHTML = ""; JD.PERSONAS.forEach(p => el("option", { value: p.id, text: p.name + " · " + p.role.split(" ")[0] }, s)); s.value = state.persona; }
  function setPersona(id) { state.persona = id; $("persona").value = id; log("Viewing as " + person(id).name + " (" + person(id).role + ")"); toast("Viewing as " + person(id).name); render(); }
  $("persona").addEventListener("change", e => setPersona(e.target.value));
  $("registerBtn").addEventListener("click", () => { state.showRegister = true; render(); window.scrollTo(0, 0); });
  $("checksBtn").addEventListener("click", openChecks);
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => { $("checks").classList.remove("open"); $("checks").setAttribute("aria-hidden", "true"); }));
  $("logBtn").addEventListener("click", () => { const l = $("log"); l.classList.toggle("open"); l.setAttribute("aria-hidden", !l.classList.contains("open")); });
  $("presenterBtn").addEventListener("click", e => { const on = document.body.classList.toggle("present"); e.currentTarget.setAttribute("aria-pressed", on); if (on) $("log").classList.remove("open"); render(); });
  $("resetBtn").addEventListener("click", () => { state = fresh(); fillPersona(); $("logList").innerHTML = ""; $("checks").classList.remove("open"); log("Reset"); toast("Reset"); render(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { $("checks").classList.remove("open"); $("log").classList.remove("open"); } });

  state = fresh(); fillPersona(); log("Loaded " + pl(Object.keys(JD.VENDORS).length, "demo vendor", "demo vendors") + " and " + pl(JD.REGISTER.length, "registered AI vendor", "registered AI vendors")); render();
  window.JA02 = { get state() { return state; }, checks, choose: id => { choose(state, id); render(); }, go, setPersona };
})();
