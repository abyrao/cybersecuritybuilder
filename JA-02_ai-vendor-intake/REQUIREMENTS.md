# JA-02 · AI Vendor Intake and Risk Triage

**Build type:** Workflow · **Mindset shift:** Judgment and accountability · **Owner:** Aby Rao
**Visual scheme:** 2 · Midnight Ops (drawn at random from schemes no build has used)
**Status:** Requirements ready · Prototype not yet built

Requirements captured from Aby's voice notes on Oct 26, 2026, mapped to the ten build questions in the master template (`claude/Builder_Prototype_Template.md` in the project). Items marked *(assumed)* were filled in by Claude and need Aby's confirmation.

---

## The point of this build

Classic vendor intake asks the requester 80 questions they can't answer, then a reviewer spends a week finding the answers online. This build flips it: the form does the public research first, asks people only what it couldn't find, and shows the risk changing as they answer.

| | Operator | Builder |
|---|---|---|
| **Intake** | Requester fills a long questionnaire from memory | Requester types a vendor name; the form fills itself from public sources |
| **Evidence** | Takes the vendor's word | Cites every fact, shows its age, and flags where the vendor's own pages disagree |
| **Risk** | A tier assigned at the end, by gut feel | A live risk meter that moves with every answer, with a "Why?" for each point |
| **Path** | Every vendor gets the full review | Low risk is fast-tracked; high risk goes to the AI Governance Committee |
| **Reassessment** | Starts from a blank form a year later | Shows what changed since last time and re-asks only that |

The judgment and accountability moment: **the form never trusts a single source, and a person signs the decision.** When the requester's answer disagrees with public evidence, both are kept and the reviewer decides.

---

## Build answers

**1. What are we building?**
An intelligent AI vendor intake and risk triage form. It's build 2 on the Judgment and accountability wall (slide 20, tile 2).

**2. What's the problem today?**
* Requesters don't know how a vendor uses AI, so intake answers are guesses.
* Reviewers redo the research by hand: trust center, privacy policy, subprocessors, certifications, news.
* Every vendor gets the same heavy process, so low-risk tools wait weeks and teams go around it (shadow AI, JA-01).
* Reassessments start from scratch and miss what changed, like a new model provider or a policy that now allows training on customer data.

**3. Who uses it, and what do they decide?**
* **Requester** (any employee buying an AI tool): describes the use and confirms what the form found.
* **Third-party risk analyst:** reviews the triage, resolves conflicts, approves, approves with conditions, or rejects.
* **AI Governance Committee:** decides High and Critical vendors and anything that affects decisions about people.
* **Privacy and legal:** pulled in automatically when the data or use requires it.

**4. What fictional data should it use?**
Five fictional AI vendors, each with a set of simulated public sources. Fictional names only, so no real company is implied to be risky. *(assumed)*

