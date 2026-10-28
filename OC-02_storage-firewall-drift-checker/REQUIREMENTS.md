# OC-02 · Cloud Storage and Firewall Drift Checker against a CIS Baseline

**Build type:** Script (with a dashboard) · **Mindset shift:** Ownership and craft · **Owner:** Aby Rao
**Visual scheme:** 4 · Forest Ledger (drawn at random from schemes no build has used)
**Status:** Requirements ready · Prototype not yet built

Requirements captured from Aby's voice notes on Oct 27, 2026, mapped to the ten build questions in the master template (`claude/Builder_Prototype_Template.md` in the project). Items marked *(assumed)* were filled in by Claude and need Aby's confirmation.

---

## The point of this build

Most drift checks are a scanner's pass/fail list. This one shows the builder version: a written baseline you own, drift measured as *how far* from it, a priority that reflects the business, and a fix that lands in code so it stays fixed.

| | Operator | Builder |
|---|---|---|
| **Baseline** | "Whatever the scanner's default policy is" | A written, versioned baseline mapped to six CIS benchmarks, with stated assumptions |
| **Drift** | Pass or fail | How far off: a 30-day log retention is a smaller drift than none at all; a /8 is less open than 0.0.0.0/0 |
| **Priority** | Severity from the tool | Impact × likelihood, using data classification, criticality, exposure, and drift age |
| **Fix** | A console click | A fix in code, verified by a re-check, with re-drift tracked |
| **Upkeep** | Re-run the scan next quarter | The checker runs daily and the baseline gets a new version when CIS does |

The ownership and craft moment: **fixed isn't fixed until it stays fixed.** The checker tracks re-drift and shows that console fixes come undone.

---

## Build answers

**1. What are we building?**
A drift checker for cloud storage and firewalls against a CIS-aligned baseline. It's build 2 on the Ownership and craft wall (slide 19, tile 2).

**2. What's the problem today?**
* "The baseline" lives in people's heads or in a scanner's default policy, so nobody can say what good looks like.
* Each cloud has its own tool and its own vocabulary, so storage and firewall drift is never seen across clouds in one place.
* Drift is reported as pass or fail, so a bucket missing one log setting looks as bad as a bucket open to the internet.
* Fixes are made in the console, the next deployment puts the old setting back, and nobody notices.

**3. Who uses it, and what do they decide?**
* **Cloud and platform engineers:** what to fix first, how to fix it, and whether to fix it in code or request an exception.
* **Cloud security lead:** owns the baseline, approves exceptions and auto-fixes, and reports conformance.
* **Engineering managers:** see their teams' drift and fix-time targets.

**4. What fictional data should it use?**
Six clouds: AWS, Microsoft Azure, Google Cloud, Oracle Cloud (OCI), Alibaba Cloud, and IBM Cloud. *(Google Cloud assumed; Azure was named twice in the voice notes, and I read the second mention as Google. Drop it if not.)*

Estate (generated from a fixed seed so every load matches):
* 48 accounts, subscriptions, projects, and compartments across 6 business units, with production and non-production.
* 172 virtual networks (VPC, VNet, VCN) and 610 subnets.
* About **1,250 storage resources** of 33 types and about **920 firewall objects** holding about **6,400 rules**, across 26 types (below).
* 90 days of configuration history per resource, so drift age and re-drift can be computed.

Storage types (33):

| Cloud | Storage types |
|---|---|
| AWS | S3 bucket · EBS volume · EBS snapshot · EFS file system · FSx file system · S3 Glacier vault · AWS Backup vault |
| Azure | Storage account (Blob) · Azure Files share · Managed disk · Disk snapshot · Data Lake Storage Gen2 · Azure NetApp Files volume · Recovery Services vault |
| Google Cloud | Cloud Storage bucket · Persistent disk · Disk snapshot · Filestore instance · Backup vault |
| Oracle Cloud | Object Storage bucket · Block volume · File Storage file system · Archive Storage bucket · Pre-authenticated request |
| Alibaba Cloud | OSS bucket · Cloud disk · NAS file system · Snapshot · Hybrid Backup Recovery vault |
| IBM Cloud | Cloud Object Storage bucket · Block Storage volume · File Storage share · Snapshot |

Firewall and network types (26):

