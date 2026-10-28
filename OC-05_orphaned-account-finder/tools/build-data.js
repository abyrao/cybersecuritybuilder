// OC-05 · Builds the fictional data set for the Orphaned Account Finder.
// Deterministic: same seed, same output. Run: node tools/build-data.js
// Writes data/seed.json and js/data.js (browsers block fetch() from file://).
"use strict";
const fs = require("fs");
const path = require("path");

const RUN = "2026-10-28";
let seed = 50528;
function rnd() { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const D = (s) => new Date(s + "T00:00:00Z");
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => iso(new Date(D(s).getTime() + n * 864e5));
const daysBetween = (a, b) => Math.round((D(b) - D(a)) / 864e5);

// ---------------------------------------------------------------- systems
const systems = [
  { id: "hr", generic: "HR system", real: "Workday", kind: "hr", feed: true, sso: null, volume: "4,200 active · 312 leavers", users: 4200 },
  { id: "corp", generic: "Corp directory", real: "AD corp", kind: "directory", feed: true, sso: null, volume: "5,140 users · 640 service", users: 5140, svc: 640, domain: "corp.harborline.local" },
  { id: "lark", generic: "Larkspur directory", real: "AD Larkspur", kind: "directory", feed: false, sso: null, volume: "610 users · 85 service", users: 610, svc: 85, domain: "larkspur.local", note: "Acquired Mar 2025. Trusted by corp. Not on the HR feed." },
  { id: "entra", generic: "Cloud directory", real: "Entra ID", kind: "directory", feed: true, sso: null, volume: "5,020 users", users: 5020 },
  { id: "okta", generic: "SSO", real: "Okta", kind: "sso", feed: true, sso: null, volume: "4,980 users", users: 4980 },
  { id: "plan", generic: "Planning app", real: "Anaplan", kind: "app", feed: true, sso: true, volume: "180 users · 6 integration", users: 180 },
  { id: "fin", generic: "Finance app", real: "NetSuite", kind: "app", feed: false, sso: false, volume: "340 users", users: 340, note: "Local accounts. Not behind SSO." },
  { id: "crm", generic: "CRM", real: "Salesforce", kind: "app", feed: true, sso: true, volume: "1,150 users", users: 1150 },
  { id: "code", generic: "Code repo", real: "GitHub", kind: "app", feed: true, sso: true, volume: "620 users", users: 620 },
  { id: "cloud", generic: "Cloud console", real: "AWS IAM", kind: "app", feed: true, sso: true, volume: "210 users", users: 210 },
  { id: "tick", generic: "Ticketing", real: "Jira", kind: "app", feed: true, sso: true, volume: "2,900 users", users: 2900 },
];

const depts = [
  { id: "fin", name: "Finance", size: 210 }, { id: "it", name: "IT", size: 160 }, { id: "eng", name: "Engineering", size: 640 },
  { id: "prod", name: "Product", size: 180 }, { id: "ops", name: "Operations", size: 520 }, { id: "ppl", name: "People", size: 120 },
  { id: "cs", name: "Customer Success", size: 980 }, { id: "mkt", name: "Marketing", size: 150 }, { id: "sales", name: "Sales", size: 1240 },
];
const titles = {
  fin: ["Financial analyst", "Accountant", "Payroll specialist", "AP specialist", "Controller"],
  it: ["Systems administrator", "Help desk analyst", "Network engineer", "IT support lead"],
  eng: ["Software engineer", "Data engineer", "Site reliability engineer", "QA engineer"],
  prod: ["Product manager", "Product designer", "UX researcher"],
  ops: ["Operations analyst", "Implementation specialist", "Operations manager"],
  ppl: ["HR business partner", "Recruiter", "People operations analyst"],
  cs: ["Customer success manager", "Support specialist", "Onboarding specialist"],
  mkt: ["Marketing analyst", "Content strategist", "Campaign manager"],
  sales: ["Account executive", "Sales development rep", "Sales engineer"],
};
const FIRST = ["Aaron", "Abigail", "Adebayo", "Aiko", "Alana", "Alejandro", "Amara", "Anil", "Ana", "Ben", "Bianca", "Brandon", "Caleb", "Camila", "Carmen", "Cheng", "Chloe", "Colin", "Dalia", "Daniel", "Darius", "Deepa", "Diego", "Eamon", "Elif", "Emma", "Ethan", "Farah", "Felix", "Fiona", "Gabriel", "Grace", "Hamid", "Hana", "Hector", "Ian", "Imani", "Irene", "Jamal", "Jasmine", "Javier", "Jin", "Julia", "Kai", "Kara", "Keisha", "Kenji", "Laila", "Leo", "Lucia", "Luis", "Malik", "Maya", "Mei", "Mila", "Nadia", "Naveen", "Noah", "Nora", "Olga", "Omar", "Owen", "Paula", "Quinn", "Rafael", "Rania", "Rosa", "Ryan", "Sade", "Samir", "Sara", "Sean", "Simone", "Sofia", "Tariq", "Tessa", "Theo", "Uma", "Valeria", "Victor", "Wen", "Yara", "Yusuf", "Zoe"];
const LAST = ["Abbott", "Acosta", "Adeyemi", "Alvarez", "Bauer", "Bennett", "Bose", "Brennan", "Calloway", "Chen", "Costa", "Dawson", "Delgado", "Doyle", "Eriksen", "Farouk", "Fischer", "Garner", "Gupta", "Haddad", "Hart", "Holm", "Ibarra", "Iyer", "Jensen", "Kaplan", "Kato", "Keane", "Kowalski", "Lambert", "Larsen", "Mahoney", "Marsh", "Mbeki", "Mendez", "Murphy", "Nakamura", "Novak", "Okafor", "Olsen", "Ortega", "Park", "Pereira", "Quigley", "Ramos", "Reed", "Rossi", "Sato", "Schultz", "Silva", "Sorensen", "Stone", "Takahashi", "Tran", "Ueda", "Vance", "Walsh", "Weber", "Xu", "Yilmaz", "Young", "Zamora"];

// ---------------------------------------------------------------- HR records
const hr = [];
const usedNames = new Set();
let nextE = 10100, nextC = 3200;
function person(o) {
  const r = Object.assign({ status: "Active", type: null, term: null, legalHold: false, priorId: null, larkspur: false, exec: false }, o);
  usedNames.add(r.name);
  if (!r.email) r.email = r.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, "").split(" ").join(".") + "@harborline.example";
  hr.push(r); return r;
}
function newName() { for (;;) { const n = pick(FIRST) + " " + pick(LAST); if (!usedNames.has(n)) return n; } }
const deptOf = (id) => depts.find((d) => d.id === id);

