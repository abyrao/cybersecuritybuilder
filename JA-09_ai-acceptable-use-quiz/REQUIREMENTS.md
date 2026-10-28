# JA-09 · AI Acceptable Use Self-Check and Quiz for Employees

**Build type:** Assistant with a learning game and a program dashboard · **Mindset shift:** Judgment and accountability · **Owner:** Aby Rao
**Visual scheme:** 11 · Confetti Grid. This is a new light scheme with a patterned background, added to the template because all ten schemes are already in use. See **Visual scheme 11** below.
**Status:** Prototype built (see README.md)

Requirements captured from Aby's notes on Oct 28, 2026, mapped to the ten build questions in the master template (`claude/Builder_Prototype_Template.md` in the project). Items marked *(assumed)* were filled in by Claude and need Aby's confirmation.

Slide 20, tile 9 reads "AI acceptable-use self-check quiz for employees." It uses the same fictional organization as JA-01 (4,200 employees, 9 departments) and the same AI Governance Committee, whose blacklist v3.2 blocked NoteHawk and AI browser extensions on Oct 14.

Every number in this document comes from `tools/reference_model.py`, which writes the files in `data/`. The prototype must reproduce them exactly (see **Known answers**).

---

## The point of this build

Most AI acceptable use policies are a PDF that employees click "I agree" on once a year. This build turns the policy into three things people actually use:

* A **self-check** that answers "Can I use AI for this?" in seconds: **Approved**, **Approved with conditions**, or **Not approved**. It cites the clause and offers a safer way to do it.
* A **quiz** that scores points for good judgment. It also covers how to speak up when a colleague's AI use looks risky.
* A **dashboard** that shows whether people know the rules, whether they follow them, and where the policy itself needs to change.

| | Operator | Builder |
|---|---|---|
| **Policy** | A PDF, signed once a year | A versioned policy with a "what can go where" table, published from the dashboard |
| **Guidance** | "Read the policy" | A 15-second self-check with the clause and a safer path |
| **Training** | An annual video and a checkbox | Twelve real scenarios with points, streaks, badges and a team challenge |
| **Speaking up** | A hotline nobody mentions | Talk first, ask anonymously, or report. Coaching, not discipline |
| **Measurement** | Completion rate | Knowledge vs behavior by department, top mistakes, and policy questions |
| **Change** | Annual policy review | Trending questions → AI-drafted clarification → committee approval → new version |

---

## Build answers

**1. What are we building?**
An AI acceptable use self-check and quiz for employees: number 9 on the Judgment and accountability wall. It has three parts:
* the policy itself, clearly written and published;
* a self-check and a gamified quiz for employees;
* a program dashboard for the awareness lead and the AI Governance Committee.

**2. What's the problem today?**
* Employees can't tell which AI tool is approved for which data. "It's the company assistant, so it must be fine" is the most common mistake.
* The policy is long and legal. Nobody checks it in the moment, just before they paste.
* Training measures completion, not judgment. A high quiz score doesn't mean people follow the rules.
* People see colleagues use blocked tools but don't know whether, or how, to say something.
* Employee questions pile up in the help desk, but the policy doesn't change to answer them.

**3. Who uses it, and what do they decide after using it?**
* **Employees:** whether to go ahead, use the safer tool, change what they paste, or ask for an exception. Also whether and how to speak up.
* **Security awareness lead:** what to teach next, which teams need help, and which questions point to a policy gap.
* **AI Governance Committee:** policy clarifications and exceptions. It approves every change before it's published.
* **Security lead:** triages speak-up reports and decides the follow-up, which is coaching by default.

**4. What fictional data should it use?**
All values are in `data/policy.json`, `data/quiz.json` and `data/program.json`. Thirty days of program data, Oct 1 – 30, 2026.

