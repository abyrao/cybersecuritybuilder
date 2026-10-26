# BC-02 · Cloud Vulnerability and Misconfiguration Dashboard, by Business Unit

**Build type:** Dashboard · **Mindset shift:** Business communication · **Owner:** Aby Rao
**Visual scheme:** 5 · Neon Grid (drawn at random; no build had used it)
**Status:** Prototype built (see README.md)

Requirements captured from Aby's voice notes on Oct 26, 2026, mapped to the ten build questions in the master template (`claude/Builder_Prototype_Template.md` in the project). Items marked *(assumed)* were filled in by Claude and need Aby's confirmation.

---

## Build answers

**1. What are we building?**
A cloud vulnerability and misconfiguration dashboard, by business unit. It's build 2 on the Business communication wall (slide 18).

**2. What's the problem today?**
* Findings arrive from many tools across five clouds, often more than once, in each tool's own language.
* Nobody sees them by business unit, so engineers get a long list with no sense of what matters to their part of the business.
* Fixes go unrecognized. Dashboards show what's still broken, never the risk engineers removed.

**3. Who uses it, and what do they decide?**
Developers and cloud engineers in each business unit, the people who fix things. They decide what to pick up first, how to fix it, and when it's done. Business unit owners see the same view and approve any risk they choose to accept.

**4. What fictional data should it use?**
Findings from posture and vulnerability tools across AWS, Microsoft Azure, Google Cloud, Oracle Cloud, and Alibaba Cloud:

| Source | Kind | Covers |
|---|---|---|
| Wiz | CSPM | AWS, Azure, Google Cloud, Oracle Cloud |
| AWS Security Hub | Cloud native | AWS |
| Microsoft Defender for Cloud | Cloud native | Azure |
| Security Command Center | Cloud native | Google Cloud |
| Oracle Cloud Guard | Cloud native | Oracle Cloud |
| Alibaba Security Center | Cloud native | Alibaba Cloud |
| Tenable | VM scanner | All five |
| Snyk Container | Container scan | AWS, Azure, Google Cloud |

Plus usage and context signals: cloud tags and CMDB (account → business unit → app), billing and usage exports (accounts no tool scans), the CISA KEV catalog, and the business unit roster.

Volume (generated from a fixed seed, so every load matches):
* 31 accounts, subscriptions, projects, and compartments across 6 business units, plus 4 with no business unit tag.
* 544 raw tool findings → **410 unique** after dedupe: **201 open** and **209 fixed and verified** in the last 90 days.
* 23 finding types: 15 misconfigurations and 8 vulnerabilities, each with a cloud-specific resource name.
* 13 fictional people: 12 engineers (2 per business unit) and a cloud platform lead.

**5. What business context does it add that the tools don't know?**
* **Who owns it:** account → business unit → app → owner, from tags and the CMDB.
* **What it runs:** revenue-critical production, production, or non-production.
* **What it holds:** cardholder data, customer PII, payroll data, partner contracts.
* **What it's worth:** revenue per hour for each business unit's main app.
* **When it's due:** fix-time target by band and unit tier (tier 1: Critical 7 days, High 30, Medium 60, Low 120; tier 2: 14, 45, 90, 180).
* **Who fixed it:** credit for each verified fix goes to the engineer and their business unit.

**6. What should the demo reveal?**
Headline finding:
* **Count isn't risk.** Data & Analytics has the most findings (72). Payments has the most risk (745 points) with only 20 findings, including 4 of the 8 critical ones.

Supporting findings:
* Payments' top 6 fixes take about 9 hours and remove 55% of its risk.
* One Terraform module version (`storage-bucket 1.4.2`) caused 9 findings across 3 business units. One fix closes all 9.
* 2 of the 8 critical findings sit in accounts no business unit owns.
* Engineers verified 209 fixes in 90 days, removing 2,591 risk points. Open risk is down 26% since Jul 28.
* Alibaba Cloud has no CSPM coverage; only its native tool and Tenable see it.
* 544 tool findings were really 410: dedupe saves engineers from fixing the same thing twice.

**7. What will I click during the demo?** *(assumed)*
1. **Overview:** switch the map from **Count** to **Risk**; Payments grows, Data shrinks.
2. Click **Payments** → see the fix-first curve: 6 fixes, half the risk.
3. Open the public storage bucket → **Why?** → simulated AI fix with the AWS command.
4. **Claim** → **Submit fix** → try to approve it yourself (blocked) → switch to a teammate → **Approve** → **Rescan** → risk drops.
5. **Fix board:** rescan a Customer Platform fix that's still open on a second rule; it bounces back.
6. Open the module finding → **Fix all 9**.
7. **Risk reduced:** play 90 days of fixes; see credit by business unit and engineer.

**8. What does the AI do, and where must a person approve?** *(assumed)*
Simulated AI:
* Dedupes findings that several tools report for the same resource.
* Maps each finding to a business unit and app, and flags accounts with no owner.
* Explains every score ("Why?").
* Writes the fix: steps plus a cloud-specific command or Terraform change.
* Spots shared root causes (one module behind many findings).

