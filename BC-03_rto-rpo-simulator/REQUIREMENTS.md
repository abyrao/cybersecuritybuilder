# BC-03 · RTO and RPO Tabletop Simulator

**Build type:** Simulator · **Mindset shift:** Business communication · **Owner:** Aby Rao
**Visual scheme:** 9 · Plum & Gold (drawn at random from the five schemes no build has used)
**Status:** Requirements ready

Requirements captured from Aby's notes on Oct 27, 2026, mapped to the ten build questions in the master template (`claude/Builder_Prototype_Template.md` in the project). Items marked *(assumed)* were filled in by Claude and need Aby's confirmation.

Every number in this document comes from the reference model in `data/`. The prototype must reproduce them exactly (see **Known answers**).

---

## Build answers

**1. What are we building?**
An RTO and RPO tabletop simulator for a fictional regional bank and payments company. It's build 3 on the Business communication wall and the template's worked example, scaled up: a full map of how the bank is built, RTO and RPO on every asset, and 20 failure scenarios a room can run together.

**2. What's the problem today?**
* RTO and RPO targets are set system by system, on paper, in a continuity plan nobody reads until an outage.
* Nobody sees the dependency chain. A service promises 2 hours while a system it depends on promises 24.
* Tested restore times and real backup ages drift away from the targets, and nobody notices.
* Tabletops are slideware: people talk through a scenario but never see what actually goes down, for how long, or what it costs.

**3. Who uses it, and what do they decide?**
* **Executives and service owners** (cards, payments, digital, branches, lending, treasury, finance) decide whether the current targets, backups, and recovery order are acceptable, and which gaps to fund or formally accept.
* **The continuity lead** facilitates the tabletop, captures decisions, and approves the memo that goes to the executive risk committee.
* **IT and security leaders** decide recovery order and where to invest (for example, decoupling backups from Active Directory).

**4. What fictional data should it use?**
A continuity plan export joined to a CMDB dependency map, plus backup and test records. All values are in `data/topology.json`:

| Source (simulated) | What it provides | Volume |
|---|---|---|
| Business impact analysis | 11 business services: RTO, RPO, maximum tolerable downtime, revenue per hour, customers, owner | 11 |
| CMDB and architecture diagrams | Assets in 9 layers, sites, and dependencies (hard, soft, either-or with switchover time) | 76 assets, 138 dependencies |
| Backup platform reports | Last good immutable backup per data store, job failures | 10 data stores and queues |
| DR test records | Failover time, tested restore time, last test date | 49 assets we recover ourselves |
| Vendor contracts | Third-party recovery commitments | 7 third parties, 7 SaaS services, 2 cloud regions |

Sites: primary data center (DC1), secondary data center 240 miles away (DC2), Cloud East, Cloud West (pilot light), SaaS, and third parties.

**5. What business context does it add that the tools don't know?**
* **Which business service each asset serves** and who owns that service.
* **Revenue and fees at risk per hour** for each service, and how many customers or transactions it touches.
* **Business calendar:** payroll Friday (ACH volume ×3), month-end close (treasury and finance ×1.5), holiday card peak from Nov 15 (cards ×1.4), business hours versus 24×7 services.
* **Regulatory clocks:** the federal banking 36-hour incident notification window, and the 4-hour threshold at which a bank service provider must tell the bank about a disruption. *(Show as reference markers; legal confirms before any real use.)*
* **Workarounds:** manual wire desk, offline teller mode, overflow call vendor, resending prior payroll files, each with a capacity and start time.
* **Recovery dependencies:** what you need *to restore* (backup console, admin credentials), not just what an app needs to run.

**6. What should the demo reveal?**
Headline finding:
* **The chain breaks the target, not the system.** In a ransomware scenario, wire transfers (target 2 hours) come back at **hour 56**, with **24 hours** of payment instructions lost. Wires wait on the payments database restore, which waits on the admin vault, which waits on the rebuilt VM cluster, which waits on the backup console, which signs in with **Active Directory**. AD forest recovery is estimated at 30 hours and **has never been tested**.

