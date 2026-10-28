/* BC-03 recovery engine. Pure functions: no DOM, runs in the browser and under Node.
   All times are hours after the failure (hour 0). Mirrors the reference model in data/. */
(function (root) {
  "use strict";

  const r2 = (x) => Math.round(x * 100) / 100;
  const G = (members, sw) => ({ any: members, switch: sw });
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------------------------------------------------------------- what-if improvements
  const WHATIF_APPLY = {
    W1: (n) => { n.H10.deps = n.H10.deps.filter((d) => d !== "H01"); },
    W2: (n) => { n.H01.restore_h = 10; n.H01.last_tested = "2026-10"; },
    W3: (n) => { n.H05.failover_h = 0.25; n.H05.deps = [G(["F1", "F2"], 0.25)]; },
    W4: (n) => { n.N02.deps = ["F1"]; n.N09.deps = ["F1", "N04"]; },
    W5: (n) => { n.D01.backup_age_h = 4; n.D03.backup_age_h = 4; n.D02.backup_age_h = 4; },
    W6: (n) => {
      n.A13.deps = ["D07", G(["P03", "P04"], 0.25), "I04"];
      n.D07.deps = [G(["R1", "R2"], 0.25)]; n.D07.failover_h = 0.25;
      n.I04.deps = [G(["P03", "P04"], 0.25)];
    },
  };

  function indexNodes(topology) {
    const by = {};
    topology.nodes.forEach((n) => { by[n.id] = n; });
    return by;
  }

  // ---------------------------------------------------------------- run
  function run(topology, seeds, opts) {
    opts = opts || {};
    const nodes = clone(indexNodes(topology));
    (opts.whatifs || []).forEach((w) => WHATIF_APPLY[w] && WHATIF_APPLY[w](nodes));
    if (opts.failClosed) nodes.A02.deps = nodes.A02.deps.concat(["A13"]);
    const seedBy = {};
    (seeds || []).forEach((s) => { seedBy[s.node] = s; });
    const up = {}, loss = {}, path = {}, why = {}, switched = {}, start = {}, own = {};
    const ids = topology.nodes.map((n) => n.id);

    function calc(id, stack) {
      if (id in up) return up[id];
      if (stack.indexOf(id) >= 0) throw new Error("Dependency cycle: " + stack.concat(id).join(" > "));
      const n = nodes[id], st = stack.concat(id);
      let depUp = 0, w = null;
      n.deps.forEach((g) => {
        let t, used;
        if (typeof g === "string") { t = calc(g, st); used = g; }
        else {
          const m = g.any, tp = calc(m[0], st);
          if (tp === 0) { t = 0; used = m[0]; }
          else {
            let best = null;
            m.slice(1).forEach((x) => {
              const v = [Math.max(calc(x, st), g.switch), x];
              if (!best || v[0] < best[0] || (v[0] === best[0] && v[1] < best[1])) best = v;
            });
            if (!best) best = [tp, m[0]];
            if (tp <= best[0]) { t = tp; used = m[0]; } else { t = best[0]; used = best[1]; }
            if (used !== m[0]) switched[id] = true;
          }
        }
        if (t > depUp) { depUp = t; w = used; }
      });
      let o = 0, l = 0, p = null;
      const s = seedBy[id];
      if (s) {
        if (s.duration !== undefined && s.duration !== null) { o = s.duration; p = "repair"; start[id] = 0; }
        else if (s.mode === "outage" && n.failover_h !== null && n.failover_h !== undefined) {
          o = n.failover_h; l = n.repl_lag_h; p = "failover"; start[id] = 0;
        } else {
          const rd = n.recovery_deps || [];
          let sTime = 0, gate = null;
          rd.forEach((r) => { const v = calc(r, st); if (v > sTime) { sTime = v; gate = r; } });
          o = sTime + (n.restore_h == null ? 4 : n.restore_h); p = "restore"; start[id] = sTime;
          l = n.backup_age_h || 0;
          if (sTime > 0 && sTime >= depUp) w = gate;
        }
        if (!n.data) l = 0;
      } else if (n.data && switched[id] && depUp > 0) { l = n.repl_lag_h; p = "switch"; }
      const t = Math.max(o, depUp);
      if (s && o >= depUp) w = (p === "restore" && w && (n.recovery_deps || []).indexOf(w) >= 0) ? w : null;
      up[id] = r2(t); loss[id] = l; path[id] = p; why[id] = w; own[id] = o;
      return up[id];
    }
    ids.forEach((id) => calc(id, []));

    function closure(id, acc) {
      nodes[id].deps.forEach((g) => {
        (typeof g === "string" ? [g] : g.any).forEach((m) => {
          if (!acc.has(m)) { acc.add(m); closure(m, acc); }
        });
      });
      return acc;
    }
    function dataLoss(id) {
      let m = loss[id] || 0;
      closure(id, new Set()).forEach((x) => { if (loss[x] > m) m = loss[x]; });
      return m;
    }
    function chain(id) {
      const out = [id];
      while (why[out[out.length - 1]]) out.push(why[out[out.length - 1]]);
      return out;
    }
    // state of a node at clock time t (hours)
    function stateAt(id, t) {
      const n = nodes[id];
      if (up[id] === 0) {
        const soft = (n.soft || []).some((d) => up[d] > t);
        return soft ? "degraded" : "ok";
      }
      if (t >= up[id]) return "recovered";
      if (seedBy[id]) {
        const p = path[id];
        if (p === "failover") return "failover";
        if (p === "restore") {
          if (t < start[id]) return "waiting";
          if (t < own[id]) return "restoring";
          return "down"; // own work done, waiting on dependencies
        }
        return "down";
      }
      return "down";
    }
    function progress(id, t) {
      const n = nodes[id];
      if (path[id] === "restore") {
        const d = own[id] - start[id];
        return d > 0 ? Math.max(0, Math.min(1, (t - start[id]) / d)) : 1;
      }
      return up[id] > 0 ? Math.max(0, Math.min(1, t / up[id])) : 1;
    }
    return { nodes, seeds: seedBy, up, loss, path, why, switched, start, own, dataLoss, chain, closure, stateAt, progress };
  }

  // ---------------------------------------------------------------- business calendar and cost
  // Reference week: Mon Oct 26 to Sun Nov 1, 2026. Time = hours since Mon 00:00 (no DST shifts).
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const REF_DATES = [[2026, 10, 26], [2026, 10, 27], [2026, 10, 28], [2026, 10, 29], [2026, 10, 30], [2026, 10, 31], [2026, 11, 1]];
  const MONTH_END = { "2026-10-30": 1, "2026-11-02": 1, "2026-11-03": 1 };
  function startHour(label) {
    const parts = label.split(" "), hm = parts[1].split(":");
    return DAYS.indexOf(parts[0]) * 24 + Number(hm[0]) + Number(hm[1]) / 60;
  }
  function calendar(h) {
    const dayIdx = Math.floor(h / 24), hour = h - dayIdx * 24;
    const weekday = ((dayIdx % 7) + 7) % 7;
    const d = new Date(Date.UTC(2026, 9, 26 + dayIdx));
    const iso = d.toISOString().slice(0, 10);
    return { weekday, hour, iso, month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  }
  function weight(svc, h, opts) {
    const c = calendar(h);
    let w;
    if (svc.hours_profile === "24x7") w = (c.hour >= 7 && c.hour < 22) ? 1 : 0.4;
    else w = (c.weekday < 5 && c.hour >= 8 && c.hour < 18) ? 1 : 0;
    let m = 1;
    if (svc.id === "S03" && c.weekday === 4) m = 3;
    if ((svc.id === "S09" || svc.id === "S11") && MONTH_END[c.iso]) m = 1.5;
    if (svc.id === "S01" && (opts && opts.peak)) m = 1.4;
    return w * m;
  }
  function cost(svc, start, downH, workaround, opts) {
    let total = 0, h = 0;
    const step = 0.25, wk = workaround ? svc.workaround : null;
    while (h < downH - 1e-9) {
      const dh = Math.min(step, downH - h);
      const f = (wk && h >= wk.after_h) ? 1 - wk.capacity : 1;
      total += svc.revenue_per_hour * weight(svc, start + h, opts) * dh * f;
      h += dh;
    }
    return Math.round(total);
  }
  // cumulative cost curve sampled every `step` hours up to `until`
  function costCurve(svc, start, downH, workaround, opts, until, step) {
    const pts = [];
    for (let t = 0; t <= until + 1e-9; t += step) pts.push([t, cost(svc, start, Math.min(t, downH), workaround, opts)]);
    return pts;
  }
  function txnLost(svc, start, lossH, opts) {
    let total = 0, h = 0;
    const step = 0.25;
    while (h < lossH - 1e-9) {
      const dh = Math.min(step, lossH - h);
      let w = weight(svc, start - h - dh, opts);
      if (svc.hours_profile !== "24x7") w = w > 0 ? 1 : 0;
      total += svc.transactions_per_hour * w * dh;
      h += dh;
    }
    return Math.round(total);
  }

  function serviceIds(topology) { return topology.nodes.filter((n) => n.lane === "Business services").map((n) => n.id); }

  function summary(topology, r, start, opts) {
    opts = opts || {};
    const wk = opts.workarounds || {};
    return serviceIds(topology).map((sid) => {
      const n = r.nodes[sid], t = r.up[sid], dl = r2(r.dataLoss(sid));
      return {
        id: sid, name: n.name, rto: n.rto, rpo: n.rpo, mtd: n.mtd, owner: n.owner,
        down_h: t, data_loss_h: dl,
        rto_gap: t > n.rto ? r2(t - n.rto) : 0,
        rpo_gap: dl > n.rpo ? r2(dl - n.rpo) : 0,
        chain: r.chain(sid),
        cost: cost(n, start, t, !!wk[sid], opts),
        txn_lost: txnLost(n, start, dl, opts),
      };
    });
  }
  function fraudExposure(r, opts) {
    if (opts && opts.failClosed) return 0;
    return Math.round(18000 * (r.up.A13 || 0));
  }

  // ---------------------------------------------------------------- static checks (no failure)
  function staticChecks(topology) {
    const by = indexNodes(topology), svc = serviceIds(topology);
    const inversions = [];
    topology.nodes.forEach((n) => {
      if (n.rto == null || n.vendor) return;
      n.deps.forEach((g) => {
        if (typeof g === "string") {
          if (by[g].rto != null && by[g].rto > n.rto) inversions.push({ node: n.id, dep: g, depRto: by[g].rto, rto: n.rto });
        } else {
          const p = by[g.any[0]].rto, e = p == null ? g.switch : Math.min(p, g.switch);
          if (g.switch > n.rto && (p == null || p > n.rto)) inversions.push({ node: n.id, dep: g.any.join("|"), depRto: e, rto: n.rto, group: true });
        }
      });
    });
    const memo = {};
    function paper(id) {
      if (id in memo) return memo[id];
      const n = by[id];
      let best = n.rto || 0;
      n.deps.forEach((g) => {
        if (typeof g === "string") best = Math.max(best, paper(g));
        else {
          const p = paper(g.any[0]);
          const alt = Math.min.apply(null, g.any.slice(1).map(paper));
          best = Math.max(best, Math.min(p, Math.max(g.switch, alt)));
        }
      });
      memo[id] = best;
      return best;
    }
    function paperPath(id) { // dependency that sets the paper RTO
      const out = [id];
      let cur = id;
      for (let i = 0; i < 12; i++) {
        const n = by[cur];
        let nxt = null, val = n.rto || 0;
        n.deps.forEach((g) => {
          const d = typeof g === "string" ? g : g.any[0];
          const v = typeof g === "string" ? paper(g) : Math.min(paper(g.any[0]), Math.max(g.switch, Math.min.apply(null, g.any.slice(1).map(paper))));
          if (v > val) { val = v; nxt = d; }
        });
        if (!nxt) break;
        out.push(nxt); cur = nxt;
      }
      return out;
    }
    const paperRows = svc.map((s) => ({ id: s, name: by[s].name, rto: by[s].rto, paper: paper(s), path: paperPath(s) }));
    const assets = topology.nodes.filter((n) => n.lane !== "Business services");
    const restoreGaps = assets.filter((n) => n.restore_h && n.rto != null && n.restore_h > n.rto)
      .map((n) => ({ node: n.id, restore: n.restore_h, rto: n.rto, tested: n.last_tested }));
    const backupGaps = assets.filter((n) => n.data && n.backup_age_h && n.rpo != null && n.backup_age_h > n.rpo)
      .map((n) => ({ node: n.id, backup: n.backup_age_h, rpo: n.rpo }));
    const untested = assets.filter((n) => !n.vendor && n.restore_h && (!n.last_tested || n.last_tested < "2025-10"))
      .map((n) => ({ node: n.id, tested: n.last_tested }));
    const spof = [];
    assets.forEach((n) => {
      const dur = (n.restore_h || n.failover_h != null) ? null : 4;
      const seed = { node: n.id, mode: "outage" };
      if (dur != null) seed.duration = dur;
      const r = run(topology, [seed]);
      const broken = svc.filter((s) => r.up[s] > by[s].rto).map((s) => ({ id: s, down: r.up[s], rto: by[s].rto }));
      if (broken.length) spof.push({ node: n.id, services: broken });
    });
    return { inversions, paper: paperRows, paperMisses: paperRows.filter((p) => p.paper > p.rto), restoreGaps, backupGaps, untested, spof };
  }

  // services that inherit a dependency (closure contains it)
  function dependents(topology, id) {
    const out = [], by = indexNodes(topology);
    topology.nodes.forEach((n) => {
      const seen = new Set();
      (function walk(x) {
        by[x].deps.forEach((g) => (typeof g === "string" ? [g] : g.any).forEach((m) => {
          if (!seen.has(m)) { seen.add(m); walk(m); }
        }));
      })(n.id);
      if (seen.has(id)) out.push(n.id);
    });
    return out;
  }

  const api = { run, summary, cost, costCurve, txnLost, weight, calendar, startHour, staticChecks, dependents, fraudExposure, serviceIds, DAYS, REF_DATES, WHATIFS: Object.keys(WHATIF_APPLY) };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