// Named records that the demo and the known-answer cases rely on.
const P = {};
P.whitford = person({ id: "E10412", name: "Jonah Whitford", dept: "it", title: "Systems administrator", manager: "Raj Menon", status: "Terminated", type: "Involuntary", term: "2026-08-31", larkspur: true, start: "2019-03-11" });
P.albright = person({ id: "E10988", name: "Denise Albright", dept: "fin", title: "AP clerk", manager: "Dana Kim", status: "Terminated", type: "Voluntary", term: "2026-07-18", start: "2022-05-02" });
P.reyes = person({ id: "E11307", name: "Marcus Reyes", dept: "sales", title: "Sales lead", manager: "Holly Brandt", status: "Terminated", type: "Voluntary", term: "2026-10-02", start: "2021-01-19" });
P.vasquez = person({ id: "E11045", name: "Elena Vasquez", dept: "prod", title: "Product manager", manager: "Owen Patterson", status: "Terminated", type: "Involuntary", term: "2026-09-04", legalHold: true, start: "2020-08-03" });
P.hale = person({ id: "E10233", name: "Gregory Hale", dept: "ops", title: "VP, Operations", manager: "CEO", status: "Terminated", type: "Voluntary", term: "2026-10-09", exec: true, start: "2017-06-12" });
P.castillo = person({ id: "E10760", name: "Renée Castillo", dept: "fin", title: "Finance systems engineer", manager: "Dana Kim", status: "Terminated", type: "Voluntary", term: "2026-09-17", start: "2018-10-01" });
P.morganT = person({ id: "E11520", name: "Chris Morgan", dept: "mkt", title: "Marketing analyst", manager: "Ivy Chandler", status: "Terminated", type: "Voluntary", term: "2026-09-25", email: "chris.morgan@harborline.example", start: "2023-02-13" });
P.morganA = person({ id: "E12688", name: "Chris Morgan", dept: "eng", title: "Software engineer", manager: "Leah Fontaine", status: "Active", email: "chris.morgan2@harborline.example", start: "2024-04-08" });
P.lindOld = person({ id: "E10877", name: "Maria Lindqvist", dept: "cs", title: "Support specialist", manager: "Tomas Riedel", status: "Terminated", type: "Voluntary", term: "2026-05-02", email: "maria.lindqvist@harborline.example", start: "2021-09-07" });
P.lindNew = person({ id: "E14102", name: "Maria Lindqvist", dept: "cs", title: "Customer success manager", manager: "Tomas Riedel", status: "Active", priorId: "E10877", email: "maria.lindqvist@harborline.example", start: "2026-09-08" });
P.ferrC = person({ id: "C3301", name: "Tomás Ferreira", dept: "eng", title: "Contract developer", manager: "Leah Fontaine", status: "Terminated", type: "Contract end", term: "2026-07-31", email: "tomas.ferreira@harborline.example", start: "2025-08-04" });
P.ferrE = person({ id: "E13950", name: "Tomás Ferreira", dept: "eng", title: "Software engineer", manager: "Leah Fontaine", status: "Active", priorId: "C3301", email: "tomas.ferreira@harborline.example", start: "2026-08-01" });
P.brooks = person({ id: "E11234", name: "Hannah Brooks", dept: "ppl", title: "Recruiter", manager: "Gwen Abara", status: "Leave of absence", loaSince: "2026-09-14", start: "2022-11-14" });
// Owners of service accounts who left cleanly.
P.lu = person({ id: "E10655", name: "Kevin Lu", dept: "eng", title: "Data engineer", manager: "Leah Fontaine", status: "Terminated", type: "Voluntary", term: "2026-08-14", start: "2020-02-03" });
P.okoro = person({ id: "E10391", name: "Ada Okoro", dept: "eng", title: "Build engineer", manager: "Leah Fontaine", status: "Terminated", type: "Voluntary", term: "2026-06-30", start: "2018-04-23" });