Supporting findings:
* **On paper:** 8 of 11 services promise an RTO that their own dependencies can't meet. There are 20 target inversions, such as core banking (2 h) depending on AD (24 h).
* **Two fixes, no new hardware:** a break-glass backup console plus a rehearsed AD recovery bring wires from 56 hours to 26.
* **Active-active isn't:** card authorization runs in both data centers, but both HSM units sit in the primary. Lose the primary site and card payments are down 48 hours against a 1-hour target.
* **Diverse isn't:** both ISPs and the private cloud link enter through the same street conduit. One fiber cut takes digital banking down for 20 hours.
* **Backups lag targets:** core banking's RPO is 3 minutes, but last night's backup job failed. Corruption replicates instantly, so the last good copy is 31 hours old.
* **Calendar matters:** a 6-hour ACH outage on payroll Friday costs $3.45M; the same outage on a Tuesday afternoon costs a third of that.

**7. What will I click during the demo?** *(assumed)*
1. **Map:** hover **Wire transfers**; its dependency tree lights up across all layers.
2. **Targets:** the "8 of 11" tile; click the AD inversion to see every service that inherits it.
3. **Simulate:** pick **Ransomware**, start Friday 07:00 (payroll Friday, month-end), press **Run**; watch the failure spread and scrub the clock to hour 56.
4. Click **Wire transfers** → **Why?** shows the critical path, gold on the map.
5. **Impact:** downtime and data-loss bars versus targets, cost to date, the 36-hour clock.
6. **Decide:** toggle **Break-glass backup console** and **Rehearse AD recovery**; wires drop from 56 h to 26 h (ghost bars).
7. **Draft memo** (simulated) → switch to the continuity lead → **Approve**.

**8. What does the AI do, and where must a person approve?** *(assumed)*
Simulated AI:
* Traces and explains the critical path for any service ("Why is this down?").
* Summarizes each scenario in business language: services down, hours over target, data lost, cost.
* Ranks fixes by hours saved and data loss avoided, using the same engine.
* Drafts the decision memo for the executive risk committee.

People approve:
* **Memo:** drafted by the AI, approved by the continuity lead before it's marked "sent." The person who edits the memo last can't approve it.
* **Accepting a gap:** the service owner, with a reason and a review date within 90 days. Accepted gaps stay visible in amber.
* **Changing a target or applying a fix:** what-ifs only project results. The baseline changes only after the asset owner approves, and the change is logged.
* **Tabletop decisions** (fail open or closed, activate a workaround) are recorded with who decided and at what hour.

**9. How will I know it's right?** *(assumed)*
Twelve known-answer checks, run live in the **Checks** panel. See **Known answers** below.

**10. What should it not do?** *(assumed)*
* Connect to any real CMDB, backup tool, or cloud.
* Model ransom payment, attacker behavior, or forensics timelines.
* Model limited recovery staff; restores run in parallel once their prerequisites are up (noted in the UI).
* Give legal advice on notification duties. Regulatory clocks are reference markers only.
* Use real vendor names for the bank's suppliers. Third parties are named by role.

---

## Views

One question per view. Top bar: **Map · Targets · Simulate · Impact · Decide**, shortcuts `1`–`5`.

| View | Question | Main visual | Interactions |
|---|---|---|---|
| **Map** | How is the bank built? | Layered dependency map: 9 lanes, site bands, 76 nodes, animated traffic along healthy links | Hover or pick a service to light its tree; layer and site toggles; zoom, pan, minimap; click a node for its drawer |
| **Targets** | Do our targets hold on paper? | Four tiles (paper RTO misses, inversions, untested, single points); target vs tested scatter; inversion list | Click a tile to filter the map; click an inversion to see inheriting services |
| **Simulate** | What breaks, and when is it back? | Same map in failure mode; clock scrubber; service status rail with countdown to each RTO | Scenario library (20 cards); custom fail; start day, time, month; play, pause, speed; injects and decisions |
| **Impact** | What does it cost the business? | Mirrored timeline: data lost to the left of hour 0, downtime to the right, RPO and RTO markers per service; cumulative cost curve; regulatory clocks | Hover bars for numbers; toggle workarounds; compare to baseline |
| **Decide** | What do we fix or accept? | Fix list ranked by hours saved; ghost bars for what-ifs; memo card | Toggle what-ifs; accept gap; draft memo (simulated); approve |

