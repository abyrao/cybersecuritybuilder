// OC-05 · View 1: Ghost Map. Leavers drawn as ghosts, tethered to every account still live.
(function () {
  "use strict";
  const { $, $$, esc, plural, fmtDate, S, DATA } = APP;
  const W = 1200, H = 680, CX = 600, CY = 344;
  const ST_ANG = { corp: -90, lark: -54, entra: -18, okta: 18, tick: 54, code: 90, cloud: 126, crm: 162, fin: 198, plan: 234 };
  const DEPT_ANG = { ops: -100, it: -60, ppl: -20, prod: 20, cs: 60, eng: 100, mkt: 140, sales: 180, fin: 220 };
  const rad = (d) => (d * Math.PI) / 180;
  const stPos = (id) => ({ x: CX + 515 * Math.cos(rad(ST_ANG[id])), y: CY + 288 * Math.sin(rad(ST_ANG[id])) });
  let deptAng = Object.assign({}, DEPT_ANG);
  const dpPos = (id) => ({ x: CX + 305 * Math.cos(rad(deptAng[id])), y: CY + 168 * Math.sin(rad(deptAng[id])) });
  // Seat each department next to the systems its open accounts live in, so tethers stay short.
  function placeDepts(ents) {
    const vec = {}; for (const d of DATA.depts) vec[d.id] = { x: 0, y: 0, n: 0 };
    for (const e of ents) for (const f of e.findings) { const a = rad(ST_ANG[f.sys]); vec[e.dept].x += Math.cos(a); vec[e.dept].y += Math.sin(a); vec[e.dept].n++; }
    const mean = DATA.depts.map((d) => ({ id: d.id, a: vec[d.id].n ? (Math.atan2(vec[d.id].y, vec[d.id].x) * 180) / Math.PI : DEPT_ANG[d.id] }));
    mean.sort((a, b) => a.a - b.a);
    let best = null;
    for (let rot = 0; rot < 40; rot += 2) {
      let cost = 0; const out = {};
      mean.forEach((m, i) => { const slot = -100 + rot + i * 40; out[m.id] = slot; let d = Math.abs(((slot - m.a + 540) % 360) - 180); cost += d * (vec[m.id].n || 0.2); });
      if (!best || cost < best.cost) best = { cost, out };
    }
    deptAng = best.out;
  }
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function gearPath(r) {
    let d = ""; const teeth = 8;
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = (i / (teeth * 2)) * Math.PI * 2, a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * 0.74 : r;
      d += (i === 0 ? "M" : "L") + (rr * Math.cos(a0)).toFixed(1) + " " + (rr * Math.sin(a0)).toFixed(1) + " L" + (rr * Math.cos(a1)).toFixed(1) + " " + (rr * Math.sin(a1)).toFixed(1) + " ";
    }
    return d + "Z";
  }

  // One node per leaver (person) or per service account; unowned accounts sit beside their system.
  function entities() {
    const R = APP.R, ents = new Map();
    for (const f of R.findings) {
      if (f.cat === "unowned") continue;
      const key = f.cat === "person" ? "p:" + f.rec.id : "s:" + f.id;
      if (!ents.has(key)) ents.set(key, { key, kind: f.cat, rec: f.rec, dept: f.rec.dept, findings: [] });
      ents.get(key).findings.push(f);
    }
    return Array.from(ents.values());
  }

  const view = (APP.views.map = { replayIntro: true, seen: new Set() });
  view.render = function () {
    const R = APP.R, st = R.stats;
    const open = APP.openFindings();
    const ents = entities();
    placeDepts(ents);
    const intro = view.replayIntro; view.replayIntro = false;
    if (intro) view.seen = new Set(R.findings.filter((f) => !APP.isOpen(f)).map((f) => f.id));

    $("#mapSub").textContent = st.total
      ? `${plural(st.terminated, "person", "people")} left since Apr 1. ${st.cleanLeavers.toLocaleString("en-US")} left cleanly; ${plural(st.people, "leaver")} still ${st.people === 1 ? "has" : "have"} live accounts, and ${plural(st.service, "service account")} lost ${st.service === 1 ? "its" : "their"} owner.`
      : `${plural(st.terminated, "person", "people")} left since Apr 1, and every account was removed on time.`;

    // ---------- svg
    seed = 7;
    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" id="ghostSvg" class="${intro ? "intro" : ""}" role="img" aria-label="Ghost map of leavers and their live accounts">`;
    s += `<defs><filter id="blur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>`;
    // department clusters with decor dots for current staff
    const labels = [];
    for (const d of DATA.depts) {
      const p = dpPos(d.id);
      s += `<circle class="dept-ring" cx="${p.x}" cy="${p.y}" r="62"/>`;
      const n = Math.max(6, Math.round(d.size / 34));
      for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, r = 8 + Math.sqrt(rnd()) * 50; s += `<circle class="decor" cx="${(p.x + r * Math.cos(a)).toFixed(1)}" cy="${(p.y + r * Math.sin(a)).toFixed(1)}" r="1.7"/>`; }
      const vx = CX - p.x, vy = CY - p.y, vl = Math.hypot(vx, vy) || 1;
      labels.push(`<text class="dept-label" x="${(p.x + (vx / vl) * 80).toFixed(1)}" y="${(p.y + (vy / vl) * 76 + 5).toFixed(1)}" text-anchor="middle">${esc(d.name)}</text>`);
    }
    // positions for ghosts inside clusters
    const byDept = {}; for (const e of ents) (byDept[e.dept] = byDept[e.dept] || []).push(e);
    for (const dId in byDept) {
      const p = dpPos(dId);
      byDept[dId].sort((a, b) => maxScore(b) - maxScore(a)).forEach((e, i) => { const a = i * 2.39996 + 0.6, r = i === 0 ? 0 : 13 + 10 * Math.sqrt(i); e.x = p.x + r * Math.cos(a); e.y = p.y + r * 0.92 * Math.sin(a); });
    }
    // tethers
    let ti = 0;
    const tethers = [];
    for (const e of ents) for (const f of e.findings) {
      const sp = stPos(f.sys);
      const ax = sp.x + (CX - sp.x) * 0.075, ay = sp.y + (CY - sp.y) * 0.075;
      const mx = (e.x + ax) / 2, my = (e.y + ay) / 2, dx = ax - e.x, dy = ay - e.y, len = Math.hypot(dx, dy);
      const sign = ti % 2 ? 1 : -1, off = 0.1 * len * sign;
      const cx = mx - (dy / len) * off, cy = my + (dx / len) * off;
      const open = APP.isOpen(f);
      let cls = "tether" + (APP.isHead(f) ? " head" : "");
      let style = `stroke-width:${(1 + (f.acct.priv || 0) * 0.9).toFixed(1)};opacity:${(APP.isHead(f) ? 0.95 : 0.2 + Math.min(0.4, f.daysOpen / 180)).toFixed(2)}`;
      if (!open) { if (view.seen.has(f.id)) style += ";display:none"; else { cls += " closed"; view.seen.add(f.id); } }
      if (intro && open) style += `;animation-delay:${(0.5 + ti * 0.012).toFixed(2)}s`;
      tethers.push(`<path class="${cls}" data-f="${f.id}" data-e="${e.key}" d="M${e.x.toFixed(1)} ${e.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ax.toFixed(1)} ${ay.toFixed(1)}" style="${style}"/>`);
      ti++;
    }
    s += tethers.join("");
    // stations
    for (const sysId in ST_ANG) {
      const sy = APP.sys(sysId), p = stPos(sysId);
      const n = open.filter((f) => f.sys === sysId).length;
      const leak = sy.feed === false || sy.sso === false;
      const tipTxt = `<b>${esc(APP.sysName(sysId))}</b><br>${esc(sy.volume)}<br>On HR feed: ${sy.feed ? "yes" : "no"}${sy.sso === null ? "" : " · Behind SSO: " + (sy.sso ? "yes" : "no")}${sy.note ? "<br>" + esc(sy.note) : ""}<br>${plural(n, "live orphaned account")}`;
      s += `<g class="station ${leak ? "leak" : ""}" data-sys="${sysId}" tabindex="0" data-tip="${esc(tipTxt)}"><rect x="${p.x - 76}" y="${p.y - 25}" width="152" height="50" rx="13"/><text class="n" x="${p.x}" y="${p.y - 3}" text-anchor="middle">${esc(APP.sysName(sysId))}</text><text class="c" x="${p.x}" y="${p.y + 16}" text-anchor="middle">${n ? plural(n, "live orphan") : "clear"}</text></g>`;
    }
    // unowned accounts beside their system
    const unk = APP.R.findings.filter((f) => f.cat === "unowned");
    const bySys = {}; unk.forEach((f) => (bySys[f.sys] = bySys[f.sys] || []).push(f));
    for (const sysId in bySys) {
      const p = stPos(sysId), list = bySys[sysId];
      // Sit just inside the box edge facing the center; spread along that edge.
      const side = Math.abs(Math.cos(rad(ST_ANG[sysId]))) > 0.6;
      const dir = side ? (p.x < CX ? 1 : -1) : (p.y < CY ? 1 : -1);
      const bx = side ? p.x + dir * 92 : p.x, by = side ? p.y : p.y + dir * 40;
      const nx = side ? 1 : 0, ny = side ? 0 : 1;
      list.forEach((f, k) => {
        const t = (k - (list.length - 1) / 2) * 18; const x = bx + ny * t, y = by + nx * t;
        const tipTxt = `<b>${esc(f.acct.user)}</b> · no owner<br>${esc(f.acct.note)}<br>Score ${f.score.total}`;
        s += `<g class="unk-g" data-fid="${f.id}" tabindex="0" data-tip="${esc(tipTxt)}" style="cursor:pointer"><circle class="unk ${APP.isOpen(f) ? "" : "closed"}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5"/><text class="unk-q" x="${x.toFixed(1)}" y="${(y + 3.2).toFixed(1)}" text-anchor="middle">?</text></g>`;
      });
    }
    // ghosts
    ents.sort((a, b) => maxScore(a) - maxScore(b)).forEach((e, i) => {
      const fs = e.findings, openF = fs.filter((f) => APP.isOpen(f));
      const head = fs.some((f) => APP.isHead(f));
      const top = fs.slice().sort((a, b) => b.score.total - a.score.total)[0];
      const days = top.daysOpen, priv = Math.max(...fs.map((f) => f.acct.priv || 0));
      const r = 6 + priv * 1.6, halo = r + 3 + Math.min(9, days / 9), haloOp = Math.min(0.3, 0.08 + days / 380);
      const sel = fs.some((f) => f.id === S.sel);
      const name = e.kind === "service" ? top.acct.user : e.rec.name;
      const tipTxt = e.kind === "service"
        ? `<b>${esc(top.acct.user)}</b> · service account<br>Owner ${esc(e.rec.name)} left ${fmtDate(e.rec.term)} (${plural(days, "day")})<br>${esc(top.top)}<br>Score ${top.score.total}`
        : `<b>${esc(e.rec.name)}</b> · ${esc(e.rec.title)}<br>Left ${fmtDate(e.rec.term)} (${plural(days, "day")} ago, ${esc(e.rec.type.toLowerCase())})<br>${plural(openF.length, "live account")}: ${openF.map((f) => esc(APP.sysName(f.sys))).join(", ") || "none"}<br>Highest score ${top.score.total}`;
      const body = e.kind === "service" ? `<path class="gear" d="${gearPath(r + 2)}" transform="translate(${e.x.toFixed(1)} ${e.y.toFixed(1)})"/><circle cx="${e.x.toFixed(1)}" cy="${e.y.toFixed(1)}" r="${(r * 0.32).toFixed(1)}" fill="var(--surface)"/>`
        : `<circle class="body" cx="${e.x.toFixed(1)}" cy="${e.y.toFixed(1)}" r="${r.toFixed(1)}"/>`;
      s += `<g class="ghost ${head ? "head" : ""} ${sel ? "sel" : ""} ${openF.length ? "" : "closed"}" data-e="${e.key}" data-fid="${top.id}" tabindex="0" role="button" aria-label="${esc(name)}" data-tip="${esc(tipTxt)}" style="${intro ? `animation-delay:${(i * 0.02).toFixed(2)}s` : ""}"><circle class="halo" cx="${e.x.toFixed(1)}" cy="${e.y.toFixed(1)}" r="${halo.toFixed(1)}" filter="url(#blur)" opacity="${openF.length ? haloOp.toFixed(2) : 0}"/>${body}</g>`;
    });
    // center
    s += labels.join("");
    s += `<rect x="${CX - 72}" y="${CY - 36}" width="144" height="66" rx="16" fill="#fff" opacity=".92"/>`;
    s += `<g class="center-label"><text class="big" x="${CX}" y="${CY - 2}" text-anchor="middle">${APP.R.stats.terminated}</text><text class="small" x="${CX}" y="${CY + 20}" text-anchor="middle">left since Apr 1</text></g>`;
    s += `</svg>`;
    s += `<div class="legend map-legend">
      <span><svg width="14" height="14"><circle cx="7" cy="7" r="5.5" fill="rgba(123,44,191,.16)" stroke="#7B2CBF" stroke-width="1.5"/></svg>Leaver</span>
      <span><svg width="16" height="16"><path d="${gearPath(7)}" transform="translate(8 8)" fill="rgba(123,44,191,.18)" stroke="#7B2CBF" stroke-width="1.3"/></svg>Service account</span>
      <span><svg width="16" height="16"><circle cx="8" cy="8" r="6.5" fill="#fff" stroke="#8E7D97" stroke-dasharray="2 2"/><text x="8" y="11" font-size="9" font-weight="700" text-anchor="middle" fill="#8E7D97">?</text></svg>No owner</span>
      <span data-tip="Thicker lines mean more privilege. Brighter glow means longer since the person left." tabindex="0"><svg width="26" height="10"><path d="M2 5 L24 5" stroke="#7B2CBF" stroke-width="3.5" stroke-linecap="round"/></svg>Live account</span>
      <span data-tip="Dashed systems aren't on the HR feed or aren't behind SSO." tabindex="0"><svg width="22" height="14"><rect x="1" y="1" width="20" height="12" rx="4" fill="#fff" stroke="#8E7D97" stroke-dasharray="3 2"/></svg>Leaky system</span>
    </div>`;
    $("#mapCard").innerHTML = s;
    wire();
    renderSide();
  };
  const maxScore = (e) => Math.max(...e.findings.map((f) => f.score.total));

  function wire() {
    const svg = $("#ghostSvg");
    $$(".ghost, .unk-g", svg).forEach((g) => {
      const on = () => { svg.classList.add("dimmed"); g.classList.add("hl"); $$(`.tether[data-e="${g.dataset.e}"]`, svg).forEach((t) => t.classList.add("hl")); };
      const off = () => { svg.classList.remove("dimmed"); g.classList.remove("hl"); $$(".tether.hl", svg).forEach((t) => t.classList.remove("hl")); };
      g.addEventListener("mouseenter", on); g.addEventListener("mouseleave", off); g.addEventListener("focus", on); g.addEventListener("blur", off);
      const pick = () => { S.sel = g.dataset.fid; renderSide(); $$(".ghost", svg).forEach((x) => x.classList.toggle("sel", x === g)); };
      g.addEventListener("click", pick);
      g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(); } });
    });
    $$(".station", svg).forEach((g) => {
      const sysId = g.dataset.sys;
      g.addEventListener("mouseenter", () => { svg.classList.add("dimmed"); $$(`.tether`, svg).forEach((t) => { const f = APP.f(t.dataset.f); if (f && f.sys === sysId) t.classList.add("hl"); }); });
      g.addEventListener("mouseleave", () => { svg.classList.remove("dimmed"); $$(".tether.hl", svg).forEach((t) => t.classList.remove("hl")); });
    });
  }

  function renderSide() {
    const R = APP.R, open = APP.openFindings();
    const c = (cat) => open.filter((f) => f.cat === cat).length;
    if (!R.findings.length) {
      $("#mapHero").innerHTML = `<div class="num">0</div><div class="lbl">No orphaned accounts found</div><div class="split"><span class="chip teal">Every leaver's accounts were removed</span></div>`;
      $("#brightList").innerHTML = `<li class="faint" style="padding:8px">Nothing to review.</li>`;
      $("#mapSel").innerHTML = `<div class="muted">Switch the data back to <b>Seeded</b> on the Runs view to see the demo findings.</div>`;
      return;
    }
    $("#mapHero").innerHTML = `<div class="num" id="heroNum">${open.length}</div>
      <div class="lbl">${open.length === 1 ? "account outlived its owner" : "accounts outlived their owners"} <button class="why" data-tip="Enabled accounts whose person left, service accounts whose owner left, and accounts with no owner at all. Checked across 11 sources in today's 06:00 run. Closed accounts drop off as soon as an approved action runs.">Why?</button></div>
      <div class="split"><span class="chip plum" data-tip="Accounts of people who left">${c("person")} person</span><span class="chip plum" data-tip="Service accounts whose owner left">${c("service")} service</span><span class="chip" data-tip="Accounts with no HR match and no owner">${c("unowned")} unowned</span></div>`;
    const top = open.filter((f) => f.cat !== "unowned").slice(0, 8);
    $("#brightList").innerHTML = top.map((f) => `<li><button class="row-btn ${f.id === S.sel ? "on" : ""}" data-fid="${f.id}"><span class="grow"><span class="nm">${f.cat === "service" ? `<span class="mono">${esc(f.acct.user)}</span>` : esc(f.rec.name)}</span><span class="meta wrap">${esc(APP.sysName(f.sys))}: ${esc(f.top)}</span></span><span class="pill-score ${APP.isHead(f) ? "head" : ""}">${f.score.total}</span></button></li>`).join("") || `<li class="faint" style="padding:8px">All closed.</li>`;
    $$("#brightList .row-btn").forEach((b) => b.addEventListener("click", () => { S.sel = b.dataset.fid; view.render(); }));
    const f = APP.f(S.sel);
    if (!f) { $("#mapSel").innerHTML = ""; return; }
    const head = APP.isHead(f);
    const flags = [];
    if (f.investigate) flags.push(`<span class="chip coral">Investigate</span>`);
    if (f.legalHold) flags.push(`<span class="chip blue">Legal hold</span>`);
    if (f.exec) flags.push(`<span class="chip plum">Executive</span>`);
    if (f.cat === "service" && f.inUse) flags.push(`<span class="chip plum">In use</span>`);
    if (!APP.isOpen(f)) flags.push(`<span class="chip teal">${APP.status(f) === "kept" ? "Kept" : "Closed"}</span>`);
    $("#mapSel").innerHTML = `<div><div class="nm">${f.cat === "person" ? esc(f.rec.name) : `<span class="mono">${esc(f.acct.user)}</span>`}</div><div class="faint" style="font-size:14px">${esc(APP.whoSub(f))}</div></div>
      <div style="display:flex;gap:5px;flex-wrap:wrap"><span class="chip">${esc(APP.sysName(f.sys))}</span><span class="chip ${head ? "gold" : "plum"}">Score ${f.score.total}</span>${flags.join("")}</div>
      <div class="reason" style="${head ? "color:var(--gold-ink);font-weight:600" : ""}">${esc(f.top)}</div>
      <div class="acts">${f.cat !== "unowned" ? `<button class="btn sm" data-go="departure">Departure</button>` : ""}<button class="btn sm" data-go="radius">Blast radius</button><button class="btn sm primary" data-go="review">Review</button></div>`;
    $$("#mapSel [data-go]").forEach((b) => b.addEventListener("click", () => APP.go(b.dataset.go, f.id)));
  }
})();