| Source (simulated) | What it provides | Volume |
|---|---|---|
| AI Acceptable Use Policy v2.1 (AI Governance Committee) | 8 sections, 27 clauses, version history | 1 policy, 2 versions, 1 proposed |
| Sanctioned AI register and blacklist v3.2 (from JA-01) | Approved, limited, public-only and blocked tools | 7 tools |
| Data classification standard | Classes and data types with examples | 4 classes, 9 data types |
| Self-check log (aggregated by department; no names) | Tool, data, purpose, verdict, deciding rule | 5,391 checks |
| Learning platform | Quiz attempts and per-question results by department | 3,150 attempts, 12 questions |
| Speak-up queue | Reports by behavior, department, channel, status | 23 reports |
| AI help desk | Policy questions by topic | 123 questions, 6 topics |
| HR directory | Departments and headcount (same as JA-01) | 9 departments, 4,200 employees |

**5. What business context does it add that the tools don't know?**
* **Which tool may hold which data, for which task:** the policy as rules, not prose (see Appendix A).
* **The committee's blacklist:** NoteHawk (BL-06, AI note-takers on external calls) and TabGenie AI (BL-04, AI browser extensions) are blocked.
* **Department context:** headcount, quiz completion, and how often each team's self-checks come back Not approved.
* **What people are confused about:** help desk questions mapped to policy clauses.
* **How we respond:** coaching first, anonymous reporting allowed, no retaliation, and no points for reporting colleagues.

**6. What should the demo reveal?**
Headline finding:
* **Knowing the rule isn't following it.**
  * Sales scores **83%** on the quiz, above the company's 78%, and 84% of Sales staff get the NoteHawk question right.
  * Yet **38%** of Sales self-checks come back Not approved, the highest of any department. **212** of those 331 are NoteHawk on customer calls.
  * Customer Support is the opposite. It has the lowest quiz score outside Operations (74%), but only **5%** of its checks are Not approved, because Support Copilot gives it an approved way to work.
  * Lesson: a sanctioned alternative changes behavior more than a quiz does.

Supporting findings:
* **The most-missed question is the most dangerous one.** 54% get Q4 wrong: uploading customer emails to the company AI assistant. People assume "approved tool" means "approved for any data".
* **Blocked tools cause almost half of all Not approved results:** 349 of 736 (47%). NoteHawk alone accounts for 254.
* **Few people have actually signed:** 75% have taken the quiz, but only 36% passed and attested. Operations is at 7%: 41% took the quiz, and its average is 66%.
* **Speaking up works without punishment.** 23 reports in 30 days, 12 of them anonymous: 15 coached, 3 with no issue found, 5 still open, 0 disciplinary actions. 11 of the 23 were about blocked tools.
* **The policy has a gap people keep asking about.** "Can I use AI to summarize customer calls?" is the top help desk question (41 of 123). The AI drafts a clarification to 6.3; the committee approves it, and the policy becomes v2.2.

**7. What will I click during the demo?** *(assumed)*
1. **Policy:** the v2.1 card and the "what can go where" table. Hover **Customer personal data**: only Support Copilot has a check mark.
2. **Self-check:** **Company AI assistant** → **Customer personal data** → **Summarize**. The stamp lands **Not approved**, citing 3.3. Click **Use Support Copilot instead** and it turns **With conditions**.
3. **Quiz:** answer Q4 "Approved" to see why it's wrong. Press **Fast-forward** (presenter only) to finish: **AI Navigator**, **Certified**, confetti. Then **Attest**.
4. **Speak up:** flip the three cards (Talk, Ask, Report) to earn the **Speak-up Ally** badge.
5. **Dashboard:** the quadrant shows Sales top-right ("knows the rule, doesn't follow it"). Click **Sales** to see NoteHawk at 212.
6. Open the top question → **Draft clarification** (simulated) → switch to **AI Governance Committee** → **Approve**. The policy becomes **v2.2**.

**8. What does the AI do, and where must a person approve?** *(assumed)*
Simulated AI:
* Explains each self-check verdict in plain language and suggests the safer path.
* Writes a personal recap after the quiz: what you missed, the clause to read, and one tip.
* Groups help desk questions by clause and drafts a policy clarification for the top one.
* Suggests the next lesson for each department from its most-missed questions.