### Map

Layout is fixed by the data, not force-directed, so the room sees the same picture every time.

* **Lanes, top to bottom:** Business services · Applications · Integration · Data · Shared services · Platforms · Network · Facilities. **Third parties** sit in a column on the right, with lines into the lanes that use them.
* **Site bands, left to right:** DC1 · DC2 · Cloud East · Cloud West · SaaS. Faint background bands with labels.
* **Customer endpoints** above the services lane, for context only: 410,000 cardholders, 380,000 online users, 6,200 business clients, 62 branches, 240 ATMs.
* **Links:** hard dependency solid; soft dependency dashed; either-or group drawn as a fork through a small diamond labeled with the switchover time (for example "2 h").
* **Nodes:** rounded card with icon, name, and two chips (RTO, RPO). A dot shows test status: tested within 12 months, older, or never.
* **Healthy animation:** small dots flow from services down to the assets they use, slow and subtle.
* **Focus:** hover or choose a service and everything outside its dependency tree fades to 15%.
* **Node drawer:** owner, site, tier, targets, failover time, tested restore time, last test, last good backup, what it depends on, what depends on it, which services inherit it, and its paper RTO. **Why?** explains any flag.

### Targets (static validation, no failure needed)

* **Paper RTO:** for each service, the worst target RTO on its dependency chain. An either-or group counts as the faster of its primary's chain or the switchover (no faster than the alternate's own chain). Misses show as `target 2 h · chain 24 h`.
* **Target inversions:** any asset whose direct hard dependency has a longer target RTO.
* **Tested vs target:** scatter of target RTO (x) against tested restore time (y), with the diagonal; points above the line are gaps. Second scatter for RPO against last good backup age.
* **Untested:** never tested, or last tested before October 2025 (more than 12 months ago).
* **Single points:** run an outage on each asset alone; list any asset whose outage pushes a service past its RTO.

### Simulate

* **Scenario library:** 20 cards (see Appendix B), filterable by Cyber, Operational, Facilities, Third party. Each card shows the seeds, default start, and a one-line setup.
* **Start time:** day and hour within the reference week of Mon Oct 26 to Sun Nov 1, 2026 (Fri Oct 30 is payroll Friday and the last business day of the month), plus a month override for holiday peak.
* **Run:** seeded assets flash; the failure spreads to dependents one hop every 150 ms; a counter shows assets down.
* **Clock:** scrubber from hour 0 to 12 hours past the last recovery; play at 1, 4, or 12 sim-hours per second.
* **Node states:** healthy, down, failing over, restoring (progress ring), waiting on a prerequisite (hourglass), degraded (soft dependency down), recovered.
* **Service rail:** each service with a bar counting toward its RTO marker; turns accent when it passes it.
* **Critical path:** click a service → **Why?** → the gold path on the map, plus a plain-language chain (simulated).
* **Injects:** cards appear at their hour with a discussion prompt and a notes field for the facilitator.
* **Decisions:** fraud fail open or closed (SC04, SC17) and workarounds (ACH, wires, branches, contact center) are toggle cards. Each records who decided and at what hour.
* **Custom:** click any node → **Fail** → mode (outage, corruption, compromise, vendor outage with hours). Combine several.

### Impact

* **Mirrored timeline**, one row per service: left bar = hours of data lost (with RPO tick); right bar = hours down (with RTO and maximum tolerable downtime ticks). Overruns in accent.
* **KPI tiles:** services down, worst overrun, data lost, cost, transactions to rebuild.
* **Cost curve:** cumulative cost across the clock, stepped by business hours and calendar multipliers.
* **Regulatory strip:** 36-hour notification marker from the hour the facilitator marks "incident determined" (default hour 1 for cyber scenarios); 4-hour vendor notice marker for third-party scenarios.

### Decide

* **What-ifs** (from `topology.json`): break-glass backup console, rehearse AD recovery, second HSM pair in DC2, diverse fiber entry, 4-hour immutable backups, warm fraud standby. Each re-runs the engine; ghost bars show the projection.
* **Fix ranking:** hours saved across all services and data loss avoided for the current scenario.
* **Gap acceptance:** service owner, reason, review date.
* **Memo (simulated):** one page: scenario, what broke, the chain, cost, the two fixes that matter most, and asks. Download as Markdown.

