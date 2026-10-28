/* JA-09 engine. Pure functions, no browser dependencies: runs in the page and under Node.
   A direct port of tools/reference_model.py. */
(function (root) {
  "use strict";

  // Python's round(): halves go to the even neighbor
  function pyRound(x) {
    const f = Math.floor(x), d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }
  // Python round(x, 3): rounds the exact binary value, which toFixed also does
  const r3 = (x) => Number(x.toFixed(3));
  // Python 3.12 sum() of floats: Neumaier compensated summation
  function fsum(xs) {
    let s = 0, c = 0;
    for (const x of xs) { const t = s + x; c += Math.abs(s) >= Math.abs(x) ? (s - t) + x : (x - t) + s; s = t; }
    return s + c;
  }

  function build(policyDoc, quizDoc, programDoc) {
    const CLASSES = policyDoc.classes;
    const RANK = Object.fromEntries(CLASSES.map((c, i) => [c, i]));
    const DT = Object.fromEntries(policyDoc.data_types.map((d) => [d.id, d]));
    const TOOLS = policyDoc.tools;
    const TOOL = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
    const PURPOSE = Object.fromEntries(policyDoc.purposes.map((p) => [p.id, p.label]));
    const S = quizDoc.scoring;

    // ---------------------------------------------------------------- self-check
    function saferTool(data, purpose) {
      for (const t of TOOLS) {
        if (t.status === "blocked" || t.status === "public_only") continue;
        if (t.purposes && !t.purposes.includes(purpose)) continue;
        if (data.every((d) => RANK[DT[d].cls] <= RANK[t.max_class] || t.restricted_ok.includes(d))) return `Use ${t.name} instead.`;
      }
      if (data.some((d) => DT[d].cls === "Restricted")) return "No approved tool takes this data for this task. Remove or mask the restricted data, or request an exception.";
      return null;
    }
    function saferToolId(data, purpose) {
      for (const t of TOOLS) {
        if (t.status === "blocked" || t.status === "public_only") continue;
        if (t.purposes && !t.purposes.includes(purpose)) continue;
        if (data.every((d) => RANK[DT[d].cls] <= RANK[t.max_class] || t.restricted_ok.includes(d))) return t.id;
      }
      return null;
    }
    // opts: { reviewed = true, consent = true, customerFacing = false }
    function check(tool, data, purpose, opts) {
      opts = opts || {};
      const reviewed = opts.reviewed !== undefined ? opts.reviewed : true;
      const consent = opts.consent !== undefined ? opts.consent : true;
      const t = TOOL[tool];
      data = data.slice();
      const top = data.length ? data.map((d) => DT[d].cls).reduce((a, b) => (RANK[b] > RANK[a] ? b : a)) : "Public";
      const restricted = data.filter((d) => DT[d].cls === "Restricted");
      const customerFacing = !!opts.customerFacing || purpose === "reply";
      const out = (verdict, rule, clauses, safer, conditions) => ({ verdict, rule, clauses, safer: safer || null, conditions: conditions || [], data_class: top });
      if (data.some((d) => DT[d].never)) return out("not_approved", "R1", ["3.4"], "Remove the numbers, keys or passwords first, or use masked values (for example the last four digits).");
      if (purpose === "people") return out("not_approved", "R2", ["5.1", "2.1"], "Use AI to draft the job description or interview questions. Decisions about people stay with people.");
      if (purpose === "likeness") return out("not_approved", "R3", ["5.2"], "Use a stock voice or an illustrated character instead, or get the person's written consent first.");
      if (t.status === "blocked") return out("not_approved", "R4", ["4.2"], purpose === "meeting" ? "Use the company AI assistant's meeting notes, and tell everyone first." : "Use the company AI assistant instead.");
      if (t.status === "public_only" && RANK[top] > RANK.Public) return out("not_approved", "R5", ["4.3", "3.2"], saferTool(data, purpose));
      const tooHigh = data.filter((d) => RANK[DT[d].cls] > RANK[t.max_class] && !t.restricted_ok.includes(d));
      if (tooHigh.length) return out("not_approved", "R6", restricted.length ? ["3.3"] : ["3.2"], saferTool(data, purpose));
      if (t.purposes && !t.purposes.includes(purpose)) {
        return out("not_approved", "R7", ["4.1"], `${t.name} is approved for ${t.purposes.map((p) => PURPOSE[p].toLowerCase()).join(", ")}. ` + (saferTool(data, purpose) || ""));
      }
      if (customerFacing && !reviewed) return out("not_approved", "R8", ["6.1"], "Keep the AI draft, then have a person review and send it.");
      if (purpose === "meeting" && !consent) return out("not_approved", "R9", ["6.3"], "Tell everyone in the meeting first, then turn on notes.");
      const conds = [], clauses = [];
      if (t.status === "public_only") { conds.push("Don't sign in with your company email", "Paste only what's already published", "Check facts before you use it"); clauses.push("4.3"); }
      if (restricted.length) { conds.push("Use only the fields the task needs", "No card, bank or ID numbers"); clauses.push("3.3"); }
      if (customerFacing) { conds.push("A person reviews and sends the reply"); clauses.push("6.1"); }
      if (purpose === "meeting") { conds.push("Tell everyone before notes start", "Delete the recording within 30 days"); clauses.push("6.3"); }
      if (conds.length) return out("conditions", "R10", clauses.concat("6.2"), null, conds);
      return out("approved", "R11", ["6.2"], null, ["Check the output before you use it"]);
    }
    const checkInputs = (i) => check(i.tool, i.data, i.purpose, { reviewed: i.reviewed, consent: i.consent });

    // ---------------------------------------------------------------- quiz scoring
    function levelFor(pts) { let l = S.levels[0][0]; for (const [n, t] of S.levels) if (pts >= t) l = n; return l; }
    function nextLevel(pts) { for (const [n, t] of S.levels) if (pts < t) return { name: n, at: t }; return null; }
    // results: [{correct, hint}]
    function scoreRun(results) {
      let pts = 0, streak = 0, best = 0;
      for (const r of results) {
        if (r.correct) {
          streak += 1;
          pts += Math.max(0, S.correct - (r.hint ? S.hint_cost : 0));
          pts += Math.min(S.streak_step * (streak - 1), S.streak_cap);
        } else streak = 0;
        best = Math.max(best, streak);
      }
      const correct = results.filter((r) => r.correct).length;
      return { points: pts, best_streak: best, correct, level: levelFor(pts), passed: correct >= S.pass_correct };
    }
    const pointsFor = (correct, hint, streakBefore) => (correct ? Math.max(0, S.correct - (hint ? S.hint_cost : 0)) + Math.min(S.streak_step * streakBefore, S.streak_cap) : 0);

    // ---------------------------------------------------------------- program aggregates
    function passProb(rates, need) {
      let dp = [1].concat(rates.map(() => 0));
      for (const r of rates) dp = dp.map((v, k) => v * (1 - r) + (k ? dp[k - 1] * r : 0));
      return dp.slice(need).reduce((s, v) => s + v, 0);
    }
    function program() {
      const P = programDoc, Q = quizDoc.questions;
      const depts = [], qMissed = {}, qAttempts = {};
      const tot = { approved: 0, conditions: 0, not_approved: 0 }, byRule = {}, byTool = {}, byDeptTool = {};
      for (const d of P.departments) {
        const attempts = pyRound(d.headcount * P.completion[d.id]);
        const rates = Q.map((q) => P.quiz_rates[d.id][q.id]);
        const avg = fsum(rates) / rates.length;
        const passed = pyRound(attempts * passProb(rates, S.pass_correct));
        Q.forEach((q, i) => { qAttempts[q.id] = (qAttempts[q.id] || 0) + attempts; qMissed[q.id] = (qMissed[q.id] || 0) + attempts - pyRound(attempts * rates[i]); });
        const dc = { approved: 0, conditions: 0, not_approved: 0 };
        byDeptTool[d.id] = {};
        for (const [tid, n] of Object.entries(P.volume[d.id])) {
          const tpl = P.templates[tid], res = checkInputs(tpl);
          tot[res.verdict] += n; byRule[res.rule] = (byRule[res.rule] || 0) + n;
          byTool[tpl.tool] = byTool[tpl.tool] || {}; byTool[tpl.tool][res.verdict] = (byTool[tpl.tool][res.verdict] || 0) + n;
          const bt = (byDeptTool[d.id][tpl.tool] = byDeptTool[d.id][tpl.tool] || { approved: 0, conditions: 0, not_approved: 0 });
          bt[res.verdict] += n;
          dc[res.verdict] += n;
        }
        const total = dc.approved + dc.conditions + dc.not_approved;
        depts.push({ id: d.id, name: d.name, headcount: d.headcount, quiz_attempts: attempts, completion: r3(attempts / d.headcount),
          quiz_avg: r3(avg), passed, attested: r3(passed / d.headcount), checks: total,
          approved: dc.approved, conditions: dc.conditions, not_approved: dc.not_approved, not_approved_share: r3(dc.not_approved / total) });
      }
      const headcount = P.departments.reduce((s, d) => s + d.headcount, 0);
      const attempts = depts.reduce((s, d) => s + d.quiz_attempts, 0), passed = depts.reduce((s, d) => s + d.passed, 0);
      const checks = tot.approved + tot.conditions + tot.not_approved;
      const weighted = fsum(depts.map((d) => d.quiz_avg * d.quiz_attempts)) / attempts;
      const repRule = {}, repStatus = {};
      for (const r of P.reports) { repRule[r.rule] = (repRule[r.rule] || 0) + 1; repStatus[r.status] = (repStatus[r.status] || 0) + 1; }
      const naRule = {};
      Object.keys(byRule).sort().forEach((k) => { if (k !== "R10" && k !== "R11") naRule[k] = byRule[k]; });
      return {
        departments: depts,
        totals: { headcount, quiz_attempts: attempts, completion: r3(attempts / headcount), passed, attested: r3(passed / headcount), quiz_avg: r3(weighted),
          checks, approved: tot.approved, conditions: tot.conditions, not_approved: tot.not_approved, not_approved_share: r3(tot.not_approved / checks) },
        quiz_questions: Q.map((q) => ({ id: q.id, topic: q.topic, attempts: qAttempts[q.id], missed: qMissed[q.id], missed_share: r3(qMissed[q.id] / qAttempts[q.id]) })),
        not_approved_by_rule: naRule,
        by_tool: byTool,
        by_dept_tool: byDeptTool,
        reports: { total: P.reports.length, by_rule: repRule, by_status: repStatus,
          anonymous: P.reports.filter((r) => r.channel === "anonymous").length, talked_first: P.reports.filter((r) => r.talked_first).length, disciplinary: 0 },
        questions_total: P.questions.reduce((s, q) => s + q.count, 0),
      };
    }

    return { CLASSES, RANK, DT, TOOLS, TOOL, PURPOSE, S, check, checkInputs, saferTool, saferToolId, scoreRun, pointsFor, levelFor, nextLevel, passProb, program, pyRound };
  }

  const api = { build, pyRound };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JA09Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
