// OC-05 · View 4: Review. A card deck with one-key actions and one- or two-person approval.
(function () {
  "use strict";
  const { $, $$, esc, plural, fmtDate, S, E, DATA } = APP;
  const view = (APP.views.review = { lastCard: null });
  const ICON = {
    person: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 20V10a6 6 0 0 1 12 0v10l-2-1.5L14 20l-2-1.5L10 20l-2-1.5z"/></svg>`,
    service: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>`,
    unowned: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><circle cx="12" cy="17.5" r=".8" fill="currentColor"/></svg>`,
  };
  const FILTERS = [
    { k: "open", label: "Open", fn: (f) => APP.isOpen(f) },
    { k: "two", label: "Two-person", fn: (f) => APP.isOpen(f) && f.twoPerson },
    { k: "batch", label: "Batch", fn: (f) => APP.isOpen(f) && f.batch },
    { k: "unowned", label: "Unowned", fn: (f) => APP.isOpen(f) && f.cat === "unowned" },
    { k: "done", label: "Done", fn: (f) => !APP.isOpen(f) },
    { k: "excluded", label: "Excluded", fn: null },
  ];
  const statusLabel = { open: "", pending: "1 of 2 approved", done: "Awaiting verification", verified: "Verified", failed: "Not removed", kept: "Kept" };

  function list() {
    const flt = FILTERS.find((x) => x.k === S.revFilter);
    if (!flt.fn) return APP.R.excluded.map((x) => Object.assign({ excludedRow: true }, x));
    const out = APP.R.findings.filter((f) => flt.fn(f) || f.id === view.justDone);
    return out.sort((a, b) => (APP.status(b) === "failed") - (APP.status(a) === "failed") || b.score.total - a.score.total);
  }

  view.render = function () {
    const open = APP.openFindings();
    const R = APP.R;
    $("#revSub").textContent = R.findings.length
      ? (() => { const b = open.filter((f) => f.batch).length, t = open.filter((f) => f.twoPerson).length; return `${plural(open.length, "open item")}. ${plural(b, "low-risk account")} can go in one batch; ${plural(t, "account")} need${t === 1 ? "s" : ""} two people.`; })()
      : "No orphaned accounts found. Nothing to review.";
    $("#revFilters").innerHTML = FILTERS.map((x) => { const n = x.fn ? R.findings.filter(x.fn).length : R.excluded.length; return `<button data-k="${x.k}" class="${S.revFilter === x.k ? "on" : ""}">${x.label} ${n}</button>`; }).join("");
    $$("#revFilters button").forEach((b) => (b.onclick = () => { view.justDone = null; S.revFilter = b.dataset.k; view.render(); }));
    const items = list();
    if (!items.some((x) => x.id === S.sel) && items.length) S.sel = items[0].id;
    $("#revList").innerHTML = items.length ? items.map((f) => {
      if (f.excludedRow) return `<li><button class="row-btn ${f.id === S.sel ? "on" : ""}" data-id="${f.id}"><span class="status-dot verified"></span><span class="grow"><span class="nm mono">${esc(f.acct.user)}</span><span class="meta">${esc(APP.sysName(f.sys))} · ${esc(f.reason)}</span></span></button></li>`;
      const st = APP.status(f);
      return `<li><button class="row-btn ${f.id === S.sel ? "on" : ""}" data-id="${f.id}"><span class="status-dot ${st}"></span><span class="grow"><span class="nm">${f.cat === "person" ? esc(f.rec.name) : `<span class="mono">${esc(f.acct.user)}</span>`}</span><span class="meta">${esc(APP.sysName(f.sys))}${statusLabel[st] ? " · " + statusLabel[st] : f.twoPerson ? " · two-person" : ""}</span></span><span class="pill-score ${APP.isHead(f) ? "head" : ""}">${f.score.total}</span></button></li>`;
    }).join("") : `<li class="faint" style="padding:10px">Nothing here.</li>`;
    $$("#revList .row-btn").forEach((b) => (b.onclick = () => { view.justDone = null; S.sel = b.dataset.id; view.render(); }));
    const cur = $("#revList .row-btn.on"); if (cur) cur.scrollIntoView({ block: "nearest" });
    batchBar();
    card(items);
  };

  function batchBar() {
    const n = APP.openFindings().filter((f) => f.batch).length;
    const done = APP.R.findings.filter((f) => APP.status(f) === "done").length;
    $("#batchBar").innerHTML = `<div class="txt">${n ? `<b>${plural(n, "low-risk account")}</b> ${n === 1 ? "is" : "are"} ready for one approval <button class="why" data-tip="Person accounts with standard or elevated access, matched by employee ID or email, with no activity after termination, no legal hold, and not an executive. Everything else gets its own card.">Why?</button>` : "No low-risk batch waiting."}${done ? ` <span class="faint">· ${plural(done, "action")} awaiting verification</span>` : ""}</div>
      <button class="btn" id="btnBatch" ${n ? "" : "disabled"}>Review batch</button>
      <button class="btn primary" id="btnRun2" data-tip="Run the finder now (simulated). It confirms approved actions took effect.">Run now</button>`;
    $("#btnBatch").onclick = batchModal;
    $("#btnRun2").onclick = () => APP.runNow();
  }

  function batchModal() {
    const fs = APP.openFindings().filter((f) => f.batch);
    const p = APP.persona();
    APP.modal(`<div class="card-h" style="padding:16px 18px 6px;font-size:19px">Approve ${plural(fs.length, "low-risk account")} <span class="sub">disable now, delete after a 30-day hold</span></div>
      <div class="body"><div class="batch-row faint" style="font-size:13px"><span></span><span>Account</span><span>System</span><span>Days open</span><span>Score</span></div>
      ${fs.map((f) => `<label class="batch-row"><input type="checkbox" checked data-id="${f.id}"><span><b>${esc(f.rec.name)}</b> <span class="mono faint">${esc(f.acct.user)}</span></span><span>${esc(APP.sysName(f.sys))}</span><span>${f.daysOpen}</span><span class="mono">${f.score.total}</span></label>`).join("")}</div>
      <div class="foot"><span class="txt" id="batchTxt"></span><button class="btn" id="bCancel">Cancel</button><button class="btn primary" id="bGo"></button></div>`, (m) => {
      const upd = () => { const n = $$("input[type=checkbox]:checked", m).length; $("#bGo", m).textContent = "Approve " + plural(n, "account"); $("#bGo", m).disabled = !n || p.role !== "analyst"; $("#batchTxt", m).innerHTML = p.role === "analyst" ? `Approving as ${esc(p.name)}, ${esc(p.title)}` : `Batch approval needs an IAM analyst. <button class="btn sm" id="bSwitch">Switch to Lena Ortiz</button>`; const sw = $("#bSwitch", m); if (sw) sw.onclick = () => { APP.setPersona("lena"); APP.closeModal(); batchModal(); }; };
      $$("input", m).forEach((i) => (i.onchange = upd)); upd();
      $("#bCancel", m).onclick = APP.closeModal;
      $("#bGo", m).onclick = () => { const ids = $$("input:checked", m).map((i) => i.dataset.id); const n = APP.batchApprove(ids); APP.closeModal(); if (n) APP.toast(`${plural(n, "account")} disabled. Verification on the next run.`); APP.render(); };
    });
  }

  function donut(score, head) {
    const r = 31, c = 2 * Math.PI * r;
    return `<div class="donut-wrap"><div class="donut"><svg viewBox="0 0 74 74"><circle cx="37" cy="37" r="${r}" fill="none" stroke="#F0E9F3" stroke-width="7"/><circle cx="37" cy="37" r="${r}" fill="none" stroke="${head ? "#E0A100" : "#7B2CBF"}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(score / 100) * c} ${c}"/></svg><div class="v">${score}</div></div><button class="why" id="scoreWhy">Why?</button></div>`;
  }

  function card(items) {
    const deck = $("#deck");
    const item = items.find((x) => x.id === S.sel);
    const behind = `<div class="ghost-card g2"></div><div class="ghost-card"></div>`;
    if (!item) { deck.innerHTML = `<div class="card rcard"><div class="empty"><div><div class="big">${APP.R.findings.length ? "Nothing in this list" : "No orphaned accounts found"}</div>${APP.R.findings.length ? "Pick another filter." : "Every leaver's accounts were removed on time."}</div></div></div>`; return; }
    const enter = view.lastCard !== item.id; view.lastCard = item.id;
    if (item.excludedRow) {
      deck.innerHTML = behind + `<div class="card rcard ${enter ? "enter" : ""}"><div class="rc-top"><div class="avatar">${ICON.person}</div><div class="rc-who"><div class="nm">${esc(item.rec ? item.rec.name : item.acct.display)}</div><div class="ttl">${esc(item.rec ? item.rec.title + " · " + item.rec.status : "Shared mailbox")}</div><div class="chips"><span class="chip teal">Not flagged: ${esc(item.reason)}</span></div></div></div>
        <div class="rc-acct"><span class="chip">${esc(APP.sysName(item.sys))}</span><span class="mono">${esc(item.acct.user)}</span><span class="faint">matched by ${esc(item.method)}</span></div>
        <div class="rc-reason">${esc(item.why)}</div>
        <div class="notice teal">The finder checked this account and left it alone. It stays listed so anyone can see why.</div>${nav(items)}</div>`;
      wireNav(items); return;
    }
    const f = item, d = APP.ensureDec(f);
    const st = APP.status(f), head = APP.isHead(f), run = DATA.meta.run;
    const matchTip = f.cat === "unowned" ? "No HR match and no owner" : "Matched by " + f.method.toLowerCase() + (f.conf < 100 ? " (" + f.conf + "%)" : "");
    const chips = [`<span class="chip plum" data-tip="${esc(matchTip)}">${esc(APP.sysName(f.sys))}</span>`];
    if (f.cat === "person") chips.push(`<span class="chip mono">${esc(f.acct.user)}</span>`);
    chips.push(`<span class="chip">${APP.catLabel(f)}</span>`);
    if (f.rec && f.cat === "person") chips.push(`<span class="chip">${esc(f.rec.type)}, ${fmtDate(f.rec.term)}</span>`);
    if (f.investigate) chips.push(`<span class="chip coral">Investigate</span>`);
    if (f.legalHold) chips.push(`<span class="chip blue">Legal hold</span>`);
    if (f.exec) chips.push(`<span class="chip plum">Executive</span>`);
    if (f.twoPerson) chips.push(`<span class="chip plum" data-tip="Service accounts, admin or financial-write access, executives and activity after termination need a second approver.">Two-person</span>`);
    if (statusLabel[st]) chips.push(`<span class="chip ${st === "failed" ? "coral" : st === "kept" ? "" : "teal"}">${statusLabel[st]}</span>`);
    const credAge = f.acct.pwdSet ? E.days(f.acct.pwdSet, run) : null;
    let h = behind + `<div class="card rcard ${enter ? "enter" : ""}">
      <div class="rc-top"><div class="avatar ${head ? "head" : ""}">${ICON[f.cat]}</div><div class="rc-who"><div class="nm">${f.cat === "person" ? esc(f.rec.name) : `<span class="mono" style="font-size:.9em">${esc(f.acct.user)}</span>`}</div><div class="ttl">${esc(APP.whoSub(f))}</div><div class="chips">${chips.join("")}</div></div>${donut(f.score.total, head)}</div>
      <div class="rc-reason ${head ? "head" : ""}">${esc(f.top)}</div>
      <div class="rc-facts">
        <div><div class="k">Days open</div><div class="v">${f.daysOpen}</div></div>
        <div><div class="k">Last sign-in</div><div class="v">${f.acct.lastLogon ? fmtDate(f.acct.lastLogon) : "never"}</div></div>
        <div><div class="k">Password age</div><div class="v">${credAge === null ? "n/a" : plural(credAge, "day")}</div></div>
        <div><div class="k">Access</div><div class="v" data-tip="${esc(E.PRIV[f.acct.priv || 0].label + ": " + (f.acct.groups.join(", ") || "no groups"))}">${["Standard", "Elevated", "Admin", "Top admin"][f.acct.priv || 0]}</div></div>
      </div>`;
    if (st === "failed") h += `<div class="notice coral"><b>Not removed.</b> ${esc(d.note)} Approve again to retry.</div>`;
    if (f.investigate && APP.isOpen(f)) h += `<div class="notice coral"><b>Activity after termination:</b> ${esc(f.activityWhy)}. Approving also opens a security operations case (simulated).</div>`;
    if (f.legalHold && APP.isOpen(f)) h += `<div class="notice plum"><b>Legal hold.</b> Disable is allowed; deletion is blocked until Legal releases the hold.</div>`;
    if (f.cat === "service" && f.inUse && APP.isOpen(f)) h += `<div class="notice plum"><b>Still in use:</b> signed in ${fmtDate(f.acct.lastLogon)}. ${esc(f.acct.desc)}. Disabling or deleting it would stop that job, so give it a new owner and rotate the password.</div>`;

    if (["done", "verified", "kept"].includes(st)) {
      h += `<ul class="steps">${d.steps.map((x, i) => `<li style="animation-delay:${enter ? 0 : i * 0.18}s"><span class="tick"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12l5 5 9-10"/></svg></span>${esc(x)}${i === 0 && st !== "kept" ? ' <span class="sim">simulated</span>' : ""}</li>`).join("")}</ul>`;
      h += `<div class="faint" style="font-size:14px">Approved by ${d.approvals.map((a) => esc(a.name) + " (" + esc(a.title) + ") at " + a.at).join(" and ")}.${st === "done" ? " The next run confirms the change." : st === "verified" ? " Confirmed by the next run." : ""}</div>`;
    } else {
      const acts = APP.actionsFor(f);
      if (d.action === "confirm" || (f.nameOnly && !d.confirmed)) {
        const twins = APP.DATA.hr.filter((r) => r.name === f.rec.name);
        h += `<div class="panel"><div><b>Matched on name only.</b> <span class="sim">simulated AI</span> ${esc(f.matchWhy || "")}. Pick the right person before anything happens.</div>${twins.map((r) => `<div class="sugg ${r.id === f.rec.id ? "on" : ""}"><span class="nm">${esc(r.name)}</span><span class="why-t">${esc(APP.dept(r.dept))} · ${esc(r.status)}${r.term ? ", left " + fmtDate(r.term) : ""} · ${esc(r.id)}</span>${r.id === f.rec.id ? `<span class="conf">${f.conf}%</span>` : ""}</div>`).join("")}<div><button class="btn primary sm" id="btnConfirm">Confirm it's ${esc(f.rec.name)}, ${esc(APP.dept(f.rec.dept))}</button></div></div>`;
      } else {
        h += `<div class="rc-actions"><div class="seg" role="group" aria-label="Action">${acts.map((o) => `<button data-act="${o.k}" class="${d.action === o.k ? "on" : ""}" ${o.off ? "disabled" : ""} ${o.off ? `data-tip="${esc(o.off)}"` : ""}>${o.label}<kbd>${o.key}</kbd></button>`).join("")}</div>${f.deleteBlocked ? `<span class="chip" data-tip="${esc(f.deleteBlocked)}">Delete blocked</span>` : ""}<span class="spacer"></span>${navInline(items)}</div>`;
        if (d.action === "reassign" || d.action === "owner") {
          const sg = APP.suggestions(f); const chosen = d.owner || sg[0].name;
          h += `<div class="panel"><div><b>${d.action === "reassign" ? "New owner" : "Who should own it?"}</b> <span class="sim">simulated AI</span></div><div class="sugg-grid">${sg.map((x, i) => `<label class="sugg ${x.name === chosen ? "on" : ""}"><input type="radio" name="own" value="${esc(x.name)}" ${x.name === chosen ? "checked" : ""}><span><span class="nm">${esc(x.name)}</span> <span class="faint">${esc(x.title)}</span><div class="why-t">${esc(x.why)}</div></span><span class="conf">${x.conf}%</span></label>`).join("")}</div></div>`;
        } else if (d.action === "keep") {
          h += `<div class="panel"><label for="keepReason"><b>Why keep it?</b> <span class="faint">The flag returns in 30 days.</span></label><input type="text" id="keepReason" placeholder="For example: kiosk account, owned by facilities" value="${esc(d.reason || "")}"></div>`;
        } else if (d.action === "disable") {
          const prev = APP.stepsFor(f, { action: "disable" });
          h += `<div class="panel"><div><b>What happens</b></div><div class="muted" style="font-size:14.5px">${prev.map(esc).join(" · ")}</div></div>`;
        }
        h += slots(f, d);
      }
    }
    h += (h.includes('id="navPrev"') ? "" : nav(items)) + `</div>`;
    deck.innerHTML = h;
    wire(f, d); wireNav(items);
  }

  function slots(f, d) {
    const ss = APP.slots(f); const p = APP.persona();
    const err = APP.canApprove(f);
    let h = `<div class="approvals">`;
    ss.forEach((sl, i) => {
      const a = d.approvals[i];
      if (a) h += `<div class="slot ok"><span class="k">${esc(sl.label)}</span><span class="v">${esc(a.name)}</span><span class="k">${esc(a.title)} · ${a.at}</span></div>`;
      else {
        const isNext = i === d.approvals.length;
        const ok = isNext && !err;
        const want = sl.role === "analyst" ? "lena" : APP.secondOwner(f);
        const wantP = APP.PERSONAS.find((x) => x.id === want);
        const needSwitch = isNext && err && (err.startsWith("Needs") );
        h += `<div class="slot"><span class="k">${esc(sl.label)}</span><span class="v">${isNext ? (ok ? esc(p.name) + " can approve" : esc(err)) : "Waiting"}</span>${needSwitch ? `<button class="btn sm" data-switch="${want}">Switch to ${esc(wantP.name)}</button>` : ""}</div>`;
      }
    });
    h += `<div style="display:flex;align-items:flex-end"><button class="btn primary" id="btnApprove" ${err ? "disabled" : ""}>Approve<kbd style="font-family:var(--mono);font-size:11px;opacity:.8;margin-left:4px">Enter</kbd></button></div></div>`;
    return h;
  }
  function nav(items) {
    const i = items.findIndex((x) => x.id === S.sel);
    return `<div style="display:flex;gap:8px;margin-top:auto;padding-top:4px;align-items:center"><span class="faint" style="font-size:13px">${i + 1} of ${items.length}</span><span class="spacer"></span><button class="btn sm" id="navPrev" ${i <= 0 ? "disabled" : ""}>Previous</button><button class="btn sm" id="navNext" ${i >= items.length - 1 ? "disabled" : ""}>Next</button></div>`;
  }
  function navInline(items) {
    const i = items.findIndex((x) => x.id === S.sel);
    return `<span class="faint" style="font-size:13px">${i + 1} of ${items.length}</span><button class="btn sm" id="navPrev" ${i <= 0 ? "disabled" : ""} aria-label="Previous">Previous</button><button class="btn sm" id="navNext" ${i >= items.length - 1 ? "disabled" : ""} aria-label="Next">Next</button>`;
  }
  function wireNav(items) {
    const i = items.findIndex((x) => x.id === S.sel);
    const p = $("#navPrev"), n = $("#navNext");
    if (p) p.onclick = () => view.step(-1);
    if (n) n.onclick = () => view.step(1);
  }
  view.step = (dir) => { const items = list(); const i = items.findIndex((x) => x.id === S.sel); const j = i + dir; view.justDone = null; if (j >= 0 && j < items.length) { S.sel = items[j].id; } else if (i < 0 && items.length) S.sel = items[0].id; view.render(); };

  function wire(f, d) {
    $$("#deck [data-act]").forEach((b) => (b.onclick = () => { if (APP.setAction(f, b.dataset.act)) view.render(); }));
    $$("#deck input[name=own]").forEach((r) => (r.onchange = () => { APP.ensureDec(f).owner = r.value; APP.ensureDec(f).approvals = []; view.render(); }));
    const kr = $("#keepReason"); if (kr) kr.oninput = () => { APP.ensureDec(f).reason = kr.value; const b = $("#btnApprove"); const err = APP.canApprove(f); if (b) b.disabled = !!err; };
    const c = $("#btnConfirm"); if (c) c.onclick = () => { APP.confirmMatch(f); view.render(); };
    const sw = $("#scoreWhy"); if (sw) sw.setAttribute("data-tip", f.score.factors.map((x) => `${esc(x.label)}: <b>${x.pts}</b> of ${x.max} · ${esc(x.why)}`).join("<br>"));
    $$("#deck [data-switch]").forEach((b) => (b.onclick = () => { APP.setPersona(b.dataset.switch); }));
    const ap = $("#btnApprove"); if (ap) ap.onclick = () => view.approve();
  }
  view.approve = () => {
    const f = APP.f(S.sel); if (!f) return;
    if (APP.approve(f)) {
      const st = APP.status(f);
      if (st === "done" || st === "kept") view.justDone = f.id;
      if (st === "done" || st === "kept") APP.toast(st === "kept" ? "Kept, with your reason" : (f.cat === "service" && APP.dec(f).action === "reassign" ? "Owner set and password rotated" : "Done. The next run confirms it."));
      view.lastCard = null; view.render(); APP.renderLog(); $("#reviewCount").textContent = APP.openFindings().length;
    }
  };
  view.key = (k) => {
    const f = APP.f(S.sel); if (!f) return;
    const map = { d: "disable", r: "reassign", k: "keep", o: "owner" };
    if (k === "c" && f.nameOnly && !(APP.dec(f) || {}).confirmed) { APP.confirmMatch(f); view.render(); return; }
    if (map[k] && APP.setAction(f, map[k])) view.render();
  };
})();