### Global
Reset, presenter mode (larger type), activity log, Checks panel, "simulated" tag on every AI output, persona switcher ("Viewing as": Facilitator, Continuity lead, Head of Payments, CISO), and the required footer on every view.

---

## Recovery engine

Pure functions, no browser dependencies, in `js/engine.js`. All times are hours from failure (hour 0).

**Inputs:** nodes, seeds (`{node, mode, duration?}`), active what-ifs.

**Own recovery for a seeded node**
| Mode | Recovery | Data lost |
|---|---|---|
| `outage`, `site` with a failover time | failover time | replication lag |
| `outage` without failover, `corruption`, `compromise` | start + tested restore time, where start = latest `up` of its recovery dependencies | age of last good backup |
| Any seed with `duration` (vendor outage, fiber repair) | duration | 0 |

Recovery dependencies default to the backup console (H10) and the admin vault (H04) for on-premises assets; the VM clusters and the admin vault need only the backup console; AD and the backup console need nothing.

**When a node is back up**
* `up(node) = max(own recovery, up of each hard dependency)`.
* Either-or group: `min(up(primary), max(up(alternate), switchover))`. If the primary never failed, the group is up at 0.
* Data stores that switch to an alternate lose their replication lag.
* Soft dependencies mark a node degraded, not down.
* Data lost for a service = the largest data loss among assets in its dependency tree.
* A service meets its target when `up ≤ RTO` (equal counts as met).

**Critical path:** from a service, follow the dependency (or recovery dependency) that set its `up` time until reaching a seed.

**Cost**
* `cost = Σ revenue per hour × hour weight × calendar multiplier`, in 15-minute steps across the outage.
* Hour weight: 24×7 services 1.0 from 07:00 to 22:00, 0.4 overnight. Business-hours services 1.0 on weekdays 08:00–18:00, otherwise 0.
* Workaround active: cost × (1 − capacity) after its start hour.
* Transactions to rebuild: transactions per hour across the data-loss window before hour 0, same weights.
* Fraud fail open: card payments stay up; exposure $18,000 per hour of fraud downtime (fictional). Fail closed: card authorization treats fraud detection as a hard dependency.

The engine must not have cycles; the data loader rejects any cycle and names it.

---

## Data files

| File | Contents |
|---|---|
| `data/topology.json` | 76 nodes (assets and services) with lane, site, tier, targets, failover, restore, backup age, last test, dependencies, recovery dependencies, owner, notes; business service revenue, profile, customers, workarounds; 6 what-ifs |
| `data/scenarios.json` | 20 scenarios: category, default start, seeds, suggested what-if, injects |
| `data/expected_results.json` | Engine output for every scenario: per service hours down, data lost, gaps, critical path, cost |

Browsers block `fetch()` from `file://`, so the build step wraps each JSON file as `js/data.js` (`window.BC03 = {...}`). The JSON stays the source of truth.

---

## Known answers

Run live in the **Checks** panel; each shows expected, actual, pass or fail.

| ID | Case | Expected |
|---|---|---|
| K1 | No failures | All 11 services up; cost $0 |
| K2 | SC01 ransomware: wire transfers | Back at 56 h (target 2 h); 24 h of data lost; path S04 → A05 → A04 → D03 → H04 → P01 → H10 → H01 |
| K3 | SC01 + break-glass console + rehearsed AD | Wires back at 26 h; card payments 16 h |
| K4 | SC02 core banking DB corruption | Digital banking down 14 h with 31 h of data lost (192,600 logins and transfers); with 4-hour backups, 4 h lost |
| K5 | SC03 primary site power loss | Card payments down 48 h; with second HSM pair in DC2, 15 min |
| K6 | SC12 fiber cut, then diverse fiber entry | 4 services down, digital banking 20 h; with the fix, no services down |
| K7 | SC13 internal DNS failure | Wires back at exactly 2 h: shown as met, not missed |
| K8 | SC07 HSM failure, Fri 17:00 | Card payments 18 h, cost $5,166,000 (12.6 weighted hours × $410,000) |
| K9 | SC09 ACH operator outage, Fri 07:00 | Cost $3,450,000 (5 business hours × $230,000 × 3 payroll Friday) |
| K10 | Static checks | 8 of 11 services miss on paper; 20 inversions; 20 assets untested or stale; 11 single points |
| K11 | Approvals | Memo can't be sent without the continuity lead; last editor can't approve; what-if never changes the baseline; gap acceptance needs owner, reason, review date |
| K12 | Counts of 0 and 1 | Correct singular and plural everywhere ("1 hour", "0 services", "1 asset down") |