People approve:
* **Policy changes:** only the AI Governance Committee can publish a new version. The awareness lead can propose but not publish, and the proposer can't approve their own change.
* **Exceptions:** an employee requests one from a Not approved result. The committee approves or declines it, with an owner and an end date.
* **Speak-up follow-up:** the security lead reviews each report and records the outcome with a note. Nothing goes to HR or a manager automatically.
* **Attestation:** only the employee can attest, and only after passing (10 of 12 correct).

**9. How will I know it's right?** *(assumed)*
Eighteen known-answer checks run live in the **Checks** panel (see **Known answers**). Two are easy to see on screen:
* Customer data in the company AI assistant is Not approved, while the same data in Support Copilot is With conditions.
* A perfect quiz scores 1,650 points and reaches AI Champion.

**10. What should it not do?** *(assumed)*
* Monitor individuals. Self-checks are anonymous and reported by department only.
* Give points for reporting colleagues, or show an individual leaderboard.
* Block anything or take action against anyone. It guides, educates, and records decisions.
* Read real files or prompts. It works from what the employee selects (the sensitive data checker, JA-05, covers pasted content).
* Use real vendor names for blocked tools. NoteHawk and TabGenie AI are fictional.

---

## Views

One question per view. Top bar: **Policy · Self-check · Quiz · Speak up · Dashboard**, shortcuts `1`–`5`. A player strip under the top bar shows the employee's **points · level · streak · badges**, plus the policy version.

| View | Question | Main visual | Interactions |
|---|---|---|---|
| **Policy** | What are the rules? | Policy card with version stamp; "what can go where" matrix (9 data types × 7 tools); five principles as icons; sections as an accordion | Hover cells for the clause; open sections (counts toward **Policy Reader**); version history; download Markdown; print |
| **Self-check** | Can I use AI for this? | Three-step picker (tool cards, data chips colored by class, purpose chips) and a verdict stamp | Pick, toggle "customer sees it", "a person reviews", "attendees told"; **Why?**; apply the safer path; request an exception |
| **Quiz** | Do you know the rules? | One scenario card at a time, three answer buttons, a progress ring, streak flame, points | Answer; hint (−25); feedback with clause; recap; badges; team challenge; attest |
| **Speak up** | Saw something risky? | Three flip cards: Talk, Ask, Report | Conversation starters; anonymous question; report form with a "don't attach the data" warning |
| **Dashboard** | Is the program working? | Knowledge-vs-behavior quadrant by department; most-missed questions; Not approved reasons; outcomes by tool; speak-up queue; trending questions | Click a department; triage a report; draft and approve a clarification; publish v2.2 |

### Policy
* **Header card:** "AI Acceptable Use Policy · v2.1 · Effective Oct 14, 2026 · Owner: AI Governance Committee". A "What's new" ribbon appears after v2.2 is published.
* **Matrix:** rows are data types grouped by class (colored band), columns are tools grouped by status. Cells read ✓, ✓ with conditions, or ✕, each with an icon and a word as well as color. Hover shows the clause and the conditions.
* **Principles:** five icon tiles (AI helps, people decide · Protect data · Own the output · Be open · Speak up).
* **Sections 1–8:** an accordion. Opening five unlocks **Policy Reader**.
* **Attestation status** for the current persona: "Not yet attested", or "Attested v2.1 on Oct 30".

### Self-check
* **Step 1 · Tool:** seven cards with a status ribbon (Approved, Approved with limits, Public content only, Blocked).
* **Step 2 · What's in it:** nine chips grouped by class; several can be picked. Never-allowed data (keys, card, bank and ID numbers) has a lock icon.
* **Step 3 · What for:** eight purpose chips, plus toggles that appear only when they matter: **A person reviews it** (customer replies), **Attendees told** (meetings).
* **Verdict:** a stamp animates in (rotate and scale), color and icon by verdict. Below it:
  * the deciding rule in plain words;
  * the clauses, as chips that open the Policy view;
  * conditions as a checklist;
  * a **safer path** button that applies the suggested tool;
  * **Why?** (simulated AI).
* **Request an exception** (Not approved only): business reason, owner, end date. It goes to the committee queue on the Dashboard.
* **+10 points** per check, up to 5 a day, to reward checking before acting.

