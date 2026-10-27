# JA-01 · Shadow AI Inventory and Response

A shadow AI program that goes past a list of domains. It correlates 30 days of AI-related events from 10 security and finance tools and applies the AI Governance Committee's versioned blacklist as rules every day. It risk-scores each signal with a "Why?", notifies people with the approved alternative, and removes blacklisted software through the EDR (simulated) only with approval. A removal counts as done only when the next day's scan confirms it.

**For demo purposes only. All data is fictional and does not represent any organization.** Blacklisted and unreviewed apps use invented names. Built by Aby Rao.

**Visual scheme:** 1 · Paper & Signal (warm paper, ink, orange accent, slate second · Space Grotesk + IBM Plex Mono)

## How to open

Open `index.html` in any modern browser. It needs no server, no login, and no internet connection; fonts are bundled locally. Nothing connects to a real tool or runs a real command.

## What's inside

* **Sources:** an animated flow from 10 tools (generic names by default; **Product names** shows Okta, CrowdStrike Falcon, Zscaler, and the rest) into one inventory, with sync freshness, coverage gaps, and the business context added.
* **Blacklist:** v3.0 → v3.1 → v3.2, with 12 active rules and 1 retired rule as cards with 30-day sparklines. Each rule shows its rationale, playbook, grace period, and policy. **Propose a change** queues it for the committee and never edits the rules directly.
* **Today:** a 30-day scrubber and **Play**, KPIs, a department × day risk heatmap with Q3 close shaded, signals stacked by rule, top signals, and which tools saw them.
* **Signal drawer:** a masked employee ID (revealing a name needs a reason and is logged), a risk ring with four factors, an evidence timeline per source, an exception check, and the recommended response.
* **Inventory:** 64 apps by risk and reach, colored by status, plus idle sanctioned seats and the most-used unreviewed apps. **Send to committee** hands off to JA-02 vendor intake.
* **Respond:** six responses on a ladder. Simulated AI drafts each notice, and a person approves it. TabGenie AI removal runs a dry run with blast radius, needs two different approvers, and only the endpoint team can run it. It goes as a 5-host canary, then the remaining 82, animated per host.
* **Outcomes:** **Advance to tomorrow** runs the next-day scan: 86 verified, 1 offline host pending with a follow-up. It also shows personal-account use before and after the notices, and the response record.
* **Checks:** ten known-answer checks run live. **Log:** every action, including blocked ones.

## Demo click path

1. **Sources:** 10 tools stream into one inventory. Click **Product names** to show the real tool names.
2. **Blacklist → BL-03:** the committee's rationale, playbook, and version history.
3. **Today → Play 30 days:** Finance lights up during Q3 close. Hover Oct 1–8.
4. **Open a SheetSage AI signal:** risk 100, seen only by expense + browser + DLP, never in SSO. **Reveal name** asks for a reason.
5. **Respond → SheetSage:** Draft notice → Approve → Block, notify, open incident.
6. **TabGenie:** Dry run → Approve as Jordan → try again (blocked: needs someone else) → switch to Priya → Approve → Run canary → Remove from remaining hosts.
7. **Outcomes → Advance to tomorrow:** 86 of 87 verified; LT-4471 was offline and stays pending, with a follow-up. Then **Reset**.

**Keyboard:** `1`–`6` switch views · `Esc` closes panels.

## What the data shows

* SheetSage AI: 3 Finance analysts, $24 a month on expense, 318 uploads of financial and payroll data during Q3 close. It never appears in SSO logs. Risk 100.
* TabGenie AI (all-sites extension) on 87 hosts, including 6 IT admins. ModelBox on 4 Engineering laptops with production access. NoteHawk joined 212 external calls for 19 Sales users.
* Every high-risk signal today comes from an app that never appears in SSO logs.
* 163 people use personal accounts on a sanctioned tool while 212 enterprise seats sit idle. Use fell 57% after the Oct 19 notices.
* 46 people expense AI subscriptions outside procurement: $11,040 a year.

## Quality check

* All ten known-answer checks pass: K1 sanctioned use 0 signals · K3 exactly 4 ModelBox people · K4 ClauseBot suppressed by EX-12 · K5 ImageForge resumes Oct 26 · K6 retired rule stops Oct 13 · K7–K9 approvals, two-person rule, offline host pending · K10 totals reconcile.
* Every view, the drawers, the full response path, and presenter mode were checked at 1920×1080 and 1366×768. No horizontal scroll, no overlapping or clipped text, nothing outside its box.
* No console errors and no network requests.
* Fixed during QA:
  * Scores too low to separate high risk: retuned the severity weights and added a privileged tier for IT admins.
  * BL-07 missing mailbox scopes (case-sensitive match).
  * Overlapping labels in the inventory chart.
  * A stray particle in the Sources flow.
  * Clipped axis labels.
  * Truncated playbook text.
  * Sparse rule groups.
* Proofread all copy, with singular and plural checked at 0 and 1.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Paper & Signal scheme |
| `js/data.js` | Sources, departments, sanctioned seats, 64 apps, blacklist rules and versions, exceptions, personas |
| `js/engine.js` | Seeded event generator, rule matching by blacklist version, exceptions, correlation, scoring (pure; runs under Node) |
| `js/respond.js` | Notices, approvals, simulated EDR removal, next-day scan (pure) |
| `js/app.js` | Views, charts, drawers, checks, log |
| `assets/fonts/` | Space Grotesk and IBM Plex Mono (SIL Open Font License) |
| `REQUIREMENTS.md` | Build requirements this prototype was made from |
