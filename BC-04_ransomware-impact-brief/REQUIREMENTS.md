# BC-04 · Ransomware Impact Brief for Executives

**Build type:** Simulator with a one-page report · **Mindset shift:** Business communication · **Owner:** Aby Rao
**Visual scheme:** 3 · Glacier (all ten schemes are now in use; drawn at random, excluding JA-03's Graphite & Lime and BC-03's Plum & Gold)
**Status:** Requirements ready · Prototype not yet built

Requirements captured from Aby's notes on Oct 28, 2026, mapped to the ten build questions in the master template (`claude/Builder_Prototype_Template.md` in the project). Items marked *(assumed)* were filled in by Claude and need Aby's confirmation.

Every number in this document comes from the reference model behind `data/`. The prototype must reproduce them exactly (see **Known answers**).

---

## The point of this build

Executives hear "ransomware" as an IT outage. It is three business events at once: **operations stop**, **customers are affected**, and **sensitive data is presumed stolen**. This build starts from the company's crown jewels, simulates one break-in, and answers the three questions an executive asks first: **how many hours are we down, how many customers are affected, and how much revenue is at risk.**

| | Operator | Builder |
|---|---|---|
| **Scope** | List of encrypted servers | The crown jewels that run the business, and what data each holds |
| **Downtime** | "Restore in progress" | Hours down per business service, driven by recovery teams and restore order |
| **Customers** | Not counted | Shoppers turned away, retail partners stalled, orders late, customers whose data is exposed |
| **Money** | Not counted | Revenue at risk, revenue lost, plant idle cost, notification and recovery cost |
| **Data** | "Possible exfiltration" | Customer, financial, IP, and employee records presumed exposed, by system |
| **Decision** | Ticket to the infrastructure team | A one-page brief with the decisions only executives can make |

BC-03 asks whether recovery targets hold. BC-04 asks what one attack does to the business and which few changes matter most. It reuses the BC-03 idea of a clock, but the story is the attacker's reach, the crown jewels, and the data.

---

## Build answers

**1. What are we building?**
A ransomware impact simulator that ends in a one-page brief for executives. It's build 4 on the Business communication wall. The setting is a fictional consumer products manufacturer: an online store, 340 retail partners, 3 plants, 2 distribution centers, 6,400 employees, about $1.9B in annual revenue.

**2. What's the problem today?**
* The crown-jewel list exists, but it lists systems, not what they hold or what the business loses per hour without them.
* Ransomware tabletops stay technical: which servers, which backups. Executives leave without numbers they can act on.
* Nobody has traced how far one stolen password reaches. Admin trust and shared networks connect "separate" systems.
* The most valuable data isn't always in a listed system. Here, the formula library is a folder on a file share.
* Data theft is treated as an afterthought, even though notification and IP loss can outlast the outage.

**3. Who uses it, and what do they decide?**
* **CEO, CFO, COO, General Counsel:** whether the exposure is acceptable, which protections to fund, and the restore order they would choose in a real event.
* **CISO or deputy CISO:** presents the brief, approves it before it goes to the executive committee.
* **Crown jewel owners** (VP Digital Commerce, Treasurer, VP Manufacturing, VP R&D): confirm their data, revenue, and recovery numbers.
* **Facilitator:** runs the scenario, records decisions.

**4. What fictional data should it use?**
All values are in `data/crown_jewels.json` and `data/scenarios.json`.

| Source (simulated) | What it provides | Volume |
|---|---|---|
| Crown jewel register (GRC tool) | Crown jewels, owner, criticality, RTO and RPO | 12 crown jewels + Active Directory as an enabler |
| Data inventory and classification | Data class and record counts per system | 5 classes: customer, payment, financial, IP, employee |
| CMDB and identity provider | Hosting, trust zone, admin trust paths between zones | 7 zones, 5 attack paths |
| Backup platform reports | Backup type (immutable, standard, vendor), copy age, offline copy age | 12 systems |
| DR test records | Tested restore time, rebuild time | 11 systems we recover ourselves |
| Finance (business impact analysis) | Revenue per hour, hours profile, loss rates, plant idle cost | 5 business services |
| Payroll and treasury calendars | Payroll file, supplier run, earnings date | 3 obligations |

