# OC-01 · SOC 2 Audit Evidence Collector

**Build type:** Workflow · **Mindset shift:** Ownership and craft · **Owner:** Aby Rao
**Visual scheme:** 1 · Paper & Signal (drawn at random; the previous build used 8)
**Status:** Prototype built (see README.md)

Requirements captured from Aby's voice notes on Oct 26, 2026, mapped to the ten build questions in the master template (`claude/Builder_Prototype_Template.md` in the project).

## Build answers

**1. What are we building?**
A SOC 2 audit evidence collector, the first build on the Ownership and craft wall.

**2. What's the problem today?**
Internal auditors gather SOC 2 evidence across many systems and owners, then rebuild status reports by hand. There's no single place to collect, review, and track it.

**3. Who uses it, and what do they decide?**
IT auditors, especially internal auditors. They decide what evidence to request, accept, or raise as an exception, and they report status and effort to stakeholders.

**4. What fictional data should it use?**
Enough that it looks like a tool already in use, not a brand-new one:
* 41 controls across all SOC 2 categories (CC1–CC9, Availability, Confidentiality), with owners, frequency, test type, and sample size.
* 101 evidence items: policies, exports, configs, tickets, logs, screenshots, and reports from 12 connected sources (Okta, AWS Config, GitHub, Jira, Workday, CrowdStrike, ServiceNow, Confluence, Splunk, KnowBe4, a vulnerability scanner, and AWS Backup) plus owner uploads.
* A FY2026 Type II audit, period Oct 1, 2025 – Sep 30, 2026, with fieldwork Oct 5 – Nov 13, 2026.

**5. What business context does it add?**
Control owners and teams, due dates, fieldwork deadlines, and the auditor's pace, so status becomes a forecast, not just a count.

**6. What should the demo reveal?**
* At the current pace, fieldwork finishes about a week late.
* Two of three exceptions share one root cause: contractors offboarded outside Workday.
* One Okta access review export covers three controls.
* Three files predate the audit period and can't be accepted.

**7. What will I click?**
Overview → AI finding → Controls → a control → evidence preview → collect, request, accept, or record an exception → Evidence library → Report → Export CSV.

**8. What does the AI do, and where must a person approve?**
Simulated AI flags root causes, reused evidence, and stale files, and checks each file's period coverage and integrity hash. An auditor confirms every request, acceptance, and exception; an exception requires a written note.

**9. How will I know it's right?** *(assumed)*
Live checks in About: every control has evidence, every collected file has a hash, no stale file is accepted, every exception has a note, and status totals reconcile.

**10. What should it not do?** *(assumed)*
Connect to real systems, store real evidence, or replace the external auditor's opinion.
