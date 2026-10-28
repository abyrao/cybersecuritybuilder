/* OC-04 · Source feeds and the signals they emitted (fictional).
   A signal makes a bank entry stale when its date is after the entry's last review.
   The engine proposes the new answer; a person approves it. */
window.OC4 = window.OC4 || {};

OC4.feeds = [
  { id: 'pmo',     name: 'PMO tracker',     tool: 'Project portfolio tool', tip: 'Project milestones closed by the project management office' },
  { id: 'iam',     name: 'IAM platform',    tool: 'Identity governance',    tip: 'Access review results and privileged account coverage' },
  { id: 'policy',  name: 'Policy library',  tool: 'Policy management',      tip: 'Approved policy versions and their effective dates' },
  { id: 'audit',   name: 'Audit reports',   tool: 'GRC evidence store',     tip: 'Attestations, certificates, and test reports with expiry dates' },
  { id: 'scanner', name: 'Vuln scanner',    tool: 'Vulnerability scanner',  tip: 'Remediation SLA performance over the last 90 days' }
];

/* kind: 'text' = proposes new answer text · 'evidence' = same text, new evidence version
   · 'legal' = touches a legal-locked entry: flag only, Counsel decides */
OC4.signals = [
  { id: 'S01', feed: 'pmo', entry: 'B01', date: '2026-10-09', owner: 'PMO · Workforce MFA program', kind: 'text',
    summary: 'MFA rollout complete: all 37 applications enforce MFA through SSO',
    record: 'PRJ-2291 "Workforce MFA" closed. 37 of 37 applications enforce phishing-resistant MFA via the identity provider. Closure approved by program sponsor on Oct 9, 2026.',
    proposed: 'MFA is enforced for all workforce access to all 37 company applications through single sign-on, including remote and administrative access. The rollout completed on October 9, 2026, and enforcement is monitored daily in the identity platform.' },
  { id: 'S02', feed: 'iam', entry: 'B02', date: '2026-10-14', owner: 'IAM platform · Privileged account report', kind: 'text',
    summary: 'Privileged accounts vaulted: 212 of 212',
    record: 'Privileged account coverage report, Oct 14, 2026: 212 of 212 privileged accounts vaulted with check-out and automatic rotation.',
    proposed: 'All 212 privileged accounts are stored in a password vault with check-out approval and automatic credential rotation. Privileged sessions on production are recorded.' },
  { id: 'S03', feed: 'iam', entry: 'B03', date: '2026-10-03', owner: 'IAM platform · Access certification', kind: 'text',
    summary: 'Q3 access review complete: 100% of in-scope accounts certified',
    record: 'Q3 2026 certification campaign closed Oct 3: 100% of in-scope accounts certified, 1,284 entitlements removed, removals confirmed in target systems.',
    proposed: 'Managers certify user access to in-scope systems every quarter. The Q3 2026 review certified 100% of in-scope accounts, and every revoked entitlement was confirmed removed in the target system.' },
  { id: 'S04', feed: 'pmo', entry: 'B11', date: '2026-09-25', owner: 'PMO · Key management automation', kind: 'text',
    summary: 'Key rotation automated: every 90 days',
    record: 'PRJ-2207 "KMS rotation automation" closed Sep 25, 2026. Customer data keys rotate automatically every 90 days.',
    proposed: 'Encryption keys are held in a cloud key management service with access limited to named administrators. Keys for customer data rotate automatically every 90 days.' },
  { id: 'S05', feed: 'scanner', entry: 'B13', date: '2026-10-20', owner: 'Vulnerability scanner · SLA report', kind: 'text',
    summary: 'Critical remediation SLA met 97% over 90 days',
    record: 'SLA report for Jul 22 to Oct 20, 2026: 97% of critical findings remediated within 15 days; 94% of high within 30 days.',
    proposed: 'Critical vulnerabilities are remediated within 15 days and high within 30 days. Over the last 90 days, 97% of critical findings met the SLA.' },
  { id: 'S06', feed: 'audit', entry: 'B15', date: '2026-10-01', owner: 'Audit reports · 2026 penetration test', kind: 'text',
    summary: '2026 penetration test: no critical findings, 2 high closed',
    record: '2026 independent penetration test report delivered Oct 1, 2026. 0 critical, 2 high (both remediated and retested), 5 medium in progress.',
    proposed: 'An independent firm tests the platform annually. The October 2026 test found no critical findings; both high findings were remediated and retested.',
    evidence: { name: '2026 penetration test summary', expires: '2027-10-01' } },
  { id: 'S07', feed: 'policy', entry: 'B19', date: '2026-10-15', owner: 'Policy library · Incident Response Policy', kind: 'evidence',
    summary: 'Incident Response Policy v4.2 approved',
    record: 'Incident Response Policy v4.2 approved Oct 15, 2026. Changes: updated contact roster and severity examples. No change to commitments.',
    evidence: { name: 'Incident Response Policy v4.2', expires: '2027-10-15' } },
  { id: 'S08', feed: 'policy', entry: 'B33', date: '2026-09-18', owner: 'Policy library · Acceptable Use Policy', kind: 'text',
    summary: 'Acceptable Use Policy v5.0 adds generative AI rules',
    record: 'Acceptable Use Policy v5.0 approved Sep 18, 2026. New section 6: approved generative AI tools only; no customer data in unapproved tools.',
    proposed: 'The acceptable use policy covers company devices, email, internet use, data handling, and generative AI. Only approved AI tools may be used, and customer data may not be entered into unapproved tools. Employees acknowledge the policy annually.',
    evidence: { name: 'Acceptable Use Policy v5.0', expires: '2027-09-18' } },
  { id: 'S09', feed: 'pmo', entry: 'B38', date: '2026-09-30', owner: 'PMO · DLP expansion', kind: 'text',
    summary: 'Email DLP rollout complete',
    record: 'PRJ-2174 "DLP for email" closed Sep 30, 2026. Outbound email with Restricted data is blocked or encrypted.',
    proposed: 'DLP monitors endpoints, cloud storage, and outbound email for Restricted data. Email containing Restricted data is blocked or encrypted automatically.' },
  { id: 'S10', feed: 'policy', entry: 'B20', date: '2026-10-20', owner: 'Policy library · Breach notification procedure', kind: 'legal',
    summary: 'Breach procedure v3.1: notify customers within 48 hours',
    record: 'Breach notification procedure v3.1 approved Oct 20, 2026 by the CISO. Internal target for customer notice moves from 72 to 48 hours.',
    proposed: 'Harborline notifies affected customers of a confirmed security breach involving their data without undue delay and within 48 hours of confirmation.' }
];

/* Evidence expiry is read from bank.js; the audit feed also lists it for the rail. */
OC4.expiryWindowDays = 60;
OC4.today = '2026-10-28';
