/* JA-02 · reassessment diff: last assessment vs today's public evidence. Pure. */
(function (root) {
  const TRIG = { modelProvider: "Model provider change", subprocessors: "New subprocessor or region", training: "Policy change on training", soc2: "Lapsed attestation", iso42001: "Certification change", incidents: "Security incident" };
  function diff(prior, eff) {
    const out = [];
    const p = prior.facts;
    if (p.modelProvider !== eff.modelProvider) out.push({ field: "modelProvider", label: "Model provider", from: p.modelProvider, to: eff.modelProvider });
    if (p.regions !== eff.regions || p.subprocessors !== eff.subprocessors) out.push({ field: "subprocessors", label: "Subprocessors", from: p.subprocessors + " · " + p.regions, to: eff.subprocessors + " · " + eff.regions });
    if (p.training !== eff.training) out.push({ field: "training", label: "Trains on your data", from: p.training, to: eff.training });
    if (p.soc2.status !== eff.soc2) out.push({ field: "soc2", label: "SOC 2 Type II", from: p.soc2.status, to: eff.soc2 });
    if (!!p.iso42001 !== !!eff.iso42001) out.push({ field: "iso42001", label: "ISO 42001", from: p.iso42001 ? "Yes" : "No", to: eff.iso42001 ? "Yes" : "No" });
    if ((p.incidents || 0) !== (eff.incidents || 0)) out.push({ field: "incidents", label: "Incidents", from: p.incidents, to: eff.incidents });
    out.forEach(c => c.trigger = TRIG[c.field]);
    return out;
  }
  root.DF = { diff };
})(typeof window !== "undefined" ? window : globalThis);
