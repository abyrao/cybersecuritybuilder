/* BC-04 impact engine: reach, recovery schedule, business impact, regulatory clocks.
   Pure functions. Mirrors tools/reference_model.py; runs in the browser and under Node.
   All data is fictional. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BC04Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const HOUR = 3600000;
  const ONPREM = new Set(["Z_corp", "Z_ot"]);
  const FED_HOLIDAYS = new Set(["2026-11-26", "2026-12-25"]);

  // Times are wall-clock values stored as UTC so no daylight-saving shift creeps in.
  function parseTime(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  }
  const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
  const isoTime = (ms) => new Date(ms).toISOString().slice(0, 16);

  function makeCalendar(cal) {
    const holidays = new Set(cal.holidays);
    const mult = cal.online_multipliers.map(([a, b, m, label]) => ({ a, b, m, label }));
    function season(dateStr) {
      for (const s of mult) if (dateStr >= s.a && dateStr <= s.b) return s;
      return { m: 1, label: "Normal" };
    }
    function weight(profile, ms) {
      const d = new Date(ms), hr = d.getUTCHours(), wd = (d.getUTCDay() + 6) % 7; // Mon = 0
      const ds = isoDate(ms);
      if (profile === "online") return (hr >= 7 && hr < 23 ? 1 : 0.35) * season(ds).m;
      if (profile === "wholesale") return wd < 5 && hr >= 6 && hr < 20 && !holidays.has(ds) ? 1 : 0;
      if (profile === "plant") return wd < 5 && !holidays.has(ds) ? 1 : 0;
      throw new Error("profile " + profile);
    }
    return { weight, season };
  }

  // Python's round(): half to even.
  function pyRound(x) {
    const f = Math.floor(x), d = x - f;
    if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
    return Math.round(x);
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function applyControls(model, ctrls) {
    const jewels = {};
    for (const j of model.jewels) jewels[j.id] = clone(j);
    const paths = model.paths.filter((p) => !ctrls.has(p.cut_by));
    let teams = model.meta.recovery_teams;
    if (ctrls.has("C3")) for (const j of Object.values(jewels)) if (j.backup === "standard") j.backup = "immutable";
    if (ctrls.has("C5")) Object.assign(jewels.CJ09, { zone: "Z_vault", backup: "immutable", listed: true });
    if (ctrls.has("C6")) teams = 5;
    return { jewels, paths, teams };
  }

  function reach(entry, paths) {
    if (!entry) return { zones: new Set(), hops: [] };
    const seen = new Set([entry]), todo = [entry], hops = [];
    while (todo.length) {
      const z = todo.pop();
      for (const p of paths) {
        if (p.source === z && !seen.has(p.target)) { seen.add(p.target); todo.push(p.target); hops.push(p.id); }
      }
    }
    return { zones: seen, hops };
  }

  /**
   * opts: { controls: [], priority: [], workarounds: [], start: "YYYY-MM-DDTHH:MM" }
   */
  function run(model, scn, opts) {
    opts = opts || {};
    const ctrls = new Set(opts.controls || []);
    const { jewels, paths, teams } = applyControls(model, ctrls);
    const priority = opts.priority && opts.priority.length ? opts.priority : model.default_priority;
    const workarounds = new Set(opts.workarounds || []);
    const startStr = opts.start || scn.start;
    const t0 = parseTime(startStr);
    const cal = makeCalendar(model.calendar);
    const CONTAIN = model.meta.contain_h;
    const R = reach(scn.entry, paths);
    const zones = R.zones;
    const hit = {}, jobs = [], stopped = {};
    let exposed = [];
    const mode = scn.mode;

    if (mode === "exfil") {
      exposed = scn.targets.slice();
      for (const j of exposed) if (jewels[j].zone === "Z_vault") stopped[j] = scn.stopped_records;
    } else if (mode === "vendor") {
      for (const j of Object.values(jewels)) {
        if (zones.has(j.zone)) hit[j.id] = { up: scn.vendor_outage_h, loss_h: j.copy_age_h, path: "vendor" };
      }
      exposed = Object.keys(hit);
    } else {
      const down = Object.values(jewels).filter((j) => zones.has(j.zone));
      exposed = down.filter((j) => j.data.length).map((j) => j.id);
      const destroyed = (j) => j.backup === "standard" &&
        (ONPREM.has(j.zone) ? zones.has("Z_backup") : zones.has(j.zone));
      const dur = {};
      for (const j of down) {
        if (destroyed(j)) {
          if (j.rebuild_h == null) dur[j.id] = [j.restore_h, j.offline_age_h, "offline copy"];
          else dur[j.id] = [j.rebuild_h, j.offline_age_h, "rebuild"];
        } else dur[j.id] = [j.restore_h, j.copy_age_h, "restore"];
      }
      const lanes = new Array(teams).fill(CONTAIN);
      const up = {};
      const minLane = () => lanes.indexOf(Math.min(...lanes));
      if (dur.AD) {
        const i = minLane(), s = lanes[i];
        lanes[i] = s + dur.AD[0]; up.AD = lanes[i];
        jobs.push({ id: "AD", lane: i, start: s, end: lanes[i], how: dur.AD[2], gate: CONTAIN });
      }
      const pending = priority.filter((p) => dur[p]);
      const gate = (p) => (ONPREM.has(jewels[p].zone) && up.AD != null) ? Math.max(CONTAIN, up.AD) : CONTAIN;
      while (pending.length) {
        const i = minLane(), free = lanes[i];
        const ready = pending.filter((p) => gate(p) <= free);
        let p, s;
        if (ready.length) { p = ready[0]; s = free; }
        else {
          p = pending.slice().sort((a, b) => (gate(a) - gate(b)) || (pending.indexOf(a) - pending.indexOf(b)))[0];
          s = gate(p);
        }
        const e = s + dur[p][0];
        lanes[i] = e; up[p] = e; pending.splice(pending.indexOf(p), 1);
        jobs.push({ id: p, lane: i, start: s, end: e, how: dur[p][2], gate: gate(p), free });
      }
      for (const [p, [, loss, how]] of Object.entries(dur)) hit[p] = { up: up[p], loss_h: loss, path: how };
    }
    const jup = (id) => (hit[id] ? hit[id].up : 0);

    const services = {};
    for (const s of model.services) {
      const downH = Math.max(0, ...s.deps.map(jup));
      let cause = null;
      if (downH > 0) cause = s.deps.reduce((a, b) => (jup(b) > jup(a) ? b : a), s.deps[0]);
      services[s.id] = { down_h: downH, cause };
    }
    const SVC = {}; for (const s of model.services) SVC[s.id] = s;

    function integrate(profile, a, b, f) {
      let tot = 0, h = a;
      while (h < b - 1e-9) {
        const dh = Math.min(0.25, b - h);
        tot += cal.weight(profile, t0 + h * HOUR) * dh * (f ? f(h) : 1);
        h += dh;
      }
      return tot;
    }
    const wkFactor = (wk) => (h) => (wk && h >= wk.after_h ? 1 - wk.capacity : 1);

    let revRisk = 0, revLost = 0;
    const perService = {};
    for (const sid of ["S1", "S2"]) {
      const s = SVC[sid], dh = services[sid].down_h;
      const wk = s.workaround && workarounds.has(s.workaround.id) ? s.workaround : null;
      const risk = s.revenue_per_hour * integrate(s.profile, 0, dh, wkFactor(wk));
      perService[sid] = { at_risk: pyRound(risk), lost: pyRound(risk * s.loss_rate) };
      revRisk += risk; revLost += risk * s.loss_rate;
    }
    const s1 = SVC.S1;
    const shoppers = pyRound(s1.revenue_per_hour * integrate("online", 0, services.S1.down_h) / s1.avg_order);
    const delayed = pyRound(SVC.S3.shipments_per_hour * integrate("online", 0, services.S3.down_h));
    const partners = integrate("wholesale", 0, services.S2.down_h) > 0 ? model.company.retail_partners : 0;
    const s4 = SVC.S4;
    const wk2 = workarounds.has(s4.workaround.id) ? s4.workaround : null;
    const plantHours = integrate("plant", 0, services.S4.down_h, wkFactor(wk2));
    const plantCost = pyRound(s4.cost_per_hour * plantHours);
    const workers = plantHours > 0 ? model.company.plant_workers : 0;

    const obligations = model.obligations.map((o) => {
      const dueH = (parseTime(o.due) - t0) / HOUR;
      const back = Math.max(...o.deps.map(jup));
      const blocker = back > 0 ? o.deps.reduce((a, b) => (jup(b) > jup(a) ? b : a), o.deps[0]) : null;
      return { id: o.id, due_h: dueH, back_h: back, missed: back > dueH && dueH > 0, blocker };
    });

    const exposure = {};
    for (const jid of exposed) {
      for (const d of jewels[jid].data) {
        const c = exposure[d.class] || (exposure[d.class] = { items: [], systems: [] });
        const n = stopped[jid] != null ? stopped[jid] : d.records;
        c.items.push({ jewel: jid, records: n, unit: d.unit }); c.systems.push(jid);
      }
    }
    for (const [k, c] of Object.entries(exposure)) {
      c.systems = [...new Set(c.systems)].sort();
      if (k === "customer" || k === "employee") c.records = Math.max(...c.items.map((i) => i.records));
      else if (k === "ip") {
        c.formulas = Math.max(0, ...c.items.filter((i) => i.unit === "formulas").map((i) => i.records));
        c.design_files = c.items.filter((i) => i.unit === "design files").reduce((a, i) => a + i.records, 0);
      } else if (k === "payment") c.records = c.items.reduce((a, i) => a + i.records, 0);
    }
    const custExp = exposure.customer ? exposure.customer.records : 0;
    const empExp = exposure.employee ? exposure.employee.records : 0;
    const np = model.meta.notify_per_person;
    const notify = custExp * np.customer + empExp * np.employee;
    const teamHours = jobs.reduce((a, j) => a + (j.end - j.start), 0);
    const anyHit = Object.keys(hit).length > 0;
    const recovery = ((anyHit && mode === "encrypt") || mode === "exfil" ? model.meta.ir_flat : 0) + teamHours * model.meta.team_rate;
    const dataLost = {}; for (const [k, v] of Object.entries(hit)) dataLost[k] = v.loss_h;

    return {
      start: startStr, mode, entry: scn.entry, teams,
      zones: [...zones].sort(), hops: R.hops, hit, jobs, services,
      hours_down: Math.max(0, ...Object.values(services).map((v) => v.down_h)),
      jewels_down: Object.keys(hit).filter((k) => k !== "AD").length,
      revenue_at_risk: pyRound(revRisk), revenue_lost: pyRound(revLost), per_service: perService,
      shoppers_turned_away: shoppers, orders_delayed: delayed, partners_affected: partners,
      plant_workers_idle: workers, plant_cost: plantCost,
      obligations, exposed: exposed.slice().sort(), exposure,
      customers_exposed: custExp, employees_exposed: empExp,
      notification_cost: notify, recovery_cost: pyRound(recovery), team_hours: teamHours,
      total_impact: pyRound(revLost + plantCost + notify + recovery), data_lost_h: dataLost,
      // helpers for the UI (not in the reference output)
      _revenueTo(h) {
        let tot = 0;
        for (const sid of ["S1", "S2"]) {
          const s = SVC[sid], wk = s.workaround && workarounds.has(s.workaround.id) ? s.workaround : null;
          tot += s.revenue_per_hour * integrate(s.profile, 0, Math.min(h, services[sid].down_h), wkFactor(wk));
        }
        return tot;
      },
    };
  }

  function businessDaysAfter(ms, n) {
    let d = Date.UTC(new Date(ms).getUTCFullYear(), new Date(ms).getUTCMonth(), new Date(ms).getUTCDate());
    while (n) {
      d += 24 * HOUR;
      const wd = (new Date(d).getUTCDay() + 6) % 7;
      if (wd < 5 && !FED_HOLIDAYS.has(isoDate(d))) n--;
    }
    return isoDate(d);
  }
  function clocks(start, materialityH) {
    const t0 = parseTime(start), m = t0 + (materialityH == null ? 48 : materialityH) * HOUR;
    return { materiality: isoTime(m), sec_8k_due: businessDaysAfter(m, 4), state_notice_due: isoDate(t0 + 30 * 24 * HOUR) };
  }

  return { run, clocks, parseTime, isoDate, isoTime, makeCalendar, HOUR };
});
