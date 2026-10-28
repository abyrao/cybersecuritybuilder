# OC-05 · Orphaned Account Finder

**Build type:** Script (with a review workflow) · **Mindset shift:** Ownership and craft · **Owner:** Aby Rao
**Visual scheme:** 9 · Plum & Gold (all ten schemes are in use; drawn at random from the least-used, excluding the two most recent builds' schemes)
**Status:** Requirements ready · Prototype not yet built

Requirements from Aby's brief on Oct 28, 2026, mapped to the ten build questions in the master template (`claude/Builder_Prototype_Template.md` in the project). Aby confirmed the open decisions on Oct 28, 2026 (see Decisions). Items still marked *(assumed)* are seed values and weights the prototype may tune.

Slide 19, tile 5 reads "Orphaned account finder: HR terminations against Okta or Active Directory." This build is the full version of that tile.

---

## The point of this build

Every organization has a deprovisioning process. Few check whether it worked. This build compares HR terminations with every directory and app on a schedule, finds the accounts that outlived their owners (including service accounts whose owner left), shows what each one can reach in business terms, and gets them closed after a quick human review.

| | Operator | Builder |
|---|---|---|
| **Check** | Quarterly export, VLOOKUP against an HR list | Daily run across 2 domains, the cloud directory, SSO, and 7 apps |
| **Matching** | Match on name | Match on employee ID, then email, then name, with confidence and known traps (rehires, conversions, name twins) |
| **Service accounts** | Out of scope | Owner checked against HR; an orphaned service account is reassigned and rotated, not deleted |
| **Risk** | A list of usernames | What each account can reach, in business terms, scored with a "Why?" |
| **Removal** | A ticket per account, closed when someone says it's done | Card review in seconds, two-person approval where it matters, removal verified on the next run |
| **Upkeep** | Repeat next quarter | Shows which system keeps leaking orphans and proposes the upstream fix |

The ownership and craft moment: **the finder fixes the leak, not just the puddle.** It shows that most orphans come from two systems the HR feed never reached, and tracks the fix.

---

## Build answers

**1. What are we building?**
The Orphaned Account Finder, build 5 on the Ownership and craft wall (slide 19, tile 5). It aggregates accounts from directories and apps on a schedule, matches them against HR terminations and service account owners, flags orphans with a risk score, and runs an approve-then-remove workflow.

**2. What's the problem today?**
* HR terminates a person; IT disables the main directory account; app accounts, a second domain from an acquisition, and anything not behind SSO stay live.
* Service accounts list a human owner. When that person leaves, nobody inherits the account, and its password stops being rotated.
* Checks are periodic and manual, so an orphan can sit open for a quarter.
* Removal is a ticket queue with no proof the account was actually removed.

**3. Who uses it, and what do they decide?**
* **IAM analyst:** approves, edits, or rejects each proposed action (disable, remove, reassign owner).
* **System owner or manager:** the second approver for privileged, executive, and service accounts; picks the new owner of an orphaned service account.
* **Deputy CISO:** decides which upstream fix to fund (connect a system to the HR feed, move an app behind SSO).
* **Security operations:** decides whether post-termination activity becomes an incident.

**4. What fictional data should it use?** *(volumes assumed)*
A fictional company, Harborline HCM (also used in OC-04), about 4,200 employees. Run date Oct 28, 2026.

| Source (generic name · real-name toggle) | Contents | Volume |
|---|---|---|
| HR system · Workday | Employee ID, name, department, manager, status, term date, type (voluntary, involuntary, contract end), legal hold flag | 4,200 active · 312 terminations since Apr 1, 2026 |
| Directory, corp · Active Directory `corp.harborline.local` | User and service objects, enabled flag, groups, last logon, password last set, owner attribute | 5,140 users · 640 service accounts |
| Directory, Larkspur · Active Directory `larkspur.local` | Acquired Mar 2025; trusted by corp; **not on the HR feed** | 610 users · 85 service accounts |
| Cloud directory · Entra ID | Users, roles, sign-ins | 5,020 users |
| SSO · Okta | Users, app assignments, last sign-in | 4,980 users |
| Planning app · Anaplan | Models, integration users, write access to forecast versions | 180 users · 6 integration accounts |
| Finance app · NetSuite | **Not behind SSO;** local accounts and roles | 340 users |
| CRM · Salesforce | Users, profiles, report exports | 1,150 users |
| Code repository · GitHub | Org members, admin rights | 620 users |
| Cloud console · AWS IAM | IAM users, access keys, last used | 210 users |
| Ticketing · Jira | Users, admin rights | 2,900 users |

Seeded findings: **81 flagged accounts**

| Category | Count | Default action |
|---|---|---|
| Orphaned person accounts (29 people) | 47 | Disable now, remove after 30-day hold |
| Orphaned service accounts (owner terminated) | 11 | Reassign owner and rotate credential |
| Unowned accounts (no HR match, no owner) | 23 | Find an owner within 14 days, then disable |

Orphaned person accounts by system: corp 6 · Larkspur 8 · cloud directory 3 · SSO 2 · finance 9 · CRM 7 · code 5 · cloud console 4 · ticketing 3.

Six trap records the finder must handle correctly: a rehire, a contractor converted to employee, two people with the same name, a leave of absence, a shared mailbox, and a legal hold (see known-answer cases).

**5. What business context does it add that the tools don't know?**
* Who owns each service account, and whether that person still works here.
* What each account can reach in business terms: the financial forecast, vendor payments, customer records, production cloud.
* The finance calendar (month-end close Oct 30; Q4 forecast review with the board Nov 5, 2026) and which accounts those depend on.
* Termination type and legal hold, without any detail on the reason.
* Which systems are connected to the HR feed and which are behind SSO.

**6. What should the demo reveal?**
* **Headline: the riskiest orphan isn't a person.** `svc-fpa-sync` loads general ledger actuals into the financial planning application every night and can write forecast versions. Its owner, a finance systems engineer, left 41 days ago. Its password is 790 days old, and it signed in 3 days ago, because the nightly load still needs it. Deleting it would stop the load before the Q4 forecast review on Nov 5; leaving it means nobody owns an account that can change the forecast the board sees. The right action is reassign and rotate.
* A former Larkspur system administrator, involuntarily terminated 58 days ago, is still enabled with domain admin rights in a domain the corp domain trusts.
* 9 of 47 person orphans are in the finance app, which isn't behind SSO. One former accounts payable clerk can still create and approve vendor payments.
* A former sales lead exported a customer report from the CRM 5 days after termination.
* Root cause: 17 of 47 (36%) come from two systems the HR feed doesn't reach. Median time to remove: same day behind SSO, 34 days in the finance app.

**7. What will I click during the demo?**
1. Open the **Ghost Map**; watch terminations fade in and live tethers light up.
2. Click the brightest ghost: `svc-fpa-sync`.
3. Open **Blast Radius**; see the general ledger, the forecast model, and the Nov 5 board review.
4. Click **Why?** on the score of 96.
5. In **Review**, choose **Reassign**, pick the new owner, approve as analyst, then as system owner; watch the credential rotate (simulated).
6. Press **Approve batch** on 31 standard orphans.
7. Open **Leaks**; see the two systems behind 36% of orphans and accept the upstream fix.

**8. What does the AI do, and where must a person approve?**
* **Simulated AI:** suggests name matches when IDs are missing (with confidence); proposes a new owner for orphaned service accounts from group membership and recent use; writes a plain-language "Why?" for each score; drafts the upstream fix proposal.
* **People approve:** every action before it runs. One analyst for standard orphans; two people (analyst plus system owner or manager) for privileged, executive, and service accounts. Name-only matches never go to removal without review. Nothing is deleted while a legal hold is set.

**9. How will I know it's right?** See known-answer cases below.

**10. What should it not do?**
* Connect to real directories or apps, or remove anything for real.
* Delete a service account that was used in the last 7 days.
* Remove an account on a name match alone.
* Show termination reasons, performance details, or anything from HR beyond the fields listed in question 4.
* Replace the identity governance tool; it checks the tool's results.

---

## User interface concept

A light, editorial interface in Plum & Gold. Plum for structure; gold reserved for the single most important finding on each screen. Every view answers one question.

| View | Question it answers | What's on screen |
|---|---|---|
| **Ghost Map** (home) | Who left, and what did they leave behind? | The org as a constellation of departments. Terminated people appear as translucent ghost nodes; each live account is a glowing tether from the ghost to the system it lives in. Tether thickness = privilege; glow = days since termination. Service-account ghosts are drawn as gears. One counter: **81 accounts outlived their owners.** |
| **Departure** | How did one exit actually go? | Swimlanes from the termination date, one per system. Each lane ends when the account was disabled; lanes still open keep growing in gold, labeled "still open, 58 days". |
| **Blast Radius** | What can this account reach? | Concentric rings: account → groups and roles → apps and data → business processes (board forecast, vendor payments, customer records, production cloud), with counts in business terms ("FY27 operating plan", "12 forecast versions", "38,000 customer records"). |
| **Review** | What do we do about it? | A card deck. Each card: who, where, score, top reason, proposed action. Keys **D** disable, **R** reassign, **K** keep with reason, **Enter** approve. Low-risk cards group into one batch. Two-person cards show both approval slots. |
| **Leaks** | Why do orphans keep appearing? | A pipe diagram from HR to each system; systems the HR feed or SSO doesn't reach drip orphans into a basin. Bar chart of median days to remove by system. The upstream fix, drafted by the simulated AI, with an **Accept fix** button. |
| **Runs** | Is it getting better? | Daily run calendar, 12-week trend of open orphans and exposure days, next run countdown, and the match-rule log (what changed and why). |

Always present: generic/real tool names toggle, **Reset**, **Presenter** mode, activity log drawer, and the required footer.

Motion: ghosts fade in on load; tethers pulse once when lit; a tether snaps and fades when its account is disabled; the Ghost Map counter ticks down after each approval.

---

## Functional requirements

* **FR-1 Aggregate:** load all eleven sources; show per-source counts, last pull time, and whether the source is on the HR feed and behind SSO.
* **FR-2 Match:** employee ID first, then email or UPN, then name (simulated AI, with confidence). Below 85% confidence goes to review, never to removal. Rehires and conversions match on the newest employee record.
* **FR-3 Classify:** orphaned person account, orphaned service account, unowned account, or excluded (with reason). Excluded records stay visible with their reason.
* **FR-4 Score (0–100) with "Why?":** privilege (up to 35), business reach (up to 25), days since termination (up to 15), activity after termination (15), credential older than 365 days (5), involuntary termination (5). *(weights assumed)*
* **FR-5 Ghost Map, Departure, Blast Radius:** as described above; every node, lane, and ring opens its detail.
* **FR-6 Review and approve:** card deck, keyboard actions, batch approval for standard orphans, two-person approval for privileged, executive, and service accounts. Rejections need a reason.
* **FR-7 Act (simulated):** disable, remove from groups, revoke sessions and access keys, move to a disabled container, schedule deletion after a 30-day hold. Service accounts: assign new owner and rotate credential through the vault (simulated). Legal hold: disable only.
* **FR-8 Verify:** the next simulated run confirms each action; an account still live after approval is flagged "not removed" and returns to the deck.
* **FR-9 Investigate:** activity after termination adds an **Investigate** badge and creates a security operations hand-off (simulated) alongside the disable.
* **FR-10 Leaks and Runs:** root cause by source, median days to remove by system, accepted fixes, trend over 12 runs.
* **Template requirements:** offline from `index.html`, local fonts and libraries, reset, **Why?** on every flag and score, human approval before any action, visible activity log, presenter mode, persistent footer, plural-safe copy, checked at 1920×1080 and 1366×768.

---

## Known-answer cases

| # | Case | Expected |
|---|---|---|
| 1 | `svc-fpa-sync`, owner terminated Sep 17, used Oct 25 | Orphaned service account, score 96; default **Reassign + rotate**; delete disabled ("used in the last 7 days"); two approvals required |
| 2 | Larkspur system administrator, involuntary, Aug 31 | Score ≥ 90; domain admin shown in Blast Radius; two approvals |
| 3 | Former accounts payable clerk, finance app | Flag reads "can create and approve vendor payments" |
| 4 | Former sales lead, CRM report export 5 days after termination | **Investigate** badge and security operations hand-off |
| 5 | Rehire (terminated May 2, rehired Sep 8, new employee ID) | Not flagged; excluded as "Rehired" |
| 6 | Contractor ended Jul 31, employee from Aug 1 | Not flagged; excluded as "Converted" |
| 7 | Two people named Chris Morgan, one terminated | Active Chris's accounts never matched; name-only match goes to review |
| 8 | Leave of absence | Not flagged |
| 9 | Legal hold | Flagged; **Disable** allowed; delete blocked with reason |
| 10 | "All clean" data toggle | "No orphaned accounts found"; at 1 the copy reads "1 account" |

---

## Related builds

* **JA-07** (action log for automated account disablement) and **JA-08** (human approval before disabling executive or service accounts) cover the accountability side. OC-05 includes its own log and approval step so it stands alone; no dependency.

## Decisions (confirmed by Aby, Oct 28, 2026)

1. Fictional company: Harborline HCM, shared with OC-04.
2. Headline: an orphaned service account tied to the financial planning application (`svc-fpa-sync`), not payroll.
3. Deletion follows a 30-day hold after disable.
4. Inactive accounts of current employees (no sign-in for 90+ days) are out of scope.
5. Generic tool names by default, with a real-name toggle as in JA-01.