---

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Plum & Gold scheme |
| `js/data.js` | Topology and scenarios, wrapped from `data/*.json` |
| `js/engine.js` | Recovery engine, cost, static checks (pure functions) |
| `js/layout.js` | Lane and site positions, link routing |
| `js/app.js` | Views, animation, drawer, decisions, memo, checks, log |
| `assets/fonts/` | Outfit and Fira Code (SIL Open Font License) |
| `data/` | Source JSON and expected results |

`engine.js` runs under Node so the known answers can be tested outside the browser, and real CMDB or BIA exports can replace the JSON later.

---

## Open questions for Aby

1. Keep the bank unnamed like the other builds, or give it a fictional name for the tabletop?
2. Are the six what-ifs the right fixes to show, or do you want one about vendor contracts (for example, a contractual 2-hour recovery from the ACH operator)?
3. Should the demo open on the ransomware scenario already loaded, to save clicks?

---

## Appendix A · Asset inventory

Hours unless shown. "Failover" is the time to switch to a standby; "Tested restore" is the last measured restore or rebuild. Either-or groups show the switchover time.


**Business services**

| ID | Asset | Site | RTO | RPO | Failover | Tested restore | Last good backup | Last test | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| S01 | Card payments | – | 1 h | 3 min | – | – | – | – | A02 |
| S02 | Digital banking | – | 4 h | 15 min | – | – | – | – | A07, A08 |
| S03 | ACH and payroll | – | 4 h | 15 min | – | – | – | – | A06, A14 |
| S04 | Wire transfers | – | 2 h | 3 min | – | – | – | – | A05, A14 |
| S05 | Branch banking | – | 8 h | 1 h | – | – | – | – | A09 |
| S06 | ATM network | – | 4 h | 15 min | – | – | – | – | A10 |
| S07 | Lending | – | 24 h | 4 h | – | – | – | – | A11, A12 |
| S08 | Financial crime | – | 4 h | 1 h | – | – | – | – | A13, A14 |
| S09 | Treasury and liquidity | – | 4 h | 1 h | – | – | – | – | A15 |
| S10 | Customer contact | – | 4 h | 24 h | – | – | – | – | A16 |
| S11 | Finance and reporting | – | 48 h | 24 h | – | – | – | – | A18, A19 |

**Applications**

