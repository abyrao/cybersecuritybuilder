// OC-01 · SOC 2 Audit Evidence Collector · fictional data only.
// Does not represent any organization. Control titles are short paraphrases written for this demo.
(function () {
  // ---------- seeded random (same data every run) ----------
  let seed = 20261026;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const hex = n => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(rnd() * 16)]).join("");

  // ---------- dates ----------
  const day = s => new Date(s + "T12:00:00");
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = day(s); d.setDate(d.getDate() + n); return iso(d); };
  const AUDIT = {
    name: "SOC 2 Type II · FY2026",
    periodStart: "2025-10-01", periodEnd: "2026-09-30",
    fieldStart: "2026-10-05", fieldEnd: "2026-11-13", today: "2026-10-26",
    firm: "Brightline Assurance (fictional external auditor)",
    lead: "Priya Nair"
  };

  const PEOPLE = {
    nb: { name: "Nina Brooks", team: "HR" }, km: { name: "Kate Morgan", team: "GRC" }, je: { name: "Jordan Ellis", team: "Identity" },
    sp: { name: "Sam Patel", team: "Cloud Ops" }, ac: { name: "Ava Chen", team: "Security Ops" }, lr: { name: "Luis Romero", team: "IT Ops" },
    oh: { name: "Omar Haddad", team: "Engineering" }, bo: { name: "Ben Okafor", team: "Vendor Mgmt" }, gk: { name: "Grace Kim", team: "Legal & Privacy" },
    pn: { name: "Priya Nair", team: "Internal Audit" }
  };
  const AUDITORS = ["Priya Nair", "Marcus Lee", "Dana Ortiz"];

  const SOURCES = {
    okta: { name: "Okta", auto: true }, aws: { name: "AWS Config", auto: true }, gh: { name: "GitHub", auto: true },
    jira: { name: "Jira", auto: true }, wd: { name: "Workday", auto: true }, cs: { name: "CrowdStrike", auto: true },
    snow: { name: "ServiceNow", auto: true }, conf: { name: "Confluence", auto: true }, spl: { name: "Splunk", auto: true },
    kb: { name: "KnowBe4", auto: true }, vs: { name: "Vuln scanner", auto: true }, bkp: { name: "AWS Backup", auto: true },
    up: { name: "Owner upload", auto: false }
  };

  const CATEGORIES = [
    { id: "CC1", name: "Control environment" }, { id: "CC2", name: "Communication" }, { id: "CC3", name: "Risk assessment" },
    { id: "CC4", name: "Monitoring" }, { id: "CC5", name: "Control activities" }, { id: "CC6", name: "Logical access" },
    { id: "CC7", name: "System operations" }, { id: "CC8", name: "Change management" }, { id: "CC9", name: "Risk mitigation" },
    { id: "A1", name: "Availability" }, { id: "C1", name: "Confidentiality" }
  ];

  // [id, criteria, title, owner, frequency, test, sample, evidence: [name, type, source]]
  const C = [
    ["CC1.1-01", "CC1.1", "Code of conduct acknowledged", "nb", "Annual", "Inspection", 25, [["Code of conduct v4.2.pdf", "policy", "conf"], ["Acknowledgement report.csv", "export", "wd"], ["New hire acknowledgement sample.csv", "export", "wd"]]],
    ["CC1.3-01", "CC1.3", "Security roles defined", "km", "Annual", "Inspection", 1, [["Security org chart.pdf", "policy", "conf"], ["RACI matrix.xlsx", "export", "up"]]],
    ["CC1.4-01", "CC1.4", "Background checks for hires", "nb", "Per hire", "Inspection", 25, [["Hire population.csv", "export", "wd"], ["Background check results sample.pdf", "report", "up"], ["Screening policy.pdf", "policy", "conf"]]],
    ["CC1.5-01", "CC1.5", "Security goals in reviews", "nb", "Annual", "Inspection", 15, [["Review template.pdf", "policy", "conf"], ["Completed reviews sample.csv", "export", "wd"]]],
    ["CC2.1-01", "CC2.1", "Monthly security metrics to leaders", "km", "Monthly", "Inspection", 4, [["Security metrics deck Mar.pdf", "report", "conf"], ["Security metrics deck Jun.pdf", "report", "conf"], ["Distribution list.png", "screenshot", "up"]]],
    ["CC2.2-01", "CC2.2", "Security awareness training", "ac", "Annual", "Inspection", 40, [["Training completion.csv", "export", "kb"], ["Course outline.pdf", "policy", "kb"], ["Overdue follow-ups.csv", "export", "kb"]]],
    ["CC2.3-01", "CC2.3", "Customer security commitments", "gk", "Annual", "Inspection", 1, [["Trust center page.png", "screenshot", "up"], ["Customer contract template.pdf", "policy", "conf"]]],
    ["CC3.1-01", "CC3.1", "Annual risk assessment", "km", "Annual", "Inspection", 1, [["Risk assessment 2026.pdf", "report", "conf"], ["Leadership sign-off.pdf", "report", "up"]]],
    ["CC3.2-01", "CC3.2", "Risk register reviewed quarterly", "km", "Quarterly", "Inspection", 4, [["Risk register export.csv", "export", "jira"], ["Q1 review minutes.pdf", "report", "conf"], ["Q2 review minutes.pdf", "report", "conf"], ["Q3 review minutes.pdf", "report", "conf"]]],
    ["CC3.4-01", "CC3.4", "Fraud risk considered", "km", "Annual", "Inquiry", 1, [["Fraud risk worksheet.xlsx", "export", "up"]]],
    ["CC4.1-01", "CC4.1", "Control self-assessment", "pn", "Semiannual", "Inspection", 2, [["Self-assessment H1.xlsx", "export", "up"], ["Self-assessment H2.xlsx", "export", "up"]]],
    ["CC4.2-01", "CC4.2", "Deficiencies tracked to closure", "km", "Ongoing", "Inspection", 10, [["Remediation tickets.csv", "ticket", "jira"], ["Closure evidence sample.pdf", "report", "jira"]]],
    ["CC5.2-01", "CC5.2", "IT general controls policy", "km", "Annual", "Inspection", 1, [["ITGC policy v3.pdf", "policy", "conf"]]],
    ["CC5.3-01", "CC5.3", "Policies reviewed annually", "km", "Annual", "Inspection", 12, [["Policy index with review dates.csv", "export", "conf"], ["Approval history.png", "screenshot", "conf"]]],
    ["CC6.1-01", "CC6.1", "MFA enforced for workforce SSO", "je", "Continuous", "Inspection", 1, [["MFA policy config.json", "config", "okta"], ["Users without MFA.csv", "export", "okta"], ["Sign-on policy rules.png", "screenshot", "okta"]]],
    ["CC6.1-02", "CC6.1", "Production access by approved role", "sp", "Continuous", "Inspection", 1, [["IAM role policies.json", "config", "aws"], ["Production account access list.csv", "export", "aws"], ["Q2 user access review.csv", "export", "okta"]]],
    ["CC6.2-01", "CC6.2", "Access approved before granted", "je", "Per request", "Inspection", 40, [["Access request population.csv", "ticket", "snow"], ["Approval sample.csv", "ticket", "snow"], ["Provisioning log.csv", "log", "okta"]]],
    ["CC6.2-02", "CC6.2", "Access removed within 24 hours", "je", "Per termination", "Reperformance", 25, [["Termination population.csv", "export", "wd"], ["Deprovisioning log.csv", "log", "okta"], ["Timing comparison.csv", "export", "up"]]],
    ["CC6.3-01", "CC6.3", "Quarterly user access reviews", "je", "Quarterly", "Inspection", 4, [["Q2 user access review.csv", "export", "okta"], ["Q3 user access review.csv", "export", "okta"], ["Reviewer sign-offs.pdf", "report", "okta"], ["Revocation tickets.csv", "ticket", "snow"]]],
    ["CC6.3-02", "CC6.3", "Privileged access reviewed", "je", "Quarterly", "Inspection", 4, [["Admin role inventory.csv", "export", "aws"], ["Q2 user access review.csv", "export", "okta"], ["Privileged review Q3.pdf", "report", "up"]]],
    ["CC6.6-01", "CC6.6", "Network boundaries protected", "sp", "Continuous", "Inspection", 1, [["Security group rules.json", "config", "aws"], ["WAF configuration.json", "config", "aws"]]],
    ["CC6.7-01", "CC6.7", "Encryption in transit", "sp", "Continuous", "Inspection", 1, [["Load balancer TLS policies.json", "config", "aws"], ["TLS scan results.csv", "report", "vs"]]],
    ["CC6.7-02", "CC6.7", "Encryption at rest", "sp", "Continuous", "Inspection", 1, [["Storage encryption status.csv", "export", "aws"], ["Database encryption config.json", "config", "aws"], ["Key rotation settings.json", "config", "aws"]]],
    ["CC6.8-01", "CC6.8", "Endpoint protection deployed", "ac", "Continuous", "Inspection", 1, [["Sensor coverage report.csv", "export", "cs"], ["Prevention policy.json", "config", "cs"], ["Device inventory reconciliation.csv", "export", "up"]]],
    ["CC7.1-01", "CC7.1", "Weekly vulnerability scans", "ac", "Weekly", "Inspection", 12, [["Scan schedule.png", "screenshot", "vs"], ["Scan history.csv", "export", "vs"], ["Critical findings aging.csv", "export", "vs"]]],
    ["CC7.1-02", "CC7.1", "Configuration baselines monitored", "sp", "Continuous", "Inspection", 1, [["Config rules compliance.csv", "export", "aws"], ["Drift alerts sample.csv", "log", "aws"]]],
    ["CC7.2-01", "CC7.2", "Security events monitored", "ac", "Continuous", "Inspection", 1, [["Log source inventory.csv", "export", "spl"], ["Alert rules.json", "config", "spl"], ["On-call schedule.png", "screenshot", "up"]]],
    ["CC7.3-01", "CC7.3", "Incidents triaged per runbook", "ac", "Per incident", "Inspection", 10, [["Incident tickets.csv", "ticket", "jira"], ["Triage runbook.pdf", "policy", "conf"]]],
    ["CC7.4-01", "CC7.4", "Incident plan tested", "ac", "Annual", "Inspection", 1, [["Tabletop exercise report.pdf", "report", "conf"], ["Attendee list.csv", "export", "up"]]],
    ["CC7.5-01", "CC7.5", "Post-incident reviews done", "ac", "Per incident", "Inspection", 3, [["Post-incident review sample.pdf", "report", "conf"], ["Action items tracker.csv", "ticket", "jira"]]],
    ["CC8.1-01", "CC8.1", "Code reviewed before merge", "oh", "Per change", "Inspection", 40, [["Branch protection rules.json", "config", "gh"], ["Merged pull requests.csv", "export", "gh"], ["Review sample.csv", "export", "gh"]]],
    ["CC8.1-02", "CC8.1", "Deploys need approved change", "oh", "Per deploy", "Reperformance", 40, [["Production deploy log.csv", "log", "gh"], ["Change tickets.csv", "ticket", "jira"], ["Deploy-to-ticket match.csv", "export", "up"]]],
    ["CC8.1-03", "CC8.1", "Emergency changes reviewed", "lr", "Per change", "Inspection", 5, [["Emergency change tickets.csv", "ticket", "snow"], ["CAB review notes.pdf", "report", "conf"]]],
    ["CC9.1-01", "CC9.1", "Business continuity plan reviewed", "lr", "Annual", "Inspection", 1, [["Continuity plan v6.pdf", "policy", "conf"], ["Plan approval.pdf", "report", "up"]]],
    ["CC9.2-01", "CC9.2", "Critical vendors reviewed", "bo", "Annual", "Inspection", 12, [["Vendor inventory.csv", "export", "snow"], ["Vendor SOC 2 reports.zip", "report", "up"], ["Vendor risk ratings.csv", "export", "snow"]]],
    ["CC9.2-02", "CC9.2", "Vendor contracts have security terms", "gk", "Per contract", "Inspection", 10, [["Contract clause sample.pdf", "policy", "up"], ["Contract list.csv", "export", "snow"]]],
    ["A1.1-01", "A1.1", "Capacity monitored", "sp", "Continuous", "Inspection", 1, [["Capacity dashboard.png", "screenshot", "aws"], ["Scaling alerts.csv", "log", "aws"]]],
    ["A1.2-01", "A1.2", "Daily backups monitored", "lr", "Daily", "Inspection", 25, [["Backup job history.csv", "log", "bkp"], ["Backup policy.json", "config", "bkp"], ["Failure alerts.csv", "log", "bkp"]]],
    ["A1.3-01", "A1.3", "Restore tested quarterly", "lr", "Quarterly", "Inspection", 4, [["Restore test Q2.pdf", "report", "up"], ["Restore test Q3.pdf", "report", "up"]]],
    ["C1.1-01", "C1.1", "Confidential data classified", "gk", "Ongoing", "Inspection", 1, [["Data classification policy.pdf", "policy", "conf"], ["Labeling coverage.csv", "export", "up"]]],
    ["C1.2-01", "C1.2", "Data disposed per schedule", "gk", "Quarterly", "Inspection", 4, [["Retention schedule.pdf", "policy", "conf"], ["Disposal certificates.pdf", "report", "up"]]]
  ];

  const controls = C.map(([id, crit, title, owner, freq, test, sample, ev]) => ({
    id, crit, cat: crit.replace(/\..*$/, ""), title, owner, freq, test, sample, evNames: ev
  }));

  // ---------- evidence register ----------
  const evidence = [];
  let n = 1;
  const reused = {}; // name -> first evidence id (same file used by several controls)
  controls.forEach(c => {
    c.evidence = [];
    c.evNames.forEach(([name, type, src]) => {
      const r = rnd();
      let status = r < 0.58 ? "accepted" : r < 0.72 ? "review" : r < 0.82 ? "collected" : r < 0.94 ? "requested" : "open";
      if (!SOURCES[src].auto && status === "collected") status = "requested";
      const requestedOn = addDays(AUDIT.fieldStart, Math.floor(rnd() * 12) - 6);
      const due = addDays(requestedOn, 7 + Math.floor(rnd() * 8));
      const collectedOn = status === "requested" || status === "open" ? null : addDays(requestedOn, SOURCES[src].auto ? 0 : 1 + Math.floor(rnd() * 6));
      const e = {
        id: "EV-" + String(n++).padStart(4, "0"), control: c.id, name, type, src, status,
        requestedOn: status === "open" ? null : requestedOn, due: status === "open" ? null : due, collectedOn,
        by: collectedOn ? (SOURCES[src].auto ? "Auto · " + SOURCES[src].name : PEOPLE[c.owner].name) : null,
        reviewer: status === "accepted" || status === "review" ? pick(AUDITORS) : null,
        hash: collectedOn ? "sha256:" + hex(8) + "…" + hex(4) : null,
        coverage: collectedOn ? "Oct 1, 2025 – Sep 30, 2026" : null,
        stale: false, reuseOf: null, note: null
      };
      if (status === "requested") e.due = addDays(AUDIT.today, 1 + Math.floor(rnd() * 9));
      if (reused[name]) { e.reuseOf = reused[name]; } else reused[name] = e.id;
      evidence.push(e); c.evidence.push(e.id);
    });
  });
  const ev = id => evidence.find(e => e.id === id);
  const byName = (ctrl, name) => evidence.find(e => e.control === ctrl && e.name === name);

  // ---------- story overrides ----------
  // 1. One Okta access review export reused across controls (the "aha" for reuse).
  ["CC6.1-02", "CC6.3-01", "CC6.3-02"].forEach(cid => {
    const e = byName(cid, "Q2 user access review.csv");
    Object.assign(e, { status: "accepted", collectedOn: "2026-10-02", by: "Auto · Okta", hash: "sha256:4be19c07…a3f2", reviewer: "Marcus Lee", requestedOn: "2026-10-01", due: "2026-10-08" });
  });
  // 2. Exceptions with a shared root cause (contractors offboarded outside Workday).
  Object.assign(byName("CC6.2-02", "Timing comparison.csv"), { status: "exception", collectedOn: "2026-10-14", by: "Jordan Ellis", reviewer: "Dana Ortiz",
    hash: "sha256:91d0e44a…07bc", note: "4 of 25 sampled terminations kept Okta access 2–6 days. 2 are contractors not in Workday." });
  Object.assign(byName("CC6.3-02", "Admin role inventory.csv"), { status: "exception", collectedOn: "2026-10-09", by: "Auto · AWS Config", reviewer: "Marcus Lee",
    hash: "sha256:c7e2a915…5d10", note: "1 AWS admin role still assigned to a contractor who left in Q2; missed in the Q2 review." });
  Object.assign(byName("CC8.1-02", "Deploy-to-ticket match.csv"), { status: "exception", collectedOn: "2026-10-16", by: "Omar Haddad", reviewer: "Priya Nair",
    hash: "sha256:3a6f0d82…e9a4", note: "2 of 40 sampled production deploys had no approved change ticket." });
  // 3. Stale evidence: collected but dated before the audit period.
  [["CC5.3-01", "Approval history.png"], ["CC1.3-01", "Security org chart.pdf"], ["A1.1-01", "Capacity dashboard.png"]].forEach(([cid, name]) => {
    Object.assign(byName(cid, name), { status: "review", stale: true, coverage: "Dated before Oct 1, 2025", collectedOn: "2026-10-12", by: byName(cid, name).by || "Auto", reviewer: "Dana Ortiz", hash: "sha256:" + hex(8) + "…" + hex(4) });
  });
  // 4. A few clearly overdue manual requests.
  [["CC9.2-01", "Vendor SOC 2 reports.zip"], ["A1.3-01", "Restore test Q3.pdf"], ["CC4.1-01", "Self-assessment H2.xlsx"], ["C1.2-01", "Disposal certificates.pdf"]].forEach(([cid, name], i) => {
    Object.assign(byName(cid, name), { status: "requested", requestedOn: "2026-10-06", due: ["2026-10-16", "2026-10-19", "2026-10-21", "2026-10-22"][i], collectedOn: null, by: null, hash: null, coverage: null, reviewer: null });
  });

  // ---------- burndown (open evidence items per day) ----------
  const total = evidence.length;
  const fieldDays = Math.round((day(AUDIT.fieldEnd) - day(AUDIT.fieldStart)) / 864e5);
  const doneNow = evidence.filter(e => e.status === "accepted" || e.status === "exception").length;
  const elapsed = Math.round((day(AUDIT.today) - day(AUDIT.fieldStart)) / 864e5);
  const burn = [];
  for (let i = 0; i <= elapsed; i++) {
    const t = i / elapsed;
    const done = Math.round(doneNow * (0.36 + 0.64 * Math.pow(t, 1.1)) + (i > 0 && i < elapsed ? (rnd() - 0.5) * 3 : 0));
    burn.push({ date: addDays(AUDIT.fieldStart, i), open: total - Math.min(doneNow, Math.max(0, done)) });
  }
  burn[0].open = total - Math.round(doneNow * 0.36);
  burn[burn.length - 1].open = total - doneNow;

  window.OC01 = { AUDIT, PEOPLE, AUDITORS, SOURCES, CATEGORIES, controls, evidence, ev, burn, total, fieldDays, day, addDays, rnd, hex };
})();