### Quiz
* **Twelve questions** in a fixed order (Appendix B), answered **Approved**, **With conditions** or **Not approved**.
* **Scoring:**
  * 100 points per correct answer;
  * streak bonus of 10 × (streak − 1), capped at 50;
  * a hint costs 25 and shows the relevant clause.
* **Levels:** AI Explorer (0), AI Navigator (800), AI Champion (1,400).
* **Pass:** 10 of 12 correct earns **Certified** and unlocks **Attest**.
* **Feedback** after each answer: the stamp, a one-line reason, the clause chip, and **Try it in Self-check** (pre-fills that scenario).
* **End screen:**
  * score, level, best streak, badges earned;
  * AI recap (simulated);
  * missed topics, each with a link;
  * **Team challenge**: department completion bars, with your team highlighted and the goal of 90% by Nov 30. Teams only, never individuals.
* **Fast-forward** (presenter mode only) answers the remaining questions correctly so the demo fits in 90 seconds.
* **Confetti** (2D canvas animation) on pass; it respects `prefers-reduced-motion`.

### Speak up
* **Talk to them:** three short starters, for example "Hey, NoteHawk is blocked now. The company assistant can take notes if we tell everyone first."
* **Ask the help desk:** a question box, anonymous by default. New questions show up in the Dashboard's trending list.
* **Report it:**
  * fields: tool, what happened, team (optional), anonymous toggle;
  * a red warning: "Don't attach or paste the data itself" (7.3);
  * a reassurance line: "Reports start with coaching. Retaliation isn't allowed" (7.2).
  * Submitted reports appear in the Dashboard queue as **Open**.
* **Speak-up Ally** badge for flipping all three cards. There are **no points for submitting reports**, and the view says so.

### Dashboard
* **KPI row:** attested 36% · quiz completion 75% · quiz average 78% · Not approved 13.7% of 5,391 checks · speak-up reports 23.
* **Quadrant:**
  * x = quiz average, y = share of self-checks Not approved; bubble size = headcount; lines at the company averages.
  * Quadrant labels: "Knows it, follows it", "Knows it, doesn't follow it", "Still learning", "Needs help".
  * Click a bubble for that department's outcomes by tool.
* **Most-missed questions:** bars, sorted; Q4 first at 54%.
* **Why checks come back Not approved:** bars by deciding rule; Blocked tool first at 349.
* **Outcomes by tool:** stacked bars (Approved, With conditions, Not approved).
* **Speak-up queue:**
  * 23 reports with behavior, department, channel and status.
  * The security lead marks each one Coached or No issue found, with a required note.
* **Trending questions:** six topics with counts. **Draft clarification** (simulated) writes the 6.3 update.
  * The AI Governance Committee approves it; the proposer can't approve their own draft.
  * The policy then publishes v2.2 with a change log entry, and the Policy view updates.
* **Exception requests:** queue of requests from the Self-check; the committee approves or declines them.

### Global
Reset, presenter mode, activity log, Checks panel, "simulated" tag on every AI output, persona switcher ("Viewing as": Employee (Sales), Awareness lead, Security lead, AI Governance Committee), and the required footer on every view.

---

## Self-check rules

Pure function `check(tool, dataTypes, purpose, {reviewed, consent})` in `js/engine.js`. Rules are checked in order and the first Not approved wins. Otherwise conditions are collected.

