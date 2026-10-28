// Confirms js/engine.js reproduces data/expected_results.json from the Python reference model.
// Usage: node tools/check-engine.js
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, "data", f), "utf8"));
const E = require(path.join(dir, "js", "engine.js"));
const model = read("crown_jewels.json"), scenarios = read("scenarios.json"), expected = read("expected_results.json");
const KEYS = ["zones", "hit", "jobs", "services", "hours_down", "jewels_down", "revenue_at_risk", "revenue_lost",
  "per_service", "shoppers_turned_away", "orders_delayed", "partners_affected", "plant_workers_idle", "plant_cost",
  "obligations", "exposed", "exposure", "customers_exposed", "employees_exposed", "notification_cost",
  "recovery_cost", "team_hours", "total_impact", "data_lost_h"];
const norm = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === "number" ? Math.round(x * 1000) / 1000 : x)));
const strip = (r, keys) => {
  const o = {};
  for (const k of keys) {
    let v = r[k];
    if (k === "jobs") v = v.map(({ id, lane, start, end, how }) => ({ id, lane, start, end, how }));
    if (k === "obligations") v = v.map(({ id, due_h, back_h, missed }) => ({ id, due_h, back_h, missed }));
    o[k] = norm(v);
  }
  return o;
};
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : (v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
let fails = 0, n = 0;
function cmp(label, got, exp, keys) {
  n++;
  const a = JSON.stringify(sortKeys(strip(got, keys))), b = JSON.stringify(sortKeys(strip(exp, keys)));
  if (a !== b) {
    fails++;
    for (const k of keys) {
      const x = JSON.stringify(sortKeys(norm(strip(got, [k])[k]))), y = JSON.stringify(sortKeys(norm(strip(exp, [k])[k])));
      if (x !== y) console.log("FAIL", label, k, "\n  got", x.slice(0, 400), "\n  exp", y.slice(0, 400));
    }
  }
}
for (const s of scenarios) {
  cmp(s.id + " baseline", E.run(model, s), expected[s.id].baseline, KEYS);
  if (expected[s.id].with_suggested) cmp(s.id + " suggested", E.run(model, s, { controls: s.suggested }), expected[s.id].with_suggested, KEYS);
}
const r1 = scenarios[0];
cmp("R1 swap", E.run(model, r1, { priority: ["CJ01", "CJ03", "CJ04", "CJ06", "CJ12", "CJ11", "CJ10", "CJ02", "CJ05", "CJ08", "CJ09"] }), expected._priority_swap_R1, KEYS);
for (const [c, exp] of Object.entries(expected._controls_R1)) cmp("R1 " + c, E.run(model, r1, { controls: [c] }), exp, Object.keys(exp));
const ck = E.clocks(r1.start, 48), ce = expected._clocks_R1;
n++; if (ck.sec_8k_due !== ce.sec_8k_due || ck.state_notice_due !== ce.state_notice_due || ck.materiality !== ce.materiality.slice(0, 16)) { fails++; console.log("FAIL clocks", ck, ce); }
console.log(`${n - fails} of ${n} comparisons match`);
process.exit(fails ? 1 : 0);
