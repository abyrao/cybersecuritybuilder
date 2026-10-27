# JA-01 · Shadow AI Inventory and Response

**Build type:** Workflow (with a daily dashboard) · **Mindset shift:** Judgment and accountability · **Owner:** Aby Rao
**Visual scheme:** 1 · Paper & Signal (drawn at random, excluding 3 · Glacier used by OC-01)
**Status:** Prototype built (see README.md)

Requirements captured from Aby's voice notes on Oct 26, 2026, mapped to the ten build questions in the master template (`claude/Builder_Prototype_Template.md` in the project). Items marked *(assumed)* were filled in by Claude and need Aby's confirmation.

---

## The point of this build

Most shadow AI programs stop at a list of domains. This one shows the builder version:

| | Operator | Builder |
|---|---|---|
| **Inventory** | Exports one tool's list of "AI domains" | Correlates 10 sources, so it finds AI no single tool sees |
| **Policy** | A PDF of banned tools | A committee-owned blacklist, versioned, applied as rules every day |
| **Signal** | Alert on every visit | Risk-scored signal with evidence, confidence, and a "Why?" |
| **Response** | Emails a spreadsheet to IT | Notifies the person, offers the sanctioned alternative, then removes with approval |
| **Closure** | Marks the ticket done when the command runs | Confirms the next day that the usage actually stopped, and follows up on what didn't |

The last row is the judgment and accountability moment, and the echo of slide 13's access review.

---

## Build answers

**1. What are we building?**
A shadow AI inventory built from SSO, browser, network, endpoint, and expense data. It's the first build on the Judgment and accountability wall (slide 20, tile 1).

**2. What's the problem today?**
* Each tool sees a slice: SSO sees sanctioned apps, the proxy sees domains, expense sees receipts. Nobody sees the whole picture.
* The AI Governance Committee decides what's prohibited, but its decisions live in meeting minutes, not in the tools.
* When shadow AI is found, nobody tells the person why or what to use instead, and nobody checks that removal worked.

**3. Who uses it, and what do they decide?**
* **AI governance lead / security analyst:** which signals to act on, and whether to notify, block, or remove.
* **AI Governance Committee:** owns the blacklist; decides which unreviewed apps to approve or prohibit.
* **Endpoint team:** approves and runs removals through CrowdStrike Falcon (simulated).
* **Employees and managers:** receive a plain-language notice with the approved alternative.

**4. What fictional data should it use?**
30 days of data (Sep 27 – Oct 26, 2026) for a fictional organization of about 4,200 employees in 9 departments: Finance, HR, Sales, Marketing, Engineering, Customer Support, Legal, Operations, Executive.

Security and monitoring sources (10):

| # | Source (generic name) | Category | What it contributes | AI-related events in the prototype (30 days) |
|---|---|---|---|---|
| 1 | Okta (Identity provider) | SSO | Sign-ins to AI apps, tenant used | 2,528 sign-ins |
| 2 | Microsoft Entra ID (Cloud directory) | SSO / OAuth | Third-party AI app consents, scopes, tokens | 43 consents and tokens |
| 3 | Chrome Enterprise (Browser management) | Browser | AI site visits, installed AI extensions and permissions | 2,519 visits and extension reports |
| 4 | Zscaler (Web gateway) | Secure web gateway | AI traffic, uploads, tenant, meetings joined by AI bots | 1,374 sessions |
| 5 | Cisco Umbrella (DNS security) | DNS | Lookups to AI domains, including ones with no other trace | 346 lookups |
| 6 | CrowdStrike Falcon (EDR) | Endpoint | AI software installed and running, host details, online status | 387 detections |
| 7 | Microsoft Purview (DLP) | Data protection | Sensitive-data uploads to AI destinations, by classification | 361 matches |
| 8 | SAP Concur (Expense system) | Finance | AI subscriptions on expense reports | 25 line items |
| 9 | Amex corporate card (Corporate card feed) | Finance | AI merchant charges | 28 charges |
| 10 | Coupa (Procurement) | Finance | AI vendor invoices and purchase orders | 2 invoices |

