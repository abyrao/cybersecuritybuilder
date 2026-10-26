// BC-01 · Fictional data only. Does not represent any organization.
// 20 quarters: index 0 = Q4 2021, index 19 = Q3 2026 (current quarter).

(function () {
  const QUARTERS = 20;
  const CURRENT = QUARTERS - 1;

  function quarterLabel(i) {
    const q = ((3 + i) % 4) + 1;
    const y = 2021 + Math.floor((3 + i) / 4);
    return "Q" + q + " " + y;
  }

  // Score keyframes (score out of 25 = likelihood x impact), linearly interpolated.
  const RISKS = [
    { id: "ai", name: "AI security", short: "AI security", impact: 5, color: "#FFB547",
      keys: [[0, 4], [6, 6], [10, 10], [14, 14], [17, 17], [18, 18], [19, 20]] },
    { id: "iam", name: "Identity and access", short: "Identity", impact: 5, color: "#4FD1C5",
      keys: [[0, 14], [8, 15], [14, 17], [18, 19], [19, 18]] },
    { id: "cloud", name: "Cloud security", short: "Cloud", impact: 4, color: "#7AA2FF",
      keys: [[0, 12], [8, 14], [14, 15], [18, 16], [19, 16.5]] },
    { id: "vuln", name: "Vulnerability management", short: "Vulnerabilities", impact: 4, color: "#B8E986",
      keys: [[0, 15], [8, 14], [14, 15], [18, 15], [19, 15]] },
    { id: "code", name: "Secure code", short: "Secure code", impact: 4, color: "#FF7A90",
      keys: [[0, 8], [10, 10], [14, 11], [18, 12], [19, 13.5]] },
    { id: "ransom", name: "Ransomware readiness", short: "Ransomware", impact: 5, color: "#5E7A92",
      keys: [[0, 19], [4, 18], [8, 16], [12, 13], [16, 11], [19, 9]] },
    { id: "third", name: "Third-party risk", short: "Third parties", impact: 4, color: "#6F8AA0",
      keys: [[0, 13], [6, 15], [10, 16], [14, 14], [18, 13.6], [19, 12.5]] },
    { id: "phish", name: "Phishing and social engineering", short: "Phishing", impact: 4, color: "#526C83",
      keys: [[0, 17], [6, 15], [10, 13], [14, 12], [19, 10]] }
  ];

  function interp(keys, i) {
    for (let k = 0; k < keys.length - 1; k++) {
      const [x0, y0] = keys[k], [x1, y1] = keys[k + 1];
      if (i >= x0 && i <= x1) return y0 + (y1 - y0) * ((i - x0) / (x1 - x0));
    }
    return keys[keys.length - 1][1];
  }

  RISKS.forEach(r => {
    r.scores = [];
    for (let i = 0; i < QUARTERS; i++) r.scores.push(Math.round(interp(r.keys, i) * 10) / 10);
  });

  // Rank of every risk in every quarter (1 = highest). Ties break by fixed order.
  const RANKS = [];
  for (let i = 0; i < QUARTERS; i++) {
    const order = RISKS.map((r, idx) => ({ id: r.id, s: r.scores[i], idx }))
      .sort((a, b) => b.s - a.s || a.idx - b.idx);
    const map = {};
    order.forEach((o, n) => { map[o.id] = n + 1; });
    RANKS.push(map);
  }

  function topFive(i) {
    return RISKS.filter(r => RANKS[i][r.id] <= 5)
      .sort((a, b) => RANKS[i][a.id] - RANKS[i][b.id]);
  }

  // Current-quarter detail for the five current risks.
  const DETAIL = {
    ai: {
      benchmark: 17,
      indicators: [
        { label: "Unreviewed AI tools", tip: "AI tools in use without a security review", now: 34, prev: 21, unit: "", worseIsUp: true },
        { label: "AI cases assessed", tip: "AI use cases with an approved risk assessment", now: 41, prev: 38, unit: "%", worseIsUp: false }
      ],
      progress: 35,
      next: "AI intake review for every new tool", nextWhen: "Q4 2026"
    },
    iam: {
      benchmark: 16,
      indicators: [
        { label: "Admins without MFA", tip: "Privileged accounts without multi-factor authentication", now: 12, prev: 19, unit: "", worseIsUp: true },
        { label: "Orphaned accounts", tip: "Accounts still active after the employee left", now: 48, prev: 61, unit: "", worseIsUp: true }
      ],
      progress: 70,
      next: "MFA on all privileged accounts", nextWhen: "Q4 2026"
    },
    cloud: {
      benchmark: 17,
      indicators: [
        { label: "Critical misconfigs", tip: "Open critical cloud misconfigurations", now: 27, prev: 31, unit: "", worseIsUp: true },
        { label: "Baseline coverage", tip: "Cloud accounts on the security baseline", now: 82, prev: 76, unit: "%", worseIsUp: false }
      ],
      progress: 60,
      next: "Baseline on all new cloud accounts", nextWhen: "Q1 2027"
    },
    vuln: {
      benchmark: 14,
      indicators: [
        { label: "Criticals past SLA", tip: "Critical vulnerabilities past their fix deadline", now: 63, prev: 58, unit: "", worseIsUp: true },
        { label: "Days to fix", tip: "Average days to fix a critical vulnerability", now: 21, prev: 19, unit: " days", worseIsUp: true }
      ],
      progress: 55,
      next: "Internet-facing criticals fixed in 7 days", nextWhen: "Q1 2027"
    },
    code: {
      benchmark: 12,
      indicators: [
        { label: "Risky releases", tip: "Releases shipped with high-severity findings", now: 9, prev: 6, unit: "%", worseIsUp: true },
        { label: "Repos scanned", tip: "Code repositories with automated scanning", now: 74, prev: 70, unit: "%", worseIsUp: false }
      ],
      progress: 40,
      next: "Scan before every release", nextWhen: "Q2 2027"
    }
  };

  // Business roadmap the board already knows (fictional).
  const MILESTONES = [
    { q: 2, label: "Cloud migration", full: "Cloud migration begins", risks: ["cloud", "iam"] },
    { q: 5, label: "Acquisition", full: "Regional acquisition closes", risks: ["third", "iam"] },
    { q: 8, label: "Customer portal", full: "Customer self-service portal launches", risks: ["code", "vuln"] },
    { q: 11, label: "AI in product", full: "First AI features ship in the product", risks: ["ai", "code"] },
    { q: 14, label: "EU expansion", full: "Expansion into the EU market", risks: ["cloud", "third"] },
    { q: 17, label: "AI support agents", full: "AI agents launch for customer support", risks: ["ai", "iam"] }
  ];
  const UPCOMING = [
    { when: "Q4 2026", label: "AI assistant rollout", full: "AI assistant rolls out to all employees", risks: ["ai", "iam"] },
    { when: "Q2 2027", label: "New cloud region", full: "New cloud region goes live", risks: ["cloud", "vuln"] }
  ];

  window.BC01 = { QUARTERS, CURRENT, quarterLabel, RISKS, RANKS, topFive, DETAIL, MILESTONES, UPCOMING };
})();