| Rule | When | Verdict | Clauses | Safer path |
|---|---|---|---|---|
| R1 | Any never-allowed data (passwords and keys; card, bank and ID numbers) | Not approved | 3.4 | Remove or mask them |
| R2 | Purpose is screening, ranking or evaluating people | Not approved | 5.1, 2.1 | Draft job descriptions or questions instead |
| R3 | Purpose is imitating a real person | Not approved | 5.2 | Stock voice or illustration, or written consent |
| R4 | Tool is blocked (NoteHawk, TabGenie AI) | Not approved | 4.2 | Company AI assistant (meeting notes if a meeting) |
| R5 | Public chatbot with anything above Public | Not approved | 4.3, 3.2 | First approved tool that takes the data |
| R6 | Any data type above the tool's class and not a named exception for that tool | Not approved | 3.3 if restricted, else 3.2 | First approved tool that takes the data, or mask it |
| R7 | Tool not approved for this purpose | Not approved | 4.1 | Names the tool's approved purposes |
| R8 | Customer reply with no person reviewing | Not approved | 6.1 | Keep the draft; a person reviews and sends |
| R9 | Meeting notes without telling attendees | Not approved | 6.3 | Tell everyone first |
| R10 | Passed, with conditions (public chatbot, restricted data, customer reply, meeting) | With conditions | 4.3, 3.3, 6.1, 6.3 as relevant, plus 6.2 | — |
| R11 | Passed | Approved | 6.2 | — |

---

## Data files

| File | Contents |
|---|---|
| `data/policy.json` | Policy v2.1 (sections, clauses, history), classes, data types, tools, purposes, rule labels |
| `data/quiz.json` | Twelve questions with inputs and answers, scoring, badges |
| `data/program.json` | Departments, per-question quiz rates by department, completion, self-check templates and volumes, speak-up reports, help desk questions, the v2.2 clarification draft |
| `data/expected_results.json` | Engine output: twelve self-check cases, quiz answers, five scoring runs, program totals |

The build step wraps the JSON as `js/data.js` (`window.JA09 = {...}`) so the page works from `file://`.

---

## Known answers

Run live in the **Checks** panel; each shows expected, actual, pass or fail.

| ID | Case | Expected |
|---|---|---|
| K1 | Customer data, public chatbot, summarize | Not approved · R5 · 4.3, 3.2 · "Use Support Copilot instead." |
| K2 | Customer data, company AI assistant, summarize | Not approved · R6 · 3.3 · "Use Support Copilot instead." |
| K3 | Customer data, Support Copilot, reply, reviewed | With conditions · 3.3, 6.1, 6.2 · minimum fields, no card/bank/ID numbers, a person reviews and sends |
| K4 | Customer data and card numbers, Support Copilot | Not approved · R1 · 3.4 |
| K5 | Published content, public chatbot, draft | With conditions · 4.3, 6.2 · no company login, published content only, check facts |
| K6 | Source code, code assistant | Approved · 6.2 |
| K7 | Source code with an API key, code assistant | Not approved · R1 · 3.4 |
| K8 | Employee records, company AI assistant, rank people | Not approved · R2 · 5.1, 2.1 |
| K9 | Customer reply sent automatically, no review | Not approved · R8 · 6.1 |
| K10 | NoteHawk takes meeting notes | Not approved · R4 · 4.2 · "Use the company AI assistant's meeting notes, and tell everyone first." |
| K11 | Company assistant meeting notes, attendees not told | Not approved · R9 · 6.3 |
| K12 | Company assistant meeting notes, attendees told | With conditions · 6.3, 6.2 |
| K13 | Quiz answer key | 2 Approved (Q3, Q8), 3 With conditions (Q1, Q5, Q10), 7 Not approved |
| K14 | Scoring runs | Perfect 1,650, AI Champion · perfect with 2 hints 1,600 · 10 correct (miss Q4, Q11) 1,180, AI Navigator, passed · 9 correct 990, not passed · none 0, AI Explorer |
| K15 | Program totals | 4,200 people; 3,150 attempts (75%); 1,516 passed (36% attested); quiz average 77.7%; 5,391 checks: 2,775 Approved, 1,880 With conditions, 736 Not approved (13.7%) |
| K16 | Departments | Sales 82.9% quiz, 331 of 871 Not approved (38%), 212 NoteHawk; Customer Support 73.9% quiz, 75 of 1,445 (5.2%); Operations 41% completion, 6.6% attested |
| K17 | Mistakes and reasons | Q4 missed by 54.3%; Not approved by rule: R4 349, R6 157, R5 92, R1 60, R8 56, R2 22 |
| K18 | People and grammar | 23 reports: 15 coached, 3 no issue, 5 open, 12 anonymous, 0 disciplinary; committee-only publish, proposer can't approve; attest only after passing; no points for reports; counts of 0 and 1 read correctly ("1 point", "0 badges", "1 report", "1 question left") |

