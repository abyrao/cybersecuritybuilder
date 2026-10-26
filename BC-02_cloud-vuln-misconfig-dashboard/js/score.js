/* BC-02 · risk scoring. Pure functions so they can move to a real pipeline unchanged. */
(function (root) {
  const SEV = { Critical: 10, High: 6, Medium: 3, Low: 1 };
  const ASSET = { "prod-t1": 2.0, prod: 1.4, nonprod: 0.6 };
  const MAX = 10 * 2 * 1.5 * 2 * 1.5; // 90 points = score 100
  const BANDS = [["Critical", 70], ["High", 40], ["Medium", 15], ["Low", 0]];

  function factors(f, account) {
    return [
      { k: "Severity", v: SEV[f.sev], t: f.sev + " from " + (f.kind === "vuln" ? "the scanner" : "the posture tool") },
      { k: "Exposure", v: f.exposed ? 2.0 : 1.0, t: f.exposed ? "Reachable from the internet" : "Internal only" },
      { k: "Exploit", v: f.exploit ? 1.5 : 1.0, t: f.exploit ? (f.kind === "vuln" ? "On the CISA KEV list" : "Exploitable with no credentials") : "No known exploit" },
      { k: "Asset", v: ASSET[account.env], t: account.env === "prod-t1" ? "Revenue-critical production" : account.env === "prod" ? "Production" : "Non-production" },
      { k: "Data", v: account.sensitive ? 1.5 : 1.0, t: account.sensitive ? "Holds sensitive data" : "No sensitive data" }
    ];
  }
  function score(f, account) {
    const p = factors(f, account).reduce((a, x) => a * x.v, 1);
    return Math.min(100, Math.round(p / MAX * 100));
  }
  function band(s) { return BANDS.find(([, min]) => s >= min)[0]; }

  root.S = { SEV, ASSET, MAX, BANDS, factors, score, band };
})(typeof window !== "undefined" ? window : globalThis);