| Cloud | Firewall and network types |
|---|---|
| AWS | Security group · Network ACL · Network Firewall policy · WAF web ACL · VPC flow log |
| Azure | Network security group · Application security group · Azure Firewall policy · Application Gateway WAF policy · NSG flow log / Network Watcher |
| Google Cloud | VPC firewall rule · Hierarchical firewall policy · Cloud Armor policy · VPC flow log |
| Oracle Cloud | Security list · Network security group · Network Firewall policy · VCN flow log |
| Alibaba Cloud | Security group · Network ACL · Cloud Firewall policy · VPC flow log |
| IBM Cloud | Security group · Network ACL (VPC) · Flow log collector · Cloud Internet Services WAF |

Each resource carries business context: owner team, business unit, environment, data classification (public, internal, confidential, restricted), application, criticality tier, and how it's deployed (IaC module or console).

**5. What business context does it add that the tools don't know?**
* **Data classification** on every storage resource: restricted data drifting matters more than public website assets.
* **Criticality tier** of the application behind it.
* **Environment:** production or non-production.
* **Exposure:** whether the network path is reachable from the internet, a partner range, a peered network, or nothing.
* **Approved exceptions** with an expiry, such as a public static-website bucket.
* **How it's deployed:** IaC module or console. This predicts re-drift.
* **Fix-time targets** by priority.

**6. What should the demo reveal?**
Headline finding:
* **Fixed isn't fixed.** About 1 in 4 of last quarter's remediations drifted back within 30 days. Every one of them was a console fix with no code change; none of the fixes made in code drifted back.

Supporting findings:
* **A "temporary" rule that stayed.** 14 security groups in the production payroll network still allow SSH and RDP from 0.0.0.0/0, opened 97 days ago for a vendor migration. Priority P1, risk 25 of 25.
* **Conformance varies by cloud.** AWS is highest (about 92%), and Alibaba Cloud and IBM Cloud are lowest (about 70%), mostly missing logging and network defaults.
* **Blind spots.** 23 virtual networks have no flow logs at all, and Azure NSG flow logs keep 30 days against a 90-day baseline (drift 67%).
* **Breadth matters.** A partner rule opens PostgreSQL (5432) to a /8: less open than 0.0.0.0/0 but still about 16.7 million addresses. Exposure drift 0.75.
* **Quick wins.** About 210 drifts are safe to auto-fix (logging, versioning, default encryption) and remove about a third of the total drift score, with one approval.
* **Expected, not drift.** The public static-website bucket is public by design and covered by an approved exception until Jan 31, 2027. It shows as excepted, not as drift.

**7. What will I click during the demo?** *(assumed)*
1. **Baseline:** the six CIS benchmarks and versions, the assumptions, and the control catalog. Open NET-01 and STG-01 to see each cloud's mapping and remediation.
2. **Inventory:** the cloud × storage-type grid shows the variety. Toggle to firewalls.
3. **Drift:** conformance by cloud, drift by control, 90-day trend with re-drift marked.
4. **Exposure:** the payroll network with SSH and RDP open, and the /8 partner rule shown by address count.
5. **Prioritize:** the 5 × 5 impact × likelihood matrix. Click the P1 cell to see the 14 security groups.
6. **Fix:** expected vs actual diff, then the Terraform change. Choose **Fix in code**, then **Re-check**, and drift drops.
7. **Quick wins:** approve the auto-fix batch → re-check. **Report** → export CSV.

**8. What does the AI do, and where must a person approve?** *(assumed)*
Simulated AI:
* Maps each cloud setting to the baseline control (normalizes six vocabularies).
* Explains each drift in plain language, with **Why?** for impact and likelihood.
* Writes the fix for the resource's cloud: console steps, CLI, and Terraform.
* Spots shared causes: one module or template behind many drifts.
* Drafts the conformance summary for the report.

People approve:
* **Auto-fix batches:** the cloud security lead approves; only controls marked auto-fix eligible are allowed.
* **Changes that can break an app** (closing public access, removing a firewall rule) are never auto-fixed. They need a change review and an owner's confirmation.
* **Exceptions** need the cloud security lead, a reason, and an expiry within 180 days.
* **Baseline changes** create a new baseline version; the lead publishes it.
* **Done means verified:** a fix counts only after a re-check shows the control met.

**9. How will I know it's right?** *(assumed)*

