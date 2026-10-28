/* BC-05 cost engine. Pure functions, no browser dependencies: runs in the page and under Node.
   A direct port of tools/reference_model.py. Dates are handled as whole UTC day numbers. */
(function (root) {
  "use strict";

  // ---------------------------------------------------------------- dates
  const DAY = 86400000;
  const dn = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY);
  const iso = (n) => new Date(n * DAY).toISOString().slice(0, 10);
  const weekday = (n) => new Date(n * DAY).getUTCDay();          // 0 Sun .. 6 Sat
  const md = (n) => { const d = new Date(n * DAY); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; };
  const monthKey = (n) => iso(n).slice(0, 7);

  function build(model, findingsDoc) {
    const M = model.model;
    const TODAY = dn(model.as_of);
    const HORIZON = model.horizon_days;
    const HISTORY_START = dn(model.history_start);
    const freezes = M.freezes.map((f) => [dn(f.start), dn(f.end)]);
    const WIN = [2, 4];                                         // Tue, Thu
    const assets = model.assets;
    const ASSET = Object.fromEntries(assets.map((a) => [a.id, a]));
    const findings = findingsDoc.findings;
    const projected = findingsDoc.projected;

    // ---------------------------------------------------------------- context
    function seasonMult(n) {
      const [y] = md(n);
      for (const s of M.season) {
        const a = dn(`${y}-${s.start}`), b = dn(`${y}-${s.end}`);
        if (n >= a && n <= b) return s.multiplier;
      }
      return 1.0;
    }
    const inFreeze = (n) => freezes.some(([a, b]) => n >= a && n <= b);
    function nextWindow(n, allowFreeze) {
      for (;;) {
        if (WIN.includes(weekday(n)) && (allowFreeze || !inFreeze(n))) return n;
        n += 1;
      }
    }

    // ---------------------------------------------------------------- cost if exploited
    const recordsCost = (a) => a.data.reduce((s, x) => s + M.cost_per_record[x.class] * x.records, 0);
    const impact = (a, n) => a.incident_response + recordsCost(a) + a.outage_hours_if_exploited * a.cost_per_hour_down * seasonMult(n);
    const impactParts = (a, n) => ({
      incident_response: a.incident_response, records: recordsCost(a),
      downtime: a.outage_hours_if_exploited * a.cost_per_hour_down * seasonMult(n),
    });
    const windowCost = (a, n) => Math.round(a.window_hours * a.cost_per_hour_down * M.window_weight * seasonMult(n));

    // ---------------------------------------------------------------- chance per day
    function statusOn(f, n) {
      if (f.kev_date && n >= dn(f.kev_date)) return "kev";
      if (f.poc_date && n >= dn(f.poc_date)) return "poc";
      return "none";
    }
    // mit: null | {kind: "waf"|"allowlist", start: dayNumber}
    function hazard(f, a, n, mit) {
      let exp = a.exposure, m = 1.0;
      if (mit && n >= mit.start) {
        if (mit.kind === "allowlist") exp = "partner";
        else if (mit.kind === "waf") m = M.waf_factor;
      }
      return M.hazard[statusOn(f, n)] * M.exposure[exp] * m;
    }
    function dueDate(f, policy) {
      const pol = M.policies[policy];
      const fix = dn(f.fix_available);
      let due = fix + pol[f.severity];
      if (pol.kev !== null && f.kev_date) due = Math.min(due, Math.max(fix, dn(f.kev_date)) + pol.kev);
      return due;
    }

    // Expected loss accrued on days [from, to), survival counted from the fix date.
    function loss(f, from, to, opt) {
      opt = opt || {};
      const a = opt.asset || ASSET[f.asset], scale = opt.scale || 1.0, byDay = opt.byDay;
      let H = 0, total = 0;
      for (let n = dn(f.fix_available); n < to; n++) {
        const h = hazard(f, a, n, opt.mit) * scale;
        if (n >= from) {
          const e = impact(a, n) * Math.exp(-H) * (1 - Math.exp(-h));
          total += e;
          if (byDay) byDay[n] = (byDay[n] || 0) + e;
        }
        H += h;
      }
      return total;
    }
    function chance(f, end, start, opt) {
      opt = opt || {};
      const a = opt.asset || ASSET[f.asset];
      let H = 0;
      for (let n = start != null ? start : dn(f.fix_available); n < end; n++) H += hazard(f, a, n, opt.mit);
      return 1 - Math.exp(-H);
    }
    function dailyCost(f, n, opt) {
      opt = opt || {};
      n = n != null ? n : TODAY;
      const a = opt.asset || ASSET[f.asset];
      let H = 0;
      for (let d = dn(f.fix_available); d < n; d++) H += hazard(f, a, d, opt.mit);
      return impact(a, n) * Math.exp(-H) * (1 - Math.exp(-hazard(f, a, n, opt.mit)));
    }
    const isOpen = (f) => !f.patched;
    const openFindings = () => findings.filter(isOpen);

    // ---------------------------------------------------------------- Edge
    function edge() {
      return assets.map((a) => {
        const fs = findings.filter((f) => f.asset === a.id && isOpen(f));
        return {
          asset: a.id, open: fs.length,
          past_due: fs.filter((f) => dueDate(f, "current") < TODAY).length,
          daily_cost: Math.round(fs.reduce((s, f) => s + dailyCost(f), 0)),
          impact_if_exploited: Math.round(impact(a, TODAY)),
          oldest_days: fs.length ? Math.max(...fs.map((f) => TODAY - dn(f.fix_available))) : 0,
          kev_open: fs.filter((f) => statusOn(f, TODAY) === "kev").length,
        };
      });
    }

    // ---------------------------------------------------------------- Delay (history)
    function history() {
      const month = {};
      const addMonth = (byDay) => {
        for (const k in byDay) {
          const n = +k;
          if (n >= HISTORY_START && n <= TODAY) month[monthKey(n)] = (month[monthKey(n)] || 0) + byDay[k];
        }
      };
      const closed = findings.filter((f) => !isOpen(f));
      const per = closed.map((f) => {
        const due = dueDate(f, "current"), end = dn(f.patched);
        const bd = {};
        const c = end > due ? loss(f, due, end, { byDay: bd }) : 0;
        addMonth(bd);
        let freeze = false;
        for (let i = 0; i < Math.max(0, end - due); i++) if (inFreeze(due + i)) { freeze = true; break; }
        return { id: f.id, asset: f.asset, severity: f.severity, days_to_patch: end - dn(f.fix_available),
          days_late: Math.max(0, end - due), cost_of_delay: Math.round(c), freeze, due: iso(due), patched: f.patched };
      });
      const bySev = {};
      for (const sev of ["Critical", "High", "Medium", "Low"]) {
        const rows = per.filter((x) => x.severity === sev);
        const ds = rows.map((x) => x.days_to_patch).sort((a, b) => a - b);
        if (ds.length) bySev[sev] = { count: ds.length, median_days: ds[Math.floor(ds.length / 2)],
          sla: M.policies.current[sev], on_time: rows.filter((x) => x.days_late === 0).length };
      }
      let accruedOpen = 0;
      const openRows = [];
      for (const f of openFindings()) {
        const due = dueDate(f, "current");
        if (due < TODAY) {
          const bd = {};
          const c = loss(f, due, TODAY, { byDay: bd });
          accruedOpen += c; addMonth(bd);
          openRows.push({ id: f.id, asset: f.asset, severity: f.severity, days_late: TODAY - due, cost_of_delay: Math.round(c), open: true });
        }
      }
      const total = Object.values(month).reduce((s, v) => s + v, 0);
      const storyIds = new Set(findings.filter((f) => f.story === "freeze2025").map((f) => f.id));
      const story = per.filter((x) => storyIds.has(x.id));
      const freezeCost = story.reduce((s, x) => s + x.cost_of_delay, 0);
      const byMonth = {};
      Object.keys(month).sort().forEach((k) => { byMonth[k] = Math.round(month[k]); });
      return { by_month: byMonth, total: Math.round(total), accrued_open: Math.round(accruedOpen),
        closed: closed.length, late: per.filter((x) => x.days_late > 0).length, by_severity: bySev,
        per_finding: per, open_late: openRows,
        freeze_share: total ? Math.round((freezeCost / total) * 1000) / 1000 : 0, freeze_cost: freezeCost };
    }

    // ---------------------------------------------------------------- Calculator
    // opts: { patch: dayNumber, mit, assumeKev, asset (override) }
    function calculator(fid, opts) {
      const base = findings.find((x) => x.id === fid);
      const f = Object.assign({}, base);
      if (opts.assumeKev) f.kev_date = iso(TODAY);
      const a = opts.asset || ASSET[f.asset];
      const o = { asset: a, mit: opts.mit };
      const wait = opts.patch > TODAY ? loss(f, TODAY, opts.patch, o) : 0;
      const dc = dailyCost(f, TODAY, o);
      const wc = windowCost(a, TODAY) + M.change_labor;
      const parts = impactParts(a, TODAY);
      return { finding: fid, patch: iso(opts.patch), days_waiting: opts.patch - TODAY,
        chance_by_patch: Math.round(chance(f, opts.patch, TODAY, o) * 10000) / 10000,
        expected_loss_waiting: Math.round(wait), daily_cost_today: Math.round(dc), window_cost: wc,
        break_even_days: dc ? Math.round((wc / dc) * 100) / 100 : null,
        impact_if_exploited: Math.round(impact(a, TODAY)),
        impact_parts: { incident_response: Math.round(parts.incident_response), records: Math.round(parts.records), downtime: Math.round(parts.downtime) } };
    }
    // cumulative expected loss from today, per day, for the calculator curve
    function curve(fid, days, opts) {
      const f = Object.assign({}, findings.find((x) => x.id === fid));
      if (opts.assumeKev) f.kev_date = iso(TODAY);
      const bd = {};
      loss(f, TODAY, TODAY + days + 1, { asset: opts.asset, mit: opts.mit, byDay: bd });
      const out = [0]; let run = 0;
      for (let i = 0; i < days; i++) { run += bd[TODAY + i] || 0; out.push(run); }
      return out;
    }

    // ---------------------------------------------------------------- Forecast
    function planDate(f, scenario) {
      if (scenario === "current") {
        if (f.projected) return nextWindow(dn(f.fix_available) + M.background_median_days[f.severity], false);
        if (f.planned) return dn(f.planned);
        return TODAY + 365;                       // no owner, no plan
      }
      const due = dueDate(f, "proposed");
      const start = f.projected ? due : Math.max(due, TODAY);
      const urgent = f.severity === "Critical" || !!f.kev_date;
      return Math.min(nextWindow(start, urgent), planDate(f, "current"));
    }
    const WAF_LAYERS = ["Web app", "API", "CMS"];
    function forecast(scale) {
      scale = scale || 1.0;
      const end = TODAY + HORIZON;
      const pool = openFindings().concat(projected);
      const out = {};
      for (const sc of ["current", "proposed", "proposed_waf"]) {
        const base = sc === "current" ? "current" : "proposed";
        let total = 0, delay = 0, waf = 0;
        const byDay = {}, emergency = new Set(), emergencyList = [];
        for (const f of pool) {
          const pd = planDate(f, base);
          const start = Math.max(TODAY, dn(f.fix_available));
          const a = ASSET[f.asset];
          let mit = null;
          if (sc === "proposed_waf" && WAF_LAYERS.includes(a.layer) && (f.severity === "Critical" || f.severity === "High") && pd > start + 1) {
            mit = { kind: "waf", start: start + 1 }; waf++;
          }
          const stop = Math.min(pd, end);
          if (stop > start) {
            total += loss(f, start, stop, { mit, scale, byDay });
            const due = dueDate(f, "current");
            if (stop > Math.max(due, start)) delay += loss(f, Math.max(due, start), stop, { mit, scale });
          }
          if (base === "proposed" && inFreeze(pd) && pd < end) {
            const key = f.asset + "|" + pd;
            if (!emergency.has(key)) { emergency.add(key); emergencyList.push({ asset: f.asset, date: iso(pd) }); }
          }
        }
        let policyCost = emergencyList.reduce((s, e) => s + windowCost(ASSET[e.asset], dn(e.date)) + M.change_labor, 0);
        policyCost += waf * M.waf_rule_cost;
        const cum = []; let run = 0;
        for (let i = 0; i < HORIZON; i++) { run += byDay[TODAY + i] || 0; cum.push(Math.round(run)); }
        out[sc] = { expected_loss: Math.round(total), past_sla: Math.round(delay), emergency_changes: emergency.size,
          waf_rules: waf, policy_cost: Math.round(policyCost), cumulative: cum, emergency: emergencyList };
      }
      return out;
    }

    // ---------------------------------------------------------------- CVSS order vs cost order
    function ordering(capacity, n, days) {
      capacity = capacity || 3; n = n || 12; days = days || 30;
      const open = openFindings();
      const dc = new Map(open.map((f) => [f.id, dailyCost(f)]));
      const stable = (arr, key) => arr.map((f, i) => [f, i]).sort((x, y) => key(x[0], y[0]) || x[1] - y[1]).map((x) => x[0]);
      const byCvssAll = stable(open, (x, y) => y.cvss - x.cvss);
      const byCostAll = stable(open, (x, y) => dc.get(y.id) - dc.get(x.id));
      const seen = new Map();
      for (const f of byCvssAll.slice(0, n).concat(byCostAll.slice(0, n))) if (!seen.has(f.id)) seen.set(f.id, f);
      const pool = [...seen.values()];
      const end = TODAY + days;
      const run = (order) => order.reduce((s, f, i) => s + loss(f, TODAY, Math.min(TODAY + 7 * Math.floor(i / capacity) + 1, end)), 0);
      const byCvss = stable(pool, (x, y) => (y.cvss - x.cvss) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
      const byCost = stable(pool, (x, y) => dc.get(y.id) - dc.get(x.id));
      const each = (order) => order.map((f, i) => {
        const pd = Math.min(TODAY + 7 * Math.floor(i / capacity) + 1, end);
        return { id: f.id, patch: iso(pd), loss: Math.round(loss(f, TODAY, pd)) };
      });
      return { pool: pool.length, capacity_per_week: capacity, days,
        cvss_order: Math.round(run(byCvss)), cost_order: Math.round(run(byCost)),
        first_week_cvss: byCvss.slice(0, capacity).map((f) => f.id), first_week_cost: byCost.slice(0, capacity).map((f) => f.id),
        cvss_list: each(byCvss), cost_list: each(byCost), daily: Object.fromEntries(dc) };
    }

    function summary() {
      const open = openFindings();
      const costs = open.map((f) => dailyCost(f)).sort((a, b) => b - a);
      const tot = costs.reduce((s, v) => s + v, 0);
      return { open: open.length, closed: findings.length - open.length, assets: assets.length,
        past_due: open.filter((f) => dueDate(f, "current") < TODAY).length,
        kev_open: open.filter((f) => statusOn(f, TODAY) === "kev").length,
        daily_cost_today: Math.round(tot),
        top2_share: Math.round(((costs[0] + costs[1]) / tot) * 1000) / 1000,
        top3_share: Math.round(((costs[0] + costs[1] + costs[2]) / tot) * 1000) / 1000,
        projected_new: projected.length };
    }

    return { TODAY, HORIZON, HISTORY_START, M, assets, ASSET, findings, projected, dn, iso, weekday,
      seasonMult, inFreeze, nextWindow, impact, impactParts, windowCost, statusOn, hazard, dueDate, loss, chance,
      dailyCost, isOpen, openFindings, edge, history, calculator, curve, planDate, forecast, ordering, summary };
  }

  const api = { build, dn, iso };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BC05Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