// 312 terminations since Apr 1, 2026. Named ones count toward the total.
const TOTAL_TERMS = 312;
const termDeptWeights = [["fin", 22], ["it", 16], ["eng", 52], ["prod", 14], ["ops", 44], ["ppl", 10], ["cs", 78], ["mkt", 14], ["sales", 62]];
function weightedDept() { const t = termDeptWeights.reduce((s, x) => s + x[1], 0); let r = rnd() * t; for (const [d, w] of termDeptWeights) { if ((r -= w) < 0) return d; } return "cs"; }
const mgrs = ["Dana Kim", "Raj Menon", "Holly Brandt", "Owen Patterson", "Ivy Chandler", "Leah Fontaine", "Tomas Riedel", "Gwen Abara", "Marta Quinn", "Sean Whitley"];
while (hr.filter((r) => r.status === "Terminated").length < TOTAL_TERMS) {
  const contract = rnd() < 0.05;
  const dept = weightedDept();
  const term = addDays("2026-04-01", int(0, daysBetween("2026-04-01", "2026-10-27")));
  let id; do { id = contract ? "C" + nextC++ : "E" + nextE++; } while (hr.some((x) => x.id === id));
  person({ id, name: newName(), dept, title: contract ? "Contractor" : pick(titles[dept]), manager: pick(mgrs), status: "Terminated", type: contract ? "Contract end" : rnd() < 0.18 ? "Involuntary" : "Voluntary", term, larkspur: dept !== "sales" && rnd() < 0.12, start: addDays("2018-01-01", int(0, 2700)) });
}
// A few active employees for scale (decoration only; volumes come from systems).
const terminated = hr.filter((r) => r.status === "Terminated");

// ---------------------------------------------------------------- accounts
const accounts = [];
let aid = 1;
function uname(name) { const [f, ...l] = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, "").split(" "); return f[0] + l.join(""); }
function acct(o) {
  const a = Object.assign({ id: "A" + String(aid++).padStart(4, "0"), kind: "person", enabled: true, empId: null, email: null, owner: null, groups: [], priv: 0, reach: [], lastLogon: null, pwdSet: null, disabledOn: null, created: null, events: [], logons: [] }, o);
  accounts.push(a); return a;
}
function systemsFor(r) {
  const s = ["corp", "entra", "okta"];
  if (r.larkspur) s.push("lark");
  const d = r.dept;
  if (d === "fin" && rnd() < 0.6) s.push("plan");
  if ((d === "fin" && rnd() < 0.8) || (d === "ops" && rnd() < 0.2)) s.push("fin");
  if (d === "sales" || (d === "cs" && rnd() < 0.9) || (d === "mkt" && rnd() < 0.5)) s.push("crm");
  if (d === "eng" || (d === "prod" && rnd() < 0.5) || (d === "it" && rnd() < 0.4)) s.push("code");
  if ((d === "eng" && rnd() < 0.4) || (d === "it" && rnd() < 0.3)) s.push("cloud");
  if (["eng", "prod", "cs", "ops", "it"].includes(d) ? rnd() < 0.9 : rnd() < 0.4) s.push("tick");
  return s;
}
const reachFor = { corp: ["email"], lark: ["email"], entra: ["email"], okta: ["email"], plan: ["forecast"], fin: ["gl"], crm: ["customer"], code: ["source"], cloud: ["prod"], tick: ["tickets"] };

