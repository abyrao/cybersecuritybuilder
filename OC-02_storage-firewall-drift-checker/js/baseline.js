/* OC-02 · the organization's CIS-aligned storage and firewall baseline (v1.0). Paraphrased intent; CIS text is not reproduced. */
(function (root) {
  const CLOUDS = {
    aws:     { id: "aws",     name: "AWS",           short: "AWS", color: "#C9A227" },
    azure:   { id: "azure",   name: "Microsoft Azure", short: "AZ", color: "#4A6FA5" },
    gcp:     { id: "gcp",     name: "Google Cloud",  short: "GC",  color: "#2F7D4F" },
    oci:     { id: "oci",     name: "Oracle Cloud",  short: "OCI", color: "#2E8A86" },
    alibaba: { id: "alibaba", name: "Alibaba Cloud", short: "ALI", color: "#6E5A8A" },
    ibm:     { id: "ibm",     name: "IBM Cloud",     short: "IBM", color: "#7A8796" }
  };
  const BENCH = [
    { cloud: "aws", name: "CIS Amazon Web Services Foundations Benchmark", v: "v7.0.0" },
    { cloud: "azure", name: "CIS Microsoft Azure Foundations Benchmark", v: "v6.0.0" },
    { cloud: "gcp", name: "CIS Google Cloud Platform Foundation Benchmark", v: "v5.0.0" },
    { cloud: "oci", name: "CIS Oracle Cloud Infrastructure Foundations Benchmark", v: "v3.1.0" },
    { cloud: "alibaba", name: "CIS Alibaba Cloud Foundation Benchmark", v: "v2.0.1" },
    { cloud: "ibm", name: "CIS IBM Cloud Foundations Benchmark", v: "v2.0.0" }
  ];
  const ASSUMPTIONS = [
    ["Scope", "Storage and network controls only. Identity and compute are out of scope unless they affect storage or firewalls (for example flow logs)."],
    ["Levels", "CIS Level 1 applies to everything. Level 2 applies to confidential or restricted data and tier 1 applications."],
    ["Mapping by intent", "Each control maps to the matching storage, networking, or logging section of each cloud's benchmark. Exact recommendation numbers aren't reproduced; confirm them against the licensed benchmark text."],
    ["Org additions", "Where a benchmark has no equivalent, the control is kept and marked “org” so it's clear it goes beyond CIS."],
    ["Thresholds", "The stricter of CIS intent or common practice: 90-day log retention, 365-day key rotation, TLS 1.2 minimum, 1-hour shared-access tokens."],
    ["Exceptions", "Allowed with an owner, a reason, and an expiry within 180 days."],
    ["Effective date", "Baseline v1.0 is effective Oct 1, 2026; earlier history is measured against the same baseline so drift age is comparable."]
  ];
  const FAMILIES = ["Public access", "Encryption", "Data protection", "Logging", "Access", "Exposure", "Segmentation", "Monitoring"];
  const ALL = ["aws", "azure", "gcp", "oci", "alibaba", "ibm"];
  // measure: binary | min | max | ordinal | cidr | ports | count. kinds: which resource kinds it applies to.
  // path: exposure (likelihood follows exposure) | hygiene (base likelihood 2). orgOn: clouds where it's an org addition.
  const C = (id, name, o) => Object.assign({ id, name, orgOn: [], auto: false, path: "hygiene", level: "L1" }, o);
  const CONTROLS = [
    C("STG-01", "Block public access at account and resource level", { domain: "storage", family: "Public access", sev: "Critical", measure: "binary", expected: "On", kinds: ["object"], path: "exposure",
      setting: { aws: "S3 Block Public Access", azure: "Allow Blob anonymous access = off", gcp: "Public access prevention", oci: "Bucket visibility = Private", alibaba: "OSS Block Public Access", ibm: "Public access group removed" } }),
    C("STG-02", "No anonymous read via ACL or policy", { domain: "storage", family: "Public access", sev: "Critical", measure: "binary", expected: "None", kinds: ["object"], path: "exposure",
      setting: { aws: "Bucket policy / ACL: no AllUsers read", azure: "Container access level = Private", gcp: "No allUsers / allAuthenticatedUsers", oci: "No public object read", alibaba: "Bucket ACL = private", ibm: "No Public Access role" } }),
    C("STG-03", "No anonymous write", { domain: "storage", family: "Public access", sev: "Critical", measure: "binary", expected: "None", kinds: ["object"], path: "exposure" }),
    C("STG-04", "Encryption at rest", { domain: "storage", family: "Encryption", sev: "High", measure: "binary", expected: "On", kinds: ["object", "block", "file", "snapshot", "vault"], auto: true,
      setting: { aws: "Default encryption (SSE-S3 / KMS), EBS encryption by default", azure: "Storage service encryption", gcp: "Encryption at rest (default / CMEK)", oci: "Oracle-managed or vault key", alibaba: "Server-side encryption", ibm: "Encryption with Key Protect" } }),
    C("STG-05", "Customer-managed keys for confidential and restricted data", { domain: "storage", family: "Encryption", sev: "Medium", measure: "binary", expected: "Customer-managed key", kinds: ["object", "block", "file", "vault"], level: "L2" }),
    C("STG-06", "Key rotation", { domain: "storage", family: "Encryption", sev: "Medium", measure: "max", exp: 365, unit: "days", expected: "≤ 365 days", kinds: ["object", "block"], auto: true }),
    C("STG-07", "Encrypted transport only, minimum TLS 1.2", { domain: "storage", family: "Encryption", sev: "High", measure: "ordinal", expected: "HTTPS only, TLS ≥ 1.2", kinds: ["object", "file"], auto: true,
      setting: { aws: "Bucket policy aws:SecureTransport", azure: "Secure transfer required + minimum TLS 1.2", gcp: "TLS enforced by service", oci: "TLS enforced by service", alibaba: "Policy: secure transport", ibm: "TLS 1.2 endpoint policy" } }),
    C("STG-08", "Versioning", { domain: "storage", family: "Data protection", sev: "Medium", measure: "binary", expected: "On", kinds: ["object"], auto: true }),
    C("STG-09", "Immutability (object lock) on backup storage", { domain: "storage", family: "Data protection", sev: "Medium", measure: "binary", expected: "On", kinds: ["vault"], level: "L2" }),
    C("STG-10", "Access logging", { domain: "storage", family: "Logging", sev: "Medium", measure: "binary", expected: "On", kinds: ["object"], auto: true }),
    C("STG-11", "Object-level audit logging (data events)", { domain: "storage", family: "Logging", sev: "Medium", measure: "binary", expected: "On", kinds: ["object"], auto: true, level: "L2" }),
    C("STG-12", "Soft delete / delete protection", { domain: "storage", family: "Data protection", sev: "Medium", measure: "min", exp: 7, unit: "days", expected: "≥ 7 days", kinds: ["object", "file", "vault"], auto: true }),
    C("STG-13", "Shared-access token lifetime", { domain: "storage", family: "Access", sev: "High", measure: "max", exp: 168, unit: "hours", expected: "PAR ≤ 7 days", kinds: ["token"], path: "exposure", orgOn: ["aws", "gcp", "alibaba", "ibm"] }),
    C("STG-14", "Access keys rotated, or shared-key access disabled", { domain: "storage", family: "Access", sev: "High", measure: "max", exp: 90, unit: "days", expected: "≤ 90 days or off", kinds: ["object"], path: "exposure", clouds: ["azure", "alibaba", "ibm"] }),
    C("STG-15", "Default-deny network access, private endpoint for restricted data", { domain: "storage", family: "Exposure", sev: "High", measure: "binary", expected: "Deny + private endpoint", kinds: ["object", "file"], path: "exposure", level: "L2" }),
    C("STG-16", "Cross-account access only to approved principals", { domain: "storage", family: "Access", sev: "High", measure: "count", cap: 5, expected: "0 unapproved", kinds: ["object"], path: "exposure" }),
    C("STG-17", "Lifecycle and retention policy per classification", { domain: "storage", family: "Data protection", sev: "Low", measure: "binary", expected: "Present", kinds: ["object"], auto: true, level: "org", orgOn: ALL }),
    C("STG-18", "Replication for tier 1 data", { domain: "storage", family: "Data protection", sev: "Low", measure: "binary", expected: "On", kinds: ["object"], level: "org", orgOn: ALL, tier1Only: true }),
    C("STG-19", "File shares not exported publicly", { domain: "storage", family: "Public access", sev: "Critical", measure: "binary", expected: "Private", kinds: ["file"], path: "exposure" }),
    C("STG-20", "Snapshots and backups not shared publicly", { domain: "storage", family: "Public access", sev: "Critical", measure: "binary", expected: "Private", kinds: ["snapshot"], path: "exposure" }),
    C("STG-21", "Owner and classification tags present", { domain: "storage", family: "Data protection", sev: "Low", measure: "binary", expected: "Present", kinds: ["object", "block", "file", "snapshot", "vault"], level: "org", orgOn: ALL }),

    C("NET-01", "No SSH (22) from 0.0.0.0/0", { domain: "network", family: "Exposure", sev: "Critical", measure: "cidr", expected: "None", kinds: ["sg"], path: "exposure", ports: [22], openOnly: true }),
    C("NET-02", "No RDP (3389) from 0.0.0.0/0", { domain: "network", family: "Exposure", sev: "Critical", measure: "cidr", expected: "None", kinds: ["sg"], path: "exposure", ports: [3389], openOnly: true }),
    C("NET-03", "No admin ports from ::/0", { domain: "network", family: "Exposure", sev: "Critical", measure: "cidr", expected: "None", kinds: ["sg"], path: "exposure", ports: [22, 3389], v6: true }),
    C("NET-04", "No database ports from the internet", { domain: "network", family: "Exposure", sev: "Critical", measure: "cidr", expected: "None", kinds: ["sg"], path: "exposure", ports: [1433, 1521, 3306, 5432, 6379, 9200, 27017], publicSources: true }),
    C("NET-05", "Default security group allows no traffic", { domain: "network", family: "Segmentation", sev: "High", measure: "binary", expected: "Deny all", kinds: ["sg"], path: "exposure", defaultOnly: true }),
    C("NET-06", "Network ACLs: no unrestricted admin ingress", { domain: "network", family: "Exposure", sev: "High", measure: "cidr", expected: "None", kinds: ["nacl"], path: "exposure", ports: [22, 3389], openOnly: true }),
    C("NET-07", "Flow logs on every virtual network", { domain: "network", family: "Logging", sev: "High", measure: "binary", expected: "On", kinds: ["vnet"], auto: true }),
    C("NET-08", "Flow log retention", { domain: "network", family: "Logging", sev: "Medium", measure: "min", exp: 90, unit: "days", expected: "≥ 90 days", kinds: ["flowlog"], auto: true }),
    C("NET-09", "No allow-all protocol and port rules", { domain: "network", family: "Exposure", sev: "High", measure: "ports", expected: "None", kinds: ["sg", "fwpolicy"], path: "exposure" }),
    C("NET-10", "Egress restricted from restricted-data subnets", { domain: "network", family: "Segmentation", sev: "Medium", measure: "binary", expected: "Allow-list", kinds: ["vnet"], level: "L2" }),
    C("NET-11", "No source wider than /16 (except web ports 80, 443)", { domain: "network", family: "Exposure", sev: "High", measure: "cidr", expected: "≤ /16", kinds: ["sg", "nacl", "fwpolicy"], path: "exposure", level: "org", orgOn: ALL, wide: true }),
    C("NET-12", "No rules unused for 90 days", { domain: "network", family: "Segmentation", sev: "Low", measure: "count", cap: 5, expected: "0 stale", kinds: ["sg"], level: "org", orgOn: ALL }),
    C("NET-13", "WAF in front of internet-facing load balancers", { domain: "network", family: "Exposure", sev: "High", measure: "binary", expected: "On", kinds: ["vnet"], level: "L2", lbOnly: true }),
    C("NET-14", "Private subnets have no internet gateway route", { domain: "network", family: "Segmentation", sev: "High", measure: "binary", expected: "None", kinds: ["vnet"], path: "exposure" }),
    C("NET-15", "Network monitoring enabled per region", { domain: "network", family: "Monitoring", sev: "Medium", measure: "binary", expected: "On", kinds: ["vnet"], auto: true }),
    C("NET-16", "No peering from non-production into production", { domain: "network", family: "Segmentation", sev: "High", measure: "binary", expected: "None", kinds: ["vnet"], path: "exposure", level: "org", orgOn: ALL }),
    C("NET-17", "Admin access only through bastion or just-in-time", { domain: "network", family: "Segmentation", sev: "High", measure: "binary", expected: "On", kinds: ["sg"], level: "L2" }),
    C("NET-18", "Every subnet has a security list or NSG", { domain: "network", family: "Segmentation", sev: "Medium", measure: "binary", expected: "Attached", kinds: ["vnet"] }),
    C("NET-19", "DDoS protection on public endpoints", { domain: "network", family: "Monitoring", sev: "Low", measure: "binary", expected: "On", kinds: ["waf"], level: "L2" }),
    C("NET-20", "Management ports not open to broad partner ranges (/8 to /16)", { domain: "network", family: "Exposure", sev: "High", measure: "cidr", expected: "None", kinds: ["sg"], path: "exposure", ports: [22, 3389], partner: true, level: "org", orgOn: ALL })
  ];
  const SEVW = { Critical: 10, High: 6, Medium: 3, Low: 1 };
  const SECTION = { "Public access": "Storage", Encryption: "Storage", "Data protection": "Storage", Access: "Storage", Logging: "Logging and monitoring", Monitoring: "Logging and monitoring", Exposure: "Networking", Segmentation: "Networking" };
  CONTROLS.forEach(c => { c.cis = {}; ALL.forEach(cl => { c.cis[cl] = (c.clouds && !c.clouds.includes(cl)) ? "n/a" : c.orgOn.includes(cl) ? "org" : SECTION[c.family] + " section"; }); });

  // Remediation snippets (simulated; verify before use). {r} = resource name.
  const FIX = {
    "STG-01": { aws: "aws s3api put-public-access-block --bucket {r} \\\n  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true", azure: "az storage account update -n {r} --allow-blob-public-access false", gcp: "gcloud storage buckets update gs://{r} --public-access-prevention", oci: "oci os bucket update --bucket-name {r} --public-access-type NoPublicAccess", alibaba: "ossutil set-acl oss://{r} private -b", ibm: "ibmcloud iam access-group-policy-delete Public Access --resource {r}", tf: "block_public_access = true" },
    "STG-02": { tf: "acl = \"private\"   # remove AllUsers / allUsers grants" },
    "STG-04": { aws: "aws s3api put-bucket-encryption --bucket {r} \\\n  --server-side-encryption-configuration '{\"Rules\":[{\"ApplyServerSideEncryptionByDefault\":{\"SSEAlgorithm\":\"aws:kms\"}}]}'", tf: "encryption = { enabled = true, kms_key_id = var.kms_key }" },
    "STG-07": { azure: "az storage account update -n {r} --min-tls-version TLS1_2 --https-only true", aws: "# Add a bucket policy statement denying aws:SecureTransport = false", tf: "min_tls_version = \"TLS1_2\"\nhttps_only      = true" },
    "STG-08": { aws: "aws s3api put-bucket-versioning --bucket {r} --versioning-configuration Status=Enabled", gcp: "gcloud storage buckets update gs://{r} --versioning", tf: "versioning = { enabled = true }" },
    "STG-10": { aws: "aws s3api put-bucket-logging --bucket {r} --bucket-logging-status file://logging.json", tf: "logging = { target_bucket = var.log_bucket }" },
    "STG-12": { azure: "az storage account blob-service-properties update --account-name {r} --enable-delete-retention true --delete-retention-days 7", tf: "soft_delete_retention_days = 7" },
    "STG-14": { azure: "az storage account update -n {r} --allow-shared-key-access false", tf: "shared_access_key_enabled = false" },
    "NET-01": { aws: "aws ec2 revoke-security-group-ingress --group-id {r} --protocol tcp --port 22 --cidr 0.0.0.0/0", azure: "az network nsg rule delete --nsg-name {r} --name allow-ssh-any", gcp: "gcloud compute firewall-rules update {r} --source-ranges=<bastion-range>", oci: "# Remove 0.0.0.0/0 TCP 22 from security list {r}", alibaba: "aliyun ecs RevokeSecurityGroup --SecurityGroupId {r} --IpProtocol tcp --PortRange 22/22 --SourceCidrIp 0.0.0.0/0", ibm: "ibmcloud is security-group-rule-delete {r} <rule-id>", tf: "# delete the ingress block for port 22 from 0.0.0.0/0\n# allow 22 only from module.bastion.cidr" },
    "NET-02": { aws: "aws ec2 revoke-security-group-ingress --group-id {r} --protocol tcp --port 3389 --cidr 0.0.0.0/0", tf: "# delete the ingress block for port 3389 from 0.0.0.0/0" },
    "NET-04": { tf: "# replace the database source range with the app subnet CIDR\ncidr_blocks = [module.app_subnet.cidr]" },
    "NET-07": { aws: "aws ec2 create-flow-logs --resource-type VPC --resource-ids {r} --traffic-type ALL --log-destination-type cloud-watch-logs", azure: "az network watcher flow-log create --name {r}-fl --nsg <nsg> --storage-account <acct> --retention 90", gcp: "gcloud compute networks subnets update <subnet> --enable-flow-logs", tf: "flow_log = { enabled = true, retention_days = 90 }" },
    "NET-08": { azure: "az network watcher flow-log update --name {r} --retention 90", tf: "retention_days = 90" },
    "NET-15": { azure: "az network watcher configure --enabled true --locations <region>", tf: "network_watcher_enabled = true" }
  };
  const STEPS = {
    binary: ["Confirm nothing depends on the current setting", "Change it in the module, not the console", "Re-check"],
    exposure: ["Find who connects today (flow logs)", "Narrow the source to the bastion or app subnet in code", "Re-check"],
    threshold: ["Set the value in the module", "Apply through the pipeline", "Re-check"]
  };

  root.B = { CLOUDS, BENCH, ASSUMPTIONS, FAMILIES, CONTROLS, SEVW, FIX, STEPS, ALL };
})(typeof window !== "undefined" ? window : globalThis);
