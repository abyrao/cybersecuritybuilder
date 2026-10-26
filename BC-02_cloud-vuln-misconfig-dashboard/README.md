# BC-02 · Cloud Vulnerability and Misconfiguration Dashboard, by Business Unit

A dashboard for the developers and cloud engineers who fix things. It pulls findings from eight tools across AWS, Microsoft Azure, Google Cloud, Oracle Cloud, and Alibaba Cloud, dedupes them, and maps each one to a business unit. It scores each finding by business risk, ranks fixes by risk removed per hour, and walks a fix through claim, review, and rescan. It also credits engineers for the risk they've removed.

**For demo purposes only. All data is fictional and does not represent any organization.** Built by Aby Rao.

**Visual scheme:** 5 · Neon Grid (near-black grid, hot pink accent, lime for risk removed · Sora + Space Mono)

## How to open

Open `index.html` in any modern browser. It needs no server, no login, and no internet connection; fonts are bundled locally.

## What's inside

* **Overview:** business unit map with a **Count / Risk** toggle that morphs the tiles, cloud filters, KPIs, and what stands out (simulated AI).
* **Units:** owner, app, and revenue context; a fix-first curve (risk removed vs hours of work); risk by cloud and band; the ranked fix list.
* **Fix board:** To do · In progress · In review · Verified, filtered by unit, type, band, or **Mine**. Quick actions on each card.
* **Finding drawer:** score ring with five factors and **Why?**, business impact, simulated AI fix steps with a cloud-specific command, shared root cause, and the next step for the person you're viewing as.
* **Reduced:** 90 days of open risk vs risk removed with **Play**, removed by unit, and credit for the unit's engineers.
* **Sources:** animated flow from clouds to tools to dedupe to owners, a coverage grid, and business context sources. **Generic names** swaps product names for tool categories.
* **Checks:** ten known-answer checks run live on a copy of the data, plus the guardrails.
* **Viewing as:** switch between engineers, unit owners, and the cloud platform lead to see who can approve what.

## Demo click path

1. **Overview → Risk:** Payments grows from the smallest tile to the biggest. 20 findings, most risk. Data & Analytics has 72.
2. **Click Payments:** the fix-first curve shows 6 fixes, about 9 hours, remove 55% of its risk.
3. **#1, the public bucket:** score 100 with **Why?**, $210K-per-hour business impact, and the AWS command.
4. **Claim → Submit fix → Approve:** blocked, you can't approve your own fix. **Switch to Ahn Kim → Approve → Rescan:** −100 points.
5. **Fix board → Customer Platform:** as Tuan Nguyen, approve and rescan the SSH fix in review. The rescan still sees a second rule, so it bounces back to To do.
6. **Overview → "9 findings, 1 root cause" → Fix all 9:** one module change, verified after rescan, −253 points.
7. **Reduced → Play 90 days**, then **Reset**.

**Keyboard:** `1`–`5` switch views · `Esc` closes panels.

## Quality check

* All ten known-answer checks pass at load and after the full click path.
* Every view, the drawer (all action states), Checks, and presenter mode were checked at 1920×1080 and 1366×768. No horizontal scroll, no overlapping text, nothing outside its box. Small treemap tiles wrap long unit names to two lines, and full names are in the tooltips.
* No console errors and no network requests.
* Fixed during QA: cards squashing in board columns, the persona menu overlapping the Checks button at 1366 wide, crowded labels in the source flow, and an overdue count of 198 of 201. Fix-time targets now depend on band and unit tier, which brings it to 90 of 201.
* Proofread all copy, with singular and plural checked at 0 and 1.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Neon Grid scheme |
| `js/data.js` | Clouds, units, accounts, people, sources, finding types, fix snippets, fix-time targets |
| `js/score.js` | Scoring and bands (pure functions) |
| `js/generate.js` | Seeded generator for findings and 90 days of history |
| `js/app.js` | Views, charts, workflow, checks, activity log |
| `assets/fonts/` | Sora and Space Mono (SIL Open Font License) |
| `REQUIREMENTS.md` | Build requirements this prototype was made from |