---

## Visual scheme 11 · Confetti Grid

A new light scheme for builds after all ten originals are used. It's added to the template's scheme list.

| Token | Value |
|---|---|
| Mode | Light |
| Background / surface | `#FFFAF0` warm ivory / `#FFFFFF` |
| Text | `#1F1A3D` ink indigo (secondary `#5B5675`, faint `#9A96AE`) |
| Accent / second | `#4F46E5` indigo / `#F5A524` sunflower (points, streaks, badges) |
| Chart series | `#4F46E5` `#F5A524` `#0EA5A4` `#E5487D` `#64748B` |
| Verdicts | Approved `#15803D` on `#DCFCE7` · With conditions `#B45309` on `#FEF3C7` · Not approved `#DC2626` on `#FEE2E2`, always with an icon and a word |
| Fonts | Bricolage Grotesque (headings) + Red Hat Mono (numbers, clause IDs), bundled locally from npm |
| Pattern | Body background only: a 24px dot grid (ink at 7%), plus a 240px tile of sparse confetti (small rotated dashes, rings and triangles in the series colors at 16%), both as inline SVG data URIs. Cards stay solid white so text never sits on the pattern. Off in print. |

---

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Confetti Grid scheme, pattern, stamp and confetti animations, print styles |
| `js/data.js` | Policy, quiz and program data, wrapped from `data/*.json` |
| `js/engine.js` | Self-check rules, scoring, badges, program aggregates (pure functions) |
| `js/app.js` | Views, quiz game, dashboard, approvals, checks, log |
| `tools/reference_model.py` | The Python model behind every number; `python3 tools/reference_model.py data` regenerates the JSON |
| `tools/wrap-data.js` | Wraps `data/*.json` into `js/data.js` |
| `tools/check-engine.js` | Confirms the JavaScript engine matches the Python model |
| `assets/fonts/` | Bricolage Grotesque and Red Hat Mono (SIL Open Font License) |
| `data/` | Source JSON and expected results |

---

## Build decisions

The prototype was built with these defaults for the open questions below. Each is easy to change.

* Self-checks earn 10 points each, for new checks only, up to 5 a day; points go to the employee persona only.
* Passing is 10 of 12 correct; Data Guardian separately rewards the three restricted-data questions.
* The team challenge stays and shows department completion only.
* The v2.2 clarification is treated as not material: no one has to attest again.
* Fast-forward appears only in presenter mode.

## Open questions for Aby

1. Points for self-checks (+10, up to 5 a day): keep them, or reserve points for the quiz so checking never feels like a game to farm?
2. Should passing require 10 of 12, or all three restricted-data questions plus 8 others?
3. Keep the team challenge, which shows department completion only, or drop it to avoid any sense of public pressure?
4. Should v2.2 require everyone to attest again, or only for material changes? The prototype treats the 6.3 clarification as not material.

---

## Appendix A · AI Acceptable Use Policy v2.1

**AI Acceptable Use Policy** · Version 2.1 · Effective Oct 14, 2026 · Owner: AI Governance Committee · Review: every 6 months, or when a tool or rule changes.

**1. Why this policy exists**
* **1.1** AI tools help us work faster. This policy tells you which tools to use, what data can go into them, and what stays human.
* **1.2** It applies to everyone who works for us, on any device, whenever company or customer information is involved.

**2. Five principles**
* **2.1** AI helps; people decide.
* **2.2** Protect data: only put in what the tool is approved for.
* **2.3** You own the output: check it before you use it.
* **2.4** Be open about AI use when it matters to the reader.
* **2.5** Speak up when something looks wrong.

**3. Data: what can go where**
* **3.1** Every piece of information has a class: Public, Internal, Confidential or Restricted.
* **3.2** Use a tool only for data up to the class it's approved for (see the table).
* **3.3** Restricted data goes only into a tool approved for that exact data and task. Today that's Support Copilot, for customer data in support work.
* **3.4** Never put passwords, keys, tokens, payment card numbers, bank account numbers or government ID numbers into any AI tool.

