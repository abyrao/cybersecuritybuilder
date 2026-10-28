/* OC-04 · Views, drawers, approvals, log. */
(function () {
  const D = window.OC4, E = window.OC4E, P = E.plural;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`;
  const hrs = m => (m / 60).toFixed(1);

  let S, persona = 'analyst', view = 'funnel', ansQn = 'BPL', ansFilter = 'all', bankFilter = 'all', focusId = null, editing = false, drawerRoute = null, alerted = false;

  /* ── boot ────────────────────────────────────────────────── */
  function boot() {
    S = E.build();
    engineLog();
    alerted = false;
    Funnel.reset(S);
  }
  function engineLog() {
    const m = E.metrics(S);
    const add = (action, target, reason) => S.log.unshift({ t: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }), who: 'Engine', action, target, reason });
    add('Loaded questionnaires', S.qns.map(q => q.short).join(', '), `${P(S.questions.length, 'question')} parsed (simulated)`);
    add('Matched to the bank', `${m.initialAuto} auto-answered`, `${P(S.questions.filter(q => q.src === 'draft').length, 'question')} with no match sent to the simulated AI`);
    add('Checked freshness', `${P(m.staleEntries, 'stale entry', 'stale entries')}`, `${P(m.staleQuestions, 'answer')} held until a person approves the bank change`);
    add('Checked evidence', `${P(m.bank.expiring, 'entry', 'entries')} expiring`, `Expiry notes added to ${P(m.c.expiring, 'answer')}`);
  }

  /* ── helpers ─────────────────────────────────────────────── */
  function qn(id) { return S.qns.find(x => x.id === id); }
  function stClass(q) {
    const st = E.qStatus(S, q);
    if (E.READY.has(st)) return 'ready';
    if (E.HELD.has(st)) return q.entry === 'B01' ? 'mfa' : 'held';
    return 'person';
  }
  const ST_LABEL = { auto: 'Auto', refreshed: 'Refreshed', approved: 'Approved', na: 'Not applicable', review: 'Review', draft: 'AI draft', expiring: 'Expiring', stale: 'Stale', legal: 'Legal hold' };
  const ST_TIP = {
    auto: 'Answered from a current bank entry at confidence 85 or higher',
    refreshed: 'Held, then answered automatically when the bank change was approved',
    approved: 'Approved by a person',
    na: 'Out of scope for the products this customer bought',
    review: 'Loose match below the 85 threshold; a person confirms it',
    draft: 'No match above 60; drafted by the simulated AI',
    expiring: 'Evidence expires within 60 days; a note was added and a person approves',
    stale: 'A source feed changed after this entry was last reviewed',
    legal: 'Legal-locked entry touched by a policy change; only Counsel can change it'
  };
  function chip(q) {
    const st = E.qStatus(S, q);
    return `<span class="st ${stClass(q)}" data-tip="${esc(ST_TIP[st])}">${ST_LABEL[st]}</span>`;
  }
  function conf(q) {
    return `<span class="conf" data-tip="Match confidence ${q.conf} of 100 (simulated). The line marks the 85 auto-answer threshold."><span class="track"><span class="fill ${q.conf < D.autoThreshold ? 'low' : ''}" style="width:${q.conf}%"></span><span class="th"></span></span>${q.conf}</span>`;
  }
  function dueText(d) {
    const n = E.days(S.today, d);
    return `${E.fmtShort(d)} · ${n === 0 ? 'today' : n < 0 ? P(-n, 'day') + ' late' : 'in ' + P(n, 'day')}`;
  }
  const feedName = id => D.feeds.find(f => f.id === id).name;

  /* ── navigation ──────────────────────────────────────────── */
  function nav(to) {
    if (to.startsWith('change:')) return openDrawer(to);
    if (to.startsWith('q:')) return openDrawer(to);
    if (to.startsWith('entry:')) return openDrawer(to);
    view = to;
    editing = false;
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('on', b.dataset.view === view));
    render();
  }
  function render() {
    hideTip();
    const v = $('#view');
    v.style.animation = 'none'; void v.offsetWidth; v.style.animation = '';
    ({ funnel: vFunnel, intake: vIntake, answers: vAnswers, bank: vBank, review: vReview, output: vOutput })[view]();
    renderLog();
    navCounts();
  }
  function refresh() {           // re-render without the entry animation
    ({ funnel: vFunnel, intake: vIntake, answers: vAnswers, bank: vBank, review: vReview, output: vOutput })[view]();
    renderLog(); navCounts();
    if (drawerRoute) openDrawer(drawerRoute, true);
  }
  function navCounts() {
    const c = E.counts(S);
    const b = document.querySelector('.seg-btn[data-view="review"]');
    b.innerHTML = `Review<span class="ct">${c.person}</span>`;
  }

  /* ── 1 · Funnel ──────────────────────────────────────────── */
  function vFunnel() {
    const m = E.metrics(S), c = m.c;
    const open = S.signals.filter(s => s.status === 'open')
      .sort((a, b) => (b.entry === 'B01') - (a.entry === 'B01') || held(b) - held(a));
    const keep = document.querySelector('#fbox .funnel-svg');
    $('#view').innerHTML = `
      <div class="fv">
        <div class="kpis">
          <div class="kpi" tabindex="0" data-tip="Questions answered from current bank entries at confidence 85 or higher, with no person involved, on the first pass.">
            <div class="k-label">Auto-answered</div><div class="k-num">${Math.round(m.autoPct * 100)}<small>%</small></div>
            <div class="k-sub">${m.initialAuto} of ${S.questions.length} on the first pass</div></div>
          <div class="kpi" tabindex="0" data-tip="Estimated review time left: ${D.effort.review} min per loose match, ${D.effort.draft} per AI draft, ${D.effort.expiring} per expiry note, ${D.effort.bankChange} per bank change, ${D.effort.legal} per legal change. Typing by hand: ${D.effort.manualPerQuestion} min per question.">
            <div class="k-label">Analyst time left</div><div class="k-num">${hrs(m.engineMin)}<small>h</small></div>
            <div class="k-sub">vs ${hrs(m.manualMin)} h typing every answer</div></div>
          <div class="kpi hot" tabindex="0" data-tip="Answers held because a source feed changed after the bank entry was last reviewed. Without the freshness check, these would have gone out with old facts.">
            <div class="k-label">Stale answers caught</div><div class="k-num">${m.staleQuestions}</div>
            <div class="k-sub">in ${P(m.staleEntries, 'bank entry', 'bank entries')}, before sending</div></div>
          <div class="kpi" tabindex="0" data-tip="Answers that are auto-answered, refreshed by a bank change, marked not applicable, or approved by a person.">
            <div class="k-label">Ready to send</div><div class="k-num">${c.ready}</div>
            <div class="k-sub">of ${S.questions.length} answers</div></div>
        </div>
        <div class="funnel-card">
          <div class="funnel-top">
            <h1 class="q">Where is the work right now?</h1>
            <div class="legend">
              <span data-tip="Answered automatically"><i class="l-ready"></i>Auto</span>
              <span data-tip="Loose match, AI draft, or expiring evidence"><i class="l-person"></i>Needs a person</span>
              <span data-tip="Waiting on a bank change"><i class="l-held"></i>Held</span>
              <span data-tip="Held by the MFA rollout change"><i class="l-mfa"></i>MFA change</span>
            </div>
            <button class="btn ghost sm" id="replay" data-tip="Play the funnel again from the current state">Replay</button>
          </div>
          <div class="funnel-box" id="fbox"></div>
        </div>
        <div class="changes">
          <div class="card">
            <div class="eyebrow">Bank changes</div>
            <h2>${open.length ? P(open.length, 'change') + ' waiting' : 'Bank is current'}</h2>
            <div class="list">
              ${open.length ? open.map(s => `
                <button class="ch-row ${s.entry === 'B01' ? 'mfa' : ''} ${s.kind === 'legal' ? 'legal' : ''}" data-go="change:${s.id}" data-tip="${esc(s.record)}">
                  <span class="src">${feedName(s.feed)} · ${E.fmtShort(s.date)}</span>
                  <span class="sum">${esc(s.summary)}</span>
                  <span class="cnt">${P(held(s), 'answer')}</span>
                </button>`).join('') : `<div class="empty">Every source change has been reviewed. New signals will appear here.</div>`}
            </div>
          </div>
          <button class="btn qbtn" data-go="review" data-tip="Loose matches, AI drafts, and expiring evidence">Review queue <span class="n">${c.person}</span></button>
        </div>
      </div>`;
    if (keep) { $('#fbox').appendChild(keep); Funnel.update(S); }
    else Funnel.mount($('#fbox'), S, nav);
    $('#replay').onclick = () => Funnel.replay();
  }
  function held(s) { return S.questions.filter(q => q.entry === s.entry && E.HELD.has(E.qStatus(S, q))).length; }

  /* ── 2 · Intake ──────────────────────────────────────────── */
  function vIntake() {
    const last = S.qns.map(q => q.due).sort().pop();
    $('#view').innerHTML = `
      <div class="head"><div><h1 class="q">What came in, and for whom?</h1>
        <div class="sub">${P(S.qns.length, 'questionnaire')} · ${P(S.questions.length, 'question')} · all due within ${P(E.days(S.today, last), 'day')}</div></div></div>
      <div class="qcards">${S.qns.map(q => {
        const c = E.counts(S, q.questions);
        const mfa = q.questions.filter(x => x.entry === 'B01' && E.HELD.has(E.qStatus(S, x))).length;
        const w = n => (n / q.count * 100).toFixed(2) + '%';
        return `<div class="qcard">
          <div class="top"><div><div class="cust">${esc(q.customer)}</div><div class="ind">${esc(q.industry)}</div></div>
            <span class="fmt" data-tip="${q.format === 'Custom' ? 'Customer spreadsheet with no standard IDs; matched by meaning (simulated)' : 'Standard questionnaire; matched by ID through the crosswalk first'}">${q.format}</span></div>
          <div class="big">${q.count}<small>questions</small></div>
          <dl class="facts">
            <dt>Due</dt><dd>${dueText(q.due)}</dd>
            <dt>Contract</dt><dd data-tip="Annual recurring revenue at stake in this deal">${money(q.arr)} ARR · ${q.tier}</dd>
            <dt>Deal close</dt><dd>${E.fmtShort(q.dealClose)}</dd>
            <dt>Products</dt><dd>${q.products.map(p => `<span class="prod">${p}</span>`).join('')}</dd>
            <dt>NDA</dt><dd ${q.nda !== 'Signed' ? 'data-tip="Attestation reports such as SOC 2 are shared only after the NDA is signed"' : ''}>${q.nda}</dd>
          </dl>
          <div class="stack" data-tip="${c.ready} ready · ${c.person} need a person · ${c.held} held">
            <span class="s-ready" style="width:${w(c.ready)}"></span><span class="s-person" style="width:${w(c.person)}"></span>
            <span class="s-held" style="width:${w(c.held - mfa)}"></span><span class="s-mfa" style="width:${w(mfa)}"></span></div>
          <div class="stack-legend"><span>${c.ready} ready</span><span>${c.person} for a person</span><span>${c.held} held</span></div>
          <div class="parse">Detected ${q.format} · ${P(q.domains, 'domain')} · parsed (simulated)</div>
          <button class="btn ghost sm" data-go="answers:${q.id}">Open answers</button>
        </div>`;
      }).join('')}</div>
      <div class="ctx-note">
        <div class="card" data-tip="Higher-value deals surface first when review time is short"><b>Contract value</b><span>Sets which work goes first.</span></div>
        <div class="card" data-tip="Product-specific sentences are added only for modules the customer bought; others are marked not applicable"><b>Products bought</b><span>Trims answers to what applies.</span></div>
        <div class="card" data-tip="The review queue is ordered by the nearest due date"><b>Due date</b><span>Orders the review queue.</span></div>
        <div class="card" data-tip="Evidence that needs an NDA is held until one is signed"><b>NDA status</b><span>Gates sharing of reports.</span></div>
      </div>`;
  }

  /* ── 3 · Answers ─────────────────────────────────────────── */
  function vAnswers() {
    const q = qn(ansQn);
    const all = q.questions;
    const f = {
      all: () => true,
      person: x => E.PERSON.has(E.qStatus(S, x)),
      held: x => E.HELD.has(E.qStatus(S, x)),
      ready: x => E.READY.has(E.qStatus(S, x))
    };
    const rows = all.filter(f[ansFilter]);
    const cnt = k => all.filter(f[k]).length;
    $('#view').innerHTML = `
      <div class="head"><div><h1 class="q">How was each question answered?</h1>
        <div class="sub">${esc(q.customer)} · ${q.format} · ${P(q.count, 'question')}</div></div></div>
      <div class="toolbar">
        <div class="chips">${S.qns.map(x => `<button class="chip ${x.id === ansQn ? 'on' : ''}" data-qn="${x.id}">${esc(x.short)}<span class="n">${x.count}</span></button>`).join('')}</div>
        <div class="chips">${[['all', 'All'], ['person', 'Needs a person'], ['held', 'Held'], ['ready', 'Ready']].map(([k, l]) =>
          `<button class="chip ${k === ansFilter ? 'on' : ''}" data-af="${k}">${l}<span class="n">${cnt(k)}</span></button>`).join('')}</div>
      </div>
      <div class="tablewrap"><table class="qt">
        <thead><tr><th>ID</th><th>Question</th><th>Bank entry</th><th>Confidence</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows.map(x => {
          const e = x.entry && S.entries[x.entry];
          return `<tr data-go="q:${x.id}">
            <td class="qid">${x.qid}</td>
            <td class="qtext" data-tip="${esc(x.text)}">${esc(x.text)}</td>
            <td class="ent">${e ? `<span class="mono">${e.id}</span> ${esc(e.title)}` : '<span class="muted">No match</span>'}</td>
            <td>${conf(x)}</td><td>${chip(x)}</td>
            <td><button class="why" data-tip="${esc(E.why(S, x))}">Why?</button></td></tr>`;
        }).join('') || `<tr><td colspan="6" class="empty">Nothing in this filter.</td></tr>`}</tbody></table></div>`;
  }

  /* ── 4 · Bank ────────────────────────────────────────────── */
  function vBank() {
    const b = E.bankCounts(S);
    const lock = '<svg class="glyph" viewBox="0 0 12 12"><rect x="2" y="5.5" width="8" height="5.5" rx="1" fill="currentColor"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
    const clock = '<svg class="glyph" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6 3.4V6l1.8 1.2" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
    $('#view').innerHTML = `
      <div class="head"><div><h1 class="q">Is the response bank current?</h1>
        <div class="sub">${P(S.order.length, 'entry', 'entries')} · kept current by ${P(D.feeds.length, 'source feed')} · every change approved by a person</div></div>
        <div class="chips">${[['all', 'All', S.order.length], ['current', 'Current', b.current], ['stale', 'Stale', b.stale], ['expiring', 'Expiring', b.expiring], ['legal', 'Legal-locked', b.legal]].map(([k, l, n]) =>
          `<button class="chip ${k === bankFilter ? 'on' : ''}" data-bf="${k}" data-tip="${esc({ all: 'Every entry', current: 'Reviewed after the last source change, evidence valid', stale: 'A source feed changed after the last review', expiring: 'Evidence expires within 60 days', legal: 'Text approved by Legal; changed only by Counsel' }[k])}">${l}<span class="n">${n}</span></button>`).join('')}</div>
      </div>
      <div class="bankgrid">${Object.entries(D.domains).map(([k, d]) => `
        <div class="dcol"><div class="dhead">${d.name}</div>
          ${S.order.filter(id => S.entries[id].domain === k).map(id => {
            const e = S.entries[id], st = E.entryState(S, e);
            const cls = st === 'stale' && id === 'B01' ? 'stale mfa' : st;
            const dim = bankFilter !== 'all' && bankFilter !== st;
            const fresh = e.reviewed === S.today && st !== 'stale';
            return `<button class="tile ${cls} ${fresh ? 'fresh' : ''}" style="${dim ? 'opacity:.18' : ''}" data-go="entry:${id}" data-tip="${esc(e.title)}: ${esc({ current: 'current', stale: 'stale, a source changed', expiring: 'evidence expiring', legal: 'legal-locked' }[st])}. Used by ${P(E.usedBy(S, id).length, 'answer')}.">
              <span class="tid">${id}</span><span class="tt">${esc(e.title)}</span>${st === 'legal' ? lock : st === 'expiring' ? clock : ''}</button>`;
          }).join('')}
        </div>`).join('')}</div>
      ${S.added.length ? `<div class="newstrip"><span class="eyebrow">New from approved drafts</span>${S.added.map(n => `<div class="tile" data-tip="${esc(n.text)}"><span class="tid">${n.id}</span><span class="tt">${esc(n.text.length > 48 ? n.text.slice(0, 46) + '…' : n.text)}</span></div>`).join('')}</div>` : ''}`;
  }

  /* ── 5 · Review ──────────────────────────────────────────── */
  function vReview() {
    const qu = E.queue(S);
    const c = E.counts(S), m = E.metrics(S);
    const total = c.person + S.questions.filter(q => q.resolved).length;
    if (!qu.find(q => q.id === focusId)) { focusId = qu.length ? qu[0].id : null; editing = false; }
    const open = S.signals.filter(s => s.status === 'open');
    const mfaOpen = open.some(s => s.entry === 'B01');
    const queueMin = c.review * D.effort.review + c.draft * D.effort.draft + c.expiring * D.effort.expiring;
    $('#view').innerHTML = `
      <div class="head"><div><h1 class="q">What needs a person?</h1>
        <div class="sub">${qu.length ? `${qu.length} left · about ${hrs(queueMin)} h · keys A approve, E edit, S skip` : 'Queue is clear'}</div></div>
        <div class="progress"><div class="pbar" data-tip="${total - qu.length} of ${total} reviewed"><span style="width:${total ? (total - qu.length) / total * 100 : 100}%"></span></div></div></div>
      ${c.held ? `<div class="banner ${mfaOpen ? 'mfa' : ''}"><span><b>${P(c.held, 'answer')}</b> ${c.held === 1 ? 'waits' : 'wait'} on ${P(open.length, 'bank change')}. One approval answers every question that uses the entry.</span>
        <button class="btn sm ${mfaOpen ? 'red' : ''}" data-go="change:${(open.find(s => s.entry === 'B01') || open[0]).id}">Open next change</button></div>` : ''}
      ${qu.length ? `<div class="rv">
        <div class="rq">${qu.map(q => `<button class="rq-item ${q.id === focusId ? 'on' : ''}" data-focus="${q.id}">
          <span class="k">${ST_LABEL[E.qStatus(S, q)]}</span><span class="t">${esc(q.text)}</span><span class="c">${esc(qn(q.qn).short)} · ${q.qid}</span></button>`).join('')}</div>
        ${focusCard(qu.find(q => q.id === focusId))}
      </div>` : `<div class="card done-card"><h2>Nothing left to review</h2><p class="muted">${c.held ? `${P(c.held, 'answer')} still ${c.held === 1 ? 'waits' : 'wait'} on bank changes.` : 'Every answer is ready. Send from Output.'}</p>
        <button class="btn" data-go="${c.held ? 'funnel' : 'output'}">${c.held ? 'Open the funnel' : 'Go to Output'}</button></div>`}`;
    const ta = $('#editTa');
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }
  function focusCard(q) {
    const st = E.qStatus(S, q), Q = qn(q.qn);
    const e = q.entry && S.entries[q.entry];
    const ans = E.answerFor(S, q);
    const label = st === 'draft' ? 'AI draft · simulated' : st === 'expiring' ? 'Bank answer with expiry note' : 'Proposed answer from the bank';
    const body = editing ? `<textarea id="editTa" aria-label="Edit answer">${esc(ans)}</textarea>`
      : esc(ans).replace(/\[(.+?)\]/g, '<mark>[$1]</mark>');
    const canAns = E.can(persona, 'answer');
    return `<div class="focus">
      <div class="meta"><span class="fmt">${Q.format}</span><b>${esc(Q.customer)}</b><span class="mono">${q.qid}</span>${chip(q)}${conf(q)}<span class="muted">Due ${dueText(Q.due)}</span></div>
      <div class="qbig">${esc(q.text)}</div>
      <div class="ans"><span class="sim">${label}</span>${body}</div>
      <div class="whyline"><b>Why?</b> ${esc(E.why(S, q))}</div>
      <div class="actions">
        ${editing ? `<button class="btn ${canAns ? '' : 'dis'}" data-act="save">Save and approve</button><button class="btn ghost" data-act="cancel">Cancel</button>`
          : `<button class="btn ${canAns ? '' : 'dis'}" data-act="approve">Approve<kbd>A</kbd></button>
             <button class="btn ghost" data-act="edit">Edit<kbd>E</kbd></button>
             <button class="btn ghost" data-act="skip">Skip<kbd>S</kbd></button>`}
        ${e ? `<button class="why" data-go="entry:${e.id}" style="margin-left:auto">Bank entry ${e.id}</button>` : ''}
      </div></div>`;
  }
  function approveFocus(text) {
    const r = E.approveQuestion(S, focusId, persona, text);
    if (!r.ok) return blocked(r.need);
    const q = S.questions.find(x => x.id === focusId);
    editing = false;
    toast(`Approved ${q.qid} · ${qn(q.qn).short}${q.resolved.kind === 'draft' ? ' · saved to the bank' : ''}`);
    const qu = E.queue(S);
    focusId = qu.length ? qu[0].id : null;
    refresh();
  }

  /* ── 6 · Output ──────────────────────────────────────────── */
  function vOutput() {
    const m = E.metrics(S);
    const next = E.nextCycle(S);
    const updated = S.signals.filter(s => s.status === 'approved').length;
    const base = E.build(); const bm = E.metrics(base);
    $('#view').innerHTML = `
      <div class="head"><div><h1 class="q">What goes out, and what did the bank learn?</h1>
        <div class="sub">Two outputs from one pass: answers to customers, and a better bank for next time</div></div></div>
      <div class="ocards">${S.qns.map(q => {
        const c = E.counts(S, q.questions);
        const pct = c.ready / q.count, C = 2 * Math.PI * 50;
        const sent = S.sent[q.id];
        const reason = !E.can(persona, 'export') ? 'Only the GRC analyst or security lead can send' : c.open ? `${P(c.open, 'answer')} still open` : '';
        return `<div class="ocard">
          <svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${Math.round(pct * 100)}% ready"><circle class="bg" cx="60" cy="60" r="50"/><circle class="fg" cx="60" cy="60" r="50" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/><text x="60" y="68" text-anchor="middle">${Math.floor(pct * 100)}%</text></svg>
          <div class="cust">${esc(q.customer)}</div>
          <div class="line">${c.ready} of ${q.count} ready · ${c.open ? P(c.open, 'answer') + ' open' : 'nothing open'} · due ${E.fmtShort(q.due)}</div>
          <div>${sent ? `<span class="sent">Sent ${new Date(sent).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} (simulated)</span>`
            : `<button class="btn sm ${reason ? 'dis' : ''}" data-send="${q.id}" ${reason ? `data-tip="${esc(reason)}"` : 'data-tip="Review the summary, then export a CSV (simulated send)"'}>Approve and send</button>`}</div>
        </div>`;
      }).join('')}</div>
      <div class="learn">
        <div class="card"><div class="eyebrow">To the response bank</div><h2>What the bank learned this cycle</h2>
          <div class="lnums">
            <div tabindex="0" data-tip="Entries whose text or evidence changed after a person approved a source change"><b>${updated}</b><span>${updated === 1 ? 'entry' : 'entries'} updated</span></div>
            <div tabindex="0" data-tip="Approved AI drafts saved as new entries"><b>${S.added.length}</b><span>new ${S.added.length === 1 ? 'entry' : 'entries'}</span></div>
            <div tabindex="0" data-tip="Approved loose matches saved as new phrasings, so the same wording auto-answers next time"><b>${S.learned}</b><span>${S.learned === 1 ? 'phrasing' : 'phrasings'} learned</span></div>
            <div tabindex="0" data-tip="Entries retired because the control no longer exists"><b>0</b><span>retired</span></div>
          </div></div>
        <div class="card"><div class="eyebrow">Next questionnaire</div><h2>The same questions, next time</h2>
          <div class="cycle">
            <div class="cyc" data-tip="Share answered with no person on this first pass"><span>This cycle</span><span class="track"><span style="width:${m.autoPct * 100}%"></span></span><b>${Math.round(m.autoPct * 100)}%</b></div>
            <div class="cyc next" data-tip="If the same ${S.questions.length} questions arrived again with the bank as it stands now. Expiring evidence still needs renewal."><span>Next cycle</span><span class="track"><span style="width:${next * 100}%"></span></span><b>${Math.round(next * 100)}%</b></div>
          </div>
          <div class="hours">
            <div tabindex="0" data-tip="${D.effort.manualPerQuestion} min per question typed by hand"><b>${hrs(bm.manualMin)} h</b><span>typing by hand</span></div>
            <div tabindex="0" data-tip="Review time for the exceptions on the first pass"><b>${hrs(bm.engineMin)} h</b><span>with the engine</span></div>
            <div tabindex="0" data-tip="Average hours saved per questionnaire this cycle"><b>${Math.round(bm.savedPerQn)} h</b><span>saved per questionnaire</span></div>
          </div></div>
      </div>`;
  }
  function confirmSend(id) {
    const q = qn(id), c = E.counts(S, q.questions);
    if (!E.can(persona, 'export')) return blocked('export');
    if (c.open) return toast(`${P(c.open, 'answer')} still open for ${q.short}`);
    const appr = q.questions.filter(x => x.resolved).length;
    const ref = q.questions.filter(x => E.qStatus(S, x) === 'refreshed').length;
    $('#modal').innerHTML = `<div class="box"><div class="eyebrow">Human approval</div><h2>Send to ${esc(q.customer)}?</h2>
      <p>${P(q.count, 'answer')}: ${c.auto + c.na} auto-answered, ${ref} refreshed by bank changes, ${appr} approved by people. This exports a CSV; nothing is sent to a real customer.</p>
      <div class="actions"><button class="btn" id="doSend">Approve and send</button><button class="btn ghost" id="noSend">Cancel</button></div></div>`;
    $('#modal').classList.add('on');
    $('#modal').setAttribute('aria-hidden', 'false');
    $('#doSend').focus();
    $('#noSend').onclick = closeModal;
    $('#doSend').onclick = () => {
      const r = E.send(S, id, persona);
      closeModal();
      if (!r.ok) return blocked(r.need);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([r.csv], { type: 'text/csv' }));
      a.download = `OC-04_${q.short.replace(/\s/g, '-')}_${q.format.replace(/\s/g, '-')}_answers.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      toast(`Sent to ${q.customer} (simulated) · CSV downloaded`);
      refresh();
    };
  }
  function closeModal() { $('#modal').classList.remove('on'); $('#modal').setAttribute('aria-hidden', 'true'); }

  /* ── drawers ─────────────────────────────────────────────── */
  function openDrawer(route, quiet) {
    drawerRoute = route;
    const [kind, id] = route.split(':');
    const html = kind === 'change' ? dChange(id) : kind === 'q' ? dQuestion(id) : kind === 'entry' ? dEntry(id) : dChecks();
    $('#drawerBody').innerHTML = html;
    $('#drawer').classList.add('on'); $('#drawer').setAttribute('aria-hidden', 'false');
    if (!quiet) $('#toast').classList.remove('on');
    $('#scrim').classList.add('on');
    if (!quiet) $('#drawer .close').focus();
  }
  function closeDrawer() {
    drawerRoute = null;
    $('#drawer').classList.remove('on'); $('#drawer').setAttribute('aria-hidden', 'true');
    $('#scrim').classList.remove('on');
  }

  let changeEditing = false;
  function dChange(id) {
    const s = S.signals.find(x => x.id === id), e = S.entries[s.entry];
    const affected = S.questions.filter(q => q.entry === e.id && (s.status === 'open' ? E.HELD.has(E.qStatus(S, q)) : true));
    const byQn = S.qns.map(q => ({ q, list: affected.filter(x => x.qn === q.id) })).filter(x => x.list.length);
    const need = s.kind === 'legal' ? 'legal' : 'bank';
    const can = E.can(persona, need);
    const isMfa = e.id === 'B01';
    let answer;
    if (s.kind === 'evidence') {
      answer = `<div class="src-card">Answer text unchanged. Evidence link moves from <b>${esc(e.evidence[0] ? e.evidence[0].name : 'none')}</b> to <b>${esc(s.evidence.name)}</b>.</div>`;
    } else {
      const after = changeEditing ? `<textarea id="chTa" aria-label="Edit proposed answer">${esc(s.proposed)}</textarea>`
        : E.diff(e.answer, s.proposed).filter(d => d[0] !== '-').map(([k, w]) => k === '+' ? `<ins>${esc(w)}</ins>` : esc(w)).join(' ');
      const before = E.diff(e.answer, s.proposed).filter(d => d[0] !== '+').map(([k, w]) => k === '-' ? `<del>${esc(w)}</del>` : esc(w)).join(' ');
      answer = `<div class="diff ${isMfa ? 'mfa' : ''}"><div class="before"><span class="eyebrow">Bank now</span><br>${before}</div>
        <div class="after"><span class="eyebrow">Proposed · simulated</span><br>${after}</div></div>`;
    }
    const done = s.status !== 'open';
    return `<div class="eyebrow">Bank change · ${e.id}${e.legal ? ' · legal-locked' : ''}</div>
      <h2>${esc(s.summary)}</h2>
      <div class="dsec"><span class="eyebrow">Source</span>
        <div class="src-card"><div class="who"><span>${feedName(s.feed)} · ${esc(s.owner.split(' · ')[1] || '')}</span><span class="mono">${E.fmtDate(s.date)}</span></div>${esc(s.record)}</div></div>
      <div class="dsec"><span class="eyebrow">Answer · ${esc(e.title)}</span>${answer}</div>
      <div class="dsec"><span class="eyebrow">${done ? 'Answers it covered' : 'Answers held by this change'}</span>
        <div class="impact">${byQn.map(({ q, list }) => `<div class="imp"><b>${list.length}</b><span>${esc(q.short)} · ${q.format}</span><span class="ids">${list.map(x => x.qid).join(', ')}</span></div>`).join('') || '<span class="muted">No open answers use this entry.</span>'}</div></div>
      <div class="dsec whyline"><b>Why?</b> ${s.kind === 'legal'
        ? `This entry is legal-locked. The ${feedName(s.feed).toLowerCase()} changed on ${E.fmtShort(s.date)}, so the engine flagged it, but it never edits legal text. Only Counsel can approve the new wording or keep the current one.`
        : `The ${feedName(s.feed)} record is dated ${E.fmtShort(s.date)}, after this entry was last reviewed on ${E.fmtShort(e.versions[e.versions.length - 1].date)}. ${P(affected.length, 'answer')} ${affected.length === 1 ? 'uses' : 'use'} this entry, so ${affected.length === 1 ? 'it was' : 'they were'} held instead of sent with old facts.`}</div>
      <div class="dsec">${done ? `<div class="block"><span>${s.status === 'approved' ? 'Approved' : 'Current answer kept'} · ${esc(e.versions[0].by)}</span><button class="btn ghost sm" data-go="entry:${e.id}">Open entry</button></div>`
        : can ? `<div class="actions">
            <button class="btn ${isMfa ? 'red' : ''}" data-ch="approve:${s.id}">${changeEditing ? 'Save and approve' : 'Approve change'}</button>
            ${s.kind !== 'evidence' && !changeEditing ? `<button class="btn ghost" data-ch="edit:${s.id}">Edit</button>` : ''}
            <button class="btn ghost" data-ch="keep:${s.id}">Keep current</button></div>`
        : blockRow(need)}</div>`;
  }
  function blockRow(need) {
    const t = needTarget(need);
    return `<div class="block"><span>${t.msg}</span><button class="btn sm" data-persona="${t.pid}">Switch to ${t.name}</button></div>`;
  }
  function needTarget(need) {
    const map = {
      bank: ['Bank changes need the security lead.', 'lead'],
      legal: ['Legal-locked answers change only with Counsel.', 'counsel'],
      answer: ['Answers need the GRC analyst or the security lead.', 'analyst'],
      export: ['Only the GRC analyst or the security lead can send.', 'analyst']
    }[need];
    const p = E.persona(map[1]);
    return { msg: map[0], pid: p.id, name: p.name };
  }

  function dQuestion(id) {
    const q = S.questions.find(x => x.id === id), Q = qn(q.qn), st = E.qStatus(S, q);
    const e = q.entry && S.entries[q.entry];
    const sig = e && E.openSignal(S, e.id);
    return `<div class="eyebrow">${esc(Q.customer)} · ${Q.format} · ${q.qid}</div>
      <h2>${esc(q.text)}</h2>
      <div class="actions" style="margin-top:.6rem">${chip(q)}${conf(q)}</div>
      <div class="dsec"><span class="eyebrow">${st === 'draft' ? 'AI draft · simulated' : 'Answer'}</span><div class="ans">${esc(E.answerFor(S, q)).replace(/\[(.+?)\]/g, '<mark>[$1]</mark>')}</div></div>
      <div class="dsec whyline"><b>Why?</b> ${esc(E.why(S, q))}</div>
      <div class="dsec actions">
        ${E.PERSON.has(st) ? `<button class="btn" data-review="${q.id}">Review this answer</button>` : ''}
        ${sig ? `<button class="btn ${e.id === 'B01' ? 'red' : ''}" data-go="change:${sig.id}">Open bank change</button>` : ''}
        ${e ? `<button class="btn ghost" data-go="entry:${e.id}">Bank entry ${e.id}</button>` : ''}
      </div>`;
  }

  function dEntry(id) {
    const e = S.entries[id], st = E.entryState(S, e), d = D.domains[e.domain];
    const used = E.usedBy(S, id);
    const qns = new Set(used.map(q => q.qn)).size;
    const sig = E.openSignal(S, id);
    const ev = E.expiringEv(S, e);
    const stLabel = { current: 'Current', stale: 'Stale', expiring: 'Evidence expiring', legal: 'Legal-locked' }[st];
    return `<div class="eyebrow">${e.id} · ${d.name}</div><h2>${esc(e.title)}</h2>
      <div class="actions" style="margin-top:.5rem"><span class="st ${st === 'current' ? 'ready' : st === 'stale' ? (id === 'B01' ? 'mfa' : 'held') : 'person'}">${stLabel}</span>
        ${sig ? `<button class="btn sm ${id === 'B01' ? 'red' : ''}" data-go="change:${sig.id}">Review change</button>` : ''}</div>
      <div class="dsec"><span class="eyebrow">Answer</span><div class="ans">${esc(e.answer)}</div></div>
      ${Object.keys(e.notes).length ? `<div class="dsec"><span class="eyebrow">Added by product</span>${Object.entries(e.notes).map(([p, n]) => `<div class="src-card" style="margin-bottom:.4rem"><span class="prod">${p}</span> ${esc(n)}</div>`).join('')}</div>` : ''}
      <div class="dsec"><dl class="kv">
        <dt>Owner</dt><dd>${esc(e.owner)}</dd>
        <dt>Last reviewed</dt><dd>${E.fmtDate(e.reviewed)}</dd>
        <dt>Used by</dt><dd>${P(used.length, 'answer')} in ${P(qns, 'questionnaire')}</dd>
        <dt>Maps to</dt><dd class="mono" data-tip="Crosswalk to standard questionnaire domains">SIG ${d.sig} · CAIQ ${d.caiq}</dd>
        <dt>Scope</dt><dd>${e.scope.length ? e.scope.join(', ') + ' module only' : 'All products'}</dd>
        <dt>Learned</dt><dd>${P(e.phrasings.length, 'phrasing')}</dd>
      </dl></div>
      <div class="dsec"><span class="eyebrow">Evidence</span>${e.evidence.length ? e.evidence.map(x => {
        const n = E.days(S.today, x.expires);
        return `<div class="block" style="${ev === x ? '' : 'border-left-color:var(--g3)'}"><span><b>${esc(x.name)}</b><br><span class="muted">valid through ${E.fmtDate(x.expires)} · ${n < 0 ? 'expired' : 'expires in ' + P(n, 'day')}</span></span>
          ${ev === x ? `<button class="btn sm ghost" data-renew="${id}">${id === 'B27' ? 'Request bridge letter' : 'Request renewal'}</button>` : ''}</div>`;
      }).join('') : '<span class="muted">No evidence attached.</span>'}</div>
      <div class="dsec"><span class="eyebrow">History</span><ol class="vers">${e.versions.map(v => `<li><span class="vt">${E.fmtDate(v.date)} · ${esc(v.by)}</span><br>${esc(v.note)}</li>`).join('')}</ol></div>`;
  }

  function dChecks() {
    const list = E.checks();
    const pass = list.filter(c => c.pass).length;
    return `<div class="eyebrow">Known-answer checks</div><h2>${pass} of ${list.length} pass</h2>
      <p class="muted">Each check runs on a fresh copy of the seeded data, so it never changes what is on screen.</p>
      <ul class="checks">${list.map(c => `<li><span class="cid">${c.id}</span><span>${esc(c.name)}<small>${esc(c.detail)}</small></span><span class="res ${c.pass ? '' : 'fail'}">${c.pass ? 'PASS' : 'FAIL'}</span></li>`).join('')}</ul>
      <div class="guard"><span class="eyebrow">Guardrails</span><ul>
        <li>Nothing is sent to a customer without a person approving the finished questionnaire.</li>
        <li>Every bank change needs the security lead; legal-locked text needs Counsel.</li>
        <li>AI drafts are labeled simulated and mark gaps instead of inventing controls.</li>
        <li>Answers include product details only for modules the customer bought.</li>
        <li>Everything runs in the browser. No real tools, customers, or AI services are contacted.</li>
      </ul></div>`;
  }

  /* ── actions ─────────────────────────────────────────────── */
  function blocked(need) {
    if (need === 'state') return;
    const t = needTarget(need);
    toast(t.msg, `Switch to ${t.name}`, () => setPersona(t.pid));
  }
  function setPersona(pid) {
    persona = pid;
    $('#persona').value = pid;
    const p = E.persona(pid);
    S.log.unshift({ t: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }), who: p.name, action: 'Switched viewer', target: p.role, reason: '' });
    refresh();
  }
  function doChange(act, id) {
    const s = S.signals.find(x => x.id === id);
    if (act === 'edit') { changeEditing = true; return openDrawer('change:' + id, true); }
    let r;
    if (act === 'approve') {
      const ta = $('#chTa');
      r = E.approveSignal(S, id, persona, ta ? ta.value.trim() : null);
    } else r = E.keepSignal(S, id, persona, 'Current answer kept after review');
    if (!r.ok) return blocked(r.need);
    changeEditing = false;
    closeDrawer();
    const qnN = new Set(S.questions.filter(q => r.refreshed.includes(q.id)).map(q => q.qn)).size;
    if (view === 'funnel') Funnel.flyOut(r.refreshed, true);
    toast(`Bank updated · ${P(r.refreshed.length, 'answer')} refreshed in ${P(qnN, 'questionnaire')}`);
    refresh();
  }

  /* ── log, toast, tooltips ────────────────────────────────── */
  function renderLog() {
    $('#logList').innerHTML = S.log.map(l => `<li class="${l.who === 'Engine' ? 'engine' : ''}"><span class="lt">${l.t} · ${esc(l.who)}</span><b>${esc(l.action)}</b>${esc(l.target)}${l.reason ? `<div class="lr">${esc(l.reason)}</div>` : ''}</li>`).join('');
  }
  let toastT;
  function toast(msg, btn, fn) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${btn ? `<button>${esc(btn)}</button>` : ''}`;
    if (btn) t.querySelector('button').onclick = () => { t.classList.remove('on'); fn(); };
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), btn ? 6500 : 3200);
  }
  const tip = $('#tip');
  function showTip(elm) {
    const text = elm.getAttribute('data-tip');
    if (!text) return;
    tip.textContent = text;
    tip.classList.add('on');
    const r = elm.getBoundingClientRect(), tr = tip.getBoundingClientRect();
    let x = r.left + r.width / 2 - tr.width / 2, y = r.bottom + 8;
    if (y + tr.height > innerHeight - 40) y = r.top - tr.height - 8;
    x = Math.max(8, Math.min(innerWidth - tr.width - 8, x));
    tip.style.left = x + 'px'; tip.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { tip.classList.remove('on'); }
  document.addEventListener('mouseover', ev => { const t = ev.target.closest('[data-tip]'); t ? showTip(t) : hideTip(); });
  document.addEventListener('focusin', ev => { const t = ev.target.closest('[data-tip]'); t ? showTip(t) : hideTip(); });
  document.addEventListener('scroll', hideTip, true);

  /* ── events ──────────────────────────────────────────────── */
  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-go],[data-qn],[data-af],[data-bf],[data-focus],[data-act],[data-ch],[data-persona],[data-send],[data-renew],[data-review],[data-close]');
    if (!t) return;
    const d = t.dataset;
    if (d.close) { d.close === 'drawer' ? closeDrawer() : $('#log').classList.remove('on'); return; }
    if (d.go) {
      if (d.go.startsWith('answers:')) { ansQn = d.go.split(':')[1]; ansFilter = 'all'; closeDrawer(); return nav('answers'); }
      if (!/^(change|q|entry):/.test(d.go)) closeDrawer();
      changeEditing = false;
      return nav(d.go);
    }
    if (d.qn) { ansQn = d.qn; return refresh(); }
    if (d.af) { ansFilter = d.af; return refresh(); }
    if (d.bf) { bankFilter = d.bf; return refresh(); }
    if (d.focus) { focusId = d.focus; editing = false; return refresh(); }
    if (d.act) {
      if (d.act === 'approve') return approveFocus();
      if (d.act === 'edit') { editing = true; return refresh(); }
      if (d.act === 'cancel') { editing = false; return refresh(); }
      if (d.act === 'save') return approveFocus($('#editTa').value.trim());
      if (d.act === 'skip') return skip();
    }
    if (d.ch) { const [a, id] = d.ch.split(':'); return doChange(a, id); }
    if (d.persona) return setPersona(d.persona);
    if (d.send) return confirmSend(d.send);
    if (d.renew) {
      if (persona === 'sales') return blocked('answer');
      const e = S.entries[d.renew];
      S.log.unshift({ t: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }), who: E.persona(persona).name, action: d.renew === 'B27' ? 'Requested bridge letter' : 'Requested renewal', target: `${e.id} ${e.title}`, reason: `Sent to ${e.owner} (simulated)` });
      toast(`${d.renew === 'B27' ? 'Bridge letter' : 'Renewal'} requested from ${e.owner} (simulated)`);
      return renderLog();
    }
    if (d.review) { focusId = d.review; closeDrawer(); return nav('review'); }
  });
  function skip() {
    const qu = E.queue(S);
    const i = qu.findIndex(q => q.id === focusId);
    focusId = qu[(i + 1) % qu.length].id;
    editing = false;
    refresh();
  }
  document.querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => { closeDrawer(); nav(b.dataset.view); }));
  $('#scrim').addEventListener('click', closeDrawer);
  $('#logBtn').onclick = () => $('#log').classList.toggle('on');
  $('#checksBtn').onclick = () => openDrawer('checks:all');
  $('#presenterBtn').onclick = ev => {
    const on = document.documentElement.classList.toggle('present');
    ev.currentTarget.setAttribute('aria-pressed', on);
  };
  $('#resetBtn').onclick = () => {
    closeDrawer(); closeModal(); $('#log').classList.remove('on');
    persona = 'analyst'; $('#persona').value = persona;
    ansQn = 'BPL'; ansFilter = 'all'; bankFilter = 'all'; focusId = null; editing = false; changeEditing = false;
    $('#view').innerHTML = '';
    boot(); nav('funnel');
    toast('Reset to the starting data');
  };
  $('#persona').innerHTML = D.personas.map(p => `<option value="${p.id}">${p.name} · ${p.role}</option>`).join('');
  $('#persona').onchange = ev => setPersona(ev.target.value);

  document.addEventListener('keydown', ev => {
    const typing = /TEXTAREA|SELECT|INPUT/.test(document.activeElement.tagName);
    if (ev.key === 'Escape') {
      if ($('#modal').classList.contains('on')) return closeModal();
      if (editing) { editing = false; return refresh(); }
      closeDrawer(); $('#log').classList.remove('on'); hideTip(); return;
    }
    if (typing || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const views = ['funnel', 'intake', 'answers', 'bank', 'review', 'output'];
    if (/^[1-6]$/.test(ev.key)) { closeDrawer(); return nav(views[Number(ev.key) - 1]); }
    if (view === 'review' && focusId && !drawerRoute) {
      const k = ev.key.toLowerCase();
      if (k === 'a') { ev.preventDefault(); return approveFocus(); }
      if (k === 'e') { ev.preventDefault(); editing = true; return refresh(); }
      if (k === 's') { ev.preventDefault(); return skip(); }
    }
  });

  Funnel.onDone(() => {
    if (alerted) return;
    alerted = true;
    const s = S.signals.find(x => x.entry === 'B01' && x.status === 'open');
    if (s) toast(`MFA rollout complete in the PMO tracker · ${P(held(s), 'answer')} out of date`, 'Review change', () => nav('change:' + s.id));
    if (view === 'funnel') refresh();
  });

  boot();
  nav('funnel');
})();