// Removal delays for accounts closed normally. Median is set by construction.
function delayFor(sys) {
  if (sys === "fin") return null; // assigned below so the median is exactly 34
  if (sys === "lark") return null; // assigned below, median 47
  if (sys === "corp") return rnd() < 0.85 ? 0 : 1;
  if (sys === "code" || sys === "cloud") return rnd() < 0.8 ? 0 : 1;
  return 0;
}

// Which leavers keep live accounts (the 47). Named people first.
const orphanPlan = new Map(); // personId -> [systems left open]
orphanPlan.set(P.whitford.id, ["lark", "lark"]);
orphanPlan.set(P.albright.id, ["fin"]);
orphanPlan.set(P.reyes.id, ["crm"]);
orphanPlan.set(P.vasquez.id, ["corp"]);
orphanPlan.set(P.hale.id, ["okta", "entra"]);
orphanPlan.set(P.morganT.id, ["cloud"]);
// Remaining 39 open accounts across 23 generated people, by system.
const remaining = { corp: 5, lark: 6, entra: 2, okta: 1, fin: 8, crm: 6, code: 5, cloud: 3, tick: 3 };
const pool = terminated.filter((r) => !Object.values(P).includes(r));
const people23 = [];
const fitsSys = (r, s) => (s !== "lark" || r.larkspur) && (s !== "fin" || r.dept === "fin" || r.dept === "ops") && (s !== "crm" || ["sales", "cs", "mkt"].includes(r.dept)) && (s !== "code" || ["eng", "prod", "it"].includes(r.dept)) && (s !== "cloud" || ["eng", "it"].includes(r.dept));
const order = ["lark", "fin", "crm", "code", "cloud", "tick", "corp", "entra", "okta"];
for (const sysId of order) {
  let need = remaining[sysId];
  while (need > 0) {
    // Mostly new people; sometimes a second open account for someone already chosen.
    const slotsLeft = 23 - people23.length;
    const needLeft = order.slice(order.indexOf(sysId)).reduce((s, k) => s + remaining[k], 0) - (remaining[sysId] - need);
    let cand = null;
    if (slotsLeft === 0 || (needLeft > slotsLeft && rnd() < 0.6)) cand = people23.find((r) => fitsSys(r, sysId) && !orphanPlan.get(r.id).includes(sysId) && orphanPlan.get(r.id).length < 3);
    if (!cand) {
      const fits = pool.filter((r) => !people23.includes(r) && fitsSys(r, sysId));
      cand = pick(fits); orphanPlan.set(cand.id, []); people23.push(cand);
    }
    orphanPlan.get(cand.id).push(sysId); need--;
  }
}
if (people23.length !== 23) throw new Error("expected 23 generated orphan people, got " + people23.length);

// Fixed delay pools so the medians are exact.
function poolWithMedian(n, med, lo, hi) { const a = []; const half = Math.floor(n / 2); for (let i = 0; i < half; i++) a.push(int(lo, med - 1)); for (let i = 0; i < half; i++) a.push(int(med + 1, hi)); if (n % 2) a.push(med); else { a[half - 1] = med; a[half] = med; } return a.sort(() => rnd() - 0.5); }