**4. Tools**
* **4.1** Use the approved tools first. They run on our enterprise accounts and don't train on our data.
* **4.2** Blocked tools (for example NoteHawk and TabGenie AI) must not be used, even if a customer or supplier invites them.
* **4.3** Public chatbots with personal accounts: published content only, never signed in with a company email.
* **4.4** Need a tool that isn't listed? Request it through AI vendor intake. Don't start with a free trial.

**5. Never use AI to**
* **5.1** Make or recommend decisions about people: hiring, firing, pay, promotion or discipline.
* **5.2** Imitate a real person's voice, face or writing without their written consent.
* **5.3** Get around security controls, monitoring or this policy.
* **5.4** Monitor or profile colleagues.

**6. Your responsibilities**
* **6.1** A person reviews anything AI drafts before it reaches a customer.
* **6.2** Check facts, figures, code and sources. AI output is your work once you use it.
* **6.3** Tell everyone in a meeting before AI takes notes, and delete recordings within 30 days.
* **6.4** Label AI-generated images and media in external content.

**7. Speak up**
* **7.1** If you see AI used against this policy, talk to the person, ask the AI help desk, or report it. Anonymous reports are welcome.
* **7.2** Reports start with coaching, not discipline. Retaliation against anyone who speaks up is not allowed.
* **7.3** Never forward or screenshot the sensitive data itself when you report.

**8. Exceptions**
* **8.1** Ask the AI Governance Committee for an exception with a business reason, an owner and an end date. Wait for approval before you start.

**What can go where**

| Data | Class | Company AI assistant | Support Copilot | Code assistant | Design tool AI | Public chatbot, personal account | NoteHawk meeting bot | TabGenie AI extension |
|---|---|---|---|---|---|---|---|---|
| Published content | Public | ✓ | ✓ with conditions | ✓ | ✓ | ✓ with conditions | ✕ | ✕ |
| Internal documents | Internal | ✓ | ✓ with conditions | ✓ | ✓ | ✕ | ✕ | ✕ |
| Plans and contracts | Confidential | ✓ | ✕ | ✓ | ✕ | ✕ | ✕ | ✕ |
| Source code | Confidential | ✓ | ✕ | ✓ | ✕ | ✕ | ✕ | ✕ |
| Customer personal data | Restricted | ✕ | ✓ with conditions | ✕ | ✕ | ✕ | ✕ | ✕ |
| Employee records | Restricted | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Unreleased financials | Restricted | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Passwords and keys | Restricted | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Card, bank and ID numbers | Restricted | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |

Support Copilot is for support work only (replies and summaries), so a person always reviews its customer replies. The design tool's AI is for drafting and images.

**Tools**

| ID | Tool | Status | Up to | Purposes | Note |
|---|---|---|---|---|---|
| T1 | Company AI assistant | Approved | Confidential | Any | Enterprise tenant with single sign-on. Prompts aren't used for training and are kept 30 days. Includes meeting notes. |
| T2 | Support Copilot | Approved | Internal, plus customer personal data | Reply to a customer, Summarize or analyze | Built into the support desk. Approved for customer personal data in support work only. |
| T3 | Code assistant | Approved | Confidential | Write or review code, Summarize or analyze | Enterprise license on company repositories. Code isn't used for training. |
| T4 | Design tool AI | Approved with limits | Internal | Draft or edit writing, Create images or visuals | AI features in the company design tool. Internal and public content only. |
| T5 | Public chatbot, personal account | Public content only | Public | Any | Any consumer AI chatbot used with a personal account. Published content only. |
| T6 | NoteHawk meeting bot | Blocked | – | – | Free meeting note-taker. Blocked by the AI Governance Committee (blacklist v3.2, BL-06). |
| T7 | TabGenie AI extension | Blocked | – | – | Browser extension that reads every page you open. Blocked (blacklist v3.2, BL-04). |