Business context sources (not security tools):
* **Workday:** department, manager, role, executive flag, contractor flag.
* **Data access tiers** (from IAM groups): which people can reach production, payroll, customer, or financial data.
* **Sanctioned AI register:** 5 approved enterprise tools and their tenant IDs.
* **Exception register:** time-limited approvals for pilots.
* **Business calendar:** Q3 close, Oct 1 – 8, 2026.

AI app catalog: 64 distinct AI apps detected.
* 5 sanctioned (real enterprise products on the organization's tenant: Microsoft 365 Copilot, ChatGPT Enterprise, Claude Enterprise, GitHub Copilot Business, Gemini for Workspace).
* 8 tolerated with limits, 14 blacklisted, 37 unreviewed.
* Every blacklisted and unreviewed app uses a **fictional name** (for example SheetSage AI, TabGenie AI, NoteHawk, ModelBox, PDFWhiz AI) so the demo never implies a real product is unsafe. *(assumed)*

Sources show generic labels by default ("Identity provider", "EDR"), per the deck's vendor-neutrality note; one toggle shows product names.

**5. What business context does it add that the tools don't know?**
* **The committee's decisions:** the blacklist turns policy into rules the tools never had.
* **Who the person is:** department, manager, executive or admin status, and what data they can reach. The same AI app is low risk for a marketer and critical for someone with payroll access.
* **What's sanctioned:** each signal offers the approved alternative, and shows unused enterprise seats.
* **Exceptions:** an approved pilot suppresses a signal until it expires.
* **The calendar:** uploads during quarter-end close weigh more.
* **Spend:** duplicate individual subscriptions, annualized, against enterprise seats already paid for.

**6. What should the demo reveal?**
Headline finding:
* **Finance's quarter-end close went through an AI tool nobody approved.** Three Finance analysts expensed SheetSage AI at $24 a month. During close (Oct 1 – 8) it received 318 uploads tagged as financial statements or payroll data. Okta never saw it. Only expense + browser + DLP together did.

Accountability moment:
* **Removal isn't done when the command runs.** TabGenie AI removal succeeds on 86 of 87 hosts. One Sales laptop is offline, so it stays "pending" and opens a follow-up. The next day's scan confirms removal on the 86, not on the 87th.

Supporting findings:
* Every high-risk signal today (11 of 11) comes from an app that never appears in SSO logs.
* TabGenie AI, a browser extension that can read and change all site data, is on 87 endpoints, including 6 IT admins with privileged access.
* ModelBox, a local model runner, is on 4 Engineering laptops with production database access.
* NoteHawk, a meeting note-taker, joined 212 external customer calls after 19 Sales users granted it calendar access in Entra.
* 163 people use personal accounts of a sanctioned tool while 212 enterprise seats sit unassigned. The fix is a redirect, not a penalty.
* 46 people expense individual AI subscriptions: about $11,040 a year.
* After the Oct 19 notices, personal-account signals drop 57% (5 weekdays after vs the 5 weekdays before).

**7. What will I click during the demo?**
1. **Sources:** watch 10 sources flow into one inventory; toggle product names.
2. **Blacklist:** open BL-03 and see the committee's version, approval date, and rationale.
3. **Today:** play the 30-day timeline; see the quarter-end spike in Finance.
4. Open the **SheetSage AI** signal → **Why?** → evidence from three sources.
5. **Respond:** AI drafts the notice (simulated) → approve → block and notify.
6. Open **TabGenie AI** → dry run in Falcon → see blast radius → two approvals → run removal.
7. **Outcomes:** advance to tomorrow → 86 verified, 1 pending → **Log**.

**8. What does the AI do, and where must a person approve?**
Simulated AI:
* Classifies unknown domains, extensions, and merchants as AI or not, with a confidence score.
* Correlates events across sources into one signal per person, app, and rule.
* Explains each signal in plain language ("Why?").
* Drafts the employee and manager notice, including the sanctioned alternative.
* Suggests the response from the rule's playbook.

People approve:
* **Every notice** before it's sent.
* **Every block, revoke, or removal**, after a dry run shows exactly which hosts and people are affected.
* **Two approvers** when a removal touches an executive, an admin, a service account, or more than 25 hosts.
* **Blacklist changes:** the analyst can only propose; the committee approves and publishes a new version.
* **Revealing names:** signals show employee IDs by default. Revealing a name requires a reason, and the reveal is logged.

**9. How will I know it's right?** *(assumed)*
Known-answer cases, run live on a **Checks** screen:

| ID | Case | Expected result |
|---|---|---|
| K1 | Sanctioned use: ChatGPT Enterprise via Okta on the enterprise tenant | 0 signals |
| K2 | Same tool on a personal account | BL-02 signal (Low or Medium, by data access) |
| K3 | ModelBox on hosts with production access | Exactly 4 people, BL-05 |
| K4 | Legal's ClauseBot pilot, exception EX-12 valid to Dec 31, 2026 | Suppressed; counted as "suppressed by exception" |
| K5 | Marketing's ImageForge AI (BL-09), exception EX-09 expired Oct 25, 2026 | Suppressed through Oct 25, signals resume Oct 26 |
| K6 | Rule retired in blacklist v3.2 | No new signals after Oct 14; earlier signals kept |
| K7 | Removal attempted without approval | Blocked, logged |
| K8 | TabGenie AI removal on 87 hosts including 6 admins | Requires two approvers |
| K9 | Removal on an offline host | Stays "pending", never "verified" |
| K10 | Reconciliation | Every signal links to ≥1 rule and ≥1 source event; daily totals match the sum by department and by rule |

**10. What should it not do?** *(assumed)*
* Connect to real Okta, Falcon, Zscaler, or any other system, or run real commands.
* Capture prompt or file contents. It uses metadata and DLP classifications only.
* Score or rank employees for performance, or show names by default.
* Remove or block anything automatically without a person's approval.
* Let analysts edit the committee's blacklist directly.
* Replace the AI vendor intake process (that's JA-02).

---

## Functional requirements

### Screens

One question per screen. Left rail labels: **Sources · Blacklist · Today · Inventory · Respond · Outcomes · Log · Checks**.

| Screen | Question | Main visual | Key interactions |
|---|---|---|---|
| **Sources** | What can we see? | Animated flow: 10 source tiles stream particles into a central "Inventory" node; counts tick up | Freshness badge per source; coverage gaps (for example "Contractor devices: no browser telemetry"); product-names toggle |
| **Blacklist** | What did the committee decide? | Rule cards grouped by type (App, Usage, Extension, Endpoint, OAuth, Spend), colored by severity | Rule detail: condition, rationale, policy reference, playbook, version history; **Propose change** goes to a committee queue, never applied directly |
| **Today** | What's happening today? | KPI tiles (signals, high risk, new apps, people) · department × day heatmap · stacked area by rule · source contribution bar | Date scrubber over 30 days; **Play** animates day by day; Q3 close band shaded; click a cell to filter |
| **Signal drawer** | Why is this flagged? | Evidence timeline with one lane per source; risk factor bars | **Why?**, exception check, recommended action, open in Respond |
| **Inventory** | What AI is in use? | Bubble chart of 64 apps: x = risk, y = people, size = events, color = status | Filter by status; unreviewed app → **Send to committee** (queued) |
| **Respond** | What do we do? | Action queue as cards; response ladder: Notify → Grace → Block / Revoke / Remove → Verify | Draft notice (simulated AI) → edit → approve; dry run → blast radius → approve (1 or 2 people) → run with per-host progress |
| **Outcomes** | Did it work? | Before/after lines per rule; verification donut (verified, pending, failed) | **Advance to tomorrow** runs the next-day scan; pending hosts open follow-ups |
| **Log** | Who did what? | Timeline | Filter by actor and action; export CSV |
| **Checks** | Can we trust it? | Pass/fail list K1–K10 | Run all; each shows expected vs actual |

Global: reset button, presenter mode (bigger type, hides the rail), "simulated" tag on every AI output, footer always visible.

### Blacklist v3.2 (AI Governance Committee, approved Oct 14, 2026)

| ID | Type | Rule | Severity | Playbook | Grace |
|---|---|---|---|---|---|
| BL-01 | App | Unvetted AI file converters and summarizers | High | Notify → block in SWG | 5 business days |
| BL-02 | Usage | Personal accounts on sanctioned AI tools | Medium | Notify with enterprise sign-in link | 5 business days |
| BL-03 | Usage | Sensitive data (PII, payroll, financial, customer, source code) sent to any non-sanctioned AI app | Critical | Block now → notify → open incident | None |
| BL-04 | Extension | AI browser extensions that can read and change all site data | High | Notify → remove via Falcon | 5 business days |
| BL-05 | Endpoint | Local model runners on devices with production data access | High | Notify → remove via Falcon | 5 business days |
| BL-06 | Usage | AI note-takers joining external calls | High | Notify → revoke OAuth → block | 5 business days |
| BL-07 | OAuth | AI apps granted mailbox or drive read access | High | Revoke consent in Entra → notify | 2 business days |
| BL-08 | Spend | AI subscriptions bought outside procurement | Low | Notify → finance flag | 10 business days |
| BL-09 | App | AI apps whose terms allow training on user inputs with no opt-out | High | Notify → block in SWG | 5 business days |
| BL-10 | Usage | Non-sanctioned AI code assistants on regulated repositories | High | Notify → remove via Falcon | 5 business days |
| BL-11 | Usage | AI agents with write access to corporate SaaS through personal tokens | Critical | Revoke token → notify → open incident | None |
| BL-12 | Spend | AI model API keys paid on personal or corporate cards | Medium | Notify → finance flag | 10 business days |

Version history: v3.0 (Jul 8), v3.1 (Aug 26), v3.2 (Oct 14: added BL-11, retired the v3.1 rule "Any AI image generator", now covered by BL-09).

### Signal scoring

`risk = severity weight × data access multiplier × corroboration × calendar multiplier`, capped at 100.

* Severity weight: Critical 50, High 35, Medium 20, Low 8.
* Data access multiplier: none 1.0, internal 1.2, customer or financial 1.6, payroll, production, or privileged (IT admin) 2.0.
* Corroboration: 1 source 0.6, 2 sources 0.85, 3 or more sources 1.0. A single-source signal is never shown as "high confidence."
* Calendar multiplier: 1.25 during Q3 close for Finance, otherwise 1.0.
* Bands: Critical ≥ 75, High 50 – 74, Medium 25 – 49, Low < 25.

Every score's **Why?** lists each factor and its value.

### Notices (simulated AI drafts)

* Tone: informative, not punitive. States what was seen, which rule, why it matters, what to use instead, and the deadline.
* Variants: employee, manager (cc), and a Slack/Teams short form.
* Always includes the sanctioned alternative and a link to request an exception.
* Example subject: "Action needed by Oct 26: TabGenie AI will be removed from your laptop."

### Removal through CrowdStrike Falcon (simulated)

* Dry run first: lists hosts, owners, departments, admin/executive flags, online status, last seen.
* Blast radius card: hosts, people, departments, business impact note (for example "3 hosts in Finance during close").
* Default rollout: 5-host canary → verify → remaining hosts. *(assumed)*
* Shows the simulated Real Time Response action per host (for example `uninstall extension id …`), labeled **simulated**.
* Per-host states: queued → running → removed → verified, or offline → pending → retried.
* Nothing becomes **verified** until the next scan shows no usage.

---

## Data and code structure

**As built (Oct 26):** the prototype keeps the same responsibilities in fewer files, all plain scripts so `index.html` works from disk: `js/data.js` (sources, departments, apps, rules, versions, exceptions, personas), `js/engine.js` (seeded generator, rule matching by blacklist version, exceptions, correlation, scoring), `js/respond.js` (notices, approvals, simulated EDR removal, next-day scan), and `js/app.js` (views). The planned split below is the target when real connectors replace the generator.

Built so each mock module can be swapped for a real connector later.

```
JA-01_shadow-ai-inventory/
  index.html
  README.md
  REQUIREMENTS.md
  css/styles.css
  assets/fonts/            Space Grotesk, IBM Plex Mono (local)
  assets/vendor/           chart library saved locally
  data/
    sources.json           10 sources + business context sources
    apps.json              64 AI apps, status, category
    blacklist.json         rules, versions, approvals
    exceptions.json
    people.json            fictional employees (IDs, dept, role, flags, data tier)
    hosts.json             endpoints from Falcon
  js/
    generate.js            seeded generator for 30 days of events (same output every run)
    normalize.js           source events → common event schema
    classify.js            simulated AI: is this AI? confidence
    rules.js               evaluate(blacklistVersion, events, context) → signals
    score.js               score(signal, context) → { risk, band, factors[] }
    correlate.js           merge events into one signal per person + app + rule
    respond.js             response ladder state machine, approvals
    connectors/
      falcon.mock.js       dryRun(hosts), remove(hosts), scan(hosts)
      swg.mock.js          block(domain)
      entra.mock.js        revokeConsent(appId, users)
      notify.mock.js       send(notice)
      finance.mock.js      flag(expenseIds)
    log.js                 append-only activity log
    checks.js              K1–K10 known-answer tests
    app.js                 views and routing
```

Common event schema:

```json
{
  "id": "EV-000123",
  "ts": "2026-10-03T14:22:05Z",
  "source": "purview",
  "personId": "E-10482",
  "hostId": "LT-3317",
  "appId": "APP-sheetsage",
  "action": "upload",
  "detail": { "classification": "financial-statement", "bytes": 482113 }
}
```

Signal schema:

```json
{
  "id": "SG-2026-10-03-0042",
  "date": "2026-10-03",
  "personId": "E-10482",
  "appId": "APP-sheetsage",
  "ruleId": "BL-03",
  "blacklistVersion": "3.2",
  "eventIds": ["EV-000123", "EV-000131"],
  "sources": ["concur", "chrome", "purview"],
  "risk": 100,
  "band": "Critical",
  "factors": [{ "name": "Severity", "value": 40 }],
  "suppressedBy": null,
  "status": "open"
}
```

Connector interface (every mock returns a Promise with simulated latency, so real calls drop in later):

```js
// connectors/falcon.mock.js
export async function dryRun(hostIds) { /* → [{ hostId, online, lastSeen, owner }] */ }
export async function remove(hostIds, approvalId) { /* rejects without approvalId */ }
export async function scan(hostIds) { /* → [{ hostId, present: boolean }] */ }
```

---

## Acceptance criteria

* Opens from `index.html` offline; no network requests (check DevTools).
* Generator is seeded: the planted findings and all counts match on every reload and after reset.
* All ten known-answer checks pass on the Checks screen.
* No action runs without an approval record; two-person rule enforced.
* Every signal, score, and AI draft has a **Why?** and a "simulated" tag where AI is involved.
* Names masked by default; every reveal logged with a reason.
* Master brief quality checks: proofreading, singular/plural at 0 and 1 (for example "1 host pending"), 1920x1080 and 1366x768 layout, no console errors.
* Footer on every screen, including presenter mode: "For demo purposes only. All data is fictional and does not represent any organization. · Built by Aby Rao"

---

## Decisions (Oct 26, 2026)

1. The interface says **Blacklist**, as the AI Governance Committee calls it.
2. **Send to committee** on an unreviewed app hands off to the JA-02 AI vendor intake.
3. Sources show **generic names** by default ("Identity provider", "EDR"); a toggle shows product names.