const closedBySys = { fin: [], lark: [] };
for (const r of terminated) {
  const open = orphanPlan.get(r.id) || [];
  let sys = systemsFor(r);
  for (const s of open) if (!sys.includes(s)) sys.push(s);
  if (r === P.whitford) sys = ["corp", "entra", "okta", "lark", "lark", "tick", "cloud"];
  if (r === P.albright) sys = ["corp", "entra", "okta", "fin", "plan"];
  if (r === P.reyes) sys = ["corp", "entra", "okta", "crm", "tick"];
  if (r === P.vasquez) sys = ["corp", "entra", "okta", "tick", "code"];
  if (r === P.hale) sys = ["corp", "entra", "okta", "fin", "tick"];
  if (r === P.morganT) sys = ["corp", "entra", "okta", "crm", "cloud"];
  if (r === P.castillo) sys = ["corp", "entra", "okta", "plan", "fin"];
  if (r === P.lindOld) sys = ["corp", "entra", "okta", "crm", "tick"];
  if (r === P.ferrC) sys = ["corp", "entra", "okta", "code", "tick"];
  const openLeft = open.slice();
  const seen = {};
  for (const s of sys) {
    seen[s] = (seen[s] || 0) + 1;
    const isOpen = openLeft.includes(s); if (isOpen) openLeft.splice(openLeft.indexOf(s), 1);
    const base = { sys: s, display: r.name, empId: ["corp", "lark", "entra", "okta"].includes(s) ? r.id : null, email: ["corp", "lark"].includes(s) ? null : r.email, user: s === "lark" && r.larkspur ? uname(r.name) : uname(r.name), groups: [], priv: 0, reach: reachFor[s].slice(), lastLogon: addDays(r.term, -int(0, 3)), pwdSet: addDays(r.term, -int(20, 300)), created: r.start, personId: r.id };
    if (s === "lark") base.user = uname(r.name);
    if (isOpen) {
      acct(Object.assign(base, { enabled: true }));
    } else {
      const d = delayFor(s);
      const a = acct(Object.assign(base, { enabled: false }));
      if (d === null) closedBySys[s].push(a); else a.disabledOn = addDays(r.term, d);
    }
  }
}
// Larkspur and finance closed accounts: medians 47 and 34. Delays never run past the run date.
for (const [s, med, lo, hi] of [["fin", 34, 2, 80], ["lark", 47, 5, 95]]) {
  // Shortest delays go to the most recent leavers so no delay runs past the run date.
  const termOf = (a) => hr.find((r) => r.id === a.personId).term;
  const list = closedBySys[s].slice().sort((x, y) => (termOf(x) < termOf(y) ? 1 : -1));
  const pl = poolWithMedian(list.length, med, lo, hi).sort((x, y) => x - y);
  list.forEach((a, i) => { const t = termOf(a); const d = pl[i]; a.disabledOn = addDays(t, Math.min(d, Math.max(0, daysBetween(t, RUN) - 1))); });
}

