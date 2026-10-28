// Confirms js/engine.js reproduces data/expected_results.json from the Python reference model.
// Usage: node tools/check-engine.js
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, "data", f), "utf8"));
const { build } = require(path.join(dir, "js", "engine.js"));
const policy = read("policy.json"), quiz = read("quiz.json"), program = read("program.json"), X = read("expected_results.json");
const E = build(policy, quiz, program);
let n = 0, fails = 0;
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : (v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
function cmp(label, got, exp) {
  n++;
  const pick = {};
  for (const k of Object.keys(exp)) pick[k] = got[k];
  const a = JSON.stringify(sortKeys(pick)), b = JSON.stringify(sortKeys(exp));
  if (a !== b) { fails++; console.log("FAIL", label, "\n  got", a.slice(0, 700), "\n  exp", b.slice(0, 700)); }
}
const CASES = {
  K1_customer_list_public_chatbot: ["T5", ["customer"], "summarize"],
  K2_customer_list_company_assistant: ["T1", ["customer"], "summarize"],
  K3_customer_reply_support_copilot: ["T2", ["customer"], "reply", { reviewed: true }],
  K4_card_numbers_support_copilot: ["T2", ["customer", "payment"], "reply"],
  K5_press_release_public_chatbot: ["T5", ["public"], "draft"],
  K6_code_no_secrets: ["T3", ["code"], "code"],
  K7_code_with_key: ["T3", ["code", "secrets"], "code"],
  K8_rank_applicants: ["T1", ["employee"], "people"],
  K9_auto_reply_no_review: ["T1", ["internal"], "reply", { reviewed: false }],
  K10_notehawk: ["T6", ["internal"], "meeting"],
  K11_company_notes_no_consent: ["T1", ["internal"], "meeting", { consent: false }],
  K12_company_notes_consent: ["T1", ["internal"], "meeting", { consent: true }],
};
for (const [k, args] of Object.entries(CASES)) cmp("check " + k, E.check(...args), X.self_check[k]);
for (const q of quiz.questions) cmp("quiz " + q.id, E.checkInputs(q.inputs), X.quiz_answers[q.id]);
const RUNS = {
  perfect: Array.from({ length: 12 }, () => ({ correct: true })),
  perfect_with_two_hints: Array.from({ length: 12 }, (_, i) => ({ correct: true, hint: i === 3 || i === 8 })),
  ten_correct_misses_q4_q11: Array.from({ length: 12 }, (_, i) => ({ correct: i !== 3 && i !== 10 })),
  nine_correct: Array.from({ length: 12 }, (_, i) => ({ correct: ![3, 5, 10].includes(i) })),
  none: Array.from({ length: 12 }, () => ({ correct: false })),
};
for (const [k, r] of Object.entries(RUNS)) cmp("run " + k, E.scoreRun(r), X.runs[k]);
const P = E.program();
cmp("totals", P.totals, X.program.totals);
X.program.departments.forEach((d, i) => cmp("dept " + d.id, P.departments[i], d));
X.program.quiz_questions.forEach((q, i) => cmp("question " + q.id, P.quiz_questions[i], q));
cmp("not approved by rule", P.not_approved_by_rule, X.program.not_approved_by_rule);
cmp("by tool", P.by_tool, X.program.by_tool);
cmp("reports", P.reports, X.program.reports);
cmp("questions total", { v: P.questions_total }, { v: X.program.questions_total });
console.log(`${n - fails} of ${n} comparisons match`);
process.exit(fails ? 1 : 0);