**Version history:** v2.0, Apr 1, 2026: added Support Copilot for customer data; added the five principles. v2.1, Oct 14, 2026: blocked NoteHawk and TabGenie AI (blacklist v3.2); added 4.2 and 6.3.

**Proposed v2.2 (pending committee approval):** "Customer call summaries: Support Copilot may summarize recorded support calls when the customer was told the call is recorded. Use the company AI assistant for internal calls only. NoteHawk stays blocked, even when a customer or supplier brings it."

## Appendix B · Quiz

| ID | Scenario | Answer | Clauses | Missed by |
|---|---|---|---|---|
| Q1 | Rewrite our published press release in a public chatbot, signed in with your personal account. | With conditions | 4.3, 6.2 | 24% |
| Q2 | Paste this quarter's results, out next week, into the company AI assistant to draft talking points. | Not approved | 3.3 | 15% |
| Q3 | Ask the code assistant to review a pull request with no secrets in it. | Approved | 6.2 | 8% |
| Q4 | Upload a list of 2,000 customer emails to the company AI assistant to plan a campaign. | Not approved | 3.3 | 54% |
| Q5 | Support Copilot drafts a reply to a customer complaint. You edit and send it. | With conditions | 3.3, 6.1, 6.2 | 24% |
| Q6 | A supplier invites NoteHawk to your call. You let it take notes. | Not approved | 4.2 | 31% |
| Q7 | Use the company AI assistant to rank 300 job applicants by résumé. | Not approved | 5.1, 2.1 | 12% |
| Q8 | Ask the company AI assistant to summarize an internal process doc. | Approved | 6.2 | 4% |
| Q9 | Paste a config file with an API key into the code assistant to debug it. | Not approved | 3.4 | 17% |
| Q10 | The company AI assistant takes notes in your team meeting. You told everyone at the start. | With conditions | 6.3, 6.2 | 30% |
| Q11 | TabGenie AI, a browser extension, summarizes a customer contract for you. | Not approved | 4.2 | 38% |
| Q12 | Set up the company AI assistant to send replies to customer emails automatically. | Not approved | 6.1 | 9% |

**Badges:** Data Guardian (Q2, Q4 and Q9 correct) · Clean Streak (five in a row) · Policy Reader (open five policy sections) · Speak-up Ally (flip all three Speak up cards) · Certified (10 of 12; unlocks attestation).

## Appendix C · Departments, last 30 days

| Department | Headcount | Quiz completion | Quiz average | Passed | Attested | Self-checks | Not approved | Share |
|---|---|---|---|---|---|---|---|---|
| Finance | 310 | 90% | 78% | 137 | 44% | 325 | 70 | 22% |
| HR | 180 | 97% | 81% | 101 | 56% | 143 | 28 | 20% |
| Sales | 820 | 71% | 83% | 388 | 47% | 871 | 331 | 38% |
| Marketing | 260 | 88% | 79% | 120 | 46% | 549 | 69 | 13% |
| Engineering | 1,150 | 79% | 78% | 445 | 39% | 1,510 | 100 | 7% |
| Customer Support | 720 | 83% | 74% | 206 | 29% | 1,445 | 75 | 5% |
| Legal | 90 | 96% | 84% | 60 | 67% | 89 | 4 | 4% |
| Operations | 590 | 41% | 66% | 39 | 7% | 395 | 45 | 11% |
| Executive | 80 | 64% | 75% | 20 | 25% | 64 | 14 | 22% |
| **Total** | **4,200** | **75%** | **78%** | **1,516** | **36%** | **5,391** | **736** | **14%** |

**Speak-up reports (23):** blocked tools 11, non-public data in a public chatbot 4, customer reply without review 3, data above the tool's approval 2, never-allowed data 2, decisions about people 1. Status: 15 coached, 3 no issue found, 5 open. 12 anonymous; in 8 the reporter talked to the person first.

**Top help desk questions (123):** customer call summaries 41 (6.3) · NoteHawk on a supplier's call 33 (4.2) · résumé keyword screening 18 (5.1) · dashboard screenshots in a chatbot 15 (3.2) · code assistant on open-source projects 9 (4.1) · labeling AI images in internal decks 7 (6.4).
