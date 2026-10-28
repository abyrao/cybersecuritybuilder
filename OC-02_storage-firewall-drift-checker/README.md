# OC-02 · Cloud Storage and Firewall Drift Checker against a CIS Baseline

A drift checker that starts by writing down what good looks like. It defines a 41-control storage and firewall baseline aligned to six CIS Foundations Benchmarks, then checks a six-cloud estate against it. It measures how far each setting is from the baseline, ranks drift by impact × likelihood, and shows engineers the fix for their cloud. It also tracks whether fixes stay fixed.

**For demo purposes only. All data is fictional and does not represent any organization.** CIS text is not reproduced; controls are mapped by intent to benchmark sections. Built by Aby Rao.

**Visual scheme:** 4 · Forest Ledger (sage paper, forest-green ink, gold and rust · Fraunces + Inter). No other build uses it.

## How to open

Open `index.html` in any modern browser. It needs no server, no login, and no internet connection; fonts are bundled locally. Nothing connects to a real cloud.

## What's inside

* **Baseline:** six benchmark versions (AWS v7.0.0, Azure v6.0.0, Google Cloud v5.0.0, Oracle v3.1.0, Alibaba v2.0.1, IBM v2.0.0), seven stated assumptions, and a filterable 41-control catalog. Each control has a six-cloud mapping strip: mapped to CIS, org addition, or not applicable. Open a control for each cloud's setting name and remediation.
* **Inventory:** 1,267 storage resources (33 types) and 1,023 firewall objects (26 types, 5,026 rules) across 176 networks and 637 subnets, shown cloud by cloud with the drifted share of each type.
* **Drift:** fleet conformance, conformance by cloud against a 95% target, 90 days of conformance with marks where fixes drifted back, the controls that drift most (Pareto), and a cloud × control-family heatmap that jumps to the queue.
* **Exposure:** the most exposed networks, a subnet and security-group map with open ports, how widely each public rule is open (address count, log scale), and a port × cloud matrix.
* **Prioritize:** a 5 × 5 impact × likelihood matrix, a fix queue with fix-time targets and drift age, and **Quick wins** (auto-fix eligible, approved by the lead). **Run pipeline** simulates the next deployment.
* **Resource drawer:** expected vs actual for every drifted control, deviation, the reasons behind impact and likelihood, Terraform and CLI fixes for that cloud, and **Fix in code**, **Fix in console**, **Request exception**, and **Re-check**. It also shows the resource's change history and its rules.
* **Report:** conformance and trend, P1 and late drifts, re-drift by fix method, a simulated AI summary, results by business unit and team, the top 10 resources, exceptions, and **Export CSV**.

## How drift is measured

* **Deviation, 0 to 1, per control:**
  * Binary settings: 1 when off.
  * Thresholds: the shortfall, for example 30-day vs 90-day retention = 0.67.
  * CIDR breadth: log2(addresses) ÷ 32, so 0.0.0.0/0 = 1, a /8 = 0.75, a /16 = 0.5.
  * Port breadth and counts: scaled the same way.
* **Resource drift score** = 100 × Σ(severity weight × deviation) ÷ Σ(weights). Conformance = 100 − score.
* **Risk** = impact (data classification, criticality, environment) × likelihood (exposure, admin or database port, compensating controls, drift age). P1 is 20 or more, fix within 48 hours; P2 within 7 days, P3 within 30, P4 within 90.

## Demo click path

1. **Baseline:** six benchmark versions, the assumptions, and the catalog. Open **NET-01**.
2. **Inventory:** variety across six clouds. Toggle **Firewall and network**.
3. **Drift:** 92.5% fleet conformance, IBM and Alibaba trailing, 25% re-drift, and the falling 90-day trend.
4. **Exposure:** the payroll production network, with 14 security groups open on 22 and 3389 for 97 days. Then the /8 partner rule on PostgreSQL.
5. **Prioritize:** click a P1 cell and open **payroll-web-sg-1**. **Fix in code** is blocked until the owner confirms. Confirm it, then **Re-check**.
6. **Quick wins:** **Approve and apply** is blocked for the engineer. Switch to Omar, approve 636 fixes, then **Re-check**: conformance goes from 92.5% to 96.0%.
7. **Fix in console** on a module-managed resource, **Re-check**, then **Run pipeline**: the console fix is overwritten. Then **Report → Export CSV** and **Reset**.

**Keyboard:** `1`–`6` switch views · `Esc` closes panels.

## Quality check

* All ten known-answer checks pass:
  * K1 conforming resource = 100% · K2 payroll SSH = 25, P1 · K3 retention deviation 0.67 · K4 /8 = 0.75.
  * K5 exception expires correctly · K6 console re-drift vs code hold · K7 auto-fix guardrails · K8 re-check required.
  * K9 totals reconcile · K10 plurals.
* Every view, the drawers, the full fix path, and presenter mode were checked at 1920×1080 and 1366×768. No horizontal scroll, no overlapping text, nothing outside its box. Long rule and resource names are truncated, with the full text in tooltips.
* No console errors and no network requests (the CSV is generated in the browser).
* Fixed during QA:
  * Too many P1s: hygiene controls now start at likelihood 1.
  * The Oracle Cloud color matched the drift color.
  * Verb agreement for single re-checks.
  * "1 days" in threshold values.
  * Empty space on the Drift and Exposure views.
  * A truncated KPI label at 1366.
* Proofread all copy, with singular and plural checked at 0 and 1.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Forest Ledger scheme |
| `js/baseline.js` | Benchmarks, assumptions, 41 controls with per-cloud mappings and fixes |
| `js/estate.js` | Seeded six-cloud estate: accounts, networks, subnets, storage, firewalls, rules, drift history, planted findings |
| `js/drift.js` | Applicability, deviation per control, drift score, conformance (pure) |
| `js/priority.js` | Impact, likelihood, risk, priority, and the reasons (pure) |
| `js/remediate.js` | Fix in code or console, re-check, pipeline run, auto-fix approvals, exceptions, re-drift stats, trend (pure) |
| `js/app.js` | Views, charts, drawers, checks, log |
| `assets/fonts/` | Fraunces and Inter (SIL Open Font License) |
| `REQUIREMENTS.md` | Build requirements this prototype was made from |
