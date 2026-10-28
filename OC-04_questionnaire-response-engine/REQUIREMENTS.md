# OC-04 · Questionnaire Response Engine

**Build type:** Workflow (with an assistant layer) · **Mindset shift:** Ownership and craft · **Owner:** Aby Rao
**Visual scheme:** 10 · Monochrome Swiss (the only scheme no build had used)
**Status:** Prototype built · numbers below match the seeded build (updated Oct 28, 2026)

Requirements from Aby's brief on Oct 28, 2026, mapped to the ten build questions in the master template (`claude/Builder_Prototype_Template.md` in the project). Assumptions Claude filled in were confirmed by Aby on Oct 28, 2026.

---

## The point of this build

Customer security questionnaires are large, frequent, and repetitive. The goal is not a faster form; it's a funnel where high-volume, repeatable work happens in the middle, and the people responsible monitor and approve exceptions instead of typing answers.

| | Operator | Builder |
|---|---|---|
| **Answering** | Copy answers from the last questionnaire | A response bank answers by standard ID and meaning, tailored to products bought |
| **Keeping current** | Someone remembers the MFA project finished | Source feeds mark entries stale; one approval refreshes every affected answer |
| **People's role** | Type 300 answers per questionnaire | Approve about 28 exceptions per questionnaire |
| **After sending** | Done until next time | The bank learns new phrasings and new entries, so next time needs less review |

---

## Build answers

1. **What are we building?** A response engine shown as a funnel: questionnaires enter at the top, a shared middle matches, drafts, and checks answers, and two outputs leave the bottom: a completed questionnaire for the customer and an enriched response bank.
2. **Problem today:** Harborline HCM (fictional) receives about 14 questionnaires a month, each 120 to 300 questions. Analysts retype the same answers, and answers go stale when controls change (the MFA rollout finished, but questionnaires still say "70% complete").
3. **Who uses it and what they decide:** GRC analysts approve or edit flagged answers; the security lead approves bank updates driven by source changes; Counsel owns legal-locked text; sales sees status only.
4. **Fictional data:** 3 incoming questionnaires (463 questions), a 60-entry response bank, and 5 source feeds with 10 signals.
5. **Business context added:** customer tier and contract value, deal close date, products bought, NDA status, and which answers Legal has locked.
6. **What the demo reveals:** the PMO marked the MFA rollout complete on Oct 9, yet all 3 open questionnaires still carry the old "70% complete" answer (9 questions). The engine catches it, proposes the new answer, and one approval updates all 9. Supporting: 82% of questions auto-answered; about 11 hours saved per questionnaire.
7. **What I'll click:** watch the funnel fill → MFA notice → **Review change** → **Why?** → approve → watch 9 answers and the bank update → review queue → send.
8. **What the AI does and where a person approves:** the simulated AI maps questions to bank entries, drafts answers for unmatched questions, and proposes bank updates from source changes. A person approves every bank change, every low-confidence answer, and every questionnaire before it is sent.
9. **How I'll know it's right:** the known-answer cases below.
10. **What it should not do:** send anything to a customer without approval, invent a control that has no evidence, or change legal-locked text without Counsel.

---

## The funnel

| Stage | What happens | Seeded result |
|---|---|---|
| 01 Intake | Detect format (SIG Lite, CAIQ v4, custom), split into questions, attach deal context | 463 questions from 3 questionnaires |
| 02 Match | Standard ID through the crosswalk first, then meaning (simulated) | 457 matched · 6 no match |
| 03 Draft | Confidence 85+ answered from the bank; below 60 drafted by the simulated AI | 380 auto · 6 AI drafts |
| 04 Verify | Freshness against source feeds, evidence expiry within 60 days, legal locks | 25 stale · 10 expiring · 3 legal |
| 05 Review | People approve only exceptions | 83 (55 in the review queue, 28 held by 10 bank changes) |

Outputs: **To customer** (answers ready, approved before sending) and **To response bank** (entries updated, new entries, phrasings learned).

---

## Fictional data

| Customer | Format | Questions | Tier | Due | Products | NDA |
|---|---|---|---|---|---|---|
| Bluepeak Logistics | SIG Lite | 128 | Enterprise ($420K ARR) | Nov 6 | Payroll, Time | Signed |
| Cedar Valley Health | CAIQ v4 | 261 | Strategic ($1.1M ARR) | Nov 13 | Payroll, Time, Benefits, HR | Signed |
| Monarch Retail Group | Custom | 74 | Mid-market ($95K ARR) | Nov 4 | Payroll | Pending |

