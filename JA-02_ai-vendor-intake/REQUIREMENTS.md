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
| **LedgerLens AI** | Invoice and statement extraction for Finance | Reassessment (approved Sep 2025) | Medium 28 → High 53 |
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
* **What data we'd send:** none, internal, confidential business, customer or employee PII, or regulated personal data.
* **Is it a critical activity?** Would a failure significantly affect customers, financial results, or operations?
* **How we'd use it:** assistive, content shared outside, actions in our systems, or decisions about people.
* **How it connects:** web only, SSO, API or data sync, browser extension, mailbox or drive access.
* **Who and how many:** business owner, department, number of users.
* **What we already have:** an approved tool that does the same job, and the committee's blocklist.

**6. What should the demo reveal?**
Headline finding:
* **Scribely's own pages disagree.** Its trust center says "We never train on your data." Its privacy policy, updated Aug 2026, says inputs may be used to improve models unless an admin opts out. The requester ticked "No training." The form keeps both, flags the conflict, and scores the public evidence until a reviewer resolves it.

Supporting findings:
* **A plan choice isn't a commitment.** Picking Scribely's enterprise plan with training off shows a projected Medium (42) as a dotted marker, but the score stays High (57) until the vendor signs a no-training clause. Once the clause is recorded, the score drops to Medium and the review path changes.
* **Reassessment catches drift.** Since LedgerLens AI was approved, it switched model providers, added a subprocessor in a new region, began training on de-identified data, and let its SOC 2 report lapse. Risk rises from 28 to 53, and the form re-asks only the 4 changed items.
* **Some uses are high-risk by definition.** HireSignal ranks job candidates, so it goes to the committee and needs a bias audit, no matter its score.
* **Low risk moves fast.** DocuDraft is fast-tracked with self-attestation in one step.
* **The blocklist applies at intake.** PromptPal is stopped on the first screen, and the form suggests the approved alternative.

**7. What will I click during the demo?** *(assumed)*
1. Type "Scribely" → watch the public recon fill the form, with sources.
2. Open the red conflict card → see the two quotes side by side.
3. **Your use:** choose customer PII and calendar access; the meter climbs to High.
4. Change the plan to enterprise with training off → a dotted "projected 42" marker appears, but the meter stays at 57 → **Record signed clause** (analyst) → the meter drops to Medium; **Why?** shows each point.
5. **Route** → reviewers and evidence list → switch to the analyst → **Approve with conditions**.
6. Type "LedgerLens AI" → reassessment banner → "4 changes since Sep 2025" → risk 28 → 53.
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
* **Contract terms count only when signed.** What-if changes and plan choices show a projected score; the real score changes only when an analyst records the signed term (for example, a no-training clause).
* **No automatic approval** above Low. Low is fast-tracked with the requester's attestation, and the analyst can still reopen it.

**9. How will I know it's right?** *(assumed)*

