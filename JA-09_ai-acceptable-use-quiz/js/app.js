/* JA-09 AI Use Check · app. All data is fictional; AI behavior is simulated. */
(function () {
  "use strict";
  const D = window.JA09;
  const E = window.JA09Engine.build(D.policy, D.quiz, D.program);
  const POL = D.policy, QZ = D.quiz, PRG = D.program;
  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";

  // ------------------------------------------------------------------ helpers
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const pct = (x, d = 0) => (x * 100).toFixed(d) + "%";
  const pl = (n, one, many) => fmt(n) + " " + (n === 1 ? one : many);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clock = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const VERDICT = {
    approved: { label: "Approved", cls: "v-ok", short: "Approved" },
    conditions: { label: "With conditions", cls: "v-cond", short: "With conditions" },
    not_approved: { label: "Not approved", cls: "v-no", short: "Not approved" },
  };
  const ICON = {
    approved: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    conditions: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M12 6v8"/><path d="M12 18.5v.01"/></svg>',
    not_approved: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  };
  const vIcon = (v, size) => `<span class="vicon ${VERDICT[v].cls}" ${size ? `style="width:${size}px;height:${size}px"` : ""}>${ICON[v]}</span>`;
  const CLAUSE = {};
  POL.policy.sections.forEach((s) => s.items.forEach(([id, t]) => { CLAUSE[id] = { text: t, section: s.id }; }));
  const CLS_COLOR = { Public: "var(--c-public)", Internal: "var(--c-internal)", Confidential: "var(--c-confidential)", Restricted: "var(--c-restricted)" };
  const STATUS_LABEL = POL.status_label;
  const TOOL_ICON = {
    T1: ["#4F46E5", '<path d="M12 4l1.6 3.6L17 9.2l-3.4 1.6L12 14.4l-1.6-3.6L7 9.2l3.4-1.6z"/><path d="M18 15l.8 1.7 1.7.8-1.7.8L18 20l-.8-1.7-1.7-.8 1.7-.8z"/>'],
    T2: ["#0EA5A4", '<path d="M5 13v-2a7 7 0 0 1 14 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/>'],
    T3: ["#64748B", '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>'],
    T4: ["#E5487D", '<path d="M14 4l6 6-9 9H5v-6z"/>'],
    T5: ["#F5A524", '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/>'],
    T6: ["#DC2626", '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3M4 4l16 16"/>'],
    T7: ["#DC2626", '<path d="M10 4h4v3a2 2 0 1 0 0 4v3h-3a2 2 0 1 1-4 0H4v-4"/><path d="M4 4l16 16"/>'],
  };
  const toolIcon = (id, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${TOOL_ICON[id][1]}</svg>`;
  const BADGE_ICON = {
    guardian: ["#E5487D", '<path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/>'],
    streak: ["#F5A524", '<path d="M12 2c1 3.5 5 5.6 5 10.5A5 5 0 0 1 7 12.5c0-2 1-3.4 2-4.5.3 1.6 1.2 2.6 2.2 3C10.6 8 11 5 12 2z"/>'],
    reader: ["#4F46E5", '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>'],
    ally: ["#0EA5A4", '<path d="M4 5h16v10H9l-5 4z"/>'],
    certified: ["#15803D", '<circle cx="12" cy="9" r="5"/><path d="M9 13l-2 8 5-3 5 3-2-8"/>'],
  };
  const badgeIcon = (id, on) => `<span class="bdg ${on ? "on" : ""}" style="${on ? `background:${BADGE_ICON[id][0]}` : ""}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${BADGE_ICON[id][1]}</svg></span>`;
  const Q_SHORT = {
    Q1: "Press release in a public chatbot", Q2: "Unreleased results in the assistant", Q3: "Code review, no secrets",
    Q4: "Customer emails in the assistant", Q5: "Support Copilot reply", Q6: "NoteHawk on a supplier call",
    Q7: "Ranking job applicants", Q8: "Summarize a process doc", Q9: "API key in the code assistant",
    Q10: "Assistant meeting notes", Q11: "TabGenie on a contract", Q12: "Auto-send customer replies",
  };
  const DEPT = Object.fromEntries(PRG.departments.map((d) => [d.id, d.name]));
  const PERSONAS = [
    { id: "emp", label: "Employee (Sales)" }, { id: "aware", label: "Awareness lead" },
    { id: "sec", label: "Security lead" }, { id: "gov", label: "AI Governance Committee" },
  ];
  const personaLabel = (id) => PERSONAS.find((p) => p.id === id).label;
  const MATRIX_PURPOSE = { T2: "reply", T3: "code", T4: "draft" };
  const AGG = E.program();
  const T = AGG.totals;

  // ------------------------------------------------------------------ state
  const fresh = () => ({
    view: "policy", persona: "emp",
    points: 0, quizPoints: 0, streak: 0, bestStreak: 0, badges: [], attested: null,
    version: POL.policy.version, history: POL.policy.history.slice(), clarification: null,
    openSection: "3", sectionsRead: [],
    check: { tool: null, data: [], purpose: null, reviewed: true, consent: true }, checkKeys: [], checkPoints: 0,
    exceptions: [], excForm: false,
    quiz: { i: 0, answers: [], hint: false, done: false, counted: false },
    speak: { flipped: [], asked: [], reports: [] },
    dash: { tab: "dept", dept: "SAL" },
    faq: { state: "none", proposer: null, text: "" },
    triage: {},
    log: [],
  });
  let S = fresh();

  function log(what, kind) { S.log.unshift({ t: clock(), who: personaLabel(S.persona), what, kind: kind || "" }); renderLog(); }
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); }

  // ------------------------------------------------------------------ points and badges
  function award(pts, why) {
    if (S.persona !== "emp") { toast("Points go to employees. Switch to Employee to earn them."); return false; }
    S.points += pts;
    log(`+${pl(pts, "point", "points")}: ${why}`, "points");
    renderPlayer(true);
    return true;
  }
  const BADGES = QZ.badges;
  function earn(id) {
    if (S.badges.includes(id)) return;
    S.badges.push(id);
    const b = BADGES.find((x) => x.id === id);
    log(`Badge earned: ${b.name}`, "points");
    toast(`Badge earned: ${b.name}`);
    renderPlayer(false, id);
  }
  function evalBadges() {
    if (S.sectionsRead.length >= 5) earn("reader");
    if (S.speak.flipped.length >= 3) earn("ally");
    if (S.bestStreak >= 5) earn("streak");
    const a = S.quiz.answers;
    const ok = (id) => { const i = QZ.questions.findIndex((q) => q.id === id); return a[i] && a[i].correct; };
    if (ok("Q2") && ok("Q4") && ok("Q9")) earn("guardian");
    if (S.quiz.done && a.filter((x) => x.correct).length >= QZ.scoring.pass_correct) earn("certified");
  }

  // ------------------------------------------------------------------ player strip
  function renderPlayer(bump, newBadge) {
    const p = POL.policy;
    $("polVersion").textContent = `Policy v${S.version}`;
    $("polSub").textContent = S.version === p.version ? `AI acceptable use · effective ${fmtDate(p.effective)}` : `AI acceptable use · updated today`;
    $("pvPoints").textContent = fmt(S.points);
    const lvl = E.levelFor(S.points), nx = E.nextLevel(S.points);
    $("psLevel").textContent = nx ? `${lvl} · ${fmt(nx.at - S.points)} to ${nx.name}` : `${lvl} · top level`;
    const levels = QZ.scoring.levels, cur = levels.filter(([, t]) => S.points >= t).pop();
    const fill = nx ? (S.points - cur[1]) / (nx.at - cur[1]) : 1;
    $("lvlFill").style.width = Math.max(0, Math.min(1, fill)) * 100 + "%";
    $("plPoints").dataset.tip = `Points: ${QZ.scoring.correct} per correct answer, a streak bonus up to ${QZ.scoring.streak_cap}, and 10 per self-check (up to 5 a day). A hint costs ${QZ.scoring.hint_cost}. Levels: ${levels.map(([n, t]) => `${n} ${fmt(t)}`).join(", ")}.`;
    if (bump) { $("plPoints").classList.remove("bump"); void $("plPoints").offsetWidth; $("plPoints").classList.add("bump"); }
    $("pvStreak").textContent = fmt(S.streak);
    $("psStreak").textContent = `Best ${fmt(S.bestStreak)}`;
    $("plStreak").classList.toggle("hot", S.streak >= 3);
    $("plBadges").innerHTML = BADGES.map((b) => `<span data-tip="${esc(b.name + ": " + b.rule + (S.badges.includes(b.id) ? " Earned." : ""))}" tabindex="0">${badgeIcon(b.id, S.badges.includes(b.id))}</span>`).join("") +
      `<span class="bdg-label">${S.badges.length} of ${pl(BADGES.length, "badge", "badges")}</span>`;
    if (newBadge) { const i = BADGES.findIndex((b) => b.id === newBadge); const el = $("plBadges").children[i]; if (el) el.firstElementChild.classList.add("new"); }
    const att = S.attested;
    $("plAttest").className = "pl-item attest" + (att ? " done" : "");
    $("plAttest").innerHTML = `<span class="ic">${att ? ICON.approved : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/></svg>'}</span>
      <span class="tx"><b>${att ? "Attested v" + att : "Not attested"}</b><span>${att ? "Thanks for signing" : "Pass the quiz to attest"}</span></span>`;
    $("plAttest").dataset.tip = att ? `You attested to policy v${att} today.` : `Attestation: pass the quiz (${QZ.scoring.pass_correct} of 12) and confirm you've read the policy. Only you can attest for yourself.`;
  }
  function fmtDate(iso) { const [y, m, d] = iso.split("-").map(Number); return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] + " " + d + ", " + y; }

  // ------------------------------------------------------------------ views
  function setView(v) {
    S.view = v;
    document.querySelectorAll(".tab").forEach((b) => { const on = b.dataset.view === v; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
    document.querySelectorAll(".view").forEach((s) => s.classList.toggle("active", s.id === "view-" + v));
    renderView();
  }
  function renderView() { ({ policy: renderPolicy, check: renderCheck, quiz: renderQuiz, speak: renderSpeak, dash: renderDash })[S.view](); }

  // ================================================================== POLICY
  const PRINCIPLE_ICON = [
    ["#4F46E5", '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>', "AI helps, people decide"],
    ["#E5487D", '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>', "Protect data"],
    ["#F5A524", '<path d="M5 12.5l4.5 4.5L19 7.5"/>', "Own the output"],
    ["#0EA5A4", '<circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>', "Be open"],
    ["#64748B", '<path d="M4 5h16v10H9l-5 4z"/>', "Speak up"],
  ];
  function renderPolicy() {
    const p = POL.policy;
    const changed = S.version !== p.version;
    $("docCard").innerHTML = `
      <div class="doc-head"><h2>${esc(p.title)}</h2><span class="vstamp ${changed ? "new" : ""}">v${S.version}</span>
        <div class="meta">${changed ? "Updated today" : "Effective " + fmtDate(p.effective)} · ${esc(p.owner)}</div></div>
      ${changed ? `<div class="whatsnew">What's new in v${S.version}: ${esc(S.history[S.history.length - 1].change)}</div>` : ""}
      <div class="principles">${PRINCIPLE_ICON.map(([c, path, t], i) => `<div class="prin" data-tip="${esc("Principle 2." + (i + 1) + ": " + CLAUSE["2." + (i + 1)].text)}" tabindex="0"><div class="pi" style="background:${c}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${path}</svg></div><div class="pt">${t}</div></div>`).join("")}</div>
      <div class="sections" id="sections">${p.sections.map((s) => `
        <div class="sec ${S.openSection === s.id ? "open" : ""} ${S.sectionsRead.includes(s.id) ? "read" : ""}" data-sec="${s.id}">
          <button aria-expanded="${S.openSection === s.id}"><span class="n">${s.id}</span><span class="tt">${esc(s.title)}</span><svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg></button>
          <div class="items">${s.items.map(([id, t]) => `<div class="it" data-clause="${id}"><span class="id">${id}</span><span>${esc(t)}${id === "6.3" && S.clarification ? `<div class="clar"><b>Clarified in v${S.version}:</b> ${esc(S.clarification)}</div>` : ""}</span></div>`).join("")}</div>
        </div>`).join("")}</div>`;
    renderMatrix();
  }
  function matrixCell(tool, dt) {
    const r = E.check(tool, [dt], MATRIX_PURPOSE[tool] || "summarize");
    return r;
  }
  function renderMatrix() {
    const tools = E.TOOLS;
    let h = `<table class="mx"><colgroup><col style="width:22%">${tools.map(() => "<col>").join("")}</colgroup><thead><tr><th></th>`;
    h += tools.map((t) => `<th class="tool" data-tip="${esc(t.name + ": " + t.note)}" tabindex="0">${esc(t.name)}<span class="st st-${t.status}">${STATUS_LABEL[t.status]}</span></th>`).join("") + "</tr></thead><tbody>";
    for (const d of POL.data_types) {
      h += `<tr data-row="${d.id}"><td class="rowh" style="--cls:${CLS_COLOR[d.cls]}" data-tip="${esc(d.label + " (" + d.cls + "): " + d.examples + (d.never ? ". Never allowed in any AI tool (3.4)." : "."))}" tabindex="0">${esc(d.label)}<small>${d.cls}</small></td>`;
      for (const t of tools) {
        const r = matrixCell(t.id, d.id);
        const v = VERDICT[r.verdict];
        const tip = `${t.name} + ${d.label}: ${v.label}. ${E.saferTool ? "" : ""}${r.verdict === "not_approved" ? (POL.rule_label[r.rule] + " (" + r.clauses.join(", ") + ")." + (r.safer ? " " + r.safer : "")) : (r.conditions.join("; ") + " (" + r.clauses.join(", ") + ").")} Click to try it in Self-check.`;
        h += `<td class="cell ${v.cls}" tabindex="0" data-mx="${t.id}|${d.id}" data-tip="${esc(tip)}" aria-label="${esc(t.name + ", " + d.label + ": " + v.label)}">${vIcon(r.verdict, 22)}</td>`;
      }
      h += "</tr>";
    }
    $("matrix").innerHTML = h + "</tbody></table>";
    $("matrixLegend").innerHTML = Object.keys(VERDICT).map((k) => `<span>${vIcon(k, 18)} ${VERDICT[k].label}</span>`).join("") +
      `<span class="spacer"></span>` + E.CLASSES.map((c) => `<span><i class="swatch" style="background:${CLS_COLOR[c]}"></i>${c}</span>`).join("");
  }
  function openClause(id) {
    const sec = CLAUSE[id] ? CLAUSE[id].section : id;
    S.openSection = sec; markRead(sec);
    setView("policy");
    requestAnimationFrame(() => {
      const el = document.querySelector(`.it[data-clause="${id}"]`);
      if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.classList.add("flash"); }
    });
  }
  function markRead(sec) {
    if (!S.sectionsRead.includes(sec)) { S.sectionsRead.push(sec); log(`Read policy section ${sec}`); evalBadges(); }
  }
  function policyMarkdown() {
    const p = POL.policy;
    let md = `# ${p.title}\n\nVersion ${S.version} · ${S.version === p.version ? "Effective " + fmtDate(p.effective) : "Updated " + fmtDate(POL.as_of)} · Owner: ${p.owner} · Review: ${p.review}\n\n`;
    for (const s of p.sections) {
      md += `## ${s.id}. ${s.title}\n\n`;
      for (const [id, t] of s.items) { md += `- **${id}** ${t}\n`; if (id === "6.3" && S.clarification) md += `  - *Clarified in v${S.version}:* ${S.clarification}\n`; }
      md += "\n";
    }
    md += "## What can go where\n\n| Data | Class | " + E.TOOLS.map((t) => t.name).join(" | ") + " |\n|---|---|" + E.TOOLS.map(() => "---|").join("") + "\n";
    for (const d of POL.data_types) md += `| ${d.label} | ${d.cls} | ` + E.TOOLS.map((t) => VERDICT[matrixCell(t.id, d.id).verdict].label).join(" | ") + " |\n";
    md += "\n## Version history\n\n" + S.history.map((h) => `- v${h.version}, ${fmtDate(h.date)}: ${h.change}`).join("\n");
    md += "\n\n---\nFor demo purposes only. All data is fictional and does not represent any organization. · Built by Aby Rao\n";
    return md;
  }

  // ================================================================== SELF-CHECK
  function renderCheck() {
    const c = S.check;
    $("toolGrid").innerHTML = E.TOOLS.map((t) => `<button class="tcard ${c.tool === t.id ? "on" : ""}" data-tool="${t.id}" data-tip="${esc(t.name + ": " + t.note)}" aria-pressed="${c.tool === t.id}">
      <span class="ti" style="background:${TOOL_ICON[t.id][0]}">${toolIcon(t.id)}</span><span class="tn">${esc(t.name)}</span><span class="st st-${t.status}">${STATUS_LABEL[t.status]}</span></button>`).join("");
    $("dataGrid").innerHTML = E.CLASSES.map((cls) => `<div class="dgroup ${cls === "Restricted" ? "wide" : ""}" style="--cls:${CLS_COLOR[cls]}"><div class="gh"><i></i>${cls}</div><div class="chips">` +
      POL.data_types.filter((d) => d.cls === cls).map((d) => `<button class="dchip ${c.data.includes(d.id) ? "on" : ""}" data-dt="${d.id}" aria-pressed="${c.data.includes(d.id)}" data-tip="${esc(d.examples + (d.never ? ". Never allowed in any AI tool (3.4)." : "."))}"><span>${esc(d.label)}</span>${d.never ? '<svg class="lock" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>' : ""}</button>`).join("") + "</div></div>").join("");
    $("purposeGrid").innerHTML = POL.purposes.map((p) => `<button class="pchip ${c.purpose === p.id ? "on" : ""}" data-purpose="${p.id}" aria-pressed="${c.purpose === p.id}">${esc(p.label)}</button>`).join("");
    const tg = [];
    if (c.purpose === "reply") tg.push(`<label class="toggle" data-tip="Policy 6.1: a person reviews anything AI drafts before it reaches a customer."><input type="checkbox" data-tg="reviewed" ${c.reviewed ? "checked" : ""}><span class="track"></span><span>A person reviews it</span></label>`);
    if (c.purpose === "meeting") tg.push(`<label class="toggle" data-tip="Policy 6.3: tell everyone before AI takes notes."><input type="checkbox" data-tg="consent" ${c.consent ? "checked" : ""}><span class="track"></span><span>Attendees told</span></label>`);
    $("checkToggles").innerHTML = tg.join("");
    renderVerdict(false);
  }
  function currentCheck() {
    const c = S.check;
    if (!c.tool || !c.data.length || !c.purpose) return null;
    return E.check(c.tool, c.data, c.purpose, { reviewed: c.reviewed, consent: c.consent });
  }
  const NO_EXCEPTION = ["R1", "R2", "R3"];
  function renderVerdict(animate) {
    const c = S.check, r = currentCheck();
    const card = $("verdictCard");
    if (!r) {
      const need = [!c.tool && "a tool", !c.data.length && "what's in it", !c.purpose && "what it's for"].filter(Boolean);
      card.className = "card verdict-card";
      card.innerHTML = `<div class="v-empty"><div><div class="ring">?</div><b>Pick ${need.join(", ").replace(/, ([^,]*)$/, " and $1")}</b><div class="small" style="margin-top:6px">Your answer appears here, with the rule behind it.</div></div></div>`;
      return;
    }
    const v = VERDICT[r.verdict], t = E.TOOL[c.tool];
    const saferId = r.verdict === "not_approved" ? E.saferToolId(c.data, c.purpose) : null;
    const canSwitch = saferId && saferId !== c.tool;
    card.className = "card verdict-card " + v.cls;
    card.innerHTML = `
      <div class="stamp-wrap"><div class="stamp ${animate ? "anim" : ""}">${vIcon(r.verdict, 34)}${v.label}</div></div>
      <div class="v-rule">${esc(POL.rule_label[r.rule])}</div>
      <div class="v-row"><span class="chip" style="background:color-mix(in srgb, ${CLS_COLOR[r.data_class]} 16%, white)" data-tip="The highest class among the data you picked.">Highest class: ${r.data_class}</span>${r.clauses.map((k) => `<button class="chip clause" data-clause="${k}" data-tip="${esc(k + ": " + CLAUSE[k].text)}">${k}</button>`).join("")}</div>
      ${r.conditions.length ? `<div class="v-box"><h4>${r.verdict === "approved" ? "Before you use it" : "Conditions"}</h4><ul>${r.conditions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${r.safer ? `<div class="v-safer"><span>${esc(r.safer)}</span>${canSwitch ? `<button class="btn sm primary" id="applySafer" data-tool="${saferId}">Switch</button>` : ""}</div>` : ""}
      <div class="v-actions"><button class="why" id="checkWhy">Why?</button>
        ${r.verdict === "not_approved" ? (NO_EXCEPTION.includes(r.rule) ? `<span class="small faint">No exceptions for this rule.</span>` : `<button class="btn sm" id="excOpen" data-tip="Ask the AI Governance Committee for an exception with a business reason, an owner and an end date (8.1).">Request an exception</button>`) : ""}</div>
      ${S.excForm && r.verdict === "not_approved" && !NO_EXCEPTION.includes(r.rule) ? `<div class="v-box form"><h4>Exception request</h4>
        <label for="excReason">Business reason</label><textarea id="excReason" placeholder="Why do you need this, and what limits it?"></textarea>
        <label for="excEnd">End date</label><input type="date" id="excEnd" value="2026-11-30" min="2026-10-31">
        <div class="v-actions"><button class="btn sm primary" id="excSend">Send to committee</button><span class="msg" id="excMsg"></span></div></div>` : ""}
      <div class="small faint" style="margin-top:auto">Guidance only. Self-checks are counted by department, never by name.</div>`;
    void t;
  }
  function runCheckEffects() {
    const r = currentCheck(); if (!r) return;
    const c = S.check;
    const key = [c.tool, c.data.slice().sort().join("+"), c.purpose, c.reviewed, c.consent].join("|");
    log(`Self-check: ${E.TOOL[c.tool].name}, ${c.data.map((d) => E.DT[d].label.toLowerCase()).join(" and ")}, ${E.PURPOSE[c.purpose].toLowerCase()} → ${VERDICT[r.verdict].label}`);
    if (S.persona === "emp" && !S.checkKeys.includes(key) && S.checkPoints < 50) {
      S.checkKeys.push(key); S.checkPoints += 10; S.points += 10;
      log("+10 points: checked before acting", "points"); renderPlayer(true);
      const pop = document.createElement("span"); pop.className = "pts-pop"; pop.textContent = "+10 points"; $("verdictCard").appendChild(pop);
    }
  }

  // ================================================================== QUIZ
  function renderQuiz() {
    $("quizFast").classList.toggle("hidden", !document.body.classList.contains("presenter") || S.quiz.done);
    const q = S.quiz;
    if (q.done) renderResult(); else renderQuestion(true);
    renderQuizSide();
  }
  function dotsHtml() {
    return `<div class="dots" aria-label="Progress">${QZ.questions.map((x, i) => { const a = S.quiz.answers[i]; return `<span class="dot ${a ? (a.correct ? "right" : "wrong") : i === S.quiz.i ? "now" : ""}" title="${x.id}"></span>`; }).join("")}</div>`;
  }
  function renderQuestion(enter) {
    const q = S.quiz, item = QZ.questions[q.i], ans = q.answers[q.i];
    const tool = E.TOOL[item.inputs.tool];
    let fb = "";
    if (ans) {
      const r = E.checkInputs(item.inputs), v = VERDICT[item.answer];
      const reason = r.verdict === "not_approved" ? `${POL.rule_label[r.rule]}. ${r.safer || ""}` : `${r.conditions.join(". ")}.`;
      fb = `<div class="feedback ${v.cls}">${vIcon(item.answer, 26)}<div class="fh">${ans.correct ? "Right" : "Not quite"}: ${v.label}${ans.correct ? ` · +${pl(ans.points, "point", "points")}` : ""}</div>
        <div class="fb">${esc(reason)}</div>
        <div class="fa">${r.clauses.map((k) => `<button class="chip clause" data-clause="${k}" data-tip="${esc(k + ": " + CLAUSE[k].text)}">${k}</button>`).join("")}<button class="btn sm" id="tryIt">Try it in Self-check</button><span class="spacer"></span><button class="btn sm primary" id="quizNext">${q.i === QZ.questions.length - 1 ? "See results" : "Next"}</button></div></div>`;
    }
    const left = QZ.questions.length - q.i - 1;
    $("quizMain").innerHTML = dotsHtml() + `
      <div class="card qcard ${enter ? "enter" : ""}">
        <div class="q-top"><span class="q-num">${item.id} of ${QZ.questions.length}</span><span class="chip">${esc(item.topic)}</span><span class="spacer"></span><span class="small faint">${left === 0 ? "Last question" : pl(left, "question left", "questions left")}</span></div>
        <div class="q-prompt">${esc(item.prompt)}</div>
        <div class="q-scene"><span class="chip" style="background:${TOOL_ICON[tool.id][0]};color:#fff">${toolIcon(tool.id, 13)} ${esc(tool.name)}</span>${item.inputs.data.map((d) => `<span class="chip" style="background:color-mix(in srgb, ${CLS_COLOR[E.DT[d].cls]} 16%, white)">${esc(E.DT[d].label)}</span>`).join("")}<span class="chip">${esc(E.PURPOSE[item.inputs.purpose])}</span></div>
        ${q.hint && !ans ? `<div class="hint"><b>Hint:</b> ${esc(hintFor(item))}</div>` : ""}
        <div class="answers">${Object.keys(VERDICT).map((k) => {
          const cls = ans ? (k === item.answer ? "correct" : k === ans.picked ? "picked shake" : "dim") : "";
          return `<button class="ans ${VERDICT[k].cls} ${cls}" data-ans="${k}" ${ans ? "disabled" : ""}>${vIcon(k, 24)}${VERDICT[k].label}</button>`;
        }).join("")}</div>
        ${ans ? fb : `<div class="q-actions"><button class="btn sm" id="quizHint" ${q.hint ? "disabled" : ""} data-tip="Shows the clause that decides it. Costs ${QZ.scoring.hint_cost} points on this question.">Hint (−${QZ.scoring.hint_cost})</button><span class="small faint">Streak bonus now: +${Math.min(QZ.scoring.streak_step * S.streak, QZ.scoring.streak_cap)}</span></div>`}
      </div>`;
  }
  function hintFor(item) {
    const r = E.checkInputs(item.inputs);
    const k = r.clauses[0];
    return `${k}: ${CLAUSE[k].text}`;
  }
  function answerQuiz(picked) {
    const q = S.quiz, item = QZ.questions[q.i];
    if (q.answers[q.i]) return;
    const correct = picked === item.answer;
    const pts = E.pointsFor(correct, q.hint, S.streak);
    q.answers[q.i] = { picked, correct, hint: q.hint, points: pts };
    if (correct) { S.streak += 1; S.bestStreak = Math.max(S.bestStreak, S.streak); } else S.streak = 0;
    if (pts) { if (S.persona === "emp") { S.points += pts; S.quizPoints += pts; } }
    log(`Quiz ${item.id}: answered ${VERDICT[picked].label} (${correct ? "right" : "wrong"})${pts && S.persona === "emp" ? `, +${pl(pts, "point", "points")}` : ""}`, correct ? "points" : "");
    renderPlayer(!!pts);
    evalBadges();
    renderQuestion(false); renderQuizSide();
  }
  function nextQuestion() {
    const q = S.quiz;
    q.hint = false;
    if (q.i >= QZ.questions.length - 1) { finishQuiz(); return; }
    q.i += 1; renderQuestion(true); renderQuizSide();
  }
  function finishQuiz() {
    const q = S.quiz; q.done = true;
    const correct = q.answers.filter((a) => a && a.correct).length;
    const passed = correct >= QZ.scoring.pass_correct;
    log(`Quiz finished: ${correct} of 12 correct${passed ? ", passed" : ", not passed"}`, passed ? "approve" : "");
    evalBadges();
    if (passed) confetti();
    renderQuiz();
  }
  function fastForward() {
    const q = S.quiz;
    while (!q.done) {
      if (!q.answers[q.i]) answerQuiz(QZ.questions[q.i].answer);
      if (q.i >= QZ.questions.length - 1) { finishQuiz(); break; }
      q.i += 1; q.hint = false;
    }
    log("Fast-forward: answered the remaining questions (presenter)");
  }
  function recap() {
    const missed = S.quiz.answers.map((a, i) => ({ a, q: QZ.questions[i] })).filter((x) => x.a && !x.a.correct);
    if (!missed.length) return "A clean run. You know which tool takes which data. Keep using the self-check when something new comes up.";
    const topics = [...new Set(missed.map((x) => x.q.topic))];
    const first = E.checkInputs(missed[0].q.inputs);
    const k = first.clauses[0];
    const TIPS = {
      "Restricted data": "An approved tool isn't approved for every kind of data. Check the table before you paste.",
      "Never-allowed data": "Strip keys, passwords and account numbers before you ask for help.",
      "Public chatbots": "Personal chatbots are fine for published content, as long as you don't sign in with your work email.",
      "Blocked tools": "Blocked means blocked, even when a customer or supplier brings the tool.",
      "Customer replies": "AI can draft the reply; a person reviews and sends it.",
      "Meetings": "Tell the room before AI takes notes.",
      "Decisions about people": "AI can help write the job post, never pick the person.",
      "Approved tools": "When the tool and the data match the table, go ahead and own the output.",
    };
    return `You missed ${pl(missed.length, "question", "questions")} on ${topics.join(" and ").toLowerCase()}. Read ${k}: "${CLAUSE[k].text}" Tip: ${TIPS[missed[0].q.topic] || "Check the table before you paste."}`;
  }
  function renderResult() {
    const q = S.quiz, a = q.answers;
    const run = E.scoreRun(a.map((x) => ({ correct: !!(x && x.correct), hint: !!(x && x.hint) })));
    const passed = run.passed;
    const missed = a.map((x, i) => ({ x, q: QZ.questions[i] })).filter((m) => m.x && !m.x.correct);
    if (!q.counted && S.persona === "emp") { q.counted = true; }
    const teams = AGG.departments.map((d) => ({ id: d.id, name: d.name, att: d.quiz_attempts + (d.id === "SAL" && q.counted ? 1 : 0), hc: d.headcount }))
      .map((d) => Object.assign(d, { c: d.att / d.hc })).sort((x, y) => y.c - x.c);
    const rank = teams.findIndex((t) => t.id === "SAL") + 1;
    const canAttest = passed && S.attested !== S.version;
    $("quizMain").innerHTML = dotsHtml() + `<div class="result">
      <div class="card">
        <div class="small faint mono">THIS RUN</div>
        <div class="res-score">${fmt(run.points)}</div>
        <div class="res-level">${run.correct} of 12 correct · ${passed ? "Certified" : "Not certified yet"}</div>
        <div class="muted">Best streak ${pl(run.best_streak, "answer", "answers")} · Level ${E.levelFor(S.points)}</div>
        <div class="v-box"><h4>Recap <span class="sim-tag" data-tip="Written by a simulated AI from your answers.">simulated</span></h4><div class="small">${esc(recap())}</div></div>
        ${missed.length ? `<div class="v-row" style="justify-content:flex-start">${missed.map((m) => `<button class="chip clause" data-clause="${E.checkInputs(m.q.inputs).clauses[0]}" data-tip="${esc(m.q.prompt)}">${m.q.id} · ${esc(Q_SHORT[m.q.id])}</button>`).join("")}</div>` : ""}
        <div class="v-actions" style="margin-top:auto">
          ${passed ? `<button class="btn primary" id="attestOpen" ${canAttest ? "" : "disabled"} data-tip="Confirm you've read the policy and will follow it. Only the employee can attest.">${S.attested === S.version ? "Attested v" + S.version : "Attest to v" + S.version}</button>` : `<span class="small">Get ${QZ.scoring.pass_correct} right to attest.</span>`}
          <button class="btn" id="quizAgain">Try again</button></div>
      </div>
      <div class="card">
        <div class="card-h" style="padding:0">Team challenge <span class="sub">quiz completion, goal 90% by Nov 30</span></div>
        <div class="small muted">Sales is ${ordinal(rank)} of 9. Teams only, never individuals.</div>
        <div class="team">${teams.map((t) => `<div class="tr ${t.id === "SAL" ? "me" : ""}" data-tip="${esc(`${t.name}: ${fmt(t.att)} of ${fmt(t.hc)} people have taken the quiz${t.id === "SAL" && q.counted ? ", including you" : ""}.`)}"><span>${esc(t.name)}</span><span class="tb"><i style="width:${t.c * 100}%"></i><b style="left:90%"></b></span><span class="pc">${pct(t.c)}</span></div>`).join("")}</div>
      </div></div>`;
  }
  const ordinal = (n) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
  function renderQuizSide() {
    const lv = QZ.scoring.levels, nx = E.nextLevel(S.points), cur = lv.filter(([, t]) => S.points >= t).pop();
    const fill = nx ? (S.points - cur[1]) / (nx.at - cur[1]) : 1;
    const correct = S.quiz.answers.filter((a) => a && a.correct).length, answered = S.quiz.answers.filter(Boolean).length;
    $("quizSide").innerHTML = `
      <div class="card side-stat"><div class="lbl">Points</div><div class="big">${fmt(S.points)}</div>
        <div class="lvl-track"><i style="width:${fill * 100}%"></i></div>
        <div class="lvl-names"><span>${cur[0]}</span><span>${nx ? fmt(nx.at - S.points) + " to " + nx.name : "Top level"}</span></div></div>
      <div class="card side-stat"><div class="ring-wrap">${ring(correct, answered)}<div><div class="lbl">Score</div><div><b>${correct} of ${answered}</b> right</div><div class="small faint">${QZ.scoring.pass_correct} of 12 to pass</div></div></div></div>
      <div class="card"><div class="card-h">Badges <span class="sub">${S.badges.length} of 5</span></div><div class="badge-list">${BADGES.map((b) => `<div class="badge-row">${badgeIcon(b.id, S.badges.includes(b.id))}<div><b>${esc(b.name)}</b><span>${esc(b.rule)}</span></div></div>`).join("")}</div></div>`;
  }
  function ring(c, n) {
    const r = 24, C = 2 * Math.PI * r, f = n ? c / n : 0;
    return `<svg width="62" height="62" viewBox="0 0 62 62" aria-hidden="true"><circle cx="31" cy="31" r="${r}" fill="none" stroke="#ECE8F2" stroke-width="7"/><circle cx="31" cy="31" r="${r}" fill="none" stroke="#15803D" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C * f} ${C}" transform="rotate(-90 31 31)" style="transition:stroke-dasharray .6s"/></svg>`;
  }
  function openAttest() {
    $("dlgTitle").textContent = "Attest to the policy"; $("dlgSim").classList.add("hidden");
    $("dlgBody").innerHTML = `<div>You passed the quiz. Attesting records that you've read <b>AI Acceptable Use Policy v${S.version}</b> and will follow it.</div>
      <label class="toggle"><input type="checkbox" id="attestBox"><span class="track"></span><span>I've read policy v${S.version} and will follow it.</span></label>
      <div class="v-actions"><button class="btn primary" id="attestDo">Attest</button><span class="msg" id="attestMsg"></span></div>`;
    openDialog();
  }
  const RULES = {
    canAttest: (persona, passed, box) => persona !== "emp" ? "Only the employee can attest for themselves." : !passed ? "Pass the quiz first." : !box ? "Tick the box to confirm you've read the policy." : null,
    canApprovePolicy: (persona, proposer) => persona !== "gov" ? "Only the AI Governance Committee can publish a policy change." : proposer === "gov" ? "The committee drafted this. Someone else must propose it first." : null,
    canTriage: (persona, note) => persona !== "sec" ? "Only the security lead can close a report." : !note.trim() ? "Add a note: what was discussed and what changes." : null,
    canDecideException: (persona) => persona !== "gov" ? "Only the AI Governance Committee decides exceptions." : null,
    pointsForReport: () => 0,
  };

  // ================================================================== SPEAK UP
  const SPEAK = [
    { id: "talk", title: "Talk to them", color: "#0EA5A4", one: "A quick, kind word fixes most things.",
      icon: '<path d="M4 5h11v8H8l-4 3z"/><path d="M15 9h5v8l-3-2h-5v-2"/>' },
    { id: "ask", title: "Ask quietly", color: "#4F46E5", one: "Not sure it's a problem? Ask the AI help desk, anonymously.",
      icon: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><path d="M12 17.5v.01"/>' },
    { id: "report", title: "Report it", color: "#E5487D", one: "Something serious, or it keeps happening. Name or no name.",
      icon: '<path d="M5 21V4h11l-2 4 2 4H5"/>' },
  ];
  function renderSpeak() {
    const f = S.speak.flipped;
    $("allyProgress").innerHTML = `<span>Speak-up Ally</span>${SPEAK.map((s) => `<span class="pip ${f.includes(s.id) ? "on" : ""}"></span>`).join("")}<span class="faint">${f.length} of 3</span>`;
    $("speakBody").innerHTML = SPEAK.map((s) => `<div class="flip ${f.includes(s.id) && S.speak.open !== s.id + "-front" ? "flipped" : ""}" data-flip="${s.id}">
      <div class="flip-inner">
        <button class="face front" data-flipbtn="${s.id}" aria-label="${esc(s.title)}"><span class="big-ic" style="background:${s.color}"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.icon}</svg></span><h2>${s.title}</h2><p>${s.one}</p><span class="flipme">Flip the card</span></button>
        <div class="face back">${speakBack(s.id)}</div>
      </div></div>`).join("");
  }
  function speakBack(id) {
    const head = (t) => `<h3>${t}<button class="btn sm" data-unflip="${id}">Flip back</button></h3>`;
    if (id === "talk") return head("Talk to them") + `
      <div class="starter">"Hey, NoteHawk is blocked now. The company assistant can take notes if we tell everyone first."</div>
      <div class="starter">"That list has customer emails in it. Support Copilot is the one approved for customer data."</div>
      <div class="starter">"Want to run it through the self-check together? It takes 15 seconds."</div>
      <div class="small muted">Talk in private, assume good intent, and offer the approved way. Most people just didn't know.</div>
      <div class="reassure">7.1: talking first is encouraged, and it's often enough.</div>`;
    if (id === "ask") return head("Ask quietly") + `<div class="form">
      <label for="askText">Your question</label><textarea id="askText" placeholder="For example: can I use AI to summarize customer calls?"></textarea>
      <div class="v-actions"><button class="btn primary" id="askSend">Send anonymously</button><span class="msg" id="askMsg"></span></div></div>
      <div class="small muted">Questions go to the awareness lead, without your name. Common ones become policy clarifications.</div>
      ${S.speak.asked.length ? `<div class="reassure">Sent ${pl(S.speak.asked.length, "question", "questions")}. You'll see answers in the policy's FAQ.</div>` : ""}`;
    return head("Report it") + `<div class="form">
      <label for="repTool">Which tool?</label><select id="repTool">${E.TOOLS.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("")}<option value="other">Something else</option></select>
      <label for="repText">What happened?</label><textarea id="repText" placeholder="Describe it. Don't paste the data itself."></textarea>
      <label class="toggle"><input type="checkbox" id="repAnon" checked><span class="track"></span><span>Send anonymously</span></label>
      <div class="warn">Don't attach or paste the data itself (7.3).</div>
      <div class="v-actions"><button class="btn primary" id="repSend">Send report</button><span class="msg" id="repMsg"></span></div></div>
      <div class="reassure">Reports start with coaching. Retaliation isn't allowed (7.2). No points for reports.</div>`;
  }
  function flip(id) {
    const f = S.speak.flipped;
    if (!f.includes(id)) { f.push(id); log(`Speak up: opened "${SPEAK.find((s) => s.id === id).title}"`); }
    S.speak.open = null;
    renderSpeak(); evalBadges();
  }
  const looksLikeData = (s) => /[\w.+-]+@[\w-]+\.[\w.]+/.test(s) || /\b(?:\d[ -]?){12,19}\b/.test(s) || /\b(?:sk|key|token)[-_][A-Za-z0-9]{8,}/i.test(s);

  // ================================================================== DASHBOARD
  function renderDash() {
    const repTotal = PRG.reports.length + S.speak.reports.length;
    $("dashKpis").innerHTML = `
      <div class="kpi accent" data-tip="${fmt(T.passed)} of ${fmt(T.headcount)} people passed the quiz and attested."><div class="v">${pct(T.attested)}</div><div class="l">Attested</div></div>
      <div class="kpi" data-tip="${fmt(T.quiz_attempts)} of ${fmt(T.headcount)} people took the quiz."><div class="v">${pct(T.completion)}</div><div class="l">Quiz taken</div></div>
      <div class="kpi" data-tip="Average share of questions answered correctly, weighted by attempts."><div class="v">${pct(T.quiz_avg)}</div><div class="l">Quiz average</div></div>
      <div class="kpi" data-tip="${fmt(T.not_approved)} of ${fmt(T.checks)} self-checks came back Not approved."><div class="v">${pct(T.not_approved_share, 1)}</div><div class="l">Not approved</div></div>
      <div class="kpi" data-tip="Speak-up reports in the last 30 days${S.speak.reports.length ? ", plus " + pl(S.speak.reports.length, "new report", "new reports") + " today" : ""}."><div class="v">${fmt(repTotal)}</div><div class="l">Reports</div></div>`;
    renderQuad(); renderMissed(); renderRules(); renderDashSide();
  }
  function quadOf(d) { const hiQ = d.quiz_avg >= T.quiz_avg, hiN = d.not_approved_share >= T.not_approved_share; return hiQ ? (hiN ? "tr" : "br") : (hiN ? "tl" : "bl"); }
  const QUAD = { tr: ["Knows it, doesn't follow it", "#E5487D"], br: ["Knows it, follows it", "#0EA5A4"], tl: ["Needs help", "#F5A524"], bl: ["Still learning", "#4F46E5"] };
  function renderQuad() {
    const host = $("quadChart"); host.innerHTML = "";
    const w = Math.max(240, host.clientWidth - 20), h = Math.max(200, host.clientHeight - 8);
    const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", `0 0 ${w} ${h}`); s.setAttribute("width", w); s.setAttribute("height", h); host.appendChild(s);
    const add = (tag, a, p) => { const el = document.createElementNS(NS, tag); for (const k in a) el.setAttribute(k, a[k]); (p || s).appendChild(el); return el; };
    const txt = (x, y, t, a, p) => { const el = add("text", Object.assign({ x, y }, a || {}), p); el.textContent = t; return el; };
    const L = 50, R = 16, TP = 14, B = 38, iw = w - L - R, ih = h - TP - B;
    const x0 = 0.6, x1 = 0.9, y0 = 0, y1 = 0.45;
    const X = (v) => L + ((v - x0) / (x1 - x0)) * iw, Y = (v) => TP + ih - ((v - y0) / (y1 - y0)) * ih;
    const ax = add("g", { class: "axis grid" });
    for (let v = 0; v <= 0.4001; v += 0.1) { add("line", { x1: L, x2: L + iw, y1: Y(v), y2: Y(v) }, ax); txt(L - 8, Y(v) + 4, Math.round(v * 100) + "%", { "text-anchor": "end" }, ax); }
    for (let v = 0.6; v <= 0.9001; v += 0.05) { const first = v < 0.601; txt(first ? X(v) + 2 : X(v), TP + ih + 16, Math.round(v * 100) + "%", { "text-anchor": first ? "start" : "middle" }, ax); }
    txt(L + iw / 2, h - 4, "Quiz average", { "text-anchor": "middle", class: "lbl" }, ax);
    const yl = txt(12, TP + ih / 2, "Self-checks not approved", { "text-anchor": "middle", class: "lbl", transform: `rotate(-90 12 ${TP + ih / 2})` }, ax); void yl;
    add("line", { x1: X(T.quiz_avg), x2: X(T.quiz_avg), y1: TP, y2: TP + ih, stroke: "#1F1A3D", "stroke-dasharray": "4 4", opacity: .4 });
    add("line", { x1: L, x2: L + iw, y1: Y(T.not_approved_share), y2: Y(T.not_approved_share), stroke: "#1F1A3D", "stroke-dasharray": "4 4", opacity: .4 });
    txt(L + iw - 4, TP + 14, QUAD.tr[0], { "text-anchor": "end", class: "lbl", fill: QUAD.tr[1] });
    txt(L + iw - 4, TP + ih - 8, QUAD.br[0], { "text-anchor": "end", class: "lbl", fill: QUAD.br[1] });
    txt(L + 6, TP + 14, QUAD.tl[0], { class: "lbl", fill: QUAD.tl[1] });
    txt(L + 6, TP + ih - 8, QUAD.bl[0], { class: "lbl", fill: QUAD.bl[1] });
    const maxHc = Math.max(...AGG.departments.map((d) => d.headcount));
    const placed = [];
    const circles = AGG.departments.map((d) => ({ id: d.id, r: 8 + 22 * Math.sqrt(d.headcount / maxHc), cx: X(d.quiz_avg), cy: Y(d.not_approved_share) }));
    const hits = (bx, own) => placed.some((p) => bx.x1 < p.x2 && bx.x2 > p.x1 && bx.y1 < p.y2 && bx.y2 > p.y1) ||
      circles.some((c) => c.id !== own && bx.x1 < c.cx + c.r && bx.x2 > c.cx - c.r && bx.y1 < c.cy + c.r && bx.y2 > c.cy - c.r);
    AGG.departments.slice().sort((a, b) => b.headcount - a.headcount).forEach((d) => {
      const g = add("g", { class: "bubble" + (S.dash.dept === d.id ? " on" : ""), tabindex: 0, role: "button", "data-dept": d.id, "aria-label": `${d.name}: quiz ${pct(d.quiz_avg)}, not approved ${pct(d.not_approved_share)}` });
      const r = 8 + 22 * Math.sqrt(d.headcount / maxHc), cx = X(d.quiz_avg), cy = Y(d.not_approved_share), col = QUAD[quadOf(d)][1];
      add("circle", { class: "b", cx, cy, r, fill: col, "fill-opacity": d.id === "SAL" ? .9 : .55, stroke: "#fff", "stroke-width": 2 }, g);
      const label = d.id === "SAL" ? `Sales · ${pct(d.not_approved_share)} not approved` : d.name;
      const tw = label.length * 7 + 6;
      const cands = [[cx, cy - r - 6, "middle"], [cx, cy + r + 15, "middle"], [cx + r + 6, cy + 4, "start"], [cx - r - 6, cy + 4, "end"]];
      const box = ([x, y, an]) => { const x1 = an === "middle" ? x - tw / 2 : an === "start" ? x : x - tw; return { x1, x2: x1 + tw, y1: y - 12, y2: y + 3 }; };
      const pick = cands.find((cd) => !hits(box(cd), d.id)) || cands[0];
      placed.push(box(pick));
      txt(pick[0], pick[1], label, { "text-anchor": pick[2], class: "lbl", fill: d.id === "SAL" ? "#1F1A3D" : "#5B5675" }, g);
      g.dataset.tip = `${d.name}: quiz ${pct(d.quiz_avg)}, ${fmt(d.not_approved)} of ${fmt(d.checks)} self-checks not approved (${pct(d.not_approved_share)}), ${pl(d.headcount, "person", "people")}. ${QUAD[quadOf(d)][0]}.`;
    });
  }
  function bars(host, rows, color, fmtV) {
    const mx = Math.max(...rows.map((r) => r.v), 1e-9);
    $(host).innerHTML = rows.map((r) => `<div class="bar-row" data-tip="${esc(r.tip || "")}"><span class="bl">${esc(r.l)}</span><span class="bt"><i style="width:${(r.v / mx) * 100}%;background:${r.c || color}"></i></span><span class="bv">${fmtV(r.v)}</span></div>`).join("");
  }
  function renderMissed() {
    const rows = AGG.quiz_questions.slice().sort((a, b) => b.missed_share - a.missed_share).slice(0, 6)
      .map((q) => ({ l: `${q.id} · ${Q_SHORT[q.id]}`, v: q.missed_share, c: q.id === "Q4" ? "var(--accent)" : "var(--slate)", tip: `${QZ.questions.find((x) => x.id === q.id).prompt} Missed by ${fmt(q.missed)} of ${fmt(q.attempts)}.` }));
    bars("missedBars", rows, "var(--slate)", (v) => pct(v));
  }
  function renderRules() {
    const rows = Object.entries(AGG.not_approved_by_rule).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ l: POL.rule_label[k], v, c: k === "R4" ? "var(--no)" : "#F28B8B", tip: `${fmt(v)} of ${fmt(T.not_approved)} Not approved results (${pct(v / T.not_approved)}).` }));
    bars("ruleBars", rows, "var(--no)", (v) => fmt(v));
  }
  function renderDashSide() {
    const tabs = [["dept", "Team"], ["reports", "Reports"], ["questions", "Questions"], ["exceptions", "Exceptions"]];
    $("dashTabs").innerHTML = tabs.map(([k, l]) => `<button class="${S.dash.tab === k ? "on" : ""}" data-dtab="${k}">${l}${k === "exceptions" && S.exceptions.filter((e) => e.status === "pending").length ? " ·" + S.exceptions.filter((e) => e.status === "pending").length : ""}</button>`).join("");
    const box = $("dashSide");
    if (S.dash.tab === "dept") {
      const d = AGG.departments.find((x) => x.id === S.dash.dept), bt = AGG.by_dept_tool[d.id];
      const tools = Object.entries(bt).sort((a, b) => (b[1].approved + b[1].conditions + b[1].not_approved) - (a[1].approved + a[1].conditions + a[1].not_approved));
      const worst = tools.slice().sort((a, b) => b[1].not_approved - a[1].not_approved)[0];
      const q = AGG.quiz_questions; void q;
      box.innerHTML = `<div class="ditem"><div class="top"><b style="font-size:1.15em">${esc(d.name)}</b><span class="chip" style="background:${QUAD[quadOf(d)][1]};color:#fff">${QUAD[quadOf(d)][0]}</span></div>
        <div class="sub">${pl(d.headcount, "person", "people")} · quiz ${pct(d.quiz_avg)} · ${pct(d.completion)} took it · ${pct(d.attested)} attested</div></div>
        <div class="small muted"><b>${fmt(d.checks)}</b> self-checks: ${fmt(d.approved)} approved, ${fmt(d.conditions)} with conditions, <b style="color:var(--no)">${fmt(d.not_approved)} not approved</b></div>
        ${tools.map(([tid, v]) => { const n = v.approved + v.conditions + v.not_approved; return `<div class="tool-row" data-tip="${esc(`${E.TOOL[tid].name}: ${fmt(v.approved)} approved, ${fmt(v.conditions)} with conditions, ${fmt(v.not_approved)} not approved.`)}"><span>${esc(E.TOOL[tid].name)}</span><span class="stack"><i style="width:${v.approved / n * 100}%;background:var(--ok)"></i><i style="width:${v.conditions / n * 100}%;background:#F0B44C"></i><i style="width:${v.not_approved / n * 100}%;background:var(--no)"></i></span><span class="n">${fmt(n)}</span></div>`; }).join("")}
        ${worst && worst[1].not_approved ? `<div class="draft"><span class="sim-tag" data-tip="Suggested by a simulated AI from this team's results.">simulated</span> <b>Next lesson:</b> ${esc(lessonFor(worst[0], d))}</div>` : ""}`;
    } else if (S.dash.tab === "reports") {
      const all = S.speak.reports.concat(PRG.reports);
      const st = (r) => (S.triage[r.id] ? S.triage[r.id].status : r.status);
      const counts = { coached: 0, no_issue: 0, open: 0 }; all.forEach((r) => { counts[st(r)] += 1; });
      box.innerHTML = `<div class="small muted">${fmt(counts.coached)} coached · ${fmt(counts.no_issue)} no issue · ${fmt(counts.open)} open · 0 disciplinary</div>` +
        all.map((r) => {
          const s = st(r), t = S.triage[r.id];
          return `<div class="ditem ${r.fresh ? "new" : ""}"><div class="top"><span class="mono small">${r.id}</span><b>${esc(POL.rule_label[r.rule] || "Other")}</b><span class="chip ${s === "open" ? "cond" : s === "coached" ? "ok" : ""}">${PRG.report_status[s]}</span></div>
            <div class="sub">${r.dept ? esc(DEPT[r.dept]) : "Team not given"} · ${r.channel === "anonymous" ? "Anonymous" : "Named"}${r.talked_first ? " · talked first" : ""}${t ? ` · closed by ${esc(personaLabel(t.by))}: ${esc(t.note)}` : ""}</div>
            ${s === "open" ? `<input placeholder="Note: what was discussed and what changes" data-note="${r.id}" aria-label="Triage note"><div class="acts"><button class="btn sm" data-triage="${r.id}|coached">Coached</button><button class="btn sm" data-triage="${r.id}|no_issue">No issue</button><span class="msg" data-tmsg="${r.id}"></span></div>` : ""}</div>`;
        }).join("");
    } else if (S.dash.tab === "questions") {
      const f = S.faq;
      const top = PRG.questions[0];
      box.innerHTML = `<div class="small muted">${fmt(AGG.questions_total + S.speak.asked.length)} questions in 30 days, grouped by clause.</div>` +
        S.speak.asked.map((q) => `<div class="ditem new"><div class="top"><span class="chip sun">New</span><b>${esc(q)}</b></div><div class="sub">Asked anonymously today</div></div>`).join("") +
        PRG.questions.map((q, i) => `<div class="ditem"><div class="top"><b>${esc(q.text)}</b><span class="mono small">${q.count}</span></div><div class="sub">Clause ${q.clause}</div>
          ${i === 0 ? (f.state === "none" ? `<div class="acts"><button class="btn sm primary" id="faqDraft" data-tip="The simulated AI drafts a clarification to ${top.clause}. The committee must approve it before it's published.">Draft clarification</button></div>`
            : `<div class="draft"><span class="sim-tag">simulated</span> <b>Clarification to ${PRG.faq_draft.clause}</b>, proposed by ${esc(personaLabel(f.proposer))}: ${esc(f.text)}</div>
               ${f.state === "drafted" ? `<div class="acts"><button class="btn sm gold" id="faqApprove">Approve and publish v${PRG.faq_draft.version}</button><span class="msg" id="faqMsg"></span></div>` : `<div class="acts"><span class="chip ok">Published in v${S.version}</span></div>`}`) : ""}</div>`).join("");
    } else {
      box.innerHTML = S.exceptions.length ? S.exceptions.map((x) => `<div class="ditem"><div class="top"><span class="mono small">${x.id}</span><b>${esc(E.TOOL[x.tool].name)}</b><span class="chip ${x.status === "pending" ? "cond" : x.status === "approved" ? "ok" : "no"}">${x.status === "pending" ? "Pending" : x.status === "approved" ? "Approved" : "Declined"}</span></div>
        <div class="sub">${esc(x.data.map((d) => E.DT[d].label).join(", "))} · ${esc(E.PURPOSE[x.purpose])} · until ${fmtDate(x.end)}</div><div class="small">${esc(x.reason)}</div>
        ${x.status === "pending" ? `<div class="acts"><button class="btn sm primary" data-exc="${x.id}|approved">Approve</button><button class="btn sm" data-exc="${x.id}|declined">Decline</button><span class="msg" data-emsg="${x.id}"></span></div>` : `<div class="sub">Decided by ${esc(personaLabel(x.by))}</div>`}</div>`).join("")
        : `<div class="empty">No exception requests yet. Employees request them from a Not approved self-check.</div>`;
    }
  }
  function lessonFor(tool, d) {
    if (tool === "T6") return `${d.name} knows NoteHawk is blocked but keeps using it on customer calls. Show the company assistant's meeting notes in a 3-minute team huddle.`;
    if (tool === "T1") return `Customer and restricted data still goes into the company assistant. Teach the one-line rule: approved tool isn't approved for every data.`;
    if (tool === "T5") return `Non-public content is going into personal chatbots. Point the team to the company assistant for anything beyond published content.`;
    if (tool === "T7") return `Browser extensions read everything on screen. Run a 5-minute extension clean-up with IT.`;
    if (tool === "T3") return `Keys keep ending up in prompts. Add a secret scanner to the editor and a 2-minute refresher on 3.4.`;
    return `Revisit the "what can go where" table with the team.`;
  }

  // ================================================================== WHY
  function whyCheck() {
    const c = S.check, r = currentCheck(); if (!r) return;
    const t = E.TOOL[c.tool];
    const data = c.data.map((d) => E.DT[d]);
    const parts = [`You picked ${t.name} (${STATUS_LABEL[t.status].toLowerCase()}) to ${E.PURPOSE[c.purpose].toLowerCase()}, with ${data.map((d) => d.label.toLowerCase() + " (" + d.cls + ")").join(" and ")}.`];
    if (r.verdict === "not_approved") parts.push(`It stops at "${POL.rule_label[r.rule]}". ${r.safer || ""}`);
    else parts.push(r.verdict === "approved" ? "Nothing in the policy stops it. You still own the output." : `It's allowed if you meet ${pl(r.conditions.length, "condition", "conditions")}.`);
    $("dlgTitle").textContent = VERDICT[r.verdict].label + ": why";
    $("dlgSim").classList.remove("hidden");
    $("dlgBody").innerHTML = `<div>${esc(parts.join(" "))}</div>` + r.clauses.map((k) => `<div class="v-box"><h4>Clause ${k}</h4>${esc(CLAUSE[k].text)}</div>`).join("") +
      `<div class="small faint">${esc(t.note)}</div>`;
    openDialog(); log("Why? opened for a self-check");
  }

  // ================================================================== CHECKS
  function checks() {
    const C = (id, name, expected, fn) => { let ok = false, actual = ""; try { [ok, actual] = fn(); } catch (e) { actual = "error: " + e.message; } return { id, name, expected, ok, actual }; };
    const v = (r) => `${VERDICT[r.verdict].label} · ${r.rule} · ${r.clauses.join(", ")}`;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const ck = (id, name, args, verdict, rule, clauses, safer) => C(id, name, `${VERDICT[verdict].label} · ${rule} · ${clauses.join(", ")}${safer ? " · " + safer : ""}`, () => {
      const r = E.check(...args); return [r.verdict === verdict && r.rule === rule && same(r.clauses, clauses) && (!safer || r.safer === safer), v(r) + (safer ? " · " + r.safer : "")];
    });
    const out = [
      ck("K1", "Customer data, public chatbot", ["T5", ["customer"], "summarize"], "not_approved", "R5", ["4.3", "3.2"], "Use Support Copilot instead."),
      ck("K2", "Customer data, company assistant", ["T1", ["customer"], "summarize"], "not_approved", "R6", ["3.3"], "Use Support Copilot instead."),
      ck("K3", "Customer reply in Support Copilot, reviewed", ["T2", ["customer"], "reply", { reviewed: true }], "conditions", "R10", ["3.3", "6.1", "6.2"]),
      ck("K4", "Card numbers in Support Copilot", ["T2", ["customer", "payment"], "reply"], "not_approved", "R1", ["3.4"]),
      ck("K5", "Press release in a public chatbot", ["T5", ["public"], "draft"], "conditions", "R10", ["4.3", "6.2"]),
      ck("K6", "Source code in the code assistant", ["T3", ["code"], "code"], "approved", "R11", ["6.2"]),
      ck("K7", "Code with an API key", ["T3", ["code", "secrets"], "code"], "not_approved", "R1", ["3.4"]),
      ck("K8", "Ranking applicants", ["T1", ["employee"], "people"], "not_approved", "R2", ["5.1", "2.1"]),
      ck("K9", "Auto-send customer replies", ["T1", ["internal"], "reply", { reviewed: false }], "not_approved", "R8", ["6.1"]),
      ck("K10", "NoteHawk meeting notes", ["T6", ["internal"], "meeting"], "not_approved", "R4", ["4.2"], "Use the company AI assistant's meeting notes, and tell everyone first."),
      ck("K11", "Assistant notes, attendees not told", ["T1", ["internal"], "meeting", { consent: false }], "not_approved", "R9", ["6.3"]),
      ck("K12", "Assistant notes, attendees told", ["T1", ["internal"], "meeting", { consent: true }], "conditions", "R10", ["6.3", "6.2"]),
      C("K13", "Quiz answer key", "2 Approved (Q3, Q8), 3 With conditions (Q1, Q5, Q10), 7 Not approved", () => {
        const by = { approved: [], conditions: [], not_approved: [] };
        QZ.questions.forEach((q) => by[E.checkInputs(q.inputs).verdict].push(q.id));
        return [same(by.approved, ["Q3", "Q8"]) && same(by.conditions, ["Q1", "Q5", "Q10"]) && by.not_approved.length === 7, `${by.approved.length} Approved (${by.approved.join(", ")}), ${by.conditions.length} With conditions (${by.conditions.join(", ")}), ${by.not_approved.length} Not approved`];
      }),
      C("K14", "Scoring runs", "1,650 Champion · 1,600 · 1,180 Navigator passed · 990 not passed · 0 Explorer", () => {
        const run = (f) => E.scoreRun(Array.from({ length: 12 }, (_, i) => f(i)));
        const a = run(() => ({ correct: true })), b = run((i) => ({ correct: true, hint: i === 3 || i === 8 })), c = run((i) => ({ correct: i !== 3 && i !== 10 })), d = run((i) => ({ correct: ![3, 5, 10].includes(i) })), e = run(() => ({ correct: false }));
        const ok = a.points === 1650 && a.level === "AI Champion" && b.points === 1600 && c.points === 1180 && c.level === "AI Navigator" && c.passed && d.points === 990 && !d.passed && e.points === 0 && e.level === "AI Explorer";
        return [ok, `${fmt(a.points)} ${a.level} · ${fmt(b.points)} · ${fmt(c.points)} ${c.level} ${c.passed ? "passed" : "not passed"} · ${fmt(d.points)} ${d.passed ? "passed" : "not passed"} · ${fmt(e.points)} ${e.level}`];
      }),
      C("K15", "Program totals", "4,200; 3,150 (75%); 1,516 (36%); 77.7%; 5,391 = 2,775 + 1,880 + 736 (13.7%)", () => {
        const t = E.program().totals;
        const ok = t.headcount === 4200 && t.quiz_attempts === 3150 && t.completion === 0.75 && t.passed === 1516 && t.attested === 0.361 && t.quiz_avg === 0.777 && t.checks === 5391 && t.approved === 2775 && t.conditions === 1880 && t.not_approved === 736 && t.not_approved_share === 0.137;
        return [ok, `${fmt(t.headcount)}; ${fmt(t.quiz_attempts)} (${pct(t.completion)}); ${fmt(t.passed)} (${pct(t.attested)}); ${pct(t.quiz_avg, 1)}; ${fmt(t.checks)} = ${fmt(t.approved)} + ${fmt(t.conditions)} + ${fmt(t.not_approved)} (${pct(t.not_approved_share, 1)})`];
      }),
      C("K16", "Departments", "Sales 82.9%, 331 of 871 (38%), NoteHawk 212; Support 73.9%, 75 of 1,445; Operations 41%, 6.6% attested", () => {
        const P = E.program(), s = P.departments.find((d) => d.id === "SAL"), u = P.departments.find((d) => d.id === "SUP"), o = P.departments.find((d) => d.id === "OPS");
        const nh = P.by_dept_tool.SAL.T6.not_approved;
        const ok = s.quiz_avg === 0.829 && s.not_approved === 331 && s.checks === 871 && nh === 212 && u.quiz_avg === 0.739 && u.not_approved === 75 && u.checks === 1445 && o.completion === 0.41 && o.attested === 0.066;
        return [ok, `Sales ${pct(s.quiz_avg, 1)}, ${s.not_approved} of ${s.checks} (${pct(s.not_approved_share)}), NoteHawk ${nh}; Support ${pct(u.quiz_avg, 1)}, ${u.not_approved} of ${fmt(u.checks)}; Operations ${pct(o.completion)}, ${pct(o.attested, 1)} attested`];
      }),
      C("K17", "Mistakes and reasons", "Q4 54.3%; R4 349, R6 157, R5 92, R1 60, R8 56, R2 22", () => {
        const P = E.program(), q4 = P.quiz_questions.find((q) => q.id === "Q4"), r = P.not_approved_by_rule;
        const ok = q4.missed_share === 0.543 && r.R4 === 349 && r.R6 === 157 && r.R5 === 92 && r.R1 === 60 && r.R8 === 56 && r.R2 === 22;
        return [ok, `Q4 ${pct(q4.missed_share, 1)}; ` + Object.entries(r).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ")];
      }),
      C("K18", "People and grammar", "23 reports: 15/3/5, 12 anonymous, 0 disciplinary; approval rules hold; 0 and 1 read correctly", () => {
        const rp = E.program().reports;
        const rules = RULES.canApprovePolicy("aware", "aware") && RULES.canApprovePolicy("gov", "gov") && !RULES.canApprovePolicy("gov", "aware") &&
          RULES.canAttest("emp", false, true) && RULES.canAttest("gov", true, true) && !RULES.canAttest("emp", true, true) &&
          RULES.canTriage("emp", "x") && RULES.canTriage("sec", " ") && !RULES.canTriage("sec", "Coached on NoteHawk") && RULES.pointsForReport() === 0 &&
          RULES.canDecideException("aware") && !RULES.canDecideException("gov");
        const g = [pl(1, "point", "points"), pl(0, "badge", "badges"), pl(1, "report", "reports"), pl(1, "question left", "questions left")].join("|");
        const ok = rp.total === 23 && rp.by_status.coached === 15 && rp.by_status.no_issue === 3 && rp.by_status.open === 5 && rp.anonymous === 12 && rp.disciplinary === 0 && rules && g === "1 point|0 badges|1 report|1 question left";
        return [ok, `${rp.total} reports: ${rp.by_status.coached}/${rp.by_status.no_issue}/${rp.by_status.open}, ${rp.anonymous} anonymous, ${rp.disciplinary} disciplinary; ${rules ? "rules hold" : "rule failed"}; ${g.split("|").join(", ")}`];
      }),
    ];
    return out;
  }
  function renderChecks() {
    const r = checks(), pass = r.filter((x) => x.ok).length;
    $("checkCount").textContent = `${pass}/${r.length}`; $("checkCount").classList.toggle("bad", pass !== r.length);
    $("checksSub").textContent = `${pass} of ${r.length} pass`;
    $("checksList").innerHTML = r.map((x) => `<div class="ck"><span class="id">${x.id}</span><span class="nm">${esc(x.name)}</span><span class="res"><span class="chip ${x.ok ? "ok" : "no"}">${x.ok ? "Pass" : "Fail"}</span></span><span class="ex"><b>Expected</b> ${esc(x.expected)}<br><b>Actual</b> ${esc(x.actual)}</span></div>`).join("");
    return r;
  }

  // ================================================================== confetti
  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = $("confetti"), ctx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#4F46E5", "#F5A524", "#0EA5A4", "#E5487D", "#15803D"];
    const ps = Array.from({ length: 160 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - .5) * .3, c: cols[Math.floor(Math.random() * cols.length)], s: Math.random() < .5 }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of ps) {
        p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        if (p.s) ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2.5, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      if (t - t0 < 2800) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }

  // ================================================================== log, sheets, dialogs, tooltips
  function renderLog() {
    $("logCount").textContent = S.log.length;
    $("logList").innerHTML = S.log.map((l) => `<li class="${l.kind}"><div>${esc(l.what)}</div><div class="w">${l.t} · ${esc(l.who)}</div></li>`).join("") || `<li class="empty">Nothing yet.</li>`;
  }
  function openSheet(id) { document.querySelectorAll(".sheet").forEach((s) => { const on = s.id === id && !s.classList.contains("open"); s.classList.toggle("open", on); s.setAttribute("aria-hidden", !on); }); }
  function openDialog() { $("dlgWrap").classList.add("open"); $("dlgWrap").setAttribute("aria-hidden", "false"); setTimeout(() => $("dlgWrap").querySelector("[data-close]").focus(), 30); }
  function closeAll() {
    document.querySelectorAll(".sheet.open").forEach((s) => { s.classList.remove("open"); s.setAttribute("aria-hidden", "true"); });
    $("dlgWrap").classList.remove("open"); $("dlgWrap").setAttribute("aria-hidden", "true"); hideTip();
  }
  function placeTip(cx, cy) {
    const tip = $("tip"); tip.classList.add("show");
    const r = tip.getBoundingClientRect();
    let x = cx + 14, y = cy + 16;
    if (x + r.width > innerWidth - 8) x = cx - r.width - 14;
    if (y + r.height > innerHeight - 40) y = cy - r.height - 12;
    tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
  }
  function showTipFor(el) { const t = el.dataset.tip; if (!t) return; $("tip").textContent = t; const r = el.getBoundingClientRect(); placeTip(r.left + Math.min(r.width / 2, 40), r.bottom - 6); }
  function hideTip() { $("tip").classList.remove("show"); }
  function download(name, text) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

  // ================================================================== events
  function bind() {
    $("persona").innerHTML = PERSONAS.map((p) => `<option value="${p.id}">${p.label}</option>`).join("");
    document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    $("persona").addEventListener("change", (e) => { S.persona = e.target.value; log("Switched to " + personaLabel(S.persona)); });
    $("btnLog").addEventListener("click", () => openSheet("logSheet"));
    $("btnChecks").addEventListener("click", () => { renderChecks(); openSheet("checksSheet"); log("Ran the known-answer checks"); });
    $("rerunChecks").addEventListener("click", () => { const r = renderChecks(); toast(`${r.filter((x) => x.ok).length} of ${r.length} checks pass`); });
    $("btnPresenter").addEventListener("click", togglePresenter);
    $("btnReset").addEventListener("click", reset);
    $("polDownload").addEventListener("click", () => { download(`AI_Acceptable_Use_Policy_v${S.version}.md`, policyMarkdown()); log(`Downloaded policy v${S.version}`); });
    $("polPrint").addEventListener("click", () => { log("Printed the policy"); window.print(); });
    $("checkClear").addEventListener("click", () => { S.check = { tool: null, data: [], purpose: null, reviewed: true, consent: true }; S.excForm = false; renderCheck(); });
    $("quizFast").addEventListener("click", fastForward);
    $("quizRestart").addEventListener("click", () => { S.quiz = { i: 0, answers: [], hint: false, done: false, counted: S.quiz.counted }; S.streak = 0; renderPlayer(); renderQuiz(); log("Quiz restarted"); });

    document.addEventListener("click", (e) => {
      const el = e.target;
      if (el.closest("[data-close]")) { closeAll(); return; }
      if (el.classList && el.classList.contains("dialog-wrap")) { closeAll(); return; }
      const cl = el.closest("[data-clause]"); if (cl && cl.classList.contains("clause")) { closeAll(); openClause(cl.dataset.clause); return; }
      const sec = el.closest(".sec > button"); if (sec) { const id = sec.parentElement.dataset.sec; S.openSection = S.openSection === id ? null : id; if (S.openSection) markRead(id); renderPolicy(); return; }
      const mx = el.closest("[data-mx]"); if (mx) { const [t, d] = mx.dataset.mx.split("|"); S.check = { tool: t, data: [d], purpose: MATRIX_PURPOSE[t] || "summarize", reviewed: true, consent: true }; S.excForm = false; setView("check"); renderVerdict(true); runCheckEffects(); return; }
      const tc = el.closest("[data-tool]"); if (tc && tc.classList.contains("tcard")) { S.check.tool = tc.dataset.tool; S.excForm = false; renderCheck(); renderVerdict(true); runCheckEffects(); return; }
      const dc = el.closest("[data-dt]"); if (dc) { const d = dc.dataset.dt, a = S.check.data; S.check.data = a.includes(d) ? a.filter((x) => x !== d) : a.concat(d); S.excForm = false; renderCheck(); renderVerdict(true); runCheckEffects(); return; }
      const pc = el.closest("[data-purpose]"); if (pc) { S.check.purpose = pc.dataset.purpose; S.excForm = false; renderCheck(); renderVerdict(true); runCheckEffects(); return; }
      if (el.closest("#applySafer")) { S.check.tool = el.closest("#applySafer").dataset.tool; renderCheck(); renderVerdict(true); runCheckEffects(); log("Applied the safer path: " + E.TOOL[S.check.tool].name); return; }
      if (el.closest("#checkWhy")) { whyCheck(); return; }
      if (el.closest("#excOpen")) { S.excForm = true; renderVerdict(false); return; }
      if (el.closest("#excSend")) {
        const reason = $("excReason").value.trim();
        if (reason.length < 10) { $("excMsg").textContent = "Give a business reason (8.1)."; return; }
        const x = { id: "EX-" + String(S.exceptions.length + 1).padStart(2, "0"), tool: S.check.tool, data: S.check.data.slice(), purpose: S.check.purpose, reason, end: $("excEnd").value || "2026-11-30", status: "pending", by: null, requester: S.persona };
        S.exceptions.push(x); S.excForm = false; renderVerdict(false); log(`Exception requested (${x.id}): ${E.TOOL[x.tool].name}`); toast("Sent to the AI Governance Committee"); return;
      }
      const ans = el.closest("[data-ans]"); if (ans && !ans.disabled) { answerQuiz(ans.dataset.ans); return; }
      if (el.closest("#quizHint")) { S.quiz.hint = true; renderQuestion(false); log(`Hint used on ${QZ.questions[S.quiz.i].id}`); return; }
      if (el.closest("#quizNext")) { nextQuestion(); return; }
      if (el.closest("#tryIt")) { const q = QZ.questions[S.quiz.i]; S.check = { tool: q.inputs.tool, data: q.inputs.data.slice(), purpose: q.inputs.purpose, reviewed: q.inputs.reviewed !== undefined ? q.inputs.reviewed : true, consent: q.inputs.consent !== undefined ? q.inputs.consent : true }; setView("check"); renderVerdict(true); return; }
      if (el.closest("#quizAgain")) { S.quiz = { i: 0, answers: [], hint: false, done: false, counted: S.quiz.counted }; S.streak = 0; renderPlayer(); renderQuiz(); log("Quiz restarted"); return; }
      if (el.closest("#attestOpen")) { openAttest(); return; }
      if (el.closest("#attestDo")) {
        const passed = S.quiz.answers.filter((a) => a && a.correct).length >= QZ.scoring.pass_correct;
        const why = RULES.canAttest(S.persona, passed, $("attestBox").checked);
        if (why) { $("attestMsg").textContent = why; log("Blocked: attestation. " + why, "block"); return; }
        S.attested = S.version; closeAll(); renderPlayer(); renderQuiz(); log(`Attested to policy v${S.version}`, "approve"); toast("Attested. Thank you."); confetti(); return;
      }
      const fb = el.closest("[data-flipbtn]"); if (fb) { flip(fb.dataset.flipbtn); return; }
      const uf = el.closest("[data-unflip]"); if (uf) { S.speak.open = uf.dataset.unflip + "-front"; document.querySelector(`[data-flip="${uf.dataset.unflip}"]`).classList.remove("flipped"); return; }
      if (el.closest("#askSend")) {
        const q = $("askText").value.trim();
        if (q.length < 8) { $("askMsg").textContent = "Write your question first."; return; }
        if (looksLikeData(q)) { $("askMsg").textContent = "That looks like real data. Describe it instead (7.3)."; return; }
        S.speak.asked.unshift(q); log("Asked the AI help desk anonymously"); toast("Question sent anonymously"); renderSpeak(); return;
      }
      if (el.closest("#repSend")) {
        const txt = $("repText").value.trim();
        if (txt.length < 10) { $("repMsg").textContent = "Describe what happened."; return; }
        if (looksLikeData(txt)) { $("repMsg").textContent = "That looks like real data. Describe it instead (7.3)."; log("Blocked: report contained what looks like data", "block"); return; }
        const tool = $("repTool").value, anon = $("repAnon").checked;
        const rule = tool === "T6" || tool === "T7" ? "R4" : tool === "T5" ? "R5" : tool === "other" ? null : "R6";
        const r = { id: "SR-" + (PRG.reports.length + S.speak.reports.length + 1), rule, dept: null, channel: anon ? "anonymous" : "named", talked_first: false, status: "open", fresh: true };
        S.speak.reports.unshift(r); log(`Speak-up report ${r.id} sent (${anon ? "anonymous" : "named"}). No points for reports.`);
        toast("Report sent. Coaching comes first."); renderSpeak(); return;
      }
      const bub = el.closest("[data-dept]"); if (bub) { S.dash.dept = bub.dataset.dept; S.dash.tab = "dept"; renderQuad(); renderDashSide(); log("Dashboard: opened " + DEPT[S.dash.dept]); return; }
      const dt = el.closest("[data-dtab]"); if (dt) { S.dash.tab = dt.dataset.dtab; renderDashSide(); return; }
      const tr = el.closest("[data-triage]"); if (tr) {
        const [id, status] = tr.dataset.triage.split("|");
        const note = (document.querySelector(`[data-note="${id}"]`) || {}).value || "";
        const why = RULES.canTriage(S.persona, note);
        if (why) { document.querySelector(`[data-tmsg="${id}"]`).textContent = why; log(`Blocked: closing ${id}. ${why}`, "block"); return; }
        S.triage[id] = { status, note, by: S.persona }; renderDash(); log(`${id} closed as ${PRG.report_status[status]}: ${note}`, "approve"); return;
      }
      if (el.closest("#faqDraft")) { S.faq = { state: "drafted", proposer: S.persona, text: PRG.faq_draft.text }; renderDashSide(); log(`Clarification to ${PRG.faq_draft.clause} drafted (simulated AI), proposed by ${personaLabel(S.persona)}`); return; }
      if (el.closest("#faqApprove")) {
        const why = RULES.canApprovePolicy(S.persona, S.faq.proposer);
        if (why) { $("faqMsg").textContent = why; log("Blocked: policy publish. " + why, "block"); return; }
        S.faq.state = "published"; S.version = PRG.faq_draft.version; S.clarification = PRG.faq_draft.text;
        S.history = S.history.concat({ version: S.version, date: POL.as_of, change: PRG.faq_draft.change });
        renderPlayer(); renderDash(); log(`Policy v${S.version} published by the AI Governance Committee`, "approve"); toast(`Policy v${S.version} published`); return;
      }
      const ex = el.closest("[data-exc]"); if (ex) {
        const [id, st] = ex.dataset.exc.split("|");
        const why = RULES.canDecideException(S.persona);
        if (why) { document.querySelector(`[data-emsg="${id}"]`).textContent = why; log(`Blocked: exception ${id}. ${why}`, "block"); return; }
        const x = S.exceptions.find((y) => y.id === id); x.status = st; x.by = S.persona; renderDashSide(); log(`Exception ${id} ${st}`, "approve"); return;
      }
    });
    document.addEventListener("change", (e) => {
      const tg = e.target.dataset && e.target.dataset.tg;
      if (tg) { S.check[tg] = e.target.checked; renderVerdict(true); runCheckEffects(); }
    });
    document.addEventListener("keydown", (e) => {
      const el = e.target;
      if (e.key === "Escape") { closeAll(); return; }
      if ((e.key === "Enter" || e.key === " ") && el.matches && el.matches("[data-dept], td.cell")) { e.preventDefault(); el.dispatchEvent(new MouseEvent("click", { bubbles: true })); return; }
      if (/input|textarea|select/i.test(el.tagName)) return;
      if (e.key >= "1" && e.key <= "5") setView(["policy", "check", "quiz", "speak", "dash"][+e.key - 1]);
      if (e.key === "p" || e.key === "P") togglePresenter();
    });
    document.addEventListener("mouseover", (e) => { const el = e.target.closest("[data-tip]"); if (el) showTipFor(el); });
    document.addEventListener("mouseout", (e) => { const el = e.target.closest("[data-tip]"); if (el && !el.contains(e.relatedTarget)) hideTip(); });
    document.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip]"); if (el) showTipFor(el); else hideTip(); });
    document.addEventListener("focusout", hideTip);
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(renderView, 120); });
  }
  function togglePresenter() { document.body.classList.toggle("presenter"); log("Presenter mode " + (document.body.classList.contains("presenter") ? "on" : "off")); setTimeout(renderView, 60); }
  function reset() { const persona = S.persona; S = fresh(); S.persona = persona; closeAll(); renderPlayer(); renderLog(); setView("policy"); log("Reset: points, answers, reports and approvals cleared; policy v2.1 restored"); toast("Reset"); }

  bind();
  renderPlayer(); renderLog();
  const r = renderChecks();
  setView("policy");
  log(`Opened policy v${S.version}; ${r.filter((x) => x.ok).length} of ${r.length} checks pass`);
  window.JA09App = { state: () => S, setView, checks, E, RULES, pl, fastForward };
})();
