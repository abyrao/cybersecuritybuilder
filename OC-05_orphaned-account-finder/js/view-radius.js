// OC-05 · View 3: Blast Radius. Account → groups → apps and data → business processes.
(function () {
  "use strict";
  const { $, $$, esc, plural, fmtDate, S, E, DATA } = APP;
  const view = (APP.views.radius = { last: null });

  const TPL = {
    fpa: { r: ["GL actuals (read)", "FY27 operating plan model (write)", "Forecast versions (write)"], p: [{ n: "Q4 forecast review", m: "Board meeting, Nov 5", top: 1 }, { n: "FY27 operating plan", m: "12 forecast versions" }, { n: "Month-end close", m: "Oct 30" }] },
    larkAdmin: { r: ["610 Larkspur accounts", "85 service accounts", "Trust to corp.harborline.local", "14 file servers"], p: [{ n: "Directory admin", m: "Every Larkspur account", top: 1 }, { n: "Path into corp", m: "Through the forest trust" }] },
    apClerk: { r: ["Vendor master (edit)", "Payment runs (approve)", "Bank file export"], p: [{ n: "Vendor payments", m: "$4.6M a week", top: 1 }, { n: "Vendor bank details", m: "1,240 vendors" }] },
    crmExport: { r: ["Accounts and contacts", "Report builder", "Report export"], p: [{ n: "Customer records", m: "38,000 records", top: 1 }, { n: "Q4 pipeline", m: "Open deals and pricing" }] },
  };
  const REACH_TPL = {
    forecast: { r: ["Planning models"], p: [{ n: "Financial forecast", m: "FY27 plan" }] },
    payments: { r: ["Payment runs"], p: [{ n: "Vendor payments", m: "$4.6M a week" }] },
    domain: { r: ["Directory objects", "Group policy"], p: [{ n: "Directory admin", m: "Every account in the domain" }] },
    prod: { r: ["Production account", "Deploy pipeline"], p: [{ n: "Production cloud", m: "Customer-facing services" }] },
    gl: { r: ["General ledger", "Journal entries"], p: [{ n: "General ledger", m: "Month-end close" }] },
    customer: { r: ["Accounts and contacts", "Reports"], p: [{ n: "Customer records", m: "38,000 records" }] },
    employee: { r: ["Employee roster"], p: [{ n: "Employee data", m: "4,200 people" }] },
    source: { r: ["Repositories"], p: [{ n: "Source code", m: "Product repositories" }] },
    email: { r: ["Mailbox", "Shared drives"], p: [{ n: "Email and files", m: "Internal documents" }] },
    tickets: { r: ["Projects and tickets"], p: [{ n: "Tickets", m: "Internal projects" }] },
  };
  function rings(f) {
    const a = f.acct;
    const t = a.radius && TPL[a.radius];
    if (t) return { g: a.groups, r: t.r, p: t.p };
    const keys = (a.reach || []).slice().sort((x, y) => E.REACH[y].pts - E.REACH[x].pts);
    const r = [], p = [];
    keys.forEach((k, i) => { const tp = REACH_TPL[k]; if (!tp) return; r.push(...tp.r); tp.p.forEach((x) => p.push(Object.assign({}, x, { top: i === 0 ? 1 : 0 }))); });
    return { g: a.groups.length ? a.groups : ["No groups"], r: r.length ? r : ["Sign-in only"], p: p.length ? p : [{ n: "Nothing sensitive", m: "Sign-in only", top: 1 }] };
  }
  function meaning(f) {
    const a = f.acct;
    const k = (a.reach || []).slice().sort((x, y) => E.REACH[y].pts - E.REACH[x].pts)[0];
    const m = {
      forecast: APP.isHead(f) ? "can change the forecast the board reviews on Nov 5" : "can change the financial forecast",
      payments: a.groups.includes("AP Approver") ? "can create and approve payments to any vendor" : "can see vendor payments",
      domain: "controls every account in the domain" + (f.sys === "lark" ? ", and that domain is trusted by corp" : ""),
      prod: "can change production systems customers rely on",
      customer: "can read and export customer records",
      gl: (a.priv || 0) >= 1 ? "can post or approve general ledger entries" : "can read the general ledger",
      employee: "can read employees' personal data",
      source: (a.priv || 0) >= 2 ? "can change product source code and settings" : "can read and push product source code",
      email: "can read the mailbox and shared files",
      tickets: "can read and change internal tickets",
    }[k] || "has sign-in access only";
    const who = f.cat === "service" ? "nobody owns it" : f.cat === "unowned" ? "nobody owns it" : f.rec.name + " left " + plural(f.daysOpen, "day") + " ago";
    return `If this account is misused, it ${m}. Today, ${who}.`;
  }

  function pillW(t, size) { return Math.max(70, t.length * (size || 13.5) * 0.54 + 24); }

  view.render = function () {
    const R = APP.R; const pick = $("#radPick");
    if (!R.findings.length) { pick.innerHTML = ""; $("#radSub").textContent = "No orphaned accounts to map."; $("#radCard").innerHTML = `<div class="empty"><div><div class="big">Nothing to map</div>No orphaned accounts found.</div></div>`; $("#radSide").innerHTML = ""; return; }
    if (!APP.f(S.sel)) S.sel = R.findings[0].id;
    const grp = (cat, lbl) => `<optgroup label="${lbl}">${R.findings.filter((f) => f.cat === cat).map((f) => `<option value="${f.id}">${esc(f.acct.user)} · ${esc(APP.sysName(f.sys))} · ${f.score.total}</option>`).join("")}</optgroup>`;
    pick.innerHTML = grp("service", "Service accounts") + grp("person", "Person accounts") + grp("unowned", "Unowned");
    pick.value = S.sel; pick.onchange = () => { S.sel = pick.value; view.render(); };
    const f = APP.f(S.sel);
    $("#radSub").textContent = (f.cat === "person" ? f.rec.name + "'s " : "") + f.acct.user + " in " + APP.sysName(f.sys) + ", from what it's in to what the business would feel.";
    draw(f, view.last !== f.id); view.last = f.id;
    side(f);
  };

  function draw(f, animate) {
    const host = $("#radCard"); const W = host.clientWidth || 900, H = host.clientHeight || 560;
    const cx = W / 2, cy = H / 2 + 6; const base = Math.min(H / 2 - 30, (W / 2 - 110) / 1.45);
    const RR = [base * 0.4, base * 0.7, base * 1.0], SX = 1.42;
    const rg = rings(f);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="${animate ? "rad-in" : ""}">`;
    RR.forEach((r) => (s += `<ellipse class="ring" cx="${cx}" cy="${cy}" rx="${r * SX}" ry="${r}"/>`));
    s += `<ellipse class="ripple" cx="${cx}" cy="${cy}" rx="${RR[2] * SX}" ry="${RR[2]}" style="${animate ? "" : "display:none"}"/>`;
    const caps = ["Groups and roles", "Apps and data", "Business processes"];
    caps.forEach((c, i) => (s += `<circle cx="22" cy="${24 + i * 22}" r="${4 + i * 2}" fill="none" stroke="#B9A6C6" stroke-dasharray="2 2"/><text class="ring-cap" x="36" y="${28 + i * 22}">${["Inner", "Middle", "Outer"][i]}: ${c.toLowerCase()}</text>`));
    const layers = [rg.g, rg.r, rg.p];
    const nodes = [];
    layers.forEach((items, li) => {
      const n = items.length, r = RR[li], off = -Math.PI / 2 + [0.35, Math.PI / Math.max(1, n) + 0.2, Math.PI / (2 * Math.max(1, n)) + 0.15][li];
      items.forEach((it, k) => {
        const a = off + (k / Math.max(1, n)) * Math.PI * 2;
        nodes.push({ li, it, x: cx + r * SX * Math.cos(a), y: cy + r * Math.sin(a), k });
      });
    });
    for (const n of nodes) s += `<line class="spoke" x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}" style="opacity:${0.35 - n.li * 0.08}"/>`;
    // center
    const head = APP.isHead(f);
    s += `<circle cx="${cx}" cy="${cy}" r="58" fill="${head ? "#FCF2D6" : "#EFE3FA"}" stroke="${head ? "#E0A100" : "#7B2CBF"}" stroke-width="2.2"/>`;
    s += `<text x="${cx}" y="${cy - 3}" text-anchor="middle" style="font-family:var(--mono);font-size:13px;font-weight:500;fill:#2A1633">${esc(f.acct.user.length > 15 ? f.acct.user.slice(0, 14) + "…" : f.acct.user)}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" style="font-size:12px;fill:#5E4B68">${esc(APP.sysName(f.sys))}</text>`;
    nodes.forEach((n, i) => {
      const delay = animate ? `animation-delay:${(0.15 + n.li * 0.25 + n.k * 0.06).toFixed(2)}s` : "";
      if (n.li < 2) { const w = pillW(n.it); s += `<g class="node-pill" style="${delay}"><rect x="${n.x - w / 2}" y="${n.y - 15}" width="${w}" height="30" rx="15"/><text x="${n.x}" y="${n.y + 5}" text-anchor="middle">${esc(n.it)}</text></g>`; }
      else { const w = Math.max(pillW(n.it.n, 14.5), pillW(n.it.m, 12.5)); s += `<g class="node-pill l3 ${n.it.top ? "top" : ""}" style="${delay}"><rect x="${n.x - w / 2}" y="${n.y - 24}" width="${w}" height="48" rx="14"/><text x="${n.x}" y="${n.y - 3}" text-anchor="middle" style="font-size:14.5px">${esc(n.it.n)}</text><text class="m" x="${n.x}" y="${n.y + 14}" text-anchor="middle">${esc(n.it.m)}</text></g>`; }
    });
    s += `</svg>`;
    host.innerHTML = s;
  }

  function side(f) {
    const run = DATA.meta.run;
    const sc = f.score;
    const owner = f.cat === "service" ? `${esc(f.rec.name)} (left ${fmtDate(f.rec.term)})` : f.cat === "person" ? `${esc(f.rec.name)}, ${esc(f.rec.id)}` : "None";
    const head = APP.isHead(f);
    $("#radSide").innerHTML = `
      <div class="card" style="padding:14px 16px;${head ? "border-color:var(--gold)" : ""}">
        <div style="font-size:17px;font-weight:600;line-height:1.35;${head ? "color:var(--gold-ink)" : ""}">${esc(meaning(f))}</div>
      </div>
      <div class="card">
        <div class="card-h">Score ${sc.total} <span class="sub">of 100</span> <button class="why" data-tip="Six factors add up to the score. Hover a factor to see the evidence behind it.">Why?</button></div>
        <div class="factors">${sc.factors.map((x) => `<div class="factor" tabindex="0" data-tip="<b>${esc(x.label)}: ${x.pts} of ${x.max}</b><br>${esc(x.why)}"><span class="lb">${esc(x.label)}</span><span class="track"><span class="fill" style="display:block;width:${(x.pts / x.max) * 100}%"></span></span><span class="pts">${x.pts}</span></div>`).join("")}</div>
      </div>
      <div class="card" style="flex:1;min-height:0;display:flex;flex-direction:column">
        <div class="card-h">Account</div>
        <dl class="facts scroll">
          <dt>Owner</dt><dd>${owner}</dd>
          <dt>Matched by</dt><dd>${esc(f.method)}${f.conf < 100 ? ` (${f.conf}%)` : ""}</dd>
          <dt>Last sign-in</dt><dd>${f.acct.lastLogon ? fmtDate(f.acct.lastLogon) : "never"}</dd>
          <dt>Password set</dt><dd>${f.acct.pwdSet ? fmtDate(f.acct.pwdSet) + " (" + plural(E.days(f.acct.pwdSet, run), "day") + ")" : "n/a"}</dd>
          <dt>Groups</dt><dd>${f.acct.groups.length ? plural(f.acct.groups.length, "group") : "none"}</dd>
        </dl>
        <div style="padding:0 16px 14px;display:flex;gap:8px">${f.cat !== "unowned" ? `<button class="btn sm" id="radDep">Departure</button>` : ""}<button class="btn sm primary" id="radRev">Review</button></div>
      </div>`;
    const d = $("#radDep"); if (d) d.onclick = () => APP.go("departure", f.id);
    $("#radRev").onclick = () => APP.go("review", f.id);
  }
  window.addEventListener("resize", () => { if (S.view === "radius") view.render(); });
})();
