// OC-05 · View 2: Departure. One lane per account from the termination date.
(function () {
  "use strict";
  const { $, esc, plural, fmtDate, S, DATA, E } = APP;
  const view = (APP.views.departure = {});

  function entities() {
    const out = [], seen = new Set();
    for (const f of APP.R.findings) {
      if (f.cat === "person" && !seen.has("p:" + f.rec.id)) { seen.add("p:" + f.rec.id); out.push({ key: "p:" + f.rec.id, label: f.rec.name + " · " + f.rec.title, f }); }
      if (f.cat === "service") out.push({ key: "s:" + f.id, label: f.acct.user + " · service account", f });
    }
    return out;
  }

  view.render = function () {
    const ents = entities();
    const pick = $("#depPick");
    if (!ents.length) {
      pick.innerHTML = ""; $("#depSub").textContent = "No leaver has a live account.";
      $("#depTiles").innerHTML = ""; $("#depChartH").innerHTML = "";
      $("#depChart").innerHTML = `<div class="empty"><div><div class="big">No open departures</div>Every leaver's accounts were removed on time.</div></div>`; return;
    }
    if (!S.depKey || !ents.some((e) => e.key === S.depKey)) { const sel = APP.f(S.sel); S.depKey = sel && sel.cat === "service" ? "s:" + sel.id : sel && sel.cat === "person" ? "p:" + sel.rec.id : ents[0].key; }
    pick.innerHTML = `<optgroup label="Leavers">${ents.filter((e) => e.key[0] === "p").map((e) => `<option value="${e.key}">${esc(e.label)}</option>`).join("")}</optgroup><optgroup label="Service accounts">${ents.filter((e) => e.key[0] === "s").map((e) => `<option value="${e.key}">${esc(e.label)}</option>`).join("")}</optgroup>`;
    pick.value = S.depKey;
    $("#view-departure .picker label").textContent = "Show";
    pick.onchange = () => { S.depKey = pick.value; view.render(); };

    const run = DATA.meta.run;
    const isSvc = S.depKey[0] === "s";
    const ent = ents.find((e) => e.key === S.depKey);
    const rec = ent.f.rec;
    const today = E.days(rec.term, run);
    const lanes = [];
    for (const a of DATA.accounts.filter((x) => x.personId === rec.id && x.kind === "person")) {
      const f = APP.R.findings.find((x) => x.acct.id === a.id);
      let end, state;
      if (!a.enabled) { end = E.days(rec.term, a.disabledOn); state = "closed"; }
      else if (f && !APP.isOpen(f)) { end = today; state = APP.status(f) === "kept" ? "kept" : "today"; }
      else { end = today; state = "open"; }
      lanes.push({ a, f, end, state, sys: a.sys });
    }
    if (isSvc) { const f = ent.f; lanes.push({ a: f.acct, f, end: today, state: APP.isOpen(f) ? "svc" : "today", sys: f.sys, svc: true }); }
    const order = Object.keys({ corp: 1, lark: 1, entra: 1, okta: 1, plan: 1, fin: 1, crm: 1, code: 1, cloud: 1, tick: 1 });
    lanes.sort((x, y) => (x.svc ? 1 : 0) - (y.svc ? 1 : 0) || order.indexOf(x.sys) - order.indexOf(y.sys));

    const openN = lanes.filter((l) => l.state === "open" || l.state === "svc").length;
    const closed = lanes.filter((l) => l.state === "closed");
    const sameDay = closed.filter((l) => l.end === 0).length;
    $("#depSub").textContent = isSvc
      ? `${ent.f.acct.user}: ${ent.f.acct.desc}. Its owner, ${rec.name}, left ${fmtDate(rec.term)}.`
      : `${rec.name} left ${fmtDate(rec.term)} (${rec.type.toLowerCase()}). ${plural(closed.length, "account")} removed, ${plural(openN, "account")} still open.`;

    const tiles = isSvc ? [
      { lbl: "Owner left", val: fmtDate(rec.term), note: rec.name },
      { lbl: "Days without an owner", val: today, note: "and counting", head: APP.isOpen(ent.f) },
      { lbl: "Sign-ins since", val: (ent.f.acct.logons || []).filter((d) => d > rec.term).length, note: ent.f.inUse ? "still running" : "last " + fmtDate(ent.f.acct.lastLogon), tip: "Sign-ins by the service account after its owner left." },
      { lbl: "Password age", val: plural(E.days(ent.f.acct.pwdSet, run), "day"), note: "set " + fmtDate(ent.f.acct.pwdSet) },
    ] : [
      { lbl: "Accounts", val: lanes.length, note: "across " + plural(new Set(lanes.map((l) => l.sys)).size, "system") },
      { lbl: "Removed same day", val: sameDay, note: "through SSO and the HR feed" },
      { lbl: "Still open", val: openN, note: openN ? "need review" : "nothing left", head: openN > 0 },
      { lbl: "Longest open", val: plural(Math.max(0, ...lanes.map((l) => l.end)), "day"), note: "since termination" },
    ];
    $("#depTiles").innerHTML = tiles.map((t) => `<div class="card tile ${t.head ? "head" : ""}"><div class="lbl">${esc(t.lbl)}${t.tip ? ` <button class="why" data-tip="${esc(t.tip)}">Why?</button>` : ""}</div><div class="val">${esc(t.val)}</div><div class="note">${esc(t.note)}</div></div>`).join("");
    $("#depChartH").innerHTML = `${isSvc ? "After the owner left" : "After " + esc(rec.name.split(" ")[0]) + " left"} <span class="sub">one lane per account · day 0 is the termination date</span>`;
    draw(lanes, rec, today, isSvc ? ent.f : null);
  };

  function draw(lanes, rec, today, svcF) {
    const host = $("#depChart"); const W = host.clientWidth || 900, H = host.clientHeight || 400;
    const L = 230, Rm = 150, T = 36, B = 30;
    const maxD = Math.max(30, today + 4, ...lanes.map((l) => l.end + 4));
    const x = (d) => L + ((d + 4) / (maxD + 4)) * (W - L - Rm);
    const lh = Math.min(96, (H - T - B) / lanes.length);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
    // grid
    const step = maxD > 120 ? 30 : maxD > 60 ? 14 : 7;
    for (let d = 0; d <= maxD; d += step) s += `<line x1="${x(d)}" x2="${x(d)}" y1="${T - 6}" y2="${H - B}" stroke="#E7DEEB"/><text class="ax" x="${x(d)}" y="${H - B + 18}" text-anchor="middle">${d === 0 ? "day 0" : d}</text>`;
    s += `<line x1="${x(0)}" x2="${x(0)}" y1="${T - 14}" y2="${H - B}" stroke="#2A1633" stroke-width="2"/><text class="ax" x="${x(0) + 6}" y="${T - 18}" style="fill:#2A1633;font-weight:600">Left ${fmtDate(rec.term)}</text>`;
    s += `<line x1="${x(today)}" x2="${x(today)}" y1="${T - 14}" y2="${H - B}" stroke="#8E7D97" stroke-dasharray="4 4"/><text class="ax" x="${x(today) - 6}" y="${T - 18}" text-anchor="end">Today, ${fmtDate(APP.DATA.meta.run)}</text>`;
    lanes.forEach((l, i) => {
      const y = T + i * lh + lh / 2, bh = Math.min(28, lh * 0.4);
      const f = l.f;
      s += `<text class="lane-l" x="16" y="${y - 2}">${l.svc ? "Service account" : esc(APP.sysName(l.sys))}</text><text class="lane-s" x="16" y="${y + 15}">${esc(l.a.user)}${l.svc ? " · " + esc(APP.sysName(l.sys)) : ""}</text>`;
      s += `<line x1="${L - 10}" x2="${W - Rm + 10}" y1="${y}" y2="${y}" stroke="#F0E9F3"/>`;
      const x0 = x(0), x1 = Math.max(x(l.end), x0 + 7);
      const color = l.state === "closed" ? "#2A9D8F" : l.state === "today" ? "#2A9D8F" : l.state === "kept" ? "#8E7D97" : "#E0A100";
      const label = l.state === "closed" ? (l.end === 0 ? "removed day 0" : "removed after " + plural(l.end, "day")) : l.state === "today" ? "closed today" : l.state === "kept" ? "kept, with reason" : l.svc ? "in use, no owner" : "still open, " + plural(l.end, "day");
      const tipTxt = `<b>${esc(APP.sysName(l.sys))}</b> · <span>${esc(l.a.user)}</span><br>${esc(label)}${f ? "<br>Score " + f.score.total + ": " + esc(f.top) : ""}`;
      s += `<rect class="bar-grow" x="${x0}" y="${y - bh / 2}" width="${x1 - x0}" height="${bh}" rx="${bh / 2}" fill="${color}" opacity="${l.state === "closed" ? 0.75 : 0.95}" style="animation-delay:${i * 0.07}s" data-tip="${esc(tipTxt)}"/>`;
      s += `<text class="ax" x="${x1 + 8}" y="${y + 4}" style="fill:${l.state === "open" || l.state === "svc" ? "#7A5700" : "#5E4B68"};font-weight:${l.state === "open" || l.state === "svc" ? 600 : 400}">${esc(label)}</text>`;
      if (l.svc) for (const d of (l.a.logons || []).filter((d) => d > rec.term)) s += `<circle cx="${x(APP.E.days(rec.term, d))}" cy="${y}" r="3.6" fill="#7B2CBF" data-tip="Signed in ${fmtDate(d)}"/>`;
      for (const ev of (l.a.events || []).filter((e) => e.date > rec.term)) { const ex = x(APP.E.days(rec.term, ev.date)); s += `<path d="M${ex} ${y - 9} L${ex + 9} ${y} L${ex} ${y + 9} L${ex - 9} ${y} Z" fill="#E76F51" stroke="#fff" stroke-width="1.5" data-tip="<b>After termination</b><br>${esc(ev.what)}<br>${fmtDate(ev.date)}"/>`; }
      if (!l.svc && l.a.lastLogon && l.a.lastLogon > rec.term && !(l.a.events || []).length) { const ex = x(APP.E.days(rec.term, l.a.lastLogon)); s += `<path d="M${ex} ${y - 9} L${ex + 9} ${y} L${ex} ${y + 9} L${ex - 9} ${y} Z" fill="#E76F51" stroke="#fff" stroke-width="1.5" data-tip="<b>Sign-in after termination</b><br>${fmtDate(l.a.lastLogon)}"/>`; }
    });
    s += `</svg>`;
    host.innerHTML = s;
  }
  window.addEventListener("resize", () => { if (S.view === "departure") view.render(); });
})();
