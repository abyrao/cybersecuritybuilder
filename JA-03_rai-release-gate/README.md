# JA-03 · Responsible AI Release Gate

**Build type:** Workflow · **Mindset shift:** Judgment and accountability · **Visual scheme:** 7 · Graphite & Lime

A six-step release gate for internal AI builds: define the build, read its source code, generate and validate a test set with known answers, run it with the builder's consent, report findings with tickets, and retest the fix. Findings are mapped to the OWASP Top 10 for LLM Applications (2025) and NIST AI RMF trustworthy characteristics.

![JA-03 report view](thumbnail/ja-03.png)

**For demo purposes only. All data is fictional and does not represent any organization.**

## How to open

Open `index.html` in a browser. No server, no login, no network. Uploaded code is read in the browser and never run or sent anywhere.

## Demo click path (about 90 seconds)

1. **Define (1):** PolicyPal is selected; the intake sets risk tier **High**. **Continue**.
2. **Source (2):** 9 observations. Click **O3 Data sources**: `ingest.py` indexes 2 sources not in `data_map.yaml`; the lineage map shows them in rose.
3. **Generate (3):** 240 cases, 10 dimensions, validation 7 of 7. **Approve test set**.
4. **Run (4):** "Test 240 cases against PolicyPal 1.0?" → **Yes, run**. 34 fail.
5. **Report (5):** gate **Blocked**. Open **F1**: another employee's salary in the output, and the line in `ingest.py`. **Create tickets**.
6. **Retest (6):** **Yes, rerun** on 1.1 → still Blocked (a word filter now refuses 4 normal questions; one injection path remains). **Yes, rerun** on 1.2 → **Conditional**.
7. Switch **Viewing as** to Jordan Kim (AI governance reviewer) → **Approve release**.

Other builds: **TriageBot** (agent tests: 6 of 25 disable an account without approval) and **Expense Anomaly Scorer** (remote vs on-site flag-rate ratio 0.44).

## Your own build

Load a folder or .zip in step 2. The tool reads the code, generates a test set, and offers two ways to get results:
* **Export** the test set as JSONL, run it in your pipeline, and **import** a results JSONL (`id`, `output`, `citations`, `tool_calls`, `logs`, `tokens`). Pass rules are applied for real.
* **Preview run:** outcomes estimated from the code observations, labeled as an estimate.

`samples/policypal/results-v1.0.jsonl` is a ready-made results file: import it against the PolicyPal 1.0 test set to see the import path reproduce the built-in run.

## What's inside

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Graphite & Lime scheme |
| `js/scan.js` | Code-reading rules and lineage (pure functions) |
| `js/generate.js` | Seeded test set generator and the 7 validation checks (pure functions) |
| `js/evaluate.js` | Simulated sample behavior, pass rules, findings, release gate (pure functions) |
| `js/app.js` | Workflow, approvals, exports, tickets, retest, checks, log |
| `js/samples.js` | Generated from `samples/` by `tools/wrap-samples.js` (browsers block `fetch()` from `file://`) |
| `js/vendor/jszip.min.js` | Local zip reader (MIT) |
| `samples/` | Fictional builds: PolicyPal 1.0–1.2, TriageBot 1.0, Expense scorer 1.0 |
| `REQUIREMENTS.md` | Build answers, rules, and known answers |
| `assets/fonts/` | Space Grotesk and JetBrains Mono (SIL Open Font License) |

## Checks

**Checks** in the top bar runs 14 known-answer checks live (K1 to K14 in `REQUIREMENTS.md`). The engine modules also run under Node.

## Assumptions

* Sample build behavior is simulated; pass rules judge each output for real.
* Thresholds, risk tiers, and ticket SLAs are a fictional company AI policy.
* A Conditional gate can be approved once every open finding has a ticket.
* Tickets are simulated; the CSV export imports into common ticket tools.
