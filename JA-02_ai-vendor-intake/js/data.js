/* JA-02 · fictional reference data. Every vendor, person, URL, and quote is invented. */
(function (root) {
  const TODAY = "2026-10-26";

  // Public source types the recon checks
  const SOURCE_TYPES = {
    trust:   { label: "Trust center",        icon: "◆" },
    privacy: { label: "Privacy policy",      icon: "§" },
    terms:   { label: "Terms of service",    icon: "¶" },
    subproc: { label: "Subprocessor list",   icon: "⋔" },
    aipolicy:{ label: "AI policy / model card", icon: "✦" },
    certs:   { label: "Certification registry", icon: "✓" },
    sectxt:  { label: "security.txt + bug bounty", icon: "⌘" },
    news:    { label: "News and breach database", icon: "◉" },
    reg:     { label: "Regulatory signals",  icon: "⚖" }
  };

  // Fields the recon fills. group drives the card layout.
  const FIELDS = [
    { id: "product",      label: "Product",            group: "Company" },
    { id: "hq",           label: "Headquarters",       group: "Company" },
    { id: "employees",    label: "Employees",          group: "Company" },
    { id: "modelProvider",label: "Model provider",     group: "AI and models" },
    { id: "aiFeatures",   label: "AI features",        group: "AI and models" },
    { id: "euAiAct",      label: "EU AI Act category", group: "AI and models" },
    { id: "training",     label: "Trains on your data", group: "Your data", scored: true },
    { id: "retention",    label: "Retention",          group: "Your data" },
    { id: "regions",      label: "Hosting regions",    group: "Your data" },
    { id: "subprocessors",label: "Subprocessors",      group: "Your data" },
    { id: "soc2",         label: "SOC 2 Type II",      group: "Assurance", scored: true },
    { id: "iso42001",     label: "ISO 42001",          group: "Assurance", scored: true },
    { id: "sso",          label: "SSO",                group: "Assurance" },
    { id: "disclosure",   label: "Vulnerability disclosure", group: "Assurance" },
    { id: "incidents",    label: "Incidents, 24 months", group: "Signals", scored: true },
    { id: "biasAudit",    label: "Bias audit (NYC LL144)", group: "Signals" }
  ];

  const TRAINING = {
    "none":          { label: "No training, zero retention", pts: 0 },
    "retention30":   { label: "No training, kept up to 30 days", pts: 5 },
    "trains-optout": { label: "Trains on inputs, opt-out available", pts: 15 },
    "trains-noopt":  { label: "Trains on inputs, no opt-out", pts: 25 }
  };

  // Helper: a source document with the facts it supports
  const doc = (type, url, published, checked, facts) => ({ type, url, published, checked, facts });

  const VENDORS = {
    scribely: {
      id: "scribely", name: "Scribely", domain: "scribely.example", initials: "Sc", color: "#22D3EE",
      tagline: "AI meeting notes for sales calls", use: "Record and summarize sales calls, then email notes to customers and sync them to the CRM",
      answers: { data: "pii", role: "external", connection: "calendar", critical: "no", users: 600, owner: "Sales Operations" },
      requesterSays: { training: "none" },
      sources: [
        doc("trust", "https://scribely.example/trust", "2025-11-03", "2026-10-25", {
          training: { value: "none", quote: "We never train on your data." },
          soc2: { value: { status: "current", periodEnd: "2026-06-30" }, quote: "SOC 2 Type II report available under NDA (period ending Jun 30, 2026)." },
          sso: { value: true, quote: "SAML SSO on Business and Enterprise plans." },
          retention: { value: "Recordings 90 days, notes until deleted", quote: "Recordings are deleted after 90 days." } }),
        doc("privacy", "https://scribely.example/privacy", "2026-08-14", "2026-10-25", {
          training: { value: "trains-optout", quote: "Inputs may be used to improve our models unless an administrator opts out." } }),
        doc("terms", "https://scribely.example/terms", "2026-08-14", "2026-10-25", {
          product: { value: "Meeting recorder, AI summaries, CRM sync", quote: "The Service records, transcribes, and summarizes meetings." } }),
        doc("subproc", "https://scribely.example/subprocessors", "2026-07-01", "2026-10-25", {
          subprocessors: { value: 14, quote: "14 subprocessors listed." },
          regions: { value: "US", quote: "Customer data is hosted in the United States." },
          modelProvider: { value: "Cobalt AI (disclosed)", quote: "Cobalt AI · large language model inference · US." } }),
        doc("aipolicy", "https://scribely.example/ai", "2026-05-20", "2026-10-25", {
          aiFeatures: { value: "Transcription, summaries, follow-up email drafts", quote: "Scribely drafts follow-up emails from your call." },
          euAiAct: { value: "limited", quote: "Participants are notified that a meeting is being recorded and summarized." } }),
        doc("certs", "https://registry.example/scribely", "2026-07-15", "2026-10-25", {
          iso42001: { value: false, quote: "No ISO/IEC 42001 certificate on record." } }),
        doc("sectxt", "https://scribely.example/.well-known/security.txt", "2026-02-01", "2026-10-25", {
          disclosure: { value: "security.txt, private bug bounty", quote: "Contact: security@scribely.example" } }),
        doc("news", "https://breachwatch.example/?q=scribely", "2026-10-25", "2026-10-25", {
          incidents: { value: 0, quote: "No incidents reported in the last 24 months." },
          hq: { value: "Austin, TX", quote: "Austin-based Scribely raised a Series B…" },
          employees: { value: "about 220", quote: "…the 220-person company…" } }),
        doc("reg", "https://scribely.example/legal/recording-consent", "2026-03-10", "2026-10-25", {
          biasAudit: { value: "Not applicable", quote: "Not an employment decision tool." } })
      ]
    },

    ledgerlens: {
      id: "ledgerlens", name: "LedgerLens AI", domain: "ledgerlens.example", initials: "LL", color: "#A78BFA",
      tagline: "Invoice and statement extraction for Finance", use: "Extract line items from supplier invoices and bank statements into the ERP",
      answers: { data: "confidential", role: "assistive", connection: "api", critical: "no", users: 40, owner: "Finance Operations" },
      requesterSays: {},
      sources: [
        doc("trust", "https://ledgerlens.example/trust", "2026-09-02", "2026-10-25", {
          soc2: { value: { status: "expired", periodEnd: "2025-08-31" }, quote: "SOC 2 Type II (period ending Aug 31, 2025). Next report in progress." },
          sso: { value: true, quote: "SSO via SAML 2.0." },
          retention: { value: "Documents 30 days", quote: "Source documents are deleted after 30 days." } }),
        doc("privacy", "https://ledgerlens.example/privacy", "2026-06-18", "2026-10-25", {
          training: { value: "trains-optout", quote: "We may use de-identified document data to train and improve extraction models. Customers may opt out." } }),
        doc("terms", "https://ledgerlens.example/terms", "2026-06-18", "2026-10-25", {
          product: { value: "Document extraction API and review console", quote: "LedgerLens extracts structured data from financial documents." } }),
        doc("subproc", "https://ledgerlens.example/subprocessors", "2026-07-22", "2026-10-25", {
          subprocessors: { value: 11, quote: "11 subprocessors (2 added Jul 2026)." },
          regions: { value: "US, EU, Singapore", quote: "Processing locations: United States, Ireland, Singapore." },
          modelProvider: { value: "Cobalt AI (disclosed)", quote: "Cobalt AI replaces Helix LM for extraction models (Jul 2026)." } }),
        doc("aipolicy", "https://ledgerlens.example/ai", "2026-07-22", "2026-10-25", {
          aiFeatures: { value: "OCR, field extraction, anomaly hints", quote: "Extraction is reviewed by a person before posting." },
          euAiAct: { value: "minimal", quote: "Back-office document processing." } }),
        doc("certs", "https://registry.example/ledgerlens", "2026-01-10", "2026-10-25", { iso42001: { value: false, quote: "No ISO/IEC 42001 certificate on record." } }),
        doc("sectxt", "https://ledgerlens.example/.well-known/security.txt", "2025-12-01", "2026-10-25", { disclosure: { value: "security.txt", quote: "Contact: security@ledgerlens.example" } }),
        doc("news", "https://breachwatch.example/?q=ledgerlens", "2026-10-25", "2026-10-25", {
          incidents: { value: 0, quote: "No incidents reported in the last 24 months." }, hq: { value: "Toronto, ON", quote: "Toronto fintech LedgerLens…" }, employees: { value: "about 85", quote: "…85 employees…" } }),
        doc("reg", "https://ledgerlens.example/legal", "2026-06-18", "2026-10-25", { biasAudit: { value: "Not applicable", quote: "Not an employment decision tool." } })
      ],
      // Last assessment on record
      prior: {
        date: "2025-09-15", score: 28, tier: "Medium", analyst: "Ravi Menon",
        facts: { training: "retention30", soc2: { status: "current", periodEnd: "2025-08-31" }, modelProvider: "Helix LM (disclosed)", regions: "US, EU", subprocessors: 9, iso42001: false, incidents: 0 },
        answers: { data: "confidential", role: "assistive", connection: "api", critical: "no", users: 40, owner: "Finance Operations" }
      }
    },

    hiresignal: {
      id: "hiresignal", name: "HireSignal", domain: "hiresignal.example", initials: "HS", color: "#F472B6",
      tagline: "AI candidate screening and ranking", use: "Screen and rank applicants for high-volume Customer Support roles",
      answers: { data: "pii", role: "decisions", connection: "api", critical: "no", users: 35, owner: "Talent Acquisition" },
      requesterSays: {},
      sources: [
        doc("trust", "https://hiresignal.example/trust", "2026-04-11", "2026-10-25", {
          soc2: { value: { status: "current", periodEnd: "2026-03-31" }, quote: "SOC 2 Type II, period ending Mar 31, 2026." }, sso: { value: true, quote: "Okta and Entra ID SSO." },
          retention: { value: "Candidate data 30 days after decision", quote: "Candidate data is deleted 30 days after a hiring decision." } }),
        doc("privacy", "https://hiresignal.example/privacy", "2026-02-02", "2026-10-25", { training: { value: "retention30", quote: "We do not train on customer candidate data." } }),
        doc("terms", "https://hiresignal.example/terms", "2026-02-02", "2026-10-25", { product: { value: "Resume screening, candidate ranking", quote: "HireSignal scores and ranks applicants against job requirements." } }),
        doc("subproc", "https://hiresignal.example/subprocessors", "2026-05-05", "2026-10-25", {
          subprocessors: { value: 7, quote: "7 subprocessors." }, regions: { value: "US", quote: "Hosted in the US." }, modelProvider: { value: "In-house ranking model", quote: "Proprietary ranking model." } }),
        doc("aipolicy", "https://hiresignal.example/model-card", "2026-03-01", "2026-10-25", {
          aiFeatures: { value: "Ranking, shortlist recommendations", quote: "Recruiters can accept or override recommendations." },
          euAiAct: { value: "high", quote: "Recruitment and selection tools are high-risk under Annex III." } }),
        doc("certs", "https://registry.example/hiresignal", "2026-04-11", "2026-10-25", { iso42001: { value: false, quote: "ISO/IEC 42001 certification in progress." } }),
        doc("sectxt", "https://hiresignal.example/.well-known/security.txt", "2026-01-15", "2026-10-25", { disclosure: { value: "security.txt, public bug bounty", quote: "Bug bounty via a public program." } }),
        doc("news", "https://breachwatch.example/?q=hiresignal", "2026-10-25", "2026-10-25", {
          incidents: { value: 0, quote: "No incidents reported in the last 24 months." }, hq: { value: "New York, NY", quote: "New York-based HireSignal…" }, employees: { value: "about 140", quote: "…140 staff…" } }),
        doc("reg", "https://hiresignal.example/bias-audit-2025.pdf", "2025-05-20", "2026-10-25", { biasAudit: { value: "Published May 20, 2025", quote: "Independent bias audit summary, May 2025." } })
      ]
    },

    docudraft: {
      id: "docudraft", name: "DocuDraft", domain: "docudraft.example", initials: "DD", color: "#34D399",
      tagline: "Writing assistant on an enterprise tenant", use: "Draft and tidy internal policies and project updates",
      answers: { data: "internal", role: "assistive", connection: "sso", critical: "no", users: 300, owner: "Internal Communications" },
      requesterSays: {},
      sources: [
        doc("trust", "https://docudraft.example/trust", "2026-09-10", "2026-10-25", {
          training: { value: "none", quote: "Enterprise data is never used for training and is not retained." },
          soc2: { value: { status: "current", periodEnd: "2026-06-30" }, quote: "SOC 2 Type II, period ending Jun 30, 2026." }, sso: { value: true, quote: "SAML SSO and SCIM." },
          retention: { value: "Zero retention", quote: "Prompts are not stored." } }),
        doc("privacy", "https://docudraft.example/privacy", "2026-09-10", "2026-10-25", { training: { value: "none", quote: "We do not use enterprise content to train models." } }),
        doc("terms", "https://docudraft.example/terms", "2026-09-10", "2026-10-25", { product: { value: "Drafting and editing assistant", quote: "DocuDraft helps users draft and edit documents." } }),
        doc("subproc", "https://docudraft.example/subprocessors", "2026-08-01", "2026-10-25", {
          subprocessors: { value: 5, quote: "5 subprocessors." }, regions: { value: "US, EU", quote: "Hosted in the US and EU." }, modelProvider: { value: "Helix LM (disclosed)", quote: "Helix LM · inference." } }),
        doc("aipolicy", "https://docudraft.example/ai", "2026-08-01", "2026-10-25", { aiFeatures: { value: "Drafting, rewriting, summaries", quote: "Users review all output." }, euAiAct: { value: "minimal", quote: "General writing assistance." } }),
        doc("certs", "https://registry.example/docudraft", "2026-06-02", "2026-10-25", { iso42001: { value: true, quote: "ISO/IEC 42001 certificate, issued Jun 2, 2026." } }),
        doc("sectxt", "https://docudraft.example/.well-known/security.txt", "2026-03-01", "2026-10-25", { disclosure: { value: "security.txt, public bug bounty", quote: "Public bug bounty." } }),
        doc("news", "https://breachwatch.example/?q=docudraft", "2026-10-25", "2026-10-25", {
          incidents: { value: 0, quote: "No incidents reported in the last 24 months." }, hq: { value: "Dublin, Ireland", quote: "Dublin-based DocuDraft…" }, employees: { value: "about 400", quote: "…400 employees…" } }),
        doc("reg", "https://docudraft.example/legal", "2026-09-10", "2026-10-25", { biasAudit: { value: "Not applicable", quote: "Not an employment decision tool." } })
      ]
    },

    promptpal: {
      id: "promptpal", name: "PromptPal", domain: "promptpal.example", initials: "PP", color: "#FBBF24",
      tagline: "Consumer AI chatbot", use: "Brainstorm campaign ideas",
      blocked: { rule: "BL-09", reason: "AI apps whose terms allow training on user inputs with no opt-out", decided: "AI Governance Committee · blocklist v3.2 · Oct 14, 2026" },
      alternatives: ["Microsoft 365 Copilot", "ChatGPT Enterprise", "Claude Enterprise"]
    }
  };

  // Answer options for "Your use"
  const ANSWERS = {
    data: { label: "Data we'd send", opts: [["none", "None", 0], ["internal", "Internal", 10], ["confidential", "Confidential business", 20], ["pii", "Customer or employee PII", 25], ["regulated", "Regulated personal", 30]],
      tip: "Regulated personal data: health, cardholder, payroll, government ID" },
    role: { label: "AI role", opts: [["assistive", "Assistive", 0], ["external", "Content shared outside", 5], ["actions", "Takes actions", 15], ["decisions", "Decisions about people", 25]],
      tip: "Decisions about people: hiring, promotion, termination, credit" },
    connection: { label: "Connection", opts: [["web", "Web only", 0], ["sso", "SSO", 3], ["api", "API or data sync", 8], ["calendar", "Mailbox, drive, calendar, or extension", 12]],
      tip: "Deeper access means more of our data reaches the vendor" },
    critical: { label: "Critical activity?", opts: [["no", "No", 0], ["yes", "Yes", 0]],
      tip: "Would a failure significantly affect customers, financial results, or operations? From the 2023 US interagency guidance." },
    users: { label: "Users", opts: [[25, "Under 50", 0], [200, "50–500", 0], [600, "Over 500", 5]], tip: "More than 500 users adds 5 points" }
  };

  // Approved AI vendors already in the register (LedgerLens is the one with full demo data)
  const REGISTER = [
    ["LedgerLens AI", "Medium", "Finance Operations", "2025-09-15", "ledgerlens"],
    ["Northgate Translate", "Low", "Marketing", "2023-11-20"], ["CaseCraft", "Medium", "Legal", "2024-12-10"], ["Pixelry Studio", "Low", "Marketing", "2025-03-21"],
    ["VoiceBridge", "High", "Customer Support", "2026-05-06"], ["CodeKite", "High", "Engineering", "2026-04-18"], ["SurveySense", "Low", "People", "2023-10-02"],
    ["ContractIQ", "Medium", "Legal", "2025-10-30"], ["Forecastly", "Medium", "Finance Operations", "2026-02-27"], ["DeskMate", "Low", "IT", "2025-06-12"],
    ["TicketTide", "Medium", "Customer Support", "2025-11-20"], ["SlideSmith", "Low", "Sales Operations", "2025-01-09"], ["RiskRadar AI", "High", "Security", "2026-06-02"],
    ["Learnloop", "Low", "People", "2025-08-14"], ["QueryPilot", "Medium", "Data", "2026-01-22"], ["AdVantage AI", "Medium", "Marketing", "2024-08-03"],
    ["SupportGenie", "Critical", "Customer Support", "2026-03-11"], ["PolicyPal Pro", "Low", "Compliance", "2026-08-19"]
  ].map(([name, tier, owner, last, id]) => ({ name, tier, owner, last, id: id || null }));

  const PERSONAS = [
    { id: "maya", name: "Maya Torres", role: "Requester", type: "requester" },
    { id: "ravi", name: "Ravi Menon", role: "Third-party risk analyst", type: "analyst" },
    { id: "lena", name: "Lena Park", role: "AI Governance Committee chair", type: "committee" }
  ];

  root.JD = { TODAY, SOURCE_TYPES, FIELDS, TRAINING, VENDORS, ANSWERS, REGISTER, PERSONAS };
})(typeof window !== "undefined" ? window : globalThis);