**5. What business context does it add that the tools don't know?**
* **Crown jewel to business service:** online sales need the online store and the payment token vault; retail orders need EDI and ERP; shipping needs warehouse management and ERP; production needs plant systems and ERP.
* **Revenue per hour and how much is truly lost:** shoppers mostly go elsewhere (70% lost); retail partners mostly wait (15% lost).
* **Business calendar:** online sales ×1.3 from Nov 1, ×3.0 Thanksgiving to Cyber Monday, ×1.6 Dec 1–20; plants and retail ordering closed Nov 26–27.
* **Obligations:** payday moved up to Wed Nov 25 for Thanksgiving, so the payroll file is due **Mon Nov 23, 16:00**; supplier run Tue 10:00; Q3 earnings release Dec 8.
* **What data each crown jewel holds**, and which data the business can't replace (formulas, unreleased designs).
* **Regulatory clocks** as reference markers: SEC Form 8-K Item 1.05 is due four business days after the company determines an incident is material; some states, such as Washington and Colorado, require notice to residents within 30 days. Legal confirms before any real use.
* **Recovery capacity:** 3 recovery teams, 24 hours of containment and forensic clearance before any restore starts.

**6. What should the demo reveal?**
Headline finding:
* **One phished laptop reaches 11 of 12 crown jewels, and the company's most valuable trade secret isn't on the list.** Domain admins sign in on office workstations, so a phished finance laptop leads to the data center, the plants, the backup console, and the cloud. The formula library (2,300 formulas) is a folder on a general file share. It's presumed stolen, its backups are destroyed, and the newest clean copy is **41 days old**.

The three executive numbers for that scenario (R1, Fri Nov 20, 02:00):
* **Hours down:** 190 hours until every business service is back (plants last). Online sales back at 34 hours, retail orders at 94.
* **Customers affected:** 2,400,000 customers' data presumed exposed; 21,405 shoppers turned away; 340 retail partners stalled; 135,590 orders shipped late.
* **Revenue at risk:** $9.2M of sales disrupted, $2.4M of it lost. Total impact $21.7M once idle plants ($10.3M), customer notification ($7.2M), and recovery ($1.8M) are added.

Supporting findings:
* **Payroll misses Thanksgiving.** Treasury comes back at hour 102; the payroll file was due at hour 86. Swapping two items in the restore order (treasury before EDI) pays 6,400 employees on time; shipping restarts 8 hours later.
* **Backups fix downtime, not theft.** Isolated immutable backups cut hours down from 190 to 102 and formula data loss from 41 days to 24 hours, but 2.4 million customers are still presumed exposed.
* **No single control covers every door.** Tiered admin accounts stop the phishing path completely, but the VPN and plant paths still reach everything.
* **Lost revenue is the smaller bill.** Of $21.7M, lost sales are $2.4M; idle plants and notifying customers are $17.5M.
* **The 8-K could be due on Black Friday.** If materiality is determined at hour 48, the four-business-day clock (skipping Thanksgiving) ends Fri Nov 27.

**7. What will I click during the demo?** *(assumed)*
1. **Jewels:** the crown-jewel wall; hover **Formula library**, the dashed "not on the list" card.
2. **Attack:** pick **Phished finance workstation**, press **Run**; the break-in spreads zone by zone, crown jewels lock, data streams out.
3. **Impact:** three counters fill (hours down, customers affected, revenue at risk); scrub the clock to hour 86 and the payroll card turns red.
4. **Data:** customers, financial, IP, employees; open **Formula library** → **Why?**
5. **Decide:** drag **Treasury** above **Retail partner orders** (payroll turns green); toggle **Isolated immutable backups** (ghost bars).
6. **Draft brief** (simulated) → switch to **CISO** → **Approve**.

**8. What does the AI do, and where must a person approve?** *(assumed)*
Simulated AI:
* Explains, in business language, why each crown jewel went down and why each number is what it is.
* Drafts the one-page executive brief: what happened, the three numbers, data exposed, obligations, and the decisions needed.
* Ranks controls and restore-order changes by hours saved, customers protected, and dollars avoided, using the same engine.