| ID | Asset | Site | RTO | RPO | Failover | Tested restore | Last good backup | Last test | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| A01 | Core banking | DC1 | 2 h | 3 min | 2 h | 6 h | – | 2026-03 | D01, (P01 or P02, 2 h switch), I02, H01, H07 |
| A02 | Card authorization | DC1 | 1 h | 3 min | 0 | 6 h | – | 2026-05 | D02, (P01 or P02, instant), H05, X01, (N04 or N06, instant) · soft: A13 |
| A03 | Card management | DC1 | 8 h | 1 h | 4 h | 8 h | – | never | D02, (P01 or P02, 4 h switch), H01 |
| A04 | Payments hub | DC1 | 2 h | 3 min | 2 h | 6 h | – | 2025-11 | D03, (P01 or P02, 2 h switch), I02, H01, H07 |
| A05 | Wire gateway | DC1 | 2 h | 3 min | 2 h | 4 h | – | 2025-11 | A04, H05, X03 |
| A06 | ACH gateway | DC1 | 4 h | 15 min | 2 h | 4 h | – | 2025-11 | A04, I03, X02 |
| A07 | Online banking | Cloud E | 4 h | 15 min | 3 h | 4 h | – | 2026-06 | (P03 or P04, 3 h switch), D04, I01, H02, N03, A01 |
| A08 | Mobile banking API | Cloud E | 4 h | 15 min | 3 h | 4 h | – | 2026-06 | (P03 or P04, 3 h switch), D04, I01, H02, N03, A01 |
| A09 | Teller platform | DC1 | 8 h | 1 h | 4 h | 6 h | – | 2025-10 | A01, N07, H01, (P01 or P02, 4 h switch) |
| A10 | ATM switch | DC1 | 4 h | 15 min | 2 h | 6 h | – | 2025-10 | A01, H05, X07, (P01 or P02, 2 h switch) |
| A11 | Loan origination | SaaS | 24 h | 4 h | – | vendor | – | – | X05, H02, I01 |
| A12 | Loan servicing | DC1 | 24 h | 4 h | 8 h | 10 h | – | 2025-04 | D05, (P01 or P02, 8 h switch), A01, H01 |
| A13 | Fraud detection | Cloud E | 1 h | 1 h | 3 h | 4 h | – | 2026-06 | D07, (P03 or P04, 3 h switch), I04 |
| A14 | AML and sanctions | DC1 | 2 h | 1 h | 4 h | 8 h | – | 2025-09 | (P01 or P02, 4 h switch), H01, D03 · soft: X06 |
| A15 | Treasury management | SaaS | 4 h | 1 h | – | vendor | – | – | H02, A01 |
| A16 | Contact center | SaaS | 4 h | 24 h | – | vendor | – | – | X08, H02 · soft: A17 |
| A17 | CRM | SaaS | 8 h | 4 h | – | vendor | – | – | H02 |
| A18 | General ledger | DC1 | 24 h | 4 h | – | 12 h | – | 2025-03 | A01, (P01 or P02, 12 h switch), H01 |
| A19 | Regulatory reporting | Cloud E | 48 h | 24 h | – | 8 h | – | 2025-12 | D06, P03, I03 |

**Integration**

| ID | Asset | Site | RTO | RPO | Failover | Tested restore | Last good backup | Last test | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| I01 | API gateway | Cloud E | 1 h | – | 3 h | 3 h | – | 2026-05 | (P03 or P04, 3 h switch), (N09 or N10, 1 h switch) |
| I02 | Enterprise service bus | DC1 | 8 h | 30 min | 6 h | 12 h | 24 h | 2025-09 | (P01 or P02, 4 h switch), H01, H07 |
| I03 | Managed file transfer | DC1 | 8 h | 1 h | – | 8 h | 24 h | 2025-07 | (P01 or P02, 8 h switch), H01, (N01 or N02, instant) |
| I04 | Event streaming | Cloud E | 1 h | 3 min | 3 h | 4 h | 1 h | 2026-06 | (P03 or P04, 3 h switch) |

**Data**

| ID | Asset | Site | RTO | RPO | Failover | Tested restore | Last good backup | Last test | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| D01 | Core banking DB | DC1 | 2 h | 3 min | 1 h | 14 h | 31 h | 2026-03 | (P05 or P06, 1 h switch) |
| D02 | Card DB | DC1 | 1 h | 3 min | 15 min | 8 h | 6 h | 2026-05 | (P05 or P06, instant) |
| D03 | Payments DB | DC1 | 2 h | 3 min | 1 h | 10 h | 24 h | 2025-11 | (P05 or P06, 1 h switch) |
| D04 | Digital banking DB | Cloud E | 2 h | 15 min | 30 min | 4 h | 1 h | 2026-06 | (R1 or R2, 30 min switch) |
| D05 | Loan DB | DC1 | 24 h | 4 h | 8 h | 12 h | 24 h | 2025-04 | (P05 or P06, 8 h switch) |
| D06 | Data warehouse | Cloud E | 48 h | 24 h | – | 24 h | 24 h | 2025-12 | R1 |
| D07 | Fraud feature store | Cloud E | 1 h | 1 h | 3 h | 6 h | 12 h | 2026-06 | (R1 or R2, 3 h switch) |

**Shared services**

