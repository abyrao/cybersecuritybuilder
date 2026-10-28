/* OC-04 · The response funnel: SVG stages, source feeds, two outputs,
   and one particle per question. Particles that need a person come to rest
   in the Review stage; everything else flows out to the customer. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const CX = 500, BANDS = [20, 110, 200, 290, 380, 470];
  const CUST = { x: 210, y: 515, w: 230, h: 100 }, BANK = { x: 560, y: 515, w: 230, h: 100 };
  const INK = '#111111', G1 = '#6B6B6B', G3 = '#D4D4D4', RED = '#E10600';
  const hw = y => 255 - (y - 20) * (185 / 450);
  const E = window.OC4E;

  let svg = null, gPart = null, refs = {}, parts = [], ran = false, running = false, raf = null, nav = null, S = null, flying = 0;

  function el(tag, attrs, parent, text) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function trap(y0, y1) {
    return `${CX - hw(y0)},${y0} ${CX + hw(y0)},${y0} ${CX + hw(y1)},${y1} ${CX - hw(y1)},${y1}`;
  }
  function tipAttrs(node, tip, go) {
    node.setAttribute('data-tip', tip);
    if (go) {
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.classList.add('hit');
      node.addEventListener('click', go);
      node.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
    }
  }

  const STAGES = [
    { name: 'Intake', go: 'intake', tip: 'Questionnaires arrive as SIG Lite, CAIQ, or custom spreadsheets. The format is detected and each one is split into questions with the deal context attached.' },
    { name: 'Match', go: 'answers', tip: 'Each question is matched to a bank entry: by standard ID first (SIG or CAIQ crosswalk), then by meaning (simulated).' },
    { name: 'Draft', go: 'answers', tip: 'Matches at confidence 85 or higher are answered from the bank, tailored to the products the customer bought. Questions with no match get a simulated AI draft.' },
    { name: 'Verify', go: 'bank', tip: 'Every answer is checked against the source feeds. A source change after the last review makes an entry stale; evidence expiring within 60 days is flagged; legal-locked entries are never edited automatically.' },
    { name: 'Review', go: 'review', tip: 'Only exceptions reach people: loose matches, AI drafts, expiring evidence, and bank changes waiting for approval.' }
  ];

  function mount(container, state, navTo) {
    S = state; nav = navTo;
    container.innerHTML = '';
    svg = el('svg', { viewBox: '0 0 1000 640', class: 'funnel-svg', role: 'img', 'aria-label': 'Response funnel: questions flow through five stages to two outputs' }, container);
    const defs = el('defs', {}, svg);
    const mk = el('marker', { id: 'fa', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0 0L10 5L0 10z', fill: INK }, mk);
    const mk2 = el('marker', { id: 'fa2', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0 0L10 5L0 10z', fill: G1 }, mk2);

    // connectors
    const gc = el('g', { fill: 'none', stroke: INK, 'stroke-width': '1.5' }, svg);
    el('path', { d: `M${CX} ${BANDS[5]}V492H${CUST.x + CUST.w / 2}V${CUST.y - 2}`, 'marker-end': 'url(#fa)' }, gc);
    el('path', { d: `M${CX} 492H${BANK.x + BANK.w / 2}V${BANK.y - 2}`, 'marker-end': 'url(#fa)' }, gc);
    el('path', { d: `M900 296V565H${BANK.x + BANK.w + 2}`, 'marker-end': 'url(#fa)' }, gc);
    el('path', { d: `M780 ${BANK.y}V155H${CX + hw(155) + 4}`, stroke: G1, 'stroke-dasharray': '5 5', 'marker-end': 'url(#fa2)' }, gc);
    const lt = el('text', { class: 'f-note', 'text-anchor': 'end' }, svg);
    el('tspan', { x: 772, y: 300 }, lt, 'approved answers');
    el('tspan', { x: 772, y: 316 }, lt, 'reused next time');
    const st = el('text', { class: 'f-note' }, svg);
    el('tspan', { x: 908, y: 400 }, st, 'signals flag');
    el('tspan', { x: 908, y: 416 }, st, 'stale answers');

    // stages
    refs.stage = [];
    STAGES.forEach((s, i) => {
      const y0 = BANDS[i], y1 = BANDS[i + 1];
      const g = el('g', { class: 'f-stage' + (i === 4 ? ' f-review' : '') }, svg);
      el('polygon', { points: trap(y0 + (i ? 2 : 0), y1 - 2), class: 'f-band' }, g);
      const mid = (y0 + y1) / 2;
      el('line', { x1: 214, y1: mid, x2: CX - hw(mid) - 8, y2: mid, class: 'f-lead' }, g);
      el('text', { x: 24, y: y0 + 22, class: 'f-idx' }, g, '0' + (i + 1));
      el('text', { x: 52, y: y0 + 22, class: 'f-name' }, g, s.name);
      const num = el('text', { x: 24, y: y0 + 58, class: 'f-num' }, g, '0');
      const sub = el('text', { x: 24, y: y0 + 78, class: 'f-sub' }, g, '');
      tipAttrs(g, s.tip, () => nav(s.go));
      refs.stage.push({ num, sub, g });
    });

    gPart = el('g', { class: 'f-parts' }, svg);

    // outputs
    const oc = el('g', { class: 'f-out' }, svg);
    el('rect', { x: CUST.x, y: CUST.y, width: CUST.w, height: CUST.h, rx: 14 }, oc);
    el('text', { x: CUST.x + 18, y: CUST.y + 28, class: 'f-oname' }, oc, 'To customer');
    refs.cNum = el('text', { x: CUST.x + 18, y: CUST.y + 68, class: 'f-onum' }, oc, '0');
    refs.cSub = el('text', { x: CUST.x + 18, y: CUST.y + 88, class: 'f-sub' }, oc, '');
    tipAttrs(oc, 'Answers ready to send. Nothing leaves until a person approves the finished questionnaire.', () => nav('output'));
    refs.cRect = oc.querySelector('rect');

    const ob = el('g', { class: 'f-out f-bank' }, svg);
    el('rect', { x: BANK.x, y: BANK.y, width: BANK.w, height: BANK.h, rx: 14 }, ob);
    el('text', { x: BANK.x + 18, y: BANK.y + 28, class: 'f-oname' }, ob, 'To response bank');
    refs.bNum = el('text', { x: BANK.x + 18, y: BANK.y + 68, class: 'f-onum' }, ob, '0');
    refs.bSub = el('text', { x: BANK.x + 18, y: BANK.y + 88, class: 'f-sub' }, ob, '');
    tipAttrs(ob, 'Every approval enriches the bank: updated entries, new entries from AI drafts, and new phrasings, so the next questionnaire needs less review.', () => nav('bank'));
    refs.bRect = ob.querySelector('rect');

    // feeds
    el('text', { x: 810, y: 22, class: 'f-idx' }, svg, 'SOURCE FEEDS');
    refs.feeds = [];
    window.OC4.feeds.forEach((f, i) => {
      const y = 36 + i * 54;
      const g = el('g', { class: 'f-feed' }, svg);
      el('rect', { x: 810, y, width: 180, height: 44, rx: 10 }, g);
      el('text', { x: 824, y: y + 19, class: 'f-fname' }, g, f.name);
      const sub = el('text', { x: 824, y: y + 35, class: 'f-fsub' }, g, '');
      const dot = el('circle', { cx: 974, cy: y + 22, r: 5 }, g);
      tipAttrs(g, `${f.tool}: ${f.tip}`, () => {
        const s = S.signals.find(x => x.feed === f.id && x.status === 'open');
        nav(s ? 'change:' + s.id : 'bank');
      });
      refs.feeds.push({ f, sub, dot, g });
    });

    if (!parts.length) seed();
    if (running) { running = false; flying = 0; }
    if (!ran) run(); else { syncParts(); loop(); }
    update(S);
  }

  /* ── particles ───────────────────────────────────────────── */
  function seed() {
    let s = 77;
    const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const order = S.questions.map((q, i) => i).sort(() => R() - 0.5);
    parts = order.map((qi, k) => {
      const q = S.questions[qi];
      const st = E.qStatus(S, q);
      const cat = E.READY.has(st) ? 'ready' : E.HELD.has(st) ? 'held' : 'person';
      const flagAt = st === 'draft' ? BANDS[2] : st === 'review' ? BANDS[3] : BANDS[4];
      return {
        q, cat, mfa: q.entry === 'B01' && cat === 'held', flagAt, flagged: false,
        u: R() * 1.7 - 0.85, y: 12, x: CX, v: 150 + R() * 70, t0: k * (3600 / S.questions.length),
        restY: 394 + R() * 66, restU: R() * 1.6 - 0.8, ph: R() * 6.28, phase: 'wait', node: null, ex: null
      };
    });
  }
  function nodeFor(p) {
    if (!p.node) {
      p.node = el('circle', { r: 3.4, cx: p.x, cy: p.y }, gPart);
      p.node.addEventListener('click', () => nav('q:' + p.q.id));
    }
    return p.node;
  }
  function paint(p) {
    const n = nodeFor(p);
    let fill = INK, stroke = 'none';
    if (p.flagged) {
      if (p.mfa) fill = RED;
      else if (p.cat === 'held') fill = G1;
      else if (p.cat === 'person') { fill = '#FFFFFF'; stroke = G1; }
    }
    n.setAttribute('fill', fill);
    n.setAttribute('stroke', stroke);
    n.setAttribute('stroke-width', stroke === 'none' ? 0 : 1.6);
    n.setAttribute('cx', p.x.toFixed(1));
    n.setAttribute('cy', p.y.toFixed(1));
    n.style.opacity = p.phase === 'wait' || p.phase === 'done' ? 0 : (p.fade == null ? 1 : p.fade);
  }

  let tRun0 = 0;
  function run() {
    running = true; ran = true;
    tRun0 = performance.now();
    parts.forEach(p => { p.phase = 'wait'; p.flagged = false; p.y = 12; p.fade = null; });
    loop();
  }
  function loop() {
    cancelAnimationFrame(raf);
    let last = performance.now();
    const step = now => {
      const dt = Math.min(50, now - last) / 1000; last = now;
      const t = now - tRun0;
      let active = 0;
      parts.forEach(p => {
        if (p.phase === 'wait' && t >= p.t0) p.phase = 'fall';
        if (p.phase === 'fall') {
          p.y += p.v * dt;
          if (!p.flagged && p.cat !== 'ready' && p.y >= p.flagAt) p.flagged = true;
          if (p.cat !== 'ready' && p.y >= p.restY) { p.y = p.restY; p.phase = 'rest'; p.flagged = true; }
          else if (p.cat === 'ready' && p.y >= BANDS[5] - 6) startExit(p, now);
          p.x = CX + p.u * hw(p.y) * 0.86 + Math.sin(now / 300 + p.ph) * 1.5;
        }
        if (p.phase === 'rest') {
          const tx = CX + p.restU * hw(p.restY) * 0.82;
          p.x += (tx - p.x) * 0.08 + Math.sin(now / 700 + p.ph) * 0.25;
          p.y = p.restY + Math.sin(now / 900 + p.ph * 2) * 1.2;
        }
        if (p.phase === 'exit') stepExit(p, now);
        if (p.phase === 'wait' || p.phase === 'fall' || p.phase === 'exit') active++;
        if (p.node || p.phase !== 'wait') paint(p);
      });
      counters();
      if (active === 0 && running) { running = false; update(S); if (onDone) onDone(); }
      if (svg && svg.isConnected) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  let onDone = null;

  function startExit(p, now) {
    p.phase = 'exit';
    flying++;
    const tx = p.toBank ? BANK.x + BANK.w / 2 : CUST.x + CUST.w / 2;
    p.ex = { t0: now, pts: [[p.x, p.y], [CX, 492], [tx, 492], [tx, CUST.y + 30]], dur: 650 };
  }
  function stepExit(p, now) {
    const k = Math.max(0, Math.min(1, (now - p.ex.t0) / p.ex.dur));
    const P = p.ex.pts, seg = [];
    let L = 0;
    for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(d); L += d; }
    let d = k * L, i = 0;
    while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    const f = seg[i] ? d / seg[i] : 1;
    p.x = P[i][0] + (P[i + 1][0] - P[i][0]) * f;
    p.y = P[i][1] + (P[i + 1][1] - P[i][1]) * f;
    p.fade = k > 0.8 ? (1 - k) / 0.2 : 1;
    if (k >= 1) { p.phase = 'done'; p.fade = null; flying = Math.max(0, flying - 1); bump(refs.cRect); update(S); }
  }
  function bump(rect) {
    if (!rect) return;
    rect.classList.remove('bump'); void rect.getBBox(); rect.classList.add('bump');
  }

  /* After an approval: send resolved particles to the customer, and one pulse to the bank. */
  function flyOut(ids, toBank) {
    if (!svg || !svg.isConnected) return;
    const now = performance.now();
    const set = new Set(ids);
    parts.forEach(p => { if (set.has(p.q.id) && p.phase === 'rest') { p.cat = 'ready'; startExit(p, now + Math.random() * 200); } });
    if (toBank) pulseBank();
  }
  function pulseBank() {
    const dot = el('circle', { r: 6, fill: RED, cx: CX, cy: 425 }, svg);
    const pts = [[CX, 425], [CX, 492], [BANK.x + BANK.w / 2, 492], [BANK.x + BANK.w / 2, BANK.y + 30]];
    const t0 = performance.now();
    const go = now => {
      const k = Math.min(1, (now - t0) / 800);
      const seg = k < 0.2 ? 0 : k < 0.75 ? 1 : 2;
      const lk = seg === 0 ? k / 0.2 : seg === 1 ? (k - 0.2) / 0.55 : (k - 0.75) / 0.25;
      dot.setAttribute('cx', pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * lk);
      dot.setAttribute('cy', pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * lk);
      if (k < 1) requestAnimationFrame(go); else { dot.remove(); bump(refs.bRect); }
    };
    requestAnimationFrame(go);
  }

  /* Sync particles to the engine after work done in other views. */
  function syncParts() {
    parts.forEach(p => {
      const st = E.qStatus(S, p.q);
      if (E.READY.has(st)) { if (p.phase !== 'exit') p.phase = 'done'; p.node = null; }
      else { p.phase = 'rest'; p.flagged = true; p.y = p.restY; p.x = CX + p.restU * hw(p.restY) * 0.82; p.node = null; }
    });
  }

  /* ── labels ──────────────────────────────────────────────── */
  function counters() {
    if (!running) return;
    const total = S.questions.length;
    const crossed = i => parts.filter(p => p.phase !== 'wait' && (p.y >= BANDS[i + 1] - 1 || p.phase === 'exit' || p.phase === 'done')).length;
    const f = [crossed(0), crossed(1), crossed(2), crossed(3)].map(n => n / total);
    const fin = finals();
    refs.stage[0].num.textContent = Math.round(fin[0] * f[0]);
    refs.stage[1].num.textContent = Math.round(fin[1] * f[1]);
    refs.stage[2].num.textContent = Math.round(fin[2] * f[2]);
    refs.stage[3].num.textContent = Math.round(fin[3] * f[3]);
    refs.stage[4].num.textContent = parts.filter(p => p.phase === 'rest').length;
  }
  function finals() {
    const m = E.metrics(S), c = m.c;
    const drafts = S.questions.filter(q => q.src === 'draft').length;
    return [S.questions.length, S.questions.length - drafts, S.questions.length, c.held + c.expiring, c.open];
  }

  function update(state) {
    S = state || S;
    if (!svg || !svg.isConnected) return;
    const m = E.metrics(S), c = m.c, P = E.plural;
    const drafts = S.questions.filter(q => q.src === 'draft').length;
    const fin = finals();
    if (!running) fin.forEach((v, i) => refs.stage[i].num.textContent = v.toLocaleString('en-US'));
    refs.stage[0].sub.textContent = `from ${P(S.qns.length, 'questionnaire')}`;
    refs.stage[1].sub.textContent = `matched · ${drafts} no match`;
    refs.stage[2].sub.textContent = `drafted · ${drafts} by AI (simulated)`;
    refs.stage[3].sub.textContent = c.held + c.expiring ? `${c.stale} stale, ${c.expiring} expiring, ${c.legal} legal` : 'nothing flagged';
    refs.stage[4].sub.textContent = c.open ? (c.open === 1 ? 'needs a person' : 'need a person') : 'nothing waiting';
    refs.stage[4].g.classList.toggle('done', !c.open);

    const ready = Math.max(0, c.ready - flying);
    refs.cNum.textContent = running ? parts.filter(p => p.phase === 'done').length : ready.toLocaleString('en-US');
    refs.cSub.textContent = `of ${S.questions.length} answers ready`;
    const applied = m.changesDone + S.added.length + S.learned;
    refs.bNum.textContent = applied.toLocaleString('en-US');
    refs.bSub.textContent = `${applied === 1 ? 'update' : 'updates'} · ${m.changes} waiting`;

    refs.feeds.forEach(r => {
      const sig = S.signals.filter(s => s.feed === r.f.id);
      const open = sig.filter(s => s.status === 'open');
      const latest = sig.map(s => s.date).sort().pop();
      r.sub.textContent = open.length ? `${P(open.length, 'change')} · ${E.fmtShort(latest)}` : sig.length ? 'all reviewed' : 'no changes';
      const mfa = open.some(s => s.entry === 'B01');
      r.dot.setAttribute('fill', open.length ? (mfa ? RED : INK) : '#FFFFFF');
      r.dot.setAttribute('stroke', open.length ? 'none' : G3);
      r.dot.setAttribute('class', open.length ? 'pulse' : '');
    });
  }

  function reset(state) {
    S = state; cancelAnimationFrame(raf); running = false; ran = false; flying = 0;
    parts.forEach(p => p.node && p.node.remove());
    parts = []; svg = null;
  }

  window.Funnel = { mount, update, flyOut, reset, replay: () => { if (!svg) return; parts.forEach(p => { if (p.node) p.node.remove(); p.node = null; }); seed(); flying = 0; run(); },
    isRunning: () => running, onDone: fn => { onDone = fn; } };
})();