People approve:
* **The brief:** drafted by the AI, edited by the security lead, approved by the CISO. The last editor can't approve it.
* **Regulatory lines** in the brief (8-K, state notice) need General Counsel's sign-off; until then they're marked "draft, not legal advice."
* **Restore order changes and controls** are projections only. The baseline restore order changes only after the COO approves; the log records who and when.
* **Tabletop decisions** (activate a workaround, notify partners) are recorded with who decided and at what hour.

**9. How will I know it's right?** *(assumed)*
Twelve known-answer checks, run live in the **Checks** panel. See **Known answers** below.

**10. What should it not do?** *(assumed)*
* Model whether to pay a ransom, negotiation, or attacker behavior beyond reach.
* Connect to any real GRC, CMDB, backup, or identity tool.
* Give legal advice. Regulatory clocks are reference markers only.
* Estimate long-term churn, share price, fines, or litigation. The brief says these are not included.
* Use real vendor or company names. Systems are named by role.

---

## Views

One question per view. Top bar: **Jewels · Attack · Impact · Data · Decide**, shortcuts `1`–`5`. A persistent "hero strip" under the top bar shows the three numbers once a scenario has run: **Hours down · Customers affected · Revenue at risk**.

| View | Question | Main visual | Interactions |
|---|---|---|---|
| **Jewels** | What keeps us in business? | Crown jewel wall: cards sized by revenue per hour, data-class icons, backup badge, hosting; enabler (AD) and "not on the list" card set apart | Filter by data class or zone; hover for owner, RTO, RPO, backup; click for drawer |
| **Attack** | How far does one break-in reach? | Trust-zone map: 7 zones as rounded islands, crown jewels inside, attack paths as labeled arrows | Pick scenario; Run; watch spread one hop every 400 ms; data particles flow to an "attacker" node; click a path for "how" and the control that cuts it |
| **Impact** | What does it cost the business? | Three animated hero counters; recovery timeline (3 team lanes, Gantt); business service bars with RTO marks; cost waterfall; obligation and regulatory markers | Clock scrubber (0 to 200 h); hover any bar; toggle workarounds; compare to baseline |
| **Data** | What did they take? | Four tiles by class (customer, financial, IP, employee) with record counts; system-by-class matrix; "data lost" strip (hours of data that can't be restored) | Click a tile to light the systems that hold it; **Why?** on each tile |
| **Decide** | What do we change? | Control cards with before and after; restore-order list; ghost bars and counter deltas; brief card | Toggle controls; drag restore order; recovery teams 3 or 5; draft, edit, approve brief |

### Jewels
* **Cards** for CJ01–CJ12, sized by revenue at risk per hour of the services they support. Each shows name, owner, hosting, data-class icons with record counts, backup badge (**Immutable**, **Standard**, **Vendor**), RTO and RPO chips.
* **Formula library** is a dashed card with a "Not on the list" tag. **Why?** says: 2,300 formulas, the core trade secret, sit in a folder on a general file share with standard backups.
* **Active Directory** sits below the wall as an enabler: not a crown jewel, but every on-premises restore waits for it.
* Summary row: 12 crown jewels · 2.4M customers · 4,200 suppliers · 2,300 formulas · 6,400 employees.

### Attack
* **Zones:** Office workstations, Corporate data center, Plant networks, Backup platform, Cloud accounts, Payroll provider; the Isolated formula vault appears only when control C5 is on.
* **Paths P1–P5** are drawn as arrows labeled in plain language, for example "Domain admins sign in on office workstations." A control that cuts a path draws it as a broken line with a shield.
* **Run:** the entry zone pulses; reach spreads along open paths; reached crown jewels turn to a locked state; data icons float from them toward the attacker node and a counter climbs (customers, suppliers, formulas, design files).
* **Result line** (simulated AI): "Reached 4 zones and 11 of 12 crown jewels through 4 paths."

### Impact
* **Hero counters:** hours down (until every business service is back), customers affected, revenue at risk. Each has a **Why?** with the formula and the inputs.
  * **Customers affected** shows the largest group as the big number and the others underneath: customers presumed exposed, shoppers turned away, retail partners stalled, orders shipped late.
* **Recovery timeline:** hour 0 detonation, 24-hour containment band, then one lane per recovery team with each restore job as a bar (restore, rebuild, or offline copy). Bars that wait for AD show a dotted lead-in.
* **Business services:** online sales, retail partner orders, shipping, production, payroll and payments; each bar against its worst crown-jewel RTO.
* **Obligations:** payroll file (hour 86), supplier run (hour 104), earnings (hour 438) as flags on the clock; red when missed.
* **Regulatory strip:** materiality marker (default hour 48, draggable) → 8-K due date; 30-day state notice marker.
* **Cost waterfall:** revenue lost + plant idle cost + notification + recovery = total impact. Revenue at risk shown alongside, labeled as disrupted, not lost.
* **Calendar:** start date and time picker (default Fri Nov 20, 02:00); the season multiplier shows as a band on the timeline.

### Data
* **Tiles:** Customer (2,400,000 people; counted once even though three systems hold them), Payment (900,000 stored cards as tokens; no full card numbers), Financial (4,200 supplier bank details, 38 bank accounts, unreleased Q3 results, 340 partner contracts), IP (2,300 formulas, 14,000 design files), Employee (6,400, only when the payroll provider is hit).
* **"Presumed exposed"** wording throughout: legal treats data on a reached system as exposed until forensics shows otherwise.
* **Data lost strip:** per crown jewel, the hours of data that can't be restored. Formula library: 41 days.
* **Notification estimate:** $3 per customer, $40 per employee (fictional rates, shown in a tooltip).

### Decide
* **Controls C1–C6** (see Appendix A) as cards. Each shows its effect on the current scenario: crown jewels down, hours down, revenue at risk, total impact, payroll, formula data lost.
* **Restore order:** a draggable list of the crown jewels in the scenario. Default order from the business continuity plan: online store, payment token vault, ERP, EDI, warehouse, treasury, plant systems, customer data platform, financial close, product designs, formula library.
* **Recovery teams:** 3 (default) or 5 (control C6).
* **Workarounds:** manual order desk (30% of retail orders after 24 h), paper batch records (40% of production after 12 h).
* **Ghost bars** show the projection against the baseline; nothing changes the baseline without approval.
* **Brief** (simulated): one page in plain language. Sections: what happened, the three numbers, data presumed exposed, obligations and clocks, what we're doing now, three decisions for the executive committee, and what's not included. Download as Markdown; print view fits one page.

### Global
Reset, presenter mode, activity log, Checks panel, "simulated" tag on every AI output, persona switcher ("Viewing as": Facilitator, CISO, CFO, COO, General Counsel), and the required footer on every view.

---

## Impact engine

Pure functions in `js/engine.js`, no browser dependencies, so it runs under Node for the checks. All times are hours from detonation (hour 0).

**Inputs:** crown jewels, zones, paths, scenario, active controls, restore order, recovery teams, workarounds, start time.

**1. Reach.** Start at the scenario's entry zone and follow every open path (paths cut by an active control are closed). Every crown jewel in a reached zone is encrypted. Modes:
* `encrypt`: reach as above.
* `vendor`: the vendor's systems are down for the scenario's duration; their data is presumed exposed.
* `exfil`: only the target systems are exposed; nothing is encrypted. If the target sits in the isolated formula vault (C5), download alerts stop the account after 40 formulas.

**2. Backups.** For each encrypted crown jewel:
* Immutable: restore takes the tested restore time; data lost = copy age.
* Standard: destroyed if the attacker reached where it's stored (Backup platform for on-premises systems; the same cloud account for cloud systems). Then rebuild (rebuild time, data lost = offline copy age). If there's no rebuild path (formula library), restore from the offline copy (tested restore time, data lost = offline copy age).
* C3 makes every standard backup immutable and closes path P4.

**3. Recovery schedule.**
* Nothing is restored during containment (24 hours).
* If AD is encrypted, it's restored first; on-premises crown jewels can't start until AD is back. Cloud crown jewels don't wait for AD.
* List scheduling: whenever a recovery team is free, it takes the first crown jewel in the restore order that is ready; if none is ready, it takes the one that becomes ready first.
* A crown jewel is up when its job ends. A business service is up when all its crown jewels are up.

**4. Numbers.** Integrated in 15-minute steps from the start time.
* **Revenue at risk** = Σ revenue per hour × hour weight while the service is down (online sales and retail partner orders). Workaround: × (1 − capacity) after its start hour.
* **Revenue lost** = revenue at risk × loss rate.
* **Hours down** = latest service recovery.
* **Shoppers turned away** = online revenue at risk ÷ $90 average order.
* **Orders shipped late** = 1,400 orders per hour × online weight while shipping is down.
* **Retail partners stalled** = 340 if retail ordering is down during any ordering hour.
* **Plant idle cost** = $110,000 per weighted plant hour while production is down.
* **Customers and employees exposed** = largest count among exposed systems in that class (same people, counted once).
* **Notification** = $3 × customers + $40 × employees exposed.
* **Recovery cost** = $750,000 incident response (if anything is encrypted or stolen) + $2,500 per recovery-team hour.
* **Total impact** = revenue lost + plant idle cost + notification + recovery.
* **Obligation missed** when any of its crown jewels is still down at the due hour.
* **8-K due** = four business days after the materiality marker, skipping weekends and federal holidays (Thanksgiving, Christmas).

Hour weights: online 1.0 from 07:00 to 23:00, 0.35 overnight, × season; retail ordering 1.0 weekdays 06:00–20:00; plants 1.0 weekdays; both closed Nov 26–27.

---

## Data files

| File | Contents |
|---|---|
| `data/crown_jewels.json` | Company, 7 zones, 5 paths, 13 systems (12 crown jewels + AD), 5 business services, 3 obligations, 6 controls, default restore order, calendar, cost rates |
| `data/scenarios.json` | 6 scenarios with entry, mode, start, setup line, suggested controls |
| `data/expected_results.json` | Engine output for every scenario (baseline and with its suggested controls), each control alone on R1, the restore-order swap, and the regulatory clocks |

Browsers block `fetch()` from `file://`, so the build step wraps the JSON as `js/data.js` (`window.BC04 = {...}`), as in BC-03. The JSON stays the source of truth.

---

## Known answers

Run live in the **Checks** panel; each shows expected, actual, pass or fail.

| ID | Case | Expected |
|---|---|---|
| K1 | R1 with C1 tiered admin accounts | Contained at the entry point: 0 crown jewels down, $0 total impact |
| K2 | R1 baseline | 4 zones reached beyond the entry; 11 of 12 crown jewels down; hours down 190; online sales 34 h, retail orders 94 h; revenue at risk $9,206,470, lost $2,440,529; 21,405 shoppers; 340 partners; 135,590 orders late; total $21,740,529 |
| K3 | R1 formula library | Presumed stolen; backup destroyed; restored from the offline copy with 984 hours (41 days) of data lost |
| K4 | R1 payroll | Due hour 86, treasury back hour 102: missed. Move treasury above EDI: back at hour 76, paid; shipping 94 h → 102 h |
| K5 | R1 with C3 isolated immutable backups | Hours down 102; revenue at risk $5,566,470; total $16,274,529; payroll on time; formula data lost 24 h; customers exposed still 2,400,000 |
| K6 | R4 leaked cloud key | 4 crown jewels down; online sales 34 h; customer data platform rebuilt by hour 120 with 168 h of data lost; total $9,628,529 |
| K7 | R3 with C2 segment the plants | Only plant systems down, back at 60 h; revenue at risk $0; plant idle cost $2,420,000 |
| K8 | R5 payroll provider | Down 96 h; payroll missed; 6,400 employees exposed; notification $256,000 |
| K9 | R6 formula theft, then with C5 | 2,300 formulas exposed, no downtime; with the vault, 40 formulas |
| K10 | Regulatory clocks, R1 | Materiality at hour 48 (Sun Nov 22, 02:00) → 8-K due Fri Nov 27; state notice marker Sun Dec 20 |
| K11 | Approvals | Brief can't be sent without the CISO; last editor can't approve; regulatory lines need General Counsel; controls and restore order never change the baseline without approval |
| K12 | Counts of 0 and 1 | Correct singular and plural everywhere ("1 hour", "0 crown jewels", "1 retail partner", "1 recovery team") |

---

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Glacier scheme |
| `js/data.js` | Crown jewels and scenarios, wrapped from `data/*.json` |
| `js/engine.js` | Reach, recovery schedule, impact math, clocks (pure functions) |
| `js/app.js` | Views, animation, drawer, decisions, brief, checks, log |
| `tools/wrap-data.js` | Wraps `data/*.json` into `js/data.js` |
| `tools/reference_model.py` | The Python model that produced every number here; `python3 tools/reference_model.py data` regenerates the JSON |
| `assets/fonts/` | Manrope and IBM Plex Mono (SIL Open Font License) |
| `data/` | Source JSON and expected results |

---

## Open questions for Aby

1. Slide 18's tile 4 currently reads "Data location dashboard." Should the tile become "Ransomware impact brief for executives," or is this build replacing a different tile?
2. Keep the company unnamed like the other builds, or give it a fictional name for the brief's letterhead?
3. Should the demo open with R1 already loaded, to save clicks?
4. Are $3 per customer and $40 per employee reasonable fictional notification rates, or do you want them hidden and only the counts shown?

---

## Appendix A · Crown jewel register

Hours unless shown. **Copy age** is how old the newest usable backup is; **offline copy** is the fallback when standard backups are destroyed. "Rebuild" applies when the backup is gone.

| ID | Crown jewel | Zone | Hosting | Owner | Criticality | Data held | RTO | RPO | Backup | Tested restore | Rebuild | Copy age | Offline copy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AD | Active Directory *(enabler)* | Corporate data center | Data center | Identity team | 5 | – | 8 h | 24 h | standard | 20 h | 40 h | 24 h | – |
| CJ01 | Online store | Cloud accounts | Cloud | VP Digital Commerce | 5 | Customer: 2,400,000 customers | 4 h | 15 min | immutable | 10 h | 72 h | 15 min | – |
| CJ02 | Customer data platform | Cloud accounts | Cloud | VP Marketing | 3 | Customer: 2,400,000 customers | 24 h | 24 h | standard | 12 h | 96 h | 24 h | 7 days |
| CJ03 | Payment token vault | Cloud accounts | Cloud | Treasurer | 5 | Payment: 900,000 stored cards | 4 h | 15 min | immutable | 6 h | 48 h | 15 min | – |
| CJ04 | ERP | Corporate data center | Data center | CFO | 5 | Financial: 4,200 suppliers | 24 h | 24 h | immutable | 30 h | 120 h | 24 h | – |
| CJ05 | Financial close | Corporate data center | Data center | Controller | 4 | Financial: 1 quarter | 48 h | 24 h | standard | 16 h | 60 h | 24 h | 7 days |
| CJ06 | Treasury and bank payments | Corporate data center | Data center | Treasurer | 5 | Financial: 38 bank accounts | 24 h | 24 h | immutable | 12 h | 48 h | 24 h | – |
| CJ07 | HR and payroll | Payroll provider | SaaS | CHRO | 5 | Employee: 6,400 employees | 24 h | 24 h | vendor | vendor | vendor | 24 h | – |
| CJ08 | Product designs (PLM) | Cloud accounts | Cloud | VP Product | 4 | IP: 14,000 design files | 72 h | 24 h | immutable | 20 h | 120 h | 24 h | – |
| CJ09 | Formula library *(not on list)* | Corporate data center | File share | VP R&D | 5 | IP: 2,300 formulas | 72 h | 24 h | standard | 8 h | none | 24 h | 41 days |
| CJ10 | Plant systems (MES) | Plant networks | Plants | VP Manufacturing | 5 | IP: 2,300 formulas | 12 h | 24 h | standard | 36 h | 96 h | 24 h | 7 days |
| CJ11 | Warehouse management | Corporate data center | Data center | VP Supply Chain | 5 | Customer: 2,400,000 customers | 12 h | 4 h | immutable | 18 h | 72 h | 24 h | – |
| CJ12 | Retail partner orders (EDI) | Corporate data center | Data center | VP Wholesale | 5 | Financial: 340 retail partners | 8 h | 4 h | immutable | 8 h | 48 h | 24 h | – |

**Attack paths**

| ID | From | To | How | Cut by |
|---|---|---|---|---|
| P1 | Office workstations | Corporate data center | Domain admins sign in on office workstations | C1 · Tiered admin accounts |
| P2 | Corporate data center | Plant networks | Plants share the corporate domain and a flat network | C2 · Segment the plants |
| P3 | Plant networks | Corporate data center | Plant remote-support tool stores domain credentials | C2 · Segment the plants |
| P4 | Corporate data center | Backup platform | Backup console is joined to the corporate domain | C3 · Isolated immutable backups |
| P5 | Corporate data center | Cloud accounts | Cloud admin roles granted to synced domain accounts | C4 · Cloud-only admins |

**Business services**

| ID | Service | Depends on | Rate | Hours | Loss rate | People counted |
|---|---|---|---|---|---|---|
| S1 | Online sales | CJ01, CJ03 | $58,000/h revenue | 24×7: 1.0 from 07:00–23:00, 0.35 overnight, × season | 70% | shoppers |
| S2 | Retail partner orders | CJ12, CJ04 | $260,000/h revenue | Weekdays 06:00–20:00 | 15% | retail partners |
| S3 | Shipping | CJ11, CJ04 | 1,400 orders/h | 24×7: 1.0 from 07:00–23:00, 0.35 overnight, × season | – | orders delayed |
| S4 | Production | CJ10, CJ04 | $110,000/h idle cost | Weekdays, 24 h | – | plant workers idle |
| S5 | Payroll and payments | CJ07, CJ06, CJ04 | Obligations | – | – | – |

**Obligations**

| ID | Obligation | Due | Depends on | People |
|---|---|---|---|---|
| O1 | Payroll file to bank | 2026-11-23 16:00 | CJ07, CJ06 | 6,400 employees |
| O2 | Supplier payment run | 2026-11-24 10:00 | CJ04, CJ06 | 1,150 suppliers |
| O3 | Q3 earnings release | 2026-12-08 08:00 | CJ05 | – |

## Appendix B · Scenario library and expected results

All start Fri Nov 20, 2026, 02:00, with no controls, workarounds, or priority changes. Full engine output, including each restore job, is in `data/expected_results.json`.

| ID | Scenario | Entry | Crown jewels down | Hours down | Revenue at risk | Customers exposed | Payroll | Total impact | Suggested controls |
|---|---|---|---|---|---|---|---|---|---|
| R1 | Phished finance workstation | Office workstations | 11 | 190 h | $9.2M | 2,400,000 | missed | $21.7M | C1 Tiered admin accounts, C3 Isolated immutable backups, C5 Formula vault |
| R2 | VPN appliance exploit | Corporate data center | 11 | 190 h | $9.2M | 2,400,000 | missed | $21.7M | C3 Isolated immutable backups, C4 Cloud-only admins |
| R3 | Plant remote-support tool | Plant networks | 11 | 190 h | $9.2M | 2,400,000 | missed | $21.7M | C2 Segment the plants |
| R4 | Leaked cloud access key | Cloud accounts | 4 | 34 h | $1.9M | 2,400,000 | on time | $9.6M | C4 Cloud-only admins |
| R5 | Payroll provider ransomware | Payroll provider | 1 | 96 h | $0 | 0 | missed | $256,000 | – |
| R6 | Formula theft, no encryption | Contractor account | 0 | 0 | $0 | 0 | on time | $750,000 | C5 Formula vault |

**Each control alone, on R1**

| Control | Crown jewels down | Hours down | Revenue at risk | Total impact | Payroll | Formula data lost |
|---|---|---|---|---|---|---|
| C1 Tiered admin accounts | 0 | 0 | $0 | $0 | on time | – |
| C2 Segment the plants | 10 | 102 h | $9.2M | $16.2M | missed | 41 days |
| C3 Isolated immutable backups | 11 | 102 h | $5.6M | $16.3M | on time | 24 h |
| C4 Cloud-only admins | 7 | 178 h | $7.3M | $20.1M | on time | 41 days |
| C5 Formula vault | 10 | 190 h | $9.2M | $21.7M | missed | – |
| C6 Recovery retainer | 11 | 168 h | $9.2M | $21.7M | on time | 41 days |
