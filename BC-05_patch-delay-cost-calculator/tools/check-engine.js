// Confirms js/engine.js reproduces data/expected_results.json from the Python reference model.
// Usage: node tools/check-engine.js
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, "data", f), "utf8"));
const { build } = require(path.join(dir, "js", "engine.js"));
const model = read("edge_inventory.json"), findings = read("findings.json"), X = read("expected_results.json");
const E = build(model, findings);
const T = E.TODAY, dn = E.dn;
let n = 0, fails = 0;
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : (v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
function cmp(label, got, exp) {
  n++;
  const pick = {};
  for (const k of Object.keys(exp)) pick[k] = got[k];
  const a = JSON.stringify(sortKeys(pick)), b = JSON.stringify(sortKeys(exp));
  if (a !== b) { fails++; console.log("FAIL", label, "\n  got", a.slice(0, 600), "\n  exp", b.slice(0, 600)); }
}
cmp("summary", E.summary(), X.summary);
const edge = E.edge();
X.edge.forEach((r, i) => cmp("edge " + r.asset, edge[i], r));
const h = E.history();
const hx = Object.assign({}, X.history);
cmp("history", h, hx);
X.history_findings.forEach((r) => cmp("history " + r.id, h.per_finding.find((x) => x.id === r.id), r));
const calcCases = {
  "F-0142_planned": ["F-0142", { patch: dn("2026-12-08") }],
  "F-0142_next_window": ["F-0142", { patch: E.nextWindow(T + 1, true) }],
  "F-0142_waf": ["F-0142", { patch: dn("2026-12-08"), mit: { kind: "waf", start: T + 1 } }],
  "F-0118_planned": ["F-0118", { patch: dn("2026-12-10") }],
  "F-0118_allowlist": ["F-0118", { patch: dn("2026-12-10"), mit: { kind: "allowlist", start: T + 1 } }],
  "F-0097_planned": ["F-0097", { patch: dn("2026-12-15") }],
  "F-0031_daily": ["F-0031", { patch: T + 30 }],
  "F-0151_planned": ["F-0151", { patch: dn("2026-12-08") }],
  "F-0151_assume_kev": ["F-0151", { patch: dn("2026-12-08"), assumeKev: true }],
};
for (const [k, [fid, o]] of Object.entries(calcCases)) cmp("calc " + k, E.calculator(fid, o), X.calculator[k]);
const fc = E.forecast(), lo = E.forecast(0.5), hi = E.forecast(2.0);
for (const sc of ["current", "proposed", "proposed_waf"]) {
  cmp("forecast " + sc, fc[sc], X.forecast.base[sc]);
  cmp("forecast low " + sc, { v: lo[sc].expected_loss }, { v: X.forecast.low[sc] });
  cmp("forecast high " + sc, { v: hi[sc].expected_loss }, { v: X.forecast.high[sc] });
}
cmp("ordering", E.ordering(), X.ordering);
for (const r of X.open_findings) {
  const f = E.findings.find((x) => x.id === r.id);
  cmp("open " + r.id, { id: r.id, due_current: E.iso(E.dueDate(f, "current")), due_proposed: E.iso(E.dueDate(f, "proposed")),
    daily_cost: Math.round(E.dailyCost(f)), status: E.statusOn(f, T),
    planned_current: E.iso(E.planDate(f, "current")), planned_proposed: E.iso(E.planDate(f, "proposed")) }, r);
}
console.log(`${n - fails} of ${n} comparisons match`);
process.exit(fails ? 1 : 0);
