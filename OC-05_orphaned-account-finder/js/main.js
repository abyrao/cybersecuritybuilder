// OC-05 · Wiring: top bar, keyboard, checks, log, presenter, reset.
(function () {
  "use strict";
  const { $, $$, esc, S } = APP;

  const sel = $("#persona");
  sel.innerHTML = APP.PERSONAS.map((p) => `<option value="${p.id}">${esc(p.name.split(" ")[0])} · ${esc(p.short)}</option>`).join("");
  sel.value = S.persona;
  APP.setPersona = (id) => { S.persona = id; sel.value = id; const p = APP.persona(); APP.toast(`Viewing as ${p.name}, ${p.title}`); APP.render(); };
  sel.onchange = () => APP.setPersona(sel.value);

  $$(".tab").forEach((t) => (t.onclick = () => APP.go(t.dataset.view)));
  $$("#namesSeg button").forEach((b) => (b.onclick = () => { S.names = b.dataset.names; $$("#namesSeg button").forEach((x) => x.classList.toggle("on", x === b)); APP.render(); }));
  $$("#dataSeg button").forEach((b) => (b.onclick = () => {
    if (S.dataset === b.dataset.ds) return;
    S.dataset = b.dataset.ds; S.dec = {}; S.fixes = {};
    APP.recompute(); APP.views.map.replayIntro = true;
    APP.log(S.dataset === "seed" ? "Switched to the seeded data" : "Switched to all-clean data: every leaver removed on time");
    APP.render();
  }));
  $("#btnRunNow").onclick = () => APP.runNow();

  // checks
  function runChecks() { return window.OAF_CHECKS.run(APP.E, APP.DATA); }
  const first = runChecks(); const passed = first.filter((c) => c.ok).length;
  $("#checkCount").textContent = `${passed}/${first.length}`;
  $("#btnChecks").onclick = () => {
    const res = runChecks(); const ok = res.filter((c) => c.ok).length;
    $("#checkCount").textContent = `${ok}/${res.length}`;
    APP.modal(`<div class="card-h" style="padding:16px 18px 6px;font-size:19px">Known-answer checks <span class="sub">${ok} of ${res.length} pass, run live on the seeded data</span></div>
      <div class="body">${res.map((c) => `<div class="check-row"><span class="${c.ok ? "ok" : "bad"}">${c.ok ? "Pass" : "Fail"}</span><span class="mono faint">${c.id}</span><span><b>${esc(c.name)}</b><div class="faint" style="font-size:13px">${esc(c.expect)}</div></span><span class="muted">${esc(c.got)}</span></div>`).join("")}</div>
      <div class="foot"><span class="txt">Cases K1 to K10 are listed in REQUIREMENTS.md. The same checks run under Node with tools/run-checks.js.</span><button class="btn primary" id="ckClose">Close</button></div>`, (m) => ($("#ckClose", m).onclick = APP.closeModal));
    APP.log(`Ran known-answer checks: ${ok} of ${res.length} pass`);
  };

  // log drawer
  $("#btnLog").onclick = () => $("#logDrawer").classList.toggle("open");
  $("#btnLogClose").onclick = () => $("#logDrawer").classList.remove("open");

  // presenter + reset
  const presenter = (on) => { S.presenter = on; document.body.classList.toggle("presenter", on); APP.render(); };
  $("#btnPresenter").onclick = () => presenter(!S.presenter);
  $("#btnReset").onclick = () => APP.reset();

  // keyboard
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") { APP.closeModal(); $("#logDrawer").classList.remove("open"); return; }
    if ($("#modalRoot").innerHTML) return;
    const views = ["map", "departure", "radius", "review", "leaks", "runs"];
    if (/^[1-6]$/.test(e.key)) { APP.go(views[+e.key - 1]); return; }
    if (e.key === "p" || e.key === "P") { presenter(!S.presenter); return; }
    if (S.view === "review") {
      const k = e.key.toLowerCase();
      if (["d", "r", "k", "o", "c"].includes(k)) { APP.views.review.key(k); e.preventDefault(); return; }
      if (e.key === "Enter" && !e.target.closest("button")) { APP.views.review.approve(); e.preventDefault(); return; }
      if (e.key === "ArrowRight") { APP.views.review.step(1); return; }
      if (e.key === "ArrowLeft") { APP.views.review.step(-1); return; }
    }
  });

  APP.logStart = () => APP.log("Daily run at 06:00: 11 sources pulled, matched against 312 leavers. " + APP.plural(APP.R.findings.length, "account") + " flagged, " + APP.plural(APP.R.excluded.length, "record") + " excluded with a reason.", "Finder, scheduled run (simulated)");
  APP.logStart();
  APP.render();
})();