**Response bank:** 60 entries across 13 domains. On load: 44 current, 9 stale, 4 evidence expiring, 3 legal-locked.

| Source | Signal | Entry |
|---|---|---|
| PMO tracker | MFA rollout complete, all 37 apps (Oct 9) | B01 Workforce MFA |
| PMO tracker | Key rotation automated every 90 days (Sep 25) | B11 Key management |
| PMO tracker | Email DLP rollout complete (Sep 30) | B38 Data loss prevention |
| IAM platform | 212 of 212 privileged accounts vaulted (Oct 14) | B02 Privileged access |
| IAM platform | Q3 access review 100% certified (Oct 3) | B03 Access reviews |
| Policy library | Incident Response Policy v4.2 (Oct 15, evidence only) | B19 Incident response plan |
| Policy library | Acceptable Use Policy v5.0 adds generative AI rules (Sep 18) | B33 Acceptable use |
| Policy library | Breach notice 72 → 48 hours (Oct 20, legal-locked) | B20 Breach notification |
| Audit reports | 2026 penetration test, no critical findings (Oct 1) | B15 Penetration testing |
| Vuln scanner | Critical SLA met 97% over 90 days (Oct 20) | B13 Remediation SLAs |

Evidence expiring within 60 days: SOC 2 Type II (Nov 30), cyber insurance certificate (Dec 1), DR test report (Dec 10), ISO 27001 certificate (Dec 15).

---

## Functional requirements

* **FR-1 Funnel (home):** five stages with live counts, one animated dot per question, two outputs, five source feeds into the bank, a loop from the bank back to matching, headline tiles (auto-answered, analyst time left, stale answers caught, ready to send), and the list of bank changes waiting. Every stage, output, and feed opens its detail.
* **FR-2 Intake:** questionnaire cards with format, count, due date, contract value, deal close, products, NDA status, and a status bar.
* **FR-3 Answers:** per questionnaire, every question with bank entry, confidence against the 85 threshold, status, and **Why?**; filters for needs a person, held, and ready.
* **FR-4 Bank:** 60 entries in a domain matrix with freshness state; entry details with owner, evidence and expiry, usage, scope, learned phrasings, and version history; **Request bridge letter** or **Request renewal** for expiring evidence.
* **FR-5 Change alert:** source record, before and after with changes marked, answers held by questionnaire and question ID, **Why?**, and **Approve**, **Edit**, or **Keep current**. Approval updates the bank and every affected answer in one step.
* **FR-6 Review queue:** AI drafts, loose matches, and expiry notes only; nearest due date first; keys A, E, S; progress and time left.
* **FR-7 Output:** completeness per questionnaire; **Approve and send** opens a summary and exports a CSV (simulated); bank enrichment this cycle; next-cycle auto-answer rate; hours by hand vs with the engine.
* **Template requirements:** offline from `index.html`, local fonts, reset, **Why?** on every flag and score, human approval before anything leaves, activity log, presenter mode, persistent footer, plural-safe copy.

---

## Known-answer cases

| Case | Expected | Result |
|---|---|---|
| MFA complete | Entry stale; approval refreshes 9 questions in 3 questionnaires | Pass |
| SOC 2 expiring | Expiry note with bridge letter; send blocked until approved | Pass |
| No match | AI governance question below 60; labeled draft in review queue | Pass |
| Legal-locked | Security lead blocked; only Counsel changes the 72-hour commitment | Pass |
| Scope | Monarch (Payroll only) gets no Time or Benefits statements | Pass |

## Non-goals

* No real file parsing; questionnaires are generated from the bank's phrasings with a fixed seed.
* No live integrations with PMO, IAM, policy, audit, or scanner tools.
* No email or portal submission to customers.
* Not a replacement for the GRC platform; it wraps existing sources.

## Assumptions (confirmed Oct 28, 2026)

* Auto-answer threshold 85; review band 60–84; AI draft below 60.
* Expiry window 60 days; effort 4.5 minutes per question by hand.
* Every bank change needs the security lead; legal-locked text needs Counsel; analysts approve answers and send.
* Exceptions average about 28 per questionnaire (83 across 3), not 20 as first estimated.
* Data files are `.js` instead of `.json` so the page works when opened from disk.
