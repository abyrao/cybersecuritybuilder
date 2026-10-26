/* BC-02 · seeded generator. Same seed, same findings, every load. */
(function (root) {
  const D = root.D, S = root.S;
  const DAY = 864e5;
  const t0 = Date.parse(D.TODAY + "T12:00:00Z");
  const iso = ms => new Date(ms).toISOString().slice(0, 10);
  const daysAgo = n => iso(t0 - n * DAY);

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const MIX = {
    "prod-t1": { M01: 1, M02: 3, M03: 2, M04: 1, M05: 1, M06: 1, M07: 4, M08: 2, M09: 2, M10: 1, M12: 3, M13: 2, M14: 3, V01: 1, V02: 1, V03: 3, V04: 2, V05: 1, V06: 3, V07: 3, V08: 1 },
    prod:      { M01: 1, M02: 4, M03: 2, M04: 1, M05: 1, M06: 1, M07: 4, M08: 3, M09: 2, M10: 1, M11: 1, M12: 3, M13: 3, M14: 4, V01: 1, V02: 1, V03: 3, V04: 2, V05: 1, V06: 3, V07: 3, V08: 2 },
    nonprod:   { M01: 1, M02: 6, M03: 3, M04: 2, M07: 6, M08: 4, M09: 2, M10: 1, M12: 3, M13: 5, M14: 6, V03: 3, V04: 2, V06: 5, V07: 5, V08: 3 }
  };
  const COUNT = { "prod-t1": 9, prod: 13, nonprod: 21 };
  const BU_MULT = { PAY: 0.55, CXP: 1.0, DATA: 1.3, MOB: 0.9, PTR: 0.85, CORP: 0.8, UNM: 0.5 };

  function pick(r, weights) {
    const ks = Object.keys(weights), tot = ks.reduce((a, k) => a + weights[k], 0);
    let x = r() * tot; for (const k of ks) { x -= weights[k]; if (x <= 0) return k; } return ks[ks.length - 1];
  }
  const slug = (r, n) => Array.from({ length: n }, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(r() * 31)]).join("");

  function build() {
    const r = rng(20261026);
    const acct = Object.fromEntries(D.ACCOUNTS.map(a => [a.id, a]));
    const out = [];
    let n = 1100;
    const people = bu => D.PEOPLE.filter(p => p.bu === bu);

    function make(o) {
      const a = acct[o.account], t = D.T[o.tpl];
      const f = Object.assign({
        id: "F-" + (n++), tpl: o.tpl, kind: t.kind, title: t.title, cat: t.cat, sev: t.sev, effort: t.effort,
        cloud: a.cloud, bu: a.bu, env: a.env, status: "todo", assignee: null, fixer: null, rootCause: null, rescanFails: false, note: null
      }, o);
      if (!f.resource) f.resource = D.RES[t.cat][a.cloud] + a.id.split("-")[0] + "-" + slug(r, 5);
      // sources: primary tool; cloud-native posture tool often reports the same misconfig (deduped later)
      const native = D.SOURCES.find(s => s.kind === "Cloud native" && s.covers.includes(a.cloud));
      let primary = t.src;
      if (primary === "cspm" && a.cloud === "alibaba") primary = "alisc";
      if (primary === "snyk" && (a.cloud === "oci" || a.cloud === "alibaba")) primary = "tenable";
      f.sources = [primary];
      if (t.kind === "misconfig" && native && native.id !== primary && (o.dup !== undefined ? o.dup : r() < .55)) f.sources.push(native.id);
      f.score = S.score(f, a); f.band = S.band(f.score);
      out.push(f); return f;
    }

    // ---- planted findings (known answers) ----
    make({ tpl: "M01", account: "pay-prod", resource: "s3://pay-dispute-exports", exposed: true, exploit: true, firstSeen: daysAgo(4), planted: "K1", dup: true });
    make({ tpl: "V01", account: "pay-prod", resource: "i-0pay-gw-bastion", exposed: true, exploit: true, firstSeen: daysAgo(9), planted: "pay-ssh" });
    make({ tpl: "M06", account: "pay-fraud-prod", resource: "entra/pay-fraud-admins", exposed: true, exploit: false, firstSeen: daysAgo(12) });
    make({ tpl: "V02", account: "pay-prod", resource: "ecr/pay-gateway-api", exposed: true, exploit: true, firstSeen: daysAgo(6) });
    make({ tpl: "V05", account: "pay-prod", resource: "i-0pay-checkout-web", exposed: true, exploit: true, firstSeen: daysAgo(11) });
    make({ tpl: "M05", account: "pay-fraud-prod", resource: "sqldb-chargeback-cases", exposed: true, exploit: false, firstSeen: daysAgo(16) });
    make({ tpl: "M09", account: "pay-prod", resource: "iam/pay-batch-worker", exposed: false, exploit: false, firstSeen: daysAgo(27) });
    make({ tpl: "M02", account: "data-scratch", resource: "s3://data-scratch-tmp", exposed: false, exploit: false, firstSeen: daysAgo(40), planted: "K2" });
    const mod = [["pay-prod", "s3://pay-settlement-archive"], ["pay-fraud-prod", "blob/payfraudreports"], ["cxp-prod", "s3://cxp-avatars"], ["cxp-portal-prod", "blob/cxpportalassets"],
      ["cxp-search", "gs://cxp-search-index-backup"], ["data-lake-prod", "gs://data-lake-landing"], ["data-etl-prod", "s3://data-etl-staging"], ["data-bi", "blob/databiextracts"], ["data-sandbox", "gs://data-sandbox-share"]];
    mod.forEach(([account, resource], i) => make({ tpl: "M15", account, resource, exposed: true, exploit: false, firstSeen: daysAgo(18 + i), rootCause: "tf-module storage-bucket 1.4.2", planted: "module" }));
    make({ tpl: "M05", account: "acct-7731", resource: "rds-orders-replica", exposed: true, exploit: true, firstSeen: daysAgo(33), planted: "unm" });
    make({ tpl: "M11", account: "cmp-migration", resource: "inst-snap-erp-cutover", exposed: true, exploit: true, firstSeen: daysAgo(51), planted: "unm" });
    make({ tpl: "M04", account: "sub-legacy-04", resource: "nsg-legacy-jump", exposed: true, exploit: true, firstSeen: daysAgo(64), planted: "unm" });
    // In review: fix submitted by a teammate; rescan will still find it (second rule left open)
    make({ tpl: "M03", account: "cxp-prod", resource: "sg-cxp-api-edge", exposed: true, exploit: true, firstSeen: daysAgo(15), status: "review", assignee: "jmensah", fixer: "jmensah", rescanFails: true, planted: "K6",
      note: "Removed 0.0.0.0/0 on port 22 in sg-cxp-api-edge" });
    // In review in Payments: submitted by Ahn Kim, rescan will pass
    make({ tpl: "M03", account: "pay-staging", resource: "sg-pay-stg-ssh", exposed: true, exploit: true, firstSeen: daysAgo(20), status: "review", assignee: "akim", fixer: "akim", note: "Restricted SSH to the corporate VPN range" });

    // ---- background findings ----
    D.ACCOUNTS.forEach(a => {
      const c = Math.round(COUNT[a.env] * BU_MULT[a.bu] * (0.8 + r() * 0.4));
      for (let i = 0; i < c; i++) {
        let tpl = pick(r, MIX[a.env]);
        const t = D.T[tpl];
        if (a.cloud !== "aws" && a.cloud !== "azure" && a.cloud !== "gcp" && t.cat === "Container") tpl = "V04";
        const tt = D.T[tpl];
        let exposed = r() < tt.exposed * (a.env === "nonprod" ? .5 : 1);
        let exploit = r() < tt.exploit;
        if (tt.exposed === 1 && a.env === "nonprod" && !exposed) exposed = true;
        // closed (verified) within the 90-day window, or open
        const closed = r() < .55;
        let firstSeen, closedAt = null, status = "todo";
        if (closed) {
          const fs = 70 + Math.floor(r() * 130);
          firstSeen = daysAgo(fs);
          // closures ramp up through the window
          const c90 = Math.floor(Math.pow(r(), 0.75) * 89);
          closedAt = daysAgo(Math.max(0, Math.min(fs - 1, 89 - c90)));
          status = "verified";
        } else {
          firstSeen = daysAgo(r() < .9 ? 91 + Math.floor(r() * 110) : Math.floor(r() * 90));
          const x = r();
          if (x < .10) status = "progress"; else if (x < .14) status = "review";
        }
        const f = make({ tpl, account: a.id, exposed, exploit, firstSeen, closedAt, status });
        if (status !== "todo") {
          const team = people(a.bu); const p = team[Math.floor(r() * team.length)];
          f.assignee = p.id; if (status !== "progress") f.fixer = p.id;
          if (status === "verified") f.verifiedAt = closedAt;
        }
        if (status === "review") f.note = "Fix applied; waiting for review";
      }
    });
    // Unmapped account findings can't be claimed by a team
    out.forEach(f => { if (f.bu === "UNM" && f.status !== "verified") { f.status = "todo"; f.assignee = null; f.fixer = null; f.note = null; } });
    return out;
  }

  // Raw tool findings before dedupe (each extra source is a duplicate the tools reported)
  function rawCount(fs) { return fs.reduce((a, f) => a + f.sources.length, 0); }

  root.G = { build, rawCount, daysAgo, iso, DAY, t0 };
})(typeof window !== "undefined" ? window : globalThis);