| Vendor | What it does | Case | Expected outcome |
|---|---|---|---|
| **Scribely** | AI meeting notes for sales calls | New | High (57) · headline contradiction |
| **LedgerLens AI** | Invoice and statement extraction for Finance | Reassessment (approved Sep 2025) | Medium 38 → High 63 |
| **HireSignal** | AI candidate screening and ranking | New | High, committee required (decisions about people) |
| **DocuDraft** | Writing assistant on an enterprise tenant | New | Low (3) · fast track |
| **PromptPal** | Consumer AI chatbot | New | Prohibited (on the committee's blocklist from JA-01) |

Simulated public sources per vendor (9 types), each with a fictional URL, a "last checked" date, and the facts it supports:

| Source | Facts it yields |
|---|---|
| Trust center | Certifications, data handling claims, encryption, retention |
| Privacy policy | Training on customer inputs, opt-out, retention, last updated date |
| Terms of service | Data ownership, licence to use inputs, liability |
| Subprocessor list | Fourth parties, model providers, hosting regions |
| AI policy / model card | Models used, human oversight, evaluation, intended use |
| Certification registry | SOC 2 Type II period, ISO 27001, ISO 42001 status |
| security.txt and bug bounty | Vulnerability disclosure contact and program |
| News and breach database | Incidents in the last 24 months |
| Regulatory signals | EU AI Act category, NYC Local Law 144 bias audit (for hiring tools) |

Internal data:
* **AI vendor register:** 18 approved AI vendors with tier, owner, last assessment, and next review date (includes LedgerLens AI).
* **Committee blocklist** from JA-01 (includes PromptPal).
* **Sanctioned alternatives:** approved tools to suggest when a request is blocked or overlaps.

**5. What business context does it add that public sources don't know?**
* **What data we'd send:** none, internal, customer PII, or regulated (payroll, financial, health).
* **How we'd use it:** assistive, content shared outside, actions in our systems, or decisions about people.
* **How it connects:** web only, SSO, API or data sync, browser extension, mailbox or drive access.
* **Who and how many:** business owner, department, number of users.
* **What we already have:** an approved tool that does the same job, and the committee's blocklist.

**6. What should the demo reveal?**
Headline finding:
* **Scribely's own pages disagree.** Its trust center says "We never train on your data." Its privacy policy, updated Aug 2026, says inputs may be used to improve models unless an admin opts out. The requester ticked "No training." The form keeps both, flags the conflict, and scores the public evidence until a reviewer resolves it.

Supporting findings:
* **The meter moves with each answer.** Switching Scribely to the enterprise plan with training contractually off drops it from High (57) to Medium (42) and changes the review path.
* **Reassessment catches drift.** Since LedgerLens AI was approved, it switched model providers, added a subprocessor in a new region, began training on de-identified data, and let its SOC 2 report lapse. Risk rises from 38 to 63, and the form re-asks only the 4 changed items.
* **Some uses are high-risk by definition.** HireSignal ranks job candidates, so it goes to the committee and needs a bias audit, no matter its score.
* **Low risk moves fast.** DocuDraft is fast-tracked with self-attestation in one step.
* **The blocklist applies at intake.** PromptPal is stopped on the first screen, and the form suggests the approved alternative.

**7. What will I click during the demo?** *(assumed)*
1. Type "Scribely" → watch the public recon fill the form, with sources.
2. Open the red conflict card → see the two quotes side by side.
3. **Your use:** choose customer PII and calendar access; the meter climbs to High.
4. Change the plan to enterprise with training off → the meter drops to Medium; **Why?** shows each point.
5. **Route** → reviewers and evidence list → switch to the analyst → **Approve with conditions**.
6. Type "LedgerLens AI" → reassessment banner → "4 changes since Sep 2025" → risk 38 → 63.
7. Type "PromptPal" → blocked, with the approved alternative → **Register**.

**8. What does the AI do, and where must a person approve?** *(assumed)*
Simulated AI:
* Researches the vendor's public sources and fills the form, citing each fact.
* Rates each fact's confidence and age; anything older than 12 months is marked stale.
* Flags conflicts between sources, and between the requester and the sources.
* Picks the follow-up questions, skipping what it already knows.
* Explains the score, suggests conditions, and drafts the reviewer summary.
* In a reassessment, compares today's sources to the last assessment and lists what changed.

People approve:
* **The requester confirms or corrects** each pre-filled fact. A correction never deletes the public evidence; both are kept.
* **An analyst decides** every Medium and higher request: approve, approve with conditions, or reject, with a written reason.
* **The committee decides** High, Critical, and any use that affects decisions about people.
* **Conflicts must be resolved** before approval.
* **No automatic approval** above Low. Low is fast-tracked with the requester's attestation, and the analyst can still reopen it.

**9. How will I know it's right?** *(assumed)*

| ID | Case | Expected |
|---|---|---|
| K1 | DocuDraft with internal data, SSO, assistive | Score 3, Low, fast track |
| K2 | Scribely as requested | Score 57, High |
| K3 | Scribely with training contractually off | Score 42, Medium |
| K4 | Scribely trust center vs privacy policy | Conflict flagged; approval blocked until resolved |
| K5 | Requester says "no training", public source says opt-out | Public evidence scored until a reviewer resolves it |
| K6 | HireSignal | Committee required, bias audit in evidence list, whatever the score |
| K7 | PromptPal | Prohibited at intake, alternative suggested |
| K8 | LedgerLens AI reassessment | Exactly 4 changes; 38 → 63; only changed items re-asked |
| K9 | Any fact older than 12 months | Marked stale, can't count as current evidence |
| K10 | Counts of 0 and 1 | Correct singular and plural |

**10. What should it not do?** *(assumed)*
* Browse the real web or contact real vendors. All recon is simulated from prepared sources.
* Name real companies as risky.
* Approve anything above Low without a person.
* Replace the full security questionnaire. It decides which questionnaire, if any, the vendor gets.
* Give legal conclusions. It flags regulatory signals for legal to review.

---

## Functional requirements

### Flow

```
Start ─► Recon ─► Your use ─► Risk ─► Route ─► Decision ─► Register
  │                                             ▲
  ├─ on blocklist ─► Prohibited (alternative) ──┘
  └─ already in register ─► Reassessment: diff ─► re-ask changes only ─► Risk
```

A left stepper shows the steps. A **live risk meter** stays pinned on the right from Recon onward and animates on every change.

### Screens

| Screen | Question | Main visual | Interactions |
|---|---|---|---|
| **Start** | Which vendor? | One search box with autocomplete; a short "what will you use it for?" line | Recognizes register vendors (reassessment) and blocklisted ones (prohibited) |
| **Recon** | What does the public record say? | Radar sweep animation as 9 source tiles light up; fact cards fill in with source, date, confidence | Confirm or correct each fact; open sources; conflict cards in red |
| **Your use** | How will we use it? | 5 visual choice groups (data, use, connection, users, owner), pre-filled where known | Each change moves the meter |
| **Risk** | How risky is this, and why? | Gauge, factor waterfall (each factor's points), tier and path | **What-if** toggles (remove PII, enterprise tenant, training off, read-only); **Why?** on every factor |
| **Route** | Who reviews, and what do they need? | Path card: Fast track · Standard · Full review · Committee · Prohibited; reviewer avatars; evidence checklist; target time | AI reviewer summary (simulated); conditions suggested |
| **Decision** | Approve? | Summary with open conflicts | Analyst or committee persona: Approve · With conditions · Reject, reason required |
| **Register** | What do we own? | Portfolio of AI vendors by tier; reassessment calendar | Open any vendor; start a reassessment |

Global: persona switcher (requester, analyst, committee chair), Checks panel, activity log, reset, presenter mode, "simulated" tag on every AI output, footer on every screen.

### Risk score

Points add up from 0 to 100. Tier sets the path.

| Factor | Options and points |
|---|---|
| Data we send | None 0 · Internal 10 · Customer PII 25 · Regulated (payroll, financial, health) 30 |
| Vendor's use of our data | No training, zero retention 0 · Retention up to 30 days 5 · Trains, opt-out available 15 · Trains, no opt-out 25 |
| AI role | Assistive 0 · Content shared outside 5 · Takes actions in our systems 15 · Affects decisions about people 25 |
| Connection | Web only 0 · SSO 3 · API or data sync 8 · Browser extension, mailbox, drive, or calendar access 12 |
| Vendor posture | Current SOC 2 Type II −5 · ISO 42001 −5 · No current attestation +10 · Incident in the last 24 months +10 · Undisclosed model provider +5 |
| Scale | More than 500 users +5 |

Tiers: Low 0–24 · Medium 25–49 · High 50–69 · Critical 70+.

Hard rules override the score:
* On the committee blocklist → **Prohibited**.
* Affects decisions about people → at least **High**, committee required, bias audit in evidence.
* Any unresolved conflict → can't be approved.

| Tier | Path | Evidence | Reviewers | Reassess |
|---|---|---|---|---|
| Low | Fast track | Requester attestation | None (analyst can reopen) | 24 months |
| Medium | Standard | AI questionnaire (short), SOC 2 or ISO 27001 | Security analyst | 12 months |
| High | Full review | Full questionnaire, SOC 2 Type II, DPA, AI model details | Security, privacy, legal | 6 months |
| Critical | Committee | Everything above plus pen test summary and AI evaluation results | AI Governance Committee | 3 months |

Worked scores (the known answers):
* **DocuDraft:** internal 10 + no training 0 + assistive 0 + SSO 3 + SOC 2 −5 + ISO 42001 −5 = **3, Low**.
* **Scribely:** customer PII 25 + trains with opt-out 15 + content shared 5 + calendar access 12 + SOC 2 −5 + 600 users 5 = **57, High**. With training off: **42, Medium**.
* **LedgerLens AI (Sep 2025):** regulated 30 + retention 5 + assistive 0 + API 8 + SOC 2 −5 = **38, Medium**. **Today:** regulated 30 + trains with opt-out 15 + assistive 0 + API 8 + no current attestation 10 = **63, High**.
* **HireSignal:** customer PII 25 + retention 5 + decisions about people 25 + API 8 + SOC 2 −5 = **58**, High by score and by rule.

### Reassessment

* Triggered when the vendor is in the register, or when its next review date passes.
* Pre-fills every prior answer.
* Shows a "since last time" diff: each changed fact with old value, new value, source, and its effect on the score.
* LedgerLens AI's 4 changes: model provider switched · new subprocessor in a new region · privacy policy now allows training on de-identified data (opt-out) · SOC 2 Type II period ended 14 months ago.
* Re-asks only questions tied to changed facts.

---

## Data and code structure

```
JA-02_ai-vendor-intake/
  index.html
  README.md
  REQUIREMENTS.md
  css/styles.css
  assets/fonts/           Inter, JetBrains Mono (local)
  js/
    data.js               vendors, public sources, register, blocklist, alternatives
    score.js              score(answers, facts) → { points, tier, path, factors[] } (pure)
    recon.js              simulated recon: sources → facts, confidence, staleness, conflicts
    diff.js               reassessment diff: prior assessment vs current facts
    flow.js               step state machine and approvals
    app.js                screens, meter, charts, log
    checks.js             K1–K10
```

Fact schema:

```json
{
  "id": "scribely.training",
  "vendor": "scribely",
  "field": "training",
  "value": "trains-optout",
  "quote": "Inputs may be used to improve our models unless an administrator opts out.",
  "source": "privacy-policy",
  "url": "https://scribely.example/privacy",
  "checked": "2026-10-25",
  "published": "2026-08-14",
  "confidence": 0.9,
  "stale": false,
  "conflictsWith": ["scribely.training.trust"]
}
```

Assessment schema:

```json
{
  "id": "AS-2026-0142",
  "vendor": "scribely",
  "type": "new",
  "requester": "Maya Torres",
  "answers": { "data": "customer-pii", "role": "content-external", "connection": "calendar", "users": 600 },
  "overrides": [{ "field": "training", "requester": "none", "public": "trains-optout", "resolved": false }],
  "score": 57, "tier": "High", "path": "Full review",
  "decision": null, "conditions": [], "nextReview": null
}
```

`score.js`, `recon.js`, and `diff.js` have no browser dependencies, so they run under Node for tests. `recon.js` is the one module to swap later for a real collector, such as a script that reads a vendor's trust center and privacy policy.

---

## Open questions for Aby

1. "Sifa flow" in the voice notes: I read it as the intake workflow (Start → Recon → Use → Risk → Route → Decision → Register). If you meant a specific framework, tell me which one.
2. Should Scribely's corrected answer stay Medium only after the vendor signs a no-training clause, or as soon as the requester picks the enterprise plan?
3. Use your organization's real tier thresholds and review intervals, or keep these?
