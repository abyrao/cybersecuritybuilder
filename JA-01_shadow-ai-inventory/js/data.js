/* JA-01 · fictional reference data. Blacklisted and unreviewed apps use invented names. */
(function (root) {
  const TODAY = "2026-10-26", START = "2026-09-27";
  const CLOSE = ["2026-10-01", "2026-10-08"]; // Q3 close

  // Generic name first (default), product name behind the toggle
  const SOURCES = [
    { id: "okta",     generic: "Identity provider",   product: "Okta",               cat: "SSO",              sync: 4,  adds: "Sign-ins to AI apps and which tenant was used" },
    { id: "entra",    generic: "Cloud directory",     product: "Microsoft Entra ID", cat: "SSO / OAuth",      sync: 6,  adds: "Third-party AI app consents and scopes" },
    { id: "chrome",   generic: "Browser management",  product: "Chrome Enterprise",  cat: "Browser",          sync: 12, adds: "AI site visits and AI extensions with their permissions" },
    { id: "zscaler",  generic: "Web gateway",         product: "Zscaler",            cat: "Network",          sync: 3,  adds: "AI traffic, uploads, and meetings joined by AI bots" },
    { id: "umbrella", generic: "DNS security",        product: "Cisco Umbrella",     cat: "Network",          sync: 2,  adds: "Lookups to AI domains with no other trace" },
    { id: "falcon",   generic: "EDR",                 product: "CrowdStrike Falcon", cat: "Endpoint",         sync: 5,  adds: "AI software installed or running, host details, online status" },
    { id: "purview",  generic: "DLP",                 product: "Microsoft Purview",  cat: "Data protection",  sync: 9,  adds: "Sensitive data sent to AI destinations" },
    { id: "concur",   generic: "Expense system",      product: "SAP Concur",         cat: "Finance",          sync: 1440, adds: "AI subscriptions on expense reports" },
    { id: "amex",     generic: "Corporate card feed", product: "Amex corporate card", cat: "Finance",         sync: 1440, adds: "AI merchant charges" },
    { id: "coupa",    generic: "Procurement",         product: "Coupa",              cat: "Finance",          sync: 1440, adds: "AI vendor invoices and purchase orders" }
  ];
  const GAPS = [
    ["Contractor laptops", "No browser telemetry on unmanaged devices"],
    ["Personal phones", "Only DNS and gateway traffic on the corporate network"]
  ];

  const DEPTS = [
    { id: "FIN", name: "Finance", hc: 310 }, { id: "HR", name: "HR", hc: 180 }, { id: "SAL", name: "Sales", hc: 820 },
    { id: "MKT", name: "Marketing", hc: 260 }, { id: "ENG", name: "Engineering", hc: 1150 }, { id: "SUP", name: "Customer Support", hc: 720 },
    { id: "LEG", name: "Legal", hc: 90 }, { id: "OPS", name: "Operations", hc: 590 }, { id: "EXE", name: "Executive", hc: 80 }
  ];

  // Sanctioned register (real enterprise products on the organization's tenant)
  const SANCTIONED = [
    { id: "copilot", name: "Microsoft 365 Copilot", seats: 1800, assigned: 1712 },
    { id: "chatgpt", name: "ChatGPT Enterprise", seats: 900, assigned: 688 },
    { id: "claude", name: "Claude Enterprise", seats: 600, assigned: 571 },
    { id: "ghcopilot", name: "GitHub Copilot Business", seats: 700, assigned: 664 },
    { id: "gemini", name: "Gemini for Workspace", seats: 150, assigned: 131 }
  ];

  // App catalog: status sanctioned | tolerated | blacklisted | unreviewed
  // cat: chat, file, extension, endpoint, notetaker, code, agent, image, api, sheet, mail, writing, search, video, voice
  const A = (id, name, status, cat, extra) => Object.assign({ id, name, status, cat, domain: id + ".example", noOptOut: false }, extra || {});
  const APPS = [
    A("copilot", "Microsoft 365 Copilot", "sanctioned", "chat", { domain: "copilot.microsoft.com", sso: true }),
    A("chatgpt", "ChatGPT Enterprise", "sanctioned", "chat", { domain: "chatgpt.com", sso: true }),
    A("claude", "Claude Enterprise", "sanctioned", "chat", { domain: "claude.ai", sso: true }),
    A("ghcopilot", "GitHub Copilot Business", "sanctioned", "code", { domain: "github.com", sso: true }),
    A("gemini", "Gemini for Workspace", "sanctioned", "chat", { domain: "gemini.google.com", sso: true }),
    A("clausebot", "ClauseBot", "tolerated", "writing", { note: "Legal pilot under exception EX-12" }),
    A("imageforge", "ImageForge AI", "tolerated", "image", { noOptOut: true, note: "Marketing pilot under exception EX-09" }),
    A("transly", "Transly", "tolerated", "writing"), A("slidely", "Slidely AI", "tolerated", "writing"), A("grammarnest", "GrammarNest", "tolerated", "extension", { perms: "page" }),
    A("searchowl", "SearchOwl", "tolerated", "search"), A("clipcraft", "ClipCraft", "tolerated", "video"), A("voicely", "Voicely", "tolerated", "voice"),
    A("sheetsage", "SheetSage AI", "blacklisted", "sheet"),
    A("tabgenie", "TabGenie AI", "blacklisted", "extension", { perms: "all-sites" }),
    A("modelbox", "ModelBox", "blacklisted", "endpoint"),
    A("notehawk", "NoteHawk", "blacklisted", "notetaker"),
    A("pdfwhiz", "PDFWhiz AI", "blacklisted", "file"), A("docudigest", "DocuDigest", "blacklisted", "file"),
    A("promptpal", "PromptPal", "blacklisted", "chat", { noOptOut: true }), A("chatterbox", "ChatterBox AI", "blacklisted", "chat", { noOptOut: true }),
    A("codewhisp", "CodeWhisp", "blacklisted", "code"), A("agentforge", "AgentForge", "blacklisted", "agent"),
    A("mailmind", "MailMind", "blacklisted", "mail"), A("modelapi", "Model API credits", "blacklisted", "api"),
    A("transcribo", "Transcribo", "blacklisted", "notetaker"), A("summarix", "Summarix", "blacklisted", "file"),
    A("pixelpup", "PixelPup", "unreviewed", "image", { note: "Was covered by the retired image rule" })
  ];
  // 37 unreviewed apps, invented names
  ["Quillo", "Brainy Desk", "Notara", "Lexify", "DraftDuck", "Mindgrid", "Promptly Pro", "Synthia", "WriteRiver", "Askbase", "Cortexa", "Pagewise",
    "Talkwell", "Memora", "Clarifai Lite", "Docsy AI", "Ideaforge", "Lumen Notes", "Parsewell", "Querylane", "Recapper", "Scribbit", "Thinkpad AI", "Unblock AI",
    "Vellum Draft", "Wordloom", "Xplain", "Yarnly", "Zest AI", "Briefcase AI", "Chartsmith", "Dialog Pro", "Echo Notes", "Flowmate", "Gistly", "Hintly"]
    .forEach((n, i) => APPS.push(A("u" + i, n, "unreviewed", ["chat", "writing", "search", "file", "sheet", "video", "voice"][i % 7])));

  // Blacklist rules as data; match logic lives in engine.js
  const RULES = {
    "BL-01": { type: "App", sev: "High", name: "Unvetted AI file converters and summarizers", playbook: "Notify → block in web gateway", grace: 5, policy: "AI-POL-4.1" },
    "BL-02": { type: "Usage", sev: "Medium", name: "Personal accounts on sanctioned AI tools", playbook: "Notify with enterprise sign-in link", grace: 5, policy: "AI-POL-3.2" },
    "BL-03": { type: "Usage", sev: "Critical", name: "Sensitive data sent to a non-sanctioned AI app", playbook: "Block now → notify → open incident", grace: 0, policy: "AI-POL-2.1" },
    "BL-04": { type: "Extension", sev: "High", name: "AI browser extensions that read and change all site data", playbook: "Notify → remove via EDR", grace: 5, policy: "AI-POL-5.3" },
    "BL-05": { type: "Endpoint", sev: "High", name: "Local model runners on devices with production access", playbook: "Notify → remove via EDR", grace: 5, policy: "AI-POL-5.4" },
    "BL-06": { type: "Usage", sev: "High", name: "AI note-takers joining external calls", playbook: "Notify → revoke OAuth → block", grace: 5, policy: "AI-POL-3.5" },
    "BL-07": { type: "OAuth", sev: "High", name: "AI apps granted mailbox or drive read access", playbook: "Revoke consent → notify", grace: 2, policy: "AI-POL-5.1" },
    "BL-08": { type: "Spend", sev: "Low", name: "AI subscriptions bought outside procurement", playbook: "Notify → finance flag", grace: 10, policy: "FIN-PROC-7" },
    "BL-09": { type: "App", sev: "High", name: "AI apps that train on inputs with no opt-out", playbook: "Notify → block in web gateway", grace: 5, policy: "AI-POL-2.4" },
    "BL-10": { type: "Usage", sev: "High", name: "Non-sanctioned AI code assistants on regulated repositories", playbook: "Notify → remove via EDR", grace: 5, policy: "SDLC-12" },
    "BL-11": { type: "Usage", sev: "Critical", name: "AI agents writing to corporate SaaS with personal tokens", playbook: "Revoke token → notify → open incident", grace: 0, policy: "AI-POL-6.1" },
    "BL-12": { type: "Spend", sev: "Medium", name: "AI model API keys paid on cards", playbook: "Notify → finance flag", grace: 10, policy: "FIN-PROC-7" },
    "R-IMG": { type: "App", sev: "Medium", name: "Any AI image generator", playbook: "Notify", grace: 5, policy: "AI-POL-4.3", retired: true }
  };
  const RULE_RATIONALE = {
    "BL-01": "File tools keep copies of whatever is uploaded, and none of these has passed vendor review.",
    "BL-02": "Personal accounts sit outside our tenant: no retention controls, no audit, and inputs may train consumer models.",
    "BL-03": "Customer, payroll, financial, or source-code data in an unapproved AI tool is a data incident, not a policy note.",
    "BL-04": "An extension that can read every page sees email, CRM, and admin consoles in the clear.",
    "BL-05": "Local model runners pull large models and can read production data outside every control we monitor.",
    "BL-06": "Note-takers record customers who never agreed to an AI vendor holding their words.",
    "BL-07": "Mailbox and drive scopes hand an unvetted vendor a standing copy of our documents.",
    "BL-08": "Individual subscriptions skip security review and duplicate seats we already pay for.",
    "BL-09": "If the vendor trains on inputs with no opt-out, our data becomes their model.",
    "BL-10": "Regulated code must stay in approved tools with retention and audit controls.",
    "BL-11": "Agents acting with personal tokens can change records with no trace back to an approval.",
    "BL-12": "Direct API spend means unreviewed integrations and no data-processing terms.",
    "R-IMG": "Retired in v3.2: image tools are now judged by their training terms (BL-09)."
  };
  const VERSIONS = [
    { v: "3.0", date: "2026-07-08", note: "First published blacklist: 9 rules" },
    { v: "3.1", date: "2026-08-26", note: "Added BL-10 and BL-12; added “Any AI image generator”" },
    { v: "3.2", date: "2026-10-14", note: "Added BL-11; retired “Any AI image generator” (covered by BL-09)" }
  ];
  const EXCEPTIONS = [
    { id: "EX-12", app: "clausebot", dept: "LEG", until: "2026-12-31", reason: "Legal pilot of ClauseBot, approved by the committee" },
    { id: "EX-09", app: "imageforge", dept: "MKT", until: "2026-10-25", reason: "Marketing pilot of ImageForge AI, approved by the committee" }
  ];
  const PERSONAS = [
    { id: "jordan", name: "Jordan Lee", role: "AI governance lead", can: ["notify", "approve"] },
    { id: "priya", name: "Priya Shah", role: "Endpoint team lead", can: ["approve", "remove"] },
    { id: "elena", name: "Elena Ruiz", role: "AI Governance Committee chair", can: ["committee", "approve"] }
  ];

  root.JD = { TODAY, START, CLOSE, SOURCES, GAPS, DEPTS, SANCTIONED, APPS, RULES, RULE_RATIONALE, VERSIONS, EXCEPTIONS, PERSONAS };
})(typeof window !== "undefined" ? window : globalThis);