| ID | Asset | Site | RTO | RPO | Failover | Tested restore | Last good backup | Last test | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| H01 | Active Directory | DC1 | 24 h | 24 h | 0 | 30 h | – | never | (F1 or F2, instant) |
| H07 | Internal DNS | DC1 | 1 h | 1 h | 0 | 2 h | – | 2026-04 | (P01 or P02, instant), H01 |
| H10 | Backup and vault | DC2 | 4 h | 24 h | – | 8 h | – | 2026-01 | F2, N06, H01 |
| H04 | Privileged access vault | DC1 | 4 h | 1 h | 2 h | 6 h | – | 2025-12 | (P01 or P02, 2 h switch), H01 |
| H05 | HSM cluster | DC1 | 4 h | – | – | 18 h | – | never | F1, N04 |
| H06 | PKI and certificates | DC1 | 24 h | 24 h | 4 h | 10 h | – | 2025-06 | (P01 or P02, 4 h switch), H01 |
| H02 | Cloud SSO and MFA | SaaS | 2 h | – | – | vendor | – | – |  · soft: H01 |
| H08 | Email and chat | SaaS | 8 h | 24 h | – | vendor | – | – | H02 |

**Platforms**

| ID | Asset | Site | RTO | RPO | Failover | Tested restore | Last good backup | Last test | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| P05 | SAN storage DC1 | DC1 | 4 h | 3 min | – | 24 h | – | 2025-08 | F1 |
| P06 | SAN storage DC2 | DC2 | 4 h | 3 min | – | 24 h | – | 2025-08 | F2 |
| P01 | VM cluster DC1 | DC1 | 4 h | – | – | 16 h | – | 2025-10 | F1, N04, P05 |
| P02 | VM cluster DC2 | DC2 | 4 h | – | – | 16 h | – | 2025-10 | F2, N06, P06 |
| P03 | Kubernetes East | Cloud E | 2 h | – | – | 6 h | – | 2026-06 | R1 |
| P04 | Kubernetes West | Cloud W | 2 h | – | – | 6 h | – | 2026-06 | R2 |

**Network**

| ID | Asset | Site | RTO | RPO | Failover | Tested restore | Last good backup | Last test | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| C1 | Street fiber entry | DC1 | – | – | – | 20 h | – | never | – |
| N01 | ISP A circuit | DC1 | 1 h | – | – | 20 h | – | never | C1 |
| N02 | ISP B circuit | DC1 | 1 h | – | – | 20 h | – | never | C1 |
| N05 | ISP circuits DC2 | DC2 | 1 h | – | – | 8 h | – | never | F2 |
| N04 | Core network DC1 | DC1 | 1 h | – | – | 8 h | – | 2026-02 | F1 |
| N06 | Core network DC2 | DC2 | 1 h | – | – | 8 h | – | 2026-02 | F2 |
| N03 | Edge, WAF and DDoS | SaaS | 1 h | – | – | vendor | – | – | – |
| N09 | Private cloud link | DC1 | 1 h | – | – | 20 h | – | never | C1, N04 |
| N10 | Backup VPN to cloud | DC1 | 1 h | – | – | 4 h | – | never | (N01 or N02, instant) |
| N07 | Branch SD-WAN | DC1 | 4 h | – | – | 6 h | – | 2025-11 | (N04 or N06, 1 h switch), (N01 or N02 or N05, instant) |

**Facilities**

| ID | Asset | Site | RTO | RPO | Failover | Tested restore | Last good backup | Last test | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Primary data center | DC1 | – | – | – | 48 h | – | never | – |
| F2 | Secondary data center | DC2 | – | – | – | 48 h | – | never | – |
| R1 | Cloud region East | Cloud E | – | – | – | vendor | – | – | – |
| R2 | Cloud region West | Cloud W | – | – | – | vendor | – | – | – |

**Third parties**

| ID | Asset | Site | RTO | RPO | Failover | Tested restore | Last good backup | Last test | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| X01 | Card networks | Vendor | 1 h | – | – | vendor | – | – | – |
| X02 | ACH operator | Vendor | 4 h | – | – | vendor | – | – | – |
| X03 | Wire network | Vendor | 2 h | – | – | vendor | – | – | – |
| X05 | Credit bureau | Vendor | 24 h | – | – | vendor | – | – | – |
| X06 | Sanctions list feed | Vendor | 24 h | – | – | vendor | – | – | – |
| X07 | ATM network partner | Vendor | 4 h | – | – | vendor | – | – | – |
| X08 | Telephony carrier | Vendor | 4 h | – | – | vendor | – | – | – |

