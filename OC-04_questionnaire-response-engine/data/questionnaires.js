/* OC-04 · Incoming customer questionnaires (fictional).
   The engine generates the question text from the bank's phrasings with a fixed seed,
   so every load produces the same 463 questions.
   held:     questions that match an entry that is stale, expiring, or legal-flagged (entry id → count)
   review:   questions with loose wording that match below the 85 auto-answer threshold
   noMatch:  questions with no bank entry above 60; the simulated AI drafts these */
window.OC4 = window.OC4 || {};

OC4.questionnaires = [
  { id: 'BPL', customer: 'Bluepeak Logistics', short: 'Bluepeak', format: 'SIG Lite', count: 128,
    tier: 'Enterprise', arr: 420000, due: '2026-11-06', dealClose: '2026-11-20', nda: 'Signed',
    products: ['Payroll', 'Time'], industry: 'Freight and warehousing',
    held: { B01: 3, B02: 1, B03: 2, B13: 2, B15: 1, B19: 1, B20: 1, B27: 1, B24: 1, B29: 1 },
    review: 12,
    noMatch: [
      { domain: 'crypto', text: 'Do you support customer-managed encryption keys (BYOK) for our tenant?', conf: 47, rel: ['B09', 'B11'],
        draft: 'Harborline does not currently offer customer-managed encryption keys. Customer data is encrypted at rest with AES-256, using keys Harborline manages in a cloud key management service. [Needs input: confirm whether BYOK is on the product roadmap.]' }
    ] },
  { id: 'CVH', customer: 'Cedar Valley Health', short: 'Cedar Valley', format: 'CAIQ v4', count: 261,
    tier: 'Strategic', arr: 1100000, due: '2026-11-13', dealClose: '2026-12-01', nda: 'Signed',
    products: ['Payroll', 'Time', 'Benefits', 'HR'], industry: 'Regional health system',
    held: { B01: 4, B02: 1, B03: 1, B11: 2, B13: 1, B15: 1, B19: 1, B33: 1, B38: 1, B20: 2, B27: 2, B28: 2, B24: 1 },
    review: 20,
    noMatch: [
      { domain: 'gov', text: 'Describe governance for AI or machine learning models that process customer data, including bias testing and human oversight.', conf: 38, rel: ['B33', 'B34'],
        draft: 'Harborline does not use customer data to train AI models. [Needs input: owner for AI model governance, bias testing approach, and human oversight steps. No bank entry or evidence found.]' },
      { domain: 'crypto', text: 'Do you have a roadmap for adopting post-quantum cryptography?', conf: 52, rel: ['B09', 'B10'],
        draft: 'Customer data is encrypted with AES-256 at rest and TLS 1.2 or higher in transit. [Needs input: post-quantum cryptography roadmap. No bank entry or evidence found.]' },
      { domain: 'gov', text: 'What controls govern workforce use of generative AI tools with customer data?', conf: 55, rel: ['B33'],
        draft: 'Employees may use only approved generative AI tools, and customer data may not be entered into unapproved tools. [Check: this depends on the pending Acceptable Use Policy v5.0 change to entry B33.]' }
    ] },
  { id: 'MRG', customer: 'Monarch Retail Group', short: 'Monarch', format: 'Custom', count: 74,
    tier: 'Mid-market', arr: 95000, due: '2026-11-04', dealClose: '2026-11-15', nda: 'Pending',
    products: ['Payroll'], industry: 'Specialty retail, 140 stores',
    held: { B01: 2, B27: 1, B29: 1 },
    review: 7,
    noMatch: [
      { domain: 'access', text: 'Will your staff ever need access to our point-of-sale environment?', conf: 34, rel: ['B05', 'B43'],
        draft: 'No. Harborline\'s payroll service does not require access to customer point-of-sale systems; data is exchanged through the platform\'s secure file transfer and APIs. [Confirm with the implementation team.]' },
      { domain: 'physical', text: 'Do store managers need to install any software on store devices?', conf: 41, rel: ['B59', 'B60'],
        draft: 'No installation is required for Payroll; managers use a supported web browser. [Confirm: no time clocks are in scope for Monarch.]' }
    ],
    outOfScope: ['B60'] }
];

OC4.personas = [
  { id: 'analyst', name: 'Lena Ortiz', role: 'GRC analyst',       can: ['answer', 'export'] },
  { id: 'lead',    name: 'Sam Patel',  role: 'Security lead',     can: ['answer', 'export', 'bank'] },
  { id: 'counsel', name: 'Joan Kim',   role: 'Counsel',           can: ['legal'] },
  { id: 'sales',   name: 'Chris Doyle', role: 'Account executive', can: [] }
];

/* Effort assumptions, in minutes. Shown in tooltips. */
OC4.effort = { manualPerQuestion: 4.5, review: 2, draft: 6, expiring: 1.5, bankChange: 3, legal: 5 };
OC4.autoThreshold = 85;
OC4.matchFloor = 60;
