// OC-05 · Known-answer checks (K1–K10 in REQUIREMENTS.md, plus totals). Run live in the browser and by tools/run-checks.js.
(function (root) {
  "use strict";
  function run(E, data) {
    const r = E.analyze(data);
    const F = (u, sys) => r.findings.find((f) => f.acct.user === u && (!sys || f.sys === sys));
    const X = (u) => r.excluded.find((x) => x.acct.user === u);
    const out = [];
    const check = (id, name, expect, fn) => { let ok = false, got = ""; try { const res = fn(); ok = res[0]; got = res[1]; } catch (e) { got = "error: " + e.message; } out.push({ id, name, expect, ok, got }); };

    check("K1", "Planning service account", "Service, score 94, reassign + rotate, delete blocked, 2 approvals", () => { const f = F("svc-fpa-sync"); return [f && f.cat === "service" && f.score.total === 94 && f.action === "reassign" && !!f.deleteBlocked && f.twoPerson, f ? `${f.cat}, ${f.score.total}, ${f.action}, ${f.deleteBlocked || "delete allowed"}` : "not found"]; });
    check("K2", "Larkspur admin", "Score 90 or more, domain admin, 2 approvals", () => { const f = F("jwhitford-adm"); return [f && f.score.total >= 90 && f.acct.groups.includes("Domain Admins") && f.twoPerson, f ? `score ${f.score.total}, ${f.twoPerson ? "2 approvals" : "1 approval"}` : "not found"]; });
    check("K3", "Accounts payable clerk", "Can create and approve vendor payments", () => { const f = F("dalbright"); return [f && f.top === "Can create and approve vendor payments", f ? f.top : "not found"]; });
    check("K4", "Export after leaving", "Investigate", () => { const f = F("mreyes"); return [f && f.investigate && f.twoPerson, f ? (f.investigate ? "Investigate: " + f.activityWhy : "no flag") : "not found"]; });
    check("K5", "Rehire", "Not flagged; excluded as Rehired", () => { const x = X("mlindqvist"); const f = r.findings.some((f) => f.rec && f.rec.name === "Maria Lindqvist"); return [!f && x && x.reason === "Rehired", f ? "flagged" : x ? "excluded: " + x.reason : "missing"]; });
    check("K6", "Conversion", "Not flagged; excluded as Converted", () => { const x = X("tferreira"); const f = F("tferreira"); return [!f && x && x.reason === "Converted", f ? "flagged" : x ? "excluded: " + x.reason : "missing"]; });
    check("K7", "Name twins", "Active Chris never flagged; name-only match goes to review", () => { const active = r.findings.some((f) => f.rec && f.rec.id === "E12688"); const f = F("chrismorgan"); return [!active && f && f.nameOnly && f.conf < E.MATCH_THRESHOLD && f.action === "confirm" && !f.batch, `${active ? "active flagged" : "active not flagged"}; name match ${f ? f.conf + "%, " + f.action : "missing"}`]; });
    check("K8", "Leave of absence", "Not flagged", () => { const f = F("hbrooks"); const x = X("hbrooks"); return [!f && x && x.reason === "Leave of absence", f ? "flagged" : "excluded: " + (x ? x.reason : "none")]; });
    check("K9", "Legal hold", "Flagged; disable allowed; delete blocked", () => { const f = F("evasquez"); return [f && f.legalHold && f.action === "disable" && /Legal hold/.test(f.deleteBlocked || ""), f ? `${f.action}; ${f.deleteBlocked || "delete allowed"}` : "not found"]; });
    check("K10", "All clean", "No orphaned accounts; \"1 account\" at 1", () => { const c = E.analyze(E.cleanData(data)); return [c.findings.length === 0 && E.plural(1, "account") === "1 account" && E.plural(0, "account") === "0 accounts", plural(c.findings.length) + "; " + E.plural(1, "account")]; });
    check("T1", "Totals", "47 person · 11 service · 23 unowned", () => { const s = r.stats; return [s.person === 47 && s.service === 11 && s.unowned === 23 && s.people === 29, `${s.person} · ${s.service} · ${s.unowned} (${s.people} people)`]; });
    check("T2", "Leak sources", "17 of 47 from Larkspur and finance; medians 34 and 0", () => { const s = r.stats; const n = (s.roots.feed || 0) + (s.roots.sso || 0); return [n === 17 && s.medians.fin === 34 && s.medians.crm === 0 && s.medians.okta === 0, `${n} of ${s.person}; finance ${s.medians.fin}, SSO ${s.medians.okta}`]; });
    function plural(n) { return E.plural(n, "orphaned account"); }
    return out;
  }
  const api = { run };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.OAF_CHECKS = api;
})(typeof window !== "undefined" ? window : globalThis);
