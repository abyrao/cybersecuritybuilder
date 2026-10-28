// Runs the known-answer checks under Node: node tools/run-checks.js
"use strict";
const E = require("../js/engine.js");
const C = require("../js/checks.js");
const data = require("../data/seed.json");
const res = C.run(E, data);
for (const c of res) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.id.padEnd(3)}  ${c.name.padEnd(28)}  ${c.got}`);
const failed = res.filter((c) => !c.ok).length;
console.log(`\n${res.length - failed} of ${res.length} passed`);
process.exit(failed ? 1 : 0);
