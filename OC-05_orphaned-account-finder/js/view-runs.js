// OC-05 · View 6: Runs. Trend, daily finds, sources and match rules.
(function () {
  "use strict";
  const { $, $$, esc, plural, fmtDate, S, DATA, E } = APP;
  const view = (APP.views.runs = {});

  function nextRun() {
    const n = new Date(); const t = new Date(n); t.setHours(6, 0, 0, 0); if (t <= n) t.setDate(t.getDate() + 1);
    const mins = Math.round((t - n) / 60000); return { h: Math.floor(mins / 60), m: mins % 60 };
  }

  view.render = function () {
    const R = APP.R, st = R.stats, open = APP.openFindings();
    $$("#dataSeg button").forEach((b) => b.classList.toggle("on", b.dataset.ds === S.dataset));
    $("#runSub").textContent = `Daily since Aug 5 across ${plural(DATA.systems.length, "source")}. ${S.runs ? plural(S.runs, "extra run") + " today, last at " + S.lastRun + "." : "Last run today at 06:00."}`;
    const exp = open.reduce((s, f) => s + f.daysOpen, 0);
    const nr = nextRun();
    const tiles = [
      { lbl: "Open orphans", val: open.length, note: R.findings.length ? `of ${R.findings.length} found today` : "nothing found", head: open.length > 0, tip: "Flagged accounts not yet closed, kept, or awaiting verification." },
      { lbl: "Exposure days", val: exp.toLocaleString("en-US"), note: "days open, added up", tip: "Each open orphan adds one day for every day it has been live since its owner left. Closing old, privileged accounts first brings this down fastest." },
      { lbl: "Finance app removal", val: st.medians.fin === null ? "n/a" : plural(st.medians.fin, "day"), note: "median; SSO apps " + (st.medians.okta === 0 ? "same day" : plural(st.medians.okta || 0, "day")), tip: "Median days from termination to removal, for accounts already removed." },
      { lbl: "Next run", val: `${nr.h}h ${nr.m}m`, note: "daily at 06:00", tip: "Each run pulls all sources, matches against HR, and verifies yesterday's approved actions." },
    ];
    $("#runTiles").innerHTML = tiles.map((t) => `<div class="card tile ${t.head ? "head" : ""}"><div class="lbl">${esc(t.lbl)} <button class="why" data-tip="${esc(t.tip)}">Why?</button></div><div class="val">${esc(t.val)}</div><div class="note">${esc(t.note)}</div></div>`).join("");
    trend(open.length);
    cal();
    $("#srcSub").textContent = `last pull ${S.runs ? S.lastRun : "06:00"}`;
    $("#srcTable").innerHTML = `<tr><th>Source</th><th>Records</th><th>HR feed</th><th>SSO</th></tr>` + DATA.systems.map((s) => `<tr><td><b>${esc(APP.sysName(s.id))}</b></td><td>${esc(s.volume)}</td><td class="${s.feed ? "yes" : S.fixes[s.id] ? "" : "no"}">${s.id === "hr" ? "source" : s.feed ? "yes" : S.fixes[s.id] ? "fix planned" : "no"}</td><td class="${s.sso === false && !S.fixes[s.id] ? "no" : s.sso ? "yes" : ""}">${s.sso === null ? "n/a" : s.sso ? "yes" : S.fixes[s.id] ? "fix planned" : "no"}</td></tr>`).join("");
    $("#rulesList").innerHTML = DATA.rules.map((r) => `<li><span class="d">${fmtDate(r.date)}</span><span>${esc(r.what)}</span></li>`).join("");
  };

  function trend(openNow) {
    const host = $("#trendChart"); const W = host.clientWidth || 600, H = host.clientHeight || 220;
    const w = DATA.history.weeks.slice(); w[w.length - 1] = S.dataset === "seed" ? openNow : 0;
    const fixes = Object.keys(S.fixes).length;
    const proj = fixes && S.dataset === "seed" ? Array.from({ length: 7 }, (_, i) => Math.max(Math.round(openNow * 0.22), Math.round(openNow - (i + 1) * (1.5 + 3 * fixes)))) : [];
    const n = w.length + proj.length;
    const L = 38, Rr = 92, T = 14, B = 26;
    const max = Math.max(130, ...w);
    const x = (i) => L + (i / (n - 1)) * (W - L - Rr), y = (v) => T + (1 - v / max) * (H - T - B);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
    for (const v of [0, 50, 100]) s += `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" stroke="#F0E9F3"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    const labels = DATA.history.weekLabels;
    [0, 4, 8, 11].forEach((i) => (s += `<text class="ax" x="${x(i)}" y="${H - 6}" text-anchor="middle">${i === 11 ? "Today" : fmtDate(labels[i])}</text>`));
    s += `<path d="${w.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join(" ")} L${x(w.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z" fill="#7B2CBF" opacity=".07"/>`;
    s += `<path d="${w.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join(" ")}" fill="none" stroke="#7B2CBF" stroke-width="2.5" stroke-linejoin="round"/>`;
    w.forEach((v, i) => (s += `<circle cx="${x(i)}" cy="${y(v)}" r="${i === w.length - 1 ? 5 : 3}" fill="${i === w.length - 1 ? "#E0A100" : "#7B2CBF"}" data-tip="${i === w.length - 1 ? "Today" : "Week of " + fmtDate(labels[i])}: ${plural(v, "open orphan")}"/>`));
    s += `<text x="${x(w.length - 1) + 10}" y="${y(w[w.length - 1]) - 8}" style="font-size:13.5px;font-weight:700;fill:#7A5700">${w[w.length - 1]} now</text>`;
    if (proj.length) {
      const pts = [[w.length - 1, w[w.length - 1]], ...proj.map((v, i) => [w.length + i, v])];
      s += `<path d="${pts.map((p, i) => (i ? "L" : "M") + x(p[0]) + " " + y(p[1])).join(" ")}" fill="none" stroke="#2A9D8F" stroke-width="2.5" stroke-dasharray="6 5"/>`;
      const last = pts[pts.length - 1]; s += `<text x="${x(last[0]) + 8}" y="${y(last[1]) + 4}" style="font-size:13px;font-weight:600;fill:#1C6F65">with ${plural(fixes, "fix", "fixes")}</text>`;
    } else if (S.dataset === "seed") {
      s += `<text x="${W - Rr + 8}" y="${T + 14}" class="ax">accept a fix</text><text x="${W - Rr + 8}" y="${T + 30}" class="ax">on Leaks to</text><text x="${W - Rr + 8}" y="${T + 46}" class="ax">see the effect</text>`;
    }
    s += `</svg>`;
    host.innerHTML = s;
  }

  function cal() {
    const host = $("#calChart"); const W = host.clientWidth || 500, H = host.clientHeight || 220;
    const days = DATA.history.days.slice(-84).map((d) => ({ date: d.date, found: S.dataset === "seed" ? d.found : 0 }));
    const first = new Date(days[0].date + "T00:00:00Z"); const off = (first.getUTCDay() + 6) % 7;
    const cols = Math.ceil((days.length + off) / 7);
    const L = 40, T = 8, B = 30, cw = Math.min(28, (W - L - 12) / cols), ch = Math.min(22, (H - T - B) / 7);
    const col = (n) => (n === 0 ? "#F0E9F3" : n === 1 ? "#DCC7EE" : n === 2 ? "#B48AE0" : "#7B2CBF");
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
    ["Mon", "Wed", "Fri"].forEach((d, i) => (s += `<text class="ax" x="${L - 8}" y="${T + (i * 2) * ch + ch * 0.7}" text-anchor="end">${d}</text>`));
    days.forEach((d, i) => {
      const k = i + off, c = Math.floor(k / 7), r = k % 7; const last = i === days.length - 1;
      s += `<rect x="${L + c * cw}" y="${T + r * ch}" width="${cw - 3}" height="${ch - 3}" rx="4" fill="${col(d.found)}" ${last ? 'stroke="#E0A100" stroke-width="2"' : ""} data-tip="${fmtDate(d.date)}: ${plural(d.found, "new orphan")}"/>`;
    });
    const ly = T + 7 * ch + 18;
    s += `<text class="ax" x="${L}" y="${ly}">Fewer</text>`;
    [0, 1, 2, 3].forEach((n, i) => (s += `<rect x="${L + 44 + i * 20}" y="${ly - 11}" width="15" height="13" rx="3" fill="${col(n)}"/>`));
    s += `<text class="ax" x="${L + 130}" y="${ly}">More</text>`;
    s += `</svg>`;
    host.innerHTML = s;
  }
  window.addEventListener("resize", () => { if (S.view === "runs") view.render(); });
})();
