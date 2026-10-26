# JA-02 · AI Vendor Intake and Risk Triage

An intake form that does the vendor research first. The requester types a vendor name. The form checks nine kinds of public sources, fills itself in with a citation, date, and confidence for each fact, and asks only what it couldn't find. A live risk meter moves with every answer. Tiers come from public frameworks, and a person makes every decision above Low. If the vendor is already approved, the form runs as a reassessment and shows what changed since last time.

**For demo purposes only. All data is fictional and does not represent any organization.** All vendors, URLs, and quotes are invented. Built by Aby Rao.

**Visual scheme:** 2 · Midnight Ops (deep navy, cyan accent, violet second · Inter + JetBrains Mono)

## How to open

Open `index.html` in any modern browser. It needs no server, no login, and no internet connection; fonts are bundled locally. The "public recon" is simulated from prepared sources.

## What's inside

* **Vendor:** search with autocomplete. Recognizes new vendors, approved vendors (reassessment), and blocklisted ones (stopped at intake, with approved alternatives).
* **Public recon:** radar sweep over 9 source types. 16 fact cards with source, date, confidence, and stale and conflict flags. Requesters can confirm or correct each fact, and the public evidence is always kept. In a reassessment, a "since last time" diff names each trigger event.
* **Your use:** 5 visual choice groups plus the business owner, pre-filled from the intended use.
* **Risk:** score waterfall, floor rules with their framework basis, the review path, and what-if switches that show a projected score without changing the real one.
* **Route:** review lanes, reviewers, an evidence checklist marked found, gap, or request from the recon, and a simulated reviewer summary.
* **Decision:** conflicts block approval. The analyst decides Medium and High; the committee decides Critical and any use that affects people. A reason is required, and conditions are suggested.
* **Register:** 18+ approved AI vendors, a review calendar, due and overdue reviews, and a trigger event that starts a reassessment.
* **Live risk meter** on every step from recon onward, with a gauge, the main drivers, any floor, and a dotted projection.
* **Viewing as:** requester, third-party risk analyst, or committee chair.

## Risk tiers

Tier = the higher of the score tier and the floor rules. Score: Low 0–24, Medium 25–49, High 50–69, Critical 70+. Floors and review cycles come from the 2023 US interagency guidance on third-party relationships, common four-tier vendor tiering practice, EU AI Act risk categories, and NIST AI RMF GOVERN 6. `REQUIREMENTS.md` has the full tables.

## Demo click path

1. **Scribely → Research vendor:** sources light up. The red card shows its trust center ("We never train on your data") against its newer privacy policy (opt-out training). The requester's "no training" is kept, but it isn't scored.
2. **Your use → Risk:** 57, High. Switch on **Enterprise plan, training off**: a dotted needle projects 42, but the real score stays 57.
3. **Route → Submit for review → Switch to Ravi Menon:** approval is blocked by the conflict.
4. **Public recon → Record signed clause:** the meter drops to 42, Medium.
5. **Decision:** add a reason → **Approve with conditions** → **Open register**.
6. **Start reassessment (LedgerLens AI):** 4 changes since Sep 15, 2025, 28 → 53.
7. **HireSignal** goes to the committee, with its bias audit flagged as stale. **DocuDraft** is fast-tracked. **PromptPal** is blocked at intake. Then **Reset**.

## Quality check

* All ten known-answer checks pass (**Checks** panel). Scores verified: DocuDraft 3, Scribely 57 (42 after the clause), LedgerLens 28 → 53, HireSignal 58 with the committee.
* Every step, the register, Checks, and presenter mode were checked at 1920×1080 and 1366×768. No horizontal scroll, no overlapping or clipped text, nothing outside its box.
* No console errors and no network requests.
* Fixed during QA: a crash when switching to a blocked vendor mid-flow, trigger chips overflowing at 1366, the gauge needle covering the score, low-contrast floor chips, and a register with nothing due for review (four review dates moved earlier).
* Proofread all copy, with singular and plural checked at 0 and 1.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Midnight Ops scheme |
| `js/data.js` | Vendors, public sources, fields, answer options, register, personas |
| `js/recon.js` | Simulated recon: facts, confidence, staleness, conflicts (pure; swap for a real collector) |
| `js/score.js` | Score, floor rules, tier, path (pure) |
| `js/diff.js` | Reassessment diff and trigger events (pure) |
| `js/app.js` | Steps, meter, charts, workflow, checks, log |
| `assets/fonts/` | Inter and JetBrains Mono (SIL Open Font License) |
| `REQUIREMENTS.md` | Build requirements this prototype was made from |
