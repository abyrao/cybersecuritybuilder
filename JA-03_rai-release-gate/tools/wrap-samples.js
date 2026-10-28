// Wraps samples/ as js/samples.js so index.html works from file:// (browsers block fetch() there).
// Usage: node tools/wrap-samples.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "samples");
const out = {};
for (const build of fs.readdirSync(root)) {
  const bdir = path.join(root, build);
  if (!fs.statSync(bdir).isDirectory()) continue;
  out[build] = {};
  for (const ver of fs.readdirSync(bdir)) {
    const vdir = path.join(bdir, ver);
    if (!fs.statSync(vdir).isDirectory()) continue;
    const files = {};
    (function walk(d, rel) {
      for (const f of fs.readdirSync(d).sort()) {
        const p = path.join(d, f), r = rel ? rel + "/" + f : f;
        if (fs.statSync(p).isDirectory()) walk(p, r); else files[r] = fs.readFileSync(p, "utf8");
      }
    })(vdir, "");
    out[build][ver.replace(/^v/, "")] = files;
  }
}
const js = "/* Generated from samples/ by tools/wrap-samples.js. Edit the samples, not this file. */\n" +
  "window.JA03_SAMPLES = " + JSON.stringify(out) + ";\n";
fs.writeFileSync(path.join(__dirname, "..", "js", "samples.js"), js);
console.log("wrote js/samples.js", js.length, "bytes");
