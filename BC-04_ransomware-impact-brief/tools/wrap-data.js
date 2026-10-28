// Wraps data/*.json as js/data.js so index.html works from file:// (browsers block fetch() there).
// Usage: node tools/wrap-data.js
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, "data", f), "utf8"));
const out = "/* Generated from data/*.json by tools/wrap-data.js. Edit the JSON, not this file. */\n" +
  "window.BC04 = " + JSON.stringify({ model: read("crown_jewels.json"), scenarios: read("scenarios.json") }) + ";\n";
fs.writeFileSync(path.join(dir, "js", "data.js"), out);
console.log("wrote js/data.js", out.length, "bytes");
