/* OC-02 · drift engine: which controls apply, deviation (0–1) per control, resource drift score and conformance. Pure. */
(function (root) {
  const B = root.B, CTRL = Object.fromEntries(B.CONTROLS.map(c => [c.id, c]));
  const PRIVATE = ["10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.2", "172.30.", "172.31.", "192.168.", "100.64."];
  const isPrivate = cidr => PRIVATE.some(p => cidr.startsWith(p));
  const prefix = cidr => +cidr.split("/")[1];
  const addresses = cidr => cidr.includes(":") ? Math.pow(2, 128 - prefix(cidr)) : Math.pow(2, 32 - prefix(cidr));
  // Exposure by CIDR breadth: log2(addresses) / 32 (IPv6 / 128); ::/0 counts as fully open
  const cidrDev = cidr => cidr === "::/0" ? 1 : cidr.includes(":") ? (128 - prefix(cidr)) / 128 : (32 - prefix(cidr)) / 32;
  const covers = (rule, port) => rule.port === "all" || rule.port === port || (Array.isArray(rule.port) && port >= rule.port[0] && port <= rule.port[1]);
  const portDev = rule => rule.port === "all" ? 1 : Array.isArray(rule.port) ? Math.min(1, Math.log2(rule.port[1] - rule.port[0] + 1) / 16) : 0;
  const portLabel = p => p === "all" ? "all ports" : Array.isArray(p) ? p[0] + "–" + p[1] : String(p);

  function applies(c, res) {
    if (!c.kinds.includes(res.kind)) return false;
    if (c.clouds && !c.clouds.includes(res.cloud)) return false;
    if (c.level === "L2" && !(res.classification === "confidential" || res.classification === "restricted" || res.tier === 1)) return false;
    if (c.tier1Only && res.tier !== 1) return false;
    if (c.defaultOnly && !res.isDefault) return false;
    if (res.isDefault && c.domain === "network" && c.id !== "NET-05") return false;
    if (c.lbOnly && !res.lb) return false;
    if (c.id === "STG-13" && res.kind !== "token") return false;
    return true;
  }
  function ruleDrift(c, res) {
    let worst = null;
    (res.rules || []).forEach(rule => {
      let d = 0;
      if (c.id === "NET-09") { if (rule.port === "all" || Array.isArray(rule.port) && rule.port[1] - rule.port[0] > 1000) d = portDev(rule); }
      else if (c.wide) { if (!rule.v6 && !isPrivate(rule.cidr) && prefix(rule.cidr) < 16 && !covers(rule, 80) && !covers(rule, 443) && ![22, 3389].concat([1433, 1521, 3306, 5432, 6379, 9200, 27017]).some(p => covers(rule, p))) d = cidrDev(rule.cidr); }
      else if (c.ports.some(p => covers(rule, p))) {
        if (c.openOnly && rule.cidr === "0.0.0.0/0") d = 1;
        else if (c.v6 && rule.cidr === "::/0") d = 1;
        else if (c.publicSources && !rule.v6 && !isPrivate(rule.cidr)) d = cidrDev(rule.cidr);
        else if (c.partner && !rule.v6 && !isPrivate(rule.cidr) && prefix(rule.cidr) >= 8 && prefix(rule.cidr) <= 16) d = cidrDev(rule.cidr);
      }
      if (d > 0 && (!worst || d > worst.d)) worst = { d, rule };
    });
    return worst;
  }
  function deviation(c, res) {
    const v = res.config ? res.config[c.id] : undefined;
    switch (c.measure) {
      case "binary":
        if (c.id === "NET-05") return (res.rules || []).length ? { d: 1, actual: (res.rules || []).length + " allow rule" + ((res.rules || []).length === 1 ? "" : "s") } : null;
        return v === false ? { d: 1, actual: c.expected === "On" ? "Off" : c.expected === "None" ? "Present" : "Missing" } : null;
      case "min": return typeof v === "number" && v < c.exp ? { d: Math.min(1, (c.exp - v) / c.exp), actual: v + " " + (v === 1 ? c.unit.slice(0, -1) : c.unit) } : null;
      case "max": return typeof v === "number" && v > c.exp ? { d: Math.min(1, (v - c.exp) / c.exp), actual: v + " " + (v === 1 ? c.unit.slice(0, -1) : c.unit) } : null;
      case "ordinal": return v === "TLS1.0" ? { d: 1, actual: "TLS 1.0 allowed" } : v === "TLS1.1" ? { d: .5, actual: "TLS 1.1 allowed" } : null;
      case "count":
        if (c.id === "NET-12") { const n = (res.rules || []).filter(x => x.hit > 90).length; return n ? { d: Math.min(1, n / c.cap), actual: n + " stale rule" + (n === 1 ? "" : "s") } : null; }
        return v > 0 ? { d: Math.min(1, v / c.cap), actual: v + " unapproved principal" + (v === 1 ? "" : "s") } : null;
      case "cidr": case "ports": {
        const w = ruleDrift(c, res); if (!w) return null;
        return { d: w.d, actual: portLabel(w.rule.port) + " from " + w.rule.cidr + (w.rule.cidr.includes(":") ? "" : " (" + addresses(w.rule.cidr).toLocaleString("en-US") + " addresses)"), rule: w.rule };
      }
    }
    return null;
  }
  // Evaluate one resource against the baseline. excepted(resId, cid, date) → exception or null.
  function evaluate(res, opts) {
    const o = opts || {}, app = B.CONTROLS.filter(c => applies(c, res)), wsum = app.reduce((a, c) => a + B.SEVW[c.sev], 0);
    const drifts = [], excepted = [];
    app.forEach(c => { const dv = deviation(c, res); if (!dv) return;
      const ex = o.exceptionFor ? o.exceptionFor(res.id, c.id) : null;
      const rec = Object.assign({ key: res.id + "|" + c.id, resourceId: res.id, controlId: c.id, expected: c.expected, since: (res.since && res.since[c.id]) || null, weight: B.SEVW[c.sev] }, dv);
      rec.points = wsum ? 100 * rec.weight * rec.d / wsum : 0;
      (ex ? excepted : drifts).push(ex ? Object.assign(rec, { exception: ex.id }) : rec); });
    const score = Math.round(drifts.reduce((a, x) => a + x.points, 0) * 10) / 10;
    return { applicable: app.map(c => c.id), wsum, drifts, excepted, score, conformance: Math.round((100 - score) * 10) / 10 };
  }
  root.DR = { applies, deviation, evaluate, cidrDev, addresses, isPrivate, CTRL, portLabel };
})(typeof window !== "undefined" ? window : globalThis);
