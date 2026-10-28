/* OC-04 · Response engine (pure logic, no DOM).
   Builds the questions, matches them to the bank, checks freshness against source
   signals, and applies approvals. Matching and drafting are simulated. */
(function () {
  const D = window.OC4;
  const DOMAIN_ORDER = Object.keys(D.domains);
  const DAY = 864e5;

  /* ── helpers ─────────────────────────────────────────────── */
  function rng(seed) {             // mulberry32: same seed, same questions
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
  const clone = o => JSON.parse(JSON.stringify(o));
  function plural(n, one, many) { return `${n.toLocaleString('en-US')} ${n === 1 ? one : (many || one + 's')}`; }
  function fmtDate(d) {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${m[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}, ${d.slice(0, 4)}`;
  }
  function fmtShort(d) { return fmtDate(d).replace(/, \d{4}$/, ''); }

  const STD = [
    n => `Describe your approach to ${n}.`,
    (n, pl) => `${pl ? 'Are' : 'Is'} ${n} documented and approved by management?`,
    n => `How do you monitor the effectiveness of ${n}?`,
    n => `Who is accountable for ${n}?`,
    (n, pl) => `${pl ? 'Are' : 'Is'} ${n} reviewed at least annually?`,
    n => `Provide evidence of ${n}.`
  ];
  const LOOSE = [
    n => `Tell us how you think about ${n}.`,
    n => `What is your position on ${n} for an engagement like ours?`,
    n => `Please comment on anything related to ${n}.`,
    n => `Explain any arrangements you have around ${n}.`
  ];

  /* ── build ───────────────────────────────────────────────── */
  function build() {
    const S = {
      today: D.today,
      entries: {},
      order: [],
      signals: clone(D.signals).map(s => Object.assign(s, { status: 'open' })),
      qns: [],
      questions: [],
      log: [],
      added: [],             // new entries from approved AI drafts
      learned: 0,            // phrasings learned from approved reviews
      sent: {},              // questionnaire id → time sent
      bridgeRequested: false
    };
    D.bank.forEach(b => {
      const e = clone(b);
      e.scope = e.scope || [];
      e.notes = e.notes || {};
      e.versions = [{ date: e.reviewed, text: e.answer, by: e.owner, note: 'Last reviewed' }];
      e.phrasings = [];
      S.entries[e.id] = e;
      S.order.push(e.id);
    });

    const R = rng(4404);
    D.questionnaires.forEach(spec => {
      const qn = { id: spec.id, customer: spec.customer, short: spec.short, format: spec.format, count: spec.count,
        tier: spec.tier, arr: spec.arr, due: spec.due, dealClose: spec.dealClose, nda: spec.nda,
        products: spec.products, industry: spec.industry, questions: [] };
      const inScope = e => !e.scope.length || e.scope.some(p => spec.products.includes(p));
      const blocked = new Set(Object.keys(spec.held));
      S.signals.forEach(s => blocked.add(s.entry));           // anything a signal touches
      D.bank.forEach(b => { if (expiringEv(S, S.entries[b.id])) blocked.add(b.id); });
      const pool = S.order.map(id => S.entries[id]).filter(e => inScope(e) && !blocked.has(e.id));
      const items = [];

      Object.entries(spec.held).forEach(([id, n]) => {
        const e = S.entries[id];
        for (let i = 0; i < n; i++) items.push({ entry: id, domain: e.domain, src: 'held', text: phrase(e, i), conf: 88 + Math.floor(R() * 11) });
      });
      spec.noMatch.forEach(m => items.push({ entry: null, domain: m.domain, src: 'draft', text: m.text, conf: m.conf, draft: m.draft, rel: m.rel }));
      (spec.outOfScope || []).forEach(id => {
        const e = S.entries[id];
        items.push({ entry: id, domain: e.domain, src: 'na', text: e.q[0], conf: 93 });
      });
      const shuffled = pool.slice().sort(() => R() - 0.5);
      for (let i = 0; i < spec.review; i++) {
        const e = shuffled[i % shuffled.length];
        items.push({ entry: e.id, domain: e.domain, src: 'review', text: LOOSE[Math.floor(R() * LOOSE.length)](e.noun), conf: 61 + Math.floor(R() * 24) });
      }
      const used = {};
      let k = 0;
      while (items.length < spec.count) {
        const e = pool[k % pool.length];
        const u = used[e.id] || 0;
        const total = e.q.length + STD.length;
        if (u < total) {
          items.push({ entry: e.id, domain: e.domain, src: 'auto', text: phrase(e, u), conf: 86 + Math.floor(R() * 14) });
          used[e.id] = u + 1;
        }
        k++;
      }

      items.sort((a, b) => DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain) || R() - 0.5);
      const per = {};
      items.forEach((it, i) => {
        const dm = D.domains[it.domain];
        per[it.domain] = (per[it.domain] || 0) + 1;
        const n = per[it.domain];
        let qid;
        if (spec.format === 'SIG Lite') qid = `${dm.sig}.${n}`;
        else if (spec.format === 'CAIQ v4') qid = `${dm.caiq}-${String(Math.ceil(n / 3)).padStart(2, '0')}.${(n - 1) % 3 + 1}`;
        else qid = `Q${i + 1}`;
        const q = Object.assign(it, { id: `${spec.id}-${i + 1}`, qid, qn: spec.id, resolved: null, answerText: null, wasHeld: false });
        qn.questions.push(q);
        S.questions.push(q);
      });
      qn.domains = Object.keys(per).length;
      S.qns.push(qn);
    });
    S.questions.forEach(q => { q.initial = qStatus(S, q); q.wasHeld = ['stale', 'legal'].includes(q.initial); });
    return S;
  }

  function phrase(e, i) {
    if (i < e.q.length) return e.q[i];
    return STD[(i - e.q.length) % STD.length](e.noun, e.pl);
  }

  /* ── entry state ─────────────────────────────────────────── */
  function expiringEv(S, e) {
    return (e.evidence || []).find(ev => days(S.today, ev.expires) <= D.expiryWindowDays && days(S.today, ev.expires) >= 0) || null;
  }
  function openSignal(S, entryId) { return S.signals.find(s => s.entry === entryId && s.status === 'open') || null; }
  function entryState(S, e) {
    if (e.legal) return 'legal';
    if (openSignal(S, e.id)) return 'stale';
    if (expiringEv(S, e)) return 'expiring';
    return 'current';
  }
  function usedBy(S, entryId, openOnly) {
    return S.questions.filter(q => q.entry === entryId && (!openOnly || !S.sent[q.qn]));
  }

  /* ── question state ──────────────────────────────────────── */
  function qStatus(S, q) {
    if (q.src === 'na') return 'na';
    if (q.resolved) return 'approved';
    if (q.src === 'draft') return 'draft';
    const e = S.entries[q.entry];
    const sig = openSignal(S, e.id);
    if (sig && sig.kind === 'legal') return 'legal';
    if (sig) return 'stale';
    if (q.conf < D.autoThreshold) return 'review';
    if (expiringEv(S, e)) return 'expiring';
    return q.wasHeld ? 'refreshed' : 'auto';
  }
  const READY = new Set(['auto', 'refreshed', 'approved', 'na']);
  const PERSON = new Set(['review', 'draft', 'expiring']);
  const HELD = new Set(['stale', 'legal']);

  function answerFor(S, q) {
    if (q.answerText) return q.answerText;
    const qn = S.qns.find(x => x.id === q.qn);
    if (q.src === 'draft') return q.draft;
    const e = S.entries[q.entry];
    if (q.src === 'na') return `Not applicable: ${qn.customer}'s contract covers ${qn.products.join(', ')} only, and this control applies to the ${e.scope.join(', ')} module.`;
    let t = e.answer;
    Object.entries(e.notes).forEach(([p, n]) => { if (qn.products.includes(p)) t += ' ' + n; });
    const ev = expiringEv(S, e);
    if (ev) t += ' ' + expiryNote(e, ev);
    return t;
  }
  function expiryNote(e, ev) {
    if (e.id === 'B27') return `The current report covers the period through Sep 30, 2026; a bridge letter covering the gap to the next report is available on request.`;
    return `The current ${ev.name.toLowerCase().replace(/^\d{4} /, '')} is valid through ${fmtDate(ev.expires)}; an updated version will be provided when issued.`;
  }

  function why(S, q) {
    const qn = S.qns.find(x => x.id === q.qn);
    const sim = (q.conf / 100 - 0.07).toFixed(2);
    if (q.src === 'draft') {
      return `No bank entry scored above ${D.matchFloor} (best ${q.conf}). The simulated AI drafted from related entries ${q.rel.join(' and ')} and marked gaps for the owner instead of inventing a control.`;
    }
    const e = S.entries[q.entry];
    const how = qn.format === 'Custom'
      ? `No standard IDs in a custom questionnaire, so it was matched by meaning (simulated): wording similarity ${sim} to "${e.noun}".`
      : `${qn.format} ${q.qid} maps to ${e.id} ${e.title} in the crosswalk; wording similarity ${sim} (simulated).`;
    const st = qStatus(S, q);
    const tail = {
      auto: `Confidence ${q.conf} is at or above the ${D.autoThreshold} auto-answer threshold, and the entry is current.`,
      refreshed: `Answered automatically after the bank change was approved.`,
      approved: `Approved by ${q.resolved && q.resolved.by}.`,
      na: `The entry applies to the ${e.scope.join(', ')} module, which ${qn.customer} has not bought.`,
      review: `Loose wording: confidence ${q.conf} is below the ${D.autoThreshold} threshold, so a person confirms it.`,
      stale: (() => { const s = openSignal(S, e.id); return s ? `Held: ${s.owner} changed on ${fmtShort(s.date)}, after the entry was last reviewed on ${fmtShort(e.reviewed)}.` : ''; })(),
      legal: `Held: the entry is legal-locked and a policy change touches it. Only Counsel can change it.`,
      expiring: (() => { const ev = expiringEv(S, e); return ev ? `${ev.name} expires ${fmtShort(ev.expires)}, within ${D.expiryWindowDays} days. A note was added; a person approves before it is sent.` : ''; })()
    }[st];
    return `${how} ${tail}`;
  }

  /* ── permissions and actions ─────────────────────────────── */
  function persona(id) { return D.personas.find(p => p.id === id); }
  function can(pid, what) { return persona(pid).can.includes(what); }
  function log(S, who, action, target, reason) {
    S.log.unshift({ t: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }), who, action, target, reason });
  }

  function approveSignal(S, sigId, pid, editedText) {
    const s = S.signals.find(x => x.id === sigId);
    const e = S.entries[s.entry];
    const need = s.kind === 'legal' ? 'legal' : 'bank';
    if (!can(pid, need)) return { ok: false, need };
    const held = S.questions.filter(q => q.entry === e.id && ['stale', 'legal'].includes(qStatus(S, q)));
    const text = editedText || s.proposed;
    if (text) e.answer = text;
    if (s.evidence) e.evidence = [s.evidence];
    e.reviewed = S.today;
    e.versions.unshift({ date: S.today, text: e.answer, by: persona(pid).name, note: editedText ? 'Edited and approved' : 'Approved from ' + s.owner.split(' · ')[0] });
    s.status = 'approved';
    log(S, persona(pid).name, 'Approved bank change', `${e.id} ${e.title}`, `${s.summary}; ${plural(held.length, 'answer')} refreshed`);
    return { ok: true, refreshed: held.map(q => q.id), entry: e.id };
  }
  function keepSignal(S, sigId, pid, reason) {      // reject or keep current text
    const s = S.signals.find(x => x.id === sigId);
    const e = S.entries[s.entry];
    const need = s.kind === 'legal' ? 'legal' : 'bank';
    if (!can(pid, need)) return { ok: false, need };
    const held = S.questions.filter(q => q.entry === e.id && ['stale', 'legal'].includes(qStatus(S, q)));
    e.reviewed = S.today;
    e.versions.unshift({ date: S.today, text: e.answer, by: persona(pid).name, note: 'Kept current answer' });
    s.status = 'kept';
    log(S, persona(pid).name, 'Kept current answer', `${e.id} ${e.title}`, reason || 'Change not accepted');
    return { ok: true, refreshed: held.map(q => q.id), entry: e.id };
  }
  function approveQuestion(S, qId, pid, editedText) {
    if (!can(pid, 'answer')) return { ok: false, need: 'answer' };
    const q = S.questions.find(x => x.id === qId);
    const st = qStatus(S, q);
    if (!PERSON.has(st)) return { ok: false, need: 'state' };
    const text = editedText || answerFor(S, q);
    q.answerText = text;
    q.resolved = { by: persona(pid).name, kind: st, edited: !!editedText };
    if (st === 'draft') {
      const id = 'N' + String(S.added.length + 1).padStart(2, '0');
      S.added.push({ id, text: q.text, answer: text });
      log(S, persona(pid).name, 'Approved AI draft', `${q.qid} · ${short(q.qn)}`, `Saved to the bank as new entry ${id}`);
    } else if (st === 'review') {
      S.entries[q.entry].phrasings.push(q.text);
      S.learned++;
      log(S, persona(pid).name, editedText ? 'Edited and approved' : 'Approved answer', `${q.qid} · ${short(q.qn)}`, `Phrasing saved to ${q.entry} for next time`);
    } else {
      log(S, persona(pid).name, 'Approved with expiry note', `${q.qid} · ${short(q.qn)}`, expiringEv(S, S.entries[q.entry]).name);
    }
    return { ok: true };
  }
  function short(id) { return D.questionnaires.find(x => x.id === id).short; }

  function send(S, qnId, pid) {
    if (!can(pid, 'export')) return { ok: false, need: 'export' };
    const qn = S.qns.find(x => x.id === qnId);
    const open = qn.questions.filter(q => !READY.has(qStatus(S, q))).length;
    if (open) return { ok: false, need: 'complete', open };
    S.sent[qnId] = new Date().toISOString();
    log(S, persona(pid).name, 'Approved and sent (simulated)', qn.customer, `${plural(qn.count, 'answer')} exported to CSV`);
    return { ok: true, csv: csv(S, qn) };
  }
  function csv(S, qn) {
    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['Question ID', 'Question', 'Answer', 'Bank entry', 'Status']];
    qn.questions.forEach(q => rows.push([q.qid, q.text, answerFor(S, q), q.entry || 'New', qStatus(S, q)]));
    return rows.map(r => r.map(esc).join(',')).join('\r\n');
  }

  /* ── metrics ─────────────────────────────────────────────── */
  function counts(S, list) {
    const c = { auto: 0, refreshed: 0, approved: 0, na: 0, review: 0, draft: 0, expiring: 0, stale: 0, legal: 0 };
    (list || S.questions).forEach(q => c[qStatus(S, q)]++);
    c.ready = c.auto + c.refreshed + c.approved + c.na;
    c.person = c.review + c.draft + c.expiring;
    c.held = c.stale + c.legal;
    c.open = c.person + c.held;
    c.total = (list || S.questions).length;
    return c;
  }
  function bankCounts(S) {
    const c = { current: 0, stale: 0, expiring: 0, legal: 0 };
    S.order.forEach(id => c[entryState(S, S.entries[id])]++);
    return c;
  }
  function openChanges(S) { return S.signals.filter(s => s.status === 'open'); }
  function effortMinutes(S) {
    const E = D.effort, c = counts(S);
    const changes = openChanges(S);
    return c.review * E.review + c.draft * E.draft + c.expiring * E.expiring
      + changes.filter(s => s.kind !== 'legal').length * E.bankChange
      + changes.filter(s => s.kind === 'legal').length * E.legal;
  }
  function metrics(S) {
    const c = counts(S);
    const manual = S.questions.length * D.effort.manualPerQuestion;
    const engine = effortMinutes(S);
    const initialAuto = S.questions.filter(q => q.src === 'auto' || q.src === 'na').length;
    return {
      c, bank: bankCounts(S), manualMin: manual, engineMin: engine,
      autoPct: initialAuto / S.questions.length,
      initialAuto,
      savedPerQn: (manual - engine) / S.qns.length / 60,
      changes: openChanges(S).length,
      changesDone: S.signals.filter(s => s.status !== 'open').length,
      staleQuestions: S.questions.filter(q => q.initial === 'stale').length,
      staleEntries: D.signals.filter(s => s.kind !== 'legal').length
    };
  }
  /* Next cycle: the same 463 questions against the bank as it stands now. */
  function nextCycle(S) {
    const auto = S.questions.filter(q => {
      const st = qStatus(S, q);
      if (st === 'approved') return q.resolved.kind !== 'expiring';   // learned phrasing or new entry; evidence still needs renewal
      return READY.has(st);
    }).length;
    return auto / S.questions.length;
  }

  /* ── review queue: AI drafts first, then loose matches, then expiry notes; nearest due date first ── */
  const due = (S, q) => S.qns.find(x => x.id === q.qn).due;
  function queue(S) {
    const rank = { draft: 0, review: 1, expiring: 2 };
    return S.questions.filter(q => PERSON.has(qStatus(S, q)))
      .sort((a, b) => rank[qStatus(S, a)] - rank[qStatus(S, b)] || due(S, a).localeCompare(due(S, b)));
  }

  /* ── word diff for the change card ───────────────────────── */
  function diff(a, b) {
    const A = a.split(' '), B = b.split(' ');
    const m = A.length, n = B.length;
    const L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
      L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = [];
    const push = (k, w) => { const last = out[out.length - 1]; if (last && last[0] === k) last[1] += ' ' + w; else out.push([k, w]); };
    let i = 0, j = 0;
    while (i < m && j < n) {
      if (A[i] === B[j]) { push('=', A[i]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) push('-', A[i++]);
      else push('+', B[j++]);
    }
    while (i < m) push('-', A[i++]);
    while (j < n) push('+', B[j++]);
    return out;     // runs of [kind, text]; join runs with a space
  }

  /* ── known-answer checks (run on a fresh copy) ───────────── */
  function checks() {
    const out = [];
    const add = (id, name, pass, detail) => out.push({ id, name, pass: !!pass, detail });
    let S = build();
    const m = metrics(S);

    const mfa = S.questions.filter(q => q.entry === 'B01');
    add('K1', 'MFA change refreshes every affected answer',
      entryState(S, S.entries.B01) === 'stale' && mfa.length === 9 && new Set(mfa.map(q => q.qn)).size === 3 &&
      (() => { const r = approveSignal(S, 'S01', 'lead'); return r.ok && r.refreshed.length === 9 && mfa.every(q => qStatus(S, q) === 'refreshed') && /37 company applications/.test(answerFor(S, mfa[0])); })(),
      '9 questions in 3 questionnaires held; one approval refreshes all 9');

    S = build();
    const soc = S.questions.filter(q => q.entry === 'B27');
    add('K2', 'Expiring SOC 2 report is flagged, never sent',
      entryState(S, S.entries.B27) === 'expiring' && soc.every(q => qStatus(S, q) === 'expiring') && /bridge letter/.test(answerFor(S, soc[0])) &&
      !send(S, 'CVH', 'analyst').ok,
      'Expires Nov 30; bridge letter note added; export blocked until approved');

    const ai = S.questions.find(q => /machine learning models/.test(q.text));
    add('K3', 'No-match question gets a labeled AI draft',
      ai && ai.conf < 60 && qStatus(S, ai) === 'draft' && queue(S).includes(ai) && /Needs input/.test(ai.draft),
      'AI governance question: confidence 38, drafted, in the review queue');

    const before = S.entries.B20.answer;
    const tryLead = approveSignal(S, 'S10', 'lead');
    add('K4', 'Legal-locked answer changes only with Counsel',
      !tryLead.ok && S.entries.B20.answer === before && approveSignal(S, 'S10', 'counsel').ok && /48 hours/.test(S.entries.B20.answer),
      'Security lead blocked; Counsel approves 72 → 48 hours');

    S = build();
    const mon = S.qns.find(x => x.id === 'MRG').questions;
    const leak = mon.filter(q => q.src !== 'na' && /Time module|Benefits|clock punch/i.test(answerFor(S, q)));
    const na = mon.find(q => q.entry === 'B60');
    add('K5', 'Answers follow the products the customer bought',
      !leak.length && na && qStatus(S, na) === 'na',
      'Monarch (Payroll only): no Time or Benefits statements; time clock question marked not applicable');

    add('K6', 'At least 80% auto-answered on first run', m.autoPct >= 0.8, `${(m.autoPct * 100).toFixed(1)}% (${m.initialAuto} of ${S.questions.length})`);

    const b = m.bank;
    add('K7', 'Bank state on load', b.current === 44 && b.stale === 9 && b.expiring === 4 && b.legal === 3 && S.questions.length === 463,
      `${b.current} current · ${b.stale} stale · ${b.expiring} expiring · ${b.legal} legal-locked · ${S.questions.length} questions`);

    add('K8', 'Plurals read correctly at 0 and 1',
      plural(0, 'question') === '0 questions' && plural(1, 'question') === '1 question' && plural(2, 'entry', 'entries') === '2 entries', '"0 questions", "1 question", "2 entries"');

    S = build();
    approveSignal(S, 'S01', 'lead');
    const fresh = build();
    add('K9', 'Reset restores the starting data', JSON.stringify(counts(fresh)) === JSON.stringify(counts(build())) && counts(fresh).stale === 25,
      'Rebuilt state matches the seeded counts');
    return out;
  }

  window.OC4E = { build, entryState, expiringEv, openSignal, usedBy, qStatus, answerFor, why, approveSignal, keepSignal, approveQuestion,
    send, counts, bankCounts, metrics, nextCycle, queue, diff, checks, plural, fmtDate, fmtShort, days, can, persona, READY, PERSON, HELD };
})();
