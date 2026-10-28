# BC-05 · Patch Delay Cost Calculator for Internet-Facing Systems

**Build type:** Simulator · **Mindset shift:** Business communication · **Owner:** Aby Rao
**Visual scheme:** 4 · Forest Ledger (drawn at random, excluding OC-04's Monochrome Swiss, the previous build)
**Status:** Requirements drafted

Requirements captured from Aby's notes on Oct 28, 2026, mapped to the ten build questions in the master template (`claude/Builder_Prototype_Template.md` in the project). Items marked *(assumed)* were filled in by Claude and need Aby's confirmation.

Every number in this document comes from `tools/reference_model.py`, which writes the files in `data/`. The prototype must reproduce them exactly (see **Known answers**).

---

## The point of this build

A late patch is usually reported as "past SLA." This build turns each day of delay into money. It answers three questions:

* What is waiting costing us today?
* What did late patching cost us last year?
* What will it cost next quarter if nothing changes?

| | Operator | Builder |
|---|---|---|
| **Unit** | Days past SLA | Dollars of expected loss per day |
| **Ranking** | CVSS score | Chance of exploitation × cost if exploited |
| **Context** | Scanner and ticket data only | Data each system holds, cost per hour down, enrollment season, change freeze |
| **Trade-off** | "We can't patch during the freeze" | The 2-hour window costs $82,000; waiting costs $240,157 a day |
| **Future** | Backlog count | 90-day expected loss under current and proposed policy |
| **Decision** | Ticket to the change board | A memo with the cost of saying yes and the cost of saying no |

---

## Build answers

**1. What are we building?**
A patch delay cost calculator for internet-facing systems: number 5 on the Business communication wall. It covers servers, web pages, applications, appliances, and the libraries inside them. The setting is a fictional regional health plan: 1.6 million members, 14,000 network providers, 3,200 brokers, and 4,800 employees.

**2. What's the problem today?**
* Patch reports count findings and days past SLA. Leaders can't weigh "38 days late" against the cost of a maintenance window.
* CVSS ranks severity, not cost. A 9.8 on a dead campaign site sorts above a 9.8 on the member portal.
* The annual enrollment change freeze (Oct 15 – Dec 7) blocks patches for 54 days every year. Nobody has priced what it defers.
* Policy hides urgency. The critical member portal finding isn't "late" until Nov 13, though attackers began exploiting it on Oct 24.
* There is no forecast. Nobody can say what next quarter's backlog will cost or what a faster policy would save.

**3. Who uses it, and what do they decide after using it?**
* **CIO and change advisory board:** whether to open an emergency patch lane through the freeze.
* **CISO or deputy CISO:** which findings to escalate, and whether to approve the decision memo.
* **CFO:** whether the policy cost (emergency changes, virtual patch rules) is worth the expected loss avoided.
* **Business owners** (VP Member Experience, Director of Infrastructure, and others): whether to patch now, apply a compensating control, or formally accept the delay and its cost.
* **Vulnerability management lead:** runs the tool and orders the patch queue by cost.

**4. What fictional data should it use?**
All values are in `data/edge_inventory.json` and `data/findings.json`. No real CVE IDs are used; findings carry fictional IDs (F-0142) and generic titles.

| Source (simulated) | What it provides | Volume |
|---|---|---|
| External attack surface scan | Internet-facing assets and exposure (public, login required, partner allowlist); finds the microsite missing from the CMDB | 16 assets |
| Vulnerability scanner and software composition analysis | Findings: title, component (application, library, appliance, server), severity, CVSS, fix date | 200 findings: 83 open, 117 closed in the last 12 months; 39 in libraries |
| CISA KEV catalog | Date a finding was added as exploited in the wild | 3 open KEV findings |
| Exploit intelligence | Date public exploit code appeared | Per finding |
| ITSM change tickets | Planned patch date, deferral reason | Per open finding |
| CMDB and data inventory | Owner, layer, records held by data class | 16 assets, 5 data classes |
| Finance business impact analysis | Cost per hour down, per asset | 16 assets |
| Change calendar | Freeze dates; maintenance windows (Tue and Thu, 02:00) | 2 freezes (2025, 2026) |

Plus 36 projected new findings over the next 90 days, drawn from last year's arrival rate, for the forecast.

**5. What business context does it add that the tools don't know?**
* **What each asset holds.** Member health records, provider and broker records, bank accounts, employee records. Example fictional cost per record: $45 member health, $35 provider or broker, $25 bank account, $50 employee, $1 email address.
* **Cost per hour down,** from finance's business impact analysis (member portal $95,000; VPN $150,000).
* **Annual enrollment season** (Oct 15 – Dec 7): cost per hour down ×2.0, since plan shopping and enrollment run through the portals.
* **Change freeze** over the same dates; current process has no emergency lane.
* **Maintenance window cost:** window hours × cost per hour down × 0.2 (02:00 traffic) × season, plus $6,000 of change labor.
* **Ownership gaps:** the wellness rewards microsite has no owner and isn't in the CMDB.

**6. What should the demo reveal?**
Headline finding:
* **Waiting for the freeze to end costs 108 times more than the outage it avoids.** The member portal's web framework flaw (F-0142) is being exploited in the wild. Its patch is approved but deferred to Dec 8. Each day costs **$240,157** in expected loss. Waiting the 39 days costs **$8.9M**; patching in the next window (Tue Nov 3) costs **$956,322** of exposure plus an **$82,000** window. Break-even is a third of a day.

Supporting findings:
* **Two findings carry 46% of today's cost.** Of $786,621 a day across 83 open findings, the member portal and the file transfer appliance account for $358,928.
* **The policy says it isn't late yet.** F-0142 is not past SLA until Nov 13. Under the proposed policy (KEV in 3 days), it was due Oct 21.
* **Last year's freeze was the most expensive month.** Late patching cost $19.0M in expected loss over 12 months; four critical findings held by the 2025 freeze account for 59% of it. One VPN finding alone: $7.8M.
* **Critical findings are almost never on time.** 1 of 10 closed critical findings met the 30-day SLA; the median took 42 days.
* **You don't always need the patch to cut the cost.** Limiting the file transfer appliance to partner IP addresses cuts its 41-day wait from $4.6M to $1.1M. A virtual patch on the member portal cuts $8.9M to $2.9M.
* **Old isn't expensive.** The oldest finding (212 days, CVSS 9.8, KEV) sits on a microsite with 11,000 email addresses: $443 a day.
* **Patch by cost, not CVSS.** For the same 21 findings at 3 per week, cost order leaves $3.9M of expected loss over 30 days; CVSS order leaves $6.6M.
* **The forecast.** Next 90 days at the current pace: $44.3M expected loss. Proposed policy: $27.5M for $348,000 (7 emergency changes). Adding virtual patches: $23.8M for $394,500 total.

**7. What will I click during the demo?** *(assumed)*
1. **Edge:** the ticker reads $786,621 a day; hover **Member portal**, the largest tile.
2. Open **F-0142** → **Calculator.** Drag the patch date from **Dec 8** to **Nov 3**: expected loss drops from $8.9M to $956,322. The window cost card reads $82,000.
3. Toggle **Virtual patch:** the curve flattens. Toggle **Assume exploited** on the VPN finding: its daily cost jumps from $19,032 to $285,078.
4. **Delay:** monthly bars with the 2025 freeze shaded; click **Nov 2025** to see the VPN finding at $7.8M.
5. **Forecast:** switch **Current → Proposed → + Virtual patch**; watch the three lines and the cost of each policy.
6. **Decide:** **Draft memo** (simulated) → edit → **Approve** as CISO → change board **Approve**.

**8. What does the AI do, and where must a person approve?** *(assumed)*
Simulated AI:
* Explains each cost in plain language ("Why?"): exploit status, exposure, data held, season, and the math.
* Suggests the next best action per finding: patch now, virtual patch, restrict exposure, or accept.
* Drafts the decision memo for the change board: the ask, the cost of waiting, the cost of acting, and the risk owner.

People approve:
* **The memo:** drafted by AI, edited by the vulnerability management lead, approved by the CISO. The last editor can't approve.
* **Emergency changes during the freeze:** need CISO and change board approval; the log records who and when.
* **Accepting a delay:** the business owner signs a risk acceptance that shows the expected cost and an expiry date. A note is required.
* **Policy changes** stay projections until approved; the baseline never changes on its own.

**9. How will I know it's right?** *(assumed)*
Fourteen known-answer checks run live in the **Checks** panel. One easy check: set every patch date to today and the expected loss is $0, with the message "Nothing waiting."

**10. What should it not do?** *(assumed)*
* Connect to real scanners, ITSM, CMDB, or threat feeds.
* Use real CVE IDs, vendors, or products.
* Claim actuarial accuracy. Every rate is fictional, adjustable, and labeled as an estimate.
* Model attacker chaining across assets, cyber insurance, fines, or share price. The memo says these aren't included.
* Approve or schedule changes. It only produces the case and records decisions.

---

## Views

One question per view. Top bar: **Edge · Delay · Calculator · Forecast · Decide**, shortcuts `1`–`5`. A hero strip under the top bar shows **Cost of waiting today · Past due · Next 90 days**.

| View | Question | Main visual | Interactions |
|---|---|---|---|
| **Edge** | What's waiting on our internet edge? | Treemap of 16 assets sized by impact if exploited, colored by daily cost; a live "cost of waiting" ticker | Filter by exposure, layer, KEV, past due; hover for owner, data held, open findings; click for drawer |
| **Delay** | What did late patching cost us? | Monthly bars of expected loss accrued past SLA, freeze periods shaded; days-to-patch strip by severity against SLA | Click a month for its findings; toggle severity; hover for days late |
| **Calculator** | What does waiting cost for this finding? | Cumulative expected-loss curve over days, with markers for fix date, KEV date, SLA due date, freeze end, and planned patch; window cost as a flat line | Drag patch date; exposure; virtual patch; assume exploited; edit records, cost per record, cost per hour down, window hours |
| **Forecast** | What will waiting cost next quarter? | Three cumulative lines over 90 days (current, proposed, + virtual patch) with low–high bands; policy cost vs loss avoided | Switch scenario; toggle uncertainty band; hover any day |
| **Decide** | What do we ask for? | Queue ordered by cost vs by CVSS; memo card; risk acceptance cards | Reorder queue; draft, edit, approve memo; accept delay with note |

### Edge
* **Treemap tiles** per asset: name, layer icon, exposure chip, data-class icons, open count, KEV badge, daily cost. Tile size = impact if exploited; color ramp = daily cost.
* **Wellness rewards microsite** carries a dashed border and a "Not in CMDB" tag.
* **Ticker:** total daily cost of waiting, with a counter that climbs in real time at that rate ($9.10 a second). Tooltip explains the rate is an estimate.
* **Drawer:** asset details and its open findings sorted by daily cost, each with **Why?** and **Open in Calculator**.

### Delay
* **Monthly bars,** Nov 2025 – Oct 2026; includes delay still accruing on open findings.
* **Shaded freeze:** Oct 15 – Dec 7, 2025, and Oct 15 – Oct 30, 2026.
* **Severity strip:** median days to patch vs SLA. Critical: 42 vs 30 (1 of 10 on time). High: 56 vs 60. Medium: 80 vs 90. Low: 149 vs 180.
* **Late count:** 43 of 117 closed findings patched after SLA.

### Calculator
* Default finding: **F-0142.** Any open finding can be opened from Edge.
* **Curve:** cumulative expected loss from today to the chosen patch date; hazard steps up visibly at the exploit-code and KEV dates.
* **Cards:** cost if exploited (with its three parts), chance of exploitation by patch date, daily cost today, expected loss of waiting, window cost, break-even.
* **Break-even** in words: "Waiting more than 8 hours costs more than the window." Use hours below 1 day.
* **Edits** update instantly and are logged; **Reset** restores the data.

### Forecast
* Horizon: Oct 30, 2026 – Jan 27, 2027 (90 days). Open findings plus 36 projected.
* **Current:** planned dates from tickets; projected findings patched at last year's median per severity; nothing moves during the freeze.
* **Proposed:** KEV in 3 days, Critical 7, High 30, Medium 90, Low 180; emergency lane through the freeze for KEV and critical findings.
* **+ Virtual patch:** web-layer critical and high findings get a WAF rule the day after the fix appears, until patched.
* **Band:** low and high at half and double the exploitation rates. The tooltip says why.
* **Policy cost card:** emergency changes × window cost + labor, plus $1,500 per WAF rule.

### Decide
* **Queue:** the 21 most urgent findings, toggled between cost order and CVSS order, with 30-day expected loss for each.
* **Memo** (simulated): one page. The ask, the cost of waiting, the cost of acting, three options, risk owner, and what's not included. Download as Markdown; print fits one page.
* **Risk acceptance:** per finding, owner, expected cost through expiry, expiry date, required note.

### Global
Reset, presenter mode, activity log, Checks panel, "simulated" tag on every AI output, persona switcher ("Viewing as": Vulnerability lead, CISO, CIO, CFO, Business owner), and the required footer on every view.

---

## Cost model

Pure functions in `js/engine.js`, no browser dependencies, so the checks run under Node. Days are calendar days; costs accrue daily.

**1. Chance of exploitation per day** (fictional rates)
`h(d) = base rate × exposure × mitigation`
* Base rate by exploit status on day d: no public exploit 0.0002; public exploit code 0.001; exploited in the wild (KEV) 0.003.
* Exposure: public, no login 1.0; login required 0.5; partner allowlist 0.2.
* Mitigation: WAF virtual patch × 0.3; restricting to a partner allowlist sets exposure to 0.2.

**2. Cost if exploited on day d**
`impact(d) = incident response + Σ records × cost per record + outage hours × cost per hour down × season(d)`

**3. Expected loss over a period** (findings treated independently; survival counted from the fix date)
`loss = Σ over days in period of impact(d) × e^(−H(d)) × (1 − e^(−h(d)))`, where H(d) is the sum of h from the fix date to the day before d.

**4. Derived numbers**
* **Daily cost today** = the term above for today.
* **Cost of delay** = loss from the SLA due date to the patch date (or today).
* **Due date** = fix date + policy days by severity; under the proposed policy, KEV findings are due 3 days after the later of fix date and KEV date.
* **Window cost** = window hours × cost per hour down × 0.2 × season + $6,000.
* **Break-even** = window cost ÷ daily cost today.
* **Chance by patch date** = 1 − e^(−ΣH) from today.

**5. Dates.** Maintenance windows Tue and Thu at 02:00. Freeze dates block changes except through the emergency lane, which exists only in the proposed policy.

---

## Data files

| File | Contents |
|---|---|
| `data/edge_inventory.json` | Company, model parameters, policies, freezes, season, 16 assets |
| `data/findings.json` | 200 findings (open and closed) and 36 projected findings |
| `data/expected_results.json` | Engine output: summary, edge, history, calculator cases, forecast with bands, ordering, and every open finding's due dates, plans, and daily cost |

Browsers block `fetch()` from `file://`, so the build step wraps the JSON as `js/data.js` (`window.BC05 = {...}`), as in BC-03 and BC-04. The JSON stays the source of truth.

---

## Known answers

Run live in the **Checks** panel; each shows expected, actual, pass or fail.

| ID | Case | Expected |
|---|---|---|
| K1 | F-0142 cost if exploited | $82,120,000 = $1,000,000 response + $72,000,000 records + $9,120,000 downtime (in season) |
| K2 | F-0142 today | $240,157 a day; window $82,000; break-even 0.34 days |
| K3 | F-0142 wait to Dec 8 (39 days) | 11.0% chance; $8,852,240 expected loss |
| K4 | F-0142 patch Nov 3 | $956,322 |
| K5 | F-0142 virtual patch, wait to Dec 8 | 3.7% chance; $2,927,629 |
| K6 | F-0118 wait to Dec 10, then with partner allowlist | $4,580,603 → $1,054,394 |
| K7 | F-0031 microsite | $443 a day; $12,734 over 30 days; impact $261,000 |
| K8 | F-0151 VPN, then assume exploited | $19,032 a day → $285,078 a day; wait to Dec 8 $739,427 → $10,508,016 |
| K9 | Edge today | 16 assets, 83 open, 9 past due, 3 KEV; $786,621 a day; top two 45.6% |
| K10 | History, last 12 months | 117 closed, 43 late; Critical 1 of 10 on time, median 42 days; delay cost $19,020,393; four 2025-freeze findings $11,140,342 (58.6%); F-0004 $7,838,565 |
| K11 | Forecast, 90 days | Current $44,302,715 ($17,091,038 past SLA); Proposed $27,508,910, 7 emergency changes, $348,000; + Virtual patch $23,814,014, 31 rules, $394,500. Low/high: current $22,684,385 / $84,750,880 |
| K12 | Ordering, 21 findings, 3 a week, 30 days | CVSS order $6,641,772; cost order $3,885,765 |
| K13 | Everything patched today | $0 expected loss; "Nothing waiting" |
| K14 | Approvals and grammar | Memo can't go out without the CISO; last editor can't approve; emergency changes need CISO and change board; acceptance needs a note; counts of 0 and 1 read correctly ("1 finding", "0 days", "1 emergency change") |

---

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Forest Ledger scheme |
| `js/data.js` | Assets and findings, wrapped from `data/*.json` |
| `js/engine.js` | Hazard, impact, expected loss, due dates, forecast (pure functions) |
| `js/app.js` | Views, charts, calculator, decisions, memo, checks, log |
| `tools/wrap-data.js` | Wraps `data/*.json` into `js/data.js` |
| `tools/reference_model.py` | The Python model behind every number; `python3 tools/reference_model.py data` regenerates the JSON |
| `assets/fonts/` | Fraunces and Inter (SIL Open Font License) |
| `data/` | Source JSON and expected results |

---

## Open questions for Aby

1. Are the fictional exploitation rates (0.0002, 0.001, 0.003 a day) and per-record costs believable for this audience? Would you rather anchor them to a public benchmark and cite it on the slide?
2. Health plan setting: keep it, or switch to another industry so it doesn't overlap with anything close to your day job?
3. Show expected loss as a single number, or always as a range (low–high)?
4. Should the demo open on the Calculator with F-0142 loaded, to save clicks?

---

## Appendix A · Internet-facing assets

Impact and daily cost are as of Oct 30, 2026, inside enrollment season.

| ID | Asset | Layer | Owner | Exposure | Data at risk | Cost per hour down | Impact if exploited | Open | Past due | Daily cost today |
|---|---|---|---|---|---|---|---|---|---|---|
| A01 | Member portal | Web app | VP Member Experience | Public | 1,600,000 member health | $95,000 | $82.1M | 11 | 0 | $402,956 |
| A02 | Member mobile API | API | VP Member Experience | Login | 1,600,000 member health | $60,000 | $75.9M | 7 | 1 | $52,802 |
| A03 | Provider portal | Web app | VP Provider Network | Login | 14,000 provider/broker, 400,000 member health | $40,000 | $21.4M | 5 | 1 | $18,908 |
| A04 | Claims EDI gateway | B2B gateway | VP Claims | Partner allowlist | 1,600,000 member health | $70,000 | $79.7M | 3 | 0 | $9,535 |
| A05 | Managed file transfer | Appliance | Director, Infrastructure | Public | 900,000 member health, 14,000 provider/broker | $25,000 | $45.6M | 4 | 1 | $145,898 |
| A06 | Remote access VPN | Appliance | Director, Network | Public | 1,600,000 member health, 4,800 employees | $150,000 | $95.3M | 6 | 0 | $113,337 |
| A07 | Email gateway | Appliance | Director, Workplace Tech | Public | 4,800 employees, 120,000 member health | $15,000 | $7.4M | 8 | 0 | $11,683 |
| A08 | Single sign-on portal | Identity | Director, IAM | Public | 4,800 employees | $80,000 | $5.1M | 3 | 1 | $3,023 |
| A09 | Public website | CMS | VP Marketing | Public | None sensitive | $5,000 | $0.5M | 7 | 1 | $679 |
| A10 | Find a doctor | Web app | VP Provider Network | Public | None sensitive | $8,000 | $0.6M | 4 | 1 | $501 |
| A11 | Premium payments | Web app | Treasurer | Public | 210,000 bank accounts | $30,000 | $7.7M | 3 | 0 | $4,594 |
| A12 | Broker portal | Web app | VP Sales | Login | 3,200 provider/broker, 150,000 member health | $35,000 | $9.5M | 8 | 1 | $7,598 |
| A13 | Telehealth scheduling | Web app | VP Care Management | Login | 85,000 member health | $12,000 | $5.4M | 7 | 1 | $3,764 |
| A14 | Wellness rewards microsite *(not in CMDB)* | CMS | Unassigned | Public | 11,000 emails | $0 | $0.3M | 1 | 1 | $443 |
| A15 | Developer API sandbox | API | VP Member Experience | Public | None sensitive | $2,000 | $0.3M | 1 | 0 | $69 |
| A16 | Pharmacy benefits API | API | VP Pharmacy | Partner allowlist | 600,000 member health | $45,000 | $30.2M | 5 | 0 | $10,831 |

## Appendix B · Story findings

**Open**

| ID | Asset | Finding | Component | Severity | Fix available | Exploit code | KEV | Due (current) | Planned | Daily cost |
|---|---|---|---|---|---|---|---|---|---|---|
| F-0142 | A01 | Web framework remote code execution | Application | Critical 9.8 | Oct 14 | Oct 19 | Oct 24 | Nov 13 | Dec 8 (freeze) | $240,157 |
| F-0118 | A05 | File transfer SQL injection | Appliance | Critical 9.8 | Sep 8 | Sep 11 | Sep 15 | Oct 8 | Dec 10 (vendor upgrade) | $118,771 |
| F-0151 | A06 | VPN web portal memory disclosure | Appliance | High 7.5 | Oct 21 | – | – | Dec 20 | Dec 8 (freeze) | $19,032 |
| F-0097 | A03 | XML parser external entity flaw (xml-parser 2.4.1, via pdf-export 5.2) | Library | High 8.1 | Aug 17 | Sep 2 | – | Oct 16 | Dec 15 (backlog) | $10,380 |
| F-0149 | A11 | Payment page outdated JavaScript library | Library | Medium 6.1 | Oct 6 | – | – | Jan 4 | Dec 10 | $1,530 |
| F-0031 | A14 | CMS plugin remote code execution | Application | Critical 9.8 | Apr 1 | Apr 9 | May 2 | May 1 | None (no owner) | $443 |

**Closed, held by the 2025 freeze**

| ID | Asset | Finding | Severity | Days late | Cost of delay |
|---|---|---|---|---|---|
| F-0004 | A06 | VPN gateway authentication bypass (KEV) | Critical 9.8 | 31 | $7,838,565 |
| F-0006 | A01 | Member portal deserialization flaw | Critical 9.1 | 22 | $1,740,479 |
| F-0009 | A02 | API gateway auth bypass (KEV) | Critical 9.4 | 12 | $1,334,309 |
| F-0013 | A07 | Email gateway command injection (KEV) | Critical 9.6 | 11 | $226,989 |

**Expected loss accrued past SLA, by month**

| Nov 25 | Dec 25 | Jan 26 | Feb 26 | Mar 26 | Apr 26 | May 26 | Jun 26 | Jul 26 | Aug 26 | Sep 26 | Oct 26 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| $7.36M | $4.01M | $0.72M | $0.27M | $0.29M | $1.15M | $0.29M | $0.53M | $0.44M | $0.53M | $0.49M | $2.94M |