## Appendix B · Scenario library and expected results

Modes: `outage` uses failover when one exists; `corruption` and `compromise` force a restore from the last good backup; durations are set by the scenario. Impact is the engine's cost at the default start, with no workarounds. Injects for each scenario are in `data/scenarios.json`.

| ID | Scenario | Start | Seeds (mode) | Services down | Worst RTO miss | Worst data loss | Impact | Suggested fix |
|---|---|---|---|---|---|---|---|---|
| SC01 | Ransomware in the data centers | Fri 07:00 | H01 (compromise), P01 (corruption), P02 (corruption), D01 (corruption), D03 (corruption), D05 (corruption) | 10 | Digital banking 60 h vs 4 h | Digital banking 31 h | $35,221,000 | Break-glass backup console |
| SC02 | Core banking DB corruption | Mon 06:00 | D01 (corruption) | 6 | Digital banking 14 h vs 4 h | Digital banking 31 h | $3,709,000 | 4-hour immutable backups |
| SC03 | Primary data center power loss | Wed 10:00 | F1 (site) | 10 | Card payments 48 h vs 1 h | Digital banking 30 min | $26,860,000 | Second HSM pair in DC2 |
| SC04 | Cloud region East outage | Sat 20:00 | R1 (vendor, 10 h) | 4 | none | Financial crime 6 min | $288,000 | Warm fraud standby |
| SC05 | Active Directory corruption | Tue 09:00 | H01 (corruption) | 9 | Wire transfers 30 h vs 2 h | none | $16,096,000 | Rehearse AD forest recovery |
| SC06 | Cloud SSO and MFA outage | Mon 08:00 | H02 (vendor, 6 h) | 4 | Digital banking 6 h vs 4 h | none | $1,350,000 | – |
| SC07 | HSM cluster failure | Fri 17:00 | H05 (outage) | 3 | Card payments 18 h vs 1 h | none | $6,010,000 | Second HSM pair in DC2 |
| SC08 | Card network link down | Sat 12:00 | X01 (vendor, 3 h) | 1 | Card payments 3 h vs 1 h | none | $1,230,000 | – |
| SC09 | ACH operator outage | Fri 07:00 | X02 (vendor, 6 h) | 1 | ACH and payroll 6 h vs 4 h | none | $3,450,000 | – |
| SC10 | Wire network outage near cutoff | Fri 14:00 | X03 (vendor, 4 h) | 1 | Wire transfers 4 h vs 2 h | none | $1,360,000 | – |
| SC11 | DDoS on digital channels | Mon 12:00 | N03 (vendor, 5 h) | 1 | Digital banking 5 h vs 4 h | none | $475,000 | – |
| SC12 | Fiber cut at the primary site | Thu 15:00 | C1 (outage, 20 h) | 4 | Digital banking 20 h vs 4 h | none | $4,514,500 | Diverse fiber entry |
| SC13 | Internal DNS failure | Wed 08:00 | H07 (corruption) | 8 | none | none | $1,790,000 | – |
| SC14 | Service bus failure | Tue 11:00 | I02 (outage) | 8 | Wire transfers 6 h vs 2 h | Digital banking 30 min | $5,370,000 | – |
| SC15 | SAN array failure | Thu 02:00 | P05 (outage) | 9 | ACH and payroll 8 h vs 4 h | Digital banking 30 min | $856,000 | – |
| SC16 | Backup console compromised | Sun 22:00 | H10 (compromise), D03 (corruption) | 3 | Wire transfers 18 h vs 2 h | ACH and payroll 24 h | $4,875,000 | 4-hour immutable backups |
| SC17 | Fraud platform outage | Sat 14:00 | P03 (outage) | 4 | none | Financial crime 1 min | $360,000 | Warm fraud standby |
| SC18 | Branch network outage | Mon 09:00 | N07 (outage) | 1 | none | none | $420,000 | – |
| SC19 | Expired API certificate | Mon 00:00 | I01 (corruption) | 2 | none | none | $114,000 | – |
| SC20 | Telephony carrier outage | Mon 08:00 | X08 (vendor, 8 h) | 1 | Customer contact 8 h vs 4 h | none | $120,000 | – |
