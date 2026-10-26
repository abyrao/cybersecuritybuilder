/* JA-02 · simulated public recon. Turns source documents into cited facts, flags stale facts and conflicts.
   Pure: swap this module for a real collector later. */
(function (root) {
  const DAY = 864e5;
  const age = (d, today) => Math.round((Date.parse(today) - Date.parse(d)) / DAY);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const TRAIN_RANK = { "none": 0, "retention30": 1, "trains-optout": 2, "trains-noopt": 3 };
  const OFFICIAL = { trust: .9, privacy: .95, terms: .9, subproc: .9, aipolicy: .85, certs: .95, sectxt: .9, news: .7, reg: .8 };

  function recon(vendor, today) {
    const facts = {};
    (vendor.sources || []).forEach(s => {
      Object.keys(s.facts).forEach(field => {
        const f = facts[field] || (facts[field] = { field, sources: [] });
        f.sources.push({ type: s.type, url: s.url, published: s.published, checked: s.checked, quote: s.facts[field].quote, value: s.facts[field].value, ageDays: age(s.published, today) });
      });
    });
    const conflicts = [], stale = [];
    Object.values(facts).forEach(f => {
      const vals = f.sources.map(s => s.value);
      f.conflict = vals.some(v => !same(v, vals[0]));
      // Riskier value wins for training until a person resolves it; otherwise the newest source wins.
      if (f.field === "training") f.value = vals.slice().sort((a, b) => TRAIN_RANK[b] - TRAIN_RANK[a])[0];
      else f.value = f.sources.slice().sort((a, b) => b.published.localeCompare(a.published))[0].value;
      const newest = f.sources.slice().sort((a, b) => b.published.localeCompare(a.published))[0];
      f.primary = newest;
      f.stale = newest.ageDays > 365;
      if (f.field === "soc2" && f.value && f.value.periodEnd && age(f.value.periodEnd, today) > 365) { f.stale = true; f.value = Object.assign({}, f.value, { status: "expired" }); }
      if (f.field === "biasAudit" && /Published/.test(String(f.value)) && newest.ageDays > 365) f.stale = true;
      f.confidence = Math.round((f.conflict ? .5 : Math.max(...f.sources.map(s => OFFICIAL[s.type] || .7))) * 100) / 100;
      if (f.conflict) conflicts.push(f.field);
      if (f.stale) stale.push(f.field);
    });
    return { facts, conflicts, stale, filled: Object.keys(facts).length, sources: (vendor.sources || []).length };
  }

  // Effective values used for scoring, after any resolutions a person recorded
  function effective(rec, resolutions) {
    const v = k => (resolutions && resolutions[k] !== undefined) ? resolutions[k] : (rec.facts[k] ? rec.facts[k].value : undefined);
    const soc2 = v("soc2");
    const mp = String(v("modelProvider") || "");
    return {
      training: v("training") || "retention30",
      soc2: soc2 ? soc2.status : "none",
      iso42001: !!v("iso42001"),
      incidents: v("incidents") || 0,
      modelDisclosed: !mp || /disclosed|In-house/.test(mp),
      modelProvider: mp, regions: v("regions"), subprocessors: v("subprocessors")
    };
  }

  root.R = { recon, effective, age };
})(typeof window !== "undefined" ? window : globalThis);
