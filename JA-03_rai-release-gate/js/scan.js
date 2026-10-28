/* JA-03 code reading: pattern rules that find what an AI build does and what to test.
   Pure functions; runs in the browser and under Node. Code is read, never executed. */
(function (root) {
  "use strict";

  const CODE = /\.(py|js|ts|tsx|jsx|java|go|rb|cs|kt|scala|ipynb)$/i;
  const PROMPT = /(^|\/)prompts?\/|\.(txt|md|prompt|jinja2?|j2)$/i;
  const CONF = /\.(ya?ml|json|toml|ini|cfg|env)$/i;
  const SOURCE_RE = /\b(s3|gs|https?|ldap|siem|abfss?|wasbs?):\/\/[^\s"'`)]+|[\w./-]+\.csv\b/g;

  function lines(text) { return text.split(/\r?\n/); }
  function firstMatch(files, fileTest, re) {
    for (const f of files) {
      if (fileTest && !fileTest.test(f.path)) continue;
      const ls = lines(f.text);
      for (let i = 0; i < ls.length; i++) if (re.test(ls[i])) return { file: f.path, line: i + 1, text: ls[i].trim() };
    }
    return null;
  }

  // data_map.yaml: collect "path:" entries under approved_sources
  function approvedSources(files) {
    const dm = files.find((f) => /(^|\/)data_map\.ya?ml$/i.test(f.path));
    if (!dm) return null;
    const out = [];
    lines(dm.text).forEach((l) => { const m = l.match(/^\s*path:\s*([^\s#]+)/); if (m) out.push(m[1].replace(/\*+$/, "")); });
    return out;
  }
  function sourcesIn(files) {
    const seen = new Map();
    files.forEach((f) => {
      if (/(^|\/)data_map\.ya?ml$/i.test(f.path) || /readme/i.test(f.path)) return;
      lines(f.text).forEach((l, i) => {
        if (/^\s*(#|\/\/)/.test(l)) return;
        (l.match(SOURCE_RE) || []).forEach((s) => {
          const clean = s.replace(/[",]+$/, "");
          if (!seen.has(clean)) seen.set(clean, { source: clean, file: f.path, line: i + 1 });
        });
      });
    });
    return Array.from(seen.values());
  }
  function isApproved(src, approved) {
    if (!approved) return null;
    const s = src.replace(/\*+$/, "");
    return approved.some((a) => s.startsWith(a) || a.startsWith(s));
  }

  const RULES = [
    { id: "model", kind: "Model call", files: CODE, re: /\b(generate|run_agent|invoke)\(|chat\.completions|messages\.create|predict_proba|\.fit\(/,
      meaning: "Confirms this is an AI build and which part calls the model.", adds: [] },
    { id: "retrieval", kind: "Retrieval", files: CODE, re: /index\.search\(|similarity_search|vector_?store\.query|\.query\(.*embed/i,
      meaning: "Retrieved documents reach the model: test indirect injection, citations and lineage.", adds: ["security", "transparency", "lineage"] },
    { id: "sourcesDropped", kind: "Sources dropped", files: CODE, re: /\.join\(\s*\w+\.text\s+for\s+\w+\s+in\b/,
      meaning: "Source paths are dropped before the model sees the context, so answers can't cite them.", adds: ["transparency"] },
    { id: "personalAttr", kind: "Personal attribute", files: null, re: /\{(first_name|last_name|full_name|gender|age|ethnicity)\}|\bwork_location\b/,
      meaning: "A personal attribute reaches the model: test paired prompts that differ only in that attribute.", adds: ["fairness"] },
    { id: "noSeparation", kind: "No data boundary", files: PROMPT, re: /\{(context|alert|document|documents)\}/,
      unless: /as data|not as instructions|never as instructions|treat .* as data/i,
      meaning: "Untrusted text is pasted into the prompt with no rule that it is data, not instructions.", adds: ["security"] },
    { id: "promptLog", kind: "Prompt logging", files: CODE, re: /\blog(ger)?\.\w+\(.*\{prompt\}/,
      meaning: "Full prompts, which can hold personal data, are written to logs.", adds: ["privacy", "accountability"] },
    { id: "filterNoop", kind: "Output filter does nothing", files: CODE, re: /def\s+check_output\s*\(/, fileUnless: /\bif\b|re\.|search\(|match\(/,
      meaning: "The output filter returns the text unchanged.", adds: ["privacy", "safety"] },
    { id: "noInputLimit", kind: "No input limit", files: CONF, re: /max_input_chars:\s*(null|none|~)\s*$/i,
      meaning: "Inputs of any size reach the model: test oversized inputs and cost.", adds: ["robustness"] },
    { id: "noToolLimit", kind: "No tool-call limit", files: CONF, re: /max_tool_calls\w*:\s*(null|none|~)\s*$/i,
      meaning: "The agent can call tools without limit: test runaway loops.", adds: ["robustness"] },
    { id: "tools", kind: "Tools that change things", files: CODE, re: /def\s+(disable|delete|remove|send|update|create|transfer)_\w+\s*\(/,
      meaning: "The build can take actions: test that each one needs approval.", adds: ["agency"] },
    { id: "approvalBypass", kind: "Approval bypass", files: CODE, re: /\b(auto_approve|skip_review|no_confirm)\s*=/,
      meaning: "A flag lets actions run without a person approving them.", adds: ["agency"] },
  ];

  function scan(fileList) {
    const files = fileList.filter((f) => typeof f.text === "string");
    const obs = [];
    RULES.forEach((r) => {
      if (r.id === "noSeparation") {
        for (const f of files) {
          if (!r.files.test(f.path) && !/PROMPT\s*=/.test(f.text)) continue;
          if (r.unless.test(f.text)) continue;
          const m = firstMatch([f], null, r.re);
          if (m) { obs.push(Object.assign({ rule: r.id, kind: r.kind, meaning: r.meaning }, m)); break; }
        }
        return;
      }
      const cand = r.fileUnless ? files.filter((f) => r.files.test(f.path) && !r.fileUnless.test(f.text.replace(/^.*def\s+check_output[^\n]*\n/s, ""))) : files;
      const m = firstMatch(cand, r.files, r.re);
      if (m) obs.push(Object.assign({ rule: r.id, kind: r.kind, meaning: r.meaning }, m));
    });
    // data sources: one observation, listing every source and whether it is approved
    const approved = approvedSources(files);
    const sources = sourcesIn(files).map((s) => Object.assign(s, { approved: isApproved(s.source, approved) }));
    const unapproved = sources.filter((s) => s.approved === false);
    if (sources.length) {
      const first = unapproved[0] || sources[0];
      obs.splice(Math.min(2, obs.length), 0, {
        rule: "sources", kind: "Data sources", file: first.file, line: first.line, text: first.source,
        meaning: `${sources.length} data source${sources.length === 1 ? "" : "s"}` + (approved ? `; ${unapproved.length} not in data_map.yaml` : "; no data_map.yaml to compare against"),
      });
    }
    const has = (id) => obs.some((o) => o.rule === id);
    const caps = {
      modelCall: has("model"), retrieval: has("retrieval"), tools: has("tools"), approvalBypass: has("approvalBypass"),
      classifier: files.some((f) => /predict_proba|\.fit\(/.test(f.text)),
      personalAttr: has("personalAttr"), promptLog: has("promptLog"), filterNoop: has("filterNoop"),
      noInputLimit: has("noInputLimit"), sourcesDropped: has("sourcesDropped"), noSeparation: has("noSeparation"),
      sources, unapproved, hasDataMap: !!approved,
    };
    caps.buildType = caps.tools ? "agent" : caps.classifier ? "classifier" : caps.retrieval ? "retrieval" : "assistant";
    return { observations: obs.map((o, i) => Object.assign(o, { id: "O" + (i + 1) })), caps, fileCount: files.length };
  }

  // lineage graph for the map: sources -> ingest/train -> index/model -> app -> output
  function lineage(result, buildName) {
    const c = result.caps;
    return {
      sources: c.sources.map((s) => ({ label: s.source.replace(/^\w+:\/\//, "").replace(/\*+$/, ""), approved: s.approved, file: s.file })),
      stages: c.classifier ? ["Training", "Model", buildName, "Flags"] : c.tools ? ["Alert feed", "Agent", "Tools", "Actions"] : ["Ingest", "Index", buildName, "Answers"],
    };
  }

  const api = { scan, lineage, RULES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Scan = api;
})(typeof window !== "undefined" ? window : globalThis);
