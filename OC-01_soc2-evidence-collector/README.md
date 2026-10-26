# OC-01 · SOC 2 Audit Evidence Collector

One place for internal auditors to collect, review, and report SOC 2 evidence. It pulls files from connected systems, tracks owner requests, records auditor decisions, and turns status into a visual forecast and a shareable report.

**For demo purposes only. All data is fictional and does not represent any organization.** Built by Aby Rao.

**Visual scheme:** 3 · Glacier (cool white, slate ink, blue accent, teal second · Manrope + IBM Plex Mono)

## How to open

Open `index.html` in any modern browser. It needs no server, no login, and no internet connection; fonts are bundled locally.

## What's inside

* **Overview:** evidence burndown with plan and projected finish, readiness KPIs, status by category, who owes evidence, auto-collected share, AI findings, and what's due next.
* **Controls:** 41 controls grouped by SOC 2 category, colored by status, with filters and search.
* **Control drawer:** owner, frequency, test, sample testing grid, and every evidence item with a preview, AI file checks, and actions: **Collect now**, **Request**, **Mark received**, **Nudge**, **Start review**, **Accept**, **Exception**, **Reopen**.
* **Evidence:** a library of all 101 items with thumbnail previews, filters for stale and reused files, and search.
* **Report:** readiness gauge, AI summary, category table, exceptions with likely root cause, and open items by owner. **Export CSV** downloads the full evidence register; **Print** produces a clean page.

## Demo click path

1. **Overview:** fieldwork projects to finish about a week late. Hover the burndown for daily counts.
2. **AI finding "2 exceptions, 1 root cause":** jumps to the three exceptions.
3. **Open CC6.2-02, then the timing file:** four late removals, two of them contractors.
4. **Controls → Requested → a connector-backed item → Collect now:** the file arrives with a hash and AI checks.
5. **An in-review item → Exception with no note:** blocked until you describe the finding. Stale files offer **Request current** instead of Accept.
6. **Evidence → Reused:** one Okta export covers three controls.
7. **Report → Export CSV:** the full register in one click. Then **Reset**.

**Keyboard:** `1`–`4` switch views · `Esc` closes panels.

## Quality check

Every view, the drawer, the workflow actions, and presenter mode were checked at 1920×1080 and 1366×768: no overlapping or clipped text, nothing outside its box, no horizontal scroll, and no console errors. The CSV export produced all 101 rows.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Visual style, including print styles |
| `js/data.js` | Fictional data: 41 controls, 101 evidence items, people, sources, burndown |
| `js/app.js` | Views, charts, drawer workflow, simulated AI, CSV export, activity log |
| `assets/fonts/` | Manrope and IBM Plex Mono (SIL Open Font License) |
| `REQUIREMENTS.md` | Build requirements this prototype was made from |