// ---------------------------------------------------------------- shape the named accounts
const find = (pid, sys, n = 0) => accounts.filter((a) => a.personId === pid && a.sys === sys)[n];
{ // Larkspur admin: two live accounts in larkspur.local
  const a = find(P.whitford.id, "lark", 0); Object.assign(a, { user: "jwhitford", groups: ["Larkspur-Staff", "IT-Support"], priv: 1, reach: ["email"], lastLogon: "2026-08-28", pwdSet: "2026-02-03" });
  const b = find(P.whitford.id, "lark", 1); Object.assign(b, { user: "jwhitford-adm", groups: ["Domain Admins", "Server Operators", "Backup Operators"], priv: 3, reach: ["domain"], lastLogon: "2026-08-27", pwdSet: "2023-11-14", radius: "larkAdmin" });
}
Object.assign(find(P.albright.id, "fin"), { user: "dalbright", groups: ["AP Clerk", "AP Approver"], priv: 2, reach: ["payments"], lastLogon: "2026-07-17", pwdSet: "2026-01-12", radius: "apClerk" });
Object.assign(find(P.reyes.id, "crm"), { user: "mreyes", groups: ["Sales User", "Report Export"], priv: 0, reach: ["customer"], lastLogon: "2026-10-07", pwdSet: "2026-04-22", events: [{ date: "2026-10-07", what: "Exported report: Top accounts by ARR (2,140 rows)" }], radius: "crmExport" });
Object.assign(find(P.vasquez.id, "corp"), { user: "evasquez", groups: ["Product-Team", "Mailbox-Retain"], priv: 0, reach: ["email"], lastLogon: "2026-09-03", pwdSet: "2026-03-30" });
Object.assign(find(P.hale.id, "okta"), { user: "ghale", groups: ["Executives", "Board-Portal"], priv: 1, reach: ["email"], lastLogon: "2026-10-08", pwdSet: "2026-06-01" });
Object.assign(find(P.hale.id, "entra"), { user: "ghale", groups: ["Executives", "Ops-Leadership"], priv: 1, reach: ["email"], lastLogon: "2026-10-08", pwdSet: "2026-06-01" });
{ // Name-only cloud user: no employee ID, no email
  const a = find(P.morganT.id, "cloud"); Object.assign(a, { user: "chrismorgan", empId: null, email: null, display: "Chris Morgan", groups: ["marketing-analytics-readonly"], deptHint: "mkt", priv: 0, reach: ["customer"], lastLogon: "2026-09-20", pwdSet: "2024-07-09" });
}
// Active Chris Morgan: matched by ID, must never be flagged.
acct({ sys: "corp", user: "cmorgan2", display: "Chris Morgan", empId: P.morganA.id, groups: ["Engineering"], reach: ["email"], lastLogon: "2026-10-27", pwdSet: "2026-08-02", created: P.morganA.start, personId: P.morganA.id });
// Rehire: CRM account found by email; the newest HR record is active.
Object.assign(find(P.lindOld.id, "crm"), { enabled: true, disabledOn: null, empId: null, email: "maria.lindqvist@harborline.example", lastLogon: "2026-10-26", pwdSet: "2026-09-08" });
acct({ sys: "corp", user: "mlindqvist", display: "Maria Lindqvist", empId: P.lindNew.id, groups: ["Customer-Success"], reach: ["email"], lastLogon: "2026-10-27", pwdSet: "2026-09-08", created: P.lindNew.start, personId: P.lindNew.id });
// Conversion: code repo still carries the contractor ID.
Object.assign(find(P.ferrC.id, "code"), { enabled: true, disabledOn: null, empId: "C3301", email: null, lastLogon: "2026-10-27", pwdSet: "2026-08-01" });
// Leave of absence: enabled, owner on leave.
acct({ sys: "corp", user: "hbrooks", display: "Hannah Brooks", empId: P.brooks.id, groups: ["People-Team"], reach: ["email"], lastLogon: "2026-09-12", pwdSet: "2026-05-20", created: P.brooks.start, personId: P.brooks.id });
// Shared mailbox: no owner, sign-in blocked.
acct({ sys: "entra", kind: "shared", user: "ap-invoices", display: "AP Invoices (shared)", signInBlocked: true, groups: ["Finance-Shared"], reach: ["email"], lastLogon: null, pwdSet: null, created: "2021-03-02" });

// A finance account whose first removal attempt fails (shows verification).
const finGen = accounts.filter((a) => a.sys === "fin" && a.enabled && a.personId !== P.albright.id && a.personId !== P.hale.id);
finGen[2].failOnce = "Finance app still shows the account enabled: a local admin lock blocked the change (simulated).";

// Raise privilege on a few generated live accounts so not everything is a batch.
const genOpen = accounts.filter((a) => a.enabled && people23.some((r) => r.id === a.personId));
const bump = { code: ["Org-Owners", 2, ["source"]], cloud: ["PowerUserAccess", 2, ["prod"]] };
let bumped = 0;
for (const a of genOpen) {
  if (bump[a.sys] && bumped < 4) { a.groups = [bump[a.sys][0]]; a.priv = bump[a.sys][1]; a.reach = bump[a.sys][2]; bumped++; }
  else if (a.sys === "fin") { a.groups = [pick(["AR Clerk", "GL Reviewer", "Expense Approver", "Reporting"])]; a.priv = a.groups[0] === "Expense Approver" ? 1 : 0; a.reach = ["gl"]; }
  else if (a.sys === "crm") a.groups = ["Sales User"];
  else if (a.sys === "lark") a.groups = ["Larkspur-Staff"];
  else if (a.sys === "tick") a.groups = ["Jira-Users"];
  else if (a.sys === "code") a.groups = ["Developers"];
  else if (a.sys === "cloud") { a.groups = ["ReadOnlyAccess"]; }
  else a.groups = ["Staff"];
}
// One generated person signed in after leaving (second investigate case, low key).
const lateLogin = genOpen.find((a) => a.sys === "code");
if (lateLogin) { const t = hr.find((r) => r.id === lateLogin.personId).term; if (daysBetween(t, RUN) > 6) lateLogin.lastLogon = addDays(t, 3); }
// Stale credentials on some Larkspur accounts.
genOpen.filter((a) => a.sys === "lark").forEach((a, i) => { if (i % 2 === 0) a.pwdSet = addDays("2024-01-01", int(0, 300)); });