| ID | Case | Expected |
|---|---|---|
| K1 | A resource meeting every applicable control | Drift 0, conformance 100% |
| K2 | Production payroll security group: SSH from 0.0.0.0/0 | Deviation 1.0 · impact 5 × likelihood 5 = 25 · P1 |
| K3 | Flow log retention 30 days vs 90 required | Deviation 0.67 |
| K4 | PostgreSQL open to a /8 | Exposure deviation 0.75 |
| K5 | Public website bucket with an approved exception | Excepted, not drift · counts as drift the day after expiry |
| K6 | Resource fixed in the console, setting reverts | Counted as re-drift · a code fix that holds is not |
| K7 | Auto-fix without approval, or on a non-eligible control | Blocked |
| K8 | Fix applied but not re-checked | Not counted as fixed |
| K9 | Reconciliation | Cloud drift counts sum to the fleet total; conformance matches the formula |
| K10 | Counts of 0 and 1 | Correct singular and plural |

**10. What should it not do?** *(assumed)*
* Connect to any real cloud account or change anything. Fixes are simulated.
* Reproduce CIS benchmark text. It references benchmark sections and paraphrases intent; the licensed benchmarks remain the authority.
* Auto-fix anything that could break an application.
* Replace the CSPM tool. It wraps the tools' data with our baseline and context.

---

## The baseline

### Sources

The baseline is the organization's own control set, aligned to the current CIS Foundations Benchmarks:

| Cloud | CIS benchmark | Version |
|---|---|---|
| AWS | CIS Amazon Web Services Foundations Benchmark | v7.0.0 |
| Microsoft Azure | CIS Microsoft Azure Foundations Benchmark | v6.0.0 |
| Google Cloud | CIS Google Cloud Platform Foundation Benchmark | v5.0.0 |
| Oracle Cloud | CIS Oracle Cloud Infrastructure Foundations Benchmark | v3.1.0 |
| Alibaba Cloud | CIS Alibaba Cloud Foundation Benchmark | v2.0.1 |
| IBM Cloud | CIS IBM Cloud Foundations Benchmark | v2.0.0 |

Versions were checked on Oct 27, 2026 against CIS's benchmark pages and monthly update posts.

### Assumptions *(shown on the Baseline screen)*
1. **Scope:** storage and network controls only; identity, logging services, and compute are out of scope except where they affect storage or firewalls (for example flow logs).
2. **CIS Level 1** applies to everything. **Level 2** applies to resources holding confidential or restricted data, or in tier 1 applications.
3. **Mapping is by intent.** Each baseline control maps to the matching storage or networking section in each cloud's benchmark. Exact recommendation numbers are not reproduced and should be confirmed against the licensed benchmark text.
4. **Where a cloud's benchmark has no equivalent recommendation**, the control is kept as an organization addition and marked "org", so it's clear it goes beyond CIS.
5. **Thresholds** use the stricter of the CIS intent or common practice: 90-day log retention, 365-day key rotation, TLS 1.2 minimum, 1-hour shared-access token lifetime.
6. **Exceptions** are allowed with an owner, a reason, and an expiry within 180 days.
7. **Baseline v1.0** is effective Oct 1, 2026. History before that date is measured against the same baseline, so drift age is comparable.

### Control catalog: storage (21)

