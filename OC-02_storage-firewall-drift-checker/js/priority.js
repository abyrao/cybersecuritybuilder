/* OC-02 · priority: impact × likelihood (5 × 5), with the reasons behind each point. Pure. */
(function (root) {
  const B = root.B, DR = root.DR, DAY = 864e5;
  const CLS = { restricted: 5, confidential: 4, internal: 2, public: 1 };
  const ADMIN_DB = ["NET-01", "NET-02", "NET-03", "NET-04", "NET-06", "NET-20", "STG-03"];
  const BASE = { "STG-01": 5, "STG-02": 5, "STG-03": 5, "STG-19": 5, "STG-20": 5, "STG-15": 4, "STG-13": 4, "STG-14": 4, "STG-16": 4, "NET-05": 3, "NET-14": 4, "NET-16": 2, "NET-17": 3 };
  const BANDS = [["P1", 20, 48, "48 hours"], ["P2", 12, 168, "7 days"], ["P3", 6, 720, "30 days"], ["P4", 1, 2160, "90 days"]];
  const ageDays = (since, today) => since ? Math.round((Date.parse(today) - Date.parse(since)) / DAY) : 0;

  function score(res, drift, today) {
    const c = DR.CTRL[drift.controlId], why = [];
    let imp = CLS[res.classification] || 2; why.push({ k: "Impact", t: res.classification.charAt(0).toUpperCase() + res.classification.slice(1) + " data" + (res.domain === "network" ? " reachable" : "") + " → " + imp });
    if (res.tier === 1 && imp < 4) { imp = 4; why.push({ k: "Impact", t: "Tier 1 application → at least 4" }); }
    else if (res.tier === 2 && imp < 3) { imp = 3; why.push({ k: "Impact", t: "Tier 2 application → at least 3" }); }
    if (res.env === "nonprod") { imp = Math.max(1, imp - 1); why.push({ k: "Impact", t: "Non-production → −1" }); }
    let lik;
    if (c.path === "exposure") {
      if (drift.rule) { const cidr = drift.rule.cidr; lik = (cidr === "0.0.0.0/0" || cidr === "::/0") ? 5 : DR.isPrivate(cidr) ? 2 : 4;
        why.push({ k: "Likelihood", t: (lik === 5 ? "Open to the internet" : lik === 4 ? "Open to a broad public range" : "Private range only") + " → " + lik }); }
      else { lik = BASE[c.id] || 3; why.push({ k: "Likelihood", t: (lik === 5 ? "Anonymous or public access" : lik === 4 ? "Reachable beyond our network or by shared credentials" : lik === 3 ? "Reachable inside the network" : "Peered network only") + " → " + lik }); }
    } else { lik = 1; why.push({ k: "Likelihood", t: "Hygiene control, not directly reachable → 1" }); }
    if (ADMIN_DB.includes(c.id)) { lik++; why.push({ k: "Likelihood", t: "Admin or database port, or anonymous write → +1" }); }
    if (c.path === "exposure" && (res.jit || res.privateEndpoint)) { lik--; why.push({ k: "Likelihood", t: (res.jit ? "Just-in-time access" : "Private endpoint") + " → −1" }); }
    const age = ageDays(drift.since, today);
    if (age > 30) { lik++; why.push({ k: "Likelihood", t: "Drifted " + age + " days → +1" }); }
    lik = Math.max(1, Math.min(5, lik));
    const risk = imp * lik, band = BANDS.find(b => risk >= b[1]);
    return { impact: imp, likelihood: lik, risk, priority: band[0], sla: band[3], slaHours: band[2], age, why };
  }
  root.PR = { score, BANDS, CLS };
})(typeof window !== "undefined" ? window : globalThis);