| ID | Case | Expected |
|---|---|---|
| K1 | DocuDraft with internal data, SSO, assistive | Score 3, Low, fast track |
| K2 | Scribely as requested | Score 57, High |
| K3 | Scribely on the enterprise plan, clause not yet signed | Stays 57, High, with a projected 42 shown · after the signed clause is recorded: 42, Medium |
| K4 | Scribely trust center vs privacy policy | Conflict flagged; approval blocked until resolved |
| K5 | Requester says "no training", public source says opt-out | Public evidence scored until a reviewer resolves it |
| K6 | HireSignal | Committee required, bias audit in evidence list, whatever the score |
| K7 | PromptPal | Prohibited at intake, alternative suggested |
| K8 | LedgerLens AI reassessment | Exactly 4 changes; 28 → 53; only changed items re-asked |
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
| **Your use** | How will we use it? | 6 visual choice groups (data, use, connection, critical activity, users, owner), pre-filled where known | Each change moves the meter |
| **Risk** | How risky is this, and why? | Gauge, factor waterfall (each factor's points), tier and path | **What-if** toggles (remove PII, enterprise tenant, training off, read-only) show a projected score as a dotted marker; **Why?** on every factor |
| **Route** | Who reviews, and what do they need? | Path card: Fast track · Standard · Full review · Committee · Prohibited; reviewer avatars; evidence checklist; target time | AI reviewer summary (simulated); conditions suggested |
| **Decision** | Approve? | Summary with open conflicts | Analyst or committee persona: Approve · With conditions · Reject, reason required |
| **Register** | What do we own? | Portfolio of AI vendors by tier; reassessment calendar | Open any vendor; start a reassessment |

Global: persona switcher (requester, analyst, committee chair), Checks panel, activity log, reset, presenter mode, "simulated" tag on every AI output, footer on every screen.

### Risk tiers

The tiers combine three public sources. No organization's internal thresholds are used.

| Source | What it contributes |
|---|---|
| US interagency guidance on third-party relationships (FRB, FDIC, OCC, June 2023) | Due diligence and monitoring scale with risk. "Critical activities" (significant customer, financial, or operational impact if the vendor fails) get the most rigorous oversight. |
| Common vendor tiering practice (four tiers: Low, Medium, High, Critical) | Tier on inherent risk: data and system access, regulatory exposure, business criticality, replaceability. Reassess on a cycle and on trigger events. |
| EU AI Act risk categories (Regulation 2024/1689) | Prohibited practices; high-risk uses such as employment (CV screening, candidate ranking); transparency duties for AI that talks to people or generates content. |
| NIST AI RMF (GOVERN 6) | Policies for AI risk from third-party software and data, including fourth-party model providers. |

A vendor's tier is the **higher of** its score tier and any floor rule below.

#### 1. Score

Points add up from 0 to 100.

| Factor | Options and points |
|---|---|
| Data we send | None 0 · Internal 10 · Confidential business (financials, contracts) 20 · Customer or employee PII 25 · Regulated personal data (health, cardholder, payroll, government ID) 30 |
| Vendor's use of our data | No training, zero retention 0 · Retention up to 30 days 5 · Trains, opt-out available 15 · Trains, no opt-out 25 |
| AI role | Assistive 0 · Content shared outside 5 · Takes actions in our systems 15 · Affects decisions about people 25 |
| Connection | Web only 0 · SSO 3 · API or data sync 8 · Browser extension, mailbox, drive, or calendar access 12 |
| Vendor posture | Current SOC 2 Type II −5 · ISO 42001 −5 · No current attestation +10 · Incident in the last 24 months +10 · Undisclosed model provider +5 |
| Scale | More than 500 users +5 |

| Score | Tier |
|---|---|
| 0–24 | Low |
| 25–49 | Medium |
| 50–69 | High |
| 70–100 | Critical |

#### 2. Floor rules (override a lower score)

| Condition | Minimum tier | Basis |
|---|---|---|
| On the committee blocklist, or an EU AI Act prohibited practice | **Prohibited** | EU AI Act; committee decision (JA-01) |
| Supports a critical activity: failure would significantly affect customers, financial results, or operations | **Critical** | Interagency guidance, "critical activities" |
| Takes actions in production or customer-facing systems | **High** | Common tiering: system access |
| Affects decisions about people (hiring, promotion, termination, credit) | **High**, committee required, bias audit in evidence | EU AI Act high-risk (employment); NYC Local Law 144 for hiring tools |
| Regulated personal data | **High** | Common tiering: sensitive data and regulatory exposure |
| Trains on our data with no opt-out | **High** | NIST AI RMF GOVERN 6: third-party data risk |
| Customer or employee PII, or AI content shown to customers | **Medium** | Common tiering; EU AI Act transparency duties |
| Any unresolved conflict between sources | Can't be approved | Judgment and accountability guardrail |

#### 3. What each tier gets

| Tier | Path | Evidence | Reviewers | Full reassessment | Monitoring between reviews |
|---|---|---|---|---|---|
| Low | Fast track | Requester attestation | None (analyst can reopen) | Every 3 years or at renewal | Annual attestation |
| Medium | Standard | Short AI questionnaire; SOC 2 or ISO 27001 | Security analyst | Every 2 years | Annual public recon refresh |
| High | Full review | Full questionnaire; SOC 2 Type II; DPA; model and training-data details | Security, privacy, legal | Every 12 months | Recon refresh every 6 months |
| Critical | Committee | All of High plus pen test summary, AI evaluation results, exit plan | AI Governance Committee | Every 12 months | Continuous recon; quarterly check-in |

**Trigger events** start a reassessment right away, whatever the schedule: a model provider change, a privacy policy or terms change on training or retention, a new subprocessor or hosting region, a lapsed attestation, a security incident, or our use expanding to new data or a new connection.

#### Worked scores (the known answers)
* **DocuDraft:** internal 10 + no training 0 + assistive 0 + SSO 3 + SOC 2 −5 + ISO 42001 −5 = **3, Low**. No floors apply.
* **Scribely:** customer PII 25 + trains with opt-out 15 + content shared 5 + calendar access 12 + SOC 2 −5 + 600 users 5 = **57, High**. With a signed no-training clause: **42, Medium** (the PII floor keeps it at least Medium).
* **LedgerLens AI (Sep 2025):** confidential business 20 + retention 5 + assistive 0 + API 8 + SOC 2 −5 = **28, Medium**. **Today:** confidential business 20 + trains with opt-out 15 + assistive 0 + API 8 + no current attestation 10 = **53, High**. A model provider change and a policy change are both trigger events.
* **HireSignal:** candidate PII 25 + retention 5 + decisions about people 25 + API 8 + SOC 2 −5 = **58, High**. The employment floor sends it to the committee and adds a bias audit.
* **PromptPal:** **Prohibited** (blocklist floor), whatever the score.

### Reassessment

* Starts when the vendor is in the register, when its review date passes, or on any trigger event.
* Pre-fills every prior answer.
* Shows a "since last time" diff: each changed fact with old value, new value, source, which trigger it hit, and its effect on the score.
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

1. ~~"Sifa flow"~~ Resolved Oct 26: it means the intake workflow (Start → Recon → Use → Risk → Route → Decision → Register).
2. ~~Scribely's drop to Medium~~ Resolved Oct 26: it stays High until the vendor signs a no-training clause. Choosing the plan only shows a projection.
3. ~~Tier thresholds~~ Resolved Oct 26: built from public frameworks (interagency guidance, common tiering practice, EU AI Act, NIST AI RMF). See Risk tiers.