// ---------------------------------------------------------------- service accounts (11 orphaned)
const svcOwners = [P.castillo, P.lu, P.okoro, P.whitford];
const cleanPool = pool.filter((r) => !people23.includes(r));
while (svcOwners.length < 11) { const r = pick(cleanPool); if (!svcOwners.includes(r)) svcOwners.push(r); }
function sundaysBetween(from, to) { const out = []; let d = D(from); while (d.getUTCDay() !== 0) d = new Date(d.getTime() + 864e5); for (; d <= D(to); d = new Date(d.getTime() + 7 * 864e5)) out.push(iso(d)); return out; }
const svcDefs = [
  { sys: "corp", user: "svc-fpa-sync", owner: P.castillo, desc: "Loads general ledger actuals into the planning app every Sunday night", groups: ["FPA-Integration-Writers", "GL-Read-Actuals", "Batch-Logon"], priv: 3, reach: ["forecast", "gl"], pwdSet: "2024-08-29", logons: sundaysBetween("2026-07-05", "2026-10-25"), radius: "fpa" },
  { sys: "corp", user: "svc-crm-etl", owner: P.lu, desc: "Copies CRM accounts to the reporting warehouse nightly", groups: ["CRM-API-Read", "Warehouse-Writers"], priv: 1, reach: ["customer"], pwdSet: "2025-02-11", logons: ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"] },
  { sys: "code", user: "svc-build-runner", owner: P.okoro, desc: "Machine user for build pipelines; writes to 41 repositories", groups: ["Build-Bots", "Repo-Write"], priv: 2, reach: ["source"], pwdSet: "2024-03-02", logons: ["2026-10-22", "2026-10-24", "2026-10-26"] },
  { sys: "lark", user: "svc-scan-legacy", owner: P.whitford, desc: "Runs the Larkspur inventory scan", groups: ["Larkspur-Scanners", "Server Operators"], priv: 2, reach: ["domain"], pwdSet: "2022-12-05", logons: ["2026-10-17", "2026-10-24"] },
  { sys: "tick", user: "svc-backup-tick", desc: "Nightly ticketing backup job, retired in April", groups: ["Jira-Admins"], priv: 2, reach: ["tickets"], pwdSet: "2024-11-20", lastLogon: "2026-05-02" },
  { sys: "entra", user: "svc-report-mailer", desc: "Sends the weekly operations report", groups: ["Mail-Send-As"], priv: 1, reach: ["email"], pwdSet: "2025-05-30", lastLogon: "2026-07-10" },
  { sys: "lark", user: "svc-old-vpn-sync", desc: "Synced VPN groups before the network move", groups: ["VPN-Admins"], priv: 2, reach: ["domain"], pwdSet: "2021-09-14", lastLogon: "2026-03-01" },
  { sys: "cloud", user: "ci-deploy-key", desc: "Deploys to production from the old pipeline", groups: ["Prod-Deployers"], priv: 2, reach: ["prod"], pwdSet: "2024-06-18", lastLogon: "2026-09-01" },
  { sys: "corp", user: "svc-hris-export", desc: "Exports the employee roster to the badge system", groups: ["HRIS-Read", "Badge-Writers"], priv: 1, reach: ["employee"], pwdSet: "2025-01-08", lastLogon: "2026-08-20" },
  { sys: "fin", user: "svc-fin-import", desc: "Imported bank statements before the new connector", groups: ["Bank-Import"], priv: 1, reach: ["gl"], pwdSet: "2024-10-02", lastLogon: "2026-06-15" },
  { sys: "plan", user: "svc-plan-test", desc: "Test integration for the planning model", groups: ["Model-Builders"], priv: 1, reach: ["forecast"], pwdSet: "2025-03-17", lastLogon: "2026-04-30" },
];
svcDefs.forEach((d, i) => {
  const owner = d.owner || svcOwners[i];
  acct({ sys: d.sys, kind: "service", user: d.user, display: d.user, owner: owner.id, desc: d.desc, groups: d.groups, priv: d.priv, reach: d.reach, pwdSet: d.pwdSet, lastLogon: d.logons ? d.logons[d.logons.length - 1] : d.lastLogon, logons: d.logons || [d.lastLogon], created: addDays("2019-01-01", int(0, 1800)), radius: d.radius || null });
});

// ---------------------------------------------------------------- unowned (23)
const unowned = [
  ["corp", "test.user01", "Created for a 2024 migration test"], ["corp", "temp.audit2024", "Temporary auditor access"], ["corp", "kiosk-lobby-02", "Lobby check-in kiosk"], ["corp", "training07", "Training room login"],
  ["corp", "scanner-hp4", "Scan-to-email device"], ["lark", "admin2", "Second admin from before the acquisition"], ["lark", "lark-test", "Larkspur test account"], ["lark", "helpdesk.temp", "Temporary help desk login"],
  ["entra", "demo.sales", "Sales demo tenant user"], ["entra", "conf-room-3a", "Room booking"], ["entra", "vendor.bpo3", "Outsourced support agent"], ["okta", "qa.tester", "QA test user"],
  ["okta", "partner.portal", "Partner portal test"], ["crm", "integration.old", "Old marketing integration"], ["crm", "sandbox.user", "Copied from sandbox"], ["code", "deploy-bot-2", "Unknown automation user"],
  ["code", "intern.2025", "Summer intern shared login"], ["cloud", "s3-uploader", "Unknown IAM user with access key"], ["cloud", "backup-legacy", "Old backup user"], ["tick", "import.user", "Ticket import user"],
  ["tick", "it.shared", "Shared IT login"], ["fin", "fin.temp", "Year-end temporary user"], ["plan", "model.test", "Planning model test user"],
];
const privUnowned = { admin2: [3, ["domain"]], "s3-uploader": [2, ["prod"]], "deploy-bot-2": [2, ["source"]], "backup-legacy": [1, ["prod"]], "integration.old": [1, ["customer"]], "fin.temp": [1, ["gl"]], "it.shared": [1, ["tickets"]] };
for (const [sys, user, note] of unowned) {
  const p = privUnowned[user];
  const created = addDays("2021-01-01", int(0, 1500));
  acct({ sys, kind: "unknown", user, display: user, note, groups: [], priv: p ? p[0] : 0, reach: p ? p[1] : reachFor[sys].slice(), lastLogon: rnd() < 0.3 ? addDays(RUN, -int(1, 25)) : addDays(created, int(30, 300)), pwdSet: addDays(created, int(0, 60)), created, firstSeen: addDays("2026-08-05", int(0, 60)) });
}

// ---------------------------------------------------------------- run history (simulated)
// Daily runs since Aug 5. Weekly open count and new orphans per day.
const days = []; let d0 = "2026-08-05";
for (let i = 0; daysBetween(d0, RUN) >= 0; i++) { const dow = D(d0).getUTCDay(); const n = dow === 0 || dow === 6 ? 0 : (rnd() < 0.35 ? int(1, 3) : 0); days.push({ date: d0, found: n }); d0 = addDays(d0, 1); }
days[days.length - 1].found = 4;
const weeks = [118, 112, 104, 101, 97, 93, 90, 88, 86, 84, 83, 81];

const out = {
  meta: { company: "Harborline HCM", run: RUN, nextRun: "2026-10-29T06:00:00", generated: "tools/build-data.js", note: "All data is fictional." },
  systems, depts, hr: hr.map(({ _sys, _skip, ...r }) => r), accounts,
  history: { days, weeks, weekLabels: Array.from({ length: 12 }, (_, i) => addDays("2026-08-05", i * 7)) },
  rules: [
    { date: "2026-08-05", what: "First daily run: employee ID, then email" },
    { date: "2026-08-19", what: "Rehires and conversions follow the newest HR record" },
    { date: "2026-09-02", what: "Name-only matches go to review, never to removal" },
    { date: "2026-09-16", what: "Service accounts checked against their owner's HR status" },
    { date: "2026-10-07", what: "Shared mailboxes with sign-in blocked are excluded" },
  ],
};
const dir = path.join(__dirname, "..");
fs.writeFileSync(path.join(dir, "data", "seed.json"), JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(dir, "js", "data.js"), "// Generated by tools/build-data.js. Do not edit by hand.\nwindow.OAF_DATA = " + JSON.stringify(out) + ";\n");
console.log("hr", hr.length, "terminated", terminated.length, "accounts", accounts.length, "open person", accounts.filter((a) => a.kind === "person" && a.enabled).length);
