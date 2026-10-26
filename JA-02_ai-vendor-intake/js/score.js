/* JA-02 · risk score, floor rules, tier and path. Pure functions. */
(function (root) {
  const ORDER = ["Low", "Medium", "High", "Critical", "Prohibited"];
  const BANDS = [["Critical", 70], ["High", 50], ["Medium", 25], ["Low", 0]];
  const PTS = {
    data: { none: 0, internal: 10, confidential: 20, pii: 25, regulated: 30 },
    role: { assistive: 0, external: 5, actions: 15, decisions: 25 },
    connection: { web: 0, sso: 3, api: 8, calendar: 12 },
    training: { "none": 0, "retention30": 5, "trains-optout": 15, "trains-noopt": 25 }
  };
  const PATH = {
    Low: { path: "Fast track", evidence: ["Requester attestation"], reviewers: [], reassess: "Every 3 years or at renewal", monitor: "Annual attestation", days: 0 },
    Medium: { path: "Standard review", evidence: ["Short AI questionnaire", "SOC 2 or ISO 27001"], reviewers: ["Security"], reassess: "Every 2 years", monitor: "Annual recon refresh", days: 5 },
    High: { path: "Full review", evidence: ["Full questionnaire", "SOC 2 Type II", "Data processing agreement", "Model and training-data details"], reviewers: ["Security", "Privacy", "Legal"], reassess: "Every 12 months", monitor: "Recon refresh every 6 months", days: 10 },
    Critical: { path: "Committee", evidence: ["Full questionnaire", "SOC 2 Type II", "Data processing agreement", "Model and training-data details", "Pen test summary", "AI evaluation results", "Exit plan"], reviewers: ["Security", "Privacy", "Legal", "AI Governance Committee"], reassess: "Every 12 months", monitor: "Continuous recon, quarterly check-in", days: 15 },
    Prohibited: { path: "Blocked", evidence: [], reviewers: [], reassess: "Not applicable", monitor: "Not applicable", days: 0 }
  };
  const max = (a, b) => ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b;

  function score(answers, eff, opts) {
    const o = opts || {};
    const f = [];
    f.push({ k: "Data", v: PTS.data[answers.data], why: "Data we'd send: " + answers.data });
    f.push({ k: "Training", v: PTS.training[eff.training], why: "Vendor's use of our data: " + eff.training });
    f.push({ k: "AI role", v: PTS.role[answers.role], why: "How we'd use it: " + answers.role });
    f.push({ k: "Connection", v: PTS.connection[answers.connection], why: "How it connects: " + answers.connection });
    if (eff.soc2 === "current") f.push({ k: "SOC 2", v: -5, why: "Current SOC 2 Type II report" });
    else f.push({ k: "Attestation", v: 10, why: "No current attestation (SOC 2 " + eff.soc2 + ")" });
    if (eff.iso42001) f.push({ k: "ISO 42001", v: -5, why: "AI management system certified" });
    if (eff.incidents > 0) f.push({ k: "Incident", v: 10, why: "Security incident in the last 24 months" });
    if (!eff.modelDisclosed) f.push({ k: "Model provider", v: 5, why: "Model provider not disclosed" });
    if (answers.users > 500) f.push({ k: "Scale", v: 5, why: "More than 500 users" });
    const points = Math.max(0, Math.min(100, f.reduce((a, x) => a + x.v, 0)));
    const scoreTier = BANDS.find(([, m]) => points >= m)[0];

    const floors = [];
    if (o.blocked) floors.push({ tier: "Prohibited", why: "On the committee blocklist", basis: "Committee decision (JA-01)" });
    if (answers.critical === "yes") floors.push({ tier: "Critical", why: "Supports a critical activity", basis: "US interagency guidance (2023)" });
    if (answers.role === "actions") floors.push({ tier: "High", why: "Takes actions in our systems", basis: "Common tiering: system access" });
    if (answers.role === "decisions") floors.push({ tier: "High", why: "Affects decisions about people", basis: "EU AI Act high-risk (employment); NYC LL144", committee: true });
    if (answers.data === "regulated") floors.push({ tier: "High", why: "Regulated personal data", basis: "Common tiering: regulatory exposure" });
    if (eff.training === "trains-noopt") floors.push({ tier: "High", why: "Trains on our data with no opt-out", basis: "NIST AI RMF GOVERN 6" });
    if (answers.data === "pii" || answers.role === "external") floors.push({ tier: "Medium", why: answers.data === "pii" ? "Customer or employee PII" : "AI content shown outside", basis: "Common tiering; EU AI Act transparency" });

    let tier = scoreTier; floors.forEach(x => { tier = max(tier, x.tier); });
    const committee = tier === "Critical" || floors.some(x => x.committee);
    const route = Object.assign({}, PATH[tier]);
    if (committee && tier !== "Critical" && tier !== "Prohibited") { route.path = "Full review + committee"; route.reviewers = route.reviewers.concat(["AI Governance Committee"]); }
    if (answers.role === "decisions") route.evidence = route.evidence.concat(["Independent bias audit (within 12 months)"]);
    return { factors: f, points, scoreTier, floors, tier, committee, route };
  }

  root.S = { score, ORDER, BANDS, PTS, PATH };
})(typeof window !== "undefined" ? window : globalThis);
