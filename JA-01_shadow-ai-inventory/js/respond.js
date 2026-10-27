/* JA-01 · response ladder: notices, approvals, simulated removal through the EDR, next-day verification. Pure. */
(function (root) {
  const D = root.JD;
  const persona = id => D.PERSONAS.find(p => p.id === id);

  function build(data, res) {
    const ppl = (app, rule) => [...new Set(res.signals.filter(s => s.appId === app && (!rule || s.ruleId === rule)).map(s => s.personId))];
    const spend = [...new Set(res.signals.filter(s => s.ruleId === "BL-08").map(s => s.personId))];
    const tg = ppl("tabgenie", "BL-04");
    const hosts = {}; tg.forEach(id => { hosts[id] = "idle"; });
    return [
      { id: "A1", app: "sheetsage", rule: "BL-03", title: "SheetSage AI · financial data", kind: "block", targets: ppl("sheetsage", "BL-03"), needs: 1, approvals: [], status: "new",
        steps: ["Draft notice", "Approve", "Block, notify, open incident"], effect: "Blocked in the web gateway, 3 notices sent, incident INC-2291 opened" },
      { id: "A2", app: "tabgenie", rule: "BL-04", title: "TabGenie AI · remove extension", kind: "remove", targets: tg, needs: 2, approvals: [], status: "grace-ended", notified: "2026-10-19", graceEnds: "2026-10-26",
        steps: ["Notified Oct 19", "Grace ended today", "Dry run", "Two approvals", "Canary (5 hosts)", "Remaining hosts", "Verify tomorrow"], hosts, dryRun: false, phase: null },
      { id: "A3", app: "modelbox", rule: "BL-05", title: "ModelBox · local model runner", kind: "notify", targets: ppl("modelbox", "BL-05"), needs: 1, approvals: [], status: "new",
        steps: ["Draft notice", "Approve", "Notify (removal Nov 2)"], effect: "4 notices sent; removal scheduled after the 5-business-day grace period (Nov 2)" },
      { id: "A4", app: "notehawk", rule: "BL-06", title: "NoteHawk · external call recording", kind: "revoke", targets: ppl("notehawk", "BL-06"), needs: 1, approvals: [], status: "new",
        steps: ["Draft notice", "Approve", "Revoke calendar access, notify"], effect: "Calendar consent revoked for 19 users in the cloud directory; 19 notices sent" },
      { id: "A5", app: "spend", rule: "BL-08", title: "AI subscriptions outside procurement", kind: "finance", targets: spend, needs: 1, approvals: [], status: "new",
        steps: ["Draft notice", "Approve", "Notify, flag for finance"], effect: "46 notices sent with the enterprise seat request link; finance flagged $11,040 a year in duplicate spend" },
      { id: "A6", app: "chatgpt", rule: "BL-02", title: "Personal accounts on ChatGPT", kind: "monitor", targets: ppl("chatgpt", "BL-02"), needs: 0, approvals: [], status: "monitoring", notified: "2026-10-19",
        steps: ["Notified Oct 19", "Redirected to enterprise", "Monitoring"], effect: "Notices sent Oct 19 with the enterprise sign-in link" }
    ];
  }

  const needsTwo = (a, people) => a.kind === "remove" && (a.targets.length > 25 || a.targets.some(id => people[id].admin || people[id].exec));

  function approve(a, who) {
    const p = persona(who);
    if (a.kind === "monitor") return { ok: false, msg: "Nothing to approve: this one is being monitored." };
    if (a.kind === "remove" && !a.dryRun) return { ok: false, msg: "Run the dry run first, so approvers see exactly which hosts are affected." };
    if (a.kind !== "remove" && !a.drafted) return { ok: false, msg: "Draft the notice first." };
    if (a.approvals.includes(who)) return { ok: false, msg: p.name + " already approved. A second approver must be someone else." };
    if (a.approvals.length >= a.needs) return { ok: false, msg: "Already has the approvals it needs." };
    a.approvals.push(who);
    return { ok: true, msg: p.name + " approved " + a.title + " (" + a.approvals.length + " of " + a.needs + ")" };
  }
  function execute(a, who, phase) {
    const p = persona(who);
    if (a.approvals.length < a.needs) return { ok: false, msg: "Blocked: needs " + a.needs + " approval" + (a.needs === 1 ? "" : "s") + ", has " + a.approvals.length + "." };
    if (a.kind === "remove") {
      if (who !== "priya") return { ok: false, msg: "Only the endpoint team runs removals. Switch to Priya Shah." };
      if (phase === "canary" && a.phase) return { ok: false, msg: "Canary already ran." };
      if (phase === "remaining" && a.phase !== "canary") return { ok: false, msg: "Run the 5-host canary first." };
      a.phase = phase; return { ok: true, msg: p.name + " started the " + (phase === "canary" ? "5-host canary" : "removal on the remaining hosts") };
    }
    if (a.status === "done") return { ok: false, msg: "Already done." };
    a.status = "done"; a.doneBy = who; return { ok: true, msg: a.effect };
  }
  // Host outcomes for a phase (the UI animates them)
  function hostsFor(a, people, phase) {
    const ids = a.targets.slice();
    const canary = ids.filter(id => !people[id].admin && people[id].online).slice(0, 5);
    return phase === "canary" ? canary : ids.filter(id => !canary.includes(id));
  }
  function settle(a, people, ids) { ids.forEach(id => { a.hosts[id] = people[id].online ? "removed" : "pending"; }); }
  function scan(a) {
    if (a.kind !== "remove" || a.phase !== "remaining") return { ok: false, msg: "Run the removal before tomorrow's scan." };
    let v = 0, p = 0; Object.keys(a.hosts).forEach(id => { if (a.hosts[id] === "removed") { a.hosts[id] = "verified"; } if (a.hosts[id] === "verified") v++; if (a.hosts[id] === "pending") p++; });
    a.scanned = true; return { ok: true, verified: v, pending: p, msg: "Oct 27 scan: " + v + " verified, " + p + " pending" };
  }
  function draft(a, people) {
    const app = D.APPS.find(x => x.id === a.app), rule = D.RULES[a.rule];
    const alt = a.app === "sheetsage" ? "Microsoft 365 Copilot in Excel" : a.app === "notehawk" ? "Teams meeting recap (Copilot)" : a.app === "modelbox" ? "the approved internal model sandbox" : a.app === "tabgenie" ? "Microsoft 365 Copilot" : "an enterprise seat on an approved tool";
    const when = rule.grace ? "by " + (a.rule === "BL-05" ? "Nov 2" : "Nov 9") : "today";
    const subj = rule.grace ? "Action needed " + when + ": " + (app ? app.name : "AI subscription") + " and our AI policy" : (app ? app.name : "AI tool") + " has been blocked for your account";
    const body = "Hi,\n\nOur security tools saw " + (app ? app.name : "an AI subscription") + " in use on your account. Our AI Governance Committee doesn't allow it (" + a.rule + ": " + rule.name.toLowerCase() + ").\n\n" +
      "Why it matters: " + D.RULE_RATIONALE[a.rule] + "\n\nWhat to use instead: " + alt + ".\n\n" + (rule.grace ? "Please stop using it " + when + ". After that, " + rule.playbook.split("→").pop().trim().toLowerCase() + "." : "Access is blocked now, and the security team will follow up about the data that was shared.") +
      "\n\nIf you need it for your work, request an exception or a vendor review (link). Your manager is copied.\n\nAI Governance team";
    a.drafted = true; a.subject = subj; a.body = body; return { subj, body };
  }

  root.RS = { build, needsTwo, approve, execute, hostsFor, settle, scan, draft };
})(typeof window !== "undefined" ? window : globalThis);