| ID | Control | Expected | Drift measure | Sev | Level | Auto-fix |
|---|---|---|---|---|---|---|
| STG-01 | Block public access at account and resource level | On | Binary | Critical | L1 | No |
| STG-02 | No anonymous read via ACL or policy | None | Binary | Critical | L1 | No |
| STG-03 | No anonymous write | None | Binary | Critical | L1 | No |
| STG-04 | Encryption at rest | On | Binary | High | L1 | Yes |
| STG-05 | Customer-managed keys for confidential and restricted data | CMK | Binary | Medium | L2 | No |
| STG-06 | Key rotation | ≤ 365 days | Threshold (max) | Medium | L1 | Yes |
| STG-07 | Encrypted transport only, minimum TLS 1.2 | HTTPS only, TLS ≥ 1.2 | Ordinal (TLS 1.0 = 1, 1.1 = 0.5) | High | L1 | Yes |
| STG-08 | Versioning | On | Binary | Medium | L1 | Yes |
| STG-09 | Immutability (object lock) on backup storage | On | Binary | Medium | L2 | No |
| STG-10 | Access logging | On | Binary | Medium | L1 | Yes |
| STG-11 | Object-level audit logging (data events) | On | Binary | Medium | L2 | Yes |
| STG-12 | Soft delete / delete protection | ≥ 7 days | Threshold (min) | Medium | L1 | Yes |
| STG-13 | Shared-access token lifetime (SAS, pre-authenticated requests, signed URLs) | ≤ 1 hour (PAR ≤ 7 days) | Threshold (max) | High | L1 | No |
| STG-14 | Access keys rotated, or shared-key access disabled | ≤ 90 days or off | Threshold (max) | High | L1 | No |
| STG-15 | Default-deny network access, private endpoint for restricted data | Deny + private | Binary | High | L2 | No |
| STG-16 | Cross-account access only to approved principals | Approved list | Count of unapproved principals | High | L1 | No |
| STG-17 | Lifecycle and retention policy per classification | Present | Binary | Low | org | Yes |
| STG-18 | Replication for tier 1 data | On | Binary | Low | org | No |
| STG-19 | File shares not exported publicly (NFS/SMB) | Private | Binary | Critical | L1 | No |
| STG-20 | Snapshots and backups not shared publicly | Private | Binary | Critical | L1 | No |
| STG-21 | Owner and classification tags present | Present | Binary | Low | org | No |

### Control catalog: firewall and network (20)

| ID | Control | Expected | Drift measure | Sev | Level | Auto-fix |
|---|---|---|---|---|---|---|
| NET-01 | No SSH (22) from 0.0.0.0/0 | None | Exposure | Critical | L1 | No |
| NET-02 | No RDP (3389) from 0.0.0.0/0 | None | Exposure | Critical | L1 | No |
| NET-03 | No admin ports from ::/0 (IPv6) | None | Exposure | Critical | L1 | No |
| NET-04 | No database ports from the internet (1433, 1521, 3306, 5432, 6379, 9200, 27017) | None | Exposure | Critical | L1 | No |
| NET-05 | Default security group allows no traffic | Deny all | Binary | High | L1 | No |
| NET-06 | Network ACLs: no unrestricted admin ingress | None | Exposure | High | L1 | No |
| NET-07 | Flow logs on every virtual network | On | Binary | High | L1 | Yes |
| NET-08 | Flow log retention | ≥ 90 days | Threshold (min) | Medium | L1 | Yes |
| NET-09 | No allow-all protocol and port rules | None | Exposure (port breadth) | High | L1 | No |
| NET-10 | Egress restricted from restricted-data subnets | Allow-list | Binary | Medium | L2 | No |
| NET-11 | No source wider than /16 on any allow rule | ≤ /16 | Exposure (CIDR breadth) | High | org | No |
| NET-12 | No rules unused for 90 days | 0 stale | Count | Low | org | No |
| NET-13 | WAF in front of internet-facing load balancers | On | Binary | High | L2 | No |
| NET-14 | Private subnets have no internet gateway route | None | Binary | High | L1 | No |
| NET-15 | Network monitoring enabled per region (Network Watcher or equivalent) | On | Binary | Medium | L1 | Yes |
| NET-16 | No peering from non-production into production | None | Binary | High | org | No |
| NET-17 | Admin access only through bastion or just-in-time access | On | Binary | High | L2 | No |
| NET-18 | Every subnet has a security list or NSG attached | Attached | Binary | Medium | L1 | No |
| NET-19 | DDoS protection on public endpoints | On | Binary | Low | L2 | No |
| NET-20 | Management ports not open to broad partner ranges (/8 to /16) | None | Exposure | High | org | No |

Each control also stores: the intent, the per-cloud setting name and CIS section mapping, console steps, a CLI command, a Terraform snippet, the owner team, and an effort estimate.

---

## Measuring drift

### Deviation (0 to 1) per control per resource

| Measure | Formula | Example |
|---|---|---|
| Binary | 1 if not met, 0 if met | Versioning off → 1 |
| Threshold (min) | `min(1, (expected − actual) / expected)` | Retention 30 vs 90 → 0.67 |
| Threshold (max) | `min(1, (actual − expected) / expected)` | Key age 450 vs 365 → 0.23 |
| Ordinal | Mapped steps | TLS 1.0 → 1, TLS 1.1 → 0.5 |
| Exposure (CIDR breadth) | `log2(addresses) / 32` for IPv4 (IPv6: `/128`) | 0.0.0.0/0 → 1.0 · /8 → 0.75 · /16 → 0.5 · /32 → 0 |
| Exposure (port breadth) | All ports 1.0; a range scales by `log2(ports) / 16` | 0–65535 → 1.0 |
| Count | `min(1, count / cap)` | 3 unapproved principals, cap 5 → 0.6 |

