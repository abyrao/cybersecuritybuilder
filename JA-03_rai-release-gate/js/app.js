/* JA-03 Responsible AI release gate: six-step workflow UI. */
(function () {
  "use strict";
  const SAMP = window.JA03_SAMPLES, G = window.Gen, E = window.Eval, SC = window.Scan;
  const TODAY = "2026-10-27";

  // ---------------------------------------------------------------- helpers
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const plural = G.plural;
  const pct = (a, b) => (b ? (Math.round((a / b) * 1000) / 10) : 0);
  const pct1 = (a, b) => pct(a, b).toFixed(1);
  const DIM = {}; G.DIMENSIONS.forEach((d) => { DIM[d.id] = d; });

  const SAMPLES = {
    policypal: { name: "PolicyPal", desc: "HR policy assistant that answers from documents", versions: ["1.0", "1.1", "1.2"],
      intake: { what: "Answers HR policy questions for employees", type: "retrieval", users: "all", data: "sensitive", output: "informs", owner: "People Technology" } },
    triagebot: { name: "TriageBot", desc: "Security alert triage agent with tools", versions: ["1.0"],
      intake: { what: "Triages security alerts and can disable accounts", type: "agent", users: "team", data: "personal", output: "acts", owner: "Security Operations" } },
    "expense-scorer": { name: "Expense Anomaly Scorer", desc: "Model that flags expenses for audit review", versions: ["1.0"],
      intake: { what: "Flags expense reports for audit review", type: "classifier", users: "team", data: "personal", output: "recommends", owner: "Finance Systems" } },
  };
  const PERSONAS = [
    { id: "builder", name: "Aby Rao", role: "Builder" },
    { id: "governance", name: "Jordan Kim", role: "AI governance reviewer" },
    { id: "privacy", name: "Sam Patel", role: "Privacy officer" },
    { id: "security", name: "Riley Chen", role: "Security reviewer" },
  ];
  const persona = () => PERSONAS.find((p) => p.id === S.persona);
  const who = () => `${persona().name} (${persona().role})`;
  const DIM_OWNER = { privacy: "privacy", security: "security", agency: "security" };
  const ownerOf = (dim) => PERSONAS.find((p) => p.id === (DIM_OWNER[dim] || "governance"));

  // approval rules (pure; the checks panel exercises them)
  const Rules = {
    canApproveSet(personaId) { return personaId === "builder" ? { ok: true } : { ok: false, why: "Only the builder approves the test set for their build." }; },
    canRun(confirmed) { return confirmed === true ? { ok: true } : { ok: false, why: "Nothing runs against a build without a yes." }; },
    canCreateTickets(personaId) { return personaId === "builder" ? { ok: true } : { ok: false, why: "The builder confirms ticket creation." }; },
    canException(personaId, finding, reason, expiry) {
      if (finding.sev === "critical") return { ok: false, why: "Critical findings can't have exceptions." };
      const dim = (finding.tests[0] && finding.tests[0].c.dimension) || "accuracy", owner = ownerOf(dim);
      if (personaId !== owner.id) return { ok: false, why: `Only the ${owner.role.toLowerCase()} can approve an exception in ${DIM[dim].short.toLowerCase()}.` };
      if (!reason || reason.trim().length < 8) return { ok: false, why: "Add a reason." };
      const days = (new Date(expiry) - new Date(TODAY)) / 864e5;
      if (!(days > 0 && days <= 90)) return { ok: false, why: "Expiry must be within the next 90 days." };
      return { ok: true };
    },
    canApproveRelease(personaId, gate) {
      if (personaId === "builder") return { ok: false, why: "A builder can't approve their own release." };
      if (personaId !== "governance") return { ok: false, why: "Only the AI governance reviewer decides the release." };
      if (!gate || gate.status === "Blocked") return { ok: false, why: "The gate is Blocked. Fix or except the blocking findings first." };
      if (gate.needsTickets && gate.needsTickets.length) return { ok: false, why: `Create tickets first for ${gate.needsTickets.join(", ")}.` };
      return { ok: true };
    },
  };

  // ---------------------------------------------------------------- state
  let S;
  function fresh() {
    return {
      step: 1, done: {}, persona: "builder", build: "policypal", version: "1.0", custom: null,
      intake: Object.assign({}, SAMPLES.policypal.intake), files: [], scan: null, curFile: null, curObs: null, scanning: false,
      gen: { total: 240, seed: 42, weights: {} }, set: null, validation: null, setApproved: false, previewDim: "all",
      runs: [], running: false, confirm: false, mode: "sim", imported: null,
      exceptions: {}, tickets: {}, release: null, log: [], nextTicket: 101, retestVersion: null, diffFile: null, compare: false,
    };
  }
  S = fresh();
  const tier = () => E.riskTier(S.intake);
  const lastRun = () => S.runs[S.runs.length - 1];
  const buildName = () => (S.custom ? S.custom.name : SAMPLES[S.build].name);
  const versionLabel = (v) => `${buildName()} ${v || S.version}`;

  // ---------------------------------------------------------------- toast, tooltip, log
  let tt;
  function toast(m, warn) { const t = $("#toast"); t.textContent = m; t.className = "toast show" + (warn ? " warn" : ""); clearTimeout(tt); tt = setTimeout(() => { t.className = "toast"; }, 2800); }
  const tip = $("#tip");
  function showTip(el) {
    const s = el.getAttribute("data-tip"); if (!s) return;
    tip.innerHTML = s; tip.classList.add("show");
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let x = r.left + r.width / 2 - w / 2, y = r.bottom + 8; if (y + h > innerHeight - 44) y = r.top - h - 8;
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + "px"; tip.style.top = y + "px";
  }
  document.addEventListener("mouseover", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) showTip(t); });
  document.addEventListener("mouseout", (e) => { if (e.target.closest && e.target.closest("[data-tip]")) tip.classList.remove("show"); });
  document.addEventListener("focusin", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) showTip(t); });
  document.addEventListener("focusout", () => tip.classList.remove("show"));
  function log(text) {
    S.log.unshift({ t: new Date().toTimeString().slice(0, 5), who: who(), text });
    $("#logCount").textContent = S.log.length;
    $("#logList").innerHTML = S.log.map((l) => `<div class="log-item"><div class="t">${l.t}</div><div><b>${esc(l.who)}</b><br>${esc(l.text)}</div></div>`).join("");
  }
  function download(name, text, type) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain" })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000); log(`Exported ${name}`);
  }

  // ---------------------------------------------------------------- stepper
  const STEPS = ["Define", "Source", "Generate", "Run", "Report", "Retest"];
  function unlocked(n) {
    if (n === 1) return true;
    if (n === 2) return !!S.done[1];
    if (n === 3) return !!S.done[2];
    if (n === 4) return !!S.done[3];
    if (n === 5) return S.runs.length > 0;
    if (n === 6) return S.runs.length > 0;
    return false;
  }
  function renderStepper() {
    $("#stepper").innerHTML = STEPS.map((s, i) => {
      const n = i + 1, cls = ["step"]; if (S.step === n) cls.push("active"); if (S.done[n]) cls.push("done");
      return (i ? '<span class="step-sep"></span>' : "") + `<button class="${cls.join(" ")}" data-n="${n}" ${unlocked(n) ? "" : "disabled"}><span class="n">${S.done[n] && S.step !== n ? "✓" : n}</span><span class="lbl">${s}</span></button>`;
    }).join("");
    $$("#stepper .step").forEach((b) => { b.onclick = () => go(Number(b.dataset.n)); });
  }
  function go(n) {
    if (!unlocked(n)) return;
    S.step = n;
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + n));
    renderStepper();
    [null, renderDefine, renderSource, renderGenerate, renderRun, renderReport, renderRetest][n]();
    tip.classList.remove("show");
  }

  // ---------------------------------------------------------------- STEP 1 · Define
  const OPT = {
    type: [["assistant", "Assistant"], ["retrieval", "Retrieval assistant"], ["agent", "Agent with tools"], ["classifier", "Classifier"]],
    users: [["team", "A team"], ["all", "All employees"], ["customers", "Customers"]],
    data: [["none", "None"], ["internal", "Internal"], ["personal", "Personal"], ["sensitive", "Sensitive personal"]],
    output: [["informs", "Informs"], ["recommends", "Recommends"], ["acts", "Decides or acts"]],
  };
  function selectBuild(id) {
    const keepPersona = S.persona, keepLog = S.log;
    S = fresh(); S.persona = keepPersona; S.log = keepLog;
    S.build = id; S.intake = Object.assign({}, SAMPLES[id].intake); S.version = SAMPLES[id].versions[0];
    S.gen.total = G.defaultTotal(G.CATALOG[id]);
    loadSampleFiles(); log(`Selected ${SAMPLES[id].name} ${S.version}`);
    renderDefine(); renderStepper();
  }
  function loadSampleFiles() { S.files = Object.entries(SAMP[S.build][S.version]).map(([path, text]) => ({ path, text })); S.scan = null; }
  function renderDefine() {
    const v = $("#view-1"), t = tier(), th = E.THRESHOLDS[t];
    const cards = Object.keys(SAMPLES).map((k) => `<button class="sample ${!S.custom && S.build === k ? "on" : ""}" data-b="${k}"><span class="chip ${k === "policypal" ? "pass" : "info"}" style="align-self:flex-start">${k === "policypal" ? "Demo build" : "Sample"}</span><span class="t">${SAMPLES[k].name}</span><span class="d">${SAMPLES[k].desc}</span></button>`).join("")
      + `<button class="sample ${S.custom ? "on" : ""}" data-b="custom"><span class="chip lav" style="align-self:flex-start">Your code</span><span class="t">${S.custom ? esc(S.custom.name) : "Your own build"}</span><span class="d">${S.custom ? plural(S.files.length, "file") + " loaded" : "Load a folder or .zip in step 2"}</span></button>`;
    const seg = (key) => `<div class="seg" data-k="${key}">${OPT[key].map(([val, lbl]) => `<button data-v="${val}" class="${S.intake[key] === val ? "on" : ""}">${lbl}</button>`).join("")}</div>`;
    const reasons = E.tierReasons(S.intake);
    v.innerHTML = `
      <div class="head"><div><h1>What is this build?</h1><div class="sub">Pick a build and answer six questions. The risk tier sets the bar it has to clear.</div></div></div>
      <div class="samples">${cards}</div>
      <div class="row grow">
        <div class="card col" style="flex:1.5">
          <div class="card-h">Intake</div>
          <div class="form-grid scroll">
            <div class="q" style="grid-column:1/-1"><label for="iWhat">What does it do?</label><input id="iWhat" value="${esc(S.intake.what)}"></div>
            <div class="q"><label>Build type</label>${seg("type")}</div>
            <div class="q"><label>Who uses it?</label>${seg("users")}</div>
            <div class="q"><label>What data does it touch?</label>${seg("data")}</div>
            <div class="q"><label>What does it do with its output?</label>${seg("output")}</div>
            <div class="q"><label for="iOwner">Owner</label><input id="iOwner" value="${esc(S.intake.owner)}"></div>
          </div>
        </div>
        <div class="card col" style="flex:1">
          <div class="card-h">Risk tier <span class="why" tabindex="0" data-tip="Company AI policy (fictional): <b>High</b> if it decides or acts, or touches sensitive personal data and all employees or customers use it. <b>Medium</b> if it recommends, or touches personal data. <b>Low</b> otherwise.">Why?</span></div>
          <div class="chart" style="flex:none;height:190px" id="dial"></div>
          <div style="padding:0 18px 6px">${reasons.map((r) => `<div class="muted" style="font-size:15px">• ${esc(r)}</div>`).join("")}</div>
          <div class="sec" style="padding:0 18px">Minimum pass rate at this tier</div>
          <div class="scroll" style="padding:0 18px 12px;display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;font-size:14px">
            ${Object.keys(th).map((d) => `<div style="display:flex;justify-content:space-between"><span class="muted">${DIM[d].short}</span><span class="mono">${th[d]}%</span></div>`).join("")}
          </div>
        </div>
      </div>
      <div class="card foot-actions" style="justify-content:flex-end"><span class="muted" style="margin-right:auto">Tier <b>${t}</b> · owner ${esc(S.intake.owner || "not set")}</span><button class="btn primary" id="toSource">Continue to source →</button></div>`;
    $$(".sample", v).forEach((b) => { b.onclick = () => { if (b.dataset.b === "custom") { startCustom(); } else selectBuild(b.dataset.b); }; });
    $$(".seg", v).forEach((sg) => $$("button", sg).forEach((b) => { b.onclick = () => { S.intake[sg.dataset.k] = b.dataset.v; log(`Intake: ${sg.dataset.k} set to ${b.textContent}`); renderDefine(); }; }));
    $("#iWhat").oninput = (e) => { S.intake.what = e.target.value; }; $("#iOwner").oninput = (e) => { S.intake.owner = e.target.value; };
    $("#toSource").onclick = () => {
      if (!S.intake.owner) { toast("Add an owner first.", true); return; }
      S.done[1] = true; log(`Defined ${buildName()}: tier ${tier()}`); go(2);
    };
    drawDial(t);
  }
  function drawDial(t) {
    const box = $("#dial"), W = box.clientWidth - 28, H = 180, cx = W / 2, cy = 150, r = Math.min(130, W / 2 - 20);
    const seg = (a0, a1, col, lbl) => {
      const p = (a) => [cx + r * Math.cos(Math.PI * (1 - a)), cy - r * Math.sin(Math.PI * (1 - a))];
      const [x0, y0] = p(a0), [x1, y1] = p(a1), [lx, ly] = [cx + (r + 18) * Math.cos(Math.PI * (1 - (a0 + a1) / 2)), cy - (r + 18) * Math.sin(Math.PI * (1 - (a0 + a1) / 2))];
      return `<path d="M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}" stroke="${col}" stroke-width="22" fill="none" opacity="${lbl === t ? 1 : 0.25}"/><text x="${lx}" y="${ly}" text-anchor="middle" class="axl" fill="${lbl === t ? "#ECEFF1" : "#838D94"}">${lbl}</text>`;
    };
    const ang = { Low: 1 / 6, Medium: 0.5, High: 5 / 6 }[t], nx = cx + (r - 30) * Math.cos(Math.PI * (1 - ang)), ny = cy - (r - 30) * Math.sin(Math.PI * (1 - ang));
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${seg(0.01, 0.32, "#B5F23D", "Low")}${seg(0.34, 0.66, "#FDE68A", "Medium")}${seg(0.68, 0.99, "#FCA5A5", "High")}
      <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#ECEFF1" stroke-width="4" stroke-linecap="round" style="transition:all .4s"/><circle cx="${cx}" cy="${cy}" r="9" fill="#ECEFF1"/>
      <text x="${cx}" y="${cy - 34}" text-anchor="middle" style="font:700 30px var(--font);fill:#ECEFF1">${t}</text></svg>`;
  }

  // ---------------------------------------------------------------- STEP 2 · Source
  function startCustom() {
    const keepPersona = S.persona, keepLog = S.log;
    S = fresh(); S.persona = keepPersona; S.log = keepLog;
    S.custom = { name: "Your build" }; S.build = "custom"; S.version = "1.0"; S.files = [];
    S.intake = { what: "", type: "assistant", users: "team", data: "internal", output: "informs", owner: "" };
    log("Started your own build"); renderDefine(); renderStepper();
  }
  const TEXT_EXT = /\.(py|js|ts|tsx|jsx|java|go|rb|cs|kt|scala|ya?ml|json|toml|ini|cfg|txt|md|prompt|jinja2?|j2|sql|sh|env)$/i;
  async function loadUpload(fileList, label) {
    const out = []; let bytes = 0;
    for (const f of fileList) {
      const p = f.webkitRelativePath || f.name;
      if (!TEXT_EXT.test(p) || /node_modules|\.git\//.test(p) || f.size > 1e6) continue;
      if (out.length >= 500 || bytes + f.size > 5e6) break;
      out.push({ path: p.split("/").slice(1).join("/") || p, text: await f.text() }); bytes += f.size;
    }
    return finishUpload(out, label);
  }
  async function loadZip(file) {
    const zip = await JSZip.loadAsync(file), out = []; let bytes = 0;
    const entries = Object.values(zip.files).filter((z) => !z.dir && TEXT_EXT.test(z.name) && !/node_modules|__MACOSX|\.git\//.test(z.name));
    for (const z of entries) { if (out.length >= 500) break; const t = await z.async("string"); bytes += t.length; if (bytes > 5e6) break; out.push({ path: z.name.replace(/^[^/]+\//, ""), text: t }); }
    return finishUpload(out, file.name.replace(/\.zip$/i, ""));
  }
  function finishUpload(files, label) {
    if (!files.length) { toast("No readable code files found.", true); return; }
    if (!S.custom) startCustom();
    S.custom.name = label || "Your build"; S.files = files; S.scan = null; S.done[2] = false;
    log(`Loaded ${plural(files.length, "file")} from ${S.custom.name} (read only, never run)`);
    runScan();
  }
  function runScan() {
    S.scan = SC.scan(S.files); S.curObs = null;
    const obs = S.scan.observations; S.curFile = obs.length ? obs[0].file : (S.files[0] && S.files[0].path);
    if (S.custom) { const bt = S.scan.caps.buildType; S.intake.type = bt; if (S.scan.caps.tools) S.intake.output = "acts"; }
    S.scanning = true; renderSource();
    obs.forEach((o, i) => setTimeout(() => { const el = $(`.obs[data-o="${o.id}"]`); if (el) el.style.opacity = 1; if (i === obs.length - 1) { S.scanning = false; } }, 120 * i + 150));
    S.done[2] = true; renderStepper();
    log(`Read ${buildName()} ${S.version}: ${plural(obs.length, "observation")}, ${plural(S.scan.caps.unapproved.length, "unapproved source")}`);
  }
  function approvedPaths() {
    const dm = S.files.find((f) => /(^|\/)data_map\.ya?ml$/i.test(f.path));
    return dm ? (dm.text.match(/^\s*path:\s*([^\s#]+)/gm) || []).map((l) => l.replace(/^\s*path:\s*/, "").replace(/\*+$/, "")) : [];
  }
  function renderSource() {
    const v = $("#view-2");
    if (!S.files.length) {
      v.innerHTML = `<div class="head"><div><h1>What does the code actually do?</h1><div class="sub">Load your build's source. It's read in this browser and never run or sent anywhere.</div></div></div>
        <div class="card" style="max-width:820px;margin:20px auto;padding:26px;display:flex;flex-direction:column;gap:14px">
          <h2 style="margin:0">Load your code</h2>
          <div class="drop">Text files only · up to 500 files and 5 MB · binaries and node_modules skipped</div>
          <div style="display:flex;gap:10px"><button class="btn primary" id="upFolder">Choose a folder</button><button class="btn" id="upZip">Choose a .zip</button><span class="spacer"></span><button class="btn ghost" id="useSample">Use the PolicyPal sample instead</button></div>
          <div class="muted" style="font-size:14px">Tip: include <span class="mono">data_map.yaml</span> listing approved data sources so lineage can be checked.</div>
        </div>`;
      $("#upFolder").onclick = () => $("#pickFolder").click(); $("#upZip").onclick = () => $("#pickZip").click();
      $("#useSample").onclick = () => { selectBuild("policypal"); S.done[1] = true; go(2); };
      return;
    }
    if (!S.scan) { runScan(); return; }
    const obs = S.scan.observations, caps = S.scan.caps;
    const hitsByFile = {}; obs.forEach((o) => { hitsByFile[o.file] = (hitsByFile[o.file] || 0) + 1; });
    const file = S.files.find((f) => f.path === S.curFile) || S.files[0];
    const hitLines = obs.filter((o) => o.file === file.path).map((o) => o.line);
    if (file.path === (obs.find((o) => o.rule === "sources") || {}).file) caps.sources.filter((s) => s.file === file.path).forEach((s) => hitLines.push(s.line));
    const capChips = [["Model call", caps.modelCall], ["Retrieval", caps.retrieval], ["Tools that act", caps.tools], ["Classifier", caps.classifier], ["Personal attributes", caps.personalAttr]]
      .map(([l, on]) => `<span class="chip ${on ? "info" : ""}" style="${on ? "" : "opacity:.45"}">${on ? "✓" : "–"} ${l}</span>`).join(" ");
    v.innerHTML = `
      <div class="head"><div><h1>What does the code actually do?</h1><div class="sub">${esc(versionLabel())} · ${plural(S.files.length, "file")} read, never run · ${plural(obs.length, "observation")}</div></div>
        <span class="spacer"></span><button class="btn" id="upFolder2">Load your own folder</button><button class="btn" id="upZip2">Load a .zip</button></div>
      <div class="row grow">
        <div class="card col" style="flex:1.45">
          <div class="code-wrap">
            <div class="tree">${S.files.map((f) => `<button class="${f.path === file.path ? "on" : ""}" data-f="${esc(f.path)}"><span>${esc(f.path)}</span>${hitsByFile[f.path] ? `<span class="cnt">${hitsByFile[f.path]}</span>` : ""}</button>`).join("")}</div>
            <div class="code" id="code">${file.text.split(/\r?\n/).map((l, i) => `<div class="ln ${hitLines.indexOf(i + 1) >= 0 ? "hit" : ""} ${S.curObs && S.curObs.file === file.path && S.curObs.line === i + 1 ? "cur" : ""}" id="L${i + 1}"><span>${i + 1}</span><span>${esc(l) || " "}</span></div>`).join("")}</div>
          </div>
        </div>
        <div class="col" style="flex:1;gap:14px">
          <div class="card col" style="flex:1.3">
            <div class="card-h">Observations <span class="badge">${obs.length}</span><span class="sim">simulated AI reading</span></div>
            <div style="padding:0 14px 8px;display:flex;flex-wrap:wrap;gap:6px">${capChips}</div>
            <div class="scroll">${obs.map((o) => `<div class="obs ${S.curObs && S.curObs.id === o.id ? "on" : ""}" data-o="${o.id}" tabindex="0" style="${S.scanning ? "opacity:0;transition:opacity .3s" : ""}"><span class="id">${o.id}</span><span class="k">${esc(o.kind)}</span><span class="m">${esc(o.meaning)}</span><span class="f">${esc(o.file)}:${o.line}</span></div>`).join("")}</div>
          </div>
          <div class="card col" style="flex:1">
            <div class="card-h">Data lineage <span class="why" tabindex="0" data-tip="Sources found in the code, compared with <b>data_map.yaml</b>. Anything not in the map is drawn in rose.">Why?</span></div>
            <div class="chart" id="lineage"></div>
          </div>
        </div>
      </div>
      <div class="card foot-actions"><span class="muted" style="margin-right:auto">${caps.tools ? "Tools found: agency tests will be added." : "No tools found: Agency is not applicable."} ${caps.hasDataMap ? "" : "No data_map.yaml found."}</span><button class="btn primary" id="toGen">Continue to generate →</button></div>`;
    $$(".tree button", v).forEach((b) => { b.onclick = () => { S.curFile = b.dataset.f; S.curObs = null; renderSource(); }; });
    $$(".obs", v).forEach((d) => { d.onclick = () => { const o = obs.find((x) => x.id === d.dataset.o); S.curObs = o; S.curFile = o.file; renderSource(); const el = $("#L" + o.line); if (el) el.scrollIntoView({ block: "center" }); }; });
    $("#upFolder2").onclick = () => $("#pickFolder").click(); $("#upZip2").onclick = () => $("#pickZip").click();
    $("#toGen").onclick = () => go(3);
    drawLineage();
  }
  function drawLineage() {
    const box = $("#lineage"); if (!box) return;
    const W = box.clientWidth - 28, H = box.clientHeight - 16; if (W < 80) return;
    const L = SC.lineage(S.scan, buildName()), src = L.sources.length ? L.sources : [{ label: "no sources found in code", approved: null }];
    const colX = [8, W * 0.42, W * 0.58, W * 0.74, W * 0.9], midY = H / 2;
    const sh = Math.min(42, (H - 10) / src.length), sw = W * 0.34;
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    src.forEach((x, i) => {
      const y = 5 + i * sh + (H - 10 - sh * src.length) / 2, col = x.approved === false ? "#FCA5A5" : x.approved ? "#B5F23D" : "#838D94";
      s += `<path d="M${8 + sw},${y + sh / 2 - 2} C${colX[1] - 30},${y + sh / 2} ${colX[1] - 40},${midY} ${colX[1] - 8},${midY}" stroke="${col}" stroke-width="${x.approved === false ? 3 : 2}" fill="none" opacity=".8"/>`;
      s += `<rect x="8" y="${y + 3}" width="${sw}" height="${sh - 8}" rx="8" fill="${x.approved === false ? "rgba(252,165,165,.14)" : "#2E3337"}" stroke="${col}" stroke-width="1.5"/><text x="18" y="${y + sh / 2 + 3}" class="val" fill="${col === "#838D94" ? "#B4BCC2" : col}" style="font-size:12px">${esc((() => { const max = x.approved === false ? 24 : 34; return x.label.length > max ? x.label.slice(0, max - 1) + "…" : x.label; })())}</text>`;
      if (x.approved === false) s += `<text x="${8 + sw - 8}" y="${y + sh / 2 + 3}" text-anchor="end" class="ax" fill="#FCA5A5">not in map</text>`;
    });
    L.stages.forEach((st, i) => {
      const x = colX[i + 1] - 4, w = W * 0.13;
      s += `<rect x="${x}" y="${midY - 20}" width="${w}" height="40" rx="10" fill="#363C41" stroke="#4A5258"/><text x="${x + w / 2}" y="${midY + 5}" text-anchor="middle" class="axl" fill="#ECEFF1" style="font-size:12px">${esc(st)}</text>`;
      if (i < L.stages.length - 1) s += `<line x1="${x + w}" y1="${midY}" x2="${colX[i + 2] - 4}" y2="${midY}" stroke="#838D94" stroke-width="2"/>`;
    });
    box.innerHTML = s + "</svg>";
  }

  // ---------------------------------------------------------------- STEP 3 · Generate
  function generateSet() {
    const caps = S.scan ? S.scan.caps : {};
    S.set = G.generate({ build: S.build === "custom" ? "custom" : S.build, total: S.gen.total, seed: S.gen.seed, weights: S.gen.weights, caps, catalog: S.build === "custom" ? G.genericCatalog(caps) : undefined });
    S.validation = G.validate(S.set, caps); S.setApproved = false; S.done[3] = false; S.done[4] = false;
    log(`Generated ${plural(S.set.total, "case")} (seed ${S.set.seed}, fingerprint ${S.set.fingerprint}); ${S.validation.filter((v) => v.pass).length} of 7 validation checks pass`);
  }
  function renderGenerate() {
    if (!S.set) generateSet();
    const v = $("#view-3"), set = S.set, cat = set.catalog, dims = set.alloc.dims;
    const byDim = {}; set.cases.forEach((c) => { byDim[c.dimension] = (byDim[c.dimension] || 0) + 1; });
    const allPass = S.validation.every((x) => x.pass);
    const rows = set.cases.filter((c) => S.previewDim === "all" || c.dimension === S.previewDim).slice(0, 60);
    const ruleTxt = (c) => ({ exact_answer: `answer has "${c.expected.key}"`, must_cite: c.expected.approvedOnly ? "source in data map" : "cites " + ((c.expected.docs || []).join(" + ") || "a source"), must_not_contain: "no personal value", must_refuse: "refuses", refuse_and_refer: "declines and refers", no_injection: "ignores injection", must_offer_human: "offers a person", log_must_not_contain: "logs redacted", audit_id: "audit ID", max_tokens: `≤ ${c.expected.max} tokens`, tool_requires_approval: "action needs approval", paired_equal: `same answer across ${c.attribute}`, exact_label: `label = ${c.expected.label || "known"}` }[c.rule] || c.rule);
    v.innerHTML = `
      <div class="head"><div><h1>What should we test, and is the test set any good?</h1><div class="sub">Built from what the code does. Every case has a known answer. Synthetic data only.</div></div></div>
      <div class="card gen-bar">
        <div class="f"><label for="gTotal">Cases</label><div style="display:flex;align-items:center;gap:12px"><input type="range" id="gTotal" min="60" max="1000" step="10" value="${S.gen.total}" ${S.setApproved ? "disabled" : ""}><span class="big-num" id="gTotalV">${S.gen.total}</span></div></div>
        <div class="f"><label for="gSeed">Seed</label><input type="number" id="gSeed" value="${S.gen.seed}" ${S.setApproved ? "disabled" : ""}></div>
        <button class="btn" id="gRegen" ${S.setApproved ? "disabled" : ""}>Regenerate</button>
        <span class="spacer"></span>
        <div class="f" style="text-align:right"><label>Fingerprint</label><span class="mono" data-tip="Same seed and settings always give this fingerprint. A retest checks it to prove the set didn't change.">${set.fingerprint}</span></div>
        <button class="btn ghost" id="expJsonl" data-tip="Run these cases in your own pipeline, then import results in step 4.">Export JSONL</button>
        <button class="btn ghost" id="expCsv">Export CSV</button>
        ${S.setApproved ? `<span class="locked">✓ Locked · ${plural(set.total, "case")}</span>` : `<button class="btn primary" id="gApprove" ${allPass ? "" : "disabled"} data-tip="${allPass ? "Locks the set. Retests reuse exactly these cases." : "All validation checks must pass first."}">Approve test set</button>`}
      </div>
      <div class="row grow">
        <div class="card col" style="flex:1">
          <div class="card-h">Coverage <span class="sub">${plural(dims.length, "dimension")} · ${plural(cat.length, "family", "families")}</span></div>
          <div class="chart" id="cover"></div>
          ${S.setApproved ? "" : `<div class="sec" style="padding:0 16px">Weight by dimension</div><div class="weights">${dims.map((d) => `<div class="wrow"><span>${DIM[d].short}</span><input type="range" min="0.5" max="2" step="0.25" value="${S.gen.weights[d] || 1}" data-w="${d}"><span class="mono">×${S.gen.weights[d] || 1}</span></div>`).join("")}</div>`}
        </div>
        <div class="card col" style="flex:0.85">
          <div class="card-h">Test set validation <span class="badge">${S.validation.filter((x) => x.pass).length}/7</span></div>
          <div class="scroll">${S.validation.map((x) => `<div class="vrow"><span class="ok ${x.pass ? "p" : "f"}">${x.pass ? "✓" : "!"}</span><span class="mono dim">${x.id}</span><span class="nm">${x.name}</span><span class="why" tabindex="0" data-tip="${esc(x.why)}">Why?</span><span class="dt">${esc(x.detail)}</span></div>`).join("")}</div>
        </div>
        <div class="card col" style="flex:1.35">
          <div class="card-h">Cases <span class="sub">first 60 shown</span><span class="spacer"></span><select id="pDim" style="background:var(--surface-2);border:1px solid var(--line-2);border-radius:8px;padding:4px 6px"><option value="all">All dimensions</option>${dims.map((d) => `<option value="${d}" ${S.previewDim === d ? "selected" : ""}>${DIM[d].short} (${byDim[d]})</option>`).join("")}</select></div>
          <div class="scroll"><table class="cases"><thead><tr><th>ID</th><th>Input</th><th>Known answer</th></tr></thead><tbody>
            ${rows.map((c) => `<tr><td class="mono">${esc(c.id)}</td><td>${esc(c.inputs ? c.inputs[0] + "  ⇄  " + c.values[1] : c.input)}${c.context ? `<div class="dim" style="font-size:12.5px">+ ${esc(c.context)}</div>` : ""}</td><td class="mono">${esc(ruleTxt(c))}</td></tr>`).join("")}
          </tbody></table></div>
        </div>
      </div>
      <div class="card foot-actions"><span class="muted" style="margin-right:auto">${S.setApproved ? "Locked. Retests reuse this set plus regression cases." : "The builder approves the set after validation."}</span><button class="btn primary" id="toRun" ${S.setApproved ? "" : "disabled"}>Continue to run →</button></div>`;
    $("#gTotal") && ($("#gTotal").oninput = (e) => { $("#gTotalV").textContent = e.target.value; });
    $("#gTotal") && ($("#gTotal").onchange = (e) => { S.gen.total = Number(e.target.value); generateSet(); renderGenerate(); });
    $("#gSeed") && ($("#gSeed").onchange = (e) => { S.gen.seed = Number(e.target.value) || 0; generateSet(); renderGenerate(); });
    $("#gRegen") && ($("#gRegen").onclick = () => { generateSet(); renderGenerate(); });
    $$("[data-w]", v).forEach((r) => { r.onchange = () => { S.gen.weights[r.dataset.w] = Number(r.value); generateSet(); renderGenerate(); }; });
    $("#pDim").onchange = (e) => { S.previewDim = e.target.value; renderGenerate(); };
    $("#expJsonl").onclick = () => download(`${S.build}_testset_${set.fingerprint}.jsonl`, set.cases.map((c) => JSON.stringify({ id: c.id, dimension: c.dimension, family: c.family, input: c.input, inputs: c.inputs, context: c.context, expected: Object.assign({ rule: c.rule }, c.expected), severity_if_fail: c.severity, synthetic: true })).join("\n") + "\n");
    $("#expCsv").onclick = () => download(`${S.build}_testset_${set.fingerprint}.csv`, "id,dimension,family,input,rule\n" + set.cases.map((c) => [c.id, c.dimension, c.familyName, c.inputs ? c.inputs.join(" | ") : c.input, c.rule].map(csv).join(",")).join("\n"), "text/csv");
    const ap = $("#gApprove");
    if (ap) ap.onclick = () => {
      const r = Rules.canApproveSet(S.persona); if (!r.ok) { toast(r.why, true); log(`Blocked: ${r.why}`); return; }
      S.setApproved = true; S.done[3] = true; log(`Approved and locked the test set: ${plural(set.total, "case")}, fingerprint ${set.fingerprint}`); renderGenerate(); renderStepper();
    };
    $("#toRun").onclick = () => go(4);
    drawCoverage();
  }
  function csv(x) { x = String(x == null ? "" : x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }
  function drawCoverage() {
    const box = $("#cover"); if (!box) return;
    const W = box.clientWidth - 28, H = box.clientHeight - 10; if (W < 80) return;
    const dims = S.set.alloc.dims, fams = S.set.catalog, cnt = {};
    S.set.cases.forEach((c) => { cnt[c.family] = (cnt[c.family] || 0) + 1; });
    const max = Math.max(...dims.map((d) => S.set.cases.filter((c) => c.dimension === d).length));
    const L = 116, R = W - 40, rh = Math.min(30, (H - 6) / dims.length), cols = ["#B5F23D", "#7DD3FC", "#C4B5FD", "#FDE68A"];
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    dims.forEach((d, i) => {
      const y = i * rh + 4; let x = L, n = 0;
      s += `<text class="rowl" x="${L - 10}" y="${y + rh / 2 + 5}" text-anchor="end" style="font-size:14px">${DIM[d].short}</text>`;
      fams.filter((f) => f.dim === d).forEach((f, k) => {
        const c = cnt[f.id] || 0, w = (c / max) * (R - L); n += c;
        s += `<rect x="${x}" y="${y + 3}" width="${Math.max(0, w - 2)}" height="${Math.max(2, rh - 8)}" rx="4" fill="${cols[k % 4]}" opacity=".85" data-tip="<b>${esc(f.name)}</b><br>${plural(c, "case")} · rule: ${f.rule}"/>`; x += w;
      });
      s += `<text class="val" x="${x + 6}" y="${y + rh / 2 + 4}">${n}</text>`;
    });
    box.innerHTML = s + "</svg>";
  }

  // ---------------------------------------------------------------- STEP 4 · Run
  function extraFor(version) { return S.build === "custom" ? [] : G.regressionCases(S.build, version, S.set.seed); }
  function renderRun() {
    const v = $("#view-4");
    if (S.running || (S.runAnim && S.runAnim.done === false)) return;
    const r = lastRun();
    if (r && !S.confirm) { drawRunGrid(v, r, true); return; }
    if (S.build === "custom") { renderRunCustom(v); return; }
    v.innerHTML = `<div class="head"><div><h1>Should we test it now?</h1><div class="sub">Nothing runs against a build without a yes.</div></div></div>
      <div class="card confirm">
        <span class="chip info" style="align-self:flex-start">Test set locked · ${S.set.fingerprint}</span>
        <h2>Test ${plural(S.set.total, "case")} against ${esc(versionLabel())}?</h2>
        <ul>
          <li>${plural(S.set.alloc.dims.length, "dimension")}, ${plural(S.set.catalog.length, "family", "families")}, every case with a known answer</li>
          <li>Build behavior is <b>simulated</b> for this sample; pass rules are applied to each output for real</li>
          <li>Nothing leaves this browser · about 4 seconds</li>
        </ul>
        <div style="display:flex;gap:10px;margin-top:6px"><button class="btn primary" id="yesRun">Yes, run</button><button class="btn" id="noRun">Not now</button></div>
      </div>`;
    $("#yesRun").onclick = () => startRun(S.version, [], "sim");
    $("#noRun").onclick = () => { log("Declined to run the test set"); toast("Not run. You can come back to it."); go(3); };
  }
  function renderRunCustom(v) {
    v.innerHTML = `<div class="head"><div><h1>Should we test it now?</h1><div class="sub">This tool reads your code; it can't run it. Choose how to get results.</div></div></div>
      <div class="opt-cards">
        <div class="card opt"><h2 style="margin:0">Run it in your pipeline</h2><p class="muted" style="margin:0">Export the locked set as JSONL, run each case through your build, and import a results file with <span class="mono">id, output, citations, tool_calls, logs, tokens</span>. Pass rules are applied for real.</p>
          <div style="display:flex;gap:10px"><button class="btn" id="cExp">Export test set</button><button class="btn primary" id="cImp">Import results</button></div></div>
        <div class="card opt"><h2 style="margin:0">Preview run <span class="sim">estimate</span></h2><p class="muted" style="margin:0">Estimates outcomes from the code observations. Useful to see the report shape; not evidence for a release.</p>
          <div><button class="btn" id="cPrev">Yes, run a preview</button></div></div>
      </div>`;
    $("#cExp").onclick = () => $("#expJsonl") ? $("#expJsonl").click() : download("testset.jsonl", S.set.cases.map((c) => JSON.stringify(c)).join("\n"));
    $("#cImp").onclick = () => $("#pickResults").click();
    $("#cPrev").onclick = () => startRun("1.0", [], "preview");
  }
  function evaluateRun(version, extra, mode, importedMap) {
    const appr = approvedPaths();
    let results;
    if (mode === "import") results = E.runImported(S.set, extra, importedMap, appr);
    else if (mode === "preview") results = E.preview(S.set, S.scan.caps);
    else results = E.run(S.set, version, extra, appr);
    const finds = E.findings(S.build, results), scores = E.dimensionScores(results, tier());
    return { version, mode, results, extraCount: extra.length, findings: finds, scores, metric: E.groupMetric(S.build, results), at: new Date().toISOString() };
  }
  function startRun(version, extra, mode, importedMap) {
    const run = evaluateRun(version, extra, mode, importedMap);
    run.gate = E.gate(tier(), run.scores, run.findings, S.exceptions, S.tickets);
    S.runs.push(run); S.confirm = false; S.done[4] = true; S.done[5] = false;
    const fails = run.results.filter((x) => !x.pass).length;
    log(`Ran ${plural(run.results.length, "case")} against ${versionLabel(version)}${mode === "preview" ? " (preview estimate)" : mode === "import" ? " (imported results)" : ""}: ${plural(fails, "failure")}, gate ${run.gate.status}`);
    syncTickets(); renderStepper();
    if (S.step === 6) { animateRun(null, run, () => renderRetest()); return; }
    animateRun($("#view-4"), run);
  }
  function drawRunGrid(v, r, static_) {
    const dims = Array.from(new Set(r.results.map((x) => x.c.dimension)));
    const fails = r.results.filter((x) => !x.pass).length;
    v.innerHTML = `<div class="head"><div><h1>${static_ ? "Run complete" : "Running…"}</h1><div class="sub">${esc(versionLabel(r.version))} · ${plural(r.results.length, "case")}${r.extraCount ? ` (incl. ${plural(r.extraCount, "regression case")})` : ""}${r.mode === "preview" ? " · preview estimate" : r.mode === "import" ? " · imported results" : " · simulated build"}</div></div><span class="spacer"></span>
        <div style="display:flex;align-items:center;gap:12px;min-width:360px"><div class="progress"><i id="prog" style="width:${static_ ? 100 : 0}%"></i></div><span class="mono" id="progN">${static_ ? r.results.length : 0}/${r.results.length}</span></div></div>
      <div class="tiles" style="grid-template-columns:repeat(3,1fr)">
        <div class="card tile"><div class="label">Passed</div><div class="value" style="color:var(--lime)" id="tPass">${static_ ? r.results.length - fails : 0}</div></div>
        <div class="card tile"><div class="label">Failed</div><div class="value" style="color:var(--rose)" id="tFail">${static_ ? fails : 0}</div></div>
        <div class="card tile"><div class="label">Pass rate</div><div class="value" id="tRate">${static_ ? pct(r.results.length - fails, r.results.length) + "%" : "–"}</div></div>
      </div>
      <div class="card dots" id="dotsBox">${dims.map((d) => { const rs = r.results.filter((x) => x.c.dimension === d); return `<div class="drow"><span class="nm">${DIM[d].short}</span><div class="ds">${rs.map((x) => `<button class="dot ${static_ ? (x.pass ? "p" : "f") : ""} ${x.c.regression ? "r" : ""}" data-id="${esc(x.id)}" aria-label="${esc(x.id)}"></button>`).join("")}</div><span class="sc" data-d="${d}">${static_ ? `${rs.filter((x) => x.pass).length}/${rs.length}` : ""}</span></div>`; }).join("")}</div>
      <div class="card foot-actions"><span class="muted" style="margin-right:auto">Lime = pass · rose = fail${r.extraCount ? " · ringed = regression case" : ""} · click a dot for the case</span><button class="btn" id="rerunBtn" ${static_ ? "" : "disabled"}>Run again</button><button class="btn primary" id="toReport" ${static_ ? "" : "disabled"}>See the report →</button></div>`;
    $$(".dot", v).forEach((d) => { d.onclick = () => openCase(r.results.find((x) => x.id === d.dataset.id)); });
    const rr = $("#rerunBtn", v); if (rr) rr.onclick = () => { S.confirm = true; S.runs.pop(); renderRun(); };
    const tr = $("#toReport", v); if (tr) tr.onclick = () => go(5);
  }
  function animateRun(v, r, after) {
    if (!v) { after && after(); return; }
    S.running = true; drawRunGrid(v, r, false);
    const dots = $$(".dot", v), n = r.results.length, dur = 3600, t0 = performance.now();
    let i = 0, pass = 0, fail = 0;
    const tick = (now) => {
      const target = Math.min(n, Math.floor(((now - t0) / dur) * n));
      while (i < target) { const x = r.results[i]; dots[i].classList.add(x.pass ? "p" : "f"); x.pass ? pass++ : fail++; i++; }
      $("#prog").style.width = (i / n) * 100 + "%"; $("#progN").textContent = `${i}/${n}`;
      $("#tPass").textContent = pass; $("#tFail").textContent = fail; $("#tRate").textContent = i ? pct(pass, i) + "%" : "–";
      if (i < n) requestAnimationFrame(tick); else { S.running = false; drawRunGrid(v, r, true); after && after(); }
    };
    requestAnimationFrame(tick);
  }
  function openCase(x) {
    if (!x) return;
    const c = x.c, r = x.r || {};
    $("#drawerHead").innerHTML = `<div class="mono dim" style="font-size:13px">${esc(c.id)} · ${DIM[c.dimension].short}</div><h2>${esc(c.familyName)}</h2><div style="margin-top:6px"><span class="chip ${x.pass ? "pass" : "fail"}">${x.pass ? "Pass" : "Fail"}</span> ${c.regression ? '<span class="chip info">regression case</span>' : ""} ${x.estimate ? '<span class="sim">estimate</span>' : ""}</div>`;
    const io = c.inputs ? c.inputs.map((q, k) => `<div class="ev"><div class="k">Input (${esc(c.values[k])})</div><div class="v">${esc(q)}</div><div class="k">Output</div><div class="v out ${x.pass ? "ok" : ""}">${esc((r.outputs || [])[k] || "")}</div></div>`).join("")
      : `<div class="ev"><div class="k">Input</div><div class="v">${esc(c.input)}</div>${c.context ? `<div class="k">Planted in a retrieved document</div><div class="v">${esc(c.context)}</div>` : ""}<div class="k">Output</div><div class="v out ${x.pass ? "ok" : ""}">${esc(r.output || "")}</div>${r.logs ? `<div class="k">Log line</div><div class="v out ${x.pass ? "ok" : ""}">${esc(r.logs)}</div>` : ""}${(r.tool_calls || []).length ? `<div class="k">Tool calls</div><div class="v out ${x.pass ? "ok" : ""}">${r.tool_calls.map((t) => `${t.name} · approved: ${t.approved}`).join("; ")}</div>` : ""}</div>`;
    $("#drawerBody").innerHTML = `${io}<div class="sec">Known answer</div><div class="snippet">${esc(c.rule)} ${esc(JSON.stringify(c.expected))}</div>
      <div class="sec">Verdict <span class="why" tabindex="0" data-tip="Rule check on the output, plus a simulated judge note for refusals and citations.">Why?</span></div><div class="muted">${esc(x.why)}</div>
      <div class="sec">Frameworks</div><div class="muted">${DIM[c.dimension].owasp.map((o) => `${o} ${G.OWASP[o]}`).concat(DIM[c.dimension].nist).join(" · ")}</div>`;
    $("#drawer").classList.add("open");
  }

  // ---------------------------------------------------------------- STEP 5 · Report
  function syncTickets() {
    const r = lastRun(); if (!r) return;
    Object.keys(S.tickets).forEach((fid) => { const f = r.findings.find((x) => x.id === fid); S.tickets[fid].status = f && f.open ? "Open" : "Ready to close"; });
    r.gate = E.gate(tier(), r.scores, r.findings, S.exceptions, S.tickets);
  }
  function renderReport() {
    const v = $("#view-5"), r = lastRun(); if (!r) return;
    syncTickets(); S.done[5] = true; renderStepper();
    const g = r.gate, fails = r.results.filter((x) => !x.pass).length, open = r.findings.filter((f) => f.open);
    const sev = { critical: 0, high: 0, medium: 0, low: 0 }; open.forEach((f) => { sev[f.sev]++; });
    const below = r.scores.filter((s) => s.below).length;
    const fwCount = {}; open.forEach((f) => f.frameworks.forEach((x) => { fwCount[x] = (fwCount[x] || 0) + 1; }));
    v.innerHTML = `
      <div class="card gate">
        <div><div class="dim" style="font-size:13px;font-weight:600">RELEASE GATE · ${esc(versionLabel(r.version))} · tier ${tier()}${r.mode === "preview" ? ' · <span class="sim">preview estimate, not release evidence</span>' : r.mode === "import" ? " · imported results" : ""}</div><div class="stamp ${g.status}">${g.status}</div></div>
        <ul style="flex:1">${g.reasons.slice(0, 8).map((x) => `<li>${esc(x)}</li>`).join("")}${g.reasons.length > 8 ? `<li>and ${g.reasons.length - 8} more</li>` : ""}</ul>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn ${g.status === "Blocked" ? "" : "primary"}" id="btnRelease" data-tip="AI governance reviewer only. Not available while Blocked.">Approve release</button>
          ${S.release ? `<span class="chip pass">Approved by ${esc(S.release.by)}</span>` : ""}
        </div>
      </div>
      <div class="tiles" style="grid-template-columns:repeat(4,1fr)">
        <div class="card tile"><div class="label">Pass rate</div><div class="value">${pct1(r.results.length - fails, r.results.length)}<small>%</small></div><div class="note">${fails} of ${plural(r.results.length, "case")} failed</div></div>
        <div class="card tile"><div class="label">Open findings <span class="why" tabindex="0" data-tip="Failed tests grouped by root cause. A finding closes only when a retest passes.">Why?</span></div><div class="value">${open.length}</div><div class="note">${sev.critical} critical · ${sev.high} high · ${sev.medium} medium · ${sev.low} low</div></div>
        <div class="card tile"><div class="label">Below threshold</div><div class="value" style="color:${below ? "var(--rose)" : "var(--lime)"}">${below}<small>of ${r.scores.length}</small></div><div class="note">${plural(r.scores.length, "dimension")} tested</div></div>
        <div class="card tile"><div class="label">Tickets</div><div class="value">${Object.keys(S.tickets).length}</div><div class="note">${Object.values(S.tickets).filter((t) => t.status === "Ready to close").length} ready to close</div></div>
      </div>
      <div class="row grow">
        <div class="card col" style="flex:1"><div class="card-h">Dimensions <span class="sub">pass rate vs threshold</span></div><div class="chart" id="dimChart"></div>${r.metric ? `<div style="padding:0 16px 12px" class="muted">${esc(r.metric.label)}: <b style="color:${r.metric.pass ? "var(--lime)" : "var(--rose)"}">${r.metric.ratio}</b> (${r.metric.groups.map((x) => `${x[0]} ${x[1]} of ${x[2]}`).join(" vs ")}; minimum ${r.metric.minimum})</div>` : ""}</div>
        <div class="card col" style="flex:1.25"><div class="card-h">Findings <span class="badge">${open.length} open</span><span class="sim">simulated grouping</span></div>
          <div class="scroll">${r.findings.filter((f) => f.open || S.runs.some((q) => (q.findings.find((y) => y.id === f.id) || {}).open)).sort((a, b) => (b.open - a.open) || E.SEV_ORDER[a.sev] - E.SEV_ORDER[b.sev]).map((f) => `<div class="find ${f.open ? "" : "closed"}" data-f="${f.id}" tabindex="0"><span class="id">${f.id}</span><span class="t">${esc(f.title)}</span><span><span class="chip ${f.sev}">${f.sev}</span></span><span class="s">${f.open ? plural(f.tests.length, "failed test") : "fixed (verified by retest)"}${f.code ? ` · ${esc(f.code.file)}` : ""}${S.exceptions[f.id] ? " · exception" : ""}${S.tickets[f.id] ? ` · ${S.tickets[f.id].key}` : ""}</span></div>`).join("")}</div></div>
        <div class="col" style="flex:0.8;gap:14px">
          <div class="card col" style="flex:1"><div class="card-h">Frameworks <span class="sub">open findings</span></div><div class="scroll">${Object.keys(fwCount).sort().map((k) => `<div class="fw"><span>${G.OWASP[k] ? `<span class="mono">${k}</span> ${G.OWASP[k]}` : "NIST: " + esc(k)}</span><span class="mono">${fwCount[k]}</span></div>`).join("") || '<div class="fw muted">Nothing open</div>'}</div></div>
          <div class="card col" style="flex:none;padding:12px 14px;gap:8px">
            <button class="btn primary" id="btnTickets">Create tickets</button>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn sm" id="xPdf">PDF</button><button class="btn sm" id="xMd">Markdown</button><button class="btn sm" id="xCsv">Findings CSV</button><button class="btn sm" id="xJson">JSON</button></div>
            <button class="btn" id="toRetest">Retest a fix →</button>
          </div>
        </div>
      </div>`;
    drawDims(r);
    $$(".find", v).forEach((d) => { d.onclick = () => openFinding(d.dataset.f); d.onkeydown = (e) => { if (e.key === "Enter") openFinding(d.dataset.f); }; });
    $("#btnRelease").onclick = approveRelease;
    $("#btnTickets").onclick = openTickets;
    $("#xPdf").onclick = () => { $("#print-report").innerHTML = reportHTML(); log("Exported report as PDF (print)"); window.print(); };
    $("#xMd").onclick = () => download(`${S.build}_${r.version}_report.md`, reportMarkdown(), "text/markdown");
    $("#xCsv").onclick = () => download(`${S.build}_${r.version}_findings.csv`, "id,severity,title,status,failed_tests,code,frameworks,ticket,due\n" + r.findings.map((f) => [f.id, f.sev, f.title, f.open ? "open" : "fixed", f.tests.length, f.code ? f.code.file : "", f.frameworks.join(" "), S.tickets[f.id] ? S.tickets[f.id].key : "", S.tickets[f.id] ? S.tickets[f.id].due : ""].map(csv).join(",")).join("\n"), "text/csv");
    $("#xJson").onclick = () => download(`${S.build}_${r.version}_report.json`, JSON.stringify({ build: buildName(), version: r.version, tier: tier(), gate: r.gate.status, reasons: r.gate.reasons, fingerprint: S.set.fingerprint, scores: r.scores, findings: r.findings.map((f) => ({ id: f.id, severity: f.sev, title: f.title, open: f.open, failed: f.tests.map((t) => t.id), code: f.code, frameworks: f.frameworks, fix: f.fix })), tickets: S.tickets, exceptions: S.exceptions, release: S.release }, null, 2), "application/json");
    $("#toRetest").onclick = () => go(6);
  }
  function drawDims(r) {
    const box = $("#dimChart"); if (!box) return;
    const W = box.clientWidth - 28, H = box.clientHeight - 8; if (W < 80) return;
    const L = 116, R = W - 56, rh = Math.min(34, (H - 24) / r.scores.length), x = (p) => L + (p / 100) * (R - L);
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    [0, 50, 100].forEach((t) => { s += `<line class="gridl" x1="${x(t)}" x2="${x(t)}" y1="0" y2="${rh * r.scores.length}"/><text class="ax" x="${x(t)}" y="${rh * r.scores.length + 16}" text-anchor="middle">${t}%</text>`; });
    r.scores.forEach((d, i) => {
      const y = i * rh;
      s += `<text class="rowl" x="${L - 10}" y="${y + rh / 2 + 5}" text-anchor="end" style="font-size:14px">${d.name}</text>`;
      s += `<rect x="${L}" y="${y + 6}" width="${x(d.pct) - L}" height="${Math.max(3, rh - 12)}" rx="5" fill="${d.below ? "#FCA5A5" : "#B5F23D"}" data-tip="<b>${d.name}</b><br>${d.passed} of ${d.total} passed (${d.pct}%)<br>Threshold ${d.threshold}%"/>`;
      s += `<line x1="${x(d.threshold)}" x2="${x(d.threshold)}" y1="${y + 2}" y2="${y + rh - 2}" stroke="#ECEFF1" stroke-width="2.5"/>`;
      s += `<text class="val" x="${R + 8}" y="${y + rh / 2 + 4}" fill="${d.below ? "#FCA5A5" : "#B4BCC2"}">${d.pct}%</text>`;
    });
    box.innerHTML = s + "</svg>";
  }
  function openFinding(fid) {
    const r = lastRun(), f = r.findings.find((x) => x.id === fid); if (!f) return;
    const file = f.code && S.files.find((x) => x.path === f.code.file);
    let snippet = "";
    if (file) {
      const ls = file.text.split(/\r?\n/), at = Math.max(0, ls.findIndex((l) => l.indexOf(f.code.text) >= 0));
      snippet = ls.slice(Math.max(0, at - 2), at + 3).map((l, k) => `${String(Math.max(0, at - 2) + k + 1).padStart(3)}  ${l}`).join("\n");
    }
    const dim = f.tests[0] ? f.tests[0].c.dimension : null, owner = dim ? ownerOf(dim) : null, ex = S.exceptions[f.id], tk = S.tickets[f.id];
    $("#drawerHead").innerHTML = `<div class="mono dim" style="font-size:13px">${f.id}${dim ? " · " + DIM[dim].short : ""}</div><h2>${esc(f.title)}</h2><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="chip ${f.sev}">${f.sev}</span><span class="chip ${f.open ? "fail" : "pass"}">${f.open ? "open" : "fixed, verified"}</span>${tk ? `<span class="chip info">${tk.key} · ${tk.status}</span>` : ""}${ex ? `<span class="chip warn">exception to ${ex.expiry}</span>` : ""}</div>`;
    $("#drawerBody").innerHTML = `
      ${f.tests.length ? `<div class="sec">Evidence · ${plural(f.tests.length, "failed test")}</div>` + f.tests.slice(0, 3).map((x) => `<div class="ev" style="cursor:pointer" data-case="${esc(x.id)}"><div class="k">${esc(x.id)}</div><div class="v">${esc(x.c.inputs ? x.c.inputs.join("  ⇄  ") : x.c.input)}</div><div class="v out">${esc(x.r.outputs ? x.r.outputs.join("  ⇄  ") : (x.r.logs && x.c.rule === "log_must_not_contain" ? "log: " + x.r.logs : x.r.output || (x.r.tool_calls || []).map((t) => t.name + " approved: " + t.approved).join("")))}</div><div class="dim" style="font-size:13px">${esc(x.why)}</div></div>`).join("") + (f.tests.length > 3 ? `<div class="dim">and ${plural(f.tests.length - 3, "more test")}</div>` : "") : `<div class="sec">Evidence</div><div class="muted">No failing tests in the latest run.</div>`}
      ${f.code ? `<div class="sec">Where in the code</div><div class="mono dim" style="font-size:13px;margin-bottom:4px">${esc(f.code.file)}</div><div class="snippet">${esc(snippet || f.code.text)}</div>` : ""}
      <div class="sec">Suggested fix <span class="sim">simulated</span></div><div>${esc(f.fix)}</div>
      <div class="sec">Frameworks</div><div class="muted">${f.frameworks.map((x) => (G.OWASP[x] ? `${x} ${G.OWASP[x]}` : "NIST: " + x)).join(" · ")}</div>
      ${f.open && f.sev !== "critical" && !ex ? `<div class="sec">Exception${owner ? ` · ${esc(owner.role)} approves` : ""}</div><div class="form"><textarea id="exReason" placeholder="Reason"></textarea><div style="display:flex;gap:8px"><input type="date" id="exDate" min="2026-10-28" max="2027-01-25" aria-label="Expiry"><button class="btn" id="exBtn">Approve exception</button></div></div>` : ""}
      ${f.open && f.sev === "critical" ? `<div class="sec">Exception</div><div class="muted">Not available: critical findings must be fixed.</div>` : ""}
      <div class="sec">Closing</div><div class="muted">Closes only when a retest passes every test linked to it.</div>`;
    $$("[data-case]", $("#drawerBody")).forEach((d) => { d.onclick = () => openCase(r.results.find((x) => x.id === d.dataset.case)); });
    const eb = $("#exBtn");
    if (eb) { $("#exReason").onkeydown = (e) => e.stopPropagation(); eb.onclick = () => {
      const reason = $("#exReason").value, exp = $("#exDate").value, rr = Rules.canException(S.persona, f, reason, exp);
      if (!rr.ok) { toast(rr.why, true); log(`Exception blocked for ${f.id}: ${rr.why}`); return; }
      S.exceptions[f.id] = { by: who(), reason, expiry: exp }; log(`Exception approved for ${f.id} until ${exp}: ${reason}`); syncTickets(); openFinding(fid); if (S.step === 5) renderReport();
    }; }
    $("#drawer").classList.add("open");
  }
  function openTickets() {
    const r = lastRun(), rr = Rules.canCreateTickets(S.persona);
    if (!rr.ok) { toast(rr.why, true); log(`Blocked: ${rr.why}`); return; }
    const todo = r.findings.filter((f) => f.open && !S.tickets[f.id]);
    if (!todo.length) { toast("Every open finding already has a ticket."); return; }
    $("#modal").innerHTML = `<div class="card-h" style="padding-top:16px">Create ${plural(todo.length, "ticket")} <span class="sim">simulated draft</span><span class="spacer"></span><button class="btn sm" id="tkClose">Cancel</button></div>
      <div class="muted" style="padding:0 16px 8px">Edit the summaries, then confirm. Due dates follow the SLA: critical 7 days, high 14, medium 30, low 90.</div>
      <div class="tk" style="font-size:12px;color:var(--ink-3);font-weight:600"><span></span><span>Finding</span><span>Summary</span><span>Priority</span><span>Due</span></div>
      <div class="scroll">${todo.map((f) => `<div class="tk"><input type="checkbox" checked data-tk="${f.id}"><span class="mono">${f.id}</span><input type="text" value="${esc(`[${buildName()} ${r.version}] ${f.title}`)}" data-sum="${f.id}"><span class="chip ${f.sev}">${f.sev}</span><span class="mono">${E.addDays(TODAY, E.SLA_DAYS[f.sev])}</span></div>`).join("")}</div>
      <div class="foot-actions" style="justify-content:flex-end"><button class="btn" id="tkCsv">Export CSV</button><button class="btn primary" id="tkOk">Create tickets</button></div>`;
    $("#overlay").classList.add("open");
    $$("[data-sum]").forEach((i) => { i.onkeydown = (e) => e.stopPropagation(); });
    const picked = () => todo.filter((f) => $(`[data-tk="${f.id}"]`).checked).map((f) => ({ f, sum: $(`[data-sum="${f.id}"]`).value }));
    $("#tkClose").onclick = () => $("#overlay").classList.remove("open");
    $("#tkCsv").onclick = () => download(`${S.build}_tickets.csv`, "Summary,Description,Priority,Labels,Due date,Component\n" + picked().map(({ f, sum }) => [sum, `${f.fix} Evidence: ${f.tests.length} failed tests (${f.tests.slice(0, 5).map((t) => t.id).join(", ")}). Code: ${f.code ? f.code.file : "n/a"}.`, f.sev, "responsible-ai " + f.frameworks.join(" ").replace(/,/g, ""), E.addDays(TODAY, E.SLA_DAYS[f.sev]), buildName()].map(csv).join(",")).join("\n"), "text/csv");
    $("#tkOk").onclick = () => {
      const p = picked(); if (!p.length) { toast("Pick at least one finding.", true); return; }
      p.forEach(({ f, sum }) => { S.tickets[f.id] = { key: "AI-" + S.nextTicket++, summary: sum, priority: f.sev, due: E.addDays(TODAY, E.SLA_DAYS[f.sev]), status: "Open" }; });
      log(`Created ${plural(p.length, "ticket")}: ${p.map(({ f }) => S.tickets[f.id].key + " (" + f.id + ")").join(", ")}`);
      $("#overlay").classList.remove("open"); syncTickets(); toast(`${plural(p.length, "ticket")} created (simulated).`);
      if (S.step === 5) renderReport(); else renderRetest();
    };
  }
  function approveRelease() {
    const r = lastRun(); syncTickets();
    if (r.mode === "preview") { toast("A preview estimate can't support a release. Import real results first.", true); log("Release blocked: preview estimate"); return; }
    const rr = Rules.canApproveRelease(S.persona, r.gate);
    if (!rr.ok) { toast(rr.why, true); log(`Release approval blocked: ${rr.why}`); return; }
    S.release = { by: who(), version: r.version, gate: r.gate.status, at: new Date().toISOString(), openTickets: Object.values(S.tickets).filter((t) => t.status === "Open").map((t) => t.key) };
    log(`Release approved: ${versionLabel(r.version)}, gate ${r.gate.status}, ${plural(S.release.openTickets.length, "open ticket")}`);
    toast(`${versionLabel(r.version)} approved for release (${r.gate.status}).`);
    if (S.step === 5) renderReport(); else renderRetest();
  }
  function reportMarkdown() {
    const r = lastRun(), L = [];
    L.push(`# Responsible AI evaluation · ${versionLabel(r.version)}`, "", `Tier: ${tier()} · Gate: **${r.gate.status}** · Test set ${S.set.fingerprint} (seed ${S.set.seed}) · ${plural(r.results.length, "case")}`, "");
    L.push("## Why", ...r.gate.reasons.map((x) => `- ${x}`), "", "## Dimensions", "| Dimension | Passed | Rate | Threshold |", "|---|---|---|---|", ...r.scores.map((s) => `| ${s.name} | ${s.passed}/${s.total} | ${s.pct}% | ${s.threshold}% |`), "");
    L.push("## Findings", ...r.findings.map((f) => `### ${f.id} · ${f.sev} · ${f.title}\n- Status: ${f.open ? "open" : "fixed (verified)"}${S.tickets[f.id] ? ` · ticket ${S.tickets[f.id].key} due ${S.tickets[f.id].due}` : ""}\n- Failed tests: ${f.tests.length ? f.tests.map((t) => t.id).join(", ") : "none"}\n- Code: ${f.code ? f.code.file + " (" + f.code.text + ")" : "n/a"}\n- Frameworks: ${f.frameworks.join(", ")}\n- Suggested fix (simulated): ${f.fix}\n`));
    L.push("## Test set validation", ...S.validation.map((v) => `- ${v.id} ${v.name}: ${v.pass ? "pass" : "fail"} · ${v.detail}`), "");
    if (Object.keys(S.exceptions).length) L.push("## Exceptions", ...Object.keys(S.exceptions).map((k) => `- ${k}: ${S.exceptions[k].by}, until ${S.exceptions[k].expiry}: ${S.exceptions[k].reason}`), "");
    if (S.release) L.push("## Release", `Approved by ${S.release.by} · ${S.release.gate}`, "");
    L.push("For demo purposes only. All data is fictional and does not represent any organization. · Built by Aby Rao");
    return L.join("\n");
  }
  function reportHTML() {
    const r = lastRun();
    return `<h1>Responsible AI evaluation · ${esc(versionLabel(r.version))}</h1><p>Tier ${tier()} · Gate <b>${r.gate.status}</b> · test set ${S.set.fingerprint} · ${plural(r.results.length, "case")}</p>
      <h2>Why</h2><ul>${r.gate.reasons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <h2>Dimensions</h2><table><tr><th>Dimension</th><th>Passed</th><th>Rate</th><th>Threshold</th></tr>${r.scores.map((s) => `<tr><td>${s.name}</td><td>${s.passed}/${s.total}</td><td>${s.pct}%</td><td>${s.threshold}%</td></tr>`).join("")}</table>
      <h2>Findings</h2><table><tr><th>ID</th><th>Severity</th><th>Finding</th><th>Status</th><th>Tests</th><th>Code</th><th>Fix (simulated)</th></tr>${r.findings.map((f) => `<tr><td>${f.id}</td><td>${f.sev}</td><td>${esc(f.title)}</td><td>${f.open ? "open" : "fixed"}</td><td>${f.tests.length}</td><td>${f.code ? esc(f.code.file) : ""}</td><td>${esc(f.fix)}</td></tr>`).join("")}</table>`;
  }

  // ---------------------------------------------------------------- STEP 6 · Retest
  function nextVersions() { if (S.build === "custom") return []; const vs = SAMPLES[S.build].versions, cur = lastRun() ? lastRun().version : S.version; return vs.slice(vs.indexOf(cur) + 1); }
  function lineDiff(a, b) {
    const A = a.split(/\r?\n/), B = b.split(/\r?\n/), n = A.length, m = B.length, dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) { if (A[i] === B[j]) { out.push([" ", A[i]]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push(["-", A[i++]]); else out.push(["+", B[j++]]); }
    while (i < n) out.push(["-", A[i++]]); while (j < m) out.push(["+", B[j++]]);
    return out;
  }
  function renderRetest() {
    const v = $("#view-6"), runs = S.runs, cur = lastRun(); if (!cur) return;
    const nexts = nextVersions(); if (!S.retestVersion || nexts.indexOf(S.retestVersion) < 0) S.retestVersion = nexts[0] || null;
    const nv = S.retestVersion;
    let diffHtml = '<div class="muted" style="padding:14px">No newer sample version. Load a new upload of your build to retest it.</div>', changed = [];
    const prevRun = runs.length > 1 ? runs[runs.length - 2] : null;
    const fromV = nv ? cur.version : (prevRun && S.build !== "custom" ? prevRun.version : null), toV = nv || (fromV ? cur.version : null);
    if (fromV && toV && fromV !== toV) {
      const A = SAMP[S.build][fromV], B = SAMP[S.build][toV];
      changed = Array.from(new Set(Object.keys(A).concat(Object.keys(B)))).filter((p) => A[p] !== B[p] && !/README/.test(p));
      if (!S.diffFile || changed.indexOf(S.diffFile) < 0) S.diffFile = changed[0];
      const d = lineDiff(A[S.diffFile] || "", B[S.diffFile] || "");
      diffHtml = `<div class="diff">${d.filter((x, k) => x[0] !== " " || (d[k - 1] && d[k - 1][0] !== " ") || (d[k + 1] && d[k + 1][0] !== " ")).map((x) => `<div class="${x[0] === "+" ? "a" : x[0] === "-" ? "d" : ""}">${x[0]} ${esc(x[1])}</div>`).join("")}</div>`;
    }
    const allIds = []; runs.forEach((r) => r.findings.forEach((f) => { if (allIds.indexOf(f.id) < 0 && (f.open || runs.some((q) => (q.findings.find((y) => y.id === f.id) || {}).open))) allIds.push(f.id); }));
    const statusOf = (r, i, fid) => {
      const f = r.findings.find((x) => x.id === fid), prev = i ? runs[i - 1].findings.find((x) => x.id === fid) : null;
      if (!f || !f.open) return prev && prev.open ? ["Fixed (verified)", "pass"] : (runs.slice(0, i).some((q) => (q.findings.find((y) => y.id === fid) || {}).open) ? ["Fixed", "pass"] : ["—", ""]);
      if (!prev || !prev.open) return i ? ["New regression", "fail"] : ["Open", "fail"];
      const changedCount = prev.tests.length !== f.tests.length;
      return changedCount ? [`Still failing (${f.tests.length} of ${prev.tests.length})`, "warn"] : ["Not fixed", "warn"];
    };
    v.innerHTML = `
      <div class="head"><div><h1>Did the fix work, and did it break anything?</h1><div class="sub">Same locked ${plural(S.set.total, "case")} plus regression cases from the findings fixed. Findings close only here.</div></div></div>
      <div class="card col" style="flex:none"><div class="card-h">Gate history</div><div class="history">${runs.map((r, i) => `${i ? '<span class="arrow">→</span>' : ""}<div class="hist-item"><span class="v">${esc(r.version)} · ${pct1(r.results.filter((x) => x.pass).length, r.results.length)}%</span><span class="stamp chip ${r.gate.status === "Blocked" ? "fail" : r.gate.status === "Pass" ? "pass" : "warn"}" style="font-size:15px;padding:4px 12px">${r.gate.status}</span></div>`).join("")}
        ${nv ? `<span class="arrow">→</span><div class="hist-item"><span class="v">${nv}</span><span class="chip" style="font-size:15px;padding:4px 12px">not run</span></div>` : ""}
        <span class="spacer"></span>${S.release ? `<span class="chip pass">Released ${esc(S.release.version)} · ${esc(S.release.by)}</span>` : `<button class="btn ${cur.gate.status === "Blocked" ? "" : "primary"}" id="btnRelease6">Approve release</button>`}</div></div>
      <div class="row grow">
        <div class="card col" style="flex:1.1">
          <div class="card-h">${toV && fromV !== toV ? `What changed in ${toV}` : "Changes"} <span class="spacer"></span>${nexts.length > 1 ? `<select id="rv" style="background:var(--surface-2);border:1px solid var(--line-2);border-radius:8px;padding:4px">${nexts.map((x) => `<option ${x === nv ? "selected" : ""}>${x}</option>`).join("")}</select>` : ""}</div>
          ${changed.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;padding:0 14px 8px">${changed.map((p) => `<button class="btn sm ${p === S.diffFile ? "primary" : ""}" data-df="${esc(p)}">${esc(p)}</button>`).join("")}</div>` : ""}
          <div class="scroll grow">${diffHtml}</div>
          <div class="foot-actions">${nv ? `<span class="muted" style="margin-right:auto">Rerun ${plural(S.set.total, "locked case")} + ${plural(extraFor(nv).length, "regression case")} against ${esc(versionLabel(nv))}?</span><button class="btn primary" id="btnRetest">Yes, rerun</button>` : `<span class="muted">No newer version to test.</span>`}</div>
        </div>
        <div class="col" style="flex:1;gap:14px">
          <div class="card col" style="flex:1"><div class="card-h">Pass rate by dimension <span class="sub">${runs.map((r) => r.version).join(" · ")}</span></div><div class="chart" id="cmp"></div></div>
          <div class="card col" style="flex:1.1"><div class="card-h">Finding status</div><div class="scroll"><table class="status-t"><thead><tr><th>Finding</th>${runs.map((r) => `<th>${esc(r.version)}</th>`).join("")}<th>Ticket</th></tr></thead><tbody>
            ${allIds.map((fid) => { const f = runs.map((r) => r.findings.find((x) => x.id === fid)).filter(Boolean).pop(); return `<tr><td><span class="mono">${fid}</span> <span class="chip ${f.sev}" style="font-size:11px">${f.sev}</span><div class="dim" style="font-size:13px">${esc(f.title)}</div></td>${runs.map((r, i) => { const s = statusOf(r, i, fid); return `<td><span class="chip ${s[1]}" style="font-size:12px">${s[0]}</span></td>`; }).join("")}<td class="mono" style="font-size:13px">${S.tickets[fid] ? `${S.tickets[fid].key}<div class="dim">${S.tickets[fid].status}</div>` : "–"}</td></tr>`; }).join("")}
          </tbody></table></div>
          <div class="foot-actions"><button class="btn" id="btnTickets6">Create tickets</button><button class="btn ghost" id="toReport6">Full report</button></div></div>
        </div>
      </div>`;
    $$("[data-df]", v).forEach((b) => { b.onclick = () => { S.diffFile = b.dataset.df; renderRetest(); }; });
    if ($("#rv")) $("#rv").onchange = (e) => { S.retestVersion = e.target.value; renderRetest(); };
    if ($("#btnRetest")) $("#btnRetest").onclick = () => {
      if (!Rules.canRun(true).ok) return;
      S.version = nv; S.files = Object.entries(SAMP[S.build][nv]).map(([path, text]) => ({ path, text })); S.scan = SC.scan(S.files);
      log(`Retest confirmed for ${versionLabel(nv)}`);
      startRun(nv, extraFor(nv), "sim");
    };
    if ($("#btnRelease6")) $("#btnRelease6").onclick = approveRelease;
    $("#btnTickets6").onclick = openTickets; $("#toReport6").onclick = () => go(5);
    drawCompare();
  }
  function drawCompare() {
    const box = $("#cmp"); if (!box) return;
    const W = box.clientWidth - 28, H = box.clientHeight - 8; if (W < 80) return;
    const runs = S.runs.slice(-3), dims = runs[runs.length - 1].scores.map((s) => s.dim), cols = ["#838D94", "#7DD3FC", "#B5F23D"].slice(-runs.length);
    const L = 34, B = H - 34, gw = (W - L) / dims.length, bw = Math.min(14, (gw - 10) / runs.length), y = (p) => B - (p / 100) * (B - 6);
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    [50, 100].forEach((t) => { s += `<line class="gridl" x1="${L}" x2="${W}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${L - 4}" y="${y(t) + 4}" text-anchor="end">${t}</text>`; });
    dims.forEach((d, i) => {
      const x0 = L + i * gw + (gw - bw * runs.length) / 2;
      runs.forEach((r, k) => { const sc = r.scores.find((q) => q.dim === d); if (!sc) return; s += `<rect x="${x0 + k * bw}" y="${y(sc.pct)}" width="${bw - 2}" height="${B - y(sc.pct)}" rx="2" fill="${cols[k]}" data-tip="${r.version} · ${DIM[d].short}: ${sc.passed}/${sc.total} (${sc.pct}%)"/>`; });
      const th = runs[runs.length - 1].scores.find((q) => q.dim === d).threshold;
      s += `<line x1="${x0 - 2}" x2="${x0 + bw * runs.length}" y1="${y(th)}" y2="${y(th)}" stroke="#ECEFF1" stroke-width="2"/>`;
      s += `<text class="ax" x="${L + i * gw + gw / 2}" y="${B + 16}" text-anchor="middle" style="font-size:11px">${({ transparency: "Transp.", compliance: "Compl.", accountability: "Account.", robustness: "Robust." })[d] || DIM[d].short}</text>`;
    });
    s += runs.map((r, k) => `<rect x="${L + k * 70}" y="${H - 10}" width="10" height="10" rx="2" fill="${cols[k]}"/><text class="ax" x="${L + k * 70 + 14}" y="${H - 1}">${r.version}</text>`).join("") + `<line x1="${L + runs.length * 70}" x2="${L + runs.length * 70 + 14}" y1="${H - 5}" y2="${H - 5}" stroke="#ECEFF1" stroke-width="2"/><text class="ax" x="${L + runs.length * 70 + 18}" y="${H - 1}">threshold</text>`;
    box.innerHTML = s + "</svg>";
  }

  // ---------------------------------------------------------------- uploads and results import
  $("#pickFolder").onchange = (e) => { const fl = Array.from(e.target.files || []); if (fl.length) loadUpload(fl, (fl[0].webkitRelativePath || "").split("/")[0]); e.target.value = ""; };
  $("#pickZip").onchange = (e) => { const f = e.target.files[0]; if (f) loadZip(f).catch((err) => toast("Couldn't read that .zip: " + err.message, true)); e.target.value = ""; };
  $("#pickResults").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      const map = E.parseResults(await f.text());
      const n = Object.keys(map).length, hit = S.set.cases.filter((c) => map[c.id]).length;
      if (!hit) { toast("No case IDs in that file match this test set.", true); return; }
      log(`Imported ${plural(n, "result")} from ${f.name} (${hit} of ${S.set.total} matched)`);
      startRun(S.version, [], "import", map);
    } catch (err) { toast("Couldn't read results: " + err.message, true); }
  };

  // ---------------------------------------------------------------- checks
  function check(id, label, expected, fn) { let a, p; try { const r = fn(); a = r[0]; p = r[1]; } catch (e) { a = "error: " + e.message; p = false; } return { id, label, expected, actual: a, pass: p }; }
  function sampleRun(build, version, tierName, extra) {
    const files = Object.entries(SAMP[build][version]).map(([path, text]) => ({ path, text })), set = G.generate({ build });
    const dm = files.find((f) => /data_map/.test(f.path)), appr = dm ? (dm.text.match(/^\s*path:\s*([^\s#]+)/gm) || []).map((l) => l.replace(/^\s*path:\s*/, "")) : [];
    const res = E.run(set, version, extra || [], appr), f = E.findings(build, res), sc = E.dimensionScores(res, tierName);
    return { set, res, f, sc, gate: E.gate(tierName, sc, f, {}, {}), files };
  }
  function runChecks() {
    return [
      check("K1", "Risk tier from intake", "High · High · Medium", () => { const t = ["policypal", "triagebot", "expense-scorer"].map((b) => E.riskTier(SAMPLES[b].intake)); return [t.join(" · "), t.join() === "High,High,Medium"]; }),
      check("K2", "Code reading, PolicyPal 1.0", "9 observations, 2 of 3 sources unapproved, no tools", () => { const s = SC.scan(Object.entries(SAMP.policypal["1.0"]).map(([path, text]) => ({ path, text }))); return [`${s.observations.length} observations, ${s.caps.unapproved.length} of ${s.caps.sources.length} unapproved, tools: ${s.caps.tools}`, s.observations.length === 9 && s.caps.unapproved.length === 2 && s.caps.sources.length === 3 && !s.caps.tools]; }),
      check("K3", "Default test set, PolicyPal", "240 cases, 10 dimensions", () => { const s = G.generate({ build: "policypal" }); return [`${s.total} cases, ${s.alloc.dims.length} dimensions`, s.total === 240 && s.alloc.dims.length === 10]; }),
      check("K4", "Test set validation", "7 of 7 pass; 1 near-duplicate replaced; 52%", () => { const s = G.generate({ build: "policypal" }), v = G.validate(s, {}); return [`${v.filter((x) => x.pass).length} of 7; ${s.replaced} replaced; ${v[4].detail}`, v.every((x) => x.pass) && s.replaced === 1 && v[4].detail === "52% should-answer"]; }),
      check("K5", "Reproducibility", "Same settings same fingerprint; new total new one", () => { const a = G.generate({ build: "policypal" }), b = G.generate({ build: "policypal" }), c = G.generate({ build: "policypal", total: 300 }); return [`${a.fingerprint} · ${b.fingerprint} · ${c.fingerprint}`, a.fingerprint === b.fingerprint && a.fingerprint !== c.fingerprint]; }),
      check("K6", "Run 1.0", "34 of 240 fail, 85.8%, 1·4·4·1, Blocked", () => { const r = sampleRun("policypal", "1.0", "High"), fl = r.res.filter((x) => !x.pass).length, o = r.f.filter((x) => x.open), c = (s) => o.filter((x) => x.sev === s).length; return [`${fl} of ${r.res.length}, ${pct(r.res.length - fl, r.res.length)}%, ${c("critical")}·${c("high")}·${c("medium")}·${c("low")}, ${r.gate.status}`, fl === 34 && c("critical") === 1 && c("high") === 4 && c("medium") === 4 && c("low") === 1 && r.gate.status === "Blocked"]; }),
      check("K7", "F1 evidence", "7 privacy tests, ingest.py", () => { const f = sampleRun("policypal", "1.0", "High").f.find((x) => x.id === "F1"); return [`${f.tests.length} tests, ${f.code.file}`, f.tests.length === 7 && f.code.file === "ingest.py" && f.tests.every((t) => t.c.dimension === "privacy")]; }),
      check("K8", "Retest 1.1", "10 of 252, 96.0%, F3 still failing, F11 new, Blocked", () => { const r = sampleRun("policypal", "1.1", "High", G.regressionCases("policypal", "1.1")), fl = r.res.filter((x) => !x.pass).length, o = r.f.filter((x) => x.open).map((x) => x.id); return [`${fl} of ${r.res.length}, ${pct(r.res.length - fl, r.res.length)}%, open ${o.join(" ")}, ${r.gate.status}`, fl === 10 && r.res.length === 252 && o.indexOf("F3") >= 0 && o.indexOf("F11") >= 0 && r.gate.status === "Blocked"]; }),
      check("K9", "Retest 1.2", "3 of 260, 98.8%, Conditional", () => { const r = sampleRun("policypal", "1.2", "High", G.regressionCases("policypal", "1.2")), fl = r.res.filter((x) => !x.pass).length; return [`${fl} of ${r.res.length}, ${pct(r.res.length - fl, r.res.length)}%, ${r.gate.status}, ${plural(r.f.filter((x) => x.open).length, "open finding")}`, fl === 3 && r.res.length === 260 && r.gate.status === "Conditional"]; }),
      check("K10", "Approvals", "Rules hold", () => {
        const crit = { sev: "critical", tests: [{ c: { dimension: "privacy" } }] }, high = { sev: "high", tests: [{ c: { dimension: "privacy" } }] };
        const blocked = { status: "Blocked" }, cond = { status: "Conditional", needsTickets: [] };
        const t = [!Rules.canApproveRelease("builder", cond).ok, !Rules.canApproveRelease("governance", blocked).ok, Rules.canApproveRelease("governance", cond).ok,
          !Rules.canException("privacy", crit, "a valid reason", "2026-12-01").ok, !Rules.canException("builder", high, "a valid reason", "2026-12-01").ok, Rules.canException("privacy", high, "a valid reason", "2026-12-01").ok,
          !Rules.canRun(false).ok, !Rules.canApproveSet("governance").ok, typeof E.closeFinding === "undefined"];
        return [`${t.filter(Boolean).length} of ${t.length} rules`, t.every(Boolean)];
      }),
      check("K11", "Synthetic data", "IDs in 900 range, emails at example.com", () => { const v = ["policypal", "triagebot", "expense-scorer"].map((b) => G.validate(G.generate({ build: b }), {})[3]); return [v.map((x) => x.detail.split(";")[0]).join(" · "), v.every((x) => x.pass)]; }),
      check("K12", "Imported results reproduce 1.0", "34 failures", () => { const r = sampleRun("policypal", "1.0", "High"); const map = {}; r.res.forEach((x) => { map[x.id] = JSON.parse(JSON.stringify(Object.assign({ id: x.id }, x.r))); }); const imp = E.runImported(r.set, [], map, ["s3://hr-share/policies/"]); const n = imp.filter((x) => !x.pass).length; return [`${n} failures`, n === 34]; }),
      check("K13", "Other builds", "TriageBot agency 6 of 25; scorer ratio 0.44", () => { const t = sampleRun("triagebot", "1.0", "High"), a = t.res.filter((x) => x.c.dimension === "agency"); const e = sampleRun("expense-scorer", "1.0", "Medium"), m = E.groupMetric("expense-scorer", e.res); const af = a.filter((x) => !x.pass).length; return [`${af} of ${a.length}; ${m.ratio}`, af === 6 && a.length === 25 && m.ratio === 0.44]; }),
      check("K14", "Counts of 0 and 1", "1 finding · 0 tickets · 1 case", () => { const s = [plural(1, "finding"), plural(0, "ticket"), plural(1, "case"), plural(2, "family", "families"), plural(1, "observation")].join(" · "); return [s, s === "1 finding · 0 tickets · 1 case · 2 families · 1 observation"]; }),
    ];
  }
  function renderChecks() {
    const res = runChecks(), p = res.filter((x) => x.pass).length;
    $("#checkCount").textContent = `${p}/${res.length}`;
    $("#checkList").innerHTML = res.map((r) => `<div class="check"><span class="id">${r.id}</span><div><b>${esc(r.label)}</b><div class="ex">Expected: ${esc(r.expected)}</div><div class="ex">Actual: ${esc(r.actual)}</div></div><span class="res ${r.pass ? "pass" : "fail"}">${r.pass ? "Pass" : "Fail"}</span></div>`).join("");
    return res;
  }
  $("#rerunChecks").onclick = () => { const r = renderChecks(); log(`Checks run: ${r.filter((x) => x.pass).length} of ${r.length} pass`); };

  // ---------------------------------------------------------------- top bar and keys
  $("#persona").innerHTML = PERSONAS.map((p) => `<option value="${p.id}">${p.name} · ${p.role}</option>`).join("");
  $("#persona").onchange = (e) => { S.persona = e.target.value; log(`Now viewing as ${who()}`); if (S.step === 5) renderReport(); };
  $("#btnLog").onclick = () => { $("#checkPanel").classList.remove("open"); $("#logPanel").classList.toggle("open"); };
  $("#btnChecks").onclick = () => { $("#logPanel").classList.remove("open"); renderChecks(); $("#checkPanel").classList.toggle("open"); };
  $$("[data-close]").forEach((b) => { b.onclick = () => $("#" + b.dataset.close).classList.remove("open"); });
  $("#drawerClose").onclick = () => $("#drawer").classList.remove("open");
  $("#overlay").onclick = (e) => { if (e.target.id === "overlay") $("#overlay").classList.remove("open"); };
  $("#btnPresenter").onclick = () => { document.body.classList.toggle("presenter"); setTimeout(() => go(S.step), 60); };
  $("#btnReset").onclick = () => { S = fresh(); $("#persona").value = S.persona; loadSampleFiles(); $("#drawer").classList.remove("open"); $("#logPanel").classList.remove("open"); $("#checkPanel").classList.remove("open"); log("Reset"); go(1); };
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select")) return;
    if (e.key >= "1" && e.key <= "6") go(Number(e.key));
    else if (e.key === "p" || e.key === "P") $("#btnPresenter").click();
    else if (e.key === "Escape") { $("#drawer").classList.remove("open"); $("#overlay").classList.remove("open"); $("#logPanel").classList.remove("open"); $("#checkPanel").classList.remove("open"); }
  });
  let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (!S.running) go(S.step); }, 150); });

  // ---------------------------------------------------------------- start
  loadSampleFiles();
  log("Opened the release gate");
  go(1);
  renderChecks();
  window.JA03App = { state: () => S, go, selectBuild, runChecks, startRun, openFinding };
})();
