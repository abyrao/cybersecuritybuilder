# OC-04 · Questionnaire Response Engine

Customer security questionnaires (SIG Lite, CAIQ, custom spreadsheets) arrive by the dozen and repeat the same questions. The Response Engine turns answering them from a typing job into a monitoring job:

* a **response bank** answers most questions automatically, tailored to the products each customer bought
* **source feeds** (PMO tracker, IAM platform, policy library, audit reports, vulnerability scanner) keep the bank current, so a finished project changes the answer before anyone retypes it
* people only see the **exceptions**: loose matches, simulated AI drafts, expiring evidence, and bank changes waiting for approval

Every questionnaire leaves twice: once to the customer, and once back into the bank, so the next one needs less review.

**For demo purposes only. All data is fictional and does not represent any organization.** Harborline HCM and its customers are invented. Matching and drafting are simulated; nothing calls a real AI service, customer, or tool. Built by Aby Rao.

**Build type:** Workflow (with an assistant layer) · **Mindset shift:** Ownership and craft · **Visual scheme:** 10 · Monochrome Swiss (white and #F4F4F4, ink #111111, red #E10600 reserved for the MFA finding · Inter Tight + IBM Plex Mono). No other build uses it.

## How to open

Open `index.html` in any modern browser. It needs no server, no login, and no internet connection; fonts are bundled locally. The funnel plays automatically on load.

## What's inside

* **Funnel** (home)
  * Five stages: Intake → Match → Draft → Verify → Review. One dot per question; 463 dots flow down, and only the exceptions come to rest in Review.
  * Two outputs: **To customer** (answers ready) and **To response bank** (updates applied).
  * Five source feeds feed the bank; approved answers loop back into matching.
  * Bank changes waiting, with the MFA change first, and the review queue count.
* **Intake:** three questionnaires with format, count, due date, contract value, products bought, NDA status, and a status bar.
* **Answers:** every question with its bank entry, confidence against the 85 threshold, status, and **Why?**
* **Bank:** 60 entries in a 13-domain matrix: current, stale, evidence expiring, or legal-locked. Each entry shows owner, evidence expiry, usage, and version history.
* **Review:** only what needs a person, AI drafts first, then loose matches, then expiry notes, nearest due date first. Keys **A** approve, **E** edit, **S** skip.
* **Output:** completeness per questionnaire with **Approve and send** (CSV, simulated send), what the bank learned, and the next cycle's auto-answer rate.
* **Bank change drawer:** source record, before and after with changes marked, every answer it holds, **Why?**, and **Approve**, **Edit**, or **Keep current**.

## How it works

1. **Match:** standard ID through a SIG/CAIQ crosswalk first, then meaning (simulated) for custom spreadsheets. Confidence 85+ auto-answers; 60–84 needs review; below 60 the simulated AI drafts from related entries and marks gaps with `[Needs input]` instead of inventing a control.
2. **Tailor:** product-specific sentences are added only for modules the customer bought; out-of-scope controls are marked not applicable.
3. **Verify:**
   * **Stale:** a source signal dated after the entry's last review holds every answer that uses it.
   * **Evidence expiring:** within 60 days adds an expiry note (a bridge letter note for SOC 2) and routes to a person.
   * **Legal-locked:** flagged, never edited. Only Counsel can change it.
4. **Approve:** one bank change approval refreshes every held answer across every questionnaire. Approved loose matches teach the bank the new phrasing; approved AI drafts become new entries.
5. **Effort model:** 4.5 min per question by hand; 2 min per loose match, 6 per AI draft, 1.5 per expiry note, 3 per bank change, 5 per legal change.

## Demo click path

1. **Funnel:** 463 questions flow through; 380 (82%) go straight to the customer and 83 come to rest in Review. A notice appears on its own: **MFA rollout complete in the PMO tracker · 9 answers out of date**. Click **Review change**.
2. **MFA change:** the PMO closed the MFA project on Oct 9, but the bank still says "70% complete." The proposed answer is marked up, and it holds 9 answers across all 3 questionnaires. Click **Approve change**: as the analyst you're blocked, so **Switch to Sam Patel** and approve. Nine red dots leave the funnel for the customer and one pulse goes to the bank.
3. **Breach notification** (in Bank changes): the policy library moved customer notice from 72 to 48 hours. The entry is legal-locked, so the security lead is blocked. **Switch to Joan Kim** and approve.
4. **Review** (5): an AI draft for Monarch's point-of-sale question, labeled simulated, with the gap marked. Press **E** to edit, then **A** to approve; it becomes a new bank entry.
5. **Bank** (4): stale tiles turn current and show "updated"; the new entry appears under the matrix. Open **B27 SOC 2 Type II** to see the Nov 30 expiry and **Request bridge letter**.
6. **Output** (6): once a questionnaire has nothing open, **Approve and send** opens a summary and exports the CSV. The next-cycle bar shows how much less review the same questions would need. Then **Reset**.

**People and approvals:**

* **Lena Ortiz** (GRC analyst): approves answers and sends questionnaires.
* **Sam Patel** (security lead): approves bank changes, answers, and sends.
* **Joan Kim** (Counsel): the only person who can change legal-locked text.
* **Chris Doyle** (account executive): views status only.

**Keyboard:** `1`–`6` switch views · `A` `E` `S` in Review · `Esc` closes panels.

## Quality check

* All nine known-answer checks pass (**Checks** in the header):
  * K1 the MFA change holds 9 answers in 3 questionnaires, and one approval refreshes all 9.
  * K2 the SOC 2 report expiring Nov 30 is flagged with a bridge letter note, and sending is blocked until approved.
  * K3 the AI governance question (confidence 38) gets a labeled draft in the review queue.
  * K4 the security lead can't change legal-locked text; Counsel can (72 → 48 hours).
  * K5 Monarch (Payroll only) gets no Time or Benefits statements; the time clock question is not applicable.
  * K6 82.1% auto-answered on the first pass (380 of 463).
  * K7 bank on load: 44 current, 9 stale, 4 expiring, 3 legal-locked.
  * K8 plurals at 0 and 1.
  * K9 reset restores the seeded counts.
* Every view, the change drawer, the review editor, the send dialog, the checks panel, the log, and presenter mode were checked at 1920×1080 and 1366×768 with an automated overflow scan: no horizontal scroll, no text spilling out of its box.
* The full click path (approve every change, clear all 55 review items, send a questionnaire, reset) ran without a console error, and makes no network requests.
* Fixed during QA:
  * Word-by-word highlights in the before/after diff, now grouped into runs.
  * The "stale caught" tile counted legal holds (28); it now counts stale answers only (25).
  * Notices covered the bank output box; they now sit bottom left and close when a drawer opens.
  * "Is password requirements…" style grammar in generated questions.
  * The "updated" tag overlapped the lock icon; a long tile title overflowed in presenter mode at 1366.
  * The next-cycle projection counted expiring evidence as solved.
* Proofread all copy and all 463 generated questions, with singular and plural checked at 0 and 1.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Monochrome Swiss scheme |
| `data/bank.js` | 60-entry response bank: answers, product notes, owners, evidence, legal locks |
| `data/sources.js` | Five source feeds and ten signals with proposed answers |
| `data/questionnaires.js` | Three questionnaires, personas, effort assumptions, thresholds |
| `js/engine.js` | Question generation (fixed seed), matching, freshness, approvals, metrics, checks (pure) |
| `js/funnel.js` | Funnel, feeds, outputs, and particle animation (SVG) |
| `js/app.js` | Views, drawers, review queue, send dialog, log, keyboard |
| `assets/fonts/` | Inter Tight and IBM Plex Mono (SIL Open Font License) |
| `REQUIREMENTS.md` | Build requirements this prototype was made from |

Data ships as `.js` files rather than `.json` because browsers block reading local JSON when a page is opened straight from disk.
