# BC-01 · Quarterly Top 5 Risk Board Update

![BC-01 thumbnail](thumbnail/BC-01_thumbnail.png)

A dashboard the cybersecurity team prepares each quarter so the board of directors sees the top five cyber risks in the same format every time. It compares them with last quarter, last year, five years of history, a fictional industry benchmark, and the business roadmap.

**For demo purposes only. All data is fictional and does not represent any organization.** Built by Aby Rao.

## How to open

Open `index.html` in any modern browser. It needs no server, no login, and no internet connection; fonts are bundled locally.

## Demo click path

1. **This quarter:** start on the ranked top five. AI security is #1 and Secure code is new.
2. **Click AI security:** open the detail drawer and expand "Why this score?" to show the score breakdown, the industry comparison, what's driving it, mitigation progress, and linked roadmap milestones.
3. **vs last quarter:** the slope chart shows AI security moving to #1, Secure code entering, and Third-party risk dropping out.
4. **vs last year:** same view against Q3 2025; the simulated AI summary ties the change to the "AI agents for customer support" milestone.
5. **Five-year story:** press **Play** (or **P**). Watch AI security climb from #8 to #1 while ransomware and phishing fall out of the top five, with roadmap milestones lighting up along the timeline.
6. **About this build:** show the live known-answer checks, the eight trustworthy guardrails, and the AI summary off switch.
7. **Reset demo** to start over.

**Keyboard:** `1`–`4` switch views · `P` plays the five-year story · `Esc` closes panels.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Visual style |
| `js/data.js` | Fictional data: 8 risks × 20 quarters, indicators, benchmarks, roadmap |
| `js/app.js` | Views, charts, drawers, simulated AI summary, activity log |
| `assets/fonts/` | Space Grotesk and IBM Plex Mono (SIL Open Font License) |
| `thumbnail/` | Promotional thumbnail (PNG) and its source HTML |
| `REQUIREMENTS.md` | Build requirements this prototype was made from |