### Scores
* **Severity weight:** Critical 10 · High 6 · Medium 3 · Low 1.
* **Resource drift score** (0–100) = `100 × Σ(weight × deviation) / Σ(weight)` over the controls that apply to that resource type and level.
* **Resource conformance** = 100 − drift score.
* **Fleet conformance** = average resource conformance; also shown by cloud, resource type, business unit, and team.
* **Drift age** = days since the control was last met (from config history).
* **Re-drift** = a control met by a fix within the last 90 days and unmet again. Re-drift rate = re-drifted fixes ÷ fixes.

### Priority: impact × likelihood (5 × 5)

| Impact (1–5) | Rule |
|---|---|
| Data classification | Restricted 5 · Confidential 4 · Internal 2 · Public 1 (storage); for firewalls, the most sensitive data reachable in the subnet |
| Criticality | Tier 1 → at least 4 · Tier 2 → at least 3 |
| Environment | Non-production −1 (minimum 1) |

| Likelihood (1–5) | Rule |
|---|---|
| Exposure | Internet or anonymous 5 · partner range 4 · peered network 2 · isolated 1 |
| Attack path | +1 for admin or database port, or anonymous write |
| Compensating control | −1 for WAF, private endpoint, or just-in-time access |
| Drift age | +1 if older than 30 days |
| Bounds | Minimum 1, maximum 5 |

Risk = impact × likelihood (1–25).

| Priority | Risk | Fix-time target |
|---|---|---|
| P1 | 20–25 | 48 hours |
| P2 | 12–19 | 7 days |
| P3 | 6–11 | 30 days |
| P4 | 1–5 | 90 days |

Every score has a **Why?** that lists each factor.

---

## Functional requirements

### Views

One question per view. Top navigation: **Baseline · Inventory · Drift · Exposure · Prioritize · Report**, shortcuts `1`–`6`.

| View | Question | Main visual | Interactions |
|---|---|---|---|
| **Baseline** | What does good look like? | Six benchmark cards with versions; assumptions; the control catalog as a filterable table with a six-cloud mapping strip per control | Filter by domain, severity, level, auto-fix; open a control → per-cloud setting, CIS section, intent, remediation; **Propose change** (new baseline version, lead publishes) |
| **Inventory** | What do we have? | Cloud × type grid (storage, or firewall with a toggle) sized by count; network topology mini-map (virtual networks → subnets) | Click a cell → resources list |
| **Drift** | Where have we drifted, and how far? | KPIs (fleet conformance, drifted resources, drift score, P1 count, re-drift rate); conformance by cloud; Pareto of drift by control; cloud × control-family heatmap; 90-day trend with re-drift marked | Filters by cloud, team, environment; click any bar to filter |
| **Exposure** | What's open, and how widely? | Network map of the riskiest virtual networks: subnets as tiles, open ports as badges; CIDR breadth bars (address count, log scale); port exposure matrix (port × cloud) | Click a rule → drawer |
| **Prioritize** | What do we fix first? | 5 × 5 impact × likelihood matrix with counts; prioritized queue P1–P4 with fix-time targets and drift age | Click a cell to filter; **Quick wins** tab (auto-fix eligible, ranked by drift removed) |
| **Report** | How are we doing? | Conformance trend, by cloud and team, top drifts, re-drift, exceptions expiring; simulated AI summary | **Export CSV**; print view |

### Resource drawer
* Resource, cloud, type, account, network, owner team, environment, classification, deployed by (module or console).
* Drift score ring and each drifted control: **expected vs actual** side by side, deviation bar, drift age.
* Impact and likelihood with **Why?**.
* Remediation for its cloud: console steps, CLI, and Terraform, labeled simulated.
* Actions: **Fix in code** (preferred) or **Fix in console** (warns of re-drift risk), **Request exception**, **Re-check**.
* History: config changes over 90 days, including past fixes and re-drifts.

