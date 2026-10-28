// OC-05 · View 5: Leaks. Where orphans come from, and the upstream fix.
(function () {
  "use strict";
  const { $, $$, esc, plural, S, DATA, E } = APP;
  const view = (APP.views.leaks = {});
  const ORDER = ["lark", "fin", "crm", "code", "cloud", "corp", "entra", "okta", "tick", "plan"];
  const ROOT_COLOR = { feed: "#E0A100", sso: "#E0A100", local: "#7B2CBF", manual: "#B9A6C6" };
  const FIXES = [
    { key: "lark", sys: "lark", title: "Connect Larkspur to HR-driven removal", body: "Add larkspur.local to the HR feed so a termination disables the account the same day, as it already does in corp. Median removal here is 47 days today." },
    { key: "fin", sys: "fin", title: "Put the finance app behind SSO", body: "Move the finance app's 340 local accounts to SSO with automatic provisioning. Removal now waits on a manual ticket and takes a median of 34 days." },
  ];

  view.render = function () {
    const st = APP.R.stats;
    const leak = (st.roots.feed || 0) + (st.roots.sso || 0);
    $("#leakSub").textContent = st.person
      ? `${leak} of ${plural(st.person, "orphaned person account")} come from 2 systems the HR feed doesn't reach. Fix the pipe, not the puddle.`
      : "No orphaned person accounts. Every system removed leavers on time.";
    fixes(); pipes(st); medians(st);
  };

  function pipes(st) {
    const host = $("#pipeChart"); const W = host.clientWidth || 800, H = host.clientHeight || 480;
    const top = 18, bottom = 46, rows = ORDER.length, rh = (H - top - bottom) / rows;
    const trunkX = 190, pillX = 250, pillW = 170, barX = pillX + pillW + 40, barMax = Math.min(W - barX - 70, 560);
    const max = Math.max(1, ...ORDER.map((k) => st.bySys[k].open));
    const y = (i) => top + rh * i + rh / 2;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
    // HR tank
    const ty = H / 2 - bottom / 2;
    s += `<rect x="18" y="${ty - 46}" width="128" height="92" rx="16" fill="#EFE3FA" stroke="#7B2CBF" stroke-width="1.5"/><text x="82" y="${ty - 8}" text-anchor="middle" style="font-weight:700;font-size:16px;fill:#4E1A7D">${esc(APP.sysName("hr"))}</text><text x="82" y="${ty + 12}" text-anchor="middle" style="font-size:13px;fill:#5E4B68">${plural(st.terminated, "leaver")}</text><text x="82" y="${ty + 29}" text-anchor="middle" style="font-size:12.5px;fill:#8E7D97">since Apr 1</text>`;
    s += `<path class="pipe" d="M146 ${ty} L${trunkX} ${ty}"/><path class="pipe" d="M${trunkX} ${y(0)} L${trunkX} ${y(rows - 1)}"/>`;
    s += `<path class="pipe flow" d="M146 ${ty} L${trunkX} ${ty}"/>`;
    ORDER.forEach((k, i) => {
      const sy = APP.sys(k), yy = y(i);
      const broken = sy.feed === false || sy.sso === false;
      const fixed = !!S.fixes[k];
      if (broken && !fixed) {
        s += `<path class="pipe broken" d="M${trunkX} ${yy} L${trunkX + 24} ${yy}"/><path class="pipe broken" d="M${pillX - 18} ${yy} L${pillX} ${yy}"/>`;
        const gx = trunkX + 36;
        for (let d = 0; d < 3; d++) s += `<circle class="drip" cx="${gx + d * 5}" cy="${yy + 4}" r="3.6"><animate attributeName="cy" from="${yy + 4}" to="${yy + rh * 0.45}" dur="1.4s" begin="${d * 0.45}s" repeatCount="indefinite"/><animate attributeName="opacity" from="1" to="0" dur="1.4s" begin="${d * 0.45}s" repeatCount="indefinite"/></circle>`;
      } else if (fixed) {
        s += `<path class="pipe fixed" d="M${trunkX} ${yy} L${pillX} ${yy}"/>`;
      } else {
        s += `<path class="pipe" d="M${trunkX} ${yy} L${pillX} ${yy}"/><path class="pipe flow" d="M${trunkX} ${yy} L${pillX} ${yy}"/>`;
      }
      const tipTxt = `<b>${esc(APP.sysName(k))}</b><br>On HR feed: ${sy.feed ? "yes" : "no"}${sy.sso === null ? "" : " · Behind SSO: " + (sy.sso ? "yes" : "no")}<br>Median removal: ${fmtMed(st.medians[k])}${fixed ? "<br>Fix accepted by " + esc(S.fixes[k].by) : ""}`;
      s += `<g tabindex="0" data-tip="${esc(tipTxt)}"><rect x="${pillX}" y="${yy - 16}" width="${pillW}" height="32" rx="11" fill="#fff" stroke="${broken && !fixed ? "#8E7D97" : "#D6C8DD"}" stroke-dasharray="${broken && !fixed ? "5 4" : ""}" stroke-width="1.5"/><text x="${pillX + 14}" y="${yy + 5}" style="font-size:14.5px;font-weight:600;fill:#2A1633">${esc(APP.sysName(k))}</text></g>`;
      const n = st.bySys[k].open, root = { lark: "feed", fin: "sso", crm: "local", code: "local", cloud: "local" }[k] || "manual";
      const bw = n ? Math.max(8, (n / max) * barMax) : 0;
      if (n) s += `<rect class="bar-grow" x="${barX}" y="${yy - 11}" width="${bw}" height="22" rx="11" fill="${ROOT_COLOR[root]}" style="animation-delay:${i * 0.05}s" data-tip="${esc(plural(n, "orphaned person account"))} · ${esc(E.ROOT_LABEL[root])}"/>`;
      s += `<text x="${barX + bw + (n ? 10 : 0)}" y="${yy + 5}" style="font-size:14px;font-weight:${root === "feed" || root === "sso" ? 700 : 500};fill:${root === "feed" || root === "sso" ? "#7A5700" : "#5E4B68"}">${n ? n : "none"}</text>`;
    });
    // legend
    const lg = [["feed", "Not on HR feed"], ["sso", "Not behind SSO"], ["local", "Login outside SSO"], ["manual", "Missed manual step"]];
    let lx = 20; const ly = H - 18;
    lg.forEach(([k, l]) => { const n = st.roots[k] || 0; const txt = `${l} ${n}`; s += `<rect x="${lx}" y="${ly - 10}" width="12" height="12" rx="3" fill="${ROOT_COLOR[k]}"/><text x="${lx + 18}" y="${ly}" style="font-size:13.5px;fill:#5E4B68">${esc(txt)}</text>`; lx += 18 + txt.length * 7.3 + 22; });
    s += `</svg>`;
    host.innerHTML = s;
  }
  const fmtMed = (m) => (m === null ? "n/a" : m === 0 ? "same day" : plural(m, "day"));

  function medians(st) {
    const host = $("#medChart"); const W = host.clientWidth || 380, H = host.clientHeight || 260;
    const ks = ORDER.slice().sort((a, b) => (st.medians[b] || 0) - (st.medians[a] || 0));
    const L = 134, Rr = 80, top = 6, rh = (H - top - 8) / ks.length;
    const max = Math.max(1, ...ks.map((k) => st.medians[k] || 0));
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
    ks.forEach((k, i) => {
      const m = st.medians[k] || 0, yy = top + i * rh + rh / 2, bw = m ? Math.max(4, (m / max) * (W - L - Rr)) : 0;
      const hot = k === "lark" || k === "fin";
      s += `<text x="${L - 10}" y="${yy + 4.5}" text-anchor="end" style="font-size:13.5px;fill:#2A1633">${esc(APP.sysName(k))}</text>`;
      if (bw) s += `<rect x="${L}" y="${yy - Math.min(8, rh * 0.32)}" width="${bw}" height="${Math.min(16, rh * 0.64)}" rx="${Math.min(8, rh * 0.32)}" fill="${hot ? "#E0A100" : "#7B2CBF"}" class="bar-grow"/>`;
      else s += `<circle cx="${L + 4}" cy="${yy}" r="4" fill="#2A9D8F"/>`;
      s += `<text x="${L + bw + 10 + (bw ? 0 : 6)}" y="${yy + 4.5}" style="font-size:13.5px;font-weight:${hot ? 700 : 400};fill:${hot ? "#7A5700" : bw ? "#5E4B68" : "#1C6F65"}">${fmtMed(st.medians[k])}</text>`;
    });
    s += `</svg>`;
    host.innerHTML = s;
  }

  function fixes() {
    const p = APP.persona();
    $("#fixList").innerHTML = FIXES.map((fx) => {
      const ok = S.fixes[fx.key];
      const n = APP.R.stats.bySys[fx.sys].open;
      return `<div class="card fix"><div class="row"><span class="t">${esc(fx.title)}</span><span class="sim">simulated AI draft</span></div><div class="d">${esc(fx.body)}</div>
        <div class="row"><span class="chip gold" data-tip="Open orphaned person accounts in this system today. The fix stops new ones; these still need review.">${plural(n, "orphan")} today</span><span class="spacer"></span>${ok ? `<span class="chip teal">Accepted by ${esc(ok.by)}</span>` : p.role === "ciso" ? `<button class="btn sm primary" data-fix="${fx.key}">Accept fix</button>` : `<button class="btn sm" data-switch="alex" data-tip="Funding an upstream fix is the Deputy CISO's call.">Switch to Alex</button>`}</div></div>`;
    }).join("");
    $$("#fixList [data-fix]").forEach((b) => (b.onclick = () => { APP.acceptFix(b.dataset.fix); APP.toast("Fix accepted. Runs shows the projected effect."); }));
    $$("#fixList [data-switch]").forEach((b) => (b.onclick = () => APP.setPersona(b.dataset.switch)));
  }
  window.addEventListener("resize", () => { if (S.view === "leaks") view.render(); });
})();
