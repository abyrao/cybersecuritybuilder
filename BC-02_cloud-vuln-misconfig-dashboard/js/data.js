/* BC-02 · fictional reference data. All names, systems, and numbers are invented. */
(function (root) {
  const TODAY = "2026-10-26";
  const WINDOW_START = "2026-07-28"; // 90 days ending today

  const CLOUDS = {
    aws:     { id: "aws",     name: "AWS",            short: "AWS", color: "#FFB13D", unit: "account" },
    azure:   { id: "azure",   name: "Microsoft Azure", short: "AZ",  color: "#3DD9FF", unit: "subscription" },
    gcp:     { id: "gcp",     name: "Google Cloud",   short: "GC",  color: "#C6FF3D", unit: "project" },
    oci:     { id: "oci",     name: "Oracle Cloud",   short: "OCI", color: "#9D7BFF", unit: "compartment" },
    alibaba: { id: "alibaba", name: "Alibaba Cloud",  short: "ALI", color: "#FF8FC0", unit: "account" }
  };

  // Business units: owner approves risk acceptance; app = the system most of their cloud runs.
  const BUS = [
    { id: "PAY",  name: "Payments",             owner: "Dana Whitfield",  ownerRole: "VP, Payments",            app: "Payment Gateway",    tier: 1, rev: 210, data: "cardholder data" },
    { id: "CXP",  name: "Customer Platform",    owner: "Marcus Bell",     ownerRole: "VP, Customer Platform",   app: "Customer Portal",    tier: 1, rev: 140, data: "customer PII",    sla: 7 },
    { id: "DATA", name: "Data & Analytics",     owner: "Priya Raman",     ownerRole: "Director, Data",          app: "Analytics Lakehouse", tier: 2, rev: 35, data: "customer PII",    sla: 14 },
    { id: "MOB",  name: "Mobile Apps",          owner: "Elena Sokolova",  ownerRole: "Director, Mobile",        app: "Mobile API",         tier: 1, rev: 95,  data: "customer PII",    sla: 7 },
    { id: "PTR",  name: "Partner Integrations", owner: "Kwame Asante",    ownerRole: "Director, Partnerships",  app: "Partner API Hub",    tier: 2, rev: 60,  data: "partner contracts" },
    { id: "CORP", name: "Corporate IT",         owner: "Hannah Lindqvist", ownerRole: "Director, Corporate IT", app: "HR & Finance apps",  tier: 2, rev: 0,   data: "payroll data",    sla: 14 }
  ];
  // Fix-time targets in days, by unit tier and risk band
  const SLA = { 1: { Critical: 7, High: 30, Medium: 60, Low: 120 }, 2: { Critical: 14, High: 45, Medium: 90, Low: 180 } };
  const UNMAPPED = { id: "UNM", name: "Unmapped", owner: "Cloud platform lead", ownerRole: "No business unit tag", app: "Unknown", tier: 1, rev: 0, data: "unknown" };

  // env: prod-t1 (revenue-critical production), prod (production), nonprod
  const ACCOUNTS = [
    ["pay-prod",           "aws",     "PAY",  "prod-t1", true],
    ["pay-staging",        "aws",     "PAY",  "nonprod", false],
    ["pay-fraud-prod",     "azure",   "PAY",  "prod-t1", true],
    ["pay-risk-ml",        "gcp",     "PAY",  "prod",    true],
    ["cxp-prod",           "aws",     "CXP",  "prod-t1", true],
    ["cxp-dev",            "aws",     "CXP",  "nonprod", false],
    ["cxp-portal-prod",    "azure",   "CXP",  "prod-t1", true],
    ["cxp-search",         "gcp",     "CXP",  "prod",    false],
    ["cxp-db-prod",        "oci",     "CXP",  "prod-t1", true],
    ["data-lake-prod",     "gcp",     "DATA", "prod",    true],
    ["data-sandbox",       "gcp",     "DATA", "nonprod", false],
    ["data-dev",           "gcp",     "DATA", "nonprod", false],
    ["data-etl-prod",      "aws",     "DATA", "prod",    false],
    ["data-bi",            "azure",   "DATA", "prod",    false],
    ["data-scratch",       "aws",     "DATA", "nonprod", false],
    ["mob-api-prod",       "aws",     "MOB",  "prod-t1", true],
    ["mob-dev",            "aws",     "MOB",  "nonprod", false],
    ["mob-push",           "gcp",     "MOB",  "prod",    false],
    ["mob-notify",         "azure",   "MOB",  "prod",    false],
    ["ptr-hub-prod",       "aws",     "PTR",  "prod",    false],
    ["ptr-apac-prod",      "alibaba", "PTR",  "prod",    true],
    ["ptr-apac-dev",       "alibaba", "PTR",  "nonprod", false],
    ["ptr-edi",            "oci",     "PTR",  "prod",    false],
    ["corp-ext-apps",      "azure",   "CORP", "prod",    false],
    ["corp-hr",            "azure",   "CORP", "prod",    true],
    ["corp-erp-prod",      "oci",     "CORP", "prod",    true],
    ["corp-tools",         "aws",     "CORP", "nonprod", false],
    ["acct-7731",          "aws",     "UNM",  "prod",    true],
    ["sub-legacy-04",      "azure",   "UNM",  "prod",    false],
    ["proj-hackathon-22",  "gcp",     "UNM",  "nonprod", false],
    ["cmp-migration",      "oci",     "UNM",  "prod",    true]
  ].map(([id, cloud, bu, env, sensitive]) => ({ id, cloud, bu, env, sensitive }));

  // Engineers (personas). Team = business unit. Platform lead approves unmapped-account ownership.
  const PEOPLE = [
    { id: "rortiz",  name: "Rafael Ortiz",   bu: "PAY",  role: "Cloud engineer" },
    { id: "akim",    name: "Ahn Kim",        bu: "PAY",  role: "Developer" },
    { id: "jmensah", name: "Joy Mensah",     bu: "CXP",  role: "Cloud engineer" },
    { id: "tnguyen", name: "Tuan Nguyen",    bu: "CXP",  role: "Developer" },
    { id: "spatel",  name: "Sana Patel",     bu: "DATA", role: "Data engineer" },
    { id: "lgarcia", name: "Luis Garcia",    bu: "DATA", role: "Cloud engineer" },
    { id: "mchen",   name: "Mei Chen",       bu: "MOB",  role: "Developer" },
    { id: "owilson", name: "Owen Wilson",    bu: "MOB",  role: "Cloud engineer" },
    { id: "ifarah",  name: "Idris Farah",    bu: "PTR",  role: "Cloud engineer" },
    { id: "kito",    name: "Kenji Ito",      bu: "PTR",  role: "Developer" },
    { id: "bmoreau", name: "Bea Moreau",     bu: "CORP", role: "Cloud engineer" },
    { id: "dkaur",   name: "Dev Kaur",       bu: "CORP", role: "Developer" },
    { id: "nbrooks", name: "Nora Brooks",    bu: "UNM",  role: "Cloud platform lead" }
  ];

  // Tools the findings come from. covers = clouds the tool scans.
  const SOURCES = [
    { id: "cspm",    name: "Wiz",                         generic: "CSPM",                   kind: "CSPM",           covers: ["aws", "azure", "gcp", "oci"] },
    { id: "sechub",  name: "AWS Security Hub",            generic: "AWS native posture",     kind: "Cloud native",   covers: ["aws"] },
    { id: "defender",name: "Microsoft Defender for Cloud", generic: "Azure native posture",  kind: "Cloud native",   covers: ["azure"] },
    { id: "scc",     name: "Security Command Center",     generic: "Google native posture",  kind: "Cloud native",   covers: ["gcp"] },
    { id: "guard",   name: "Oracle Cloud Guard",          generic: "Oracle native posture",  kind: "Cloud native",   covers: ["oci"] },
    { id: "alisc",   name: "Alibaba Security Center",     generic: "Alibaba native posture", kind: "Cloud native",   covers: ["alibaba"] },
    { id: "tenable", name: "Tenable",                     generic: "Vulnerability scanner",  kind: "VM scanner",     covers: ["aws", "azure", "gcp", "oci", "alibaba"] },
    { id: "snyk",    name: "Snyk Container",              generic: "Image scanner",          kind: "Container scan", covers: ["aws", "azure", "gcp"] }
  ];
  // Business context (not security tools)
  const CONTEXT = [
    { id: "tags",  name: "Cloud tags + CMDB", t: "Maps each account to a business unit and app" },
    { id: "kev",   name: "CISA KEV catalog",  t: "Marks vulnerabilities known to be exploited" },
    { id: "bill",  name: "Billing and usage",  t: "Finds accounts no security tool scans" },
    { id: "owner", name: "Business unit roster", t: "Owners, engineers, fix-time targets" }
  ];

  // Finding templates. kind: misconfig | vuln. sev: Critical/High/Medium/Low. effort hours.
  // exposed: probability resource is internet-facing. exploit: direct-exploit / KEV probability.
  const T = {
    M01: { kind: "misconfig", title: "Storage bucket publicly readable",        cat: "Storage",  sev: "Critical", effort: 1,  exposed: 1,   exploit: 1,   src: "cspm" },
    M02: { kind: "misconfig", title: "Storage not encrypted at rest",           cat: "Storage",  sev: "Medium",   effort: 1,  exposed: 0,   exploit: 0,   src: "cspm" },
    M03: { kind: "misconfig", title: "SSH open to the internet",                cat: "Network",  sev: "High",     effort: 1,  exposed: 1,   exploit: .5,  src: "cspm" },
    M04: { kind: "misconfig", title: "RDP open to the internet",                cat: "Network",  sev: "High",     effort: 1,  exposed: 1,   exploit: .5,  src: "cspm" },
    M05: { kind: "misconfig", title: "Database publicly accessible",            cat: "Database", sev: "Critical", effort: 4,  exposed: 1,   exploit: .6,  src: "cspm" },
    M06: { kind: "misconfig", title: "Admin account without MFA",               cat: "Identity", sev: "Critical", effort: 1,  exposed: 1,   exploit: 0,   src: "cspm" },
    M07: { kind: "misconfig", title: "Access keys older than 90 days",          cat: "Identity", sev: "Medium",   effort: 1,  exposed: 0,   exploit: 0,   src: "cspm" },
    M08: { kind: "misconfig", title: "Audit logging turned off",                cat: "Logging",  sev: "Medium",   effort: 1,  exposed: 0,   exploit: 0,   src: "cspm" },
    M09: { kind: "misconfig", title: "Compute role has full admin rights",      cat: "Identity", sev: "High",     effort: 4,  exposed: 0,   exploit: 0,   src: "cspm" },
    M10: { kind: "misconfig", title: "Kubernetes API endpoint public",          cat: "Compute",  sev: "High",     effort: 4,  exposed: 1,   exploit: 0,   src: "cspm" },
    M11: { kind: "misconfig", title: "Disk snapshot shared publicly",           cat: "Storage",  sev: "Critical", effort: 1,  exposed: 1,   exploit: 1,   src: "cspm" },
    M12: { kind: "misconfig", title: "Load balancer allows TLS 1.0",            cat: "Network",  sev: "Low",      effort: 1,  exposed: 1,   exploit: 0,   src: "cspm" },
    M13: { kind: "misconfig", title: "Backups not configured",                  cat: "Storage",  sev: "Low",      effort: 1,  exposed: 0,   exploit: 0,   src: "cspm" },
    M14: { kind: "misconfig", title: "Key rotation turned off",                 cat: "Identity", sev: "Low",      effort: 1,  exposed: 0,   exploit: 0,   src: "cspm" },
    M15: { kind: "misconfig", title: "Public access not blocked on storage",    cat: "Storage",  sev: "High",     effort: 1,  exposed: 1,   exploit: 0,   src: "cspm" },
    V01: { kind: "vuln", title: "OpenSSH remote code execution",                cat: "Compute",  sev: "Critical", effort: 4,  exposed: .5,  exploit: 1,   src: "tenable" },
    V02: { kind: "vuln", title: "Java logging library remote code execution",   cat: "Container", sev: "Critical", effort: 4, exposed: .4,  exploit: 1,   src: "snyk" },
    V03: { kind: "vuln", title: "Outdated OpenSSL in base image",               cat: "Container", sev: "High",    effort: 4,  exposed: .3,  exploit: .2,  src: "snyk" },
    V04: { kind: "vuln", title: "Linux kernel privilege escalation",            cat: "Compute",  sev: "High",     effort: 12, exposed: 0,   exploit: .4,  src: "tenable" },
    V05: { kind: "vuln", title: "Web server path traversal",                    cat: "Compute",  sev: "High",     effort: 1,  exposed: .8,  exploit: .7,  src: "tenable" },
    V06: { kind: "vuln", title: "Outdated Node.js runtime",                     cat: "Container", sev: "Medium",  effort: 4,  exposed: .3,  exploit: 0,   src: "snyk" },
    V07: { kind: "vuln", title: "Python package deserialization flaw",          cat: "Container", sev: "Medium",  effort: 1,  exposed: .2,  exploit: .1,  src: "snyk" },
    V08: { kind: "vuln", title: "Unsupported operating system image",           cat: "Compute",  sev: "High",     effort: 12, exposed: .2,  exploit: 0,   src: "tenable" }
  };

  // Resource naming per cloud and category
  const RES = {
    Storage:   { aws: "s3://", azure: "blob/", gcp: "gs://", oci: "bucket/", alibaba: "oss://" },
    Network:   { aws: "sg-", azure: "nsg-", gcp: "fw-", oci: "seclist-", alibaba: "sg-" },
    Database:  { aws: "rds-", azure: "sqldb-", gcp: "cloudsql-", oci: "adb-", alibaba: "rds-" },
    Identity:  { aws: "iam/", azure: "entra/", gcp: "iam/", oci: "iam/", alibaba: "ram/" },
    Logging:   { aws: "trail-", azure: "diag-", gcp: "audit-", oci: "audit-", alibaba: "actiontrail-" },
    Compute:   { aws: "i-", azure: "vm-", gcp: "vm-", oci: "inst-", alibaba: "ecs-" },
    Container: { aws: "ecr/", azure: "acr/", gcp: "gar/", oci: "ocir/", alibaba: "acr/" }
  };

  // Simulated AI remediation snippets, keyed by template then cloud. {r} = resource.
  const FIX = {
    M01: {
      aws: "aws s3api put-public-access-block --bucket {r} \\\n  --public-access-block-configuration \\\n  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true",
      azure: "az storage account update --name {r} \\\n  --allow-blob-public-access false",
      gcp: "gcloud storage buckets update gs://{r} \\\n  --public-access-prevention",
      oci: "oci os bucket update --bucket-name {r} \\\n  --public-access-type NoPublicAccess",
      alibaba: "ossutil set-acl oss://{r} private -b"
    },
    M03: {
      aws: "aws ec2 revoke-security-group-ingress --group-id {r} \\\n  --protocol tcp --port 22 --cidr 0.0.0.0/0\n# then allow only the corporate VPN range",
      azure: "az network nsg rule update --nsg-name {r} --name allow-ssh \\\n  --source-address-prefixes <corp-vpn-range>",
      gcp: "gcloud compute firewall-rules update {r} \\\n  --source-ranges=<corp-vpn-range>",
      oci: "# Edit security list {r}: replace 0.0.0.0/0 on port 22\n# with the bastion subnet",
      alibaba: "aliyun ecs RevokeSecurityGroup --SecurityGroupId {r} \\\n  --IpProtocol tcp --PortRange 22/22 --SourceCidrIp 0.0.0.0/0"
    },
    M15: {
      _: "# One fix for every bucket built from this module\nmodule \"bucket\" {\n  source  = \"git::platform/tf-modules//storage-bucket\"\n  version = \"1.5.0\"   # was 1.4.2: public access block defaulted off\n}"
    },
    M06: { _: "# Enforce MFA for every admin role\n# 1. Require phishing-resistant MFA in the identity provider\n# 2. Remove standing admin; use just-in-time elevation" },
    M05: { _: "# Remove the public endpoint\n# 1. Disable public network access on {r}\n# 2. Route the app through a private endpoint\n# 3. Rotate the database credentials" },
    V01: { _: "# Patch OpenSSH on {r}\nsudo apt-get update && sudo apt-get install --only-upgrade openssh-server\nsudo systemctl restart ssh" },
    V02: { _: "# Rebuild image {r} with the patched logging library\n# pom.xml / build.gradle: bump the logging library to the fixed version\ndocker build -t {r}:patched . && docker push {r}:patched" },
    V05: { _: "# Upgrade the web server package on {r} and reload\nsudo apt-get install --only-upgrade apache2 && sudo systemctl reload apache2" }
  };
  const STEPS = {
    Storage: ["Confirm no app reads this publicly", "Apply the setting", "Rescan to verify"],
    Network: ["Check who connects today (flow logs)", "Restrict the source range", "Rescan to verify"],
    Database: ["Move the app to a private endpoint", "Turn off public access", "Rotate credentials, then rescan"],
    Identity: ["Find who uses it", "Apply least privilege or MFA", "Rescan to verify"],
    Logging: ["Turn on audit logging", "Send logs to the SIEM", "Rescan to verify"],
    Compute: ["Patch in staging first", "Patch production in the change window", "Rescan to verify"],
    Container: ["Bump the base image or package", "Rebuild and redeploy", "Rescan the running image"]
  };

  root.D = { SLA, TODAY, WINDOW_START, CLOUDS, BUS, UNMAPPED, ACCOUNTS, PEOPLE, SOURCES, CONTEXT, T, RES, FIX, STEPS };
})(typeof window !== "undefined" ? window : globalThis);