### Workflow
`Drifted → Fix submitted (code or console) → Re-check → Conforming`, or `Excepted (until date)`.
* Console fixes have a 45% chance to re-drift on the next simulated deployment *(assumed)*; code fixes do not.
* Auto-fix batch: select eligible drifts → lead approves → apply → re-check all.

### Global
Persona switcher (cloud engineer, cloud security lead, engineering manager), Checks panel (K1–K10), activity log, reset, presenter mode, "simulated" tags, and the required footer on every view.

### Example remediations (shown in the drawer; simulated, verify before use)

| Control | Cloud | Fix |
|---|---|---|
| STG-01 | AWS | `aws s3api put-public-access-block --bucket <b> --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true` |
| STG-01 | Azure | `az storage account update -n <acct> --allow-blob-public-access false` |
| STG-01 | Google Cloud | `gcloud storage buckets update gs://<b> --public-access-prevention` |
| STG-07 | Azure | `az storage account update -n <acct> --min-tls-version TLS1_2 --https-only true` |
| NET-01 | AWS | `aws ec2 revoke-security-group-ingress --group-id <sg> --protocol tcp --port 22 --cidr 0.0.0.0/0` |
| NET-01 | Google Cloud | `gcloud compute firewall-rules update <rule> --source-ranges=<bastion-range>` |
| NET-07 | AWS | `aws ec2 create-flow-logs --resource-type VPC --resource-ids <vpc> --traffic-type ALL --log-destination-type cloud-watch-logs` |
| Any | Terraform | Module change shown as a diff (for example `block_public_access = true`, `min_tls_version = "TLS1_2"`) |

---

## Data and code structure

```
OC-02_storage-firewall-drift-checker/
  index.html
  README.md
  REQUIREMENTS.md
  css/styles.css
  assets/fonts/              Fraunces, Inter (local)
  js/
    baseline.js              benchmarks, assumptions, 41 controls with per-cloud mappings and fixes
    estate.js                seeded generator: accounts, networks, subnets, storage, firewalls, rules, 90-day history
    drift.js                 evaluate(resource, baseline) → deviations, drift score, conformance (pure)
    priority.js              impact, likelihood, risk, priority, why (pure)
    remediate.js             fix workflow, auto-fix approvals, re-check, re-drift (pure)
    app.js                   views, charts, drawers, checks, log
```

Resource schema:

```json
{
  "id": "aws-sg-0a1b2c",
  "cloud": "aws",
  "type": "security-group",
  "account": "pay-prod",
  "network": "vpc-payroll-prod",
  "team": "Payroll Platform",
  "env": "prod",
  "classification": "restricted",
  "tier": 1,
  "deployedBy": "console",
  "config": { "ingress": [{ "port": 22, "proto": "tcp", "cidr": "0.0.0.0/0", "since": "2026-07-22" }] }
}
```

Drift result schema:

```json
{
  "resourceId": "aws-sg-0a1b2c",
  "controlId": "NET-01",
  "expected": "No SSH from 0.0.0.0/0",
  "actual": "SSH from 0.0.0.0/0",
  "deviation": 1.0,
  "ageDays": 97,
  "impact": 5, "likelihood": 5, "risk": 25, "priority": "P1",
  "why": ["Restricted payroll data reachable", "Internet-exposed", "Admin port", "Open 97 days"]
}
```

`drift.js`, `priority.js`, and `remediate.js` have no browser dependencies, so they run under Node for tests. `estate.js` is the module to replace with real exports (CSPM, cloud config APIs) later.

---

## Acceptance criteria
* Opens from `index.html` offline with no network requests.
* Seeded generator: the planted findings and all counts match on every load and after reset.
* All ten known-answer checks pass.
* No auto-fix runs without approval, or on a non-eligible control. Nothing counts as fixed without a re-check.
* Every drift, score, and AI output has a **Why?**, and AI output carries a "simulated" tag.
* Master brief quality checks: proofreading, singular and plural at 0 and 1, layout at 1920×1080 and 1366×768, no console errors.
* Footer on every screen, including presenter mode: "For demo purposes only. All data is fictional and does not represent any organization. · Built by Aby Rao"

---

## Open questions for Aby
1. Keep Google Cloud as the sixth cloud? Azure was mentioned twice in the voice notes.
2. Fix-time targets (48 hours, 7, 30, 90 days): use these, or your own?
3. Should the Report view group conformance by business unit, by team, or both?