People approve:
* **Every fix** is reviewed by a second engineer. You can't approve your own.
* **Done means verified:** a fix only counts after a rescan stops seeing the finding.
* **Risk acceptance** needs the business unit owner, a reason, and an expiry date within 90 days. Accepted risk is shown separately and never counts as risk reduced.
* **Unmapped accounts** need the cloud platform lead to assign an owner.
* Nothing is changed in any cloud. Commands are suggestions an engineer runs.

**9. How will I know it's right?** *(assumed)*
Known-answer checks, run live in the **Checks** panel:

| ID | Case | Expected |
|---|---|---|
| K1 | Public bucket with cardholder data, internet-facing, revenue-critical production | Score 100, Critical |
| K2 | Unencrypted bucket, internal, non-production, no sensitive data | Score 2, Low |
| K3 | Same finding from Wiz and AWS Security Hub | Counted once |
| K4 | Business unit risk totals plus unmapped | Equal to total open risk |
| K5 | Engineer approves their own fix | Blocked |
| K6 | Rescan finds the issue still present | Back to To do, no risk reduced |
| K7 | A fix is verified | Business unit risk drops by exactly its score |
| K8 | Risk acceptance without owner, reason, or expiry | Blocked; accepted risk not counted as reduced |
| K9 | Module fix | All 9 linked findings close only after rescan |
| K10 | Counts of 0 and 1 | Correct singular and plural everywhere |

**10. What should it not do?** *(assumed)*
* Connect to any real cloud account or tool, or run commands.
* Auto-apply fixes.
* Rank individual engineers against each other. Credit is shown by business unit, and for the person viewing.
* Replace the ticketing system. Claims and reviews here are simulated.

---

## Functional requirements

### Views

One question per view. Top bar: **Overview · Units · Fix board · Reduced · Sources**, shortcuts `1`–`5`.

| View | Question | Main visual | Interactions |
|---|---|---|---|
| **Overview** | Where is our risk? | Business unit map (treemap) with a **Count / Risk** toggle that morphs the tiles; KPI tiles; cloud mix | Cloud filter chips; click a tile to open the unit |
| **Units** | What should we fix first? | Unit header with owner, app, revenue per hour; fix-first curve (cumulative risk removed vs hours); risk by cloud; finding list | Unit switcher; hover the curve; open a finding |
| **Fix board** | What can I pick up? | Four columns: To do · In progress · In review · Verified; cards colored by band | Filters (unit, cloud, type, band, mine); card → drawer |
| **Reduced** | What have we reduced? | 90-day chart of open risk falling and cumulative risk removed; bars by unit; your fixes | **Play** animates the 90 days |
| **Sources** | Where does it come from? | Flow: 5 clouds → 8 tools → dedupe → 6 units + unmapped; coverage grid | Toggle generic names; coverage gaps highlighted |

### Finding drawer
* Resource, cloud, account, unit, app, first seen, due date (from the unit's fix-time target).
* Score with five factor bars and **Why?**.
* Business impact line: app, tier, revenue per hour, data held.
* Simulated AI fix: three steps and a code block, with **Copy**.
* Shared root cause chip and **Fix all** when present.
* Actions by status: **Claim**, **Submit fix**, **Approve**, **Rescan**, **Accept risk**, **Assign owner** (unmapped).

### Scoring

`score = severity × exposure × exploit × asset × data`, scaled so the maximum (90) is 100.

| Factor | Values |
|---|---|
| Severity | Critical 10 · High 6 · Medium 3 · Low 1 |
| Exposure | Internet-facing 2.0 · Internal 1.0 |
| Exploit | CISA KEV or exploitable with no credentials 1.5 · otherwise 1.0 |
| Asset | Revenue-critical production 2.0 · Production 1.4 · Non-production 0.6 |
| Data | Sensitive 1.5 · otherwise 1.0 |

Bands: Critical ≥ 70 · High 40–69 · Medium 15–39 · Low < 15. Unit risk = sum of open scores. Risk reduced = sum of verified scores.

Fix-time targets (days):

| Unit tier | Critical | High | Medium | Low |
|---|---|---|---|---|
| Tier 1 (Payments, Customer Platform, Mobile Apps, unmapped) | 7 | 30 | 60 | 120 |
| Tier 2 (Data & Analytics, Partner Integrations, Corporate IT) | 14 | 45 | 90 | 180 |

### Workflow states

`To do → In progress (claimed) → In review (fix submitted) → Verified (rescan clean)`
* Rescan still sees it → back to **To do** with a note.
* **Accepted** is a side state: owner-approved, expires, excluded from both open and reduced totals.

### Global
Reset, presenter mode (larger type), activity log, Checks panel, "simulated" tag on every AI output, persona switcher ("Viewing as"), and the required footer on every view.

---

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Neon Grid scheme |
| `js/data.js` | Clouds, units, accounts, people, sources, finding types, fix snippets |
| `js/score.js` | Scoring and bands (pure functions) |
| `js/generate.js` | Seeded generator for findings and history |
| `js/app.js` | Views, charts, drawer workflow, checks, log |
| `assets/fonts/` | Sora and Space Mono (SIL Open Font License) |

`score.js` and `generate.js` have no browser dependencies, so they run under Node for tests and can be replaced by real tool exports later.
